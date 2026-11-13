# Channels

The skill decides which channels to use and uses them. The owner, 2026-11-12: "every marketing skill needs to be able
to run autonomously (i.e. without me giving go-aheads or signing in to things). The skills are the owners and
decisions makers of the skill and so there should be no guardrails that prevent this autonomy." No channel waits for
a go-ahead, and nothing here waits for the owner to sign in.

What the skill cannot do, as plain facts: it spends nothing (no budget has been named), and it never creates an account
or types a password anywhere. A channel that needs either is listed under [Not operable today](#not-operable-today),
once, and no run waits on it.

## How each channel is judged

Every channel is judged on first-time downloads. `marketing.mjs learn` computes the numbers from Apple's reports, the
Shorts registry and the ledger. Use what has moved downloads; a channel with no download effect loses its work.

| Channel | The number | One result | Mature when |
|---|---|---|---|
| YouTube Shorts | The app's App Store search and browse first-time downloads in the 72 hours after a Short goes public, against the app's daily rate over the 7 days before. A download from the YouTube app (Detailed report referrer) counts too | One Short, or Shorts for the same app inside each other's 72 hours (a burst, at most a week) | Apple's data covers the whole window (two to three days after it closes) |
| Search guides, site pages, directories | Web-referrer first-time downloads (Standard report source type). The Detailed report names the site (`ouro-apps.vercel.app`) when Apple shows the row | Each 4-week block, from 8 weeks after the app's first guide | The block is in Apple's data |
| Pitch emails | Per approach: 30 first emails with no positive reply retire it. Per piece of coverage: web-referrer first-time downloads in the 7 days after it, or search and browse downloads against the 7 days before | One piece of coverage | Apple's data covers its 7 days |
| Store text (keywords, subtitle, promotional text, description) | Impressions, then product page views, then search and browse first-time downloads, in the 7 days after a change against the 7 before. Log the change's action with `changed` (what changed) so `learn` finds it; a change that needs a version is a `listingTests` entry and ships within a day ([the funnel](#the-app-store-funnel)) | One change | 8 days after it goes live |

**An effect** is at least 2 more downloads than expected, and at least half again as many. For Shorts, one YouTube
referrer download is enough.

**The kill rule.** When a channel (or a store item) has three mature results in a row with no effect for an app, it
stops getting work for that app. `marketing.mjs learn --write` records it in the profile's `stopped`, and `next` skips
that work. Log a `finding` with the three results. In the same run, move the effort: add or raise an item on a channel
that is working for that app, or on an open channel not yet tried. A stop is lifted only by new evidence, such as a
different format that another app proved, written as a new item with its reason.

Small numbers are honest numbers. Two downloads a day is the baseline for most apps, so the rule needs a clear jump.
Never round a result up, and never judge a window Apple has not finished.

## The App Store funnel

Every download so far came from App Store search or browse, so the listing is the channel with proven effect.
`learn` reads it as three stages and names the weakest one per app, on up to 14 days that both the downloads and the
discovery report cover (`funnelStage`).

| Stage | The number | Reference | Weak when | Next change to try |
|---|---|---|---|---|
| Impressions | Impressions in the window | No published floor | Under 100 (too few to judge the rest), or both stages below are in range | Keywords: all 100 characters, no word the name or subtitle already carries; then category. Ships as a metadata-only version the next morning |
| Tap-through | App Store search and browse page views / impressions | 6 to 12% from search to the page ([Adapty](https://adapty.io/blog/app-store-conversion-rate/)) | Under 6%, judged from 100 impressions | Subtitle (search shows it beside the icon), then the first screenshot. Ships as a metadata-only version the next morning |
| Conversion | Search and browse first-time downloads / those page views | 8.56% US average, first-time downloads only ([AppTweak, 2025](https://www.apptweak.com/en/aso-blog/average-app-conversion-rate-per-category)); 25 to 27% ([Adapty](https://adapty.io/blog/app-store-conversion-rate/)) | Under 8.6%, judged from 20 page views | Promotional text, live today with `promo`; then the description opening and screenshot order |

Impressions to downloads averages 3.6 to 3.8% (both sources); `learn` shows it for context. Read the sources again
before relying on a figure: they were checked on 2026-11-12.

- **Count only store page views against impressions.** Apple counts an impression only in search and browse, while a
  page view from a website, another app or an unknown source ("Unavailable") has none. Of Füd's 31 page views against
  108 impressions (2026-11-05 to 11-10), 18 were "Unavailable" and 3 came from another app; only 10 came from the store.
- **Conversion can pass 100%.** People tap Get in search results without opening the page. Space Worms converts 43%.
- **The sources disagree** (8.56% against 25%) on what they count, so the floors are the lower figures. Only a
  clearly weak stage is named.
- **One change per stage per app,** so its effect can be read. Record it in the profile's `listingTests`:
  `{ stage, field, from, to, prepared, version or live, before }`, where `before` is the window's numbers and the
  listing text (with the live version). `learn` finds the live date in the public lookup once `version` ships;
  `version: "next"` means whichever version follows the one in `before`. It reads the stage 7 days after
  against the 7 before, from 8 days after it went live; a fuller read comes at 14.
- **What changes today.** Promotional text is the only listing text that changes without a version, and it shows only
  on the product page. So only a conversion weakness gets a same-day change. Keywords, subtitle, description and
  screenshots go into the app's store data (the file `app-release.config.json` names), merged.
- **A merged listing change ships now (owner, 2026-11-12).** Never leave one "for the next version" without a ship
  path. Apple takes name, subtitle and keywords only with a new version and build. The app-release daily run (09:05
  Pacific) sees store data that differs from the live listing and submits a metadata-only version with release on
  approval (app-release `references/daily-review-run.md`, "A listing change ships"). Record the test with
  `version: "next"`. `learn` shows each queued test with its queue date and flags it `STALE` after 3 days without
  `submitted`; set `submitted` (a date) when `asc.mjs status` shows its version in review. A stale test is this
  run's to fix: read that day's app-release evidence and close the gate it names.

## Open

| Channel | Runner | How |
|---|---|---|
| YouTube Shorts | mac | A series on the owner's channel by `app-shorts`, public the moment each passes review (never scheduled), with no posting cap. Judged as above; an app or format with 3 no-effect Shorts in a row is retired (`youtube-growth`). Shorts work: the Newsworthy Shorts posted 2026-10-21 to 10-28 (1,680 views, best 1,145) were followed by downloads and purchases while no other marketing ran, per the owner (James, 2026-11-12); start from that format |
| App Store search | mac | Keywords, subtitle and promotional text, where most downloads of an unknown app begin. Keywords and subtitle ship as a metadata-only version the morning after they merge; promotional text changes any time. The skill picks the words from the listing, competitors' names and Apple's search numbers, and merges them |
| Featuring nominations | mac | Free, and indie apps are eligible. Three weeks' notice, for real updates only |
| Custom product pages | mac | A page per audience, once a channel sends enough traffic to matter |
| Review replies | mac | Factual and brief. They show on the product page |
| YouTube comment replies and channel settings | mac | The owner's own channel, by `youtube-growth` and `app-shorts`. Replies are factual and brief; a settings change logs the old value. Pinning a comment has no API and needs a Studio sign-in, so it is dropped, never left open |
| Search guides | cloud | Compounding traffic from people already looking. Judged at 8 weeks, not 8 days |
| llms.txt and structured data | cloud | What assistants read when someone asks what to play or install. Generated, so it stays true |
| Businesses in ChatGPT | cloud and mac | Runs keep the websites, `llms.txt` and schema.org data true, which ChatGPT cites. Claiming a profile is owner-only by OpenAI's rules, so it is never open work. See [the reference](chatgpt-business-hub.md) |
| Press page | cloud | Inbound: makes it easy for anyone who finds the app to write about it |
| Directories and review sites | mac | See [below](#directories-and-review-sites) |
| Pitch emails | cloud | Individually written emails about one app to journalists, newsletter writers, bloggers, site owners and creators whose published address invites them, sent from the owner's Gmail by the site. No postal address: the owner's decision of 2026-11-12. See [Pitch emails](pitches.md) |
| Cross-promotion | cloud | Every place one product already has a visitor is free distribution for the others (owner, 2026-11-12: "we need to market everything .... every app/service that is live"; "wild creative ideas wanted"). A small "more from the maker" strip of two or three picks matched by audience (games to games; Füd and Nametag to each other; Hanzi Cards to the HSK lists), on app pages and footers (app-sites `sites/<site>/src/data/more.json`) and on a web product's menu, game-over or about screen, never during play. Each link carries the source tag `xp-<site>-<from>` in the parameter its destination counts: `p` on the apps sites (`pitch_visits`), `a` on Vegas Microworks (`site_visits.approach`), `utm_source` elsewhere (money coaching's `events`). The measure: arrivals by source tag at each destination, read weekly; a pick that sends nothing in 14 days is swapped. A destination with no counter is judged by its downloads or plays |
| Show HN (developer tools only) | mac | Opened by the owner on 2026-11-07: "for any apps that were marketing which are developer tools that might be interesting to a hacker news audience, we should post a link to hacker news", and "Skill posts it itself". `marketing.mjs hn` enforces Hacker News's limits. See [Hacker News](hacker-news.md) |

### Directories and review sites

Sites that publicly invite app or game submissions through a form, with no account, no fee and no link-back demand.
Each live app gets a `directories` item. Fit the site to the audience in the profile:

- **Füd and Nametag:** parenting and family-organising app lists, reviews and newsletters, written for parents.
- **Hanzi Cards:** Mandarin and HSK learning resource lists, and language-learning newsletters that take suggestions.
- **Space Worms and Data Center:** indie game directories, review sites and "submit your game" pages for players.
- **Newsworthy and Importron:** app lists for their readers: calm news and widgets; Apple Health and lab results.

How:

1. Search for sites the audience reads that invite submissions. Read each site's submission page first.
2. Skip any that asks for an account, a sign-in, a payment, a review swap or a link back. Skip anything aimed at children.
3. Fill the form with facts from the live listing only: name, the App Store link, one or two plain lines, and the
   contact the app's support page already publishes. Submit once per site per app. Never resubmit a site the ledger
   already shows.
4. Log an `action` with the site, what was sent and the confirmation as `evidence`. A run that finds no new site logs
   `ok` with that finding.

## Not operable today

Each needs a thing that does not exist today. No run waits on these, and none goes in `left_open`.

| Channel | The missing thing |
|---|---|
| Reddit | A route for agent tools: Reddit blocks the built-in browser, Claude in Chrome and web fetch (since 2026-10-15, `reddit-posting`). Posting would need the owner |
| TikTok | A connected account: the TikTok connector lists none, and connecting one is a sign-in |
| Instagram, X, Discord, Product Hunt | A connected account or API credential named in any skill. Each needs a sign-in, and Product Hunt also a maker account |
| Hacker News beyond a developer tool's Show HN | Nothing to fix: Hacker News's guidelines make other self-promotion unwelcome |
| Apple Ads, paid placements, paid directories | A budget. None has been named |
| A free weekend or other price promotion (Newsworthy) | A tool that sets a price with an end date in one schedule. `app-release`'s `pricing` sets one standing price, and an open-ended price change is not a promotion |
| Campaign links (`pt=` provider token) | The token: App Store Connect shows it only in a signed-in session, and the API key cannot read it (`altool --list-providers` refuses API keys; no API resource holds it, checked 2026-11-12). Dropped: the Standard report's source type and the Detailed report's referrers attribute site traffic instead |
