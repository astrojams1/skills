# Newsworthy — surface design contracts and compact capture

Recorded: **2026-09-16**. Skill version: **1.0.6**. Token/cost metrics: unknown.

This dated milestone records the release task's fifth cross-surface design
correction. Earlier snapshots remain unchanged. Read the
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
for subsequent verification, builds and provider status. This skill update does
not change provider release state or establish a public release.

## Contract checks reported at handoff

The app added `design/surfaces.json`, `test/surface-design.test.js` and helpers for:

- Parsed Android XML design contracts and Java/Swift source guards that fail
  closed when the expected source structure is absent or unsupported.
- A production Expo Home rendered-prop matrix covering **192 combinations**.
- **12 deliberate regression reintroductions** and shared palette/gradient checks.

The release task reported the final local rerun passing **189 repository tests**,
**19 design checks**, typecheck and store validation. The 14 new repository tests
comprised a native contract, 11 native mutation cases, the app prop matrix and one
platform mutation case (12 deliberate regression cases in total). The gate rejected
the actual pre-fix expanded XML from `b5571c5` and APK 8's inline theme override
Java from `922a9b1`, exercising known failures beyond token generation.

These test/documentation/artwork/ledger changes were pushed in commit `f613a87` to
[app PR #92](https://github.com/astrojams1/newsworthy/pull/92); that commit changed
no native production code. App CI was running at handoff. This note does not claim
CI success or a merge, and subsequent app state belongs in its canonical ledger.

**These are not native screenshot tests.** Parsed XML, source guards and rendered
props do not execute Yoga, WidgetKit or RemoteViews. They do not prove on-device
layout, theme changes, resizing or full cross-surface visual parity.

## Bounded native evidence

APK 9's compact **2×2 dark** widget was user-approved and independently captured;
launcher span and minimum span were confirmed. The neutral Android gallery was
complete at handoff. This closes that specific compact capture question, not every
size, theme or native behavior. Further capture and release results remain in the
app ledger; old pending observations remain historical.

## Reusable lesson

Check that actual consumers use the agreed semantic sizes, baselines and theme
resources. Deliberately reintroduce known failures to prove the gate detects them,
and never silently change a baseline to bless a mismatch. Maintain a separate
native capture matrix with build provenance even when all contract tests pass.
