import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

BIN = Path(__file__).resolve().parents[1] / "bin"
sys.path.insert(0, str(BIN))
import marketing_due as due


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.runtime = self.home / "worker"
        self.repo = str(self.home / "work")
        self.catalog = self.home / "catalog.json"
        self.template = self.home / "worker.md"
        self.template.write_text("This is the fixture worker protocol.")
        self.stub = self.home / "codex-fixture"
        self.stub.write_text('''#!/usr/bin/env python3
import json, os, pathlib, re, subprocess, sys, time
if sys.argv[1:] == ['login', 'status']:
    print(os.environ.get('TEST_LOGIN', 'Logged in using ChatGPT'), file=sys.stderr)
    sys.exit(0)
mode=os.environ['TEST_BEHAVIOR']
if 'OPENAI_API_KEY' in os.environ or 'OPENAI_BASE_URL' in os.environ or 'CODEX_API_KEY' in os.environ:
    sys.exit(99)
prompt=sys.stdin.read()
assert 'fixture worker protocol' in prompt
assignment=pathlib.Path(re.search(r'single assignment saved in (.*?)\\. Read',prompt)[1])
assert assignment.stat().st_mode & 0o077 == 0
claim=json.loads(assignment.read_text())
assert claim['gate']['token'] not in str(sys.argv)
assert not any('private contents' in arg for arg in sys.argv)
assert '--ephemeral' in sys.argv
with pathlib.Path('stub-calls').open('a') as f: f.write(claim['group']+'\\n')
gate=[sys.executable,os.environ['TEST_GATE'],'--repo',claim['repo'],'--group',claim['group']]
token=claim['gate']['token']
print(json.dumps({'type':'item.completed','item':{'text': 'private contents or capability:'+token}}))
print('sensitive stderr content',file=sys.stderr)
if mode=='done':
    subprocess.run(gate+['done','--token',token,'--note','fixture receipt'],stdout=subprocess.DEVNULL,check=True)
elif mode=='partial':
    subprocess.run(gate+['begin','--token',token,'--effect','fixture-mail','--note','fixture target'],stdout=subprocess.DEVNULL,check=True)
elif mode=='quota':
    print(json.dumps({'type':'turn.failed','error':{'message':'You have hit your usage limit. private details'}}))
    sys.exit(1)
else:
    raise AssertionError(mode)
''')
        self.stub.chmod(0o700)
        self.cmd = [sys.executable, str(BIN / "marketing_worker.py"), "--catalog", str(self.catalog),
                    "--runtime", str(self.runtime), "--template", str(self.template), "--codex", str(self.stub)]
        subprocess.run(["git", "init", "-q", "--bare", str(self.home / "test.git")], check=True)
        subprocess.run(["git", "clone", "-q", str(self.home / "test.git"), self.repo], capture_output=True, check=True)

    def setup_jobs(self, ids):
        when = datetime.now(timezone.utc).replace(second=0, microsecond=0) - timedelta(minutes=30)
        jobs = []
        for name, group in ids:
            j = {"id": name, "group": group, "repo": self.repo, "timezone": "UTC", "from": when.isoformat(),
                 "schedule": [{"at": when.strftime("%H:%M"), "days": list(range(7)), "pass": "full"}],
                 "prompt": "private contents for " + name}
            due.gate(j, "init")
            jobs.append(j)
        self.catalog.write_text(json.dumps({"jobs": jobs}))
        return jobs

    def launch(self, option="--once", mode="done", login="Logged in using ChatGPT"):
        env = dict(os.environ, TEST_BEHAVIOR=mode, TEST_GATE=str(BIN / "marketing_gate.py"), TEST_LOGIN=login,
                   OPENAI_BASE_URL="https://fixture.invalid", OPENAI_API_KEY="fixture", CODEX_API_KEY="fixture")
        p = subprocess.run(self.cmd+[option], env=env, text=True, capture_output=True, timeout=20)
        self.assertNotIn("sensitive stderr", p.stderr)
        self.assertNotIn("private contents", p.stdout+p.stderr)
        return p

    def state(self):
        return json.loads((self.runtime / "scheduler.json").read_text())

    def test_check_is_read_only_and_rejects_api_auth(self):
        self.setup_jobs([])
        good = self.launch("--check")
        self.assertEqual(json.loads(good.stdout)["status"], "ready")
        self.assertFalse(self.runtime.exists())
        denied = self.launch("--check", login="Logged in using an API key")
        self.assertNotEqual(denied.returncode, 0)
        self.assertFalse(self.runtime.exists())

    def test_idle_does_not_start_model(self):
        self.setup_jobs([])
        self.assertEqual(self.launch().returncode, 0)
        self.assertFalse((self.runtime / "stub-calls").exists())
        readback = json.loads(self.launch("--check").stdout)["runtime"]
        self.assertIsNotNone(readback["heartbeat"])
        self.assertFalse(readback["daemon_fresh"])

    def test_maintenance_pause_blocks_new_claims_and_surfaces_in_check(self):
        jobs = self.setup_jobs([("one", "a")])
        (self.home / "PAUSED").touch()
        self.assertEqual(self.launch().returncode, 0)
        self.assertTrue(json.loads(self.launch("--check").stdout)["runtime"]["paused"])
        self.assertFalse((self.runtime / "stub-calls").exists())
        self.assertIsNone(due.gate(jobs[0], "status")["active"])
        (self.home / "PAUSED").unlink()
        self.assertEqual(self.launch().returncode, 0)
        self.assertTrue(due.gate(jobs[0], "status")["finished"])

    def test_max_two_groups_receipts_and_fairness(self):
        jobs = self.setup_jobs([("one", "a"), ("two", "a"), ("three", "b"), ("four", "c")])
        self.assertEqual(self.launch().returncode, 0)
        first = (self.runtime / "stub-calls").read_text().splitlines()
        self.assertEqual(set(first), {"a", "b"})
        self.assertEqual(len(first), 2)
        self.assertTrue(due.gate(jobs[0], "status")["finished"])
        self.assertFalse(any(self.runtime.glob("lane-*.json")))
        self.launch()
        self.assertEqual(len((self.runtime / "stub-calls").read_text().splitlines()), 4)
        self.launch()
        self.assertEqual(len((self.runtime / "stub-calls").read_text().splitlines()), 4)
        self.assertNotIn("private contents", (self.runtime / "scheduler.json").read_text())

    def test_process_exit_does_not_complete_unresolved_action(self):
        jobs = self.setup_jobs([("one", "a")])
        self.launch(mode="partial")
        state = due.gate(jobs[0], "status")
        self.assertFalse(state["finished"])
        self.assertIsNone(state["active"]["expires"])
        self.assertIn("fixture-mail", state["active"]["pending"])
        self.assertIn("a", self.state()["cooldowns"])
        self.launch(mode="done")
        self.assertEqual((self.runtime / "stub-calls").read_text().splitlines(), ["a"])

    def test_quota_survives_restart_and_yields(self):
        jobs = self.setup_jobs([("one", "a")])
        self.launch(mode="quota")
        self.assertIsNone(due.gate(jobs[0], "status")["active"]["expires"])
        self.assertGreaterEqual(self.state()["cooldowns"]["*"] - int(datetime.now(timezone.utc).timestamp()), 3597)
        self.launch(mode="done")
        self.assertEqual((self.runtime / "stub-calls").read_text().splitlines(), ["a"])

    def test_recover_dead_lane_without_launching_another_model(self):
        jobs = self.setup_jobs([("one", "a")])
        self.runtime.mkdir(mode=0o700)
        claim = due.dispatch(jobs, datetime.now(timezone.utc))
        (self.runtime / "lane-0.json").write_text(json.dumps(claim))
        self.launch()
        self.assertFalse((self.runtime / "stub-calls").exists())
        self.assertIsNone(due.gate(jobs[0], "status")["active"]["expires"])


if __name__ == "__main__":
    unittest.main()
