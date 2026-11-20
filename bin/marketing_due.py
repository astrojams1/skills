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
    seen = set()
    for job in jobs:
        name = job["id"]
        if not NAME.fullmatch(name) or name in seen or not NAME.fullmatch(job["group"]):
            raise ValueError("Job IDs must be unique and group names must be valid")
        seen.add(name)
        if not Path(job["repo"]).is_absolute() or not job["prompt"].strip():
            raise ValueError(f"Invalid repository or empty worker prompt for {name}")
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
    elif ISSUE.fullmatch(slot):
        scope = "issue"
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


def ready(job, candidate, now):
    when = instant(candidate["scheduled_at"])
    # Claude claims immediately on every pass. Codex gives it a short head
    # start on alternate local dates; the Git ref elects a sole winner.
    local = when.astimezone(ZoneInfo(job["timezone"]))
    delay = timedelta(minutes=15 if local.date().toordinal() % 2 else 0)
    return now >= when + delay


def rotation(jobs, cursor):
    if cursor in jobs:
        split = jobs.index(cursor) + 1
        return jobs[split:] + jobs[:split]
    return jobs


def dispatch(jobs, now, cursor="", exclude=(), call=gate, issues=opened_issues):
    by_id = {job["id"]: job for job in jobs}
    states, errors, blocked = {}, [], set()
    for name in rotation(list(by_id), cursor):
        job = by_id[name]
        group = job["repo"], job["group"]
        if job["group"] in exclude or group in blocked:
            continue
        try:
            if group not in states:
                states[group] = call(job, "status")
            state = states[group]
            if state["status"] != "ok":
                raise ValueError("Unexpected status response")
            active = state["active"]
            if active:
                if active["job"] not in by_id or (by_id[active["job"]]["repo"],
                                                  by_id[active["job"]]["group"]) != group:
                    errors.append({"group": job["group"], "error": "An active job needs its catalog entry"})
                    blocked.add(group)
                    continue
                if active["job"] != name or (active["expires"] and instant(active["expires"]) > now):
                    continue
                candidates = [resume(job, active["slot"])]
            else:
                candidates = []
                if "reply_issues" in job:
                    try:
                        candidates = list(issues(job))
                    except (ValueError, OSError, subprocess.SubprocessError):
                        errors.append({"job": name, "error": "GitHub issue lookup failed"})
                candidates.extend(occurrences(job, now))
                candidates.sort(key=lambda item: item["scheduled_at"])
            for item in candidates:
                if not active and not ready(job, item, now):
                    continue
                if name + "/" + item["slot"] in state["finished"]:
                    continue
                result = call(job, "claim", "--job", name, "--slot", item["slot"], "--engine", "codex")
                if result["status"] == "acquired":
                    return {"status": "running", **item, "repo": job["repo"], "group": job["group"],
                            "timezone": job["timezone"], "gate": result, "prompt": job["prompt"],
                            "warnings": errors}
                if result["status"] in ("busy", "resume-first"):
                    blocked.add(group)
                    break
                if result["status"] != "done":
                    raise ValueError("Unexpected claim response")
        except (KeyError, ValueError, OSError, subprocess.SubprocessError):
            blocked.add(group)
            errors.append({"group": job["group"], "error": "Coordinator lookup or claim failed"})
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
