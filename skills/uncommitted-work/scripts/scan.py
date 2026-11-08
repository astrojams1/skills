#!/usr/bin/env python3
"""Find uncommitted work across every local Git checkout, back it up, and close it safely.

  scan.py list                                   print checkouts sorted into buckets as JSON
  scan.py archive PATH                           back up one checkout's uncommitted work
  scan.py archive-stashes PATH                   back up a repository's stashes
  scan.py close PATH                             discard work, only if its backup is current
  scan.py record PATH --decision held|blocked --reason TEXT
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile

HERE = Path(__file__).resolve().parent
DEFAULT_SCOPE = HERE.parent / "assets" / "scope.json"
HOME = Path("/Volumes/ssd/projects/uncommitted-work")
DAY = 86400


def git(path, *args, check=False, binary=False):
    done = subprocess.run(["git", "-C", str(path), *args], capture_output=True, check=check)
    return done.stdout if binary else done.stdout.decode("utf-8", "replace")


def find_checkouts(roots, depth):
    """Every checkout under the roots, plus every worktree those repositories know of, wherever it lives."""
    found = set()
    for root in roots:
        root = str(root)
        base = root.rstrip("/").count("/")
        for current, dirs, files in os.walk(root):
            if current.rstrip("/").count("/") - base >= depth:
                dirs[:] = []
            if ".git" in dirs or ".git" in files:
                found.add(current)
            dirs[:] = [d for d in dirs if d not in ("node_modules", ".git")]
    for path in list(found):
        for line in git(path, "worktree", "list", "--porcelain").splitlines():
            if line.startswith("worktree ") and os.path.isdir(line[9:]):
                found.add(line[9:])
    return sorted(found)


def status_entries(path, every_file=False):
    """(code, file) pairs from git status. Submodule pointers show as plain modified files."""
    entries = []
    args = ["--untracked-files=all"] if every_file else []
    raw = git(path, "status", "--porcelain", "-z", *args).split("\0")
    index = 0
    while index < len(raw):
        item = raw[index]
        index += 1
        if len(item) < 4:
            continue
        code, name = item[:2], item[3:]
        if "R" in code or "C" in code:
            index += 1  # -z puts the rename source in the next field
        entries.append((code.strip(), name.rstrip("/")))
    return entries


def is_junk(name, junk):
    return any(part in junk for part in Path(name).parts)


def newest_change(path, entries):
    times = []
    for _, name in entries:
        try:
            times.append(os.path.getmtime(os.path.join(path, name)))
        except OSError:
            pass
    return max(times, default=0)


def repo_owner(path):
    url = git(path, "remote", "get-url", "origin").strip()
    match = re.search(r"github\.com[:/]([^/]+)/", url)
    return match.group(1) if match else None


def open_directories():
    """Working directories of running processes, so a live session's checkout is never touched."""
    done = subprocess.run(["lsof", "-d", "cwd", "-Fn"], capture_output=True)
    return [line[1:] for line in done.stdout.decode("utf-8", "replace").splitlines() if line.startswith("n/")]


def bucket_for(item, scope, saved, now, cwds):
    real = [e for e in item["entries"] if not is_junk(e[1], scope["junk"])]
    if not real:
        return "junk"
    if item["path"] in cwds or any(c.startswith(item["path"] + "/") for c in cwds):
        return "live"
    if now - item["changed"] < scope["quietDays"] * DAY:
        return "live"
    if not item["owner"]:
        return "noRemote"
    if item["owner"] not in scope["owners"]:
        return "foreign"
    if saved and saved["fingerprint"] == item["fingerprint"] and now - saved["recordedAt"] < scope["recheckDays"] * DAY:
        return "unchanged"
    return "work"


def untracked(path, junk):
    raw = git(path, "ls-files", "--others", "--exclude-standard", "-z").split("\0")
    return [n for n in raw if n and not is_junk(n, junk)]


def fingerprint(path, junk):
    digest = hashlib.sha256()
    digest.update(git(path, "rev-parse", "-q", "--verify", "HEAD", binary=True))
    digest.update(git(path, "diff", "HEAD", "--binary", binary=True))
    for name in sorted(untracked(path, junk)):
        digest.update(name.encode())
        try:
            digest.update(Path(path, name).read_bytes())
        except OSError:
            pass
    return digest.hexdigest()


def slug(path):
    return re.sub(r"[^A-Za-z0-9]+", "-", str(path)).strip("-")


def archive(path, home, junk):
    """Save tracked changes and untracked files. Writes a new folder; never touches the checkout."""
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = Path(home) / "archive" / slug(path) / stamp
    target.mkdir(parents=True)
    has_head = bool(git(path, "rev-parse", "-q", "--verify", "HEAD").strip())
    if has_head:
        (target / "tracked.patch").write_bytes(git(path, "diff", "HEAD", "--binary", binary=True))
    names = untracked(path, junk)
    if names:
        with tarfile.open(target / "untracked.tgz", "w:gz") as tar:
            for name in names:
                tar.add(Path(path, name), arcname=name)
    meta = {"path": str(path), "head": git(path, "rev-parse", "-q", "--verify", "HEAD").strip(),
            "branch": git(path, "branch", "--show-current").strip(), "untracked": names,
            "fingerprint": fingerprint(path, junk), "archivedAt": stamp}
    (target / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    return target


def archive_stashes(path, home):
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = Path(home) / "archive" / (slug(path) + "-stashes") / stamp
    target.mkdir(parents=True)
    lines = git(path, "stash", "list", "--format=%H %cs %gs").splitlines()
    (target / "list.txt").write_text("\n".join(lines) + "\n")
    for line in lines:
        sha = line.split()[0]
        (target / (sha + ".patch")).write_bytes(
            git(path, "stash", "show", "-p", "--binary", "--include-untracked", sha, binary=True))
    return target


def latest_archive(path, home):
    folder = Path(home) / "archive" / slug(path)
    runs = sorted(folder.glob("*/meta.json")) if folder.exists() else []
    return json.loads(runs[-1].read_text()) if runs else None


def close(path, home, junk):
    """Discard the work. Refuses unless the newest backup matches the checkout exactly."""
    meta = latest_archive(path, home)
    if not meta or meta["fingerprint"] != fingerprint(path, junk):
        raise SystemExit("refused: no current backup of " + str(path) + "; run archive first")
    # Untracked files go first: one can share a name with a file a staged delete took out of the index,
    # and removing it after the reset would delete the file the reset just restored.
    for name in untracked(path, junk):
        target = Path(path, name)
        if target.is_file() or target.is_symlink():
            target.unlink()
    git(path, "reset", "-q", "--hard", "HEAD", check=True)
    git(path, "submodule", "update", "--init", "--quiet")
    left = [e for e in status_entries(path, every_file=True) if not is_junk(e[1], junk)]
    if left:
        raise SystemExit("still dirty after close: " + json.dumps(left))


def load(path, fallback):
    return json.loads(Path(path).read_text()) if Path(path).exists() else fallback


def scan(scope, state, now, cwds):
    out = {k: [] for k in ("work", "unchanged", "live", "noRemote", "foreign", "junk")}
    out["stashes"] = {}
    for path in find_checkouts(scope["roots"], scope["maxDepth"]):
        entries = status_entries(path)
        stashes = len(git(path, "stash", "list").splitlines())
        if stashes:  # shared by all of a repository's worktrees, so count it once
            common = os.path.realpath(os.path.join(path, git(path, "rev-parse", "--git-common-dir").strip()))
            out["stashes"][os.path.dirname(common)] = stashes
        if not entries:
            continue
        item = {"path": path, "entries": entries, "owner": repo_owner(path), "changed": newest_change(path, entries),
                "fingerprint": fingerprint(path, scope["junk"]), "branch": git(path, "branch", "--show-current").strip()}
        out[bucket_for(item, scope, state.get(path), now, cwds)].append(item)
    out["work"].sort(key=lambda i: i["changed"])
    return out


def cap(out, limit):
    """Move work past `limit` to deferred. No cap unless scope.json sets one: a weekly run works
    every checkout (owner, 2026-11-08)."""
    if limit is None:
        out["deferred"] = []
    else:
        out["deferred"], out["work"] = out["work"][limit:], out["work"][:limit]
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["list", "archive", "archive-stashes", "close", "record"])
    parser.add_argument("path", nargs="?")
    parser.add_argument("--scope", default=DEFAULT_SCOPE)
    parser.add_argument("--home", default=HOME)
    parser.add_argument("--decision", choices=["held", "blocked"])
    parser.add_argument("--reason")
    args = parser.parse_args()
    scope = load(args.scope, None)
    state_file = Path(args.home) / "state.json"
    state = load(state_file, {})
    if args.command == "list":
        now = dt.datetime.now().timestamp()
        out = scan(scope, state, now, open_directories())
        cap(out, scope.get("maxWorkedPerRun"))
        out["junk"] = len(out["junk"])
        print(json.dumps(out, indent=1))
    elif args.command == "archive":
        print(archive(args.path, args.home, scope["junk"]))
    elif args.command == "archive-stashes":
        print(archive_stashes(args.path, args.home))
    elif args.command == "close":
        close(args.path, args.home, scope["junk"])
    else:
        if not args.path or not args.decision or not args.reason:
            parser.error("record needs PATH, --decision and --reason")
        state[args.path] = {"decision": args.decision, "reason": args.reason,
                            "fingerprint": fingerprint(args.path, scope["junk"]),
                            "recordedAt": dt.datetime.now().timestamp()}
        state_file.parent.mkdir(parents=True, exist_ok=True)
        state_file.write_text(json.dumps(state, indent=2) + "\n")


if __name__ == "__main__":
    main()
