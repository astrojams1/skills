---
name: skill-orchestrator
description: >-
  Connect any AI agent project to the astrojams1/skills repository via git
  submodule. Enables automatic skill syncing with main, ensures fresh clones
  get the submodule, and trains the target agent to read and apply skills from
  the mounted submodule path. Apply by following the steps below in the target
  project, then updating that project's claude.md and agents.md.
---

# Skill: Skill Orchestrator

Wire a target project to the `astrojams1/skills` repository via a git submodule so that:

- Skills are versioned alongside the project
- Syncing to latest is a single command (no manual copy-paste)
- Fresh clones automatically include all skills
- The AI agent in the target project knows where and how to read skills
- A built-in CLI verifies integrity and detects outdated or corrupted skills automatically

**All commands below are run by the AI agent, not the user.** The user simply asks for what they want (e.g. "add skills to this project", "check if skills are current") and the agent executes the appropriate steps.

## Step 1: Add the Skills Submodule

When the user asks to add skills to a project, run from the **root of the target project**:

```bash
./skills/bin/manage.sh install .
```

This does everything: adds the submodule, configures it to track `main`, and stages the changes.

If `manage.sh` is not yet available (first install), run:

```bash
git submodule add https://github.com/astrojams1/skills.git skills
git submodule update --init --recursive
git config -f .gitmodules submodule.skills.branch main
git add .gitmodules skills
git commit -m "chore: add astrojams1/skills submodule"
```

## Step 2: Verify Skills Integrity

When the user asks to check, verify, or troubleshoot skills, run:

```bash
./skills/bin/manage.sh check
```

This verifies:

- **Initialized** — submodule is populated, not empty
- **Unmodified** — no local edits that could corrupt skill definitions
- **Up-to-date** — current commit matches upstream `main`
- **Spec-compliant** — all SKILL.md files pass the Agent Skills spec validator

Report findings to the user. If issues are found, fix them (sync if behind, restore if modified).

## Step 3: Sync Skills to Latest

When the user asks to update or sync skills, run:

```bash
./skills/bin/manage.sh sync
```

Then commit the update:

```bash
git commit -m "chore: sync skills submodule to latest main"
```

## Step 4: Ensure Fresh Clones Get the Submodule

After installing the submodule, add a note to the project `README.md`:

```markdown
## Setup

Clone with submodules included:

```bash
git clone --recurse-submodules <repo-url>
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```
```

## Step 5: Update the Target Project's Agent Instructions

Read [references/agent-instructions.md](references/agent-instructions.md) and copy the section it contains into **both** `claude.md` and `agents.md` in the target project. Keep both files byte-for-byte identical.

This template tells the agent in the target project how to:
- Run `check` at session start and self-heal any issues
- Apply skills from `skills/skills/<skill-name>/SKILL.md`
- Sync to latest with `manage.sh sync`
- Contribute improvements back upstream

## Step 6: Contribute Skill Improvements Back

When working in any project that uses this submodule, if you notice a gap, error, or better approach in a skill, **improve it upstream** rather than working around it locally. This propagates the fix to all projects using the submodule.

From the root of the target project:

```bash
cd skills
git checkout -b improve/<skill-name>-<brief-description>
# edit skills/<skill-name>/SKILL.md or reference files
git add <changed-files>
git commit -m "improve(<skill-name>): <what changed and why>"
git push -u origin improve/<skill-name>-<brief-description>
# open a PR at https://github.com/astrojams1/skills
cd ..
```

After the upstream PR merges, bring the fix into this project:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```

## Summary Checklist

- [ ] Submodule added at `skills/` and committed
- [ ] `.gitmodules` has `branch = main`
- [ ] Team README updated with clone instructions
- [ ] `claude.md` updated with Skills section (includes session-start check and contributing instructions)
- [ ] `agents.md` updated identically to `claude.md`
- [ ] `./skills/bin/manage.sh check` passes all checks
- [ ] (Ongoing) Agent runs `check` at session start and auto-fixes issues
- [ ] (Ongoing) Agent runs `sync` when user requests updates
- [ ] (Ongoing) Improve skills upstream when gaps or errors are found
