#!/usr/bin/env python3
"""Every SKILL.md reads at grade 9 or under, and uses no em dashes in prose.

James, 2026-11-10: skills should read as one author wrote them, and an 8th grader should follow them.
The grade comes from skills/skill-writing/scripts/readability.py.
"""
import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_GRADE = 9.0

spec = importlib.util.spec_from_file_location("readability", ROOT / "skills/skill-writing/scripts/readability.py")
readability = importlib.util.module_from_spec(spec)
spec.loader.exec_module(readability)


def main():
    failures = []
    for path in sorted((ROOT / "skills").glob("*/SKILL.md")):
        text = path.read_text(encoding="utf-8")
        result = readability.score(text)
        if result is None:
            continue
        grade = result[0]
        rel = path.relative_to(ROOT)
        if grade > MAX_GRADE:
            failures.append(f"{rel}: grade {grade} is over {MAX_GRADE}")
        prose = readability.prose(text)
        if "—" in prose:
            failures.append(f"{rel}: has an em dash in prose")
    # a quick self-check of the scorer
    easy = readability.score("Run the tests. Fix what fails. Open a PR.")
    if easy is None or easy[0] > 4:
        failures.append(f"readability.py scored three short sentences at {easy}")
    for line in failures:
        print("FAIL:", line)
    if failures:
        print("Fix: follow skills/skill-writing/SKILL.md, 'Write it plainly'.")
        return 1
    print("OK: every SKILL.md is grade", MAX_GRADE, "or under with no em dashes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
