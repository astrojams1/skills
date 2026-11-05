# Store media: listing assets, captures and recordings

## Produce a reviewable store package

Keep everything the stores show in the app repository, beside the release ledger:

- The **store data** file the configuration names (`storeData`, see [config](config.md)): listing copy for
  both stores, age-rating answers, review notes, pricing, screenshot groups (or a pointer to an asset
  manifest), Play graphics and Game Center leaderboards. Private review contact details and demo
  credentials stay out of it.
- `source/`: real native captures and editable composition sources.
- `assets/`: upload-ready images and, when render scripts produce them, a manifest of platform, display
  type, dimensions, source capture and build/OS provenance.

Read product positioning and implementation before writing copy. Verify each
feature and release claim. Keep the user's monetization model; one project's
$1 one-time purchase or no-ads stance is not a default for every future app.
Local prices belong in store configuration, not promotional screenshot text.

Create a coherent visual system based on the app's real brand. For screenshots,
use native captures inside editable artboards or another appropriate design workflow;
for app previews, use real app footage. Creative assets follow the separate guidance
below. Preserve actual UI, readings and features; don't synthesize evidence. Artwork
may frame and resize captures, but it must not advertise unavailable functionality. Design and
inspect a contact sheet and representative full-size images for clipping, contrast,
readability and platform correctness. Use the active image tools/skills when
raster generation/editing is warranted; simple vector brand compositions may be
repo-native code.

Verify current screenshot requirements from each store. In the Newsworthy run,
Apple accepted 1320×2868 iPhone screenshots under `APP_IPHONE_67` and 2064×2752 iPad
screenshots under `APP_IPAD_PRO_3GEN_129`. Display-type enum names are not always
literal marketing-size names. Google feature art was 1024×500 and icon 512×512;
portrait phone artwork was planned at 1080×1920 using genuine Android captures.
Those are examples, not a promise every device/form factor is covered. Validate
pixel sizes, aspect ratios, alpha, file type and metadata length before upload.

## Plan native and widget captures

Before capturing a gallery, record the intended screens, supported widget size
variants, platform/device, build provenance, and the user's visual preferences in
the app's release brief. Check those choices against the current implementation;
a removed screen or unsupported size must not survive in the gallery plan.

For Home Screen/widget shots, prepare an uncluttered composition and a background
that preserves contrast with the app. Apply the user's choices about wallpaper,
unrelated icons and gallery content to that app; do not turn them into universal
product design rules. Stage the actual native environment before capture. Keep
original captures alongside final artwork, with enough provenance to distinguish
real rendering from decorative framing or a design mockup.

Verify each size variant on its native platform. Declared iOS widget families and
Android launcher resize behavior are different evidence: one medium iOS capture
does not verify a small family, another platform, or Android resizing. Record source
support and observed rendering separately. If a locked host or unavailable device
blocks a capture, leave that shot pending and resume from the saved brief; do not
synthesize a native screenshot, imply it was tested, or reuse stale UI silently.

If native wallpaper/settings controls are unavailable, an editable neutral
artboard can frame a viewport cropped from a genuine widget capture, provided it
retains the actual rendered surface and does not imply a full Home Screen capture
or a wallpaper change. Preserve the original screenshot, record the crop and
composition provenance, and inspect the result for clipped content. Decorative
framing cannot establish native layout, resize behavior or additional size support.

## Review recordings and cloud-file availability

Preserve the original physical recording. If preparing a shorter review copy,
trim only initial idle time and optionally remove audio; retain the continuous
demonstration and record the transformation. Inspect the resulting sequence and
report only actions actually visible. A launch/reading/widget demonstration does
not establish unshown navigation, accessibility, offline or other device checks.

A cloud file's listed size does not prove its bytes are downloaded. In the seed
run, an apparently 201 MB local iCloud file was a dataless placeholder with zero
allocated blocks; media loading timed out with POSIX 60. Metadata showed uploaded
and download-requested but not downloaded. Inspect download metadata before
blaming the owner's upload. Use an available supported download path, then verify
locally readable bytes, media structure/duration and hashes before upload. Keep
personal filenames, cloud URLs and access tokens out of public evidence records.

## Store artwork with native provenance

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

## Product page header, search results and iPhone Duo

App Store Connect's "New Ways to Market Apps" (2026) adds creative assets beyond screenshots.
Check current requirements and the app's marketing plan before adding them; availability of a slot does
not make it a submission requirement. Recheck existing placements against every updated build.

| Asset | Image | Video | Limit |
|---|---|---|---|
| Product page header | 3840x1646 PNG (21:9) | 3840x1646 MP4, 10-30 s, 30 or 60 fps | 1 |
| Search-results creative | 3:2 JPEG or PNG, 1920x1280 to 3840x2560 | 3:2 MP4, 5-30 s | 1 |
| Universal (either of the above, shown cropped: see below) | 5244x2950 PNG (16:9) | - | - |
| iPhone Duo screenshots | 1398x2034 (outer) or 2007x2853 (inner), JPEG or PNG | - | 10 for the Duo profile, both displays together |

Read the live limits from `GET /v1/appAssetLibraryRefData` (image and video specs, profile groups, per-placement
counts) before making assets; the numbers above are 2026-10-20 readings. Without a search-results creative, the
store falls back to In-App Events, previews and screenshots. Apple's guidance: one clear idea, designed for a
first-time visitor, key art inside the template safe area, a short phrase at most, no text that restates the UI.

**A universal image is never shown whole.** Apple serves it through a crop that keeps one band of the canvas at
every aspect ratio: y 415-1865 of 2950, centred across (measured 2026-11-05 from Füd's live header; App Store
Connect's Preview agrees). That leaves about 3380x1450 px at 21:9 and only **2175x1450 px on a 3:2 search card**, so a
centred crop of the full canvas is the wrong calculation. Art laid out for the header loses its edges in search: Füd's
headline lost its first and last letters on iPhone, iPad and iPhone Duo. Make search its own 3:2 file, which Apple
serves whole (plain `sr` crop), unless all key art fits that band. "Use header asset in search results" on the version
page shares the header with search, crop included.

As checked on 2026-10-24, Apple's [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
make Duo screenshots required starting April 2027 for apps using the iOS27.1 SDK or later. Before that
condition applies, they are optional unless requested for the app. Verify the current date, SDK and
provider requirements instead of turning future or optional creative into an owner dependency.

- **Choose artwork for its category.** Duo and other `APP_SCREENSHOTS_AND_PREVIEWS`
  screenshots depict the real app; app preview footage retains the native-capture
  requirements below. Headers and search art in `CREATIVE_ASSETS` may instead use
  supporting photography, illustration or brand art related to the app's actual
  purpose. Apple's [asset best practices](https://developer.apple.com/app-store/asset-best-practices/)
  explicitly distinguish creative assets from screenshots and previews. When the
  owner's direction calls for AI model lifestyle art, use it within that scope;
  it is optional artwork, not proof of a customer, native test or endorsement.
  Keep original UI references/captures and generation/composition sources, and
  preserve real UI if shown. Never invent screens, customer quotes, reviews or
  claimed results. Do not add a lifestyle requirement or another approval gate.
- **Respect Apple hardware and branding.** Follow the current
  [marketing guidelines](https://developer.apple.com/app-store/marketing/guidelines/):
  use authorized Apple product imagery unchanged or authentic photography;
  don't generate, redraw or simulate an Apple device. Generic device illustrations
  must omit Apple-specific details. Keep app screen content accurate, avoid a
  standalone Apple logo, fabricated Apple recognition or implied Apple endorsement.
- **Look at Apple's crops before review.** After `assets upload`, `asc.mjs assets crops DIR` saves Apple's own render
  of each creative for each slot it can fill. Look at every image, then set `cropChecked` on its store data entry to
  the file's 12-character hash (after the `@` in its reference name). `assets submit` and `assets place` refuse a
  creative without it, and a changed file needs a fresh look. App Store Connect's Preview (version page, "Header and
  Search Results", Preview; the App Store menu switches to Search Results Page and the device button to iPad and iPhone
  Duo) only shows what a slot holds, and Browse Assets lists only approved images, so on an approved version it can
  run only after `place`: run it then on all three devices, both pages, and record what it showed. Try every browser
  before calling it blocked: the owner's Chrome holds an App Store Connect sign-in the built-in browser lacks (it
  stays on the team it is signed in to, so another team's app errors there). An unchecked crop is unfinished work,
  never a caveat to report.
- **List them** in the store data's `assetLibrary`, then `asc.mjs assets upload` under the established upload authorization
  and `asc.mjs assets place` on the version's localization. `asc.mjs assets` lists every library image, its state
  and placements. Each upload is named `<file>@<sha256 prefix>`, so reruns keep Apple's copy and a changed file
  uploads as a new image. On a version Apple has already approved, a placement takes only approved images (409
  "The asset must be in the APPROVED state because the parent is already approved", 2026-10-23), so send them
  first with `asc.mjs assets submit --confirm` (their own review submission), then `place` once they read
  `APPROVED`. Screenshot and app preview placements (Duo profile included) are refused on an approved version
  (409 "Creating a placement is not permitted in AppStoreVersion's current state", `PENDING_DEVELOPER_RELEASE`,
  2026-11-02) and ride only on an editable version; header and search-results creative can still be placed on it,
  so `place` skips the locked slots there and says so. `place` takes only processed images, puts screenshots in store-data order, and stops when
  a slot holds an image store data no longer lists (with `ios.pruneScreenshots` it removes that placement instead). Images go to App Review with the version they are placed on; the version page also lets
  the owner pick an approved header while the version waits for release.
- Image-only submission checks every held item in an existing draft before any
  attachment. A draft containing an app version, IAP, unknown resource or duplicate
  image is a conflict, not permission to submit it. Reuse only the intended image
  subset, verify additions and the final exact image set, then verify submitted
  state. Preserve mixed/rejected drafts and uncertain writes for readback; use a
  supported combined-review route when that broader scope is intended.
  [Apple asset review](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-assets-from-asset-library).
- Before opening a draft, image-only submission reads all iOS version pages and
  requires an approved version. `PENDING_DEVELOPER_RELEASE` qualifies; initial
  `WAITING_FOR_REVIEW`, `IN_REVIEW` and partly accepted submissions do not. With
  no approved version, assets must accompany the first app version. Preserve an
  active first-version submission; do not withdraw it merely to add optional art.
  The helper also refuses a partial batch while any selected new image is missing,
  processing, failed, rejected or unknown. Already approved/in-review images are
  retained without resubmitting them. Read each asset's state before retrying.
- Item readback explicitly includes `appAssetLibraryImage` as well as requesting
  its sparse relationship field. A field alone did not return the live image
  linkage (2026-11-02). Missing/ambiguous linkage remains a conflict; never decode
  an item ID to infer ownership or bypass the guard.
- The regular screenshot display types (`asc.mjs screenshots`) also appear in the Asset Library; `assets` is for
  placements that have no screenshot display type.

## App preview video

Every app with something to show in motion gets an app preview: it plays first on the product page, autoplays
muted, and shows in search results. Make one per device family the screenshots cover (iPhone, and iPad when the app
runs there), up to three per profile. As read on 2026-11-01 from
[Apple's preview specification](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications)
and `GET /v1/appAssetLibraryRefData` (read it again before relying on these):

| Profile (`placementGroup`) | Portrait / landscape |
|---|---|
| iPhone Dynamic Island and Face ID, large and medium; iPhone Duo | 886x1920 / 1920x886 |
| iPhone with Home button, 5.5" and 4" | 1080x1920 / 1920x1080 |
| iPhone with Home button, 4.7" | 750x1334 / 1334x750 |
| iPad 13", 11", 10.5" (and 12.9" also 900x1200) | 1200x1600 / 1600x1200 |
| iPad 9.7" | 900x1200 / 1200x900 |
| Mac, Apple TV / Vision Pro | 1920x1080 / 3840x2160, landscape only |

15 to 30 seconds, 23 to 30 fps, H.264 (10 to 12 Mbps target) or ProRes 422 HQ, `.mov`, `.mp4` or `.m4v`, at most
500 MB, with a stereo audio track (`audioRequired` in the reference data: a silent AAC track satisfies it; without one
the upload fails processing rather than being refused). Place the preview on the same profile as the screenshots and
keep its aspect ratio: a preview whose ratio differs from the screenshots moves to "A Closer Look" instead of
playing first.

**Content** ([Apple's guidance](https://developer.apple.com/app-store/app-previews/), Guideline 2.3.4): footage captured
from the app itself at its native resolution (no zooming in), no people or hands, plain dissolves and fades that do
not imply features the app lacks, short legible captions because it plays muted, no prices and nothing seasonal,
fictional data, and a disclosure of any sign-in, purchase or subscription the app needs, in the footage or the end
frame. A caption band above a framed recording, like the screenshot artboards, keeps captions off the UI.

**Make it** from a Release-configuration simulator build of the exact version going to review, against seeded
synthetic data:

If the Simulator GUI is absent or its UI controller is unavailable, use the original Xcode XCTest launcher
and public XCUIAutomation APIs to record the same Release app. For a document app,
`XCUIApplication.open(URL)` can exercise its real document-open handler without a Debug launch hook.
Stage only invented documents, resolve the target's current container **after** XCTest installs/launches it
(reinstallation can change the UUID), and preserve source/OS/configuration and the selected document's hash.
Keep fixture-staging communication in the test runner; do not add a server, parsed-result injection or
verification shortcut to the distributed app. A Debug-only setup may reset isolated synthetic allowance/history
before installing the Release capture build; record that setup, retain existing Health records, and still
exercise actual purchases, saves and readback. Persistent local StoreKit transaction IDs may otherwise collide
with earlier tests. Wait for asynchronous system consent and choose enabled, hittable controls when a sheet
exposes duplicate labels. A stalled/failed capture is rehearsal evidence, not a completed app preview.

1. Rehearse the whole tour first, so one-time prompts (consent, permissions) and slow first loads are out of the
   way, and pick inputs whose results read well on screen. Reset the data, then record one continuous take with
   `xcrun simctl io <device> recordVideo --codec=h264` (status bar overridden to 9:41, full battery not charging).
   Drive it with the simulator tool's taps, typing and `touch_path` drags; leave a second of stillness after each step.
2. Simulator recordings only write frames when the screen changes; list those bursts (sample timestamps) or draw
   `swift $S/app-preview.swift sheet <take.mov> <out.png> <frames> <from> <to>` to find each moment's time.
3. Write a render spec (see the script's header: size, fps, background, font, caption style, device frame, clips
   with `from`/`to`/`speed`, timed captions and a closing `note` for the disclosure) beside the store data, and run
   `swift $S/app-preview.swift render <spec.json>`. Keep real waiting time real; cut idle stretches, never speed up
   the app's own processing.
4. `swift $S/app-preview.swift check <preview.mov> <legacy preview type such as IPHONE_61>` must report no problems;
   then look at a `sheet` of the whole cut and full-size `frame`s, and choose the poster frame (Apple's default is
   5 s, which may land on a keyboard or a transition).
5. Add it to store data's `assetLibrary` (`APP_PREVIEW`, its profile, `previewFrame`), keep the video and raw take in
   the app's project home rather than Git, record their SHA-256, `asc.mjs assets upload`, wait for `assets` to show it
   processed, then `assets place` on the version before `submit --confirm`. It goes to App Review with the version.

## Every update

Before any update of any app goes to review, on both stores:

1. Read what each store holds now (`asc.mjs status`, `play.mjs status`) and compare it with the store data.
2. Open each screenshot, the preview and Play's graphics beside the build being submitted. Recapture any that
   show a screen, control, text or feature the build no longer has, or miss one a player would expect to see.
3. Recheck existing app previews, product page headers, search-results creative and Duo images. A preview that
   shows a changed screen is re-recorded, not trimmed around. Supply missing assets when currently required or
   included in the app's agreed plan; optional slots alone are not release blockers.
4. Reread the name, subtitle, promotional text, description, keywords and Play's short and full descriptions
   against the build; correct anything it no longer does and add what it newly does.
5. Write the release notes (`listing.whatsNew`) for the app's audience: new features and what feels faster or
   smoother, never how. Follow the app's wording-approval requirements; otherwise use existing authorization
   for routine listing edits. Keep the saved wording reviewable and never invent an exact-text approval.
6. Record the recheck, what changed and the actual authorization basis before `submit --confirm` or a Play release.

For the shared marketing plan, record each preview/creative's actual state: missing, prepared, uploaded,
processed, placed, in review, approved or live. A focused bug fix or information-response run does not by itself
waive the preview and promotion checklist. An owner-declined item or demonstrated capture dependency needs its
own reason; do not dismiss the entire package as "optional/outside scope." If an initial version is already
waiting for review, prepare/upload missing assets and retain a concrete placement follow-up while its media
controls are locked. Preserve the accepted submission rather than withdrawing it merely for optional art.

## Uploading

`asc.mjs screenshots` uploads missing files, keeps finished identical ones, replaces unfinished uploads, and —
only when `ios.pruneScreenshots` is true — **removes** files and whole sets the store data no longer lists
(otherwise it reports them and leaves them), refuses to overwrite a finished file whose bytes changed (delete it in App Store
Connect first), and puts each set in the listed order. Run `asc.mjs status` until every screenshot reads
`COMPLETE`. `play.mjs images` replaces each listed Play image type in order and commits only when Play's
SHA-256 of every image matches the repository's. App previews upload through the Asset Library (`asc.mjs assets
upload`, then `assets place`); Apple deprecated `appPreviewSets` in API 4.5.1, so there is no other path.
