# Presenting and promoting an app on the App Store

Apple gives every app more ways to be seen than screenshots and a description. Work through this list on every
release of every app: do what applies, note in the release brief or ledger what does not apply and why, and leave
what needs the owner (money, legal declarations, a real event) to them with the exact step. Rechecked against
Apple's pages on 2026-11-01; read the linked page again before relying on a limit.

## Every release

| What | Why | How |
|---|---|---|
| **App preview video** | Plays first on the product page and appears in search results; most apps show nothing in motion | Make and check it with `app-preview.swift`, upload and place it with `asc.mjs assets` ([media](media.md), "App preview video") |
| **Promotional text** (170 characters) | The only listing copy that changes without App Review; sits above the description | Lead with what is new in this release; `listing.promotionalText`, sent by `asc.mjs listing`. Update it between releases too |
| **Product page header and search-results creative** | New in 2026 (iOS 27 App Store): a 21:9 header image or video at the top of the product page and a 3:2 creative in search; without one, search shows previews and screenshots | One universal 5244x2950 PNG can serve both. Brand art, not a UI restatement; a short phrase at most; key art inside the template safe area. `asc.mjs assets` ([media](media.md), "Product page header…"); reviewed with the version, or on its own once a version is approved. [Specs](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications), [best practices](https://developer.apple.com/app-store/asset-best-practices/) |
| **Featuring nomination** | Free. Tells App Store editorial about a launch, a notable update or new content; Apple promises nothing | `nominations` in store data, then `asc.mjs nominate --confirm` once the owner has approved the wording (it is sent to Apple). Nominate 2 to 3 weeks before the release date when possible, up to 3 months ahead; a late nomination is still worth sending. Types: `APP_LAUNCH`, `APP_ENHANCEMENTS`, `NEW_CONTENT`. [Nominate your app](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring), [getting featured](https://developer.apple.com/app-store/getting-featured/) |
| **Screenshots and Duo** | Recheck against the build ([media](media.md), "Every update"); Duo screenshots add an "optimized for iPhone Duo" badge and become required for submissions from April 2027 | `asc.mjs screenshots`, `asc.mjs assets` |

## When they fit

| What | Fits when | How |
|---|---|---|
| **Custom product pages** (up to 70) | Distinct audiences or campaigns: different screenshots, preview, promotional text and keywords per page, each with its own URL; keyword-assigned pages can appear in organic search | App Store Connect or `appCustomProductPages`; reviewed on their own once the app is live. Plan them with the owner; they need a reason to exist. [Custom product pages](https://developer.apple.com/app-store/custom-product-pages/) |
| **Product page optimization** | The app is live and gets enough traffic for a result: A/B test icon, screenshots and preview (up to 3 treatments, 90 days, one test at a time; alternate icons must ship in the binary) | `appStoreVersionExperiments`. [Product page optimization](https://developer.apple.com/app-store/product-page-optimization/) |
| **In-App Events** | A real, time-bound event: a challenge, competition, live event, major update or new season (15 minutes to 31 days). Not for ordinary features, sales or general awareness | `appEvents`; event card 16:9 and details 9:16 media through the Asset Library. [In-App Events](https://developer.apple.com/app-store/in-app-events/) |
| **Smart App Banner** | The app has a website (support, privacy or marketing pages) | `<meta name="apple-itunes-app" content="app-id=APP_ID">` in each page's head, with the app's numeric App Store ID. Publishing the site follows the owner's deploy approval. [Smart App Banners](https://developer.apple.com/documentation/webkit/promoting-apps-with-smart-app-banners) |
| **App Store badge, QR code, short link** | Any page or printed piece that should lead to the app | [Marketing tools](https://toolbox.marketingtools.apple.com/app-store/); follow the [badge guidelines](https://developer.apple.com/app-store/marketing/guidelines/) (black badge preferred, at least 40 px) |
| **In-app rating prompt** | The app has a moment of success after real use | `RequestReviewAction` / `AppStore.requestReview(in:)` (or `expo-store-review`); never from a button, at launch or mid-task. Apple shows it at most three times a year. An app change, so it ships in a build. [Ratings and reviews](https://developer.apple.com/app-store/ratings-and-reviews/) |
| **Promo codes, promoted in-app purchases, offers** | The app sells something | App Store Connect. [Promote](https://developer.apple.com/app-store/promote/) |
| **More localizations** | The app works for speakers of another of the 50 metadata languages | Listing copy per locale; each locale needs its own screenshots or falls back to the primary |
| **Apple Ads** | Paid: never without the owner's decision and budget | Note it; do not create campaigns |

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
