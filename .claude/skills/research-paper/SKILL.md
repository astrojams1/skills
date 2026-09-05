---
name: research-paper
description: Generate a submission-ready research paper (arXiv-style LaTeX + PDF) end to end from a code repository — understand the project, infer the research question, mine results, search the literature, establish novelty, pick a defensible thesis, paper type, audience, venue, scope, math level and style, find and run missing experiments, outline, draft, review scientifically and editorially, and run submission checks — while keeping a self-improvement ledger of tokens and issues per stage. Use whenever the user wants a paper, preprint, arXiv submission, technical report, or "write up this repo/project as a paper", even if they only say "paper" or "publish this".
metadata:
  version: "0.2.0"
  ledger: ledger/LEDGER.md
---

# research-paper

Turn a repository into a paper a careful reviewer would accept as honest, novel and reproducible. The skill is
a staged pipeline: each stage writes one artifact file, each artifact is the only input the next stage may rely
on (plus the repo), and the ledger records what every stage cost and what went wrong. That structure is what
makes the pipeline resumable, auditable, and improvable across repos.

Two files to know before starting:

- `references/stages.md` — the playbook for every stage (what to read, what to decide, what to write, the gate).
- `ledger/LEDGER.md` — the skill's own history: versions, runs, open issues. Read the **Open issues** section
  first; it lists known weak spots of this skill and the workarounds found in earlier runs.

## Outputs

Everything for one paper lives in the target repo under `paper/<slug>/` (slug = short kebab-case thesis name):

```
paper/<slug>/
  00-understanding.md      what the project is, does, measures; where every number lives
  01-research-question.md  the question the repo actually answers (and the ones it does not)
  02-contributions.md      candidate results/contributions, each with the evidence file that backs it
  03-literature.md         search log + annotated closest prior work; refs.bib alongside
  04-novelty.md            novelty statement vs. the 3-8 closest works; what would kill the claim
  05-decisions.md          thesis, paper type, audience, venue, scope/length, math level, style
  06-experiments.md        missing experiments; which were run here (with results) and which are recommended
  07-outline.md            section-by-section outline; every claim mapped to a figure/table/file
  main.tex, refs.bib, figures/, tables/, build/  (the paper itself)
  08-review-scientific.md  reviewer report + what was changed in response
  09-review-writing.md     editorial report + what was changed
  10-submission-checks.md  arXiv checklist with pass/fail per item
  README.md                how to rebuild the PDF; pointer to the ledger run
```

The skill's own ledger lives with the skill (`ledger/LEDGER.md`, `ledger/runs/<run-id>.md`), never in the
target repo, so one ledger accumulates across every repo the skill is used on.

## Procedure

Run the stages in order. Do not skip a stage because it "seems obvious": the cheap stages (question,
contributions, novelty) are exactly the ones whose omission produces papers that overclaim. A stage may be
re-entered later (a review finding often sends you back to 06 or 07); log the re-entry in the run log.

0. **Set up.** `python3 scripts/ledger.py start --repo <name> --slug <slug> --paper-dir <path>` creates the run
   log and scaffolds `paper/<slug>/`. Note the token counter (see *Token accounting*). Confirm with the user
   only the things the repo cannot tell you: author line, whether experiments may be run (API keys, budget),
   and where the paper should be committed. Everything else is the skill's decision — make it and write it down.
1. **Understand the project deeply.** Read the README, docs, entry points, the core algorithm files in full, the
   evaluation code, and every results file. Write `00-understanding.md`. Gate: you can state, from memory,
   what is measured, how, on what data, and where each headline number comes from.
2. **Infer the research question.** What question would this work be the answer to? Write the strongest
   candidate and two alternatives, and say which the evidence supports. Gate: the question is falsifiable.
3. **Discover results and contributions.** Mine the repo for every result: benchmark tables, histories,
   ablations hidden in changelogs, failure analyses, negative results. Each contribution gets an evidence
   pointer. Gate: no contribution without evidence in the repo or produced in stage 13.
4. **Research the surrounding literature.** Follow `references/literature.md`; use `scripts/arxiv_search.py`
   for queries and `scripts/arxiv_bib.py` for BibTeX. Search broadly (the field, the method family, the
   application, the benchmark style), keep a search log, and write an annotated list. Theme subagents in
   parallel work well (each gets a seed id list, snowballs, writes `notes-<theme>.md` + `refs-<theme>.bib`).
   Every entry in `refs.bib` must come from a resolved record (arXiv id or DOI); never from memory.
5. **Determine novelty / closest prior work.** Pick the 3-8 closest works and state, per work, what is the same
   and what is different. Write the novelty claim and the sentence a hostile reviewer would write against it.
6. **Choose the strongest defensible thesis.** The thesis is the one-sentence claim the whole paper defends.
   Prefer a narrower claim fully backed by evidence over a broader one that needs a caveat. This is where
   "world's cheapest X" becomes "X at $0.03 and 22 s per instance with no training, on this benchmark".
7. **Choose paper type.** Systems / method / benchmark / empirical study / negative result / position / short
   report. See `references/decisions.md`.
8. **Choose audience.** The specific reviewer community (e.g. robotics perception, LLM agents, CV). It sets
   the vocabulary, the baselines you owe them, and what needs explaining.
9. **Choose target venue.** arXiv category (primary + cross-lists) and, if any, the workshop/conference whose
   format the paper should match. Record the format constraints.
10. **Choose scope and length.** What is in, what is out (explicitly), target pages.
11. **Choose mathematical treatment.** Notation only where it removes ambiguity; the formal objects the
    audience expects (problem statement, scoring function, complexity) and nothing decorative.
12. **Choose writing style.** Voice, tense, density, figure style. Record it so reviews can check against it.
13. **Determine missing experiments.** For each claim in the outline, ask what a reviewer would demand:
    baselines, ablations, held-out sets, variance, cost breakdowns, failure analysis. Classify each as
    *runnable here*, *runnable by the user* (write the exact command), or *out of scope* (say why).
14. **Run / recommend experiments.** Run what can be run without spending the user's money unless they said
    otherwise; save raw outputs under `paper/<slug>/experiments/`; write the recommendations for the rest.
    Two experiments are mandatory whenever evaluation is free (deterministic code, no API): a **fresh test
    set** the tuning loop never saw (≥100 instances, bootstrap CI) — repos routinely report tuned-set numbers
    as if they generalised — and an **evaluated-code check**: run the exact commit that produced each
    headline number, not HEAD, and say so in the paper.
15. **Construct the evidence-backed outline.** Every section, every paragraph's job, every figure/table with
    the data file it comes from. Gate: no claim in the outline lacks a pointer.
16. **Draft.** LaTeX from `assets/template/`. Generate figures and tables from data with scripts committed
    under `paper/<slug>/scripts/`, never by typing numbers. Build with `scripts/build.sh` after every major
    section. Include a limitations section and an AI-assistance disclosure if AI tools were used.
17. **Scientific review.** Spawn a fresh-context reviewer (subagent) with `references/reviews.md` rubric A.
    Fix or rebut every point in writing in `08-review-scientific.md`.
18. **Writing review.** Fresh-context editor with rubric B. Same discipline in `09-review-writing.md`.
19. **Submission checks.** `python3 scripts/check_refs.py <dir> --resolve`, `scripts/build.sh <dir> --strict`,
    `scripts/bundle.sh <dir>` (clean-directory build + arXiv tarball), a fresh-context proofread subagent, then
    the checklist in `references/reviews.md` section C. Record pass/fail in `10-submission-checks.md`.
20. **Close the run.** `python3 scripts/ledger.py close`, fill the run log's issues and totals, add any new
    open issue to `LEDGER.md`, bump the skill version if the skill itself was changed, deliver the PDF.

## Token accounting

The purpose is to learn which stages are expensive, so precision matters less than consistency. At each stage
boundary run `python3 scripts/ledger.py stage <n> --tokens-left <N>` where `N` is the harness's remaining-token
counter if one is visible in tool results (Claude Code shows `<total_tokens>N tokens left`); the script stores
the deltas. When no counter exists, pass `--estimate` and the script uses bytes read/written that you report
(`--bytes-in --bytes-out`, from `wc -c`) at 4 bytes/token. Never guess a number silently.

## Issue logging

Whenever something slows you down, misleads you, or forces a workaround — a missing tool, a stage whose
instructions did not fit the repo, a reviewer point the skill should have caught earlier — log it at once:
`python3 scripts/ledger.py issue --stage <n> "<what happened>" --fix "<what would prevent it>"`. Issues are
the raw material for the next version of the skill; an unlogged issue is lost.

## Subagents

Use fresh-context subagents for the two reviews (they must not have seen the drafting) and, when the harness
offers them, for parallel literature searches. Give each subagent the artifact files it needs by path, the
rubric by path, and ask for a written report file; never a chat-only answer.

## Honesty rules

- A number in the paper must trace to a file in the repo or in `paper/<slug>/experiments/`.
- Results produced by an agentic tuning loop are still results, but say so, and say what the held-out
  protection was.
- If the only evidence for a claim is the authors' own benchmark, the thesis is about that benchmark.
- Report cost and time with what they include (API list prices? sandbox sessions? wall clock?).
- Cite only resolved references; a citation you cannot resolve is deleted, not "fixed" from memory.
- Disclose AI assistance in writing or in producing the artifact when it happened.

## Gotchas

- Run the scripts from the skill's source copy (`skills/research-paper/scripts/` in the skills repo), never
  from a `.claude/skills/` discovery copy: `ledger.py` writes next to itself, so a copy gets its own ledger.
  Re-run `bin/manage.sh link` after a run so the copies carry the updated ledger.
- Validate generated experimental inputs before running on them (image blankness, file sizes, counts);
  a headless WebGL context went black mid-batch in run 1 and 18 of 60 rooms were silently wrong.
- Check TeX packages before the first build (`kpsewhich lmodern.sty …`); the sandbox lacked `lmodern`
  (fix: `apt-get install lmodern` then `mktexlsr`).
- Titles from arXiv metadata can contain `&`; `arxiv_bib.py` escapes them, hand-written entries must too.
- Semantic Scholar rate-limits unkeyed clients at once; arXiv's export API 429s after bursts — the scripts
  sleep 3 s between calls, and `arxiv.org/html/<id>` fetched with curl is the reliable full-text route.
- Resolve DOIs through `api.crossref.org`, not `doi.org` (publisher redirects return 202/403 through proxies).
- A "held-out" set in a repo's tuning log is usually a validation set: read every log row for the words
  "held-out" and "kept"; if changes were kept or designed on it, say so and build a real test set.
- A repo's HEAD is often not the code that produced its record; `git log -- <file>` against run timestamps.

- Repos written by agents keep their best experimental record in changelogs, benchmark logs and PR
  descriptions, not in the README. Read `git log -p` on the log files.
- "Confirmed by a second run" style protocols matter to reviewers; find and describe the protocol the repo
  actually used rather than the one a paper usually has.
- Literature search from memory produces plausible, wrong citations. The check_refs script fails the build
  on any bib entry without an `eprint`/`doi` that resolved during stage 4.
- LaTeX builds must be run; a draft that has never been compiled contains errors, always.
- Stage 13 tends to discover that the strongest ablation is cheap (e.g. run the classical part of a pipeline
  without the model); check for offline-runnable ablations before declaring an experiment out of scope.
- Keep `05-decisions.md` open while drafting: drift from the chosen audience/scope is the most common
  writing-review finding.
