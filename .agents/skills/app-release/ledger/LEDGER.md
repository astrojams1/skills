# App release skill ledger

Skill version **1.0.0**. This index preserves sanitized outcomes and lessons across
apps; each application's repository remains authoritative for current progress.
Dates describe observations, not guarantees that provider state remains unchanged.

## Runs

| Run | App ledger | Outcome | Token / dollar cost |
|---|---|---|---|
| [2026-09-16 Newsworthy snapshot](runs/2026-09-16-newsworthy.md) ([JSON](runs/2026-09-16-newsworthy.json)) | [Canonical live ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json) | Web live; Apple binary/listing saved; both store releases incomplete | Unknown / unknown |

The Newsworthy record is a **historical extraction**, not an agent claim to have
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

## Add a run

Update the app's ledger after each material step. At a milestone/handoff, write a
sanitized dated snapshot under `runs/`, link the canonical app ledger, record the
skill version and actual outcome, and append a row here. New evidence can correct
an older snapshot in a clearly dated note, not by silently rewriting its history.
Keep measured costs separate from unavailable metrics. Refresh discovery copies
with the repository's `bin/manage.sh link` after changing the source skill.
