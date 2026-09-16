# Web, native builds and verification

## Inventory before spending time on setup

Read the app's build profiles and deployment files, installed tools, current git
state and existing artifacts. Separate the backend/web host from the mobile
bundle. A mobile wrapper that still depends on a localhost API is not ready.
Check release identifiers, API origin, policies/support URLs, app versions,
platform permissions, native targets and current developer team.

Reuse installed SDKs, functioning sessions and completed builds. Do not upgrade
Xcode or download another emulator simply because a cloud build is available.
Check the installed tools against the project's SDK support requirements and use
cloud builders if the local toolchain is incompatible. For Expo, useful starting
checks are the project's TypeScript/test scripts, Expo Doctor, production web
export, and native export/prebuild where applicable. Run the repository's required
checks rather than imposing a fixed test suite on every app.

For credentials: discover available approved secret-manager capabilities first;
look up the intended item's metadata, inject only needed fields into the intended
CLI/API process, and never print the token/private key. Use local private config
outside tracked files. A vault item titled “API token” may contain a private key
plus issuer/key IDs; validate the credential type instead of passing its label as
a bearer token. Never expose secrets through `EXPO_PUBLIC_*`, command traces,
process output, frontend builds, or signed-artifact URLs in public ledgers.

## Web release

- Preserve the deployed web app and any intentionally web-only administration.
  Do not move hosts, break routes or expose admin solely to ship mobile.
- Verify backend response schema, production origin, policy/support routes,
  server errors and logs, and any shared client/export changes.
- Follow repository branch/PR/CI rules. If preview builds are intentionally
  skipped, record that and verify production after merge; a canceled preview is
  not a failed app build or successful production deployment.
- Confirm the deployment corresponds to the intended commit, then check public
  routes and the real user journey. HTTP 200 alone is insufficient for behavior.
- Record rollback target and release policy for production changes. Do not add a
  recurring monitor unless requested.

## Expo native packages

Common EAS profiles (names must be read from the project, not assumed):

| Artifact | Intended use | Does not prove |
|---|---|---|
| Development client / Expo Go | Iteration and limited native UI checks | Store package, custom widget, production config |
| iOS simulator release | Bundled native iOS UI and simulator screenshots | Physical iPhone signing/device behavior |
| Android preview APK | Emulator or device installation and captures | Play eligibility/review |
| Production IPA / AAB | Store upload | Processing, review acceptance or public release |

Use the available current EAS CLI's help before relying on flags. Typical commands
are `eas build --platform ios --profile production`, `eas build:view BUILD_ID`,
`eas submit --platform ios --id BUILD_ID`. Pin the chosen build ID for submission;
`--latest` can select the wrong platform/profile after concurrent builds.

Before starting another build, inspect existing IDs/status and whether source or
configuration changed. Record the version number/code, source commit, dirty-tree
state, EAS profile, target platform and build ID. An EAS archive can contain
uncommitted work while its commit metadata names an older HEAD. Do not describe
that HEAD alone as exact source provenance. Keep the reviewed diff/PR as evidence.

Validate downloads with HTTP success and archive integrity before installing or
uploading. An interrupted `.apk` download can exist but be truncated. Keep large
SDKs, emulator files, IPA/AAB/APK archives and signing material outside tracked
source; preserve public build references and checksums if useful.

### Stalled Apple submission fallback

1. Read EAS submission state and App Store Connect builds first. A long queue is
   not evidence of a failed upload. Avoid concurrent uploads of the same build.
2. If no upload has happened and the queue remains stalled, use an available
   official Apple uploader (Transporter or compatible installed `altool`). Check
   `xcrun altool --help` and Apple's current documentation for supported arguments.
3. For the observed `altool` path: supply key ID and issuer ID, and expose the
   matching `AuthKey_<KEY_ID>.p8` through its documented private-key search path.
   Validate the intended IPA first. Cancel the redundant queued EAS submission
   and verify cancellation before direct upload.
4. Confirm upload receipt, then wait for Apple processing. Query the correct app's
   builds until the chosen version is VALID/eligible. Select it on the app version.
   Keep delivery ID and superseded submission ID in the ledger.
5. On timeout/ambiguous result, read provider state before retrying. Authentication,
   transport/upload, processing, selection and review are different failures.

[Expo submission](https://docs.expo.dev/deploy/submit-to-app-stores/),
[Apple upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/).

## Native checks and truthful captures

Use supported native UI tools to interact with simulators/devices and capture
screens. If those tools prohibit shell-driven UI, do not substitute `adb input`,
screencap or AppleScript. CLI build/install/log inspection remains distinct from
UI control and must follow the active tool policy.

Verify the release-profile app's launch, online data, error/retry state, navigation,
sharing, light/dark rendering, saved/offline data and recovery, large text and
accessibility relevant to the app. Capture the actual platform with its build ID,
OS/runtime/device, dimensions and appearance. Do not claim an untested case passed.

For standalone Android Emulator captures, use the supported UI screenshot
control. In the September 16 macOS run, CUA `pressKey` with `super+s` invoked
that control and saved a PNG to the configured Desktop location. Inspect the
installed emulator's **Help → Keyboard Shortcuts** and screenshot-save settings
rather than assuming this binding/location in another version or embedded mode.
Copy the resulting original PNG into the source-artifact directory, record its
native dimensions/build provenance, then compose listing art separately. This
uses an emulator UI action, not shell-driven screen capture.
[Android screenshot controls](https://developer.android.com/studio/run/emulator-take-screenshots),
[shortcut/settings help](https://developer.android.com/studio/run/emulator-extended-controls).

Widgets need custom native builds. Check adding the widget, supported sizes,
preferences, refresh and offline timestamps independently from the foreground
app. OS-managed refresh means a widget may lag the app; copy must not promise
real time without evidence. An actual iOS Home Screen widget capture is evidence
for that simulator/widget, not for Android widgets or physical devices.

### Diagnose the failing layer

| Observation | Next useful check |
|---|---|
| Emulator crashes before Android/app launch | Emulator crash product, SDK library/Qt resource paths, CPU/image compatibility |
| APK installed but gradients/icons absent | Native image decoder logs and the installed library's actual data-URI handling |
| App launches in Expo Go but fails in custom release | Native-only modules, web-only head/router code, target configuration and release logs |
| Android widget build cannot resolve ListenableFuture | Native compile classpath/plugin dependency; in the observed app explicit Android Guava fixed it |
| Widget missing or stale | Extension/receiver packaging, widget host setup and OS refresh; distinguish “no widget” from delayed data |
| Widget flickers or resize handles disappear | Native widget/launcher logs, worker scheduling, receiver/component changes and repeated onUpdate; check for an app-driven update loop before blaming UI controls |
| UI tool says the Mac is locked | Ask the owner to unlock; continue non-UI work without bypassing the lock |

In Newsworthy's Expo SDK 57 build, Android expo-image's data fetcher decoded SVG
payloads as base64; percent-encoded SVG URLs caused `IllegalArgumentException:
bad base-64`. Encoding the app's ASCII-generated SVG to base64 with an explicit
`base64-js` dependency fixed the source path and produced replacement builds.
A React Native `btoa` global was not assumed to exist. This is a version-specific
finding: inspect the installed decoder before applying it to a different app.
The initial snapshot recorded final visual verification as pending. A later
September 16 milestone verified version 6 light/dark gradient and share rendering
on an API 35 ARM64 emulator, plus sharing/offline recovery. The earlier snapshot
remains unchanged; widget, large-text and physical-device checks remain separate.

The macOS crash in that run belonged to Android Emulator startup. Official SDK
library/resource paths were repaired and the emulator booted. The local app
wrapper used for native-tool discovery was an environment workaround, not a
runtime dependency or code to distribute. Prefer normal registered SDK tooling
on future machines; do not repeat the workaround without the same evidence.

### Widget resize interruptions and update loops

When a user reports flicker or a refused size, inspect native logs and scheduling
before attributing the failure to control tooling, the launcher or user input.
Correlate resize interruption with worker completion, receiver/component changes,
package-change broadcasts and widget callbacks. Source dimensions establish what
the app declares; only stable native interaction verifies actual resizing.

In the September 16 Newsworthy run, logs showed a repeating chain: a one-time
WorkManager job completed, `RescheduleReceiver` was disabled, `PACKAGE_CHANGED`
recreated the widget, and `onUpdate` enqueued another worker roughly every second.
That app loop disrupted resizing. The proposed source fix used unique persistent
periodic work with `KEEP`, canceled the legacy work, and retained saved status.
This is a diagnosed app-specific pattern, not a universal scheduling recipe.

After a fix, verify that the replacement native build stops the loop, keeps resize
interaction stable, renders the supported sizes and preserves saved/offline state
and consistent readings. A merged fix, passing source test or uploaded build does
not close the native verification gate. Record diagnosis, fix and native outcome
as separate evidence; consult the app ledger for the current result.

### Verify independent widget behaviors

- After stopping an update loop, verify an initial refresh succeeds and the next
  constrained job remains scheduled. A quiet observation window alone could
  hide disabled refresh; a pending job does not prove its later execution.
- Switch the system theme without fetching new data. Previously resolved text
  spans may retain old colors even when XML theme resources update correctly.
- Compare the installed provider dimensions with the existing launcher item's
  minimum span. Treat cached sizing as a hypothesis; verify a freshly added
  widget's compact and expanded behavior before claiming resize support works.

### Enforce design consistency across surfaces

Build success and generated design tokens do not prove each surface uses them.
Check actual consumers against the agreed design contract: semantic text sizes,
baseline alignment, theme resource usage, palette and gradients. Where useful,
parse native layout declarations and exercise production component props across
relevant states. Source guards should fail on unsupported or missing structures
rather than silently skipping validation.

Prove these checks detect the known failures by deliberately reintroducing
regressions or exercising actual pre-fix artifacts. Do not update expected values
or capture baselines merely to make a failure pass; reconcile the result with the
intended design and make any baseline change explicit.

Label evidence precisely: parsed XML, source guards and rendered-prop assertions
do not execute Yoga, WidgetKit or RemoteViews. Keep a separate actual native
capture matrix for supported surfaces, sizes, themes and relevant states, with
build provenance. A passed contract or one approved capture cannot close the
remaining native matrix.
