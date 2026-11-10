---
name: careful
description: >-
  On-demand safety hooks that block destructive commands (rm -rf, DROP TABLE,
  force-push, kubectl delete) for the rest of the session. Use when working
  with production systems, dangerous infrastructure, or any context where an
  accidental destructive command could cause serious harm. Invoke with /careful.
metadata:
  version: "1.1.0"
---

# Careful

**Block destructive commands for the rest of this session.** One slip against a live system can't be undone.

Use it for production databases or infrastructure, commands against live services, or any session where a mistake
would be costly.

Done means: a `PreToolUse` hook on `Bash` checks every command, and each match waits for the user's yes.

## Blocked patterns

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

## A run

1. **Install the hook.** When invoked, register a `PreToolUse` hook that inspects every `Bash` tool call.
2. **Check each command.** Compare it with the blocked patterns above.
3. **Block a match.** Don't run it. Tell the user which pattern matched and why it is dangerous. Ask them to confirm.
4. **Run on a clear yes.** If the user explicitly confirms, run the command. Log the confirmation, so the conversation
   keeps an audit trail.
5. **Pass the rest.** Run a command that matches no pattern as normal.

## Gotchas

- **It lasts one session.** The guard ends with the session and does not carry over.
- **Patterns match substrings.** `rm -rf` catches `sudo rm -rf /` and `rm -rf ./tmp` alike. That is on purpose:
  catching too much beats catching too little.
- **It is a safety net, not a security boundary.** It does not replace real access controls.
