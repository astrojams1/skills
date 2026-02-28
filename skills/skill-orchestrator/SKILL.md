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

## Step 1: Add the Skills Submodule

From the **root of the target project**, run:

```bash
git submodule add https://github.com/astrojams1/skills.git skills
git submodule update --init --recursive
```

This creates:
- `skills/` — the submodule directory (do not edit files here directly)
- `.gitmodules` — submodule registry file

Commit the initial addition:

```bash
git add .gitmodules skills
git commit -m "chore: add astrojams1/skills as submodule"
```

## Step 2: Configure the Submodule to Track `main`

Open `.gitmodules` and add `branch = main`:

```ini
[submodule "skills"]
    path = skills
    url = https://github.com/astrojams1/skills.git
    branch = main
```

Commit:

```bash
git add .gitmodules
git commit -m "chore: configure skills submodule to track main"
```

## Step 3: Sync Skills to Latest `main`

Whenever you want the latest skills from upstream, run:

```bash
git submodule update --remote --merge skills
git add skills
git commit -m "chore: sync skills submodule to latest main"
```

No manual tracking, no pinning to a specific commit by hand — one command pulls the latest.

## Step 4: Ensure Fresh Clones Get the Submodule

Teammates and CI must clone with:

```bash
git clone --recurse-submodules <repo-url>
```

For existing clones that are missing the submodule contents:

```bash
git submodule update --init --recursive
```

Add a note to the project `README.md`:

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

Add the following section to **both** `claude.md` and `agents.md` in the target project. Keep both files byte-for-byte identical.

```markdown
## Skills

This project uses the `skills/` submodule from [astrojams1/skills](https://github.com/astrojams1/skills).

Skills live in `skills/skills/`. To apply a skill:

1. Read `skills/skills/<skill-name>/SKILL.md` for step-by-step instructions
2. Load any supplementary files from `skills/skills/<skill-name>/references/` on demand
3. Follow the skill's instructions to complete the task

### Available Skills

- **design-system** — Architectural Minimalist design system for web UIs
  `skills/skills/design-system/SKILL.md`
- **workflow-orchestration** — Plan-first, subagent, and verification practices for AI agents
  `skills/skills/workflow-orchestration/SKILL.md`
- **skill-orchestrator** — Wire a repo to this skills submodule (this skill)
  `skills/skills/skill-orchestrator/SKILL.md`

### Keeping Skills Up to Date

To sync to the latest skills from upstream:

```bash
git submodule update --remote --merge skills
git add skills
git commit -m "chore: sync skills submodule to latest main"
```

### Contributing Skill Improvements

If you discover a gap, error, or better approach in any skill while working here, improve it upstream rather than working around it locally:

1. `cd skills` — enter the submodule
2. `git checkout -b improve/<skill-name>-<brief-description>`
3. Edit `skills/<skill-name>/SKILL.md` or its reference files
4. `git add <files> && git commit -m "improve(<skill-name>): <what and why>"`
5. `git push -u origin improve/<skill-name>-<brief-description>`
6. Open a PR against `astrojams1/skills` main, then return: `cd ..`

After the PR merges, sync this project:

```bash
git submodule update --remote --merge skills
git add skills
git commit -m "chore: sync skills after upstream improvement"
```
```

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
git submodule update --remote --merge skills
git add skills
git commit -m "chore: sync skills after upstream improvement"
```

## Summary Checklist

- [ ] Submodule added at `skills/` and committed
- [ ] `.gitmodules` has `branch = main`
- [ ] Team README updated with clone instructions
- [ ] `claude.md` updated with Skills section (includes contributing instructions)
- [ ] `agents.md` updated identically to `claude.md`
- [ ] Verified `ls skills/skills/` shows skill directories
- [ ] (Ongoing) Improve skills upstream when gaps or errors are found
