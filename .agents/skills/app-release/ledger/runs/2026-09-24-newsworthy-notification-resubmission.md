# Newsworthy — build 21 notification resubmission

Recorded: **2026-09-24** (local date). Skill version: **1.0.9**.
Token/cost metrics: unknown.

This sanitized milestone records the release task's verified evidence following
the [earlier notification checkpoint](2026-09-24-newsworthy-notification-release.md).
That snapshot remains unchanged. The
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md)
owns current release state and detailed provenance.

## Verified build, credentials and provider handoff

- iOS **1.0.0 (21)** reached **VALID** and **IN_BETA_TESTING**.
- The owner confirmed creating the scoped APNs key and storing it with Expo.
  The production-only, app-specific key was created and assigned. No key IDs,
  credentials or token values are retained in this record.
- A production notification test returned an **OK Expo ticket** followed by an
  **OK APNs handoff receipt**. This closes the provider-handoff check; it does not
  establish that a physical notification banner appeared or was tapped.

## Physical verification and its limit

Through **iPhone Mirroring**, the release task installed build 21 on a physical
iPhone and launched the app. The existing threshold of **5** was retained.
Disabling notifications changed the database registration count to **0**;
enabling them restored the count to **1**. These observations verify installation,
launch, the retained preference and the subscription switch's server effect.

The notification banner and tap were **not observed**. Mac iPhone notification
mirroring was disabled, so that surface could not establish notification
presentation. The successful provider receipt and working subscription controls
must not be reported as a full end-to-end or visual notification pass. Physical
visibility and tap behavior remain outside the verified scope of this milestone.

## Verified Apple resubmission

- Updated metadata and review Notes were saved and read back.
- The original rejected submission was reused: its addressed item was resolved,
  then the submission was submitted. The selected build was verified as **21**.
- At **2026-09-23T23:59:45.868Z**, independent readback showed **both the version
  and submission `WAITING_FOR_REVIEW`**.

This establishes resubmission, not Apple approval or public availability. No
subsequent review outcome or Android release is claimed here.

## Lessons for future releases

- Preserve each evidence boundary: signing capability, configured delivery key,
  accepted Expo ticket, APNs handoff receipt, visible physical notification and
  tap behavior. Do not promote one stage to the next by inference.
- When using a mirrored physical device, inspect notification-mirroring settings
  before diagnosing an absent Mac banner as a delivery failure. Mirroring's
  visibility limit also cannot establish that the phone itself displayed it.
- Refresh an expired browser session before retrying a credential action, and
  read the key inventory before creating again. A stale view or uncertain action
  outcome can otherwise produce duplicate keys.
- Reuse the rejected review submission when appropriate, resolve its item, submit,
  then independently verify the selected build and both review states. Saved
  metadata, an uploaded build or a reviewer reply alone is not resubmission.
