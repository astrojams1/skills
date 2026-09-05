# Run 2026-09-05-world-sim-cheap-world-model

- repo: `world-sim`  slug: `cheap-world-model`  paper dir: `/home/claude/world-sim/paper/cheap-world-model`
- started: 2026-09-05T21:38:05+00:00  closed: 2026-09-05T23:15:50+00:00
- skill version: 0.1.0
- outcome: PDF delivered (18 pp, strict build, 50 resolved refs, arXiv bundle); world-sim branch paper/cheap-world-model; skill v0.2.0

## Stages

| # | stage | started (UTC) | tokens | method | notes |
|---|---|---|---|---|---|
| 0 | Set up | 21:38 | 754 | counter |  |
| 1 | Understand project | 21:38 | 10611 | counter | Code/bench reading was done before the ledger existed: 31k tokens measured by hand (counter 14952057 -> 14921027); this stage's counted tokens cover writing the artifact only |
| 2 | Research question | 21:39 | 1315 | counter |  |
| 3 | Results & contributions | 21:39 | 1958 | counter |  |
| 4 | Literature | 21:40 | 48155 | counter | Subagent tokens (not in the counter deltas): lit-A 158k, lit-B 134k, lit-C 138k |
| 5 | Novelty / closest prior work | 22:20 | 3111 | counter |  |
| 6 | Thesis | 22:21 | 3103 | counter | stages 6-12 written together into 05-decisions.md |
| 13 | Missing experiments | 22:21 | 32771 | counter | stages 13-14 combined: re-analysis of 48 result files + offline pipeline ablation |
| 15 | Outline | 22:29 | 23546 | counter | offline runs continue in background during outline |
| 16 | Draft | 22:34 | 18370 | counter |  |
| 17 | Scientific review | 22:36 | 87657 | counter | stages 17+18 reviews run in parallel subagents; Subagent tokens: scientific review 169k, writing review 141k, proofread 141k |
| 19 | Submission checks | 23:06 | 25748 | counter | reviews answered; test set added (95.3 vs 99.5) — the review changed the paper's headline |
| 20 | Close | 23:15 | 1655 | counter | skill bumped to 0.2.0 during close |

**Total tokens (counted stages): 258,754**

## Issues

| stage | issue | proposed fix |
|---|---|---|
| 4 | Semantic Scholar API returned 429 on the first query (no key); only arXiv API usable without a key | Add arxiv_search.py to the skill (done in this run); document that S2 needs an API key or 1 req/s backoff |
| 4 | arXiv export API returned 429/timeouts for ~10 min during theme-C subagent; it fell back to scraping arxiv.org/search for discovery, then resolved via API | arxiv_search.py: add retry with exponential backoff and an arxiv.org/search HTML fallback |
| 4 | WebFetch was rate-limited for subagents; they used curl on arxiv.org/html instead | Document curl on arxiv.org/html/<id> as the primary full-text route in literature.md |
| 14 | Headless Chromium WebGL context went black after ~14 renders in one page: 18 of 60 rooms rendered black and the offline pipeline crashed on them | render_rooms.mjs reloads the page every 6 seeds and fails on tiny JPEGs; the skill's stages.md should say: validate generated inputs (size/blankness) before running experiments on them |
| 16 | lmodern.sty missing from the sandbox TeX Live; first build failed | build.sh: check kpsewhich for the template's packages before building and print the apt/tlmgr package to install (lmodern -> apt install lmodern) |
| 16 | A bib title contained a raw '&' (MegaPose) and broke the build | arxiv_bib.py now TeX-escapes & % # in titles (done) |
| 19 | check_refs resolved DOIs via doi.org, which returns 202/blocks for IEEE; three valid DOIs failed | resolve DOIs through api.crossref.org (done) |

## Totals (hand-added at close)

Orchestrator context: 258,754 counted + ~31,000 pre-ledger reading ≈ 290k tokens. Subagents: 3 literature
(430k) + 2 reviews (310k) + 1 proofread (141k) ≈ 881k. Whole run ≈ 1.17 M tokens, ~1 h 40 min wall clock,
$0 API spend (offline experiments only). Most expensive stages: the two reviews and their responses (stage
17–19 block, ~113k orchestrator + 451k subagent), literature (48k + 430k), experiments (33k).
