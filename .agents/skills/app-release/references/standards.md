# App standards

Things every app the owner ships has, done the same way. New apps get them at onboarding; existing apps find what
they lack on their next release run and fix it in that run's build. [assets/standards.json](../assets/standards.json)
is the machine-readable catalog, `scripts/standards.mjs` audits against it, and this page is the spec.

| Standard | What the app has | Audit id |
|---|---|---|
| [Send Feedback](#send-feedback) | A control that opens a pre-filled email to the owner | `feedback` |
| [Privacy link](#privacy-and-support-links) | The privacy policy, linked from inside the app | `privacy-link` |
| [Support link](#privacy-and-support-links) | The support page, linked from inside the app | `support-link` |
| [Embedded web pages](#embedded-web-pages) | Any web view shows only what it is for, and never a price, plan or upgrade offer | `web-sheet` |
| [Ask for a rating](#ask-for-a-rating) | The store's own rating prompt, after a good moment, on a shared rule | `rating` |
| [More apps](#more-apps) | A row listing the owner's other live apps, each opening its App Store page | `more-apps` |
| [First-launch count](#first-launch-count) | One anonymous event on the first open after install, counted on the owner's server | `first-launch` |

## The audit in a run

Run it from the app repository at the start of every run:

```bash
node $S/standards.mjs audit          # pass, MISSING or opted out per standard, with what to do; nonzero when missing
node $S/standards.mjs audit --json   # the same for a script
node $S/standards.mjs audit --all    # every repository under /Volumes/ssd/code, read-only, as a table
```

Each missing standard becomes an `issue.standard.<id>` gate, recorded as it is found (the audit prints the id). Fix it
in this run's build and close the gate with the audit's pass **and** the check under the standard, as for any issue
([ledger](ledger.md)). Do not defer it: `ios-release.mjs archive`, `android-release.mjs bundle` and `release`, and
`asc.mjs submit --confirm` all refuse an app that is missing a standard, the last before any write. A test build
with `--allow-dirty` gets a warning, so the fix itself can be tried on a device.

A build already uploaded lacks anything added since, so when a resubmission's only change is store data and the audit
fails, the fix still needs a new build. Plan for it in the run; do not opt out to save the build.

The audit reads the app's configuration, store data and git-tracked source under `projectDir`. Vendored skills, dot
folders (`.claude/`, `.agents/`), dependencies, build output, websites, store and ledger files and tests do not count.
A pass means the source shows the standard, not that it works: the check under each standard is what proves that. It
cannot see the two-tap limit, what the footer holds in a hand-written version, or the published support page.

## Opting out

An app that truly cannot have a standard records why in `app-release.config.json`, and only there:

```json
"standards": { "optOut": { "feedback": "Why this app cannot have it, in a sentence." } }
```

The owner's decision or a real technical reason counts; not having got to it does not. A reason under ten
characters is refused. The audit shows the opt-out and its reason on every run, and the run log says so when one is added.

## Send Feedback

Feedback is a pre-filled email: no backend and no SDK, so the App Privacy and Data safety answers do not change.

| Rule | Detail |
|---|---|
| Control | Labelled exactly **Send Feedback**, at most two taps from the app's main screen; the settings or about screen is fine |
| Kids apps | Behind the parental gate, with the other links out of the app |
| Recipient | `feedback.email` in `app-release.config.json` |
| Subject | Exactly `[<App name> feedback] <version> (<build>)` |
| Body | Empty space for the user to write in, then a footer with only app name, version, build, OS version, device model and locale |
| Never in the email | User identifiers, account data, logs |
| iOS native | `MFMailComposeViewController` when `canSendMail()`, else a `mailto:` URL, else an alert showing the address with a Copy button |
| Expo, React Native, Capacitor | `mailto:` through `Linking` or the equivalent, with the same fallback |
| Marker | The source file implementing it carries the comment `app-standard: feedback`, so the audit can find it |
| Support page | Mentions the same address |

Copy the reference rather than rewriting it, so every app behaves the same:
[FeedbackButton.swift](../assets/feedback/FeedbackButton.swift) for SwiftUI, or
[feedback.ts](../assets/feedback/feedback.ts) for Expo, React Native and Capacitor (its header has the calls for each).
Both already carry the marker and build the subject and footer. Set the address in the copy to `feedback.email`.

**The address.** astrojams1@gmail.com is the owner's published support contact for both teams' apps: Newsworthy on
the personal team; Füd, Giraffe Stretch and Nametag on Ouro LLC, whose support pages give it. Use it unless the owner
names another for an app. Importron uses it too: the owner chose it on 2026-11-18, and Importron 1.0.1 and its support
page carry it beside public GitHub issues; both repositories' `AGENTS.md` allow that one published address.

**Check it.** Tap the control on a simulator or device. A simulator has no mail account or Mail app, so it shows the
fallback: the address and a Copy button that puts the address on the clipboard. On a device with a mail account, see
the composer with the right recipient, subject and footer. Then open the support page and see the address. Record
which path was seen; a simulator's fallback does not show the composer works, so say that in the record.

**What can be said truthfully.** Say only what the shipped code does:

- Review notes: "Send Feedback opens the user's own mail app with a pre-filled draft to `<address>`. The app sends
  nothing itself; the user sees and can edit the whole message, including a footer with app name, version, build, OS
  version, device model and locale, and sends it from their own account only if they choose."
- App Privacy and Data safety: the app transmits nothing here, and the message leaves through the user's own mail app
  at their choice, so the answers do not change. Apple's definition of collecting is the app transmitting data off the
  device, and it lists optional feedback and customer service requests among what may not need disclosure
  ([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)). Recheck that page if the design
  changes: a feedback form posting to a server is a different answer ([privacy](privacy.md)).
- Privacy policy: if someone emails the owner, the owner receives their address and what they wrote, including the
  footer, and uses it to answer them. If the policy says the owner receives no data at all, correct it in the same run.
- Kids Category notes: name the parental gate in front of the control, and state that no data is collected by the app.

## Privacy and support links

The privacy and support pages live on the web and are linked from both listings **and from inside the app** ([app
types](app-types.md)), on the settings or about screen, and behind the parental gate in a Kids Category app.

The audit passes on the store data's URL in the source, on a URL or route naming privacy or support, or on a name such
as `privacyURL`. A heading called "Privacy" with no link does not pass. Where an app builds the URL in a way the audit
cannot see, put the comment `app-standard: privacy-link` or `app-standard: support-link` beside it.

The privacy policy must be its own page: the audit fails when `listing.privacyPolicyUrl` is the marketing or support
URL, which once let an app with only a marketing page pass (Hanzi Cards, 2026-11-10). The support page must show a
contact address.

**Check it.** Open each link from inside the app and see the live page.

## Embedded web pages

Applies only to an app whose embedded web view loads web pages (`load(URLRequest(…))` on a `WKWebView`, a
`react-native-webview` `source={{ uri: … }}`, Flutter's `loadRequest(Uri.parse(…))`, an in-app browser); a web view
showing only the app's own bundled HTML is not covered, and the audit shows n/a. App Review treats anything a web view shows as the app's own content. Plenty
1.0 (build 7) was rejected under Guideline 2.1(b) on 2026-11-12, "references to Subscription" with no In-App Purchase
submitted: its sign-in sheet showed claude.ai/login, and that page now lists the plans and their monthly prices under
the form, with a Pricing link in the footer. The reviewer only scrolled.

| Rule | Detail |
|---|---|
| One job | A web view is there to sign in, or to show one page; it is not a browser |
| Links | A tapped link may only lead to another page of that job. Refuse the rest; do not open them in Safari either |
| Purchase pages | Refuse pricing, plans, upgrade, subscription, billing and checkout pages, even on allowed hosts |
| Other pages | Where the job must load a page it does not need to show (the web app a sign-in lands on), cover it with the app's own screen, since a web app changes page without a navigation the policy sees |
| Allowed pages | Hide any part that shows a price, a plan or an upgrade offer, and any footer of product links, again whenever the page redraws |
| Marker | The file doing this carries the comment `app-standard: web-sheet` |
| Tests | Unit tests replay the page the reviewer would reach: the real links, and the real page's layout in a web view |
| Review notes | Say the app sells nothing and what the web view can show |

**Check it.** On a simulator, open each web view, scroll every allowed page to the bottom and tap each link that is not
part of the job. No price, plan or upgrade offer appears and nothing else opens. Recheck at every release: these pages
belong to someone else and change without notice.

## Ask for a rating

The owner approved it on 2026-11-18. Asked "Should I add Apple's standard rating prompt (shown after a good moment, at
most three times a year by Apple's rule) to every app as a shared release standard, like Send Feedback?", he answered
"Yes, every app". Nine of the ten live apps had no rating that day and none asked for one. Ratings lift both search
rank and the share of visitors who download.

| Rule | Detail |
|---|---|
| The prompt | Only the store's own: StoreKit's `requestReview` on iOS, Play In-App Review on Android. No screen of the app's own in front of it ("Enjoying the app?"), which Apple disallows (Guideline 5.6.1) |
| No reward | Nothing is given or unlocked for rating, and nothing asks for a good one |
| No button | No control promises the prompt: the store may show nothing. A "Rate this app" row that opens the App Store's write-review page is allowed beside Send Feedback, and is not this standard |
| When | Right after a good moment the app names: a finished round, a saved entry, a completed set. Never at launch, in the middle of a task, or after an error or a loss |
| The shared rule | At least 3 good moments on at least 2 different days; never twice for one app version; at least 90 days after the last ask. The store adds its own limit (Apple: three prompts in 365 days) |
| After asking | The count starts again, so the next ask also follows fresh good moments |
| Kids apps | Called only from a screen behind the parental gate: the good moment is a parent's (a saved setting, a finished setup), never a child's |
| Data | Counts live in the app's own storage. Nothing leaves the device, so App Privacy and Data safety answers do not change |
| Marker | The source file implementing it carries the comment `app-standard: rating` |

Copy the reference rather than rewriting it, so every app behaves the same:
[RatingPrompt.swift](../assets/rating/RatingPrompt.swift) for native apps, or
[rating.ts](../assets/rating/rating.ts) for Expo, React Native and Capacitor (its header has the calls for each).
Both carry the marker and the rule. The app supplies one thing: where its good moment is.

**The good moment, by kind of app** ([app types](app-types.md)): a game, a round the player finished and did well in,
on the results screen; a tracker or utility, the entry that completes a day or a streak; a learning app, a finished
session; a reader, an article read to the end. Pick the moment a person would call a small win. When in doubt, pick
the later, rarer one.

**Check it.** A debug build always shows the prompt when the app calls it; TestFlight builds never do
([Apple: requesting App Store reviews](https://developer.apple.com/documentation/storekit/requesting-app-store-reviews),
read it again before relying on this). On a simulator, reach the good moment three times across two days (move the
device date, or seed the stored state in a UI test) and see the prompt once; reach it again and see nothing. Record
what was seen. A unit test covers the app's own call site where the app has tests.

**What can be said truthfully.** Review notes need nothing. If asked: "The app asks for a rating through the system
prompt only, after <the moment>, on the system's limits. It offers nothing in return."

## More apps

The owner approved it on 2026-11-19. Asked "Add a 'More apps' row inside every app (a small list of your other apps
with App Store links, as a shared release standard)?", he answered "Yes, every app". People who already like one of
the apps are the likeliest to download another, and a row costs nothing to show.

| Rule | Detail |
|---|---|
| Where | The settings or about screen, near Send Feedback. In a game, the settings or menu screen, never over play |
| What | Each listed app's icon, name and one line, the whole row a link. Plain copy; translated only if the app already localizes its UI |
| Which apps | Every live App Store app of both teams (Ouro LLC and the personal James Thompson team), never the app itself, never one the owner took out of marketing (World Sim, Clawgree, Eggaduppa, Universe of Sound) |
| One catalogue | The list is generated from astrojams1/app-sites at origin/main: the site catalogue (`sites/<site>/src/data/apps.json`: name, line, icon), Apple's lookup (`store.json`: available) and the marketing profile (`marketing/apps/<id>.json`: stage `live`, not `platform: web`). An app the catalogue does not list does not appear |
| Bundled | The list and 96-pixel icons are compiled into the app (`MoreAppsCatalog.swift` or `moreAppsCatalog.ts`), so the row works offline and never shows a broken image. Nothing is fetched, sent or counted by the app |
| Kept current | The audit fails when the list is older than 60 days or, on the Mac where app-sites is checked out, names different apps than the catalogue does today; run `more-apps.mjs write` again in that run's build |
| The tap | Opens `https://apps.apple.com/app/id<id>` with the platform's open-URL call. On iPhone, iPad and Mac that link opens the App Store app; a StoreKit product sheet would need UIKit hosting in SwiftUI and does not exist on macOS, for no gain the plain link lacks |
| Platforms | iOS, iPadOS and the Mac where the app ships there. Google Play is on hold: `moreAppsFor` returns nothing on Android and the web, so a shared screen shows no row there |
| Kids apps | Behind the parental gate, with the other links out of the app |
| Marker | The shared file carries `app-standard: more-apps`; the generated list carries `app-standard catalogue: more-apps` |

Copy the reference rather than rewriting it: [MoreApps.swift](../assets/more-apps/MoreApps.swift) for SwiftUI
(`MoreAppsSection()` inside a List or Form, or `MoreAppsLink()` for one row that opens the list), or
[moreApps.ts](../assets/more-apps/moreApps.ts) for Expo, React Native and Capacitor (the screen draws the rows from
`moreAppsFor(platform, bundleId)` with its own components). Then, from the app repository:

```bash
node $S/more-apps.mjs list                                      # what this app would list
node $S/more-apps.mjs write --swift <folder>/MoreAppsCatalog.swift
node $S/more-apps.mjs write --ts <folder>/moreAppsCatalog.ts
```

**Check it.** On a simulator, open the screen, see every listed app with its icon, name and line and not this app;
tap one and see its App Store page (a simulator with no App Store app opens the page in Safari). Record what was seen.

**What it is worth.** Apple's App Analytics counts the downloads the row brings as source "App referrer" with this
app's bundle id; `marketing.mjs pull` already reads them as `App referrer: <bundle id>`. That is the measure: nothing in
the app counts taps.

**What can be said truthfully.** App Privacy and Data safety do not change: the row sends nothing. Review notes need
nothing; if asked: "The More apps row lists the developer's other apps and opens their App Store pages."

## First-launch count

The owner approved it on 2026-11-19. Asked "Add a first-launch count to every app (each install reports one anonymous
first open to a server we run), so downloads show within minutes instead of Apple's one to two day lag? It may
require declaring analytics on each app's App Store privacy label.", he answered "Yes, every app".

| Rule | Detail |
|---|---|
| The event | One POST to `https://astrojams-apps.vercel.app/api/launch` on the first open after install: `{ app, version, platform, channel }`, the app's catalogue id, its version, `ios`/`ipados`/`macos`/`visionos`, and `store`, `testflight`, `debug` or `unknown` |
| Never sent | No IDFA, no IDFV, no device name or model, no locale, no account, no identifier of any kind. The audit refuses a marked file that reads one |
| Once | A local flag, set only after the server answers, stops repeats; a failed send is tried on a later launch. Deleting and reinstalling the app counts again, as Apple's first-time downloads do not |
| Never in the way | Runs after launch at background priority; failures are silent; nothing waits on it |
| Test and debug | UI tests (`-uiTest`) and debug builds send nothing unless launched with `-firstLaunchSend`; the server keeps debug and TestFlight apart from store installs |
| The server | `/api/launch` in astrojams1/app-sites (`packages/pitches/launches.mjs`) adds 1 to a daily total per Pacific day, app, version, platform and channel in the existing Neon store. No IP address, user agent, country or time of day is stored; unknown apps and malformed events are refused, and each server instance takes at most 30 events an hour from one address |
| The read | `marketing.mjs launches` prints first opens per app per day beside Apple's first-time downloads |
| Platforms | iOS, iPadOS and Mac. Not Android (Google Play is on hold). A Capacitor app calls FirstLaunch.swift from its AppDelegate, which can tell TestFlight from the store; Expo apps use firstLaunch.ts and report `unknown` outside debug |
| Marker | The shared file carries `app-standard: first-launch` |

Copy the reference rather than rewriting it: [FirstLaunch.swift](../assets/first-launch/FirstLaunch.swift)
(`.task { FirstLaunch.report(app: "<id>") }` on the root view, or in `didFinishLaunching`) or
[firstLaunch.ts](../assets/first-launch/firstLaunch.ts) (`reportFirstLaunch('<id>', platform)` in a startup effect).

**The privacy answers (read 2026-11-19).** Apple defines collecting as "transmitting data off the device in a way that
allows you and/or your third-party partners to access it for a period longer than what is necessary to service the
transmitted request in real time", and lists "app launches" under Usage Data > Product Interaction
([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)). A daily count kept on a server is
collected. It is not optional to disclose: that needs data the user provides in the app's interface and chooses to
send each time, which a launch event is not. So every app with the standard declares:

- **App Store Connect, App Privacy:** Data Types > Usage Data > **Product Interaction**; used for **Analytics**; **not
  linked** to the user (no identifier is collected, so nothing can be linked; Apple: "Stripping data of any direct
  identifiers ... before collection"); **not used for tracking**. If the app declared "Data Not Collected", that
  changes to this one type. This is a manual change in App Store Connect (the API has no App Privacy endpoint; see
  [privacy](privacy.md) for publishing it), made before the first build with the standard is submitted.
- **Privacy manifest:** an `NSPrivacyCollectedDataTypes` entry with `NSPrivacyCollectedDataTypeProductInteraction`,
  `NSPrivacyCollectedDataTypeLinked` false, `NSPrivacyCollectedDataTypeTracking` false and purpose
  `NSPrivacyCollectedDataTypePurposeAnalytics`
  ([Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests));
  an Expo app puts the same under `ios.privacyManifests` in its app config. The audit checks it.
- **No country.** Apple says to declare a kept IP address by its use, "such as precise location, coarse location,
  device ID, or diagnostics". Storing a country derived from the IP would add Coarse Location, so the server stores
  none; Vercel's own request logs are the hosting provider's and are not read for this.
- **Privacy policy:** says the app sends one anonymous message the first time it is opened (the app, its version, the
  kind of device and where it was installed from), that it holds no identifier and is kept only as a daily count, and
  that nothing else leaves the device for it. Correct any line saying the app sends or collects nothing.
- **Data safety (Google):** not needed while Android does not send it.

**Check it.** Build for a simulator and launch with `-firstLaunchSend`: one POST reaches the endpoint (204), and
`marketing.mjs launches` shows it under `debug` for today; launch again and see no second request. A unit test covers
the event body and the once-only flag where the app has tests.

## Adding a standard

Add an entry to `assets/standards.json` and a section here; the audit, the ledger gate and every refusal follow with
no script change. An entry has `id`, `title`, `doc`, `fix`, `verify` and `checks`, each check with a `problem`, and
optionally `appliesWhen` (`anyOf` patterns, with `flags`): when no app source matches, the standard is n/a for that app:

| Check `type` | Passes when |
|---|---|
| `config` | `path` in `app-release.config.json` has a value (`format: "email"` also validates it) |
| `marker` | `text` appears in a source file, which becomes the marked file |
| `source` | In the marked file (`in: "marker"`) or any source (`in: "app"`), an `anyOf` pattern matches (with optional `flags`) or a value named by `literalsFromConfig` or `literalsFromStore` appears |
| `wired` | Each of `names` the marked file defines is used in another source file |
| `kidsGate` | In a Kids Category app, the file using the control shows one of `anyOf` in its path or text |
| `distinctStore` | The store data value at `path` is set and differs from each of `from` (case and trailing slash ignored), or is unset |
| `absent` | No `anyOf` pattern matches the marked file |
| `privacyManifest` | A tracked `PrivacyInfo.xcprivacy`, `app.json` or `app.config.*` holds every `anyOf` text |
| `moreAppsCatalog` | The generated More apps list exists, is at most `maxAgeDays` old, does not list the app, and names the catalogue's apps when app-sites is readable |

Then check every app (`audit --all`) before merging, because a new standard stops each app's next build until it is
met: that is the point, so ship it with a `fix` an agent can follow without asking.
