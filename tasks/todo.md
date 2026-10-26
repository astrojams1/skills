# Tasks

Track current work items here. Use checkable items for progress tracking.

## Current

## Preserve repository-owned skills during stale discovery cleanup

- [x] Reproduce deletion of repository-owned skills during link/check refresh.
- [x] Record shared-copy provenance and remove only unchanged proven stale copies.
- [x] Verify consumer and standalone preservation, legacy migration and stale removal.
- [x] Run required checks and obtain parent diff review; publish the separate PR.

Plan: Keep the fix bounded to discovery cleanup. Unrecorded or changed copies
remain preserved; managed shared copies retain automatic stale cleanup. Do not
change consumer applications or unrelated installation behavior.

Review: six new regressions failed against the original cleanup. The fix passes
65 management checks, 166 release tests, 142 specification checks, identity,
8 image-fit checks, shell syntax and skill validation. YouTube: 5 pass and
1 existing unavailable-ffmpeg skip. Parent diff review found no issues. The old
blanket no-flat-files assertion was narrowed to shared imports so it no longer
rejects intentionally preserved repository instructions.

## app-release 2.7.2: honor current UI/session evidence

- [x] Preserve the owner-identified app/profile/tab and explicit unlocked report in shared guidance.
- [x] Distinguish unavailable browser bindings from sign-out and preserve app-access denials.
- [x] Review affected consumers, refresh discovery and run required repository checks.
- [x] Publish the narrow documentation correction in [PR #105](https://github.com/astrojams1/skills/pull/105).

Plan: Correct the misleading UI-tool signal in the shared release skill. Do not
change app code, provider state, authentication settings or unrelated checkouts.
Validation establishes guidance and repository integrity; live App Store access
and ImportTron resubmission remain with the owning release agent.

Review: 166 release tests, 53 management checks, 142 specification checks,
identity, 8 image-fit checks and skill validation pass. YouTube: 5 pass and
1 existing unavailable-ffmpeg skip. Seven configs/five apps need no migration.
Missing PyYAML was resolved in an isolated SSD venv; no global runtime changed.

## app-release 2.7.0: log execution issues and verify closure

- [x] Inspect existing logging, evidence rules and completion checks.
- [x] Add a read-only issue closure check using existing issue.* gates/history.
- [x] Require prompt issue logging, verified fixes and final result reconciliation.
- [x] Test false completion, external blockers, exclusions, legacy claims and read-only behavior.
- [ ] Refresh discovery, validate, publish and adopt the additive update.

Plan: Reuse canonical gate history instead of adding a parallel issue database.
Unresolved issues must prevent a successful completion claim; externally blocked
runs remain partial. Existing commands and ledger schema stay compatible.

Review:166 release tests,53 management checks,141 specification checks, identity,
eight screenshot-fit checks and skill validation pass. YouTube:five passes and
one explicit unavailable-ffmpeg skip. Independent targeted review:22/22 pass.
The maintenance run logs its own completion-check gap and whitespace failure,
then verified fixes; its validate/check/issues commands all pass.


## app-release 2.6.1: preserve image-only review scope

- [x] Refuse mixed, unknown and duplicate held resources before image review writes.
- [x] Read back each attachment and exact final image set; stop after unknown writes.
- [x] Run transport regressions, refresh discovery copies and all required suites.
- [ ] Publish shared guard, then propagate final skill SHA to consumer apps.

Plan: Cross-app review found that the existing Asset Library submit path could
reuse a draft containing an app/IAP version and submit that unrelated item too.
Keep this correction in shared code, preserve conflicting drafts, and add no
consumer workaround or provider mutation during verification.

Review: nine initial transport regressions failed against the unguarded
behavior. The corrected workflow passes all eleven new cases and 158 release
tests. Management53, specification140, identity, eight screenshot-fit checks
and skill validation pass; YouTube has five passes and one unavailable-ffmpeg
skip. Existing app/IAP review drafts remain untouched by this verification.

## app-release: diagnose QA launch failures before owner handoff

- [x] Reproduce native/browser capability failures and inspect the launcher's signing evidence.
- [x] Test an isolated supported iOS StoreKit route without changing production sources or Apple tools.
- [x] Add the verified recovery and failure-attribution checks to shared app-release, with regression coverage.
- [x] Check consumers, refresh discovery copies, run all required suites and publish the fix.

Plan: The owner rejected handing agent QA back after a tool failure. Preserve
their completed physical check. Distinguish an altered launcher's signature
rejection from simulator/App Store failure, test supported alternatives, and
encode only observed recovery. No lock bypass, private Apple entitlement grants,
default-device mutation or fabricated paid-design captures.

Review: 147 app-release tests, 53 management checks, 140 specification checks,
identity, eight screenshot-fit checks and skill validation pass. YouTube has
five passes and one explicit unavailable-ffmpeg skip. Native serial QA passed
16 checks, both actual IAP review images read COMPLETE, and Apple identified
unpublished App Privacy answers as the review blocker. Original launcher guard
passes; the prior strict-valid ad-hoc copy is rejected. Four unique consumer app
configurations checked; shared fix merged in PR100 and Nametag adoption/evidence
merged in PR3. Cross-app propagation caught the Asset Library issue below.

## Nametag initial TestFlight milestone

- [x] Read Nametag's canonical provider snapshot, signed provenance and gate evidence.
- [x] Add a sanitized history snapshot and index link without changing release mechanics.
- [x] Refresh discovery copies and run the repository's required checks.
- [x] Publish [history PR #99](https://github.com/astrojams1/skills/pull/99).

Plan: Record processed/TestFlight/device-check progress separately from incomplete
native/IAP, privacy, review and public launch gates. Nametag's app ledger remains
authoritative. Preserve other skills checkouts and their unrelated changes.

Review: management 53 passed; identity passed; specification 139 passed with no
warnings; screenshot fit 8 passed; app-release 124 passed; YouTube 5 passed and 1
skipped because ffmpeg is unavailable. Node 22.23.3 was used for Node suites.
No failing checks. This change adds historical documentation only; no shared
release instruction, script, provider state or credential changes.

## app-release 2.5.2: check the documented privacy CLI alternative

- [x] Verify Fastlane authentication, import format and replacement/publication behavior against primary sources.
- [x] Route App Privacy to a narrow optional CLI reference while preserving credentials and attestation limits.
- [x] Check affected consumers, refresh discovery copies and run required suites.
- [x] Publish [PR #98](https://github.com/astrojams1/skills/pull/98) for review and record the consumer update state.

Plan: Avoid turning an unavailable browser into a universal privacy-publication blocker. Use an existing
authorized Fastlane session when available; otherwise preserve the genuine Apple ID sign-in dependency.
Prepare verified answers first and distinguish saved rows, publication and provider readback. No provider
mutation or new authentication credential is part of this documentation change.

### Review

- App-release: 124 passed; management: 53 passed; specification: 139 passed, no warnings;
  screenshot fit: 8 passed; identity and skill-creator validation passed.
  YouTube: 5 passed, 1 skipped because ffmpeg is unavailable. No failing suites.
- Independent primary-source review corrected the cached-session credential fallback, Fastlane's
  role requirement and the distinction between App Store Connect provider and signing team IDs.
- The optional documentation path introduces no configuration or schema changes. All 18 configurations
  across Füd, Importron, Newsworthy and Space Worms roots/worktrees parse cleanly. Backend native
  release work delegates to Füd. No live store, credentials or customer data were modified.
- Discovery copies refreshed from source; whitespace checks pass. Consumer submodule bumps remain
  pending upstream merge, in their own app pull requests.

## app-release 2.4.1: preserve review contact on notes updates

- [x] Reproduce notes-only readback failure with a mocked Apple API.
- [x] Preserve current same-app contact and required fields; validate creation before any mutation.
- [x] Test override, privacy, missing-contact and uncertain-write cases; document and check consumers.
- [x] Run required suites, refresh discovery and open [PR #89](https://github.com/astrojams1/skills/pull/89)
      for parent review; leave merge and consumer pointer updates to the owning app run.

Plan: Keep private contact fields in Apple's existing same-version record when no override is supplied.
Remove account-wide contact lookup; require a complete explicitly supplied identity and phone for first
creation or a changed contact. Compare the actual complete requested payload on readback without
printing private contact values.

### Review

- App-release: 99 passed (7 new). Notes-only regression fails before the fix after the PATCH succeeds;
  the corrected requested payload matches Apple's echoed retained contact and passes.
- Tests cover unchanged contact, omitted Notes/demo requirement, untouched demo credentials, complete
  first creation, missing/blank fields, changed contact phone, contact redaction and lost write response.
- Management: 53 passed; identity passed; specification: 138 passed, no warnings; screenshot fit:
  8 passed with bundled Python; skill-creator validation passed in the existing isolated environment.
  YouTube: 5 passed, 1 skipped because ffmpeg is unavailable. No failing suites.
- Read-only consumers: Importron intentionally omits contact names/email; Füd's review object is empty;
  existing Newsworthy and Space Worms configurations have identity fields. Same-version contact reuse
  handles omitted fields; creation/contact changes need an explicit runtime phone instead of an
  account-wide lookup. No consumer files or live Apple state were mutated by this shared patch.
- Discovery copies refreshed and byte-identical to source; whitespace checks passed. Consumer pointer
  updates and provider notes readback remain with the owning app's release run after merge.

## app-release 2.4.0: explicit in-app purchase review

- [x] Verify Apple schema and add optional owned IAP review targets without changing existing flows.
- [x] Exercise attachment, submission, rejection replacement and refusal paths with mocked Apple API.
- [x] Document config and lessons, inspect consumers, refresh discovery, run all required suites.
- [x] Commit and open [PR #88](https://github.com/astrojams1/skills/pull/88) for parent review;
      leave merge and consumer pointer updates to the owning app run.

Plan: Bind explicitly configured IAP review versions to an app-owned product and its exact StoreKit
product ID before every submission guard. Preserve unknown-resource conflicts, idempotent readback,
subscription ownership checks and no-config behavior. Apple OpenAPI confirms both parent collections
and the inAppPurchaseVersion / inAppPurchaseVersions review relation.

### Review

- App-release: 92 passed (14 new). The IAP-only/mixed submission regression fails on unmodified main
  because it silently submits only the app; it passes with the explicit-target implementation.
- Ownership refusals produce zero writes; pagination, lost attachment/submit responses, concurrent
  foreign items, pending reuse, rejected replacement and rejected-item resolution are covered.
- Management: 53 passed; identity passed; specification: 138 passed, no warnings; screenshot fit:
  8 passed with bundled Python; YouTube: 5 passed, 1 skipped because ffmpeg is unavailable.
- Skill-creator validation passed using the existing isolated validation environment after bundled
  Python lacked PyYAML. System-Python fit checks skipped without numpy/Pillow; bundled-runtime rerun
  passed all 8. No dependency changes were made to the skills repository.
- Read-only consumer inspection: Newsworthy, Space Worms (canonical and two worktrees) and Füd have
  no selected IAP review targets; Importron retains its existing subscription fields until its own
  monetization change. No existing field/command migrations are required. No consumer files or live
  Apple state were mutated by this change; consumer submodule bumps follow merge.

## app-release 2.3.1: autonomous continuation — October 22, 2026

- [x] Correct shared autonomy and locked-screen guidance, retaining real security/provider limits.
- [x] Distinguish agent/tool failures from demonstrated human dependencies in ledger guidance.
- [x] Review affected consumers, refresh discovery copies, validate and run required repository checks.
- [x] Publish the shared patch for review as [PR #87](https://github.com/astrojams1/skills/pull/87);
      leave consumer submodule bumps to their own app changes.

Plan: Update shared release guidance rather than adding Füd-only workarounds. Keep existing capture
provenance, authorization and actual human certification requirements intact. No provider mutations.

### Review

- App-release: 78 passed; management: 53 passed; specification: 138 passed, no warnings; identity passed.
  Skill-creator validation and whitespace checks pass. Its validator needed PyYAML, installed only in
  an isolated build-tools virtual environment after both existing Python runtimes lacked it.
- Read-only consumer review covers Füd, Importron, Newsworthy and Space Worms (including its worktree).
  No command, config or ledger schema changed; no consumer migration is required beyond a submodule bump.
- Reviewed the locked-UI, failed-connector, explicit provider-denial and actual human-certification
  cases against the guidance. Independent work continues; security/provider restrictions and native
  evidence limits remain. This is instruction review, not a claim of executing those provider cases.

## Previous work

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

- App-release: 78 passed (16 new), including the real submit orchestration against a mocked Apple API.
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

- Live read-only API verification: corrected minimal includes plus all relationship fields succeeded
  against the expected empty draft; subscription/product/group ownership chains verified, zero writes.
  Apple's mutually exclusive experiment includes are regression-tested despite both appearing in schema.

## app-release 2.4.2: separate ASC and signing configuration — October 23, 2026

Plan: Let App Store Connect commands use verified API/store configuration while Xcode signing
settings remain unverified. Keep archive validation strict, demonstrate the previous failure
with synthetic end-to-end CLI tests, inspect every consumer, and run the repository checks.

- [x] Consult the Agent Skills specification and inspect configuration validation.
- [x] Reproduce the status failure and provider-denial masking with CLI regression tests.
- [x] Separate API validation from signing validation without inferring signing authority.
- [x] Update the focused reference, skill version, lesson and generated discovery copies.
- [x] Check consumer compatibility and complete required tests.
- [x] Review the patch and prepare its PR for merge after passing checks.

### Review

- App-release: 103 passed, including four real-CLI regression cases with synthetic credentials and mocked
  Apple requests. Read-only status works without signing fields, provider denials are visible, missing API
  configuration causes zero requests, and archive still refuses absent/blank/null signing settings.
- Management: 53 passed; specification: 138 passed, no warnings; AGENTS-only identity passed; screenshot
  fit: 8 passed. YouTube Shorts: 5 passed, 1 skipped because ffmpeg is unavailable. No failing tests.
- The skill-creator validator passed with a private SSD PyYAML dependency directory after both Python
  runtimes reported that the optional yaml dependency was absent. No repository dependency was added.
- Read-only config and command inspection covers Newsworthy, Importron, Füd and Space Worms (including
  existing Space Worms workspaces). Füd intentionally leaves teamId unverified; all consumers have the
  API identities and store data needed by the narrower validation. Defaults retain vault/platform behavior.
  There is no config format or command migration and no consumer source or provider state was changed.
# App-release browser session recovery (2026-10-23)

- [x] Scope the observed PWA handoff and per-app account correction to shared account guidance.
- [x] Preserve app-specific identifiers and current provider state in the consumer ledger.
- [x] Regenerate discovery copies, validate the skill and run all required repository checks.
- [ ] Review, push and merge the documentation patch; sync and verify the Füd consumer.

Documentation-only patch: retain supported same-session browser alternatives before a sign-in handoff;
verify each app's legal entity instead of applying one personal team to every app. No scripts, account
permissions, signing credentials or provider state are changed by this patch.

Verification:103 release tests,53 management checks,138 spec checks,8 screenshot-fit tests and identity
passed. YouTube5 passed/1 explicit ffmpeg-unavailable skip. Quick validation passed using the existing
SSD validation venv after the bundled runtime lacked PyYAML. Existing consumer configurations need no
migration; command/script behavior is unchanged.

## app-release 2.4.4: recover direct app access

- [x] Verify direct Chrome access against the disputed inventory error on the real task.
- [x] Document supported app binding and normal CLI code-entry recovery without security bypass.
- [x] Check consumer configurations: guidance only, no fields, scripts or format changes.
- [x] Run required checks and refresh discovery copies.
- [ ] Publish the shared correction and sync Füd after merge.

Review: the real recovery verified current project authority and restored the same M0 cluster to IDLE.
The provider's withheld email code remains a separate verification step. This patch changes guidance,
with no runtime changes or wording-matching tests. Validation: 103 release, 53 management, 138 spec,
identity, 8 screenshot-fit checks, skill validator; YouTube 5 passed and 1 explicit ffmpeg skip.

## app-release 2.4.5: isolated SSD simulator recovery

- [x] Consult current Agent Skills spec, skill-creator, shared conventions and maintaining reference.
- [x] Branch from fresh origin/main; keep general recovery in verification and app facts in app ledger.
- [x] Document bounded, SSD-backed private image recovery with existing-device reuse and UI boundaries.
- [x] Inspect consumers, refresh discovery and run all required checks plus skill validation.
- [ ] Review, push and open PR for parent review; leave merge and consumer sync to owning release run.

Plan: Encode the demonstrated recovery without inferring a root cause or changing shared volume settings.
Preserve resumable evidence and distinguish boot/install/launch requests from continued runtime health,
graphics, captures and store signing.

Review: 103 app-release tests, 53 management checks, 138 specification checks, identity, 8 screenshot-fit
checks and skill-creator validation pass with Node 22.23.3 for JS suites. YouTube: 5 pass, 1 explicit
ffmpeg-unavailable skip. No script behavior changed; no wording-matching tests added. Discovery copies
are regenerated and byte-identical; whitespace checks pass. Read-only inspection covered Füd, Importron,
Newsworthy and all three existing Space Worms checkouts. No config/command changes or migrations;
consumer pointer updates follow merge. No simulator, volume, account or provider state was changed by
this documentation patch. Local macOS help/man pages verified disk-image flags and their deprecation.

Follow-up evidence correction: the launch command returned a PID before an app startup crash. The shared
procedure and lessons now record storage/device boot/install recovery only, require process continuity
and crash diagnostics before healthy-startup claims, and keep actual UI verification separate. The app's
lifecycle repair and exact crash evidence remain in the consumer release run.

## app-release 2.4.7: single-line credential compatibility

- [x] Verify the saved credential matches the received key without printing either value.
- [x] Reproduce cryptographic failure with a generated P-256 key flattened into a field.
- [x] Normalize armor/whitespace and document stable-ID references for Unicode titles.
- [x] Run required checks and verify the real saved key against Apple.
- [ ] Publish the fix and sync Füd.

Plan: preserve existing body-only and armored input, including single-line pastes. Do not rewrite the
owner's correct vault item or ask for another credential handoff. No key, token or private contact in tests.

Review: regression fails with OpenSSL decoder error before the fix and passes afterward using generated
P-256 keys for armored, single-line and body-only inputs. Actual read-only vault input authenticates
the intended Apple app and team without printing values or changing the item. 105 release, 53 management,
138 spec, identity, 8 screenshot-fit checks and skill validator pass. YouTube has 5 passes and its existing
ffmpeg-unavailable skip. Six consumer configurations need no migration; only Füd uses stable IDs for
its Unicode item title. Discovery copies refreshed, including prior upstream Asset Library changes.

## app-release: reviewed native projects and existing distribution signing

- [x] Inspect Füd's observed prebuild/provenance and signing failures; consult skill-creator/spec.
- [x] Add opt-in tracked-native/manual-single-bundle archive settings with unchanged defaults.
- [x] Test real command orchestration in isolated fixtures, signing XML/entitlements and safety failures.
- [x] Inspect consumers, refresh discovery, run required repository checks and independent review.
- [ ] Publish upstream, sync Füd, configure reviewed native metadata and validate the actual local path.

Plan: keep reviewed native input immutable, use the chosen Xcode build-number setting, preserve locked
Pods and source-change detection, and verify signatures/version/entitlements before any upload.
No store upload, UI capture, permission change or final public URL is implied by this tooling work.

Review: new regressions fail against the previous source (0/10 before); focused native coverage passes
12/12 after fixes. Independent review reproduced ignored-input and stale-summary defects, then external
symlinks and single-quoted workspace references; all four are fixed and regression-tested. Existing
consumer configs retain automatic/prebuild defaults, with no required migration. Final checks: 117 app-release tests, 53 management checks, 139 specification checks, AGENTS identity,
8 screenshot-fit checks and skill-creator validation pass. YouTube has 5 passes and its existing explicit
ffmpeg-unavailable skip. Independent final probes pass 14/14; discovery equality and whitespace pass.
# app-release 2.5.1: verify internal TestFlight readiness

- [x] Reproduce automatic-group false success with provider-response fixtures.
- [x] Verify exact build membership and internal testability for automatic and manual groups.
- [x] Correct optional media guidance and honor existing UI-method authorization.
- [ ] Check consumer compatibility, run required validation, publish and sync Füd.

Plan: fix shared verification without changing signing, encryption answers, account settings or
store submissions. Keep required screenshots distinct from optional marketing placements.

Review: with the old behavior exported through an injected provider fixture, one test passes and six
fail, including actual false success for MISSING_EXPORT_COMPLIANCE and a successful membership POST
that never reads back. All seven pass after correction.124 release tests,139 specification checks,
53 management checks, identity, eight screenshot-fit checks and skill validation pass. YouTube has
five passes and the existing ffmpeg-unavailable skip. The system Python lacked image packages; the
already bundled workspace Python runs all eight fit checks without installation. Actual read-only
TestFlight191 verification succeeds through the corrected helper. No account/certification mutation.
Direct consumer inspection found Füd, Newsworthy and two Space Worms checkouts with unchanged config
and commands; additional known linked checkouts are checked before pointer updates.

## app-release 2.7.1: preserve authorized session continuity

- [x] Read skill-creator, current Agent Skills specification and the observed session history.
- [x] Preserve known working app/profile/tab and separate control, authentication, team and vault observations.
- [x] Prevent repeated unchanged sign-in handoffs and privacy-blocked submission retries.
- [x] Add sanitized run/issue history and lessons; refresh discovery copies.
- [x] Run all required suites and skill validation; prepare commit for parent review without pushing.
- [x] Owning release agent independently forward-tests and reviews the narrow source diff.
- [ ] Owning release agent publishes and updates consumer pointers after merge.

Plan: change guidance only, retaining Fastlane session/password-fallback restrictions. Current UI/authentication observations do not establish that the desktop is locked or that the provider session is restored. Actual publication and independent forward-testing remain with the owning release run.

Review: 166 release tests, 53 management checks, 142 specification checks, identity, 8 screenshot-fit checks
and skill validation pass. YouTube has 5 passes and its existing explicit ffmpeg-unavailable skip. The
entrypoint initially used a fragment that the spec checker treated as a filename; the failure is logged,
the link now names the existing file/section separately, and the original suite passes. Seven checkout
configurations across five apps normalize without migration. No commands, schema, provider/account state or consumer files
changed. Discovery copies are generated. The parent's independent dry-run preserves the known PWA/profile,
separates session dimensions, avoids repeated owner handoff and waits for privacy readback. Its Fastlane
ambiguity is resolved by explicitly rejecting normal login when session-only reuse cannot be guaranteed.
The shared workflow issue is verified; live-session and App Privacy recovery remain unverified app gates.
An evidence-summary writer also failed by mixing JSON/Python boolean syntax; it was logged, replaced
with native JSON serialization and verified by parsing the actual artifact. Actual suite logs were intact.


## Data Center App Store Connect route recovery (2026-10-26)

- [x] Read shared conventions, current app-release guidance, lessons, and Agent Skills specification.
- [x] Isolate maintenance from the dirty canonical skills checkout.
- [x] Obtain verified UI-route diagnosis from the release run; preserve live outcome separately from documentation checks.
- [x] Apply the narrow shared workflow correction and patch version.
- [x] Refresh discovery, check consumer compatibility, and run required validation.
- [x] Review the shared correction; required checks and root diff review pass.
- [ ] Publish the correction and record the PR.

Review: guidance-only v2.7.3 exposes masked provider diagnostics and verifies returned browser identity.
Required checks pass; all 12 consumer checkouts normalize unchanged. The release root confirmed the
underlying diagnostic and that live UI recovery remains unverified; no restart is taught as a fix.
