# 2026-10-31 — Use the available review attachment surface

The owner corrected a review-recording transfer that built a custom Photos
exporter before inspecting the already-open App Review reply's Attach File
control. The native chooser exposed ordinary files and Media Photos/Movies.
A later picker failure/cancellation also obscured an earlier successful export;
the actual saved movie was complete and playable. App-specific identities,
media, credentials and current review state remain in the app's release records.

Root cause: the agent chose a more complex transfer route without checking the
existing supported surface, then relied on a last-attempt status instead of
reconciling the saved artifact. The shared entrypoint now routes to concise iOS
guidance for chooser discovery, artifact validation/reuse and destination-specific
upload verification. Public API use remains supported, explicit owner UI choices
are honored, and custom exporters require a demonstrated limitation of useful
supported routes. No broad library grant or private source access is implied.

The lesson does not relax the actual reviewer's evidence requirements. Physical
capture, submitted build, requested current OS and paid-flow coverage need their
own proof; an attachment upload, Notes save, reply and accepted resubmission are
different outcomes. The source change does not establish that the app is ready
or that Apple accepted it.

Verification:182 app-release tests,65 management checks,146 specification checks,
AGENTS identity,8 image-fit checks,5 YouTube tests and the skill-creator validator
pass. The existing ffmpeg-dependent YouTube check explicitly skips. Generated
discovery copies are refreshed. Eleven consumer configurations normalize; no
schema, command or store-data migration is required.

An independent read-only forward check covers a direct Photos chooser, a valid
export followed by a cancelled receipt with missing required evidence, and an
API-supported attachment after correspondence. It preserves the owner's route,
avoids needless transfer/handoff, retains evidence gaps and does not infer
submission authority or Apple acceptance. No actionable ambiguity was found.

| Encountered issue | Correction / verification | State |
| --- | --- | --- |
| Diagnostic reads assumed optional `.github` and JSON run companions, then a wildcard matched no files | Read actual AGENTS/Markdown records and enumerated existing artifacts; required policy/check results retained | Resolved |

No executable helper or public command changes. This source snapshot records
pre-publication verification; live PR/merge receipts are kept in the activity and
owning app ledgers. Consumer adoption remains a separate per-app pointer update.
Token/dollar metrics are unavailable.
