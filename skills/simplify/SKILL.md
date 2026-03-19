---
name: simplify
description: >-
  Review changed code for reuse, quality, and efficiency, then fix any issues
  found. Use after completing a feature or fix to catch over-engineering,
  redundant code, missed abstractions, or unnecessary complexity before
  committing. Invoke with /simplify.
metadata:
  version: "1.0"
---

# Skill: Simplify

Review recently changed code with a critical eye toward simplicity, then fix what you find. This is a code quality pass — not a review that produces comments, but one that produces better code.

## When to Use

- After completing a feature or bug fix, before committing
- When code feels more complex than it should be
- When you suspect there's a simpler way but want a structured check
- As a final quality gate before marking a task complete

## Process

### 1. Identify What Changed

Use `git diff` (staged and unstaged) to find all modified and new files. Focus your review on these files only — don't boil the ocean.

### 2. Check for These Patterns

For each changed file, look for:

| Pattern | Fix |
|---------|-----|
| **Dead code** — unused variables, unreachable branches, commented-out code | Delete it |
| **Redundant abstractions** — wrapper functions that add no value, single-use helpers | Inline them |
| **Over-engineering** — generic solutions for specific problems, premature configurability | Simplify to the concrete case |
| **Copy-paste duplication** — same logic repeated across changed files | Extract if 3+ occurrences; leave 2 alone |
| **Unnecessary dependencies** — new imports/packages that could be avoided | Remove and use built-in alternatives |
| **Verbose patterns** — long-winded code that has a simpler idiomatic equivalent | Rewrite idiomatically |
| **Missing early returns** — deeply nested conditionals that could be flattened | Add guard clauses |
| **Inconsistent naming** — new names that don't match existing conventions | Rename to match |

### 3. Fix, Don't Report

For each issue found: **fix it directly**. Don't list findings and ask for permission — just make the code better. The user invoked this skill because they want cleaner code, not a report.

### 4. Summarize

After fixing, provide a brief summary:
- How many files were reviewed
- What was changed and why (one line per fix)
- If nothing needed fixing, say so — "Reviewed N files, no simplification needed"

## Gotchas

- **Don't change behavior.** Simplification must be behavior-preserving. If a simplification would change what the code does, skip it.
- **Don't touch files outside the diff.** This is a review of recent changes, not a codebase-wide refactor. Pre-existing issues are out of scope unless they're in a changed file.
- **Don't add abstractions.** The goal is to reduce complexity, not shift it. If your "simplification" introduces a new helper class, reconsider.
- **Respect test code differently.** Test code can be more verbose and repetitive than production code — that's often intentional for readability. Only simplify tests if the duplication is truly excessive (5+ identical blocks).
- **Three similar lines is fine.** Don't extract a function for something used twice. Wait until the pattern appears three or more times.
