# Lessons Learned

Capture patterns and corrections here after any mistake or user feedback. Review at session start.

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
