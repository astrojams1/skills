#!/usr/bin/env node
// marketing.mjs
// The state of the app-marketing loop. Strategy lives in one profile per app (marketing/apps/<id>.json in the
// app-sites repository); everything that happens is an append-only line in marketing/ledger.jsonl; numbers are
// append-only lines in marketing/metrics.jsonl. A backlog item's state is never stored: it is derived from the newest
// ledger event naming it, so two runs cannot disagree and history cannot be edited away. Node 22, no dependencies.
//
//   node marketing.mjs check                        validate profiles, ledger and metrics; exit 1 on any problem
//   node marketing.mjs status                       per app: stage, numbers, what shipped, what is open
//   node marketing.mjs next [--runner cloud|mac] [--limit N] [--json]   every open item worth doing now, best first
//   node marketing.mjs log [FILE]                   append one event (JSON from FILE or stdin), adding v, ts, skill
//   node marketing.mjs public [--write]             App Store ratings, version, price and stage for every app (no keys)
//   node marketing.mjs pull [--write] [--recount]   Mac only: Apple's daily reports: first-time downloads by source and
//                                                   referrer, impressions and product page views; --recount re-reads every
//                                                   instance Apple still holds and appends corrected totals
//   node marketing.mjs learn [--app ID] [--json] [--write]   each channel's results judged on downloads, and the kill
//                                                   verdicts; also pitch approaches (--write retires a dead one)
//   node marketing.mjs pitches [--write] [--replies] [--json]   pitch emails: each pitch's state from /api/pitches.
//                                                   Only reads (?dry=1): the app-sites Pitches workflow and the cron
//                                                   send. Proves it can read app-sites with the deployed queue's digest
//                                                   from this clone (no token needed, so it works in the cloud), else a
//                                                   GitHub token (GH_TOKEN or `gh auth token`); --replies prints
//                                                   replies' text to answer, --write appends a snapshot (no text, no
//                                                   addresses) to metrics.jsonl
//   node marketing.mjs promo --app ID --text TEXT [--confirm]   Mac only: promotional text on the live version
//   node marketing.mjs hn --app ID [--json]          Show HN check: eligible, earlier submissions, the pre-filled submit link
//   node marketing.mjs youtube [--write]            one `youtube` snapshot per app from `shorts.mjs views` (public Shorts
//                                                   only): shortsViews, publicShorts, scheduledShorts
//   node marketing.mjs board                        regenerate marketing/LEDGER.md and marketing/show-hn.txt
//   node marketing.mjs mirror                       Mac only: copy new events into the shared activity ledger
//
// --root PATH names the app-sites checkout (default: the git top level of the working directory).
// --registry PATH names the app-shorts registry (default /Volumes/ssd/projects/app-shorts/registry.json; absent in the
// cloud, where Shorts items are the Mac's anyway).

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ON_CHANNEL, views } from '../../app-shorts/scripts/shorts.mjs';

export const EVENTS = ['start', 'action', 'finding', 'verify', 'end'];
export const STATUSES = ['running', 'ok', 'failed', 'skipped', 'deferred', 'partial'];
export const STAGES = ['prelaunch', 'live'];
export const RUNNERS = ['cloud', 'mac'];
const REQUIRED = ['v', 'ts', 'run_id', 'skill', 'agent', 'event', 'status'];
// The only reasons a run may leave something open (James, 2026-11-10: a run fixes every issue it finds). `owner` is a
// step only the owner can take (a payment, a sign-in, an approval); `store-gate` is a store submission or review;
// `pacing` is an outside rule that forbids the act itself today (Hacker News's limits); `outside` is a service that is
// down or data that does not exist yet, after another way was tried. A Short's slot is never one: it sets publishAt.
export const BLOCKERS = ['owner', 'store-gate', 'pacing', 'outside'];
// Events from this time on must say what blocks anything they leave open; older lines are history.
const FIX_RULE_FROM = Date.parse('2026-11-11T00:00:00Z');
// From here on nothing waits on the owner (James, 2026-11-12: "every marketing skill needs to be able to run
// autonomously ... without me giving go-aheads or signing in to things"). Owner-only work is dropped and routed
// around, so `owner` no longer keeps anything open.
const AUTONOMY_FROM = Date.parse('2026-11-12T18:00:00Z');
// An end event that says work was left undone without a blocker, in the words runs have used.
const UNDONE = /\bnot (?:yet )?(?:reached|done|attempted|blocked)\b|\bthe next run (?:makes|does|will)\b|\bran out of time\b/i;
const MAX_LINE = 16 * 1024;
// Text that must never reach a committed ledger: private keys, 1Password service tokens, bearer tokens, API secrets.
const SECRET = /-----BEGIN [A-Z ]*PRIVATE KEY|ops_[A-Za-z0-9_-]{20,}|\bBearer\s+[A-Za-z0-9._-]{20,}|\bsk-[A-Za-z0-9_-]{20,}|\bghp_[A-Za-z0-9]{20,}/;
const DAY = 86400000;
const PROMO_STATES = ['READY_FOR_DISTRIBUTION', 'PREPARE_FOR_SUBMISSION', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'READY_FOR_REVIEW'];

// parseLines reads a JSONL string, returning the records and one problem per unreadable line.
export function parseLines(text, label = 'ledger') {
  const records = [], problems = [];
  text.split('\n').forEach((line, index) => {
    if (!line.trim()) return;
    try { records.push(JSON.parse(line)); } catch { problems.push(`${label} line ${index + 1} is not JSON`); }
  });
  return { records, problems };
}

// leftOpenProblems enforces "fix what you find": an action left deferred, failed or skipped names its blocker, and the
// end event lists everything still open with its blocker and what the owner must do.
export function leftOpenProblems(event) {
  if (!event.ts || Date.parse(event.ts) < FIX_RULE_FROM) return [];
  const problems = [];
  const open = event.event === 'action' && ['deferred', 'failed', 'skipped'].includes(event.status) && !event.dropped;
  const autonomous = Date.parse(event.ts) >= AUTONOMY_FROM;
  const allowed = autonomous ? BLOCKERS.filter(b => b !== 'owner') : BLOCKERS;
  if (open) {
    if (autonomous && event.blocked_by === 'owner') problems.push('nothing waits on the owner since 2026-11-12: drop owner-only work (status skipped, dropped: true) and route around it');
    else if (!allowed.includes(event.blocked_by)) problems.push(`a ${event.status} action needs blocked_by, one of ${allowed.join(', ')}; anything else is fixed in this run`);
    if (!event.reason) problems.push(`a ${event.status} action needs a reason naming the blocker and each way tried`);
    if (event.blocked_by === 'pacing' && (event.channel === 'shorts' || /\/shorts\b/.test(event.item || ''))) problems.push('a Short is never left for pacing: make it now and schedule it into the next free slot');
  }
  if (event.event === 'end') {
    if (!Array.isArray(event.left_open)) problems.push('end needs left_open: every issue still open, or [] when the run fixed everything');
    else event.left_open.forEach((o, i) => {
      if (autonomous && o?.blocked_by === 'owner') problems.push(`left_open ${i + 1} waits on the owner: drop it and route around it (James, 2026-11-12)`);
      else if (!o || !o.issue || !allowed.includes(o.blocked_by) || !o.needs) problems.push(`left_open ${i + 1} needs issue, blocked_by (${allowed.join(', ')}) and needs (what unblocks it)`);
    });
    if (autonomous && UNDONE.test([event.operation, event.next, event.reason].filter(Boolean).join(' '))) problems.push('end says work was left undone without a blocker: do it, or log each item deferred with blocked_by');
  }
  return problems;
}

// The ledger is append-only, so a wrong line is corrected by a new one: the same run_id and event, with `corrects` set to
// the wrong line's ts. correctedLines returns the indexes the check reads through their correction, and a problem for a
// correction that names no earlier line.
export function correctedLines(records) {
  const fixed = new Set(), problems = [];
  records.forEach((c, at) => {
    if (!c?.corrects) return;
    const i = records.findIndex((e, j) => j < at && e.run_id === c.run_id && e.event === c.event && e.ts === c.corrects);
    if (i < 0) problems.push(`ledger line ${at + 1}: corrects names no earlier ${c.event} of ${c.run_id} at ${c.corrects}`);
    else fixed.add(i);
  });
  return { fixed, problems };
}

// eventProblems returns what is wrong with one ledger event.
export function eventProblems(event) {
  const problems = REQUIRED.filter(key => event[key] === undefined || event[key] === '').map(key => `missing ${key}`);
  if (event.v !== undefined && event.v !== 1) problems.push('v must be 1');
  if (event.event && !EVENTS.includes(event.event)) problems.push(`unknown event ${event.event}`);
  if (event.status && !STATUSES.includes(event.status)) problems.push(`unknown status ${event.status}`);
  if (event.ts && Number.isNaN(Date.parse(event.ts))) problems.push('ts is not a date');
  if (event.retry_after && Number.isNaN(Date.parse(event.retry_after))) problems.push('retry_after is not a date');
  problems.push(...leftOpenProblems(event));
  const text = JSON.stringify(event);
  if (text.length > MAX_LINE) problems.push('event is over 16 KiB; refer to an artifact instead');
  if (SECRET.test(text)) problems.push('event looks like it contains a secret');
  return problems;
}

// profileProblems returns what is wrong with one app's profile.
export function profileProblems(profile, name = profile.id) {
  const problems = [];
  for (const key of ['id', 'name', 'stage', 'goal', 'audience', 'positioning', 'backlog']) {
    if (profile[key] === undefined) problems.push(`${name}: missing ${key}`);
  }
  if (profile.stage && !STAGES.includes(profile.stage)) problems.push(`${name}: unknown stage ${profile.stage}`);
  // The phrase every Short gives (app-shorts reads it): checked on the App Store's own search by the daily
  // `search-phrase` item. rank is where the store listed the app for it (null: not found that day).
  const sp = profile.searchPhrase;
  if (profile.stage === 'live' && !(sp && typeof sp.phrase === 'string' && sp.phrase.trim() && !Number.isNaN(Date.parse(sp.checked)))) {
    problems.push(`${name}: searchPhrase needs { phrase, rank, checked }: the phrase the App Store's search lists the app for, and the date it was checked`);
  }
  const seen = new Set();
  for (const item of profile.backlog || []) {
    const label = `${name}/${item.id || '?'}`;
    for (const key of ['id', 'title', 'channel', 'runner', 'impact', 'effort']) {
      if (item[key] === undefined) problems.push(`${label}: missing ${key}`);
    }
    if (seen.has(item.id)) problems.push(`${label}: duplicate id`);
    seen.add(item.id);
    if (item.runner && !RUNNERS.includes(item.runner)) problems.push(`${label}: runner must be cloud or mac`);
    for (const key of ['impact', 'effort']) {
      if (item[key] !== undefined && !(Number.isInteger(item[key]) && item[key] >= 1 && item[key] <= 5)) problems.push(`${label}: ${key} must be 1 to 5`);
    }
    if (item.requires && !STAGES.includes(item.requires)) problems.push(`${label}: requires must be a stage`);
    if (item.repeat_days !== undefined && !(item.repeat_days > 0)) problems.push(`${label}: repeat_days must be positive`);
    // A run does all known work (AGENTS.md), so recurring work comes back every run. A longer rest is a throttle and
    // must say why, in the owner's terms, so it can't creep back unnoticed the way "one guide a week" did.
    if (item.repeat_days > 1 && !(typeof item.pace_reason === 'string' && item.pace_reason.trim())) {
      problems.push(`${label}: repeat_days ${item.repeat_days} holds known work back; use 1, or add pace_reason saying why it must wait`);
    }
  }
  // Work the kill rule stopped for this app (SKILL.md, Learn), keyed by channel or item id:
  // { "youtube-shorts": { "since": date, "evidence": "..." } }.
  for (const [channel, stop] of Object.entries(profile.stopped || {})) {
    if (!stop || Number.isNaN(Date.parse(stop.since)) || !stop.evidence) problems.push(`${name}: stopped.${channel} needs since (a date) and evidence (the three results)`);
  }
  // Listing tests (references/channels.md, "The App Store funnel"): one change per stage, with the date and snapshot.
  for (const [n, t] of (profile.listingTests || []).entries()) {
    if (!['impressions', 'tap-through', 'conversion'].includes(t.stage) || !t.field || Number.isNaN(Date.parse(t.prepared)) || !t.before || !(t.live || t.version)) {
      problems.push(`${name}: listingTests[${n}] needs stage, field, prepared (a date), before (the snapshot) and live (a date) or version`);
    }
  }
  if (profile.hackerNews !== undefined) {
    const hn = profile.hackerNews;
    if (!/^https:\/\//.test(hn.url || '')) problems.push(`${name}: hackerNews.url must be an https URL`);
    if (!hn.tryIt) problems.push(`${name}: hackerNews.tryIt must say how someone tries it without signing up`);
    problems.push(...hnTitleProblems(hn.title).map(p => `${name}: hackerNews.title ${p}`));
  }
  return problems;
}

// ---- Hacker News ----
// Show HN rules (news.ycombinator.com/showhn.html and /newsguidelines.html): the maker posts it and is around to
// discuss it, people can try it without signing up, the title is plain, nobody is asked to vote or comment, reposts
// are fine only when the earlier one got no real attention in the last year, and posting is not automated. The owner
// chose on 2026-11-07 to have the Mac pass post anyway, so this keeps each post to what HN asks of a person: it decides
// whether a submission is due and builds HN's own pre-filled form, and the run submits only a link and a title.

const HN_TITLE_MAX = 80;
const HN_ATTENTION = { points: 10, comments: 5 };
const HN_GAP_DAYS = 30;      // one post across all apps per month: own work "part of the time"
const HN_REPOST_DAYS = 14;   // a repost waits at least two weeks after the last submission
const HN_PER_YEAR = 2;       // the first post and at most one repost per app in any 365 days

// hnTitleProblems returns what is wrong with a Show HN title.
export function hnTitleProblems(title) {
  if (!title) return ['is missing'];
  const problems = [];
  if (!title.startsWith('Show HN: ')) problems.push('must start with "Show HN: "');
  if (title.length > HN_TITLE_MAX) problems.push(`is over ${HN_TITLE_MAX} characters`);
  if (/!/.test(title)) problems.push('has an exclamation mark');
  if (title.replace(/^Show HN: /, '').split(/\s+/).some(w => /^[A-Z]{5,}$/.test(w))) problems.push('shouts a word in capitals');
  if (/\b(best|ultimate|revolutionary|amazing|game[- ]chang\w*|#1|blazing)\b/i.test(title)) problems.push('has hype words');
  return problems;
}

// hnStories keeps the stories that are this app's: its URL, or a Show HN naming it.
export function hnStories(profile, hits) {
  const strip = u => String(u || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#]+$/, '');
  const url = strip(profile.hackerNews?.url);
  const name = profile.name.toLowerCase();
  const seen = new Set();
  return hits.filter(h => {
    if (seen.has(h.objectID)) return false;
    seen.add(h.objectID);
    const title = String(h.title || '').toLowerCase();
    return (url && strip(h.url) === url) || (title.startsWith('show hn') && title.includes(name));
  }).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

// hnVerdict says whether this app's Show HN is due now, from its profile, its stories on HN and the ledger.
export function hnVerdict(profile, stories, events, now = Date.now()) {
  const no = reason => ({ due: false, reason });
  if (!profile.hackerNews) return no('not marked as a developer tool for Hacker News (no hackerNews in the profile)');
  if (profile.stage !== 'live') return no('not live yet: Show HN is for things people can try now');
  const posts = events.filter(e => e.event === 'action' && e.channel === 'hacker-news' && e.status === 'ok');
  const lastPost = posts[posts.length - 1];
  if (lastPost && now - Date.parse(lastPost.ts) < HN_GAP_DAYS * DAY) {
    return no(`a Hacker News post (${lastPost.app}) was ${Math.floor((now - Date.parse(lastPost.ts)) / DAY)} days ago; one a month across all apps`);
  }
  const recent = stories.filter(s => now - Date.parse(s.created_at) < 365 * DAY);
  const noticed = recent.find(s => s.points >= HN_ATTENTION.points || s.num_comments >= HN_ATTENTION.comments);
  if (noticed) return no(`already discussed: news.ycombinator.com/item?id=${noticed.objectID} (${noticed.points} points, ${noticed.num_comments} comments)`);
  if (recent.length >= HN_PER_YEAR) return no(`submitted ${recent.length} times in the last year; no more reposts`);
  const newest = recent[recent.length - 1];
  if (newest && now - Date.parse(newest.created_at) < HN_REPOST_DAYS * DAY) return no(`submitted ${Math.floor((now - Date.parse(newest.created_at)) / DAY)} days ago; a repost waits ${HN_REPOST_DAYS} days`);
  return { due: true, repost: recent.length > 0, reason: recent.length ? 'the earlier submission got no real attention, so one repost is allowed' : 'never submitted' };
}

// hnSubmitLink is Hacker News's own pre-filled submit form, opened in the owner's signed-in browser.
export const hnSubmitLink = (url, title) => `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`;

// itemState derives a backlog item's state from the ledger. Only an `action` can change it: a `finding` that mentions
// an item ("passed over it today") is commentary. The newest action decides: `ok` finishes it
// (until repeat_days pass for recurring work), `deferred` or `failed` parks it until retry_after (default three days),
// `skipped` with `dropped: true` retires it, and anything else leaves it open.
// `shorts` is the app's entry from the app-shorts registry, when the registry is on this machine: its episodes and the
// app's cadenceDays (which youtube-growth raises when Shorts lift downloads). A Shorts item is done only while its
// Short is on the channel: one pulled, superseded or never uploaded reopens it. It then rests for the registry's
// cadence, so the pace of each app's Shorts has one owner.
export function itemState(item, events, app, now = Date.now(), shorts) {
  const episodes = Array.isArray(shorts) ? shorts : shorts?.episodes;
  if (item.channel === 'youtube-shorts' && shorts?.cadenceDays) item = { ...item, repeat_days: shorts.cadenceDays };
  const mine = events.filter(e => e.event === 'action' && e.app === app && e.item === item.id && e.status !== 'running');
  const last = mine[mine.length - 1];
  if (!last) return { state: 'open', last: null };
  const at = Date.parse(last.ts);
  if (last.status === 'skipped' && last.dropped) return { state: 'dropped', last };
  if (last.status === 'ok' || last.status === 'partial') {
    if (item.channel === 'youtube-shorts' && episodes && !shortStands(episodes, last)) return { state: 'open', last, why: 'its Short is not live or scheduled in the registry' };
    // Grace of half the interval, at most half a day, so a daily run that starts a few minutes earlier than
    // yesterday's still sees the item while a shorter repeat keeps a rest above zero.
    const rest = item.repeat_days * DAY;
    if (item.repeat_days && now - at >= rest - Math.min(DAY / 2, rest / 2)) return { state: 'open', last };
    return { state: item.repeat_days ? 'resting' : 'done', last };
  }
  if (last.status === 'deferred' || last.status === 'failed' || last.status === 'skipped') {
    const until = last.retry_after ? Date.parse(last.retry_after) : at + 3 * DAY;
    return now >= until ? { state: 'open', last } : { state: 'parked', last };
  }
  return { state: 'open', last };
}

// shortStands says whether the Short an `ok` action made is still on the channel (scheduled, live or retired, as
// app-shorts counts them): an episode named in the action, or one posted or scheduled from half a day before it on.
// The app-level `liveOrScheduled` of `shorts.mjs views` is not enough alone: an app's old legacy Short would keep the
// item done after its new Short was pulled.
export function shortStands(episodes, action) {
  const text = JSON.stringify(action);
  const since = Date.parse(action.ts) - DAY / 2;
  return episodes.some(e => ON_CHANNEL.includes(e.status) &&
    (text.includes(e.id) || (e.videoId && text.includes(e.videoId)) || Date.parse(e.publishAt || e.postedAt || 0) >= since));
}

// episodesFor returns an app's Shorts and cadence from the registry (matched by the profile's shortsSlug), or undefined
// without a registry.
export function episodesFor(registry, profile) {
  if (!registry) return undefined;
  const slug = profile.shortsSlug || profile.id;
  return { episodes: (registry.episodes || []).filter(e => e.app === slug), cadenceDays: registry.apps?.[slug]?.cadenceDays ?? 7 };
}

// rank orders the open items across apps by expected downloads per unit of work. Each app's `weight` is its share of
// attention, and an app that was worked on recently waits behind one that was not, so no app starves.
// A channel the kill rule stopped for an app gets no more work there (SKILL.md, Learn).
export function rank(profiles, events, { runner, now = Date.now(), registry } = {}) {
  const items = [];
  for (const profile of profiles) {
    const appEvents = events.filter(e => e.event === 'action' && e.app === profile.id && e.item && e.status === 'ok');
    const lastWorked = appEvents.length ? Date.parse(appEvents[appEvents.length - 1].ts) : 0;
    const idleDays = lastWorked ? Math.min((now - lastWorked) / DAY, 7) : 7;
    const episodes = episodesFor(registry, profile);
    const finished = id => ['done', 'resting'].includes(itemState(profile.backlog.find(b => b.id === id) || { id }, events, profile.id, now, episodes).state);
    for (const item of profile.backlog) {
      if (runner && item.runner !== runner) continue;
      if (item.requires && item.requires !== profile.stage) continue;
      if (profile.stopped?.[item.channel] || profile.stopped?.[item.id]) continue;
      if (item.after && !item.after.every(finished)) continue;
      if (itemState(item, events, profile.id, now, episodes).state !== 'open') continue;
      const score = (item.impact / item.effort) * (profile.weight || 1) * (1 + idleDays / 7);
      items.push({ app: profile.id, id: item.id, title: item.title, channel: item.channel, runner: item.runner, score: Math.round(score * 100) / 100, how: item.how });
    }
  }
  return items.sort((a, b) => b.score - a.score || a.app.localeCompare(b.app) || a.id.localeCompare(b.id));
}

// ---- Apple's Analytics Reports ----
// Each report comes as daily instances. An instance can hold several dates (late data, corrections), and the instance
// with the newest processing date replaces every date it holds: Apple says to use the latest instance and never to add
// a date's rows across instances (developer.apple.com/documentation/analytics-reports/data-completeness-corrections).
// So every count is kept per date, the newest instance wins a date, and totals are sums over unique dates.

// tsvTable reads one report segment: its rows as objects keyed by lower-case column name.
function tsvTable(tsv, label) {
  const [head, ...lines] = tsv.trim().split('\n');
  const columns = head.split('\t').map(c => c.trim().toLowerCase());
  if (!columns.includes('date') || !columns.includes('counts')) throw new Error(`The ${label} report has no Date or Counts column`);
  return lines.filter(Boolean).map(line => { const cell = line.split('\t'); return Object.fromEntries(columns.map((c, i) => [c, cell[i] ?? ''])); });
}
const bump = (map, key, n) => { map[key] = (map[key] || 0) + n; };

// downloadRows reads "App Downloads Standard": first-time downloads and redownloads by day, and first-time downloads by
// source type (App Store search, App Store browse, Web referrer, App referrer, Unavailable...) by day and in all.
export function downloadRows(tsv) {
  const out = { days: {}, sources: {} };
  for (const row of tsvTable(tsv, 'downloads')) {
    const count = Number(row.counts) || 0, kind = row['download type'].toLowerCase();
    const day = (out.days[row.date] ||= { first: 0, re: 0 });
    if (kind.includes('first')) {
      day.first += count;
      const from = row['source type'] || 'Unknown';
      bump((day.sources ||= {}), from, count);
      bump(out.sources, from, count);
    } else if (kind.includes('redownload')) day.re += count;
  }
  return out;
}

// referrerRows reads a Detailed report ("App Downloads Detailed" or "App Store Discovery and Engagement Detailed"): by
// day, first-time downloads or product page views from each app or web referrer ("Web referrer: ouro-apps.vercel.app",
// "App referrer: com.google.ios.youtube"). Apple withholds Detailed rows under its privacy threshold, so a missing
// referrer is "not shown", never zero.
export function referrerRows(tsv, kind = 'downloads') {
  const out = { days: {} };
  for (const row of tsvTable(tsv, `${kind} detailed`)) {
    const wanted = kind === 'downloads' ? String(row['download type']).toLowerCase().includes('first') : row.event === 'Page view';
    const type = row['source type'] || '';
    if (!wanted || !/referrer/i.test(type)) continue;
    bump(((out.days[row.date] ||= {}).referrers ||= {}), `${type}: ${row['source info'] || 'unknown'}`, Number(row.counts) || 0);
  }
  return out;
}

// discoveryRows reads "App Store Discovery and Engagement Standard": impressions, product page views and taps by day,
// and page views by source type.
export function discoveryRows(tsv) {
  const out = { days: {} };
  for (const row of tsvTable(tsv, 'discovery')) {
    const count = Number(row.counts) || 0;
    const day = (out.days[row.date] ||= { impressions: 0, pageViews: 0, taps: 0 });
    if (row.event === 'Impression') day.impressions += count;
    else if (row.event === 'Tap') day.taps += count;
    else if (row.event === 'Page view') {
      day.pageViews += count;
      bump((day.pageViewSources ||= {}), row['source type'] || 'Unknown', count);
    }
  }
  return out;
}

// The reports a pull reads, the metrics source each is stored under, and how to read it.
export const REPORTS = [
  { name: 'App Downloads Standard', source: 'asc-analytics', read: downloadRows },
  { name: 'App Downloads Detailed', source: 'asc-downloads-detailed', read: tsv => referrerRows(tsv, 'downloads') },
  { name: 'App Store Discovery and Engagement Standard', source: 'asc-discovery', read: discoveryRows },
  { name: 'App Store Discovery and Engagement Detailed', source: 'asc-discovery-detailed', read: tsv => referrerRows(tsv, 'page views') }
];

// addDay adds one segment's counts for a day into another (segments of one instance are parts of one batch).
function addDay(into, day) {
  for (const [key, value] of Object.entries(day)) {
    if (typeof value === 'number') into[key] = (into[key] || 0) + value;
    else { into[key] ||= {}; for (const [k, n] of Object.entries(value)) bump(into[key], k, n); }
  }
  return into;
}

// newestPerDay merges instances ({ processingDate, days }): segments of one instance add up, and for each date the
// instance with the newest processing date replaces the older ones.
export function newestPerDay(instances) {
  const byInstance = new Map();
  for (const i of instances) {
    const days = byInstance.get(i.processingDate) || {};
    for (const [date, day] of Object.entries(i.days)) addDay((days[date] ||= {}), day);
    byInstance.set(i.processingDate, days);
  }
  const merged = {};
  for (const date of [...byInstance.keys()].sort()) Object.assign(merged, byInstance.get(date));
  return merged;
}

// mergedDays gives an app's days for one report from every stored line, newer lines replacing a date (lines are
// appended in time order, so file order is processing order).
export function mergedDays(metrics, app, source = 'asc-analytics') {
  const days = {};
  for (const m of metrics) if (m.app === app && m.source === source && m.days) Object.assign(days, m.days);
  return days;
}

const sumOf = (days, key) => Object.values(days).reduce((n, d) => n + (d[key] || 0), 0);
function totalsOf(days, key) {
  const out = {};
  for (const d of Object.values(days)) for (const [k, n] of Object.entries(d[key] || {})) bump(out, k, n);
  return out;
}

// reportValues turns an app's merged days for one report into the values a metrics line carries. Totals come only from
// unique days, so a date Apple repeats in a later instance is counted once.
export function reportValues(source, days) {
  if (source === 'asc-analytics') return { downloads: sumOf(days, 'first'), redownloads: sumOf(days, 're'), sources: totalsOf(days, 'sources') };
  if (source === 'asc-discovery') return { impressions: sumOf(days, 'impressions'), pageViews: sumOf(days, 'pageViews'), pageViewSources: totalsOf(days, 'pageViewSources') };
  if (source === 'asc-downloads-detailed') return { downloadReferrers: totalsOf(days, 'referrers') };
  if (source === 'asc-discovery-detailed') return { pageViewReferrers: totalsOf(days, 'referrers') };
  return {};
}

// downloadsMismatch says when an app's newest downloads total disagrees with the sum of its unique days, as it did when
// pulls added a repeated date again (Füd showed 5 for 3).
export function downloadsMismatch(metrics, app) {
  const days = mergedDays(metrics, app);
  if (!Object.keys(days).length) return null;
  const shown = latest(metrics, app).downloads, unique = sumOf(days, 'first');
  return shown === unique ? null : { shown, unique };
}

// ---- files ----

function rootOf(args) {
  if (args.root) return args.root;
  const got = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (got.status !== 0) throw new Error('Run inside the app-sites checkout or pass --root');
  return got.stdout.trim();
}
const dirOf = root => join(root, 'marketing');
function loadProfiles(root) {
  const dir = join(dirOf(root), 'apps');
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}
function loadJsonl(path, label) {
  return existsSync(path) ? parseLines(readFileSync(path, 'utf8'), label) : { records: [], problems: [] };
}
const loadEvents = root => loadJsonl(join(dirOf(root), 'ledger.jsonl'), 'ledger').records;
const loadMetrics = root => loadJsonl(join(dirOf(root), 'metrics.jsonl'), 'metrics').records;
const loadPitchQueue = root => loadJsonl(join(dirOf(root), 'pitches.jsonl'), 'pitches');
const REGISTRY = '/Volumes/ssd/projects/app-shorts/registry.json';
const MAC_HOME = '/Volumes/ssd/projects/app-marketing';
function loadRegistry(args = {}) {
  const path = typeof args.registry === 'string' ? args.registry : REGISTRY;
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
}

// runnerOf reads the runner from an event, or from its run id (mkt-mac-..., mkt-cloud-...).
export const runnerOf = event => event.runner || /^mkt-(cloud|mac)-/.exec(event.run_id || '')?.[1];

// endProblems refuses an end that leaves due work undone: every item `next` still lists for the runner was neither
// done nor logged with an allowed blocker in this run (James, 2026-11-10 and 2026-11-12).
export function endProblems(event, profiles, events, { now = Date.now(), registry } = {}) {
  if (event.event !== 'end' || Date.parse(event.ts) < AUTONOMY_FROM) return [];
  const runner = runnerOf(event);
  if (!runner) return [];
  // The Mac pass ends twice: its core stage (mkt-mac-...) before Shorts are made, and the Shorts stage
  // (mkt-mac-shorts-...), so a slow or failed Short never holds up the rest. Each answers for its own items.
  const shortsStage = /^mkt-mac-shorts-/.test(event.run_id || '');
  const due = rank(profiles, events, { runner, now, registry })
    .filter(i => runner !== 'mac' || (i.channel === 'youtube-shorts') === shortsStage);
  return due.length ? [`end leaves ${due.length} due ${runner} item(s) undone: ${due.map(i => `${i.app}/${i.id}`).join(', ')}. Do each, or log it as an action with blocked_by`] : [];
}

// appendEvent stamps, validates and appends one event.
export function appendEvent(root, input, { registry } = {}) {
  const event = { v: 1, ts: new Date().toISOString(), skill: 'app-marketing', ...input };
  const problems = eventProblems(event);
  if (event.event === 'end') problems.push(...endProblems(event, loadProfiles(root), loadEvents(root), { now: Date.parse(event.ts), registry }));
  if (problems.length) throw new Error('Not logged: ' + problems.join('; '));
  appendFileSync(join(dirOf(root), 'ledger.jsonl'), JSON.stringify(event) + '\n');
  return event;
}

// ---- commands ----

async function cmdCheck(root) {
  const problems = [];
  const profiles = loadProfiles(root);
  profiles.forEach(p => problems.push(...profileProblems(p)));
  // The pitch queue is checked with the site's own rules (packages/pitches/rules.mjs), the ones the sender applies.
  const queue = loadPitchQueue(root);
  problems.push(...queue.problems);
  const rules = join(root, 'packages/pitches/rules.mjs');
  if (queue.records.length && existsSync(rules)) {
    const { validateQueue } = await import(pathToFileURL(rules).href);
    problems.push(...validateQueue(queue.records.map((r, i) => ({ line: i + 1, ...r })), profiles).map(p => `pitches.jsonl ${p}`));
  }
  const ledger = loadJsonl(join(dirOf(root), 'ledger.jsonl'), 'ledger');
  problems.push(...ledger.problems);
  const corrected = correctedLines(ledger.records);
  problems.push(...corrected.problems);
  ledger.records.forEach((e, i) => { if (!corrected.fixed.has(i)) eventProblems(e).forEach(p => problems.push(`ledger line ${i + 1}: ${p}`)); });
  const ids = new Set(profiles.map(p => p.id));
  ledger.records.forEach((e, i) => { if (e.app && e.app !== 'all' && !ids.has(e.app)) problems.push(`ledger line ${i + 1}: unknown app ${e.app}`); });
  const metrics = loadJsonl(join(dirOf(root), 'metrics.jsonl'), 'metrics');
  problems.push(...metrics.problems);
  metrics.records.forEach((m, i) => { if (!m.at || !m.app || !m.source) problems.push(`metrics line ${i + 1}: needs at, app and source`); });
  for (const p of profiles) {
    const off = downloadsMismatch(metrics.records, p.id);
    if (off) problems.push(`${p.id}: downloads shows ${off.shown} but its unique days add up to ${off.unique}; run pull --recount --write on the Mac`);
  }
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`ok: ${profiles.length} apps, ${ledger.records.length} events, ${metrics.records.length} snapshots, ${queue.records.length} pitch queue lines`);
}

// latest merges an app's newest value of every metric, newest snapshot winning.
export function latest(metrics, app) {
  const merged = {};
  for (const m of metrics.filter(x => x.app === app)) Object.assign(merged, m.values);
  return merged;
}

function summary(profiles, events, metrics, registry) {
  return profiles.map(p => {
    const states = p.backlog.map(i => ({ ...i, ...itemState(i, events, p.id, Date.now(), episodesFor(registry, p)) }));
    const count = s => states.filter(i => i.state === s).length;
    return { id: p.id, name: p.name, stage: p.stage, numbers: latest(metrics, p.id), done: count('done') + count('resting'), open: count('open'), parked: count('parked'), states };
  });
}

function cmdStatus(root, args) {
  const events = loadEvents(root);
  for (const app of summary(loadProfiles(root), events, loadMetrics(root), loadRegistry(args))) {
    console.log(`${app.name} (${app.stage}): ${app.done} done, ${app.open} open, ${app.parked} parked`);
    console.log('  numbers: ' + (JSON.stringify(app.numbers) === '{}' ? 'none yet' : JSON.stringify(app.numbers)));
  }
  const last = events[events.length - 1];
  console.log('last event: ' + (last ? `${last.ts} ${last.run_id} ${last.event} ${last.status}` : 'none'));
}

function cmdNext(root, args) {
  const items = rank(loadProfiles(root), loadEvents(root), { runner: args.runner, registry: loadRegistry(args) }).slice(0, Number(args.limit) || Infinity);
  if (args.json) return console.log(JSON.stringify(items, null, 2));
  items.forEach(i => console.log(`${String(i.score).padStart(6)}  ${i.app}/${i.id} [${i.runner}, ${i.channel}]  ${i.title}`));
  if (!items.length) console.log('Nothing open for this runner: add ideas to a profile\'s backlog.');
}

function cmdLog(root, file, args) {
  const text = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
  const event = appendEvent(root, JSON.parse(text), { registry: loadRegistry(args) });
  console.log(`logged ${event.event} ${event.status} ${event.item || ''}`.trim());
}

async function cmdPublic(root, args) {
  const profiles = loadProfiles(root);
  const out = [];
  for (const p of profiles.filter(x => x.appStoreId)) {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${p.appStoreId}&country=us&t=${Date.now()}`);
    if (!res.ok) throw new Error(`Apple's lookup returned ${res.status} for ${p.id}`);
    const hit = (await res.json()).results[0];
    const values = hit
      ? { live: true, version: hit.version, price: hit.price, ratingCount: hit.userRatingCount || 0, rating: hit.averageUserRating || 0, storeName: hit.trackName }
      : { live: false };
    out.push({ at: new Date().toISOString(), app: p.id, source: 'itunes-lookup', values });
    if (args.write && hit && p.stage === 'prelaunch') {
      p.stage = 'live';
      writeFileSync(join(dirOf(root), 'apps', `${p.id}.json`), JSON.stringify(p, null, 2) + '\n');
    }
  }
  if (args.write) out.forEach(m => appendFileSync(join(dirOf(root), 'metrics.jsonl'), JSON.stringify(m) + '\n'));
  console.log(JSON.stringify(out, null, 1));
}

// youtubeSnapshots turns `shorts.mjs views` into one metrics line per app with a profile. Views count public Shorts
// only, so a pulled or superseded Short never adds to an app's total.
export function youtubeSnapshots(registry, profiles, at = new Date().toISOString()) {
  return views(registry, { profiles }).filter(v => v.marketingId)
    .map(v => ({ at, app: v.marketingId, source: 'youtube', values: { shortsViews: v.shortsViews, publicShorts: v.publicShorts, scheduledShorts: v.scheduledShorts } }));
}

function cmdYoutube(root, args) {
  const registry = loadRegistry(args);
  if (!registry) throw new Error('No app-shorts registry on this machine (pass --registry PATH)');
  const lines = youtubeSnapshots(registry, loadProfiles(root));
  if (args.write) lines.forEach(m => appendFileSync(join(dirOf(root), 'metrics.jsonl'), JSON.stringify(m) + '\n'));
  console.log(JSON.stringify(lines, null, 1));
}

// ---- App Store Connect (Mac only: the key never leaves 1Password and this process) ----

function vaultEnv() {
  const raw = readFileSync('/Volumes/ssd/1password-token.md', 'utf8');
  const token = raw.match(/ops_[A-Za-z0-9_-]+/)?.[0];
  if (!token) throw new Error('The documented token file holds no service-account token');
  return { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token };
}
function opField(ref, field) {
  const got = spawnSync('op', ['read', `${ref.replace(/\/$/, '')}/${field}`], { env: vaultEnv(), encoding: 'utf8' });
  if (got.status !== 0) throw new Error(`op read failed for ${ref}/${field}`);
  return got.stdout.trim();
}
function ascToken(ref) {
  const body = opField(ref, 'credential').replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const pem = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`;
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: opField(ref, 'key id'), typ: 'JWT' });
  const claims = b64({ iss: opField(ref, 'issuer id'), iat: now, exp: now + 1100, aud: 'appstoreconnect-v1' });
  const signature = sign('sha256', Buffer.from(`${head}.${claims}`), { key: createPrivateKey(pem), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${claims}.${signature}`;
}
function ascClient(ref) {
  const token = ascToken(ref);
  return async (path, method = 'GET', body) => {
    const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if (!res.ok) { const err = new Error(`${method} ${path.split('?')[0]} returned ${res.status}: ${text.slice(0, 300)}`); err.status = res.status; throw err; }
    return text ? JSON.parse(text) : {};
  };
}

// analyticsRequest finds the app's ongoing report request, creating it the first time. Apple starts producing reports
// a day or two after the request exists, and only for the days after it.
async function analyticsRequest(api, appId) {
  const existing = (await api(`/v1/apps/${appId}/analyticsReportRequests?limit=20`)).data || [];
  const ongoing = existing.find(r => r.attributes.accessType === 'ONGOING' && !r.attributes.stoppedDueToInactivity);
  if (ongoing) return { id: ongoing.id, created: false };
  const made = await api('/v1/analyticsReportRequests', 'POST', { data: { type: 'analyticsReportRequests', attributes: { accessType: 'ONGOING' }, relationships: { app: { data: { type: 'apps', id: appId } } } } });
  return { id: made.data.id, created: true };
}

// processedThrough is the newest report instance already stored for an app and report. Instances are compared by their
// own processing date, never by the days inside them. Lines written before this field fall back to their throughDay.
export function processedThrough(metrics, app, source = 'asc-analytics') {
  return metrics.filter(m => m.app === app && m.source === source).map(m => m.processedThrough ?? m.throughDay).filter(Boolean).sort().pop();
}

// reportInstances downloads a report's daily instances processed after `processedAfter` (every instance Apple still
// holds when it is undefined), each read into days. `none` says why there is nothing.
async function reportInstances(api, requestId, spec, processedAfter) {
  const reports = (await api(`/v1/analyticsReportRequests/${requestId}/reports?filter[name]=${encodeURIComponent(spec.name)}&limit=5`)).data || [];
  if (!reports.length) return { instances: [], none: 'not offered for this app yet' };
  const all = [];
  let next = `/v1/analyticsReports/${reports[0].id}/instances?filter[granularity]=DAILY&limit=200`;
  while (next) {
    const page = await api(next);
    all.push(...(page.data || []));
    next = page.links?.next ? page.links.next.replace('https://api.appstoreconnect.apple.com', '') : null;
  }
  if (!all.length) return { instances: [], none: spec.name.endsWith('Detailed') ? 'no instances (a new request, or Apple withholds Detailed rows under its privacy threshold)' : 'no instances yet' };
  const fresh = all.filter(i => !processedAfter || i.attributes.processingDate > processedAfter);
  const instances = [];
  for (const instance of fresh) {
    const segments = (await api(`/v1/analyticsReportInstances/${instance.id}/segments?limit=50`)).data || [];
    for (const segment of segments) {
      const res = await fetch(segment.attributes.url);
      if (!res.ok) throw new Error(`${spec.name} segment download returned ${res.status}`);
      instances.push({ processingDate: instance.attributes.processingDate, days: spec.read(gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8')).days });
    }
    if (!segments.length) instances.push({ processingDate: instance.attributes.processingDate, days: {} });
  }
  return { instances, none: fresh.length ? null : 'no new instance since the last pull' };
}

async function cmdPull(root, args) {
  const profiles = loadProfiles(root).filter(p => p.appStoreId && p.ascVault && p.stage === 'live');
  const metrics = loadMetrics(root);
  for (const p of profiles) {
    const api = ascClient(p.ascVault);
    const request = await analyticsRequest(api, p.appStoreId);
    if (request.created) console.log(`${p.id}: analytics report request created; Apple's first reports take a day or two`);
    for (const spec of REPORTS) {
      const before = reportValues(spec.source, mergedDays(metrics, p.id, spec.source));
      const { instances, none } = await reportInstances(api, request.id, spec, args.recount ? undefined : processedThrough(metrics, p.id, spec.source));
      if (!instances.length) { console.log(`${p.id}: ${spec.name}: ${none}`); continue; }
      const days = newestPerDay(instances);
      const line = { at: new Date().toISOString(), app: p.id, source: spec.source, report: spec.name, throughDay: Object.keys(days).sort().pop(),
        processedThrough: instances.map(i => i.processingDate).sort().pop(), days };
      if (args.recount) line.recount = true;
      line.values = reportValues(spec.source, mergedDays([...metrics, line], p.id, spec.source));
      if (spec.source === 'asc-analytics') line.values.downloadsAdded = line.values.downloads - (before.downloads || 0);
      metrics.push(line);
      if (args.write) appendFileSync(join(dirOf(root), 'metrics.jsonl'), JSON.stringify(line) + '\n');
      console.log(JSON.stringify({ app: p.id, report: spec.name, throughDay: line.throughDay, ...line.values }));
    }
  }
}

// cmdPromo changes promotional text on the live version and on any version on its way, which would otherwise bring its
// own older text with it when it ships. Apple allows this at any time, without review. A version Apple refuses is
// reported, not fatal, so long as the live one took the change.
async function cmdPromo(root, args) {
  const p = loadProfiles(root).find(x => x.id === args.app);
  if (!p) throw new Error(`Unknown app ${args.app}`);
  if (!args.text || args.text.length > 170) throw new Error('Promotional text must be 1 to 170 characters');
  if (!args.confirm) return console.log(`Would set ${p.id}: ${args.text}\nAdd --confirm to write it.`);
  const api = ascClient(p.ascVault);
  const versions = ((await api(`/v1/apps/${p.appStoreId}/appStoreVersions?filter[platform]=IOS&limit=5`)).data || [])
    .filter(v => PROMO_STATES.includes(v.attributes.appVersionState || v.attributes.appStoreState));
  const results = [];
  for (const version of versions) {
    const row = { version: version.attributes.versionString, state: version.attributes.appVersionState || version.attributes.appStoreState };
    try {
      const locs = (await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data || [];
      const en = locs.find(l => l.attributes.locale === 'en-US');
      if (!en) throw new Error('no en-US localization');
      row.before = en.attributes.promotionalText;
      await api(`/v1/appStoreVersionLocalizations/${en.id}`, 'PATCH', { data: { type: 'appStoreVersionLocalizations', id: en.id, attributes: { promotionalText: args.text } } });
      row.after = (await api(`/v1/appStoreVersionLocalizations/${en.id}`)).data.attributes.promotionalText;
      row.ok = row.after === args.text;
    } catch (error) { row.ok = false; row.error = error.message.slice(0, 200); }
    results.push(row);
  }
  console.log(JSON.stringify({ app: p.id, results }, null, 1));
  if (!results.some(r => r.ok && r.state === 'READY_FOR_DISTRIBUTION')) process.exit(1);
}

// ---- learn: every channel is judged on downloads (SKILL.md, Learn) ----

const dateOf = ms => new Date(ms).toISOString().slice(0, 10);
const plusDays = (date, n) => dateOf(Date.parse(`${date}T00:00:00Z`) + n * DAY);
const SHORT_HOURS = 72;      // a Short is read on the 72 hours after it goes public
const BURST_DAYS = 7;        // Shorts for one app inside each other's 72 hours are one result, at most a week long
const BASELINE_DAYS = 7;     // against the 7 days before
const GUIDE_MATURE_DAYS = 56; // guides are judged from 8 weeks after the app's first one, in 4-week blocks
const GUIDE_BLOCK_DAYS = 28;
const STORE_DAYS = 7;        // a store text change: the 7 days after it against the 7 before

// lifted is the download effect test every channel shares: at least 2 more downloads than expected, and at least
// half again as many.
export const lifted = (after, expected) => after - expected >= Math.max(2, expected / 2);

// searchBrowse is a day's first-time downloads from App Store search and browse. Days stored before per-day sources
// existed only have a total; those count in full and the result says so.
function searchBrowse(day) {
  if (!day) return { n: 0, whole: false };
  if (!day.sources) return { n: day.first || 0, whole: Boolean(day.first) };
  return { n: (day.sources['App Store search'] || 0) + (day.sources['App Store browse'] || 0), whole: false };
}
function span(days, from, to, pick) {
  let n = 0, whole = false, count = 0;
  for (let d = from; d < to; d = plusDays(d, 1)) { const got = pick(days[d]); n += got.n; whole ||= got.whole; count += 1; }
  return { n, whole, count };
}
const referrals = (refDays, from, to, test) => {
  let n = 0;
  for (const [date, day] of Object.entries(refDays || {})) if (date >= from && date < to) for (const [k, v] of Object.entries(day.referrers || {})) if (test(k)) n += v;
  return n;
};
const round1 = n => Math.round(n * 10) / 10;

// shortsResults reads each Short (or burst of Shorts) on the app's search and browse first-time downloads in the 72
// hours after it went public against the 7 days before. A YouTube referrer download in the window is an effect too.
export function shortsResults(episodes, days, refDays = {}, now = Date.now()) {
  const dates = Object.keys(days).sort();
  if (!dates.length) return [];
  const first = dates[0], through = dates[dates.length - 1];
  const shown = episodes.map(e => {
    const at = Date.parse(e.postedAt || e.publishAt || '');
    const gone = e.pulledAt ? Date.parse(e.pulledAt) : now;
    return Number.isNaN(at) || at > Math.min(gone, now) ? null : { id: e.id, at };
  }).filter(Boolean).sort((a, b) => a.at - b.at);
  const bursts = [];
  for (const short of shown) {
    const open = bursts[bursts.length - 1];
    if (open && short.at < open.lastAt + SHORT_HOURS * 3600000 && short.at < open.startAt + BURST_DAYS * DAY) { open.ids.push(short.id); open.lastAt = short.at; }
    else bursts.push({ ids: [short.id], startAt: short.at, lastAt: short.at });
  }
  return bursts.map(b => {
    const start = dateOf(b.startAt), end = plusDays(dateOf(b.lastAt), SHORT_HOURS / 24);
    const base = span(days, start > first ? (plusDays(start, -BASELINE_DAYS) > first ? plusDays(start, -BASELINE_DAYS) : first) : start, start, searchBrowse);
    const result = { shorts: b.ids, start, end, mature: through >= plusDays(end, -1) };
    if (base.count < 3) return { ...result, judged: false, why: 'fewer than 3 days of downloads before it' };
    if (!result.mature) return { ...result, judged: false, why: `its window closes ${end}; data runs to ${through}` };
    const after = span(days, start, end, searchBrowse);
    const expected = base.n / base.count * after.count;
    const youtube = referrals(refDays, start, end, k => /youtube/i.test(k));
    return { ...result, judged: true, after: after.n, expected: round1(expected), youtube, effect: youtube > 0 || lifted(after.n, expected),
      basis: after.whole || base.whole ? 'some days count all first-time downloads (no per-day sources stored)' : 'App Store search and browse' };
  });
}

// guideResults reads guides and site pages on web-referrer first-time downloads, in 4-week blocks from 8 weeks after
// the app's first guide. Any web-referrer download in a block is an effect.
export function guideResults(firstGuide, days, refDays = {}) {
  const dates = Object.keys(days).sort();
  if (!firstGuide || !dates.length) return [];
  const through = dates[dates.length - 1], out = [];
  for (let start = plusDays(firstGuide.slice(0, 10), GUIDE_MATURE_DAYS); plusDays(start, GUIDE_BLOCK_DAYS - 1) <= through; start = plusDays(start, GUIDE_BLOCK_DAYS)) {
    const end = plusDays(start, GUIDE_BLOCK_DAYS);
    const web = span(days, start, end, d => ({ n: d?.sources?.['Web referrer'] || 0, whole: false })).n;
    const named = referrals(refDays, start, end, k => k.startsWith('Web referrer'));
    out.push({ start, end, judged: true, web: Math.max(web, named), effect: Math.max(web, named) > 0 });
  }
  return out;
}

// storeResults reads each store text change (an `ok` action with `changed`) on the app's search and browse
// first-time downloads in the 7 days after it against the 7 before, with impressions and page views for context.
export function storeResults(changes, days, discovery = {}) {
  const all = [...Object.keys(days), ...Object.keys(discovery)].sort();
  const through = all[all.length - 1];
  return changes.map(c => {
    const at = c.ts.slice(0, 10), start = plusDays(at, 1), end = plusDays(start, STORE_DAYS);
    const result = { item: c.item, changed: c.changed, at, mature: Boolean(through) && through >= plusDays(end, -1) };
    if (!result.mature) return { ...result, judged: false, why: `its window closes ${end}` };
    const sum = (from, to) => ({
      downloads: span(days, from, to, searchBrowse).n,
      impressions: span(discovery, from, to, d => ({ n: d?.impressions || 0 })).n,
      pageViews: span(discovery, from, to, d => ({ n: d?.pageViews || 0 })).n
    });
    const before = sum(plusDays(at, -STORE_DAYS), at), after = sum(start, end);
    return { ...result, judged: true, before, after, effect: lifted(after.downloads, before.downloads) };
  });
}

// killVerdict: three mature results in a row with no download effect stop the work (James's rule as the skill applies
// it, 2026-11-12: the effort moves to what brings downloads).
export function killVerdict(results) {
  const judged = results.filter(r => r.judged);
  const lastThree = judged.slice(-3);
  const label = r => r.web !== undefined ? `${r.start}: ${r.web} web-referrer downloads`
    : r.before ? `${r.at}: ${r.after.downloads} search+browse downloads vs ${r.before.downloads} the week before`
    : `${r.start}: ${r.after} search+browse downloads vs ${r.expected} expected`;
  if (lastThree.length === 3 && lastThree.every(r => !r.effect)) return { verdict: 'stop', evidence: lastThree.map(label).join('; ') };
  return { verdict: judged.some(r => r.effect) ? 'working' : 'keep', judged: judged.length };
}

// funnel compares the last 7 days with the 7 before: impressions, product page views and search and browse downloads.
export function funnel(days, discovery = {}) {
  const all = [...Object.keys(days), ...Object.keys(discovery)].sort();
  if (!all.length) return null;
  const end = plusDays(all[all.length - 1], 1);
  const week = (from, to) => ({ impressions: span(discovery, from, to, d => ({ n: d?.impressions || 0 })).n,
    pageViews: span(discovery, from, to, d => ({ n: d?.pageViews || 0 })).n, downloads: span(days, from, to, searchBrowse).n,
    web: span(days, from, to, d => ({ n: d?.sources?.['Web referrer'] || 0 })).n });
  return { through: plusDays(end, -1), last7: week(plusDays(end, -7), end), previous7: week(plusDays(end, -14), plusDays(end, -7)) };
}

// ---- the App Store funnel: which listing stage is weakest (references/channels.md, "The App Store funnel") ----
// Published reference rates, cited in channels.md. Page views count only App Store search and browse, because
// impressions happen only there: a visit from a website, another app or an unknown source has no impression.
export const FUNNEL_REF = {
  tapThrough: { low: 0.06, high: 0.12 },   // impression to page view: Adapty, 6 to 12%
  conversion: { low: 0.086, high: 0.27 },  // page view to first-time download: AppTweak US 2025 8.56%; Adapty 25 to 27%
  installRate: 0.038,                      // impression to download: AppTweak US 2025 3.8%; Adapty 3.6 to 3.8%
  minImpressions: 100,                     // fewer and the 6% floor predicts under 6 page views: too small to judge
  minPageViews: 20,                        // fewer and the 25% average predicts under 5 downloads: too small to judge
  windowDays: 14
};
const STORE_SOURCES = ['App Store search', 'App Store browse'];
const storeViews = d => STORE_SOURCES.reduce((n, s) => n + (d?.pageViewSources?.[s] || 0), 0);
const pct = r => r === null ? 'n/a' : `${round1(r * 100)}%`;

// The next listing change for each weak stage, and when it can be live (one change per stage, so its effect reads).
export const STAGE_NEXT = {
  impressions: { field: 'keywords', live: 'next version',
    change: 'Keywords: spend all 100 characters on searched terms the name and subtitle do not already carry (also check the category)' },
  'tap-through': { field: 'subtitle', live: 'next version',
    change: 'Subtitle: say the one reason to tap, as search shows it beside the icon and first screenshot (then the first screenshot caption)' },
  conversion: { field: 'promotionalText', live: 'today',
    change: 'Promotional text, live today through `promo`; then the description opening and screenshot order for the next version' }
};

// funnelTotals sums a span of days: impressions, page views (all, and App Store search and browse only) and search
// and browse first-time downloads.
function funnelTotals(days, discovery, from, to) {
  const t = { impressions: 0, pageViews: 0, storePageViews: 0, downloads: 0 };
  for (let d = from; d <= to; d = plusDays(d, 1)) {
    t.impressions += discovery[d]?.impressions || 0;
    t.pageViews += discovery[d]?.pageViews || 0;
    t.storePageViews += storeViews(discovery[d]);
    t.downloads += searchBrowse(days[d]).n;
  }
  return t;
}
const rates = t => ({
  tapThrough: t.impressions ? t.storePageViews / t.impressions : null,
  conversion: t.storePageViews ? t.downloads / t.storePageViews : null,
  installRate: t.impressions ? t.downloads / t.impressions : null
});

// funnelStage reads up to 14 days that both the downloads and the discovery report cover, and names the weakest
// stage. Too few impressions to judge, or every judged stage in range, means reach is what limits.
export function funnelStage(days, discovery, ref = FUNNEL_REF) {
  const v = Object.keys(discovery).sort(), dl = Object.keys(days).sort();
  if (!v.length) return null;
  let from = dl.length ? (dl[0] > v[0] ? dl[0] : v[0]) : v[0];
  const to = dl.length ? (dl[dl.length - 1] < v[v.length - 1] ? dl[dl.length - 1] : v[v.length - 1]) : v[v.length - 1];
  if (from > to) return { from: v[0], to: v[v.length - 1], stage: 'impressions', why: 'the downloads and discovery reports share no day yet', next: STAGE_NEXT.impressions };
  if (plusDays(to, 1 - ref.windowDays) > from) from = plusDays(to, 1 - ref.windowDays);
  const t = funnelTotals(days, discovery, from, to), r = rates(t);
  const judged = { tapThrough: t.impressions >= ref.minImpressions, conversion: t.storePageViews >= ref.minPageViews };
  const out = { from, to, ...t, otherPageViews: t.pageViews - t.storePageViews, ...r, judged };
  let stage, why;
  if (!judged.tapThrough) [stage, why] = ['impressions', `${t.impressions} impressions in ${from} to ${to}: too few to judge tap-through or conversion`];
  else if (r.tapThrough < ref.tapThrough.low) [stage, why] = ['tap-through', `tap-through ${pct(r.tapThrough)} is under the ${pct(ref.tapThrough.low)} floor`];
  else if (judged.conversion && r.conversion < ref.conversion.low) [stage, why] = ['conversion', `conversion ${pct(r.conversion)} is under the ${pct(ref.conversion.low)} floor`];
  else [stage, why] = ['impressions', `tap-through ${pct(r.tapThrough)} is in range and conversion ${judged.conversion ? `${pct(r.conversion)} is in range` : 'is too small to judge'}, so reach limits`];
  return { ...out, stage, why, next: STAGE_NEXT[stage] };
}

// liveDate is when a listing test went live: its own `live` date, or the first public lookup that shows its version.
function liveDate(test, lookups) {
  if (test.live) return test.live.slice(0, 10);
  // version 'next' is whichever version follows the one live when it was prepared (before.listing.version).
  const shipped = v => test.version === 'next' ? v && v !== test.before?.listing?.version : v === test.version;
  const seen = lookups.find(m => m.at?.slice(0, 10) >= String(test.prepared).slice(0, 10) && shipped(m.values?.version));
  return seen ? seen.at.slice(0, 10) : null;
}

// listingTestResults reads each listing test in the profile's `listingTests` on its own stage: the 7 days after it
// went live against the 7 before, readable from 8 days after (14 for a fuller read). An effect is the stage's count
// lifting by the shared rule: at least 2 more and half again as many, at a better rate.
export function listingTestResults(tests = [], days, discovery, lookups = []) {
  const all = [...Object.keys(days), ...Object.keys(discovery)].sort(), through = all[all.length - 1];
  return tests.map(test => {
    const live = liveDate(test, lookups);
    const base = { stage: test.stage, field: test.field, prepared: test.prepared, version: test.version || null, live };
    if (!live) return { ...base, judged: false, why: `waiting for version ${test.version} to go live` };
    const firstRead = plusDays(live, STORE_DAYS + 1);
    if (!through || through < plusDays(live, STORE_DAYS)) return { ...base, firstRead, judged: false, why: `first read ${firstRead}` };
    const before = funnelTotals(days, discovery, plusDays(live, -STORE_DAYS), plusDays(live, -1));
    const after = funnelTotals(days, discovery, plusDays(live, 1), plusDays(live, STORE_DAYS));
    const [rb, ra] = [rates(before), rates(after)];
    const effect = test.stage === 'impressions' ? lifted(after.impressions, before.impressions)
      : test.stage === 'tap-through' ? lifted(after.storePageViews, before.storePageViews) && ra.tapThrough > (rb.tapThrough || 0)
      : lifted(after.downloads, before.downloads) && ra.conversion > (rb.conversion || 0);
    return { ...base, firstRead, judged: true, before, after, effect };
  });
}

// funnelItem is the backlog item for the weak stage: the next listing change to try, scored first among listing work.
// It comes back daily, because learn re-reads the stage every run and a queued test can wait for its version.
export function funnelItem(f) {
  return { id: `funnel-${f.stage}`, title: `Funnel: lift ${f.stage} (${f.next.field})`, channel: 'app-store', runner: 'mac', impact: 5, effort: 2, repeat_days: 1,
    how: `learn names ${f.stage} the weakest stage (${f.why}, ${f.from} to ${f.to}). ${f.next.change}. Live ${f.next.live}. One change per stage; record it in listingTests with the before snapshot.` };
}

// rescoreFunnel puts the weak stage's item in the backlog at impact 5 and drops other stages' funnel items to 2.
export function rescoreFunnel(profile, f) {
  const item = funnelItem(f), backlog = (profile.backlog || []).map(b => b.id?.startsWith('funnel-') && b.id !== item.id ? { ...b, impact: 2 } : b);
  const at = backlog.findIndex(b => b.id === item.id);
  if (at >= 0) backlog[at] = { ...backlog[at], ...item }; else backlog.push(item);
  return { ...profile, backlog };
}

export function learnApp(profile, events, metrics, registry, now = Date.now(), pitchQueue = []) {
  const days = mergedDays(metrics, profile.id), refDays = mergedDays(metrics, profile.id, 'asc-downloads-detailed');
  const discovery = mergedDays(metrics, profile.id, 'asc-discovery');
  const mine = events.filter(e => e.event === 'action' && e.app === profile.id && e.status === 'ok');
  const shorts = shortsResults(episodesFor(registry, profile)?.episodes || [], days, refDays, now);
  const guides = guideResults(mine.find(e => e.channel === 'seo')?.ts, days, refDays);
  const changes = storeResults(mine.filter(e => e.channel === 'app-store' && e.changed), days, discovery);
  const byItem = {};
  for (const c of changes) (byItem[c.item] ||= []).push(c);
  const directories = guideResults(mine.find(e => e.channel === 'directories')?.ts, days, refDays);
  const coverage = coverageResults(pitchQueue.filter(r => r.type === 'outcome' && r.kind === 'coverage' && pitchApp(pitchQueue, r.pitch) === profile.id), days);
  const verdicts = { 'youtube-shorts': killVerdict(shorts), seo: killVerdict(guides), directories: killVerdict(directories), pitches: killVerdict(coverage) };
  for (const [item, list] of Object.entries(byItem)) verdicts[item] = killVerdict(list);
  const lookups = metrics.filter(m => m.app === profile.id && m.source === 'itunes-lookup');
  return { app: profile.id, funnel: funnel(days, discovery), stage: funnelStage(days, discovery),
    listingTests: listingTestResults(profile.listingTests, days, discovery, lookups), referrers: totalsOf(refDays, 'referrers'), shorts, guides, directories, coverage, store: changes, verdicts,
    shortsRead: registry ? 'registry read' : 'no registry on this machine: Shorts not judged' };
}

function cmdLearn(root, args) {
  const profiles = loadProfiles(root).filter(p => !args.app || p.id === args.app);
  const events = loadEvents(root), metrics = loadMetrics(root), registry = loadRegistry(args);
  const queue = loadPitchQueue(root).records;
  const out = profiles.map(p => learnApp(p, events, metrics, registry, Date.now(), queue));
  const approaches = approachResults(queue, latestPitches(metrics));
  for (const r of out) {
    // The weak stage's next listing change goes into the backlog first among listing work.
    const i = profiles.findIndex(x => x.id === r.app);
    if (r.stage && args.write) {
      profiles[i] = rescoreFunnel(profiles[i], r.stage);
      writeFileSync(join(dirOf(root), 'apps', `${r.app}.json`), JSON.stringify(profiles[i], null, 2) + '\n');
    }
    const p = profiles[i];
    for (const [key, v] of Object.entries(r.verdicts)) {
      if (v.verdict !== 'stop' || p.stopped?.[key]) continue;
      r.newStops = [...(r.newStops || []), key];
      if (args.write) {
        p.stopped = { ...(p.stopped || {}), [key]: { since: dateOf(Date.now()), evidence: v.evidence } };
        writeFileSync(join(dirOf(root), 'apps', `${p.id}.json`), JSON.stringify(p, null, 2) + '\n');
      }
    }
  }
  // A pitch approach with 30 sent first emails and no positive reply is retired (references/pitches.md, "Learn").
  for (const a of approaches.filter(x => x.verdict === 'retire')) {
    a.evidence = `${a.sent} first emails sent, ${a.replies} replied, ${a.positive} positive, ${a.optOuts} opted out, ${a.visits} page visits`;
    if (args.write) appendFileSync(join(dirOf(root), 'pitches.jsonl'), JSON.stringify({ type: 'retire', ts: new Date().toISOString(), run_id: args.run || 'learn', approach: a.approach, evidence: a.evidence }) + '\n');
  }
  if (args.json) return console.log(JSON.stringify({ apps: out, approaches }, null, 2));
  for (const a of approaches) {
    console.log(`pitch approach ${a.approach}: ${a.verdict} (${a.sent} sent, ${a.replies} replied, ${a.positive} positive, ${a.optOuts} opted out, ${a.visits} visits)${a.verdict === 'retire' ? (args.write ? ': retired in pitches.jsonl; write a different approach' : ': rerun with --write to retire it') : ''}`);
  }
  for (const r of out) {
    const f = r.funnel;
    console.log(`${r.app}: ${f ? `last 7 days to ${f.through}: ${f.last7.impressions} impressions, ${f.last7.pageViews} page views, ${f.last7.downloads} search+browse downloads, ${f.last7.web} web-referrer (week before: ${f.previous7.impressions}, ${f.previous7.pageViews}, ${f.previous7.downloads}, ${f.previous7.web})` : 'no Apple numbers yet'}`);
    const s = r.stage;
    console.log(`  funnel ${s ? `${s.from} to ${s.to}: weakest ${s.stage} (${s.why}); tap-through ${s.judged ? pct(s.tapThrough) : 'n/a'}, conversion ${s.judged?.conversion ? pct(s.conversion) : `${s.judged ? pct(s.conversion) : 'n/a'} (too small to judge)`}; next: ${s.next.change}, live ${s.next.live}` : 'no discovery numbers yet'}`);
    for (const t of r.listingTests) console.log(`  listing test ${t.stage}/${t.field}${t.version ? ` ${t.version}` : ''}: ${t.judged ? (t.effect ? 'effect' : 'no effect') : t.why}`);
    for (const [key, v] of Object.entries(r.verdicts)) console.log(`  ${key}: ${v.verdict}${v.evidence ? ` (${v.evidence})` : ` (${v.judged} judged)`}`);
    if (r.newStops) console.log(`  STOP ${r.newStops.join(', ')}${args.write ? ': written to the profile' : ': rerun with --write to record it in the profile'}`);
  }
}

// ---- pitch emails (references/pitches.md) ----
// The queue is marketing/pitches.jsonl (approaches, pitches, answers, outcomes, retirements), checked by the site's
// own rules. What was sent and what came back lives in the site's database; `pitches --write` keeps a snapshot of it in
// metrics.jsonl (states, reply kinds and visit counts; never text or addresses) for `learn`.

export const PITCHES_URL = 'https://astrojams-apps.vercel.app/api/pitches';
const RETIRE_AFTER = 30;   // first emails in one approach with no positive reply (the owner's kill rule, 2026-11-12)
const COVERAGE_DAYS = 7;   // coverage is read on the 7 days after it against the 7 before

const pitchApp = (queue, id) => queue.find(r => r.type === 'pitch' && r.id === id)?.app;

// latestPitches is the newest snapshot of every pitch, from the `pitches` lines in metrics.jsonl.
export function latestPitches(metrics) {
  const byId = new Map();
  for (const m of metrics.filter(x => x.source === 'pitches')) for (const p of m.pitches || []) byId.set(p.id, p);
  return [...byId.values()];
}

// approachResults judges each approach across every app: first emails sent, pitches with a real reply, positive
// outcomes (a run's `positive` or `coverage` outcome line), opt-outs and visits. 30 sent with none positive retires it.
export function approachResults(queue, snapshot = []) {
  const state = new Map(snapshot.map(p => [p.id, p]));
  const out = new Map();
  const get = id => out.get(id) || out.set(id, { approach: id, sent: 0, replies: 0, positive: 0, optOuts: 0, visits: 0, retired: false }).get(id);
  for (const a of queue.filter(r => r.type === 'approach')) get(a.id);
  const good = new Set(queue.filter(r => r.type === 'outcome' && ['positive', 'coverage'].includes(r.kind)).map(r => r.pitch));
  for (const p of queue.filter(r => r.type === 'pitch')) {
    const a = get(p.approach), s = state.get(p.id);
    if (s?.first?.status === 'sent') a.sent += 1;
    if ((s?.replies || []).some(r => r.kind === 'other')) a.replies += 1;
    if ((s?.replies || []).some(r => r.kind === 'no')) a.optOuts += 1;
    if (good.has(p.id)) a.positive += 1;
    a.visits += s?.visits || 0;
  }
  for (const r of queue.filter(x => x.type === 'retire')) get(r.approach).retired = true;
  return [...out.values()].map(a => ({ ...a, verdict: a.retired ? 'retired' : a.positive ? 'working' : a.sent >= RETIRE_AFTER ? 'retire' : 'keep' }));
}

// coverageResults reads each piece of coverage a pitch earned on the app's downloads: web-referrer first-time
// downloads in the 7 days after it, and search and browse downloads against the 7 days before. Either is an effect.
export function coverageResults(outcomes, days) {
  const dates = Object.keys(days).sort();
  const through = dates[dates.length - 1];
  return outcomes.map(o => {
    const start = (o.at || o.ts).slice(0, 10), end = plusDays(start, COVERAGE_DAYS);
    const result = { pitch: o.pitch, url: o.url, start, end, mature: Boolean(through) && through >= plusDays(end, -1) };
    if (!result.mature) return { ...result, judged: false, why: `its window closes ${end}` };
    const web = span(days, start, end, d => ({ n: d?.sources?.['Web referrer'] || 0 })).n;
    const before = span(days, plusDays(start, -COVERAGE_DAYS), start, searchBrowse).n, after = span(days, start, end, searchBrowse).n;
    return { ...result, judged: true, web, before, after, effect: web > 0 || lifted(after, before) };
  });
}

// pitchSnapshot turns the endpoint's detail into one metrics line per app: counts as values, and each pitch's state.
export function pitchSnapshot(detail, at = new Date().toISOString()) {
  const apps = new Map();
  for (const p of detail.pitches || []) {
    const line = apps.get(p.app) || apps.set(p.app, { at, app: p.app, source: 'pitches', values: { pitchesSent: 0, pitchFollowUps: 0, pitchReplies: 0, pitchOptOuts: 0, pitchVisits: 0 }, pitches: [] }).get(p.app);
    const v = line.values;
    if (p.first?.status === 'sent') v.pitchesSent += 1;
    if (p.followUp?.status === 'sent') v.pitchFollowUps += 1;
    if (p.replies.some(r => r.kind === 'other')) v.pitchReplies += 1;
    if (p.replies.some(r => r.kind === 'no')) v.pitchOptOuts += 1;
    v.pitchVisits += p.visits || 0;
    line.pitches.push({ id: p.id, approach: p.approach, first: p.first && { status: p.first.status, at: p.first.at }, followUp: p.followUp && { status: p.followUp.status, at: p.followUp.at },
      replies: p.replies.map(r => ({ kind: r.kind, at: r.at, answered: r.answered })), visits: p.visits || 0 });
  }
  return [...apps.values()];
}

function githubToken() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const got = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });
  if (got.status !== 0 || !got.stdout.trim()) throw new Error('pitches needs a GitHub token that can read astrojams1/app-sites: set GH_TOKEN or sign gh in');
  return got.stdout.trim();
}

// queueProof is `Queue <sha256 of marketing/pitches.jsonl at the deployed commit>`, read from this clone. The endpoint
// takes it as proof the caller can read the private repository, so a run needs no GitHub token for its own results.
export const queueProof = bytes => `Queue ${createHash('sha256').update(bytes).digest('hex')}`;
function deployedQueue(root, commit) {
  if (!/^[0-9a-f]{7,40}$/.test(commit || '')) return null;
  const show = () => spawnSync('git', ['-C', root, 'show', `${commit}:marketing/pitches.jsonl`], { maxBuffer: 64 << 20 });
  let got = show();
  if (got.status !== 0) { spawnSync('git', ['-C', root, 'fetch', '-q', 'origin', 'main']); got = show(); }
  return got.status === 0 ? got.stdout : null;
}

// Marketing runs only read: every call carries dry=1. Sending is the Pitches workflow's and the cron's (app-sites).
async function cmdPitches(root, args) {
  const base = args.url || PITCHES_URL;
  const url = `${base}?${args.replies ? 'replies' : 'detail'}=1&dry=1`;
  const open = await fetch(`${base}?dry=1`).then(r => r.json()).catch(() => ({}));
  const queue = deployedQueue(root, open.commit);
  let res = await fetch(url, { headers: { Authorization: queue ? queueProof(queue) : `Bearer ${githubToken()}` } });
  if (res.status === 401 && queue) res = await fetch(url, { headers: { Authorization: `Bearer ${githubToken()}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`/api/pitches answered ${res.status}: ${body.error || 'no detail'}`);
  if (args.write) for (const line of pitchSnapshot(body)) appendFileSync(join(dirOf(root), 'metrics.jsonl'), JSON.stringify(line) + '\n');
  if (args.json) return console.log(JSON.stringify(body, null, 2));
  console.log(`ready: ${JSON.stringify(body.ready)}${body.paused ? ' (paused)' : ''}; deployed ${String(body.commit || 'unknown').slice(0, 7)}; counts: ${JSON.stringify(body.counts)}`);
  for (const p of body.pitches || []) {
    console.log(`${p.app}/${p.id} [${p.approach}] first ${p.first?.status || 'not yet'}${p.first?.error ? ` (${p.first.error})` : ''}, follow-up ${p.followUp?.status || 'not yet'}, ${p.visits} visits`);
    for (const r of p.replies) {
      if (r.kind !== 'other' || r.answered) continue;
      console.log(`  unanswered reply ${r.id} (${r.at}, from ${r.fromDomain || 'unknown'})${r.body !== undefined ? `:\n    ${String(r.body).replace(/\n/g, '\n    ')}` : ''}`);
    }
  }
}

// ---- reports ----

export function renderBoard(profiles, events, metrics, registry) {
  const apps = summary(profiles, events, metrics, registry);
  const cell = value => (value === undefined || value === null ? 'not yet read' : String(value));
  const lines = ['# Marketing ledger', '', 'Generated by `marketing.mjs board` from `ledger.jsonl` and `metrics.jsonl`; never edit this view. Downloads are first-time downloads summed over unique days.', '', '## Scoreboard', '',
    '| App | Stage | Downloads | Impressions | Page views | Rating | Ratings | Shorts views | Done | Open | Parked |', '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const a of apps) {
    const n = a.numbers;
    lines.push(`| ${a.name} | ${a.stage} | ${cell(n.downloads)} | ${cell(n.impressions)} | ${cell(n.pageViews)} | ${n.ratingCount ? n.rating.toFixed(2) : 'none yet'} | ${cell(n.ratingCount)} | ${cell(n.shortsViews)} | ${a.done} | ${a.open} | ${a.parked} |`);
  }
  lines.push('', '## Activity', '', '| When | App | Channel | Item | Status | What happened |', '|---|---|---|---|---|---|');
  const shown = events.filter(e => e.event === 'action' || e.event === 'finding' || e.event === 'verify').slice(-60).reverse();
  for (const e of shown) lines.push(`| ${e.ts.slice(0, 16).replace('T', ' ')} | ${e.app || 'all'} | ${e.channel || ''} | ${e.item || ''} | ${e.status} | ${String(e.operation || e.reason || '').replace(/\|/g, '/').replace(/\n/g, ' ')} |`);
  for (const a of apps) {
    lines.push('', `## ${a.name}: backlog`, '', '| Item | Channel | Runner | State | Last result |', '|---|---|---|---|---|');
    for (const i of a.states) lines.push(`| ${i.title} | ${i.channel} | ${i.runner} | ${i.state} | ${i.last ? `${i.last.ts.slice(0, 10)} ${i.last.status}: ${String(i.last.reason || i.last.operation || '').replace(/\|/g, '/')}` : ''} |`);
  }
  return lines.join('\n') + '\n';
}

async function cmdHn(root, args) {
  const profile = loadProfiles(root).find(p => p.id === args.app);
  if (!profile) throw new Error('Pass --app with an app id from marketing/apps/');
  let stories = [];
  if (profile.hackerNews) {
    const search = async params => {
      const response = await fetch(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=50&${params}`);
      if (!response.ok) throw new Error(`Hacker News search answered ${response.status}; try again later`);
      return (await response.json()).hits;
    };
    const url = profile.hackerNews.url.replace(/^https?:\/\/(www\.)?/, '');
    const hits = [
      ...await search(`query=${encodeURIComponent(url)}&restrictSearchableAttributes=url`),
      ...await search(`query=${encodeURIComponent(profile.name)}`)
    ];
    stories = hnStories(profile, hits);
  }
  const verdict = hnVerdict(profile, stories, loadEvents(root));
  const out = { app: profile.id, ...verdict, stories: stories.map(s => ({ id: s.objectID, at: s.created_at, title: s.title, points: s.points, comments: s.num_comments })) };
  if (verdict.due) Object.assign(out, { title: profile.hackerNews.title, url: profile.hackerNews.url, tryIt: profile.hackerNews.tryIt, submit: hnSubmitLink(profile.hackerNews.url, profile.hackerNews.title) });
  if (args.json) return console.log(JSON.stringify(out, null, 2));
  console.log(`${profile.name}: ${verdict.due ? 'due' : 'not due'}: ${verdict.reason}`);
  for (const s of out.stories) console.log(`  ${s.at.slice(0, 10)}  ${s.points} points, ${s.comments} comments  https://news.ycombinator.com/item?id=${s.id}  ${s.title}`);
  if (verdict.due) console.log(`  ${out.title}\n  ${out.url}\n  submit: ${out.submit}`);
}

// showHnFile is what the Show HN task reads first, with no command (references/hacker-news.md): the booked Show HN
// windows still ahead, by Pacific date, or "none". A booking is an app's newest hacker-news action, logged deferred
// as "Show HN booked for ..." with retry_after at the slot.
export function showHnFile(profiles, events, now = Date.now()) {
  const pacific = ms => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const booked = [];
  for (const p of profiles.filter(x => x.hackerNews)) {
    const mine = events.filter(e => e.event === 'action' && e.app === p.id && e.channel === 'hacker-news');
    const last = mine[mine.length - 1];
    if (last?.status === 'deferred' && /^Show HN booked/i.test(last.operation || '') && Date.parse(last.retry_after) > now - DAY) booked.push(`${pacific(Date.parse(last.retry_after))} ${p.id}`);
  }
  return ['# Generated by marketing.mjs board; never edit. The Show HN task reads this first (hacker-news.md).',
    `booked: ${booked.length ? booked.sort().join(', ') : 'none'}`, ''].join('\n');
}

function cmdBoard(root, args) {
  const profiles = loadProfiles(root), events = loadEvents(root);
  writeFileSync(join(dirOf(root), 'LEDGER.md'), renderBoard(profiles, events, loadMetrics(root), loadRegistry(args)));
  const hn = showHnFile(profiles, events);
  writeFileSync(join(dirOf(root), 'show-hn.txt'), hn);
  // The Mac's copy outside any checkout, so the Show HN task reads today's bookings even when a checkout lags.
  if (existsSync(MAC_HOME)) writeFileSync(join(MAC_HOME, 'show-hn.txt'), hn);
  console.log('wrote marketing/LEDGER.md and marketing/show-hn.txt');
}

// cmdMirror copies events the shared activity ledger has not seen, through its locking helper. The cursor is a private
// file on the Mac, so a cloud run's events reach the shared ledger at the Mac's next pass.
function cmdMirror(root) {
  const helper = '/Users/astro/.codex/skills/mac-memory-maintenance/scripts/ledger.py';
  const state = join(homedir(), 'Library/Application Support/AgentActivityLedger/app-marketing.cursor');
  const done = existsSync(state) ? Number(readFileSync(state, 'utf8')) || 0 : 0;
  const events = loadEvents(root);
  let sent = 0;
  for (const event of events.slice(done)) {
    const { app, channel, item, retry_after, dropped, blocked_by, left_open, changed, runner, ...rest } = event;
    const got = spawnSync('python3', [helper], { input: JSON.stringify({ ...rest, targets: [...(rest.targets || []), ...(app ? [`app:${app}`] : [])] }), encoding: 'utf8' });
    if (got.status !== 0) throw new Error('The shared ledger refused an event: ' + got.stderr.slice(0, 200));
    sent += 1;
  }
  mkdirSync(join(state, '..'), { recursive: true });
  writeFileSync(state, String(done + sent));
  console.log(`mirrored ${sent} events`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) { args._.push(argv[i]); continue; }
    const key = argv[i].slice(2);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith('--')) args[key] = true;
    else { args[key] = argv[i + 1]; i += 1; }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, file] = args._;
  const root = rootOf(args);
  const commands = {
    check: () => cmdCheck(root), status: () => cmdStatus(root, args), next: () => cmdNext(root, args), log: () => cmdLog(root, file, args), learn: () => cmdLearn(root, args),
    public: () => cmdPublic(root, args), pull: () => cmdPull(root, args), promo: () => cmdPromo(root, args), hn: () => cmdHn(root, args), pitches: () => cmdPitches(root, args),
    youtube: () => cmdYoutube(root, args), board: () => cmdBoard(root, args), mirror: () => cmdMirror(root)
  };
  if (!commands[command]) throw new Error(`Usage: marketing.mjs ${Object.keys(commands).join('|')}`);
  await commands[command]();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
