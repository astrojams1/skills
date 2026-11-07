#!/usr/bin/env python3
"""Register and privacy guard for recorded calls. Python 3.9+, standard library only.

  init <date> <person> <product>          make a private call folder
  add <call> --type T --summary S ...     add an item
  update <call> <id> --status S ...       append a new state for an item
  status <call>                           one call's items, current state
  due [--days N]                          open items across all calls, overdue or due soon
  guard --call <call> [--repo P] [--file F ...]   check nothing from the call leaks

Items live in <call>/items.jsonl: append-only, and the last line for an id wins.
Set CALLS_HOME to use another root (the tests do).
"""
import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HOME = Path(os.environ.get("CALLS_HOME", "/Volumes/ssd/projects/calls"))
TYPES = ("commitment", "action", "idea", "validation", "marketing", "research", "risk", "relationship")
STATES = ("open", "waiting", "done", "dropped")
CLOSED = ("done", "dropped")
AUDIO = {".m4a", ".qta", ".wav", ".mp3", ".aac", ".aiff", ".aif", ".caf", ".flac", ".ogg", ".opus"}
NAMES = re.compile(r"(^|/)(transcript[^/]*\.(txt|vtt|srt|json|md)|items\.jsonl)$", re.I)
RUN = 8  # consecutive transcript words that count as quoting it


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def fail(message):
    sys.exit("call_triage: " + message)


def call_dir(value):
    path = Path(value)
    if not path.is_absolute():
        path = HOME / value
    if not path.is_dir():
        fail("no such call: " + str(path))
    return path


def load(call):
    """The items of a call, last state of each id, in the order they were first added."""
    items = {}
    source = call / "items.jsonl"
    if source.exists():
        for line in source.read_text(encoding="utf-8").splitlines():
            if line.strip():
                record = json.loads(line)
                items.setdefault(record["id"], {}).update(record)
    return items


def append(call, record):
    record["updated"] = dt.date.today().isoformat()
    flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND
    with os.fdopen(os.open(call / "items.jsonl", flags, 0o600), "a", encoding="utf-8") as out:
        out.write(json.dumps(record, ensure_ascii=False) + "\n")


def cmd_init(args):
    dt.date.fromisoformat(args.date)
    call = HOME / "-".join([args.date, slug(args.person), slug(args.product)])
    HOME.mkdir(parents=True, exist_ok=True)
    (call / "audio").mkdir(parents=True, exist_ok=True)
    for path in (HOME, call, call / "audio"):
        os.chmod(path, 0o700)
    print(call)


def cmd_add(args):
    call = call_dir(args.call)
    items = load(call)
    number = 1 + max([int(i.split("-")[1]) for i in items] or [0])
    record = {
        "id": "item-%03d" % number,
        "type": args.type,
        "summary": args.summary,
        "owner": args.owner,
        "destination": args.destination,
        "next": args.next,
        "status": args.status,
    }
    for key in ("due", "evidence", "source"):
        if getattr(args, key):
            record[key] = getattr(args, key)
    check(record)
    append(call, record)
    print(record["id"])


def check(record):
    if record.get("status") == "waiting" and not record.get("due"):
        fail("a waiting item needs --due")
    if record.get("status") == "done" and not record.get("evidence"):
        fail("a done item needs --evidence")
    if record.get("due"):
        dt.date.fromisoformat(record["due"])


def cmd_update(args):
    call = call_dir(args.call)
    items = load(call)
    if args.id not in items:
        fail("no such item: " + args.id)
    change = {"id": args.id}
    for key in ("status", "next", "due", "evidence", "owner", "destination"):
        if getattr(args, key):
            change[key] = getattr(args, key)
    check(dict(items[args.id], **change))
    append(call, change)
    print(args.id, change.get("status", items[args.id]["status"]))


def line(item):
    due = " due " + item["due"] if item.get("due") else ""
    return "%s %-8s %-12s %s [%s]%s -> %s" % (
        item["id"], item["status"], item["type"], item["summary"], item["owner"], due, item.get("next") or "-")


def cmd_status(args):
    items = load(call_dir(args.call))
    for item in items.values():
        print(line(item))
    counts = {state: sum(i["status"] == state for i in items.values()) for state in STATES}
    print(" ".join("%s=%d" % pair for pair in counts.items()))


def cmd_due(args):
    limit = dt.date.today() + dt.timedelta(days=args.days)
    found = 0
    for call in sorted(HOME.glob("20*-*")):
        for item in load(call).values():
            if item["status"] in CLOSED:
                continue
            due = dt.date.fromisoformat(item["due"]) if item.get("due") else None
            # An open item with no date is always listed: nothing silently waits.
            if due is None or due <= limit:
                print(call.name, line(item))
                found += 1
    print("open or due: %d" % found)


def words(text):
    return re.findall(r"[a-z0-9']+", text.lower())


def phrases(call):
    """Every RUN-word sequence in the transcript, without its timestamps."""
    source = call / "transcript.txt"
    if not source.exists():
        return set()
    text = re.sub(r"\[\d\d:\d\d:\d\d\]", " ", source.read_text(encoding="utf-8"))
    tokens = words(text)
    return {" ".join(tokens[i:i + RUN]) for i in range(len(tokens) - RUN + 1)}


def quoted(text, known):
    tokens = words(text)
    hits = [" ".join(tokens[i:i + RUN]) for i in range(len(tokens) - RUN + 1)]
    return sorted({hit for hit in hits if hit in known})


def git(repo, *args):
    done = subprocess.run(["git", "-C", str(repo)] + list(args), capture_output=True, text=True)
    if done.returncode != 0:
        fail("git failed in %s: %s" % (repo, done.stderr.strip()))
    return done.stdout


def repo_paths(repo, base):
    """Tracked files plus anything staged or untracked; with a base, only what changed since it."""
    if base:
        names = git(repo, "diff", "--name-only", "--diff-filter=d", base)
    else:
        names = git(repo, "ls-files")
    names += git(repo, "ls-files", "--others", "--exclude-standard")
    return sorted(set(filter(None, names.splitlines())))


def cmd_guard(args):
    call = call_dir(args.call)
    known = phrases(call)
    problems = []

    def inspect(label, path):
        if path.suffix.lower() in AUDIO:
            problems.append("audio file: " + label)
        elif NAMES.search(label):
            problems.append("transcript or register: " + label)
        else:
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                return
            for hit in quoted(text, known)[:3]:
                problems.append("quotes the transcript: %s (%d-word run: %s...)" % (label, RUN, " ".join(hit.split()[:4])))

    if args.repo:
        repo = Path(args.repo)
        inside = git(repo, "rev-parse", "--show-toplevel").strip()
        if Path(inside).resolve() in [call.resolve()] + list(call.resolve().parents):
            problems.append("the call folder is inside a Git repository: " + inside)
        for name in repo_paths(repo, args.base):
            if (repo / name).is_file():
                inspect(name, repo / name)
    for name in args.file or []:
        inspect(name, Path(name))

    mode = os.stat(call).st_mode & 0o777
    if mode != 0o700:
        problems.append("call folder mode is %o, not 700" % mode)
    leftover = [p.name for p in (call / "audio").glob("*")] if (call / "audio").is_dir() else []
    for problem in problems:
        print("FAIL", problem)
    if leftover:
        print("note: audio copy still in the call folder:", ", ".join(leftover))
    print("guard: %s (%d transcript phrases checked)" % ("fail" if problems else "ok", len(known)))
    sys.exit(1 if problems else 0)


def parser():
    top = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = top.add_subparsers(dest="command", required=True)

    p = sub.add_parser("init")
    p.add_argument("date")
    p.add_argument("person")
    p.add_argument("product")
    p.set_defaults(run=cmd_init)

    p = sub.add_parser("add")
    p.add_argument("call")
    p.add_argument("--type", required=True, choices=TYPES)
    p.add_argument("--summary", required=True)
    p.add_argument("--owner", required=True)
    p.add_argument("--destination", required=True)
    p.add_argument("--next", default="")
    p.add_argument("--status", default="open", choices=STATES)
    p.add_argument("--due")
    p.add_argument("--evidence")
    p.add_argument("--source", help="where in the call, as a timestamp")
    p.set_defaults(run=cmd_add)

    p = sub.add_parser("update")
    p.add_argument("call")
    p.add_argument("id")
    p.add_argument("--status", choices=STATES)
    p.add_argument("--next")
    p.add_argument("--due")
    p.add_argument("--evidence")
    p.add_argument("--owner")
    p.add_argument("--destination")
    p.set_defaults(run=cmd_update)

    p = sub.add_parser("status")
    p.add_argument("call")
    p.set_defaults(run=cmd_status)

    p = sub.add_parser("due")
    p.add_argument("--days", type=int, default=7)
    p.set_defaults(run=cmd_due)

    p = sub.add_parser("guard")
    p.add_argument("--call", required=True)
    p.add_argument("--repo")
    p.add_argument("--base", help="check only what changed since this ref")
    p.add_argument("--file", action="append")
    p.set_defaults(run=cmd_guard)
    return top


if __name__ == "__main__":
    options = parser().parse_args()
    options.run(options)
