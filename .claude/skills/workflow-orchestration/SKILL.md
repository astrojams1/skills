---
name: workflow-orchestration
description: >-
  Apply structured workflow orchestration practices to any AI agent project.
  Covers plan-first development, subagent strategy, self-improvement loops,
  verification gates, elegance checks, and autonomous bug fixing. Use when the
  user asks to set up agent instructions, improve task management discipline,
  establish development standards, or when onboarding a new AI-assisted project
  that needs disciplined habits for complex tasks.
metadata:
  version: "1.2.0"
---

# Workflow orchestration

**Give an agent steady habits for complex work,** so it finishes hard tasks on its own.

Done means: the target project's `AGENTS.md` carries the four sections below, and the project has no `CLAUDE.md`.

## A run

1. **Paste.** Copy the four sections below into the target project's `AGENTS.md`, its only agent instructions file.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task: 3+ steps or any architectural decision.
- If something goes sideways, STOP and re-plan at once. Don't keep pushing.
- Use plan mode for verification steps, not just for building.
- Write detailed specs up front to cut ambiguity.

### 2. Subagent Strategy

- Use subagents freely to keep the main context window clean.
- Hand research, exploration and parallel analysis to subagents.
- For a complex problem, add compute through more subagents.
- Give each subagent one task.

### 3. Self-Improvement Loop

- After ANY correction from the user, add the pattern to `tasks/lessons.md`.
- Write rules for yourself that stop the same mistake.
- Rework these lessons hard until the mistake rate drops.
- Review the lessons at session start for project context.

### 4. Verification Before Done

- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when it matters.
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, and show that it is correct.

### 5. Demand Elegance (Balanced)

- For a non-trivial change, pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes. Don't over-engineer.
- Challenge your own work before you present it.

### 6. Autonomous Bug Fixing

- Given a bug report, just fix it. Don't ask for hand-holding.
- Point at logs, errors and failing tests, then resolve them.
- The user should not have to switch context to help.
- Fix failing CI tests without being told how.
- **Fix what you find.** If you meet type errors, lint warnings or failing tests during any task, fix them. Never
  dismiss an issue as "pre-existing" or "not caused by my changes". Leave the codebase better than you found it.
- Resolve errors like missing module declarations or type mismatches in test files (install types, add declarations,
  fix imports). Don't just report them.

## Task Management

1. **Plan First**: Write the plan to `tasks/todo.md` with checkable items.
2. **Verify Plan**: Check in before you start building.
3. **Track Progress**: Mark items complete as you go.
4. **Explain Changes**: Give a high-level summary at each step.
5. **Document Results**: Add a review section to `tasks/todo.md`.
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Touch as little code as you can.
- **No Laziness**: Find root causes. No temporary fixes. Hold senior developer standards.
- **Minimal Impact**: Change only what is needed. Avoid introducing bugs.

## Gotchas

- **Plan mode is not optional for complex tasks.** The most common failure is skipping the plan and jumping straight
  to building.
- **"Fix what you find" does not mean refactor the world.** Fix the type errors, lint warnings and failing tests you
  meet in files you already touch. Don't hunt for issues in unrelated files.
- **Lessons only help if you read them.** Review `tasks/lessons.md` first thing at session start.
- **Verification means running the code, not just reading it.** "Looks correct" is not verification. If you can't run
  it, explain why and what you checked instead.
- **Check subagent results.** Subagents can hallucinate or miss context. Spot-check their findings before you act on
  them, above all before destructive operations.
- **Don't re-plan in a loop.** If your plan fails twice, the problem is likely your grasp of the system, not the plan.
  Step back and find the root cause before you plan again.
