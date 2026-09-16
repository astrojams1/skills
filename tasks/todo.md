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
