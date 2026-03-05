---
name: workflow-orchestration
description: >-
  Apply structured workflow orchestration practices to any AI agent project.
  Covers plan-first development, subagent strategy, self-improvement loops,
  verification gates, elegance checks, and autonomous bug fixing. Use when
  setting up agent instructions, improving task management discipline, or
  establishing development standards for AI-assisted projects.
metadata:
  version: "1.0"
---

# Skill: Workflow Orchestration

Apply structured workflow orchestration practices to guide AI agents through complex tasks reliably and autonomously.

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

## How to Apply This Skill

Paste the **Workflow Orchestration**, **Task Management**, and **Core Principles** sections above into the target project's `CLAUDE.md` or `AGENTS.md`. This equips the AI agent with disciplined, structured habits for tackling complex tasks.
