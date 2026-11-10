# Icons, screenshots and optional lifestyle art

Put images in `/Volumes/ssd/code/app-sites/sites/ouro/src/assets/apps/<slug>/`. Astro resizes and converts them at
build time, so keep sources modest and real. Stage downloads and captures under `/Volumes/ssd/projects/ouro-apps/`
first.

## Icon: `icon.png`, 1024×1024 PNG

| App state | Source |
|---|---|
| Live | The App Store artwork: `store.json` → `artworkUrl` (already the 1024px PNG URL) |
| Not live, local repository | The app's `Assets.xcassets/AppIcon.appiconset/*1024*.png` (or the single `AppIcon.png`) |
| Not live, no repository | `audit.mjs --pull <id>` saves only a 120px build icon. Redraw simple icons as SVG at 1024px, record why in `iconNote`, and replace with the artwork at release |

Never use an icon template, a placeholder or a store "app-icon" file without looking at it first.

## Screenshots: `screen-1.jpg` … `screen-6.jpg`

Use two to six, in the order that tells the story (the first is the hero and the preview card). Sources, best first:

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

Look at every screenshot before committing it, and write alt text that says what the screen shows. Apple's
guidelines apply to device imagery: no fake bezels, tilt or reflections. The site uses plain screenshots with rounded
corners.

## Optional lifestyle art

A model scene or generated lifestyle image goes in the catalog's separate `lifestyle: { file, alt, caption }` field,
only when the owner's direction calls for one. Never put it in `screenshots`: those stay genuine app captures.

- **Disclose it.** The visible caption and alt text must say it is generated or model artwork. Never imply a real
  customer, testimonial or endorsement.
- **Keep provenance.** Record how it was generated and composed in the site's media records. Use original captures as
  the factual reference for any app screen it shows.
- **Keep the UI true.** Show the app's screens accurately, and follow Apple's device and branding rules.
- **Don't require it.** Lifestyle art is optional. Add no approval gate beyond the owner's existing scope.
- **Look at it.** Check its crop and disclosure at desktop and phone widths.

## Badge

`sites/ouro/public/badges/download-on-the-app-store.svg` is Apple's unmodified black badge from
`https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg`. Use it only for a live app, at
40px tall or more, once per view, never recoloured or animated. Apple's credit line is in the footer.

## Lessons

- **Füd's icon file is a template (2026-11-02).** Füd's repository `store/assets/app-icon.png` is Apple's icon-grid
  template, not the icon. Use the App Store artwork (`store.json` → `artworkUrl`).
- **Build icons are small (2026-11-02).** App Store Connect build icons (`iconAssetToken`) are 120px at most. Take
  icons from the app repository's `Assets.xcassets/AppIcon.appiconset` or, once live, the App Store artwork. Moment to
  Meaning has no local repository. Its icon is a vector redraw (`iconNote`) until the live 1024px artwork can replace
  it.
- **Link-preview cards use Latin fonts (2026-11-02).** Satori draws them from `.woff` Latin fonts. Keep their text to
  Latin characters, with no emoji or ★.
- **Satori ignores padding on a fixed height (2026-11-02).** Give a padded card `height: 630 - top - bottom`, or its
  last row falls off the preview image.
