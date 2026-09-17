# App release skill ledger

Skill version **1.0.7**. This index preserves sanitized outcomes and lessons across
apps; each application's repository remains authoritative for current progress.
Dates describe observations, not guarantees that provider state remains unchanged.

## Runs

| Run | App ledger | Outcome | Token / dollar cost |
|---|---|---|---|
| [2026-09-16 Newsworthy snapshot](runs/2026-09-16-newsworthy.md) ([JSON](runs/2026-09-16-newsworthy.json)) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Web live; Apple binary/listing saved; both store releases incomplete | Unknown / unknown |
| [2026-09-16 Newsworthy review milestone](runs/2026-09-16-newsworthy-review-submitted.md) ([JSON](runs/2026-09-16-newsworthy-review-submitted.json)) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Apple WAITING_FOR_REVIEW; paid release unverified; Google owner/device and host gates remain | Unknown / unknown |
| [2026-09-16 Newsworthy tax/native gallery milestone](runs/2026-09-16-newsworthy-native-gallery.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | W-9 Active; Android v6 core UI/recovery checked and gallery ready; banking and store gates remain | Unknown / unknown |
| [2026-09-16 Newsworthy capture corrections](runs/2026-09-16-newsworthy-capture-corrections.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | About removed; clean widget capture brief recorded; new native capture evidence pending at handoff | Unknown / unknown |
| [2026-09-16 Newsworthy widget evidence and replacement review](runs/2026-09-16-newsworthy-widget-runtime.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Apple small/medium captured and replacement WAITING_FOR_REVIEW; Android update loop diagnosed, fix unverified at handoff | Unknown / unknown |
| [2026-09-16 Newsworthy Android partial verification](runs/2026-09-16-newsworthy-android-partial-verification.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | APK 8 stable for 65 seconds; initial refresh succeeded; recurring execution, fresh compact resize and theme fix unverified at handoff | Unknown / unknown |
| [2026-09-16 Newsworthy surface design contracts](runs/2026-09-16-newsworthy-surface-design.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | 189 local app tests reported passing; APK 9 compact 2×2 dark approved/captured; contract checks are not native rendering tests | Unknown / unknown |
| [2026-09-17 Newsworthy review information request](runs/2026-09-17-newsworthy-review-information.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Guideline 2.1 information request; Notes saved; empty internal TestFlight group; physical recording/testing pending | Unknown / unknown |

The initial Newsworthy record is a **historical extraction**, not an agent claim to have
finished the release. It includes a user-reported W-9 completion awaiting readback,
an acknowledged address-correction request awaiting Apple approval, completed
privacy/DSA steps, a fixed Android build still needing visual verification, and
Google device/phone/testing gates. No private addresses, phone, tax or banking data
are stored here. See its canonical ledger before resuming.

## Lessons incorporated into v1.0.0

- Reconcile authorization with the current task. Repeatedly asking for already
  authorized routine form details slowed progress; new support communication or
  binding attestations still follow the actual active policy.
- Test all supported authenticated paths before declaring a user-only blocker.
  A connector without project access did not prevent using the signed-in dashboard.
- Preserve request acceptance vs completion. Apple support receipt is not an
  address update; W-9 submission is not an active paid agreement; an uploaded
  binary is not store review or release.
- Inspect the existing US tax-form row. The add-form country picker can be a
  dead end when the required form already exists.
- Store asset source/provenance beside copy and upload automation. Native evidence
  exposed an Android decoder bug that web verification had missed.
- Separate emulator startup crashes from app failures. Reuse working SDKs and
  record environment fixes rather than committing downloaded SDKs or credentials.
- Stalled EAS upload had a successful official Apple uploader fallback after
  checking remote state and canceling the duplicate queue item.
- Check current docs: Expo's Android submit path now supports initial internal
  release creation with an existing app/service account; manual first upload is
  not a permanent universal rule.

## Lessons incorporated into v1.0.1

- API review drafts and actual submissions are separate. Attach the intended
  version, resolve validation errors from source evidence, then submit the draft
  and independently read back both version and submission.
- Current availability uses v2 resources. Enabled territories and automatic
  release settings do not prove sale eligibility; the seed app reached review
  while all territories still reported `CANNOT_SELL`.
- A locked host blocks native capture and signed-in native UI, not authenticated
  API work. Continue independent safe paths; do not claim missing visual checks.
- Keep the original handoff snapshot unchanged. This second milestone records
  Apple acceptance at 2026-09-16T04:53:38.974Z, with W-9 processing, banking,
  address correction and public sale still independently unverified.

## Lessons incorporated into v1.0.2

- Signed-in tax-form readback promoted the W-9 from owner-reported to verified
  Active; banking and agreement readiness still required separate evidence.
- Supported emulator screenshot controls preserve native PNG sources for store
  art. Record the working shortcut as a dated observation and check local settings.
- Verify the corrected existing native artifact before rebuilding. Name the
  feature/device scope: foreground success does not verify widgets or real devices.

## Lessons incorporated into v1.0.3

- Plan capture content and native size coverage before composing listing artwork.
  User choices about removed screens, wallpaper and icon clutter belong in the
  app brief; reusable guidance should preserve those choices without exporting
  one app's design preferences to other products.
- Supported widget sizes in source and visually verified variants are separate
  facts. Preserve original native evidence and leave blocked captures pending.
- A developer-withdrawn review is not a reviewer rejection. Preserve the previous
  submission milestone as history and read current replacement/build state from
  the canonical app ledger.

## Lessons incorporated into v1.0.4

- A real widget viewport may be framed in editable artwork when wallpaper
  controls are unavailable. Preserve the original capture and describe the
  composition honestly; framing does not prove the wallpaper was changed.
- Diagnose flicker and interrupted resize from native logs before assigning blame
  to control tooling or the user. Package/receiver scheduling loops can recreate
  widgets during interaction. Source-supported sizes still need native checks.
- Distinguish the diagnosed cause, proposed source fix, replacement build and
  verified outcome. Replacement review acceptance remains separate from release.

## Lessons incorporated into v1.0.5

- Verify continued refresh scheduling after an update-loop fix; an initial success,
  pending recurring job and observed recurring execution are separate evidence.
- Switch themes without new data to expose colors retained in rendered spans.
- Distinguish provider dimensions from an existing launcher item's minimum span;
  cached sizing remains a hypothesis until fresh native resize checks resolve it.

## Lessons incorporated into v1.0.6

- Verify design token consumption across surfaces, including semantic sizes,
  baselines and theme resources; build success or token generation is insufficient.
- Exercise known regressions and actual pre-fix artifacts. Source guards fail on
  unsupported structures; do not silently accept a changed baseline.
- Keep source/rendered-prop contracts and actual native captures separate. One
  approved size/theme does not verify the remaining native surface matrix.

## Lessons incorporated into v1.0.7

- Obtain the actual review message before fixing an assumed defect. User-pasted
  text can unblock response preparation when correspondence UI access fails.
- API review state, browser access and correspondence are distinct capabilities.
  Keep the requested response in both Notes and reply; preserve contact phone in
  the Notes mutation without copying its value into the public ledger.
- TestFlight readiness and an empty group do not prove invitation, installation
  or QA. A physical-device/latest-OS recording request needs physical evidence.

## Add a run

Update the app's ledger after each material step. At a milestone/handoff, write a
sanitized dated snapshot under `runs/`, link the canonical app ledger, record the
skill version and actual outcome, and append a row here. A concise incremental
milestone note can link the canonical ledger and new artifacts instead of
duplicating the entire event history. New evidence can correct
an older snapshot in a clearly dated note, not by silently rewriting its history.
Keep measured costs separate from unavailable metrics. Refresh discovery copies
with the repository's `bin/manage.sh link` after changing the source skill.
