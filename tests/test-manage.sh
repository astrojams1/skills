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

# Create stale lowercase files alongside uppercase ones
echo "stale lowercase" > "$TMP_INSTALL/claude.md"
echo "stale lowercase" > "$TMP_INSTALL/agents.md"
echo "REAL UPPERCASE" > "$TMP_INSTALL/CLAUDE.md"
echo "REAL UPPERCASE" > "$TMP_INSTALL/AGENTS.md"

# check should clean them up (tolerate check exit code since submodule may be behind)
(cd "$TMP_INSTALL" && bash "$MANAGE" check >/dev/null 2>&1) || true

if [ ! -f "$TMP_INSTALL/claude.md" ]; then
    pass "check removes stale lowercase claude.md when CLAUDE.md exists"
else
    fail "check did not remove stale lowercase claude.md"
fi

if [ ! -f "$TMP_INSTALL/agents.md" ]; then
    pass "check removes stale lowercase agents.md when AGENTS.md exists"
else
    fail "check did not remove stale lowercase agents.md"
fi

# Verify uppercase files are untouched
if [ -f "$TMP_INSTALL/CLAUDE.md" ] && [ "$(cat "$TMP_INSTALL/CLAUDE.md")" = "REAL UPPERCASE" ]; then
    pass "check preserves CLAUDE.md content"
else
    fail "check damaged or removed CLAUDE.md"
fi

echo ""
echo "Testing lowercase rename (only lowercase exists)..."

rm -f "$TMP_INSTALL/CLAUDE.md"
echo "should become uppercase" > "$TMP_INSTALL/claude.md"

(cd "$TMP_INSTALL" && bash "$MANAGE" check >/dev/null 2>&1) || true

if [ -f "$TMP_INSTALL/CLAUDE.md" ] && [ ! -f "$TMP_INSTALL/claude.md" ]; then
    pass "check renames claude.md → CLAUDE.md when no uppercase exists"
else
    fail "check did not rename claude.md to CLAUDE.md"
fi

# Clean up test files
rm -f "$TMP_INSTALL/CLAUDE.md" "$TMP_INSTALL/AGENTS.md" "$TMP_INSTALL/claude.md" "$TMP_INSTALL/agents.md"

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
