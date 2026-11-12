# Shorts metrics and what they mean

Researched 2026-11-04. Help Center pages carry no dates, so they are cited with the day they were read. Re-check
anything older than a year before relying on it.

## How a Short is distributed

Each Short first goes to a small **seed audience**; it spreads only if that audience responds well, and stops if
not. That is why many Shorts stall near a fixed number of views. (Todd Sherman, YouTube Shorts product lead, on
Creator Insider; reported by onlinemarketing.de, 2026-08-31. Medium confidence: a secondhand report.)

## The metrics

| Metric | Where | What it says | Use |
|---|---|---|---|
| **Viewed vs. swiped away** ("How many chose to view") | Studio only | Of the times the Short was shown in the feed, how often people stayed rather than swiping | The hook. Low means the first second loses people |
| **Shown in feed** | Studio only | How often it appeared in the Shorts feed | Whether it left the seed |
| **Engaged views** | Studio, Analytics API (`engagedViews`) | The old view definition, kept when public views changed | Reach, comparable across Shorts |
| **Views** | Everywhere | Since 2025-03-31 every start or replay; since 2026-08-24 the first frame, all formats | Public number only; overstates reach |
| **Average percentage viewed** | Studio, API (`averageViewPercentage`) | Watch time as a share of length; above 100% means rewatches | The middle and the loop |
| **Average view duration** | Studio, API | Seconds watched | With length, the same story |
| **Likes, comments, shares** | Studio, API | Response per view | Per 1,000 engaged views, not raw |
| **Subscribers gained** | Studio, API | Conversions to the channel | Per 1,000 engaged views |

Sources: support.google.com/youtube/answer/12942217 (Shorts metrics, read 2026-11-04);
techcrunch.com/2025/03/26/youtube-is-changing-how-youtube-shorts-views-are-counted (2025-03-26);
support.google.com/youtube/answer/2991785 and the Analytics API revision history entry of 2026-08-27 (views at
first frame; Partner Program now uses "qualified Shorts views"); developers.google.com/youtube/analytics/metrics.

## What the evidence does not support

- **Fixed benchmarks.** "70–90% viewed is good" and similar figures come from tool vendors without a published
  method; YouTube publishes none. The skill compares with the channel's own quartiles once it has 8+ Shorts.
- **The engaged-view threshold** (how many seconds count) is unpublished; blogs disagree.
- **Posting more is rewarded.** YouTube has said frequency itself is not a ranking factor (2023, dated); vendor
  studies that show faster growth with more posts are correlational. Distinct ideas at a sustainable pace win.
- **Length.** Shorts may run to 3 minutes (since 2024-10-15), but no source shows longer doing better for app
  promotion. A Short over a minute with any copyright claim is blocked worldwide (support.google.com/youtube/answer/15424877),
  one more reason for original sound.

## This channel's own baseline (2026-11-04)

Twelve app Shorts posted 21 Oct to 1 Nov: median about 61 views. Outliers: a 7 s calm alphabet loop (1,259 views,
207% average viewed at day 3) and a plain "Search Newsworthy in the App Store" clip (1,144). Feature demos and
"coming soon" clips: 1–88. The registry holds these as `legacy` episodes, counted in the baseline and not judged.

## Downloads: what a Short is for (2026-11-12)

A view is not the goal; a download is. The owner's audit on 2026-11-12 found no evidence any Short had produced a
download. Apple does not say which download came from which video, so `evaluate.mjs` compares time windows:

- **The window:** the three days starting the day the Short went public (UTC), 72 hours.
- **The baseline:** the app's mean daily first-time downloads over the 7 days before, counting only days Apple
  reported (at least 3).
- **The sources:** App Store search and App Store browse, from `days[<date>].sources` in `app-marketing`'s
  `asc-analytics` rows. A viewer who wants the app types its search phrase, so search is where a Short shows up.
  Older rows have no per-day sources; then all first-time downloads count, and the verdict says so.
- **The verdict:** `lifted` when the window beats the expected count by at least 3 downloads and 2 Poisson standard
  deviations. `no-effect` when it does not, after at least 500 views. Otherwise `inconclusive`: too few views, the
  window not over, or Apple's days not in yet. Two Shorts that go public close together share the window; the
  verdict lists them as `overlaps`.
- **What it cannot see:** a download days later, a viewer who found the app another way, or downloads Apple
  withholds when counts are very small. A `lifted` is evidence, not proof; a format needs two before it doubles down.

The numbers are proposals with low confidence. No published study ties Shorts views to App Store downloads. Tune
`minViews` and `z` once five or more Shorts have download verdicts.
