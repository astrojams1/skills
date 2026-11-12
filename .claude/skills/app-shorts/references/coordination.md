# Coordinating with releases, the App Store and the websites

Shorts are one surface of each app's marketing. Keep them in step with the others.

## With app-release

- **A first release unlocks the app's Shorts.** Until then it gets none (`SKILL.md`, Rules). On release, `app-marketing`
  flips the profile's stage to `live`, and `shorts.mjs due` lists any `held` Short to re-check.
- **A release is an episode.** When `app-release` ships a feature (What's New names something people can see),
  add an `idea` episode for it in the registry. Record it from the release build once it is live. The app
  preview's take is real footage of the same build. Reuse its moments for a Short's B-roll, but cut the Short for
  YouTube: a hook, one payoff, 10–20 s, sound.
- **Promotion checklist.** `app-release/references/promotion.md` lists YouTube Shorts; its release brief should say
  which episode, if any, goes out with the release.

## With the App Store

- **Attribution:** links from YouTube use `shorts.mjs link <app> <campaign>`. That covers channel links and long-video
  descriptions, the places where links click. It adds the team's provider token (`pt`) and a campaign
  token (`ct`, e.g. `yt-fud-crusts`). App Store Connect → Analytics then reports product page views, downloads and
  proceeds per campaign. Record each team's provider token in the registry's `teams` (App Store Connect →
  Analytics → Campaigns shows it). Without it the link works but is unattributed.
- **Search:** every Short gives the app's search phrase on screen and on the description's first line
  (`posting.md`, "Find the app"). The phrase comes from the app's marketing profile (`searchPhrase`, checked daily by
  `app-marketing`) or `shorts.mjs phrase`, so the search lands.
- **What app-marketing reads:** `shorts.mjs views` gives, per app, `shortsViews` (summed over public Shorts only;
  `pulled`, `held` and `superseded` ones never count), `liveOrScheduled` (a live or scheduled Short exists now),
  `held` and `nextPublic`, keyed by the registry slug with the profile's `marketingId`. The registry's `status` field
  means: `scheduled` private until `publishAt`, `held` private with no publish time until its app is on sale, `live`
  and `retired` public, `pulled` taken back to private, `superseded` never uploaded (see the top of
  `scripts/shorts.mjs`).
- **Which apps get Shorts:** only apps on sale, read from the profile's `stage` (`live`) or `preorder` link. An
  app not yet live has `requires: live` on its profile's Shorts item, so `marketing.mjs next` lists the item only
  once the app is live. `shorts.mjs plan` lists apps not on sale as `notOnSale`, and `evaluate.mjs` gives them no
  `produce` action.
- **Downloads:** `youtube-growth`'s `evaluate.mjs` reads `app-marketing`'s `asc-analytics` rows to judge each Short on
  first-time downloads from search and browse in its first 72 hours.
- **Promotional text** can echo a running series ("As seen on our Shorts: …"); it changes without App Review
  (`asc.mjs listing`).

## With the marketing websites

- Each app's page on the Ouro site (`ouro-website`) or the astrojams site (`astrojams-website`) is its Marketing
  URL. Link the channel from the site's footer or an app page only through those skills' own update path. The
  shared showcase in `astrojams1/app-sites` changes both sites at once.
- The showcase has no video slot yet (a known gap in `ouro-website`'s ledger). When one exists, the registry's live
  episodes (`videoId`) are the source for it; until then, do not hand-edit embeds into a site.

## With the owner's channel

- Channel links (App Store, websites) and the channel description are channel settings: change them without asking
  when it helps, logging the old value. Every claim in them follows the same sourcing as the apps' listings.
- Cross-posting the same file to TikTok or Instagram Reels needs their own accounts and their own overlay checks
  (`youtube-shorts` open issue 2). Do not post to a platform the owner has not set up.
