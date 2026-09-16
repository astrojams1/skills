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
