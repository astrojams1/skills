# youtube-growth — ledger

The skill's own record: versions, experiments and lessons. Append rows; never rewrite them. The numbers live in the
app-shorts registry; each run goes in the owner's activity ledger.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-04 | Initial skill: reads at 3, 7 and 28 days; `evaluate.mjs` with sourced `rules.json` (channel quantiles, low-confidence fallbacks); `yt-api.mjs` (OAuth into 1Password, analytics, comments, upload and scheduling); API, metrics and policy references from research dated 2026-11-04. | The owner asked for a skill that follows up on every Short and works to maximise the channel's metrics across all apps. |
| 1.0.1 | 2026-11-06 | Uploads, pins and metadata edits on a released app's Shorts follow the standing instruction in `app-shorts`. | The owner does not approve each app's Shorts. |
| 1.1.0 | 2026-11-06 | Comment replies and channel settings need no go-ahead. | The owner removed these last approvals. |
| 1.2.0 | 2026-11-06 | `yt-api.mjs unanswered` and `reply`: list open comments on live Shorts and answer one, refusing links, long text and threads already answered. | Replies had no way to post unattended; the owner wants them to run without them. |
| 1.3.0 | 2026-11-10 | Rewritten in the house style from `skill-writing`; no behavior change. The run rules block applies when a scheduled pass runs this skill | The owner asked that every skill read as one author wrote it, plainly |
| 1.4.0 | 2026-11-11 | `yt-api.mjs unschedule --episode ID [--reason R] --confirm`: takes a scheduled Short back to private with no publish time, keeps its other status fields, and marks the episode `pulled` with the old time. | The owner rejected Shorts already scheduled; there was no way to take one back. |
| 1.5.0 | 2026-11-11 | `unschedule --live` takes a live Short down to private; every unschedule reads the video back and fails unless it is private with no publish time; a second run keeps the first run's saved time. | The update response for fud-cereal echoed the old publish time, and a retry overwrote the saved time. |
| 1.6.0 | 2026-11-12 | `yt-api.mjs update --episode ID [--publish-at T] [--not-for-kids] --confirm` changes a Short's publish time or audience, keeping its other settings. Every Short is "not made for kids". | Three Giraffe loops had been uploaded as made for kids and spread one a day; the owner wants comments on and no posting cap. |
| 1.7.0 | 2026-11-12 | Each Short gets a download verdict (`lifted`, `no-effect`, `inconclusive`): first-time downloads from App Store search and browse in the 72 hours after it goes public against the app's prior 7-day daily mean, from app-marketing's metrics (`rules.json` `downloads`). `double-down` needs lifted downloads or is marked provisional; views without downloads iterate. Pulled Shorts do not count for `produce`. `update --description-file --search-phrase` replaces a description, keeping the old one. Comment pinning and Related video dropped as not operable. | The audit found Shorts were judged on views alone and none had shown a download; the owner wants every marketing skill to run without his go-aheads or sign-ins (2026-11-12). |
| 1.8.0 | 2026-11-12 | `yt-api.mjs unschedule --hold` marks the episode `held` (private, no publish time, waiting for its app to go on sale) instead of `pulled`. `upload` and `update --publish-at` refuse an app not on sale; `update --publish-at` on a held Short checks the phrase and marks it `scheduled`. `evaluate.mjs` gives an app not on sale no `produce` action. | app-shorts 2.8.0: only an app on sale gets Shorts. The owner: "why have we been creating giraffe stretch youtube shorts if the app is not even released in the app store yet?" |
| 1.8.1 | 2026-11-12 | `yt-api.mjs update --title T` replaces a scheduled or live Short's title (checked like a record) and keeps the old one as `wasTitle`. `unschedule` reads the video back up to six times, 3 s apart, before calling it failed. | The pre-publish check had to fix titles and `update` could only change the description. All five unschedules in that pass reported failure and skipped the registry write: YouTube's first read still showed the old `publishAt`, which cleared seconds later. |

## Experiments

| started | format | hypothesis | change | episodes | result |
|---|---|---|---|---|---|

## Lessons

- 2026-11-04: Research found no credible published decision rules or benchmarks for Shorts; the thresholds are
  proposals judged against the channel's own numbers. Revisit `rules.json` once the channel has 8+ judged Shorts.
- 2026-11-04: YouTube lifted the private lock on unaudited API uploads on 2026-11-02 and added Shorts thumbnails
  to the API on 2026-11-03, two days before this skill. Check the Data API revision history before relying on
  either.
- 2026-11-04: The first Füd series (3 Shorts) shared one synthesised bed; `soundtrack.mjs` now varies it per Short
  because the spam policy names identical background music across many videos.
