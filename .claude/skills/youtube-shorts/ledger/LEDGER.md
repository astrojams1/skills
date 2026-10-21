# youtube-shorts — ledger

The skill's own record: versions, safe-zone measurements, runs and open
issues. Append-only: add rows and entries, never rewrite them. A later finding
that overturns an earlier one says so in its own row. Read **Measurements**
and **Open issues** before every run.

## Versions

| version | date | change | why |
|---|---|---|---|
| 0.1.0 | 2026-10-21 | Initial skill: measured zones (`assets/zones.json`), contact-sheet checker (`safe-zone.mjs`), screenshot fit (`fit-screenshot.py`), safe-zone and posting references. | Newsworthy's trailer, posted as a Short, had its headlines under the top controls and its cards under the rail and title stack; nothing in the workflow had looked at the phone. |

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

## Open issues

| id | first seen | issue | workaround / proposed fix | status |
|---|---|---|---|---|
| 1 | 2026-10-21 | Only one device and only the owner's view are measured | Measure a viewer's view, an Android phone and a two-line title with a Related video row | open |
| 2 | 2026-10-21 | TikTok and Reels share the file but have their own overlays | Measure each with `fit-screenshot.py`; consider per-platform zones in `zones.json` | open |
| 3 | 2026-10-21 | The checker shows zones but does not find text in them | For code-rendered video, assert element boxes against `zones.json` in the project's tests | open |
