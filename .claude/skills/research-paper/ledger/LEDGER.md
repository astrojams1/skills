# research-paper — ledger

The skill's own record: what changed, what each run cost, what went wrong. Read **Open issues** before every
run. Maintained by `scripts/ledger.py` (runs table) and by hand (versions, issues).

## Versions

| version | date | change | why |
|---|---|---|---|
| 0.1.0 | 2026-09-05 | Initial skill: 20-stage pipeline, ledger with per-stage token accounting, reference resolver, strict build, review rubrics, arXiv checklist. | First paper: world-sim → "cheap world model without training". |

## Runs

<!-- RUNS:START -->
| run | date | repo | paper | stages | tokens | issues | outcome |
|---|---|---|---|---|---|---|---|
<!-- RUNS:END -->

Per-run detail (stage-by-stage tokens, issues, notes) is in `runs/<run>.md`.

## Open issues

Known weaknesses of the skill, with the workaround used so far. Close an issue by changing the skill and
adding a version row.

| id | first seen | stage | issue | workaround / proposed fix | status |
|---|---|---|---|---|---|
| (none yet) | | | | | |

## Improvement backlog

Ideas not yet tried, in priority order.

1. Add an `evals/` set (2-3 repos with known-good papers) so skill changes can be A/B tested per skill-creator.
2. Script the per-instance error taxonomy for benchmark result files (common stage-14 re-analysis).
3. A figure-style file (`assets/mplstyle`) so figures match across papers.
