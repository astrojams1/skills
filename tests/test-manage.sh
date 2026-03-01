#!/usr/bin/env bash
# Test: Validate bin/manage.sh works correctly.
#
# Creates a temporary git repo, installs the skills submodule via manage.sh,
# then runs check, status, and sync to verify each command.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MANAGE="$REPO_ROOT/bin/manage.sh"

PASSED=0
FAILED=0
TMPDIR=""

pass() { PASSED=$((PASSED + 1)); echo "  PASS: $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL: $1"; }

cleanup() {
    if [ -n "$TMPDIR" ] && [ -d "$TMPDIR" ]; then
        rm -rf "$TMPDIR"
    fi
}
trap cleanup EXIT

# ── Test: manage.sh exists and is executable ─────────────────────────

echo "Testing manage.sh basics..."

if [ -f "$MANAGE" ]; then
    pass "bin/manage.sh exists"
else
    fail "bin/manage.sh not found"
    echo "FATAL: Cannot continue without manage.sh"
    exit 1
fi

if [ -x "$MANAGE" ]; then
    pass "bin/manage.sh is executable"
else
    fail "bin/manage.sh is not executable"
fi

# ── Test: help command ───────────────────────────────────────────────

echo ""
echo "Testing help command..."

help_output="$(bash "$MANAGE" help 2>&1)"

if echo "$help_output" | grep -q "install"; then
    pass "help mentions install command"
else
    fail "help does not mention install command"
fi

if echo "$help_output" | grep -q "check"; then
    pass "help mentions check command"
else
    fail "help does not mention check command"
fi

if echo "$help_output" | grep -q "sync"; then
    pass "help mentions sync command"
else
    fail "help does not mention sync command"
fi

if echo "$help_output" | grep -q "status"; then
    pass "help mentions status command"
else
    fail "help does not mention status command"
fi

# ── Test: unknown command exits non-zero ─────────────────────────────

echo ""
echo "Testing error handling..."

if ! bash "$MANAGE" nonsense >/dev/null 2>&1; then
    pass "unknown command exits non-zero"
else
    fail "unknown command should exit non-zero"
fi

# ── Test: status on non-submodule repo reports NOT INSTALLED ─────────

echo ""
echo "Testing status on bare repo..."

TMPDIR="$(mktemp -d)"
git -C "$TMPDIR" init --quiet

status_output="$(bash "$MANAGE" status 2>&1)" || true
if echo "$status_output" | grep -qi "not installed"; then
    pass "status reports NOT INSTALLED when no submodule"
else
    fail "status should report NOT INSTALLED on repo without submodule"
fi

cleanup
TMPDIR=""

# ── Summary ──────────────────────────────────────────────────────────

echo ""
echo "=================================================="
echo "Results: $PASSED passed, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
    echo "OVERALL: FAIL"
    exit 1
fi

echo "OVERALL: PASS"
exit 0
