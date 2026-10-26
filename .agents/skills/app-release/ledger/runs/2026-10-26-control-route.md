# Control-route diagnostics — 2026-10-26

Data Center's release run reached a signed iOS artifact and an empty app lookup, then asked the owner
to create the app after repeated UI timeouts. The owner required the agent to diagnose that failure and
retain the correction in the shared release skill.

A 60-second invocation of the supported UI inventory returned after 30.0646 seconds with no native
apps, only an empty `mcpapps` provider, and the error `timed out waiting for initialize from codex
app-server`. The earlier 30-second invocation deadline had hidden that underlying diagnostic. This
proved an initialization failure in the control route; it did not establish an absent PWA, Apple
sign-out, a locked desktop, or repaired UI access.

App-release **2.7.3** adds a bounded diagnostic retry when the wrapper hides the provider result,
returned-provider identity checks, and a requirement to verify the intended surface after recovery.
The guidance keeps unsupported app creation, native UI availability and Apple authentication separate.
No app identity, credentials, provider state or authentication configuration is changed by this patch.
A managed native-service restart in the release run produced a new startup error; explicit in-app
browser creation also reported unavailable. Neither attempt is documented as a working repair.
Alternate UI technology remains subject to the active tool's explicit authorization requirement.

| Issue | Correction | Verification | State |
|---|---|---|---|
| `issue.control-route-guidance` | Distinguish wrapper deadline, provider initialization failure and unrelated browser fallback | Required checks and release-root diff review pass; the root confirmed the underlying diagnostic and unresolved live outcome | Done for guidance; live UI recovery unverified |

Validation: 166 app-release tests, 65 management checks, 142 specification checks, identity, 8 image-fit
checks and skill validation pass. YouTube has 5 passes and 1 existing ffmpeg-unavailable skip. Twelve
consumer checkout configurations across seven apps normalize unchanged, so no configuration migration
is required. No wording-matching regression test was added for this documentation-only correction.

Maintenance ledger and logs are at
`/Volumes/ssd/projects/skills/artifacts/datacenter-ui-recovery/`. The Data Center app's own release
ledger remains authoritative for live control recovery, app creation and TestFlight. Shared activity
records use separate invocation IDs for app-release and skill-creator. Token/dollar usage is unknown;
no paid service was added.
