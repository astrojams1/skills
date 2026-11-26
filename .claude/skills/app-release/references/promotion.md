# Presenting and promoting an app on the App Store

Apple gives every app more ways to be seen than screenshots and a description. Work through this list on every
release of every app: do what applies, note in the release brief or ledger what does not apply and why, and leave
what needs the owner (money, legal declarations, a real event) to them with the exact step. `asc.mjs status` prints
where each "Every release" item stands, and `submit --confirm` refuses while one has neither a result nor a reason in
the store data's `promotion.waived.<id>`: the owner's decision or a demonstrated capture dependency, never that it is
optional. Make them before submitting: a preview cannot be placed once the version is approved. Rechecked against
Apple's pages on 2026-11-01; read the linked page again before relying on a limit.

## Every release

| What | Why | How |
|---|---|---|
| **App preview video** | Plays first on the product page and appears in search results; most apps show nothing in motion | Make and check it with `app-preview.swift`, upload and place it with `asc.mjs assets` ([media](media.md), "App preview video") |
| **Promotional text** (170 characters) | The only listing copy that changes without App Review; sits above the description | Lead with what is new in this release; `listing.promotionalText`, sent by `asc.mjs listing`. Update it between releases too |
| **Product page header and search-results creative** | New in 2026 (iOS 27 App Store): a 21:9 header image or video at the top of the product page and a 3:2 creative in search; without one, search shows previews and screenshots | A universal 5244x2950 PNG can serve both, but Apple shows only a band of it, so search usually needs its own 3:2 file. Brand art, not a UI restatement; a short phrase at most; key art inside the template safe area. `asc.mjs assets`, with `assets crops` before review ([media](media.md), "Product page header…"); reviewed with the version, or on its own once a version is approved. [Specs](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications), [best practices](https://developer.apple.com/app-store/asset-best-practices/) |
| **Featuring nomination** | Free. Tells App Store editorial about a launch, a notable update or new content; Apple promises nothing | `nominations` in store data, then `asc.mjs nominate --confirm`, which app-marketing's Mac pass runs with no go-ahead (James, 2026-11-12: marketing skills run on their own). Nominate 2 to 3 weeks before the release date when possible, up to 3 months ahead; a late nomination is still worth sending. Every release here goes out on approval, so there is never a dated version to wait for: nominate a real update (new content or a feature a person would notice, not a rating prompt, fixes or listing translations) when it is submitted, with its expected release day as the start. Types: `APP_LAUNCH`, `APP_ENHANCEMENTS`, `NEW_CONTENT`. [Nominate your app](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring), [getting featured](https://developer.apple.com/app-store/getting-featured/) |
| **Screenshots and Duo** | Recheck against the build ([media](media.md), "Every update"); Duo screenshots add an "optimized for iPhone Duo" badge and become required for submissions from April 2027 | `asc.mjs screenshots`, `asc.mjs assets` |

## When they fit

| What | Fits when | How |
|---|---|---|
| **Custom product pages** (up to 70) | Distinct audiences or campaigns: different screenshots, preview, promotional text and keywords per page, each with its own URL; keyword-assigned pages can appear in organic search | App Store Connect or `appCustomProductPages`; reviewed on their own once the app is live. Plan them with the owner; they need a reason to exist. [Custom product pages](https://developer.apple.com/app-store/custom-product-pages/) |
| **Product page optimization** | The app is live and gets enough traffic for a result: A/B test icon, screenshots and preview (up to 3 treatments, 90 days, one test at a time; alternate icons must ship in the binary) | `appStoreVersionExperiments`. [Product page optimization](https://developer.apple.com/app-store/product-page-optimization/) |
| **In-App Events** | A real, time-bound event: a challenge, competition, live event, major update, new season, premiere or special event (15 minutes to 31 days). Not for repeated daily tasks, price promotions or general awareness | Store data `events`, then `asc.mjs events --confirm` and `submit --confirm`; see [In-App Events](#in-app-events) below |
| **YouTube Shorts** (also Reels, TikTok) | Every app the owner ships: one channel carries them all | Run **app-shorts** (a series per app, real recordings, posting and the calendar; queue an episode for each visible feature a release ships) and **youtube-growth** (metrics at 3, 7 and 28 days, decisions, comments). Not a feature tour: a hook, one real result, sound. Posting acts as the owner: on the owner's go-ahead |
| **Smart App Banner** | The app has a website (support, privacy or marketing pages) | `<meta name="apple-itunes-app" content="app-id=APP_ID">` in each page's head, with the app's numeric App Store ID. Publishing the site follows the owner's deploy approval. [Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners) |
| **App Store badge, QR code, short link** | Any page or printed piece that should lead to the app | [Marketing tools](https://toolbox.marketingtools.apple.com/app-store/); follow the [badge guidelines](https://developer.apple.com/app-store/marketing/guidelines/) (black badge preferred, at least 40 px) |
| **In-app rating prompt** | The app has a moment of success after real use | `RequestReviewAction` / `AppStore.requestReview(in:)` (or `expo-store-review`); never from a button, at launch or mid-task. Apple shows it at most three times a year. An app change, so it ships in a build. [Ratings and reviews](https://developer.apple.com/app-store/ratings-and-reviews/) |
| **Promo codes, promoted in-app purchases, offers** | The app sells something | App Store Connect. [Promote](https://developer.apple.com/app-store/promote/) |
| **More localizations** | The app works for speakers of another of the 50 metadata languages | Listing copy per locale; each locale needs its own screenshots or falls back to the primary |
| **Apple Ads** | The owner declined Apple Ads on 2026-11-19 ("no search ads"); do not propose it again | Do not create campaigns |

## In-App Events

Rechecked against Apple on 2026-11-19: [In-App Events](https://developer.apple.com/app-store/in-app-events/),
[Offer In-App Events](https://developer.apple.com/help/app-store-connect/offer-in-app-events/offer-in-app-events),
[Submit an In-App Event](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-event),
[media specifications](https://developer.apple.com/help/app-store-connect/reference/in-app-events/in-app-event-media-and-audio-specifications)
and the API's [`POST /v1/appEvents`](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-appevents).

- **What qualifies:** something really happening in the app for a limited time. Badges: `CHALLENGE`, `COMPETITION`,
  `LIVE_EVENT`, `MAJOR_UPDATE`, `NEW_SEASON`, `PREMIERE`, `SPECIAL_EVENT`. Not daily tasks, price-only promotions or
  general awareness; an event may highlight permanent content but is about a limited-time moment.
- **Text:** reference name 64 characters (internal), event name 30 (title case, the event's real name), short
  description 50 (the card), long description 120 (the details page). No prices, no unverifiable claims, no all caps.
- **Media:** card 16:9 (1920x1080 to 3840x2160), details 9:16 (1080x1920 to 2160x3840), image or looping video,
  500 MB at most. No text or logos in the art, no borders or gradients. Make them from real app screens.
- **Dates:** start in the future, 15 minutes to 31 days long, published (discoverable) up to 14 days before start.
  Per-territory times are allowed if all starts fall within 48 hours.
- **Limits:** 10 published per app at once, 15 approved per app in App Store Connect, 10 with overlapping starts.
- **Review:** with an app version (reviewed together) or on its own once the app is approved (reviewed with the
  latest version). Apple says most submissions finish within 24 hours.
- **Deep link: required.** The API's create call takes an event without one, but App Review does not: adding Rhythm's
  Winter Glow to its 0.17.1 submission answered 409 `ENTITY_ERROR.ATTRIBUTE.REQUIRED`, "You must provide a value for
  the attribute 'deepLink'" (2026-11-24). Give every event a universal link or a custom URL scheme the build itself
  declares (`CFBundleURLTypes`, for example `com.astrojams.rhythm://winter-glow`); when the content is on the app's
  first screen during the event, a link that only opens the app is enough. An app with no scheme needs one in the
  build that ships with the event. `events` refuses an event without `deepLink`, and `submit` and `events submit`
  refuse one whose App Store Connect draft has none, before opening a submission.

**How a run makes one.** List it in store data `events` ([config](config.md)): the in-app change ships first, gated to
the event's dates, and `shipsWith` names the first version that carries it. `asc.mjs events` shows Apple's events and
the plan; `events --confirm` creates or updates each draft (attributes, text in each language, both images) and reads
it back; `submit --confirm` then sends every editable event whose `shipsWith` is that version or earlier with the
version, and refuses while a listed event for it has not been created. `events submit --confirm` sends events whose
content is already live without a new version. Allow review time: create the event and submit the version at least
a few days before `publish`.

## Product page declarations

These are not promotion, but they show on the product page and Apple will block updates without them:

- **Regulated medical device status** (App Information → App Store Regulations & Permits): required for apps in
  Health & Fitness or Medical, or that answered "frequent" for medical information, for the EU/EEA, UK and US.
  New apps since 2026-03-26; existing apps by "early 2027" or they can no longer submit updates. Web UI only, by the
  Account Holder or an Admin. It is a legal declaration: prepare the evidence (is the app cleared, CE/UKCA-marked or
  self-certified as a device? A wellness or food journal usually is not) and let the owner answer.
  [Declare regulated medical device status](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status)
- **Accessibility Nutrition Labels**: voluntary now, becoming required; answer them from tested evidence.
  [Overview](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels)
- **App Store Tags** (US): Apple generates them; review them under App Information and deselect any that mislead.
