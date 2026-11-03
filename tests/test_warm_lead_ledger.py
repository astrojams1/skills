#!/usr/bin/env python3
"""Verify activity ledger durability and shared-writer compatibility."""
import concurrent.futures
import fcntl
import gzip
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "skills/warm-lead-followup/scripts/activity_ledger.py"
spec = importlib.util.spec_from_file_location("warm_lead_ledger", SCRIPT)
ledger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ledger)
SCRATCH = Path(os.environ.get("WARM_LEAD_TEST_TMPDIR", Path(__file__).resolve().parents[1]))
SCRATCH.mkdir(parents=True, exist_ok=True)


def event(run="test"):
    return {"run_id": run, "skill": "warm-lead-followup", "agent": "test",
            "event": "verify", "status": "ok"}


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ledger-test-", dir=SCRATCH)
        self.root = Path(self.temp.name)
        self.path = self.root / "events.jsonl"

    def tearDown(self):
        self.temp.cleanup()

    def test_appends_valid_json_and_private_permissions(self):
        self.path.write_text("")
        self.path.chmod(0o644)
        result = ledger.append(self.path, event())
        self.assertTrue(result["recorded"])
        saved = json.loads(self.path.read_text())
        self.assertEqual(saved["v"], 1)
        self.assertEqual(saved["run_id"], "test")
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o600)
        self.assertEqual((self.root / ".lock").stat().st_mode & 0o777, 0o600)

    def test_invalid_events_do_not_touch_destination(self):
        for data in [event() | {"status": "success"}, event() | {"event": "send"},
                     event() | {"run_id": ""}, event() | {"ts": "2026-11-03T01:00:00"},
                     event() | {"body": "private email contents"},
                     event() | {"evidence": {"oversize": "x" * 17000}}]:
            with self.subTest(data_keys=sorted(data)):
                with self.assertRaises((ValueError, TypeError)):
                    ledger.append(self.path, data)
                self.assertFalse(self.path.exists())

    def test_respects_existing_shared_helper_lock(self):
        # Other skills use parent/.lock. This must block even before events.jsonl exists.
        with (self.root / ".lock").open("a") as shared_lock:
            fcntl.flock(shared_lock, fcntl.LOCK_EX)
            child = subprocess.Popen([sys.executable, str(SCRIPT), "--path", str(self.path)],
                                     stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE, text=True)
            try:
                child.stdin.write(json.dumps(event("shared-lock")))
                child.stdin.close()
                child.stdin = None
                with self.assertRaises(subprocess.TimeoutExpired):
                    child.wait(timeout=0.35)
                self.assertFalse(self.path.exists())
                fcntl.flock(shared_lock, fcntl.LOCK_UN)
                output, error = child.communicate(timeout=5)
                self.assertEqual(child.returncode, 0, error)
                self.assertTrue(json.loads(output)["recorded"])
                self.assertEqual(json.loads(self.path.read_text())["run_id"], "shared-lock")
            finally:
                if child.poll() is None:
                    child.kill()
                    child.communicate()

    def test_concurrent_append_preserves_every_record(self):
        def writer(index):
            result = subprocess.run([sys.executable, str(SCRIPT), "--path", str(self.path)],
                                    input=json.dumps(event(str(index))), text=True,
                                    capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            list(executor.map(writer, range(24)))
        records = [json.loads(line) for line in self.path.read_text().splitlines()]
        self.assertEqual(len(records), 24)
        self.assertEqual({r["run_id"] for r in records}, {str(i) for i in range(24)})

    def test_rotation_preserves_old_events_and_new_event(self):
        old = (json.dumps(event("old") | {"evidence": {"sample": "x" * 8000}}) + "\n").encode()
        count = 8 * 1024**2 // len(old) + 1
        self.path.write_bytes(old * count)
        ledger.append(self.path, event("new"))
        archives = list(self.root.glob("events-*.jsonl.gz"))
        self.assertEqual(len(archives), 1)
        self.assertEqual(archives[0].stat().st_mode & 0o777, 0o600)
        with gzip.open(archives[0], "rb") as compressed:
            self.assertEqual(compressed.read(), old * count)
        self.assertEqual(json.loads(self.path.read_text())["run_id"], "new")


if __name__ == "__main__":
    unittest.main()
