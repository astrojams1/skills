"""Confirm MCP writes using the same Git branch read by both schedulers."""
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bin"))
import marketing_gate as gate
import marketing_mcp as mcp


class ConnectorCommits(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        bare = self.root / "remote.git"
        self.repo = self.root / "work"
        subprocess.run(["git", "init", "-q", "--bare", str(bare)], check=True)
        subprocess.run(["git", "clone", "-q", str(bare), str(self.repo)], check=True, capture_output=True)
        self.store = gate.GitState(str(self.repo), "app-marketing")
        self.store.publish("", gate.empty())

    def claim(self):
        args = gate.parse_args(["--repo", str(self.repo), "--group", "app-marketing",
                                "claim", "--job", "demo", "--slot", "2026-11-21.0710",
                                "--engine", "claude"])
        proposal = mcp.prepare(args)
        self.addCleanup(Path(proposal["receipt"]).unlink, missing_ok=True)
        return proposal

    def commit_exact(self, update):
        # Simulate the Contents API's required old-blob-SHA guard at the branch tip.
        head = self.store.head()
        self.store.read(head)
        if mcp.blob_id(self.store, head) != update["sha"]:
            return False
        blob = self.store.git("hash-object", "-w", "--stdin", data=update["content"]).stdout.strip()
        tree = self.store.git("mktree", data=f"100644 blob {blob}\tstate.json\n").stdout.strip()
        commit = self.store.git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                                "commit-tree", tree, "-p", head, "-m", "Simulate connector write").stdout.strip()
        self.store.git("push", "origin", commit + ":" + self.store.ref)
        return True

    def test_contenders_and_expiry(self):
        first = self.claim()
        second = self.claim()
        self.assertEqual(mcp.confirm(first["receipt"])["status"], "unconfirmed")
        self.assertNotIn("token", first["update"]["content"])
        self.assertEqual(os.stat(first["receipt"]).st_mode & 0o777, 0o600)
        self.assertTrue(self.commit_exact(first["update"]))
        self.assertFalse(self.commit_exact(second["update"]))
        reply = mcp.confirm(first["receipt"])
        self.assertEqual(reply["status"], "acquired")
        self.assertNotIn(reply["token"], json.dumps(first["update"]))
        self.assertEqual(mcp.confirm(second["receipt"])["status"], "unconfirmed")
        with patch.object(gate, "utcnow", return_value=gate.utcnow() + dt.timedelta(days=1)):
            self.assertEqual(mcp.confirm(first["receipt"])["status"], "lost")


if __name__ == "__main__":
    unittest.main()
