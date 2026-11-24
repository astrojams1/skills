import copy
import datetime as dt
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bin"))
import marketing_gate as gate


class Holds(unittest.TestCase):
    def setUp(self):
        self.state = gate.empty()
        self.now = dt.datetime(2026, 11, 24, tzinfo=gate.UTC)
        self.original = "daily"
        self.slot = "monday"
        self.effect = "listing-submit"
        self.scope = "directory.example.product"

    def op(self, *args, owner="worker"):
        cmd = gate.parse_args(["--repo", ".", "--group", "group", *args])
        return gate.transition(self.state, cmd, self.now, owner)

    def claim(self, name, slot, owner="worker"):
        return self.op("claim", "--job", name, "--slot", slot, "--engine", "claude", owner=owner)

    def isolate(self, effect=None, scope=None):
        return self.op("isolate", "--job", self.original, "--slot", self.slot,
                       "--effect", effect or self.effect, "--scope", scope or self.scope,
                       "--note", "provider-request-81", "--retry-minutes", "45")

    def begin(self, effect, *scopes):
        options = [word for scope in scopes for word in ("--scope", scope)]
        return self.op("begin", "--token", "worker", "--effect", effect, "--note", "register-8", *options)

    def seed(self):
        self.claim(self.original, self.slot)
        self.begin(self.effect)
        self.op("checkpoint", "--token", "worker", "--note", "worktree-12")

    def hold(self):
        self.seed()
        self.op("yield", "--token", "worker", "--note", "check provider")
        self.assertEqual(self.op("upgrade")["status"], "ready")
        self.assertEqual(self.isolate()["status"], "isolated")

    def test_exact_inactive_single_action_only_and_idempotent(self):
        self.seed()
        self.assertEqual(self.isolate()["status"], "upgrade-required")
        self.assertEqual(self.op("upgrade")["status"], "busy")
        self.assertEqual(self.op("status")["version"], 1)
        self.now += gate.LEASE
        self.assertEqual(self.op("upgrade")["status"], "ready")
        self.claim(self.original, self.slot)
        self.assertEqual(self.isolate()["status"], "busy")
        self.now += gate.LEASE
        before = copy.deepcopy(self.state)
        self.assertEqual(self.isolate(effect="wrong-effect")["status"], "not-isolatable")
        self.assertEqual(self.state, before)
        self.state["active"]["pending"]["another"] = "another object"
        self.assertEqual(self.isolate()["status"], "not-isolatable")
        del self.state["active"]["pending"]["another"]
        first = self.isolate()
        self.assertEqual(first["status"], "isolated")
        after = copy.deepcopy(self.state)
        self.assertEqual(self.isolate(), first)
        self.assertEqual(self.isolate(scope="different")["status"], "effect-held")
        self.assertEqual(self.state, after)
        status = self.op("status")
        self.assertEqual(status["version"], 2)
        self.assertIsNone(status["active"])
        held = status["held"][self.effect]
        self.assertEqual((held["scope"], held["evidence"], held["slot"]), (self.scope, "provider-request-81", self.slot))
        self.assertEqual(status["deferred"]["daily/monday"]["pending"], {self.effect: "register-8"})
        self.assertEqual(status["deferred"]["daily/monday"]["checkpoint"], "worktree-12")
        self.assertEqual(self.op("resolve", "--token", "worker", "--effect", self.effect, "--note", "stale")["status"], "lost")
        self.assertFalse(status["finished"])
        self.assertFalse(self.state["receipts"])

    def test_held_key_alias_and_overlapping_batch_only_block_affected_objects(self):
        self.hold()
        self.assertEqual(self.claim("new-job", "tuesday")["held"], self.op("status")["held"])
        self.assertEqual(self.begin(self.effect, "wrong-object")["status"], "effect-held")
        self.assertEqual(self.begin("another-spelling", self.scope)["status"], "effect-held")
        self.assertEqual(self.begin("package", "unrelated", self.scope)["status"], "effect-held")
        self.assertEqual(self.begin("unknown")["status"], "scope-required")
        self.assertEqual(self.begin("new-operation", "unrelated")["status"], "started")
        self.assertEqual(self.op("resolve", "--token", "worker", "--effect", self.effect, "--note", "other owner")["status"],
                         "unknown-effect")
        self.op("resolve", "--token", "worker", "--effect", "new-operation", "--note", "different receipt")
        self.op("done", "--token", "worker", "--note", "verified unrelated work")
        self.assertEqual(self.claim(self.original, self.slot)["status"], "deferred")
        self.assertNotIn(self.effect, self.state["receipts"])
        self.now += dt.timedelta(minutes=45)
        restored = self.claim(self.original, self.slot, "new")
        self.assertEqual(self.isolate()["status"], "busy")
        self.assertEqual((restored["attempt"], restored["pending"], restored["checkpoint"]),
                         (2, {self.effect: "register-8"}, "check provider"))
        self.assertEqual(self.op("done", "--token", "new", "--note", "incomplete")["status"], "reconcile")
        self.assertEqual(self.op("yield", "--token", "new", "--note", "still pending"),
                         {"status": "yielded", "deferred": True})
        self.assertIsNone(self.state["active"])
        self.now += dt.timedelta(minutes=45)
        self.claim(self.original, self.slot, "verifier")
        self.op("resolve", "--token", "verifier", "--effect", self.effect, "--note", "canonical provider receipt")
        self.assertFalse(self.op("status")["held"])
        self.op("done", "--token", "verifier", "--note", "pass finished")
        self.assertEqual(self.state["receipts"][self.effect], "canonical provider receipt")

    def test_declared_scopes_prevent_reclassifying_batches_or_changing_identity(self):
        self.op("upgrade")
        self.claim(self.original, self.slot)
        self.begin(self.effect, self.scope, "other")
        self.op("yield", "--token", "worker", "--note", "verify batch")
        self.assertEqual(self.isolate()["status"], "not-isolatable")
        self.assertEqual(self.claim("other-job", "tuesday")["status"], "resume-first")
        self.claim(self.original, self.slot)
        self.op("retry", "--token", "worker", "--effect", self.effect, "--note", "provider confirmed rejection")
        self.begin(self.effect, self.scope)
        self.op("yield", "--token", "worker", "--note", "verify item")
        self.assertEqual(self.isolate(scope="changed")["status"], "not-isolatable")
        self.assertEqual(self.isolate()["status"], "isolated")
        self.now += dt.timedelta(minutes=45)
        self.assertEqual(self.claim(self.original, self.slot)["begin_scopes"], {self.effect: [self.scope]})
        self.op("resolve", "--token", "worker", "--effect", self.effect, "--note", "verified")
        self.assertNotIn("begin_scopes", self.state["active"])

    def test_expired_reconciler_releases_supplement_without_marking_it_finished(self):
        self.original, self.slot = "supplement.daily", "surplus.10"
        self.hold()
        self.now += dt.timedelta(minutes=45)
        self.claim(self.original, self.slot)
        self.now += gate.LEASE
        self.assertEqual(self.isolate()["status"], "isolated")
        self.assertIsNone(self.state["active"])
        self.now += dt.timedelta(minutes=45)
        self.claim(self.original, self.slot)
        self.now += gate.LEASE
        self.assertEqual(self.claim("regular", "tuesday")["status"], "acquired")
        self.assertEqual(self.begin("alias", self.scope)["status"], "effect-held")
        self.assertNotIn(self.original + "/" + self.slot, self.state["finished"])

    def test_upgrade_preserves_inflight_work_and_legacy_archives_preserve_holds(self):
        self.seed()
        original = copy.deepcopy(self.state)
        self.assertEqual(self.op("upgrade")["status"], "busy")
        self.assertEqual(self.state, original)
        self.now += gate.LEASE
        self.assertEqual(self.op("upgrade"), {"status": "ready", "version": 2})
        self.assertEqual(self.state, dict(original, version=2))
        self.assertEqual(self.claim("regular", "tuesday")["status"], "resume-first")
        self.state = original
        with tempfile.TemporaryDirectory() as tmp:
            work, origin = Path(tmp) / "work", Path(tmp) / "origin"
            subprocess.run(["git", "init", "-q", str(work)], check=True)
            subprocess.run(["git", "init", "--bare", "-q", str(origin)], check=True)
            subprocess.run(["git", "-C", str(work), "remote", "add", "origin", str(origin)], check=True)
            store = gate.GitState(str(work), "fixture")
            self.state["receipts"]["previous"] = "r" * 2400
            self.assertTrue(store.publish("", self.state))
            head = store.head()
            self.now += gate.LEASE
            self.op("upgrade")
            self.isolate()
            self.state["finished"]["historic/old"] = "v" * 2400
            self.assertTrue(store.publish(head, self.state))
            head = store.head()
            self.assertEqual(store.read(head), self.state)
            snapshot = json.loads(store.git("show", head + ":state.json").stdout)
            self.assertEqual(snapshot["version"], 2)
            self.assertEqual(store.snapshot(snapshot["archive"])["version"], 1)
            self.assertIn(self.effect, snapshot["deferred"]["daily/monday"]["pending"])
            self.state["receipts"]["another"] = "w" * 2000
            self.assertTrue(store.publish(head, self.state))
            self.assertEqual(store.read(store.head()), self.state)

    def test_pinned_v1_client_cannot_claim_from_v2_origin(self):
        repo = Path(__file__).resolve().parents[1]
        pinned = "077900f4e5b60ebcf1bd478ee6b33bc04c553a95"
        snapshot = subprocess.run(["git", "-C", str(repo), "show", pinned + ":bin/marketing_gate.py"],
                                  capture_output=True)
        if snapshot.returncode:
            self.skipTest("pinned v1 source unavailable in shallow checkout")
        with tempfile.TemporaryDirectory() as tmp:
            work, origin, old = [Path(tmp) / n for n in ("work", "origin", "pinned.py")]
            old.write_bytes(snapshot.stdout)
            subprocess.run(["git", "init", "-q", str(work)], check=True)
            subprocess.run(["git", "init", "--bare", "-q", str(origin)], check=True)
            subprocess.run(["git", "-C", str(work), "remote", "add", "origin", str(origin)], check=True)
            location = ["--repo", str(work), "--group", "group"]
            old_cli = [sys.executable, str(old), *location]
            new_cli = [sys.executable, str(repo / "bin" / "marketing_gate.py"), *location]
            subprocess.check_output(new_cli + ["init"])
            self.assertEqual(json.loads(subprocess.check_output(old_cli + ["status"]))["status"], "ok")
            subprocess.check_output(new_cli + ["upgrade"])
            store = gate.GitState(str(work), "group")
            prior = store.head()
            rejected = subprocess.run(old_cli + ["claim", "--job", "daily", "--slot", "monday", "--engine", "claude"],
                                      capture_output=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertEqual(json.loads(rejected.stderr)["error"], "Unsupported coordinator state")
            self.assertEqual(store.head(), prior)


if __name__ == "__main__":
    unittest.main()
