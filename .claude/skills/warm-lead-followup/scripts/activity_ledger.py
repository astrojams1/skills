#!/usr/bin/env python3
"""Append one private, locked skill-activity JSONL event from stdin."""
import argparse
import datetime as dt
import fcntl
import gzip
import json
import os
from pathlib import Path
import shutil
import sys
import uuid

EVENTS = {"start", "action", "finding", "verify", "end"}
STATUSES = {"running", "ok", "failed", "skipped", "deferred", "partial"}
ALLOWED = {"v", "ts", "run_id", "skill", "agent", "event", "status", "targets",
           "operation", "evidence", "metrics_before", "metrics_after", "artifacts",
           "rollback", "reason", "next", "elapsed_ms"}


def append(path, value):
    if not isinstance(value, dict):
        raise ValueError("Event must be a JSON object")
    extra = set(value) - ALLOWED
    if extra:
        raise ValueError("Unsupported event fields: " + ", ".join(sorted(extra)))
    event = {"v": 1, "ts": dt.datetime.now(dt.timezone.utc).isoformat(), **value}
    for key in ("run_id", "skill", "agent"):
        if not isinstance(event.get(key), str) or not event[key].strip():
            raise ValueError("Missing nonempty " + key)
    if event["v"] != 1 or event.get("event") not in EVENTS or event.get("status") not in STATUSES:
        raise ValueError("Invalid version, event or status")
    timestamp = dt.datetime.fromisoformat(event["ts"].replace("Z", "+00:00"))
    if timestamp.tzinfo is None or timestamp.utcoffset() != dt.timedelta(0):
        raise ValueError("Timestamp must use UTC")
    payload = (json.dumps(event, separators=(",", ":"), ensure_ascii=True, allow_nan=False) + "\n").encode()
    if len(payload) >= 16384:
        raise ValueError("Event must be below 16 KiB")
    path = Path(path).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock_fd = os.open(path.parent / ".lock", os.O_CREAT | os.O_RDWR, 0o600)
    with os.fdopen(lock_fd, "a") as lock:
        os.fchmod(lock.fileno(), 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        if path.exists() and path.stat().st_size > 8 * 1024**2:
            stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
            archive = path.with_name(path.stem + "-" + stamp + "-" + uuid.uuid4().hex[:8] + ".jsonl.gz")
            archive_fd = os.open(archive, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            with os.fdopen(archive_fd, "wb") as raw:
                with gzip.GzipFile(fileobj=raw, mode="wb") as dest, path.open("rb") as src:
                    shutil.copyfileobj(src, dest)
                raw.flush()
                os.fsync(raw.fileno())
            path.unlink()
        fd = os.open(path, os.O_APPEND | os.O_WRONLY | os.O_CREAT, 0o600)
        with os.fdopen(fd, "ab") as output:
            os.fchmod(output.fileno(), 0o600)
            output.write(payload)
            output.flush()
            os.fsync(output.fileno())
    return {"recorded": True, "run_id": event["run_id"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", type=Path, default=Path.home() / "Library/Application Support/AgentActivityLedger/events.jsonl")
    args = parser.parse_args()
    try:
        print(json.dumps(append(args.path, json.load(sys.stdin))))
    except (ValueError, TypeError, OSError) as exc:
        print(json.dumps({"recorded": False, "error": str(exc)}), file=sys.stderr)
        sys.exit(1)
