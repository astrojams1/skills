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
  version: "1.2.0"
---

# Skill orchestrator

**Wire a project to the `astrojams1/skills` repository through a git submodule.** Skills then stay versioned with the
project, sync with one command, and come with every fresh clone.

Done means: every box in the [checklist](#checklist) is ticked. Claude Code finds skills in
`.claude/skills/<name>/SKILL.md`, and Codex finds them in `.agents/skills/<name>/SKILL.md`. The project's agent knows
where and how to read them, and a built-in CLI catches outdated or corrupted skills.

**You run every command, not the user.** The user just asks ("add skills to this project", "are skills current?") and
you carry out the steps.

## Where things are

| What | Where |
|---|---|
| The CLI: `install`, `check`, `sync`, `link`, `status` | `./skills/bin/manage.sh` |
| Fast pass/fail check, no auto-fix | `./skills/skills/skill-orchestrator/scripts/quick-check.sh` |
| Section to copy into the project's `AGENTS.md` | [references/agent-instructions.md](references/agent-instructions.md) |
| Discovery copies, committed to the project | `.claude/skills/` (Claude Code), `.agents/skills/` (Codex) |

## A run

### Step 1: Install

When the user asks to add skills to a project, run this from the **root of the target project**:

```bash
./skills/bin/manage.sh install .
```

It does everything. It adds the submodule and sets it to track `main`. It copies full skill directories into
`.claude/skills/` (Claude Code) and `.agents/skills/` (Codex). It adds a `SessionStart` hook to `.claude/settings.json`,
so every Claude session starts the submodule. Then it stages the changes.

If `manage.sh` isn't there yet (first install), run:

```bash
git submodule add https://github.com/astrojams1/skills.git skills
git submodule update --init --recursive
git config -f .gitmodules submodule.skills.branch main
git add .gitmodules skills
git commit -m "chore: add astrojams1/skills submodule"
```

### Step 2: Verify

For a fast pass/fail check with no auto-fix, run:

```bash
./skills/skills/skill-orchestrator/scripts/quick-check.sh
```

For a full check with auto-fix, run:

```bash
./skills/bin/manage.sh check
```

It checks, and fixes where it can, that the submodule is:

- **Initialized.** The submodule is populated, not empty.
- **Unmodified.** No local edits that could corrupt skill definitions.
- **Up to date.** It auto-syncs the submodule to upstream `main` if behind.
- **Spec-compliant.** Every SKILL.md passes the Agent Skills spec validator.
- **Linked.** It auto-refreshes `.claude/skills/` and `.agents/skills/` if stale.
- **Hooked.** It auto-migrates the `.claude/settings.json` hook to the current format.
- **Clean.** It renames a stale lowercase `agents.md` to `AGENTS.md` and removes legacy flat skill files.
- **AGENTS.md only.** It fails if any `CLAUDE.md` (or `claude.md`) exists. It never deletes one for you.

Report what it found to the user. After auto-fixes, stage and commit the changes.

### Step 3: Sync

When the user asks to update or sync skills, run:

```bash
./skills/bin/manage.sh sync
```

Then commit the update:

```bash
git commit -m "chore: sync skills submodule to latest main"
```

### Step 4: Make fresh clones get the submodule

After install, add a `## Setup` section to the project's `README.md`. It says to clone with submodules included:

```bash
git clone --recurse-submodules <repo-url>
```

And, for anyone who already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

### Step 5: Update the project's agent instructions

Read [references/agent-instructions.md](references/agent-instructions.md) and copy its section into `AGENTS.md` in the
target project. It tells the project's agent how to:

- Run `check` at session start and self-heal any issues.
- Apply skills from `skills/skills/<skill-name>/SKILL.md`.
- Sync to latest with `manage.sh sync`.
- Contribute improvements back upstream.

`AGENTS.md` is the only agent instructions file. Codex reads it, and Claude Code (v2.1.277+) reads it when no
`CLAUDE.md` exists. **Never create `CLAUDE.md`.** If the project has both, merge anything unique into `AGENTS.md` and
`git rm CLAUDE.md`. If it has only `CLAUDE.md`, `git mv CLAUDE.md AGENTS.md`. `check` fails whenever a `CLAUDE.md`
exists.

**Commit the discovery directories.** After install, verify that `.claude/skills/` and `.agents/skills/` are committed,
not just created locally. Without them, other developers and CI won't find the skills. Run
`./skills/bin/manage.sh check` right after install to confirm the wiring. It also auto-fixes missing skill directories
and stale hooks.

### Step 6: Contribute skill improvements back

Working in any project that uses this submodule, you may find a gap, an error or a better approach in a skill.
**Improve it upstream** rather than working around it locally. The fix then reaches every project. Write the change in
the house style that the `skill-writing` skill sets out.

From the root of the target project:

```bash
cd skills
git checkout -b improve/<skill-name>-<brief-description>
# edit skills/<skill-name>/SKILL.md or reference files
git add <changed-files>
git commit -m "improve(<skill-name>): <what changed and why>"
```

Your git credentials probably cover only the consumer repo, not `astrojams1/skills`. After committing:

1. Try `git push -u origin improve/<skill-name>-<brief-description>`.
2. If the push **succeeds**, give the user this link to create the PR:
   `https://github.com/astrojams1/skills/compare/main...improve/<skill-name>-<brief-description>`
3. If the push **fails** (403 or permission denied), tell the user the branch name and what it contains. Ask them to
   push from a local checkout of `astrojams1/skills` and open the PR.
4. Return to the consumer project: `cd ..`

After the upstream PR merges, bring the fix into this project:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```

## Rules

- **Don't edit skills locally in the consumer repo.** Local edits under `skills/` cause "modified submodule" noise in
  `git status`, and the next sync overwrites them. Edit upstream and sync down.

## Checklist

- [ ] Submodule added at `skills/` and committed
- [ ] `.gitmodules` has `branch = main`
- [ ] `.claude/skills/` and `.agents/skills/` directories **committed to the repo** (not just created locally; verify
  with `git status`)
- [ ] `.claude/settings.json` has a `SessionStart` hook that starts the submodule **and** refreshes skill directories
- [ ] `./skills/bin/manage.sh check` passes all checks (run it right after install)
- [ ] Team README updated with clone instructions
- [ ] `AGENTS.md` updated with the Skills section (with the session-start check and contributing instructions)
- [ ] No `CLAUDE.md` in the project (removed with `git rm`, or renamed to `AGENTS.md` if it was the only file)
- [ ] (Ongoing) The agent runs `check` at session start and auto-fixes issues (skill files, hooks)
- [ ] (Ongoing) The agent runs `sync` when the user asks for updates
- [ ] (Ongoing) Improve skills upstream when you find gaps or errors

## Gotchas

- **Discovery directories go uncommitted (2026-03-19).** This is the most common failure after install:
  `.claude/skills/` and `.agents/skills/` exist locally but aren't committed. Other developers and CI won't see the
  skills. Always check `git status` after install.
- **`manage.sh check` auto-fixes silently (2026-03-19).** It can change files (refreshing skill directories, updating
  hooks). Always stage and commit after running it, or leftover changes confuse later checks.
- **Submodule SHAs drift (2026-03-19).** `git submodule update` without `--remote` pins to the last committed SHA, not
  the latest upstream. Use `manage.sh sync` instead. It fetches and updates correctly.
- **Consumer credentials usually can't push to the skills repo (2026-03-19).** A `git push` from inside the submodule
  will likely fail with 403. That is expected. Tell the user to push by hand from their own fork.
