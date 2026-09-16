# Lessons Learned

Capture patterns and corrections here after any mistake or user feedback. Review at session start.

## Design System Migration Rigor

**Source:** User feedback (2026-03-04)

1. **Zero-tolerance straggler sweep.** After a design system migration, absolutely everything must be governed by the design system — no straggling colors, fonts, radii, or shadows. The verification phase must exhaustively search for and eliminate every non-design-system value.
2. **Ask the human on novel situations.** When the agent encounters a UI pattern not covered by the design system, it must ask the human for guidance rather than guessing.
3. **Contribute back.** New patterns created during migration must be contributed back to the design system skill so future projects benefit.

## Release continuity and owner handoffs

**Source:** Newsworthy launch corrections (2026-09-16)

- Preserve working approvals and verify alternative authenticated tool paths before
  assigning a routine technical task to the owner. Distinguish actual policy gates
  from assumptions introduced by the agent.
- A persisted ledger prevents repeated account setup and preserves interrupted
  release work. Record user-reported completion separately from provider readback.
- Inspect the existing tax-form row before repeatedly opening a country/form picker.
- Snapshot project facts into reusable runbooks without hardcoding one app's price,
  credentials, account identifiers, legal details or product policy into future apps.
