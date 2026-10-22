# Tasks

Track current work items here. Use checkable items for progress tracking.

## Current

- [x] Add explicit first-subscription review targets with API ownership checks before mutations.
- [x] Reject duplicate, foreign and ambiguous review resources; read back every attachment.
- [x] Add regression tests preserving no-subscription and Game Center behavior.
- [x] Document optional store-data fields, bump 2.3.0, refresh discovery and run all required suites.
- [x] Prepare a shared pull request for review; no provider or consumer mutations in this change.
- [ ] Review and merge the shared pull request, then update consumer submodules.

Plan: Extend the existing review workflow narrowly for configured subscription and group versions.
Identity checks bind the group to this app, the product to the group, and each version to its parent.
Unknown resources remain conflicts; a draft cannot submit until configured targets read back.

## App release skill — September 16, 2026

- [x] Locate the owner's skills repo and read repository/spec requirements.
- [x] Create a concise app-release skill with web/native/store runbooks.
- [x] Add a resumable ledger helper, reusable Apple API helper, and Newsworthy handoff.
- [x] Validate scripts and skill behavior, run repository checks, refresh discovery copies.
- [x] Install the skill for local invocation.
- [x] Publish through [PR #59](https://github.com/astrojams1/skills/pull/59).

Plan: Keep live project status canonical in each app repository. The skill's own
ledger records sanitized run snapshots, evidence links, lessons and measured costs
when available. Existing session authorization remains in force; no blanket new
approval gates or credentials/private tax details enter the public skill repo.

### Review

- Ledger invariants: 4 behavioral tests pass; independent resume scenario passed.
- Apple helper: 4 mocked API tests pass; live read-only Newsworthy status verified.
- Skill validator passes; repository spec has 124 passes, no warnings/failures.
- Identity check passes; management suite has 46 passes after fixing case-insensitive
  instruction-file deletion on macOS. No private account/tax values enter the skill.
- Independent evaluation found metadata overclaims and mixed-platform upload
  filtering; both corrected and regression-tested.

## App Review milestone — September 16, 2026

- [x] Preserve the original snapshot and add a sanitized dated review milestone.
- [x] Document current Apple availability/submission semantics and readback limits.
- [x] Refresh discovery/installed copies and run repository checks.
- [x] Publish the validated milestone through [PR #60](https://github.com/astrojams1/skills/pull/60); GitHub records merge/check state.

Plan: Copy the canonical app ledger into a new historical snapshot, keeping old
evidence intact. Record review acceptance separately from commercial readiness
and public release. Keep private account/support details out of the skill repo.

### Review

- Preserved the first snapshot byte-for-byte and validated the new 37-event ledger.
- Spec: 124 passes; management: 46 passes; identity: pass.
- Ledger tests: 4 passes; mocked API tests: 4 passes.
- Reviewed public changes for credentials, private support references and personal
  details; removed the owner name from the new snapshot's copied evidence.
- Reviewed availability/submission documentation against current official Apple
  references and the canonical app ledger. Installed copy refreshed to v1.0.1.

## Native listing milestone — September 16, 2026

- [x] Add concise dated tax/native/gallery milestone without duplicating old snapshots.
- [x] Add supported emulator capture tip and retain unverified widget/device limits.
- [x] Refresh discovery/installed copies and run checks.
- [x] Publish through [PR #61](https://github.com/astrojams1/skills/pull/61); GitHub records merge/check state.

Plan: Use the canonical app ledger and screenshot manifest as evidence, preserve
prior history, and record only the incremental outcomes and resumable next steps.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 4 passes.
- Earlier snapshots unchanged; privacy scan and installed-copy identity passed.
- Installed v1.0.2 validates. No code or provider mutations in this update.

## Widget capture corrections — September 16, 2026

- [x] Add reusable capture planning and verified size/provenance guidance.
- [x] Preserve Newsworthy-specific corrections in a dated milestone and lessons.
- [x] Refresh discovery/installed copies and run repository checks.
- [x] Publish through [PR #62](https://github.com/astrojams1/skills/pull/62); GitHub records merge/check state.

Plan: Preserve historical snapshots. Keep current build/provider state in the app
ledger and detailed shot requirements in the app's widget gallery brief. Generalize
capture quality and evidence handling without imposing Newsworthy's design choices
on other products.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 4 passes; skill validator: pass.
- Existing snapshots preserved; new milestone contains no credentials or private
  account/contact/support details. App ledger remains authoritative.
- Discovery and installed copies match source v1.0.3. No app or store mutations.

## Widget runtime and replacement review — September 16, 2026

- [x] Record real Apple size captures and replacement review as a dated milestone.
- [x] Add log-first widget diagnosis and honest screenshot composition guidance.
- [x] Run checks, refresh discovery/installed copies, and publish [PR #63](https://github.com/astrojams1/skills/pull/63); GitHub records merge/check state.

Plan: Preserve earlier snapshots and keep the app ledger authoritative. Record
the Android loop diagnosis separately from the proposed fix and native validation.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 4 passes; skill validator: pass.
- Original snapshots unchanged; new milestone distinguishes native capture, artwork,
  review submission, diagnosis, source fix and outstanding native verification.
- Discovery and installed copies match v1.0.4; no app/store/build/UI mutations.

## Android partial verification — September 16, 2026

- [x] Record APK 8 stability evidence and remaining native checks in a new milestone.
- [x] Add concise scheduling, theme-switch and launcher-instance lessons.
- [x] Run checks, sync discovery/installed copies, and publish [PR #64](https://github.com/astrojams1/skills/pull/64); GitHub records merge/check state.

Plan: Read the sanitized app evidence, preserve earlier snapshots, and distinguish
observed stability from scheduled refresh, resizing hypotheses and unverified fixes.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 4 passes; skill validator: pass.
- Read the sanitized native evidence and provenance; earlier snapshots unchanged.
- Discovery and installed copies match v1.0.5; no app/store/build/UI mutations.

## Cross-surface design evidence — September 16, 2026

- [x] Record the design-contract checks and bounded APK 9 capture evidence.
- [x] Add concise consumption-parity and regression-baseline guidance.
- [x] Run checks, sync discovery/installed copies, and publish [PR #65](https://github.com/astrojams1/skills/pull/65); GitHub records merge/check state.

Plan: Preserve historical milestones and distinguish source/rendered-prop checks
from native layout execution. Keep provider release status in the app ledger.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 4 passes; skill validator: pass.
- Prior milestones unchanged; source/prop evidence explicitly separated from native
  engine execution and the remaining capture matrix. No provider status claims added.
- Discovery and installed copies match v1.0.6; no Newsworthy files changed.

## Apple review information request — September 17, 2026

- [x] Record the actual Guideline 2.1 information request and bounded QA state.
- [x] Add correspondence/API, complete-response and physical-evidence guidance.
- [x] Repair the reusable Notes helper phone fallback with mocked regression tests.
- [x] Run checks, sync discovery/installed copies, and publish [PR #66](https://github.com/astrojams1/skills/pull/66); GitHub records merge/check state.

Plan: Use sanitized app records read-only. Preserve historical milestones and
exclude contact values, credentials and device identifiers from the skill ledger.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; skill validator: pass.
- Phone fallback, explicit override, missing-phone no-write and readback mismatch
  regressions covered without real credentials, store writes or printed contact data.
- Historical snapshots unchanged; physical recording/testing remain pending.
- Discovery and installed copies match v1.0.7; Newsworthy files untouched.

## Native chrome and TestFlight invitation — September 17, 2026

- [x] Record the physical header regression and completed invitation milestone.
- [x] Add bounded native-chrome coverage and TestFlight relationship lessons.
- [x] Run checks, sync discovery/installed copies, and publish [PR #67](https://github.com/astrojams1/skills/pull/67); GitHub records merge/check state.

Plan: Preserve earlier snapshots; distinguish owner-confirmed physical launch
from pending verification of the replacement build's source fix.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; skill validator: pass.
- Historical snapshots preserved; invitation resolved at the new milestone while
  the replacement build's physical appearance verification remains pending.
- Discovery and installed copies match v1.0.8; Newsworthy files untouched.

## Apple review resubmission — September 17, 2026

- [x] Record verified build 7 resubmission and precise recording coverage.
- [x] Add rejected-item resolution and cloud-file download evidence lessons.
- [x] Run checks, sync discovery/installed copies, and publish [PR #68](https://github.com/astrojams1/skills/pull/68); GitHub records merge/check state.

Plan: Preserve historical milestones and the original recording's evidence scope.
Keep live release status canonical and omit private account/file details.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; skill validator: pass.
- OpenAPI 4.4.1 item-resolution and submission schemas checked locally.
- Historical snapshots unchanged; recording coverage and unshown checks explicit.
- Discovery and installed copies match v1.0.9; no app/UI/provider mutations.

## Notification release evidence — September 24, 2026

- [x] Add a sanitized notification milestone without advancing pending release gates.
- [x] Capture credential, delivery-evidence and privacy-alignment lessons.
- [x] Refresh discovery copies, run required checks, and prepare the PR change.

Plan: Preserve v1.0.9 instructions and all earlier snapshots. Record the release
task's verified checkpoint; the app ledger owns subsequent build and review state.
Do not retain credentials, private contact details, device identifiers or tokens.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes.
- v1.0.9 instructions and historical snapshots are unchanged; discovery copies
  contain the new checkpoint. No Newsworthy checkout or provider state was changed.
- Build 21 remains processing in this snapshot; credential setup, physical
  delivery and Apple resubmission remain pending. Later evidence belongs in the
  canonical app ledger and a subsequent milestone.

## Notification delivery handoff and resubmission — September 24, 2026

- [x] Record build 21 validation, APNs handoff and verified Apple resubmission.
- [x] Preserve the physical visibility/tap limitation and retry/inventory lessons.
- [x] Refresh discovery copies, run required checks, and prepare the PR change.

Plan: Add a new checkpoint from the release task's verified evidence; preserve the
earlier processing snapshot and v1.0.9 instructions. Exclude credential IDs,
tokens, private device details and browser Home Screen captures.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; diff whitespace: pass.
- Prior checkpoints and v1.0.9 instructions remain unchanged. Discovery copies
  include the new sanitized milestone; no Newsworthy or provider state was changed.
- Both Apple review states and build selection are recorded separately from
  approval/public availability; physical banner and tap remain unverified.

## Store readiness follow-up — September 24, 2026

- [x] Record fresh Apple/Google gates and Android build/configuration limits.
- [x] Capture evidence-scope and authenticated-fallback lessons.
- [x] Refresh discovery copies, run required tests, and prepare the PR change.

Plan: Add a compact sanitized checkpoint, preserving earlier snapshots and skill
instructions. Distinguish generic document receipt from a verified legal-address
correction; distinguish accepted Firebase terms and verified project creation
from completed Android push setup.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; diff whitespace: pass.
- Earlier milestones and v1.0.9 instructions unchanged; discovery copies refreshed.
- No private correspondence/contact data retained and no Newsworthy/provider edits.
- Current feature scope, generic document receipt and fresh provider readbacks are
  distinguished from artifact coverage, case linkage and release readiness.

## Android push verification and renewed Apple request — September 24, 2026

- [x] Record Android build 12 emulator coverage and Apple's new 2.1 request.
- [x] Add reusable delivery-scope, failing-process and recording-provenance guidance.
- [x] Refresh discovery copies, verify, and prepare the v1.0.10 PR change.

Plan: Preserve prior snapshots, distinguish emulator from physical-device evidence,
and keep the latest Apple rejection separate from earlier guideline history.
Retain no credentials, private device details or recording paths.

### Review

- Management suite: 53 passes; specification: 124 passes; AGENTS-only identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; diff whitespace: pass.
- New milestone separates emulator evidence from physical-device QA and records
  the actual new Apple request without treating an omitted guideline as approval.
- Installed-copy sync follows merge; preserve its six local-only historical
  milestones and index rows. No Newsworthy files or provider state changed here.

## Recording interpretation correction and resubmission — September 24, 2026

- [x] Correct the inference that Apple's generic message required a new recording.
- [x] Record existing-attachment verification, inspected new media and resubmission.
- [x] Refresh discovery copies, verify and prepare the v1.0.11 PR change.

Plan: Preserve the previous snapshot with a dated correction. Teach agents to
inspect existing evidence before asking the owner to repeat work, and retain the
new recording's actual coverage and unverified OS/build limits.

### Review

- Management suite: 53 passes; specification: 124 passes; AGENTS-only identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; diff whitespace: pass.
- The old snapshot carries an explicit dated correction; the new milestone records
  actual media coverage and resubmission without claiming an unshown OS/build.
- Installed-copy sync follows merge while retaining local-only history. No
  Newsworthy files, private recording paths or provider state changed here.

## YouTube Shorts skill — October 21, 2026

- [x] Measure what YouTube's player hides from the owner's screenshot of the
      Newsworthy trailer playing on an iPhone 16 Pro, fitted to the source frame.
- [x] Keep the zones as data (`assets/zones.json`) with a contact-sheet checker
      and a screenshot-fit script, so later runs re-measure instead of guessing.
- [x] Write SKILL.md, the safe-zone and posting references and the ledger.
- [x] Tests for the zones, the checker (with ffmpeg) and the fit; refresh
      discovery copies, including app-release's, stale since 2.2.0.

Plan: The owner's report was that the trailer "does not frame well when viewed
with all the YouTube chrome". Record that as a measured constraint, not a
rule of thumb, and make the desk check show it before anything is uploaded.
The screenshot shows the owner's face and channel, so only numbers enter this
public repository.

### Review

- Fit on the real screenshot: scale 1.2378, offset (−66.4, −4.2), match 0.987
  with the default box; 0.997 matching on the clock region. Synthetic test
  recovers a known placement within 0.003 in scale and 3 px.
- The checker on the trailer flags the same beats the owner saw: supers in the
  top band, cards under the rail, phone mock-ups under the stack.

## youtube-shorts 0.2.0: compose, don't shrink — October 21, 2026

- [x] Record the owner's correction in `tasks/lessons.md`.
- [x] SKILL.md and the safe-zone reference: compose for the box's proportions;
      devices may run off the bottom edge; one-line caption headlines.
- [x] `fit-screenshot.py --preview`: lay a screenshot's marked controls over
      new frames; tested on a synthetic placement.
- [x] Ledger version row; Newsworthy's third cut as a run.

### Review

- Diff-based control extraction was tried first and ghosted: anything that
  moved between the screenshot and the frame, and every edge YouTube's
  re-encode softened, came along. Marked boxes plus "white inside the mark"
  are deterministic and clean.


## app-release 2.2.1: app-record creation — October 22, 2026

Plan: Correct the public-API/owner-only conflation in shared guidance, retain historical evidence,
document verified identity readback and a supported Xcode fallback, then run all repository checks.
Keep consumer repositories and provider state unchanged during this documentation update.

### Review

- Management: 53 passed; specification: 138 passed, no warnings; AGENTS-only identity passed.
- App-release: 62 passed. YouTube Shorts: 5 passed, 1 skipped because ffmpeg is unavailable.
- Screenshot-fit checks passed with the bundled Python runtime (system Python lacked numpy/Pillow).
- Read-only review: Newsworthy uses `vendor/skills`, Space Worms and Importron use `skills`; all retain
  the same config fields and commands. Existing Newsworthy/Space Worms IDs remain in their app configs;
  Importron's ID remains empty while unverified. No consumer migration is required by this docs patch.
- No claim of Importron app-record creation, upload or submission; provider work stays in its app ledger.

## app-release 2.2.2: verified app-record creation — October 22, 2026

### Review

- App-release tests: 62 passed; management: 53 passed; specification: 138 passed, no warnings;
  AGENTS-only identity passed; bundled-Python screenshot-fit test: 8 passed.
- YouTube Shorts: 5 passed, 1 skipped because ffmpeg is unavailable. No failing tests.
- Refreshed discovery copies; read-only consumer config review covers Newsworthy, Space Worms and
  Importron. No config fields or commands changed; no app repositories edited by this patch.
- Verified the sanitized public identity receipt. Record creation is proven independently of the UI
  warning; access-setting correctness, upload, subscription setup, review and release remain distinct.

## app-release 2.3.0: first-subscription review — October 22, 2026

### Review

- App-release: 77 passed (15 new), including the real submit orchestration against a mocked Apple API.
  Wrong app/bundle/product/version ownership and unexpected or duplicate held items produce zero writes.
- Partial drafts resume without duplicate attachment; failed readback, dropped write response and
  concurrent unexpected resource tests stop further writes. No-subscription and leaderboard tests pass.
- Management: 53 passed; specification: 138 passed, no warnings; identity passed; screenshot fit: 8 passed;
  YouTube: 5 passed, 1 skipped because ffmpeg is unavailable. Whitespace and discovery equality passed.
- Read-only consumer inspection: Newsworthy/Space Worms have no subscription review target fields;
  Importron has explicit product/group versions. No config/command migration is required for existing apps.
- Checked include/fields and create-item relationships against Apple's downloaded OpenAPI 4.5.1 schema.
  Provider mutations were mocked; this change does not claim a live submission. Added a docs-only upload
  metadata lag observation separately from build validity/testability, without changing upload polling.
