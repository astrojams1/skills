import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

BIN = Path(__file__).resolve().parents[1] / "bin"
sys.path.insert(0, str(BIN))
import marketing_due as due


def job(name="daily", group=None, **changes):
    return {"id": name, "repo": "/sample", "group": group or name,
            "schedule": [{"at": "05:30", "days": list(range(7)), "pass": "full"}],
            "timezone": "America/Los_Angeles", "from": "2026-11-20T00:00:00Z",
            "prompt": "private worker prompt", **changes}


NOW = due.instant("2026-11-20T19:00:00Z")


class Queue:
    def __init__(self):
        self.states = {}
        self.calls = []

    def __call__(self, job, cmd, *args):
        self.calls.append((job["id"], cmd, args))
        if cmd == "status":
            return self.states.get(job["group"], {"status": "ok", "active": None, "finished": {}})
        if cmd == "claim":
            return {"status": "acquired", "token": "private test token"}
        raise AssertionError(cmd)


class DispatcherTests(unittest.TestCase):
    def test_before_activation_skips_all_slots(self):
        j = job(**{"from": "2026-11-20T14:30:00Z"})
        queue = Queue()
        self.assertEqual(due.occurrences(j, NOW), [])
        self.assertEqual(due.dispatch([j], NOW, call=queue)["status"], "idle")
        self.assertFalse(any(command == "claim" for _, command, _ in queue.calls))

    def test_unstarted_full_and_midday_scopes_survive_outage(self):
        j = job(schedule=[{"at": "05:30", "days": list(range(7)), "pass": "full"},
                          {"at": "09:30", "days": list(range(7)), "pass": "midday"}])
        self.assertEqual([s["pass"] for s in due.occurrences(j, NOW)], ["full", "midday"])
        self.assertEqual(due.dispatch([j], NOW, call=Queue())["slot"], "2026-11-20.0530")

    def test_explicit_interchangeable_scan_coalescing_and_month_calendar(self):
        j = job(schedule=[{"at": "05:30", "days": list(range(7)), "pass": "full"},
                          {"at": "06:30", "days": list(range(7)), "pass": "inbox", "coalesce": True},
                          {"at": "07:30", "days": list(range(7)), "pass": "inbox", "coalesce": True}])
        self.assertEqual([s["slot"] for s in due.occurrences(j, NOW)], ["2026-11-20.0530", "2026-11-20.0730"])
        j["from"] = "2026-01-01T00:00:00Z"
        j["schedule"] = [{"at": "02:00", "monthdays": [31], "pass": "audit"}]
        self.assertEqual(due.occurrences(j, due.instant("2026-03-01T20:00:00Z"))[-1]["slot"], "2026-01-31.0200")

    def test_dst_gap_and_fold(self):
        j = job(schedule=[{"at": "02:30", "days": list(range(7)), "pass": "full"}], **{"from": "2026-01-01T00:00:00Z"})
        self.assertEqual(due.occurrences(j, due.instant("2026-03-08T12:00:00Z"))[-1]["slot"], "2026-03-07.0230")
        j["schedule"][0]["at"] = "01:30"
        result = due.occurrences(j, due.instant("2026-11-01T10:30:00Z"))[-1]
        self.assertEqual(result["scheduled_at"], "2026-11-01T08:30:00+00:00")
        self.assertEqual(result["slot"], "2026-11-01.0130")

    def test_old_suspended_job_recovers_before_later_job_in_group(self):
        a, b = job("morning", "shared"), job("evening", "shared")
        queue = Queue()
        for expires in (None, "2026-10-01T20:00:00Z"):
            queue.states["shared"] = {"status": "ok", "finished": {},
                                      "active": {"job": "evening", "slot": "2026-09-14.0530", "expires": expires}}
            result = due.dispatch([a, b], NOW, call=queue)
            self.assertEqual((result["job"], result["slot"], result["pass"]), ("evening", "2026-09-14.0530", "full"))
            self.assertFalse(any(name == "morning" and cmd == "claim" for name, cmd, _ in queue.calls))

    def test_busy_finished_groups_skipped_and_rotation(self):
        jobs = [job(name) for name in ("completed", "busy", "free", "another")]
        queue = Queue()
        queue.states["completed"] = {"status": "ok", "active": None, "finished": {"completed/2026-11-20.0530": "receipt"}}
        queue.states["busy"] = {"status": "ok", "finished": {},
                                "active": {"job": "busy", "slot": "2026-11-20.0530", "expires": "2026-11-21T00:00:00Z"}}
        self.assertEqual(due.dispatch(jobs, NOW, call=queue)["job"], "free")
        self.assertEqual(due.dispatch(jobs, NOW, cursor="free", call=queue)["job"], "another")

    def test_failed_group_does_not_block_independent_work(self):
        queue = Queue()
        def call(j, *args):
            if j["id"] == "broken":
                raise OSError("private transport detail")
            return queue(j, *args)
        result = due.dispatch([job("broken"), job("works")], NOW, call=call)
        self.assertEqual(result["job"], "works")
        self.assertEqual(result["warnings"][0]["group"], "broken")
        self.assertNotIn("private transport", str(result))

    def test_alternating_head_start_and_recovery(self):
        j = job()
        for day in (20, 21):
            minute = due.instant(f"2026-11-{day}T13:30:00Z")
            item = due.occurrences(j, minute)[-1]
            self.assertEqual(due.ready(j, item, minute), not minute.date().toordinal() % 2)
            self.assertTrue(due.ready(j, item, minute + due.timedelta(minutes=15)))

    def test_issue_id_uses_initial_creation_and_obeys_cutover(self):
        j = job(**{"from": "2026-11-20T00:00:00Z", "reply_issues": {"repo": "sample/repo"}})
        calls = []
        def result(cmd, **kwargs):
            calls.append(cmd)
            rows = ("1\t2026-11-19T12:00:00Z\topen\t\n"
                    "8\t2026-11-20T16:00:00Z\tclosed\t2026-11-20T16:01:00Z\n")
            return subprocess.CompletedProcess(cmd, 0, rows)
        with patch.object(due.subprocess, "run", result):
            items = list(due.opened_issues(j))
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["slot"], "issue.8." + str(int(due.instant(items[0]["scheduled_at"]).timestamp())))
        self.assertEqual(items[0]["issue_state"], "closed")
        self.assertEqual(items[0]["issue_closed_at"], "2026-11-20T16:01:00Z")
        self.assertIn("state=all", calls[0])
        self.assertNotIn("labels=reply-waiting", calls[0])

    def test_plan_is_offline_and_contains_no_secrets_or_cursor(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "catalog.json"
            path.write_text(json.dumps({"jobs": [job()]}))
            result = subprocess.run([sys.executable, str(BIN / "marketing_due.py"), "--catalog", str(path),
                                     "--plan", "--at", NOW.isoformat()], capture_output=True, text=True, check=True)
            self.assertEqual(json.loads(result.stdout)["status"], "plan")
            self.assertNotIn("private", result.stdout)
            self.assertEqual(list(path.parent.iterdir()), [path])

    def test_git_transport_claim_yield_resume_done(self):
        with tempfile.TemporaryDirectory() as tmp:
            origin, local = [str(Path(tmp) / name) for name in ("origin.git", "work")]
            subprocess.run(["git", "init", "-q", "--bare", origin], check=True)
            subprocess.run(["git", "clone", "-q", origin, local], capture_output=True, check=True)
            j = job(repo=local)
            due.gate(j, "init")
            first = due.dispatch([j], NOW)
            self.assertEqual(first["status"], "running")
            token = first["gate"]["token"]
            self.assertEqual(due.gate(j, "yield", "--token", token, "--note", "worktree-ref")["status"], "yielded")
            second = due.dispatch([j], NOW)
            self.assertEqual(second["slot"], first["slot"])
            self.assertEqual(second["gate"]["checkpoint"], "worktree-ref")
            self.assertEqual(due.gate(j, "done", "--token", second["gate"]["token"], "--note", "confirmed")["status"], "done")
            self.assertEqual(due.dispatch([j], NOW)["status"], "idle")


if __name__ == "__main__":
    unittest.main()
