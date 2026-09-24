# Apple and Google store runbook

Checked against official documentation on **2026-09-16**. Recheck the linked
requirements and the actual account UI on each run; account type, territory,
roles, store policies, API capabilities, and navigation change. Record the check
date and evidence in the consuming project's release ledger. Session lessons
below are operational observations, not universal platform requirements.

## 1. Separate account setup from each app's release

| Scope | Apple | Google |
| --- | --- | --- |
| Account | Active membership, correct legal entity, agreements, tax/bank status, trader information, API access | Developer identity/contact verification, applicable physical-device verification, payments profile, API/service-account access |
| App | Bundle/app record, pricing/territories, listing/media, privacy, age rating, review information | Package/app record, pricing/territories, listing/media, Data safety, content declarations, test tracks |
| Release | Signed build, processing, selected version build, review submission, approval, release | Signed AAB, accepted upload, track release, applicable testing/production access, review, rollout |

Reuse established account setup after checking its current status. Do not ask the
owner to enroll, pay again, recreate credentials, or repeat completed identity
checks because a new app has a new ledger. Store identifiers belong in the
project's release configuration; credentials and private identity details do not.

For each pending task, try the available authorized API/CLI, connector, and
signed-in UI before describing it as owner-only. A broken connector does not prove
the account is inaccessible. Continue independent listing/build work while an
account task waits. Preserve existing authorization rather than inventing a new
approval gate for each routine field. If the active tool requires confirmation,
identify that exact restriction and prepare the concrete action first.

Record the project's actual monetization intent: free download, paid download,
IAP, subscription, or other supported model; base currency/price; territories;
release timing. **Do not inherit Newsworthy's $1 price or product restrictions as
defaults for other apps.** Verify the stored price and country availability after
saving. Localized prices may differ from the base price.

## 2. Apple account and Business setup

Open [App Store Connect → Business](https://appstoreconnect.apple.com/business)
and inspect the selected legal entity, Agreements, Bank Accounts, Tax Forms, and
Compliance sections. Missing editing controls may indicate the wrong team, role,
agreement state, an already-submitted form, or a separate add-form dialog.

### Legal address correction

The Apple Account contact address, developer membership address, tax information,
and App Store Connect legal entity are distinct records. Editing one is not proof
the others changed. If the legal entity shows an obsolete address, use the
Account Holder's developer **Membership details** update-request path. Apple
verifies membership name/address changes and may request documentation.
[Apple membership updates](https://developer.apple.com/help/account/membership/updating-your-account-information/).

Prepare an accurate support request when needed. Send it only under the user's
existing explicit authorization to contact support; preparing a draft is not
sending it. Record submitted/pending/approved separately and read back Business
after approval. Never reuse an address the user has corrected, or copy private
addresses/support transcripts into the shared skill repository.

### Paid agreement

Find **Paid Apps Agreement → View and Agree to Terms** (wording can vary).
The Account Holder signs; the agreement is required for paid apps and IAP.
Inspect the legal entity and the actual agreement status. A membership renewal,
price saved, or build upload is not evidence of an active paid agreement.
[Apple agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/).

### Tax forms: Add Tax Info versus Add Tax Form

1. In **Business → Agreements → Tax Forms**, locate the existing required form.
2. Use **Add Tax Info** on that row to complete it. The **+ / Add Tax Form**
   dialog adds a missing form; an empty selection there can mean the required
   form already exists. Do not repeatedly open that dialog as an editor.
3. If the required form is absent, use **+ → Paid Apps**, choose it, and add it.
4. After the owner says a W-9 or other form was submitted, refresh and inspect
   its status. Record user-reported submission separately from verified
   processing; do not ask them to submit it again blindly.

Apple requires the paid agreement before tax submission; the appropriate form
depends on the entity's facts. Never guess tax IDs, classifications, treaty
claims, or certifications. Submitted forms can become read-only; some corrections
require Apple support. [Apple tax instructions](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information/).

### Banking

Use **Business → Agreements → Bank Accounts → Add Bank Account**; existing
accounts have their own edit/manage controls. Verify the entity, currency, and
pending status. Required tax forms must be submitted for bank processing.
An Admin/Finance user's bank changes may require Account Holder approval.
Keep banking values out of logs and the ledger; record only status and the next
required action. [Apple banking instructions](https://developer.apple.com/help/app-store-connect/manage-banking-information/enter-banking-information/).

### EU Digital Services Act declaration

Use **Business → Agreements → Compliance → Digital Services Act → Complete
Compliance Requirements**, sometimes exposed in a banner. Determine trader
status from the owner's actual circumstances; a personal developer account does
not automatically mean non-trader. Explain the displayed contact information
before entering it. Traders provide verified contact details for EU product
pages. Track account verification and each app's relevant setting/availability;
do not remove EU availability merely to bypass an unresolved declaration without
the user's direction. [Apple DSA requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/).

## 3. Apple app setup and review

Maintain canonical, truthful listing copy in the project: name/subtitle,
description, promotional text, keywords, support/marketing/privacy URLs,
copyright, category, age questionnaire, review notes, pricing and territories.
Validate limits against the current API/UI. Answer content, rights, encryption,
accessibility, and age questions from the shipped app and its dependencies;
do not infer claims from aspirations or reuse another app's questionnaire.

### Review contact and API semantics

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

### Respond to the actual review message

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

### TestFlight preparation is not physical QA

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

### Build, review, and release are separate states

Record artifact/build ID and version, upload receipt, Apple processing state,
selected build relationship, review-submission state, approval, and release state
separately. After upload, wait for processing and select the intended build on
the version. Complete the page's remaining requirements, submit for App Review
under the user's authorized scope, and verify the resulting state. Respect the
chosen automatic/manual/scheduled release option. An EAS Submit success or
TestFlight build is not an App Review submission or a live App Store listing.
[Apple publishing workflow](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/overview-of-publishing-your-app-on-the-app-store).

### Availability and API submission: verified seed sequence

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

### Resubmit after resolving review issues

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

## 4. Privacy disclosures from evidence

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

For Google, map the evidence independently to **Data safety**: its collection,
sharing, ephemeral processing, encryption, and deletion definitions differ from
Apple's. Include SDK/service practices and applicable account-deletion flows.
Keep the public privacy policy consistent with both the actual release and the
submitted answers. [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469).

## 5. Store artwork with native provenance

Capture the actual iOS/iPadOS and Android release-equivalent builds separately;
a browser page is not a native preview, and an iPhone screenshot is not Android
evidence. Exercise the screen/feature before advertising it. Preserve original
captures, an editable composition source, generated assets, and a manifest of
platform/device/OS/build, dimensions, checksums, and alt text. Keep sensitive UI
out of captures. Never synthesize unimplemented screens or fake widget state.

Design restrained artboards around genuine captures, with a clear feature
sequence and legible copy. Verify the output visually on each target canvas,
including tablet layouts, dark mode, clipping, color, and transparency. Keep
current image requirements in a validator rather than relying on memory.

- Apple dimensions depend on display family; successful seed examples were
  **1320×2868** iPhone and **2064×2752** iPad. Recheck supported sizes and which
  families the current app must supply. Verify server asset processing completes
  after upload, not merely HTTP upload success.
  [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).
- Google uses a **512×512** listing icon and **1024×500** feature graphic.
  Phone screenshots accept JPEG or 24-bit PNG without alpha, dimensions
  320–3840 pixels, with the long side no more than twice the short side.
  A **1080×1920** artboard can frame a taller native capture without stretching
  it. Check required counts and device categories. Keep actual UI prominent;
  avoid price/ranking/install-promotional overlays.
  [Google preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).

## 6. Google account gates and app bootstrap

### Verification order

Read the account Home tasks; registration payment is not verification.
For applicable new personal accounts, the **account owner** must use the Play
Console mobile app on a non-rooted physical Android device running Android 10
or later. From the web Home task, open details/QR code, sign into the mobile app
as the owner, choose the developer account, and verify. An emulator or additional
MCP connection cannot replace this physical-device step.
[Google device verification](https://support.google.com/googleplay/android-developer/answer/14316361).

Contact-phone verification follows identity verification plus applicable device
(individual) or website (organization) verification. A disabled phone button can
therefore be a dependency, not a broken dropdown. Follow the task link, use the
correct owner contact, and complete SMS/voice verification directly with Google.
Read back the cleared task. [Google identity/contact verification](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en).

### Pricing before offering the app

If the user intends a paid download, create/configure it as **Paid** and verify
the price before offering it for free on any track. Once an app has been offered
free, Google does not permit changing that package to paid; a new package/app
would be needed. Do not temporarily switch to free to simplify testing. Inspect
payments-profile readiness and country prices.
[Google pricing rules](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en-IN).

### Bootstrap automated uploads without an obsolete manual-only rule

Create the app record in Play Console, set the package identity and intended
pricing, configure a Google service account with the required Play permissions,
and securely provide its key to the selected upload service. Use the production
**AAB**; the emulator APK is a separate artifact.

Current Expo documentation says the first `eas submit` can create an **internal
testing** release once these prerequisites exist. Prefer this authorized path;
use `releaseStatus: draft` when only staging is intended. If the installed tooling
or actual Google API rejects bootstrap, inspect the precise error and complete
the initial upload in Play Console, then resume automation. Do not tell every
future user that a manual first upload is universally mandatory. Store listing
and setup tasks still gate progression beyond draft.
[Expo Android submission](https://docs.expo.dev/submit/android/).

Complete the dashboard's applicable content declarations: app access/reviewer
instructions, ads, target audience, content rating, Data safety, privacy policy,
and feature-specific policy forms. Derive answers from code and actual behavior.
Review API edits/commit results and Console state; uploading an AAB is not a
production rollout.

### New personal-account testing

For personal developer accounts created after **2023-11-13**, current rules
require a closed test with **at least 12 testers opted in continuously for the
preceding 14 days**, then a production-access application. Internal testing is
not a substitute. Record the closed-test track, opt-in link, start date,
participation evidence, feedback, fixes, and truthful readiness answers. Do not
claim the clock is complete from an elapsed calendar interval without checking
qualifying participation. Approval is not automatic at day 14.
[Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465).

Prepare recruitment instructions and feedback collection; contact testers only
when instructed. Once access is granted, complete the production release and
review steps, verify rollout/availability, and check the public listing on the
intended countries/devices. Account gates and real tester participation remain
external facts, even when all technical work is automated.

## 7. End-of-run evidence and handoff

For each platform, report the furthest **verified** stage: prepared, uploaded,
processed, draft, testing, submitted for review, approved, released, or live.
Persist exact actionable blockers with navigation, observed error/status,
attempted alternatives, dependency, responsible actor, and evidence date.
Separate owner facts/physical steps from platform processing and agent work.

For example: “W-9 submitted, user-reported; refresh Tax Forms to verify status”
is accurate until readback. “Apple support draft prepared” is not “address
corrected.” “Privacy categories saved” is not “privacy published.” “Build valid”
is not “review submitted.” Update earlier claims if new evidence contradicts
them, and keep private form values out of the shared ledger.
