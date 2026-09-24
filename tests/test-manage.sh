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

# File existence alone cannot distinguish case aliases on macOS.
has_exact_file() {
    python3 - "$1" "$2" <<'PY'
from pathlib import Path
import sys
sys.exit(0 if any(p.name == sys.argv[2] and p.is_file()
                 for p in Path(sys.argv[1]).iterdir()) else 1)
PY
}

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
for cmd in install uninstall reinstall check sync status; do
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
echo "Testing standalone skills repo link..."

standalone_link_output="$(cd "$REPO_ROOT" && bash "$MANAGE" link 2>&1)" || true
if echo "$standalone_link_output" | grep -qi "standalone"; then
    pass "link detects standalone skills repo"
else
    fail "link should detect standalone skills repo context"
fi

echo ""
echo "Testing install/link self-healing behavior..."

TMP_INSTALL="$(mktemp -d)"
git -C "$TMP_INSTALL" init --quiet

git -C "$TMP_INSTALL" config user.email "test@example.com"
git -C "$TMP_INSTALL" config user.name "Test User"

GIT_ALLOW_PROTOCOL=file SKILLS_REMOTE="$REPO_ROOT" bash "$MANAGE" install "$TMP_INSTALL" >/dev/null

# Commit staged files so check commands have a valid HEAD (required for check #2.5)
git -C "$TMP_INSTALL" -c commit.gpgsign=false commit -q -m "chore: add skills submodule" 2>/dev/null || true

# Claude Code discovery: .claude/skills/<name>/SKILL.md (directory, not flat file)
if [ -d "$TMP_INSTALL/.claude/skills/design-system" ] && [ -f "$TMP_INSTALL/.claude/skills/design-system/SKILL.md" ]; then
    pass "install creates .claude/skills/<name>/SKILL.md directory"
else
    fail "install did not create .claude/skills/design-system/SKILL.md directory"
fi

# Codex discovery: .agents/skills/<name>/SKILL.md (directory)
if [ -d "$TMP_INSTALL/.agents/skills/design-system" ] && [ -f "$TMP_INSTALL/.agents/skills/design-system/SKILL.md" ]; then
    pass "install creates .agents/skills/<name>/SKILL.md directory"
else
    fail "install did not create .agents/skills/design-system/SKILL.md directory"
fi

# Verify no flat .md files remain (old format)
if ls "$TMP_INSTALL/.claude/skills"/*.md 2>/dev/null | grep -qv '/SKILL\.md$'; then
    fail "flat .md files found in .claude/skills/ (old format not cleaned up)"
else
    pass "no flat .md files in .claude/skills/ (clean directory structure)"
fi

# Verify the copied SKILL.md matches the source
if cmp -s "$TMP_INSTALL/skills/skills/design-system/SKILL.md" "$TMP_INSTALL/.claude/skills/design-system/SKILL.md"; then
    pass "claude skill directory SKILL.md matches source"
else
    fail "claude skill directory SKILL.md does not match source"
fi

if cmp -s "$TMP_INSTALL/skills/skills/design-system/SKILL.md" "$TMP_INSTALL/.agents/skills/design-system/SKILL.md"; then
    pass "codex skill directory SKILL.md matches source"
else
    fail "codex skill directory SKILL.md does not match source"
fi

# Verify references/ are preserved in copies (design-system has references/)
if [ -d "$TMP_INSTALL/.claude/skills/design-system/references" ]; then
    pass "claude skill directory preserves references/ subdirectory"
else
    fail "claude skill directory missing references/ subdirectory"
fi

if [ -f "$TMP_INSTALL/.claude/skills/design-system/references/components.md" ]; then
    pass "claude skill directory includes references/components.md"
else
    fail "claude skill directory missing references/components.md"
fi

if [ -d "$TMP_INSTALL/.agents/skills/design-system/references" ]; then
    pass "codex skill directory preserves references/ subdirectory"
else
    fail "codex skill directory missing references/ subdirectory"
fi

# Verify skill directories are real directories, not symlinks
if [ ! -L "$TMP_INSTALL/.claude/skills/design-system" ]; then
    pass "claude skill directory is a real directory (not symlink)"
else
    fail "claude skill directory should be a real directory"
fi

if [ ! -L "$TMP_INSTALL/.agents/skills/design-system" ]; then
    pass "codex skill directory is a real directory (not symlink)"
else
    fail "codex skill directory should be a real directory"
fi

hook_cmd='ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C "$ROOT" submodule update --init --recursive && { git -C "$ROOT/skills" fetch origin main --quiet 2>/dev/null && git -C "$ROOT" submodule update --remote --merge skills 2>/dev/null || true; } && "$ROOT"/skills/bin/manage.sh link'
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

# link should heal if skill directory is missing
# Note: uses working-tree manage.sh ($MANAGE) because the submodule contains
# the previously-committed version which may not match the code under test.
rm -rf "$TMP_INSTALL/.claude/skills/design-system"
(cd "$TMP_INSTALL" && bash "$MANAGE" link >/dev/null)
if [ -f "$TMP_INSTALL/.claude/skills/design-system/SKILL.md" ]; then
    pass "link recreates missing skill directory"
else
    fail "link failed to recreate missing skill directory"
fi

# link should also heal .agents/skills/
rm -rf "$TMP_INSTALL/.agents/skills/design-system"
(cd "$TMP_INSTALL" && bash "$MANAGE" link >/dev/null)
if [ -f "$TMP_INSTALL/.agents/skills/design-system/SKILL.md" ]; then
    pass "link recreates missing codex skill directory"
else
    fail "link failed to recreate missing codex skill directory"
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

second_check_output="$(cd "$TMP_INSTALL" && bash "$MANAGE" check 2>&1)" || true
if echo "$second_check_output" | grep -Eq "WARN: SessionStart hook|FIXED: SessionStart hook"; then
    fail "check should not repeatedly warn and auto-fix SessionStart hook"
else
    pass "check does not re-apply SessionStart hook fix on subsequent runs"
fi

# AGENTS.md is the only required instructions file: an AGENTS.md-only
# project with a clean submodule must pass every check with no warnings.
echo "Uses the skills submodule" > "$TMP_INSTALL/AGENTS.md"
agents_only_output="$(cd "$TMP_INSTALL" && bash "$MANAGE" check 2>&1)" && agents_only_status=0 || agents_only_status=$?
if [ "$agents_only_status" -eq 0 ] \
    && echo "$agents_only_output" | grep -q "PASS: AGENTS.md present" \
    && echo "$agents_only_output" | grep -q "ALL CHECKS PASSED"; then
    pass "check passes cleanly for an AGENTS.md-only project"
else
    fail "check did not pass cleanly for an AGENTS.md-only project"
    echo "$agents_only_output" | grep -E "FAIL|WARN" | sed 's/^/    /'
fi
rm -f "$TMP_INSTALL/AGENTS.md"

echo ""
echo "Testing flat .md file cleanup in .agents/skills/..."

# Create stale flat .md files in both discovery dirs
echo "stale" > "$TMP_INSTALL/.claude/skills/design-system.md"
echo "stale" > "$TMP_INSTALL/.agents/skills/design-system.md"

# link should clean them up
(cd "$TMP_INSTALL" && bash "$MANAGE" link >/dev/null 2>&1)

if [ ! -f "$TMP_INSTALL/.claude/skills/design-system.md" ]; then
    pass "link removes flat .md files from .claude/skills/"
else
    fail "link did not remove flat .md file from .claude/skills/"
fi

if [ ! -f "$TMP_INSTALL/.agents/skills/design-system.md" ]; then
    pass "link removes flat .md files from .agents/skills/"
else
    fail "link did not remove flat .md file from .agents/skills/"
fi

echo ""
echo "Testing lowercase agent file cleanup..."

# Exercise the consumer's own entry point with the local implementation. Do
# this after the clean-submodule checks: this intentional edit fails integrity.
cp "$MANAGE" "$TMP_INSTALL/skills/bin/manage.sh"

# An uppercase-only file must never be deleted through a lowercase path alias.
rm -f "$TMP_INSTALL/claude.md" "$TMP_INSTALL/agents.md" "$TMP_INSTALL/CLAUDE.md" "$TMP_INSTALL/AGENTS.md"
echo "REAL UPPERCASE" > "$TMP_INSTALL/CLAUDE.md"
echo "REAL UPPERCASE" > "$TMP_INSTALL/AGENTS.md"

(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check >/dev/null 2>&1) || true

for name in CLAUDE.md AGENTS.md; do
    if has_exact_file "$TMP_INSTALL" "$name" && [ "$(cat "$TMP_INSTALL/$name")" = "REAL UPPERCASE" ]; then
        pass "check preserves uppercase-only $name and its content"
    else
        fail "check damaged or removed uppercase-only $name"
    fi
done

# Distinct case variants can coexist only on case-sensitive filesystems.
echo "probe" > "$TMP_INSTALL/CASE_PROBE"
if [ ! -f "$TMP_INSTALL/case_probe" ]; then
    echo "stale lowercase" > "$TMP_INSTALL/claude.md"
    echo "stale lowercase" > "$TMP_INSTALL/agents.md"
    (cd "$TMP_INSTALL" && bash skills/bin/manage.sh check >/dev/null 2>&1) || true
    for pair in "claude.md:CLAUDE.md" "agents.md:AGENTS.md"; do
        lower="${pair%%:*}"
        upper="${pair##*:}"
        if ! has_exact_file "$TMP_INSTALL" "$lower" && has_exact_file "$TMP_INSTALL" "$upper" && [ "$(cat "$TMP_INSTALL/$upper")" = "REAL UPPERCASE" ]; then
            pass "check removes distinct $lower and preserves $upper"
        else
            fail "check failed distinct-case cleanup for $upper"
        fi
    done
else
    echo "  SKIP: distinct case variants cannot coexist on this filesystem"
fi
rm -f "$TMP_INSTALL/CASE_PROBE"

echo ""
echo "Testing lowercase rename (only lowercase exists)..."

rm -f "$TMP_INSTALL/CLAUDE.md" "$TMP_INSTALL/AGENTS.md"
echo "should become uppercase" > "$TMP_INSTALL/claude.md"
echo "should become uppercase" > "$TMP_INSTALL/agents.md"

(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check >/dev/null 2>&1) || true

for pair in "claude.md:CLAUDE.md" "agents.md:AGENTS.md"; do
    lower="${pair%%:*}"
    upper="${pair##*:}"
    if has_exact_file "$TMP_INSTALL" "$upper" && ! has_exact_file "$TMP_INSTALL" "$lower" && [ "$(cat "$TMP_INSTALL/$upper")" = "should become uppercase" ]; then
        pass "check renames $lower → $upper and preserves content"
    else
        fail "check did not safely rename $lower to $upper"
    fi
done

# A second check must leave the normalized files intact, not delete their aliases.
(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check >/dev/null 2>&1) || true
if has_exact_file "$TMP_INSTALL" "CLAUDE.md" && has_exact_file "$TMP_INSTALL" "AGENTS.md" && [ "$(cat "$TMP_INSTALL/CLAUDE.md")" = "should become uppercase" ] && [ "$(cat "$TMP_INSTALL/AGENTS.md")" = "should become uppercase" ]; then
    pass "lowercase normalization is idempotent and preserves both files"
else
    fail "second check damaged normalized agent files"
fi

# Clean up test files
rm -f "$TMP_INSTALL/CLAUDE.md" "$TMP_INSTALL/AGENTS.md" "$TMP_INSTALL/claude.md" "$TMP_INSTALL/agents.md"

echo ""
echo "Testing CLAUDE.md ↔ AGENTS.md alignment check..."

# Create identical files — check should pass
echo "identical content" > "$TMP_INSTALL/CLAUDE.md"
echo "identical content" > "$TMP_INSTALL/AGENTS.md"

check_output="$(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check 2>&1)" || true
if echo "$check_output" | grep -q "byte-for-byte identical"; then
    pass "check passes when CLAUDE.md and AGENTS.md are identical"
else
    fail "check did not report identical CLAUDE.md and AGENTS.md"
fi

# Create diverged files — check should report failure
echo "claude content" > "$TMP_INSTALL/CLAUDE.md"
echo "agents content" > "$TMP_INSTALL/AGENTS.md"

check_output="$(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check 2>&1)" || true
if echo "$check_output" | grep -q "FAIL: CLAUDE.md and AGENTS.md have diverged" && echo "$check_output" | grep -q "CHECK FAILED"; then
    pass "check fails on diverged CLAUDE.md and AGENTS.md"
else
    fail "check did not fail on diverged CLAUDE.md and AGENTS.md"
fi

# Only CLAUDE.md exists — AGENTS.md is required, so check must fail
rm -f "$TMP_INSTALL/AGENTS.md"

check_output="$(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check 2>&1)" || true
if echo "$check_output" | grep -q "FAIL: CLAUDE.md exists but AGENTS.md is missing" && echo "$check_output" | grep -q "CHECK FAILED"; then
    pass "check fails when CLAUDE.md exists without AGENTS.md"
else
    fail "check did not fail when AGENTS.md is missing"
fi

# Only AGENTS.md exists — CLAUDE.md is optional, so check must pass cleanly
rm -f "$TMP_INSTALL/CLAUDE.md"
echo "agents only" > "$TMP_INSTALL/AGENTS.md"

check_output="$(cd "$TMP_INSTALL" && bash skills/bin/manage.sh check 2>&1)" || true
# (The submodule's manage.sh is intentionally modified here, so only assert
#  that no agent-instruction FAIL/WARN is reported; the clean-submodule
#  AGENTS.md-only run above asserts the overall check passes.)
if echo "$check_output" | grep -q "PASS: AGENTS.md present" \
    && ! echo "$check_output" | grep -Eq "(FAIL|WARN):.*(CLAUDE|AGENTS)\.md"; then
    pass "check reports AGENTS.md-only as PASS (CLAUDE.md optional)"
else
    fail "check did not report AGENTS.md-only as PASS"
    echo "$check_output" | grep -E "FAIL|WARN" | sed 's/^/    /'
fi

# Clean up
rm -f "$TMP_INSTALL/CLAUDE.md" "$TMP_INSTALL/AGENTS.md"

echo ""
echo "Testing quick-check.sh agent instruction checks..."

QUICK_CHECK="$REPO_ROOT/skills/skill-orchestrator/scripts/quick-check.sh"

# AGENTS.md only (mentions skills) — must pass
echo "Uses the skills submodule" > "$TMP_INSTALL/AGENTS.md"
if qc_output="$(bash "$QUICK_CHECK" "$TMP_INSTALL" 2>&1)"; then
    pass "quick-check passes with AGENTS.md only"
else
    fail "quick-check failed with AGENTS.md only: $(echo "$qc_output" | grep FAIL | tr '\n' ' ')"
fi

# Identical CLAUDE.md and AGENTS.md — must pass
cp "$TMP_INSTALL/AGENTS.md" "$TMP_INSTALL/CLAUDE.md"
if bash "$QUICK_CHECK" "$TMP_INSTALL" >/dev/null 2>&1; then
    pass "quick-check passes with identical CLAUDE.md and AGENTS.md"
else
    fail "quick-check failed with identical CLAUDE.md and AGENTS.md"
fi

# Diverged CLAUDE.md — must fail
echo "Different skills content" > "$TMP_INSTALL/CLAUDE.md"
qc_output="$(bash "$QUICK_CHECK" "$TMP_INSTALL" 2>&1)" && qc_status=0 || qc_status=$?
if [ "$qc_status" -ne 0 ] && echo "$qc_output" | grep -q "FAIL: CLAUDE.md matches AGENTS.md"; then
    pass "quick-check fails on diverged CLAUDE.md"
else
    fail "quick-check did not fail on diverged CLAUDE.md"
fi

# CLAUDE.md only — must fail (AGENTS.md required)
rm -f "$TMP_INSTALL/AGENTS.md"
qc_output="$(bash "$QUICK_CHECK" "$TMP_INSTALL" 2>&1)" && qc_status=0 || qc_status=$?
if [ "$qc_status" -ne 0 ] && echo "$qc_output" | grep -q "FAIL: AGENTS.md exists"; then
    pass "quick-check fails when AGENTS.md is missing"
else
    fail "quick-check did not fail when AGENTS.md is missing"
fi

rm -f "$TMP_INSTALL/CLAUDE.md" "$TMP_INSTALL/AGENTS.md"

echo ""
echo "Testing uninstall command..."

# uninstall should remove the submodule and all artifacts
(cd "$TMP_INSTALL" && bash "$MANAGE" uninstall >/dev/null 2>&1) || true

if [ ! -d "$TMP_INSTALL/skills" ]; then
    pass "uninstall removes skills/ directory"
else
    fail "uninstall did not remove skills/ directory"
fi

if [ ! -d "$TMP_INSTALL/.claude/skills" ]; then
    pass "uninstall removes .claude/skills/ directory"
else
    fail "uninstall did not remove .claude/skills/ directory"
fi

if [ ! -d "$TMP_INSTALL/.agents/skills" ]; then
    pass "uninstall removes .agents/skills/ directory"
else
    fail "uninstall did not remove .agents/skills/ directory"
fi

if [ ! -d "$TMP_INSTALL/.git/modules/skills" ]; then
    pass "uninstall removes .git/modules/skills cache"
else
    fail "uninstall did not remove .git/modules/skills cache"
fi

# Check that the hook was removed from settings.json
if [ -f "$TMP_INSTALL/.claude/settings.json" ]; then
    if python3 -c "
import json, sys
from pathlib import Path
settings = Path('$TMP_INSTALL/.claude/settings.json')
data = json.loads(settings.read_text())
hooks = data.get('hooks', {}).get('SessionStart', [])
for group in hooks:
    for hook in group.get('hooks', []):
        if 'skills' in hook.get('command', ''):
            sys.exit(1)
sys.exit(0)
" 2>/dev/null; then
        pass "uninstall removes SessionStart hook from settings.json"
    else
        fail "uninstall left skills hook in settings.json"
    fi
else
    pass "uninstall cleaned up settings.json (file removed since empty)"
fi

# uninstall should be idempotent (no error on second run)
if (cd "$TMP_INSTALL" && bash "$MANAGE" uninstall >/dev/null 2>&1); then
    pass "uninstall is idempotent (no error on already-uninstalled repo)"
else
    fail "uninstall should not error on an already-uninstalled repo"
fi

echo ""
echo "Testing reinstall command..."

# reinstall on the now-empty repo should add everything back
GIT_ALLOW_PROTOCOL=file SKILLS_REMOTE="$REPO_ROOT" bash "$MANAGE" reinstall "$TMP_INSTALL" >/dev/null 2>&1

if [ -d "$TMP_INSTALL/.claude/skills/design-system" ] && [ -f "$TMP_INSTALL/.claude/skills/design-system/SKILL.md" ]; then
    pass "reinstall recreates .claude skill directories"
else
    fail "reinstall did not recreate .claude skill directories"
fi

if [ -d "$TMP_INSTALL/.agents/skills/design-system" ] && [ -f "$TMP_INSTALL/.agents/skills/design-system/SKILL.md" ]; then
    pass "reinstall recreates .agents skill directories"
else
    fail "reinstall did not recreate .agents skill directories"
fi

if [ -f "$TMP_INSTALL/skills/bin/manage.sh" ]; then
    pass "reinstall re-adds the skills submodule"
else
    fail "reinstall did not re-add the skills submodule"
fi

if python3 -c "
import json, sys
from pathlib import Path
settings = Path('$TMP_INSTALL/.claude/settings.json')
data = json.loads(settings.read_text())
hooks = data.get('hooks', {}).get('SessionStart', [])
for group in hooks:
    for hook in group.get('hooks', []):
        if 'skills/bin/manage.sh' in hook.get('command', ''):
            sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
    pass "reinstall re-adds SessionStart hook"
else
    fail "reinstall did not re-add SessionStart hook"
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
