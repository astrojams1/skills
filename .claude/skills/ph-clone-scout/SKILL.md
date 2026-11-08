---
name: ph-clone-scout
description: Weekly Product Hunt scan for commercially promising products a solo builder could launch with a focused angle. Triggers on "PH clone scout", "product hunt clones", or the Sunday scheduled run.
---

# PH Clone Scout

Find three opportunities from this week's Product Hunt launches where a solo builder can sell a focused product to a reachable group of buyers. Use the launches as leads and look for evidence in the market they serve.

## 1. Gather the boards
1. Get the week: `date +%G/%V` (ISO year/week; Product Hunt weeks run Monday to Sunday) and that week's Monday date.
2. WebFetch https://www.producthunt.com/leaderboard/weekly/YYYY/W (e.g. /2026/43).
3. WebFetch each daily board from Monday through today at https://www.producthunt.com/leaderboard/daily/YYYY/M/D (no zero padding). Look past the top ten when the board exposes more entries.
4. Record name, tagline, topics, score and the product slug from each entry.
5. If a fetch fails, WebSearch "Product Hunt leaderboard <week>" and fetch the result.

## 2. Shortlist by buyer and job

Favor recurring workflows where a defined buyer already loses time, money, or sales. Look across customer support, agency and freelance work, ecommerce, back-office operations, and professional workflows. Consider a narrow paid workflow inside a larger launch when it can stand on its own. A web app, integration, extension, or mobile app can all qualify.

Screen out cosmetic tweaks and convenience utilities unless you can point to a consequential workflow and evidence of spending. Also screen out commodity features bundled free, products that need a network to work, and bets that depend on proprietary data, locked APIs, deep infrastructure, or replicating an entire platform.

## 3. Check about six candidates

Read each Product Hunt product page at https://www.producthunt.com/products/SLUG and check the maker's pricing or docs. Record the product, platform, pricing, relevant license, stated limitations, and direct alternatives. Use only your own implementation when a source license bars reuse.

Look outside the launch for buyer evidence. Check recent reviews, marketplace listings, public buyer discussions, or paid alternatives. For each candidate, record the following with source URLs and distinguish observed facts from estimates.

- **Buyer and pain.** Name the role that pays, the repeated job, its current workaround, and the cost of leaving it unsolved. Find evidence from people who do the job.
- **Willingness to pay.** Look for paid usage, buyers describing a budget or current spend, or a priced substitute for the same job backed by independent evidence that buyers use it to solve that problem. A public list price, maker claim, upvote count, or feature request alone does not clear this gate.
- **Reach.** Identify one place where buyers already look for help with this job, such as a specific marketplace category, trade community, or search query with buyer intent. Explain how a solo builder could reach the first ten buyers there. Use the observed price range to check how many customers or monthly sales meaningful revenue would require.
- **Gap and scope.** Identify a buyer-valued outcome that current options serve poorly. Check the closest substitute for the proposed angle. Describe the smallest version someone would pay for, the time to ship it, and its API, data, support, or compliance dependencies. A first paid version should fit within a few weeks of solo work.

## 4. Gate and rank

Require credible evidence for buyer pain, spending, a reachable acquisition channel, and a defensible gap with a feasible paid MVP. Unknowns that could overturn any gate keep a candidate out of the picks. A small professional utility can qualify when it clears the same gates.

For candidates that pass, score each factor from 0 (no evidence) to 2 (strong evidence). Weight willingness to pay and pain ×3 each, reach and differentiation ×2 each, and solo feasibility ×1. Rank by the weighted total, breaking ties on stronger buyer evidence. Record scores for qualifying candidates, sources for every check, and reasons for each rejection. Use Product Hunt rank for discovery only.

If fewer than three pass, revisit the boards for promising buyers or workflows missed on the first pass. Check up to three more candidates with the same gates before choosing the report format.

## 5. Email the report
Load the Gmail connector's send tool with ToolSearch query `gmail send message` and send to astrojams1@gmail.com. Search by keyword: the server name varies by session (`mcp__Gmail__send_message` in one, `mcp__<uuid>__send_message` in another).

Before sending, check which account the connector is signed in to: search one recent `in:sent` message and read its sender. Send only if it is astrojams1@gmail.com. Any other account (a work account such as cleanstreets.io) means don't send; use the fallback below and name the account you found.

Subject: `Product Hunt clone picks, week of <Mon D>` (the week's Monday, e.g. `week of Oct 19`).

Body, plain text, nothing else:

```
1. <Name> — <what it is, ≤8 words>. Angle: <the gap, ≤12 words>. https://www.producthunt.com/products/<slug>
2. ...
3. ...
```

No greeting, no intro, no sign-off, no methodology. The angle should name the buyer or paid job when possible. If enough research was possible and zero candidates clear the gates, use the one-line body `No good clone targets this week.` If only one or two qualify, show those picks in the run result and withhold the email because the delivery format requires three. Report insufficient evidence or fetch coverage as a research failure.

If the Gmail tool won't load or is signed in to the wrong account, don't stop silently: end the session with the same subject and body as your final message, saying why the email wasn't sent.

## Gotchas
- Leaderboards show a "score", not upvotes, and rank is frozen at the end of the period, so scores can look out of order. Use rank.
- A slug that is a company name (`figma`, `canva`, `claude`, `loom`) is a big-brand launch: drop it.
- The homepage only shows a handful of products per section; the leaderboard URLs above are the full lists.
- `/leaderboard/weekly/...` and `/leaderboard/daily/...` load with WebFetch; plain `curl` gets a 403.
