# Release ledger protocol

Every app keeps the same three records, plus one shared one. Paths come from `app-release.config.json`.

| Record | Path (config) | What it holds | How it changes |
|---|---|---|---|
| **Gate ledger** | `ledger.gates` (JSON) | Each gate's state, owner, evidence basis, result, evidence and next action, with an append-only event history | Only through `ledger.mjs record` |
| **Gate view** | `ledger.view` (Markdown) | Generated: release gates, then product verification gates, then history | `ledger.mjs render`; never by hand |
| **Run log** | `ledger.runs` (Markdown) | One dated entry per run (including runs that change nothing): request, builds with ids/commit/SHA-256, submissions, what was manual, cost (EAS credits, sandbox minutes, tokens when measured), retries and lessons; a bug-fix table | By hand, in the same pull request as the work |
| **Activity ledger** | `activityLog` (the owner's `events.jsonl`) | One machine-readable event per record, across all skills | Appended by `ledger.mjs record` through the owner's helper |

The skill's own [LEDGER.md](../ledger/LEDGER.md) indexes sanitized run summaries and lessons across apps;
it is history, never live state or permission for another app.

## Commands

```bash
S=skills/skills/app-release/scripts
node $S/ledger.mjs init --objective "Ship 1.0 free on both stores"     # once; refuses to overwrite
node $S/ledger.mjs status                                             # unfinished gates, stale ones flagged
node $S/ledger.mjs record --gate apple.upload --state done --owner agent --basis observed \
  --summary "Build 12 VALID and in Release QA" --evidence "asc.mjs status 2026-10-20" --evidence "summary.json sha256 …"
node $S/ledger.mjs record --gate apple.review --state waiting_provider --owner provider --basis observed \
  --summary "Submission s1 WAITING_FOR_REVIEW with build 12" --next "asc.mjs status until Apple decides"
node $S/ledger.mjs validate | render | check
```

`record` keeps a gate's owner, basis and next action when omitted (`--next ""` clears it), writes the JSON
atomically and regenerates the view. An identical retry adds nothing. Set `APP_RELEASE_RUN_ID` to group a
run's activity events (default `app-release-<slug>-<date>`).

## Gate semantics

| State | Meaning |
|---|---|
| todo / in_progress | Planned / under way; next action required |
| waiting_user | A specific owner fact, physical action, verification or approval is needed |
| waiting_provider | Apple or Google accepted a request and has not finished (processing, review) |
| waiting_verification | Done by someone, not yet read back or checked on the real target |
| uncertain | A mutation's outcome is unknown; read provider state before any retry |
| failed | The attempt failed; diagnosis and recovery recorded |
| done | Observed evidence proves the gate's stated result |
| not_applicable | A documented reason excludes the gate for this release |

New records follow the rules: `done` needs `--basis observed` and at least one `--evidence`; a user report
stays `waiting_verification` until you read it back; an unfinished gate needs `--next`. Owners are `agent`,
`user` or `provider`; bases are `observed`, `user_reported` or `inferred`. `validate` fails on a malformed
ledger and warns about history that predates these rules.

Release gate ids start with `scope`, `account`, `web`, `apple` or `google`; anything else (`design.*`,
`widget.*`, `ui.*`) is product verification and is listed after them. Common release gates:

`scope`, `web.deploy`, `web.smoke`, `apple.membership`, `apple.agreement`, `apple.tax`, `apple.bank`, `apple.dsa`,
`apple.app`, `apple.build`, `apple.native`, `apple.listing`, `apple.privacy`, `apple.upload`,
`apple.testflight`, `apple.device`, `apple.review`, `apple.release`, `google.identity`, `google.device`,
`google.phone`, `google.app`, `google.play-api`, `google.build`, `google.native`, `google.listing`,
`google.artwork`, `google.disclosures`, `google.closed-test`, `google.production-access`, `google.review`,
`google.release`. Use only the applicable ones; completing `apple.upload` cannot complete `apple.review`.

## Discipline

- Record each consequential attempt and result promptly — before waiting, asking for input, changing
  direction or ending a turn. Keep attempted, accepted, processing, verified, rejected and superseded distinct.
- A provider acknowledgment proves receipt, not completion. Do not rerun a mutation with an uncertain outcome
  before checking provider state.
- Each active gate has an owner, evidence, a last-observed time and an exact next action. `status` flags
  gates not updated for 7 days: read the provider back and record it, or close the gate.
- Builds carry their number or version code, source commit, dirty flag, toolchain and SHA-256 (the
  scripts' `summary.json`); keep superseded and cancelled build ids so nobody uploads them later.
- Record the scope decisions (price, territories, release type) and the owner's authorizations with
  references to their words. A ledger summarizes past authorization; it never grants new authority.
- Unknown token, cost or time metrics are `null`, never estimates.

## Before committing

Inspect every change for private addresses, phone numbers, bank or tax identifiers, identity documents,
keys, tokens, cookies and signed download URLs. Public identifiers (app ids, build ids, submission ids) are
fine. The ledger tool is not a secret scanner.

## Handoff

Before ending a session, record current build and submission ids, alternate paths tried, exact blockers and
owner instructions, what can run independently, and the first readback needed on resume. When a material
milestone or blocker changes, update the app's records first, then add a sanitized summary to the skill's
ledger when the skills repository is writable; never block a release to sync the skill.
