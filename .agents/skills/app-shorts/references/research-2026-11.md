# Research: what makes a Short travel and convert (read 2026-11-13)

The evidence behind `guidelines.md`. The guidelines stay short; this file says where each one comes from and how
strong that is. Add to it when new evidence arrives; when our own experiments settle a question, the result goes in
`guidelines.md` and `../ledger/experiments.md`, and this file keeps the outside evidence.

Evidence labels:

- **Platform fact**: YouTube's own help page, blog or product people on the record, with the URL and the day read.
- **Measured by others**: a study with a stated sample. Almost all are vendor studies, observational, not controlled.
- **Common practice**: what practitioners recommend, with no numbers behind it that we could find.

Every page below was read on 2026-11-13 unless a date says otherwise.

## The short answer

1. The feed decides. A new Short goes to a small seed audience; whether those viewers watch instead of swiping, and
   keep watching, decides whether it reaches more people. Nothing else (hashtags, tags, posting time, posting count)
   comes close. The first frame and the first second are the whole game for reach.
2. Links do not click in a Short's description or comments (since 2023-08-31). The only clickable things on a Short
   are the channel name (to the channel page, whose first link sits by the Subscribe button) and the **Related video**
   link under the channel handle. The best path to an install is therefore: Short → Related video → a video whose
   description link clicks → the App Store; with the spoken or on-screen search phrase as the path for everyone else.
3. Nobody publishes a views-to-installs rate for organic Shorts. The few numbers there are (games: about 0.2 to 0.8
   wishlists per 100 views) are anecdotes. We have to measure our own, which is what the 72-hour verdict does.

## 1. How Shorts are distributed

| Claim | Evidence |
|---|---|
| Each Short is first shown to a small "seed audience" likely to enjoy it; reach grows or tapers on how they respond. | Platform fact: Todd Sherman (Shorts product lead), Creator Insider Q&A, 2023-08-23 (https://www.youtube.com/watch?v=n3jsYK_-aRU), reported by TechCrunch 2023-08-25 (https://techcrunch.com/2023/08/25/youtube-demystifies-the-shorts-algorithm-views-and-answers-other-creator-questions/) |
| The Shorts feed is recommended differently from long-form: viewers swipe without choosing, so it measures what they do with what they are shown. | Platform fact: same Q&A |
| Studio's Shorts metric "How many chose to view" (viewed vs. swiped away) is the share of feed appearances people watched instead of swiping; "Shown in feed" counts appearances. YouTube suggests comparing it across your own Shorts; it publishes no benchmark. | Platform fact: YouTube Help, Shorts analytics (https://support.google.com/youtube/answer/12942217, quoted via outlierkit.com/resources/youtube-shorts-algorithm/) |
| Recommendations use viewing behaviour, likes, dislikes, subscriptions and satisfaction surveys, and the channel's reputation and quality. | Platform fact: How YouTube Works, Recommendations (https://www.youtube.com/howyoutubeworks/product-features/recommendations/) |
| Views now count from the first frame (2026-08-24); the old view is now "engaged view". Retention and average view duration stay anchored on engaged views. No change to recommendations. | Platform fact: YouTube blog, "What are engaged views", 2026-08-19 (https://blog.youtube/inside-youtube/engaged-views-youtube-explained/) |
| Posting time is not something YouTube optimizes for (except news, where freshness matters). | Platform fact: Sherman, 2023-08-23 |
| Posting a set number unlocks nothing; "there is nothing in our systems" at 5 or 10 Shorts. | Platform fact: Sherman, 2023-08-23 |
| Deleting and re-posting a Short to make it take off risks being treated as spam. | Platform fact: Sherman, 2023-08-23 |
| YouTube is prioritising original content on Shorts and reducing re-uploads of others' content. | Platform fact: YouTube Help community post "Prioritizing original content on Shorts" (https://support.google.com/youtube/blog/470890423/prioritizing-original-content-on-shorts), dated 2026-10-01 by a secondary source; the body did not load for us |
| A Short keeps getting views for weeks: average views per Short were 833 in days 1-5, 1,786 in days 5-10 and 3,310 in days 25-30. | Measured by others: Socialinsider, about 9.8 M brand Shorts from 2025, accounts 1K-1M followers (https://www.socialinsider.io/blog/how-long-does-it-take-for-yt-shorts-to-get-views/); the article's tiers do not add up, so treat as direction only |
| Most new channels' Shorts do about the same over the first ten; the best of the first ten got 6.5 times the first (median 8,832 vs 1,362 views at 30 days). "Volume buys you more tries at the one that breaks out." | Measured by others: vidIQ, 367,243 channels created in H1 2025 (https://vidiq.com/research/youtube-first-10-videos-study/) |
| Shorts views per post rose 127% from 2025 to 2026 while average view duration fell to about 16 s; small accounts (2K-10K) grew Shorts views over 200%. Over 61% of organic views came from the Shorts feed. | Measured by others: Metricool, 799,718 videos from 71,177 accounts (https://metricool.com/youtube-trends/) |
| Shorts get more average views per post than TikTok or Reels in every follower bracket for brands; engagement rate 0.30% and about 10 comments per Short. | Measured by others: Socialinsider, 7.5 M Shorts, Jan 2025-Jun 2026 (https://www.socialinsider.io/blog/tiktok-vs-reels-vs-shorts/) |

**Length.** Shorts can run to 3 minutes since 2024-10-15 (platform fact: https://support.google.com/youtube/answer/15424877).
YouTube says no length is favoured: "to what length do you need to tell your story?" (Sherman, 2023-08-23). A Short over
one minute with any active Content ID claim is blocked worldwide (platform fact, same help page), so licensed or
claimed music keeps a Short under a minute. Outside studies disagree: Adobe found Shorts over 41 s got 31% more
engagement across 1,000 top-channel Shorts, while its survey of 507 creators favoured under 30 s
(https://www.contentgrip.com/youtube-shorts-length-study/). Our own channel: the three best recent Shorts run 7, 9 and
11 s (Giraffe 90P4ykE6gSA, sw-triple-01 WkWreyCzpKI 1,285 views, vmw-missed-calls-01 kyLDXj9YNI4 1,111 views).

## 2. The first second, loops and pacing

- **The first frame decides "chose to view".** Since the feed metric is watch-or-swipe, everything before the first
  swipe decision is the hook. Practitioners agree on this and disagree on the details (1, 2 or 3 seconds). Common
  practice; the mechanism follows from the platform fact above.
- **Hooks.** OverseerOS read 3,966 and 4,784 hooks of million-view YouTube videos (median about 11 spoken words), but
  only winners, with no retention data, so it shows what winners do, not what works
  (https://www.overseeros.com/blog/youtube-shorts-hooks-study). Measured by others, weak.
- **Loops.** End on a frame that leads back into the first, so a second watch starts without a seam. Common practice.
  Our own result: Giraffe Stretch's 7 s loop reached 206% average viewed (90P4ykE6gSA), the channel's best retention.
- **Pacing.** Practitioners cut or change the picture every one to two seconds; no study we found measures it.
  Common practice.

## 3. Words on screen, captions and sound

- **No study measures words per frame against performance.** The largest one we found (4,404 TikTok posts) saw on-screen
  text "help" only until follower count was controlled, then nothing (https://www.clipspeed.ai/blog/short-form-video-statistics-2026.html).
  Vendors recommend 3 to 8 words at a time and about one second per 2 to 3 words (Biteable, 100 templates,
  https://biteable.com/blog/video-word-count/). Common practice.
- **Sound off.** In a 2019 survey of US consumers by Verizon Media and Publicis, 92% said they watch video on mobile with
  the sound off and 80% said they are more likely to finish a video with captions
  (https://www.nexttv.com/news/mobile-videos-often-watched-without-audio-study-finds). Self-reported and old, and
  Shorts plays with sound by default, so read it as "the picture must make sense on mute", not as a number.
  Measured by others, weak.
- **The owner's observation (2026-11-13):** pro Shorts use few words, just simple subtitle captions, to cut clutter.
  Our own best performers agree: Giraffe has almost no text; the October Newsworthy Short is a few calm words
  (EB6GGrACO10, 1,145 views). The panel's recurring complaint on our cuts was dense captions and slide-like cards
  (`../ledger/experiments.md`). We set a number (guideline 9) and test it (experiment E1).
- **Safe area.** YouTube publishes no safe zone; the `youtube-shorts` skill measured one. Text outside it sits under
  the title, buttons or comment sheet.
- **Trending sounds.** Shorts has a sound library and a "use this sound" page per sound; no study we found measured
  a lift from trending audio on YouTube specifically. Commercial tracks in an upload risk Content ID claims (and a
  global block over one minute). Common practice; untested by us.

## 4. Titles, descriptions, hashtags, tags, covers

| Claim | Evidence |
|---|---|
| Up to three hashtags "considered most engaging" show by the title; over 60 hashtags and every one is ignored; hashtags must relate to the video. | Platform fact: YouTube Help, hashtags (https://support.google.com/youtube/answer/6390658) |
| Hashtags are not required but can link a Short to a topic or event. | Platform fact: Sherman, 2023-08-23 |
| Shorts with hashtags got about 10% fewer views and about 9% more engagement; 1 to 5 relevant hashtags recommended. | Measured by others: Metricool, 799,718 videos |
| Title, thumbnail and description matter more than tags; tags help when the subject is often misspelled; "otherwise, tags play a minimal role". Excessive tags in the description break the spam policy. | Platform fact: YouTube Help, tags (https://support.google.com/youtube/answer/146402) |
| Most Shorts thumbnails are never seen, because people are in the feed. Custom Shorts thumbnails arrived in July 2026 (Partner Program channels first; no A/B testing); the API takes them since 2026-11-03. They show in search, the channel page and subscriptions. | Platform fact: Sherman 2023-08-23; Tubefilter 2026-07-24 (https://www.tubefilter.com/2026/07/24/youtube-shorts-custom-thumbnails-neal-mohan-feature-update/); `youtube-growth/references/api.md` |
| The title shows over the Short; about the first 40 characters are visible. | Our own measurement (`shorts.mjs`, `TITLE_VISIBLE`) |
| Playlists and series: no study found. A playlist gives Shorts a home on the channel page. | Common practice |

## 5. Comments

- **Replying with a Short** is a platform feature: a Short made as a reply notifies the commenter and shows below the
  comment (platform fact: https://support.google.com/youtube/answer/12816427).
- **Pinning** is a creator action in the comment menu; links in a Short's comments do not click (platform fact, see
  section 6). No measurement found of whether a pinned comment or creator replies change distribution. Comments are
  sparse on Shorts: a median of 0.52 comments per 1,000 views over 16,063 Shorts
  (https://www.overseeros.com/blog/good-comment-to-view-ratio-youtube-shorts, measured by others) and about 10 per
  brand Short (Socialinsider). Common practice: pin a first comment that says where to get the product and asks one
  easy question; answer every real comment.
- **Commenting on other channels' videos** as the channel: no evidence either way, and repetitive or promotional
  comments fall under the spam policy. Not adopted.

## 6. Links: what is clickable on a Short today

| Place | Clickable? | Evidence |
|---|---|---|
| Description of a Short | No | Platform change announced 2023-08-10, in force 2023-08-31: links in Shorts descriptions, comments and the vertical live feed stopped being clickable, the creator's own included (9to5Google https://9to5google.com/2023/08/10/youtube-shorts-links-spam/; Tubefilter https://tubefilter.com/2023/08/10/youtube-shorts-comments-spam/) |
| Comments on a Short, pinned or not | No | Same change |
| Channel name / avatar on the Short | Yes, to the channel page | Product behaviour |
| Channel links | Yes. Up to 14; **the first one shows by the Subscribe button**, the rest under "more links" | Platform fact: YouTube Help (https://support.google.com/youtube/answer/2657964) |
| **Related video** | Yes: a link under the channel handle in the Shorts player to a public or unlisted Video, Short or Live **from your own channel**. Added in Studio after upload (Content → the Short → Related video). Needs advanced feature access. No API. | Platform fact: YouTube Help (https://support.google.com/youtube/answer/14075157); YouTube blog 2026-07-14 (https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/) recommends matching the link to the viewer's intent and pointing to it on screen in the last 5 seconds |
| A long-form video's description | Yes | Not affected by the 2023 change |
| Brand link sticker | Only for a reported paid brand deal, to the partner's site | Platform fact: https://support.google.com/youtube/answer/16722303. Not usable for our own products |
| Shopping product tags | For physical products through YouTube Shopping | Not usable for apps |
| End screens and cards | Long-form only; never on Shorts, and off on made-for-kids videos | Platform fact: https://support.google.com/youtube/answer/9527654 |
| App-install buttons | Only in paid ads (App campaigns, Demand Gen on Shorts) | Not organic |

**The best path from a Short to an install, today.** (a) Everyone: the search phrase in the last beat and the first
description line (already our rule; it is the only path that needs no tap). (b) Tappers: Related video → a long-form
walkthrough of the same app whose first description line is a clickable, attributed App Store link
(`shorts.mjs link`). We have no long-form videos yet, so until one exists per app the Related video points to the
app's best Short, or the channel's closest-audience Short. (c) Channel visitors: the first channel link (by the
Subscribe button) goes to a page with every product and its store link. Nobody reports a conversion rate for any of
these; App Store Connect's campaign token (`ct`) on (b) and (c) is how we will see ours.

## 7. Channel-level factors

- **Cadence:** volume unlocks nothing by itself (Sherman), but more Shorts are more tries (vidIQ). Metricool saw per-post
  views best at 2 to 4 a week and monthly views keep rising with more uploads, and found channels posting about five
  Shorts a month had 46% more long-form views than average while 35+ a month fell back to the no-Shorts level
  (correlation). The owner's rule stands: no cap, post when ready (James, 2026-11-12).
- **One topic per channel:** YouTube's seed audience is chosen per Short from its content, not from subscribers
  (Sherman), so a mixed channel is not blocked from reach. No study found isolating mixed channels. Common practice
  says one topic helps subscribers return; we keep one channel for every product (the owner's setup).
- **Made for kids** turns off comments, notifications, end screens, cards and save-to-playlist (platform fact:
  https://support.google.com/youtube/answer/9527654). The owner's rule: always not made for kids (2026-11-12).
- **Cross-posting to TikTok and Reels:** YouTube watermarks Shorts downloaded from it (2022); Instagram has said it will
  not promote Reels carrying another platform's watermark. Socialinsider's brand data puts Shorts views per post
  above TikTok and Reels at every size. Common practice: post the same clean master file (no watermark) to each.
  Cross-posting needs each platform's own sign-in and overlay check; untested by us.

## 8. Apps and games on Shorts

- No organic views-to-installs benchmark exists that we could find. Product Hunt makers report low conversion "unless
  your content is tightly tied to a clear, frictionless call-to-action"
  (https://www.producthunt.com/p/general/do-tiktok-instagram-and-youtube-shorts-actually-bring-users-to-your-app).
  Common practice.
- Games: How To Market A Game case studies show views do not predict conversion: 715k views brought 13,000 wishlists
  while 4.5 M views brought 10,000 (https://howtomarketagame.com/2023/09/11/three-inspiring-marketing-success-stories/).
  A 2026 practitioner table puts organic TikTok at 200 to 500 wishlists per 100k views, "not an official benchmark"
  (found through search, likely https://script2shorts.app/blog/short-form-video-game-marketing; not read in full).
  Measured by others, anecdotal.
- Format: paid-ad research (AppsFlyer, 1.1 M creatives, cited by RevenueCat
  https://www.revenuecat.com/blog/growth/ugc-ads-apps) finds the same concept performs differently by platform;
  RevenueCat suggests fast skits and creator-led cuts for TikTok and Reels, clearer explanation for Shorts. Paid, not
  organic; common practice for us.
- Our own: the October Newsworthy Shorts were followed by downloads and purchases while nothing else ran (the owner,
  2026-11-12). No download has yet been traced to a Short from the November batch; the first verdicts fall on 2026-11-15.

## 9. What we were not doing (as of 2026-11-12)

| Tactic | Evidence | Were we doing it? |
|---|---|---|
| Related video on every Short | Platform fact (only clickable link on a Short) | No: called "not operable" on 2026-11-12, though Studio is signed in on the Mac |
| Pinned first comment with where to get it and a question | Common practice | No (one Füd Short on 2026-11-04 only) |
| A first channel link that lists every product | Platform fact (first link by Subscribe) | Not checked |
| Few words on screen, one line | Common practice, our own best Shorts | No rule; several cuts carried dense captions |
| Loop endings | Common practice, our Giraffe result | Only Giraffe and Hanzi |
| Reading "viewed vs. swiped away" per Short | Platform fact (the feed's own signal) | Only when a browser was signed in; never done |
| Tags with misspellings and variants | Platform fact (minimal, but useful for misspellings) | Partly; no rule |
| Cross-posting the master to TikTok | Common practice | No |

## 10. What counts as a Short, and the walkthroughs (added 2026-11-13)

- **A Short is a video up to 3 minutes long with a square or vertical aspect ratio.** A wider-than-tall (16:9) video
  of any length is a regular video, with a description whose links click and with end screens and cards. Platform
  fact: YouTube Help, "Upload YouTube Shorts" (https://support.google.com/youtube/answer/15424877). So a walkthrough
  meant to carry a clickable App Store link is rendered 16:9; 60 to 120 seconds keeps it short enough to hold.
- **Check the class after upload:** `https://www.youtube.com/shorts/<id>` answers 200 for a Short and redirects (303)
  to `/watch?v=<id>` for a regular video. Our own check (2026-11-13), used on each walkthrough. A Short fresh from
  upload answers 303 too until YouTube has processed it (lob-cut-02: 303 at once, 200 a few minutes later).

## 11. TikTok (added 2026-11-13, for cross-posting the Shorts)

Gathered in ten minutes from TikTok's own pages where they loaded; where only secondary sources say it, it is marked.

| Question | What we found | Source |
|---|---|---|
| Posts a day for a new account | TikTok publishes no number. The posting API names a per-user daily cap without giving it (`spam_risk_too_many_posts`). Secondary sources repeat a long-standing TikTok suggestion of 1 to 4 posts a day | Platform fact: TikTok Content Posting API reference (https://developers.tiktok.com/doc/content-posting-api-reference-direct-post); the 1 to 4 a day is secondhand only |
| Re-uploads and watermarks | "Content is also ineligible for the FYF if it includes unoriginal or reused material without anything new." Third-party guides add that a visible other-platform watermark gets a video held back; TikTok's own page does not say so. Our Shorts are our own original masters, uploaded from the rendered file, never a YouTube download, so they carry no watermark | Platform fact: TikTok Community Guidelines, Integrity and Authenticity (https://www.tiktok.com/community-guidelines/en/integrity-authenticity) |
| Caption length | 2,200 characters (UTF-16) through the posting API; the TikTok Studio web upload page counts to 4,000 | Platform fact: Content Posting API reference; the Studio counter seen 2026-11-13 |
| Hashtags | No separate cap found; they count toward the caption | Secondary only |
| AI-generated content label | Required for "AI-generated or significantly edited content that shows realistic-looking scenes or people". Screen recordings of a real app with drawn captions, a drawn phone frame or composited cards are not realistic AI scenes or people, so they take no label | Platform fact: Community Guidelines, Integrity and Authenticity |
| What clicks on a post | Captions and comments: links do not click (secondary sources; matches what the upload page offers, no link field). Hashtags, the account name and sounds click inside TikTok | Secondary, and the upload page itself |
| What clicks on the profile | A Website field in the bio appears for a personal account at 1,000 followers, or for a registered Business account. Regional differences reported | Secondary sources only (Buffer, Shopify, several link-in-bio vendors); TikTok's help page did not load |
| Cover and safe area | TikTok picks a cover frame (editable on upload); its right-side buttons and bottom caption cover more of the frame than the Shorts player, so text near the right and bottom edges of a 9:16 master may sit under them | Platform behaviour seen on the upload page; common practice |

What a Business account would change: the bio's Website field without waiting for 1,000 followers (where registered),
and the commercial music library in place of the full one. Switching is an account setting: the owner's decision.

What we saw on the first posts (2026-11-13): each new post showed "Content under review" and "Only me" for about a
minute, then "Everyone". The first upload offered "Turn on automatic content checks?" (an account setting in Profile >
Settings): declined, since account settings are the owner's. TikTok's Branded Content Policy requires the commercial
disclosure toggle only for a third-party brand (https://www.tiktok.com/legal/page/global/bc-policy/en), so our own
products' posts leave it off. Shorts made before the pipeline (the October Newsworthy ones) have no master file on
`/Volumes/ssd`, so they are not cross-posted.

