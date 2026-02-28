# Skills Repository

This repository contains reusable AI agent skills that can be applied across projects.

## Repository Structure

```
skills/                       # Skill definitions (Agent Skills spec directories)
  design-system/SKILL.md      # Architectural Minimalist design system
tests/                        # Tests for repository integrity
claude.md                     # AI agent instructions (Claude)
agents.md                     # AI agent instructions (Codex) — must be identical to claude.md
```

Skills follow the [Agent Skills specification](https://agentskills.io/specification). Each skill is a directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and markdown instructions.

## Available Skills

### Design System — Architectural Minimalist

**Skill:** `skills/design-system/SKILL.md`

A comprehensive design system skill that applies the "Architectural Minimalist" aesthetic to any web project. It features:

- Warm organic color palette (sage, terracotta, stone)
- Sharp architectural geometry (rounded-none everywhere)
- DM Sans + Tenor Sans typography pairing
- Full light/dark mode support
- Tailwind CSS configuration and component patterns

**Reference implementation:** https://pinch-pleat-simulator-731832823064.us-west1.run.app/

#### How to use this skill in another project

**Recommended: Git submodule (stays in sync automatically)**

Add this repository as a submodule in your target project:

```bash
git submodule add https://github.com/astrojams1/skills .skills
```

Then reference the skill in your project's `claude.md` or `agents.md`:

```markdown
## Design System
Follow the design system instructions in `.skills/skills/design-system/SKILL.md`
```

To pull the latest skill updates into your project:

```bash
git submodule update --remote
git commit -am "Update skills submodule"
```

**Alternative: Copy (no sync)**

Copy the contents of `skills/design-system/SKILL.md` directly into the target project's `claude.md` or `agents.md`. Simple but requires manual updates when the skill changes.

## Rules

1. **claude.md and agents.md must always be byte-for-byte identical.** Both files serve the same purpose for different AI agents (Claude and Codex). Any edit to one must be applied to the other. Run `tests/test-identity.sh` to verify.
2. **Skills follow the Agent Skills spec.** Each skill is a directory under `skills/` containing a `SKILL.md` with valid YAML frontmatter. Run `tests/test_skills_spec.py` to verify.
3. **Skills are self-contained.** Each skill must contain all instructions needed to apply it to a project, with no external dependencies on other skill files.
4. **Keep skills actionable.** Write skills as step-by-step instructions an AI agent can follow, not as abstract documentation.
