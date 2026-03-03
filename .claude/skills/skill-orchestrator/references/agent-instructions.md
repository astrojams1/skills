# Agent Instructions Template

Copy the section below into **both** `CLAUDE.md` and `AGENTS.md` in the target project. Keep both files byte-for-byte identical.

---

## Skills

This project uses the `skills/` submodule from [astrojams1/skills](https://github.com/astrojams1/skills).

### Session Start

**Claude Code:** The skills submodule is automatically initialized at session start via a `SessionStart` hook in `.claude/settings.json`. This runs `ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd); git -C "$ROOT" submodule update --init --recursive && "$ROOT"/skills/bin/manage.sh link` before the first turn, which initializes the submodule **and** refreshes skill directories.

**Codex:** Run `./skills/bin/manage.sh check` at the start of each session to verify integrity and auto-fix any issues.

Run `./skills/bin/manage.sh check` to verify integrity. The `check` command auto-fixes missing or stale skill directories and stale hooks in place, so most issues self-heal without intervention.

```bash
./skills/bin/manage.sh check
```

If `check` reports warnings or failures that it cannot auto-fix, address them before proceeding:
- **Not initialized** — run `git submodule update --init --recursive`
- **Behind upstream** — run `./skills/bin/manage.sh sync` then `git add skills .claude .agents && git commit -m "chore: sync skills to latest"`
- **Local modifications** — run `git -C skills checkout .` to restore clean state
- **Spec failures** — report to the user, likely a corrupted submodule; re-sync

**Important:** `.claude/skills/` and `.agents/skills/` directories must be committed to the repo, not just created locally. If these directories are missing from version control, other developers and CI environments will not discover skills.

### How Skills Are Discovered

Skills are exposed to agents via two discovery paths:

- **Claude Code** scans `.claude/skills/<name>/SKILL.md` — full skill directories (including `references/`, `scripts/`, `assets/`)
- **Codex** scans `.agents/skills/<name>/SKILL.md` — full skill directories (same structure)

Each skill at `skills/skills/<name>/` is copied in full to both `.claude/skills/<name>/` and `.agents/skills/<name>/`. This preserves the complete directory structure so relative references (e.g., `references/components.md`) resolve correctly.

These directories **must be committed to version control** so that every clone has them. The `install`, `sync`, and `link` commands create and maintain these directories automatically.

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
git add skills .claude/skills .agents/skills
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
