# iOS: local build, App Store Connect API, TestFlight and App Review

Everything here runs from the app repository on the owner's Mac, with the App Store Connect API key from
1Password. Nothing builds in EAS. `S=skills/skills/app-release/scripts` below.

## Credentials

The vault item (`ios.vault`, normally `op://API Tokens/App Store Connect`) holds `credential` (the `.p8` body
without its PEM header and footer, or the complete file contents), `key id` and `issuer id`; one key reads every app on the team. The
service-account token is in `OP_KEY` with a literal `OP_KEY=` prefix, which the scripts strip. `asc.mjs`
keeps the key in memory; `ios-release.mjs` writes it to a mode-700 temporary directory for `xcodebuild` and
`altool`, passes it by path, hides its identifiers in echoed commands, and deletes it on exit or signal.
Never print, log or commit a key, token or the review phone. Plain `op whoami` fails without the token; that
is expected.

A credential field can flatten pasted line breaks; the reader normalizes both armored and body-only
keys before signing. Verify a saved entry against the intended app, without printing its value. If an
item title contains characters unsupported in secret references (for example an em dash), use its
stable vault/item IDs in `ios.vault`; the owner does not need to rename the item or re-enter the key.

**Check existing app status with the API first.** `asc.mjs status` needs no browser sign-in once
`ios.ascAppId` is known. New app records require a different route below.

## Create or reuse the app record

Apple's [Apps API documentation](https://developer.apple.com/documentation/appstoreconnectapi/apps)
explicitly directs initial app-record creation to the website (checked 2026-10-26).
`POST /v1/bundleIds` registers a provisioning identifier; it does not create that app record.
The earlier observed `POST /v1/apps` response was 403, “does not allow CREATE”; do not
repeat that unsupported probe. Explain the known boundary in the first relevant update,
as directed by the skill entrypoint. Use an authorized signed-in browser or Xcode session.
Preserve the owner's existing scope authorization; do not ask them
to create a record merely because the API cannot. Do not extract browser cookies or trigger credential
fallback outside the authorized sign-in scope. Ordinary authorized UI navigation and existing
account/passkey selection are separate from a demonstrated human security challenge; follow the active
tool's rules and preserve the known working surface using [session continuity](accounts.md#preserve-session-continuity).

1. **Check for an existing record first.** In the intended team, query
   `GET /v1/apps?filter[bundleId]=<bundle-id>` with the existing API key. Reuse exactly one matching app;
   stop and resolve mismatches or multiple matches before creating anything.
2. **Use the signed-in UI.** In [App Store Connect → Apps](https://appstoreconnect.apple.com/apps), choose
   **+ → New App**. Enter the platforms, store name, primary language, registered bundle ID and unique SKU
   from this app's agreed identity. Verify the team and fields, then Create under the existing
   authorization. Store names are unique; if taken, resolve a name variant within the owner's scope
   before retrying. Never invent or substitute a bundle ID to get past an error.
3. **Read back before retrying.** Inspect the new record's App Information and platform/version. Read
   `GET /v1/apps?filter[bundleId]=<bundle-id>` again and verify the Apple ID, `bundleId`, `name`, `sku`,
   `primaryLocale`, and intended platform (`GET /v1/apps/<id>/appStoreVersions` or the UI). Allow for
   propagation after a successful or uncertain Create; an initially empty API result is not proof that
   nothing was created. Do not repeat the mutation until existing state is resolved.

   If Create reports that the app **has been created** but user-access settings could not be saved,
   treat these as separate outcomes. Do not click Create again or assume the record failed because
   **Go to App Information** does not navigate. Query the app by bundle ID and verify its identity as
   above. Compare the warning's stated access with the selected access: if restricted access was
   requested but Apple reports all users have access, keep the access gate unresolved and correct it
   within the existing authorization. Do not mark permission settings verified from record creation.
4. **Persist and continue.** Save the verified Apple ID in `app-release.config.json` → `ios.ascAppId`
   (and any existing app-specific consumer such as an EAS submission profile). Record observed evidence
   in the app's ledger, then run `node $S/asc.mjs status`. A draft record is separate from an uploaded
   build, subscription setup, review submission and public availability.

**Xcode fallback:** Apple documents record creation from the archive distribution assistant. With an
available signed-in Xcode account, open the intended archive in **Organizer → Archives → Distribute App
→ Custom → App Store Connect → Upload**. If no record exists, Xcode requests the name, SKU, primary
language and bundle ID. Verify those values and complete only the already-authorized steps, then perform
the same readback and persistence above. A record-creation prompt or completed archive is not proof of an
upload. This is a GUI workflow, not a claim that `xcodebuild -exportArchive` or `altool` creates records.
[Apple distribution guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases),
[Apple TestFlight tutorial](https://developer.apple.com/tutorials/develop-in-swift/test-your-beta-app).

If browser or Computer Use fails, record the exact tool failure as an agent/environment blocker and try
another supported authorized route. Exhaust useful independent work before asking for a missing unlock,
sign-in, security approval or role change, and only when evidence establishes that precise dependency.
A failed UI route cannot block CLI builds or listing preparation that still work.

## Privacy, Business and release authorization

- **App Privacy:** publish answers from the [privacy evidence](privacy.md) through an authorized
  signed-in browser or the documented Fastlane alternative described there. Saved and published
  answers are separate observations; the public API key does not authenticate the Fastlane action.
- **Business gates:** use [accounts](accounts.md) to distinguish work agents can prepare or enter from
  legal certifications, facts and security steps that require the owner.
- **Submission and release:** honor existing explicit authorization for `submit --confirm`. For `MANUAL`
  release, complete the owner's physical-device check and obtain authorization for `release --confirm`
  if public release is outside the scope already granted.

## Release loop

### Reviewed native projects and existing signing

Defaults remain Expo prebuild and automatic signing. For an app whose reviewed native project must be
preserved, set `ios.prebuild: false` and `ios.infoPlist` relative to its `ios/` directory. The configured
workspace's `contents.xcworkspacedata`, referenced app project, shared scheme, Info.plist, Podfile and
Podfile.lock must be in Git. This path supports a flat workspace with local `group:*.xcodeproj`
references and generated `group:Pods/Pods.xcodeproj`; nested groups and other reference forms stop with
an explicit error. Do not claim ignored native inputs belong to a clean source commit.

Use `$(CURRENT_PROJECT_VERSION)` for the native Info.plist's `CFBundleVersion`. The archive command
passes the chosen number as `CURRENT_PROJECT_VERSION` without editing source. It evaluates Expo's
public config and release guards, runs `pod install --deployment`, and refuses to archive if preparation
changes source. Review and commit legitimate generated changes before rerunning; never discard them
just to make a build look clean. This mode does not regenerate icons, launch assets or other Expo plugin
output: update and review those native assets explicitly when app configuration changes.

**Bare Xcode projects.** A native Swift app with no Expo config, no `ios/` folder and no CocoaPods sets
`ios.project` to its `.xcodeproj` (relative to `projectDir`) with `prebuild: false`; `infoPlist` is then relative
to `projectDir`. `archive` checks that the Info.plist, `project.pbxproj` and the shared scheme are tracked, skips
Expo and CocoaPods, and runs `xcodebuild -project` from `projectDir`. Giraffe Stretch (SwiftUI + SpriteKit, Xcode
synchronized folders) shipped build 1 this way.

**Teams with no registered devices.** Automatic archive signing uses a development profile, and Apple issues one
only to a team with registered devices: Xcode stops with "Your team has no devices from which to generate a
provisioning profile". Forcing `CODE_SIGN_IDENTITY=Apple Distribution` conflicts with automatic signing. Set
`ios.archiveSigning: "export"`: the archive is built unsigned and the `app-store-connect` export signs it with the
team's distribution certificate and an App Store profile, which need no devices.

**A brand-new app's TestFlight group.** A new record has no beta groups. When the app has no internal group at all,
`testers` creates `ios.testflightGroup` through the API, reads it back and adds the build; an app that already has
internal groups but none with that name still stops, so a mistyped name never adds a group. The new group starts
empty: add each internal tester (an App Store Connect user of that team) with `POST /v1/betaTesters` carrying the
user's username as `email`, their names and a `betaGroups` relationship, then read the group's `betaTesters` back
(state `INVITED` until they accept).

**Archive before the app record exists.** `archive --build-number N` reads nothing from App Store Connect, so it
runs without `ios.ascAppId`; prepare and verify the `.ipa` while the record is being created. `validate` and
`upload` still need the record (altool error 19, "Unable to find Apple ID for Bundle ID").

When an installed distribution identity/profile is already verified for the intended team, manual
signing can reuse it. Set `ios.signing.style: "manual"`, `certificate` to the installed certificate's
40-character SHA-1 and `profile` to the distribution profile name or UUID. Keep the private key and
keychain password outside Git. Confirm the profile covers this bundle, team and required capabilities.
Manual mode currently exports one main app; do not use it for extensions requiring separate profiles.
Archive/export omit provisioning updates and API-key arguments in this mode. API credentials remain
necessary to choose the next build number, validate, upload and manage TestFlight.

Both paths verify exported version/build, bundle identity, signing team, strict signatures, required
entitlements and scene metadata. Successful Xcode App Store export establishes the distribution path;
local signature checks alone do not establish distribution-profile validity. A rerun invalidates the old
summary before replacing artifacts, and upload requires a matching artifact hash and current release
target. Fixture tests prove orchestration, not actual Xcode export or native UI behavior.

### Commands

1. **Start from facts.** Pull, read the ledger (`ledger.mjs status`), then `node $S/asc.mjs status`: versions,
   recent builds with their internal and external TestFlight state, the TestFlight groups holding the newest
   build, review submissions with their items, attached build, screenshot and attachment delivery, and Game
   Center when configured.
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
   (`ios.testflightGroup`) unless it receives every build automatically. Both paths read back exact build
   membership and require `buildBetaDetail.internalBuildState` to be `READY_FOR_BETA_TESTING` or
   `IN_BETA_TESTING`. `VALID` alone can still mean `MISSING_EXPORT_COMPLIANCE`; resolve the verified
   technical classification separately, never infer it from group access. A member's historical installed
   state is not evidence they tested this build. `release` runs archive, upload and testers in one go.
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

## First-subscription review

A first subscription can need review with the app version. Apple's review-item schema supports both
`subscriptionVersion` and `subscriptionGroupVersion`; these are review-version resource IDs, distinct
from the product's Apple ID and its StoreKit `productId`. Configure the already-created product and group
in the store data's optional `subscription` object:

```json
{
  "subscription": {
    "appStoreId": "<subscription-resource-id>",
    "groupId": "<subscription-group-resource-id>",
    "productId": "com.example.app.yearly",
    "subscriptionVersionId": "<subscription-review-version-id>",
    "subscriptionGroupVersionId": "<group-review-version-id>"
  }
}
```

Discover the IDs with the existing authenticated API: the app's `subscriptionGroups`, that group's
`subscriptions` and `versions`, and the subscription's `versions`. Finish product localization, pricing,
availability and required review evidence separately; this capability does not create products or decide
which versions should go to review. Use the actual current store requirements and agreed monetization.

Before any draft mutation, `submit --confirm` verifies the app/bundle identity, group ownership under
this app, product membership in that group and exact `productId`, and both review versions under their
respective parents. It accepts only this app version, existing Game Center leaderboard items and these
explicit subscription targets. Unexpected, ambiguous, removed, duplicate or foreign-version items stop
the command before cancellation or attachment. A product ID alone does not authorize an unrelated
subscription item already present in a draft.

When reading items, request all relationship **fields** for conflict detection but include only the
supported app, leaderboard, IAP, subscription and subscription-group versions. Apple rejects a request that
includes both `appStoreVersionExperiment` and `appStoreVersionExperimentV2`, even though both are listed
in the OpenAPI include enum. Expanding every schema relationship is not a safe generic query.

The helper reads items before each attachment, skips existing targets and reads each new attachment
back. After a lost write response it stops; rerunning reads provider state before attempting another
write. A rejected submission missing required targets follows the existing cancel/wait/rebuild flow,
carrying the configured subscription targets into the replacement. Before submitting, ownership and the
complete item set are checked again. Afterwards, independent submission and app-version reads must show
`WAITING_FOR_REVIEW` or `IN_REVIEW`; a successful PATCH response alone is insufficient.

Keep these two review-version fields only while those exact versions are intended for the current
submission. After they settle, read provider state and remove them for an update that does not need
subscription review, or replace them with the next explicitly intended versions. With neither field set,
no subscription API reads or attachments are added; apps without subscriptions retain their existing
workflow. Never remove fields merely to bypass a conflict or submit a smaller intended set.
[Apple review-item schema](https://developer.apple.com/documentation/appstoreconnectapi/reviewsubmissionitem),
[create review item](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-reviewsubmissionitems).

## In-app purchase review

Consumable and nonconsumable purchases use a distinct `inAppPurchaseVersion` review item, not a
subscription item. Configure the already-created product and its explicitly intended review version
in the store data:

```json
{
  "inAppPurchases": [
    {
      "appStoreId": "<iap-product-resource-id>",
      "productId": "com.example.app.import",
      "reviewVersionId": "<iap-review-version-id>"
    }
  ]
}
```

`submit --confirm` verifies each product under `GET /v1/apps/{id}/inAppPurchasesV2?limit=200`, checks
its exact StoreKit `productId`, then verifies the review version under
`GET /v2/inAppPurchases/{id}/versions?limit=200`. The shared paginated reader follows every page.
Only rows with `reviewVersionId` present select current targets. Omit that field when retaining a
product identity that does not need review in this submission; a present empty/null value is invalid.
Duplicate selected product IDs, product resource IDs or review-version IDs are refused. An empty or
absent array adds no IAP API reads or attachments. Subscription targets can coexist and retain all of
their own ownership checks.

Product creation, type, localization, pricing, availability, review screenshot and review-version
creation are separate setup; read their actual provider state before selecting a version. A product's
version collection can be empty. When metadata is incomplete, a compound product GET that includes a
missing related resource can return 404 even though the product exists: verify the plain product and
read the documented related endpoints independently before retrying creation.

For a required IAP review screenshot, set the row's `reviewScreenshot` to a native
image file and run `asc.mjs iap-review-screenshots`. This is separate from the
public screenshot gallery and promotional IAP images. The command preflights all
configured rows, files, app/bundle and paginated product ownership before writes;
it reserves, uploads, commits and reads back the image. Identical completed images
are retained; conflicts and incomplete/unknown reservations are preserved for
inspection, not deleted. Rerun after processing and require `COMPLETE` with the
matching checksum before recording delivery as done.

Despite the IAP metadata v2 migration, this review screenshot remains attached to
the **parent product**: reserve through
`POST /v1/inAppPurchaseAppStoreReviewScreenshots` with relationship
`inAppPurchaseV2` (type `inAppPurchases`), and read through
`GET /v2/inAppPurchases/{id}/appStoreReviewScreenshot`. A review version's `image`
relationship is not a substitute. Use real purchase UI and record whether capture
came from a local StoreKit QA host or the exact store build; local test success
does not prove TestFlight product availability.
[Apple metadata migration](https://developer.apple.com/documentation/appstoreconnectapi/migrating-in-app-purchase-metadata-to-v2).

The same exact-item conflict guards and attachment readbacks described above apply to IAP targets.
Ownership is rechecked after rejected-submission replacement and immediately before submission.
Unexpected or duplicate held resources stop cancellation/attachment; a lost write response stops the
run, and a later rerun reads provider state before retrying. Remove or replace the review-version field
only when the intended review scope changes after provider readback, never to bypass a conflict.
[Apple IAP versions](https://developer.apple.com/documentation/appstoreconnectapi/get-v2-inapppurchases-_id_-versions),
[Apple review item](https://developer.apple.com/documentation/appstoreconnectapi/reviewsubmissionitem).

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

- **App Store Connect rejects pictographic symbols in copy.** A description containing a check mark (U+2713)
  failed with `ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_CHARACTERS` after the App Info had already saved; `listing`
  now refuses dingbats and emoji before writing anything. Spell symbols out ("check-mark button").
- **The age-rating declaration requires `socialMedia`** (observed 2026-10-30): the PATCH fails with
  `ENTITY_ERROR.ATTRIBUTE.REQUIRED` until the store data answers it. `age-rating` lists the questions the store data
  leaves unanswered; answer every one Apple marks required.
- **iOS 27 SDK builds need the UIScene life cycle**, or the app stops at launch (SIGTRAP, "UIScene life
  cycle is required"). Both apps adopt it through an Expo config plugin and Expo's scene delegate; after an
  Expo upgrade, check the plugin still matches the template and launch on iOS 27 before releasing. The
  archive check refuses an app without a scene manifest.
- **Upload metadata can lag a processed build.** In the Importron run, `buildUploads` still read
  `PROCESSING` with no errors while the corresponding `builds` resource was `VALID`, the intended version
  had that build attached and its beta detail was `IN_BETA_TESTING`. Read each resource independently
  before diagnosing a stall or retrying an upload. Advanced build/testability evidence does not establish
  that the upload resource itself reached `COMPLETE`; preserve both observed states and stop only the
  status-monitor process you own when appropriate. Do not reupload merely to clear a lagging status.
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
fetch the current same-app/version record and retain omitted first/last name, email, phone, Notes and
`demoAccountRequired` values. Send the complete contact in the same mutation and compare that actual
payload on readback; an omitted config field must not be compared against Apple's retained value as
though it requested removal. Other demo-account fields remain untouched by the PATCH.

First creation needs complete `review.firstName`, `lastName`, `email` and a private runtime
`ASC_REVIEW_PHONE`. A changed contact identity also requires its own runtime phone; never silently
reuse the old person's number or search unrelated apps for a replacement. Empty/null explicit identity
overrides are rejected before saving. Keep all contact values out of logs and error messages. A provider
request failure does not establish that Notes were saved; an echoed/readback mismatch or lost response
requires inspecting provider state before retrying. [Apple review-details API](https://developer.apple.com/documentation/appstoreconnectapi/app-store-review-details).

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
