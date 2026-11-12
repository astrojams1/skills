# Posting and scheduling

Posting publishes under the owner's channel. Every app live on the App Store is already authorized (the standing
instruction in `SKILL.md`). Post without asking, and record every post in the registry the same minute.

## The channel

One channel for every app: the owner's (James Thompson, `UC53mA8GZ4A4103xsTvuPn5w`), which already carries
Newsworthy, Giraffe Stretch, Pipsqueak and Füd Shorts. Check the signed-in channel on the Studio dashboard before
the first upload of a run. Channel settings (links, handle, branding) may change without asking; log the old value first
so a change can be undone. Never create channels.

## Through YouTube Studio in Chrome (works today)

The built-in browser cannot attach files; use Claude in Chrome (`file_upload`).

1. **Files must be readable by the session.** `file_upload` refuses paths outside the session's folders: copy the
   MP4, `.srt` and a JPEG cover (under 2 MB; `sips -s format jpeg`) into the session scratchpad first.
2. Studio → Create → Upload videos, then `find` the hidden `input[type=file]` and `file_upload` the MP4. Do not
   click "Select files", which opens a native picker no tool can drive.
3. **Details:** select-all in the title and type it; type the description. The cover goes to the thumbnail
   uploader's own hidden input (`ytcp-thumbnail-uploader input[type=file]`, which accepts JPEG and PNG). The
   visible "Upload file" is a button, not the input. Audience: "No, it's not made for kids" (the apps' marketing
   targets parents). Show more: paid promotion "No". **AI use "No"** for a real app recording with code-synthesised
   sound. Answer "Yes" only for realistic AI-generated people, places or events. Typing a `#hashtag` opens a
   suggestion list: click a heading to close it, not Escape.
4. **Video elements → Subtitles → Upload file → With timing:** `file_upload` the `.srt` straight onto the hidden
   captions input without clicking Continue, then Done.
5. **Visibility:** Public, or Schedule. The date picker takes clicks. **The time field ignores typed text:** open
   its list and click the option (`find` "5:00 PM option"). The time zone defaults to the account's local zone;
   check it and leave it.
6. Read the share dialog for the `youtube.com/shorts/<id>` link and record it.
7. **Pinned comment** (a comment prompt that feeds the series): open `youtube.com/watch?v=<id>`, add the comment,
   then ⋮ → Pin → Pin. A scheduled Short cannot be commented on until it is live, so `shorts.mjs due` lists it
   under `live` when its time passes.

Studio's checks (copyright, ad suitability) run during upload; wait for "Checks complete. No issues found." before
publishing.

## Through the YouTube Data API (once the owner has connected it)

`youtube-growth/scripts/yt-api.mjs upload --episode <id>` prints the request (dry run); add `--confirm` to upload.
A future `publishAt` schedules it (uploaded private, made public at that time); otherwise it goes public. It sets
the cover with `thumbnails.set` and records the `videoId` in the registry. Since 2026-11-02 unaudited API projects
may publish publicly. The API cannot set **Related video** or **pin a comment**: do those in Studio after it is
live. Captions cost 400 quota units through the API; burned-in text usually makes them unnecessary.

## Cadence

There is no calendar. A Short goes up when it clears the bar in `creative.md`, at most one a day on the channel.
The old rule of one every two days had no data behind it (owner review, 2026-11-11), and a fixed slot pushed weak
cuts out to fill it. Quality per Short is what YouTube rewards: each one is judged on whether viewers keep watching
and act on it, not on how many the channel posts (`youtube-growth/references/metrics.md`).
`shorts.mjs plan` still lists which apps have gone longest without a Short; use it to choose, not to schedule.

Post in the late afternoon or evening in the audience's time zone. For the owner's US audience, that is about 5 PM
Pacific. Then let `youtube-growth` adjust the time from the channel's own "when your viewers are on YouTube" data.

## Gotchas

- **Burned-in captions plus an uploaded `.srt` show twice** for viewers who turn captions on, and the second copy
  sits over the app. Upload a caption track only when it adds something (spoken words or sound descriptions).
  Otherwise make it match the burned-in text exactly and accept the duplication for accessibility. The first Füd series
  uploaded duplicates.
- **Shorts description links don't click.** Put the App Store link (with a campaign token, `shorts.mjs link`) in
  the channel's links and in any long video's description. In a Short, write "Search 'Füd' on the App Store".
- **A corrected Short is a new video.** Its views start from zero; fix it before posting.
