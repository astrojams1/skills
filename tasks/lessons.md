# Lessons Learned

Capture patterns and corrections here after any mistake or user feedback. Review at session start.

## Design System Migration Rigor

**Source:** User feedback (2026-03-04)

1. **Zero-tolerance straggler sweep.** After a design system migration, absolutely everything must be governed by the design system — no straggling colors, fonts, radii, or shadows. The verification phase must exhaustively search for and eliminate every non-design-system value.
2. **Ask the human on novel situations.** When the agent encounters a UI pattern not covered by the design system, it must ask the human for guidance rather than guessing.
3. **Contribute back.** New patterns created during migration must be contributed back to the design system skill so future projects benefit.

## Research-Paper Skill: The Subject Must Follow the Evidence

**Source:** User correction (2026-09-06), world-sim paper

1. **A thesis chosen before the ablation is provisional.** The world-sim paper fixed its thesis around "a cheap VLM producing a world model" at stage 6; the stage 14 ablation showed the deterministic helper produced every answer and the VLM contributed exactly zero. The thesis, title, abstract and section order were never re-chosen. Rule: any stage that produces new evidence re-opens the thesis, and the paper's subject is the component the evidence credits.
2. **Candor is not a fix.** Reporting a zero-contribution finding inside the old framing ("the model is not what makes it accurate") reads as honest and still leaves the paper with the wrong subject. When a reviewer offers "reframe or retitle", a zero means retitle.
3. **Write the version row from the diff.** The 0.2.0 ledger row claimed rubric items that were never written. Describe what the files contain, not what was intended.
