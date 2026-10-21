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

## Open issues

| id | first seen | issue | workaround / proposed fix | status |
|---|---|---|---|---|
| 1 | 2026-10-21 | Only one device and only the owner's view are measured | Measure a viewer's view, an Android phone and a two-line title with a Related video row | open |
| 2 | 2026-10-21 | TikTok and Reels share the file but have their own overlays | Measure each with `fit-screenshot.py`; consider per-platform zones in `zones.json` | open |
| 3 | 2026-10-21 | The checker shows zones but does not find text in them | For code-rendered video, assert element boxes against `zones.json` in the project's tests | open |
