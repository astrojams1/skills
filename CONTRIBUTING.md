# Contributing

Contributions are welcome from both humans and AI agents. The goal is to keep skills accurate, concise, and useful across projects.

## Proposing Changes

1. Create a branch: `git checkout -b improve/<skill-name>-<brief-description>`
2. Make your changes (see guidelines below)
3. Validate: `make validate`
4. Commit: `git commit -m "improve(<skill-name>): <what changed and why>"`
5. Push and open a PR against `main`

## Skill Structure Guidelines

Every skill must follow the [Agent Skills specification](https://agentskills.io/specification):

- **Directory:** `skills/<skill-name>/` with a `SKILL.md` at the root
- **Name:** 1-64 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens, matches the directory name
- **Description:** 1-1024 chars in YAML frontmatter, describes what the skill does _and_ when to use it
- **Body:** Under 500 lines — move detailed reference material into `references/`
- **References:** One level deep (`references/foo.md`), no nested chains
- **Scripts (if any):** Place in `scripts/`, make self-contained (inline deps), support `--help`, use structured output, return meaningful exit codes

## For AI Agents

If you discover a gap, inaccuracy, or improvement opportunity while working in a project that uses this skills submodule:

1. `cd skills` — enter the submodule
2. `git checkout -b improve/<skill-name>-<brief-description>`
3. Edit the relevant `SKILL.md` or reference files
4. Run `make validate` to confirm compliance
5. `git add <files> && git commit -m "improve(<skill-name>): <what and why>"`
6. `git push -u origin improve/<skill-name>-<brief-description>`
7. Open a PR against `astrojams1/skills` main
8. Return to the parent project: `cd ..`

After the PR merges, sync the parent project:

```bash
./skills/bin/manage.sh sync
git add skills
git commit -m "chore: sync skills after upstream improvement"
```

## Keeping claude.md and agents.md in Sync

Both files must be byte-for-byte identical. After editing one, copy it to the other. Run `bash tests/test-identity.sh` to verify.

## Validation

Before submitting a PR, run:

```bash
make validate
```

This runs the spec validator, the identity check, and the manage.sh integration tests.
