---
name: ouro-website
description: Keep the Ouro apps website (https://ouro-apps.vercel.app, sites/ouro in repository astrojams1/app-sites, which it shares with the astrojams site) true to the App Store without being asked. Audit every app on Ouro LLC's App Store Connect team (team AYCDG243RJ) against the site, add or exclude new apps, flip "Coming soon" to the App Store badge on release, refresh names, subtitles, copy, screenshots, icons and theme colours, and deploy. Use whenever an Ouro app record is created, uploaded, submitted, approved, released, renamed or its listing or screenshots change; when the "Ouro website needs an update" issue opens; when someone asks whether the site is current or to change its pages, copy or design; and at the end of any app-release run for an Ouro app.
metadata:
  version: "1.3.0"
  ledger: ledger/LEDGER.md
---

# Ouro website

**Keep the Ouro apps website true to the App Store.** The site markets Ouro's family apps. Every app has a landing page
at `https://ouro-apps.vercel.app/<slug>/`: the app's App Store **Marketing URL** and the link to share.

Done means: every app on the team is shown or excluded with a reason, the live pages match the store, and the run is
recorded.

## Where things are

| What | Where |
|---|---|
| Site repository | `/Volumes/ssd/code/app-sites` (GitHub `astrojams1/app-sites`, private). This site is `sites/ouro`; the astrojams site is `sites/astrojams`; both are built from `packages/showcase` |
| Project home (research, captures, staging) | `/Volumes/ssd/projects/ouro-apps/` |
| Curated catalog | `sites/ouro/src/data/apps.json` (copy, theme, screenshots, FAQ, `excluded` records, and the site's `brand` and `copy`) |
| App Store snapshot | `sites/ouro/src/data/store.json`, made by `npm run sync:store -w sites/ouro`. Never edit it by hand |
| Images | `sites/ouro/src/assets/apps/<slug>/icon.png` and `screen-N.jpg` |
| Design (shared with the astrojams site) | One typeface (Figtree), white space, each app's own colours. Home is a colour stage (`packages/showcase/src/components/Stage.astro`, scroll maths in `packages/showcase/src/lib/stage.js`): pinned on wide screens, natural scrolling with large screens on phones. App pages are `packages/showcase/src/pages/[slug].astro` |
| Vercel | team `astrojams1s-projects`, project `ouro-apps`, Root Directory `sites/ouro`; deploys `main` |
| Audit | `node <this skill>/scripts/audit.mjs` (Node 22, no dependencies, read-only) |

**What runs on its own.** A GitHub workflow runs `sync:store` every six hours and commits `store.json` changes. Vercel
deploys them, bot commits included. It also opens the issue **"Ouro website needs an update"** in
`astrojams1/app-sites`. It does so when Apple lists an Ouro app the catalog neither shows nor excludes, or a live one
disappears. So a release flips the badge by itself. Everything else needs this skill.

## Authority

The owner approved this on 2026-11-02: routine updates from verified store facts ship without asking.

Repository rules and approval holds outrank this skill.

## A run

Use Node 22 (`PATH=/opt/homebrew/opt/node@22/bin:$PATH` on the owner's Mac).

1. **Sync.** At the site repository's root, run `git pull --ff-only` and `npm ci`, and read its `AGENTS.md`. Check open
   issues with `gh issue list --repo astrojams1/app-sites`. This site's issues carry "Ouro" in the title.
2. **Refresh public status.** Run `npm run sync:store -w sites/ouro`. Exit 2 lists a live Ouro app the site does not
   know. Exit 3 lists a listed app Apple no longer returns.
3. **Audit App Store Connect.** Run `node <skill>/scripts/audit.mjs` (`--json` for detail). It reads the App Store
   Connect key from the 1Password item named in any Ouro app's `app-release.config.json`. It follows the token rules in
   the owner's `AGENTS.md`. For every record on the team it prints the version state, whether the site shows, excludes
   or misses it, and the local repository. **Actions** list new records, renamed apps or subtitles, released apps not
   yet synced, and catalog apps that left the team. **Follow-ups** list app repositories whose `listing.marketingUrl`
   is not the app's page here.
4. **Decide each new record.** Add it if it is for families: parents, kids, caregivers, home life. Otherwise, or if it
   is a duplicate, placeholder or test record, add it to `excluded` with a one-line reason, so no audit asks again. Ask
   the owner only when the listing leaves it truly unclear. An app appears once it has an App Store Connect record and
   a listing to draw from. It does not wait for review.
5. **Write or refresh the entry** per [content](references/content.md). Draw on the app's own listing (its
   repository's store data, else App Store Connect). Use its makers' materials too, such as their website and the app
   team's notes.
6. **Source the images** per [assets](references/assets.md): a 1024px icon, 2 to 6 real screenshots, alt text.
7. **Verify, then ship.** Commit to `main` naming the apps changed, and push. Confirm the Vercel production deployment
   for that commit is `READY` and the live pages show the change.
8. **Close the loop.** Close the GitHub issue with a comment saying what changed. Set each follow-up's
   `listing.marketingUrl` in its app repository, through that repository's normal branch or pull-request flow. If it
   has unrelated work in progress, record it as the next action in its release ledger instead. app-release sends it
   with that app's next `asc.mjs listing`.

## Verify

- **Tests and build.** At the repository root, `npm test` and `npm run build` (both sites) pass. `npm run check`, part
  of the build, fails on missing fields or images, poor colour contrast and App Store wording Apple forbids. Fix the
  data. Never weaken the check.
- **Every changed page.** Run `npm run preview -w sites/ouro` and look at each changed page at 1280px and 375px wide.
  Sections fade in on scroll, so wait a second (or add `is-visible` to `.reveal` elements) before judging a blank area.
  At phone width, `document.documentElement.scrollWidth` must equal the viewport width.
- **Scroll check,** after any home-page change (an app added, removed or reordered, new screenshots, stage code). Paste
  `packages/showcase/tests/browser/stage-scroll.js` into the preview's home page and `await stageScrollCheck()` at
  1440×900 and 375×812. It must return `ok: true`. A full run takes minutes and evaluation tools time out, so start it
  without awaiting, store the result on `window`, and poll.
- **iPhone Safari.** Every iPhone browser runs WebKit, and the browser pane is Chromium. After a home-page or layout
  change, also open the preview in Mobile Safari on an iOS Simulator, which reaches the Mac's `localhost`. Follow the
  owner's simulator storage and lease rules. Check the stage at phone size. The scroll check can run there too, served
  from the built page with its result on screen.
- **Link-preview card.** Open `sites/ouro/dist/og/<slug>.png` and check the headline, icon and status fit.
- **Badge.** A live app shows Apple's black badge, a QR code on desktop and the sticky bar on phones. It shows its
  rating once five people have rated it. A coming-soon app shows "Coming soon to the App Store" and never the badge.
- **Live.** After deploying, `curl -s -o /dev/null -w '%{http_code}' https://ouro-apps.vercel.app/<slug>/` is 200.

## Rules

- **Design changes go through a pull request.** A new section, layout or dependency goes on a branch with a pull
  request and screenshots for the owner. Content and asset updates go straight to `main` once verification passes.
- **Shared code changes both sites.** Anything in `packages/showcase` changes the astrojams site too. Build and look at
  both sites, put screenshots of both in the pull request, and say so in the report.
- **Words and brand stay in the catalog.** A difference that is only words or brand belongs in `site.copy` or
  `site.brand`, not in a branch of the shared code.
- **Never change App Store Connect from this skill.** Save the fix or the recommendation in the app's repository.
  app-release sends it and reads back Apple's field. Never claim a local edit changed App Store Connect.
- **Never print or log a key value.**
- **Preserve anyone else's uncommitted work.**

## Report

- **Changed:** what changed per app, the commit, the deployment and the live URLs.
- **Follow-ups:** the audit's remaining follow-ups.
- **Needs you:** only steps shown to need the owner.

## Gotchas

Icon, screenshot and link-preview lessons are in [assets](references/assets.md), under Lessons.

- **Giraffe Stretch has three records (2026-11-02).** `6828973581` (`com.ouro.giraffestretchtest1`) is the real one.
- **The public lookup trails releases (2026-11-02)** by hours. A released app still "coming soon" needs only a later
  `sync:store`, not a manual status edit.
- **The preview pane lags a frame (2026-11-02).** The first screenshot after a scroll can show the previous frame.
  Take two.
- **WebKit sizes stage screens its own way (2026-11-02).** It sized a stage screenshot from its own 74svh cap, not its
  grid cell's `100%`. On iPhones it ran off the frame while Chromium looked perfect. The stage sizes screens with
  container query units.
- **Don't pin the stage on phones (2026-11-02).** In the owner's iPhone recordings a pinned stage felt dead under the
  finger, shrank the screenshots and jolted as the toolbars came and went. Phones get natural scrolling.
- **iOS Safari paints the clock strip (2026-11-02).** When anything fixed touches the top edge, Safari paints the strip
  behind the clock one solid colour and keeps it. Never give the fixed header a background, move the bar, or slide
  chips off the top. Hidden chips fade out in place. Check by scrolling between apps in the iOS Simulator with the
  chips shown.
- **Link only to public pages (2026-11-02).** Moment to Meaning's own site was private (HTTP 401) on 2026-11-02, so the
  page has no `links.website` yet. Add it once the site is public.
- **Astro needs Node 22.22 (2026-11-02).** Homebrew `node@22` is new enough; the default `node` (20) is not.

## Records

- **Activity ledger:** record each run as the owner's `AGENTS.md` requires, with
  `/Users/astro/.codex/skills/mac-memory-maintenance/scripts/ledger.py`. Use one `run_id` and `skill: "ouro-website"`.
  Log events `start`, each `action` or `finding`, `verify` and `end`, with targets, evidence (commit, deployment id,
  URLs) and anything skipped.
- **Lessons** that would change the next run go in [ledger/LEDGER.md](ledger/LEDGER.md), and in Gotchas when they
  generalize. Append rows; never rewrite them.
