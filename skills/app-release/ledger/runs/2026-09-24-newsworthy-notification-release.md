# Newsworthy — notification release checkpoint

Recorded: **2026-09-24**. Skill version: **1.0.9**. Token/cost metrics: unknown.

This sanitized snapshot records verified facts supplied by the release task at
this checkpoint. It does not advance later build, delivery or review outcomes.
The [canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md)
remains authoritative. Earlier snapshots remain unchanged.

## Completed implementation and production deployment

- [Newsworthy PR #127](https://github.com/astrojams1/newsworthy/pull/127) merged as
  `3a2f0e0`. The change adds push receipt checks, retry handling and notification
  tap routing.
- Validation recorded **292 passing app tests**, **one existing skipped test**,
  **70 passing design checks**, and passing CI. These checks do not prove delivery
  or visibility on a physical device.
- Backend production deployment `dpl_2d1c1kXXV4ej2Vp1r2znLRVW4DAT` reached
  **Ready**. This verifies deployment state, not notification delivery.
- Apple privacy disclosures were published with **Device ID** and **Other Data
  Types**, alongside prior diagnostics, for **App Functionality**, linked to the
  user and without tracking. The native privacy manifest was aligned. These are
  this app's observed disclosures, not a template for other apps.

## Native and review state at this checkpoint

- Apple upheld **Guideline 4.2 — Minimum Functionality** after reconsideration.
  The notification work is intended for a new submission; **resubmission has not
  occurred** at this checkpoint, and approval is not established.
- Build **20** was canceled after a native privacy-manifest mismatch was found.
  Replacement **1.0.0 (21)**, EAS ID
  `150a6415-299a-4af3-995d-cb501703073a`, was processing from source `2d7f56d`.
  Its completion, upload, TestFlight availability and review selection were not
  established by this snapshot.
- No APNs delivery key was configured on Apple/EAS. The browser was prepared to
  create a **production-only key scoped to the Newsworthy topic**, but the action
  awaited required user security approval. A prepared form is not a created or
  installed credential.
- One iOS device had registered a notification threshold of **5**. No device
  identifier or token is retained here. Registration does not prove delivery;
  physical receipt and visibility were **not verified**.

## Reusable lessons

### Keep the notification evidence stages separate

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| Push entitlement in a signed binary | The app is signed with push capability | A server delivery credential exists |
| APNs delivery key configured for the app | The delivery service has a configured credential | The credential succeeds for a real token |
| Expo push ticket accepted | Expo accepted the send request | APNs accepted it or the device displayed it |
| Successful Expo receipt for APNs | Expo reports successful handoff to APNs | Physical device receipt or visible presentation |
| Physical-device observation | The observed notification reached that device and appeared in that state | Untested foreground, background, permission or tap states |

Record failed tickets and receipts distinctly so retryable credential/rate errors
are not silently marked delivered. Verify notification taps as well as sending.
Keep automated source/design checks separate from the physical release gate.

### Reuse authenticated paths without weakening access

The Vercel CLI was logged out; the existing browser sign-in provided a working
path. Production secret pulls returned placeholders rather than secret values.
That is an access boundary, not permission to weaken secret policy. The existing
Vercel/Neon read-only SQL path provided subscription counts without exposing
tokens. Inspect aggregate state when it answers the question; keep secrets and
private device data out of logs and ledgers.

### Align disclosures before uploading the replacement

A published store disclosure and the shipped native manifest are separate
artifacts. Compare both with the actual data collected by the feature. Preserve
the canceled build and reason as history, then track the replacement's source,
processing, validation, upload and submission independently.

## Resume

Read the canonical app ledger before acting. At this checkpoint, the remaining
steps were the required credential approval/setup, replacement-build readback,
real-device delivery and tap verification, then updated review information and
resubmission. Neither store's public release is claimed by this snapshot.
