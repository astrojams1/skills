#!/usr/bin/env bash
# Test: AGENTS.md is the required agent instructions file. CLAUDE.md is
# optional, but when present it must be byte-for-byte identical to AGENTS.md.
#
# Codex reads AGENTS.md, and Claude Code reads AGENTS.md when no CLAUDE.md
# exists. A kept CLAUDE.md must never drift from AGENTS.md.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CLAUDE_MD="$REPO_ROOT/CLAUDE.md"
AGENTS_MD="$REPO_ROOT/AGENTS.md"

# AGENTS.md is required
if [ ! -f "$AGENTS_MD" ]; then
  echo "FAIL: AGENTS.md not found at $AGENTS_MD"
  exit 1
fi

# CLAUDE.md is optional
if [ ! -f "$CLAUDE_MD" ]; then
  echo "PASS: AGENTS.md present; CLAUDE.md absent (optional)"
  exit 0
fi

# Compare byte-for-byte
if cmp -s "$CLAUDE_MD" "$AGENTS_MD"; then
  echo "PASS: CLAUDE.md and AGENTS.md are byte-for-byte identical"
  exit 0
else
  echo "FAIL: CLAUDE.md and AGENTS.md differ"
  echo ""
  echo "Diff:"
  diff "$CLAUDE_MD" "$AGENTS_MD" || true
  exit 1
fi
