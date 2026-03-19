---
name: freeze
description: >-
  On-demand file protection that blocks Edit and Write operations outside a
  specified directory for the rest of the session. Use when debugging a
  production issue and you want to ensure no accidental edits are made to files
  outside the area you're investigating. Invoke with /freeze.
metadata:
  version: "1.0"
---

# Skill: Freeze Mode

Lock down file modifications to a single directory for the current session. Prevents accidental edits to files outside the area you're actively working in.

## When to Use

- Debugging a production issue — you want to read broadly but only edit in one place
- Working in a monorepo where touching the wrong package could break others
- Investigating a bug where you want to guarantee you don't introduce side effects
- Any time you want to restrict the blast radius of file changes

## Activation

When this skill is invoked, ask the user which directory should remain editable. Then enforce the constraint:

1. **Ask:** "Which directory should remain editable? Everything outside it will be frozen."
2. **Store** the allowed directory path (e.g., `src/components/auth/`)
3. **Before every Edit or Write:** check if the target file is inside the allowed directory
4. **If outside:** refuse the edit, explain what was blocked, and suggest alternatives
5. **If inside:** proceed normally

### Behavior

- **Read** is always allowed everywhere — freeze only affects writes
- **Glob** and **Grep** are always allowed — freeze only affects file modifications
- **New file creation** follows the same rule — only inside the allowed directory
- The allowed directory is matched as a prefix, so `src/auth/` allows `src/auth/login.ts` and `src/auth/utils/helpers.ts`

## Gotchas

- This is a **session-level** constraint. It does not persist across sessions.
- If you need to edit a frozen file, tell the user what you want to change and why. Let them decide whether to lift the freeze or make the edit themselves.
- Relative paths are resolved from the project root. Be precise when specifying the allowed directory.
- This does not prevent Bash commands from modifying files (e.g., `sed -i`). If you need full protection, combine with the `careful` skill.
