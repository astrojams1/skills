#!/usr/bin/env python3
"""Poll the shared marketing queue and start subscription-authenticated Codex workers."""
import argparse
import fcntl
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path

import marketing_due as due
import marketing_pacing as pacing


LANES = 2
MAX_LANES = 4
BACKOFF = 3600
BUNDLED = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex"


def check_login(codex):
    result = subprocess.run([codex, "login", "status"], env=pacing.subscription_env(), text=True,
                            capture_output=True, timeout=30)
    return result.returncode == 0 and any(line.strip().lower() == "logged in using chatgpt"
                                          for line in (result.stdout + result.stderr).splitlines())


def save(path, value):
    with tempfile.NamedTemporaryFile("w", dir=path.parent, delete=False) as tmp:
        try:
            json.dump(value, tmp)
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp.close()
            os.replace(tmp.name, path)
        finally:
            Path(tmp.name).unlink(missing_ok=True)


def read(path, default):
    try:
        return json.loads(path.read_text())
    except FileNotFoundError:
        return default


def alive(pid):
    if not isinstance(pid, int) or pid < 1:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def process_birth(pid):
    if not alive(pid):
        return None
    info = subprocess.run(["ps", "-p", str(pid), "-o", "lstart="], capture_output=True, text=True)
    return info.stdout.strip() or None


def worker_alive(claim):
    birth = claim.get("worker_birth")
    return bool(birth and birth == process_birth(claim.get("worker_pid")))


def health(cfg):
    now = int(time.time())
    heartbeat = read(cfg.runtime / "heartbeat.json", {})
    state = read(cfg.runtime / "scheduler.json", {})
    age = now - heartbeat["at"] if heartbeat else None
    fresh = age is not None and 0 <= age < 3 * heartbeat["interval"] + 30 and alive(heartbeat["pid"])
    lanes = []
    stalled = []
    for lane in range(MAX_LANES):
        claim = read(cfg.runtime / f"lane-{lane}.json", None)
        if claim:
            pid = claim.get("worker_pid")
            if not worker_alive(claim) and any(
                row["status"] == "handoff-unverified" and row.get("group") == claim["group"]
                and row.get("job") == claim["job"] and row["at"] >= claim.get("worker_started_at", 0)
                for row in state.get("recent", [])
            ):
                stalled.append(lane)
            lanes.append({"lane": lane, "job": claim["job"], "group": claim["group"], "slot": claim["slot"],
                          "pid": pid, "process_alive": worker_alive(claim)})
    return {"pacing": heartbeat.get("pacing") or {"level": 0, "status": "baseline"},
            "target_lanes": heartbeat.get("target_lanes", LANES),
            "stalled_lanes": stalled, "daemon_fresh": fresh, "paused": cfg.catalog.with_name("PAUSED").exists(),
            "heartbeat": heartbeat or None, "age_seconds": age,
            "cooldowns": {k: v for k, v in state.get("cooldowns", {}).items() if v > now}, "active_lanes": lanes}


def lock(path):
    fd = path.open("a")
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        fd.close()
        return None
    return fd


def retry_class(message):
    lower = message.lower()
    if any(mark in lower for mark in ("usage limit", "usage_limit", "exceeded your quota", "rate_limit",
                                      "rate limit", "too many requests", "insufficient_quota")):
        return "quota"
    if any(mark in lower for mark in ("not logged in", "unauthorized", "authentication failed", "401 unauthorized")):
        return "auth"
    return None


def run_codex(cfg, assignment, lane_fd):
    protocol = cfg.template.read_text()
    prompt = (f"Work on the single assignment saved in {assignment}. Read that private JSON locally. "
              "Its prompt is the original scheduled routine. Execute the assigned job using this protocol.\n\n"
              + protocol)
    args = [cfg.codex, "-c", 'model_provider="openai"', "-c", 'forced_login_method="chatgpt"',
            "exec", "--ephemeral", "--json", "--skip-git-repo-check", "--cd", str(cfg.runtime), "-"]
    with subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          cwd=cfg.runtime, env=pacing.subscription_env(), pass_fds=(lane_fd,)) as child:
        claim = read(assignment, {})
        claim.update(worker_pid=child.pid, worker_birth=process_birth(child.pid), worker_started_at=int(time.time()))
        save(assignment, claim)
        child.stdin.write(prompt.encode())
        child.stdin.close()
        failure = None
        # Child output may contain customer data, credentials, or file contents.
        # Inspect bounded error records only; no raw model output goes to disk.
        while True:
            line = child.stdout.readline(65536)
            if not line:
                break
            if not line.endswith(b"\n"):
                while line and not line.endswith(b"\n"):
                    line = child.stdout.readline(65536)
                continue
            try:
                event = json.loads(line)
                if event.get("type") in ("error", "turn.failed"):
                    message = event.get("error") or event.get("message") or ""
                    failure = retry_class(str(message)) or failure
            except (TypeError, ValueError, AttributeError):
                continue
        return child.wait(), failure


def finish(claim, call=due.gate):
    """Only a durable receipt completes work. Gate fences a superseded owner."""
    result = call(claim, "status")
    if result["status"] != "ok":
        raise ValueError("Unverified status")
    key = claim["job"] + "/" + claim["slot"]
    if key in result["finished"]:
        return "completed"
    if key in result.get("deferred", {}):
        return "deferred"
    active = result["active"]
    if not active or active["job"] != claim["job"] or active["slot"] != claim["slot"]:
        return "superseded"
    if active["expires"] is None:
        return "yielded"
    reply = call(claim, "yield", "--token", claim["gate"]["token"], "--note",
                 active["checkpoint"] or "Worker exited. Reconcile campaign evidence and open effects before continuing.")
    if reply["status"] == "yielded":
        return "deferred" if reply.get("deferred") else "yielded"
    if reply["status"] == "lost":
        return "superseded"
    raise ValueError("Unconfirmed handoff")


def park_surplus(job, active):
    return due.gate(job, "park", "--job", active["job"], "--slot", active["slot"])["status"]


def recover_handoffs(cfg):
    """Retry failed handoffs from the signed-in host using each worker's OS lock."""
    repaired = []
    for lane in health(cfg)["stalled_lanes"]:
        handle = lock(cfg.runtime / f"lane-{lane}.lock")
        if handle is None:
            continue
        with handle:
            path = cfg.runtime / f"lane-{lane}.json"
            claim = read(path, None)
            if not claim or worker_alive(claim):
                continue
            outcome = finish(claim)
            if claim.get("pass") == "surplus" and outcome in {"yielded", "superseded"}:
                park_surplus(claim, claim)
            path.unlink()
            repaired.append(lane)
    return repaired


class Supervisor:
    def __init__(self, cfg):
        self.cfg = cfg
        self.runtime = cfg.runtime
        self.state_path = self.runtime / "scheduler.json"
        self.state = read(self.state_path, {"cooldowns": {}, "recent": [], "cursor": ""})
        self.guard = threading.RLock()
        self.threads = {}

    def record(self, outcome, group=None, job=None, pause=None):
        with self.guard:
            stamp = int(time.time())
            row = {"at": stamp, "status": outcome}
            if group:
                row.update(group=group, job=job)
            if pause:
                self.state["cooldowns"][pause] = stamp + BACKOFF
            self.state["recent"] = (self.state["recent"] + [row])[-64:]
            save(self.state_path, self.state)

    def reconcile(self, path, claim, reason):
        if reason:
            self.record(reason, pause="*")
        try:
            outcome = finish(claim)
            if (outcome in {"yielded", "superseded"} and claim.get("pass") == "surplus"
                    and park_surplus(claim, claim) == "parked"):
                outcome = "parked"
        except (OSError, ValueError, KeyError, subprocess.SubprocessError):
            self.record("handoff-unverified", claim["group"], claim["job"], pause=claim["group"])
            return
        self.record(outcome, claim["group"], claim["job"],
                    pause=claim["group"] if outcome not in {"completed", "parked", "deferred"} else None)
        path.unlink(missing_ok=True)

    def work(self, handle, path, claim):
        with handle:
            try:
                code, reason = run_codex(self.cfg, path, handle.fileno())
                if code and not reason:
                    reason = "cli-unavailable"
            except (OSError, ValueError, subprocess.SubprocessError):
                reason = "launch-failed"
            self.reconcile(path, claim, reason)

    def release_idle_extras(self, jobs, occupied):
        for job in jobs:
            if not job.get("surplus_prompt") or job["group"] in occupied:
                continue
            try:
                active = due.gate(job, "status")["active"]
                if (active and active["job"].startswith("supplement.") and not active["pending"]
                        and (not active["expires"] or due.instant(active["expires"]) <= datetime.now(due.UTC))):
                    park_surplus(job, active)
            except (OSError, KeyError, ValueError, subprocess.SubprocessError):
                self.record("surplus-handoff-unverified", job["group"], job["id"])

    def wake(self):
        now = datetime.now(due.UTC)
        catalog = read(self.cfg.catalog, {})
        jobs = due.validate(catalog)
        policy = {"level": 0, "status": "baseline", "included_exhausted": False}
        pause_file = self.cfg.catalog.with_name("PAUSED")
        if jobs and catalog.get("weekly_pacing") is True and not pause_file.exists():
            policy = pacing.plan(self.cfg.codex, self.runtime, now)
        target = LANES + policy["level"]
        if policy["included_exhausted"]:
            target = 0
        elif policy.get("weekly") and policy["weekly"]["remaining_percent"] <= 3:
            target = 1
        save(self.runtime / "heartbeat.json",
             {"at": int(time.time()), "pid": os.getpid(), "interval": self.cfg.interval,
              "target_lanes": target, "pacing": policy})
        occupied = set()
        available = []
        # The CLI inherits this OS lock. A restarted supervisor leaves a surviving
        # CLI alone even if its last checkpoint is older than the network lease.
        taken = 0
        for lane in range(MAX_LANES):
            path = self.runtime / f"lane-{lane}.json"
            if lane >= target and not path.exists():
                continue
            handle = lock(self.runtime / f"lane-{lane}.lock")
            claim = read(path, None)
            if handle is None:
                taken += 1
                if claim:
                    occupied.add(claim["group"])
                continue
            if claim:
                if worker_alive(claim):
                    taken += 1
                    occupied.add(claim["group"])
                    handle.close()
                    continue
                if self.state["cooldowns"].get(claim["group"], 0) <= time.time():
                    self.reconcile(path, claim, None)
                if path.exists():
                    occupied.add(claim["group"])
                    handle.close()
                    continue
            available.append((lane, handle, path))
        try:
            free_lanes = max(0, target - taken)
            blocked = policy["included_exhausted"] or self.state["cooldowns"].get("*", 0) > time.time()
            if blocked and not pause_file.exists():
                self.release_idle_extras(jobs, occupied)
            if not free_lanes or not available or not jobs or pause_file.exists() or blocked:
                return
            if not check_login(self.cfg.codex):
                self.record("chatgpt-login-unavailable", pause="*")
                return
            for lane, handle, path in available[:free_lanes]:
                if pause_file.exists():
                    break
                with self.guard:
                    excluded = occupied | {k for k, end in self.state["cooldowns"].items() if end > time.time()}
                    if "*" in excluded:
                        break
                    cursor = self.state["cursor"]
                result = due.dispatch(jobs, datetime.now(due.UTC), cursor, excluded, pacing=policy)
                for error in result.get("warnings", []):
                    group = error.get("group") or next((j["group"] for j in jobs if j["id"] == error.get("job")), None)
                    if group:
                        self.record("lookup-failed", group, error.get("job"), pause=group)
                if result["status"] != "running":
                    break
                # Persist the token before giving it to a worker. If persistence
                # fails the remote lease still expires and another engine recovers it.
                save(path, result)
                with self.guard:
                    self.state["cursor"] = result["job"]
                    self.record("started", result["group"], result["job"])
                occupied.add(result["group"])
                thread = threading.Thread(target=self.work, args=(handle, path, result))
                thread.start()
                self.threads[lane] = thread
        finally:
            for lane, handle, path in available:
                if lane not in self.threads or not self.threads[lane].is_alive():
                    handle.close()
            self.threads = {lane: thread for lane, thread in self.threads.items() if thread.is_alive()}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--runtime", required=True, type=Path)
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--codex", default=BUNDLED)
    parser.add_argument("--interval", type=int, default=120)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Check configuration and login without claiming work")
    mode.add_argument("--recover-handoffs", action="store_true", help="Reconcile failed dead lanes without dispatching")
    mode.add_argument("--once", action="store_true", help="Poll once and wait for workers to exit")
    cfg = parser.parse_args(argv)
    if cfg.interval < 1:
        parser.error("Polling interval must be positive")
    os.umask(0o077)
    try:
        jobs = due.validate(json.loads(cfg.catalog.read_text()))
        if not cfg.template.read_text().strip() or not cfg.runtime.is_absolute():
            raise ValueError("Invalid runtime or worker instructions")
        ssd = Path("/Volumes/ssd")
        if cfg.runtime.is_relative_to(ssd) and not ssd.is_mount():
            raise OSError("SSD is not mounted")
        if cfg.runtime.exists() and cfg.runtime.stat().st_mode & 0o077:
            raise ValueError("Worker runtime must be private")
        if cfg.recover_handoffs:
            print(json.dumps({"recovered": recover_handoffs(cfg)}))
            return 0
        if cfg.check:
            logged_in = check_login(cfg.codex)
            snapshot = health(cfg)
            print(json.dumps({"status": ("auth-unavailable" if not logged_in else
                                         "degraded" if snapshot["stalled_lanes"] else "ready"), "jobs": len(jobs),
                              "lanes": snapshot["target_lanes"], "interval": cfg.interval, "runtime": snapshot}))
            return int(not logged_in)
        cfg.runtime.mkdir(mode=0o700, exist_ok=True)
        service = lock(cfg.runtime / "supervisor.lock")
        if service is None:
            return 0
        with service:
            scheduler = Supervisor(cfg)
            while True:
                try:
                    scheduler.wake()
                except (OSError, ValueError, TypeError, KeyError, subprocess.SubprocessError):
                    scheduler.record("poll-failed", pause="*")
                if cfg.once:
                    for thread in scheduler.threads.values():
                        thread.join()
                    break
                time.sleep(cfg.interval)
        return 0
    except (OSError, ValueError, TypeError, KeyError, subprocess.SubprocessError) as exc:
        print(json.dumps({"status": "unavailable", "category": type(exc).__name__}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
