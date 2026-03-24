# Agent Instructions Template

Copy the section below into **both** `CLAUDE.md` and `AGENTS.md` in the target project. Keep both files byte-for-byte identical.

---

## Skills

This project uses the `skills/` submodule from [astrojams1/skills](https://github.com/astrojams1/skills).

### Session Start

**Claude Code:** The skills submodule is automatically initialized and synced at session start via a `SessionStart` hook in `.claude/settings.json`. This runs before the first turn to: (1) initialize the submodule to the recorded pointer, (2) best-effort fetch and update to the latest upstream `main` (silently skipped if offline), and (3) refresh skill discovery directories. This means skills are always up-to-date when a new session starts, with no manual sync required.

**Codex:** Run `git submodule update --init --recursive && ./skills/bin/manage.sh check` at the start of each session. The submodule update ensures you run the latest manage.sh before check verifies integrity and auto-fixes any issues.

Run `./skills/bin/manage.sh check` to verify integrity. The `check` command auto-fixes missing or stale skill directories and stale hooks in place, so most issues self-heal without intervention.

```bash
./skills/bin/manage.sh check
```

The `check` command auto-fixes most issues it detects:
- **Behind upstream** — automatically syncs the submodule to latest upstream main
- **Missing/stale discovery dirs** — automatically refreshes `.claude/skills/` and `.agents/skills/`
- **Stale hooks** — automatically migrates to the current hook format
- **Stale lowercase files** — automatically removes `claude.md`/`agents.md` if uppercase versions exist

If `check` reports warnings or failures that it cannot auto-fix, address them before proceeding:
- **Not initialized** — run `git submodule update --init --recursive`
- **Local modifications** — run `git -C skills checkout .` to restore clean state
- **Spec failures** — report to the user, likely a corrupted submodule; re-sync

After `check` auto-fixes issues, stage and commit the changes:
```bash
git add skills .claude .agents
git commit -m "chore: auto-fix skills integration issues"
```

**Important:** `.claude/skills/` and `.agents/skills/` directories must be committed to the repo, not just created locally. If these directories are missing from version control, other developers and CI environments will not discover skills.

### Rules

1. **CLAUDE.md and AGENTS.md must always be byte-for-byte identical.** Both files serve the same purpose for different AI agents. Any edit to one must be applied to the other. Run `./skills/bin/manage.sh check` to verify (check #12 detects divergence).
2. **Zero failing tests.** All tests must pass before committing. No exceptions — even pre-existing failures must be fixed, not ignored.

### How Skills Are Discovered

Skills are exposed to agents via two discovery paths:

- **Claude Code** scans `.claude/skills/<name>/SKILL.md` — full skill directories (including `references/`, `scripts/`, `assets/`)
- **Codex** scans `.agents/skills/<name>/SKILL.md` — full skill directories (same structure)

Each skill at `skills/skills/<name>/` is copied in full to both `.claude/skills/<name>/` and `.agents/skills/<name>/`. This preserves the complete directory structure so relative references (e.g., `references/components.md`) resolve correctly.

These directories **must be committed to version control** so that every clone has them. The `install`, `sync`, and `link` commands create and maintain these directories automatically.

1. Read `skills/skills/<skill-name>/SKILL.md` for step-by-step instructions
2. Load any supplementary files from `skills/skills/<skill-name>/references/` on demand
3. Follow the skill's instructions to complete the task

### Skill Version Reporting

When you run a skill, include a version summary at the end of your output so the user can confirm you're using the latest version. Extract the `metadata.version` from the local `SKILL.md` frontmatter, then compare it against upstream `main`:

```bash
# Get the upstream version (origin/main is kept fresh by the SessionStart hook)
git -C skills show origin/main:skills/<skill-name>/SKILL.md 2>/dev/null | sed -n '/^---$/,/^---$/p' | grep 'version:'
```

Print the version summary in this format:

```
Skill: <skill-name> | Local: <local-version> | Latest: <upstream-version>
```

If the versions match, append `(up to date)`. If they differ, append `(update available — run ./skills/bin/manage.sh sync)`. If the upstream version cannot be fetched (offline), append `(upstream check skipped — offline)`.

### Available Skills

Skills are discovered from `.claude/skills/` (Claude Code) and `.agents/skills/` (Codex). Only non-excluded, non-internal skills appear in these directories.

To see which skills are available:

```bash
ls .claude/skills/
# or
./skills/bin/manage.sh status
```

Each skill has a `SKILL.md` with instructions. Read it at `skills/skills/<name>/SKILL.md` (or `.claude/skills/<name>/SKILL.md`).

### Keeping Skills Up to Date

When the user asks to update skills, or when `check` reports the submodule is behind:

```bash
./skills/bin/manage.sh sync
git add skills .claude/skills .agents/skills
git commit -m "chore: sync skills submodule to latest main"
```

### Contributing Skill Improvements

If you discover a gap, error, or better approach in any skill while working here, improve it upstream rather than working around it locally:

1. `cd skills` — enter the submodule
2. `git checkout -b improve/<skill-name>-<brief-description>`
3. Edit `skills/<skill-name>/SKILL.md` or its reference files
4. `git add <files> && git commit -m "improve(<skill-name>): <what and why>"`
5. Attempt `git push -u origin improve/<skill-name>-<brief-description>`
6. **If push succeeds:** give the user a link to create the PR:
   `https://github.com/astrojams1/skills/compare/main...improve/<skill-name>-<brief-description>`
7. **If push fails** (403 / permission denied): tell the user the branch name and what it contains, and ask them to push from a local checkout of `astrojams1/skills` and open the PR
8. Return to the consumer project: `cd ..`

After the PR merges, sync this project:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```
