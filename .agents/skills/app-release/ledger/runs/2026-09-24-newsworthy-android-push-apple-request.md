# Newsworthy — Android push verified on emulator; renewed Apple request

Recorded: **2026-09-24**. Skill version: **1.0.10**. Token/cost metrics: unknown.

**Dated correction, September 24:** The statement below that Apple specifically
requested a new recording was an overconfident interpretation. Its generic 2.1
message did not say the earlier attachment was missing or outdated. The original
attachment was later verified accessible with its historical hash. See the
[correction and resubmission milestone](2026-09-24-newsworthy-recording-correction-resubmission.md)
for the verified evidence and subsequent outcome. The original snapshot is
retained as history with this correction attached.

This sanitized milestone records verified evidence supplied by the release task.
The [canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md)
and its `store/android-notifications-12.json` and
`store/apple-review-build21-followup.md` evidence remain authoritative. Earlier
snapshots are preserved; the new Apple readback supersedes the waiting state.

## Android artifacts and emulator verification

- A dedicated FCM API Admin sender was assigned in EAS. The production and preview
  secret-file variable **`GOOGLE_SERVICES_JSON`** was verified. No credential
  contents, key identifiers or device tokens are retained here.
- Production **AAB 12**, build `3048aa1e-7330-42a1-bbdd-8fcc32448f3f`, and matching
  **APK 12**, build `40920bd4-d852-47a1-9dc4-4d98fcf74871`, both finished from
  clean source `6c19cb9`. Downloads were hashed and ZIP-integrity checked.
- APK 12 was exercised on an **API 35 Google APIs ARM64 emulator**. The actual
  permission flow and default threshold **8** were observed. Enabling changed
  registration count **0 → 1**. A test returned successful Expo and FCM receipts,
  the notification appeared in the shade, and a cold-start tap opened the reading.
  Notifications were turned off afterward, returning registration count to **0**.
- A physical Android device remained unavailable. Emulator delivery and tap
  verification do not establish physical-device QA or Google account verification.
- The first Home gesture encountered a **SystemUI ANR**. Restarting the emulator
  process and closing the unresponsive SystemUI recovered it. The identified
  failing process was SystemUI; this was not recorded as a Newsworthy crash.

## New Apple review state

At **2026-09-24T05:12:31Z**, build **21** was **REJECTED** and its submission was
**UNRESOLVED_ISSUES**. The browser's September 24 **12:40 PM** message cited
**Guideline 2.1 — Information Needed**, requesting a new physical-device launch
video on the latest OS and the six-part response. It did not repeat Guideline 4.2;
that omission does **not** establish 4.2 approval or guarantee eventual acceptance.

The retained earlier video demonstrates **build 7**, which predates the new
Settings flow. It does not establish the new build's requested coverage. Latest
available phone metadata reported **iOS 26.6.2**; the release task checked Apple's
official security page, which listed **iOS 27** as latest at this observation.
These are dated observations, not permanent version requirements. The local
device connection was unavailable and iPhone Mirroring reported the phone in use.

The new physical-device recording and current OS verification remained an owner
device gate. **No reply or resubmission for this new request had been sent** at
this checkpoint. Neither store's public availability is claimed.

## Lessons

- Pair a native test artifact with the intended production artifact's source and
  configuration, retain integrity evidence, and name emulator versus physical
  coverage explicitly. Observe visible presentation and cold-start tap separately
  from provider receipts and subscription persistence.
- Identify the failing process before attributing an emulator interruption to the
  app. An OS-shell ANR is different evidence from an app exception or crash.
- Read each new review message; a changed guideline is a new requested action,
  not proof that an earlier concern was approved. Do not reuse an old demonstration
  as evidence of features or OS/build combinations it never showed.
