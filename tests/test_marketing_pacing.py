import json
import os
import sys
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "bin"))
import marketing_pacing as pacing


AT = datetime(2026, 11, 21, tzinfo=timezone.utc)
STAMP = int(AT.timestamp())


def window(left, duration, seconds):
    return {"usedPercent": 100 - left, "windowDurationMins": duration, "resetsAt": STAMP + seconds}


def response(left=75, time_fraction=.28, short=None, **changes):
    week = window(left, pacing.WEEK, round(time_fraction * pacing.WEEK * 60))
    bucket = {"primary": week, "secondary": short, "limitId": "codex",
              "credits": {"unlimited": True, "balance": "private-billing-information"}}
    bucket.update(changes)
    return {"rateLimitsByLimitId": {"codex": bucket}, "ordinaryUsageAllowed": True,
            "accountId": "private-account", "rateLimits": {"primary": window(0, 300, 7200)}}


def result(report):
    return pacing.report(pacing.normalize(report, STAMP), STAMP, True)


class PacingTests(unittest.TestCase):
    def test_bucket_and_duration_not_position(self):
        data = response(short=window(94, 300, 3600))
        bucket = data["rateLimitsByLimitId"]["codex"]
        bucket["primary"], bucket["secondary"] = bucket["secondary"], bucket["primary"]
        data["rateLimitsByLimitId"]["other-model"] = {"primary": window(0, pacing.WEEK, 500000)}
        out = result(data)
        self.assertEqual((out["level"], out["interval_minutes"], out["weekly"]["remaining_percent"]), (2, 15, 75))
        self.assertEqual(out["short_window"]["remaining_percent"], 94)
        self.assertAlmostEqual(out["required_burn_multiplier"], 75 / 28, places=2)
        self.assertIsNone(result(response())["short_window"])

    def test_legacy_and_unknown_buckets(self):
        data = response()
        primary = data["rateLimitsByLimitId"].pop("codex")
        data["rateLimits"] = primary
        self.assertEqual(result(data)["level"], 2)
        data["rateLimitsByLimitId"]["unrelated"] = primary
        self.assertEqual(result(data)["level"], 0)

    def test_on_track_low_surplus_moderate_and_terminal_hours(self):
        for left, fraction, level in [(50, .50, 0), (40, .45, 0), (60, .45, 1), (3, 1/168, 1),
                                      (1, 5/(7*24*60), 1), (1, .02, 0), (100, 1, 0)]:
            with self.subTest(left=left, fraction=fraction):
                self.assertEqual(result(response(left, fraction))["level"], level)

    def test_secondary_constraints(self):
        for left, remaining_seconds, level in [(5, 60, 0), (20, 60, 1), (80, 60, 2),
                                               (30, 4*3600, 0), (60, 225*60, 1)]:
            with self.subTest(left=left, seconds=remaining_seconds):
                out = result(response(short=window(left, 300, remaining_seconds)))
                self.assertEqual(out["level"], level)
        out = result(response(individualLimit={"remainingPercent": 20, "resetsAt": STAMP+86400}))
        self.assertEqual(out["level"], 1)

    def test_large_surplus_uses_five_minute_cadence(self):
        self.assertEqual(result(response(75, .24))["interval_minutes"], 5)
        self.assertEqual(result(response(75, .27))["interval_minutes"], 15)
        self.assertEqual(result(response(3, .005))["interval_minutes"], 60)

    def test_exhausted_even_with_unlimited_credits(self):
        for data in (response(left=0), response(short=window(0, 300, 60)), response(spendControlReached=True),
                     response(rateLimitReachedType="rate_limit_reached"),
                     response(individualLimit={"remainingPercent": 0, "resetsAt": STAMP+3600}),
                     dict(response(), ordinaryUsageAllowed=False)):
            out = result(data)
            self.assertTrue(out["included_exhausted"])
            self.assertEqual(out["level"], 0)
            self.assertIsNone(out["interval_minutes"])
            self.assertNotIn("private", json.dumps(out))

    def test_missing_unknown_and_expired_windows_fail_baseline(self):
        for data in (response(short={"usedPercent": 2}), response(primary=None),
                     response(time_fraction=0), dict(response(), ordinaryUsageAllowed=None)):
            self.assertEqual(result(data)["level"], 0)

    def test_cache_refresh_reset_and_no_sensitive_fields(self):
        with tempfile.TemporaryDirectory() as runtime:
            initial = response(short=window(75, 300, 30))
            with patch.object(pacing, "account_limits", side_effect=[initial, response(65), response(60)]) as read:
                first = pacing.plan("fake", runtime, AT)
                self.assertEqual(first["level"], 2)
                self.assertEqual(pacing.plan("fake", runtime, AT+timedelta(seconds=29))["read_at"], STAMP)
                self.assertEqual(pacing.plan("fake", runtime, AT+timedelta(seconds=30))["weekly"]["remaining_percent"], 65)
                self.assertEqual(pacing.plan("fake", runtime, AT+timedelta(seconds=630))["weekly"]["remaining_percent"], 60)
                self.assertEqual(read.call_count, 3)
            path = Path(runtime) / "pacing.json"
            self.assertNotIn("private", path.read_text())
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_stale_observation_stops_boost_and_failure_does_not_imply_refill(self):
        with tempfile.TemporaryDirectory() as runtime:
            with patch.object(pacing, "account_limits", side_effect=[response(short=window(0, 300, 10)),
                        OSError("private service failure"), response()]) as read:
                self.assertTrue(pacing.plan("fake", runtime, AT)["included_exhausted"])
                after = pacing.plan("fake", runtime, AT+timedelta(seconds=10))
                self.assertEqual((after["level"], after["included_exhausted"], after["status"]), (0, True, "stale"))
                self.assertTrue(pacing.plan("fake", runtime, AT+timedelta(seconds=30))["included_exhausted"])
                fresh = pacing.plan("fake", runtime, AT+timedelta(seconds=70))
                self.assertEqual((fresh["included_exhausted"], fresh["level"], read.call_count), (False, 2, 3))
        with tempfile.TemporaryDirectory() as runtime:
            with patch.object(pacing, "account_limits", side_effect=[response(), TimeoutError()]):
                self.assertEqual(pacing.plan("fake", runtime, AT)["level"], 2)
                self.assertEqual(pacing.plan("fake", runtime, AT+timedelta(minutes=10))["level"], 0)

    def test_fast_refresh_near_exhaustion(self):
        for limit in (response(5, .01), response(short=window(5, 300, 3600))):
            with tempfile.TemporaryDirectory() as runtime:
                with patch.object(pacing, "account_limits", side_effect=[limit, response(0)]) as read:
                    pacing.plan("fake", runtime, AT)
                    pacing.plan("fake", runtime, AT+timedelta(seconds=119))
                    self.assertEqual(read.call_count, 1)
                    self.assertTrue(pacing.plan("fake", runtime, AT+timedelta(seconds=120))["included_exhausted"])
                    self.assertEqual(read.call_count, 2)

    def test_corrupt_cache_recovers(self):
        with tempfile.TemporaryDirectory() as runtime:
            (Path(runtime) / "pacing.json").write_text('{"version":1, "sample":{"wrong":true}}')
            with patch.object(pacing, "account_limits", return_value=response()):
                self.assertEqual(pacing.plan("fake", runtime, AT)["level"], 2)

    def test_stdio_protocol_only_reads_and_sanitizes_env(self):
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / "codex"
            script.write_text('''#!/usr/bin/env python3
import json,os,sys
assert "app-server" in sys.argv
assert "OPENAI_API_KEY" not in os.environ and "OPENAI_BASE_URL" not in os.environ
for line in sys.stdin:
    req=json.loads(line); method=req["method"]
    if method=="initialized": continue
    if method=="initialize": result={}
    elif method=="account/read": result={"account":{"type":"chatgpt"}}
    elif method=="account/rateLimits/read":
        assert req["params"]["supportsLunaReserve"] is False
        result={"rateLimits":{"primary":{"windowDurationMins":10080,"usedPercent":25,"resetsAt":12345}}}
    else: raise AssertionError(method)
    print(json.dumps({"method":"notification","params":{}}),flush=True)
    print(json.dumps({"id":req["id"],"result":result}),flush=True)
''')
            script.chmod(0o700)
            with patch.dict(os.environ, OPENAI_API_KEY="sensitive", OPENAI_BASE_URL="unused"):
                self.assertEqual(pacing.account_limits(str(script))["rateLimits"]["primary"]["usedPercent"], 25)

    def test_unresponsive_stdio_is_bounded_and_reaped(self):
        with tempfile.TemporaryDirectory() as tmp:
            script = Path(tmp) / "codex"
            pidfile = Path(tmp) / "pid"
            script.write_text(f"#!/usr/bin/env python3\nimport os,time\nopen({str(pidfile)!r},'w').write(str(os.getpid()))\ntime.sleep(60)\n")
            script.chmod(0o700)
            before = time.monotonic()
            with self.assertRaises(TimeoutError):
                pacing.account_limits(str(script), timeout=0.5)
            self.assertLess(time.monotonic()-before, 4)
            with self.assertRaises(ProcessLookupError):
                os.kill(int(pidfile.read_text()), 0)


if __name__ == "__main__":
    unittest.main()
