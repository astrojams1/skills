# iOS: local build, App Store Connect API, TestFlight and App Review

Everything here runs from the app repository on the owner's Mac, with the App Store Connect API key from
1Password. Nothing builds in EAS. `S=skills/skills/app-release/scripts` below.

## Credentials

The vault item (`ios.vault`, normally `op://API Tokens/App Store Connect`) holds `credential` (the `.p8` body
without its PEM header and footer), `key id` and `issuer id`; one key reads every app on the team. The
service-account token is in `OP_KEY` with a literal `OP_KEY=` prefix, which the scripts strip. `asc.mjs`
keeps the key in memory; `ios-release.mjs` writes it to a mode-700 temporary directory for `xcodebuild` and
`altool`, passes it by path, hides its identifiers in echoed commands, and deletes it on exit or signal.
Never print, log or commit a key, token or the review phone. Plain `op whoami` fails without the token; that
is expected.

**Check status with the API, not the browser.** The built-in browser is usually not signed in to App Store
Connect and Apple's login fails there; `asc.mjs status` needs no sign-in.

## What only the owner can do

Apple's API cannot do these, and no agent signs in to Apple with a password. Ask for them in one message
that starts with **Waiting on you:**, and keep working on everything else.

1. **Create the app record** (App Store Connect → Apps → +). `POST /v1/apps` answers 403. Store names are
   unique: a taken name needs a variant (Space Worms became `Space Worms: Swarm`; the home-screen name can
   stay short).
2. **App Privacy answers** (once, and again when data practices change): there is no API. Answer from the
   [privacy evidence](privacy.md), then Publish.
3. **Business gates**: agreements, tax, banking, DSA (see [accounts](accounts.md)).
4. **Approve the submission** (`submit --confirm`) and, for `MANUAL` release, **approve the release** after
   their physical-device check (`release --confirm`).

When the owner has signed in to App Store Connect in the built-in browser, that session persists; an agent
may then do steps 1 and 2 there if the owner has authorized it.

## Release loop

1. **Start from facts.** Pull, read the ledger (`ledger.mjs status`), then `node $S/asc.mjs status`: versions,
   recent builds, review submissions with their items, attached build, screenshot and attachment delivery,
   and Game Center when configured.
2. **Prove it compiles and launches, for free.** The repository's checks, then `CI=1 npx expo prebuild -p ios
   --no-install --clean`, `cd ios && LANG=en_US.UTF-8 pod install` (CocoaPods fails on Unicode normalization
   without UTF-8), and a Release simulator build:
   `xcodebuild -workspace <W> -scheme <S> -configuration Release -sdk iphonesimulator -destination
   'generic/platform=iOS Simulator' ARCHS=arm64 ONLY_ACTIVE_ARCH=YES -derivedDataPath
   /Volumes/ssd/builds/xcode/<slug> build`. Launch it on the **latest iOS** simulator and exercise the app.
   Check `xcodebuild -version`, `xcodebuild -checkFirstLaunchStatus` and `xcrun simctl list runtimes` first:
   an Xcode update can need the owner to accept a license, or a matching simulator runtime before asset
   catalogs compile — a local prerequisite, not an app defect.
3. **Archive.** From a clean checkout of the commit you mean to ship (normally the merge commit on `main`,
   so the binary matches what production serves), `node $S/ios-release.mjs archive`. It reads the highest
   build number App Store Connect holds in builds and in-flight uploads and uses the next one, runs prebuild
   with `ios.buildNumberEnv` and the build commit, `pod install`, `xcodebuild archive` and
   `-exportArchive` (`app-store-connect`, Apple-managed signing through the key: it creates or updates the
   distribution certificate and profile), then checks every bundle in the `.ipa`: build number, signing team,
   the configured entitlements and app group, `get-task-allow` false, and the scene manifest. It refuses a
   dirty checkout (`--allow-dirty` makes a local test archive that `upload` refuses) and a checkout that moved
   during the build (exporting with `app-store-connect` already reserves the number as an `AWAITING_UPLOAD`
   record, so an archive never uploaded skips a number; that is harmless), and writes `summary.json` (version, Xcode, SDK, commit, dirty flag, SHA-256). About
   6–7 minutes on the M4 Mac.
4. **Validate, then upload, with the owner's OK.** `validate <N>` asks Apple to check the `.ipa` without
   uploading. `upload <N>` refuses a dirty or changed archive, sends it with `altool --upload-package --wait` (the
   form that uploaded Newsworthy's first local build, 28, on 2026-10-14) and polls Apple's upload record until
   `COMPLETE` or `FAILED` (5–30 minutes), retrying a status read that fails. Use Transporter if `altool` breaks.
5. **TestFlight.** `ios-release.mjs testers <N>` waits for `VALID` and adds the build to the internal group
   (`ios.testflightGroup`); an uploaded build reaches no tester otherwise. Tell the owner it is available only
   once `buildBetaDetail` shows it testable. `release` runs archive, upload and testers in one go.
6. **Store data.** `asc.mjs listing`, `age-rating`, `pricing` (first release, or when the price changes),
   `screenshots`, `review-details`; then `status` until every screenshot reads `COMPLETE`. Every attribute
   write is read back and a mismatch fails the command. Before patching copy on a version Apple has seen,
   compare the live values with the repository's previous copy so only the intended change goes out.
7. **Attach and submit.** `asc.mjs attach-build <N>`, then with the owner's approval `asc.mjs submit
   --confirm`. Read back `WAITING_FOR_REVIEW` on both the version and the submission before saying it was
   submitted; `READY_FOR_REVIEW` is still a draft.
8. **Release.** With `releaseType: MANUAL` an approved version waits as `PENDING_DEVELOPER_RELEASE`; after the
   owner's physical-device check of the TestFlight build, `asc.mjs release --confirm`. With
   `AFTER_APPROVAL` it goes live on approval, so the device check must happen before submitting. Never
   release on simulator evidence alone.
9. **Record** each step in the ledger as it happens (see [ledger](ledger.md)).

## When App Review rejects

1. **See it in the API.** `status` shows the version `REJECTED` and the submission `UNRESOLVED_ISSUES` with
   each item's state.
2. **The message is not in the API.** App Store Connect API 4.5.1 (checked against Apple's OpenAPI spec on
   2026-10-13) has no endpoint for the Resolution Center: `resolutionCenterThreads` paths answer 404 and
   `GET /v1/reviewSubmissionItems/{id}` answers 403. Do not guess paths. Read Apple's email to the owner's
   account through the Gmail connector (search App Store Connect / App Review), or ask the owner to paste it.
3. **Answer through the API.** Put the answers in the store data's `review.notes` and run `review-details`.
   Upload files App Review asked for (a screen recording) with `asc.mjs review-attachment <path>`: it
   reserves, uploads and commits the file, waits for `COMPLETE`, and only then removes earlier copies with the
   same name. Keep large media outside the repository (`/Volumes/ssd/projects/<slug>/`).
4. **Resubmit** with the owner's approval: `submit --confirm` marks the rejected items resolved and sends the
   submission again, or — when a rejected submission must gain items Apple will not add to it (leaderboards,
   409 "does not allow adding more items") — cancels it, waits for it to settle and opens a new one. A posted
   reply alone does not resubmit; the owner's request to resubmit authorizes these steps, nothing earlier does.
   Keep a receipt in the repository (submission id, build, what changed) and record `apple.review`.

**Guideline 2.1 information requests for a new developer** have needed, for both apps: a physical-device
recording on the latest iOS that starts on the Home Screen, launches the app and shows every feature and the
in-app privacy policy and contact; and notes covering purpose and audience, setup (no login), external
services, regions, and regulated services or third-party content. Follow the actual request each time.
**Guideline 4.2 (minimum functionality)** was answered for Newsworthy by shipping more on-device function
(the timeline on by default), not by argument alone.

## Game Center

When the store data has `gameCenter`, `asc.mjs game-center` reads Apple's state before each write, reads
every write back and is safe to rerun: it turns on the bundle ID's `GAME_CENTER` capability (needs
`ios.bundleIdResource`), enables Game Center for the app, creates or updates each leaderboard and its first
version (v2 API) with the listing locale's localization, switches Game Center on for the version, and adds
every editable leaderboard version to the open review submission so `submit --confirm` sends them with the
app. Order for the release that adds or changes the capability: capability (`game-center`), then a new
build (a profile carries the capabilities it was made with; Apple-managed signing regenerates it, and
`requiredEntitlements` makes a stale profile fail the archive), then `game-center` again after
`attach-build`, then `submit --confirm`.

## Gotchas

- **iOS 27 SDK builds need the UIScene life cycle**, or the app stops at launch (SIGTRAP, "UIScene life
  cycle is required"). Both apps adopt it through an Expo config plugin and Expo's scene delegate; after an
  Expo upgrade, check the plugin still matches the template and launch on iOS 27 before releasing. The
  archive check refuses an app without a scene manifest.
- **Build numbers only rise.** Apple holds every number it accepted, including uploads still processing, so
  the scripts read both. A locally generated simulator bundle may carry another number than the store build
  of the same source; never relabel it.
- **Simulator control:** the Simulator panel drives only devices the owner has granted; `xcrun simctl io
  <device> screenshot` reads the screen without a grant.
- **`whatsNew` is refused on an app's first version**; `listing` sends it only once a version is live, and refuses an update whose `whatsNew` is empty.
- **Pick categories from the API** (`GET /v1/appCategories/GAMES/subcategories`); Apple retires some.
- **Never name another app or trademark** in keywords or copy (guideline 2.3.7).
- **Guideline 5.1.1(i)** needs the privacy policy linked inside the app as well as in the listing; App
  Review also expects contact details in the app.
- **User-generated content** (visible nicknames, chat) means `userGeneratedContent: true` in the age rating
  and a reporting route (guideline 1.2).
- **Encryption:** set `usesNonExemptEncryption` (usually false, via `ITSAppUsesNonExemptEncryption`) so a
  build does not wait on export compliance.
- **Apple Add Tax Form** may offer nothing because the required form exists; use Add Tax Info beside it.
- **Review acceptance is not paid availability**: a paid app needs the Paid Apps Agreement, tax and banking
  active, or every territory reads `CANNOT_SELL` after approval.

## App Review in depth

Observations from the first Newsworthy submissions (September 2026); recheck current API capabilities.

#### Review contact and API semantics

Create/update review details with contact first/last name, email, **phone**,
review notes, and the correct demo-account requirement/credentials. Use a current
contact already authorized for this purpose. Do not omit a known authorized
phone and then create an avoidable owner task. If the contact is unknown, ask for
that missing fact; never invent a placeholder.

In the seed release, creating `appStoreReviewDetails` without `contactPhone`
returned a required-field error even though the schema appeared permissive.
Treat actual API validation as authoritative: submit the complete required
payload, inspect errors, then read the resource back. When saving revised Notes,
fetch the existing authorized `contactPhone` if no override is supplied and
include it in the same API mutation; a notes-only request must not lose required
contact information. Keep the value
private. Notes are **not saved** when the request fails. [Apple review-details API](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details).

#### Respond to the actual review message

Read the rejection or information-request text before proposing fixes. A version
state alone does not identify a defect. A user-pasted review message is sufficient
input to prepare a factual response when signed-in correspondence is inaccessible.

Re-read every subsequent message. A reviewer citing a different guideline does
not establish approval of an earlier concern. Preserve the prior history, record
the new requested action, and keep reply/resubmission status explicit.

Distinguish the reviewer's actual words from an inferred reason for the request.
A repeated generic information request does not establish that an earlier video
was missing, inaccessible or outdated, or that Apple specifically demanded a new
recording. Inspect the existing review thread, download/access the attachment,
compare its hash/provenance with retained evidence, and read back saved Notes
before asking the owner to repeat work. Explain a recommendation for updated
coverage as a recommendation, not an explicit reviewer instruction.

The September 17 inspection of Apple's public OpenAPI **4.4.1** found review
submission/item status but no App Review correspondence endpoint. Customer reviews
and TestFlight feedback are different resources. Recheck current capabilities;
API credentials do not establish browser access, and a browser authentication or
control failure does not invalidate a working API path. Use the supported App
Review UI for correspondence when available.
[Apple review replies](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages/).

For the seed app's new-account Guideline 2.1 request, the response needed six parts:
physical-device demonstration, purpose/audience, setup/access, external services,
regions, and regulated services/third-party material. Follow the actual request
for each app; these are not universal answers or grounds for speculative fixes.
When Apple requests both Notes and a reply, keep the complete factual response
and evidence references in **both**. Saving Notes is not sending correspondence.

A request for a physical-device launch recording on the latest OS requires that
actual evidence. Recheck the OS version on the recording date, confirm the
submitted app/build, preserve the unaltered recording and verify reviewer access.
Reassess older recordings after feature changes: a video of an earlier build
cannot prove a new Settings flow or a different OS/build combination, but this
alone does not establish why Apple repeated its request. Check the
current official OS release information and the physical device's current version;
last-seen device metadata and a busy/disconnected mirroring session are not fresh
verification. Record unavailable physical access as a separate owner-device gate.
Inspect any newly supplied recording before sending it. Record only visible
coverage; a current OS or build number cannot be established from a video that
does not show them. Preserve those verification limits in the evidence record
and make no unsupported latest-OS claim in correspondence.
Simulator captures do not satisfy a physical-device request. Leave missing
evidence explicitly pending; do not send an incomplete package as a completed
response or claim testing from device pairing alone. Apply the session's actual
authorization when replying, inviting testers or resubmitting.

#### TestFlight preparation is not physical QA

`READY_FOR_BETA_TESTING`, a build attached to an internal group, an invitation,
installation and completed testing are separate facts. An empty group does not
establish tester participation. Record tester count and whether invitations were actually
sent, then verify the intended build is installed and tested on the required
physical devices. Keep device identifiers and private tester/contact details out
of shared ledgers.
[Apple internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers).

If a group contains a **Testing** build but the tester sees **No Builds Available**,
inspect group membership and invitation state. In the September 17 seed run, the
tester was `NOT_INVITED`; an authorized `POST /v1/betaTesterInvitations` returned
201, group readback became `INVITED`, and the owner then confirmed physical launch.
The direct tester-build list remained empty. Do not use that relationship alone
to conclude installation is impossible, or invent a group-level **Resend** control
that is absent from the actual UI. Verify invitation delivery/state and installation
separately, and keep resolved invitations out of the pending-owner checklist.
[Apple tester invitations](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-betatesterinvitations).

#### Build, review, and release are separate states

Record artifact/build ID and version, upload receipt, Apple processing state,
selected build relationship, review-submission state, approval, and release state
separately. After upload, wait for processing and select the intended build on
the version. Complete the page's remaining requirements, submit for App Review
under the user's authorized scope, and verify the resulting state. Respect the
chosen automatic/manual/scheduled release option. An EAS Submit success or
TestFlight build is not an App Review submission or a live App Store listing.
[Apple publishing workflow](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/overview-of-publishing-your-app-on-the-app-store).

#### Availability and API submission: verified seed sequence

Use current **v2 app availability** endpoints; the v1 availability/preorder
resources were replaced. Read existing availability before creating it, resolve
territory IDs, apply the user's territory/preorder/new-territory decisions, then
read back every territory with pagination. In the September 16 seed run, 175
territories were enabled with no preorder and automatic release after approval;
this count and scope are observations, not defaults for the next app.
[Apple availability API](https://developer.apple.com/documentation/appstoreconnectapi/appavailabilityv2),
[API migration notes](https://developer.apple.com/documentation/appstoreconnectapi/app-store-connect-api-3-7-release-notes).

For an authorized API submission, inspect existing submissions first to avoid a
duplicate, then follow the current schema:

1. Create/reuse the app/platform `reviewSubmissions` draft.
2. Attach the intended `appStoreVersion` using `reviewSubmissionItems`.
   Attachment validation may expose missing app-level declarations. The seed
   version required `contentRightsDeclaration`; derive its value from the actual
   shipped content and rights evidence, save it, and read it back. Do not copy the
   seed app's answer. A lagging immediate GET calls for another read before
   repeating a mutation.
3. Inspect the draft and its item. **`READY_FOR_REVIEW` has not been submitted.**
   Send the final `PATCH /v1/reviewSubmissions/{id}` with `submitted: true` when
   the submission is complete and within the user's requested scope.
4. Independently GET the submission and version. Record both resulting states,
   the submission ID and provider `submittedDate`. In the seed run both reported
   `WAITING_FOR_REVIEW`; preserve the existing submission while review is pending.

[Create submission](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-reviewsubmissions),
[attach item](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-reviewsubmissionitems),
[submit draft](https://developer.apple.com/documentation/appstoreconnectapi/patch-v1-reviewsubmissions-_id_).

#### Resubmit after resolving review issues

A posted reply and attachment do not resubmit the app. After providing the
requested evidence and matching Notes, confirm the intended valid build is
selected, then read the existing submission and its items. For resolved rejected
items, public OpenAPI **4.4.1** supports
`PATCH /v1/reviewSubmissionItems/{id}` with `attributes.resolved: true`. Verify
the resulting `READY_FOR_REVIEW` state before submitting the existing submission
with `attributes.submitted: true`; do not create a duplicate merely because a
reply was posted. This is an observed sequence, not permission to mark an
unresolved issue resolved. Recheck the current schema and actual item state.

Read the version, submission and selected-build relationship back independently.
Record the provider timestamp and exact build. Verify both review states reflect
submission acceptance (`WAITING_FOR_REVIEW` in the seed readback), recording any
further progression explicitly. Reply delivery, attachment access, Notes saving
and review submission remain separate evidence.

**Review acceptance does not settle commercial readiness.** The seed submission
was accepted while every territory still reported `CANNOT_SELL`. Enabled
territories, `AFTER_APPROVAL`, and a review receipt do not prove the Paid Apps
Agreement, tax processing, banking, approval or public paid availability. Keep
those gates separate and verify their actual provider state before claiming live.
