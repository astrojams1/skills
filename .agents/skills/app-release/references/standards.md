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

**The address.** astrojams1@gmail.com is the owner's published support contact for both teams' apps: Newsworthy and
Importron on the personal team; Füd, Giraffe Stretch and Nametag on Ouro LLC, whose support pages all give it. Use it
unless the owner names another for an app.

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

Applies only to an app whose source embeds a web view (`WKWebView`, `react-native-webview`, `webview_flutter` and the
like); the audit shows it as n/a otherwise. App Review treats anything a web view shows as the app's own content. Plenty
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

Then check every app (`audit --all`) before merging, because a new standard stops each app's next build until it is
met: that is the point, so ship it with a `fix` an agent can follow without asking.
