# Writing an app's entry

Each app is one object in `sites/ouro/src/data/apps.json` (in `/Volumes/ssd/code/app-sites`). The landing page, the home-page card, the link-preview image and
the structured data are all generated from it, so a good entry is the whole job.

## Fields

| Field | What it is | Rule |
|---|---|---|
| `slug` | URL path: `/<slug>/` | The app's short name in lowercase words joined by hyphens. Never change it once shared: App Store Marketing URLs point at it |
| `appStoreId` | Apple ID from App Store Connect | Numeric string. `store.json` is keyed on it |
| `bundleId` | For humans and the audit | |
| `name` | Short name used across the site | "Giraffe Stretch", not "Giraffe Stretch: ABC" |
| `fullName` | The App Store name | Must equal App Store Connect's name (the audit flags drift) |
| `subtitle` | The App Store subtitle | Must equal App Store Connect's subtitle |
| `headline` | Hero `h1` and preview-card title | The app's own tagline: the headline on its store screenshots or title screen, so the page and the store say the same thing |
| `pitch` | Hero subhead and meta description | One or two sentences, at most 240 characters: what it does, for whom, why it is different |
| `audience` | Who it is for | "For the grown-ups who tag along". Specific beats broad |
| `category` | App Store primary category | Drives structured data |
| `priceNote` | Price line beside the badge | From the listing and its purchases: "Free · Optional one-time purchases". `null` while price is undecided |
| `devices` | `["iPhone"]` or `["iPhone", "iPad"]` | Only devices the build supports |
| `theme` | Page colours | See Theme |
| `icon`, `screenshots` | Files in `src/assets/apps/<slug>/` | See [assets](assets.md). Every screenshot needs alt text describing what it shows |
| `features` | 3 to 6 `{ title, body }` | Benefits a parent would care about, in the listing's own terms |
| `trust` | 2 to 4 short chips | Only claims the listing or privacy label states: "No ads", "No account", "Nothing uploaded" |
| `faq` | 2 to 4 `{ q, a }` | The objections a parent would raise before downloading: account, cost, privacy, age, "is it therapy" |
| `note` | Optional small print | Disclaimers the listing makes (data sources, "not medical advice") |
| `links` | `privacy`, `support` | The URLs from App Store Connect; omit when the app has none yet |
| `iconNote` | Optional | Why the icon is provisional, so the next run replaces it |
| `spotlight` | Optional `{ eyebrow, title, body: [paragraphs], note }` | A full-width band on the app's page, in its accent colour, for an idea that needs more room than a feature. Moment to Meaning uses it for how AI and people work together; `note` carries the makers' caveat |
| `humanSupport` | Optional, one or two sentences | How the app leads families toward real people. Every app that has it appears in the home page's "AI and people, together" section |
| `links.website` | Optional | The app's own public website, linked from its page; never a private or preview URL |

`excluded` records `{ appStoreId, name, reason }` for App Store records the site deliberately leaves out. `site`
(`name`, `url`, `tagline`, `description`, `company`, `brand`, `copy`), `developer` and `campaign` are site-wide;
change them only when the owner asks or a fact changes. `site.brand` is the wordmark, brand colour, mark (SVG shapes
on a 32×32 grid in `currentColor`) and this skill's name; `site.copy` holds the dozen lines that give the site its
own voice on pages it shares with the other site (home title and headline, closing lines, the Get button, footer
line, section headings, 404 text, with `{name}` for an app's name). The check applies Apple's wording rules to them. The home headline counts the apps itself ("Five small apps.").
`campaign.providerToken` is the `pt=` value from any App Store Connect campaign link (App Analytics → Acquisition →
Campaigns; one value for the whole account). With it set, every App Store link carries a `ct=` per placement and App
Analytics shows which part of the site drove downloads.

## Copy rules

- **Message match.** The headline repeats the promise the App Store page makes. A visitor who taps through should
  see the same words, colours and screenshots.
- **Benefits first, specific always.** "Log a shared meal once" beats "Powerful meal logging".
- **Nothing the sources do not support.** Every number, privacy claim, price and "free" must come from the app's
  current listing, store data, privacy label, in-app purchase setup, or its makers' own materials. A subscription
  anywhere in the app means no "no subscription" claim for that app or for Ouro as a whole. A feature the makers
  describe as in development is written as coming ("is being built to…", "you'll be able to…") with their caveat.
- **The makers' words win.** When the app's team names wording they love, use it verbatim (Moment to Meaning's pitch
  is Jinjin's paragraph).
- **Calm, warm, plain.** Short sentences, no hype, no exclamation marks, no superlatives about Apple.
- **Apple's wording** (the check enforces most of it): "on the App Store" or "available on the App Store", never
  "Apple App Store" or "downloadable"; "for iPhone", not "iPhone app"; avoid "iOS"; lowercase-i iPhone and iPad.
- AI-generated voices or AI features are disclosed where the listing discloses them.

## Theme

Sample the colours from the app's icon and its screenshots (the main background, its brand accent, a soft highlight)
so the page feels like the app. `sharp` is installed in the site repository for sampling pixels.

| Key | Use | Must contrast with |
|---|---|---|
| `bg` | Page background | |
| `surface` | Cards, FAQ, closing panel | |
| `ink` | Headings and body text | `bg`, `surface`, `highlight` at 4.5:1 |
| `muted` | Secondary text | `bg`, `surface` at 4.5:1 |
| `accent` | Buttons, links, check marks, the spotlight band | `bg` at 3:1 |
| `onAccent` | Text on `accent` | `accent` at 4.5:1 |
| `highlight` | Reserved for soft accents | |

`npm run check` enforces those ratios. If a brand colour fails, darken the text colour or soften the highlight;
never drop the check.
