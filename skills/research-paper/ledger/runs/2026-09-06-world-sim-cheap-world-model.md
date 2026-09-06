# Run 2026-09-06-world-sim-cheap-world-model

- repo: `world-sim`  slug: `cheap-world-model`  paper dir: `/home/user/world-sim/paper/cheap-world-model`
- started: 2026-09-06T00:35:42+00:00  closed: -
- skill version: 0.2.0
- outcome: -

## Stages

| # | stage | started (UTC) | tokens | method | notes |
|---|---|---|---|---|---|
| 0 | Set up | 00:35 | 0 | counter | Revision run: the author found after delivery that the paper's subject (a cheap VLM producing a world model) is contradicted by its own ablation (helper alone reproduces every answer; VLM contribution exactly 0 from iteration 15). Run 1's stage 6 thesis was never re-tested after stage 14. |
| 6 | Thesis | 00:35 | 57798 | counter | Re-choose thesis, title, contributions against the run-1 experiments |
| 16 | Draft | 00:43 | 0 | counter | Rewrote title, abstract, introduction, section 4 order (helper first), sections 5-6 (helper alone first, VLM in the loop second), limitations, conclusion; no numbers, tables or figures changed; strict build 19 pp |
| 17 | Scientific review | 00:43 | - | - | Fresh-context framing review (rubric A 1/6/12, B 11) on the revised text |

**Total tokens (counted stages): 57,798**

## Issues

| stage | issue | proposed fix |
|---|---|---|
| 6 | Thesis chosen before the ablation existed kept the VLM as grammatical subject after the ablation credited the deterministic helper with 100% of the accuracy; title, abstract, system and results order all followed the stale subject | Thesis is provisional until stage 14; mandatory thesis re-check gate after 14: the subject of thesis/title/abstract must be the component the ablation credits; a zero-contribution headline component is a change of subject, not a caveat |
| 17 | Reviewer's major point 11 offered 'reframe the three cents' OR 'retitle around the actual finding'; the response took the reframe and kept the wrong subject, and the review called the zero 'candid' rather than 'wrong subject' | Rubric A item 12 (subject/attribution inversion, major, not a wording fix); stage 17 response rule: when a finding shows the headline component contributes nothing, candor is not a fix — re-enter stage 6 |
| 20 | LEDGER.md 0.2.0 row and open issue 4 claim rubric A items 12-15 were added; references/reviews.md stops at item 11 — the ledger described a change that was never written | Write items 12-15 now; at close, diff the skill files against the version row before writing it |
