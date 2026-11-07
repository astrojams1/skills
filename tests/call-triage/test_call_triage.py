#!/usr/bin/env python3
"""call_triage.py: the register's rules and the privacy guard."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "skills" / "call-triage" / "scripts" / "call_triage.py"
TRANSCRIPT = "[00:00:01] the quick brown fox jumps over the lazy dog every single morning\n"


class CallTriage(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name) / "calls"
        self.call = Path(self.run_tool("init", "2026-11-06", "Pat Lee", "Some App").stdout.strip())
        (self.call / "transcript.txt").write_text(TRANSCRIPT)

    def run_tool(self, *args, ok=True):
        done = subprocess.run([sys.executable, str(SCRIPT)] + list(args), capture_output=True, text=True,
                              env=dict(os.environ, CALLS_HOME=str(self.home)))
        if ok:
            self.assertEqual(done.returncode, 0, done.stderr + done.stdout)
        return done

    def add(self, *extra):
        return self.run_tool("add", self.call.name, "--type", "idea", "--summary", "s", "--owner", "agent",
                             "--destination", "repo", *extra)

    def repo(self):
        repo = Path(self.tmp.name) / "repo"
        repo.mkdir()
        subprocess.run(["git", "init", "-q", str(repo)], check=True)
        return repo

    def test_init_is_private(self):
        self.assertEqual(self.call.name, "2026-11-06-pat-lee-some-app")
        self.assertEqual(os.stat(self.call).st_mode & 0o777, 0o700)

    def test_last_line_for_an_id_wins(self):
        item = self.add().stdout.strip()
        self.run_tool("update", self.call.name, item, "--status", "done", "--evidence", "PR 1")
        self.assertIn("done", self.run_tool("status", self.call.name).stdout)
        self.assertEqual(len((self.call / "items.jsonl").read_text().splitlines()), 2)

    def test_done_needs_evidence_and_waiting_needs_a_date(self):
        item = self.add().stdout.strip()
        self.assertNotEqual(self.run_tool("update", self.call.name, item, "--status", "done", ok=False).returncode, 0)
        self.assertNotEqual(self.run_tool("update", self.call.name, item, "--status", "waiting", ok=False).returncode, 0)
        self.assertNotEqual(self.add_waiting_without_date().returncode, 0)

    def add_waiting_without_date(self):
        return self.run_tool("add", self.call.name, "--type", "action", "--summary", "s", "--owner", "a",
                             "--destination", "d", "--status", "waiting", ok=False)

    def test_due_lists_undated_and_soon_but_not_closed_or_far(self):
        self.add("--summary", "undated")
        self.add("--summary", "far", "--status", "waiting", "--due", "2099-01-01")
        self.add("--summary", "late", "--status", "waiting", "--due", "2020-01-01")
        self.add("--summary", "finished", "--status", "done", "--evidence", "x")
        out = self.run_tool("due").stdout
        self.assertIn("undated", out)
        self.assertIn("late", out)
        self.assertNotIn("far", out)
        self.assertNotIn("finished", out)

    def test_guard_passes_a_paraphrase(self):
        note = Path(self.tmp.name) / "note.md"
        note.write_text("A fox was mentioned on the call, and a dog.")
        self.assertIn("guard: ok", self.run_tool("guard", "--call", self.call.name, "--file", str(note)).stdout)

    def test_guard_catches_a_quote_across_punctuation_and_case(self):
        note = Path(self.tmp.name) / "note.md"
        note.write_text('She said: "The quick brown fox, jumps over the lazy dog!"')
        done = self.run_tool("guard", "--call", self.call.name, "--file", str(note), ok=False)
        self.assertEqual(done.returncode, 1)
        self.assertIn("quotes the transcript", done.stdout)

    def test_guard_catches_audio_and_transcripts_in_a_repository(self):
        repo = self.repo()
        (repo / "call.m4a").write_bytes(b"x")
        (repo / "notes").mkdir()
        (repo / "notes" / "transcript.txt").write_text("words")
        done = self.run_tool("guard", "--call", self.call.name, "--repo", str(repo), ok=False)
        self.assertIn("audio file: call.m4a", done.stdout)
        self.assertIn("transcript or register: notes/transcript.txt", done.stdout)

    def test_guard_refuses_a_call_folder_inside_a_repository(self):
        subprocess.run(["git", "init", "-q", str(self.call)], check=True)
        done = self.run_tool("guard", "--call", self.call.name, "--repo", str(self.call), ok=False)
        self.assertIn("inside a Git repository", done.stdout)

    def test_guard_notes_a_leftover_audio_copy_without_failing(self):
        (self.call / "audio" / "recording.qta").write_bytes(b"x")
        out = self.run_tool("guard", "--call", self.call.name).stdout
        self.assertIn("audio copy still", out)

    def test_register_is_json_lines(self):
        self.add()
        for line in (self.call / "items.jsonl").read_text().splitlines():
            self.assertIn("id", json.loads(line))


if __name__ == "__main__":
    unittest.main()
