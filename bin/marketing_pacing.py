"""Read included Codex subscription limits and pace optional marketing work.

Compare the percentage of allowance remaining with the percentage of the week
remaining (T). Moderate work every 60 minutes requires a ratio of at least
1.2 and surplus of at least min(5, max(0.25, 0.2*T)) percentage points.
High work every 15 minutes requires a ratio of at least 2, over 10% weekly
remaining, and a surplus of at least min(15, max(2, 0.5*T)) points. A ratio
of 3 or higher shortens the high interval to 5 minutes. Any
positive weekly percentage can qualify for moderate work before reset.

Other applicable windows or individual controls at 10% remaining or below
pause extras; 25% or below limits them to moderate. When another window's
remaining percentage trails its time remaining by more than 20 points, pause
extras; more than 10 points limits them to moderate. Included-usage denial,
an exhausted window, and explicit spend controls take precedence over pacing.
Sample at most ten minutes apart, shortening to two minutes when any reported
allowance reaches 5% remaining, and refresh at an observed window reset.
"""
import contextlib
import fcntl
import json
import os
import select
import signal
import subprocess
import tempfile
import time
from pathlib import Path


WEEK = 7 * 24 * 60
MAX_AGE = 600
RETRY = 60


def subscription_env():
    return {k: v for k, v in os.environ.items()
           if k == "CODEX_HOME" or not (k.startswith(("OPENAI_", "AZURE_OPENAI_", "CODEX_"))
                                        or k in {"CHATGPT_BASE_URL", "CHATGPT_API_BASE", "CHATGPT_API_KEY"})}


def account_limits(codex, timeout=15):
    """Read account metadata over local stdio. No thread, turn or credit mutation."""
    command = [codex, "-c", 'model_provider="openai"', "-c", 'forced_login_method="chatgpt"',
               "app-server", "--listen", "stdio://"]
    deadline = time.monotonic() + timeout
    with subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          env=subscription_env(), start_new_session=True, bufsize=0) as proc:
        buffer = bytearray()
        received = 0

        def send(message):
            proc.stdin.write(json.dumps(message).encode() + b"\n")

        def request(i, method, params):
            nonlocal received
            send({"id": i, "method": method, "params": params})
            while time.monotonic() < deadline:
                cut = buffer.find(b"\n")
                if cut < 0:
                    wait = max(0, deadline - time.monotonic())
                    if not select.select([proc.stdout], [], [], wait)[0]:
                        break
                    data = os.read(proc.stdout.fileno(), 65536)
                    received += len(data)
                    if not data or received > 1024 * 1024:
                        raise ValueError("Invalid usage protocol stream")
                    buffer.extend(data)
                    continue
                message = json.loads(bytes(buffer[:cut]))
                del buffer[:cut + 1]
                if isinstance(message, dict) and message.get("id") == i:
                    if not isinstance(message.get("result"), dict):
                        raise ValueError("Usage request failed")
                    return message["result"]
            raise TimeoutError("Usage request timed out")

        try:
            request(1, "initialize", {"clientInfo": {"name": "marketing-usage", "title": "Marketing usage",
                                                      "version": "1.0"}})
            send({"method": "initialized"})
            account = request(2, "account/read", {"refreshToken": False}).get("account")
            if not isinstance(account, dict) or account.get("type") != "chatgpt":
                raise ValueError("ChatGPT subscription unavailable")
            return request(3, "account/rateLimits/read", {"excludeResetCreditDetails": True,
                                                          "supportsLunaReserve": False})
        finally:
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=1)
            except subprocess.TimeoutExpired:
                pass
            # A native helper may outlive its parent or ignore SIGTERM.
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGKILL)


def normalize(response, at):
    buckets = response.get("rateLimitsByLimitId") or {}
    if not isinstance(buckets, dict):
        raise ValueError("Invalid usage buckets")
    snapshot = buckets.get("codex") if buckets else response.get("rateLimits")
    valid = isinstance(snapshot, dict) and snapshot.get("limitId") in (None, "codex")
    snapshot = snapshot if valid else {}
    allowed = response.get("ordinaryUsageAllowed")
    blocked = allowed is False or bool(snapshot.get("rateLimitReachedType") or snapshot.get("spendControlReached"))
    windows = []
    for name in ("primary", "secondary"):
        item = snapshot.get(name)
        if item is None:
            continue
        if isinstance(item, dict):
            used, minutes, reset = (item.get(k) for k in ("usedPercent", "windowDurationMins", "resetsAt"))
            if type(used) is int and 0 <= used <= 100 and type(minutes) is int and minutes > 0 and type(reset) is int:
                windows.append({"remaining_percent": 100 - used, "window_minutes": minutes, "reset_at": reset})
                continue
        valid = False
    control = snapshot.get("individualLimit")
    individual = None
    if control is not None:
        if isinstance(control, dict):
            remaining, reset = control.get("remainingPercent"), control.get("resetsAt")
            if type(remaining) is int and 0 <= remaining <= 100 and type(reset) is int:
                individual = {"remaining_percent": remaining, "reset_at": reset}
        if individual is None:
            valid = False
    return {"read_at": at, "valid": valid and type(allowed) is bool, "blocked": blocked,
            "windows": windows, "individual": individual}


def bounds(sample):
    return sample["windows"] + ([sample["individual"]] if sample["individual"] is not None else [])


def max_age(sample):
    return 120 if any(w["remaining_percent"] <= 5 for w in bounds(sample)) else MAX_AGE


def exhausted(sample):
    return sample["blocked"] or any(w["remaining_percent"] == 0 and w["reset_at"] > sample["read_at"]
                                    for w in bounds(sample))


def report(sample, now, available):
    output = {"status": "unavailable", "read_at": sample.get("read_at") if sample else None, "level": 0,
              "interval_minutes": None, "included_exhausted": False, "required_burn_multiplier": None,
              "weekly": None, "short_window": None, "other_windows": []}
    if not sample:
        return output
    output["included_exhausted"] = exhausted(sample)
    if not available or now < sample["read_at"] or now - sample["read_at"] >= max_age(sample):
        output["status"] = "stale"
        return output
    windows = []
    for window in sample["windows"]:
        minutes = (window["reset_at"] - now) / 60
        fraction = min(1, max(0, minutes / window["window_minutes"]))
        windows.append(dict(window, time_left_minutes=round(max(0, minutes), 2),
                            time_left_percent=round(100 * fraction, 2)))
    weekly = [w for w in windows if w["window_minutes"] == WEEK]
    shorter = [w for w in windows if w["window_minutes"] < WEEK]
    # The canonical Codex bucket has up to two windows. Respect either order.
    if len(weekly) == 1:
        output["weekly"] = weekly[0]
    if shorter:
        output["short_window"] = min(shorter, key=lambda w: w["remaining_percent"])
    output["other_windows"] = [w for w in windows if w != output["weekly"] and w != output["short_window"]]
    if sample["individual"] is not None:
        output["individual_remaining_percent"] = sample["individual"]["remaining_percent"]
    if output["included_exhausted"]:
        output["status"] = "included-exhausted"
        return output
    if not sample["valid"] or len(weekly) != 1:
        return output
    if any(w["reset_at"] <= now for w in bounds(sample)):
        output["status"] = "awaiting-reset"
        return output
    week = weekly[0]
    fraction = min(1, (week["reset_at"] - now) / (60 * WEEK))
    left = week["remaining_percent"]
    burn = left / 100 / fraction
    surplus = left - 100 * fraction
    output.update(status="ok", required_burn_multiplier=round(burn, 3))
    # Taper the surplus margin as reset approaches. The last positive weekly
    # percentage can still fund moderate work when it is ahead of even pace.
    margin = min(5, max(0.25, 20 * fraction))
    high_margin = min(15, max(2, 50 * fraction))
    other_remaining = [w["remaining_percent"] for w in windows if w["window_minutes"] != WEEK]
    if sample["individual"] is not None:
        other_remaining.append(sample["individual"]["remaining_percent"])
    tightest_other = min(other_remaining, default=100)
    # A refill of the five-hour (or another simultaneous) allowance can
    # constrain the next run even with plenty of weekly capacity.
    other_deficit = max((w["time_left_percent"] - w["remaining_percent"]
                         for w in windows if w["window_minutes"] != WEEK), default=0)
    if tightest_other <= 10 or surplus < margin or burn < 1.2 or other_deficit > 20:
        return output
    high = left > 10 and tightest_other > 25 and surplus >= high_margin and burn >= 2 and other_deficit <= 10
    if high:
        output.update(level=2, interval_minutes=5 if burn >= 3 else 15)
    else:
        output.update(level=1, interval_minutes=60)
    return output


def load_cache(path):
    try:
        raw = json.loads(path.read_text())
        if raw.get("version") == 1:
            sample = raw.get("sample")
            if sample is not None:
                # A damaged or older cache can be reconstructed from the provider.
                report(sample, sample["read_at"], True)
            if type(raw["attempt_at"]) is not int:
                return {}
            return raw
    except (FileNotFoundError, ValueError, AttributeError, KeyError, TypeError, ZeroDivisionError):
        pass
    return {}


def save_cache(path, cache):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as tmp:
        try:
            json.dump(cache, tmp)
            tmp.close()
            os.replace(tmp.name, path)
        finally:
            Path(tmp.name).unlink(missing_ok=True)


def plan(codex, runtime, now):
    """Return redacted pacing data. Cache only window counts and timestamps."""
    if now.utcoffset() is None:
        raise ValueError("An aware instant is required")
    stamp = int(now.timestamp())
    runtime = Path(runtime)
    sample = None
    try:
        path = runtime / "pacing.json"
        with (runtime / "pacing.lock").open("a") as guard:
            try:
                fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                return report(load_cache(path).get("sample"), stamp, False)
            cache = load_cache(path)
            sample = cache.get("sample")
            if sample and cache.get("ok") and 0 <= stamp - sample["read_at"] < max_age(sample):
                if not any(sample["read_at"] < w["reset_at"] <= stamp for w in bounds(sample)):
                    return report(sample, stamp, True)
            last_try = cache.get("attempt_at", -MAX_AGE)
            crossed_reset = sample and any(last_try < w["reset_at"] <= stamp for w in bounds(sample))
            if not cache.get("ok") and 0 <= stamp - last_try < RETRY and not crossed_reset:
                return report(sample, stamp, cache.get("observed", False))
            try:
                updated = normalize(account_limits(codex), stamp)
                # A partial response cannot establish that a previously denied
                # subscription recovered. Wait for fresh usable included limits.
                if sample and exhausted(sample) and report(updated, stamp, True)["status"] != "ok":
                    updated["blocked"] = True
                sample = updated
                ok = sample["valid"] and any(w["window_minutes"] == WEEK for w in sample["windows"])
                ok = ok and all(w["reset_at"] > stamp for w in bounds(sample))
                observed = True
            except (OSError, ValueError, TypeError, KeyError, subprocess.SubprocessError):
                ok = False
                observed = False
            save_cache(path, {"version": 1, "ok": ok, "observed": observed, "attempt_at": stamp, "sample": sample})
            return report(sample, stamp, observed)
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        return report(None, stamp, False)
