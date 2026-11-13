#!/usr/bin/env python3
"""Every discovery copy in this repository matches its skill.

Sessions in this repository read skills from .claude/skills/ and .agents/skills/, copies that `bin/manage.sh link`
refreshes. They were refreshed by hand, so they fell behind the skill again and again (app-marketing problem family
stale-skill-copies: 2026-11-08, 11-10, 11-12 and 11-13; skills#233 caught up after #224 to #232). A change to a skill
now ships its copies: run `./bin/manage.sh link` and commit what it changes.
"""
import hashlib
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
SKIP = {"__pycache__", ".DS_Store"}


def tree(path: Path) -> dict:
    out = {}
    for p in sorted(path.rglob("*")):
        if any(part in SKIP for part in p.parts) or p.is_dir():
            continue
        out[str(p.relative_to(path))] = hashlib.sha256(p.read_bytes()).hexdigest()
    return out


def main() -> int:
    problems = []
    for root in (ROOT / ".claude" / "skills", ROOT / ".agents" / "skills"):
        if not root.is_dir():
            continue
        for copy in sorted(p for p in root.iterdir() if p.is_dir()):
            source = ROOT / "skills" / copy.name
            if not source.is_dir():
                continue
            want, have = tree(source), tree(copy)
            for name in sorted(set(want) | set(have)):
                if want.get(name) != have.get(name):
                    state = "missing" if name not in have else "extra" if name not in want else "differs"
                    problems.append(f"{copy.relative_to(ROOT)}/{name} {state}")
    if problems:
        print("Discovery copies behind their skills (run ./bin/manage.sh link and commit):")
        print("\n".join(f"  {p}" for p in problems[:50]))
        if len(problems) > 50:
            print(f"  ... and {len(problems) - 50} more")
        return 1
    print("ok: every discovery copy matches its skill")
    return 0


if __name__ == "__main__":
    sys.exit(main())
