---
name: youtube-shorts
description: Make, check and post YouTube Shorts (vertical 9:16 video, 1080x1920) that frame well on a phone, where YouTube's own controls cover the top, the right edge and the bottom of the video and the player crops the sides. Plan every title, number, face, product screen and call to action inside the measured safe zone, check each frame with a safe-zone contact sheet before uploading, prepare the upload package (title, description, hashtags, captions, cover, settings), and re-measure from a phone screenshot when something is hidden. Use whenever making, rendering, editing, reviewing or posting a YouTube Short, a vertical trailer, promo or app video for Shorts, TikTok or Reels, or when a Short "doesn't frame well", text sits behind YouTube's buttons, or someone sends a screenshot of a Short playing.
metadata:
  version: "0.4.0"
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
| `scripts/soundtrack.mjs` | A synthesised music bed and cued effects (typing, tap, pop, whoosh, ding) mixed under a silent cut at about -15 LUFS. Node 22; ffmpeg for the mix |
| `scripts/fit-screenshot.py` | Maps a phone screenshot of a playing Short onto the frame's pixels, to measure the zones again, and with `--preview` lays its YouTube controls over new frames. numpy and Pillow |
| `references/safe-zone.md` | The measurement, layout rules, the published (ad) figures and how to re-measure |
| `references/posting.md` | The upload package: file, title, description, hashtags, related video, cover, captions, settings, after upload |
| `ledger/LEDGER.md` | Versions, measurements, runs and open issues. Read before starting |

## The safe zone

On a 1080×1920 frame, as measured on an iPhone in YouTube for iOS
(2026-10-21; details and caveats in `references/safe-zone.md`):

- **Hidden:** y < 245 (top controls), x > 898 below y 1061 (the action rail),
  y > 1534 left of the rail (the title stack), and about 54 px off each side
  on a 19.5:9 phone, more on taller ones.
- **Safe:** x 96–864, y 288–1440. Every word, number, face, call to action
  and what a product's screen shows goes here. Above y 1020 it may run right
  to x 984.
- Backgrounds, colour, motion and a device's body should still fill the frame.

## Compose for it; do not shrink into it

The safe box is about 768×1150, nearly 2:3. Scaling a layout made for the
whole frame down until it fits makes a whole phone a thumbnail and leaves a
headline set for 1920 px outweighing it (Newsworthy's second cut, which the
owner rejected for exactly that). Recompose instead:

- **The product is the subject.** Show a device large, its body running off
  the frame's bottom edge under YouTube's title, so its lower edge is never
  seen there; a phone that ends just under the title reads as a mistake. Only
  what its screen shows has to be in the box. Centre it a little left of the
  frame's centre (x ≈ 520) so it clears the action rail.
- **Headlines are captions.** One line, about 60 px, above the picture. Big
  type is for scenes that are only type.
- **Move what does not fit, don't shrink everything.** A notification can
  rest nearer the clock and lift up and out; a card can rise a short way
  instead of across the title.
- **Look through the real overlay.** Lay a screenshot's controls over new
  frames (`fit-screenshot.py --preview`) before rendering the whole film; the
  zone boxes show what is hidden, not whether the picture works.

## Make it worth watching

A tour of features is an ad, and people swipe past ads; a Short has to be a moment. Füd's first Short (a 29 s,
silent feature tour cut from its App Store preview) passed every safe-zone check and the owner rightly judged it
would get no engagement. What replaced it:

- **A hook in the first second, as text, mid-screen:** a question or a relatable line ("Do your kids' crusts
  count?"), large and boxed, already moving. Not the app's name, not a feature.
- **One surprising, true number as the payoff,** punched in on (a short zoom on the result row) with a pop caption
  ("The crusts: 220 calories"). Show the real app returning it; never fake a result.
- **10–15 seconds.** Speed up waiting (a spinner at 3x), slow down typing so it reads, cut everything else.
- **Sound on.** Typing clicks, a tap, pops as results land, a ding on the punchline, a light bed under it
  (`soundtrack.mjs`); the owner can swap the bed for a trending track in the YouTube app.
- **A series, not a video.** One format, new inputs each time; end with a comment prompt ("Comment a meal to try
  next") so the comments write the next episode. A new channel's single Short gets almost no reach.
- **Rehearse the inputs first.** Run candidate inputs through the real feature (its API) before recording, and keep
  the ones whose real output is funny or striking; results vary between runs, so record the take and caption what
  it actually returned.

## App videos from screen recordings

For an app with native footage (an App Store preview take, say), render the Short with app-release's
`app-preview.swift render` at `size: [1080, 1920]` rather than a new tool:

- **Move the phone to each scene's subject** with a per-clip `shift`, eased like a camera. A home screen
  sits low with its first rows and goals in the box; a form scrolls up so its chips and button clear
  y 1440. One fixed position cannot show both at a readable size.
- **Fade the background over the top and bottom** (`fade`), solid above the caption line and from
  just under the safe box, so the phone slides under the caption and never shows its lower edge
  under the title. Check the move frames too: a phone raised far enough shows its bottom edge unless
  the bottom fade is solid by then.
- **One caption line, about 60 px, centred on x 480** (`caption.centerX`), at most ~22 characters; a hook may
  run two lines at 80 px in the empty middle of the screen. Boxed captions (`box`) stay legible over the device.
- **Punch in with `zoom` and `focus`** on the row that carries the number, with a short `move`; keep zoomed
  content inside x 96–864 (a zoom wider than ~1.2 pushes edge chips into the crop).
  Split a call to action into its own caption instead of a note that lands on the phone's status bar.
- **Open on the product already moving and end where it began**, so the loop is seamless.

Füd's spec (`store/source/shorts/fud-short.json` in its repository) is a worked example.

## Workflow

1. **Read the ledger:** the newest measurement and the open issues.
2. **Storyboard for the safe box**, composed for its proportions (above). Lay
   out each beat's text and key image in frame pixels against
   `assets/zones.json`. For video rendered from code, read the zones from that
   file and assert each text element's box in tests, rather than copying
   numbers; assert the composition too (a device runs off the frame, clears
   the rail, is not a thumbnail).
3. **Render**, then **check every frame:** `node scripts/safe-zone.mjs <video>
   --every 0.5` and look at each tile of the sheet, then `--at <s>` full size
   for any beat that comes close. Anything readable in red, or crossing the
   green line, gets moved and re-rendered. Check the cover the same way. Then
   look at the busiest beats under the real overlay (`--preview`) and judge
   them as a viewer would.
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
- **Shrinking to fit is not framing.** A whole phone that clears the title
  stack is a thumbnail. Let it run off the bottom edge instead (above).
- **The owner sees more chrome than viewers.** Analytics, the view count and
  "Share your video" sit in the owner's bottom stack. Design for the larger
  one; the owner will judge the video from that view.
- **Ad figures are not organic figures.** Published Shorts "safe zones" are
  vertical-ad specs with a 672 px bottom margin for the ad's card. They are
  stricter than needed at the bottom and looser at the top.
- **`safe-zone.mjs` needs ffmpeg and `fit-screenshot.py` needs numpy and Pillow;** a Mac may have
  neither (`brew install ffmpeg`; a venv for the Python). App previews don't need them, so their
  absence goes unnoticed until the check.
- **Screenshots carry the owner's face, handle and stats.** Record numbers,
  not images, in a public repository.

## Ledger

`ledger/LEDGER.md` is append-only. Read it before a run; after one, add the
run row, any measurement, and an open issue for anything the skill got wrong.
Change a zone only with a new measurement behind it, and add a version row
when the skill changes.
