# Skills Repository

This repository contains reusable AI agent skills that can be applied across projects.

## Repository Structure

```
bin/
  manage.sh                                # CLI: install, check, sync, status for skill management
skills/                                    # Skill definitions (Agent Skills spec)
  careful/
    SKILL.md                               # On-demand safety hooks for destructive commands
  design-system/
    SKILL.md                               # Main skill instructions (concise)
    references/components.md               # Detailed component HTML/CSS patterns
    references/layout.md                   # Detailed layout and global style patterns
  design-system-migration-prompt/
    SKILL.md                               # Migration prompt to swap in the design system
  freeze/
    SKILL.md                               # On-demand file protection (restrict edits to one dir)
  health-check-prompt/
    SKILL.md                               # Diagnostic prompt for consumer repo integration
  health-check-review/
    SKILL.md                               # Process health check reports and fix issues
  simplify/
    SKILL.md                               # Code quality review — find and fix over-engineering
  skill-integration-prompt/
    SKILL.md                               # Integration prompt for new consumer repos
  skill-orchestrator/
    SKILL.md                               # Wire another repo to this skills submodule
    scripts/quick-check.sh                 # Fast pass/fail integration check
    references/agent-instructions.md       # Template for consumer CLAUDE.md/AGENTS.md
  workflow-orchestration/
    SKILL.md                               # Workflow orchestration practices for AI agents
.claude/skills/                            # Claude Code skill discovery (auto-generated copies)
.agents/skills/                            # Codex skill discovery (auto-generated copies)
tests/                                     # Tests for repository integrity
tasks/
  todo.md                                  # Current work items and progress tracking
  lessons.md                               # Patterns and corrections from past mistakes
example/
  index.html                               # Static example app showcasing the design system
vercel.json                                # Vercel config to deploy the example app
CLAUDE.md                                  # AI agent instructions (Claude)
AGENTS.md                                  # AI agent instructions (Codex) — must be identical to CLAUDE.md
```

Skills follow the [Agent Skills specification](https://agentskills.io/specification). Each skill is a directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and markdown instructions. Skills may also include `references/`, `scripts/`, and `assets/` subdirectories for supplementary material loaded on demand.

**Important:** Before creating or modifying any skill, always consult the [Agent Skills specification](https://agentskills.io/specification) to ensure compliance with the latest format requirements, especially around progressive disclosure (SKILL.md < 500 lines, detailed material in `references/`).

## Skill Categories

Skills cluster into recurring categories. Use this taxonomy to identify gaps in your skill coverage and to write better skills:

1. **Library & API Reference** — Correct usage of libraries, CLIs, or SDKs. Include reference code snippets and gotchas for things Claude gets wrong by default.
2. **Product Verification** — How to test or verify that code works. Pair with external tools (Playwright, tmux, etc.). Worth investing heavily in — verification skills directly improve output quality.
3. **Data Fetching & Analysis** — Connect to data and monitoring stacks. Store helper libraries and credentials patterns so Claude composes rather than reconstructs.
4. **Business Process & Workflow Automation** — Encode multi-step operational processes into single commands. Store results in log files for consistency.
5. **Code Scaffolding & Templates** — Generate framework boilerplate with natural language requirements that pure code can't cover (annotations, auth, deploy config).
6. **Code Quality & Review** — Enforce organizational code quality. Can include deterministic scripts for maximum robustness. Consider running automatically via hooks or GitHub Actions.
7. **CI/CD & Deployment** — Fetch, push, deploy code. May reference other skills to collect data. Examples: `babysit-pr`, `deploy-<service>`, `cherry-pick-prod`.
8. **Runbooks** — Take a symptom (Slack thread, alert, error signature), walk through a multi-tool investigation, produce a structured report.
9. **Infrastructure Operations** — Routine maintenance and operational procedures with guardrails for destructive actions.
10. **On-Demand Hooks** — Session-level guardrails activated by invoking the skill. Last for the session duration. Examples: `careful` (blocks destructive commands), `freeze` (blocks edits outside a directory).

## Writing Good Skills

- **Don't state the obvious.** Claude already knows a lot about coding. Focus on information that pushes Claude out of its default behavior — gotchas, internal conventions, edge cases.
- **Build a Gotchas section.** The highest-signal content in any skill. Build it up from failure points Claude hits when using the skill. Update it over time as new edge cases emerge.
- **Use the file system for progressive disclosure.** A skill is a folder, not just a markdown file. Tell Claude what files exist in `references/`, `scripts/`, and `assets/` — it will read them at appropriate times.
- **Don't over-specify.** Give Claude the information it needs but leave flexibility to adapt. Skills are reusable across contexts — being too specific breaks reuse.
- **Store scripts and libraries.** Giving Claude pre-built scripts lets it spend turns on composition (deciding what to do) rather than reconstruction (rebuilding boilerplate). E.g., data fetching helpers, verification scripts.
- **The description field is for the model.** The description is what Claude scans to decide "is there a skill for this request?" Write it as a trigger description, not a summary. Include specific keywords and "Use when..." patterns.
- **Start small, iterate.** Most good skills began as a few lines and a single gotcha. They got better because people kept adding to them as Claude hit new edge cases.

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
- **Exclude a skill:** Add the skill name to `.skillsexclude` in the target project (one per line), then run `./skills/bin/manage.sh link` to remove it from discovery directories
- **Check integrity:** Run `./skills/bin/manage.sh check` from the target project
- **Sync to latest:** Run `./skills/bin/manage.sh sync` from the target project

### Simplify — Code Quality & Review

**Skill:** `skills/simplify/SKILL.md`

A code quality skill that reviews recently changed code for over-engineering, redundancy, dead code, and unnecessary complexity — then fixes what it finds. Not a review that produces comments, but one that produces better code.

- Reviews `git diff` to find changed files
- Checks for dead code, redundant abstractions, copy-paste duplication, verbose patterns
- Fixes issues directly rather than reporting them
- Behavior-preserving simplification only

#### How to use

Invoke with `/simplify` after completing a feature or fix, before committing. The skill reviews your changes and makes them cleaner.

### Careful — On-Demand Safety Hooks

**Skill:** `skills/careful/SKILL.md`

An on-demand hook skill that blocks destructive commands (`rm -rf`, `DROP TABLE`, force-push, `kubectl delete`, `terraform destroy`) for the rest of the session.

#### How to use

Invoke with `/careful` when working with production systems or dangerous infrastructure. The skill installs guardrails that last for the session.

### Freeze — On-Demand File Protection

**Skill:** `skills/freeze/SKILL.md`

An on-demand hook skill that blocks Edit and Write operations outside a specified directory for the rest of the session.

#### How to use

Invoke with `/freeze` when debugging and you want to read broadly but only edit in one place. The skill asks which directory to keep editable and blocks modifications everywhere else.

## Internal Skills

These skills are internal to the skills repository and are NOT distributed to consumer repos. They have `internal: true` in their SKILL.md frontmatter, which causes `manage.sh` to skip them during `link`, `install`, `sync`, and `check`.

### Design System Migration Prompt

**Skill:** `skills/design-system-migration-prompt/SKILL.md`

A migration prompt for the skills repo author to copy-paste to an AI agent in a consumer repo that already has the `design-system` skill. The agent audits the existing design system, strips it completely, and replaces it by following the design-system skill. The prompt references the skill rather than embedding the full spec.

#### How to use

The consumer repo must already have the `design-system` skill available (via submodule or copied). Read `skills/design-system-migration-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the consumer repo. The agent will audit, strip, replace, and verify autonomously.

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

### Skill Integration Prompt

**Skill:** `skills/skill-integration-prompt/SKILL.md`

A one-shot integration prompt for the skills repo author to give an AI agent in a new consumer repo. The agent adds the skills submodule, runs `manage.sh install`, configures agent instructions, applies `workflow-orchestration` (always), and optionally applies the `design-system` skill. Produces a fully integrated project in one prompt.

#### How to use

Read `skills/skill-integration-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the new consumer repo. To include the design system, uncomment the Design System section in Phase 4 before pasting.

## Rules

1. **CLAUDE.md and AGENTS.md must always be byte-for-byte identical.** Both files serve the same purpose for different AI agents (Claude and Codex). Any edit to one must be applied to the other. Run `tests/test-identity.sh` to verify.
2. **Skills follow the Agent Skills spec.** Each skill is a directory under `skills/` containing a `SKILL.md` with valid YAML frontmatter. Run `tests/test_skills_spec.py` to verify. **Always read the [spec](https://agentskills.io/specification) before making structural changes.**
3. **Skills are self-contained.** Each skill must contain all instructions needed to apply it to a project, with no external dependencies on other skill files.
4. **Keep skills actionable.** Write skills as step-by-step instructions an AI agent can follow, not as abstract documentation.
5. **Use progressive disclosure.** Keep `SKILL.md` concise (< 500 lines). Move detailed reference material (full HTML patterns, verbose CSS) into `references/` files that agents load on demand.
6. **SKILL.md summarizes; references/ implements.** `SKILL.md` should state *what* and *why* — principles, token definitions, component names, brief behavioral summaries, and pointers to `references/`. It should NOT contain full implementation examples (exact class strings, HTML snippets, code blocks) when those already exist in `references/` files. If a concept needs a code example, put the example in `references/` and add a one-line summary + link in `SKILL.md`.
7. **Dependent skills reference, never duplicate.** When one skill depends on another (e.g., a migration prompt depends on the design system skill), it must reference the source skill's sections by name rather than re-specifying the same information. Migration-specific additions (translation mappings, workflow phases, constraints) are fine; re-stating the source skill's class strings, property values, or patterns is not.
8. **Zero failing tests.** All tests must pass before committing. No exceptions — even pre-existing failures must be fixed, not ignored. Run `bash tests/test-manage.sh`, `bash tests/test-identity.sh`, and `python3 tests/test_skills_spec.py` to verify.

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
- **Fix what you find.** If you encounter type errors, lint warnings, or failing tests during any task — fix them. Never dismiss issues as "pre-existing" or "not caused by my changes." Leave the codebase better than you found it
- When you see errors like missing module declarations or type mismatches in test files, resolve them (install types, add declarations, fix imports) — don't just report them

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
