---
name: freeze
description: >-
  On-demand file protection that blocks Edit and Write operations outside a
  specified directory for the rest of the session. Use when debugging a
  production issue and you want to ensure no accidental edits are made to files
  outside the area you're investigating. Invoke with /freeze.
metadata:
  version: "1.1.0"
---

# Freeze

**Allow edits in one directory only, for the rest of this session.** Read widely, but change only the area you are
working in.

Use it to debug a production issue, or in a monorepo where the wrong package could break others. Use it to chase a bug
without side effects, or any time you want to limit how far changes reach.

Done means: every Edit or Write outside the chosen directory is refused, and the user hears what was blocked.

## A run

1. **Ask.** "Which directory should remain editable? Everything outside it will be frozen."
2. **Store** the allowed path, for example `src/components/auth/`.
3. **Check every Edit and Write.** Is the target file inside the allowed directory?
4. **Refuse outside it.** Don't make the edit. Explain what was blocked and suggest other ways forward.
5. **Go ahead inside it.** Edit as normal.

## Rules

- **Only writes are frozen.** Read, Glob and Grep work everywhere.
- **New files follow the same rule.** Create them only inside the allowed directory.
- **The path matches as a prefix.** `src/auth/` allows `src/auth/login.ts` and `src/auth/utils/helpers.ts`.
- **Ask before you touch a frozen file.** Tell the user what you want to change and why. Let them lift the freeze or
  make the edit themselves.

## Gotchas

- **It lasts one session.** The freeze does not carry over.
- **Relative paths start at the project root.** Be precise when you name the allowed directory.
- **Bash can still write files.** Commands like `sed -i` get past the freeze. For full protection, also use the
  `careful` skill.
