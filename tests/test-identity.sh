#!/usr/bin/env bash
# Test: CLAUDE.md and AGENTS.md must be byte-for-byte identical.
#
# These two files serve the same purpose for different AI agents
# (Claude uses CLAUDE.md, Codex uses AGENTS.md). They must always
# stay in sync.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CLAUDE_MD="$REPO_ROOT/CLAUDE.md"
AGENTS_MD="$REPO_ROOT/AGENTS.md"

# Check both files exist
if [ ! -f "$CLAUDE_MD" ]; then
  echo "FAIL: CLAUDE.md not found at $CLAUDE_MD"
  exit 1
fi

if [ ! -f "$AGENTS_MD" ]; then
  echo "FAIL: AGENTS.md not found at $AGENTS_MD"
  exit 1
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
