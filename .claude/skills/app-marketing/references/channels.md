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
| Store text (keywords, subtitle, promotional text, description) | Impressions, then product page views, then search and browse first-time downloads, in the 7 days after a change against the 7 before. Log the change's action with `changed` (what changed) so `learn` finds it; a change that needs a version is a `listingTests` entry and ships within a day ([the funnel](#the-app-store-funnel)) | One change, or overlapping changes read together ([the funnel](#the-app-store-funnel)) | 8 days after it goes live |

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
| Impressions | Impressions in the window | No published floor | Under 100 (too few to judge the rest), or both stages below are in range | Keywords: all 100 characters, no word the name or subtitle already carries, leaning to the broadest terms the app truly fits ("Where the downloads came from"); then category. Ships as a metadata-only version the next morning |
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
- **Changes may overlap; record each one.** No rule from the owner limits an app to one listing change at a time. The
  limit this skill used to carry ("one change per stage per app", added by an agent with `learn` on 2026-11-12) was a
  measurement convenience, and on 2026-11-19 it was the reason an agent held back a reach change while App Store
  search, which brought 209 of 343 lifetime downloads, was starving for impressions. The owner's standing rule wins:
  new tactics go live at once as provisional experiments and are kept only if they prove successful (James,
  2026-11-13: "This is how we should be approaching all things"). So a reach change (keywords, subtitle, category,
  languages) ships the day it is ready, even while another listing test on the same app is in flight.
  Record every change in the profile's `listingTests`: `{ stage, field, from, to, prepared, version or live, before }`,
  where `before` is the window's numbers and the listing text (with the live version). `learn` finds the live date in
  the public lookup once `version` ships; `version: "next"` means whichever version follows the one in `before`. It
  reads the stage 7 days after against the 7 before, from 8 days after it went live; a fuller read comes at 14.
- **What overlapping changes cost, and how to read them.** When two changes to one app go live inside each other's
  read windows, the numbers cannot say which change moved them: attribution between them is lost, and only their
  sum can be judged. Read an overlapping change three ways and say which you used: (1) against the app's own
  baseline before the first of the overlapping changes went live (the combined effect); (2) against the apps that
  changed nothing in the same window (the store's own drift: season, featuring, Apple's ranking changes); (3) by
  stage, since a keyword change shows first in impressions and a subtitle or screenshot change first in tap-through,
  so changes to different stages separate partly even when they overlap. Each experiment names the experiments it
  overlaps. A verdict on overlapping changes keeps or retires them together unless a stage read separates them; to
  learn one change's own effect later, revert it alone and read again.
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

## Where the downloads came from

Read 2026-11-19 with `marketing.mjs history` (Apple's one-time historical snapshot plus the daily pulls, every live
app). Re-run it on the Mac (`history --write`) when a lesson here is in doubt; cloud runs read the `asc-history` lines.

- **App Store search is the channel that has worked.** Of 343 lifetime first-time downloads, 209 came from App Store
  search, 63 from browse, 35 from web referrers, 18 from other apps (18 unavailable). Füd has 278 of the 343: search 159, browse 54,
  web referrer 33, app referrer 15.
- **Reach decided Füd's total, not conversion.** 249 of its 278 came between 2025-04-25 and 2025-06-30. In May 2025
  its en-US keywords were broad, heavily searched terms (calorie counter, nutrition tracker, weight management, AI
  nutrition coach; then diet, GLP-1 drug names and fasting in 1.0.7), it shipped seven versions in six weeks, and
  it drew 53,149 impressions and 159 downloads that month (0.3% of impressions). In November 2026, with family terms,
  it drew 432 impressions and 13 downloads (3.0%). The narrow listing converts ten times better and reaches about 1% as
  many people. Impressions fell to 553 in July 2025, after the last 2025 version (1.0.7, 2025-05-30).
- **Most search downloads skip the product page.** 131 of Füd's 159 search downloads have Apple's page type "No page":
  the person tapped Get in the results list. The result row (name, subtitle, icon, first screenshots) is where they
  decide, which is why "conversion" here can pass 100% and why the subtitle and first screenshot matter more than the
  description.
- **What this cannot show.** Apple's analytics reports carry no search terms. Only the current name and subtitle are
  kept, so the 2025 ones are unknown. Detailed rows are withheld under Apple's privacy threshold, so the 33 web
  referrer downloads have no named site. The new-app window, the broad keywords and the release pace all fall in the
  same weeks, so this does not say which of them mattered most.
- **What every app takes from it.** An impressions weakness is fixed with the broadest terms people search that the
  app truly fits, not only niche words that describe it exactly (the funnel's next change says so). A real update
  shipped often keeps an app in front of search while it is new; `release-cadence-read` (Füd's ideas) checks that
  across apps. Web referrers were 12% of Füd's downloads, so guides, free tools and pages keep their place.

## Listing languages

Found 2026-11-18: every live app's listing existed only in en-US, yet 35 of the 62 first-time downloads Apple
reported for 2026-11-04 to 11-17 came from outside the United States (Hanzi Cards: 15 of 16). A person searching in
their own language cannot match an English-only listing.

- **What Apple reads.** Apple's [App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations)
  table lists the languages each storefront supports. The United States storefront lists English (US) plus Arabic,
  Chinese (Simplified), Chinese (Traditional), French, Korean, Portuguese (Brazil), Russian, Spanish (Mexico) and
  Vietnamese (read 2026-11-18). That a storefront's search matches keywords from each of its languages is what ASO
  firms report, not a sentence of Apple's; the experiment below is how this skill finds out.
- **Where it lives.** `listing.localizations` in the app's store data, one entry per locale (name, subtitle,
  keywords, description, promotional text, what's new). `app-release` ships it as a metadata-only version, like any
  listing change. Drafts and their notes are in `/Volumes/ssd/projects/app-marketing/localization/`.
- **Truth.** A localized listing says plainly, in that language, when the app itself is in English. It keeps every
  legal, credit and affiliation line of the en-US listing. No competitor names or trademarks in keywords.
- **The measure.** `learn`'s `countries` line: first-time downloads by territory, from `pull`. For each app, the 14
  days after its languages go live against the 14 before: downloads outside the US, and downloads in the US (whose
  search gains nine languages of keywords). Record it in the profile's `experiments` with the live date.
- **Status, 2026-11-19.** All ten live apps carry 24 more languages in store data (Importron 9). Füd's went in a day
  after the others (wendigo124/FSRN_Subs#195): one refused `gh pr create` on 2026-11-18 was wrongly recorded as its
  repository refusing pull requests. It takes them like any other (owner, 2026-11-19: "fud is no different from other
  repos"); family `fud-repo-push-refused` is closed as a wrong diagnosis.
- **Upkeep.** A change to an app's en-US description, name or subtitle changes each language in the same pull
  request, so no language keeps a claim the English listing dropped. A new app gets its languages with its first
  listing. Each language's keyword field uses its 100 characters: words in that language the en-US listing supports,
  none the locale's name or subtitle already carries. Follow the app repository's own copy rules first: Space Worms
  bans naming any other game, which removed every snake-game word there.
- **What a review of a draft checks.** Each claim traces to the en-US listing. No word promises what the app lacks
  (the first drafts had "breaking news" for a calm news app, "idle game" for a game played by checking in, and name
  stickers for an on-screen badge). No test, brand or service the listing does not name. Nothing that could read as
  making light of a real war or a real illness.
- **Keep or retire.** Provisional until proven (James, 2026-11-13). An effect is the channel table's: at least 2 more
  downloads than expected and half again as many. A language with no download from its countries in 28 days is
  rewritten once (other search words), then left as it is: a listing in a language costs nothing to keep.
- **Screenshots.** A language's screenshots can carry headlines in its own words (`localizedScreenshots` in store
  data; `app-release`, iOS, "Screenshots per language"). The captures of the app stay as they are. Tried first on
  Hanzi Cards in Indonesian, Russian and Thai, the countries that saw its listing most (2026-11-18, experiment
  `localized-screenshots`, judge 2026-12-23). Its 21 other languages keep English screenshots and are the comparison.
  Render more languages or apps only once that verdict says it brings downloads. A reviewer who reads the language
  checks each headline and its rendered image before it merges: the first drafts said "for everyone" where the
  English meant a profile per person, and mixed two fonts in one Russian headline.
- **Categories.** Apple lets an app name two categories and says only what the primary one does: it is where the
  app shows when people browse or filter search ([Choosing a category](https://developer.apple.com/app-store/categories/),
  read 2026-11-18). It is silent on the secondary one. Eight of ten live apps had none, so seven named one that fits
  (`listing.secondaryCategory` in store data; experiment `secondary-category`, judge 2026-12-23) and Space Worms keeps
  none as the comparison. A new app names a secondary category with its first listing when one fits; never one the
  listing does not support, which App Review's guidelines forbid.

## Open

| Channel | Runner | How |
|---|---|---|
| YouTube Shorts | mac | A series on the owner's channel by `app-shorts`, public the moment each passes review (never scheduled), with no posting cap. Judged as above; an app or format with 3 no-effect Shorts in a row is retired (`youtube-growth`). Shorts work: the Newsworthy Shorts posted 2026-10-21 to 10-28 (1,680 views, best 1,145) were followed by downloads and purchases while no other marketing ran, per the owner (James, 2026-11-12); start from that format |
| Listing languages | cloud writes, app-release ships | The listing in the languages people search in ([Listing languages](#listing-languages)). Judged by country |
| App Store search | mac | Keywords, subtitle and promotional text, where most downloads of an unknown app begin. Keywords and subtitle ship as a metadata-only version the morning after they merge; promotional text changes any time. The skill picks the words from the listing, competitors' names and Apple's search numbers, and merges them |
| Featuring nominations | mac | Free, and indie apps are eligible. For real updates only: new content or a feature a person would notice, never a rating prompt, fixes or listing translations. Every release goes out on approval, so there is never a dated version three weeks out: nominate the update in store data when it is submitted (start: its expected release day), merge, and send it with `asc.mjs nominate --confirm` (app-release `references/promotion.md`). Experiment `featuring-new-content` (Nametag 1.0.3 designs, Plenty 1.1, judge 2026-12-23; Füd 1.3.2 Holiday Table, nominated from 2026-12-14, judge 2027-01-07) |
| Shorts in other languages | mac | `yt-api.mjs localize` (youtube-growth) gives a live Short a title and description in each language, built from the app's reviewed listing translations with a line saying the app is in English. Experiment `shorts-localized-metadata` on Hanzi Cards and Data Center (most of their downloads come from outside the US), 12 languages, judge 2026-12-03. Other apps and new Shorts get it only on a keep |
| Holiday in-app events | mac | Opened by the owner on 2026-11-19: "sure try holiday in-app events". A real, time-bound holiday thing in the app (a small in-app change gated to its dates), listed as store data `events` and created and submitted by app-release 2.36.0 with the build that carries it ([promotion](../../app-release/references/promotion.md#in-app-events)). Each is an experiment in its app profile: event impressions and App Store downloads over the event window against the 14 days before |
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

**GitHub resource lists** (catalog pattern 13) take pull requests, which the Mac's `gh`, signed in as the owner, can open: the cloud cannot, so it is Mac work, not an owner step. Open one only on a list whose maintainer merged an outside pull request in the last 90 days, at the bottom of the right section in the list's own format. Checked 2026-11-19: Hanzi Cards' two pull requests (jqhoogland/awesome-language-learning#55, Vuizur/awesome-language-learning#85, open since 2026-11-13) have no answer; awesome-anki last merged in January 2026; woop/awesome-quantified-self has pull requests and issues turned off; the big Claude Code and Codex lists list only public repositories (Plenty stays private).


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
| A "More from the maker" row inside the apps (except Füd) | The owner's yes. It is a change to the app itself (SKILL.md, Never), the Space Worms, LOB and Importron repositories hold player-visible changes for the owner, and an app standard stops every app's next build until met, which is why the rating standard waited for his "Yes, every app" (2026-11-18). Füd, the largest base (278 of 343 lifetime downloads on 2026-11-19), has the row: wendigo124/FSRN_Subs#197, experiment `more-apps-row` in its profile, judge 2027-01-07. The other nine apps had about 65 lifetime downloads on 2026-11-19, so a row in them would reach few people yet; owner option |
| Instagram, X, Discord, Product Hunt | A connected account or API credential named in any skill. Each needs a sign-in, and Product Hunt also a maker account |
| Hacker News beyond a developer tool's Show HN | Nothing to fix: Hacker News's guidelines make other self-promotion unwelcome |
| Apple Ads | Nothing: the owner declined it on 2026-11-19 ("no search ads"). Do not propose it again |
| Paid placements, paid directories | A budget. None has been named |
| A free weekend or other price promotion (Newsworthy) | A tool that sets a price with an end date in one schedule. `app-release`'s `pricing` sets one standing price, and an open-ended price change is not a promotion |
| Campaign links (`pt=` provider token) | The token: App Store Connect shows it only in a signed-in session, and the API key cannot read it (`altool --list-providers` refuses API keys; no API resource holds it, checked 2026-11-12). Dropped: the Standard report's source type and the Detailed report's referrers attribute site traffic instead |
