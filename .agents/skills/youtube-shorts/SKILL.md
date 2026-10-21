---
name: youtube-shorts
description: Make, check and post YouTube Shorts (vertical 9:16 video, 1080x1920) that frame well on a phone, where YouTube's own controls cover the top, the right edge and the bottom of the video and the player crops the sides. Plan every title, number, face, product screen and call to action inside the measured safe zone, check each frame with a safe-zone contact sheet before uploading, prepare the upload package (title, description, hashtags, captions, cover, settings), and re-measure from a phone screenshot when something is hidden. Use whenever making, rendering, editing, reviewing or posting a YouTube Short, a vertical trailer, promo or app video for Shorts, TikTok or Reels, or when a Short "doesn't frame well", text sits behind YouTube's buttons, or someone sends a screenshot of a Short playing.
metadata:
  version: "0.1.0"
  ledger: ledger/LEDGER.md
---

# YouTube Shorts

A Short is not watched as rendered. On a phone the player fills a screen
taller than 9:16 and crops the sides, and YouTube draws its controls on top of
the video: status bar, back, search and menu across the top; like, comment,
save, share and remix down the right; channel, title and buttons across the
bottom. None of that shows in an editor, a browser preview or the file itself,
so a Short can pass every check on the desk and still have its headline under
the search icon. Frame for the phone from the first storyboard: fixing it
after posting means a new upload, and a new upload starts from zero views.

## Files

| File | What it is |
|---|---|
| `assets/zones.json` | The measured keep-out zones and the safe box, in 1080×1920 frame pixels, with where they were measured |
| `scripts/safe-zone.mjs` | Draws the zones over a video (a contact sheet), one frame (`--at`) or a still. Node 22 and ffmpeg |
| `scripts/fit-screenshot.py` | Maps a phone screenshot of a playing Short onto the frame's pixels, to measure the zones again. numpy and Pillow |
| `references/safe-zone.md` | The measurement, layout rules, the published (ad) figures and how to re-measure |
| `references/posting.md` | The upload package: file, title, description, hashtags, related video, cover, captions, settings, after upload |
| `ledger/LEDGER.md` | Versions, measurements, runs and open issues. Read before starting |

## The safe zone

On a 1080×1920 frame, as measured on an iPhone in YouTube for iOS
(2026-10-21; details and caveats in `references/safe-zone.md`):

- **Hidden:** y < 245 (top controls), x > 898 below y 1061 (the action rail),
  y > 1534 left of the rail (the title stack), and about 54 px off each side
  on a 19.5:9 phone, more on taller ones.
- **Safe:** x 96–864, y 288–1440. Every word, number, face, product screen
  and call to action goes here. Above y 1020 it may run right to x 984.
- Backgrounds, colour and motion should still fill the whole frame.

## Workflow

1. **Read the ledger:** the newest measurement and the open issues.
2. **Storyboard inside the safe box.** Lay out each beat's text and key image
   in frame pixels against `assets/zones.json`. For video rendered from code,
   read the zones from that file and assert each text element's box in tests,
   rather than copying numbers.
3. **Render**, then **check every frame:** `node scripts/safe-zone.mjs <video>
   --every 0.5` and look at each tile of the sheet, then `--at <s>` full size
   for any beat that comes close. Anything readable in red, or crossing the
   green line, gets moved and re-rendered. Check the cover the same way.
4. **Package the upload** with `references/posting.md`: title, description,
   hashtags, related video, cover, captions and settings.
5. **After posting, watch it on a phone** as the owner and as a viewer.
   Screenshot the busiest frames. If anything is covered, measure it with
   `scripts/fit-screenshot.py` (steps in `references/safe-zone.md`).
6. **Update the ledger:** the run, any new measurement, and lessons.

## Gotchas

- **The overlay is invisible everywhere but the phone.** Rendered frames,
  editor previews and a browser all show the whole frame. The contact sheet is
  the desk check; the phone is the proof.
- **The top band is controls, not just the status bar.** A headline at the
  usual "title safe" height sits behind back, search and the menu.
- **The safe box is off centre.** Its middle is x 480. Centred text is limited
  to 648 px wide; centre wider elements on x 480.
- **Phone mock-ups run into the stack.** A device frame tall enough to read
  puts its bottom third under the title and the rail. Crop it, scale it or
  move it up.
- **The owner sees more chrome than viewers.** Analytics, the view count and
  "Share your video" sit in the owner's bottom stack. Design for the larger
  one; the owner will judge the video from that view.
- **Ad figures are not organic figures.** Published Shorts "safe zones" are
  vertical-ad specs with a 672 px bottom margin for the ad's card. They are
  stricter than needed at the bottom and looser at the top.
- **Screenshots carry the owner's face, handle and stats.** Record numbers,
  not images, in a public repository.

## Ledger

`ledger/LEDGER.md` is append-only. Read it before a run; after one, add the
run row, any measurement, and an open issue for anything the skill got wrong.
Change a zone only with a new measurement behind it, and add a version row
when the skill changes.
