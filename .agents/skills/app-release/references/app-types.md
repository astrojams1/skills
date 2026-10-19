# What differs by kind of app

The release process is the same for every app; what the stores ask about depends on what the app is. Set
`type` in `app-release.config.json`, add the matching gates to the ledger at `scope`, and keep the answers in
the store data. Never copy another app's answers: derive each from the shipped app.

## Every app

- `scope`: platforms, monetization (free, paid download, IAP, subscription), base price and currency,
  territories, release behavior (`MANUAL` after the owner's device check, or `AFTER_APPROVAL`).
- Privacy and support pages live on the web, linked from both listings **and from inside the app**.
- Privacy answers from evidence ([privacy](privacy.md)): hosting logs keep IP addresses even without
  analytics, so "Data Not Collected" is rarely right for an online app.
- Content rights, encryption export compliance, age rating, target audience, ads declaration.
- A physical-device check of the exact store build before release, on each platform.

## Games (`type: game`, e.g. Space Worms)

| Topic | What to do |
|---|---|
| Categories | Apple `GAMES` with up to two subcategories (`GET /v1/appCategories/GAMES/subcategories`); Play category Game → genre |
| Game Center | Leaderboards in the store data's `gameCenter`; the `com.apple.developer.game-center` entitlement in `ios.requiredEntitlements`; `asc.mjs game-center` sends leaderboard versions to review with the app ([ios](ios.md)) |
| Multiplayer and names | Visible nicknames or chat are user-generated content: age rating `userGeneratedContent: true`, moderation, and a reporting route in the app (Apple 1.2) |
| Privacy | A screen name is a User ID to Apple; gameplay input held by a server is Gameplay Content; connection metrics are Performance Data |
| Store media | Staged, capture-only scenes (a loopback-only launch link) give dynamic screenshots and previews without fake UI; never ship the staging path in release builds |
| Copy | Marketing copy only; rules and controls live in the app's README and must not be restated where they can drift |

## News and content apps (`type: news`, e.g. Newsworthy)

| Topic | What to do |
|---|---|
| Categories | Apple `NEWS` (no subcategories); Play News & Magazines |
| Google News policy | Complete the News apps declaration in App content, and show the publisher, contact and ownership inside the app (Settings) — Play rejected Newsworthy without it |
| Content rights | Declare whether third-party content (articles, images, feeds) is shown; generated summaries and original artwork are not publisher content |
| Apple 4.2 | A thin feed or web wrapper invites a minimum-functionality rejection; ship on-device function (widgets, offline reading, notifications) and explain it in the review notes |
| AI-generated content | Describe what is generated and by whom in the review notes; keep store copy factual about accuracy limits |
| Notifications | Push needs `aps-environment: production` (iOS) and `google-services.json` with `string/google_app_id` (Android) checked in the build; notifications are not an emergency service |
| Widgets | An app group on every bundle (`ios.appGroup`); verify each widget size natively ([verification](verification.md)) |

## Paid downloads (e.g. Newsworthy at US$1)

- Apple: the Paid Apps Agreement, tax forms and banking must be active, or approved versions read
  `CANNOT_SELL` everywhere. `pricing.basePrice` sets the base-territory price; Apple equalizes the rest.
- Google: a payments profile, and the app set to Paid **before** it is offered free on any track.
- Store copy says "one-time purchase"; the price itself belongs in store settings, not screenshots.

## Free apps (e.g. Space Worms)

- `pricing.basePrice: "0"`; Apple's free schedule must hold no paid price. A free Play app can never become
  paid under the same package.
- No account, no ads, no tracking claims must match the privacy answers and the code.
