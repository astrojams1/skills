#!/usr/bin/env python3
"""Flag limits that hold a scheduled skill's known work back.

James, 2026-11-08: a scheduled run clears all its known work; no item budgets, no backlogs between runs. Caps crept
back anyway, hidden in places a read of SKILL.md misses: a reference file ("one good guide a week per app"), a data
field (`repeat_days`), a script default (`windowDays`). This scans every skill file for those shapes and fails on any
not listed in `cap-allowlist.txt` at the repository root with the reason it must stay.

Usage: check_caps.py [repo root] [folders to scan, relative to the root ...]
  (here: python3 bin/check_caps.py . skills; each skill's helpers live in its own scripts/ folder)
Allowlist lines: `path :: text on the flagged line :: why it is kept` (blank lines and # comments are ignored).
"""
import json
import re
import sys
from pathlib import Path

WORK = r"(?:items?|guides?|shorts?|posts?|repl(?:y|ies)|leads?|e-?mails?|letters?|contacts?|calls?|ideas?|findings?|edits?|skills?|prs?|pull requests?|threads?|tasks?|messages?|videos?|orgs?|organi[sz]ations?|outreach)"
NUM = r"(?:one|two|three|four|five|six|ten|\d+)"
PATTERNS = [
    rf"\b(?:at most|up to|no more than|only) {NUM} (?:new |good |small )?{WORK}\b",
    rf"\b{NUM} (?:new |good |small )?{WORK} (?:a|per|each) (?:day|week|month|run)\b",
    rf"\b{WORK} (?:a|per) (?:week|month) per (?:app|skill)\b",
    r"\bcap:\s*\d|\bcap(?:ped)? (?:of|at) \d|\b\d+-\w+ cap\b",
    r"\b(?:item|run|time) budget\b|\bbudget of\b",
    r"\bdefer(?:s|red)? the rest\b|\bthe rest (?:waits?|go(?:es)?) (?:to|for|until) the next run\b",
    r"\b(?:one|a single) (?:item|skill|lead|guide|thread) (?:a|per) run\b",
    r'"(?:max\w*PerRun|maxItems|limit|perRun)"\s*:\s*\d',
    r'"windowDays"\s*:\s*\d',
    # a script flag whose default trims the work: --limit 10, --days 60, --max-items 5
    r"""add_argument\(\s*["']--(?:limit|max[\w-]*|top|count|per-run|days|window[\w-]*|since[\w-]*)["'].*\bdefault\s*=\s*[1-9]""",
]
SKIP_PARTS = {"node_modules", "ledger", ".git"}
SKIP_NAMES = {"LEDGER.md", "CHANGELOG.md", "check_caps.py"}


def allowlist(root):
    path = root / "cap-allowlist.txt"
    entries = []
    if path.exists():
        for line in path.read_text().splitlines():
            if line.strip() and not line.lstrip().startswith("#"):
                parts = [p.strip() for p in line.split("::")]
                if len(parts) != 3 or not all(parts):
                    raise SystemExit(f"cap-allowlist.txt: needs 'path :: text :: why': {line}")
                entries.append(parts)
    return entries


def json_hits(rel, text):
    """Every repeat_days over 1, anywhere in a JSON file. A pace_reason beside it is a note, not a pass: only
    cap-allowlist.txt, with James's reason or the outside rule, lets one stay."""
    try:
        data = json.loads(text)
    except ValueError:
        return []
    hits = []

    def walk(node):
        if isinstance(node, dict):
            days = node.get("repeat_days")
            if isinstance(days, (int, float)) and days > 1:
                hits.append((rel, 0, f'"repeat_days": {days} on "{node.get("id", "?")}"'))
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(data)
    return hits


def scan(root, *folders):
    hits = []
    paths = sorted({p for folder in folders for p in (root / folder).rglob("*")})
    for path in paths:
        if not path.is_file() or path.suffix not in {".md", ".json", ".mjs", ".js", ".py", ".sh", ".yml", ".yaml"}:
            continue
        if SKIP_PARTS & set(path.relative_to(root).parts) or path.name in SKIP_NAMES:
            continue
        rel = str(path.relative_to(root))
        text = path.read_text(errors="ignore")
        if path.suffix == ".json":
            hits += json_hits(rel, text)
        for n, line in enumerate(text.splitlines(), 1):
            if any(re.search(p, line, re.I) for p in PATTERNS):
                hits.append((rel, n, line.strip()))
    return hits


def main(argv):
    root = Path(argv[1] if len(argv) > 1 else ".").resolve()
    folders = argv[2:] or ["skills"]
    missing = [f for f in folders if not (root / f).is_dir()]
    if missing:
        print(f"check_caps: no such folder under {root}: {', '.join(missing)}")
        return 2
    allowed = allowlist(root)
    bad = [h for h in scan(root, *folders) if not any(h[0] == p and t in h[2] for p, t, _ in allowed)]
    for rel, n, line in bad:
        print(f"{rel}:{n}: {line[:160]}")
    if bad:
        print(f"\n{len(bad)} possible cap(s) on scheduled work. Remove each, or add it to cap-allowlist.txt with the "
              "reason James gave or the outside rule it follows. See AGENTS.md, 'Skills Run by Routines'.")
        return 1
    print("check_caps: no unlisted caps")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
