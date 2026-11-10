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
  version: "1.2.0"
---

# Skill integration prompt

**Hand the owner one prompt that fully integrates the `astrojams1/skills` submodule into a new consumer repo.** The
agent there wires the submodule, agent instructions and hook, always applies `workflow-orchestration`, and applies
`design-system` only if you uncomment it.

Done means: the whole prompt, set up for the design system choice, is on screen in one block the owner can copy.

Use it for a brand-new consumer repo with no skills integration yet. One prompt does everything, and the agent needs no
guidance. The consumer repo must be a git repository. Its agent needs shell access
and network access to GitHub to clone the submodule.

## A run

1. **Output the prompt at once.** Print the full prompt when the owner talks about adding skills to a new project. That
   covers integrating skills, bootstrapping a repo with skills, or setting up the skills submodule from scratch. Don't
   wait to be asked.
2. **Set the design system choice** before you print it. Check whether the owner wants the design-system skill:
   - **Yes:** Uncomment the Design System section in Phase 4, and remove the `.skillsexclude` step from Phase 2.
   - **No, or not mentioned:** Leave the Design System section in Phase 4 commented out. Keep the `.skillsexclude` step
     in Phase 2, so the skill stays out of the discovery directories entirely.
3. **Use one block.** Print everything between `---START---` and `---END---` inside one fenced code block made of
   **four backticks**. The owner then copies the whole prompt in one action, and the inner three-backtick fences still
   render.

## Rules

- **Never say "copy from above".** The skill is only in your context. The owner can't see it.
- **Point to skills, don't restate them.** The prompt has the agent read `workflow-orchestration` and `design-system`
  from the submodule and copy named sections. For how a skill itself should be written, see `skill-writing`.

## The prompt

---START---

You are running a full skills integration on this project. This one-shot setup wires the `astrojams1/skills` submodule,
configures agent instructions, applies workflow practices, and verifies that everything works.

**CONSTRAINTS:**
1. Run every command from the **root of this project** unless told otherwise.
2. Do NOT change any application logic. This prompt only sets up infrastructure and agent configuration.
3. Commit after each phase, so progress is saved as you go.
4. If any command fails, stop and report the error. Do not carry on blindly.

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

This copies skill directories into `.claude/skills/` and `.agents/skills/`, adds the `SessionStart` hook, and stages
the changes:

```bash
./skills/bin/manage.sh install .
```

If `install` says it has already run, that's fine. It is idempotent (safe to run again).

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

Create or update `AGENTS.md` in the project root. `AGENTS.md` is the only agent instructions file. Claude Code reads it
when no `CLAUDE.md` exists. **Never create `CLAUDE.md`.**

1. If only `CLAUDE.md` exists, rename it first: `git mv CLAUDE.md AGENTS.md`. If both exist, merge anything unique from
   `CLAUDE.md` into `AGENTS.md`, then `git rm CLAUDE.md`.
2. If `AGENTS.md` does not exist, create it with the template content.
3. If `AGENTS.md` already exists, append the `## Skills` section from the template to the end of it.

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
git add AGENTS.md tasks/
git commit -m "chore: add agent instructions and task tracking files"
```

---

## Phase 4: Apply Skills

### Workflow Orchestration (always)

Read the workflow-orchestration skill:

```bash
cat skills/skills/workflow-orchestration/SKILL.md
```

Follow the skill's own steps: copy every section it names into `AGENTS.md`. Put them after the `## Skills` section you
added in Phase 3.

Commit:

```bash
git add AGENTS.md
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

Follow every step in the skill's SKILL.md to apply the Architectural Minimalist design system to this project. That
includes:

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

Verify that all checks pass. If `check` auto-fixes anything, commit the fixes:

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
- [ ] `AGENTS.md` exists and contains a `## Skills` section
- [ ] `AGENTS.md` contains every section the workflow-orchestration skill names
- [ ] No `CLAUDE.md` exists in the project
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
- Agent instructions: AGENTS.md configured (no CLAUDE.md)
- Workflow orchestration: applied to agent instructions
- Design system: [applied / excluded]
- Task tracking: tasks/todo.md and tasks/lessons.md created
- Integrity: manage.sh check PASS
```

---END---

## Gotchas

- **Fresh clones skip the submodule (2026-03-19).** After integration, a `git clone` without `--recurse-submodules`
  gives a broken setup: `skills/` exists but is empty. The agent-instructions template covers this. Verify it was
  really added to AGENTS.md.
- **Discovery directories go uncommitted (2026-03-19).** `manage.sh install` stages files but doesn't commit. If the
  agent skips the commit or it fails silently, the discovery dirs exist only locally. Other developers and CI won't
  have them.
- **Agents recreate `CLAUDE.md` out of habit (2026-09-24).** Some agents create or edit `CLAUDE.md` during Phase 3 or
  4. `AGENTS.md` is the only instructions file. If a `CLAUDE.md` appears, merge its content into `AGENTS.md` and
  `git rm CLAUDE.md`. `manage.sh check` fails until it is gone.
- **`.skillsexclude` goes uncommitted (2026-03-19).** When excluding the design system, agents create `.skillsexclude`
  but sometimes forget to `git add` it. Without it, the next `manage.sh link` on a fresh clone copies the excluded
  skill back.
- **Agents re-add an installed submodule (2026-03-19).** On an already-installed repo, the prompt says `install` is
  idempotent. But agents sometimes re-run the full Phase 1 submodule add, which fails because the submodule exists.
  The `if` guard in Phase 1 prevents this. Make sure agents don't skip it.
