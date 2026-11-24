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

    def test_uniform_head_start_and_recovery(self):
        j = job()
        for day in (20, 21):
            minute = due.instant(f"2026-11-{day}T13:30:00Z")
            item = due.occurrences(j, minute)[-1]
            self.assertFalse(due.ready(j, item, minute))
            self.assertTrue(due.ready(j, item, minute + due.timedelta(minutes=15)))

    def test_surplus_opt_in_and_interval_identity(self):
        j = job(surplus_prompt="Select distinct campaign work",
                schedule=[{"at": "13:00", "days": list(range(7)), "pass": "full"}])
        self.assertEqual(due.validate({"jobs": [j]}), [j])
        for invalid in (job("other", "daily", surplus_prompt="second"), job("empty", surplus_prompt=" ")):
            with self.assertRaises(ValueError):
                due.validate({"jobs": [j, invalid]})
        sample = due.instant("2026-11-20T19:04:05Z")
        for level, minutes in [(1, 60), (2, 15), (2, 5)]:
            result = due.dispatch([j], sample, call=Queue(), pacing={"level": level, "interval_minutes": minutes})
            self.assertEqual(result["slot"], f"surplus.{int(NOW.timestamp())}")
            self.assertEqual((result["job"], result["pass"], result["prompt"]),
                             ("supplement.daily", "surplus", j["surplus_prompt"]))
        base = due.dispatch([j], sample, call=Queue(), pacing={"level": 0, "interval_minutes": 15})
        self.assertEqual(base["status"], "idle")
        no_optin = job(schedule=j["schedule"])
        self.assertEqual(due.dispatch([no_optin], sample, call=Queue(),
                                      pacing={"level": 2, "interval_minutes": 15})["status"], "idle")

    def test_surplus_only_current_interval_and_cadence_downgrade(self):
        j = job(surplus_prompt="extra", schedule=[{"at": "13:00", "days": list(range(7)), "pass": "full"}])
        queue = Queue()
        later = due.instant("2026-11-20T19:39:00Z")
        quarter = due.dispatch([j], later, call=queue, pacing={"level": 2, "interval_minutes": 15})
        self.assertEqual(quarter["scheduled_at"], "2026-11-20T19:30:00+00:00")
        queue.states["daily"] = {"status": "ok", "active": None, "finished": {
            "supplement.daily/" + quarter["slot"]: "receipt"
        }}
        for minutes in (15, 60):
            self.assertEqual(due.dispatch([j], later, call=queue,
                                          pacing={"level": 1, "interval_minutes": minutes})["status"], "idle")
        five = due.dispatch([j], later, call=queue, pacing={"level": 2, "interval_minutes": 5})
        self.assertEqual(five["scheduled_at"], "2026-11-20T19:35:00+00:00")
        queue.states["daily"]["finished"]["supplement.daily/" + five["slot"]] = "another distinct item"
        for minutes in (5, 15, 60):
            self.assertEqual(due.dispatch([j], later, call=queue,
                                          pacing={"level": 2, "interval_minutes": minutes})["status"], "idle")
        fresh = job(surplus_prompt="extra", schedule=j["schedule"], **{"from": "2026-11-20T19:38:00Z"})
        self.assertEqual(due.dispatch([fresh], later, call=Queue(),
                                      pacing={"level": 2, "interval_minutes": 15})["status"], "idle")

    def test_regular_event_and_scheduled_work_across_groups_precede_surplus(self):
        extra = job("extra", surplus_prompt="extra", schedule=[{"at": "13:00", "days": [4], "pass": "full"}])
        pacing = {"level": 2, "interval_minutes": 15}
        queue = Queue()
        self.assertEqual(due.dispatch([extra, job("other")], NOW, call=queue, pacing=pacing)["job"], "other")
        j = job("notify", schedule=extra["schedule"], reply_issues={"repo": "test/test"})
        event = {"job": "notify", "slot": "issue.9.1795195000", "pass": "issue", "scheduled_at": NOW.isoformat()}
        selected = due.dispatch([extra, j], NOW + due.RUNWAY, call=queue, pacing=pacing, issues=lambda _: [event])
        self.assertEqual(selected["pass"], "issue")

    def test_boost_respects_claude_head_start_and_reserves_imminent_sibling_pass(self):
        pacing = {"level": 1, "interval_minutes": 60}
        now = next(t for t in (due.instant("2026-11-20T13:30:00Z"), due.instant("2026-11-21T13:30:00Z"))
                   if t.date().toordinal() % 2)
        j = job(**{"from": now.isoformat()})
        self.assertEqual(due.dispatch([j], now, call=Queue())["status"], "idle")
        self.assertEqual(due.dispatch([j], now, call=Queue(), pacing=pacing)["status"], "idle")
        self.assertEqual(due.dispatch([j], now + due.RUNWAY, call=Queue(), pacing=pacing)["pass"], "full")
        extra = job("extra", "shared", surplus_prompt="extra", schedule=[{"at": "15:00", "days": [4], "pass": "full"}])
        soon = job("soon", "shared", schedule=[{"at": "11:10", "days": [4], "pass": "full"}])
        self.assertEqual(due.dispatch([extra, soon], NOW, call=Queue(), pacing=pacing)["status"], "idle")
        self.assertEqual(due.dispatch([extra], NOW, call=Queue(), pacing=pacing)["pass"], "surplus")

    def test_fresh_issue_reserves_group_from_sibling_backlog_and_extras(self):
        sibling = job("backlog", "shared", surplus_prompt="extra")
        notify = job("notify", "shared", schedule=[{"at": "13:00", "days": [4], "pass": "full"}],
                     reply_issues={"repo": "org/repo"})
        stamp = int(NOW.timestamp())
        event = {"job": "notify", "slot": f"issue.4.{stamp}", "scheduled_at": NOW.isoformat(), "pass": "issue"}
        jobs = [sibling, notify]
        def poll(jobs, when, queue):
            return due.dispatch(jobs, when, call=queue, issues=lambda _: [event],
                                pacing={"level": 2, "interval_minutes": 5})
        q = Queue()
        self.assertEqual(poll(jobs, NOW + due.timedelta(minutes=14), q)["status"], "idle")
        self.assertFalse(any(cmd == "claim" for _, cmd, _ in q.calls))
        self.assertEqual(poll(jobs + [job("independent")], NOW, q)["job"], "independent")
        self.assertEqual(poll(jobs, NOW + due.RUNWAY, q)["job"], "backlog")
        q.states["shared"] = {"status": "ok", "active": None, "finished": {"notify/" + event["slot"]: "receipt"}}
        self.assertEqual(poll(jobs, NOW, q)["job"], "backlog")

    def test_coalesced_deferred_slot_survives_and_waits_until_retry(self):
        j = job(schedule=[{"at": "05:30", "days": list(range(7)), "pass": "scan", "coalesce": True},
                          {"at": "08:30", "days": list(range(7)), "pass": "scan", "coalesce": True}])
        q = Queue()
        state = q.states["daily"] = {"status": "ok", "active": None, "finished": {},
                                    "deferred": {"daily/2026-11-20.0530": {"retry_at": NOW.isoformat(),
                                                                          "checkpoint": "worktree-old"}}}
        self.assertEqual(due.dispatch([j], NOW, call=q)["slot"], "2026-11-20.0830")
        state["finished"]["daily/2026-11-20.0830"] = "receipt"
        self.assertEqual(due.dispatch([j], NOW - due.timedelta(seconds=1), call=q)["status"], "idle")
        self.assertEqual(due.dispatch([j], NOW, call=q)["slot"], "2026-11-20.0530")

    def test_previous_group_cannot_starve_another_groups_due_retry(self):
        idle_sibling = job("idle", "a", schedule=[{"at": "23:00", "days": [4], "pass": "full"}])
        retry_job = job("retry", "b", schedule=idle_sibling["schedule"])
        busy_backlog = job("backlog", "a")
        q = Queue()
        q.states["b"] = {"status": "ok", "active": None, "finished": {}, "deferred": {
            "retry/2026-11-19.2300": {"checkpoint": "open-pr", "retry_at": NOW.isoformat()}}}
        selected = due.dispatch([idle_sibling, retry_job, busy_backlog], NOW, cursor="backlog", call=q)
        self.assertEqual((selected["job"], selected["slot"]), ("retry", "2026-11-19.2300"))

    def test_clean_inactive_blockers_release_for_regular_work(self):
        for name, slot, op in [("daily", "2026-11-19.0530", "defer"), ("supplement.daily", "surplus.123", "park")]:
            j, q = job(surplus_prompt="optional"), Queue()
            active = {"job": name, "slot": slot, "expires": None, "checkpoint": "original", "pending": {}}
            q.states["daily"] = {"status": "ok", "active": active, "finished": {}}
            def call(member, cmd, *args):
                if cmd == op:
                    self.assertEqual(args, ("--job", name, "--slot", slot))
                    q.states["daily"]["active"] = None
                    return {"status": "parked" if op == "park" else "deferred"}
                return q(member, cmd, *args)
            result = due.dispatch([j], NOW, call=call, pacing={"level": 2, "interval_minutes": 5})
            self.assertEqual((result["job"], result["slot"]), ("daily", "2026-11-20.0530"))
            self.assertIsNone(q.states["daily"]["active"])

    def test_pending_supplement_is_reconciled_without_new_work_under_boost(self):
        q = Queue()
        q.states["daily"] = {"status": "ok", "finished": {}, "active": {
            "job": "supplement.daily", "slot": "surplus.123", "expires": None, "pending": {"x": "verify"}}}
        result = due.dispatch([job(surplus_prompt="extra")], NOW, call=q,
                              pacing={"level": 2, "interval_minutes": 5})
        self.assertEqual(result["job"], "supplement.daily")
        self.assertIn("Start no new", result["prompt"])

    def test_busy_and_unreadable_groups_cannot_start_supplemental_work(self):
        j = job(surplus_prompt="extra", schedule=[{"at": "13:00", "days": [4], "pass": "full"}],
                reply_issues={"repo": "org/repo"})
        queue = Queue()
        policy = {"level": 2, "interval_minutes": 15}

        def failed_events(_):
            raise OSError("unreadable event stream")

        self.assertEqual(due.dispatch([j], NOW, call=queue, issues=failed_events, pacing=policy)["status"],
                         "unavailable")
        queue.states["daily"] = {"status": "ok", "finished": {}, "active": {
            "job": "daily", "slot": "2026-11-20.0530", "expires": "2026-11-20T20:00:00Z"
        }}
        self.assertEqual(due.dispatch([j], NOW, call=queue, issues=lambda _: [], pacing=policy)["status"], "idle")
        self.assertFalse(any(cmd == "claim" for _, cmd, _ in queue.calls))

    def test_group_cooldown_only_after_exact_empty_receipt(self):
        epoch = int(NOW.timestamp())
        for age, note, expected in [(21000, "no-opportunity", False), (21000, "no-opportunity no fresh lead", False),
                                    (21600, "no-opportunity", True), (1800, "no-opportunity-other", True)]:
            history = {f"supplement.other/surplus.{epoch-age}": note, "job/2026-11-20.0530": "no-opportunity"}
            self.assertEqual(due.surplus_available(history, epoch, epoch), expected)
        queue = Queue()
        queue.states["daily"] = {"status": "ok", "active": None, "finished": {
            f"supplement.other/surplus.{epoch-900}": "no-opportunity"
        }}
        self.assertEqual(due.dispatch([job(surplus_prompt="extra")], NOW, call=queue,
                                      pacing={"level": 1, "interval_minutes": 60})["pass"], "full")

    def test_parked_checkpoint_follows_only_latest_same_job(self):
        j = job(surplus_prompt="extra", schedule=[{"at": "13:00", "days": [4], "pass": "full"}])
        queue = Queue()
        epoch = int(NOW.timestamp())
        history = {f"supplement.daily/surplus.{epoch-7200}": "surplus-deferred branch-41",
                   f"supplement.other/surplus.{epoch-5400}": "surplus-deferred unrelated"}
        queue.states["daily"] = {"status": "ok", "active": None, "finished": history}
        pacing = {"level": 1, "interval_minutes": 60}
        self.assertEqual(due.dispatch([j], NOW, call=queue, pacing=pacing)["parked_checkpoint"], "branch-41")
        history[f"supplement.daily/surplus.{epoch-3600}"] = "completed branch-41"
        self.assertNotIn("parked_checkpoint", due.dispatch([j], NOW, call=queue, pacing=pacing))

    def test_supplement_recovers_own_scope_without_starting_new_extras(self):
        active = {"job": "supplement.daily", "slot": f"surplus.{int(NOW.timestamp())-3600}", "expires": None}
        queue = Queue()
        queue.states["daily"] = {"status": "ok", "active": active, "finished": {}}
        j = job(surplus_prompt="Work on distinct drafts")
        for mode in (None, {"level": 2, "interval_minutes": 15}):
            result = due.dispatch([j], NOW, call=queue, pacing=mode)
            self.assertEqual((result["job"], result["slot"], result["pass"]), (active["job"], active["slot"], "surplus"))
            self.assertIn("Work on distinct drafts", result["prompt"])
            self.assertNotIn("private worker prompt", result["prompt"])
            if not mode:
                self.assertIn("Start no new", result["prompt"])
        result = due.dispatch([job()], NOW, call=queue)
        self.assertIn("Start no new", result["prompt"])
        self.assertEqual(due.dispatch([j, job("regular")], NOW, call=queue)["job"], "regular")
        self.assertEqual(due.rotation(["daily", "regular"], "supplement.daily"), ["regular", "daily"])

    def test_real_gate_fences_supplement_separately_from_native_schedule(self):
        with tempfile.TemporaryDirectory() as tmp:
            remote, local = [str(Path(tmp) / n) for n in ("remote.git", "checkout")]
            subprocess.run(["git", "init", "-q", "--bare", remote], check=True)
            subprocess.run(["git", "clone", "-q", remote, local], check=True, capture_output=True)
            j = job(repo=local, surplus_prompt="Distinct work", schedule=[{"at": "14:00", "days": [4], "pass": "full"}])
            due.gate(j, "init")
            extra = due.dispatch([j], NOW, pacing={"level": 1, "interval_minutes": 60})
            due.gate(j, "yield", "--token", extra["gate"]["token"], "--note", "unfinished draft")
            native = due.gate(j, "claim", "--job", j["id"], "--slot", "2026-11-20.1400", "--engine", "claude")
            self.assertEqual(native["status"], "acquired")
            self.assertEqual(native["engine"], "claude")
            late = due.gate(j, "done", "--token", extra["gate"]["token"], "--note", "stale owner")
            self.assertEqual(late["status"], "lost")
            due.gate(j, "done", "--token", native["token"], "--note", "receipt")
            resumed = due.dispatch([j], NOW + due.timedelta(hours=1), pacing={"level": 1, "interval_minutes": 60})
            self.assertEqual(resumed["pass"], "surplus")
            self.assertEqual(resumed["parked_checkpoint"], "unfinished draft")

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
