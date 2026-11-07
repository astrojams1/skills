#!/usr/bin/env python3
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("scan", ROOT / "skills/uncommitted-work/scripts/scan.py")
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)
JUNK = ["node_modules", ".DS_Store"]
SCOPE = {"junk": JUNK, "quietDays": 3, "owners": ["astrojams1"], "recheckDays": 28}
NOW = 1_800_000_000


def sh(path, *args):
    subprocess.run(["git", "-C", str(path), "-c", "user.name=t", "-c", "user.email=t@example.com", *args],
                   check=True, capture_output=True)


class Repo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name, "home")
        self.repo = Path(self.tmp.name, "root", "repo")
        self.repo.mkdir(parents=True)
        sh(self.repo, "init", "-q")
        (self.repo / "a.txt").write_text("one\n")
        sh(self.repo, "add", ".")
        sh(self.repo, "commit", "-qm", "first")

    def dirty(self):
        (self.repo / "a.txt").write_text("two\n")
        (self.repo / "new.txt").write_text("new\n")

    def test_finds_checkouts_and_linked_worktrees(self):
        outside = Path(self.tmp.name, "elsewhere", "wt")
        sh(self.repo, "worktree", "add", "-q", str(outside))
        found = scan.find_checkouts([self.repo.parent], 3)
        self.assertIn(str(self.repo), found)
        self.assertIn(str(outside.resolve()), [os.path.realpath(p) for p in found])

    def test_close_refuses_without_a_backup(self):
        self.dirty()
        with self.assertRaises(SystemExit):
            scan.close(self.repo, self.home, JUNK)
        self.assertEqual((self.repo / "a.txt").read_text(), "two\n")

    def test_close_refuses_when_work_changed_after_the_backup(self):
        self.dirty()
        scan.archive(self.repo, self.home, JUNK)
        (self.repo / "new.txt").write_text("newer\n")
        with self.assertRaises(SystemExit):
            scan.close(self.repo, self.home, JUNK)
        self.assertTrue((self.repo / "new.txt").exists())

    def test_backup_restores_what_close_removed(self):
        self.dirty()
        target = scan.archive(self.repo, self.home, JUNK)
        scan.close(self.repo, self.home, JUNK)
        self.assertEqual(scan.status_entries(self.repo), [])
        sh(self.repo, "apply", str(target / "tracked.patch"))
        subprocess.run(["tar", "-xzf", str(target / "untracked.tgz"), "-C", str(self.repo)], check=True)
        self.assertEqual((self.repo / "a.txt").read_text(), "two\n")
        self.assertEqual((self.repo / "new.txt").read_text(), "new\n")

    def test_close_keeps_ignored_files_and_junk(self):
        (self.repo / ".gitignore").write_text("secret.env\n")
        sh(self.repo, "add", ".")
        sh(self.repo, "commit", "-qm", "ignore")
        (self.repo / "secret.env").write_text("x\n")
        (self.repo / ".DS_Store").write_text("x\n")
        self.dirty()
        scan.archive(self.repo, self.home, JUNK)
        scan.close(self.repo, self.home, JUNK)
        self.assertTrue((self.repo / "secret.env").exists())
        self.assertTrue((self.repo / ".DS_Store").exists())

    def test_close_restores_a_file_whose_delete_was_staged(self):
        sh(self.repo, "rm", "-q", "--cached", "a.txt")  # now untracked on disk, but still in HEAD
        scan.archive(self.repo, self.home, JUNK)
        scan.close(self.repo, self.home, JUNK)
        self.assertEqual((self.repo / "a.txt").read_text(), "one\n")
        self.assertEqual(scan.status_entries(self.repo), [])

    def test_close_accepts_junk_left_in_a_scratch_folder(self):
        (self.repo / "scratch").mkdir()
        (self.repo / "scratch" / "out.json").write_text("x\n")
        (self.repo / "scratch" / ".DS_Store").write_text("x\n")
        scan.archive(self.repo, self.home, JUNK)
        scan.close(self.repo, self.home, JUNK)
        self.assertFalse((self.repo / "scratch" / "out.json").exists())

    def test_stash_backup_keeps_each_stash(self):
        self.dirty()
        sh(self.repo, "stash", "push", "-q", "-u", "-m", "park")
        target = scan.archive_stashes(self.repo, self.home)
        self.assertEqual(len(list(target.glob("*.patch"))), 1)
        self.assertIn("park", (target / "list.txt").read_text())


class Buckets(unittest.TestCase):
    def item(self, **over):
        return {"path": "/r", "entries": [("M", "a.txt")], "owner": "astrojams1", "changed": NOW - 10 * 86400,
                "fingerprint": "f", **over}

    def bucket(self, saved=None, cwds=(), **over):
        return scan.bucket_for(self.item(**over), SCOPE, saved, NOW, list(cwds))

    def test_buckets(self):
        self.assertEqual(self.bucket(), "work")
        self.assertEqual(self.bucket(entries=[("??", "node_modules"), ("??", "x/.DS_Store")]), "junk")
        self.assertEqual(self.bucket(changed=NOW - 86400), "live")
        self.assertEqual(self.bucket(cwds=["/r/sub"]), "live")
        self.assertEqual(self.bucket(cwds=["/r2"]), "work")
        self.assertEqual(self.bucket(owner=None), "noRemote")
        self.assertEqual(self.bucket(owner="wendigo124"), "foreign")

    def test_saved_decision_lasts_until_the_work_changes_or_expires(self):
        saved = {"fingerprint": "f", "recordedAt": NOW - 86400}
        self.assertEqual(self.bucket(saved=saved), "unchanged")
        self.assertEqual(self.bucket(saved={**saved, "fingerprint": "g"}), "work")
        self.assertEqual(self.bucket(saved={**saved, "recordedAt": NOW - 30 * 86400}), "work")


if __name__ == "__main__":
    unittest.main()
