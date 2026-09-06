# research-paper — ledger

The skill's own record: what changed, what each run cost, what went wrong. Read **Open issues** before every
run. Maintained by `scripts/ledger.py` (runs table) and by hand (versions, issues).

## Versions

| version | date | change | why |
|---|---|---|---|
| 0.1.0 | 2026-09-05 | Initial skill: 20-stage pipeline, ledger with per-stage token accounting, reference resolver, strict build, review rubrics, arXiv checklist. | First paper: world-sim → "cheap world model without training". |
| 0.2.0 | 2026-09-05 | Added `arxiv_search.py`, `arxiv_bib.py` (TeX-escaped titles), `bundle.sh` (clean-dir build + arXiv tarball); `check_refs.py` resolves DOIs via Crossref; rubric A items 12–15 (guard-set selection, evaluated commit, zero-contribution, constant provenance); stage 13/14 mandatory fresh test set + exact-commit re-run; 8 gotchas. | Run 1 issues: the scientific review found the "held-out" set was selected on and the released code differed from the evaluated code; a fresh test set moved the headline from 99.6 to 95.3. |

## Runs

<!-- RUNS:START -->
| run | date | repo | paper | stages | tokens | issues | outcome |
|---|---|---|---|---|---|---|---|
| [2026-09-05-world-sim-cheap-world-model](runs/2026-09-05-world-sim-cheap-world-model.md) | 2026-09-05 | world-sim | cheap-world-model | 13/21 | 258,754 | 7 | PDF delivered (18 pp, strict build, 50 resolved refs, arXiv bundle); world-sim branch paper/cheap-world-model; skill v0.2.0 |
<!-- RUNS:END -->

Per-run detail (stage-by-stage tokens, issues, notes) is in `runs/<run>.md`.

## Open issues

Known weaknesses of the skill, with the workaround used so far. Close an issue by changing the skill and
adding a version row.

| id | first seen | stage | issue | workaround / proposed fix | status |
|---|---|---|---|---|---|
| 1 | run 1 | 4 | Semantic Scholar unusable without a key; arXiv API bursts get 429 | scripts sleep 3 s; add an S2 key option and a search-page fallback to `arxiv_search.py` | open |
| 2 | run 1 | 14 | Headless WebGL went black mid-batch; inputs were not validated before the experiment | render script reloads every 6 seeds and rejects tiny images; generic "validate inputs" rule in stages.md; a reusable `validate_images.py` would be better | open |
| 3 | run 1 | 16 | Sandbox TeX Live lacked `lmodern` | gotcha; `build.sh` should `kpsewhich` the template's packages and name the apt package | open |
| 4 | run 1 | 17 | The reviewer, not the skill, discovered guard-set contamination and code-version drift | rubric items 12–15 added; stage 13 now mandates the fresh set and exact-commit re-run — verify in run 2 that the drafting stages catch it before review | open |
| 6 | run 1 | 20 | `git push` refused: the session's git proxy had read but no push credential for either repo; delivered branches as `git bundle` files instead | stage 0: test push access (`git push --dry-run`) before promising to push; keep bundle delivery as the fallback | open |
| 5 | run 1 | 0 | Token accounting: stage 1's reading happened before the ledger existed; per-stage counts include subagent tokens only when noted | start the ledger before reading anything; log subagent token usage (`<usage>` blocks) into the run notes | open |

## Improvement backlog

Ideas not yet tried, in priority order.

1. Add an `evals/` set (2-3 repos with known-good papers) so skill changes can be A/B tested per skill-creator.
0. Split the drafting stage: a "claims audit" pass between outline and draft that runs rubric A items 1, 4, 12–15 on the outline, so the review finds fewer structural problems (run 1's review forced a rewrite of the abstract, introduction and two sections).
2. Script the per-instance error taxonomy for benchmark result files (common stage-14 re-analysis).
3. A figure-style file (`assets/mplstyle`) so figures match across papers.
