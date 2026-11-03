# Icons, screenshots and optional lifestyle art

Put images in `/Volumes/ssd/code/app-sites/sites/astrojams/src/assets/apps/<slug>/`. Astro resizes and converts them at build
time, so keep sources modest and real. Stage downloads and captures under
`/Volumes/ssd/projects/astrojams-apps/research/<slug>/` first.

## Icon: `icon.png`, 1024×1024 PNG

| App state | Source |
|---|---|
| Live | The App Store artwork: `store.json` → `artworkUrl` (already the 1024px PNG URL) |
| Not live, native repository | The app's `Assets.xcassets/AppIcon.appiconset/*.png` at 1024px |
| Not live, Capacitor repository | `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` or the web build's `icon-1024.png` (Rhythm, Data Center) |

`audit.mjs --pull <id>` saves only a small build icon. Never use an icon template or a placeholder without looking
at it first.

## Screenshots: `screen-1.jpg` … `screen-6.jpg`

Use two to six, in the order that tells the story (the first is the hero and the preview card). Sources, best first:

1. The app repository's store assets: the files its store data's `screenshots` entries or manifest name for the
   6.9-inch iPhone (Newsworthy `store/assets/apple/iphone-6.9/`, Space Worms `assets/store/screenshots/iphone-*.jpg`,
   Importron `store/assets/apple/iphone/`). These match the listing exactly; marketing frames with headlines are fine.
2. App Store Connect: `node <skill>/scripts/audit.mjs --pull <appStoreId> --out
   /Volumes/ssd/projects/astrojams-apps/research/<slug>`.
3. Live apps: the App Store's own screenshot URLs from Apple's lookup API (`screenshotUrls`).
4. The repository's own documentation captures of the current build at phone size (Data Center `docs/images/*phone*`).
5. A capture of the current build: a simulator capture following the owner's simulator storage rules, or, for a web
   or Capacitor app, its built `dist/` served locally and captured headless at an iPhone viewport (402×874 at 3×)
   through `/Volumes/ssd/builds/tools/sw-browser-test`, which keeps browser storage on the SSD. Use fictional data and
   skip debug states.

Convert each to a 1000px-wide JPEG (narrower sources keep their width) so the repository stays small:

```bash
sips -s format jpeg -s formatOptions 88 --resampleWidth 1000 SOURCE.png --out sites/astrojams/src/assets/apps/<slug>/screen-1.jpg
```

Look at every screenshot before committing it and write alt text that says what the screen shows. Apple's guidelines
apply to device imagery: no fake bezels, tilt or reflections; plain screenshots with rounded corners.

## Optional lifestyle art

A model scene or generated lifestyle image goes in the catalog's separate `lifestyle: { file, alt, caption }` field,
never in `screenshots`. Its caption and alt text must say it is generated or staged, without implying a real customer
or endorsement; keep provenance in the site's `docs/media/`. It is optional and only on the owner's direction.

## Badge

`sites/astrojams/public/badges/download-on-the-app-store.svg` is Apple's unmodified black badge. Use it only for a live app, at 40px
tall or more, once per view, never recoloured or animated. Apple's credit line is in the footer.
