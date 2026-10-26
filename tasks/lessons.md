# Lessons Learned

## Exhaust authorized release work before handoff

**Source:** Owner correction during Füd relaunch (2026-10-22).

- A screen-lock/tool response limits that UI route, not the whole Mac or release. Diagnose the exact
  operation, try supported authorized alternatives, and finish independent work before asking for help.
- Show available designs inline as previews; preserve the separate requirement for real native captures.
- Mark only demonstrated human dependencies `waiting_user`; do not convert agent/tool failures into
  assumed owner obligations or bypass real security/provider restrictions.

Capture patterns and corrections here after any mistake or user feedback. Review at session start.

## Honor current owner evidence when a UI diagnostic disagrees (2026-10-26)

- Prioritize the exact active app/profile/tab the owner names. An unavailable
  in-app browser binding says nothing about that page's Apple authentication.
- Preserve the owner's explicit unlocked report and correct the inferred lock
  claim. Do not repeat an unlock or sign-in request from the unchanged tool error.
- Keep tool availability and app-access permission separate. An explicit host-app
  control denial cannot be bypassed by binding it natively to reach an embedded tab.

## Shared discovery cleanup needs ownership evidence (2026-10-26)

- Discovery roots can contain tracked repository skills, untracked local skills
  and imported shared skills. Absence from upstream does not establish ownership.
- Record imported copies and content hashes. Remove a retired directory only
  when prior provenance matches unchanged content; preserve unknown or modified
  copies, including when provenance is absent or malformed.
- Restrict legacy flat-file migration to known shared skill names. Exercise
  install, link and check auto-refresh against real local-skill fixtures.

## Design System Migration Rigor

**Source:** User feedback (2026-03-04)

1. **Zero-tolerance straggler sweep.** After a design system migration, absolutely everything must be governed by the design system — no straggling colors, fonts, radii, or shadows. The verification phase must exhaustively search for and eliminate every non-design-system value.
2. **Ask the human on novel situations.** When the agent encounters a UI pattern not covered by the design system, it must ask the human for guidance rather than guessing.
3. **Contribute back.** New patterns created during migration must be contributed back to the design system skill so future projects benefit.

## Release continuity and owner handoffs

**Source:** Newsworthy launch corrections (2026-09-16)

- Preserve working approvals and verify alternative authenticated tool paths before
  assigning a routine technical task to the owner. Distinguish actual policy gates
  from assumptions introduced by the agent.
- A persisted ledger prevents repeated account setup and preserves interrupted
  release work. Record user-reported completion separately from provider readback.
- Inspect the existing tax-form row before repeatedly opening a country/form picker.
- Snapshot project facts into reusable runbooks without hardcoding one app's price,
  credentials, account identifiers, legal details or product policy into future apps.

## Capture planning and factual widget evidence

**Source:** Newsworthy gallery corrections (2026-09-16)

- Record gallery content and background preferences before capture. Newsworthy's
  no-About gallery, clean Home Screen without unrelated icons, neutral plain
  wallpaper and supported-size coverage belong to that app's brief; do not impose
  those exact aesthetic choices on every app.
- Check native size support and visual evidence independently. One medium iOS
  widget capture does not verify the small family or Android launcher resizing.
- Preserve unedited native sources and build/device provenance. A locked host
  means capture is pending; staging instructions and mockups are not screenshots.
- Keep live release state canonical and append dated corrections to historical
  skill snapshots. Developer withdrawal (`DEVELOPER_REJECTED`) must not be described
  as a reviewer rejection.

## Native widget diagnosis and honest composition

**Source:** Newsworthy native capture and resize corrections (2026-09-16)

- If wallpaper controls are unavailable, preserve genuine native screenshots and
  distinguish a cropped widget surface framed in artwork from a changed wallpaper
  or full Home Screen capture. Never invent UI to satisfy a visual preference.
- Diagnose flicker and resize interruption from native logs before blaming the
  user, launcher or control tooling. An app-driven worker/receiver update loop
  can recreate a widget while the user is resizing it.
- A source-supported minimum size or scheduling repair is not native proof.
  Verify stable interaction, actual size variants and consistent readings in the
  replacement build before declaring the Android issue resolved.

## Partial widget verification

**Source:** Newsworthy APK 8 native evidence (2026-09-16)

- Pair a quiet post-fix log window with initial refresh success and a pending next
  job; distinguish scheduling from an actually observed recurring execution.
- Test theme switching without new data. Retained span colors can disagree with
  correctly updated XML backgrounds and primary text.
- Existing launcher minimum spans and installed provider dimensions are distinct
  evidence. Treat caching as a hypothesis until a freshly added widget is resized.
- Keep stability, refresh, resizing and theme outcomes separate. Source checks for
  a replacement fix do not close its native verification gate.

## Design contracts need consumer and native evidence

**Source:** Newsworthy fifth cross-surface design correction (2026-09-16)

- Generated tokens and successful builds do not establish consumption parity.
  Verify semantic sizes, baselines and theme resources in the actual consumers.
- Exercise known regressions, including real pre-fix artifacts, and fail on missing
  source structures. Never silently update expected baselines to hide a mismatch.
- Parsed native XML and production rendered props are contract evidence, not
  Yoga/WidgetKit/RemoteViews execution. Keep native surface/size/theme captures
  separate, and limit approval claims to the captures actually reviewed.

## App Review information requests and physical QA

**Source:** Newsworthy Guideline 2.1 request (2026-09-17)

- Read the actual request before proposing a defect fix; a user-pasted message can
  unblock preparation when browser correspondence access is unavailable.
- Public review-status APIs are not App Review correspondence. Browser control
  and API authentication must be assessed separately.
- If both Notes and a reply are requested, prepare matching complete responses;
  preserve the authorized contact phone in the Notes mutation without publishing it.
- TestFlight readiness and an empty group do not establish invited testers or QA.
  Physical-device/latest-OS recordings require real evidence, not simulator captures.

## Native chrome coverage and TestFlight access

**Source:** Newsworthy physical TestFlight corrections (2026-09-17)

- Include OS-generated native chrome in visual QA and record SDK/runtime/device
  coverage. Transparent JS headers and older simulator captures can miss newer
  physical-OS decorations; a forwarding-path fix still needs native verification.
- Check group membership and invitation state before explaining missing TestFlight
  builds. An empty direct tester-build relationship is not decisive installation
  evidence, and a group Resend control must not be invented.
- Close an invitation task after verified state and owner-confirmed access, while
  keeping later physical correction checks separate.

## Resubmission and downloaded recording evidence

**Source:** Newsworthy build 7 review resubmission (2026-09-17)

- A review reply and attachment do not submit the app again. Resolve addressed
  items, submit the existing submission, and verify both review states and build.
- Preserve original recordings and document initial-idle trimming/audio removal.
  State visible coverage explicitly and do not imply unshown QA passed.
- A cloud listing's file size can describe a dataless placeholder. Check download
  metadata and real media bytes/hashes before blaming upload or processing.

## Notification release evidence

**Source:** Newsworthy notification checkpoint (2026-09-24)

- Treat signing entitlement, configured APNs delivery credential, accepted Expo
  ticket, successful APNs handoff receipt and physical visibility as separate
  gates. Registration and automated tests do not close physical delivery or tap QA.
- Compare published privacy disclosures with the native manifest and real data
  flow before uploading. Preserve a canceled mismatch build and replacement
  provenance without claiming the replacement completed.
- Reuse signed-in alternatives when a CLI is logged out. Redacted production
  secret placeholders are not a reason to weaken policy; use authorized aggregate
  read-only queries when counts suffice and keep device tokens out of records.

## Notification handoff and physical visibility

**Source:** Newsworthy build 21 resubmission (2026-09-24)

- A successful APNs handoff receipt and observed subscription-count changes do
  not verify a visible physical banner or notification tap. Name the precise
  physical-device actions observed and the presentation states left untested.
- Check notification-mirroring settings when using a mirrored phone; an absent
  Mac banner cannot settle whether the physical phone displayed a notification.
- Refresh stale browser sessions and inspect the key inventory before repeating
  credential creation, so uncertain results do not create duplicate keys.

## Artifact scope and document-receipt limits

**Source:** Newsworthy store follow-up (2026-09-24)

- Re-check the artifact against current source features and listing claims. Earlier
  verification is bounded to that build's scope; new functionality needs a
  replacement build and native evidence.
- Do not infer legal-address correction or exact case linkage from a generic
  document-receipt email. Verify the affected record independently.
- A connector reauthentication failure does not rule out an existing signed-in
  browser; accepted terms and a processing creation request do not establish
  completed infrastructure or working push delivery.

## Notification visibility and renewed review evidence

**Source:** Newsworthy Android 12 and Apple 21 follow-up (2026-09-24)

- Record provider receipts, visible shade content and cold-start tap independently;
  emulator success is bounded evidence, not a physical-device or Play-account pass.
- Identify the failing process before calling a shell ANR an app crash.
- A new guideline request does not imply an earlier guideline was approved. A
  historical video cannot demonstrate new features or an unobserved OS/build pair.

## Reviewer wording versus our inference

**Source:** Owner correction during Newsworthy build 21 resubmission (2026-09-24)

- Do not turn a generic repeated information request into an assertion that Apple
  explicitly demanded a new recording or found the old one missing/outdated.
- Inspect the existing review attachment, download/hash evidence and saved Notes
  before asking the owner to repeat work. Label advice for broader coverage as
  our recommendation when the reviewer did not expressly require replacement.
- Inspect new media and retain its limits: visible features do not prove an OS or
  build number that the recording never shows. Do not make unsupported OS claims.

## Vertical video is watched under someone else's interface

**Source:** Owner's screenshot of the Newsworthy trailer as a YouTube Short (2026-10-21)

- A frame that looks right in the renderer can still be wrong where it is
  watched. Before calling a Short, Reel or TikTok done, draw the platform's
  measured overlay on every frame (`youtube-shorts/scripts/safe-zone.mjs`),
  and after posting, look at it on a phone.
- Measure the overlay from a real screenshot fitted to the source frame;
  published "safe zones" are ad specs and disagree with each other.
- "Title safe" is not "Shorts safe": the top band is controls, the right edge
  is a button rail and the sides are cropped on tall phones.

## Fitting is not framing

**Source:** Owner's review of Newsworthy's re-framed trailer (2026-10-21): "you shrunk everything to fit but the video needs some deeper rethinking not just shrinking. it looks weird to have tiny phone and ratio of headlines to content feels off. look at it yourself."

- A constraint met by scaling everything down is not a design. When a layout
  has to fit a smaller space, recompose it for that space's proportions: the
  subject large (cropped by the frame if need be), the type sized to the
  subject, things moved rather than shrunk.
- Passing checks (zones, tests, verify) say nothing about whether a frame
  works. Look at it as the viewer will, through the real overlay, before
  presenting it as fixed.


## A missing public API operation is not a human-only task

**Source:** Owner correction during Importron onboarding (2026-10-22).

- Check earlier successful release evidence before assigning a routine store task to the owner.
  Space Worms' history records agent use of an authorized signed-in browser to create the app record.
- Distinguish API capabilities, available authorized UI sessions, tool failures and missing human
  authentication. A broken browser tool does not establish that app creation requires the owner.
- Preserve granted session scope. Ask only for a missing consequential decision or demonstrated human
  dependency, and verify the created record's identity before saving its Apple ID or retrying Create.

## A creation warning can report partial success

**Source:** Verified Importron record creation (2026-10-22).

- Read the full provider message: “created” plus failed access settings is not a failed Create.
- Resolve the resource by its intended bundle ID before retrying, even if the navigation button fails.
- Preserve the intended access. Record creation and permission correctness need separate evidence;
  all-user access may match one run and be an unresolved mismatch in another.

## Distinct review resources need explicit identities

**Source:** Importron first-subscription review preparation (2026-10-22).

- A valid subscription review item has no appStoreVersion relationship. Check its resource kind,
  configured version ID and API parent ownership instead of treating a null app version as foreign.
- Preserve the conflict guard: supporting another resource kind does not authorize arbitrary items
  already present in a draft. Verify the full set, reject duplicates, and read mutations back.


## IAP products and review versions have separate ownership

**Source:** Importron monetization change (2026-10-22).

- A consumable's StoreKit product ID is not its review-version ID. Require the intended review version
  explicitly and bind it through the app-owned product before accepting or attaching a review item.
- Carry all selected purchase kinds through replacement and final guards; adding support must not
  silently accept arbitrary IAP items or disturb apps with no selected purchase review.


## Optional contact config is not a request to erase Apple's saved contact

**Source:** Importron notes-only App Review update (2026-10-22).

- Build a complete wanted contact from explicit overrides and the current same-app/version record
  before PATCH/readback. Undefined config values omitted from JSON cannot be compared as deletions.
- Preserve omitted required/demo fields and never borrow unrelated contacts. A changed person needs
  an explicit phone; every contact field must remain hidden in readback errors.

## Store API access is independent of Xcode signing authority

**Source:** Füd release continuation (2026-10-23).

- Validate the inputs used by the requested operation. A deliberately unverified signing team must
  prevent signing, but must not prevent a store API read that could resolve account state.
- Preserve the strict archive boundary explicitly when shared setup becomes less restrictive; test
  the real command path with synthetic credentials and zero live account access.
# 2026-10-23 — Verify per-app account scope and supported browser handoffs

An inert installed-web-app menu is evidence about that interaction route. Inspect its supported browser
handoff before declaring a missing owner sign-in. Read back the browser profile and legal entity after
handoff, and keep API, UI and signing authority distinct. Shared release guidance must not turn a
historical personal team into a default for every app.

# 2026-10-23 — Inventory errors do not establish desktop state

The owner disputed a Mac-lock report. Direct supported Chrome binding immediately worked and allowed
Atlas role verification and successful resume of the existing free cluster. Try that narrow binding
before handing back an unlock action; report tool behavior without claiming the owner's desktop state.
The normal provider code-entry form also recovered an inert prefilled CLI authorization flow. Preserve
the next real security challenge separately; never bypass a connector's withheld authentication code.

# 2026-10-23 — Isolate simulator storage recovery

A repeated sample-content copy permission failure did not require changing shared SSD ownership or
abandoning local native QA. A disposable SSD-backed APFS image with image-only ownership enabled
recovered device creation, boot and app installation. A returned launch PID preceded an app crash and
did not prove healthy startup. Inspect continued execution and crash diagnostics; verify actual UI
separately. Treat storage recovery as an optional observed workaround: verify empty
private QA paths and backing identity, reuse the exact owned device, preserve other jobs, and keep actual
UI/capture verification separate. Current local disk-image help governs syntax across macOS versions.

## 2026-10-25 — Check privacy CLI authentication independently

A public API gap does not establish browser-only operation. Fastlane documents an App Privacy action
using an authorized Apple ID owner/admin session, while the App Store Connect key is unsupported.
Prepare evidence-backed JSON and inspect session availability separately. Its action replaces usage
rows, and a reported published flag is weaker than readback of the intended published answers.

## 2026-10-24 — Verify internal TestFlight readiness on every group path

Automatic group access caused the release helper to return before checking a processed build's beta
state. Read back exact group membership and internal readiness even when no add is necessary. Group
member history does not identify the build installed. Keep optional/future creative separate from
current store requirements, and check existing method authorization before asking the owner again.
# Native QA failure attribution (2026-10-25)

- A UI tool's lock diagnostic does not establish the owner's desktop state.
  Report the route's observed failure and use other already authorized tools.
- A copied, ad-hoc-signed Apple launcher can pass strict signature verification
  and still lose the identity/entitlements required by dtarbiter. Correlate the
  rejected client PID and verify Apple's code requirement before blaming services.
- If XCTest cannot discover the designated SSD set, an isolated simulator-only
  StoreKitTest host can exercise unchanged production purchase methods through
  supported simctl. Missing developer XCTest frameworks require child runtime
  search paths, not re-signing Apple tools or asking the owner to redo QA.
- Preserve exact-build physical feedback already received. Scope local StoreKit
  evidence honestly and inspect a clean baseline capture before uploading it.

# Image-only review must inspect held items (2026-10-25)

- Apple reviews all items held by one submission together. A command authorized
  only for image review must verify an existing draft contains only its intended
  images before writing or submitting, then verify the complete final set.
- A successful attachment is not proof that the draft has no unrelated version,
  subscription or IAP item. Refuse ambiguity and read back unknown outcomes.
# Log-and-fix must be checked before run completion (2026-10-25)

- A generated ledger that matches JSON is not proof that issues encountered during
  execution were fixed. Keep view integrity, structural validation and verified
  issue closure as separate checks.
- Log unexpected failures promptly, preserve their recovery history, reconcile
  the log with actual command/test/provider results, and close only with observed
  verification. A TODO or a proposed fix does not complete the run.
- External dependencies remain open with precise next steps; report partial
  progress instead of treating an evidence-free exclusion as successful recovery.

# Preserve session continuity after reported sign-in (2026-10-26)

- Retain the last working app/PWA, profile and tab across release turns. A later
  failing inventory cannot erase direct-route success; a newly opened login tab
  can have a different authentication context.
- Separate UI-control errors, Apple sign-in/challenges, team selection and vault
  lock state. A connector error or locked vault is not proof of Apple sign-out or
  a locked desktop. Reinspect the same surface after an owner reports sign-in;
  diagnose an unchanged connector failure instead of repeating the request.
- Ordinary authorized UI navigation is distinct from a demonstrated human
  security challenge. Keep CLI password-fallback protections and tool boundaries.
- Retry a privacy-blocked submission after observed publication changes, not
  merely because another continuation started. Local skill checks do not verify
  a repaired live session or published store answers.
