# Agent instructions template

Copy the section below into `AGENTS.md` in the target project. `AGENTS.md` is the only agent instructions file. Claude
Code reads it when no `CLAUDE.md` exists. Do not create `CLAUDE.md`. Remove an existing one with `git rm CLAUDE.md`, or
use `git mv CLAUDE.md AGENTS.md` if it is the only file.

---

## Skills

This project uses the `skills/` submodule from [astrojams1/skills](https://github.com/astrojams1/skills).

### Session Start

**Claude Code:** A `SessionStart` hook in `.claude/settings.json` starts and syncs the skills submodule before the first
turn. It:

1. Initializes the submodule to the recorded pointer.
2. Tries to fetch and update to the latest upstream `main`, skipped quietly if offline.
3. Refreshes the skill discovery directories.

Skills are always current when a session starts, with no manual sync.

**Codex:** Run `git submodule update --init --recursive && ./skills/bin/manage.sh check` at the start of each session.
The submodule update makes sure you run the latest manage.sh before `check` verifies integrity and auto-fixes issues.

Run `./skills/bin/manage.sh check` to verify integrity:

```bash
./skills/bin/manage.sh check
```

It fixes most issues in place:
- **Behind upstream.** It syncs the submodule to the latest upstream main.
- **Missing or stale discovery dirs.** It refreshes `.claude/skills/` and `.agents/skills/`.
- **Stale hooks.** It migrates them to the current hook format.
- **Stale lowercase files.** It renames a lowercase `agents.md` to `AGENTS.md`. A `claude.md` is flagged, never renamed.

Fix any warning or failure it can't auto-fix before you go on:
- **Not initialized.** Run `git submodule update --init --recursive`.
- **Local modifications.** Run `git -C skills checkout .` to restore a clean state.
- **Spec failures.** Tell the user. The submodule is likely corrupted. Re-sync.

After `check` auto-fixes issues, stage and commit the changes:
```bash
git add skills .claude .agents
git commit -m "chore: auto-fix skills integration issues"
```

**Important:** Commit `.claude/skills/` and `.agents/skills/` to the repo. Don't just create them locally. Without them
in version control, other developers and CI environments won't find the skills.

### Rules

1. **AGENTS.md is the only agent instructions file.** Codex and Claude Code both read it. Never create `CLAUDE.md` (in
   any case). Run `./skills/bin/manage.sh check` to verify: check #12 fails if a `CLAUDE.md` exists.
2. **Zero failing tests.** All tests must pass before you commit. No exceptions: fix even failures that were already
   there. Never ignore them.

### How Skills Are Discovered

Agents find skills in two places:

- **Claude Code** scans `.claude/skills/<name>/SKILL.md`: full skill directories (with `references/`, `scripts/`,
  `assets/`).
- **Codex** scans `.agents/skills/<name>/SKILL.md`: full skill directories (same structure).

Each skill at `skills/skills/<name>/` is copied in full to both `.claude/skills/<name>/` and `.agents/skills/<name>/`.
The whole directory comes along, so relative references (e.g. `references/components.md`) still resolve.

These directories **must be committed to version control**, so every clone has them. The `install`, `sync` and `link`
commands create and maintain them.

To use a skill:

1. Read `skills/skills/<skill-name>/SKILL.md` for step-by-step instructions.
2. Load any extra files from `skills/skills/<skill-name>/references/` when you need them.
3. Follow the skill's instructions to finish the task.

### Skill Version Reporting

When you run a skill, end your output with a version summary, so the user can confirm you use the latest version. Take
`metadata.version` from the local `SKILL.md` frontmatter, then compare it with upstream `main`:

```bash
# Get the upstream version (origin/main is kept fresh by the SessionStart hook)
git -C skills show origin/main:skills/<skill-name>/SKILL.md 2>/dev/null | sed -n '/^---$/,/^---$/p' | grep 'version:'
```

Print the summary in this format:

```
Skill: <skill-name> | Local: <local-version> | Latest: <upstream-version>
```

If the versions match, add `(up to date)`. If they differ, add `(update available — run ./skills/bin/manage.sh sync)`.
If you can't fetch the upstream version (offline), add `(upstream check skipped — offline)`.

### Available Skills

Skills are found in `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex). Only skills that are not excluded and
not internal appear there.

To see which skills are available:

```bash
ls .claude/skills/
# or
./skills/bin/manage.sh status
```

Each skill has a `SKILL.md` with instructions. Read it at `skills/skills/<name>/SKILL.md` (or
`.claude/skills/<name>/SKILL.md`).

### Keeping Skills Up to Date

When the user asks to update skills, or `check` says the submodule is behind:

```bash
./skills/bin/manage.sh sync
git add skills .claude/skills .agents/skills
git commit -m "chore: sync skills submodule to latest main"
```

### Contributing Skill Improvements

If you find a gap, an error or a better approach in any skill while working here, improve it upstream. Don't work
around it locally. Write the change in the house style of the `skill-writing` skill.

1. `cd skills` to enter the submodule.
2. `git checkout -b improve/<skill-name>-<brief-description>`
3. Edit `skills/<skill-name>/SKILL.md` or its reference files.
4. `git add <files> && git commit -m "improve(<skill-name>): <what and why>"`
5. Try `git push -u origin improve/<skill-name>-<brief-description>`.
6. **If the push succeeds:** give the user a link to create the PR:
   `https://github.com/astrojams1/skills/compare/main...improve/<skill-name>-<brief-description>`
7. **If the push fails** (403 or permission denied): tell the user the branch name and what it contains. Ask them to
   push from a local checkout of `astrojams1/skills` and open the PR.
8. Return to the consumer project: `cd ..`

After the PR merges, sync this project:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```
