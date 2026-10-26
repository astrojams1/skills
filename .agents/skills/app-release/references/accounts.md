# Store accounts: Apple Business and Google Play Console

Checked against official documentation on **2026-09-16** and the owner's accounts through
**2026-10-19**. Recheck the linked requirements and the actual account UI on each run; account type,
territory, roles, store policies, API capabilities and navigation change. Record the check date and
evidence in the app's release ledger. Session lessons below are operational observations, not universal
platform requirements.

Verify the legal entity and account configured for this app. Apps may belong to different Apple teams
or Google Play developer accounts. Reuse account setup only within that verified scope, reading its
current status instead of repeating completed setup.

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

If a signed-in installed web app/PWA shows the account but its organization menu stays inert, inspect
its built-in **Open in browser/Open in Chrome** action. When available, this can preserve the existing
profile/session while restoring the controls. Verify the browser profile, account and selected legal
entity before changing app state. This is an authorized-session alternative, not a reason to extract
cookies, bypass security checks or infer signing authority from browser access.

### Preserve session continuity

Start with the exact app/profile/tab the owner identifies as active, including an existing in-app
browser, using its supported binding. Read the last working UI route from the app's ledger/run log
before opening another login URL. Rebind the same installed app/PWA or existing browser profile and tab
through the supported tool. A new tab can use a different profile or authentication context; its login
failure does not invalidate an existing session. In one release, direct app binding exposed the signed-in
account after inventory/Chrome failed.
Preserve that successful route on resume rather than starting again from inventory alone.

Keep a sanitized session-route record in the app's evidence, referenced from its ledger. Save the app or
bundle identifier, safe profile alias/opaque identifier and tab/origin when available, last successful
route and observation time. Reconfirm stale identifiers after reconnecting. Record these dimensions
separately; use `unknown` when the relevant surface cannot be inspected:

| Dimension | Record the observation |
| --- | --- |
| UI control | Exact app/tab binding, last successful interaction, tool error and supported recovery attempted |
| Apple authentication | Signed-in page, login/challenge shown, or unknown; keep an owner report distinct from readback |
| Team and role | Intended entity and observed selected team/access; API authority does not prove browser authority |
| Password manager | Locked, unlocked or uninspected, only when relevant; vault state does not establish Apple sign-out |

After the owner reports signing in, rebind and inspect **that same surface** before starting another
login or asking again. Continue ordinary authorized UI navigation and account/passkey selection when
the active tool permits it. A chooser is not proof of completed authentication; an actual password,
biometric, MFA or device-approval challenge may require the owner under the tool's rules. Preserve that
precise challenge separately instead of restarting the whole sign-in flow.

An inventory error or connector lock diagnostic is evidence about the tool call, not proof that the
Mac is locked or Apple is signed out. When the owner explicitly says the Mac is unlocked, retain that
as current owner-reported desktop evidence and correct the earlier inference; do not ask them to
unlock again from the same diagnostic. A missing browser in inventory or an unavailable browser binding
establishes that tool's availability, not the existing session's authentication state. Record Apple
authentication as uninspected until that surface can be read, preserving the owner's sign-in report.
If control fails again with the same error and unchanged state, reuse its recorded failure and diagnose
the supported binding/connector route; do not repeat denied calls, automatic unlock attempts or the same
owner sign-in request. Ask again only when new evidence
establishes a changed, specific human dependency. Keep failed new-tab authentication, a PWA challenge
and a locked vault distinct. Do not extract browser/session cookies, credentials or authentication
codes, bypass OS security, or change accounts/profiles to evade a challenge. Keep private account
details and sensitive URL parameters out of the session record.

### Diagnose the control route before handing it back

When a UI invocation expires at its own deadline, it may hide the provider's later diagnostic. Use the
active tool's documented timeout control for one bounded diagnostic retry, long enough to distinguish
its wrapper timeout from the underlying provider result. For example, a 30-second invocation deadline
masked a native app-server initialization timeout; a 60-second inventory call returned that specific
error after about 30 seconds. A longer deadline exposed the failure; it did not repair native control.
Do not repeat longer waits or create app records again as a recovery strategy. Diagnose the returned
connector/initialization error through supported tooling, preserving other active sessions.
If the active tool requires explicit authorization for another UI technology, a request to fix the
failure does not waive it. Do not substitute shell-based UI automation without that authorization.

Inspect the returned provider identity and capabilities, even when selection was requested by URL. A
result named **Codex MCP Apps** with type `mcpapps` and no tabs does not establish an App Store Connect
browser or Apple's authentication state. A missing native-app list accompanied by a native
initialization error means that inventory failed; it does not prove that the installed PWA is absent.
Use a supported binding for the intended app/browser when available. Keep a generic fallback provider,
a browser's missing tab, and an actual Apple login/challenge as separate observations.

Record the invocation deadline, elapsed time, returned provider/error and recovery result without
session secrets. Mark control restored only after reading the intended surface and completing a
relevant interaction; for app creation, also perform the independent API identity readback in
[iOS onboarding](ios.md). Local skill checks and a more informative error do not establish UI recovery.

Respect app-access denials across routes. If the tool explicitly forbids controlling the host app,
do not bind that native app to reach an unavailable embedded browser. Use another independently
authorized, supported route for the operation; if none can read the needed content, retain the exact
connector limitation and continue work that does not depend on it.

For a CLI's device login, a prefilled verification URL can leave its authorization button disabled.
Use the provider's normal code-entry page and enter the code from the CLI, then inspect the resulting
request before confirming the normal sign-in. Keep the same account and scope. An emailed security
code withheld by a connector is a real access boundary: ask for the exact verification step instead
of seeking the hidden code through another route. Never record authentication codes in release logs.

App-record creation is routine app setup through an authorized signed-in browser or Xcode session
([iOS onboarding](ios.md)); it is not an Account Holder certification. Public API creation being
unavailable, or a browser tool failing, does not establish an owner-only account gate. Record tooling
failures separately. Before asking for a demonstrated missing sign-in, unlock or role change, exhaust
supported authorized alternatives and finish independent work ([autonomy](../SKILL.md#autonomy-and-approvals)).

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

## 3. Google account gates

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

## 4. End-of-run evidence and handoff

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
