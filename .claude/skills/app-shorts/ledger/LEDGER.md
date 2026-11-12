# app-shorts — ledger

The skill's own record: versions, lessons and runs that taught something. Append rows; never rewrite them.
Per-episode facts live in the registry (`/Volumes/ssd/projects/app-shorts/registry.json`); per-app notes in the
app's repository; each run in the owner's activity ledger.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-04 | Initial skill: registry and calendar (`shorts.mjs`), formats, recording rig, Studio posting procedure, coordination with app-release, the App Store and the websites. | The owner asked for the Füd Shorts work to become a skill for every app on both teams, with a follow-up skill (`youtube-growth`) to grow the channel. |
| 1.1.0 | 2026-11-06 | Standing go-ahead: every released app on either team gets Shorts with no approval per app, series or episode; an independent reviewer checks the final cut. Channel settings stay with the owner. | The Mac pass parked Nametag's Shorts waiting for a go-ahead. The owner said every released app runs full campaigns, Shorts included, and they do not approve each. |
| 1.2.0 | 2026-11-06 | Channel settings (links, description, handle, branding) need no go-ahead; the old value is logged. | The owner removed this last approval. |
| 1.3.0 | 2026-11-10 | Pacing sets `publishAt`, not production: every due episode is made and scheduled into the next free slot up to 14 days out. When the iOS Simulator tool refuses a scheduled session, record through a web build, the app's own `ShortsTakes` UI test under `xcodebuild test`, or `simctl` alone before deferring. | The unattended Mac pass deferred Nametag, Füd, Newsworthy and Importron Shorts from 2026-11-06 to 2026-11-10 because the Simulator tool refuses scheduled sessions or the next slot was taken; only Space Worms, recorded in a browser, got a new episode. |
| 1.4.0 | 2026-11-10 | Rewritten in the house style from `skill-writing`; no behavior change. The run rules block applies when a scheduled pass runs this skill | The owner asked that every skill read as one author wrote it, plainly |
| 1.5.0 | 2026-11-11 | Every Short says what the app is in the first three seconds and names the service it works with (Function Health, Apple Health). App Store naming limits stay on the store listing. | Importron's Short opened on a duplicate-import feature and never said Function Health or Apple Health. It followed app-release's "never name another app or trademark" rule, which the owner removed. |

## Runs

| date | app | what | outcome |
|---|---|---|---|
| 2026-11-03 | Füd | 29 s feature tour cut from the App Store preview take | The owner judged it would get no engagement; not posted. A tour is an ad |
| 2026-11-03 | Füd | Series 1, "Can Füd work out this meal?" (crusts, dinner, leftovers): three 12–13 s episodes from new takes of the real feature, inputs rehearsed through the local API | Rendered with hook, punch-in, boxed captions and synthesised sound; checked against the safe zone |
| 2026-11-04 | Füd | Posted through Studio in Chrome: crusts public (`-UBSMfHlFkk`, comment pinned), dinner and leftovers scheduled 6 and 8 Nov at 5 PM Pacific | Studio checks clean. The registry was seeded with the 9-app roster and the channel's 12 earlier app Shorts as a baseline |

## Lessons

- 2026-11-04: The channel's best Shorts before this skill were a 7 s calm alphabet loop (about 1.3K views at day 3,
  207% average viewed) and plain "Search Newsworthy in the App Store" clips (1.1K and 250); its feature demos and
  "coming soon" clips sat at 1–88. Short, loopable and simple beat long and explanatory.
- 2026-11-04: Chrome's `file_upload` only reads the session's folders; Studio's schedule time field ignores
  typing; the captions and thumbnail uploaders have hidden file inputs that take files without opening a picker.
- 2026-11-04: Uploading an `.srt` that repeats burned-in captions shows the text twice for viewers with captions on.
