# The marketing system map

One page that shows how all of our marketing fits together: every business, every skill, every scheduled run, both
engines (Claude and Codex), and where each record lives. Read it before you change any part of marketing. Then
change it in the same pull request as your change.

The owner's words (James, 2026-11-26): the marketing system "is being evolved incredibly rapidly", so "anytime that we
make a change to our marketing system ... it updates the map so that agents can work on our marketing efforts more
efficiently", for agents in both Claude and Codex.

This repository is public. Names, schedules, files and how the parts connect go here. Trigger IDs, tokens, receipts,
recipients and business numbers stay private: on the Mac in `/Volumes/ssd/projects/skills/marketing-orchestration/`
(its `README.md`), and in each business's own repository.

## Keep this map true

- **Read it first.** Before you add, change, pause or remove anything in marketing, read this page and the
  [Changes](#changes) of the last two weeks. Claude and Codex both change the system. This page is how each one learns
  what the other did.
- **Update it in the same PR.** Any change to what runs, when, on which engine, from which file, with which register,
  sender or rule, updates the matching row here and adds a line to [Changes](#changes). A change in another repository
  needs a PR here too. Name that PR in your own PR.
- **What counts as a change to the marketing system:** a marketing skill's steps, references or scripts; a routine,
  Mac task or Codex job (added, removed, rescheduled, paused, prompt changed); a coordination group or the gate
  helpers; a sender, mailbox rule or channel opened or closed; an experiment register's place or shape; a new business.
- **Not a change:** a run's normal output. Ledger rows, briefs, experiments, ideas, sends and posts are records. The
  weekly research brief is a record. A skill change it makes is a change.
- **Check it.** `python3 tests/test_marketing_map.py` fails when a marketing skill here is missing from the map, or
  when your branch changes marketing files here and leaves the map alone.
- **Fix it when it's wrong.** A run that finds this page out of date fixes it in that run, the same way as any other
  wrong fact (run rules: "Fix what you find").

## The businesses

| Business | Audience | Skill (entry point) | Ideas and experiments | Mail |
|---|---|---|---|---|
| Apps: every released app on the Ouro and personal teams | People who download small apps | `app-marketing` in this repository (`skills/app-marketing/SKILL.md`). State in `astrojams1/app-sites` `marketing/` | `marketing/apps/<id>.json` in app-sites | Pitch emails through `/api/pitches` on the astrojams site |
| Vegas Microworks | Las Vegas small businesses | `astrojams1/vegas-microworks` `docs/outreach.md` (daily) and `docs/marketing.md` (weekly) | `docs/experiments.md` | The site's `/api/outreach`, from the personal Gmail, under its gate |
| Money coaching | 18 to 29 year olds in Las Vegas | `astrojams1/money-coaching` `skills/lead-gen/SKILL.md` | `content/growth/experiments.json` | The site's `/api/outreach`, from the personal Gmail |
| Clean Streets | Patrons, contracts and grants in San Francisco | `astrojams1/cleanstreets` `.claude/skills/` (`patreon-growth`, `inbox-processor`, `field-updates`, `site-refresh`, `skill-improver`; shared rules in `README.md`) | `idea:` and `experiment:` lines in `.claude/skills/patreon-growth/LEDGER.md` | The Clean Streets Gmail only |
| Pipsqueak | School speech-language pathologists | `astrojams1/pipsqueak` `docs/go-to-market.md` | `marketing/gtm/experiments.json` | `website/api/outreach.js`, from the personal Gmail, until its own service exists |

Every business judges each new tactic as a provisional experiment, kept only if it works (James, 2026-11-13). Mailbox
rules for the personal Gmail are in `/Volumes/ssd/AGENTS.md`, "Which account sends email".

## Shared skills and parts

| Part | Where | What it does for marketing |
|---|---|---|
| `marketing-research` | `skills/marketing-research/` | Weekly research arm: grades case studies, papers and talks on agents in marketing, writes `ledger/briefs/latest.md`, hands every business ideas tagged `research:`, reads results back |
| `app-shorts`, `youtube-shorts`, `youtube-growth` | `skills/` | Make, frame, post and judge YouTube Shorts for apps and businesses (registry on the Mac) |
| `app-release`, `ouro-website`, `astrojams-website` | `skills/` | Store listings and the two app sites. Marketing prepares listing text; `app-release` submits |
| `vegas-microworks-marketing` | `skills/vegas-microworks-marketing/` | Starts Vegas's weekly pass from a fresh worktree (carried by the Mac pass) |
| `warm-lead-followup` | `skills/warm-lead-followup/` | Email follow-up for warm app leads; its Pipsqueak profile is inactive |
| `reddit-posting` | `skills/reddit-posting/` | Owner-approved Reddit posts and replies |
| ChatGPT Business Hub | `skills/app-marketing/references/chatgpt-business-hub.md` | Each business's ChatGPT profile; read on the first marketing run of each month |
| The gate | `bin/marketing_gate.py`, `bin/marketing_mcp.py`; protocol in [marketing-schedules.md](marketing-schedules.md) | One owner per business group at a time, across Claude and Codex; every outward action claimed once |
| The Codex worker | `bin/marketing_worker.py`, `bin/marketing_due.py`, `bin/marketing_pacing.py`; install on the Mac in `marketing-orchestration/` | Runs due and extra marketing work on Codex when Claude has not started it, paced by the weekly allowance |

## What runs, and when

All times Pacific. Claude cloud routines read their skill from the repository's main branch, so a merged skill change
reaches the next run. The gate helpers are pinned to one commit in each gated routine's prompt; changing them needs
the re-pin procedure in the private `marketing-orchestration/README.md`.

| Run | Engine | When | Group and job | Reads |
|---|---|---|---|---|
| App marketing (daily) | Claude cloud, then Codex | 07:10 full, 13:10 midday, 17:10 reply; also on new app-sites issues | `app-marketing` / `app-marketing-cloud` | `skills/app-marketing/SKILL.md`, "A run" |
| App marketing Mac pass | Mac (Claude Desktop), then Codex | Daily 05:30. Carries Shorts, Show HN and the Vegas weekly pass (Wednesdays) | `app-marketing` / `app-marketing-mac` | `skills/app-marketing/references/mac-pass.md` |
| Vegas Microworks outreach (daily) | Claude cloud, then Codex | Weekdays 04:55, 12:55, 16:55; also on new issues | `vegas-microworks` / `vegas-microworks-outreach` | `docs/outreach.md`, "Each daily run" |
| Money coaching lead gen (daily) | Claude cloud, then Codex | 04:40, 12:40, 16:40; also on new issues | `money-coaching` / `money-coaching-lead-gen` | `skills/lead-gen/SKILL.md` |
| Clean Streets Patreon growth | Claude cloud, then Codex | Hourly 07:20 to 20:20 (09:20 full, 13:20 midday, 18:20 builds the next day's queue) | `cleanstreets` / `cs-patreon-growth` | `.claude/skills/README.md`, "A routine run" |
| Clean Streets inbox processor | Claude cloud, then Codex | 07:00, 10:00, 13:00, 16:00 | `cleanstreets` / `cs-inbox-processor` | the same |
| Clean Streets field updates | Claude cloud, then Codex | 10:30, 14:30, 18:30 daily (two routines split the week) | `cleanstreets` / `cs-field-updates`, `cs-field-updates-other` | the same |
| Clean Streets site refresh | Claude cloud, then Codex | 11:40 on the 1st and 15th | `cleanstreets` / `cs-site-refresh` | the same |
| Clean Streets skill improver | See `.claude/skills/README.md` | Weekly | none | `.claude/skills/skill-improver/SKILL.md` |
| Pipsqueak go-to-market (daily) | Claude cloud, then Codex | 06:40 full, 12:40 midday, 16:40 late; also on new issues | `pipsqueak` / `pipsqueak-gtm` | `docs/go-to-market.md`, "Each daily run" |
| Marketing research (weekly) | Claude cloud only | Mondays 03:17 | none: it sends and posts nothing | `skills/marketing-research/SKILL.md`, "A run" |
| Extra work on spare allowance | Codex | When the weekly allowance is ahead of pace | `supplement.*` jobs per group | `marketing-orchestration/weekly-surplus-prompts.json` (private) |
| Marketing handoff recovery | Codex automation | Hourly | none | Restarts the Codex worker; checks dead handoffs |

"Then Codex" means Claude gets the first 15 minutes of each occurrence and Codex takes it if Claude has not
([marketing-schedules.md](marketing-schedules.md)). Other scheduled tasks are listed in this repository's `AGENTS.md`.

## How the parts feed each other

1. **Research (Monday).** `marketing-research` writes the brief, with at least two ideas for every business, each
   tagged `research:<week>#<practice id>`.
2. **Invent (weekly in each business).** Each business's Invent step reads the brief beside its own numbers, writes
   new ideas (at least one from the brief), builds the best one as a live experiment with a measure, a bar and a
   verdict date.
3. **Verdicts.** On its verdict date each experiment is kept, changed once, or retired, in its own register.
4. **Back to research.** The next research run reads each `research:` item's verdict into `ledger/practices.md`.
5. **Skill changes.** A finding that changes how agents should run becomes a skill change, made by the research run
   here, by a business's own run, or by Clean Streets' `skill-improver`. Each one updates this map.

## Where to read the current state

The map shows the structure. For what is happening today, read these. Commands run from this repository unless named.

| Question | Where |
|---|---|
| What changed lately, and who changed it | [Changes](#changes) below, then each repository's recent merged PRs |
| Who owns each business group right now; what is pending | `python3 bin/marketing_gate.py --repo <business checkout> --group <group> status`; on the Mac, `python3 inspect-queues.py` in `marketing-orchestration/` |
| What is due next on both engines | `python3 bin/marketing_due.py --catalog <private catalog> --plan` (on the Mac) |
| How each app is doing | `node skills/app-marketing/scripts/marketing.mjs learn` in app-sites; `marketing/LEDGER.md` there |
| How each business is doing | Its run log: app-sites `marketing/ledger.jsonl`, Vegas `docs/outreach.md` report and `docs/experiments.md`, money coaching `skills/lead-gen/ledger.jsonl`, Clean Streets `python3 scripts/ledger.py due`, Pipsqueak `marketing/gtm/runs.jsonl` |
| What the field learned this week | `skills/marketing-research/ledger/briefs/latest.md` |
| Each run on the Mac, from either engine | `/Users/astro/Library/Application Support/AgentActivityLedger/events.jsonl` (recent lines only) |

## Changes

Newest first. One line per change: date, engine, what changed, where (PR). Keep the last eight weeks; move older lines
to `docs/marketing-system-history.md` when this list passes about 60 lines.

| Date | Engine | Change | Where |
|---|---|---|---|
| 2026-11-26 | Claude | First research brief (week of 2026-11-23). From its findings: `app-marketing` 1.39.0 judges experiments on the judge date by the measured number, never by the maker's opinion of its own work; `youtube-growth` 1.14.1 notes that public views now add TV co-views, so Shorts are compared on engaged views | skills#338 |
| 2026-11-26 | Claude | This map added, with the rule that every marketing change updates it, `tests/test_marketing_map.py`, and pointers from every business's `AGENTS.md`, the shared `AGENTS.md` and the Codex worker protocol | skills#336, app-sites#328, vegas-microworks#178, money-coaching#204, cleanstreets#821, pipsqueak#83 |
| 2026-11-26 | Claude | New weekly research arm `marketing-research` and its Monday routine; the Invent steps of apps, Vegas Microworks, money coaching, Clean Streets and Pipsqueak read its brief and take at least one idea from it | skills#335, vegas-microworks#177, money-coaching#203, cleanstreets#820, pipsqueak#82 |
| 2026-11-25 | Claude | Pipsqueak go-to-market gets its own daily routine and group `pipsqueak`; it may send cold mail from the personal Gmail under its own count | pipsqueak `docs/go-to-market.md` |
| 2026-11-24 | Claude | The eight gated cloud routines re-pinned to helper release `305d27c7` and verified | private `marketing-orchestration/README.md` |
| 2026-11-20 | Claude and Codex | Claude and Codex share every marketing schedule through the gate | [marketing-schedules.md](marketing-schedules.md) |
