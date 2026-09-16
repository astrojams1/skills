# Newsworthy — capture corrections milestone

Recorded: **2026-09-16**. Skill version: **1.0.3**. Token/cost metrics: unknown.

This dated handoff records user corrections and their evidence limits. Earlier
snapshots remain unchanged. Use the
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
for current build, review and release state, and the
[widget gallery brief](https://github.com/astrojams1/newsworthy/blob/main/store/design/widget-gallery-brief.md)
for the current shot plan. This note is not a live provider check or new permission.

## Product and listing correction

- The user requested no About page and no About screenshot in the gallery.
  [Newsworthy PR #89](https://github.com/astrojams1/newsworthy/pull/89), merged as
  `b5571c5`, removed About and refined the reading presentation. Older snapshots
  describing successful About navigation remain historical evidence of that build.
- Widget listing images should show a clean Home Screen with no unrelated app
  icons, neutral plain wallpaper to avoid color clashes, and actual supported
  size options. These are **Newsworthy-specific design preferences**.
- Source support at this handoff was iOS `systemSmall` and `systemMedium` only;
  Android compact/expanded layouts depended on launcher resizing. The older iOS
  medium capture was the only verified widget capture. All new clean captures
  were pending Mac unlock; source support did not establish visual verification
  of either iOS small or Android resize behavior.

## Release continuity

The earlier Apple submission was withdrawn by developer action, producing
`DEVELOPER_REJECTED`; this was not a reviewer rejection. Replacement native builds
were underway at this handoff. Their changing status and subsequent verification
belong in the canonical app ledger, not a second operational checklist here.

## Reusable lesson

Write a capture brief before making store artwork, carry product corrections into
the shot list, and stage uncluttered native backgrounds. Check supported sizes in
source, verify each claimed variant natively, and preserve original captures with
provenance. When native access is blocked, record pending evidence and continue
independent work without presenting a mockup or an old capture as new verification.
