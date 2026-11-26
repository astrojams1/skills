#!/usr/bin/env python3
"""The marketing system map stays true.

James, 2026-11-26: the marketing system changes fast, so "anytime that we make a change to our marketing system ...
it updates the map" (docs/marketing-system.md), for agents in both Claude and Codex. This test fails when:

1. a marketing skill in skills/ is not named in the map;
2. a business in the research brief's table is not in the map;
3. this branch changes marketing files here but leaves the map alone (records under ledger/ do not count).
"""
import re
import subprocess
import sys
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "docs" / "marketing-system.md"
MARKETING_WORDS = re.compile(r"marketing|outreach|downloads|shorts|pitch|lead", re.I)
# Skills whose descriptions use those words but that are not part of marketing, each with why.
NOT_MARKETING = {
    "call-triage": "turns recorded calls into follow-up; 'leads' to no marketing run",
}
MARKETING_FILES = re.compile(
    r"^(skills/(app-marketing|app-shorts|youtube-shorts|youtube-growth|marketing-research|vegas-microworks-marketing"
    r"|warm-lead-followup|reddit-posting|ouro-website|astrojams-website)/|bin/marketing_|docs/marketing-schedules\.md$)"
)


def description(skill_md: Path) -> str:
    head = skill_md.read_text().split("---")[1] if skill_md.read_text().startswith("---") else ""
    m = re.search(r"^description:\s*(.+)$", head, re.M)
    return m.group(1) if m else ""


def marketing_skills():
    for skill_md in sorted((ROOT / "skills").glob("*/SKILL.md")):
        name = skill_md.parent.name
        if name not in NOT_MARKETING and MARKETING_WORDS.search(description(skill_md)):
            yield name


def changed_files():
    """Files this branch changes against origin/main, or None when that cannot be read."""
    try:
        base = subprocess.run(["git", "merge-base", "HEAD", "origin/main"], cwd=ROOT, capture_output=True, text=True,
                              check=True).stdout.strip()
        out = subprocess.run(["git", "diff", "--name-only", base], cwd=ROOT, capture_output=True, text=True,
                             check=True).stdout
        untracked = subprocess.run(["git", "ls-files", "--others", "--exclude-standard"], cwd=ROOT,
                                   capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return [f for f in (out + untracked).split() if f]


class MarketingMap(unittest.TestCase):
    def setUp(self):
        self.text = MAP.read_text()

    def test_every_marketing_skill_is_on_the_map(self):
        missing = [s for s in marketing_skills() if f"`{s}`" not in self.text]
        self.assertEqual(missing, [], f"add these skills to {MAP.relative_to(ROOT)}: {missing}")

    def test_every_business_in_the_research_table_is_on_the_map(self):
        table = (ROOT / "skills" / "marketing-research" / "references" / "brief.md").read_text()
        repos = set(re.findall(r"`astrojams1/([\w.-]+)`", table))
        missing = sorted(r for r in repos if f"astrojams1/{r}" not in self.text)
        self.assertEqual(missing, [], f"add these business repositories to the map: {missing}")

    def test_a_marketing_change_updates_the_map(self):
        files = changed_files()
        if files is None:
            self.skipTest("origin/main is not available to compare against")
        touched = [f for f in files if MARKETING_FILES.match(f) and "/ledger/" not in f]
        if touched and "docs/marketing-system.md" not in files:
            self.fail("This branch changes the marketing system but not docs/marketing-system.md. Update the map's "
                      f"rows and add a line to its Changes: {touched[:10]}")


if __name__ == "__main__":
    unittest.main()
