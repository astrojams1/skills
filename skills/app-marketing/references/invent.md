# Invent: new ways to reach people, built and judged

Read this in full on any run where `next` lists an `invent` or `judge-` item.

The owner's words (James, 2026-11-12): "keep in mind that there are lots of ways to market besides sending emails and
youtube shorts...... wild creative ideas wanted". After seeing the first batch: "all these ideas sound good AND its
important that our skills / scheduled tasks think of ideas like this... so also keep improving the skills too".

## When it runs

`next` lists `<app>/invent` for every profile, web products included:

- **Every week.** It comes back 7 days after the last `invent` action with `status: ok`.
- **Any run with no experiment in flight.** If the app has no experiment waiting on a verdict, it comes back the next
  day. An experiment is in flight from the day it ships until its verdict is `keep` or `retire`.

`next` also lists `<app>/judge-<experiment id>` once an experiment's `judge` date has come. `learn` prints every
experiment with its state: `DUE`, `in flight` or its last verdict.

## The Invent step

Do it for every app `next` names, in the same run.

1. **Read four things.**
   - **The catalog** below.
   - **What the app uniquely has:** its data, its users, its physical presence, its content, its screens, its
     highest-traffic page (from `site-visits` or the site's analytics).
   - **What worked in the owner's other skills this week.** Read the newest results and their numbers:
     `marketing.mjs learn` here, and `marketing/ledger.jsonl` for other apps' experiments; Clean Streets
     `.claude/skills/patreon-growth/LEDGER.md` and `ledger.py due` in `astrojams1/cleanstreets`; Vegas Microworks
     `docs/outreach.md` and `docs/marketing.md` in `astrojams1/vegas-microworks`; money coaching
     `skills/lead-gen/ledger.jsonl` in `astrojams1/money-coaching`. On the Mac, also the shared activity ledger
     `/Users/astro/Library/Application Support/AgentActivityLedger/events.jsonl` (read only recent lines). In the
     cloud, read them with `gh api repos/astrojams1/<repo>/contents/<path>`. A source you cannot read is noted in the
     `invent` action's `evidence`, never a reason to stop.
   - **The news and the calendar:** a season, a holiday, a local event, an exam date, a policy or platform change
     that fits the app's audience. Search for it that day.
2. **Write at least five new ideas** for the app into its profile's `ideas`. At least three are neither cold email
   nor Shorts. An idea already in `ideas` or `experiments` is not new.
3. **Score each honestly** with these fields: `reaches` (who), `size` (about how many, with where the number came
   from), `effort` (1 to 5), `moves` (the one number it should move, such as page visits, downloads, sign-ups or
   links in). Add `pattern` (a catalog name, or `new`).
4. **Build the best one and release it in this run.** Best means the most of the moved number per unit of effort
   that the run can ship today with no spending, no new account and no password. Not a plan: a live page, file, tool,
   repo, listing or post that someone can open now. Ship it the usual way (Ship and Verify in `SKILL.md`).
5. **Record it as an experiment** in the profile's `experiments`:
   `{ "id", "idea", "pattern", "url", "measure", "shipped", "judge" }`. `measure` names the number and where it is
   read. `judge` is 14 days after `shipped`. A longer wait needs `judge_reason`, such as a search page that takes 8
   weeks to rank. Set the idea's `status` to `shipped`.
6. **Log one `action`** with `item: "invent"`, `channel: "invent"`, `status: "ok"`, `experiment` (the id) and
   `evidence` (the live URL and the ideas' ids). `log` refuses an `ok` invent action without `experiment`.
7. **The owner's options list.** An idea that needs a person (the owner, a crew, a partner) or money gets
   `needs: "person"` or `needs: "money"`, with `cost` and `returns` (what it would likely bring, with the basis).
   It never blocks the run. It goes in the report's options line. Pick the best idea that needs neither to build.

## Judging an experiment

When `next` lists `judge-<id>`, read the measure, then add a verdict to the experiment's `verdicts`:
`{ "on", "verdict", "evidence" }`, and log an `action` with `item: "judge-<id>"`.

- **`keep`:** it moved the number. Grow it: give the app a backlog item that does more of it, and add the pattern's
  result to the catalog example list below if it is new.
- **`change`:** it moved little, and one clear change could fix it. Make the change in this run and set a new `judge`
  date. An experiment changes once. The next verdict is `keep` or `retire`; `check` refuses a second `change`.
- **`retire`:** it did not move the number. Take it down if it costs anything to keep, and say why in `evidence`.

## Keep the catalog alive

- **Add a pattern** when a kept experiment does not fit any below. Write it in the same shape.
- **Cut a pattern** after three of its experiments, across all apps, are retired and none is kept. Note the cut in
  the skill ledger.

## The pattern catalog

Each pattern says when it fits, the smallest real version one run can ship, what to measure, and an example.

### 1. Public data story

- **When:** open data exists that the audience cares about and the product sits beside it.
- **Smallest version:** one page that turns the data into a ranked or mapped answer to a question people ask, with the
  source linked and a date. Pitch it to two reporters who cover the topic.
- **Measure:** page visits, links in, press mentions.
- **Example:** Clean Streets' "How clean is your block?" report card from San Francisco's 311 data.

### 2. A page for every searchable item

- **When:** the product holds many named things people search for (words, places, levels, foods, tools).
- **Smallest version:** generate one plain, useful page per item from data the product already has, each linking to
  the app. Not near-copies: each page carries the item's own facts.
- **Measure:** search impressions and visits to the item pages; web-referrer downloads.
- **Example:** Hanzi Cards' page for every HSK word.

### 3. Free self-serve tool

- **When:** the audience has one small job the product's skill can do in a browser.
- **Smallest version:** one page, no sign-up, that does the job and ends with a link to the product.
- **Measure:** tool uses, then clicks through to the product.
- **Example:** Vegas Microworks' free instant website checkup; the take-home pay estimator for tipped workers.

### 4. Printables and templates

- **When:** the audience uses paper, signs, lists or forms.
- **Smallest version:** a printable PDF or page with a QR code or short link to the product.
- **Measure:** downloads, and visits from the QR link's `?p=` or path.
- **Example:** the printable money-coaching flyer; the free name tag maker with a page per use.

### 5. Free downloads and open-source pieces on GitHub

- **When:** the product has a list, dataset, asset set or small library others would reuse.
- **Smallest version:** a public repo with the file, a clear README and a link back. List it where such files are
  shared.
- **Measure:** stars, clones, visits from github.com.
- **Example:** Hanzi Cards' free HSK lists in a public repo.

### 6. Embeddable widget or badge

- **When:** other sites would show something the product computes (a score, a streak, a status).
- **Smallest version:** a copy-paste snippet or image URL that shows it and links back.
- **Measure:** sites embedding it (referrers), visits from embeds.
- **Example:** a "checked by Vegas Microworks" site-health badge for a passing site.

### 7. Public leaderboard, index or scorecard

- **When:** a number can be compared across places, teams or products and updated on a schedule.
- **Smallest version:** a ranked table with the method stated, refreshed by a script, with a date on it.
- **Measure:** visits, citations and links in, return visits.
- **Example:** the "state of local small-business websites" report.

### 8. Cross-promotion across the owner's own things

- **When:** another app, site, channel or mailing list of the owner's reaches the same people.
- **Smallest version:** one line, card or link placed where it fits naturally (an about page, a site footer, the
  `/play/` page, an end screen).
- **Measure:** visits or downloads with that referrer.
- **Example:** web products that had no marketing got profiles and pages on the apps site.

### 9. What the product already shows people

- **When:** always. The app's own screens, store features (in-app events, custom product pages, promotional text),
  release notes and the site's highest-traffic page are seen by people already.
- **Smallest version:** one change to one surface: an in-app event for a season, a custom product page for one
  audience, a call to action on the busiest page.
- **Measure:** that surface's views and the downloads or sign-ups after it.
- **Example:** a store in-app event timed to an exam or holiday.

### 10. Ask existing users for one small thing

- **When:** the product has users, patrons or customers who like it.
- **Smallest version:** one specific ask in a place they already see (a review prompt the store allows, "share with
  one friend", "forward this to your block's group"). One ask, one link.
- **Measure:** the asked-for action's count.
- **Example:** asking Clean Streets patrons to forward the block report card to a neighbour.

### 11. Partnerships where each side gains

- **When:** another group serves the same people and lacks something the product has.
- **Smallest version:** a written offer of one concrete trade (free data, a tool for their members, a page about them)
  sent to one partner, with the thing already built.
- **Measure:** partner yes, then visits or downloads from their link.
- **Example:** offering a neighbourhood group the block report card for its newsletter.

### 12. Timely hooks

- **When:** a season, local event, deadline, rule change or news story touches the audience.
- **Smallest version:** a page, printable or post tied to that moment, shipped before it peaks.
- **Measure:** visits during the window against the weeks before.
- **Example:** a tax-season version of the tipped-worker pay estimator.

### 13. Public resource lists that welcome additions

- **When:** a curated list (an awesome-list, a directory, a library guide, a subreddit wiki) invites submissions and
  the product fits its rules.
- **Smallest version:** one pull request or submission that follows the list's rules exactly.
- **Measure:** accepted or not, then visits from that list.
- **Example:** adding the HSK lists repo to a Chinese-learning resource list.

### 14. Physical world (owner's options list)

- **When:** the product has a physical presence (a crew, a shop, an event) or a partner who does.
- **Smallest version:** none in a run: it needs a person or money. Write the idea with `needs`, `cost` and `returns`
  and put it on the options line.
- **Measure:** QR scans or a code on the item.
- **Example:** door hangers left by the Clean Streets crew; a chalk stencil on cleaned sidewalks; window stickers for
  sponsors.
