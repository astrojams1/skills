# Android: local Gradle build, Play Developer API and Play Console

Everything here runs from the app repository on the owner's Mac. Nothing builds in EAS.
`S=skills/skills/app-release/scripts` below.

## Toolchain

Homebrew `openjdk@17`, `bundletool` and `android-commandlinetools`, with SDK platform 36, build-tools
36.0.0 and NDK 27.1.12297006 under `/Volumes/ssd/toolchains/android-sdk`. When unset, the script defaults
`JAVA_HOME` to Homebrew's JDK and `ANDROID_HOME`, `GRADLE_USER_HOME` and `ANDROID_USER_HOME` to SSD paths;
the caller's `PATH` (and its Node, 22.13 or newer) comes before Homebrew's.

## Credentials

The vault item (`android.vault`, one per app, e.g. `op://API Tokens/Space Worms Android`) holds attachments
`upload.jks` (PKCS12, alias `upload`) and `play-service-account.json`, `google-services.json` when the app
uses push, and the field `keystore password`. The script reads them into a mode-700 temporary directory for
one run. Gradle gets the signing settings as environment (`ORG_GRADLE_PROJECT_android.injected.signing.*`)
and bundletool and keytool read the password from a private file or the environment, so no password reaches
a process list. The keystore is only the upload key: Play App Signing holds the key users' installs are
signed with, and a lost upload key can be reset in Play Console. The vault's service account is read-only,
so the owner adds or replaces items.

**Play API setup, once per app:** in a Google Cloud project enable the **Google Play Android Developer API**
and create a service account with no project roles. In Play Console → Users and permissions → Invite new
users, invite its email with app permissions for this app only: **Release apps to testing tracks**, **View
app information** and, for `play.mjs` writes, **Manage store presence** (and **Edit and delete draft apps** while the app is a draft) — no account permissions. The owner
creates its JSON key, attaches it to the vault item as `play-service-account.json` and deletes the download.
To revoke access, delete the key in Google Cloud or remove the user in Play Console.

## Commands

```bash
node $S/android-release.mjs next-version-code          # Play's highest plus one, across tracks and bundles
node $S/android-release.mjs tracks                     # what every track serves, read-only
node $S/android-release.mjs release                    # bundle + universal APK, no upload
node $S/android-release.mjs release --track internal   # …and upload (ask the owner first)
node $S/android-release.mjs upload --version-code N --track alpha [--notes TEXT] [--hold]
node $S/android-release.mjs promote --version-code N --track alpha [--hold]
node $S/play.mjs status | listing | images             # store presence (see below)
```

- **bundle** refuses a dirty checkout (`--allow-dirty` makes a phone test build that `upload` refuses), runs
  `expo prebuild --platform android --clean` with `android.versionCodeEnv` and the build commit, then
  `./gradlew bundleRelease` signed with the upload key. Prebuild and Gradle run with `EXPO_NO_DOTENV=1` and no
  inherited `EXPO_PUBLIC_*` value, so an ignored `.env` file cannot point a clean-looking bundle at another
  server, and a commit or edit made during the build fails it. Before anything leaves the Mac it checks the
  `.aab`: package, version code, target SDK (`minTargetSdk`), the release JavaScript, configured resources
  present (`string/google_app_id` for push) and blocked permissions absent, and a signature by the upload key
  rather than Expo's debug key. Output and `summary.json` (commit, dirty flag, JDK, SHA-256) go to
  `<buildRoot>/android/<slug>/<code>/`.
- **verify** rechecks bundle N without rebuilding, keeping the commit and dirty flag recorded at build time.
- **apk** turns the bundle into one universal APK with the same key, for an emulator (`adb install -r`).
- **upload** refuses a bundle whose summary is dirty, names no commit or does not match the file; opens an
  edit, uploads, checks Play read the same version code and SHA-256, sets the track to one `completed`
  release with en-US notes, commits, and reads the track back. A failed edit is deleted, so a failed run
  changes nothing on Play.
- **promote** puts a bundle Play already holds on another testing track (Play Console's "Promote release"),
  uploading nothing and leaving the track's countries and testers alone.
- **Commits** default to `changesInReviewBehavior=ERROR_IF_IN_REVIEW`: Play's own default would cancel a
  review in progress and resubmit everything, so the upload fails instead. **`--hold`** commits with
  `changesNotSentForReview=true`: the changes wait in Publishing overview until the owner sends them. Play
  requires `--hold` while an earlier submission stands rejected (Newsworthy version 16, 19 October 2026), and
  then a separate `:validate` call refuses the edit, so the scripts let commit validate it. An app whose owner always sends
  changes from the console sets `android.holdForReview: true` (Newsworthy).
- Tracks are `internal`, `alpha` (closed testing) and `beta` (open testing); Google documents internal
  testing's API name as `qa`, so the script uses whichever Play lists. **Production stays in Play Console.**
  Every upload, promotion and listing write is outward-facing: ask the owner before each one.

## The owner's phone

Never ask the owner to plug the phone in or turn on USB debugging. The phone gets each build from Play:
upload to internal testing, where the owner's tester list holds the owner's account, and the owner installs
or updates it from the Play Store through the internal-testing opt-in link (Test and release → Internal
testing → Testers → Copy link). Agents check builds on an emulator with the universal APK first, and record
emulator and physical-device checks separately.

## Store presence: `play.mjs`

`status` compares Play's listing text, contact details and image hashes with the store data's `google`
section, lists the hashes of graphics the store data does not list (an app may keep them only in Play), and
prints every track. `listing` replaces the default-language title, short and full description
and contact details, reads them back, then commits. `images` replaces each listed image type in order
(icon 512×512, feature graphic 1024×500, 2–8 phone screenshots), compares Play's SHA-256 of each with the
repository's and commits only when all match.

**An API commit replaces console drafts.** On 15 October 2026 Newsworthy's listing text was saved in Play
Console with "Save as draft"; the next API edit (the artwork upload) committed Play's last saved listing, and
the draft was gone. Save console changes with **Save** before any API write, and read the listing back after.

## Console only

Creating the app, the first bundle (Play takes an app's first `.aab` only in Play Console: Test and release →
Internal testing → Create new release), App content (privacy policy, app access, ads, content rating, target
audience, Data safety, government apps, financial features, health, **News apps**), store settings (category,
contact), tester lists, pricing for a paid app, the closed test, the application for production access, and
production releases. The built-in browser's Play Console session is signed in: read Policy status there
(Publishing overview, then Policy status → issue details) and use it, with the owner's approval, for console
steps. Record each console change in the ledger with what the page showed afterwards.

## Production access for a new personal account

A personal developer account created after 13 November 2023 needs a **closed test with at least 12 testers
opted in continuously for the preceding 14 days**, then an application for production access; internal
testing does not count and approval is not automatic at day 14 (see [accounts](accounts.md)). Record the
closed-test track, opt-in link, start date, participant count and feedback as `google.closed-test`. Recruiting
testers (for example through the `reddit-posting` skill) is owner-approved outreach.

## Gotchas

- **Package names are permanent** and a free app can never become paid under its package: set a paid price
  before the app is offered free on any track.
- **Target SDK:** Play requires 36 or later for new apps and updates since 31 August 2026.
- **Version codes only rise**, across every track and every uploaded bundle, including bundles on no track.
- **News apps** (category News & Magazines) must complete the News declaration and show publisher and
  contact details inside the app; Newsworthy's version 16 was rejected under the News and Magazines policy
  until Settings showed the publisher (19 October 2026).
- **Every rejection teaches the skill.** Once a Play rejection's root cause is established (Policy status and
  the Inbox in Play Console carry the message), fix it for the app, then change this skill so no app meets it
  again: a check in the scripts that refuses before any write where the cause is detectable, otherwise a
  gate, an [app types](app-types.md) row or a gotcha here, as the News apps line above came from Newsworthy's
  version 16 (SKILL.md, "Fix a store rejection twice").
- **Review states** live in Publishing overview ("Changes in review", "Changes not sent for review"); a
  committed edit with `--hold` has not been sent.
- **A cloud container's Maven downloads can be rate-limited** (HTTP 429), and EAS sandboxes lack emulator
  acceleration: build and emulate on the Mac.
