# Marketing research brief, week of 2026-11-23

Read on 2026-11-26. Sources opened: 83 (8 of them read in part: an abstract, an introduction or the first part of a
long page; those are marked "part"). Case studies with numbers: 9. Kinds: research, platforms, practitioners, a
conference recap, builder case studies, industry data. This is the first brief, so there are no results to read
back yet.

Grades follow `references/sources.md`: A is a first-hand result with a method, B is a named source with numbers but
little method, C raises a question only.

## Top three

1. **The model that made a thing is a poor judge of it.** Grade A. Pombal, Rei and Martins (COLM 2026): when an
   output failed a rubric item, a judge was more than 50% more likely to wrongly pass it if the output was its own.
   Several judges at once cut the bias but did not remove it. Our agents now judge on numbers, not on their own
   opinion (see "What changes"). [arXiv 2604.06996](https://arxiv.org/abs/2604.06996)
2. **Journalists delete pitches that miss their beat, sound promotional or look mass-sent.** Grade A. Muck Rack,
   State of Journalism 2026 (897 journalists, Jan 30 to Mar 2, 2026): 54% seldom or never reply to pitches; 88%
   delete off-beat pitches, 71% promotional ones, 50% ones that look mass-sent. 69% want under 200 words and 50%
   say one follow-up is ideal. [PDF](https://media.muckrack.com/documents/State_of_Journalism_2026_1.pdf)
3. **AI answers use pages with numbers, definitions and comparisons; Q&A formatting alone does not help.** Grade A.
   Zhang, He and Yao (arXiv, Apr 2026; 602 prompts, 21,143 citations on ChatGPT, Google and Perplexity): numbers
   lifted a page's influence on the answer by 61.55%, definitions by 57.33%, comparisons by 55.28%. Local pages were
   used least. And AI assistants sent only 0.46% of visits to 118,670 sites in October 2026 (Ahrefs); Google sent
   24.74%. Win Google, and be the page AI Overviews cite. [arXiv 2604.25707](https://arxiv.org/html/2604.25707),
   [Ahrefs benchmark](https://ahrefs.com/benchmarks/ai-vs-search)

## Sessions

### Agents at work

- **A same-model "manager" agent is not a check.** A. Anthropic and Andon Labs, Project Vend phase two (Dec 18,
  2025): written procedures and tools ended most loss-making weeks. A CEO agent cut discounts about 80% but tripled
  refunds, and approved lenient requests about 8 times as often as it refused them. Anthropic says the two agents
  share blind spots. Fit: all businesses. P-024. [link](https://www.anthropic.com/research/project-vend-2)
- **An AI-run store handles operations but rarely checks the return on its own moves.** B. Andon Labs, Andon Market
  (live page, launch Apr 10, 2026): a sub-agent runs its social posts; the page reports $3,205 revenue against $1,874
  in tokens for an unstated period. No numbers on whether posts or press brought customers. Fit: all. P-024.
  [link](https://andonlabs.com/market)
- **Anthropic's own marketing team reports time saved, not results.** C. claude.com, Jan 26, 2026: ads drafted in
  30 seconds instead of 30 minutes; no click or conversion numbers. A pattern for making variants, not proof they
  work. [link](https://claude.com/blog/how-anthropic-uses-claude-marketing)
- **Most marketers running agents cannot trace an agent's lead to a sale.** B (vendor-commissioned). Invoca and
  Gather, Nov 10, 2026: 451 US marketing leaders; of the 323 running agents, 74% cannot fully track a lead to
  conversion and 7% use revenue as the main measure. Supports judging every channel on downloads, leads or money.
  [link](https://ppc.land/74-of-marketers-cant-track-if-ai-agent-leads-become-sales-invoca-finds/)
- **Launches this month (C until someone reports a result):** an agent that ran its own small ad campaign
  (Linkme, Nov 26, one customer); Cequence's agent-traffic index (Nov 23, vendor data, read secondhand).

### Measurement and testing

- **Peeking makes false winners.** A. Evan Miller, "How Not To Run an A/B Test": checking a no-effect test
  repeatedly and stopping when it looked good called 26.1% of them winners, not 5%. Fix the judge date first.
  P-007. [link](https://www.evanmiller.org/how-not-to-run-an-ab-test.html)
- **Evals: start from real failures, read transcripts, expect graders to break.** A. Anthropic Engineering, Jan
  2026: a grading bug held a score at 42% until a fix raised it to 95%; an agent read git history left by earlier
  trials. A task scoring 0% often means the grader is broken. P-006.
  [link](https://anthropic.com/engineering/demystifying-evals-for-ai-agents)
- **Validate an LLM judge against an expert with true positive and true negative rates.** B. Hamel Husain (updated
  Sep 1, 2026): a judge that always says "pass" scores 95% agreement at a 5% failure rate while catching nothing.
  P-006. [link](https://hamel.dev/blog/posts/llm-judge/)
- **Synthetic customers can rank options but get levels wrong.** A (two independent sources agree). Maier, Wiecki
  et al. (arXiv 2510.08338): with free-text answers mapped to ratings, GPT-4o reached 90% of human test-retest
  correlation on 57 product-concept surveys. Toubia et al. (arXiv 2509.19088, part): digital twins of 1,784 people
  were off on averages in 125 of 164 outcomes and too narrow in 154. Use only to pre-rank, never to replace a real
  test. P-009. [Maier](https://arxiv.org/html/2510.08338v2), [Toubia](https://arxiv.org/html/2509.19088v4)
- **Google sends only its origin as the referrer.** A. Google Search Central, new doc Nov 12, 2026: count landing
  page requests in server logs with `https://www.google.com/` or the Android app referrer. P-025.
  [link](https://developers.google.com/search/docs/monitor-debug/identify-google-search-traffic)
- **YouTube public views now add TV co-views.** A. YouTube Help (change from November 2026): engaged views leave
  them out. P-023. [link](https://support.google.com/youtube/answer/12220281)

### Email and pitching

- **Journalist preferences.** A. Muck Rack 2026, top three #2 above. 78% say a story fits when it affects their
  audience's community. P-001.
- **Warm mail got about three times the replies of cold mail inside one company.** B (vendor's own data). Cognism,
  State of Outbound 2026: 28.38% replies on 2,544 emails to people who knew the sender, 8.98% on 146,832 cold
  emails. "Warm" means an existing relationship, and the warm list was hand-picked. P-004.
  [link](https://www.cognism.com/reports/state-of-outbound-2026)
- **Small owners hire web people they already know.** B (2022 vendor study). GoDaddy: 204 owners who hired a web
  pro; 73% found one through recommendations; a personal relationship made a hire 2.5 times as likely. P-004.
  [link](https://www.godaddy.com/resources/news/what-clients-want)
- **Hand-written first emails drew about 2.5 times the replies of AI-drafted ones.** B. Pin (Jul 10, 2026), 5M+
  recruiting messages; the authors say targeting explains part of it. Step 2 drew 98% of step 1's replies, step 3
  76%. [link](https://www.pin.com/blog/ai-vs-human-recruiting-outreach-study)
- **AI rewriting did not change replies; warmth did.** A, part (abstract read; colleagues, not strangers). Ben-Zion
  and Lazebnik (arXiv 2607.11749): 121 employees, 16,880 emails, randomized crossover with GPT-5 rewrites. Neither
  rewrite changed replies; within a sender, more positive emails were more likely to get a reply (odds ratio 3.32).
  P-005. [link](https://arxiv.org/abs/2607.11749)
- **Shorter first emails, one or two follow-ups.** B (several vendor datasets agree; Pin disagrees on length).
  Smartlead (850M+ emails): first emails under 50 words needed 68 contacts per reply, 100 to 149 words needed 97.
  BuzzStream: under 300 words roughly doubled digital PR replies. P-001.
  [Smartlead](https://www.smartlead.ai/benchmarks/state-of-cold-email),
  [BuzzStream](https://www.buzzstream.com/blog/email-length-study/)
- **Tell the finding in the subject line, as a ratio.** B. BuzzStream (Sep 24, 2026; about 148,000 PR subject
  lines): telling beat teasing, 1.37% vs 0.88% replies; ratios like "1 in 4" got 2.22%. P-002.
  [link](https://www.buzzstream.com/blog/subject-line-phrasing-study/)
- **"Your stat is out of date" outreach.** A (2020). Ahrefs, Joshua Hardwick: emailed 515 sites that cited an old
  statistic, naming the exact stat and offering the update; 17.55% replied and 5.71% linked, with no follow-ups. A
  reason to write that is about their page, not our product. P-003.
  [link](https://ahrefs.com/blog/link-building-case-study/)
- **Spamhaus sender guidelines, rolling out from November 2026.** A. No sending from domains under 30 days old, no
  URL shorteners, no warm-up services that fake engagement, bounces under 5%. Gmail's own rules show no change this
  month. P-026. [Spamhaus](https://www.spamhaus.org/sender-guidelines/),
  [Google](https://support.google.com/a/answer/81126)
- **Senders fear AI more than readers do.** C. Hunter.io survey, no method. A question only.

### Persuasion and copy

- **Many checkable facts persuade; personal tailoring adds little.** A. Hackenburg et al. (Science, Dec 2025;
  76,977 people, 19 models): each extra claim added 0.30 points; personalization added 0.43 in total. Pushing for
  density lowered accuracy (62% of claims accurate vs 78%), so a fact-check step is needed. P-008.
  [link](https://arxiv.org/html/2507.13919v1)
- **AI-made ad images match human ones on clicks, and win only when they do not look AI-made.** A. Exner,
  Hartmann, Netzer and Zhang (16.4B impressions): AI images that looked human-made got 0.79% CTR, ones that looked
  AI-made 0.62%. Oversaturated color reads as AI. Fit: Shorts covers and thumbnails.
  [link](https://www.columbia.edu/~on2110/Papers/AI_in_disguise.pdf)

### AI search

- **GEO baseline.** A. Aggarwal et al. (KDD 2024): adding quotations, statistics or cited sources lifted a page's
  visibility in AI answers by 27.7% to 42.6%, most for lower-ranked pages; keyword stuffing hurt. P-010.
  [link](https://arxiv.org/html/2311.09735v3)
- **Topic match, a stated price and a recent date decide citation; structure does not.** B (simulated, vendor
  authors). Sprinklr (arXiv 2605.25517, 252,000 trials, 6 models). P-010.
  [link](https://arxiv.org/html/2605.25517)
- **Cited in an AI Overview beats not cited.** A, with a caveat. Seer Interactive (Apr 24, 2026; 53 brands, 2.43B
  impressions): informational CTR 2.07% when cited, 0.94% when not, 3.35% with no Overview. One account is 47% of
  the "not cited" group; without it the figure is about 1.61%. P-011.
  [link](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update)
- **AI Overviews cut the top result's clicks.** A. Ahrefs (Feb 4, 2026; 150,000 keywords each side): position 1 got
  58.0% fewer clicks than forecast. Informational data stories are the most exposed. P-011.
  [link](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/)
- **Free tools take the biggest share of AI-search visits.** B. Ahrefs on its own site (Jun 2025): free tools got
  36.45% of AI-search visitors; 3.6% landed on pages that do not exist. P-010.
  [link](https://ahrefs.com/blog/ai-search-traffic-by-page-type-ahrefs/)
- **ChatGPT shoppers convert worse than most channels.** A. Kaiser, Hamburg and Schulze (Marketing Science; 973
  retailers): lower conversion than organic, paid search, email and affiliate; only paid social was lower.
  [link](https://www.frankfurt-school.de/en/news/2026/06/chatgpt-in-online-ohopping)
- **Google: AI-made pages at scale may be spam; fact-check every field; say how automation was used.** A. Search
  Central, updated Oct 1, 2026. P-013.
  [link](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
- **November core update done Nov 24; a December core update is announced.** A. Google Search Status Dashboard.
  Read November's effect before December starts. [link](https://status.search.google.com/incidents/WLxcJyC6jMWMfryxsKMc)
- **Google will read a shared "no AI training" robots token as a Google-Extended opt-out from 2027.** A. Search
  Central blog, Oct 30, 2026. Do not add a blanket opt-out if we want Gemini citations. P-027.
  [link](https://developers.google.com/search/blog/2026/10/ai-training-control)
- **Businesses in ChatGPT: claimable profiles with mention and click counts.** A for the launch (Nov 10, updated
  Nov 19); no results yet. P-022. `app-marketing` already tracks it in
  `references/chatgpt-business-hub.md`. [link](https://openai.com/index/introducing-businesses-chatgpt/)
- **Real-data pages survived the March 2026 update; AI-scaled pages did not.** B, low (vendor's own clients).
  Appycodes (1,842 URLs): real-data pages 81% survived, AI-scaled 12%. Survivors had content in the first HTML, a
  filled-in default answer and about 5 internal links. P-013.
  [link](https://appycodes.com/blog/programmatic-seo-march-2026-update/)
- **A new calculator site took six months to reach 396 clicks a month.** B. archeryprotools.com (Nov 3, 2026):
  1, 13, 14, 24, 82, 162, 396 clicks by month. Expect months near zero; check indexing first. P-014.
  [link](https://dev.to/hafizwaleedahmed5/seo-case-study-640-clicks-and-405k-impressions-from-a-calculator-website-real-search-console-2p6i)
- **Spam update case.** B. PikaSEO (Aug 26, 2026; 12 sites): both tool sites gained; AI-written blog posts on a tool
  site are the risk. [link](https://pikaseo.com/articles/august-2026-spam-update-case-study)

### Video

- **Custom Shorts thumbnails for every creator.** C (secondhand, Nov 24, 2026). A question: do covers change reach?
- **Unoriginal re-uploads lose Shorts reach.** C (secondhand, Oct 2, 2026). Our real-app recordings are fine;
  avoid near-duplicate cuts.
- **Shorts views up, watch time down.** B, low (no method). Metricool, Nov 19, 2026: 799,718 videos.
- No A or B case of organic Shorts driving installs was found this week.

### App stores

- **Search-result assets and an Asset Library.** A. Apple, Oct 5, 2026: a custom product page can show a different
  image or video for each search keyword on iOS 27; approved assets swap in without a new review.
  P-016. [link](https://developer.apple.com/news/?id=ljpl7kyn)
- **Custom product page rules.** A. Up to 70 pages; per-page numbers appear only after five first-time downloads.
  [link](https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions/)
- **Age rating: every app must answer the new questions by Jan 12, 2027.** A. Apple Developer News. A store task
  for `app-release`, not an idea. Multiseat subscriptions for schools also launched (Oct 22). [link](https://developer.apple.com/news/)
- **Most new subscription apps earn little.** B. Adapty (16K apps): 57.7% earn under $1,000; in Education, 23.5% of
  trials start 31 or more days after install. [link](https://adapty.io/blog/mobile-app-monetization-2026/)

### Local business

- **People now ask AI tools for local picks.** B (vendor survey). BrightLocal 2026 (1,002 adults): AI tools as a
  source rose from 6% to 45%; 78% were asked for a review and 83% of those left one. P-020.
  [link](https://www.brightlocal.com/research/local-consumer-review-survey/)
- **A page per service and "best of" lists matter most for local AI visibility.** B (47 experts' opinion, part).
  Whitespark 2026. P-020. [link](https://whitespark.ca/local-search-ranking-factors)
- **GA4 now shows Business Profile calls, clicks and directions.** A. Google Analytics, Jun 8, 2026.
  [link](https://support.google.com/analytics/answer/9164320?hl=en)

### Recurring giving

- **Monthly donors stay; new one-time donors mostly do not.** A (two independent sources agree). M+R Benchmarks
  2026 (180 nonprofits): 71% of monthly donors still give after 12 months, against 24% retention for new one-time
  donors; 10% of monthly donors stop within 2 months. Fundraising Effectiveness Project, 2026 Q2 (5.7M donors): only
  11.3% of donors acquired in 2025 had given again. P-018. [M+R](https://mrbenchmarks.com/fundraising/),
  [FEP](https://publications.fepreports.org/)
- **Patreon gift memberships.** C (Patreon's own single figure, Jul 2025). A question for December.

### Schools

- **Educators trust other educators most; districts rarely buy on that alone.** A (2019). NewSchools and Gallup:
  81% of 3,210 teachers name other educators among their top three sources. 54% of 500 district leaders seldom
  adopt districtwide on teacher advice. P-021.
  [link](https://marketbrief.edweek.org/education-market/teachers-word-carries-weight-in-choosing-products-survey-finds/2019/09)
- **School SLPs: paperwork is the top complaint.** C (secondhand; ASHA blocked reading). A question for next week.
- **Standard student data privacy agreements spread across states.** C. WSIPC, Feb 2026: 131,000+ SDPC agreements.

## What changes for our agents

Made in this run (in this repository, in this brief's PR):

- **`app-marketing` 1.39.0** (`references/invent.md`, "Judging an experiment"): judge on the `judge` date, not before;
  the measured number decides, never a model's opinion of its own work; counts go in `evidence`, with "too few to
  tell" when they cannot show anything. From P-006 and P-007.
- **`youtube-growth` 1.14.1**: public views now add a TV co-view estimate, so Shorts are compared on engaged views.
  From P-023.

Handed to other repositories, for their next run:

- **Every business: a verdict reads the number, never the maker's opinion** (P-006, P-007). Where a reviewer model
  passes a page, pitch or Short, give it the rubric and the output only, not the maker's reasoning, and never let it
  decide a verdict. Write "too few to tell" when the counts cannot show anything.
- **Every business with pages: say how automation was used, and fact-check every field** before release, titles
  and alt text included (Google, P-013).
- **Every sender: check the Spamhaus list** (P-026): no domain under 30 days old, no link shorteners, no fake
  warm-up.

## Handoffs

Each idea is provisional (James, 2026-11-13): tried, then kept only if it clears its bar. Each business's own
Invent step scores it beside its other ideas and decides.

### Apps (app-marketing)

Weakest number this week: replies to pitch emails.

- **Beat-checked pitches** (`research:2026-11-23#P-001`): before a first pitch, confirm the writer covered the app's
  kind of app in a recent piece, and name that piece and the one reason the app fits it in the first line. Drop
  writers with no such piece. reaches: writers in the app's pitch queue. size: the queued pitches for the next
  14 days, from `marketing/pitches.jsonl`. effort 2. moves: pitch replies. pattern: new. Measure: replies per first
  email sent, from `proof` in `/api/pitches`, against the 14 days before. Bar: a higher reply rate with at least one
  reply. Verdict: 14 days after it ships. Rules: the pitch standard in `references/pitches.md` and the owner's
  two follow-ups (2026-11-12) still apply; mailbox ceiling unchanged.
- **Definition, comparison and numbers first on a guide** (`research:2026-11-23#P-010`): pick the app's guide page
  with the most search impressions and open it with a one-line definition, a small comparison table and sourced
  numbers, with the source linked. reaches: Google and AI-answer searchers for the app's search phrase. size: the
  page's impressions in Search Console. effort 2. moves: search visits to the page. pattern: 3 (a page per
  searchable item). Measure: visits with a Google referrer (P-025) and AI referrers to that page. Bar: more visits
  than the 28 days before. Verdict: 28 days after it ships, because search needs time to recrawl and the December
  core update lands in between; write that as `judge_reason`.
- **A custom product page per search phrase, with the new search-result asset** (`research:2026-11-23#P-016`): one
  custom product page for the app's strongest search phrase, its own screenshot set made for that phrase. reaches:
  App Store searchers on iOS 27. size: the app's search impressions from App Store Discovery and Engagement. effort 3.
  moves: first-time downloads from search. pattern: new. Measure: that page's first-time downloads (Apple shows them
  after five). Bar: five or more in 28 days. Verdict: 28 days after approval. Rules: an App Store change, so the Mac
  pass and `app-release` do it.
- **Store task, not an idea:** every app must answer Apple's new age-rating questions by Jan 12, 2027. Hand to
  `app-release`.

### Vegas Microworks

Weakest number this week: leads and replies from the report pitches.

- **"Your number is out of date" notes** (`research:2026-11-23#P-003`): find pages (local guides, chamber pages,
  news) that cite an old statistic about Las Vegas small-business websites or software costs, and write to each
  author naming that exact line and offering the report's newer figure, with its source. reaches: Las Vegas writers
  and organizations who already cite such numbers. size: the pages a search finds that cite one. effort 3. moves:
  links in and replies. pattern: 1 (data story) and 9 (partnerships). Measure: replies and new referrer hosts to the
  report in `site_visits`. Bar: one link or positive reply. Verdict: 14 days after the first note. Rules: a pitch
  family under `docs/outreach.md`; the Never list; no saving we have not measured.
- **Lead the subject line with the finding, as a ratio** (`research:2026-11-23#P-002`): the next `press-report`
  first emails state the report's headline finding as "1 in N" in the first three words of the subject. reaches: the
  family's next press contacts. size: the queued contacts. effort 1. moves: replies. pattern: 1. Measure: replies per
  first email against the earlier `press-report` sends. Bar: a higher reply rate. Verdict: 14 days after it ships.
- **Definition, comparison and numbers first on the report page** (`research:2026-11-23#P-010`): open the report with
  a one-line answer, a comparison table and sourced numbers in the first HTML. reaches: Google and AI-answer
  searchers on Las Vegas business websites. size: the page's impressions. effort 2. moves: report views from outside
  our links. pattern: 1. Measure: `site_visits` to the report with a Google or AI referrer. Bar: more than the 28
  days before. Verdict: 28 days after it ships (recrawl and the December core update).

### Money coaching

Weakest number this week: real visitors to the site.

- **Lead the rent-hours page with an answer and a table** (`research:2026-11-23#P-010`): a one-line answer, a table
  comparing hours of work by wage and unit size, every number sourced, rendered in the first HTML with a filled-in
  default (P-013). reaches: Las Vegas searchers asking what rent costs in work hours. size: the page's impressions in
  Search Console. effort 2. moves: real visitors. pattern: data-story. Measure: `report.rentHours28d` realVisitors
  with a Google or AI referrer. Bar: 10 or more real visitors in 28 days (the page's own bar). Verdict: on the page's
  existing date, 2026-12-17. Rules: the compliance lint.
- **Ask a partner who already shared to pass it to one peer** (`research:2026-11-23#P-004`): each partner office that
  replied or shared the guide gets one note asking whether a peer office would want it, with nothing to forward but a
  link. reaches: peer offices of current partners. size: the partners with a shared note in `outreach_orgs`. effort 1.
  moves: new partner organizations reached. pattern: partnership. Measure: new organizations introduced by a partner.
  Bar: one. Verdict: 14 days after the notes go. Rules: cold partner mail is off; these are replies in existing
  threads only.
- **Facts, not tailoring, in partner notes** (`research:2026-11-23#P-008`): when partner mail resumes, each note
  carries two or three checkable facts (the per-paycheck dollars, the source) instead of personal flattery, and each
  fact is checked before it goes. reaches: partner offices. size: the queue. effort 1. moves: replies. pattern: new.
  Measure: replies per note against the last 28 days of partner mail. Bar: a higher reply rate. Verdict: 14 days after
  it resumes.

### Clean Streets

Weakest number this week: human replies to cold letters.

- **Turn one-time givers into monthly patrons in the first week** (`research:2026-11-23#P-018`): every new one-time
  PayPal gift gets a thank-you within a week that names the block it paid for and offers the monthly patron link.
  reaches: one-time givers. size: one-time gifts in PayPal's last 90 days. effort 1. moves: patrons. pattern: new.
  Measure: one-time givers who become patrons within 30 days. Bar: one. Verdict: 30 days after it ships, because a
  monthly decision needs a month; write that in the line. Rules: `inbox-processor` sends; sender rules apply.
- **"Your number is out of date" notes** (`research:2026-11-23#P-003`): find San Francisco pages that cite old
  street-cleaning or 311 figures, and write to each author naming the line and offering the block report card's
  current figure and its source index. reaches: SF writers and groups that already cite such numbers. size: pages a
  search finds. effort 2. moves: links in. pattern: new. Measure: verified outside domains citing the report card or
  its index (the `grant-evidence-index` measure). Bar: one. Verdict: 14 days after the first note. Rules: the ledger's
  rules on unsolicited letters.

### Pipsqueak

Weakest number this week: SLP accounts per first email (sending opens 2026-11-30).

- **Ask each yes for one colleague** (`research:2026-11-23#P-021`): in the reply to every SLP who signs up or says
  yes, ask whether one colleague in their district would want it, and offer to set them up too. reaches: colleagues of
  interested SLPs. size: the yeses in the `gtm` database. effort 1. moves: SLP accounts. pattern: new. Measure:
  accounts from referred SLPs. Bar: one per five yeses. Verdict: 14 days after the first yes. Rules: no guessed
  addresses; replies are never held.
- **A custom product page for school SLPs** (`research:2026-11-23#P-016`): once the app is live, one custom product
  page with screenshots of the caseload view, linked from `/for-slps/`. reaches: SLPs who reach the App Store from
  emails or the site. size: `/for-slps/` visitors. effort 3. moves: first-time downloads. pattern: new. Measure: that
  page's first-time downloads (shown after five). Bar: five in 28 days. Verdict: 28 days after approval. Rules: an
  App Store change, done through `app-release`. Apple's new multiseat purchases (Oct 22) are worth a note for
  district buyers.

## Results back

None yet. No business has an item tagged `research:`; this is the first brief.

## Questions for next week

1. **Does a beat-checked pitch get replies where a general one got none?** Watch the apps' first results, and find a
   measured case of pitching small apps to writers.
2. **Warm intros for local businesses and schools:** measured cases from chambers, merchant groups or SLP referrals,
   not SaaS sales teams.
3. **A tiny site earning local press with a data story:** any case with numbers, ideally a named city.
4. **Did our pages move between Nov 10 and Nov 24,** before the December core update starts? When does it start?
5. **Organic Shorts to installs:** any first-hand case with campaign-link data.
6. **ChatGPT Business Hub and Bing's AI Performance report:** what counts do they show small businesses?
7. **App Store search-result assets:** do they need a custom product page, and how many users are on iOS 27?
8. **ASHA primary data** on school SLP caseloads and tool use, and Nevada's privacy-agreement route.
9. **Andon Labs' "what we got wrong" newsletter (Nov 2):** did its agent's posts or pitches bring customers?
10. **Judging at single-digit counts:** a published rule for telling a dud from noise, to test youtube-growth's "3
    no-effect Shorts" rule.
