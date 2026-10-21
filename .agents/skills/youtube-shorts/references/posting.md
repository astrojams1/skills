# Posting a Short

The upload package and the settings that matter, as checked on 2026-10-21.
YouTube changes these often: re-check a fact against its source before
relying on it for a decision, and date what you find in the ledger.

## The file

- **What counts as a Short.** A square or vertical video up to three minutes,
  for uploads from 15 October 2024 on
  ([YouTube Help](https://support.google.com/youtube/answer/15424877)).
  Horizontal uploads are long-form videos.
- **Encode.** 1080×1920, H.264 High, yuv420p, 30 or 60 fps, at least
  8 Mb/s for 1080p at 30 fps, AAC at 48 kHz. Re-encoding is YouTube's job,
  so give it a clean master rather than a small file.
- **Loudness.** YouTube turns loud uploads down. Master near −14 LUFS
  integrated with true peak at or below −1 dBTP, so nothing is turned down or
  clipped. This is working practice, not a published spec.
- **The first second.** People decide with a swipe, and Studio reports it as
  "Viewed vs. swiped away". Open on the strongest image, already moving, with
  sound. A fade from black spends that second on nothing.
- **The loop.** Shorts replay automatically. An ending that hands back to the
  opening earns rewatches; a hard stop on a black frame does not.

## Title, description, hashtags

- **Title.** About 40 characters fit on one line of the player on a 6.3-inch
  iPhone (measured 2026-10-21 with a 40-character title). Put the hook first;
  the rest wraps or truncates.
- **Links do not click.** Since 31 August 2023 links in Shorts descriptions
  and comments are plain text, the creator's own included
  ([Tubefilter](https://tubefilter.com/2023/08/10/youtube-shorts-comments-spam/)).
  Give a search phrase in the description, put the link in the channel's
  links, which do click, and use Related video (below) for your own videos.
- **Hashtags.** The first three show above the title; more than 60 and all of
  them are ignored ([YouTube Help](https://support.google.com/youtube/answer/6390658)).
- **Related video.** In Studio → Content → the Short → Related video, link a
  video, live stream or another Short from the same channel. It shows as a row
  above the title, which makes the bottom stack taller
  ([vidIQ](https://vidiq.com/blog/post/youtube-related-links-connect-shorts-long-videos/)).
  Third-party tools report that it cannot be set through the API.

## Cover, captions, settings

- **Cover.** On mobile, pick a frame from the video. Uploaded custom
  thumbnails for Shorts rolled out from July 2026, to Partner Program channels
  first, on desktop only, with no A/B testing
  ([PPC Land](https://ppc.land/youtube-ends-2-year-wait-for-shorts-thumbnails-but-blocks-a-b-testing/)).
  Pick a frame whose words sit inside the safe box: the cover is seen under
  the same controls. Check it with `scripts/safe-zone.mjs cover.png`.
- **Captions.** Upload an `.srt` in Studio → Subtitles → Upload file → With
  timing. A Short with no speech can still carry sound descriptions.
- **Paid promotion.** The box is for paid placements, sponsorships and
  endorsements. A creator presenting their own product is none of those;
  say the connection plainly instead ("I made…").
- **Altered or synthetic content.** For realistic content a viewer could
  mistake for real people, places or events. Clearly animated or
  motion-graphic work does not need it.
- **Made for kids.** Answer truthfully; a "yes" turns off comments and
  personalised features.

## After it is up

- **Watch it on a phone** as the owner, and as a viewer if you can (another
  account, or signed out). Screenshot the frames with the most text. Anything
  covered means measuring again (`references/safe-zone.md`) and, if it is
  worth it, a corrected upload.
- **A corrected upload is a new video.** Views, likes and comments do not
  carry over, so frame it right before posting.
- **Cross-posting.** The same 1080×1920 file serves TikTok and Instagram
  Reels, but their overlays differ and are not yet measured here. Check each
  on a phone before relying on this safe box.
- **Read the numbers** at two days, a week and four weeks: views, viewed vs.
  swiped away, average percentage viewed, likes, comments, subscribers
  gained, and whatever the link destination counts.
