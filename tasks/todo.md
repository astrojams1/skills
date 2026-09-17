# Tasks

Track current work items here. Use checkable items for progress tracking.

## Current

- [ ] (no active tasks)

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
- [ ] Run checks, sync discovery/installed copies, and publish a PR.

Plan: Preserve historical milestones and the original recording's evidence scope.
Keep live release status canonical and omit private account/file details.

### Review

- Management suite: 46 passes; specification: 124 passes; identity: pass.
- Ledger tests: 4 passes; mocked Apple API tests: 8 passes; skill validator: pass.
- OpenAPI 4.4.1 item-resolution and submission schemas checked locally.
- Historical snapshots unchanged; recording coverage and unshown checks explicit.
- Discovery and installed copies match v1.0.9; no app/UI/provider mutations.
