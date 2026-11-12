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
| Store text (keywords, subtitle, promotional text, description) | Impressions, then product page views, then search and browse first-time downloads, in the 7 days after a change against the 7 before. Log the change's action with `changed` (what changed) so `learn` finds it | One change | 8 days after the change |

**An effect** is at least 2 more downloads than expected, and at least half again as many. For Shorts, one YouTube
referrer download is enough.

**The kill rule.** When a channel (or a store item) has three mature results in a row with no effect for an app, it
stops getting work for that app. `marketing.mjs learn --write` records it in the profile's `stopped`, and `next` skips
that work. Log a `finding` with the three results. In the same run, move the effort: add or raise an item on a channel
that is working for that app, or on an open channel not yet tried. A stop is lifted only by new evidence, such as a
different format that another app proved, written as a new item with its reason.

Small numbers are honest numbers. Two downloads a day is the baseline for most apps, so the rule needs a clear jump.
Never round a result up, and never judge a window Apple has not finished.

## Open

| Channel | Runner | How |
|---|---|---|
| YouTube Shorts | mac | A series on the owner's channel by `app-shorts`, with no posting cap (app-shorts, since 2.6.0). Judged as above. Nothing is proven yet: both Shorts past 1,000 views (Giraffe Stretch and Newsworthy) are legacy posts from before the campaign, and no download has been traced to a Short |
| App Store search | mac | Keywords, subtitle and promotional text, where most downloads of an unknown app begin. Keywords ride the next version; promotional text changes any time. The skill picks the words from the listing, competitors' names and Apple's search numbers, and merges them |
| Featuring nominations | mac | Free, and indie apps are eligible. Three weeks' notice, for real updates only |
| Custom product pages | mac | A page per audience, once a channel sends enough traffic to matter |
| Review replies | mac | Factual and brief. They show on the product page |
| YouTube comment replies and channel settings | mac | The owner's own channel, by `youtube-growth` and `app-shorts`. Replies are factual and brief; a settings change logs the old value. Pinning a comment has no API and needs a Studio sign-in, so it is dropped, never left open |
| Search guides | cloud | Compounding traffic from people already looking. Judged at 8 weeks, not 8 days |
| llms.txt and structured data | cloud | What assistants read when someone asks what to play or install. Generated, so it stays true |
| Businesses in ChatGPT | cloud and mac | Runs keep the websites, `llms.txt` and schema.org data true, which ChatGPT cites. Claiming a profile is owner-only by OpenAI's rules, so it is never open work. See [the reference](chatgpt-business-hub.md) |
| Press page | cloud | Inbound: makes it easy for anyone who finds the app to write about it |
| Directories and review sites | mac | See [below](#directories-and-review-sites) |
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
| Press and creator pitches by email | A postal address published for the business. US law (CAN-SPAM) requires one in every promotional email, and neither app site nor any app's support page publishes one. When one exists, a pitch must be truthful, written for that one person, name the sender and carry a working opt-out |
| Reddit | A route for agent tools: Reddit blocks the built-in browser, Claude in Chrome and web fetch (since 2026-10-15, `reddit-posting`). Posting would need the owner |
| TikTok | A connected account: the TikTok connector lists none, and connecting one is a sign-in |
| Instagram, X, Discord, Product Hunt | A connected account or API credential named in any skill. Each needs a sign-in, and Product Hunt also a maker account |
| Hacker News beyond a developer tool's Show HN | Nothing to fix: Hacker News's guidelines make other self-promotion unwelcome |
| Apple Ads, paid placements, paid directories | A budget. None has been named |
| A free weekend or other price promotion (Newsworthy) | A tool that sets a price with an end date in one schedule. `app-release`'s `pricing` sets one standing price, and an open-ended price change is not a promotion |
| Campaign links (`pt=` provider token) | The token: App Store Connect shows it only in a signed-in session, and the API key cannot read it (`altool --list-providers` refuses API keys; no API resource holds it, checked 2026-11-12). Dropped: the Standard report's source type and the Detailed report's referrers attribute site traffic instead |
