"""Scheduled skills clear their known work (AGENTS.md, 'Skills Run by Routines'): no hidden caps or throttles.

Run: python3 tests/test_no_hidden_caps.py
"""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "bin"))
import check_caps  # noqa: E402


def scan_files(files):
    with tempfile.TemporaryDirectory() as tmp:
        for rel, text in files.items():
            path = Path(tmp) / "skills" / "demo" / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        return [line for _, _, line in check_caps.scan(Path(tmp), "skills")]


class NoHiddenCaps(unittest.TestCase):
    def test_no_unlisted_caps_in_this_repository(self):
        result = subprocess.run([sys.executable, str(ROOT / "bin" / "check_caps.py"), str(ROOT), "skills"],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_finds_the_shapes_that_crept_back(self):
        found = " ".join(scan_files({
            "references/content.md": "One good guide a week per app beats ten thin ones.\n",
            "SKILL.md": "Do at most three items, then stop.\nCap: 20 contacts per run.\n",
            "scope.json": '{"windowDays": 30, "backlog": [{"id": "g", "repeat_days": 7}]}\n',
        }))
        for shape in ["guide a week per app", "at most three items", "Cap: 20", "windowDays", '"repeat_days": 7']:
            self.assertIn(shape, found)

    def test_a_daily_repeat_passes(self):
        self.assertEqual(scan_files({
            "p.json": '{"backlog": [{"id": "a", "repeat_days": 1}]}',
            "SKILL.md": "Work every open item, best first.\n",
        }), [])

    def test_a_pace_reason_is_a_note_not_a_pass(self):
        found = scan_files({"p.json": '{"backlog": [{"id": "b", "repeat_days": 4, "pace_reason": "x"}]}'})
        self.assertEqual(len(found), 1)

    def test_a_script_default_that_trims_the_work(self):
        found = " ".join(scan_files({"scripts/pick.py": 'ap.add_argument("--limit", type=int, default=10)\n'
                                                        'ap.add_argument("--since-days", type=int, default=0)\n'}))
        self.assertIn("--limit", found)
        self.assertNotIn("--since-days", found)


if __name__ == "__main__":
    unittest.main()
