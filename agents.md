# Skills Repository

This repository contains reusable AI agent skills that can be applied across projects.

## Repository Structure

```
skills/                                    # Skill definitions (Agent Skills spec)
  design-system/
    SKILL.md                               # Main skill instructions (concise)
    references/components.md               # Detailed component HTML/CSS patterns
    references/layout.md                   # Detailed layout and global style patterns
tests/                                     # Tests for repository integrity
claude.md                                  # AI agent instructions (Claude)
agents.md                                  # AI agent instructions (Codex) — must be identical to claude.md
```

Skills follow the [Agent Skills specification](https://agentskills.io/specification). Each skill is a directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and markdown instructions. Skills may also include `references/`, `scripts/`, and `assets/` subdirectories for supplementary material loaded on demand.

**Important:** Before creating or modifying any skill, always consult the [Agent Skills specification](https://agentskills.io/specification) to ensure compliance with the latest format requirements, especially around progressive disclosure (SKILL.md < 500 lines, detailed material in `references/`).

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

Include the contents of `skills/design-system/SKILL.md` in the target project's `claude.md` or `agents.md`, or reference it when prompting an AI coding agent to style a project.

## Rules

1. **claude.md and agents.md must always be byte-for-byte identical.** Both files serve the same purpose for different AI agents (Claude and Codex). Any edit to one must be applied to the other. Run `tests/test-identity.sh` to verify.
2. **Skills follow the Agent Skills spec.** Each skill is a directory under `skills/` containing a `SKILL.md` with valid YAML frontmatter. Run `tests/test_skills_spec.py` to verify. **Always read the [spec](https://agentskills.io/specification) before making structural changes.**
3. **Skills are self-contained.** Each skill must contain all instructions needed to apply it to a project, with no external dependencies on other skill files.
4. **Keep skills actionable.** Write skills as step-by-step instructions an AI agent can follow, not as abstract documentation.
5. **Use progressive disclosure.** Keep `SKILL.md` concise (< 500 lines). Move detailed reference material (full HTML patterns, verbose CSS) into `references/` files that agents load on demand.
