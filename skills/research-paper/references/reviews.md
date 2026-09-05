# Review rubrics and submission checklist

## Report template (both reviews)

```
# <Scientific|Writing> review — <slug> — <date>
## Summary (3 sentences: what the paper claims, whether the evidence supports it, verdict)
## Major points (numbered; each: location, problem, why it matters, what would fix it)
## Minor points (numbered)
## Verdict: accept / minor revision / major revision / reject — and the one change that matters most
```

## Rubric A — scientific review

Check each item; report a point for every failure, with the location.

1. **Thesis vs evidence.** Is every sentence of the abstract and every contribution bullet supported by a
   table or figure in the paper? Quote any that is not.
2. **Protocol.** Is the evaluation protocol stated before results (data, seeds, repeats, what "mean" is over,
   tolerance, cost accounting)? Could a reader reproduce the headline number?
3. **Baselines.** Are the obvious cheap alternative and the obvious strong alternative present or explicitly
   argued away? Is the "classical part alone" ablation present when the method wraps a classical pipeline?
4. **Overfitting to the benchmark.** If the method was tuned on the benchmark, is there a held-out set and is
   its result reported with the same prominence?
5. **Noise.** Are run-to-run variances reported? Are differences claimed larger than the noise?
6. **Attribution of gains.** Does the paper say which component produces the result (ablation), or does it let
   the reader assume the headline component (e.g. the LLM) is responsible?
7. **Generality.** Are the limits of the setting (synthetic, small vocabulary, fixed geometry) stated where the
   claims are made, not only in the limitations section?
8. **Related work.** Are the closest works cited and honestly compared? Any missing standard baseline?
9. **Numbers.** Spot-check five numbers against the source files named in the outline.
10. **Cost claims.** What does the cost include; is the price basis dated; does time include queueing?
11. **Ethics / disclosure.** AI-assistance disclosure present if applicable; no leaked credentials; licences
    of data and code stated.

## Rubric B — writing review

1. **Contract.** Read `05-decisions.md`. Flag every place the paper drifts from the chosen audience, scope,
   math level or style.
2. **Abstract.** ≤ 200 words; problem, approach, headline result with number, one limitation or scope word.
3. **Introduction.** By the end of page 1 the reader knows the task, the constraint, the result, and why it is
   surprising. Contributions listed match the sections.
4. **Structure.** Each section does one job; no result appears first in the discussion; no method detail
   first in the results.
5. **Paragraphs.** First sentence = claim; rest = support. Flag paragraphs > 12 lines or with two claims.
6. **Sentences.** Flag hedges stacked on hedges, nominalisations, "utilize", "novel", "very", undefined
   acronyms, inconsistent terms for one thing.
7. **Figures/tables.** Referenced in text before they appear; captions self-contained; axes labelled with
   units; tables have the protocol in the caption.
8. **Numbers.** Consistent precision and units; the same number is the same everywhere.
9. **Citations.** Every claim about prior work has one; no orphan bib entries; no "et al." in author lists in
   the bib.
10. **Length.** Within the target from `05-decisions.md`; suggest cuts if over.

## Checklist C — arXiv submission

- [ ] `build.sh --strict` passes: zero LaTeX errors, zero undefined references/citations, zero overfull
      boxes over 10 pt (list the rest).
- [ ] `check_refs.py` passes: every `\cite` key exists; every bib entry has `eprint` or `doi`; every
      `eprint`/`doi` resolved (HTTP 200 from arXiv/doi.org) at least once during this run.
- [ ] Title ≤ 150 characters; abstract ≤ 1920 characters (arXiv limit) and no LaTeX macros in it that arXiv's
      abstract field cannot show (plain math is fine).
- [ ] Author names and affiliations final; contact email present; ORCID optional.
- [ ] Primary category and cross-lists chosen; MSC/ACM classes optional.
- [ ] Licence chosen (arXiv default non-exclusive licence unless the user asks for CC BY).
- [ ] All figures vector or ≥ 300 dpi; total source < 50 MB; no absolute paths; fonts embedded
      (`pdffonts build/main.pdf` shows no non-embedded fonts).
- [ ] Source builds with pdflatex from a clean directory using only `main.tex`, `refs.bib`, `figures/`,
      `tables/` (arXiv runs its own TeX; `.bbl` must be included since arXiv does not run BibTeX for
      every submission — generate it and ship it).
- [ ] Code/data availability statement with the repository URL and commit hash.
- [ ] AI-assistance disclosure paragraph present if AI tools were used.
- [ ] Limitations section present and specific.
- [ ] No "submitted to"/"under review" claims unless true; no anonymisation leftovers.
- [ ] Final PDF read once end to end by a fresh-context agent for typos (cheap; do it).
