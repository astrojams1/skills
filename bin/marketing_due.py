#!/usr/bin/env python3
"""Dispatch a scheduled marketing pass from a private deployment catalog."""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


UTC = timezone.utc
GATE = Path(__file__).with_name("marketing_gate.py")
NAME = re.compile(r"[a-z0-9][a-z0-9-]*")
CLOCK = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d")
SLOT = re.compile(r"\d{4}-\d{2}-\d{2}\.\d{4}")
ISSUE = re.compile(r"issue\.([1-9]\d*)\.(\d+)")
SUPPLEMENT_JOB = "supplement."
SURPLUS = re.compile(r"surplus\.([0-9]{1,11})")
RUNWAY = timedelta(minutes=15)
NO_OPPORTUNITY_COOLDOWN = timedelta(hours=6)
SETTLE = ("Reconcile this previously claimed supplemental assignment. Read its checkpoint, worktree and pending "
          "effects, verify the outcome of actions already started, and record their receipts. Start no new "
          "campaign work. Mark the slot done once existing work is settled, or yield with the evidence needed "
          "to resolve an uncertain action.")
GITHUB_REPO = re.compile(r"[\w.-]+/[\w.-]+")


def instant(value):
    """Parse an ISO-8601 instant. Local times need an explicit offset."""
    moment = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if moment.tzinfo is None:
        raise ValueError("An activation instant needs its UTC offset")
    return moment.astimezone(UTC)


def validate(catalog):
    jobs = catalog["jobs"]
    if not isinstance(jobs, list):
        raise ValueError("jobs must be a list")
    seen, surplus_groups = set(), set()
    for job in jobs:
        name = job["id"]
        if not NAME.fullmatch(name) or name in seen or not NAME.fullmatch(job["group"]):
            raise ValueError("Job IDs must be unique and group names must be valid")
        seen.add(name)
        if not Path(job["repo"]).is_absolute() or not job["prompt"].strip():
            raise ValueError(f"Invalid repository or empty worker prompt for {name}")
        if "surplus_prompt" in job:
            group = job["repo"], job["group"]
            if (not isinstance(job["surplus_prompt"], str) or not job["surplus_prompt"].strip()
                    or len(SUPPLEMENT_JOB + name) > 171 or group in surplus_groups):
                raise ValueError(f"Each group may opt in one job with a nonempty surplus prompt: {name}")
            surplus_groups.add(group)
        instant(job["from"])
        ZoneInfo(job["timezone"])
        if not job["schedule"]:
            raise ValueError(f"Missing schedule for {name}")
        if "reply_issues" in job:
            config = job["reply_issues"]
            if not GITHUB_REPO.fullmatch(config["repo"]) or config.get("label") not in (None, "reply-waiting"):
                raise ValueError(f"Invalid issue enrollment for {name}")
        previous = []
        for rule in job["schedule"]:
            if not CLOCK.fullmatch(rule["at"]) or not rule["pass"].strip():
                raise ValueError(f"Invalid time or pass for {name}")
            if type(rule.get("coalesce", False)) is not bool:
                raise ValueError(f"Invalid coalesce option for {name}")
            kind = "monthdays" if "monthdays" in rule else "days"
            if kind == "monthdays" and "days" in rule:
                raise ValueError(f"Use weekdays or monthdays per rule for {name}")
            allowed = range(1, 32) if kind == "monthdays" else range(7)
            if not rule[kind] or any(type(d) is not int or d not in allowed for d in rule[kind]):
                raise ValueError(f"Invalid {kind} for {name}")
            for other in previous:
                if other["at"] == rule["at"] and (kind not in other or set(rule[kind]) & set(other[kind])):
                    raise ValueError(f"Ambiguous slot for {name}")
            previous.append(rule)
    return jobs


def at_local(day, clock, zone):
    # A repeated minute counts once (the earlier occurrence). A skipped minute
    # has no occurrence, like a wall-clock scheduler that never sees that time.
    local = datetime.combine(day, time.fromisoformat(clock), zone)
    utc = local.astimezone(UTC)
    if utc.astimezone(zone).replace(tzinfo=None) != local.replace(tzinfo=None):
        return None
    return utc


def applies(rule, day):
    if "monthdays" in rule:
        return day.day in rule["monthdays"]
    return day.weekday() in rule["days"]


def occurrences(job, now):
    zone = ZoneInfo(job["timezone"])
    today = now.astimezone(zone).date()
    activated = instant(job["from"])
    first = activated.astimezone(zone).date()
    day, newest_scan, slots = today, set(), []
    descending = sorted(job["schedule"], key=lambda rule: rule["at"], reverse=True)
    while day >= first:
        for rule in descending:
            if not applies(rule, day):
                continue
            when = at_local(day, rule["at"], zone)
            if when is None or not activated <= when <= now:
                continue
            if rule.get("coalesce"):
                if rule["pass"] in newest_scan:
                    continue
                newest_scan.add(rule["pass"])
            slots.append({"job": job["id"], "slot": f"{day.isoformat()}.{rule['at'].replace(':', '')}",
                          "pass": rule["pass"], "scheduled_at": when.isoformat()})
        day -= timedelta(days=1)
    return list(reversed(slots))


def resume(job, slot):
    if SLOT.fullmatch(slot):
        nominal = datetime.strptime(slot, "%Y-%m-%d.%H%M")
        clock = nominal.strftime("%H:%M")
        scope = next((rule["pass"] for rule in job["schedule"]
                      if rule["at"] == clock and applies(rule, nominal.date())), "resume")
        when = nominal.replace(tzinfo=ZoneInfo(job["timezone"])).astimezone(UTC)
    elif ISSUE.fullmatch(slot) or SURPLUS.fullmatch(slot):
        scope = slot.split(".", 1)[0]
        when = datetime.fromtimestamp(int(slot.rsplit(".", 1)[1]), UTC)
    else:
        raise ValueError("Unrecognized interrupted slot")
    return {"job": job["id"], "slot": slot, "pass": scope, "scheduled_at": when.isoformat()}


def gate(job, *args):
    result = subprocess.run([sys.executable, str(GATE), "--repo", job["repo"], "--group",
                             job["group"], *args], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def opened_issues(job):
    config = job["reply_issues"]
    command = ["gh", "api", "--method", "GET", "--paginate", f"repos/{config['repo']}/issues",
               "-f", "state=all", "-f", "per_page=100", "-f", f"since={instant(job['from']).isoformat()}",
               "--jq", '.[] | select(.pull_request == null) | [.number,.created_at,.state,(.closed_at // "")] | @tsv']
    if config.get("label"):
        command.extend(["-f", f"labels={config['label']}"])
    result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=90)
    for line in result.stdout.splitlines():
        number, created, state, closed = line.split("\t")
        when = instant(created)
        if when >= instant(job["from"]):
            slot = f"issue.{int(number)}.{int(when.timestamp())}"
            yield {"job": job["id"], "slot": slot, "pass": "issue", "scheduled_at": when.isoformat(),
                   "issue_state": state, "issue_closed_at": closed or None}


def ready(job, candidate, now, boost=False):
    # The native invocation has one opportunity to claim. Keep its grace
    # independent of the Codex allowance and the day of the week.
    return now >= instant(candidate["scheduled_at"]) + RUNWAY


def rotation(jobs, cursor):
    cursor = cursor.removeprefix(SUPPLEMENT_JOB)
    if cursor in jobs:
        split = jobs.index(cursor) + 1
        return jobs[split:] + jobs[:split]
    return jobs


def surplus_interval(pacing):
    if not pacing or pacing.get("level") not in (1, 2):
        return 0
    minutes = pacing.get("interval_minutes")
    return minutes * 60 if minutes in (5, 15, 60) else 0


def reserve_regular_groups(jobs, now):
    """Leave a runway for imminent scheduled passes, including siblings in the same group."""
    end = now + RUNWAY
    reserved = set()
    for job in jobs:
        zone = ZoneInfo(job["timezone"])
        first = now.astimezone(zone).date()
        last = end.astimezone(zone).date()
        activation = instant(job["from"])
        for day in {first, last}:
            for rule in job["schedule"]:
                if applies(rule, day):
                    when = at_local(day, rule["at"], zone)
                    if when is not None and now < when <= end and activation <= when:
                        reserved.add((job["repo"], job["group"]))
    return reserved


def surplus_available(finished, epoch, now):
    """One opportunity per group and interval, with cross-job quiet time after an empty scan."""
    for key, receipt in finished.items():
        match = SURPLUS.fullmatch(key.partition("/")[2])
        if not match:
            continue
        previous = int(match[1])
        if previous >= epoch:
            return False
        if receipt.partition(" ")[0] == "no-opportunity" and now - previous < NO_OPPORTUNITY_COOLDOWN.total_seconds():
            return False
    return True


def parked_checkpoint(finished, assignment):
    # Only the newest slot can still need follow-up; an older parked result can already
    # have been settled by a later completed assignment.
    prefix = assignment + "/"
    newest, receipt = -1, ""
    for key, note in finished.items():
        if not key.startswith(prefix):
            continue
        match = SURPLUS.fullmatch(key[len(prefix):])
        if match and int(match[1]) > newest:
            newest, receipt = int(match[1]), note
    if receipt.startswith("surplus-deferred "):
        return receipt.removeprefix("surplus-deferred ")
    return None


def regular_candidates(members, state, now, issues, errors, issue_failures):
    """Collect a whole group's native arrivals before deciding what can occupy it."""
    candidates = {}
    for job in members:
        items = occurrences(job, now)
        if "reply_issues" in job:
            try:
                items.extend(issues(job))
            except (ValueError, OSError, subprocess.SubprocessError):
                errors.append({"job": job["id"], "error": "GitHub issue lookup failed"})
                issue_failures.add((job["repo"], job["group"]))
        for item in sorted(items, key=lambda item: item["scheduled_at"]):
            key = job["id"] + "/" + item["slot"]
            if key not in state["finished"]:
                candidates[key] = (job, item)
    active = state["active"]
    if active:
        candidates.pop(active["job"] + "/" + active["slot"], None)
    retries = []
    for key, record in state.get("deferred", {}).items():
        pair = candidates.pop(key, None)
        if key in state["finished"] or instant(record["retry_at"]) > now:
            continue
        name, slot = key.split("/", 1)
        job = next((member for member in members if member["id"] == name), None)
        if job is not None:
            # The underlying polling rule may have coalesced since the claim.
            retries.append(pair or (job, resume(job, slot)))
    return list(candidates.values()), retries


def dispatch(jobs, now, cursor="", exclude=(), call=gate, issues=opened_issues, pacing=None):
    by_id = {job["id"]: job for job in jobs}
    order = [by_id[name] for name in rotation(list(by_id), cursor)]
    states, errors, blocked = {}, [], set()
    recoveries, issue_failures = [], set()
    runway = reserve_regular_groups(jobs, now)
    groups = {}
    for job in order:
        groups.setdefault((job["repo"], job["group"]), []).append(job)
    last = by_id.get(cursor.removeprefix(SUPPLEMENT_JOB))
    if last:
        previous_group = last["repo"], last["group"]
        groups[previous_group] = groups.pop(previous_group)
    interval = surplus_interval(pacing)

    def take(job, item, prompt):
        group = job["repo"], job["group"]
        try:
            result = call(job, "claim", "--job", item["job"], "--slot", item["slot"], "--engine", "codex")
            if result["status"] == "acquired":
                return {"status": "running", **item, "repo": job["repo"], "group": job["group"],
                        "timezone": job["timezone"], "gate": result, "prompt": prompt, "warnings": errors}
            if result["status"] in ("busy", "resume-first"):
                blocked.add(group)
            elif result["status"] not in ("done", "deferred"):
                raise ValueError("Unexpected claim response")
        except (KeyError, ValueError, OSError, subprocess.SubprocessError):
            blocked.add(group)
            errors.append({"group": job["group"], "error": "Coordinator claim failed"})
        return None

    for group, members in groups.items():
        if group[1] in exclude:
            continue
        job = members[0]
        try:
            state = states[group] = call(job, "status")
            if state["status"] != "ok":
                raise ValueError("Unexpected status response")
            active = state["active"]
            if active and active["expires"] and instant(active["expires"]) > now:
                continue
            fresh, retries = regular_candidates(members, state, now, issues, errors, issue_failures)
            native_window = any(not ready(member, item, now) for member, item in fresh)
            if active:
                owner = by_id.get(active["job"].removeprefix(SUPPLEMENT_JOB))
                if owner not in members:
                    raise ValueError("Missing owner in group catalog")
                item = resume(owner, active["slot"])
                extra = active["job"].startswith(SUPPLEMENT_JOB)
                if extra != (item["pass"] == "surplus"):
                    raise ValueError("Inconsistent claim scope")
                item["job"] = active["job"]
                competing = bool(fresh or retries or (extra and group in runway))
                if active.get("pending") == {} and competing:
                    operation, expected = ("park", "parked") if extra else ("defer", "deferred")
                    outcome = call(owner, operation, "--job", active["job"], "--slot", active["slot"])
                    if outcome["status"] != expected:
                        blocked.add(group)
                        continue
                    state = states[group] = call(owner, "status")
                    if state["status"] != "ok" or state["active"]:
                        blocked.add(group)
                        continue
                elif extra:
                    prompt = owner.get("surplus_prompt", "")
                    if active.get("pending") or not interval or not prompt:
                        prompt = SETTLE + ("\n\nOriginal supplemental scope for reference\n" + prompt if prompt else "")
                    recoveries.append((owner, item, prompt))
                    continue
                else:
                    result = take(owner, item, owner["prompt"])
                    if result:
                        return result
                    continue
            if native_window:
                # A sibling backlog item or optional pass would take the same
                # lock away from the native invocation during its startup.
                blocked.add(group)
                continue
            for member, item in fresh + retries:
                result = take(member, item, member["prompt"])
                if result:
                    return result
                if group in blocked:
                    break
        except (KeyError, ValueError, OSError, subprocess.SubprocessError):
            blocked.add(group)
            errors.append({"group": group[1], "error": "Coordinator lookup or claim failed"})

    for job, item, prompt in recoveries:
        if (job["repo"], job["group"]) not in blocked:
            result = take(job, item, prompt)
            if result:
                return result

    if interval:
        timestamp = int(now.timestamp())
        epoch = timestamp - timestamp % interval
        nominal = datetime.fromtimestamp(epoch, UTC)
        unavailable = blocked | issue_failures | runway
        for job in order:
            group = job["repo"], job["group"]
            if not job.get("surplus_prompt") or group not in states or group in unavailable:
                continue
            state = states[group]
            if state["active"] or nominal < instant(job["from"]):
                continue
            if not surplus_available(state["finished"], epoch, timestamp):
                continue
            item = {"job": SUPPLEMENT_JOB + job["id"], "slot": f"surplus.{epoch}",
                    "pass": "surplus", "scheduled_at": nominal.isoformat()}
            prompt = job["surplus_prompt"]
            checkpoint = parked_checkpoint(state["finished"], item["job"])
            if checkpoint:
                item["parked_checkpoint"] = checkpoint
                prompt = "Read parked_checkpoint in this assignment and reconcile that work before selecting new work.\n\n" + prompt
            result = take(job, item, prompt)
            if result:
                return result
    return {"status": "unavailable" if errors else "idle", "warnings": errors}


def remember(cursor_path, name):
    # A lost cursor affects only which equally ready group gets polled first.
    with tempfile.NamedTemporaryFile(dir=cursor_path.parent, delete=False, mode="w") as output:
        try:
            output.write(name)
            output.close()
            os.replace(output.name, cursor_path)
        finally:
            Path(output.name).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--plan", action="store_true", help="Offline schedule preview; no claims or private prompts")
    parser.add_argument("--at", help="UTC or offset-aware instant for preview")
    parser.add_argument("--exclude-group", action="append", default=[], help="Group already handled this wake")
    args = parser.parse_args()
    if args.at and not args.plan:
        parser.error("--at is for --plan only")
    try:
        jobs = validate(json.loads(args.catalog.read_text()))
        now = instant(args.at) if args.at else datetime.now(UTC)
        if args.plan:
            entries = []
            for job in jobs:
                if job["group"] not in args.exclude_group:
                    slots = occurrences(job, now)
                    entries.append({"id": job["id"], "group": job["group"], "since_activation": len(slots),
                                    "nominal": slots[-1] if slots else None})
            result = {"status": "plan", "at": now.isoformat(), "jobs": entries}
        else:
            cursor_path = args.catalog.with_name("." + args.catalog.name + ".cursor")
            cursor = cursor_path.read_text().strip() if cursor_path.exists() else ""
            result = dispatch(jobs, now, cursor, args.exclude_group)
            if result["status"] == "running":
                try:
                    remember(cursor_path, result["job"])
                except OSError:
                    result["warnings"].append({"job": result["job"], "error": "Could not save rotation cursor"})
    except (TypeError, KeyError, ValueError, OSError, ZoneInfoNotFoundError) as exc:
        print(json.dumps({"status": "invalid", "error": type(exc).__name__}), file=sys.stderr)
        return 1
    print(json.dumps(result))
    return int(result["status"] == "unavailable")


if __name__ == "__main__":
    sys.exit(main())
