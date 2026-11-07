# Repository notes

What earlier runs learned. The repository's own `AGENTS.md` wins if they differ.

## astrojams1/space-worms-2

- Merge directly with a merge commit. GitHub auto-merge is not used.
- The `merge-when-green` label starts the full Verify suite. Ordinary PR checks are
  not enough. Each full run costs CI time, so don't start one for a PR you may close.
- It merges only what measures better. A rig or latency change without a measured
  gain waits or closes.
- A cost raise needs the owner's explicit approval, even when the PR is ready.
- Merges to `main` start Deploy CF Production by themselves. Check how it ended.
- `local-skills/*/LEDGER.md` rows conflict often. Renumber the incoming row.
- Staging and load-test PRs are marked never-merge and stay open.

## astrojams1/skills

- The only PR check is a Vercel preview. Run the tests locally on Node 22, on the merged result.
  `tests/test_skills_spec.py` is a plain script, not a pytest file.
- After a skill changes, run `bash bin/manage.sh link`, then commit the regenerated
  `.claude/skills/` and `.agents/skills/` copies. Bump the skill's `metadata.version`.
- A public repository: check that a PR carries no personal data before merging.

## astrojams1/cleanstreets

- Skill versions in `.claude/skills/` move forward when a PR is brought up to date.
