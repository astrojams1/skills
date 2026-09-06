# Stage playbook

Each stage: inputs → work → artifact → gate. Artifact templates are given as headings; keep them, add under
them. Write artifacts as plain markdown with tables where they help; they are working documents, not prose.

## Stage 1 — Understand the project deeply → `00-understanding.md`

Read, in this order: README and any docs; the entry point(s); every file that implements the core idea, in
full (not skimmed — the paper's method section is written from these); the evaluation/scoring code; every
results file (JSON/CSV/logs) — load them programmatically and print summaries; changelogs, benchmark logs,
`git log` (commit messages and dates carry the experimental narrative).

Artifact headings:

```
# Understanding: <repo>
## One paragraph: what it is
## System / method (as implemented, with file:line pointers)
## Inputs the method receives, and what it is explicitly denied
## Evaluation: data, metric, protocol, noise handling
## Results inventory (table: result, value, file, how produced)
## Timeline and provenance (who/what produced the work, when; agentic loops; anti-cheat measures)
## Open questions the repo leaves
```

Gate: a results table where every row names a file. If a headline number in the README has no file, mark it
"unbacked" — it cannot appear in the paper.

## Stage 2 — Infer the research question → `01-research-question.md`

Write three candidate questions; for each, the evidence that would answer it and whether the repo has that
evidence. Choose one. Typical shapes: "Can X be done with Y under constraint Z?", "How much of capability C
comes from component A vs B?", "What is the cost/accuracy frontier of approach P on task T?".

Gate: the chosen question is falsifiable and the repo's evidence bears on it.

## Stage 3 — Discover results and contributions → `02-contributions.md`

List every candidate contribution (aim for 6-12, then prune to 3-5 for the paper): method components,
benchmark/protocol, empirical findings (including negative ones and failure taxonomies), cost/time analyses,
tooling. Table columns: contribution, evidence (file), strength (strong/medium/weak), reviewer objection.

Hidden-result sources: iteration histories (each row is an ablation), reverted attempts (negative results),
capacity/scaling ladders, per-instance failure notes, transcripts.

## Stage 4 — Literature → `03-literature.md` + `refs.bib`

Follow `literature.md`. Output: search log (query, source, date, hits kept), then an annotated bibliography
grouped by theme, 1-3 sentences each on relation to this work. 20-40 entries is typical for a full paper,
8-15 for a short report.

## Stage 5 — Novelty → `04-novelty.md`

```
## Closest prior work (3-8)
| work | same | different | threat to our claim |
## Novelty statement (2-3 sentences)
## The hostile reviewer's sentence
## What would falsify the novelty claim (a paper we might have missed; how we searched for it)
```

## Stage 6 — Thesis → `05-decisions.md` (section "Thesis")

One sentence. Test: every word is backed; removing any word weakens it; a reviewer can check it from the
paper's tables. Write two rejected broader versions and why they were rejected.

## Stages 7-12 — Type, audience, venue, scope, math, style → `05-decisions.md`

See `decisions.md` for the option menus. Record each decision with a one-line reason. The file is the contract
the reviews check against.

## Stage 13 — Missing experiments → `06-experiments.md`

For each outline claim (or contribution), list what a reviewer of the chosen audience would demand:

- baselines (naive, strong, and "the obvious cheap alternative")
- ablations (remove each component; vary the one knob the thesis depends on)
- generalisation (held-out set, distribution shift, scaling axis)
- variance (repeated runs, seeds, confidence intervals)
- cost/time breakdown (what dominates)
- failure analysis (taxonomy with counts)

Classify: **runnable here** (no cost, tools available), **runnable by user** (exact command, estimated cost,
expected effect on the paper), **out of scope** (reason; how the paper's wording avoids the claim).

Always in the "runnable here" list when the evaluated code is deterministic and free to run: a fresh test set
(new seeds/instances, ≥100, bootstrap CI), the exact-commit re-run of every headline number, the
"classical/tool part alone" ablation, and a table of the instances where the headline component actually
acted (cells > 1, retries, interventions) with the sign of its effect.

## Stage 14 — Run / recommend → `06-experiments.md` + `experiments/`

Run the "runnable here" items; store raw outputs and the script that produced them. Re-analysis of existing
result files counts as an experiment (per-instance error taxonomy, variance across repeated runs, cost curves).
Write a "Recommended runs" section the user can execute verbatim.

## Stage 15 — Outline → `07-outline.md`

Per section: purpose (one line), paragraphs (one line each, ending with the evidence pointer), figures/tables
(name, data file, script). Standard skeleton: Abstract; Introduction (problem, why hard, what we do, claims);
Related work; Problem / setup; Method; Experimental protocol; Results; Analysis (ablations, failures, cost);
Limitations; Conclusion; Appendix (prompts, full tables, reproducibility).

Gate: every paragraph line ends with a pointer or the marker `[no evidence — cut or hedge]`.

## Stage 16 — Draft → `main.tex`

- Copy `assets/template/` into `paper/<slug>/`. Fill metadata.
- Figures: matplotlib scripts under `paper/<slug>/scripts/`, output PDF to `figures/`. Tables: scripts write
  `tables/*.tex` included with `\input`. No hand-typed numbers in the body; if unavoidable, add a comment
  `% source: <file>` on the line.
- Abstract last. Introduction claims mirror the contributions list exactly.
- Method section from the code, with the actual algorithm (pseudocode if the audience expects it).
- Results state the protocol before the numbers; give variance where it exists.
- Limitations are specific ("the benchmark is synthetic, two colours, ≤12 objects"), not generic.
- Disclosure paragraph if AI tools produced code, results or text.
- Build after each section: `bash scripts/build.sh paper/<slug>`.

## Stage 17 — Scientific review → `08-review-scientific.md`

Subagent prompt (adapt paths):

```
You are a hostile but fair reviewer for <venue/audience>. Read paper/<slug>/main.tex (and the compiled
build/main.pdf if you can), 05-decisions.md, 02-contributions.md, 04-novelty.md. Apply rubric A in
<skill>/references/reviews.md. Write your report to paper/<slug>/08-review-scientific.md using the report
template there. Do not fix anything; report.
```

Then, below the report, add "## Response" with one entry per point: fixed (what changed) / rebutted (why) /
deferred (why acceptable). Re-run the gate of any earlier stage a point invalidates.

## Stage 18 — Writing review → `09-review-writing.md`

Same pattern with rubric B; the editor gets `05-decisions.md` so it can check voice/scope drift.

## Stage 19 — Submission checks → `10-submission-checks.md`

Run `check_refs.py`, `build.sh --strict`, then checklist C. Every item pass/fail with the fix applied.

## Stage 20 — Close

`ledger.py close`; fill totals; move new issues to `LEDGER.md` open issues; if the skill changed during the
run, bump `metadata.version` in SKILL.md and add a version row. Deliver: PDF, the `paper/<slug>/` folder,
and a short summary naming the thesis, venue, and the recommended experiments still to run.
