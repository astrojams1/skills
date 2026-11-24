import concurrent.futures
import datetime as dt
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "bin" / "marketing_gate.py"
spec = importlib.util.spec_from_file_location("gate", SCRIPT)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class Ownership(unittest.TestCase):
    def test_lost_worker_pending_effect_and_durable_receipt(self):
        state = gate.empty()
        now = dt.datetime(2026, 1, 5, tzinfo=gate.UTC)
        def apply(*args, token="a"):
            request = gate.parse_args(["--repo", ".", "--group", "test", *args])
            return gate.transition(state, request, now, token)
        def claim(engine, slot="2026-01-05.0530", token="a"):
            return apply("claim", "--job", "test-job", "--slot", slot, "--engine", engine, token=token)
        self.assertEqual(claim("claude")["status"], "acquired")
        self.assertEqual(claim("codex")["status"], "busy")
        self.assertEqual(apply("checkpoint", "--token", "a", "--note", "stage-1")["status"], "ok")
        self.assertEqual(apply("begin", "--token", "a", "--effect", "one", "--note", "registry-1")["status"], "started")
        now += gate.LEASE
        self.assertEqual(claim("codex", "2026-01-05.1330")["status"], "resume-first")
        self.assertEqual(apply("resolve", "--token", "a", "--effect", "one", "--note", "stale")["status"], "lost")
        acquired = claim("codex", token="b")
        self.assertEqual(acquired["pending"], {"one":"registry-1"})
        self.assertEqual(acquired["checkpoint"], "stage-1")
        self.assertNotIn("owner", acquired)
        self.assertNotIn('"b"', json.dumps(state))
        self.assertEqual(apply("done", "--token", "b", "--note", "premature")["status"], "reconcile")
        self.assertEqual(apply("begin", "--token", "b", "--effect", "one", "--note", "again")["status"], "reconcile")
        self.assertEqual(apply("resolve", "--token", "b", "--effect", "one", "--note", "provider-id")["status"], "resolved")
        self.assertEqual(apply("done", "--token", "b", "--note", "verified")["status"], "done")
        self.assertEqual(claim("claude")["status"], "done")
        self.assertEqual(claim("claude", "2026-01-06.0530")["status"], "acquired")
        self.assertEqual(apply("begin", "--effect", "one", "--note", "again", "--token", "a")["status"], "already-resolved")
        self.assertEqual(apply("yield", "--token", "a", "--note", "quota")["status"], "yielded")
        self.assertEqual(claim("codex", "2026-01-06.0530", "c")["checkpoint"], "quota")

    def test_park_releases_only_idle_supplement_without_pending_effects(self):
        state = gate.empty()
        now = dt.datetime(2026, 11, 21, tzinfo=gate.UTC)
        job = "supplement.daily"
        slot = "surplus.1795282200"

        def run(*args):
            command = gate.parse_args(["--repo", ".", "--group", "fixture", *args])
            return gate.transition(state, command, now, "owner")["status"]

        def park():
            return run("park", "--job", job, "--slot", slot)

        self.assertEqual(run("claim", "--job", job, "--slot", slot, "--engine", "codex"), "acquired")
        self.assertEqual(park(), "busy")
        self.assertEqual(run("begin", "--token", "owner", "--effect", "draft-1", "--note", "worktree"), "started")
        self.assertEqual(run("yield", "--token", "owner", "--note", "PR-11"), "yielded")
        self.assertEqual(park(), "reconcile")
        self.assertEqual(run("claim", "--job", job, "--slot", slot, "--engine", "codex"), "acquired")
        self.assertEqual(run("resolve", "--token", "owner", "--effect", "draft-1", "--note", "PR-11"), "resolved")
        now += gate.LEASE
        self.assertEqual(park(), "parked")
        self.assertEqual(state["finished"][job + "/" + slot], "surplus-deferred PR-11")
        self.assertEqual(run("claim", "--job", "daily", "--slot", "2026-11-21.0530", "--engine", "claude"), "acquired")
        self.assertEqual(run("yield", "--token", "owner", "--note", "regular checkpoint"), "yielded")
        self.assertEqual(run("park", "--job", "daily", "--slot", "2026-11-21.0530"), "not-parkable")
        self.assertIsNotNone(state["active"])

    def test_native_can_start_after_other_worker_yields_and_restore_its_checkpoint(self):
        state = gate.empty()
        now = dt.datetime(2026, 11, 23, tzinfo=gate.UTC)

        def op(*args, token="worker"):
            return gate.transition(state, gate.parse_args(["--repo", ".", "--group", "test", *args]), now, token)

        def claim(job, slot):
            return op("claim", "--job", job, "--slot", slot, "--engine", "claude", token=job)

        claim("mac", "sunday")
        self.assertEqual(claim("cloud", "monday")["status"], "resume-first")
        op("yield", "--token", "mac", "--note", "existing video and PR verified")
        self.assertEqual(claim("supplement.cloud", "surplus.123")["status"], "resume-first")
        self.assertEqual(claim("cloud", "monday")["status"], "acquired")
        self.assertEqual(claim("mac", "sunday")["status"], "deferred")
        self.assertNotIn("mac/sunday", state["finished"])
        self.assertEqual(op("done", "--token", "mac", "--note", "late")["status"], "lost")
        op("done", "--token", "cloud", "--note", "verified")
        now += dt.timedelta(hours=1)
        restored = claim("mac", "sunday")
        self.assertEqual((restored["attempt"], restored["checkpoint"]), (2, "existing video and PR verified"))
        self.assertFalse(state["deferred"])

    def test_native_can_park_expired_supplement_without_the_codex_host(self):
        state = gate.empty()
        now = dt.datetime(2026, 11, 23, tzinfo=gate.UTC)
        def op(*args):
            return gate.transition(state, gate.parse_args(["--repo", ".", "--group", "test", *args]), now, "a")
        op("claim", "--job", "supplement.daily", "--slot", "surplus.1", "--engine", "codex")
        op("checkpoint", "--token", "a", "--note", "PR-2")
        now += gate.LEASE
        self.assertEqual(op("claim", "--job", "daily", "--slot", "monday", "--engine", "claude")["status"],
                         "acquired")
        self.assertEqual(state["finished"]["supplement.daily/surplus.1"], "surplus-deferred PR-2")

    def test_compaction_preserves_old_effects_and_slots(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subprocess.run(["git", "init", "-q", str(root / "work")], check=True)
            subprocess.run(["git", "init", "--bare", "-q", str(root / "origin")], check=True)
            subprocess.run(["git", "-C", str(root / "work"), "remote", "add", "origin",
                            str(root / "origin")], check=True)
            store = gate.GitState(str(root / "work"), "fixture")
            state = gate.empty()
            for index in range(7):
                head = store.head()
                state["receipts"][f"effect-{index}"] = str(index) * 1800
                state["finished"][f"job/{index}"] = str(index)
                self.assertTrue(store.publish(head, state))
            head = store.head()
            self.assertLess(len(store.git("show", head + ":state.json").stdout), 4096)
            self.assertEqual(store.read(head), state)
            self.assertIn("archive", store.snapshot(head))

    def test_simultaneous_clients(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            remote = base / "origin.git"
            subprocess.run(["git","init","--bare","-q",str(remote)],check=True)
            clients = []
            for engine in ("claude", "codex"):
                repo = base / engine
                subprocess.run(["git","init","-q",str(repo)],check=True)
                subprocess.run(["git","-C",str(repo),"remote","add","origin",str(remote)],check=True)
                clients.append([sys.executable, str(SCRIPT), "--repo", str(repo), "--group", "test"])
            subprocess.run(clients[0]+["init"],check=True,capture_output=True)
            with concurrent.futures.ThreadPoolExecutor() as pool:
                futures = [pool.submit(subprocess.check_output, cmd + ["claim","--job","fixture",
                          "--slot","2026-11-21.0530","--engine",engine]) for cmd,engine in zip(clients,["claude","codex"])]
            answers = [json.loads(f.result()) for f in futures]
            self.assertEqual(sorted(a["status"] for a in answers), ["acquired","busy"])
            winner = next(a for a in answers if a["status"] == "acquired")
            cmd = clients[0]+["done","--token",winner["token"],"--note","verified"]
            self.assertEqual(json.loads(subprocess.check_output(cmd))["status"], "done")
            status = json.loads(subprocess.check_output(clients[1]+["status"]))
            self.assertEqual(status["finished"], {"fixture/2026-11-21.0530":"verified"})
            rules = subprocess.check_output(["git","--git-dir",str(remote),"show",
                    "refs/heads/marketing-coordination-v1-test:vercel.json"])
            self.assertFalse(json.loads(rules)["git"]["deploymentEnabled"])


if __name__ == "__main__":
    unittest.main()
