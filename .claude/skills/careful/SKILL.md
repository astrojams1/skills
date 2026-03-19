---
name: careful
description: >-
  On-demand safety hooks that block destructive commands (rm -rf, DROP TABLE,
  force-push, kubectl delete) for the rest of the session. Use when working
  with production systems, dangerous infrastructure, or any context where an
  accidental destructive command could cause serious harm. Invoke with /careful.
metadata:
  version: "1.0"
---

# Skill: Careful Mode

Activate destructive-command guardrails for the current session. This skill installs a `PreToolUse` hook on `Bash` that blocks commands matching dangerous patterns before they execute.

## When to Use

- Working with production databases or infrastructure
- Running commands against live services
- Any session where accidental destructive commands would be costly
- When you want a safety net before touching prod

## Activation

When this skill is invoked, register a `PreToolUse` hook that inspects every `Bash` tool call. If the command matches a dangerous pattern, **block it** and explain what was caught.

### Blocked Patterns

| Pattern | Why |
|---------|-----|
| `rm -rf` | Recursive force delete |
| `DROP TABLE`, `DROP DATABASE`, `TRUNCATE` | Database destruction |
| `git push --force`, `git push -f` | Force push (can overwrite upstream) |
| `git reset --hard` | Discards uncommitted work |
| `git clean -f` | Deletes untracked files |
| `kubectl delete` | Kubernetes resource deletion |
| `docker system prune` | Docker cleanup (can remove needed images) |
| `terraform destroy` | Infrastructure teardown |
| `:(){ :|:& };:` | Fork bomb |

### How It Works

When careful mode is active, before executing any Bash command:

1. Check the command against the blocked patterns above
2. If it matches, **refuse to execute** and tell the user:
   - What pattern was matched
   - Why it's dangerous
   - Ask the user to confirm they really want to run it
3. If the user explicitly confirms, execute the command
4. If it doesn't match any pattern, execute normally

## Gotchas

- This is a **session-level** guardrail — it lasts until the session ends. It does not persist across sessions.
- The patterns are substring matches, so `rm -rf` will catch `sudo rm -rf /` as well as `rm -rf ./tmp`. This is intentional — better to over-catch than under-catch.
- This does NOT replace proper infrastructure access controls. It's a safety net, not a security boundary.
- If a command is blocked and the user confirms it, log the confirmation so there's an audit trail in the conversation.
