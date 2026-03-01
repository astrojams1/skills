# Skills

Reusable AI agent skills following the [Agent Skills specification](https://agentskills.io/specification). Mount this repository as a git submodule to give any AI coding agent (Claude Code, Codex, etc.) access to a shared library of skills.

## Available Skills

| Skill | Description |
|-------|-------------|
| [design-system](skills/design-system/SKILL.md) | Apply the Architectural Minimalist design system — warm organic palette, sharp geometry, Tailwind CSS |
| [workflow-orchestration](skills/workflow-orchestration/SKILL.md) | Plan-first development, subagent strategy, verification gates, self-improvement loops |
| [skill-orchestrator](skills/skill-orchestrator/SKILL.md) | Wire any project to this skills repo via git submodule with automatic syncing |

## Quick Start

### Add to your project as a submodule

```bash
git submodule add https://github.com/astrojams1/skills.git skills
git config -f .gitmodules submodule.skills.branch main
git add .gitmodules skills
git commit -m "chore: add astrojams1/skills submodule"
```

### Configure your AI agent

Copy the bootstrap prompt from [`skills/skill-orchestrator/references/agent-instructions.md`](skills/skill-orchestrator/references/agent-instructions.md) into your project's `claude.md` (for Claude Code) or `agents.md` (for Codex). This tells the agent:

- Run `./skills/bin/manage.sh check` at session start and self-heal any issues
- Load skills on demand from `skills/skills/<name>/SKILL.md`
- Sync to latest with `./skills/bin/manage.sh sync`
- Contribute improvements back upstream via PR

### Clone a project that uses this submodule

```bash
git clone --recurse-submodules <repo-url>
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

## Keeping Skills Up to Date

From any project that has this submodule:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills submodule to latest main"
```

To auto-sync in CI, add a step like:

```yaml
# .github/workflows/sync-skills.yml
name: Sync skills submodule
on:
  schedule:
    - cron: '0 9 * * 1'  # weekly on Monday
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          fetch-depth: 0
      - run: |
          git submodule update --remote --merge skills
          if ! git diff --quiet skills; then
            git add skills
            git commit -m "chore: sync skills submodule to latest main"
            git push
          fi
```

## Development

### Repository structure

```
skills/
  <skill-name>/
    SKILL.md              # Frontmatter + concise instructions (< 500 lines)
    references/           # Detailed reference material loaded on demand
    scripts/              # Self-contained helper scripts (if needed)
bin/
  manage.sh               # CLI: install, check, sync, status
tests/
  test_skills_spec.py     # Agent Skills spec validator
  test-identity.sh        # Verify claude.md == agents.md
  test-manage.sh          # Integration tests for manage.sh
claude.md                 # AI agent instructions (Claude Code)
agents.md                 # AI agent instructions (Codex) — must be identical to claude.md
```

### Validate all skills

```bash
make validate
```

Or run the individual checks:

```bash
python3 tests/test_skills_spec.py   # Spec compliance
bash tests/test-identity.sh          # claude.md == agents.md
bash tests/test-manage.sh            # manage.sh integration
```

### Rules

1. **`claude.md` and `agents.md` must be byte-for-byte identical.** Run `bash tests/test-identity.sh` to verify.
2. **Skills follow the [Agent Skills spec](https://agentskills.io/specification).** Each skill is a directory under `skills/` with a `SKILL.md` containing valid YAML frontmatter.
3. **Skills are self-contained.** No cross-skill dependencies.
4. **Keep skills actionable.** Step-by-step instructions, not abstract documentation.
5. **Progressive disclosure.** `SKILL.md` < 500 lines; detailed material goes in `references/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose new skills or improvements — whether you're a human or an AI agent.
