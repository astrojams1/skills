# research-paper — ledger

The skill's own record: what changed, what each run cost, what went wrong. Read **Open issues** before every
run. Maintained by `scripts/ledger.py` (runs table) and by hand (versions, issues).

## Versions

| version | date | change | why |
|---|---|---|---|
| 0.1.0 | 2026-09-05 | Initial skill: 20-stage pipeline, ledger with per-stage token accounting, reference resolver, strict build, review rubrics, arXiv checklist. | First paper: world-sim → "cheap world model without training". |
| 0.2.0 | 2026-09-05 | Added `arxiv_search.py`, `arxiv_bib.py` (TeX-escaped titles), `bundle.sh` (clean-dir build + arXiv tarball); `check_refs.py` resolves DOIs via Crossref; stage 13/14 mandatory fresh test set + exact-commit re-run; 8 gotchas. (This row originally also claimed rubric A items 12–15; they were not written until 0.3.0.) | Run 1 issues: the scientific review found the "held-out" set was selected on and the released code differed from the evaluated code; a fresh test set moved the headline from 99.6 to 95.3. |
| 0.3.0 | 2026-09-06 | Thesis is provisional until stage 14; **thesis re-check gate** after stage 14 (subject of thesis/title/abstract must be the component the ablations credit; a zero-contribution headline component is a change of subject, not a caveat); subject test in stage 6 and `decisions.md`; stage 17 response rule (retitle, do not reword); rubric A items 12–15 actually written (subject vs attribution, guard-set selection, evaluated commit, constant provenance); rubric B item 11 (subject consistency); honesty rule and gotcha. | Run 2 (revision of run 1's paper): the author found the paper's subject — a cheap VLM producing a world model — contradicted by its own ablation (helper alone reproduces every answer; VLM contribution exactly 0 from iteration 15). Nothing in the skill re-tested the stage 6 thesis after stage 14, and the review's "retitle" option was declined in favour of rewording. |

## Runs

<!-- RUNS:START -->
| run | date | repo | paper | stages | tokens | issues | outcome |
|---|---|---|---|---|---|---|---|
| [2026-09-05-world-sim-cheap-world-model](runs/2026-09-05-world-sim-cheap-world-model.md) | 2026-09-05 | world-sim | cheap-world-model | 13/21 | 258,754 | 7 | PDF delivered (18 pp, strict build, 50 resolved refs, arXiv bundle); world-sim branch paper/cheap-world-model; skill v0.2.0 |
| [2026-09-06-world-sim-cheap-world-model](runs/2026-09-06-world-sim-cheap-world-model.md) | 2026-09-06 | world-sim | cheap-world-model | 3/21 | 57,798 | 3 | in progress |
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
| 4 | run 1 | 17 | The reviewer, not the skill, discovered guard-set contamination and code-version drift | stage 13 mandates the fresh set and exact-commit re-run (0.2.0); rubric items 13–15 written in 0.3.0 (0.2.0 claimed them but did not contain them) — verify in run 3 that the drafting stages catch it before review | open |
| 6 | run 1 | 20 | `git push` refused: the session's git proxy had read but no push credential for either repo; delivered branches as `git bundle` files instead | stage 0: test push access (`git push --dry-run`) before promising to push; keep bundle delivery as the fallback | open |
| 5 | run 1 | 0 | Token accounting: stage 1's reading happened before the ledger existed; per-stage counts include subagent tokens only when noted | start the ledger before reading anything; log subagent token usage (`<usage>` blocks) into the run notes | open |
| 7 | run 2 | 6, 14, 17 | Thesis-subject inversion: the thesis was fixed at stage 6 around the VLM, stage 14's ablation credited the deterministic helper with all of the accuracy, and no gate re-opened the thesis; the review's "retitle" option was declined for a rewording; the paper shipped with the wrong subject and the author caught it after merge | stage 14 thesis re-check gate, stage 6 subject test, rubric A item 12, rubric B item 11, stage 17 response rule (all 0.3.0) — verify in run 3 that the gate fires before the outline | fixed in 0.3.0; verify |
| 8 | run 2 | 20 | The close stage wrote a version row describing rubric items that were never added to the file | at close, `git diff` the skill files and write the version row from the diff, not from intent | open |

## Improvement backlog

Ideas not yet tried, in priority order.

1. Add an `evals/` set (2-3 repos with known-good papers) so skill changes can be A/B tested per skill-creator.
0. ~~Split the drafting stage: a "claims audit" pass between outline and draft~~ — partly done in 0.3.0 as the stage 14 thesis re-check gate (items 1, 6, 12). A fuller claims audit of the outline against rubric A items 4, 13–15 is still open.
2. Script the per-instance error taxonomy for benchmark result files (common stage-14 re-analysis).
3. A figure-style file (`assets/mplstyle`) so figures match across papers.
