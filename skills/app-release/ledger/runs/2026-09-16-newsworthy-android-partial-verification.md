# Newsworthy — Android partial verification

Recorded: **2026-09-16**. Skill version: **1.0.5**. Token/cost metrics: unknown.

This dated milestone summarizes the app's
[sanitized regression evidence](https://github.com/astrojams1/newsworthy/blob/main/store/android-widget-regression.json)
and [APK 8 capture provenance](https://github.com/astrojams1/newsworthy/blob/main/store/source/android-phone/provenance-v8.json).
Earlier snapshots remain unchanged. The
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
remains authoritative for subsequent builds, native checks and release progress.

## Verified on APK 8

- Android API 35 ARM64 emulator, EAS build
  `c18fb254-3145-4e69-b7f5-906b3c0621e1`, source `922a9b1`. A **65-second**
  native observation recorded zero worker restarts, widget recreations, receiver
  toggles or fatal exceptions. The previous build had 30 widget recreations in
  approximately 34 seconds. This verifies stability within that observation
  window, not all widget behavior.
- The initial corrected periodic worker completed **SUCCESS** at
  **2026-09-16 16:28:57 +08:00**. `dumpsys jobscheduler` showed the next refresh
  pending with an approximately 30-minute delay and a network constraint.
  **A later recurring execution had not yet been observed.**
- A real dark-to-light switch exposed a denominator regression: background and
  primary text changed correctly while `/10` stayed pale. `ForegroundColorSpan`
  retained its previously resolved color while XML theme resources changed.
  Original native PNGs remain diagnostic evidence, not finished listing artwork.

## Open native checks at handoff

The existing launcher widget retained a `3×3` minimum span despite installed
provider minimum and resize dimensions of `120dp`. Cached sizing from its earlier
installation was a **hypothesis**, not an established cause. Fresh compact resize
behavior remained unverified. Provider metadata alone did not prove the launcher
would accept the intended size.

App commit `698071b` replaced the inline denominator with a separate,
baseline-aligned XML-themed `TextView` in both layouts. The release task reported
175 tests and prebuild passing. Preview APK 9, EAS
`bfb5310e-c8e1-41af-bc01-6037b17701b6`, was building at handoff; **the theme fix
had not been verified natively**. Current build state and later checks belong in
the app ledger, not a duplicate operational checklist here.

## Reusable lesson

Verify that refresh still succeeds and remains scheduled after stopping a loop,
test theme changes without a new data fetch, and separate launcher-instance state
from provider declarations. Record each result at its actual scope; passing source
checks and a quiet log window cannot establish every native behavior.
