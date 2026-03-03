#!/usr/bin/env bash
# Test: Validate bin/manage.sh works correctly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MANAGE="$REPO_ROOT/bin/manage.sh"

PASSED=0
FAILED=0
TMPDIR=""
TMP_INSTALL=""

pass() { PASSED=$((PASSED + 1)); echo "  PASS: $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL: $1"; }

cleanup() {
    for d in "$TMPDIR" "$TMP_INSTALL"; do
        if [ -n "$d" ] && [ -d "$d" ]; then
            rm -rf "$d"
        fi
    done
}
trap cleanup EXIT

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

echo ""
echo "Testing help command..."

help_output="$(bash "$MANAGE" help 2>&1)"
for cmd in install check sync status; do
    if echo "$help_output" | grep -q "$cmd"; then
        pass "help mentions $cmd command"
    else
        fail "help does not mention $cmd command"
    fi
done

echo ""
echo "Testing error handling..."

if ! bash "$MANAGE" nonsense >/dev/null 2>&1; then
    pass "unknown command exits non-zero"
else
    fail "unknown command should exit non-zero"
fi

echo ""
echo "Testing status on bare repo..."

TMPDIR="$(mktemp -d)"
git -C "$TMPDIR" init --quiet
status_output="$(cd "$TMPDIR" && bash "$MANAGE" status 2>&1)" || true
if echo "$status_output" | grep -qi "not installed"; then
    pass "status reports NOT INSTALLED when no submodule"
else
    fail "status should report NOT INSTALLED on repo without submodule"
fi

echo ""
echo "Testing standalone skills repo guidance..."

standalone_check_output="$(cd "$REPO_ROOT" && bash "$MANAGE" check 2>&1 || true)"
if echo "$standalone_check_output" | grep -qi "standalone skills repository"; then
    pass "check explains standalone-skills-repo usage"
else
    fail "check should explain how to run from a consumer repo"
fi

echo ""
echo "Testing install/link self-healing behavior..."

TMP_INSTALL="$(mktemp -d)"
git -C "$TMP_INSTALL" init --quiet

git -C "$TMP_INSTALL" config user.email "test@example.com"
git -C "$TMP_INSTALL" config user.name "Test User"

GIT_ALLOW_PROTOCOL=file SKILLS_REMOTE="$REPO_ROOT" bash "$MANAGE" install "$TMP_INSTALL" >/dev/null

if [ -f "$TMP_INSTALL/.claude/skills/design-system.md" ]; then
    pass "install creates .claude skill file"
else
    fail "install did not create .claude skill file"
fi

if [ ! -L "$TMP_INSTALL/.claude/skills/design-system.md" ]; then
    pass "skill discovery file is a real file (not symlink)"
else
    fail "skill discovery file should be a real file"
fi

if cmp -s "$TMP_INSTALL/skills/skills/design-system/SKILL.md" "$TMP_INSTALL/.claude/skills/design-system.md"; then
    pass "copied skill file matches source SKILL.md"
else
    fail "copied skill file does not match SKILL.md"
fi

hook_cmd='ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C "$ROOT" submodule update --init --recursive && "$ROOT"/skills/bin/manage.sh link'
if python3 - <<PY
import json
from pathlib import Path
settings = Path("$TMP_INSTALL/.claude/settings.json")
data = json.loads(settings.read_text())
hooks = data.get("hooks", {}).get("SessionStart", [])
for group in hooks:
    for hook in group.get("hooks", []):
        if hook.get("command") == '$hook_cmd':
            raise SystemExit(0)
raise SystemExit(1)
PY
then
    pass "SessionStart hook uses cwd-independent command"
else
    fail "SessionStart hook command missing or stale"
fi

# link should heal if file is missing
rm -f "$TMP_INSTALL/.claude/skills/design-system.md"
(cd "$TMP_INSTALL" && ./skills/bin/manage.sh link >/dev/null)
if [ -f "$TMP_INSTALL/.claude/skills/design-system.md" ]; then
    pass "link recreates missing skill file"
else
    fail "link failed to recreate missing skill file"
fi

echo ""
echo "Testing check command ROOT handling..."

check_output="$(cd "$TMP_INSTALL" && bash "$MANAGE" check 2>&1)" || true
if echo "$check_output" | grep -q "ROOT: unbound variable"; then
    fail "check should not fail with ROOT: unbound variable"
elif echo "$check_output" | grep -q "CHECK FAILED"; then
    fail "check unexpectedly failed"
else
    pass "check handles hook validation without ROOT unbound-variable errors"
fi

echo ""
echo "=================================================="
echo "Results: $PASSED passed, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
    echo "OVERALL: FAIL"
    exit 1
fi

echo "OVERALL: PASS"
exit 0
