# Coordinating with releases, the App Store and the websites

Shorts are one surface of each app's marketing. Keep them in step with the others.

## With app-release

- **A release is an episode.** When `app-release` ships a feature (What's New names something people can see),
  add an `idea` episode for it in the registry, and record it from the release build once it is live. The app
  preview's take is real footage of the same build: reuse its moments for a Short's B-roll, but cut the Short for
  YouTube (a hook, one payoff, 10–20 s, sound).
- **Promotion checklist.** `app-release/references/promotion.md` lists YouTube Shorts; its release brief should say
  which episode, if any, goes out with the release.

## With the App Store

- **Attribution:** links from YouTube (channel links, long-video descriptions, pinned comments where links are
  allowed) use `shorts.mjs link <app> <campaign>`, which adds the team's provider token (`pt`) and a campaign token
  (`ct`, e.g. `yt-fud-crusts`). App Store Connect → Analytics then reports product page views, downloads and
  proceeds per campaign. Record each team's provider token in the registry's `teams` (App Store Connect →
  Analytics → Campaigns shows it); without it the link works but is unattributed.
- **Search:** Shorts say "Search '<App name>' on the App Store". Use the store name exactly, so the search lands.
- **Promotional text** can echo a running series ("As seen on our Shorts: …"); it changes without App Review
  (`asc.mjs listing`).

## With the marketing websites

- Each app's page on the Ouro site (`ouro-website`) or the astrojams site (`astrojams-website`) is its Marketing
  URL. Link the channel from the site's footer or an app page only through those skills' own update path (the
  shared showcase in `astrojams1/app-sites` changes both sites at once).
- The showcase has no video slot yet (a known gap in `ouro-website`'s ledger). When one exists, the registry's live
  episodes (`videoId`) are the source for it; until then, do not hand-edit embeds into a site.

## With the owner's channel

- Channel links (App Store, websites) and the channel description are channel settings: propose them, and change
  them only on the owner's go-ahead.
- Cross-posting the same file to TikTok or Instagram Reels needs their own accounts and their own overlay checks
  (`youtube-shorts` open issue 2). Do not post to a platform the owner has not set up.
