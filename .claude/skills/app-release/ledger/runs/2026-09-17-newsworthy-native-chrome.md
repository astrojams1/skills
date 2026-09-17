# Newsworthy — physical native chrome and TestFlight invitation

Recorded: **2026-09-17**. Skill version: **1.0.8**. Token/cost metrics: unknown.

This sanitized milestone records the release task's new evidence. Earlier
snapshots remain unchanged. The
[canonical app ledger](https://github.com/astrojams1/newsworthy/blob/main/store/ledger.json)
remains authoritative for subsequent builds, physical QA and review progress.
No account identifiers, tester addresses or device identifiers are copied here.

## Invitation resolved; physical launch confirmed

The owner was a member of the internal TestFlight group and its build showed
**Testing**, but the tester was `NOT_INVITED` and saw **No Builds Available**.
The public `POST /v1/betaTesterInvitations` returned **201**; group readback then
showed `INVITED`. The owner subsequently confirmed the app running physically.
The invitation was resolved at this milestone, not a remaining owner action.

The direct tester-build list stayed empty even after the invitation. That list
alone did not establish inability to install. The release work needed actual
invitation state and physical-launch evidence, not an assumed group **Resend** UI.

## Physical screenshot exposed a native header regression

The owner's physical TestFlight screenshot showed iOS 26+ glass capsules around
the brand and Share controls despite a transparent header. Earlier iOS 18.3
simulator captures and JavaScript rendered-prop checks had not established the
current physical OS appearance.

The installed Expo Router **57.0.21** legacy `headerLeft`/`headerRight` path omitted
`hidesSharedBackground`. Supported custom native items forwarded
`hidesSharedBackground: true` through react-native-screens to UIKit. The release
task implemented that source fix and mutation regressions in
[app PR #94](https://github.com/astrojams1/newsworthy/pull/94), reporting **196 tests**,
**24 design checks** and typecheck passing locally.

**Physical verification of the correction remained pending a replacement build.**
The successful physical launch and screenshot exposed the original appearance;
they did not prove the later source fix was installed or corrected on the device.
This milestone also does not establish a completed review recording or release.

## Reusable lesson

Track SDK/runtime/device coverage and explicitly inspect OS-generated chrome.
Verify a library's installed native forwarding path, protect it with regression
checks, and keep replacement-build physical verification separate. For TestFlight,
reconcile group membership, invitations and installation without assuming any
single API relationship or unavailable UI control explains access.
