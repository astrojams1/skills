---
name: simplify
description: >-
  Review changed code for reuse, quality, and efficiency, then fix any issues
  found. Use when the user says /simplify, asks to clean up code, wants a
  quality review, or after completing a feature or fix to catch
  over-engineering, redundant code, missed abstractions, or unnecessary
  complexity before committing.
metadata:
  version: "1.1.0"
---

# Simplify

**Make the code you just changed simpler, then fix what you find.** This pass produces better code, not a list of
comments.

Use it after a feature or bug fix and before you commit. Use it when code feels too complex or you suspect a simpler
way. Use it as a last quality gate before you call a task done.

Done means: every changed file was checked against the patterns below, each issue is fixed, and the user has a short
summary.

## A run

1. **Find what changed.** Run `git diff`, staged and unstaged, to list every modified and new file. Review only these.
2. **Check each file** for the patterns below.
3. **Fix, don't report.** Fix each issue directly. Don't list findings or ask for permission. The user asked for
   cleaner code, not a report.
4. **Summarize.** Say how many files you reviewed. Give one line per fix: what changed and why. If nothing needed
   fixing, say "Reviewed N files, no simplification needed".

| Pattern | Fix |
|---------|-----|
| **Dead code**: unused variables, unreachable branches, commented-out code | Delete it |
| **Redundant abstractions**: wrapper functions that add no value, single-use helpers | Inline them |
| **Over-engineering**: generic solutions for specific problems, premature configurability | Simplify to the concrete case |
| **Copy-paste duplication**: same logic repeated across changed files | Extract if 3+ occurrences; leave 2 alone |
| **Unnecessary dependencies**: new imports or packages that could be avoided | Remove and use built-in alternatives |
| **Verbose patterns**: long-winded code with a simpler idiomatic equivalent | Rewrite idiomatically |
| **Missing early returns**: deeply nested conditionals that could be flattened | Add guard clauses |
| **Inconsistent naming**: new names that don't match existing conventions | Rename to match |

## Rules

- **Don't change behavior.** Every simplification must keep what the code does. Skip any that would change it.
- **Stay inside the diff.** This reviews recent changes, not the whole codebase. Old issues are out of scope unless
  they sit in a changed file.
- **Don't add abstractions.** The goal is less complexity, not moved complexity. If a "simplification" adds a new
  helper class, think again.

## Gotchas

- **Test code may repeat itself.** Tests are often verbose on purpose, for readability. Simplify them only when the
  duplication is truly excessive (5+ identical blocks).
- **Three similar lines is fine.** Don't extract a function for something used twice. Wait until the pattern appears
  three or more times.
