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
| 2.0.0 | 2026-11-11 | Every Short starts from a blank creative plan (`references/creative.md`): its own idea, look, type, palette and score, at least three dimensions new to the channel, logged in `ledger/experiments.md`. Music is scored from Apple Loops or real sound per Short; the synth bed is retired. Each cut is watched and fixed for at least two rounds, checked with `legibility.swift`, and ships only at 8/10 on every line of the bar from us and an independent reviewer. No posting calendar: post when it clears the bar. | The owner reviewed the channel: every Short looked and sounded the same, none said what its app was, captions were the colour of their backgrounds, the two-day schedule had no basis, and there was no proof any of it worked. All nine template Shorts were taken down. |
| 2.1.0 | 2026-11-12 | The bar gains line 9: obviously an iPhone app and obviously easy. No pricing lines in Shorts. A contact sheet is not watching: judge full-size frames of the opening and transitions as a viewer would. Owner verdicts recorded in `references/creative.md`. | The owner rejected the Importron robot cut ("you cant even tell its an iphone app… ugly and complicated… 'first pdf is free' is a turn off") and the Space Worms documentary ("font story sound all bad"); both had passed every automated check and been approved from stills. |
| 2.2.0 | 2026-11-12 | The posting gate is a panel of three independent reviewers (viewer, editor, skeptic) who never see the plan; post when all three say POST (every line 7+, lines 1, 2 and 9 at 8+), without asking the owner. | The owner: "stop depending on me. use independent reviewers and get their feedback. post when everyone is happy." |
| 2.3.0 | 2026-11-12 | The panel gives feedback, not a pass mark: at most three rounds, then fix the concrete faults it named and post. | No Short passed the 2.2.0 gate in 13 attempts, and on three cuts the panel ranked the owner's own verdicts in reverse. The owner: "each round the reviewers provide feedback. max 3 rounds." |
| 2.4.0 | 2026-11-12 | Start from what worked: watch and rank the channel's best Shorts before planning; the three best are the reference in every plan and reviewer pack. Gimmicks are not creative risk. No gambling imagery for Vegas Microworks. | The owner rejected all five scheduled remakes ("every one of these is horrible. have you looked at our best performing shorts and taken any lessons from them? clearly not"); they had been pulled before going live. The best performers were simple, short, calm and full of the product's own visuals; the remakes were the opposite. |
| 2.5.0 | 2026-11-12 | Footage may be staged, scripted, reused, composited or edited; developer arenas and debug modes are fine; no autopilot/staged disclaimers; no "fresh recording every Short" rule; apps not yet on sale get Shorts too. The one line: don't show a feature the product doesn't have. | The owner: kill the guardrail that gameplay must be filmed in a real game, and every other hall-monitor guardrail. A Space Worms Short settled for a weaker real moment after 48 minutes of autopilot found no giant kill, when the developer arena could stage one. |
| 2.6.0 | 2026-11-12 | No posting cap: post every Short as soon as it is ready, several a day. Every Short is "not made for kids". | The owner: "What is the logic of only showing one short per day? I have way too many apps to be so reserved." and "always mark these shorts as not made for kids, because if you mark it as for kids, then it turns off commenting." |

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
- 2026-11-12: Chrome's CDP screencast (`Page.startScreencast`) delivers frames at CSS pixels (390x844 for a 390-wide
  viewport) whatever the device scale factor, so a cut built from it is a 2.8x upscale and reviewers call it soft. For a
  web build, install the page clock (`page.clock.install`) and step it, taking a `page.screenshot` per frame: true 3x
  frames (1170x2532), deterministic timing (Data Center dc-first-01).
- 2026-11-12: An Apple Loop's name says nothing about gaps. Bedlam Synth Layers and Airy Vox Synth drop below -70 dB
  for 50 ms windows; measure each loop with `astats` at 50 ms (`asetnsamples=2400`) before building a bed on it.
