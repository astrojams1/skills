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
- [ ] Start ledger run 2 for the revision (`ledger.py start`), log the issue at stage 6/14/17
- [ ] SKILL.md: thesis provisional until stage 14; mandatory thesis re-check gate after 14; subject rule in
      Honesty rules; gotcha; version 0.3.0
- [ ] references/stages.md: stage 6 subject test; stage 14 thesis re-check gate; stage 17 response rule
- [ ] references/reviews.md: rubric A items 12–15 (subject/attribution inversion, guard-set selection, evaluated
      commit, constant provenance); rubric B item 11 (subject consistency)
- [ ] references/decisions.md: thesis subject rule
- [ ] ledger/LEDGER.md: 0.3.0 row; fix issue 4 wording; new issue 7; backlog item 0 resolved
- [ ] tasks/lessons.md: lesson
- [ ] `bin/manage.sh link`; run all three test suites; commit; push to claude/push-paper-branches-bundles-kmzwrf

### Paper (astrojams1/world-sim, paper/cheap-world-model)
- [ ] 05-decisions.md: revised thesis + title + paper type, with the rejected v1 thesis and why
- [ ] 01-research-question.md, 02-contributions.md, 07-outline.md: record the re-choice
- [ ] main.tex: title, abstract, introduction, system section (helper first, VLM harness last), results
      (helper alone first, VLM in the loop second), limitations, recommended experiments, conclusion, Fig. 1 caption
- [ ] README.md title
- [ ] 08-review-scientific.md: post-delivery finding + second (framing) review by a fresh-context subagent
- [ ] Rebuild: check_refs --resolve, build.sh --strict, bundle.sh; update 10-submission-checks.md
- [ ] Commit; push to claude/push-paper-branches-bundles-kmzwrf

## Review
(filled at the end)
