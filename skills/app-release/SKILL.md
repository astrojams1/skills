---
name: app-release
description: Build, upload, submit and release an Expo app to the Apple App Store and Google Play end to end from the owner's Mac — local Xcode and Gradle builds, App Store Connect and Play Developer API scripts, TestFlight, App Review and rejections, Play testing tracks and listings, Game Center, pricing — with credentials from 1Password and a persistent release ledger. Use for any App Store, TestFlight, App Review, Google Play, Play Console, store listing, store screenshot, store icon or release request, when onboarding a new app to the stores, or when resuming a release across sessions.
metadata:
  version: "2.0.0"
---

# App release

Carry an app from source to the release state the owner asked for, on both stores, with as few manual
steps as the stores allow, and leave a ledger any later session can resume from. One process serves every
app; what differs per app lives in its repository: `app-release.config.json` (identity, vault items, build
settings, ledger paths), a store data file (everything the stores display) and a thin repository skill
with that app's facts and extra gates. The process is the same for a game and a news app; the questions the
stores ask differ ([app types](references/app-types.md)).

Scripts are in this skill's `scripts/` (Node 22, no dependencies). Run them from the app repository, where
they find its configuration: `S=skills/skills/app-release/scripts`.

| Script | Does |
|---|---|
| `ledger.mjs` | Gate ledger: `init`, `record`, `status`, `render`, `check`, `validate` |
| `ios-release.mjs` | Local Xcode `archive`, `validate`, `upload`, `testers`, `release`, `next-build-number` |
| `asc.mjs` | App Store Connect: `status`, `listing`, `age-rating`, `pricing`, `screenshots`, `review-details`, `review-attachment`, `game-center`, `attach-build`, `testflight`, `submit --confirm`, `release --confirm` |
| `android-release.mjs` | Local Gradle `bundle`, `verify`, `apk`, `release`, `upload`, `promote`, `tracks`, `next-version-code` |
| `play.mjs` | Play store presence: `status`, `listing`, `images` |

## Start or resume

1. Read the repository's `AGENTS.md`, its repository release skill, `app-release.config.json`, the store
   data, git state and the latest `main`. Preserve local work.
2. Read the ledger before anything else: `node $S/ledger.mjs status`, then the latest run-log entry. It says
   which one-time steps are done and what each open gate waits on. Resume verified work; never redo it.
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
| Accounts | Team, agreements, tax, banking, DSA; Play identity, device, phone, payments — shared by every app: read status, don't redo ([accounts](references/accounts.md)) |
| Product and web | Accurate copy and price, live backend, privacy and support pages linked in the app ([app types](references/app-types.md)) |
| Native verification | Compiles and launches on the latest OS for free first; widgets, push, native modules on real targets ([verification](references/verification.md)) |
| Privacy | Evidence table, then App Privacy and Data safety ([privacy](references/privacy.md)) |
| Listing and media | Store data copy, real captures, required sizes ([media](references/media.md)) |
| iOS build and upload | `ios-release.mjs archive`, `validate`, `upload`, `testers` ([ios](references/ios.md)) |
| iOS store data and review | `asc.mjs listing … screenshots`, `review-details`, `attach-build`, `submit --confirm` ([ios](references/ios.md)) |
| Android build and tracks | `android-release.mjs release --track internal`, `promote` ([android](references/android.md)) |
| Play listing and console | `play.mjs listing`, `images`; App content and production access in the console ([android](references/android.md)) |
| Device check and release | The owner's physical-device check of the exact store build, then `asc.mjs release --confirm` / production in Play Console |

Check current official documentation and the actual account for changing rules; dates in references are
observations, not permanent requirements.

## Credentials

Every credential is in the owner's 1Password vault `API Tokens`, read per run through the service account
whose token is in `OP_KEY` (with a literal `OP_KEY=` prefix the scripts strip). The App Store Connect key is
`op://API Tokens/App Store Connect` (`credential`, `key id`, `issuer id`) for every app; each app has its own
Android item (`upload.jks`, `play-service-account.json`, optional `google-services.json`, `keystore
password`). Keys stay in memory or a mode-700 temporary directory deleted on exit. Never print, log or
commit a key, token, password, review phone or bank detail; check access without printing values.

## Autonomy and approvals

- Continue authorized, reversible work — builds, checks, store data, listing drafts, repository changes —
  without asking. Use the API, a CLI or a signed-in browser session before declaring anything owner-only.
- **Ask before each outward-facing step:** an upload to App Store Connect or Play, a track promotion, a Play
  listing or image commit, `submit --confirm`, `release --confirm`, a production release, a support message.
  The owner's approval of one step does not cover the next.
- **Owner-only:** creating app records, App Privacy and Data safety attestations when not authorized in the
  browser, agreements, tax, banking, identity and device verification, the physical-device check, tester
  recruitment. Ask once, in one message starting **Waiting on you:**, with the exact destination and the
  observation that will unblock it; keep working meanwhile.
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

## Improve this skill

When a run teaches something true of every app, change this skill (source under `skills/app-release/` in the
skills repository, never a discovery copy) with a test for any script change, and add a sanitized row to the
[skill ledger](ledger/LEDGER.md). App-specific facts belong in the app's repository skill.

## Finish

Report what is saved, uploaded, processed, in review, approved and live — separately, per store — with links
to the ledger and artifacts. List only unresolved owner steps, each with exact instructions. If blocked,
leave a resumable next action in the ledger and continue independent work.
