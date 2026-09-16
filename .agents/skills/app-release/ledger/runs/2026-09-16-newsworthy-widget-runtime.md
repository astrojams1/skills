# Newsworthy — widget evidence and replacement review

Recorded: **2026-09-16**. Skill version: **1.0.4**. Token/cost metrics: unknown.

This dated milestone preserves the parent release task's native and provider
readback evidence. Earlier snapshots remain unchanged. Read the
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
for current build, account and release state, and the
[widget gallery brief](https://github.com/astrojams1/newsworthy/blob/main/store/design/widget-gallery-brief.md)
for capture decisions. This note is not a new live provider check or permission.

## Apple captures and replacement review

- Actual `systemSmall` and `systemMedium` widgets were captured on an iPhone 16
  Pro Max simulator running iOS 18.3, using EAS artifact `e02851c0` from source
  `b5571c5`. This establishes those simulator size captures, not physical-device
  or Android verification. Original screenshots were preserved.
- Wallpaper settings were unavailable. Real widget surface viewports were framed
  in an editable neutral SVG artboard; no UI was invented and no wallpaper change
  was claimed. The artboard background is composition, not native Home Screen
  evidence. The Newsworthy visual preferences remain specific to that app.
- Five replacement screenshots reached **COMPLETE**; the old gallery was removed
  and the replacement order saved. Build 6's replacement review submission
  `4f28761f-3096-4f0d-aa37-df83332f818f` and its app version both read
  **WAITING_FOR_REVIEW** at **2026-09-16T07:50:46.874Z**. The app was not live;
  banking was still missing and the legal-address correction still pending.

## Android diagnosis; fix not yet verified

The user reported widget flicker, refusal to shrink to the minimum size, and an
inconsistent denominator. Native logs established a repeating loop: one-time
WorkManager job completion disabled `RescheduleReceiver`, causing
`PACKAGE_CHANGED`, widget recreation/`onUpdate`, and a new worker roughly every
second. The app loop interrupted resize interaction; this was not evidence of
user error or a control-tool limitation.

[App PR #92](https://github.com/astrojams1/newsworthy/pull/92) proposed unique
persistent periodic work with `KEEP`, cancellation of the old job, persisted saved
status, a compact layout and a small baseline `/10`. Version 8 builds were
uploading at this handoff. **The fix had not been verified natively**: source
support and a proposed repair do not prove stable resizing or consistent rendered
readings. Subsequent build status and verification belong in the app ledger.

## Reusable lesson

Preserve native capture sources and distinguish factual widget rendering from
artboard decoration. For unstable widget interaction, diagnose scheduling and
callback logs before blaming input tools or the user; then verify the proposed
fix in the replacement native build and keep unresolved behavior explicit.
