---
name: research-paper
description: Generate a submission-ready research paper (arXiv-style LaTeX + PDF) end to end from a code repository. Understand the project, infer the research question, mine results, search the literature, establish novelty, pick a defensible thesis, paper type, audience, venue, scope, math level and style, find and run missing experiments, outline, draft, review scientifically and editorially, and run submission checks, while keeping a self-improvement ledger of tokens and issues per stage. Use whenever the user wants a paper, preprint, arXiv submission, technical report, or "write up this repo/project as a paper", even if they only say "paper" or "publish this".
metadata:
  version: "0.3.0"
  ledger: ledger/LEDGER.md
---

# Research paper

**Turn a repository into a paper a careful reviewer would accept as honest, novel and reproducible.** Each stage
writes one artifact file, the only input besides the repo that the next stage may rely on. The ledger records what
each stage cost and what went wrong, so the pipeline is resumable and improves from one repo to the next.

Done means: the PDF passes the strict build and the submission checks. Every number in it traces to a file, and the
run is closed in the ledger.

## Where things are

| What | Where |
|---|---|
| The playbook for every stage: what to read, decide and write, and the gate | [references/stages.md](references/stages.md) |
| Option menus for stages 7 to 12 | [references/decisions.md](references/decisions.md) |
| Literature search protocol | [references/literature.md](references/literature.md) |
| Review rubrics A and B, and checklist C | [references/reviews.md](references/reviews.md) |
| LaTeX template | `assets/template/` |
| Scripts | `scripts/` (`ledger.py`, `arxiv_search.py`, `arxiv_bib.py`, `check_refs.py`, `build.sh`, `bundle.sh`) |
| The skill's history: versions, runs, open issues | [ledger/LEDGER.md](ledger/LEDGER.md). Read its **Open issues** (known weak spots and workarounds) first |

Everything for one paper lives in the target repo under `paper/<slug>/`. The slug is a short kebab-case name for the
thesis.

```
paper/<slug>/
  00-understanding.md      stage 1
  01-research-question.md  stage 2
  02-contributions.md      stage 3
  03-literature.md         stage 4; refs.bib alongside
  04-novelty.md            stage 5
  05-decisions.md          stages 6 to 12
  06-experiments.md        stages 13 and 14; raw outputs in experiments/
  07-outline.md            stage 15
  main.tex, refs.bib, figures/, tables/, build/  (the paper itself)
  08-review-scientific.md  stage 17
  09-review-writing.md     stage 18
  10-submission-checks.md  stage 19
  README.md                how to rebuild the PDF; pointer to the ledger run
```

The skill's ledger (`ledger/LEDGER.md`, `ledger/runs/<run-id>.md`) lives with the skill, never in the target repo, so
one ledger grows across every repo.

## A run

Run the stages in order. Don't skip one because it "seems obvious": skipping the cheap ones (question, contributions,
novelty) makes papers overclaim. A review finding may send you back to 06 or 07. Log each re-entry in the run log.

0. **Set up.** Run `python3 scripts/ledger.py start --repo <name> --slug <slug> --paper-dir <path>`. It creates the
   run log and scaffolds `paper/<slug>/`. Note the token counter (see [Records](#records)). Ask the user only what
   the repo can't tell you. That is the author line, whether experiments may be run (API keys, budget), and where
   to commit the paper. Decide everything else yourself, and write it down.
1. **Understand the project deeply.** Read the README, docs, entry points, the core algorithm files in full, the
   evaluation code, and every results file. Write `00-understanding.md`. Gate: you can state from memory what is
   measured, how, on what data, and where each headline number comes from.
2. **Infer the research question.** What question would this work answer? Write the strongest candidate and two
   alternatives, and say which the evidence supports. Gate: the question is falsifiable.
3. **Find results and contributions.** Mine the repo for every result: benchmark tables, histories, ablations hidden
   in changelogs, failure analyses, negative results. Give each contribution an evidence pointer. Gate: no
   contribution without evidence in the repo or produced in stage 13.
4. **Search the literature.** Follow [references/literature.md](references/literature.md). Use
   `scripts/arxiv_search.py` for queries and `scripts/arxiv_bib.py` for BibTeX. Search the field, the method
   family, the application and the benchmark style. Keep a search log, and write an annotated list.
   - Run theme subagents in parallel when the harness offers them. Each gets a seed id list, snowballs, and writes
     `notes-<theme>.md` and `refs-<theme>.bib`.
   - Every entry in `refs.bib` must come from a resolved record (arXiv id or DOI). Never from memory.
5. **Find the closest prior work.** Pick the 3-8 closest works. For each, state what is the same and what is
   different. Write the novelty claim, and the sentence a hostile reviewer would write against it.
6. **Choose the strongest defensible thesis.** The thesis is the one-sentence claim the whole paper defends. Prefer a
   narrower claim fully backed by evidence over a broader one that needs a caveat.
7. **Choose the paper type.** Systems, method, benchmark, empirical study, negative result, position, or short
   report. See [references/decisions.md](references/decisions.md).
8. **Choose the audience.** Name the reviewer community (for example robotics perception, LLM agents, CV). It sets
   the vocabulary, the baselines you owe them, and what needs explaining.
9. **Choose the venue.** Pick the arXiv category (primary and cross-lists). Add the workshop or conference whose
   format the paper should match, if any. Record the format limits.
10. **Choose scope and length.** Say what is in, what is out (explicitly), and the target page count.
11. **Choose the math.** Use notation only where it removes ambiguity. Give the formal objects the audience expects
    (problem statement, scoring function, complexity), and nothing decorative.
12. **Choose the writing style.** Voice, tense, density, figure style. Record it so the reviews can check against it.
13. **Find missing experiments.** For each claim in the outline, ask what a reviewer would demand: baselines,
    ablations, held-out sets, variance, cost breakdowns, failure analysis. Mark each one *runnable here*, *runnable
    by the user* (write the exact command), or *out of scope* (say why).
14. **Run or recommend experiments.** Run what you can without spending the user's money, unless they said
    otherwise. Save raw outputs under `paper/<slug>/experiments/`. Write recommendations for the rest. Two
    experiments are required whenever evaluation is free (deterministic code, no API):
    - **A fresh test set** the tuning loop never saw, with ≥100 instances and a bootstrap CI. Repos often report
      tuned-set numbers as if they generalised.
    - **An evaluated-code check.** Run the exact commit that produced each headline number, not HEAD, and say so in
      the paper.
15. **Build the evidence-backed outline.** List every section, every paragraph's job, and every figure or table with
    the data file it comes from. Gate: no claim in the outline lacks a pointer.
16. **Draft.** Write LaTeX from `assets/template/`. Make figures and tables from data with scripts committed under
    `paper/<slug>/scripts/`, never by typing numbers. Build with `scripts/build.sh` after every major section.
    Include a limitations section, and an AI-assistance disclosure if AI tools were used.
17. **Scientific review.** Spawn a fresh-context reviewer subagent with rubric A from
    [references/reviews.md](references/reviews.md). Fix or rebut every point in writing in
    `08-review-scientific.md`.
18. **Writing review.** Spawn a fresh-context editor with rubric B. Do the same in `09-review-writing.md`.
19. **Submission checks.** Run `python3 scripts/check_refs.py <dir> --resolve`, then
    `scripts/build.sh <dir> --strict`, then `scripts/bundle.sh <dir>` (clean-directory build and arXiv tarball).
    Then run a fresh-context proofread subagent and checklist C in [references/reviews.md](references/reviews.md).
    Record pass or fail in `10-submission-checks.md`.
20. **Close the run.** Run `python3 scripts/ledger.py close`. Fill the run log's issues and totals. Add any new open
    issue to `LEDGER.md`. Bump the skill version if the skill itself changed. Deliver the PDF.

## Rules

- **Trace every number.** A number in the paper must trace to a file in the repo or in `paper/<slug>/experiments/`.
- **Name tuning loops.** Results from an agentic tuning loop are still results. Say so, and say what protected the
  held-out set.
- **Scope to the evidence.** If the only evidence for a claim is the authors' own benchmark, the thesis is about that
  benchmark.
- **Say what cost and time include:** API list prices, sandbox sessions, wall clock.
- **Cite only resolved references.** Delete a citation you can't resolve. Never "fix" it from memory.
- **Disclose AI help** in writing or in producing the artifact, when it happened.
- **Use fresh eyes for reviews.** The two reviewers must not have seen the drafting. Give each subagent the artifact
  files and the rubric by path, and ask for a written report file, never a chat-only answer.

## Gotchas

- **Run scripts from the source copy (2026-09-05).** Use `skills/research-paper/scripts/` in the skills repo, never
  a `.claude/skills/` discovery copy. `ledger.py` writes next to itself, so a copy gets its own ledger. Re-run
  `bin/manage.sh link` after a run so the copies carry the updated ledger.
- **Validate generated inputs (2026-09-05).** Check image blankness, file sizes and counts before running on them. A
  headless WebGL context once went black mid-batch, silently spoiling 18 of 60 rooms.
- **Check TeX packages first (2026-09-05).** Run `kpsewhich lmodern.sty …` before the first build. The sandbox lacked
  `lmodern`. Fix: `apt-get install lmodern`, then `mktexlsr`.
- **Escape `&` in titles (2026-09-05).** arXiv titles can contain `&`. `arxiv_bib.py` escapes them. Hand-written
  entries must too.
- **APIs rate-limit (2026-09-05).** Semantic Scholar rate-limits unkeyed clients at once. arXiv's export API returns
  429 after bursts, so the scripts sleep 3 s between calls. `arxiv.org/html/<id>` fetched with curl is the reliable
  full-text route.
- **Resolve DOIs through `api.crossref.org` (2026-09-05),** not `doi.org`. Publisher redirects return 202 or 403
  through proxies.
- **"Held-out" is usually a validation set (2026-09-05).** Read every row of a repo's tuning log for the words
  "held-out" and "kept". If changes were kept or designed on it, say so and build a real test set.
- **HEAD is often not the record's code (2026-09-05).** Compare `git log -- <file>` with the run timestamps.
- **Agent-written repos hide their best record (2026-09-05).** It sits in changelogs, benchmark logs and PR
  descriptions, not the README. Read `git log -p` on the log files.
- **Describe the real protocol (2026-09-05).** Reviewers care about "confirmed by a second run" style protocols.
  Describe the protocol the repo actually used, not the one a paper usually has.
- **Memory makes wrong citations (2026-09-05).** `check_refs` fails the build on any bib entry without an `eprint` or
  `doi` that resolved in stage 4.
- **Cheap ablations hide (2026-09-05).** Stage 13 often finds that the strongest ablation is cheap, for example
  running the classical part of a pipeline without the model. Look for offline-runnable ablations before you call an
  experiment out of scope.
- **Keep `05-decisions.md` open while drafting (2026-09-05).** Drift from the chosen audience or scope is the most
  common writing-review finding.

## Records

**Token accounting** shows which stages are expensive, so consistency matters more than precision. At each stage
boundary, run `python3 scripts/ledger.py stage <n> --tokens-left <N>`. `N` is the harness's
remaining-token counter, if tool results show one (Claude Code shows `<total_tokens>N tokens left`). The script
stores the deltas. With no counter, pass `--estimate` and report the bytes read and written
(`--bytes-in --bytes-out`, from `wc -c`). The script counts 4 bytes per token. Never guess a number silently.

**Issue logging.** Log an issue at once whenever something slows you down, misleads you or forces a workaround. Count
a missing tool, a stage that didn't fit the repo, or a review point the skill should have caught. Run
`python3 scripts/ledger.py issue --stage <n> "<what happened>" --fix "<what would prevent it>"`. Issues shape the
next version.

Versions, runs and open issues go in [ledger/LEDGER.md](ledger/LEDGER.md). Append rows; never rewrite them.
