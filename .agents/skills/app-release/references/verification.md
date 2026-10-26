# Builds and native verification

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

## Native artifacts and what they prove

Store builds are made on the owner's Mac (see [ios](ios.md) and [android](android.md)); nothing builds in
EAS, whose free plan caps cloud builds at 15 per platform a month shared by every app on the account.

| Artifact | Intended use | Does not prove |
|---|---|---|
| Web build / Expo Go | JavaScript-only changes, at no cost | Signed native app, widgets, native modules, production config |
| Release simulator build (local Xcode) | Bundled native iOS UI and simulator screenshots | Physical iPhone signing/device behavior |
| Universal APK from the store bundle | Emulator installation and captures | Play eligibility/review, physical device |
| Store `.ipa` / `.aab` with `summary.json` | Upload; provenance (commit, dirty flag, toolchain, SHA-256) | Processing, review acceptance or public release |
| TestFlight / Play internal-testing install | The owner's physical-device check | Review or public availability |

Before building, read what App Store Connect and Play already hold and whether a finished artifact for the
same commit exists. Record build number or version code, source commit, dirty-tree state, toolchain and
SHA-256 for every artifact; the scripts write them to `summary.json` and refuse to upload a dirty or changed
one. Keep SDKs, archives and signing material outside tracked source.

### Recover an isolated SSD simulator set

Use the owner's designated SSD QA device set, with the same `simctl --set <qa-path>` on every device
command. Reuse its named device and exact UUID; inspect existing devices and active jobs before creating
anything. Never switch to, delete or reset another task's device or the default set to fix a local setup.

If device creation repeatedly fails with `EPERM` while copying sample content on an external volume,
inspect the failing path, free capacity, mount/ownership state and simulator logs. A volume mounted with
ownership disabled is relevant evidence, not proof of the cause. An optional recovery is a private,
disposable APFS sparse disk image **backed by that SSD**, with ownership enabled only on its own mounted
filesystem. This recovered device creation, boot and app installation in one observed run; the app
then crashed after the launch command returned a PID. Storage recovery does not establish healthy app
startup or graphics, and it does not guarantee recovery on another machine.

1. Check for an existing image/mount and the task's saved UUID first. Before creating a new image, verify
   the backing SSD is present, has capacity for actual growth, and no active job uses the proposed image,
   mount or QA path. Choose a bounded virtual size for the runtime/app; sparse allocation grows and is
   not reserved free space. Keep the image outside tracked source with private permissions.
2. Use the installed macOS disk-image command's local help/man page for creation and attachment.
   Current macOS points to `diskutil image create` / `diskutil image attach`; older supported releases
   may use `hdiutil`. Do not mechanically translate flags between them. The observed attach used
   `hdiutil attach <image> -owners on -nobrowse -noautoopen`; newer diskutil syntax must be checked
   locally. A direct mountpoint under the backing SSD was denied in that run; mounting the image under
   `/Volumes` worked while its backing file and growing device data remained on SSD.
3. Read back the mounted image's identity, backing file and ownership state (`diskutil info -plist`
   exposes `GlobalPermissionsEnabled`). Enable ownership only for this disposable image when needed;
   never change the shared SSD's ownership, TCC or permissions, or restart the shared CoreSimulator
   service. If the designated QA directory is confirmed empty, private to this task and unused, it may
   be replaced with a symlink to the mounted filesystem. Preserve its prior state for rollback. Never
   overwrite or hide a nonempty/shared set; stop this recovery route if safe isolation is not established.
4. Create/reuse the task's named device through the same QA path, record its UUID, then check boot,
   installation, launch request and continued app execution separately. A returned PID alone proves
   neither healthy startup nor a visible UI: inspect continued process state and crash diagnostics.
   Keep CLI build/install/log evidence distinct from actual native UI verification; captures and
   interactions must use the active supported UI tools and policy. Do not substitute `simctl`
   screenshot/input when that route is prohibited.

Save the image path, mount identity, QA symlink target, UUID/runtime, capacity and observed results in the
app ledger so another session can reattach and reuse them. Preserve the image for resumption. Before a
planned detach, shut down only the owned UUID through the same set and confirm no owned job uses it;
never eject an in-use image or shut down unrelated devices. Failure of this optional recovery leaves
other authorized build, backend and listing work available.

### Restore native QA state after every outcome

For simulator QA that changes an installed build, app data or device preferences,
persist a private run-owned recovery manifest on SSD. Before booting or changing
anything, record the exact QA set/device UUID, app identity, authorized account
context, unique run ID and original boot state. If the target starts Shutdown,
record that before booting; resolve booted-only container paths and capture app
state before replacing the build/data or changing preferences. Save full original
app-bundle and data backups/manifests, appearance, text size, orientation and
native window state before changing them. Capture the original window through
the supported UI route; record unknown/unavailable fields explicitly rather than
inferring them from a previous run. Bind paths and backups to the manifest. Use
platform-supported recovery for other native targets; simulator mechanics do not
authorize replacing personal physical-device data.

Keep target, device, account and run-ID guards on every mutation and restoration.
A failed identity guard prevents that stage from touching an uncertain target;
it does not justify skipping other independently safe cleanup. Operate only on
the owned app, companion process and device. Never reset shared simulator
services, other devices or accounts to recover this run.

Implement cleanup as independently guarded stages, each with its own attempt,
result, evidence and failure record. Use `finally` to enter cleanup, but do not
put the whole sequence under one guard: a failed assertion must not abort the
remaining stages. Respect boot-dependent operations and process quiescence:

1. Terminate the owned test app.
2. If the run replaced its build, restore the original bundle while booted and
   independently verify it before any optional launch of that build.
3. Attempt optional pose/window restoration while booted using the verified
   original build when a live app is required. Unknown window geometry needs a
   current original capture and an observed supported gesture, not a hard-coded
   list of accepted sizes. Record unresolved restoration and continue cleanup.
4. Independently terminate the owned app again, even if window restoration failed.
   Confirm it is stopped before final data restoration; if quiescence cannot be
   established, preserve backups and record the blocked restore instead of
   overwriting live data. Shutdown may establish quiescence in a later stage.
5. Stop the run-owned companion process.
6. Restore and read back saved appearance/text and other changed preferences
   while those APIs are available, guarding each restoration independently.
7. Restore the initial device state; when it was `Shutdown`, shut down only the
   exact owned UUID through the same QA set. Independently confirm its final state.
8. Restore final original data in the confirmed quiescent state, then independently
   verify both the full app bundle and data manifest. Check all original files
   and hashes, authentication/fixture state and any changed preferences, not a
   representative file or build label. Keep the app stopped after final data
   restoration so relaunch cannot rewrite restored data. A needed later launch
   requires another restore and verification.

`simctl get_app_container` can fail with code 149 after Shutdown. Use the paths
saved while booted, or resolve the exact app's owned container from offline
metadata under the recorded device/set with identity/path checks. Never guess a
container from the newest UUID/directory or switch to another device to finish.

Record every stage failure even when later stages succeed. Cleanup is verified
only by the final bundle/data/preference/process/device evidence; reaching
`finally` is not success. Distinguish an optional window-restore failure from
successful data restoration. A failed reinstall or other restoration remains an
open issue until that stage is recovered and verified; later cleanup success
cannot close it.
When changing a cleanup helper, inject an early optional-stage failure and prove
that later shutdown and data restoration still run. In the observed Füd run, an
optional geometry assertion aborted the original cleanup before data restoration;
independent stages recovered the original bundle, all 34 data files, preferences
and Shutdown state. This is a cleanup lesson, not a claim about another app's QA
or an additional owner-only check.

### Diagnose XCTest launcher identity

Before treating a test-runner connection failure as a simulator outage, run
`node $S/native-qa.mjs preflight`. To inspect a previously used launcher, add
`--launcher <path>`. The read-only guard verifies the Apple code requirement,
designated identity and service-control entitlements, separately from signature
integrity. It never executes the candidate launcher.

In the 2026-10-25 Nametag run, a copied, ad-hoc-signed `xcodebuild` discovered the
SSD devices but lost Apple's identity and entitlements. `dtarbiter` rejected that
client with `-67050` (code requirements not met). The original Apple tools passed
strict verification. A valid ad-hoc signature was therefore insufficient; the
earlier attribution to broken simulator services was wrong. Correlate the denied
PID and launcher with logs before choosing recovery.

Use the original selected Apple tools. Do not re-sign them, transplant private
entitlements, inject a device-set override, or reset shared services to repair a
launcher identity failure. Check installed Xcode help for supported destination
options: `simctl --set` support does not imply `xcodebuild` supports that custom
set. Preserve the designated SSD set and other tasks' devices.

### Isolated local StoreKit checks

When XCTest destination discovery cannot reach the designated QA set, purchase
controller checks can still run in a separately identified **simulator-only QA
host** launched with the supported `simctl --set` route. This route requires
authorization under the active tool policy; it does not grant UI control itself.
Compile the unchanged production purchase controller and shop with the app's real
`.storekit` configuration, plus Apple's `StoreKitTest` framework and a small test
entrypoint. Keep the host out of the shipping target and give it a distinct bundle
ID so production app data remains intact.

- Create `SKTestSession` from the bundled configuration. Reset defaults **before**
  setting `disableDialogs`, clear only this QA session's transactions, then run
  serialized checks through the actual production methods. Exercise verified
  purchase, restore into a fresh controller, refunds and `Transaction.updates`,
  Ask to Buy approval, cancellation and recoverable errors as relevant.
- A directly launched host may crash loading `@rpath/XCTest.framework/XCTest`.
  In the observed Xcode 27.1 / iOS 18.4 run, the selected platform's developer
  frameworks resolved it. Derive the platform with
  `xcrun --sdk iphonesimulator --show-sdk-platform-path`; pass its
  `Developer/Library/Frameworks` and `Developer/Library/PrivateFrameworks` as
  `SIMCTL_CHILD_DYLD_FRAMEWORK_PATH`, and `Developer/usr/lib` as
  `SIMCTL_CHILD_DYLD_LIBRARY_PATH`, only to the owned QA launch. Inspect the actual
  loader error and installed directories; do not change global runtime paths.
- Use a fresh run identifier, bounded result wait and explicit failed checks.
  Record source/config hashes, host binary digest, Xcode/runtime, exact UUID/set
  and cleanup. Preserve initial boot/status-bar state; terminate only the QA host.
- Transaction tests can leave a production alert visible after completion.
  For a review screenshot, save test results first, relaunch a clean load-only
  host, wait for products and native rendering, then capture through the
  authorized tool. Inspect the pixels before upload; never paint over the alert.

This proves local StoreKit/controller behavior. It does not establish live product
availability, TestFlight sandbox transactions, physical-device behavior or UI
button gestures. State those scopes separately. A local configuration's prices
must be compared with App Store Connect, not reported as provider-fetched prices.
Do not hand these agent-executable checks to the owner because one UI or XCTest
route failed, or repeat an already completed exact-build physical check.
[Apple SKTestSession](https://developer.apple.com/documentation/storekittest/sktestsession).

### When no Mac is available

An Android bundle can be built in Linux with the Android SDK (cloud containers' Maven downloads may be
rate-limited). iOS builds need macOS: the owner's Mac, or an authorized EAS macOS sandbox (`MEDIUM`; the
free plan's 60 CI/CD minutes a month are shared by every app). Prepare the whole setup script before
starting a sandbox, run one at a time, copy evidence out as text as you go, and stop it the moment you are
done. Never upgrade the Expo plan or switch accounts to get around a cap: say what is blocked and until when.

## Notification delivery checks

Verify the app's platform configuration and delivery credential separately from
its signing entitlement. For matched preview and production artifacts, record
source/configuration provenance and archive integrity; identify which artifact
actually ran. Keep credentials and tokens outside tracked evidence.

Exercise permission handling, the intended default threshold, enabling and
disabling registration, provider ticket/receipt results, visible presentation and
a cold-start notification tap. Aggregate registration counts can confirm server
effects without publishing device tokens. Restore test subscriptions to their
intended state. A provider receipt proves handoff, not visible presentation;
emulator success does not establish physical-device QA or store account readiness.

## Native checks and truthful captures

Use supported native UI tools to interact with simulators/devices and capture
screens. If those tools prohibit shell-driven UI, do not substitute `adb input`,
screencap or AppleScript. CLI build/install/log inspection remains distinct from
UI control and must follow the active tool policy.

A locked-screen response establishes that this UI route is unavailable at that moment, not that the
whole Mac, build toolchain or release is inaccessible. Check other supported authorized routes and
existing capture artifacts, then continue CLI builds, tests, logs, backend work, listing preparation and
artwork that remain possible. Show available design previews in the conversation; label a layout or
render as a preview, never as a real app screenshot or completed native QA. Record the exact unverified
interaction/capture and alternatives tried. Ask for an unlock only when that specific remaining check
requires it and no supported authorized route remains; do not bypass the lock or end independent work.

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
| Home gesture stalls with a SystemUI ANR | Identify the failing OS process and recover the emulator shell; do not label it an app crash without app-process evidence |
| APK installed but gradients/icons absent | Native image decoder logs and the installed library's actual data-URI handling |
| App launches in Expo Go but fails in custom release | Native-only modules, web-only head/router code, target configuration and release logs |
| Android widget build cannot resolve ListenableFuture | Native compile classpath/plugin dependency; in the observed app explicit Android Guava fixed it |
| Widget missing or stale | Extension/receiver packaging, widget host setup and OS refresh; distinguish “no widget” from delayed data |
| Widget flickers or resize handles disappear | Native widget/launcher logs, worker scheduling, receiver/component changes and repeated onUpdate; check for an app-driven update loop before blaming UI controls |
| UI tool says the Mac is locked | Diagnose this UI route only; try supported authorized alternatives, show available previews and continue independent work as above |

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

### Inspect OS-generated native chrome

Record the SDK/library version, OS runtime and simulator/physical device for each
visual check. Include system-generated navigation and toolbar backgrounds: a
transparent JS header and passing rendered-prop tests do not prove that native
controls render without additional chrome on a newer physical OS.

In Newsworthy's Expo Router **57.0.21**, a physical TestFlight screenshot exposed
iOS 26+ glass capsules absent from the earlier iOS 18.3 simulator evidence. The
legacy `headerLeft`/`headerRight` path omitted `hidesSharedBackground`; supported
custom native items forwarded `hidesSharedBackground: true` through
react-native-screens to UIKit.
Inspect the installed version's actual forwarding path before choosing a fix.
Source/mutation checks can protect that path, but verify the replacement build
on the affected physical OS before claiming the appearance is corrected.
