# Agent Instructions Template

Copy the section below into **both** `claude.md` and `agents.md` in the target project. Keep both files byte-for-byte identical.

---

## Skills

This project uses the `skills/` submodule from [astrojams1/skills](https://github.com/astrojams1/skills).

### Session Start

The skills submodule is automatically initialized at session start via a `SessionStart` hook in `.claude/settings.json`. This runs `git submodule update --init --recursive` before the first turn, so skill symlinks are always resolved.

If skills aren't loading, verify integrity:

```bash
./skills/bin/manage.sh check
```

If `check` reports warnings or failures, fix them before proceeding:
- **Not initialized** — run `git submodule update --init --recursive`
- **Behind upstream** — run `./skills/bin/manage.sh sync` then `git add skills .claude && git commit -m "chore: sync skills to latest"`
- **Local modifications** — run `git -C skills checkout .` to restore clean state
- **Spec failures** — report to the user, likely a corrupted submodule; re-sync
- **Broken symlinks** — run `./skills/bin/manage.sh sync` to recreate `.claude/skills/` symlinks
- **Missing hook** — run `./skills/bin/manage.sh sync` to add the SessionStart hook

### How Skills Are Discovered

Skills are exposed to Claude Code via `.md` file symlinks in `.claude/skills/`. Each skill at `skills/skills/<name>/SKILL.md` has a corresponding symlink at `.claude/skills/<name>.md` pointing into the submodule. This lets Claude Code discover and invoke skills natively (via `/skill-name` or automatic invocation).

The `install` and `sync` commands create and maintain these symlinks automatically. To apply a skill manually:

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

When the user asks to update skills, or when `check` reports the submodule is behind:

```bash
./skills/bin/manage.sh sync
git add skills .claude/skills
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
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```
