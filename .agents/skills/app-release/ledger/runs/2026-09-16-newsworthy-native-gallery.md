# Newsworthy — tax and native gallery milestone

Observed: **2026-09-16**, canonical ledger updated **05:39:50 UTC**.
Skill version: **1.0.2**. Token/cost metrics: unknown.

This is a dated incremental note. Prior snapshots remain unchanged. Read the
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
for current status; this note is neither live provider evidence nor new permission.

## Verified progress

- **Apple tax:** signed-in Business lists the submitted U.S. Form W-9 as **Active**.
  This replaces the earlier user-reported-only status. Banking remains missing,
  and Paid Apps Agreement remains **Pending User Info**. No paid public release
  is established by the active tax form or existing App Review submission.
- **Host:** Mac unlocked; supported native controls and signed-in Chrome work.
- **Android version 6 / 1.0.0:** the API 35 ARM64 emulator verified light/dark
  gradient and share-icon rendering, native share payload with its original
  timestamp, About navigation, offline saved reading with age and **Try again**,
  and online recovery with the saved-state warning removed.
- **Gallery:** three genuine 1080×2400 Android captures were composed into
  1080×1920 Play listing artboards. The supported CUA `pressKey` command
  `super+s` invoked the emulator screenshot control, saving a Desktop PNG;
  the original file was copied into the app repository before composition.
  [Native sources](https://github.com/astrojams1/newsworthy/tree/main/store/source/android-phone),
  [Play assets](https://github.com/astrojams1/newsworthy/tree/main/store/assets/google-play/phone),
  [manifest](https://github.com/astrojams1/newsworthy/blob/main/store/assets/manifest.json),
  [gallery preview](https://github.com/astrojams1/newsworthy/blob/main/store/preview-android.png).

## Remaining gates

- Owner privately adds the Apple payout bank account; then read back banking and
  agreement status. Address correction, review outcome and public availability
  still need their own provider evidence.
- Google still needs the owner's real-device/contact-phone verification before
  app creation and upload. Prepared screenshots are not a saved Play listing.
- Android widget installation/rendering/resize, large text and physical-device
  behavior remain unverified. The launcher widget picker was not reachable using
  the available supported controls: Menu key and stationary drag did not open it.
  Do not infer widget success from foreground UI or substitute prohibited input
  tools. Resume supported widget interaction or verify during real closed testing.

## Reusable lesson

An unlocked host can clear verification/capture work without another cloud build.
Keep native feature coverage precise, preserve original platform captures, and
promote user-reported account progress only after signed-in provider readback.
