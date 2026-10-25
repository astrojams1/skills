# Privacy disclosures from evidence

Apple App Privacy and Google Data safety answer different questions from the same evidence.
Build the evidence table once per release that changes data practices, then answer each store from it.

Create a project evidence table before completing either store's questionnaire:

| Data/feature | Collection point | Recipient | Retention | Purpose | Identity linkage | Tracking/sharing basis | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Each observed data type | App, SDK, API, hosting logs, support flow | First/third party | Actual setting | Actual use | Proven behavior | Store-specific definition | Code + live configuration + provider docs |

Inspect SDKs, permissions, network calls, auth, crash/analytics services, backend
logs, CDN/hosting defaults, and support flows. No login or analytics SDK does not
prove no collection: hosting may retain IP addresses, user agents, timings, or
errors. Distinguish an external mailto link from an in-app support form. Keep raw
personal log entries out of the repository.

For Apple, classify retained IP addresses by their actual use; diagnostics,
identifiers, and location are different possibilities. Separate data purpose,
identity linkage, and tracking. Claim de-identification only with evidence of
the required treatment; “no ads” alone does not settle all privacy answers.
On-device-only processing and transient request handling have specific
definitions. [Apple privacy definitions](https://developer.apple.com/app-store/app-privacy-details/).

Complete each selected Apple data type, inspect the product-page preview, then
**Publish**. Publishing presents an accuracy/compliance attestation; saving the
categories alone does not publish them. Apply existing authorization and the
active tool's actual attestation rules, preserving a pending-confirmation state
if necessary. Read back the published result before reporting completion.
[Apple privacy publication](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy).

### Alternative when the Apple browser is unavailable

Check Fastlane's documented
[`upload_app_privacy_details_to_app_store`](https://docs.fastlane.tools/uploading-app-privacy-details/)
and whether it can reuse an existing authorized Apple ID session. Fastlane documents owner/admin
access for this action and excludes App Store Connect API-key authentication; Apple's browser
workflow also permits App Manager. Prepare and semantically validate its JSON from the evidence
table first; a missing browser alone is not proof that no usable CLI session exists.

Fastlane's normal login can fall back to stored credentials when a session expires. Proceed only
when authorized session reuse can be ensured without owner-password sign-in; otherwise leave
normal sign-in and required security challenges to the owner. Do not extract browser cookies,
use a stored owner password, or assume that stopping at a password prompt prevents that fallback.
Confirm the App Store Connect team/provider separately: Fastlane's `team_id` is not the config's
signing `ios.teamId`.

Preserve current answers and publication state before mutation: the
[action implementation](https://github.com/fastlane/fastlane/blob/master/fastlane/lib/fastlane/actions/upload_app_privacy_details_to_app_store.rb)
deletes existing usage rows before creating replacements, without transactional rollback. After
an uncertain result, read current state before retrying. `skip_publish` still replaces the answers;
it only suppresses publication. Verify the intended app/team,
actual category/purpose/protection rows and published result; a cached published flag or successful
command alone does not prove the intended answers are public. Preserve applicable attestation rules.

For Google, map the evidence independently to **Data safety**: its collection,
sharing, ephemeral processing, encryption, and deletion definitions differ from
Apple's. Include SDK/service practices and applicable account-deletion flows.
Keep the public privacy policy consistent with both the actual release and the
submitted answers. [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469).

