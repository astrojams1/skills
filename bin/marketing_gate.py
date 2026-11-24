#!/usr/bin/env python3
"""Share a marketing work queue through a private Git state branch in an attached repository."""
import argparse
import copy
import datetime as dt
import hashlib
import json
import os
import random
import re
import secrets
import subprocess
import sys
import time
from zoneinfo import ZoneInfo

UTC = dt.timezone.utc
LEASE = dt.timedelta(minutes=90)
NAME = re.compile(r"[a-z0-9][a-z0-9._-]{0,170}\Z")


def utcnow():
    return dt.datetime.now(UTC)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def empty():
    return {"version": 1, "active": None, "finished": {}, "receipts": {}}


def public(active):
    if active is None:
        return None
    return {k: v for k, v in active.items() if k != "owner"}


def release_inactive(state, now):
    active = state["active"]
    if active["expires"] and dt.datetime.fromisoformat(active["expires"]) > now:
        return "busy"
    if active["pending"]:
        return "reconcile"
    key = active["job"] + "/" + active["slot"]
    if active["job"].startswith("supplement."):
        state["finished"][key] = "surplus-deferred " + active["checkpoint"]
        result = "parked"
    else:
        state.setdefault("deferred", {})[key] = {
            "checkpoint": active["checkpoint"], "attempt": active["attempt"],
            "retry_at": (now + dt.timedelta(hours=1)).isoformat(),
        }
        result = "deferred"
    state["active"] = None
    return result


def transition(state, args, now, new_token):
    active = state["active"]
    op = args.operation
    if op == "status":
        return {"status": "ok", "active": public(active), "finished": state["finished"],
                "deferred": state.get("deferred", {})}
    if op in ("park", "defer"):
        surplus = args.job.startswith("supplement.") and re.fullmatch(r"surplus\.\d+", args.slot)
        if (not active or (active["job"], active["slot"]) != (args.job, args.slot)
                or (op == "park") != bool(surplus)):
            return {"status": "not-parkable" if op == "park" else "not-deferrable"}
        return {"status": release_inactive(state, now)}
    if op == "claim":
        key = args.job + "/" + args.slot
        if key in state["finished"]:
            return {"status": "done", "checkpoint": state["finished"][key]}
        saved = state.get("deferred", {}).get(key)
        if saved and dt.datetime.fromisoformat(saved["retry_at"]) > now:
            return {"status": "deferred", "retry_at": saved["retry_at"]}
        if active and (active["job"], active["slot"]) != (args.job, args.slot):
            # Only scheduled work can displace another slot. The same atomic
            # commit fences the old capability and retains its recovery record.
            if (args.job.startswith("supplement.")
                    or release_inactive(state, now) in ("busy", "reconcile")):
                return {"status": "resume-first", "job": active["job"], "slot": active["slot"]}
            active = None
        if active:
            if active["expires"] and dt.datetime.fromisoformat(active["expires"]) > now:
                return {"status": "busy", "expires": active["expires"]}
        else:
            active = {"job": args.job, "slot": args.slot, "pending": {}, "checkpoint": "", "attempt": 0}
            if saved:
                active.update(checkpoint=saved["checkpoint"], attempt=saved["attempt"])
                del state["deferred"][key]
            state["active"] = active
        active.update(engine=args.engine, owner=digest(new_token), expires=(now + LEASE).isoformat(),
                      attempt=active["attempt"] + 1)
        return {"status": "acquired", **public(active), "token": new_token}
    if (not active or not secrets.compare_digest(active.get("owner", ""), digest(args.token))
            or not active["expires"] or dt.datetime.fromisoformat(active["expires"]) <= now):
        return {"status": "lost"}
    if op in ("begin", "resolve", "retry"):
        effect = args.effect
        if effect in state["receipts"]:
            return {"status": "already-resolved", "receipt": state["receipts"][effect]}
        if op == "begin":
            if active["pending"]:
                return {"status": "reconcile", "pending": active["pending"]}
            active["pending"][effect] = args.note
            result = "started"
        elif effect not in active["pending"]:
            return {"status": "unknown-effect"}
        else:
            if op == "resolve":
                state["receipts"][effect] = args.note
            del active["pending"][effect]
            result = "resolved" if op == "resolve" else "cleared-for-retry"
    elif op == "done":
        if active["pending"]:
            return {"status": "reconcile", "pending": active["pending"]}
        state["finished"][active["job"] + "/" + active["slot"]] = args.note
        state["active"] = None
        return {"status": "done"}
    elif op == "yield":
        active.update(checkpoint=args.note, expires=None, owner="")
        return {"status": "yielded"}
    else:
        active["checkpoint"] = args.note
        result = "ok"
    active["expires"] = (now + LEASE).isoformat()
    return {"status": result, "expires": active["expires"]}


class GitState:
    def __init__(self, repo, group):
        self.repo = repo
        self.ref = "refs/heads/marketing-coordination-v1-" + group

    def git(self, *args, data=None, check=True):
        env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
        p = subprocess.run(["git", "-C", self.repo, *args], input=data, text=True,
                           capture_output=True, env=env, timeout=60)
        if check and p.returncode:
            raise RuntimeError("Git failed during " + args[0] + "; check the repository and origin access")
        return p

    def head(self):
        out = self.git("ls-remote", "--refs", "origin", self.ref).stdout.split()
        return out[0] if out else ""

    def snapshot(self, head):
        if not head:
            return empty()
        if self.git("cat-file", "-e", head, check=False).returncode:
            self.git("fetch", "--no-write-fetch-head", "--no-tags", "origin", self.ref)
        state = json.loads(self.git("show", head + ":state.json").stdout)
        if state["version"] != 1:
            raise RuntimeError("Unsupported coordinator state")
        return state

    def read(self, head):
        state = self.snapshot(head)
        parent = state.pop("archive", "")
        while parent:
            archive = self.snapshot(parent)
            for key in ("finished", "receipts"):
                state[key].update(archive[key])
            parent = archive.get("archive", "")
        return state

    def encode(self, head, state):
        # Cloud connectors submit one file with a blob-SHA precondition. Keep
        # that file small while preserving every receipt in reachable commits.
        previous = self.snapshot(head)
        payload = state.copy()
        if previous.get("archive"):
            payload["archive"] = previous["archive"]
            old = self.read(previous["archive"])
            for key in ("finished", "receipts"):
                payload[key] = {k: v for k, v in state[key].items() if k not in old[key]}
        encode = lambda data: json.dumps(data, separators=(",", ":"), sort_keys=True)
        if head and len(encode(payload)) > 4096 and (previous["receipts"] or previous["finished"]):
            payload["archive"] = head
            for key in ("finished", "receipts"):
                prior = self.read(head)[key]
                payload[key] = {k: v for k, v in state[key].items() if k not in prior}
        return encode(payload)

    def publish(self, head, state):
        blob = self.git("hash-object", "-w", "--stdin", data=self.encode(head, state)).stdout.strip()
        config = self.git("hash-object", "-w", "--stdin", data='{"git":{"deploymentEnabled":false}}\n').stdout.strip()
        entries = f"100644 blob {blob}\tstate.json\n100644 blob {config}\tvercel.json\n"
        tree = self.git("mktree", data=entries).stdout.strip()
        parent = ["-p", head] if head else []
        commit = self.git("-c", "user.name=Marketing scheduler", "-c", "user.email=scheduler@localhost",
                          "commit-tree", tree, *parent, "-m", "[skip ci] Advance marketing run state").stdout.strip()
        try:
            result = self.git("push", "--porcelain",
                              "--force-with-lease=" + self.ref + ":" + head, "origin",
                              commit + ":" + self.ref, check=False)
            if not result.returncode:
                return True
        except subprocess.TimeoutExpired:
            pass
        current = self.head()
        if current == commit:
            return True
        if current and current != head:
            # An acknowledgement can be lost even when a later writer already advanced the ref.
            self.read(current)
            if self.git("merge-base", "--is-ancestor", commit, current, check=False).returncode == 0:
                return True
            return False
        raise RuntimeError("Git did not confirm the update; check write access to the coordination ref")


def run(args):
    store = GitState(args.repo, args.group)
    token = secrets.token_hex(24)
    for attempt in range(10):
        head = store.head()
        if args.operation == "init":
            if head:
                store.read(head)
                return {"status": "ready"}
            if store.publish("", empty()):
                return {"status": "ready"}
            continue
        if not head:
            raise RuntimeError("Group has not been initialized. Check its private origin and enrollment.")
        original = store.read(head)
        state = copy.deepcopy(original)
        reply = transition(state, args, utcnow(), token)
        if state == original or store.publish(head, state):
            return reply
        time.sleep(random.uniform(0.05, 0.35) * (attempt + 1))
    raise RuntimeError("Concurrent updates did not settle; retry later")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="Checkout with an authorized private origin")
    parser.add_argument("--group", required=True)
    ops = parser.add_subparsers(dest="operation", required=True)
    ops.add_parser("status")
    ops.add_parser("init", help="Create the group state branch before enrolling workers")
    parked = ops.add_parser("park", help="Preserve an idle supplemental checkpoint and release its group")
    parked.add_argument("--job", required=True)
    parked.add_argument("--slot", required=True)
    deferred = ops.add_parser("defer", help="Queue a pending-free inactive regular slot for retry")
    deferred.add_argument("--job", required=True)
    deferred.add_argument("--slot", required=True)
    claim = ops.add_parser("claim")
    claim.add_argument("--job", required=True)
    claim.add_argument("--slot", required=True, help="Nominal YYYY-MM-DD.HHMM or stable event identifier")
    claim.add_argument("--engine", required=True, choices=["claude", "codex"])
    for name in ("checkpoint", "yield", "done", "begin", "resolve", "retry"):
        cmd = ops.add_parser(name)
        cmd.add_argument("--token", required=True)
        cmd.add_argument("--note", required=True, help="Bounded checkpoint or receipt; opaque references only")
        if name in ("begin", "resolve", "retry"):
            cmd.add_argument("--effect", required=True, help="Stable effect ID across engines, slots and retries")
    args = parser.parse_args(argv)
    if args.operation == "claim" and re.fullmatch(r"today\.\d{4}", args.slot):
        args.slot = utcnow().astimezone(ZoneInfo("America/Los_Angeles")).date().isoformat() + args.slot[5:]
    for field in ("group", "job", "slot", "effect"):
        if hasattr(args, field) and not NAME.fullmatch(getattr(args, field)):
            parser.error("invalid " + field)
    if hasattr(args, "note") and not 0 < len(args.note.strip()) <= 2048:
        parser.error("notes must contain 1 to 2048 characters")
    return args


def main():
    args = parse_args()
    try:
        print(json.dumps(run(args)))
    except (RuntimeError, ValueError, OSError, subprocess.SubprocessError, KeyError) as exc:
        print(json.dumps({"status": "unavailable", "error": str(exc) if isinstance(exc, RuntimeError)
                          else type(exc).__name__}), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
