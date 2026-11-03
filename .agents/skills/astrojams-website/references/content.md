# Writing an app's entry

Each app is one object in `src/data/apps.json`. The landing page, the home-page stage, the link-preview image and the
structured data are all generated from it, so a good entry is the whole job.

## Fields

| Field | What it is | Rule |
|---|---|---|
| `slug` | URL path: `/<slug>/` | The app's short name in lowercase words joined by hyphens. Never change it once shared: Marketing URLs and links point at it |
| `appStoreId` | Apple ID from App Store Connect | Numeric string. `store.json` is keyed on it |
| `bundleId` | For humans and the audit | |
| `name` | Short name used across the site | "Space Worms", not "Space Worms: Swarm" |
| `fullName` | The App Store name | Must equal App Store Connect's name (the audit flags drift) |
| `subtitle` | The App Store subtitle | Must equal App Store Connect's subtitle once it has one; until then, the store data's |
| `headline` | Hero `h1` and preview-card title | The app's own tagline: the headline on its store screenshots or title screen, so the page and the store say the same thing |
| `pitch` | Hero subhead and meta description | One or two sentences, at most 240 characters: what it does, for whom, why it is different |
| `audience` | Who it is for | "For arcade fans, online or offline". Specific beats broad |
| `category` | App Store primary category | Drives structured data (`Games`, `News`, `Music`, `Health & Fitness` are mapped) |
| `priceNote` | Price line beside the badge | From the listing and its purchases: "Free", "$1.00 · No subscription or in-app purchases". `null` while price is undecided |
| `devices` | `["iPhone"]` or `["iPhone", "iPad"]` | Only devices the build supports (`TARGETED_DEVICE_FAMILY`, or the store's iPad screenshots) |
| `theme` | Page colours | See Theme |
| `icon`, `screenshots` | Files in `src/assets/apps/<slug>/` | See [assets](assets.md). Every screenshot needs alt text describing what it shows |
| `features` | 3 to 6 `{ title, body }` | Benefits a user would care about, in the listing's or README's own terms |
| `trust` | 2 to 4 short chips | Only claims the listing, README or privacy label states: "No ads", "No account", "Processed on your iPhone" |
| `faq` | 2 to 4 `{ q, a }` | The questions someone asks before downloading: cost, account, privacy, offline, "is it medical advice", release timing for an app in development |
| `note` | Optional small print | Disclaimers the listing makes, or that the app is in development |
| `links` | `website`, `support`, `privacy` | `support` and `privacy` from App Store Connect; `website` only for a public site of the app's own (never a private or preview URL). Omit what the app does not have |
| `spotlight` | Optional `{ eyebrow, title, body: [paragraphs], note }` | A full-width band on the app's page, in its accent colour, for an idea that needs more room than a feature |
| `lifestyle` | Optional `{ file, alt, caption }` | See [assets](assets.md) |

`excluded` records `{ appStoreId, name, reason }` for App Store records the site deliberately leaves out. `site`
(`name`, `url`, `tagline`, `description`, `company`), `developer` and `campaign` are site-wide; change them only when
the owner asks or a fact changes. The home headline counts the apps itself ("Five small apps.").
`campaign.providerToken` is the `pt=` value from any App Store Connect campaign link for the personal team; with it
set, every App Store link carries a `ct=` per placement.

## Copy rules

- **Message match.** The headline repeats the promise the App Store page or the app's title screen makes.
- **Benefits first, specific always.** "Log only what's new" beats "Powerful importing".
- **Nothing the sources do not support.** Every number, privacy claim, price and "free" must come from the app's
  current listing, store data, privacy label, in-app purchase setup, README or its own website. An app still in
  development is labelled so in its `note` and FAQ, and its features describe the build being tested.
- **Calm and plain.** Short sentences, no hype, no exclamation marks, no superlatives about Apple.
- **Apple's wording** (the check enforces most of it): "on the App Store" or "available on the App Store", never
  "Apple App Store" or "downloadable"; "for iPhone", not "iPhone app"; avoid "iOS"; lowercase-i iPhone and iPad.
- Health, money and safety claims keep the listing's own caveats (Importron is not medical advice; Newsworthy is not
  an emergency alert).

## Theme

Sample the colours from the app's icon and its screenshots (the main background, its brand accent, a soft highlight)
so the page feels like the app. Dark apps get dark pages. `sharp` is installed in the site repository for sampling.

| Key | Use | Must contrast with |
|---|---|---|
| `bg` | Page background | |
| `surface` | Cards, sticky bar | |
| `ink` | Headings and body text | `bg`, `surface`, `highlight` at 4.5:1 |
| `muted` | Secondary text | `bg`, `surface` at 4.5:1 |
| `accent` | Buttons, links, check marks, the spotlight band | `bg` at 3:1 |
| `onAccent` | Text on `accent` | `accent` at 4.5:1 |
| `highlight` | Reserved for soft accents | |

`npm run check` enforces those ratios. If a brand colour fails, darken or lighten the text colour or soften the
highlight; never drop the check.
