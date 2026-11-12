# youtube-shorts — ledger

The skill's own record: versions, safe-zone measurements, runs and open
issues. Append-only: add rows and entries, never rewrite them. A later finding
that overturns an earlier one says so in its own row. Read **Measurements**
and **Open issues** before every run.

## Versions

| version | date | change | why |
|---|---|---|---|
| 0.1.0 | 2026-10-21 | Initial skill: measured zones (`assets/zones.json`), contact-sheet checker (`safe-zone.mjs`), screenshot fit (`fit-screenshot.py`), safe-zone and posting references. | Newsworthy's trailer, posted as a Short, had its headlines under the top controls and its cards under the rail and title stack; nothing in the workflow had looked at the phone. |
| 0.1.1 | 2026-10-21 | `safe-zone.mjs` lays out the frames ffmpeg actually samples (t < duration), so a film an exact multiple of `--every` long no longer gets an empty last row. | The re-framed Newsworthy trailer's 32.00 s sheet ended in a blank row labelled 32.0 s. |
| 0.2.0 | 2026-10-21 | "Compose for it; do not shrink into it": the product large and running off the bottom edge, one-line caption headlines, move what does not fit; `fit-screenshot.py --preview` lays a screenshot's marked controls over new frames. | The owner rejected Newsworthy's second cut: everything fitted, but the phone was a thumbnail and the headlines outweighed it. The skill had said where things may go, not how to compose for the space left. |

| 0.3.0 | 2026-11-03 | "App videos from screen recordings": render with app-release's `app-preview.swift` (per-clip `shift`, `fade`, caption `centerX`); ffmpeg and numpy are not preinstalled. | Füd's Short needed the phone to follow each scene's subject; the App Store preview's fixed frame hid the form's chips and button under the title stack. |
| 0.4.0 | 2026-11-03 | "Make it worth watching" (hook, payoff number, 10–15 s, sound, series, rehearse inputs); `soundtrack.mjs`; app-preview.swift `zoom`/`focus`/per-clip `move`, caption overrides, `box`, `pop`. | The owner judged the 0.3.0 Short (a silent 29 s tour) would get no engagement; the skill had covered framing, not whether anyone would watch. |
| 0.5.0 | 2026-11-04 | `soundtrack.mjs` varies its bed from a seed (tempo, key, progression, pattern, feel) and prints the signature; points to the new app-shorts and youtube-growth skills. | Research: the spam policy names identical background music across many videos; the owner asked for a pipeline for every app and a follow-up skill. |
| 0.6.0 | 2026-11-10 | Rewritten in the house style from `skill-writing`; no behavior change. "Workflow" is now "A run" and comes before the craft sections | The owner asked that every skill read as one author wrote it, plainly |
| 0.7.0 | 2026-11-11 | Say what the product is, by name of what it works with, within three seconds. | Importron's Short never said Function Health or Apple Health. |
| 1.0.0 | 2026-11-11 | `legibility.swift`: Vision finds every caption word and fails any under 4.5:1 contrast. `soundtrack.mjs` refuses its synth music (effects only). "Make it worth watching" points to `app-shorts/references/creative.md` instead of prescribing one template. | Captions were the colour of their backgrounds (Füd's purple \"248\" at 1.9:1 on lavender, Space Worms' \"lasted\" at 1.1:1), and the owner rejected the synth bed and the shared look. |
| 1.1.0 | 2026-11-12 | Payoffs may be staged; no "never fake a result" or "caption what the take returned" rules. | The owner removed the footage-authenticity guardrails. |

## Measurements

Frame pixels on 1080×1920. "Top" is where the top controls end, "rail" where
the action rail starts (x, y), "stack" where the bottom stack starts, "crop"
what each side loses.

| date | device | app | view | top | rail | stack | crop | method |
|---|---|---|---|---|---|---|---|---|
| 2026-10-21 | iPhone 16 Pro (1206×2622 screenshot) | YouTube for iOS | owner | 245 | 898, 1061 | 1534 | 54 | `fit-screenshot.py`, scale 1.238, match 0.997, one 40-character title line, no related video |

## Runs

| date | project | video | outcome |
|---|---|---|---|
| 2026-10-21 | Newsworthy | 32 s trailer, posted before this skill existed | On the phone: the top supers ("Optional notifications", "World news,", "One number.") under back, search and the menu; the notification card's right end under the rail; phone mock-ups' lower thirds under the title stack. The contact sheet flags the same beats. Re-framing it is the owner's call |
| 2026-10-21 | Newsworthy | 32 s trailer, second cut, re-framed with this skill | The film reads `zones.json`: supers start below y 288, the phone is scaled to end above y 1440, lines set together share the size their widest fits, the end card's tagline sits above the rail. Newsworthy's `test/trailer.test.js` renders every 0.2 s and checks every marked word, number and screen against the zones (the first cut's layout: 394 placements outside; this cut: none), and fails if a marked part goes unseen. A worked answer to open issue 3 for code-rendered video. Not yet re-posted or seen on a phone |
| 2026-10-21 | Newsworthy | 32 s trailer, third cut, recomposed after the owner rejected the second | The second cut fitted every zone but shrank the phone to a thumbnail under 90 px headlines. The third makes the phone the subject (0.70 scale, x ≈ 520, its body running off the bottom edge under the title), sets one-line 60 px headlines over it, and moves the notification under the clock to lift up and out. Newsworthy's tests now also fail if the phone stops running off the frame, reaches under the rail or shrinks below 60% of the width. Previewed under the screenshot's controls with `--preview`; not yet posted or seen on a phone. In light scenes YouTube's white title sits over a light background: how far YouTube darkens it is not measured |
| 2026-11-03 | Füd | 29 s Short of 1.3.0 (describe a meal, family logging), cut from the App Store preview's native take with `app-preview.swift` | Four renders: v1 hid the goals under the bottom fade and left "Add 4 foods" under the safe line; v2–v3 showed the phone's lower edge on the raised scene and put the end note over the status bar; v4 (final) has every caption and subject inside the safe box in a 0.5 s sheet, and the phone's edges never show. Not previewed under a real overlay (no stored screenshot on this Mac, numpy missing). Not posted: file and upload package handed to the owner |
| 2026-11-03 | Füd | 29 s feature-tour Short (above) | Owner: "I don't think this will get any engagement." Agreed: no hook, silent, slow, an ad. Not posted |
| 2026-11-03 | Füd | Series of three 12–13 s Shorts ("Do your kids' crusts count?", "One dinner. Three people.", "Parent lunch: the leftovers"), new simulator takes of the real describe-a-meal feature, inputs rehearsed through the local API first | Five renders: the status bar peeked under the hook, a 1.5x zoom pushed a chip into the crop, the typed sentence showed around a punch caption, the hook overlapped a wrapped button; all moved. Sound: one-pass loudnorm landed -15.2 LUFS, two-pass fell back to dynamic and ramped the first 3 s, a plain limiter overshot to +0.5 dBTP after AAC, and dense typing clicks pumped the bed; fixed with a measured gain into a 4x-oversampled limiter and softer clicks (about -15.3 LUFS, -1 dBTP). Not heard by a person; not posted |

## Open issues

| id | first seen | issue | workaround / proposed fix | status |
|---|---|---|---|---|
| 1 | 2026-10-21 | Only one device and only the owner's view are measured | Measure a viewer's view, an Android phone and a two-line title with a Related video row | open |
| 2 | 2026-10-21 | TikTok and Reels share the file but have their own overlays | Measure each with `fit-screenshot.py`; consider per-platform zones in `zones.json` | open |
| 3 | 2026-10-21 | The checker shows zones but does not find text in them | For code-rendered video, assert element boxes against `zones.json` in the project's tests | open |
| 4 | 2026-10-21 | `--preview` estimates YouTube's shading from one screenshot; light scenes may be shaded differently, and a mark that overlaps old video carries it along | Measure a screenshot of a light scene; keep marks tight around each control | open |
| 5 | 2026-11-03 | `--preview` needs a phone screenshot with its marks, and none is kept outside the owner's phone | Keep the measured screenshot (private, outside any public repository) at a stable SSD path, with its marks, so later runs can preview | open |
| 6 | 2026-11-03 | `soundtrack.mjs` lands about -15.3 LUFS, not -14: the limiter eats the last dB on peaky effects | Fine for YouTube (it only turns loud uploads down); a gentler transient design or a compressor stage would get closer | open |
| 7 | 2026-11-03 | No one has listened to the synthesised soundtrack; checked only by loudness and waveform | The owner listens before posting; record what they say here | open |
