# App release skill ledger

Skill version **2.3.0**. This index preserves sanitized outcomes and lessons across
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
| [2026-09-17 Newsworthy native header and TestFlight invitation](runs/2026-09-17-newsworthy-native-chrome.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Invitation resolved and physical launch owner-confirmed; native glass-header fix still awaiting replacement-build verification | Unknown / unknown |
| [2026-09-17 Newsworthy build 7 resubmission](runs/2026-09-17-newsworthy-review-resubmission.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Physical demo/reply delivered; build 7 version and submission WAITING_FOR_REVIEW; neither approval nor public release established | Unknown / unknown |
| [2026-09-24 Newsworthy notification checkpoint](runs/2026-09-24-newsworthy-notification-release.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Backend deployed and privacy aligned; build 21 processing; APNs setup, physical delivery and resubmission pending | Unknown / unknown |
| [2026-09-24 Newsworthy notification resubmission](runs/2026-09-24-newsworthy-notification-resubmission.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Build 21 VALID/IN_BETA_TESTING; APNs handoff OK; physical subscription controls verified; both Apple review states WAITING_FOR_REVIEW; banner/tap unobserved | Unknown / unknown |
| [2026-09-24 Newsworthy store follow-up](runs/2026-09-24-newsworthy-store-followup.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | iOS 21 still waiting; Apple paid/address and Google verification gates remain; Android artifact predates current features; Firebase project created, Android push setup pending | Unknown / unknown |
| [2026-09-24 Newsworthy Android push and renewed Apple request](runs/2026-09-24-newsworthy-android-push-apple-request.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Android 12 delivery/shade/cold-start tap verified on emulator; physical Android untested; Apple 21 rejected under 2.1 with new recording pending | Unknown / unknown |
| [2026-09-24 Newsworthy recording correction and resubmission](runs/2026-09-24-newsworthy-recording-correction-resubmission.md) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.md) | Earlier new-recording interpretation corrected; original attachment verified; new 39-second video/reply/Notes delivered; build 21 WAITING_FOR_REVIEW | Unknown / unknown |
| [2026-10-22 Importron app-record creation](runs/2026-10-22-importron-app-record.md) | [Canonical app ledger](https://github.com/astrojams1/importron/blob/main/store/ledger.json) | Browser creation independently verified through the API; access-settings warning did not mean record creation failed | Unknown / unknown |
| 2026-10-19 v2.0.0 consolidation | Newsworthy [`store/ledger.json`](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json); Space Worms [`local-skills/app-store-release/ledger.json`](https://github.com/astrojams1/space-worms-2/blob/main/local-skills/app-store-release/ledger.json) | Both apps moved onto the shared scripts and ledger format; see v2.0.0 below | Unknown / unknown |

The initial Newsworthy record is a **historical extraction**, not an agent claim to have
finished the release. It includes a user-reported W-9 completion awaiting readback,
an acknowledged address-correction request awaiting Apple approval, completed
privacy/DSA steps, a fixed Android build still needing visual verification, and
Google device/phone/testing gates. No private addresses, phone, tax or banking data
are stored here. See its canonical ledger before resuming.

## Lessons incorporated into v2.3.0 (2026-10-22)

- A first-subscription submission contains distinct product and group review-version items. Treating
  every non-leaderboard item as an app version falsely rejected a valid subscription draft. Optional
  store-data targets now bind both versions through their API parents before attachment and submission.
- Compound submission safety remains strict: unknown, duplicate, ambiguous and foreign resources are
  conflicts; partial attachment resumes through readback, and both submission/version states are read
  independently after submit. Mock API regressions cover ownership refusal and zero-mutation behavior.
- Apple rejected a schema-valid include list containing both experiment variants. Item reads now request
  all relationship fields but expand only supported resource types; the corrected query and ownership
  chain were verified read-only against the real empty draft. No submission or attachment was performed
  by that verification.
- During the Importron upload, an independent processed/testable build readback advanced while its
  upload resource still reported processing. The iOS gotchas preserve these separate observations and
  require state inspection before retrying; this patch does not alter upload polling or claim COMPLETE.
- Newsworthy and Space Worms have no configured subscription review targets and retain their existing
  config/command contracts. Importron supplies explicit targets in its own store data. This shared
  change itself performed no provider writes or app-repository changes; live evidence stays in each app.

## Lessons incorporated into v2.2.2 (2026-10-22)

- Importron's record was created in an authorized signed-in Chrome session and independently read back
  through the public API. Apple reported success for creation but a failure saving user-access settings;
  the expected draft record still existed. Separate the two outcomes, verify identity before retrying,
  and compare actual/intended access instead of silently treating the warning as harmless for every app.
- This documentation patch changes no config fields or command contracts. Newsworthy, Space Worms and
  Importron use the same existing app-ID setting; consumer pointer updates follow merge.

## Lessons incorporated into v2.2.1 (2026-10-22)

- An API limitation was incorrectly presented as owner-only work during Importron onboarding. Historical
  proof shows Space Worms' record was created in the owner's signed-in browser session on 2026-10-12:
  [commit e4eeecba](https://github.com/astrojams1/space-worms-2/commit/e4eeecba35e41251ddcdc2e8b74c9ce5d8019b5e).
  The workflow now creates or reuses records through authorized browser UI, verifies identity and
  platform, and persists `ios.ascAppId`; Apple's documented Xcode Organizer flow is a fallback.
- Existing session authorization remains in force. Failed UI automation is a tooling blocker, not proof
  that the owner must create an app. This documentation correction does not establish that Importron's
  record was created or that any build was uploaded or submitted.
- Compatibility review covers Newsworthy (`vendor/skills`), Space Worms (`skills`) and Importron
  (`skills`): no config or command contract changes; consumer submodule bumps follow merge.

## Lessons incorporated into v2.2.0 (2026-10-20)

- Space Worms' owner, reading App Store Connect's "New Ways to Market Apps" banner: every app uses the product page
  header, the search-results creative and iPhone Duo screenshots. `asc.mjs assets` lists, uploads and places them
  through the Asset Library (`appAssetLibraryImages`, `appAssetLibraryPlacements`, OpenAPI 4.5.1); the live specs
  came from `appAssetLibraryRefData`. The Duo profile holds 10 screenshots for both displays together.

## Lessons incorporated into v2.1.1 (2026-10-20)

- Space Worms build 12: `ios-release.mjs archive` failed bundling because Metro's shared cache in the system
  temporary folder held a DOM-component entry pointing into another checkout of the same app. Archives and Android
  bundles now run with a fresh `<build>/tmp` as `TMPDIR` (`lib/build-tmp.mjs`), so every release bundles from its
  own checkout alone.

## Lessons incorporated into v2.1.0 (2026-10-20)

- Space Worms' owner, preparing its first update: every update rechecks the store screenshots and copy against the
  build and ships release notes written for the app's audience (features and what feels faster, no jargon).
  `asc.mjs listing` now refuses an update whose `listing.whatsNew` is empty, where it used to skip the notes silently.

## Lessons incorporated into v2.0.0 (2026-10-19)

Audit of Newsworthy and Space Worms, which had each grown its own release skill since v1.0.11:

- **One process, per-app data.** Both apps now run the same scripts from this skill with an
  `app-release.config.json` and a store data file; each keeps a thin repository skill for its own facts.
  Space Worms' hardened App Store Connect, iOS and Android scripts became the base; Newsworthy contributed
  `promote`, push and widget checks, Play listing and artwork through the API, paid pricing, and the
  hold-for-review commit.
- **Local builds, no EAS.** Both apps had already moved store builds to the owner's Mac (14–15 October)
  after the shared free plan's 15 monthly iOS credits ran out; EAS submission and the stalled-upload
  fallback are gone from the instructions. Newsworthy uploaded the first locally built `.ipa` (build 28,
  2026-10-14, `altool --upload-package`, VALID and in Release QA, recorded in its open PR #210); Space Worms'
  local archives have only been validated so far.
- **One ledger format.** Space Worms kept only a hand-written ledger; Newsworthy kept a JSON gate ledger
  (112 gates, about 30 of them product verification) plus a build ledger. Both now keep the JSON gate ledger
  with a generated view (release gates first, product verification after), a hand-written run log, and an
  entry per record in the owner's shared activity ledger. `status` flags gates idle for a week.
- **Play commits differ by situation.** `ERROR_IF_IN_REVIEW` keeps a testing upload from cancelling a review
  (Space Worms); `changesNotSentForReview=true` is required while a submission stands rejected, and then a
  separate `:validate` refuses the edit (Newsworthy version 16). Both are now flags of one script.
- **An API commit publishes Play's last saved listing**, discarding a console "Save as draft".
- **Rejections:** App Review's message is not in the API; read the owner's email through the Gmail
  connector before asking. Google's News and Magazines policy needs publisher details in the app.

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

## Lessons incorporated into v1.0.8

- Record SDK/runtime/device coverage and inspect OS-generated native chrome.
  Older simulator captures and JS prop checks do not prove newer physical-OS
  appearance or verification of a source fix.
- Group build availability, invitation state and direct tester-build relationships
  are distinct evidence. Read back the invitation and confirm installation instead
  of treating an empty direct list or an imagined Resend control as decisive.

## Lessons incorporated into v1.0.9

- A reply/attachment is not a resubmission. Resolve the addressed rejected item,
  submit the existing submission, and read back both review states and the build.
- Retain the original recording, document any initial-idle trim/audio removal,
  and claim only visible coverage. Submission acceptance is not approval or live.
- Cloud listing size can describe a dataless placeholder. Inspect download
  metadata and verify real media bytes/hashes before diagnosing an upload failure.

## Notification checkpoint lessons

The September 24 notification checkpoint adds operational lessons without
changing the v1.0.9 instructions: distinguish signing capability, delivery
credentials, Expo tickets, APNs handoff receipts and physical visibility; compare
store disclosures with the shipped manifest; reuse authenticated paths while
preserving production secret access boundaries.

The later resubmission milestone records successful APNs handoff and physical
subscription changes while retaining the banner/tap visibility limit. Refresh
browser sessions and check key inventory before repeating credential creation;
verify the selected build and both Apple review states after submission.

The store follow-up records a superseded Android artifact and unresolved account
gates. Prior build verification does not cover later features or listing claims;
a generic document acknowledgment does not establish case linkage or a corrected
legal record.

## Lessons incorporated into v1.0.10

- Pair notification receipt evidence with actual presentation and cold-start tap;
  identify the artifact and emulator/physical coverage precisely.
- Attribute an emulator interruption to its observed failing process; a SystemUI
  ANR is not evidence of an app crash.
- Treat each new review message and recording request independently. An omitted
  earlier guideline is not approval, and an older video cannot verify new features.

## Lessons incorporated into v1.0.11

- Separate the reviewer's words from an inferred reason for repeating a request.
  Inspect existing attachment access/provenance and saved Notes before asking the
  owner to redo work; recommend extra coverage without claiming it was explicit.
- Inspect each supplied recording and preserve unshown OS/build limits. A new
  file, feature coverage and successful submission do not establish latest-OS QA.

## Add a run

Update the app's ledger after each material step. At a milestone/handoff, write a
sanitized dated snapshot under `runs/`, link the canonical app ledger, record the
skill version and actual outcome, and append a row here. A concise incremental
milestone note can link the canonical ledger and new artifacts instead of
duplicating the entire event history. New evidence can correct
an older snapshot in a clearly dated note, not by silently rewriting its history.
Keep measured costs separate from unavailable metrics. Refresh discovery copies
with the repository's `bin/manage.sh link` after changing the source skill, and run
`node --test tests/app-release/*.test.mjs` after changing a script.
