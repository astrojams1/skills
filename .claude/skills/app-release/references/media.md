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

Create a coherent visual system based on the app's real brand. Use native captures
inside editable vector artboards or another appropriate design workflow. Preserve
actual UI, readings and features; don't synthesize evidence. Artwork may frame and
resize captures, but it must not advertise unavailable functionality. Design and
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

App Store Connect's "New Ways to Market Apps" (2026) adds creative assets beyond screenshots. Use them on every app:

| Asset | Image | Video | Limit |
|---|---|---|---|
| Product page header | 3840x1646 PNG (21:9) | 3840x1646 MP4, 10-30 s, 30 or 60 fps | 1 |
| Search-results creative | 3:2 JPEG or PNG, 1920x1280 to 3840x2560 | 3:2 MP4, 5-30 s | 1 |
| Universal (either of the above) | 5244x2950 PNG (16:9) | - | - |
| iPhone Duo screenshots | 1398x2034 (outer) or 2007x2853 (inner), JPEG or PNG | - | 10 for the Duo profile, both displays together |

Read the live limits from `GET /v1/appAssetLibraryRefData` (image and video specs, profile groups, per-placement
counts) before making assets; the numbers above are 2026-10-20 readings. Without a search-results creative, the
store falls back to In-App Events, previews and screenshots. Apple's guidance: one clear idea, designed for a
first-time visitor, key art inside the template safe area, a short phrase at most, no text that restates the UI.

- **Make them from the real app**, like screenshots: no HUD, no onboarding controls, no mock-ups. Duo screenshots
  are ordinary captures at the Duo sizes, with the HUD.
- **List them** in the store data's `assetLibrary`, then `asc.mjs assets upload` (outward-facing: ask the owner)
  and `asc.mjs assets place` on the version's localization. `asc.mjs assets` lists every library image, its state
  and placements. Each upload is named `<file>@<sha256 prefix>`, so reruns keep Apple's copy and a changed file
  uploads as a new image. `place` takes only processed images, puts screenshots in store-data order, and stops when
  a slot holds an image store data no longer lists (with `ios.pruneScreenshots` it removes that placement instead). Images go to App Review with the version they are placed on; the version page also lets
  the owner pick an approved header while the version waits for release.
- The regular screenshot display types (`asc.mjs screenshots`) also appear in the Asset Library; `assets` is for
  placements that have no screenshot display type.

## Every update

Before any update of any app goes to review, on both stores:

1. Read what each store holds now (`asc.mjs status`, `play.mjs status`) and compare it with the store data.
2. Open each screenshot, the preview and Play's graphics beside the build being submitted. Recapture any that
   show a screen, control, text or feature the build no longer has, or miss one a player would expect to see.
3. Check the product page header, search-results creative and iPhone Duo screenshots exist and still match (see
   above); make any that are missing.
4. Reread the name, subtitle, promotional text, description, keywords and Play's short and full descriptions
   against the build; correct anything it no longer does and add what it newly does.
5. Write the release notes (`listing.whatsNew`) for the app's audience: new features and what feels faster or
   smoother, never how. The owner approves the wording.
6. Record the recheck, what changed and the owner's approval in the ledger before `submit --confirm` or a Play
   release.

## Uploading

`asc.mjs screenshots` uploads missing files, keeps finished identical ones, replaces unfinished uploads, and —
only when `ios.pruneScreenshots` is true — **removes** files and whole sets the store data no longer lists
(otherwise it reports them and leaves them), refuses to overwrite a finished file whose bytes changed (delete it in App Store
Connect first), and puts each set in the listed order. Run `asc.mjs status` until every screenshot reads
`COMPLETE`. `play.mjs images` replaces each listed Play image type in order and commits only when Play's
SHA-256 of every image matches the repository's. Uploading App Store app previews (`appPreviewSets`) is not
built; upload a preview in App Store Connect and record it.
