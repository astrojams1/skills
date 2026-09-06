# Tasks

Track current work items here. Use checkable items for progress tracking.

## Current: thesis-subject inversion (research-paper skill v0.3.0 + world-sim paper revision)

Finding (2026-09-06): the world-sim paper's own ablation shows the deterministic helper produces every
benchmark answer and the VLM's contribution is exactly zero from tuning iteration 15, yet the title, thesis,
abstract, system section and results order keep the VLM as the subject. The scientific review offered
"retitle around the actual finding" as a fix; the response chose the "reframe the three cents" option instead.
Root cause in the skill: the thesis is fixed at stage 6, the ablation runs at stage 14, and no gate re-tests the
thesis against the experiments. Also: LEDGER.md claims rubric A items 12–15 exist; reviews.md stops at 11.

### Skill (astrojams1/skills)
- [x] Start ledger run 2 for the revision (`ledger.py start`), log the issue at stage 6/14/17
- [x] SKILL.md: thesis provisional until stage 14; mandatory thesis re-check gate after 14; subject rule in
      Honesty rules; gotcha; version 0.3.0
- [x] references/stages.md: stage 6 subject test; stage 14 thesis re-check gate; stage 17 response rule
- [x] references/reviews.md: rubric A items 12–15 (subject/attribution inversion, guard-set selection, evaluated
      commit, constant provenance); rubric B item 11 (subject consistency)
- [x] references/decisions.md: thesis subject rule
- [x] ledger/LEDGER.md: 0.3.0 row; fix issue 4 wording; new issue 7; backlog item 0 resolved
- [x] tasks/lessons.md: lesson
- [x] `bin/manage.sh link`; run all three test suites; commit; push to claude/push-paper-branches-bundles-kmzwrf

### Paper (astrojams1/world-sim, paper/cheap-world-model)
- [x] 05-decisions.md: revised thesis + title + paper type, with the rejected v1 thesis and why
- [x] 01-research-question.md, 02-contributions.md, 07-outline.md: record the re-choice
- [x] main.tex: title, abstract, introduction, system section (helper first, VLM harness last), results
      (helper alone first, VLM in the loop second), limitations, recommended experiments, conclusion, Fig. 1 caption
- [x] README.md title
- [x] 08-review-scientific.md: post-delivery finding + second (framing) review by a fresh-context subagent
- [x] Rebuild: check_refs --resolve, build.sh --strict, bundle.sh; update 10-submission-checks.md
- [x] Commit; push to claude/push-paper-branches-bundles-kmzwrf

## Review (2026-09-06)

- Skill v0.3.0 pushed to `claude/push-paper-branches-bundles-kmzwrf` (commit 4e9924f + follow-up): stage 14 thesis
  re-check gate, stage 6 subject test, rubric A 12–15 (the 0.2.0 ledger row had claimed them without writing
  them), rubric B 11, stage 17 response rule, honesty rule, gotcha; ledger run 2 closed; all three test suites pass.
- Paper revision pushed to the same branch in world-sim (commit 02ee57e + follow-up): new title, abstract and
  introduction with the helper as subject; §4 helper first / hosted call last; §5 helper alone / §6 VLM in the loop;
  limitations and conclusion rewritten; no number changed; strict build 19 pp; arXiv bundle regenerated.
- Fresh-context framing review (08b) returned minor revision: two major (abstract's 95.9 read as a fresh-room
  number; "every intervention coded" contradicted by the interventions table) and 27 minor; all fixed except five
  pre-existing body numbers (deferred). This is the skill's own stage 17 discipline applied to the fix.
- Verify in run 3 (ledger issue 7) that the stage 14 gate fires *before* the outline. Consider retiring
  `training-free` in favour of `no learned component` when fitted constants exist (framing review point 14).
