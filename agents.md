# Skills Repository

This repository contains reusable AI agent skills that can be applied across projects.

## Repository Structure

```
skills/           # Skill definitions (markdown files)
tests/            # Tests for repository integrity
claude.md         # AI agent instructions (Claude)
agents.md         # AI agent instructions (Codex) — must be identical to claude.md
```

## Available Skills

### Design System — Architectural Minimalist

**File:** `skills/design-system.md`

A comprehensive design system skill that applies the "Architectural Minimalist" aesthetic to any web project. It features:

- Warm organic color palette (sage, terracotta, stone)
- Sharp architectural geometry (rounded-none everywhere)
- DM Sans + Tenor Sans typography pairing
- Full light/dark mode support
- Tailwind CSS configuration and component patterns

**Reference implementation:** https://pinch-pleat-simulator-731832823064.us-west1.run.app/

#### How to use this skill in another project

Include the contents of `skills/design-system.md` in the target project's `claude.md` or `agents.md`, or reference it when prompting an AI coding agent to style a project.

## Rules

1. **claude.md and agents.md must always be byte-for-byte identical.** Both files serve the same purpose for different AI agents (Claude and Codex). Any edit to one must be applied to the other. Run `tests/test-identity.sh` to verify.
2. **Skills are self-contained.** Each skill file in `skills/` must contain all instructions needed to apply that skill to a project, with no external dependencies on other skill files.
3. **Keep skills actionable.** Write skills as step-by-step instructions an AI agent can follow, not as abstract documentation.
