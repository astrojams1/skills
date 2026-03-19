---
name: skill-orchestrator
description: >-
  Connect any AI agent project to the astrojams1/skills repository via git
  submodule. Use when the user asks to add skills to a project, wire up the
  skills submodule, check skills integrity, sync skills to latest, or
  troubleshoot a skills integration. Enables automatic skill syncing with main,
  ensures fresh clones get the submodule, and trains the target agent to read
  and apply skills from the mounted submodule path.
metadata:
  version: "1.0"
---

# Skill: Skill Orchestrator

Wire a target project to the `astrojams1/skills` repository via a git submodule so that:

- Skills are versioned alongside the project
- Syncing to latest is a single command (no manual copy-paste)
- Fresh clones automatically include all skills
- Claude Code discovers skills natively via `.claude/skills/<name>/SKILL.md` directories
- Codex discovers skills natively via `.agents/skills/<name>/SKILL.md` directories
- The AI agent in the target project knows where and how to read skills
- A built-in CLI verifies integrity and detects outdated or corrupted skills automatically

**All commands below are run by the AI agent, not the user.** The user simply asks for what they want (e.g. "add skills to this project", "check if skills are current") and the agent executes the appropriate steps.

## Step 1: Add the Skills Submodule

When the user asks to add skills to a project, run from the **root of the target project**:

```bash
./skills/bin/manage.sh install .
```

This does everything: adds the submodule, configures it to track `main`, copies full skill directories into `.claude/skills/` (for Claude Code) and `.agents/skills/` (for Codex), adds a `SessionStart` hook to `.claude/settings.json` so submodules are auto-initialized in every Claude session, and stages the changes.

If `manage.sh` is not yet available (first install), run:

```bash
git submodule add https://github.com/astrojams1/skills.git skills
git submodule update --init --recursive
git config -f .gitmodules submodule.skills.branch main
git add .gitmodules skills
git commit -m "chore: add astrojams1/skills submodule"
```

## Step 2: Verify Skills Integrity

For a fast pass/fail check without auto-fixing, run:

```bash
./skills/skills/skill-orchestrator/scripts/quick-check.sh
```

For a full check with auto-fix, run:

```bash
./skills/bin/manage.sh check
```

This verifies and auto-fixes:

- **Initialized** — submodule is populated, not empty
- **Unmodified** — no local edits that could corrupt skill definitions
- **Up-to-date** — auto-syncs submodule to upstream `main` if behind
- **Spec-compliant** — all SKILL.md files pass the Agent Skills spec validator
- **Linked** — auto-refreshes `.claude/skills/` and `.agents/skills/` directories if stale
- **Hooked** — auto-migrates `.claude/settings.json` hook to current format
- **Clean** — removes stale lowercase `claude.md`/`agents.md` and legacy flat skill files

Report findings to the user. After auto-fixes, stage and commit the changes.

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

Read [references/agent-instructions.md](references/agent-instructions.md) and copy the section it contains into **both** `CLAUDE.md` and `AGENTS.md` in the target project. Keep both files byte-for-byte identical.

This template tells the agent in the target project how to:
- Run `check` at session start and self-heal any issues
- Apply skills from `skills/skills/<skill-name>/SKILL.md`
- Sync to latest with `manage.sh sync`
- Contribute improvements back upstream

**Critical:** After install, verify that `.claude/skills/` and `.agents/skills/` directories are committed to version control — not just created locally. If these directories are missing from the commit, other developers and CI environments will not discover skills. Run `./skills/bin/manage.sh check` immediately after install to confirm everything is wired correctly. The `check` command auto-fixes missing skill directories and stale hooks, so it doubles as a self-healing step.

## Step 6: Contribute Skill Improvements Back

When working in any project that uses this submodule, if you notice a gap, error, or better approach in a skill, **improve it upstream** rather than working around it locally. This propagates the fix to all projects using the submodule.

From the root of the target project:

```bash
cd skills
git checkout -b improve/<skill-name>-<brief-description>
# edit skills/<skill-name>/SKILL.md or reference files
git add <changed-files>
git commit -m "improve(<skill-name>): <what changed and why>"
```

**Submitting the PR:** Your git credentials likely only authorize the consumer repo, not `astrojams1/skills`. After committing:

1. Attempt `git push -u origin improve/<skill-name>-<brief-description>`
2. If the push **succeeds**, give the user this link to create the PR:
   `https://github.com/astrojams1/skills/compare/main...improve/<skill-name>-<brief-description>`
3. If the push **fails** (403 / permission denied), tell the user:
   - The branch name and what it contains
   - Ask them to push from a local checkout of `astrojams1/skills` and open the PR
4. Return to the consumer project: `cd ..`

After the upstream PR merges, bring the fix into this project:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```

## Gotchas

- **Discovery directories must be committed, not just created locally.** The most common post-install failure is `.claude/skills/` and `.agents/skills/` existing locally but not being committed. Other developers and CI won't see the skills. Always verify with `git status` after install.
- **`manage.sh check` auto-fixes silently.** Running `check` can modify files (refreshing skill directories, updating hooks). Always stage and commit after running it, or you'll have uncommitted changes that confuse future checks.
- **Submodule SHAs drift.** If you run `git submodule update` without `--remote`, you'll pin to the last committed SHA, not the latest upstream. Use `manage.sh sync` instead — it handles the fetch-and-update correctly.
- **Consumer repo credentials usually can't push to the skills repo.** When contributing improvements back, the `git push` from inside the submodule will likely fail with 403. This is expected — tell the user to push manually from their own fork.
- **Don't edit skills locally in the consumer repo.** Local edits to files under `skills/` create "modified submodule" noise in `git status` and will be overwritten on next sync. Always edit upstream and sync down.

## Summary Checklist

- [ ] Submodule added at `skills/` and committed
- [ ] `.gitmodules` has `branch = main`
- [ ] `.claude/skills/` and `.agents/skills/` directories **committed to the repo** (not just created locally — verify with `git status`)
- [ ] `.claude/settings.json` has `SessionStart` hook that initializes submodule **and** refreshes skill directories
- [ ] `./skills/bin/manage.sh check` passes all checks (run immediately after install to verify)
- [ ] Team README updated with clone instructions
- [ ] `CLAUDE.md` updated with Skills section (includes session-start check and contributing instructions)
- [ ] `AGENTS.md` updated identically to `CLAUDE.md`
- [ ] (Ongoing) Agent runs `check` at session start and auto-fixes issues (skill files, hooks)
- [ ] (Ongoing) Agent runs `sync` when user requests updates
- [ ] (Ongoing) Improve skills upstream when gaps or errors are found
