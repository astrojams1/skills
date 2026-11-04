---
name: app-shorts
description: Keep every app the owner ships on YouTube with a Shorts series — one registry for both App Store teams (Ouro and the personal James Thompson team), a series format per app, fresh recordings of the real app with rehearsed inputs, a 10–20 s edit with a hook, a real payoff and sound, posting and scheduling on the owner's channel through YouTube Studio (or the API once connected), and links back to the App Store and the marketing websites. Use whenever the owner asks for Shorts, a YouTube video, TikTok/Reels-style promo or "marketing videos" for any app; when app-release ships a visible feature; when `shorts.mjs plan` shows an app due; and to post or schedule a rendered episode. Pair with youtube-growth for the follow-up.
metadata:
  version: "1.0.0"
  ledger: ledger/LEDGER.md
---

# App Shorts

Every app gets a steady drip of Shorts on the owner's one channel, each a moment from the real app that a parent
(or a player, or a reader) would stop scrolling for. A feature tour is an ad and gets swiped; this skill exists
because the first Füd Short was exactly that and the owner said so. The craft (framing, safe zone, soundtrack) is in
`youtube-shorts`; the follow-up (metrics, decisions, comments) is in `youtube-growth`. This skill is the pipeline
that connects them for every app.

## Files

| File | What it is |
|---|---|
| `scripts/shorts.mjs` | The registry (`/Volumes/ssd/projects/app-shorts/registry.json`): `roster`, `sync`, `record`, `plan`, `due`, `link`, `status` |
| `references/formats.md` | Series shapes that work for apps, a seed format per app, the rules every episode follows |
| `references/recording.md` | The real-app recording rig (simulator lease, synthetic data, rehearsal, staging path, cleanup) |
| `references/posting.md` | Posting and scheduling through Studio in Chrome, step by step with its traps; the API route; cadence |
| `references/coordination.md` | Releases, App Store attribution links, promotional text, the marketing websites, channel settings |
| `ledger/LEDGER.md` | Versions and lessons. Read before a run |

## A run

`S` is this skill's `scripts/` (in an app repository, `skills/skills/app-shorts/scripts`). Node 22, no dependencies.

1. **Read the state.** `node $S/shorts.mjs sync` (new apps from `app-release.config.json` files), then `status`,
   `due` and `plan`. Read this ledger and `youtube-growth`'s latest decisions (`evaluate.mjs`): a format marked
   `drop` gets no new episodes; `double-down` gets the next slot.
2. **Pick the episode.** From the plan's `needsProduction`, or the app the owner named. Choose its format
   (`references/formats.md`) and the input: a comment from the series, a release's new feature, a rehearsed idea.
3. **Record the real app** (`references/recording.md`): synthetic data, rehearse inputs through the real feature,
   keep the take whose real result is the payoff, find each moment's source time on contact sheets.
4. **Edit for YouTube** with `app-release/scripts/app-preview.swift render` at 1080x1920: a hook as boxed text
   mid-screen in the first second, typing slowed and waiting sped up, a `zoom` punch-in on the result with a `pop`
   caption, a comment prompt and "Search '<App>' on the App Store" at the end, 10–20 s, ending where it began. Keep
   the spec in the app's repository (`store/source/shorts/<episode>.json`).
5. **Check and score it** with `youtube-shorts`: `safe-zone.mjs` contact sheets until nothing readable crosses a
   zone, then `soundtrack.mjs` for the bed and cued effects, seeded per episode so no two Shorts share a bed (record
   the printed signature as the episode's `music`). Look at the hook and payoff frames full size, and have the
   owner (or the run's reviewer) watch the final cut before it posts.
6. **Package** title (about 40 characters, hook first), description (what the app did, then one line on the app
   and "Search '<App>' on the App Store"), three hashtags, a JPEG cover and the pinned comment. Write it in the
   episode's upload notes.
7. **Post or schedule** on the owner's go-ahead (`references/posting.md`): one Short every two days across the
   channel, rotating apps, at the plan's slot, through Studio or `yt-api.mjs upload`. `record` the episode with `videoId`, `status` and `postedAt` or
   `publishAt` immediately.
8. **Hand over to `youtube-growth`:** it reads metrics at 3, 7 and 28 days, pins comments on Shorts that have gone
   live, and decides what the next episode should change.
9. **Log:** the app repository's run notes, the activity ledger, and this ledger for anything reusable.

## Rules

- **Real app, real result.** Every number and screen in a Short is what the shipped build did in that take,
  with synthetic data. No mock-ups, roadmap features or edited outcomes.
- **Owner's channel, owner's go-ahead.** Posting, scheduling, comments and channel settings act as the owner. A
  request to post a series covers that series; a new series or app needs its own go-ahead. Never create accounts or
  channels.
- **No private data on camera,** including the owner's own: no real journals, labs, contacts or notifications.
- **Parents are the audience, not children.** Mark Shorts "not made for kids" unless the video really is for
  children; never film children.
- **Vary the inputs, keep the shape.** A series of real, different moments is a series. The same clip re-cut with
  new captions is the "inauthentic, mass-produced" content YouTube demonetises and buries (`youtube-growth`,
  `references/policy.md`).

## Gotchas

- **Chrome's `file_upload` reads only the session's folders:** copy files to the scratchpad before uploading.
- **Studio's schedule time ignores typing;** pick the time from its list.
- **A scheduled Short cannot take a comment** until it is live; `due` lists it when its time passes.
- **Burned-in captions plus an `.srt` show twice** for viewers with captions on.
- **Results vary between runs** of an AI feature: caption the take, not the rehearsal.
- **The registry is the memory.** A Short that is not in it is not followed up; record before moving on.

## Ledger

`ledger/LEDGER.md` is append-only: versions, lessons and runs that taught something. Per-episode facts live in the
registry; per-app run notes in the app's repository.
