# Control-route diagnostics and Safari recovery — 2026-10-26

Data Center's release run reached a signed iOS artifact and an empty app lookup, then asked the owner
to create the app after repeated UI timeouts. The owner required the agent to diagnose that failure and
retain the correction in the shared release skill.

A 60-second invocation of the supported UI inventory returned after 30.0646 seconds with no native
apps, only an empty `mcpapps` provider, and the error `timed out waiting for initialize from codex
app-server`. The earlier 30-second invocation deadline had hidden that diagnostic. A managed native
service restart produced a new startup error; explicit in-app browser creation also reported unavailable.
Neither attempt established a working repair, an absent PWA, Apple sign-out, or a locked desktop.

After the owner opened the PWA, native control could read it. The cause of that recovery was not
established. The PWA displayed a different legal entity and another agent was using it, so the release
agent preserved its navigation and team selection. A separate Safari session worked through the same
supported UI tool. Ordinary saved-passkey selection completed sign-in without a manual challenge, and
the selected entity and app list were verified against the intended account. No AppleScript, cookie
copying or shared-PWA mutation was used.

Apple rejected the taken store name. The agent used **Data Center: AI Frontier** while preserving the
agreed bundle and SKU, then created the app. An independent API read confirmed exactly one record:

- Apple ID `6827325155`, bundle `com.astrojams.datacenter`, SKU `datacenter`, locale `en-US`.
- Name `Data Center: AI Frontier`; iOS version `1.0` in `PREPARE_FOR_SUBMISSION`.

The UI creation used Limited Access with the owner selected; that selection is not separate API proof
of permission settings. The app repository owns current release evidence. App creation and working UI
control do not establish a successful build upload, TestFlight availability or public release.

App-release **2.7.4** adds a bounded diagnostic retry when a wrapper hides the provider result, checks
returned-provider identity, and preserves a concurrently used store session while verifying an
independent browser route. It retains tool-specific authorization requirements for alternate UI
technology. The update integrates main's v2.7.3 API-boundary guidance from PR #109.

| Issue | Correction | Verification | State |
|---|---|---|---|
| `issue.control-route-guidance` | Distinguish wrapper deadline, provider initialization failure and unrelated browser fallback | Required checks and release-root diff review; later supported Safari interaction and exact API record readback | Done |
| `issue.concurrent-session-guidance` | Preserve the other agent's PWA and verify the independent browser's account/team | Safari sign-in and app creation; shared PWA left untouched | Done |
| `issue.main-integration` | Resolve simultaneous version/ledger edits without losing main's API-boundary guidance | Regenerated discovery and required checks after integration | Done |

Validation: 166 app-release tests, 65 management checks, 143 specification checks, identity, 8 image-fit
checks and skill validation pass. YouTube has 5 passes and 1 existing ffmpeg-unavailable skip. Twelve
consumer checkout configurations across seven apps normalize unchanged; no configuration migration
is required. No wording-matching regression test was added for this documentation-only correction.

Maintenance ledger and logs are at
`/Volumes/ssd/projects/skills/artifacts/datacenter-ui-recovery/`. Shared activity records use separate
invocation IDs for app-release and skill-creator. Token/dollar usage is unknown; no paid service was
added. The correction is published in [skills PR #108](https://github.com/astrojams1/skills/pull/108);
consumer adoption follows merge under each app's workflow.


## Verified TestFlight delivery

Independent Apple API readback at **2026-10-26T22:21:33.053Z** confirmed internal TestFlight
delivery for **Data Center: AI Frontier** (`6827325155`), personal team
`CWQ9AWJF8T`. The original signed artifact was reused:

- Version `0.1.0 (1)`, clean source `db355ef7cb88af39e0773d240cbd2d25e39b353d`.
- IPA SHA-256 `a63f20059de72f2ad31657988b61ffbd87542b94e298f81d7e273d733ab2390c`.
- Altool validation and upload exited `0`; upload `a852f234-0e77-43b3-9bd0-0c913513fb40` is
  `COMPLETE`, and the build is `VALID` / `IN_BETA_TESTING`.
- Internal **Release QA** group `711fbb17-01bc-4b7d-a4a4-f6e951799c92` contains the exact build;
  the owner's tester state is `INVITED`. This does not claim invitation acceptance or installation.

Supported CUA Safari created the record and internal group and selected the owner. The shared PWA
remained untouched; no AppleScript, external beta review or public release was used. The app's
`store/builds/testflight-delivery.json` is the delivery receipt, tracked with
[Data Center PR #1](https://github.com/astrojams1/datacenter/pull/1). This final evidence update changes
no guidance or runtime code. The shared skill PR remains draft and unmerged.
