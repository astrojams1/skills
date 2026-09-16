# Listing assets and repeatable Apple API work

## Produce a reviewable store package

Reuse an existing release directory, typically `store/`, with:

- `listing.json`: platform names, subtitle/short description, long copy, keywords,
  public URLs, review notes and the user-approved price model. Keep private review
  contact/demonstration credentials in local environment or provider settings.
- `release.json`: public existing app/version/localization/build identifiers.
- `source/`: real native captures and editable composition sources.
- `assets/`: upload-ready images and a manifest of platform, dimensions, source
  capture, display type, build/OS provenance and checksum when useful.
- `ledger.json` / `ledger.md`: canonical gates and history; user-action notes can
  link to this rather than maintaining a competing status checklist.

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

## Reusable Apple helper

`scripts/apple.mjs` uses Node's built-in crypto/fetch, with no extra package.
It supports existing App Store Connect records, not account creation or contracts.
Use current supported Node (fetch required) and provide an explicit app store directory:

```sh
node /path/to/app-release/scripts/apple.mjs --help
node /path/to/app-release/scripts/apple.mjs status /path/to/app/store
```

Set `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY_PATH` in the process environment
using the approved secret source. `.p8` contents and JWTs never belong in Git or
logs. The helper scopes its JWT to Apple's API and does not forward it to asset
upload hosts. Use [release.example.json](../assets/release.example.json) and
[listing.example.json](../assets/listing.example.json) only as field-shape templates;
replace placeholders from the intended account's verified records.

| Command | Effect / evidence |
|---|---|
| status | Read version state, build processing and screenshot delivery |
| metadata | Check both resource locales before writing, then verify every supplied field |
| screenshots | Create missing screenshot sets/assets, upload Apple's reserved parts and mark uploaded |
| build | Require recorded Apple build VALID, select it, verify selection |
| age-rating | PATCH attributes from app-specific `apple-age-rating.json`, verify every supplied field |
| review-notes | Save notes and no-login review contact; creation requires authorized contact fields |

`review-notes` reads `ASC_REVIEW_FIRST_NAME`, `ASC_REVIEW_LAST_NAME`,
`ASC_REVIEW_EMAIL`, `ASC_REVIEW_PHONE`. It preserves existing contact fields when
omitted. A new record requires a phone even if an API schema appears to call it
optional. Do not invent a phone or repeatedly ask for the same resolved approval.
Set `demoAccountRequired` explicitly; the helper does not infer no-login behavior.
It deliberately rejects apps requiring demo credentials: use the provider's
private review-access form and verify it for that app instead of claiming no login.

For screenshots, `assets/manifest.json` is an array like:

```json
[{"file":"assets/apple/iphone/01.png","platform":"ios","displayType":"APP_IPHONE_67","width":1320,"height":2868,"source":"source/iphone/01.png"}]
```

The helper is additive: it refuses to replace a same-named image with a different
checksum, and never deletes remote assets. Inspect existing screenshots and choose
an authorized replacement strategy when revising a gallery. After an ambiguous
upload error, inspect remote delivery/checksum before retrying. A reservation or
upload attempt is not COMPLETE; use `status` to verify processed assets.

For another release, discover version/localization/appInfo/build IDs afresh.
Set `ageRatingDeclarationId` from the actual related age-rating resource; do not
assume it always equals an appInfo ID. Do
not copy IDs from a sample app. The age-rating declaration is app-specific; create
it from current questions and content evidence rather than copying Newsworthy's
news/violence answers. Privacy publication has no assumed endpoint in this helper;
use available supported API capabilities or the actual App Privacy UI.

Read [stores.md](stores.md) for account gates and the final review workflow.
This helper does not submit for review, choose territories, accept contracts,
configure privacy answers or make the app live. Record each of those separately.
