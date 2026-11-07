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
