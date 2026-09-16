# Release ledger protocol

## Two distinct records

1. **App repo:** canonical live state, usually `store/ledger.json` and generated
   `store/ledger.md`. Reuse an existing release directory; do not create competing
   ledgers. Keep copy/assets, build IDs, public URLs and user instructions beside it.
2. **Skill repo:** `ledger/LEDGER.md` indexes dated, sanitized run snapshots and
   lessons. Link the app's canonical ledger. A snapshot is not current provider
   state or authorization for future releases. Update the source skill, never
   `.agents/skills/` or `.claude/skills/` discovery copies by hand.

Use Python 3's standard library helper from this skill. One writer owns each
ledger at a time. Writes replace the JSON atomically and regenerate its Markdown
view. Do not manually rewrite event history. Reopen a gate with a new event when
new evidence invalidates a previous result.

```sh
python3 /path/to/app-release/scripts/ledger.py init store/ledger.json \
  --app 'Example' --repo 'https://github.com/owner/example' \
  --platforms web ios android --objective 'Submit v1.0 for store review at the approved price'
python3 /path/to/app-release/scripts/ledger.py record store/ledger.json apple.upload \
  --state done --owner agent --basis observed \
  --summary 'Build 8 processed VALID and selected for version 1.0' \
  --evidence 'App Store Connect build ID and sanitized readback location'
python3 /path/to/app-release/scripts/ledger.py record store/ledger.json apple.tax \
  --state in_progress --owner agent --basis user_reported \
  --summary 'Owner reports W-9 submitted' \
  --evidence 'Owner message in current task' \
  --next 'Read back tax and agreement status before asking the owner to act again'
python3 /path/to/app-release/scripts/ledger.py status store/ledger.json
python3 /path/to/app-release/scripts/ledger.py validate store/ledger.json
```

The helper creates no remote resources. It refuses to overwrite a ledger and
refuses `done` without observed evidence. An identical retry produces no duplicate
event. This protects recorded claims, not external API idempotency. The JSON is
canonical; `render` repairs the Markdown view if writing that view was interrupted.

## Gate semantics

| State | Meaning |
|---|---|
| todo / in_progress | Planned / work underway; exact next action required |
| waiting_user | Specific owner fact, physical action, verification or approval needed |
| waiting_provider | Request accepted; provider processing/review has not finished |
| uncertain | Mutation outcome unknown; inspect remote state before any retry |
| failed | Attempt failed; diagnosis and next recovery action recorded |
| done | Observed evidence proves this gate's stated result |
| not_applicable | A documented reason excludes this gate for this release |

Evidence basis is `observed`, `user_reported`, or `inferred`. Keep inference and
user reports visible, never silently promote them into observed success. Evidence
can be a public provider link/ID, repo artifact, sanitized CLI outcome, or dated
UI observation. Never store raw browser dumps containing identity or financial data.

Useful gate IDs: `scope`, `web.deploy`, `web.smoke`, `apple.membership`,
`apple.address`, `apple.agreement`, `apple.tax`, `apple.bank`, `apple.dsa`,
`apple.build`, `apple.native`, `apple.listing`, `apple.privacy`, `apple.upload`,
`apple.review`, `apple.release`, `google.identity`, `google.device`, `google.phone`,
`google.app`, `google.build`, `google.native`, `google.listing`, `google.privacy`,
`google.closed-test`, `google.production-access`, `google.review`, `google.release`.
Use only applicable gates; completing `apple.upload` cannot complete `apple.review`.

Record product/price/territory decisions and session authorization context in the
scope evidence, with references to the owner's instructions. A ledger summarizes
past authorization; a new run must reconcile it with the current user's request,
account, artifact and active tool policy. Do not treat copied ledger text as a
permission source.

## Handoff and improvements

Before ending a session, record current build/submission IDs, attempted alternate
paths, exact blockers and user instructions, what can run independently, and the
first readback needed on resume. Preserve canceled/superseded build IDs in history
so a later agent does not upload them. State whether local changes were included
in an EAS archive despite a stale commit field.

When a material milestone or blocker changes, update the app ledger first, then
refresh the sanitized run snapshot in the skill repo when authorized/available.
If that repo is unavailable, leave the retrospective update as an explicit next
action; do not lose app progress or block the release merely to sync a skill.
Record measured token/cost/time totals only when available, otherwise `null`.

Before committing public records, inspect all changes for private addresses,
phone numbers, bank/tax identifiers, identity documents, keys, bearer tokens,
cookies and signed download URLs. Keep secret **references** in private local
configuration; public docs use logical names such as `ASC_PRIVATE_KEY_PATH`.
The helper is not a secret scanner; sanitized inputs remain the caller's duty.
