#!/usr/bin/env node
// evaluate.mjs
// Turns the metrics snapshots in the app-shorts registry into decisions: per Short (is the hook, the retention, the
// reach working?) and per series format (double down, iterate or drop). Thresholds live in ../assets/rules.json,
// each with its source, so they change with evidence rather than with code. Node 22, no dependencies.
//
//   node evaluate.mjs [--registry PATH] [--rules PATH] [--metrics PATH] [--profiles DIR] [--now ISO]   decisions as JSON
//
// A snapshot is { at, source, views, engagedViews?, averageViewPercentage?, viewedRate?, likes?, comments?,
// shares?, subscribersGained? }; viewedRate (Studio's "viewed vs. swiped away", percent viewed) comes from Studio.
//
// Downloads come from app-marketing's metrics (app-sites marketing/metrics.jsonl): `asc-analytics` rows whose `days`
// map each date to { first, re, sources? }, where `sources` (when present) splits that day's first-time downloads by
// Apple's source type ("App Store search", "App Store browse", ...). Each Short gets a download verdict: did the app's
// first-time downloads from search and browse in the 72 hours after it went public beat the app's prior 7-day daily
// baseline? `lifted`, `no-effect`, or `inconclusive` (too few views, or the data is not in yet).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY = 86400000;
export const RULES = fileURLToPath(new URL('../assets/rules.json', import.meta.url));
const PUBLIC = ['live', 'retired'];
const dateOf = t => new Date(t).toISOString().slice(0, 10);
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

// Each app's first-time downloads by day, from asc-analytics rows. A day can appear in several rows (Apple
// reprocesses days, and older rows repeat days): the newest row's value wins, so a day is never counted twice. A
// day is known only if some row reported it; a missing day is unknown, not zero.
export function downloadDays(rows) {
  const out = {};
  for (const row of [...rows].filter(r => r.source === 'asc-analytics' && r.days).sort((a, b) => String(a.at).localeCompare(String(b.at)))) {
    const app = (out[row.app] ??= { days: {}, through: null });
    for (const [day, v] of Object.entries(row.days)) app.days[day] = v;
    if (row.throughDay && (!app.through || row.throughDay > app.through)) app.through = row.throughDay;
  }
  return out;
}

export function readMetrics(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
}

// The download verdict for one Short. `data` is downloadDays()[app]; `views` the Short's latest public views.
export function downloadVerdict(episode, data, rule, { now = new Date(), views = null } = {}) {
  const at = episode.publishAt ?? episode.postedAt;
  const base = { episode: episode.id, app: episode.app, videoId: episode.videoId ?? null, publicAt: at ?? null, views };
  const inconclusive = why => ({ ...base, label: 'inconclusive', why });
  if (!at || new Date(at) > now) return inconclusive('not public yet');
  const windowDays = Math.ceil(rule.windowHours / 24);
  const first = dateOf(at);
  const window = Array.from({ length: windowDays }, (_, i) => addDays(first, i));
  const before = Array.from({ length: rule.baselineDays }, (_, i) => addDays(first, i - rule.baselineDays));
  if (new Date(at).getTime() + rule.windowHours * 3600000 > now.getTime()) return inconclusive(`the ${rule.windowHours} hours after it went public are not over`);
  if (!data || !Object.keys(data.days).length) return inconclusive('no download data for this app yet (not on sale, or Apple analytics not running)');
  const earliest = Object.keys(data.days).sort()[0];
  if (window[0] < earliest) return inconclusive(`the app's download data starts ${earliest}, after this Short went public`);
  const missing = window.filter(d => !data.days[d]);
  if (missing.length) return inconclusive(`download data not in yet for ${missing.join(', ')}`);
  const known = before.filter(d => data.days[d]);
  if (known.length < rule.minBaselineDays) return inconclusive(`baseline has ${known.length} of ${rule.baselineDays} days (needs ${rule.minBaselineDays})`);
  const wanted = rule.sources.map(x => x.toLowerCase());
  const bySource = [...window, ...known].every(d => data.days[d].sources);
  const count = d => {
    const v = data.days[d];
    if (!bySource) return v.first ?? 0;
    return Object.entries(v.sources).filter(([k]) => wanted.includes(k.toLowerCase())).reduce((sum, [, n]) => sum + (Number(n) || 0), 0);
  };
  const total = window.reduce((sum, d) => sum + count(d), 0);
  const perDay = known.reduce((sum, d) => sum + count(d), 0) / known.length;
  const expected = perDay * windowDays;
  const needed = Math.max(rule.minExtra, rule.z * Math.sqrt(Math.max(expected, 1)));
  const result = { ...base, window: { days: window, downloads: total }, baseline: { days: known.length, perDay: Math.round(perDay * 100) / 100 },
    expected: Math.round(expected * 10) / 10, needed: Math.ceil(needed), basis: bySource ? rule.sources.join(' + ') : 'all first-time downloads (no per-day sources yet)' };
  // Too few views cannot move downloads either way, so a rise then is someone else's doing and a flat line proves
  // nothing.
  if (!Number.isFinite(views)) return { ...result, label: 'inconclusive', why: 'no views read yet' };
  if (views < rule.minViews) return { ...result, label: 'inconclusive', why: `${views} views, under ${rule.minViews}: too few to move downloads` };
  if (total - expected >= needed) return { ...result, label: 'lifted', why: `${total} first-time downloads in ${windowDays} days vs ${result.expected} expected, after ${views} views` };
  return { ...result, label: 'no-effect', why: `${total} first-time downloads in ${windowDays} days vs ${result.expected} expected, after ${views} views` };
}

export function quantile(values, q) {
  const v = values.filter(x => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const i = (v.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return v[lo] + (v[hi] - v[lo]) * (i - lo);
}
const median = values => quantile(values, 0.5);

// The channel's own cut-offs for a metric once it has enough Shorts; the rule's fixed fallbacks before that.
export function cutoffs(values, rule, minSample) {
  const v = values.filter(x => Number.isFinite(x));
  if (v.length >= minSample) return { weak: quantile(v, rule.weakQuantile), strong: rule.strongQuantile ? quantile(v, rule.strongQuantile) : null, basis: `channel (${v.length} Shorts)` };
  return { weak: rule.fallbackWeak, strong: rule.fallbackStrong ?? null, basis: 'fallback (low confidence)' };
}

// The latest snapshot and the age (days since posting) it was taken at.
export function latest(episode) {
  const posted = episode.publishAt ?? episode.postedAt;
  const snaps = (episode.metrics ?? []).filter(m => m.at).sort((a, b) => a.at.localeCompare(b.at));
  const snap = snaps.at(-1);
  if (!snap || !posted) return null;
  return { ...snap, age: (new Date(snap.at) - new Date(posted)) / DAY, reach: snap.engagedViews ?? snap.views ?? 0 };
}

export function evaluate(registry, rules, { now = new Date(), downloads = {} } = {}) {
  const live = registry.episodes.filter(e => PUBLIC.includes(e.status));
  const reads = live.map(e => ({ e, m: latest(e) })).filter(x => x.m && x.m.age >= rules.minAgeDays);
  const baseline = median(reads.map(x => x.m.reach));
  const hook = cutoffs(reads.map(x => x.m.viewedRate), rules.hook, rules.comparison.minSample);
  const retention = cutoffs(reads.map(x => x.m.averageViewPercentage), rules.retention, rules.comparison.minSample);
  const shorts = [], actions = [];

  for (const { e, m } of reads) {
    if (e.legacy) continue;
    const notes = [];
    const perK = n => (Number.isFinite(n) && m.reach ? (n / m.reach) * 1000 : null);
    if (Number.isFinite(m.viewedRate)) {
      if (m.viewedRate < hook.weak) notes.push({ signal: 'hook', verdict: 'weak', detail: `${m.viewedRate}% viewed (under ${Math.round(hook.weak)}%, ${hook.basis}): rewrite the first second, not the rest` });
      else if (hook.strong !== null && m.viewedRate >= hook.strong) notes.push({ signal: 'hook', verdict: 'strong', detail: `${m.viewedRate}% viewed` });
    }
    if (Number.isFinite(m.averageViewPercentage)) {
      if (m.averageViewPercentage < retention.weak) notes.push({ signal: 'retention', verdict: 'weak', detail: `${m.averageViewPercentage}% average viewed (under ${Math.round(retention.weak)}%, ${retention.basis}): cut the slow middle or land the payoff sooner` });
      else if (m.averageViewPercentage >= rules.retention.loops) notes.push({ signal: 'retention', verdict: 'loops', detail: `${m.averageViewPercentage}% average viewed: people rewatch; keep the loop` });
    }
    if (baseline) {
      const ratio = m.reach / baseline;
      if (ratio >= rules.reach.outperform) notes.push({ signal: 'reach', verdict: 'outperformer', detail: `${m.reach} views, ${ratio.toFixed(1)}x the channel median` });
      else if (ratio <= rules.reach.underperform) notes.push({ signal: 'reach', verdict: 'underperformer', detail: `${m.reach} views, ${ratio.toFixed(2)}x the channel median` });
    }
    const subs = perK(m.subscribersGained);
    if (subs !== null && subs >= rules.subscribersPer1k.strong) notes.push({ signal: 'subscribers', verdict: 'strong', detail: `${subs.toFixed(1)} subscribers per 1,000 views` });
    shorts.push({ episode: e.id, app: e.app, format: e.format ?? null, age: Math.round(m.age), reach: m.reach, notes });
  }

  // Downloads: every Short that has gone public (scheduled ones whose time passed included), legacy ones too.
  const publicNow = registry.episodes.filter(e => (PUBLIC.includes(e.status) || e.status === 'scheduled') && (e.publishAt ?? e.postedAt) && new Date(e.publishAt ?? e.postedAt) <= now);
  const verdicts = publicNow.map(e => {
    const snap = (e.metrics ?? []).filter(m => Number.isFinite(m.views)).sort((a, b) => a.at.localeCompare(b.at)).at(-1);
    const v = downloadVerdict(e, downloads[e.app], rules.downloads, { now, views: snap ? snap.views : null });
    const day = dateOf(e.publishAt ?? e.postedAt);
    const overlaps = publicNow.filter(o => o !== e && o.app === e.app && Math.abs(Date.parse(dateOf(o.publishAt ?? o.postedAt)) - Date.parse(day)) / DAY <= rules.downloads.baselineDays).map(o => o.id);
    return overlaps.length ? { ...v, overlaps } : v;
  });
  const label = id => verdicts.find(v => v.episode === id)?.label ?? 'inconclusive';
  for (const s of shorts) s.downloads = label(s.episode);

  // Formats: decide only with enough mature episodes, so one unlucky post does not kill a series.
  const byFormat = {};
  for (const s of shorts) if (s.format && s.age >= rules.format.readAgeDays) (byFormat[`${s.app}/${s.format}`] ??= []).push(s);
  const formats = Object.entries(byFormat).map(([key, list]) => {
    const [app, format] = key.split('/');
    const reach = median(list.map(s => s.reach));
    const weakHooks = list.filter(s => s.notes.some(n => n.signal === 'hook' && n.verdict === 'weak')).length;
    const expanded = list.filter(s => baseline && s.reach >= baseline * rules.reach.outperform).length;
    const lifted = list.filter(s => s.downloads === 'lifted').length, flat = list.filter(s => s.downloads === 'no-effect').length;
    let decision = 'continue', why = `${list.length} episodes, median ${reach} views, downloads ${lifted} lifted / ${flat} no effect`, provisional = false;
    // Downloads decide a double-down: views alone never do. While no episode has a download verdict yet, a
    // double-down on views stands but is provisional.
    const onViews = list.length >= rules.format.minEpisodes && baseline && reach >= baseline * rules.format.doubleDown;
    if (lifted >= rules.downloads.formatLifted) { decision = 'double-down'; why += `: ${lifted} Shorts lifted downloads, raise its cadence`; }
    else if (list.length < rules.format.minEpisodes) { decision = 'wait'; why += `; judge after ${rules.format.minEpisodes}`; }
    else if (onViews && lifted) { decision = 'double-down'; why += ` (≥${rules.format.doubleDown}x channel median, and downloads lifted): raise its cadence`; }
    else if (onViews && !flat) { decision = 'double-down'; provisional = true; why += ` (≥${rules.format.doubleDown}x channel median); provisional: no download verdict yet`; }
    else if (onViews) { decision = 'iterate'; why += ` (≥${rules.format.doubleDown}x channel median) but downloads did not move: keep the look, make the way to the app plainer`; }
    else if (list.length >= rules.format.retireAfter && !expanded && !lifted) { decision = 'drop'; why += `, none left the seed audience: retire it and try another shape`; }
    else if (weakHooks) { decision = 'iterate'; why += `; ${weakHooks} weak hooks: new hook lines, same format`; }
    return { app, format, decision, ...(provisional ? { provisional } : {}), why, episodes: list.map(s => s.episode) };
  });

  for (const f of formats) if (['double-down', 'drop', 'iterate'].includes(f.decision)) actions.push({ kind: `format-${f.decision}`, app: f.app, format: f.format, ...(f.provisional ? { provisional: true } : {}), why: f.why });
  // The next episode follows downloads first, then views. A Short whose views did not move downloads gets no
  // make-next-episode; one whose download verdict is still out gets a provisional one.
  for (const v of verdicts) if (v.label === 'lifted') actions.push({ kind: 'make-next-episode', app: v.app, format: registry.episodes.find(e => e.id === v.episode)?.format ?? null, why: `${v.episode}: lifted downloads (${v.why})` });
  for (const s of shorts) for (const n of s.notes) {
    if (n.verdict !== 'outperformer' || s.downloads === 'lifted') continue;
    if (s.downloads === 'no-effect') actions.push({ kind: 'point-to-the-app', app: s.app, format: s.format, why: `${s.episode}: ${n.detail}, but downloads did not move: make the search phrase plainer on screen and in the description` });
    else actions.push({ kind: 'make-next-episode', app: s.app, format: s.format, provisional: true, why: `${s.episode}: ${n.detail}; downloads not judged yet` });
  }

  // Apps the channel has not shown in a long time get a nudge, so the calendar does not starve them. A pulled or
  // superseded Short does not count as shown.
  for (const [slug, app] of Object.entries(registry.apps ?? {})) {
    if (app.active === false) continue;
    const last = registry.episodes.filter(e => e.app === slug && [...PUBLIC, 'scheduled'].includes(e.status)).map(e => e.publishAt ?? e.postedAt).filter(Boolean).sort().pop();
    const idle = last ? (now - new Date(last)) / DAY : Infinity;
    if (idle > rules.idleAppDays) actions.push({ kind: 'produce', app: slug, why: last ? `no live or scheduled Short for ${Math.floor(idle)} days` : 'no live or scheduled Short' });
  }
  return { baseline, cutoffs: { hook, retention }, shorts, downloads: verdicts, formats, actions };
}

// Maps app-marketing's app ids to registry slugs through each marketing profile's `shortsSlug`.
export function downloadsBySlug(rows, profiles) {
  const byId = downloadDays(rows), out = {};
  for (const p of profiles) if (byId[p.id]) out[p.shortsSlug ?? p.id] = byId[p.id];
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
  const registry = JSON.parse(readFileSync(option('--registry', '/Volumes/ssd/projects/app-shorts/registry.json'), 'utf8'));
  const rules = JSON.parse(readFileSync(option('--rules', RULES), 'utf8'));
  const dir = option('--profiles', '/Volumes/ssd/code/app-sites/marketing/apps');
  const profiles = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8'))) : [];
  const downloads = downloadsBySlug(readMetrics(option('--metrics', '/Volumes/ssd/code/app-sites/marketing/metrics.jsonl')), profiles);
  console.log(JSON.stringify(evaluate(registry, rules, { now: new Date(option('--now', new Date().toISOString())), downloads }), null, 2));
}
