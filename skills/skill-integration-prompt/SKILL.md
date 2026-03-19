---
name: skill-integration-prompt
internal: true
description: >-
  A copy-paste prompt for the skills repo author to give an AI agent in a new
  consumer repo. Use when onboarding a new project to the skills system, or
  when the user wants a one-shot integration. The agent adds the skills
  submodule, runs manage.sh install, applies workflow-orchestration, and
  optionally applies the design-system skill.
metadata:
  version: "1.0"
---

# Skill: Skill Integration Prompt

This skill provides a copy-paste prompt that instructs an AI agent in a **new consumer repo** to fully integrate the `astrojams1/skills` submodule. After integration, the agent always applies the `workflow-orchestration` skill and optionally applies the `design-system` skill if the author uncomments that section.

## When to Use

- When onboarding a brand-new consumer repo that has no skills integration yet
- When you want a single prompt that handles everything: submodule, agent instructions, hook, workflow setup, and (optionally) design system
- When you want an agent to autonomously handle the entire integration without manual guidance

## Prerequisites

- The consumer repo must be a git repository
- The agent in the consumer repo must have shell access (Bash or equivalent)
- Network access to GitHub (to clone the submodule)

## Agent Instructions

**Proactive trigger:** If the user mentions integrating skills into a new project, bootstrapping a repo with skills, or setting up the skills submodule from scratch — immediately output the full prompt below. Do NOT wait for them to explicitly ask for it.

**Output rules:** Print everything between the `---START---` and `---END---` markers inside a single fenced code block using **quadruple backticks** (i.e., four backtick characters) so the user can copy the entire prompt in one action. The inner triple backticks will render correctly inside the quadruple-backtick fence. Do NOT tell the user to "copy from above" — the skill content is only in your context and is not visible to them.

**Customization:** Before outputting, check if the user wants the design-system skill applied:
- **Yes:** Uncomment the Design System section in Phase 4 and remove the `.skillsexclude` step from Phase 2.
- **No (or not mentioned):** Leave Phase 4's Design System section commented out and keep the `.skillsexclude` step in Phase 2 so the skill is excluded from discovery directories entirely.

## The Prompt

---START---

You are performing a full skills integration on this project. This is a one-shot setup that wires the `astrojams1/skills` submodule, configures agent instructions, applies workflow practices, and verifies everything works.

**CONSTRAINTS:**
1. Run every command from the **root of this project** unless told otherwise.
2. Do NOT modify any application logic — this prompt only sets up infrastructure and agent configuration.
3. Commit after each phase so progress is saved incrementally.
4. If any command fails, stop and report the error — do not continue blindly.

---

## Phase 1: Add the Skills Submodule

Check if the submodule already exists. If not, add it:

```bash
if [ -f skills/bin/manage.sh ]; then
  echo "Skills submodule already present — skipping add"
else
  git submodule add https://github.com/astrojams1/skills.git skills
  git submodule update --init --recursive
  git config -f .gitmodules submodule.skills.branch main
  git add .gitmodules skills
  git commit -m "chore: add astrojams1/skills submodule"
fi
```

---

## Phase 2: Run manage.sh install

This copies skill directories into `.claude/skills/` and `.agents/skills/`, adds the `SessionStart` hook, and stages changes:

```bash
./skills/bin/manage.sh install .
```

If `install` reports it has already been run, that's fine — it is idempotent.

<!-- REMOVE THE BLOCK BELOW IF THE DESIGN SYSTEM SKILL SHOULD BE INCLUDED -->
Exclude the design-system skill from this project so it is not copied into discovery directories:

```bash
echo "design-system" >> .skillsexclude
./skills/bin/manage.sh link
```
<!-- END EXCLUDE BLOCK -->

Commit the install artifacts:

```bash
git add .claude .agents .gitmodules skills .skillsexclude
git commit -m "chore: run manage.sh install for skills integration"
```

---

## Phase 3: Configure Agent Instructions

Read the agent-instructions template from the submodule:

```bash
cat skills/skills/skill-orchestrator/references/agent-instructions.md
```

Create or update **both** `CLAUDE.md` and `AGENTS.md` in the project root:

1. If neither file exists, create both with the template content.
2. If they already exist, append the `## Skills` section from the template to the end of each file.
3. **Both files must be byte-for-byte identical.** After editing, verify: `cmp -s CLAUDE.md AGENTS.md && echo "IDENTICAL" || echo "DIFFER"`

Also create `tasks/todo.md` and `tasks/lessons.md` if they don't exist:

```bash
mkdir -p tasks
[ -f tasks/todo.md ] || cat > tasks/todo.md << 'EOF'
# Tasks

Track current work items here. Use checkable items for progress tracking.

## Current

- [ ] (no active tasks)
EOF

[ -f tasks/lessons.md ] || cat > tasks/lessons.md << 'EOF'
# Lessons

Patterns and corrections from past mistakes. Review at session start.

## Patterns

(none yet)
EOF
```

Commit:

```bash
git add CLAUDE.md AGENTS.md tasks/
git commit -m "chore: add agent instructions and task tracking files"
```

---

## Phase 4: Apply Skills

### Workflow Orchestration (always)

Read the workflow-orchestration skill:

```bash
cat skills/skills/workflow-orchestration/SKILL.md
```

Copy the **Workflow Orchestration**, **Task Management**, and **Core Principles** sections from the skill into both `CLAUDE.md` and `AGENTS.md`, placing them after the `## Skills` section you added in Phase 3.

Verify identity: `cmp -s CLAUDE.md AGENTS.md && echo "IDENTICAL" || echo "DIFFER"`

Commit:

```bash
git add CLAUDE.md AGENTS.md
git commit -m "chore: apply workflow-orchestration skill to agent instructions"
```

<!-- UNCOMMENT THE SECTION BELOW TO APPLY THE DESIGN SYSTEM -->
<!--
### Design System (optional)

Read the design-system skill and its references:

```bash
cat skills/skills/design-system/SKILL.md
cat skills/skills/design-system/references/components.md
cat skills/skills/design-system/references/layout.md
```

Follow every step in the skill's SKILL.md to apply the Architectural Minimalist design system to this project. This includes:

1. Installing foundations (fonts, Tailwind config, CSS custom properties)
2. Applying color tokens, geometry (rounded-none), and typography
3. Styling all components per the references
4. Adding dark mode support
5. Running the skill's verification checklist

Commit after the design system is fully applied:

```bash
git add -A
git commit -m "feat: apply Architectural Minimalist design system"
```
-->

---

## Phase 5: Verify

Run the full integrity check:

```bash
./skills/bin/manage.sh check 2>&1
```

Verify all checks pass. If `check` auto-fixes anything, commit the fixes:

```bash
git add .claude .agents skills
git diff --cached --quiet || git commit -m "chore: auto-fix skills integration issues"
```

Run the spec validator:

```bash
python3 ./skills/tests/test_skills_spec.py 2>&1
```

Final verification checklist:

- [ ] `git submodule status skills` shows a clean SHA (no `+` prefix)
- [ ] `.claude/skills/` and `.agents/skills/` directories are committed (not just local)
- [ ] `.claude/settings.json` has a `SessionStart` hook
- [ ] `CLAUDE.md` and `AGENTS.md` exist, are identical, and contain a `## Skills` section
- [ ] `CLAUDE.md` contains Workflow Orchestration, Task Management, and Core Principles sections
- [ ] `tasks/todo.md` and `tasks/lessons.md` exist
- [ ] Excluded skills (if any) are listed in `.skillsexclude` and absent from discovery directories
- [ ] `manage.sh check` passes with no failures
- [ ] The project builds and all existing tests still pass

Report the results of each checklist item.

---

## Phase 6: Summary

Print a summary of what was done:

```
## Integration Complete

- Skills submodule: wired at `skills/` tracking `main`
- Discovery directories: `.claude/skills/` and `.agents/skills/` committed
- Excluded skills: [list from .skillsexclude, or "none"]
- SessionStart hook: configured in `.claude/settings.json`
- Agent instructions: CLAUDE.md and AGENTS.md configured (identical)
- Workflow orchestration: applied to agent instructions
- Design system: [applied / excluded]
- Task tracking: tasks/todo.md and tasks/lessons.md created
- Integrity: manage.sh check PASS
```

---END---
