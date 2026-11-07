# Posting and scheduling

Posting publishes under the owner's channel. Every app live on the App Store is already authorized (the standing
instruction in `SKILL.md`), so post without asking, and record every post in the registry the same minute.

## The channel

One channel for every app: the owner's (James Thompson, `UC53mA8GZ4A4103xsTvuPn5w`), which already carries
Newsworthy, Giraffe Stretch, Pipsqueak and Füd Shorts. Check the signed-in channel on the Studio dashboard before
the first upload of a run. Never create channels or change channel settings (links, handle, branding) without the
owner's go-ahead.

## Through YouTube Studio in Chrome (works today)

The built-in browser cannot attach files; use Claude in Chrome (`file_upload`).

1. **Files must be readable by the session.** `file_upload` refuses paths outside the session's folders: copy the
   MP4, `.srt` and a JPEG cover (under 2 MB; `sips -s format jpeg`) into the session scratchpad first.
2. Studio → Create → Upload videos, then `find` the hidden `input[type=file]` and `file_upload` the MP4. Do not
   click "Select files", which opens a native picker no tool can drive.
3. **Details:** select-all in the title and type it; type the description. The cover goes to the thumbnail
   uploader's own hidden input (`ytcp-thumbnail-uploader input[type=file]`, which accepts JPEG and PNG); the
   visible "Upload file" is a button, not the input. Audience: "No, it's not made for kids" (the apps' marketing
   targets parents). Show more: paid promotion "No"; **AI use "No"** for a real app recording with code-synthesised
   sound (answer "Yes" only for realistic AI-generated people, places or events). Typing a `#hashtag` opens a
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

One Short every two days across the channel (three or four a week) is a pace distinct ideas can sustain; `shorts.mjs plan --gap 2` builds that calendar, rotating apps by cadence. More is not rewarded for its own sake (`youtube-growth/references/metrics.md`). Post in
the late afternoon or evening in the audience's time zone (the owner's US audience: about 5 PM Pacific), then let
`youtube-growth` adjust the time from the channel's own "when your viewers are on YouTube" data.

## Gotchas

- **Burned-in captions plus an uploaded `.srt` show twice** for viewers who turn captions on, and the second copy
  sits over the app. Upload a caption track only when it adds something (spoken words or sound descriptions), or
  make it match the burned-in text exactly and accept the duplication for accessibility. The first Füd series
  uploaded duplicates.
- **Shorts description links don't click.** Put the App Store link (with a campaign token, `shorts.mjs link`) in
  the channel's links and in any long video's description; in a Short, write "Search 'Füd' on the App Store".
- **A corrected Short is a new video.** Its views start from zero; fix it before posting.
