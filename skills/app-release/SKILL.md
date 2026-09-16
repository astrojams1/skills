---
name: app-release
description: Ship or resume a web and mobile app release end to end, including Expo/EAS builds, native verification, App Store Connect, Google Play, paid pricing, store artwork, submissions, and a persistent release ledger. Use when preparing an app launch, unblocking store setup, or continuing a release across sessions.
metadata:
  version: "1.0.6"
---

# App release

Carry the user's app to the requested release state while preserving its product,
web presence, repository workflow, pricing model, and existing authorization.
This skill coordinates delivery of an existing app; it does not choose a new
product or require Expo when the project uses another native stack.

## Start or resume

1. Read the project's agent instructions, product claims, release configuration,
   existing store files, git state, and latest target branch. Preserve local work.
2. Find the project's canonical release ledger before creating accounts, apps,
   builds, certificates, submissions, or support tickets. Resume verified work.
   Read [ledger protocol](references/ledger.md); use [ledger.py](scripts/ledger.py)
   for new runs. The [skill ledger](ledger/LEDGER.md) is a retrospective index,
   not live evidence or permission for another app/account.
3. Establish the requested platforms, target release state (testing/review/live),
   app identifiers, account/team, monetization and currency, availability, and
   release behavior. Infer from explicit instructions and repo facts; ask only
   about genuinely missing consequential choices. Do not import Newsworthy's
   $1 price, no-ads promise, account IDs, or UI design into another app.
4. Inspect callable connectors/CLIs and existing signed-in browser sessions.
   Prefer a functioning API/CLI; use the supported browser/native UI tools for
   gaps. Check alternative authenticated paths before assigning work to the user.
   Discover tools rather than inventing MCP names. Do not make a new credential,
   broaden access, or install a plugin merely because an existing path is awkward.
5. Write the intended gates and evidence into the ledger, then advance independent
   work while account verification or provider processing is pending.

## Release path

Read only the references needed for the current gate.

| Gate | Required result / reference |
|---|---|
| Product and web | Accurate copy/price, live backend, policy/support URLs, web retained; [builds and verification](references/builds.md) |
| Account readiness | Correct team and legal entity, membership, agreements, payout/tax status, store verification; [stores](references/stores.md) |
| Native packages | Signed installable artifacts, version/commit provenance, real native checks; [builds and verification](references/builds.md) |
| Listing | Platform-specific actual captures, copy, icon, required sizes, reviewed disclosures; [listing and automation](references/listing.md) |
| Upload | Provider confirms correct binary and metadata; [stores](references/stores.md), [Apple helper](scripts/apple.mjs) |
| Testing/review | Required beta tests, review notes/contact, privacy/content/availability gates; [stores](references/stores.md) |
| Release | Explicit store state and public availability, production smoke checks, ledger evidence |

For platform APIs and changing rules, check current official documentation and
the actual account. Reference dates are observations, not permanent requirements.
An existing developer account may skip gates required by a new personal account.

## Autonomy and handoffs

- Continue authorized reversible setup, debugging, listing creation, uploads,
  repo work and submission. Do not ask the user to perform work just because a
  connector failed if a supported CLI or signed-in UI can do it.
- Preserve specific approvals already given. The skill grants no independent
  authority to spend, contact others, transmit private data, accept agreements,
  change account ownership/access, or release beyond the user's requested scope.
  Follow the active tool/session policy at the actual action; do not invent a
  blanket approval step for every form or repeat a resolved question.
- A user-only item needs evidence: attempted paths, exact provider requirement,
  missing capability/fact, who must act, direct destination, precise next step,
  and what observation will unblock it. Separate an owner action, a permission
  request, provider processing, unavailable hardware, and a fixable agent bug.
- Prepare support messages/agreements for review. Sending a support request needs
  explicit communication authorization; accepting terms follows the active
  action-time policy. Verification codes, taxpayer/bank information and identity
  documents belong in the provider's private UI or approved secret channel.
- When the user takes over a page, stop clicking and let them finish. Reinspect
  afterward. Record a reported completion immediately, then read back state
  before marking the relevant gate verified.

## Ledger discipline

Record each consequential attempt and result promptly, especially before waiting,
asking for input, changing direction, ending a turn, or losing context. Keep
attempted, accepted, processing, verified, rejected and superseded distinct.
Do not rerun a mutation with an uncertain outcome before checking provider state.

Each active gate has an owner, evidence, last-observed time and exact next action.
Builds carry IDs, platform/profile, version, source commit plus dirty-tree note,
and verification scope. Submission/upload/review/release each have separate gates.
A provider acknowledgment proves receipt, not completion of the requested change.

Keep app assets and full operational ledger in the app repo (reuse its existing
`store/` or `release/` convention). Keep only sanitized, dated run summaries and
lessons in this skill's [ledger](ledger/LEDGER.md). Never duplicate authoritative
live state in an installed discovery copy. Unknown token/cost/time metrics are
`null`, not estimates disguised as measurements.

## Gotchas worth remembering

- A successful EAS build or upload is not App Review, Play production access, or
  public availability. Paid developer membership is not a Paid Apps Agreement.
- Apple `READY_FOR_REVIEW` is a draft; verify submission and version both reach
  `WAITING_FOR_REVIEW`. Review acceptance does not prove paid sale eligibility.
- Apple **Add Tax Form** may show no actionable choice because the required US
  form already exists. Use **Add Tax Info** beside that form.
- Legal address, tax-form address, payout details and public trader contact can
  be distinct records. Verify each affected record; do not reuse an expired one.
- Public read-only APIs can still retain IP/user-agent/performance logs. Client
  privacy manifests alone cannot establish “no data collected.”
- Web previews and Expo Go do not verify a signed native app or widget. Never
  label iOS screenshots as Android or manufacture a tested-device claim.
- A queue or emulator failure is not necessarily an app defect. Diagnose the
  correct layer; see [builds](references/builds.md) for proven examples and bounds.

## Finish

Report what is saved, uploaded, reviewed and live separately, with links to the
repo ledger and actual artifacts. List only unresolved owner steps with exact
instructions. If blocked, leave a resumable next action and continue independent
work. When authorized work is complete, follow repo PR/check/deploy rules, verify
the deployed state, and add a sanitized outcome/lesson to the skill ledger.
