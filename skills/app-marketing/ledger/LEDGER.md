# app-marketing: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-run facts live in `marketing/` in
`astrojams1/app-sites`, and in the owner's activity ledger.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-05 | Initial skill: per-app profiles, derived item state, append-only ledger and metrics, cloud and Mac runners | The owner asked for continuous marketing across apps that never depends on them |
| 1.0.1 | 2026-11-05 | Only `action` events change an item's state | The first cloud run logged "passed over press-page" as a `finding` with status `ok`, which counted as finishing it |
| 1.0.2 | 2026-11-05 | The Mac pass is scheduled | The owner approved it in chat after the first attempt was refused |
| 1.1.0 | 2026-11-06 | Every released app on both teams runs a full campaign unasked; runs write any missing profile. Closed channels stay closed | The owner said every released app runs full campaigns, Shorts included, and they do not approve each |
| 1.2.0 | 2026-11-06 | Replies on the owner's own YouTube channel and channel settings are open | The owner removed these last approvals |
| 1.3.0 | 2026-11-06 | The Mac pass answers up to five YouTube comments a run | The owner wants comment replies running unattended |
| 1.4.0 | 2026-11-07 | Store listing text and data are this skill's call and merge without asking; a repository rule holding them is changed in the same PR | The Mac pass held Space Worms keywords in a draft for the owner, who said these are decisions to make without them |
| 1.4.1 | 2026-11-07 | `pull` tracks report instances by processing date (`processedThrough`), so a pull counts each instance once | It compared processing dates with the last data day, so every pull re-added the newest instance: a second pull on 2026-11-07 took Newsworthy from 3 to 5 with no new data |

## Lessons

- 2026-11-05: Cloud sessions reach App Store Connect, Google and 1Password over the network, and have Chromium and ffmpeg, but hold no `op` and no service-account token. The vault is the only gap. Probe a cloud environment instead of assuming: the first plan assumed less than was true.
- 2026-11-05: A routine created without `mcp_connections` receives every connected account, PayPal and Gmail included. Clear them.
- 2026-11-05: Creating the daily Mac pass as a scheduled task was refused by the auto-mode permission classifier, with no reason given. Do not rebuild it as a LaunchAgent, cron job or hand-written task file: that decision is the owner's.
- 2026-11-05: The owner then approved the Mac pass in chat and the same task was created. Asking was the right route around a refusal.
