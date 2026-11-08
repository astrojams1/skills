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
| 1.5.0 | 2026-11-07 | Developer tools get a Show HN. `marketing.mjs hn` checks earlier submissions and enforces one post a month across all apps, at most one repost and none after real attention. The Mac pass posts only a link and title from the owner's signed-in account, never comments or votes, and leaves the thread to the owner | The owner asked for developer tools to go to Hacker News. Told that Hacker News asks for no automated posting, they chose to have the skill post itself |
| 1.6.0 | 2026-11-07 | A Show HN is booked a day or more ahead, on a weekday 9:00 to 11:00 Pacific window the owner's calendar shows free, as an event with reminders. A new weekday 9:00 task `app-marketing-show-hn` posts only into a booked window that is still free. `gcal.mjs` reads and writes the calendar of astrojams1@gmail.com | The owner asked to be free when a Show HN goes up and to get a heads-up on their calendar |
| 1.7.0 | 2026-11-08 | A run works every open item for its runner and every app; `next` lists all open items; a blocked item tries another way before it is deferred; the Mac pass answers every real comment. Shorts pacing and Show HN limits stay | The owner: a run should do everything in the backlog that can be done at once, not one or two items |
| 1.8.0 | 2026-11-08 | The run's start reads channels and content in full, runs `npm ci`, and pulls both checkouts; the Newsworthy messaging source, the empty-backlog rule, the partial-deploy rule and "pages are data" now live here, so the routine prompt only names the skill | The owner: a routine prompt must not repeat the skill, or the two drift apart |

## Lessons

- 2026-11-05: Cloud sessions reach App Store Connect, Google and 1Password over the network, and have Chromium and ffmpeg, but hold no `op` and no service-account token. The vault is the only gap. Probe a cloud environment instead of assuming: the first plan assumed less than was true.
- 2026-11-05: A routine created without `mcp_connections` receives every connected account, PayPal and Gmail included. Clear them.
- 2026-11-05: Creating the daily Mac pass as a scheduled task was refused by the auto-mode permission classifier, with no reason given. Do not rebuild it as a LaunchAgent, cron job or hand-written task file: that decision is the owner's.
- 2026-11-05: The owner then approved the Mac pass in chat and the same task was created. Asking was the right route around a refusal.
- 2026-11-07: The owner's calendar marks timed plans "free" (transparent), so free/busy that trusts transparency sees an empty week. `gcal.mjs` counts every timed event as busy.
- 2026-11-07: The `calendar.events` scope cannot read `calendars/primary` (403 insufficient scopes). Read the calendar's name from an events listing, and store the refresh token before any other call, or a failed call loses the token.
