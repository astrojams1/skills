# Skills Repository

This repository contains reusable AI agent skills that can be applied across projects.

## Repository Structure

```
bin/
  manage.sh                                # CLI: install, check, sync, status for skill management
  check_caps.py                            # Flags caps and throttles on scheduled work not in cap-allowlist.txt
cap-allowlist.txt                          # The few caps kept on purpose, each with its reason
skills/                                    # Skill definitions (Agent Skills spec)
  careful/
    SKILL.md                               # On-demand safety hooks for destructive commands
  design-system/
    SKILL.md                               # Main skill instructions (concise)
    references/components.md               # Detailed component HTML/CSS patterns
    references/layout.md                   # Detailed layout and global style patterns
  design-system-migration-prompt/
    SKILL.md                               # Migration prompt to swap in the design system
  freeze/
    SKILL.md                               # On-demand file protection (restrict edits to one dir)
  health-check-prompt/
    SKILL.md                               # Diagnostic prompt for consumer repo integration
  health-check-review/
    SKILL.md                               # Process health check reports and fix issues
  app-release/
    SKILL.md                               # App Store + Google Play release process for every app
    references/{config,accounts,ios,android,privacy,media,verification,app-types,standards,ledger,maintaining,scripts,daily-review-run,promotion}.md
    scripts/{ledger,ios-release,asc,android-release,play,standards,review-sweep}.mjs, scripts/lib/   # Shared release tooling (Node 22, no deps)
    assets/                                # Config, store data and repository-skill templates; the app standards catalog and Send Feedback references
    ledger/LEDGER.md, ledger/runs/         # Cross-app run index and lessons
  ouro-website/
    SKILL.md                               # Keep the Ouro apps website true to App Store Connect and the App Store
    references/{content,assets}.md         # Catalog fields and copy rules; icon and screenshot sourcing
    scripts/audit.mjs                      # App Store Connect team audit against the site's catalog (Node 22, no deps)
    ledger/LEDGER.md                       # Versions and lessons
  astrojams-website/
    SKILL.md                               # Keep the astrojams apps website (personal team) true to the App Store
    references/{content,assets}.md         # Catalog fields and copy rules; icon and screenshot sourcing
    scripts/audit.mjs                      # App Store Connect team audit against the site's catalog (Node 22, no deps)
    ledger/LEDGER.md                       # Versions and lessons
  warm-lead-followup/
    SKILL.md                               # Email-led warm app lead and expert coordination
    references/{apps,ledger,cloud}.md       # App profiles, durable state and hosted scheduling
    assets/pipsqueak.json                  # Inactive app profile; live deployment stays private
    scripts/activity_ledger.py             # Shared locked activity JSONL writer
  research-paper/
    SKILL.md                               # Repo -> arXiv-ready paper, 20 staged artifacts
    references/{stages,literature,decisions,reviews}.md  # Stage playbook, lit search, decision menus, review rubrics
    scripts/{ledger.py,check_refs.py,build.sh}   # Run ledger, reference resolver, strict LaTeX build
    assets/template/main.tex               # arXiv preprint template
    ledger/LEDGER.md, ledger/runs/         # The skill's own ledger: versions, runs, tokens, issues
  reddit-posting/
    SKILL.md                               # Wildly concise Reddit posts and replies, owner-approved, logged
    references/{tone,subreddits}.md        # Templates, before/after cuts, subreddit notes
    ledger/LEDGER.md                       # The skill's own append-only ledger
  simplify/
    SKILL.md                               # Code quality review — find and fix over-engineering
  skill-integration-prompt/
    SKILL.md                               # Integration prompt for new consumer repos
  skill-orchestrator/
    SKILL.md                               # Wire another repo to this skills submodule
    scripts/quick-check.sh                 # Fast pass/fail integration check
    references/agent-instructions.md       # Template for consumer AGENTS.md
  skill-writing/
    SKILL.md                               # Write or rework a skill in the house style
    assets/template.md                     # The standard SKILL.md shape to copy
    scripts/readability.py                 # Reading grade and long-sentence count for a SKILL.md
    ledger/LEDGER.md                       # The skill's own append-only ledger
  workflow-orchestration/
    SKILL.md                               # Workflow orchestration practices for AI agents
  abandoned-prs/
    SKILL.md                               # Weekly triage of abandoned PRs: merge, close or wait, then report
    references/{triage,repos}.md           # Decision, close, fix and merge rules; what earlier runs learned per repository
    scripts/discover.mjs                   # Open PRs sorted into triage buckets, plus saved decisions (Node 22, no deps)
    assets/scope.json                      # Owners, trusted authors, time windows, per-run cap and hold markers
    ledger/LEDGER.md                       # Versions and lessons
  uncommitted-work/
    SKILL.md                               # Weekly audit of uncommitted work and stashes in every checkout: ship through a PR, or back up and clear
    references/triage.md                   # Decision, ship and stash rules
    scripts/scan.py                        # Repo-wide scan, buckets, backups and the guarded close (Python, no deps)
    assets/scope.json                      # Roots, owners, time windows, per-run cap and junk names
    ledger/LEDGER.md                       # Versions and lessons
  call-triage/
    SKILL.md                               # Turn a recorded call about any product into finished follow-through; audio and transcripts stay on the SSD
    references/{intake,routing,deliverables}.md   # Getting and transcribing a recording; where each item goes; the page and the email draft
    scripts/call_triage.py, scripts/transcribe.swift   # Item register and privacy guard (Python, no deps); on-device transcription (SpeechAnalyzer)
    ledger/LEDGER.md                       # Versions and lessons
  app-shorts/
    SKILL.md                               # Make, post and schedule YouTube Shorts series for every app the owner ships
    references/{formats,recording,posting,coordination}.md   # Series shapes per app; the real-app recording rig; Studio and API posting; release, App Store and website links
    scripts/shorts.mjs                     # Registry: roster from app-release configs, calendar, due reads, attributed App Store links (Node 22, no deps)
    ledger/LEDGER.md                       # Versions and lessons
  youtube-growth/
    SKILL.md                               # Read each Short's metrics on schedule and turn them into decisions that grow the channel
    references/{api,metrics,policy}.md     # API setup and limits; what each metric means and the evidence; YouTube policy risks for a templated pipeline
    scripts/{yt-api,evaluate}.mjs          # OAuth, analytics and comments; decisions from snapshots (Node 22, no deps)
    assets/rules.json                      # Decision thresholds, each with its source
    ledger/LEDGER.md                       # Versions, experiments and lessons
  youtube-shorts/
    SKILL.md                               # Frame, check and post Shorts inside YouTube's measured safe zone
    references/{safe-zone,posting}.md      # The measurement and layout rules; the upload package
    scripts/safe-zone.mjs, scripts/fit-screenshot.py   # Contact-sheet checker (ffmpeg); screenshot-to-frame fit (numpy, Pillow)
    assets/zones.json                      # Keep-out zones and safe box in 1080x1920 frame pixels
    ledger/LEDGER.md                       # Versions, measurements, runs, open issues
.claude/skills/                            # Claude Code skill discovery (auto-generated copies)
.agents/skills/                            # Codex skill discovery (auto-generated copies)
tests/                                     # Tests for repository integrity (tests/app-release/, tests/ouro-website/, tests/astrojams-website/, tests/youtube-shorts/, tests/app-shorts/, tests/youtube-growth/, tests/call-triage/ and tests/abandoned-prs/ cover those skills' scripts)
tasks/
  todo.md                                  # Current work items and progress tracking
  lessons.md                               # Patterns and corrections from past mistakes
example/
  index.html                               # Static example app showcasing the design system
vercel.json                                # Vercel config to deploy the example app
AGENTS.md                                  # AI agent instructions (Claude Code and Codex) — the only one; no CLAUDE.md
```

Skills follow the [Agent Skills specification](https://agentskills.io/specification). Each skill is a directory containing a `SKILL.md` file with YAML frontmatter (`name`, `description`) and markdown instructions. Skills may also include `references/`, `scripts/`, and `assets/` subdirectories for supplementary material loaded on demand.

**Important:** Before creating or modifying any skill, always consult the [Agent Skills specification](https://agentskills.io/specification) to ensure compliance with the latest format requirements, especially around progressive disclosure (SKILL.md < 500 lines, detailed material in `references/`).

## Skill Categories

Skills cluster into recurring categories. Use this taxonomy to identify gaps in your skill coverage and to write better skills:

1. **Library & API Reference** — Correct usage of libraries, CLIs, or SDKs. Include reference code snippets and gotchas for things Claude gets wrong by default.
2. **Product Verification** — How to test or verify that code works. Pair with external tools (Playwright, tmux, etc.). Worth investing heavily in — verification skills directly improve output quality.
3. **Data Fetching & Analysis** — Connect to data and monitoring stacks. Store helper libraries and credentials patterns so Claude composes rather than reconstructs.
4. **Business Process & Workflow Automation** — Encode multi-step operational processes into single commands. Store results in log files for consistency.
5. **Code Scaffolding & Templates** — Generate framework boilerplate with natural language requirements that pure code can't cover (annotations, auth, deploy config).
6. **Code Quality & Review** — Enforce organizational code quality. Can include deterministic scripts for maximum robustness. Consider running automatically via hooks or GitHub Actions.
7. **CI/CD & Deployment** — Fetch, push, deploy code. May reference other skills to collect data. Examples: `babysit-pr`, `deploy-<service>`, `cherry-pick-prod`.
8. **Runbooks** — Take a symptom (Slack thread, alert, error signature), walk through a multi-tool investigation, produce a structured report.
9. **Infrastructure Operations** — Routine maintenance and operational procedures with guardrails for destructive actions.
10. **On-Demand Hooks** — Session-level guardrails activated by invoking the skill. Last for the session duration. Examples: `careful` (blocks destructive commands), `freeze` (blocks edits outside a directory).

## Writing Good Skills

Write and rework every skill with [`skills/skill-writing/SKILL.md`](skills/skill-writing/SKILL.md). It holds the
standard shape, the run rules block every scheduled skill carries, and the plain-words rules (an 8th grader should
follow each sentence). `python3 skills/skill-writing/scripts/readability.py skills/*/SKILL.md` grades them, and
`tests/test_readability.py` fails any `SKILL.md` over grade 9 (James, 2026-11-10).

- **The description is for the model.** Say what the skill does, then "Use when…" with the words a person would type.
- **Write gotchas.** They are the highest-signal part. Add one each time a run trips on something.
- **Use the folder.** Detail goes in `references/`, code in `scripts/`, templates and data in `assets/`.
- **Start small and grow.** Most good skills began as a few lines and one gotcha.

## Skills Run by Routines

Every scheduled skill carries the short run rules block from `skills/skill-writing/SKILL.md`, word for word. The rules below are the full form.

- **A routine's prompt never restates its skill.** The prompt of a routine or scheduled task says only what the skill can't know: which skill to run, where the repository is checked out, that the run is unattended, how to load tools in that environment, and the final message format when a notification shows it. Every step, rule and limit lives in the skill (or the file it points to), so the two can't drift apart. When a prompt seems to need more, move that text into the skill (James, 2026-11-08).
- **A scheduled run clears its known work.** Each run works through every open item it can safely do together (every backlog idea, every app pending release, every due thread), not one item a run. Skip only what is blocked, with the reason, so no backlog builds up between runs, above all for skills that run rarely (James, 2026-11-08).
- **A run fixes what it finds.** Every issue a scheduled run sees, inside or outside the item it was working on (a wrong fact on a site, a broken link, a failing check, a stale prompt, a script bug), is fixed in that run, shipped and verified. Logging it, noting it or "leaving it alone" is not a fix. Only a step that truly needs James (a payment, a sign-in, an approval), a store submission or review gate, an outside rule that forbids the act today, or an outside service that is down after another way was tried may stay open, and the run's summary names each with what unblocks it. A skill's ledger should refuse an open item without its blocker, as `app-marketing`'s does (James, 2026-11-10).
- **A throttle is a cap, wherever it lives.** A limit on how much a run does is a cap whether it sits in `SKILL.md`, a reference ("one good guide a week per app"), a script default (`windowDays`) or a data file (`repeat_days` over 1). Pacing may decide *when* finished work goes public (a Short's `publishAt`), never whether the work is done this run. A cap stays only with a reason James gave or a rule a third party sets (Hacker News's limits), written in `cap-allowlist.txt`. `python3 bin/check_caps.py . skills` fails on any other, and `tests/test_no_hidden_caps.py` runs it; consumer repos with a skill-improver run the same check (James, 2026-11-10).
- **Every scheduled task is listed below, with where its prompt lives.** Cloud routines show up in the routine list; tasks on James's Mac (Cowork or Codex) don't, so an audit that reads only the routine list misses them, as the 2026-11-08 audit missed `app-marketing-mac`. Each Mac task's stored prompt is a pointer, written in its skill, and a skill that finds a stale prompt follows itself and reports the stale words. When a Mac task's prompt must change, give James the exact new text to paste, because no agent can edit it.
- **Done means seen in a run.** A change to how a scheduled skill paces or caps its work is done when the next run's ledger shows the new behaviour, not when the PR merges.

| Mac scheduled task | When | Stored prompt (pointer) |
|---|---|---|
| `app-marketing-mac` | Daily, about 05:35 Pacific | `skills/app-marketing/references/mac-pass.md` |
| `app-marketing-show-hn` | Weekdays 09:00 Pacific | `skills/app-marketing/references/hacker-news.md`, "The task's stored prompt" |
| `abandoned-prs` | Weekly | `skills/abandoned-prs/SKILL.md`, "The weekly task's prompt" |
| `uncommitted-work` | Weekly | `skills/uncommitted-work/SKILL.md`, "The weekly task's prompt" |
| `app-store-review-submissions-daily` | Daily 09:05 Pacific | `skills/app-release/references/daily-review-run.md`, "The daily task's prompt" |
| `vegas-microworks-marketing` | Wednesdays 07:04 Pacific | `astrojams1/vegas-microworks` `docs/marketing.md`, "The weekly task's prompt" |
| `money-coaching-lead-gen` | Paused; the cloud routine "Money coaching lead gen (daily)" replaced it | `astrojams1/money-coaching` `skills/lead-gen/SKILL.md`, "The Mac task's prompt" |

## Available Skills

### Design System — Architectural Minimalist

**Skill:** `skills/design-system/SKILL.md`

A comprehensive design system skill that applies the "Architectural Minimalist" aesthetic to any web project. It features:

- Warm organic color palette (sage, terracotta, stone)
- Sharp architectural geometry (rounded-none everywhere)
- DM Sans + Tenor Sans typography pairing
- Full light/dark mode support
- Tailwind CSS configuration and component patterns

**Reference implementation:** https://pinch-pleat-simulator-731832823064.us-west1.run.app/

#### How to use this skill in another project

Include the contents of `skills/design-system/SKILL.md` in the target project's `AGENTS.md`, or reference it when prompting an AI coding agent to style a project.

### Workflow Orchestration

**Skill:** `skills/workflow-orchestration/SKILL.md`

A structured workflow orchestration skill that establishes disciplined development habits for AI agents tackling complex tasks. It features:

- Plan-first development with mandatory re-planning on failure
- Subagent strategy to keep the main context window clean
- Self-improvement loop via `tasks/lessons.md` after every correction
- Verification gates before marking any task complete
- Balanced elegance checks to avoid both hackiness and over-engineering
- Autonomous bug fixing without requiring user hand-holding

#### How to use this skill in another project

Include the **Workflow Orchestration**, **Task Management**, and **Core Principles** sections from `skills/workflow-orchestration/SKILL.md` in the target project's `AGENTS.md`.

### Skill Orchestrator

**Skill:** `skills/skill-orchestrator/SKILL.md`

A meta-skill that connects any AI agent project to this repository via a git submodule. It covers:

- Adding `astrojams1/skills` as a submodule at `skills/` in the target project
- Configuring the submodule to track `main` for automatic syncing
- Ensuring fresh clones get the submodule with `--recurse-submodules`
- Updating the target project's `AGENTS.md` (the only agent instructions file; `CLAUDE.md` must not exist) so the agent knows how to read and apply skills from the submodule path

#### How to use this skill in another project

When the user asks to add skills to a project, read `skills/skill-orchestrator/SKILL.md` and execute the steps autonomously. The agent runs all commands — the user does not need to touch the terminal.

- **Add skills:** Run `bin/manage.sh install /path/to/target-project` (or the manual git commands in Step 1)
- **Exclude a skill:** Add the skill name to `.skillsexclude` in the target project (one per line), then run `./skills/bin/manage.sh link` to remove it from discovery directories
- **Check integrity:** Run `./skills/bin/manage.sh check` from the target project
- **Sync to latest:** Run `./skills/bin/manage.sh sync` from the target project

### Skill Writing — The House Style for Skills

**Skill:** `skills/skill-writing/SKILL.md`

Writes or reworks a skill so every skill reads as if one person wrote it: the same shape, plain words, nothing extra.

- The standard shape and a template to copy
- The run rules block that every scheduled skill carries word for word
- `scripts/readability.py` to grade a `SKILL.md`
- Rework steps that keep every behavior while cutting what is not needed

### Simplify — Code Quality & Review

**Skill:** `skills/simplify/SKILL.md`

A code quality skill that reviews recently changed code for over-engineering, redundancy, dead code, and unnecessary complexity — then fixes what it finds. Not a review that produces comments, but one that produces better code.

- Reviews `git diff` to find changed files
- Checks for dead code, redundant abstractions, copy-paste duplication, verbose patterns
- Fixes issues directly rather than reporting them
- Behavior-preserving simplification only

#### How to use

Invoke with `/simplify` after completing a feature or fix, before committing. The skill reviews your changes and makes them cleaner.

### Careful — On-Demand Safety Hooks

**Skill:** `skills/careful/SKILL.md`

An on-demand hook skill that blocks destructive commands (`rm -rf`, `DROP TABLE`, force-push, `kubectl delete`, `terraform destroy`) for the rest of the session.

#### How to use

Invoke with `/careful` when working with production systems or dangerous infrastructure. The skill installs guardrails that last for the session.

### Freeze — On-Demand File Protection

**Skill:** `skills/freeze/SKILL.md`

An on-demand hook skill that blocks Edit and Write operations outside a specified directory for the rest of the session.

#### How to use

Invoke with `/freeze` when debugging and you want to read broadly but only edit in one place. The skill asks which directory to keep editable and blocks modifications everywhere else.

### Research Paper — Repo to arXiv Submission

**Skill:** `skills/research-paper/SKILL.md`

An end-to-end pipeline that turns a code repository into a submission-ready paper (LaTeX + PDF): understand the project, infer the research question, mine results, search and resolve the literature, establish novelty, choose thesis / type / audience / venue / scope / math / style, find and run missing experiments, outline, draft, scientific and writing reviews by fresh-context subagents, arXiv submission checks.

- Every stage writes one artifact under `paper/<slug>/` in the target repo; later stages rely only on earlier artifacts plus the repo
- Keeps its own ledger (`ledger/LEDGER.md`, `ledger/runs/`) with per-stage token cost and issues, so the skill can be improved run over run
- References must resolve (arXiv id or DOI) or the strict build fails; numbers in the paper must trace to a file

#### How to use

Invoke with `/research-paper` in the target repo, or say "write this repo up as a paper". Answer the three setup questions (author line, experiment budget, where to commit). Run the ledger scripts from `skills/research-paper/scripts/` (the source copy), then `bin/manage.sh link` to refresh the discovery copies.

### App Release — App Store and Google Play

**Skill:** `skills/app-release/SKILL.md`

One end-to-end release process for every app: local Xcode and Gradle builds on the owner's Mac (no EAS),
App Store Connect and Play Developer API scripts, TestFlight, App Review and rejections, Play testing tracks
and listings, Game Center, pricing, credentials from 1Password, and a JSON release ledger with a generated
view, a run log and entries in the owner's shared activity ledger. Each app supplies an
`app-release.config.json`, a store data file and a thin repository skill; `references/app-types.md` covers
what differs for games, news apps and paid downloads.

#### How to use

Consumer repos get it through the skills submodule and run the scripts from their root, for example
`node skills/skills/app-release/scripts/asc.mjs status`. Onboard a new app with `references/config.md`.
Newsworthy and Space Worms use it. A change requested from an app repository is routed by `references/maintaining.md`: anything true of every app lands here, app facts stay in the app. After changing a script, run `node --test tests/app-release/*.test.mjs`.

### Ouro Website — Keep the App Showcase Current

**Skill:** `skills/ouro-website/SKILL.md`

Maintains https://ouro-apps.vercel.app (`sites/ouro` in repository `astrojams1/app-sites`), the marketing site and App Store
Marketing URL for every Ouro LLC app. `scripts/audit.mjs` compares every record on Ouro's App Store Connect team with
the site's catalog and lists what to add, exclude, rename or refresh; the skill covers copy, images, verification at
desktop and phone widths, and deployment. The site's own workflow flips "Coming soon" to the App Store badge after a
release; app-release runs this skill at each milestone of an Ouro app.

#### How to use

Invoke with `/ouro-website`, or ask whether the Ouro site is up to date, or to add or change an app on it. Run the
audit with `node skills/ouro-website/scripts/audit.mjs` (Node 22). After changing the script, run
`node --test tests/ouro-website/*.test.mjs`.

### astrojams Website — Keep the Personal App Showcase Current

**Skill:** `skills/astrojams-website/SKILL.md`

Maintains https://astrojams-apps.vercel.app (`sites/astrojams` in repository `astrojams1/app-sites`), the marketing site for every app
on the owner's personal James Thompson team (`CWQ9AWJF8T`): Newsworthy, Space Worms, Importron, Data Center and
Rhythm. Both sites are built from one shared showcase in that repository, so a design or tooling change reaches both. It mirrors the Ouro website skill: `scripts/audit.mjs` compares the team with the site's catalog, the site's
workflow flips "Coming soon" to the App Store badge after a release, and app-release runs this skill at each milestone
of a personal-team app. Apps without a website of their own use their page there as the App Store Marketing URL.

#### How to use

Invoke with `/astrojams-website`, or ask whether the astrojams site is up to date, or to add or change an app on it.
Run the audit with `node skills/astrojams-website/scripts/audit.mjs` (Node 22). After changing the script, run
`node --test tests/astrojams-website/*.test.mjs`.

### YouTube Shorts — Frame, Check and Post

**Skill:** `skills/youtube-shorts/SKILL.md`

Make vertical video that frames well where it is actually watched: on a phone, under YouTube's controls. The
player crops the sides of a 1080×1920 frame and draws the status bar, back, search and menu across the top, the
action rail down the right and the channel and title stack across the bottom; none of it shows in an editor or a
browser. The skill keeps those zones as measured data (`assets/zones.json`, from a phone screenshot fitted to the
source frame), draws them over every frame of a render as a contact sheet before upload, covers the upload
package (title, links that do not click, hashtags, related video, cover, captions, settings), and re-measures
from a screenshot when YouTube's interface moves. Its ledger records each measurement and run.

#### How to use

Invoke with `/youtube-shorts`, or ask to make, check or post a Short. Check a render with
`node skills/youtube-shorts/scripts/safe-zone.mjs <video> --every 0.5` (needs ffmpeg). After changing a script or
`zones.json`, run `node --test tests/youtube-shorts/*.test.mjs` and `python3 tests/test_youtube_shorts_fit.py`.

### App Shorts — A Shorts Series for Every App

**Skill:** `skills/app-shorts/SKILL.md`

The repeatable pipeline that keeps every app the owner ships (both App Store teams) on YouTube: a registry built from
each app's `app-release.config.json`, a series format per app, fresh recordings of the real app with rehearsed
inputs, renders through app-release's `app-preview.swift` and youtube-shorts' safe zone and soundtrack, posting and
scheduling through YouTube Studio (or the API once it is connected), and links back to the App Store (attributed
campaign links) and the marketing websites. `scripts/shorts.mjs` keeps the registry, the posting calendar and the
list of Shorts due a metrics read.

#### How to use

Invoke with `/app-shorts`, or ask to make, post or schedule Shorts for an app. Run
`node skills/app-shorts/scripts/shorts.mjs status` to see where every app stands. After changing the script, run
`node --test tests/app-shorts/*.test.mjs`.

### YouTube Growth — Read the Numbers, Decide, Repeat

**Skill:** `skills/youtube-growth/SKILL.md`

The follow-up loop for the owner's channel: reads each Short's metrics at 2, 7 and 28 days (YouTube Analytics API
when connected, Studio otherwise), turns them into decisions per Short and per series with thresholds kept as
sourced data (`assets/rules.json`), mines comments for the next episodes, runs one experiment at a time and keeps
the channel inside YouTube's policies for templated content.

#### How to use

Invoke with `/youtube-growth`, or ask how the Shorts are doing or how to grow the channel. Run
`node skills/youtube-growth/scripts/evaluate.mjs` for decisions and `node skills/youtube-growth/scripts/yt-api.mjs check`
for the API connection. After changing a script or the rules, run `node --test tests/youtube-growth/*.test.mjs`.

### Reddit Posting

**Skill:** `skills/reddit-posting/SKILL.md`

Drafts, logs and follows up Reddit posts and replies for a project (tester
recruitment, test-for-test swaps, launch notes) in a wildly concise voice that
matches each subreddit. Agent tools cannot reach Reddit, so the owner posts the
approved text and pastes threads back; every post and reply is approved. Each
project keeps its own Reddit file (default `docs/reddit.md`); the skill's ledger
indexes runs across projects.

#### How to use

Invoke with `/reddit-posting` or ask to post on Reddit. Consumer repos with the
skills submodule get it on `./skills/bin/manage.sh sync`; a repo without the
submodule can point a thin repo skill at this one.

## Internal Skills

These skills are internal to the skills repository and are NOT distributed to consumer repos. They have `internal: true` in their SKILL.md frontmatter, which causes `manage.sh` to skip them during `link`, `install`, `sync`, and `check`.

### Call Triage — From a Recorded Call to Finished Follow-Through

**Skill:** `skills/call-triage/SKILL.md`

Takes a recorded call about any app, service or venture and carries it through: finds the recording, transcribes it on the Mac, sorts what was said into action items, ideas, marketing insights and the rest, tracks every item until it closes with evidence, and prepares a page and an email draft for the person on the call. Audio and transcripts stay in `/Volumes/ssd/projects/calls/` and never reach GitHub; `scripts/call_triage.py guard` checks repositories and pages for audio, transcripts and quoted runs of the transcript. It drafts email and never sends it.

### Abandoned PRs — Weekly Pull Request Cleanup

**Skill:** `skills/abandoned-prs/SKILL.md`

Finds PRs that have gone quiet in the owner's repositories and merges, closes or leaves each one, as a standing weekly job. `scripts/discover.mjs` sorts open PRs into buckets and remembers decisions, so a PR waiting on the owner is reported each week without being reworked. Forks and strangers' PRs are never checked out. It keeps every branch, and never submits, releases or deploys.

### Uncommitted Work — Weekly Local Cleanup

**Skill:** `skills/uncommitted-work/SKILL.md`

Finds uncommitted changes and stashes in every local checkout and worktree, and either ships them through a PR or backs them up and clears them, as a standing weekly job. `scripts/scan.py close` refuses unless a current backup exists, so nothing unsaved can be lost. It leaves live checkouts, repositories owned by other accounts and repositories with no remote for the owner.

### Design System Migration Prompt

**Skill:** `skills/design-system-migration-prompt/SKILL.md`

A migration prompt for the skills repo author to copy-paste to an AI agent in a consumer repo that already has the `design-system` skill. The agent audits the existing design system, strips it completely, and replaces it by following the design-system skill. The prompt references the skill rather than embedding the full spec.

#### How to use

The consumer repo must already have the `design-system` skill available (via submodule or copied). Read `skills/design-system-migration-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the consumer repo. The agent will audit, strip, replace, and verify autonomously.

### Health Check Prompt

**Skill:** `skills/health-check-prompt/SKILL.md`

A diagnostic prompt for the skills repo author to copy-paste to a Claude or Codex agent running in a consumer repo. The agent gathers data and returns a structured health report covering submodule state, discovery directories, hooks, agent instructions, and spec compliance.

#### How to use

Read `skills/health-check-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the consumer repo. Review the returned report using the diagnostic table in the skill.

### Health Check Review

**Skill:** `skills/health-check-review/SKILL.md`

Processes health check reports pasted from consumer repos. Analyzes report data, identifies bugs in `manage.sh` or skills code, suggests improvements to the health-check-prompt, and provides step-by-step next steps for both the skills repo and the consumer repo.

#### How to use

Paste one or more health check reports into the conversation. The skill activates automatically and walks through diagnosis, fixes, and next steps.

### Skill Integration Prompt

**Skill:** `skills/skill-integration-prompt/SKILL.md`

A one-shot integration prompt for the skills repo author to give an AI agent in a new consumer repo. The agent adds the skills submodule, runs `manage.sh install`, configures agent instructions, applies `workflow-orchestration` (always), and optionally applies the `design-system` skill. Produces a fully integrated project in one prompt.

#### How to use

Read `skills/skill-integration-prompt/SKILL.md`, copy the prompt between the `---START---` / `---END---` markers, and paste it to the agent in the new consumer repo. To include the design system, uncomment the Design System section in Phase 4 before pasting.

## Rules

1. **AGENTS.md is the only agent instructions file.** Claude Code and Codex both read `AGENTS.md` (Claude Code reads it when no `CLAUDE.md` exists). Never create `CLAUDE.md`, in this repo or in consumer repos. Run `tests/test-identity.sh` to verify.
2. **Skills follow the Agent Skills spec.** Each skill is a directory under `skills/` containing a `SKILL.md` with valid YAML frontmatter. Run `tests/test_skills_spec.py` to verify. **Always read the [spec](https://agentskills.io/specification) before making structural changes.**
3. **Skills are self-contained.** Each skill must contain all instructions needed to apply it to a project, with no external dependencies on other skill files.
4. **Keep skills actionable.** Write skills as step-by-step instructions an AI agent can follow, not as abstract documentation.
5. **Use progressive disclosure.** Keep `SKILL.md` concise (< 500 lines). Move detailed reference material (full HTML patterns, verbose CSS) into `references/` files that agents load on demand.
6. **SKILL.md summarizes; references/ implements.** `SKILL.md` should state *what* and *why* — principles, token definitions, component names, brief behavioral summaries, and pointers to `references/`. It should NOT contain full implementation examples (exact class strings, HTML snippets, code blocks) when those already exist in `references/` files. If a concept needs a code example, put the example in `references/` and add a one-line summary + link in `SKILL.md`.
7. **Dependent skills reference, never duplicate.** When one skill depends on another (e.g., a migration prompt depends on the design system skill), it must reference the source skill's sections by name rather than re-specifying the same information. Migration-specific additions (translation mappings, workflow phases, constraints) are fine; re-stating the source skill's class strings, property values, or patterns is not.
8. **Zero failing tests.** All tests must pass before committing. No exceptions — even pre-existing failures must be fixed, not ignored. Run `bash tests/test-manage.sh`, `bash tests/test-identity.sh`, `python3 tests/test_skills_spec.py`, `python3 tests/test_no_hidden_caps.py`, `python3 tests/test_readability.py`, `python3 tests/test_youtube_shorts_fit.py`, `node --test tests/app-release/*.test.mjs`, `node --test tests/ouro-website/*.test.mjs`, `node --test tests/astrojams-website/*.test.mjs` and `node --test tests/youtube-shorts/*.test.mjs` (Node 22) to verify.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how
- **Fix what you find.** If you encounter type errors, lint warnings, or failing tests during any task — fix them. Never dismiss issues as "pre-existing" or "not caused by my changes." Leave the codebase better than you found it
- When you see errors like missing module declarations or type mismatches in test files, resolve them (install types, add declarations, fix imports) — don't just report them

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
