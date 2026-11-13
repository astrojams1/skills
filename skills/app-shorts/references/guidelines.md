# Shorts guidelines

One page to make and post a Short. Each line says what to do, then where it comes from and how it stands in our own
testing: **untested**, **testing** (with the experiment), **confirmed** or **refuted** (with the Short ids). The
evidence is in `research-2026-11.md`; the experiments are in `../ledger/experiments.md`.

**How this page changes.** The run that reads an experiment's verdict edits the guideline it tests in the same run:
its status, its Short ids, and its wording if the result says to (a refuted guideline is rewritten or deleted). Log
the change in `../ledger/LEDGER.md`. An owner's rule changes only when he says so.

`shorts.mjs rules <app> --checklist FILE` puts every line under "Make it" on the Short's checklist; `shorts.mjs due`
lists every public Short still missing a step under "After it is public".

## Make it

### Before recording

1. **Only a product that is live gets a Short.** Its marketing profile stage is `live`, or it has a live pre-order page.
   _Owner's rule (James, 2026-11-12). Enforced by `record`, `upload` and `publish`._
2. **One idea a stranger could retell in a sentence,** started from what worked: the October Newsworthy Shorts and the
   channel's three best (`creative.md`). Staged, scripted and composited footage is fine; never show a feature the
   product lacks. _Owner's rules (2026-11-12). Our own result: EB6GGrACO10, 90P4ykE6gSA, WkWreyCzpKI._
3. **Make it 7 to 15 seconds** unless the story needs more. Anything with music that Content ID could claim stays
   under 60 seconds. _Our own result: the three best recent Shorts run 7, 9 and 11 s. Platform fact: a claimed Short
   over a minute is blocked worldwide. Status: testing (E5)._

### The first second

4. **Open on the payoff, already moving.** The first frame shows the result or the action: no title card, logo,
   phone-on-a-background or setup. _Common practice; the feed's own signal is watch-or-swipe (platform fact). Status:
   testing (E3)._
5. **By 3 seconds a stranger knows what it is** and what it works with, in the words they would search ("Function
   Health labs → Apple Health"). _Owner's rule (2026-11-11)._
6. **End on a frame that leads back into the first,** so the loop restarts without a seam. _Common practice. Our own
   result: Giraffe 90P4ykE6gSA at 206 % viewed. Status: testing (E4)._

### The body

7. **The product's own picture fills the frame,** large and simple: obviously an iPhone app, obviously easy; never a
   small phone of tiny rows. _Owner's verdicts (2026-11-12)._
8. **Change the picture every one to two seconds** (a cut, a zoom, a new state). _Common practice. Status: untested._
9. **A news app shows the real news, whole,** named people included. _Owner's rule (2026-11-12)._

### Words on screen and captions

10. **At most 6 words on screen at once, on one line, and at most 25 words in the whole Short,** the ending included.
    _Common practice; the owner (2026-11-13): pro Shorts use "just simple subtitle captions"; our best Shorts carry
    almost none. Status: testing (E1)._
11. **Captions are plain:** one short line, the same place and style throughout, inside the safe box, every word at
    4.5:1 contrast. No paragraphs, step pills, receipts or slides of text. _Owner (2026-11-13); contrast is the
    owner's rule (2026-11-11). Status: testing (E1)._
12. **Hold each line at least 1 second** (about 0.3 s a word). _Common practice._
13. **It must make sense on mute:** the picture tells the story and the words only label it. _Measured by others:
    2019 survey, 92 % watch mobile video with sound off (self-reported). Status: untested._

### Sound

14. **Score it fresh:** real music arranged for this Short, or the product's own sound; claim the beds first
    (`shorts.mjs claim`). No commercial tracks. _Owner's rule (2026-11-11); platform fact on claims (guideline 3)._

### Title, description, hashtags, tags, cover

15. **Title:** the product's name in the first 40 characters, then what it does in the searcher's words. _Our own
    measurement (the player shows about 40). Enforced by `record`._
16. **Description, line 1:** the product, what it does, and how to find it: "Search 'Füd family' on the App Store."
    (a web product: its address). **Line 2:** the attributed store link (`shorts.mjs link`), which clicks on
    desktop pages that show it. _Owner's rule (2026-11-12). Enforced by `record`._
17. **Three hashtags at the end of the description:** the product's own (#spaceworms), then two topics a viewer
    would follow. Never more than five. _Platform fact: up to three show by the title. Measured by others: hashtags
    traded about 10 % of views for 9 % more engagement (Metricool, 800k videos). Status: untested._
18. **Tags:** the product's name, its variants and its common misspellings (fud, fued, food tracker), 3 to 8 in all.
    _Platform fact: tags matter little, except for misspellings._
19. **Cover:** a JPEG made for it, the product big; it shows in search and on the channel page, rarely in the feed.
    _Platform fact._
20. **Audience: always "No, it's not made for kids".** _Owner's rule (2026-11-12): made for kids turns comments off._
21. **Three independent reviewers, never the owner, then publish at once.** At most three rounds; fix every concrete
    fault, then make it public. Never schedule. _Owner's rules (2026-11-12)._

## After it is public

### Comment and link (the same hour)

22. **Post the channel's first comment and pin it:** where to get it, as the exact search phrase or address (no URL:
    links in Shorts comments do not click), then one question a viewer can answer in a word. `yt-api.mjs comment
    --episode ID --text "..." --confirm`, then pin it on the Short's page. _Common practice; platform fact on links.
    Status: testing (E2)._
23. **Set the Related video in Studio** (Content → the Short → Related video), the one link on a Short that clicks.
    Point it at the product's long walkthrough (its description's first line is a clickable store link) once one
    exists; until then at the same product's best other public Short, else the channel's Short with the nearest
    audience. Record it with `shorts.mjs mark`. _Platform fact. Status: testing (E2)._
24. **The channel's first link** (shown by the Subscribe button) goes to the page that lists every product with its
    store link. _Platform fact._

### The days after

25. **Answer every real comment within a day;** a real question becomes a "Reply with a Short" idea. _Platform fact
    (the feature); common practice. Status: untested._
26. **Never delete and re-post a Short to retry it;** make a new one. _Platform fact: YouTube treats it as spam._
27. **At day 3 read "viewed vs. swiped away" and average % viewed** in Studio and add them to the snapshot
    (`viewedRate`). _Platform fact: the feed's own signal._
28. **Judge at 72 hours on downloads** (site visits for a web product or Vegas Microworks); three no-effect verdicts in
    a row retire an app or a format. _Owner's rule (2026-11-12)._
