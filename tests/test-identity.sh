#!/usr/bin/env bash
# Test: AGENTS.md is the only agent instructions file in this repository.
#
# Claude Code and Codex both read AGENTS.md (Claude Code reads it when no
# CLAUDE.md exists). AGENTS.md must exist, and no CLAUDE.md (any case) may
# exist alongside it.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

AGENTS_MD="$REPO_ROOT/AGENTS.md"

# AGENTS.md is required
if [ ! -f "$AGENTS_MD" ]; then
  echo "FAIL: AGENTS.md not found at $AGENTS_MD"
  exit 1
fi

# CLAUDE.md must not exist (match directory entries in any case)
claude_entries="$(ls -A "$REPO_ROOT" | grep -ix 'claude\.md' || true)"
if [ -n "$claude_entries" ]; then
  echo "FAIL: $claude_entries must not exist — AGENTS.md is the only agent instructions file"
  echo "  Fix: merge anything unique into AGENTS.md, then: git rm $claude_entries"
  exit 1
fi

echo "PASS: AGENTS.md is the only agent instructions file (no CLAUDE.md)"
exit 0
