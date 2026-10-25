---
name: ph-clone-scout
description: Weekly Product Hunt scan that ranks current top launches by how easy they'd be to clone and relaunch, then emails James a minimal report. Triggers on "PH clone scout", "product hunt clones", or the Sunday scheduled run.
---

# PH Clone Scout

Goal: find the 3 Product Hunt products from the past week that would be easiest for a solo builder to clone and launch with a better angle, and email James a very minimal report.

## 1. Gather the boards
1. Get the week: `date +%G/%V` (ISO year/week; Product Hunt weeks run Monday to Sunday) and that week's Monday date.
2. WebFetch https://www.producthunt.com/leaderboard/weekly/YYYY/W (e.g. /2026/43). It shows only the top 10, mostly big launches.
3. WebFetch each day of the week so far: https://www.producthunt.com/leaderboard/daily/YYYY/M/D (no zero padding, top 10 per day). This is where the small cloneable tools are.
4. Record name, tagline, topics, score and the product slug from each entry.
5. If a fetch fails, WebSearch "Product Hunt leaderboard <week>" and fetch the result.

## 2. Shortlist
Drop anything one person can't clone in a few weeks: big-brand or funded-platform launches (Canva, Figma, 1Password, Framer, model labs), deep infrastructure (inference, headless browsers, agent infra, CAD engines), products an incumbent gives away free, and network-effect products with no seed community. Keep single-purpose apps and tools: Mac/iOS utilities, menu-bar apps, small SaaS, MCP servers, Chrome extensions.

## 3. Check the top ~6 candidates
WebFetch each product page (https://www.producthunt.com/products/<slug>) and note: what it does, platform, price (free / one-time / subscription), license if open source (FSL or similar = do not copy code), feature requests in comments the maker says aren't built yet, platforms marked "coming soon" or not planned, and competitors in the sidebar.

## 4. Score
Judge build effort (weekend / 1-2 wks / 3+ wks), outside dependency risk (paid or locked APIs), whether people pay, and whether there's a concrete gap to launch into. Pick the top 3: easiest build that still has a real gap. A paid product proves demand; a free one only proves interest.

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

No greeting, no intro, no sign-off, no methodology. If nothing worth cloning showed up, the body is one line: `No good clone targets this week.`

If the Gmail tool won't load or is signed in to the wrong account, don't stop silently: end the session with the same subject and body as your final message, saying why the email wasn't sent.

## Gotchas
- Leaderboards show a "score", not upvotes, and rank is frozen at the end of the period, so scores can look out of order. Use rank.
- A slug that is a company name (`figma`, `canva`, `claude`, `loom`) is a big-brand launch: drop it.
- The homepage only shows a handful of products per section; the leaderboard URLs above are the full lists.
- `/leaderboard/weekly/...` and `/leaderboard/daily/...` load with WebFetch; plain `curl` gets a 403.
