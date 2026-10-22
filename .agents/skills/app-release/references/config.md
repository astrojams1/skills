# App configuration and store data

Every app that uses this skill has two files in its repository. The scripts find them by walking up from
the current directory, so run every command from the app repository (`APP_RELEASE_CONFIG` names another
configuration file).

1. **`app-release.config.json`** at the repository root: store identity, vault items, build settings and
   ledger paths. Public identifiers only; never a key, password, phone number or bank detail.
2. **The store data file** it names (`storeData`): everything the stores display — listing copy for both
   stores, age-rating answers, review notes, pricing, screenshots, Play graphics, Game Center.

Start from [app-release.config.example.json](../assets/app-release.config.example.json) and
[store.example.json](../assets/store.example.json).

## app-release.config.json

| Field | Meaning |
|---|---|
| `app`, `slug`, `repository` | Display name; short id for build folders and run ids; repository URL |
| `type` | `game`, `news`, `utility`… — selects the checklist in [app types](app-types.md) |
| `projectDir` | The Expo project (where `ios/` and `android/` are generated), relative to the repository; `.` by default |
| `storeData` | The store data file, relative to the repository |
| `buildRoot` | Where archives and bundles go: `<buildRoot>/xcode/<slug>/release/<N>/` and `<buildRoot>/android/<slug>/<code>/`. The owner's Mac uses `/Volumes/ssd/builds` |
| `buildShaEnv` | The variable that carries the short commit into the app (`EXPO_PUBLIC_BUILD_SHA` by default) |
| `ledger.gates`, `ledger.view` | The JSON release ledger and its generated Markdown view |
| `ledger.runs` | The hand-written run log (one dated entry per run, bug-fix table, costs, lessons) |
| `activityLog` | The owner's shared agent activity ledger (`~/Library/Application Support/AgentActivityLedger/events.jsonl`, the only file its helper writes); each `ledger.mjs record` is appended there too. Omit to skip |

`ios`:

| Field | Meaning |
|---|---|
| `ascAppId` | The App Store Connect app id (Apple ID), from the app record |
| `bundleId`, `bundleIdResource` | The bundle identifier and its resource id (`GET /v1/bundleIds`), needed for capabilities such as Game Center |
| `teamId` | The signing team; every bundle in the `.ipa` must be signed by it |
| `scheme`, `workspace` | The Xcode scheme; the workspace defaults to `<scheme>.xcworkspace` |
| `buildNumberEnv` | The variable the app config reads for `ios.buildNumber` during prebuild |
| `vault` | The 1Password item holding the App Store Connect key (`op://API Tokens/App Store Connect`) |
| `testflightGroup` | The internal TestFlight group whose testers get each build (`Release QA`) |
| `requiredEntitlements` | Entitlements the signed app must keep, such as `{"com.apple.developer.game-center": true}` or `{"aps-environment": "production"}` |
| `appGroup` | An app group every bundle, extensions included, must be signed with (widgets) |
| `pruneScreenshots` | `true` lets `asc.mjs screenshots` delete App Store screenshots and whole sets the store data no longer lists; by default they are reported and left in place |
| `scrubPublicEnv` | `false` keeps inherited `EXPO_PUBLIC_*` values and `.env` files; by default both are dropped |

`android`:

| Field | Meaning |
|---|---|
| `package` | The application id; Play never lets it change, and a free app can never become paid under it |
| `vault` | The 1Password item with attachments `upload.jks`, `play-service-account.json` (and `google-services.json` for push) and the field `keystore password` |
| `keyAlias` | The upload key's alias (`upload`) |
| `versionCodeEnv` | The variable the app config reads for `android.versionCode` during prebuild |
| `artifactName` | File name stem for the `.aab` and APK |
| `minTargetSdk` | The lowest target SDK Play accepts (36 since 31 August 2026) |
| `googleServices` | `true` passes the vault's Firebase file to prebuild as `GOOGLE_SERVICES_JSON` (push) |
| `requiredResources` | Resources the bundle must contain, such as `string/google_app_id` for push |
| `blockedPermissions` | Permissions the merged manifest must not request |
| `holdForReview` | `true` makes every Play commit `--hold` (`changesNotSentForReview`): the owner sends changes for review from Publishing overview |

Environment overrides, for a run without the vault: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY_PATH`;
`ANDROID_UPLOAD_KEYSTORE`, `ANDROID_UPLOAD_KEYSTORE_PASSWORD` (or the pre-v2 `<APP>_ANDROID_KEYSTORE[_PASSWORD]`); `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`;
`GOOGLE_SERVICES_JSON`; `ASC_REVIEW_PHONE`.

## Store data

| Field | Used by | Meaning |
|---|---|---|
| `version` | `asc.mjs` | The marketing version being prepared (`1.0.0`); `listing` creates or renames the iOS version to it |
| `assetLibrary` | `asc.mjs assets` | A list of `{ file, category, placementType, placementGroup }`: the product page header (`PRODUCT_PAGE_HEADER_ASSET`, `DEFAULT_PROFILE`), the search-results creative (`APP_STORE_SEARCH_RESULTS_ASSET`, `DEFAULT_PROFILE`) and screenshots for profiles with no screenshot display type, such as iPhone Duo (`APP_SCREENSHOT`, `IPHONE_DUO_PROFILE`). Categories are `CREATIVE_ASSETS` and `APP_SCREENSHOTS_AND_PREVIEWS` |
| `listing` | `asc.mjs listing` | `locale`, `name`, `subtitle`, `promotionalText`, `description`, `keywords`, `whatsNew` (sent only once a version is live; required on every update), `supportUrl`, `marketingUrl`, `privacyPolicyUrl`, `copyright`, `primaryCategory`, optional `primarySubcategories` (games only) and `secondaryCategory`, `contentRightsDeclaration`, `releaseType` (`MANUAL` by default; `AFTER_APPROVAL` releases on approval) |
| `ageRating` | `asc.mjs age-rating` | Answers keyed by Apple's current attribute names; unknown keys are reported, unanswered ones listed |
| `review` | `asc.mjs review-details` | `firstName`, `lastName`, `email`, `notes` (4,000 characters), `demoAccountRequired`. The phone comes from `ASC_REVIEW_PHONE` or the same person's existing review detail |
| `pricing` | `asc.mjs pricing` | `baseTerritory` (`USA`) and `basePrice` (`0` for free, `1.00`…); Apple equalizes other storefronts |
| `screenshots` | `asc.mjs screenshots` | Groups `[{ "displayType": "APP_IPHONE_67", "files": [...] }]`, or `{ "manifest": "store/assets/manifest.json", "base": "store" }` to read an asset manifest's `ios` entries |
| `gameCenter` | `asc.mjs game-center` | `leaderboards`: `vendorIdentifier`, `referenceName`, `defaultFormatter`, `submissionType`, `scoreSortType`, `localization` |
| `subscription` | `asc.mjs submit` | Optional first-subscription review identity: `appStoreId` (product resource ID), `groupId`, `productId`, `subscriptionVersionId`, `subscriptionGroupVersionId`. When either review-version ID is set, all five fields are required and verified through API parent collections. Product pricing, creation and readiness are separate setup; see [iOS subscriptions](ios.md#first-subscription-review) |
| `google` | `play.mjs` | `locale`, `title` (30), `shortDescription` (80), `fullDescription` (4,000), optional `video`, `contactEmail`, `contactWebsite`, and `images`: `icon`, `featureGraphic`, `phoneScreenshots` (2–8; a list, or `{ manifest, base, prefix }`), optional tablet screenshots |

Keep store copy in one place: other docs and pages link to the store data rather than copying it.

## Onboarding a new app

1. Add the skills submodule (`skill-orchestrator`), or update it, so `skills/skills/app-release/` exists
   (mount it at `vendor/skills/` if the repository already has a `skills/` folder of its own).
2. Write `app-release.config.json` and the store data file; make the app config read `buildNumberEnv`,
   `versionCodeEnv` and `buildShaEnv`.
3. `node skills/skills/app-release/scripts/ledger.mjs init --objective "…"`, then record `scope` with the
   platforms, monetization, territories and release behavior the owner chose.
4. Write a thin repository skill (see [the template](../assets/repo-skill.template.md)) that points here
   and adds only this app's facts and gates.
5. Read [accounts](accounts.md) for what the shared developer accounts already have, and [app types](app-types.md).
6. For a first iOS release, create or reuse the App Store Connect record with the authorized browser or
   Xcode workflow in [iOS onboarding](ios.md). Verify team, bundle ID, name, SKU, primary locale and
   platform; persist its verified Apple ID as `ios.ascAppId`, then run `asc.mjs status`. Leave the ID empty
   while unverified; never copy another app's ID or treat the public API's missing create operation as
   a requirement that the owner create it manually.
