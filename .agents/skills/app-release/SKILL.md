---
name: app-release
description: Build, upload, submit and release an Expo app to the Apple App Store and Google Play end to end from the owner's Mac — local Xcode and Gradle builds, App Store Connect and Play Developer API scripts, TestFlight, App Review and rejections, Play testing tracks and listings, Game Center, pricing — with credentials from 1Password and a persistent release ledger. Use for any App Store, TestFlight, App Review, Google Play, Play Console, store listing, store screenshot, store icon or release request, when onboarding a new app to the stores, when resuming a release across sessions, or when asked to change how app releases or this skill work.
metadata:
  version: "2.6.1"
---

# App release

Carry an app from source to the release state the owner asked for, on both stores, with as few manual
steps as the stores allow, and leave a ledger any later session can resume from. One process serves every
app; what differs per app lives in its repository: `app-release.config.json` (identity, vault items, build
settings, ledger paths), a store data file (everything the stores display) and a thin repository skill
with that app's facts and extra gates. The process is the same for a game and a news app; the questions the
stores ask differ ([app types](references/app-types.md)).

Scripts are in this skill's `scripts/` (Node 22, no dependencies). Run them from the app repository, where
they find its configuration: `S=skills/skills/app-release/scripts` (the skills submodule is at `skills/`,
or `vendor/skills/` where the repository's own `skills/` folder is taken, as in Newsworthy).

| Script | Does |
|---|---|
| `ledger.mjs` | Gate ledger: `init`, `record`, `status`, `render`, `check`, `validate` |
| `ios-release.mjs` | Local Xcode `archive`, `validate`, `upload`, `testers`, `release`, `next-build-number` |
| `asc.mjs` | App Store Connect: `status`, `listing`, `age-rating`, `pricing`, `screenshots`, `iap-review-screenshots`, `review-details`, `review-attachment`, `game-center`, `attach-build`, `testflight`, `submit --confirm`, `release --confirm` |
| `native-qa.mjs` | Read-only `preflight` of the Apple-signed XCTest launcher before diagnosing native QA failures |
| `android-release.mjs` | Local Gradle `bundle`, `verify`, `apk`, `release`, `upload`, `promote`, `tracks`, `next-version-code` |
| `play.mjs` | Play store presence: `status`, `listing`, `images` |

## Start or resume

1. Read the repository's `AGENTS.md`, its repository release skill, `app-release.config.json`, the store
   data, git state and the latest `main`. Preserve local work.
2. Read the ledger before anything else: `node $S/ledger.mjs status`, then the latest run-log entry. It says
   which one-time steps are done and what each open gate waits on. Resume verified work; never redo it. If it
   warns that this skill is behind the skills repository's main, update the submodule first
   ([maintaining](references/maintaining.md)).
3. Read provider state, not memory: `node $S/asc.mjs status`, `node $S/android-release.mjs tracks`,
   `node $S/play.mjs status`. Record anything that changed since the ledger's last event.
4. Establish the requested platforms and target state (testing, review, live), monetization, territories
   and release behavior from the owner's words and the ledger's `scope`. Ask only about a consequential
   choice that is genuinely missing. Never import another app's price, claims, IDs or design.
5. Write the intended gates into the ledger, then advance independent work while account verification,
   provider processing or review is pending.

For an app that has none of this yet, follow Onboarding a new app in [config](references/config.md).

## Release path

| Gate | Result / reference |
|---|---|
| App record | Create or reuse through an authorized signed-in browser or Xcode, verify identity and save `ios.ascAppId` ([ios](references/ios.md)) |
| Accounts | Team, agreements, tax, banking, DSA; Play identity, device, phone, payments — shared by every app: read status, don't redo ([accounts](references/accounts.md)) |
| Product and web | Accurate copy and price, live backend, privacy and support pages linked in the app ([app types](references/app-types.md)) |
| Native verification | Compiles and launches on the latest OS for free first; widgets, push, native modules on real targets ([verification](references/verification.md)) |
| Privacy | Evidence table, then App Privacy and Data safety ([privacy](references/privacy.md)) |
| Listing and media | Store data copy, real captures, required sizes ([media](references/media.md)) |
| iOS build and upload | `ios-release.mjs archive`, `validate`, `upload`, `testers` ([ios](references/ios.md)) |
| iOS store data and review | `asc.mjs listing … screenshots`, `review-details`, `attach-build`, `submit --confirm`; explicit first-subscription review targets supported ([ios](references/ios.md)) |
| Android build and tracks | `android-release.mjs release --track internal`, `promote` ([android](references/android.md)) |
| Play listing and console | `play.mjs listing`, `images`; App content and production access in the console ([android](references/android.md)) |
| Update recheck | Recheck existing media and listing copy against the build, supply required device families, and write release notes; optional placements follow the app's plan (Every update in [media](references/media.md)) |
| Device check and release | The owner's physical-device check of the exact store build, then `asc.mjs release --confirm` / production in Play Console |

**Every update of every app** after the first release: recheck the screenshots, preview, Play graphics and listing
copy on both stores against the build being submitted (recapture anything the build no longer matches, and record
the recheck in the ledger), and ship release notes in the store data's
`listing.whatsNew` for Apple's What's New and Play's release notes (`android-release.mjs --notes`). `asc.mjs
listing` refuses an update without them. Write them for the app's audience, naming new features and what feels
faster, never implementation. Save reviewable wording and follow the app's approval requirements;
existing authorization for routine listing edits remains valid. Do not invent a separate approval
gate or claim the owner approved exact wording they have not reviewed.

Check current official documentation and the actual account for changing rules; dates in references are
observations, not permanent requirements.

Existing reviewed native projects and installed distribution identities can opt into the tracked-native
and manual-signing paths in [iOS](references/ios.md), “Reviewed native projects and existing signing.”
Automatic signing and Expo prebuild remain the defaults.

For simulator/XCTest failures or purchase QA, read “Diagnose XCTest launcher identity” in
[verification](references/verification.md) before handing checks to the owner. An altered launcher can fail Apple's service authorization even when
its signature verifies. Preserve completed physical-device checks and use authorized native test routes.

## Credentials

Every credential is in the owner's 1Password vault `API Tokens`, read per run through the service account
whose token is in `OP_KEY` (with a literal `OP_KEY=` prefix the scripts strip). The App Store Connect key is
`op://API Tokens/App Store Connect` (`credential`, `key id`, `issuer id`) for every app; each app has its own
Android item (`upload.jks`, `play-service-account.json`, optional `google-services.json`, `keystore
password`). Keys stay in memory or a mode-700 temporary directory deleted on exit. Never print, log or
commit a key, token, password, review phone or bank detail; check access without printing values.

## Autonomy and approvals

- Continue authorized, reversible work — builds, checks, store data, listing drafts, repository changes —
  without asking. This includes creating app records in an authorized signed-in browser or Xcode session
  ([iOS onboarding](references/ios.md)). A public API limitation does not make the task owner-only.
- Exhaust useful authorized work and supported alternatives before handing work back. A failure blocks
  only the operation it actually prevents: discover available connectors, CLI/API credentials, existing
  sessions and saved artifacts, then keep independent work moving. Do not invent a human dependency
  from a missing API operation, one failed tool or an untested access assumption. Respect explicit
  provider restrictions and tool security boundaries; repeating a denied request is not an alternative.
  Check existing user and repository instructions for authorized methods before requesting permission
  again. An unavailable UI tool does not prove the desktop is locked; report the observed tool failure
  separately from the owner's device state.
- Establish authorization for outward-facing steps: uploads, track promotions, listing commits,
  `submit --confirm`, `release --confirm`, production releases and support messages. Honor explicit scope
  already granted in this session; ask only when the next action is outside it. An upload request alone
  does not authorize public release.
- **Owner involvement:** sign-in or security challenges without an available authorized session; legal,
  tax and banking facts or certifications; identity and device verification; the physical-device check;
  tester recruitment. App Privacy and Data safety answers can be entered in an authorized browser from
  verified evidence. Before asking, establish the precise dependency and complete all useful work that
  does not depend on it. Ask only for the demonstrated missing human action, once, with the exact
  destination and readback that will unblock it. Record tooling failures and attempted alternatives as
  agent/environment limitations, separately from genuine owner-only gates.
- Spending is never implied: never upgrade a plan, buy anything or switch accounts to get around a cap.
- When the owner takes over a page, stop and let them finish; reinspect afterwards and record what they did.

## Ledger discipline

Record every consequential attempt and result with `ledger.mjs record` as it happens, and add one dated
run-log entry per run (builds, submissions, what was manual, cost, retries, lessons; a bug-fix table). The
JSON is canonical; its Markdown view is generated. `done` needs observed evidence; a user report stays
`waiting_verification` until read back. Uploaded, processed, in review, approved and live are separate gates.
The full protocol is in [ledger](references/ledger.md).

## Fix what the release finds

Treat each release run as bug-finding work: reproduce a defect, add a regression test that fails before the
fix, make the smallest root-cause correction, and ship it on its own branch and pull request (or this run's
when tightly related), recorded in the run log's bug-fix table. Follow the repository's own PR, review and
merge rules; a user-facing change waits for the owner's OK where the repository says so.

## Changing this skill

When the owner asks to change how releases work — in any app repository, even when they name only that
app's skill — or a run teaches something worth keeping, first decide where the change belongs and say so:
true of every app goes **here** (the skills repository's `skills/app-release/`, on a branch with tests,
then each app's submodule is bumped); a fact or choice of one app goes in that app's config, store data or
repository skill; a mix is split. Never edit a discovery copy or the submodule checkout in place. The
procedure, including checking every app that uses this skill, is in [maintaining](references/maintaining.md).

## Finish

Report what is saved, uploaded, processed, in review, approved and live — separately, per store — with links
to the ledger and artifacts. Show available design previews inline, clearly distinguishing them from
verified native captures. List only demonstrated unresolved owner steps, each with exact instructions;
do not hand back work the agent can still advance. Leave a resumable next action for each unfinished gate.
