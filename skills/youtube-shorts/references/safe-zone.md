# The Shorts safe zone

What a phone actually shows of a 1080×1920 Short, where the numbers in
`assets/zones.json` come from, and how to measure again when YouTube's
interface changes.

## What covers the video

A Short plays under YouTube's own controls. Measured on 2026-10-21 from a
screenshot of a Short playing in YouTube for iOS on an iPhone 16 Pro, viewed
by its owner (frame pixels, 1080×1920):

| Zone | Frame pixels | What is there |
|---|---|---|
| Side crop | x < 54 and x > 1026, full height | Nothing: the player fills a screen taller than 9:16 and cuts the sides off |
| Top band | y < 245, full width | Status bar (to y 108), then back, search and the menu, at y 177–245 |
| Action rail | x > 898, y > 1061 | Like, comment, save, share, remix, then the sound thumbnail at the bottom |
| Bottom stack | y > 1534, x < 898 | Channel row (with Subscribe, or Analytics for the owner), the title, "Public · N views" and a "Share your video" button for the owner, then the progress bar at y 1913 |

The player is aspect-fill above the tab bar: the frame's full height shows
(scale 1.238 on that screen, 2,377 of the screenshot's 2,622 rows), so the
sides are what give. A taller phone (20:9 and up, common on Android) crops
more from the sides; a 16:9 phone crops none. The overlay is not part of the
video, so a browser preview, an editor or the rendered file never shows it.

## Where information goes

`safe`: x 96–864, y 288–1440 (768×1152). Every word, number, face, call to
action and what a product's screen shows sits inside it. `safeAboveRail` adds
x 864–984 above y 1020, where the rail has not started yet. Both clear every
measured zone by at least 32 px, so a slightly different phone or a two-line
title does not reach them.

- **The safe box is off centre.** Its middle is x 480, not 540. A centred
  element is limited to 648 px wide (x 216–864); a wider one should centre on
  x 480 rather than shrink.
- **The top band is controls, not only the status bar.** Text at y 130–280
  sits under back, search and the menu. Start supers at y 288.
- **The lower half loses its right edge.** Cards, screenshots and phone
  mock-ups below y 1060 must end by x 864 or the rail covers them; a device's
  body should end by x 898, where the rail starts.
- **The bottom fifth is the title.** Nothing readable below y 1440: the
  owner's own view adds rows that viewers do not see, a long title takes two
  lines, and a Related video link adds a row above the title.
- **Backgrounds, motion and devices may bleed.** Only information is
  confined; colour, texture and movement should fill the frame so the crop
  never shows an edge. A phone running off the bottom edge under the title
  reads as intended; one ending just under the title reads as a mistake.
- **Proportion, not just position.** The box is nearly 2:3. A layout scaled
  down into it leaves the product small and the type too big; recompose it
  (SKILL.md, "Compose for it").

## Published figures

No platform publishes margins for organic Shorts. The figures that circulate
are for vertical ads, and disagree:

- 288 px top, 672 px bottom, 48 px left, 192 px right (an 840×960 area),
  attributed to Google's vertical-ads safe-zone image
  ([Socialync](https://www.socialync.io/tools/safe-zones/youtube-shorts),
  [Strike Social](https://strikesocial.com/blog/maximize-ad-visibility-and-cut-through-the-noise-with-safe-zone-guides)).
  The large bottom margin leaves room for an ad's call-to-action card.
- 241 px top, 381 px bottom, 60 px left, 201 px right, measured from ad
  previews in March 2026 ([AdKit](https://adkit.so/tools/safe-zones/youtube)).
  These agree with the 2026-10-21 measurement above to within 25 px.

Use `safe` for organic Shorts. For an ad, keep the bottom 672 px clear as
well.

## Measuring again

Measure whenever the owner reports something hidden, YouTube redesigns the
player, or the ledger has no measurement for a device that matters.

1. Get a screenshot of the Short playing, on the phone, untouched (no crop,
   no markup). Note the device, the app and whether it is the owner's view.
2. Extract the video's frame at that moment:
   `ffmpeg -ss <seconds> -i video.mp4 -frames:v 1 frame.png`. Try nearby
   times if the match score is low; the score says how well the frame lines
   up.
3. Fit and look at the difference:
   `python3 scripts/fit-screenshot.py --frame frame.png --screenshot shot.png --diff diff.png`.
   YouTube's controls are white in `diff.png`.
4. Read each control's box off the screenshot (in screenshot pixels) and pass
   them as `--mark x0,y0,x1,y1`. The output gives each in frame pixels, and
   `visible` gives the side crop. Keep the marks: with `--preview new.png`
   the same call lays those controls over any new frame, which is how to see
   a new cut as a viewer will before it is uploaded. Mark tightly; white video
   inside a mark comes along, and avatars and YouTube's glass pills are not
   carried over.
5. Record the measurement in the ledger. If it moves a zone, change
   `assets/zones.json` (keep `safe` at least `margin` px clear of every zone;
   `tests/youtube-shorts/safe-zone.test.mjs` checks) and add a version row.

Screenshots of the owner's own channel show their face, handle and analytics:
record the numbers, not the image, in a public repository.

## Not yet measured

- A viewer's view (Subscribe instead of Analytics, no owner rows), and the
  stack with a Related video row or a two-line title.
- Android, iPad, desktop and the mobile web player.
- Where captions draw when a viewer turns them on.
- How the Shorts shelf and search results crop the cover.
- TikTok and Instagram Reels, which have their own overlays.
