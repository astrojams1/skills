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
```

## Summary Checklist

- [ ] Submodule added at `skills/` and committed
- [ ] `.gitmodules` has `branch = main`
- [ ] Team README updated with clone instructions
- [ ] `claude.md` updated with Skills section
- [ ] `agents.md` updated identically to `claude.md`
- [ ] Verified `ls skills/skills/` shows skill directories
