# Decision menus (stages 6-12)

Record every decision in `05-decisions.md` with one line of reasoning. Reviews check the paper against this
file, so decide once and keep to it.

## Thesis (stage 6)

Shape: "<Method/system> achieves <measured outcome> on <task/benchmark> under <constraint>, and <the
mechanism/finding that explains it>." Keep the constraint honest: "without training" means no gradient
updates anywhere, including no fine-tuning of the classical part; "cheap" is a number with what it includes.

The `<Method/system>` slot is the component the ablations credit with the outcome, not the component the repo
advertises. Record the thesis as provisional; stage 14's gate adds a "Thesis re-check" section here and may
replace it. Keep the rejected thesis in the file: reviewers of the paper and of the skill both need to see it.

## Paper type (stage 7)

| Type | Choose when | Typical length | Must contain |
|---|---|---|---|
| Method | a new technique with ablations | 8-10 pp + appendix | baselines, ablations, generalisation |
| Systems | the contribution is the integration and its engineering trade-offs | 8-12 pp | architecture, cost/latency breakdown, failure modes |
| Benchmark / protocol | the task, data, metric or evaluation protocol is the contribution | 6-10 pp | metric definition, invariances, noise study, baselines |
| Empirical study | findings about existing methods | 6-10 pp | careful protocol, variance, threats to validity |
| Negative result | an expected thing does not work | 4-6 pp | strong attempt, what was tried, why it failed |
| Short report / tech report | early or narrow result | 4-6 pp | one claim, one table, limitations |
| Position | argument, no new results | 4-8 pp | falsifiable predictions |

Mixed types are common (systems + benchmark); name the primary.

## Audience (stage 8)

Name the reviewer pool: e.g. "robotics perception (ICRA/RSS reviewers)", "LLM agents / tool use (NeurIPS,
ICLR)", "3D vision (CVPR)". Consequences to write down: vocabulary they use, baselines they expect,
what needs no explanation, what needs a figure.

## Venue (stage 9)

For arXiv: primary category and cross-lists (e.g. cs.RO primary, cs.CV and cs.AI cross-list). If aiming at a
workshop/conference, record page limit, style file, anonymisation, and deadline. arXiv itself has no
template requirement; use the skill template (article class, 10pt, two-column optional).

## Scope and length (stage 10)

Write "In scope" and "Out of scope" lists. Out-of-scope items are things a reviewer might expect that the
paper explicitly declines to address, with the sentence in the paper that says so. Target page count.

## Mathematical treatment (stage 11)

Levels: (a) none beyond notation; (b) formal problem statement + metric definition; (c) (b) plus
derivations of the method's key steps; (d) theorems. Pick the lowest level at which every claim is
unambiguous. Systems papers usually need (b): define the state space, the observation, the scoring function,
and any invariances the score has.

## Writing style (stage 12)

- Voice: first person plural ("we") is standard; passive for procedures.
- Tense: present for the method and for what the paper does; past for what was run.
- Density: one idea per paragraph; the first sentence carries the claim.
- Numbers: consistent precision; always with unit and protocol (mean of N runs, ± what).
- Figures: one message each, captions self-contained, colour-blind safe, vector PDF.
- No hype words ("novel", "revolutionary", "first ever") unless the novelty section proves them.
