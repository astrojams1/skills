import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

BIN = Path(__file__).resolve().parents[1] / "bin"
sys.path.insert(0, str(BIN))
import marketing_due as due
import marketing_worker as worker


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

    def run_with_policy(self, policy, mode="done"):
        cfg = SimpleNamespace(catalog=self.catalog, runtime=self.runtime, codex=str(self.stub),
                              template=self.template, interval=120)
        self.runtime.mkdir(mode=0o700, exist_ok=True)
        catalog = json.loads(self.catalog.read_text())
        catalog["weekly_pacing"] = True
        self.catalog.write_text(json.dumps(catalog))
        supervisor = worker.Supervisor(cfg)
        with patch.object(worker.pacing, "plan", return_value=policy), patch.dict(
                os.environ, {"TEST_BEHAVIOR": mode, "TEST_GATE": str(due.GATE)}):
            supervisor.wake()
            for thread in supervisor.threads.values():
                thread.join()
        return worker.health(cfg)

    def test_high_pace_adds_lanes_and_exhaustion_stops_new_claims(self):
        jobs = self.setup_jobs([(x, x) for x in ["one","two","three","four"]])
        policy = {"included_exhausted": True, "level": 0}
        self.assertEqual(self.run_with_policy(policy)["target_lanes"], 0)
        self.assertFalse((self.runtime / "stub-calls").exists())
        policy.update(included_exhausted=False, level=2, interval_minutes=15)
        self.assertEqual(self.run_with_policy(policy)["target_lanes"], 4)
        self.assertEqual(set((self.runtime / "stub-calls").read_text().splitlines()), {j["group"] for j in jobs})

    def test_exhaustion_releases_dead_extra_without_starting_model(self):
        job, = self.setup_jobs([("daily", "business")])
        job["surplus_prompt"] = "Improve one open campaign item."
        self.catalog.write_text(json.dumps({"jobs": [job]}))
        claim = due.gate(job, "claim", "--job", "supplement.daily", "--slot", "surplus.100",
                         "--engine", "codex")
        due.gate(job, "yield", "--token", claim["token"], "--note", "branch-campaign")
        self.run_with_policy({"included_exhausted": True, "level": 0})
        result = due.gate(job, "status")
        self.assertIsNone(result["active"])
        self.assertEqual(result["finished"]["supplement.daily/surplus.100"], "surplus-deferred branch-campaign")
        self.assertFalse((self.runtime / "stub-calls").exists())

    def test_small_final_allowance_drains_surviving_high_lane(self):
        jobs = self.setup_jobs([("one", "a"), ("two", "b")])
        self.runtime.mkdir(mode=0o700)
        assignment = {"job": "other", "group": "c", "slot": "surplus.111", "worker_pid": os.getpid(),
                      "worker_birth": worker.process_birth(os.getpid())}
        (self.runtime / "lane-3.json").write_text(json.dumps(assignment))
        health = self.run_with_policy({"included_exhausted": False, "level": 1,
                                       "weekly": {"remaining_percent": 2}, "interval_minutes": 60})
        self.assertEqual(health["target_lanes"], 1)
        self.assertTrue(health["active_lanes"][0]["process_alive"])
        self.assertFalse((self.runtime / "stub-calls").exists())
        self.assertIsNone(due.gate(jobs[0], "status")["active"])

    def test_quota_survives_restart_and_yields(self):
        jobs = self.setup_jobs([("one", "a")])
        self.launch(mode="quota")
        self.assertIsNone(due.gate(jobs[0], "status")["active"]["expires"])
        self.assertGreaterEqual(self.state()["cooldowns"]["*"] - int(datetime.now(timezone.utc).timestamp()), 3597)
        self.launch(mode="done")
        self.assertEqual((self.runtime / "stub-calls").read_text().splitlines(), ["a"])

    def test_fresh_host_detects_and_repairs_dead_lane_even_with_cooldown(self):
        jobs = self.setup_jobs([("one", "a")])
        self.runtime.mkdir(mode=0o700)
        claim = due.dispatch(jobs, datetime.now(timezone.utc))
        path = self.runtime / "lane-0.json"
        path.write_text(json.dumps(claim))
        now = int(datetime.now(timezone.utc).timestamp())
        worker.save(self.runtime / "heartbeat.json", {"pid": os.getpid(), "at": now, "interval": 120})
        worker.save(self.runtime / "scheduler.json", {"cooldowns": {"a": now + 3600}, "cursor": "",
                    "recent": [{"at": now, "status": "handoff-unverified", "job": "one", "group": "a"}]})
        check = json.loads(self.launch("--check").stdout)
        self.assertEqual(check["status"], "degraded")
        self.assertTrue(check["runtime"]["daemon_fresh"])
        with worker.lock(self.runtime / "lane-0.lock"):
            self.assertEqual(json.loads(self.launch("--recover-handoffs").stdout)["recovered"], [])
        self.assertTrue(path.exists())
        self.assertEqual(json.loads(self.launch("--recover-handoffs").stdout)["recovered"], [0])
        self.assertFalse(path.exists())
        self.assertIsNone(due.gate(jobs[0], "status")["active"]["expires"])
        self.assertEqual(json.loads(self.launch("--check").stdout)["status"], "ready")

    def test_scoped_handoff_releases_lane_without_business_cooldown(self):
        claim = {"job": "daily", "slot": "morning", "group": "apps"}
        self.runtime.mkdir(mode=0o700)
        path = self.runtime / "lane-0.json"
        worker.save(path, claim)
        status = {"status": "ok", "finished": {}, "active": None,
                  "deferred": {"daily/morning": {"pending": {"one": "original"}}}}
        self.assertEqual(worker.finish(claim, call=lambda *_: status), "deferred")
        cfg = SimpleNamespace(runtime=self.runtime)
        supervisor = worker.Supervisor(cfg)
        with patch.object(worker, "finish", return_value="deferred"):
            supervisor.reconcile(path, claim, None)
        self.assertFalse(path.exists())
        self.assertNotIn("apps", self.state()["cooldowns"])

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
