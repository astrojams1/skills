# Release ledger protocol

Every app keeps the same three records, plus one shared one. Paths come from `app-release.config.json`.

| Record | Path (config) | What it holds | How it changes |
|---|---|---|---|
| **Gate ledger** | `ledger.gates` (JSON) | Each gate's state, owner, evidence basis, result, evidence and next action, with an append-only event history | Only through `ledger.mjs record` |
| **Gate view** | `ledger.view` (Markdown) | Generated: release gates, then product verification gates, then history | `ledger.mjs render`; never by hand |
| **Run log** | `ledger.runs` (Markdown) | One dated entry per run (including runs that change nothing): request, builds with ids/commit/SHA-256, submissions, what was manual, cost, retries and lessons; an issue/fix table reconciled with `issue.*` gates | By hand, in the same pull request as the work |
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
node $S/ledger.mjs issues                                             # read-only; fails until recorded issues have verified closure
```

`record` keeps a gate's owner, basis and next action when omitted (`--next ""` clears it), writes the JSON
atomically and regenerates the view. An identical retry adds nothing. Set `APP_RELEASE_RUN_ID` to group a
run's activity events (default `app-release-<slug>-<date>`).

Set a **unique invocation ID**, rather than relying on that daily fallback, when starting a skill run.

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

Use `waiting_user` only for a demonstrated human dependency after checking supported authorized
alternatives. A failed automation route belongs to the agent: record the failed attempt and recovery
action, and keep independent gates active. Do not mark every build, listing or release gate as waiting
on the owner because one UI check cannot run. Keep unavailable native QA separate from prepared previews.

Release gate ids start with `scope`, `account`, `web`, `apple` or `google`; anything else (`design.*`,
`widget.*`, `ui.*`) is product verification and is listed after them. Common release gates:

`scope`, `web.deploy`, `web.smoke`, `apple.membership`, `apple.agreement`, `apple.tax`, `apple.bank`, `apple.dsa`,
`apple.app`, `apple.build`, `apple.native`, `apple.listing`, `apple.privacy`, `apple.upload`,
`apple.testflight`, `apple.device`, `apple.review`, `apple.release`, `google.identity`, `google.device`,
`google.phone`, `google.app`, `google.play-api`, `google.build`, `google.native`, `google.listing`,
`google.artwork`, `google.disclosures`, `google.closed-test`, `google.production-access`, `google.review`,
`google.release`. Use only the applicable ones; completing `apple.upload` cannot complete `apple.review`.

## Issue log and completion check

Use the existing canonical JSON and append-only history for problems encountered by the skill:
`issue.<stable-short-id>`. No second issue database or schema migration is needed. Issues appear in their
own generated table. Reopen the same issue when it recurs; retain earlier failure and fix events.

1. On discovery, record the symptom, observed evidence, affected operation and next investigation before
   retrying or changing approach. Include unexpected tool/CLI failures, wrong assumptions, failed QA,
   provider/API errors and defects in the release procedure. Keep raw secrets and signed URLs out of logs.
2. Update the issue as diagnosis and recovery become known. The run-log table should name the issue ID,
   symptom/root cause, correction or attempted alternatives, verification evidence and final state.
3. Fix agent-controlled issues before finishing. For code defects, add a regression check that detects
   the failure and passes after correction; rerun the failed workflow where feasible. For a setup or
   usage mistake, verify the corrected operation. Save shared fixes in this skill and app-specific fixes
   in the app. A proposed patch, passing unrelated test or open follow-up is not verified recovery.
4. Close with `done`, observed evidence and a summary of the fix and verification. Use `not_applicable`
   only for a demonstrated false alarm, duplicate or superseded requirement, with observed evidence and
   the reason; it is not a way to waive an unfixed issue. Both closed states require nonblank evidence.
5. Reconcile every unexpected failure in command/test/provider results against the issue entries. The
   log must not omit a failure just because a later command succeeded. If none occurred, explicitly say
   **none observed** in the dated run log; an empty issue list alone does not establish that.
6. Run `validate`, `check` and `issues` before declaring completion. `validate` checks structure and
   history; `check` checks the generated view; **`issues` checks closure**. It fails on open issues of
   any owner, invalid issue closure evidence and failed/uncertain release gates that still need triage.

```bash
node $S/ledger.mjs record --gate issue.native-launcher --state in_progress --owner agent --basis observed \
  --summary "Test launcher rejected; cause not yet established" --evidence "diagnostics/launcher.json" \
  --next "Compare actual launcher identity and failing client PID"
node $S/ledger.mjs record --gate issue.native-launcher --state done --owner agent --basis observed \
  --summary "Original launcher verified; corrected native test route passes" \
  --evidence "diagnostics/verified-recovery.json" --next ""
node $S/ledger.mjs issues
```

For a genuine external dependency, leave the issue open with attempted supported alternatives, the exact
dependency, responsible party and next readback/action. Keep advancing independent work. The check
remains nonzero and the run remains partial/blocked; do not relabel the issue fixed or manufacture an
owner task. Finishing the requested release and publishing the skill correction are separate outcomes.

## Rejection recovery and prevention

Every rejected submission or information request follows this loop, even if the correction is only
review information or an attachment rather than app code.

1. Preserve the actual reviewer message, guideline, submission/build identity and requested next steps
   in the app's records. Keep the reviewer's words separate from a diagnosis. A rejected state alone
   does not establish the cause; if the message is unavailable, record that access issue and keep
   gathering evidence instead of guessing or marking the item resolved.
2. Establish the cause from the message and observed app, metadata or evidence. Record the cause,
   correction and verification in the existing issue/fix table. Answer every requested item; distinguish
   an incomplete review package from a demonstrated app bug.
3. Correct and verify the app or its review package. For information-needed requests such as Apple's
   Guideline2.1, check purpose/audience/value, feature setup and access, external services, regional
   behavior, and any applicable authorization documentation. Verify setup instructions against the
   actual submitted build rather than a later source candidate. If Apple asks for both a reply and Notes,
   save and read back both. Do not infer legal facts or credentials that need the owner's evidence.
   When a physical-device recording is required, inspect its actual launch-to-main-flow coverage,
   relevant account/content/paid flows, build and OS provenance. Reuse qualifying existing evidence;
   do not label simulator video, a written phone check or local purchase tests as that recording.
   Missing required media remains open while independent preparation continues.
4. **Prepare and verify the shared source correction before closing the recovery.** Identify the missed earlier check and add
   the smallest reusable prevention in guidance, a preflight, an applicable app-type checklist or a
   regression test. Keep an app's contacts, commercial choices and exact artifacts in its own config
   or ledger. Turn a case-specific request into a conditional check, not a new universal store rule.
   Verify that the prevention detects or calls out the original failure and that corrected evidence
   satisfies it. Follow the maintaining reference for source changes, tests and consumer compatibility.
5. Add a sanitized lesson to the skill ledger and link the shared change and verification from the app's
   issue/run records, including `skill.app-release` delivery/adoption status. Record an unmerged or
   unapplied update honestly; do not let an unrelated publishing dependency stop an otherwise complete,
   authorized resubmission. Before later submissions, read those lessons and recheck their applicability
   against current app behavior and provider requirements.

Once the app correction and all required evidence are verified, mark the addressed rejection items
resolved and submit the intended existing item set using the platform's documented recovery; pending
publication or adoption of the prepared, verified skill correction does not block that submission. A posted reply, attachment, Notes save, passing check or skill PR
is not a resubmission. Verify the resulting provider states independently. The app correction, prevention
verification, skill delivery/adoption, submission acceptance, approval and public release stay distinct.
If the app's required correction or evidence is still missing, keep its issue open and report the exact
dependency; a skill update does not make an incomplete review package ready.

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
