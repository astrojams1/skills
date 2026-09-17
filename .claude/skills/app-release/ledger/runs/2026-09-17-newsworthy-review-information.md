# Newsworthy — Apple review information request

Recorded: **2026-09-17**. Skill version: **1.0.7**. Token/cost metrics: unknown.

This sanitized milestone uses the app's
[response draft](https://github.com/astrojams1/newsworthy/blob/main/store/apple-review-response.md),
[API capability check](https://github.com/astrojams1/newsworthy/blob/main/store/apple-review-api-capabilities.json)
and [TestFlight QA record](https://github.com/astrojams1/newsworthy/blob/main/store/apple-testflight-qa.json).
Earlier snapshots remain unchanged. Read the
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
for current review, evidence and release progress.

## Request and available access

The owner supplied Apple's actual Guideline 2.1 message. It requested information
because the developer account had limited review history; it did not identify a
particular crash or UI defect. API readback separately confirmed `REJECTED` and
`UNRESOLVED_ISSUES`. Those statuses alone did not explain the requested response.

Inspection of public App Store Connect OpenAPI **4.4.1** found submission/item
status resources but no App Review correspondence endpoint. Customer-review and
TestFlight-feedback APIs were not substitutes. Browser control remained unavailable
after sign-in/reconnection, while authenticated API work remained possible. The
owner-pasted message was enough to prepare the response without guessing a defect.

## Prepared work and evidence limits

The six-part response covered physical-device demonstration, purpose/audience,
setup/access, external services, regions, and regulated services/third-party
material. The request required the information in **both App Review Notes and the
reply**. Notes were saved, preserving the existing authorized contact phone in
the same API mutation. The app helper fetched the existing phone when no phone
override was supplied, and its live readback verified the saved fields. No contact
values are reproduced here. A saved draft was
not evidence of a sent reply or completed response.

At **2026-09-17T02:10:36.748Z**, version 1.0.0 build 6 was prepared for internal
TestFlight QA: `READY_FOR_BETA_TESTING`, build attached to an internal group,
**zero testers**, and **no invitations sent**. Physical recording and testing were
**pending**. This was distribution preparation, not installed or tested evidence.

Apple requested a recording of the submitted build launching and showing its
main flow on a physical device running the latest OS. Existing simulator images
could not satisfy that request. The response kept the recording pending and did
not treat device pairing as working device access. The final response required
the real recording/reference and verified build/OS facts in both Notes and reply;
reply delivery and any resubmission would need separate readback.

## Reusable lesson

Work from the actual review text, distinguish authenticated API access from
correspondence UI access, and preserve required review contact fields when saving
Notes. Keep distribution readiness, invitation, installation, physical QA and
review response completion as separate evidence.
