# Skills Repository

This repository contains reusable AI agent skills that can be applied across projects.

## Repository Structure

```
bin/
  manage.sh                                # CLI: install, check, sync, status for skill management
skills/                                    # Skill definitions (Agent Skills spec)
  design-system/
    SKILL.md                               # Main skill instructions (concise)
    references/components.md               # Detailed component HTML/CSS patterns
    references/layout.md                   # Detailed layout and global style patterns
  workflow-orchestration/
    SKILL.md                               # Workflow orchestration practices for AI agents
  skill-orchestrator/
    SKILL.md                               # Wire another repo to this skills submodule
  design-system-migration-prompt/
    SKILL.md                               # Migration prompt to swap in the design system
  health-check-prompt/
    SKILL.md                               # Diagnostic prompt for consumer repo integration
  health-check-review/
    SKILL.md                               # Process health check reports and fix issues
.claude/skills/                            # Claude Code skill discovery (auto-generated copies)
.agents/skills/                            # Codex skill discovery (auto-generated copies)
tests/                                     # Tests for repository integrity
tasks/
  todo.md                                  # Current work items and progress tracking
  lessons.md                               # Patterns and corrections from past mistakes
CLAUDE.md                                  # AI agent instructions (Claude)
AGENTS.md                                  # AI agent instructions (Codex) — must be identical to CLAUDE.md
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

Include the contents of `skills/design-system/SKILL.md` in the target project's `CLAUDE.md` or `AGENTS.md`, or reference it when prompting an AI coding agent to style a project.

### Workflow Orchestration

**Skill:** `skills/workflow-orchestration/SKILL.md`

A structured workflow orchestration skill that establishes disciplined development habits for AI agents tackling complex tasks. It features:

- Plan-first development with mandatory re-planning on failure
- Subagent strategy to keep the main context window clean
- Self-improvement loop via `tasks/lessons.md` after every correction
- Verification gates before marking any task complete
- Balanced elegance checks to avoid both hackiness and over-engineering
- Autonomous bug fixing without requiring user hand-holding

#### How to use this skill in another project

Include the **Workflow Orchestration**, **Task Management**, and **Core Principles** sections from `skills/workflow-orchestration/SKILL.md` in the target project's `CLAUDE.md` or `AGENTS.md`.

### Skill Orchestrator

**Skill:** `skills/skill-orchestrator/SKILL.md`

A meta-skill that connects any AI agent project to this repository via a git submodule. It covers:

- Adding `astrojams1/skills` as a submodule at `skills/` in the target project
- Configuring the submodule to track `main` for automatic syncing
- Ensuring fresh clones get the submodule with `--recurse-submodules`
- Updating the target project's `CLAUDE.md` and `AGENTS.md` so the agent knows how to read and apply skills from the submodule path

#### How to use this skill in another project

When the user asks to add skills to a project, read `skills/skill-orchestrator/SKILL.md` and execute the steps autonomously. The agent runs all commands — the user does not need to touch the terminal.

- **Add skills:** Run `bin/manage.sh install /path/to/target-project` (or the manual git commands in Step 1)
- **Check integrity:** Run `./skills/bin/manage.sh check` from the target project
- **Sync to latest:** Run `./skills/bin/manage.sh sync` from the target project

## Internal Skills

These skills are internal to the skills repository and are NOT distributed to consumer repos. They have `internal: true` in their SKILL.md frontmatter, which causes `manage.sh` to skip them during `link`, `install`, `sync`, and `check`.

### Design System Migration Prompt

**Skill:** `skills/design-system-migration-prompt/SKILL.md`

A self-contained migration prompt for the skills repo author to copy-paste to an AI agent in a consumer repo. The agent audits the existing design system, strips it completely, and replaces it with the Architectural Minimalist design system. The prompt embeds the full spec so the consumer agent needs no access to this repository.

#### How to use

Read `skills/design-system-migration-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the consumer repo. The agent will audit, strip, replace, and verify autonomously.

### Health Check Prompt

**Skill:** `skills/health-check-prompt/SKILL.md`

A diagnostic prompt for the skills repo author to copy-paste to a Claude or Codex agent running in a consumer repo. The agent gathers data and returns a structured health report covering submodule state, discovery directories, hooks, agent instructions, and spec compliance.

#### How to use

Read `skills/health-check-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the consumer repo. Review the returned report using the diagnostic table in the skill.

### Health Check Review

**Skill:** `skills/health-check-review/SKILL.md`

Processes health check reports pasted from consumer repos. Analyzes report data, identifies bugs in `manage.sh` or skills code, suggests improvements to the health-check-prompt, and provides step-by-step next steps for both the skills repo and the consumer repo.

#### How to use

Paste one or more health check reports into the conversation. The skill activates automatically and walks through diagnosis, fixes, and next steps.

## Rules

1. **CLAUDE.md and AGENTS.md must always be byte-for-byte identical.** Both files serve the same purpose for different AI agents (Claude and Codex). Any edit to one must be applied to the other. Run `tests/test-identity.sh` to verify.
2. **Skills follow the Agent Skills spec.** Each skill is a directory under `skills/` containing a `SKILL.md` with valid YAML frontmatter. Run `tests/test_skills_spec.py` to verify. **Always read the [spec](https://agentskills.io/specification) before making structural changes.**
3. **Skills are self-contained.** Each skill must contain all instructions needed to apply it to a project, with no external dependencies on other skill files.
4. **Keep skills actionable.** Write skills as step-by-step instructions an AI agent can follow, not as abstract documentation.
5. **Use progressive disclosure.** Keep `SKILL.md` concise (< 500 lines). Move detailed reference material (full HTML patterns, verbose CSS) into `references/` files that agents load on demand.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
