# Privacy disclosures from evidence

Apple App Privacy and Google Data safety ask different questions about the same evidence. Build the evidence table
once per release that changes data practices. Then answer each store from it.

Make the project's evidence table before you fill in either store's questionnaire:

| Data/feature | Collection point | Recipient | Retention | Purpose | Identity linkage | Tracking/sharing basis | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Each observed data type | App, SDK, API, hosting logs, support flow | First/third party | Actual setting | Actual use | Proven behavior | Store-specific definition | Code + live configuration + provider docs |

Inspect SDKs, permissions, network calls, auth, crash and analytics services, backend logs, CDN and hosting defaults,
and support flows. Having no login or analytics SDK does not prove that nothing is collected. Hosting may keep IP
addresses, user agents, timings or errors. Tell an external mailto link apart from an in-app support form. Keep raw
personal log entries out of the repository.

## Apple

- **Classify by actual use.** Classify kept IP addresses by what they are actually used for. Diagnostics, identifiers
  and location are different options. Keep data purpose, identity linkage and tracking apart.
- **Claim only what you can show.** Claim de-identification only with evidence of the required treatment. "No ads"
  alone does not settle every privacy answer. On-device-only processing and transient request handling have specific
  definitions ([Apple privacy definitions](https://developer.apple.com/app-store/app-privacy-details/)).
- **Publish, then read back.** Complete each selected Apple data type, check the product-page preview, then press
  **Publish**. Publishing presents an accuracy and compliance attestation. Saving the categories alone does not
  publish them. Apply the existing authorization and the active tool's actual attestation rules, and keep a
  pending-confirmation state if needed. Read back the published result before you report it done
  ([Apple privacy publication](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)).
- **Reuse the session.** Resume the known working app, profile and tab before opening a fresh login
  ([session continuity](accounts.md#preserve-session-continuity)). Record control access, Apple authentication and
  publication as separate results.
- **After `APP_DATA_USAGES_REQUIRED`.** Keep the exact provider error and the existing review draft. Don't repeat the
  submission while the privacy gate is unchanged. Publish and read back the intended answers first, then retry the
  authorized submission. A new login attempt or prepared JSON does not change that gate.

### The privacy-label gate

Apple has no API for App Privacy answers, so three records are kept in step and checked against each other:

| Record | Where | Read by |
|---|---|---|
| What the build collects | Every privacy manifest the app builds with: `PrivacyInfo.xcprivacy`, an Expo config's `ios.privacyManifests` | `standards.mjs audit`, `privacy-label.mjs check`, `asc.mjs submit` |
| What App Privacy must say | Store data `appPrivacy.collected` ([config](config.md#store-data)), in App Store Connect's own names | the same |
| What App Store Connect publishes | The App Privacy section of the app's US App Store page | `privacy-label.mjs check`, `standards.mjs audit`, `asc.mjs submit` |

```json
"appPrivacy": {
  "collected": [
    { "type": "Product Interaction", "purposes": ["Analytics"], "linked": false, "tracking": false,
      "why": "first-launch: one anonymous first-open count (standards.md)" }
  ]
}
```

`[]` means Data Not Collected. A type the app's code does not collect (a provider's logs around a request) can be listed
only with `notInManifest` saying why; everything else must match the manifest exactly.

- **The offline check.** The `privacy-label` standard fails when the manifest and `appPrivacy.collected` disagree, or the
  manifest declares data and the store data has no `appPrivacy` (`privacy-label.mjs init` writes it from the manifest).
  `archive` refuses too, so the fix lands in the repository before a build.
- **The published label.** `privacy-label.mjs check` (and `standards.mjs audit`, unless `--offline`) fetches
  `https://apps.apple.com/us/app/id<ascAppId>` and reads the JSON the page is rendered from (`serialized-server-data`,
  the App Privacy "See Details" page data: each privacy type with its purposes and data types). It fails when the
  label does not show a type, purpose, linked answer or tracking answer that the manifest or `appPrivacy` declares,
  and says exactly what to add. A label that says more (linked where the app is not, an extra purpose) passes with a
  note; tidy it in the same visit. An unreadable page never passes on its own.
- **`asc.mjs submit --confirm` refuses** on any of these, before any write, with what to change in App Store Connect.
  Never submit around it: not by editing `appPrivacy` to match an old label, not with `--offline`. Opting out of
  `privacy-label` turns the gate off, so only the owner's decision is a reason for it.
- **The page lags App Store Connect.** The public page shows answers only after they are published, and can take a
  while to update. After publishing and reading the answers back in App Store Connect, `privacy-label.mjs confirm
  --evidence "<what the App Privacy page showed; screenshot path>"` records the expected answers as published. The
  gate accepts that record for 3 days while the public page catches up, then only the public page counts.
- **Read every app's label:** `node $S/privacy-label.mjs read <id> <id> ...` needs no repository.

Verified on 2026-11-19 against all ten live apps (Newsworthy, 6812519450: Device ID, Performance Data, Other
Diagnostic Data and Other Data Types, linked, App Functionality; Hanzi Cards, 6832296387: Data Not Collected).

### Change the published label

The daily release run changes App Privacy; no other step does. It does so for every live app whose published label lacks what its release branch's `appPrivacy` declares, whatever the app's review state (the sweep's `privacy.changeNow`, [daily run](daily-review-run.md) step 1a), and again before any submission when the gate fails. The owner approved declaring the
first-launch count on every app (2026-11-19, asked whether "It may require declaring analytics on each app's App Store
privacy label", he answered "Yes, every app"), so the run publishes answers that match `appPrivacy.collected` without
asking. It never publishes answers the evidence does not support. Apple's steps
([Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy),
[App privacy details](https://developer.apple.com/app-store/app-privacy-details/)); Account Holder, Admin or App
Manager can make them:

1. **Open the session.** Use Claude in Chrome (load the `chrome-browser` skill first) in the profile that holds the
   App Store Connect sign-in, resuming the known tab and route ([session continuity](accounts.md#preserve-session-continuity)).
   If it is signed out, sign in with 1Password autofill (`autofill_credential` for appstoreconnect.apple.com); try it
   before calling anything owner-only. A two-factor prompt that only reaches the owner's device, or 1Password reporting
   `not_connected`, is the one real blocker: record it and defer the app.
2. **Pick the team and app.** Check the selected team (Ouro LLC `AYCDG243RJ` or James Thompson `CWQ9AWJF8T`) and open
   **Apps**, the app (its Apple ID is `ios.ascAppId`), then **App Privacy** in the sidebar.
3. **Add a data type.** Next to **Data Types**, click **Edit**. An app that said "Data Not Collected" is asked again
   whether it collects data: choose "Yes, we collect data from this app" and **Next**. Tick each missing type (Usage
   Data > Product Interaction for the first-launch count) and click **Save** (or **Continue** when the page offers it).
4. **Answer its questions.** Click the new type under Data Types. Tick the purposes in `appPrivacy.collected` (Analytics),
   answer whether it is linked to the user's identity and whether it is used for tracking as the store data says
   (No and No for the first-launch count), then **Save**. To change an existing type, click it and change the answers.
5. **Check, then publish.** Read **Product Page Preview** and its **See Details**: it must match `appPrivacy.collected`.
   Click **Publish** (top right), and in "Publish Your App Privacy Responses?" confirm the answers are accurate and
   click **Publish**. Saving alone publishes nothing.
6. **Read it back.** Reload App Privacy and see the answers shown as published. Run `node $S/privacy-label.mjs check`.
   If the public page already shows them, record the result. If it still shows the old label, run `privacy-label.mjs
   confirm --evidence "..."` with what the page showed and the screenshot path, then check again: it passes on that
   record, with a note. Save a screenshot of the published page in the run's evidence folder.
7. **Record.** Write `apple.privacy` in the app's release ledger with the published answers, and update
   `appPrivacy.published` in the store data in the app's next pull request.

If any step cannot be finished, the app is deferred with the gate's exact message; the build is never submitted
around it. App Privacy needs no new version or build: the answers can be published before or after the build is made.

### Alternative when the Apple browser is unavailable

Check Fastlane's documented
[`upload_app_privacy_details_to_app_store`](https://docs.fastlane.tools/uploading-app-privacy-details/), and whether it
can reuse an existing authorized Apple ID session. Fastlane documents owner or admin access for this action, and it
does not accept App Store Connect API-key authentication. Apple's browser workflow also allows App Manager. First
prepare its JSON from the evidence table and check that it means what the table says. A missing browser alone does not
prove there is no usable CLI session.

**Never let it fall back to a password.** Fastlane's normal login can fall back to stored credentials when a session
expires.

- Go ahead only when you can ensure it reuses the authorized session without an owner-password sign-in. Otherwise
  leave normal sign-in and required security challenges to the owner.
- Don't extract browser cookies or use a stored owner password. Don't assume that stopping at a password prompt
  prevents the fallback.
- If the installed client can't guarantee session-only reuse, record that route as unavailable, and don't run its
  normal login. This is not evidence that the browser is signed out.
- This CLI limit does not make ordinary authorized UI navigation, or choosing an existing account or passkey,
  owner-only. Inspect the actual challenge and the active tool's rules, as session continuity describes.
- Confirm the App Store Connect team or provider separately. Fastlane's `team_id` is not the config's signing
  `ios.teamId`.

**Save the current state before you change it.** The
[action implementation](https://github.com/fastlane/fastlane/blob/master/fastlane/lib/fastlane/actions/upload_app_privacy_details_to_app_store.rb)
deletes the existing usage rows before it creates replacements, with no rollback. After an uncertain result, read the
current state before you retry. `skip_publish` still replaces the answers; it only stops publication. Verify the
intended app and team, the actual category, purpose and protection rows, and the published result. A cached
published flag or a successful command alone does not prove the intended answers are public. Keep the attestation
rules that apply.

## Google

Map the evidence to **Data safety** on its own terms. Its definitions of collection, sharing, ephemeral processing,
encryption and deletion differ from Apple's. Include SDK and service practices and any account-deletion flows that
apply. Keep the public privacy policy consistent with both the actual release and the submitted answers
([Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)).
