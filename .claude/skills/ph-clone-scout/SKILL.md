---
name: ph-clone-scout
description: Weekly Product Hunt scan that ranks current top launches by how easy they'd be to clone and relaunch, then emails James a minimal report. Triggers on "PH clone scout", "product hunt clones", or the Sunday scheduled run.
---

# PH Clone Scout

Goal: find the 3 Product Hunt products from the past week that would be easiest for a solo builder to clone and launch with a better angle, and email James a very minimal report.

## 1. Gather the boards
1. WebFetch https://www.producthunt.com/ and pull today's launches, yesterday's top products, and last week's top products (name, tagline, topics, points).
2. Follow the homepage's "See all of yesterday's top products" and weekly leaderboard links for the full lists. URLs look like /leaderboard/daily/YYYY/M/D and /leaderboard/weekly/YYYY/WW.
3. If a fetch fails, WebSearch "Product Hunt leaderboard <this week>" and fetch the result.

## 2. Shortlist
Drop anything one person can't clone in a few weeks: big-brand or funded-platform launches (Canva, Figma, 1Password, Framer, model labs), deep infrastructure (inference, headless browsers, agent infra, CAD engines), products an incumbent gives away free, and network-effect products with no seed community. Keep single-purpose apps and tools: Mac/iOS utilities, menu-bar apps, small SaaS, MCP servers, Chrome extensions.

## 3. Check the top ~6 candidates
WebFetch each product page (https://www.producthunt.com/products/<slug>) and note: what it does, platform, price (free / one-time / subscription), license if open source (FSL or similar = do not copy code), feature requests in comments the maker says aren't built yet, platforms marked "coming soon", and competitors in the sidebar.

## 4. Score
Judge build effort (weekend / 1-2 wks / 3+ wks), outside dependency risk (paid or locked APIs), whether people pay, and whether there's a concrete gap to launch into. Pick the top 3: easiest build that still has a real gap.

## 5. Email the report
Send with the Gmail connector (load via ToolSearch: select:mcp__Gmail__send_message) to astrojams1@gmail.com.

Subject: `PH clone picks — <Mon D>`

Body, plain text, nothing else:

```
1. <Name> — <what it is, ≤8 words>. Angle: <the gap, ≤12 words>. <PH link>
2. ...
3. ...
```

No greeting, no intro, no sign-off, no methodology, no extra sources. If nothing worth cloning showed up, send one line: `No good clone targets this week.`

If Gmail is unavailable, send the same three lines with SendUserMessage instead and say the email couldn't be sent.
