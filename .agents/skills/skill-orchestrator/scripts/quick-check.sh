#!/usr/bin/env bash
# Quick health check for skills integration in a consumer repo.
# Returns 0 if everything looks good, non-zero with details on failures.
#
# Usage: ./skills/skills/skill-orchestrator/scripts/quick-check.sh [project-root]
#
# Checks:
#   1. Submodule exists and is initialized
#   2. .claude/skills/ and .agents/skills/ directories exist and are non-empty
#   3. .claude/settings.json has a SessionStart hook
#   4. CLAUDE.md and AGENTS.md exist and mention skills

set -euo pipefail

PROJECT_ROOT="${1:-.}"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0

check() {
    local desc="$1"
    shift
    if "$@" >/dev/null 2>&1; then
        echo "  PASS: $desc"
        ((PASS++))
    else
        echo "  FAIL: $desc"
        ((FAIL++))
    fi
}

echo "Skills Integration Quick Check"
echo "Project: $(pwd)"
echo ""

check "Submodule directory exists" test -d skills
check "Submodule is initialized (has SKILL files)" test -f skills/skills/workflow-orchestration/SKILL.md
check ".gitmodules references skills" grep -q skills .gitmodules
check ".claude/skills/ directory exists" test -d .claude/skills
check ".claude/skills/ is non-empty" test "$(ls -A .claude/skills/ 2>/dev/null | head -1)"
check ".agents/skills/ directory exists" test -d .agents/skills
check ".agents/skills/ is non-empty" test "$(ls -A .agents/skills/ 2>/dev/null | head -1)"
check ".claude/settings.json exists" test -f .claude/settings.json
check "SessionStart hook configured" grep -q SessionStart .claude/settings.json
check "CLAUDE.md exists" test -f CLAUDE.md
check "CLAUDE.md mentions skills" grep -qi skills CLAUDE.md
check "AGENTS.md exists" test -f AGENTS.md
check "AGENTS.md matches CLAUDE.md" diff -q CLAUDE.md AGENTS.md

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "Run './skills/bin/manage.sh check' to auto-fix most issues."
    exit 1
fi

echo "All checks passed."
exit 0
