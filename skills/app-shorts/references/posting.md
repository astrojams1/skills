# Posting and scheduling

Posting publishes under the owner's channel. Every app live on the App Store is already authorized (the standing
instruction in `SKILL.md`). Post without asking, and record every post in the registry the same minute.

## The channel

One channel for every app: the owner's (James Thompson, `UC53mA8GZ4A4103xsTvuPn5w`), which already carries
Newsworthy, Giraffe Stretch, Pipsqueak and Füd Shorts. Check the signed-in channel on the Studio dashboard before
the first upload of a run. Channel settings (links, handle, branding) may change without asking; log the old value first
so a change can be undone. Never create channels.

## Find the app: the search phrase

Links in Shorts do not click, the creator's own included. A viewer finds the app only by typing its name into the
App Store, so every Short gives a phrase that is known to find it (James, 2026-11-12: Shorts must lead to downloads).

1. **Get the phrase.** `node $S/shorts.mjs phrase <app>`. It returns the profile's `searchPhrase` when
   `app-marketing` has set one (it checks daily that the phrase finds the app). Otherwise it tries the store name and
   any `--try "a|b"` candidates on the App Store's own search and returns the first one ranked first. A `rank: null`
   means the store found none today; use the store name and say so in the run notes.
2. **Show it on screen in the last beat.** Every viewer who reaches the end sees it, and the loop shows it again.
   It is the only place a viewer sees it without tapping. Draw it in the Short's own type and look, inside the safe
   box, for at least 1.5 s. "Search 'Importron health'", the phrase typed into a search bar, or the app icon beside
   it all work. The words are the Short's choice; the exact phrase is not. This keeps the 2.0 rule against stock
   template lines: what is fixed is that the viewer can find the app, not a sentence.
3. **Lead the description with it.** The first line names the app and what it does, then "Search '<phrase>' on the
   App Store." It is the first thing a viewer reads after tapping the title. `record` checks this line.
4. **Put the app's name early in the title** when it fits the searcher's words. The player shows about the first 40
   characters over the Short.

A plain-text App Store link may follow lower in the description for desktop viewers, never in place of the phrase.

## Only for apps on sale

A Short is posted or scheduled only for an app on sale: its marketing profile's stage is `live`, or its `preorder`
names a live pre-order page (`SKILL.md`, Rules). There is no "coming soon" Short. `yt-api.mjs upload`, and `update
--publish-at`, refuse an app not on sale, and `shorts.mjs phrase` gives it no phrase.

- **A Short already scheduled for one is held.** `shorts.mjs due` lists it under `hold`. Run `yt-api.mjs unschedule
  --episode ID --hold --confirm` (add `--live` if it already went public). The video stays on the channel, private,
  with no publish time, and the registry marks it `held`, keeping `wasPublishAt`.
- **When the app goes live,** `due` lists the held Short under `recheck`. Judge it as a new Short: the rules in force
  that day, the reviewer panel, the phrase on screen and in the first line. A held Short that says "coming soon"
  fails. Remake it, or set its new time with `yt-api.mjs update --episode ID --publish-at T --confirm`, which checks
  the app is on sale and the phrase leads the description, then marks it `scheduled`.

## Through the YouTube Data API (the default)

`youtube-growth/scripts/yt-api.mjs upload --episode <id>` prints the request (dry run); add `--confirm` to upload.
A future `publishAt` schedules it (uploaded private, made public at that time); otherwise it goes public. It sets
the cover with `thumbnails.set` and records the `videoId` in the registry. Since 2026-11-02 unaudited API projects
may publish publicly. Captions cost 400 quota units through the API; burned-in text usually makes them unnecessary.
`yt-api.mjs update --episode <id> --description-file F --search-phrase P --confirm` replaces a posted or scheduled
Short's description and keeps the old one in the registry as `wasDescription`.

**Not operable (2026-11-12):** the API cannot pin a comment or set a Related video, and Studio needs the owner's
sign-in. The pipeline does not use either, and a run does not log them as skipped or open.

## Through YouTube Studio in Chrome (only if the API is down)

The built-in browser cannot attach files; use Claude in Chrome (`file_upload`). Use it only in a browser that is
already signed in to the channel; never sign in.

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

Studio's checks (copyright, ad suitability) run during upload; wait for "Checks complete. No issues found." before
publishing.

## Cadence

There is no calendar and no cap. Post every Short as soon as it is ready, several a day when several are ready. The
owner (2026-11-12): "I have way too many apps to be so reserved." The old caps (one every two days, then one a day)
had no data behind them. Quality per Short is what YouTube rewards: each one is judged on whether viewers keep watching
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
  the channel's links and in any long video's description. In a Short, give the search phrase ("Find the app"
  above). The Shorts scheduled for 2026-11-13 (Importron) and 2026-11-15 (Data Center) were uploaded with only a dead link;
  their descriptions were fixed through the API on 2026-11-12.
- **A corrected Short is a new video.** Its views start from zero; fix it before posting.
