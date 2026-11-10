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
