# Icons, screenshots and optional lifestyle art

Put images in `/Volumes/ssd/code/app-sites/sites/ouro/src/assets/apps/<slug>/`. Astro resizes and converts them at build time,
so keep sources modest and real. Stage downloads and captures under `/Volumes/ssd/projects/ouro-apps/` first.

## Icon: `icon.png`, 1024×1024 PNG

| App state | Source |
|---|---|
| Live | The App Store artwork: `store.json` → `artworkUrl` (already the 1024px PNG URL) |
| Not live, local repository | The app's `Assets.xcassets/AppIcon.appiconset/*1024*.png` (or the single `AppIcon.png`) |
| Not live, no repository | `audit.mjs --pull <id>` saves only a 120px build icon. Redraw simple icons as SVG at 1024px, record why in `iconNote`, and replace with the artwork at release |

Never use an icon template, a placeholder or a store "app-icon" file without looking at it first.

## Screenshots: `screen-1.jpg` … `screen-6.jpg`

Use two to six, in the order that tells the story (first one is the hero and the preview card). Sources, best first:

1. The app repository's store assets (`store/assets/apple/iphone*/`, or a manifest the store data names). These match
   the listing exactly; marketing frames with headlines are fine.
2. App Store Connect: `node <skill>/scripts/audit.mjs --pull <appStoreId> --out /Volumes/ssd/projects/ouro-apps/research/<slug>`.
3. Live apps: the App Store's own screenshot URLs from Apple's lookup API (`screenshotUrls`, change the size segment
   to `1290x2796bb.png`).
4. Simulator captures of the current build in the app's project home (for example `captures/`), following the
   owner's simulator storage rules. Use fictional people and data, and skip debug states and test names.

Convert each to a 1000px-wide JPEG so the repository stays small:

```bash
sips -s format jpeg -s formatOptions 88 --resampleWidth 1000 SOURCE.png --out sites/ouro/src/assets/apps/<slug>/screen-1.jpg
```

Look at every screenshot before committing it and write alt text that says what the screen shows. Apple's guidelines
apply to device imagery: do not draw fake bezels, tilt or add reflections; plain screenshots with rounded corners
are what the site uses.

## Optional lifestyle art

When the owner's direction calls for a model scene or generated lifestyle image,
use the catalog's separate `lifestyle: { file, alt, caption }` field. Keep it out
of `screenshots`; those remain genuine app captures. The visible caption and alt
text must identify generated/model artwork, without implying a real customer,
testimonial or endorsement. Keep generation and composition provenance in the
site's media records, with original captures as the factual reference for any
visible app UI. Preserve accurate UI and observe Apple's device/branding rules.
Lifestyle art is optional; do not require it or add an approval gate beyond the
owner's existing scope. Inspect its crop and disclosure at desktop and phone widths.

## Badge

`sites/ouro/public/badges/download-on-the-app-store.svg` is Apple's unmodified black badge from
`https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg`. Use it only for a live app, at
40px tall or more, once per view, never recoloured or animated. Apple's credit line is in the footer.
