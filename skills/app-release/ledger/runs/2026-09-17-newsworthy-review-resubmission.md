# Newsworthy — build 7 review resubmission

Recorded: **2026-09-17**. Skill version: **1.0.9**. Token/cost metrics: unknown.

This sanitized milestone records the release task's provider and recording
evidence. Earlier snapshots remain unchanged. The
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md),
[resubmission evidence](https://github.com/astrojams1/newsworthy/blob/main/store/apple-review-resubmission.json)
and [recording manifest](https://github.com/astrojams1/newsworthy/blob/main/store/apple-physical-review-video.json)
remain authoritative for subsequent progress and provenance.

## Verified submission

- The six-part **3,485-character** reply and **66-second physical demonstration**
  were posted in App Review. The browser showed the second message and the
  attachment's Download control. The exact same Notes text was saved through the
  phone-preserving API helper. These were separately verified actions.
- Valid **build 7** was selected through the API. After reading the existing
  submission and its items, the addressed rejected item was patched with
  `resolved: true`, reaching `READY_FOR_REVIEW`. The existing submission was then
  patched with `submitted: true`.
- At **2026-09-17T04:33:43.363Z**, independent readback showed **both the version
  and submission `WAITING_FOR_REVIEW`**, with the selected build confirmed.
  Reply/attachment delivery alone had not completed resubmission.

## Recording coverage and file lesson

The original recording was retained in ignored local artifacts. The review copy
removed **42 seconds of initial idle time** and audio while preserving the
continuous remaining sequence. Source frames and the derivative contact sheet
were inspected. The recording showed small/medium Home Screen widgets, launch,
the TestFlight welcome identifying **1.0.0 (7)**, the score/explanation/update
time, a plain title and Share icon without capsules, then Home Screen widgets
again. The **91,102,860-byte** derivative was verified before upload.

It did **not** demonstrate opening Share, footer navigation, dark appearance,
larger text, offline behavior or physical iPad behavior. Those checks were not
inferred from the recording or the successful submission.

An earlier local iCloud entry appeared to be 201 MB but had zero allocated blocks
and was dataless. AVFoundation timed out with POSIX 60; metadata reported uploaded
and download-requested while still not downloaded. A supported browser download
then produced real bytes. The lesson is to inspect cloud/download metadata and
verify readable media and hashes before upload, rather than blaming the owner's
phone upload from a file listing alone. No personal filename or private link is
retained in this milestone.

## Remaining release boundary

Apple approval and public release were **not established**. Apple banking and
address work, and Google's real-device, phone and applicable 12-tester/14-day
gates remained separate at handoff. Both public store releases remained an
unfinished objective; current state belongs in the app ledger.
