#!/usr/bin/env bash
# Test: claude.md and agents.md must be byte-for-byte identical.
#
# These two files serve the same purpose for different AI agents
# (Claude uses claude.md, Codex uses agents.md). They must always
# stay in sync.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

CLAUDE_MD="$REPO_ROOT/claude.md"
AGENTS_MD="$REPO_ROOT/agents.md"

# Check both files exist
if [ ! -f "$CLAUDE_MD" ]; then
  echo "FAIL: claude.md not found at $CLAUDE_MD"
  exit 1
fi

if [ ! -f "$AGENTS_MD" ]; then
  echo "FAIL: agents.md not found at $AGENTS_MD"
  exit 1
fi

# Compare byte-for-byte
if cmp -s "$CLAUDE_MD" "$AGENTS_MD"; then
  echo "PASS: claude.md and agents.md are byte-for-byte identical"
  exit 0
else
  echo "FAIL: claude.md and agents.md differ"
  echo ""
  echo "Diff:"
  diff "$CLAUDE_MD" "$AGENTS_MD" || true
  exit 1
fi
