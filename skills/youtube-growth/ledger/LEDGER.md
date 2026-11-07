# youtube-growth — ledger

The skill's own record: versions, experiments and lessons. Append rows; never rewrite them. The numbers live in the
app-shorts registry; each run goes in the owner's activity ledger.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-04 | Initial skill: reads at 3, 7 and 28 days; `evaluate.mjs` with sourced `rules.json` (channel quantiles, low-confidence fallbacks); `yt-api.mjs` (OAuth into 1Password, analytics, comments, upload and scheduling); API, metrics and policy references from research dated 2026-11-04. | The owner asked for a skill that follows up on every Short and works to maximise the channel's metrics across all apps. |
| 1.0.1 | 2026-11-06 | Uploads, pins and metadata edits on a released app's Shorts follow the standing instruction in `app-shorts`. | The owner does not approve each app's Shorts. |
| 1.1.0 | 2026-11-06 | Comment replies and channel settings need no go-ahead. | The owner removed these last approvals. |

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
