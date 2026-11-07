# 2026-10-31 — Never require mirroring

The owner corrected a recovery that treated mirrored access as necessary for
physical QA and recording transfer. The process confused required evidence with
one optional transport. The shared entrypoint now forbids requiring Mac screen
mirroring or iPhone Mirroring for QA, device checks, recording transfer,
submission or release, and forbids initiating its setup/authentication as a release
dependency. Mirroring is optional only when the owner explicitly chooses it;
another remote-control tool cannot replace it as a mandatory route.

Preserve completed exact-build owner approval. Reuse existing feedback,
owner-provided physical recordings, supported native QA and the direct
attachment/API routes. A genuinely missing reviewer requirement becomes a narrow
evidence request. Physical capture, build, requested OS and paid-flow coverage
remain factual requirements; simulator footage does not substitute for a required
physical recording. App-specific approvals and current provider state remain in
the app's own records.

Verification: 191 release tests, 65 management checks, 146 specification checks,
AGENTS identity, 8 image-fit checks, 5 YouTube tests and skill-creator validation
pass. One existing ffmpeg-dependent test skips. Generated copies match source;
eleven consumer configs normalize without migration. An independent dry-run
preserves completed exact-build approval, requests only genuinely missing
physical evidence, and keeps owner-chosen optional mirroring outside release
dependencies. No actionable ambiguity was found.

No executable helper, public command or config-schema changes. This source
snapshot records pre-publication verification; exact-head hosted review, merge
and consumer adoption receipts are retained separately. No Apple-state claim is
made by this source task.

| Encountered issue | Correction / verification | State |
| --- | --- | --- |
| A multi-file patch assumed an older lesson heading | Inspected the actual clean diff and retried with the current heading; final diff contains all intended scoped edits | Resolved |
| Optional tool-location discovery assumed an absent application path | Reused the known existing runtime/validator paths instead | Resolved |

Token/dollar metrics are unavailable. No new paid service is used.
