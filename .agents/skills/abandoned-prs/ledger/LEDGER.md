# abandoned-prs: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-run facts live in
`/Volumes/ssd/projects/abandoned-prs/reports/` and the owner's activity ledger, never here.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-07 | Initial skill: discovery buckets, saved decisions, triage rules, repository notes | The owner asked for the first manual cleanup (8 merged, 6 closed) to run every week |
| 1.1.0 | 2026-11-10 | Discovery finds every open PR: `windowDays` is null, so PRs quiet for more than 30 days are no longer dropped | The owner asked that scheduled runs do all known work; the 30-day window hid the most abandoned PRs. The weekly task's stored prompt is now a pointer, written in the skill |

## Lessons

- 2026-11-07: Most abandoned PRs were worth finishing. All but one of the 8 merged needed conflicts fixed against `main`, and several had unanswered bot findings.
- 2026-11-07: A resolution script crashed and pushed conflict markers to a PR. Use `set -e` and a marker check before every push.
- 2026-11-07: Local Node 20 produced false test failures, and a PR comment wrongly blamed `main`. Use the repository's runtime before drawing conclusions.
- 2026-11-07: Close notes overstated what had reached `main`, and needed corrections. Check each claim at the moment of writing it.
- 2026-11-07: A scripted conflict fix relabelled a historic row. Read the resolved diff, not only the test result.
