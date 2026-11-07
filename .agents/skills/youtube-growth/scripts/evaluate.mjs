#!/usr/bin/env node
// evaluate.mjs
// Turns the metrics snapshots in the app-shorts registry into decisions: per Short (is the hook, the retention, the
// reach working?) and per series format (double down, iterate or drop). Thresholds live in ../assets/rules.json,
// each with its source, so they change with evidence rather than with code. Node 22, no dependencies.
//
//   node evaluate.mjs [--registry PATH] [--rules PATH] [--now ISO]     decisions as JSON
//
// A snapshot is { at, source, views, engagedViews?, averageViewPercentage?, viewedRate?, likes?, comments?,
// shares?, subscribersGained? }; viewedRate (Studio's "viewed vs. swiped away", percent viewed) comes from Studio.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DAY = 86400000;
export const RULES = fileURLToPath(new URL('../assets/rules.json', import.meta.url));

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

export function evaluate(registry, rules, { now = new Date() } = {}) {
  const live = registry.episodes.filter(e => ['live', 'retired'].includes(e.status));
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

  // Formats: decide only with enough mature episodes, so one unlucky post does not kill a series.
  const byFormat = {};
  for (const s of shorts) if (s.format && s.age >= rules.format.readAgeDays) (byFormat[`${s.app}/${s.format}`] ??= []).push(s);
  const formats = Object.entries(byFormat).map(([key, list]) => {
    const [app, format] = key.split('/');
    const reach = median(list.map(s => s.reach));
    const weakHooks = list.filter(s => s.notes.some(n => n.signal === 'hook' && n.verdict === 'weak')).length;
    const expanded = list.filter(s => baseline && s.reach >= baseline * rules.reach.outperform).length;
    let decision = 'continue', why = `${list.length} episodes, median ${reach} views`;
    if (list.length < rules.format.minEpisodes) { decision = 'wait'; why += `; judge after ${rules.format.minEpisodes}`; }
    else if (baseline && reach >= baseline * rules.format.doubleDown) { decision = 'double-down'; why += ` (≥${rules.format.doubleDown}x channel median): raise its cadence`; }
    else if (list.length >= rules.format.retireAfter && !expanded) { decision = 'drop'; why += `, none left the seed audience: retire it and try another shape`; }
    else if (weakHooks) { decision = 'iterate'; why += `; ${weakHooks} weak hooks: new hook lines, same format`; }
    return { app, format, decision, why, episodes: list.map(s => s.episode) };
  });

  for (const f of formats) if (['double-down', 'drop', 'iterate'].includes(f.decision)) actions.push({ kind: `format-${f.decision}`, app: f.app, format: f.format, why: f.why });
  for (const s of shorts) for (const n of s.notes) if (n.verdict === 'outperformer') actions.push({ kind: 'make-next-episode', app: s.app, format: s.format, why: `${s.episode}: ${n.detail}` });

  // Apps the channel has not shown in a long time get a nudge, so the calendar does not starve them.
  for (const [slug, app] of Object.entries(registry.apps ?? {})) {
    if (app.active === false) continue;
    const last = registry.episodes.filter(e => e.app === slug).map(e => e.publishAt ?? e.postedAt).filter(Boolean).sort().pop();
    const idle = last ? (now - new Date(last)) / DAY : Infinity;
    if (idle > rules.idleAppDays) actions.push({ kind: 'produce', app: slug, why: last ? `no Short for ${Math.floor(idle)} days` : 'no Short yet' });
  }
  return { baseline, cutoffs: { hook, retention }, shorts, formats, actions };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
  const registry = JSON.parse(readFileSync(option('--registry', '/Volumes/ssd/projects/app-shorts/registry.json'), 'utf8'));
  const rules = JSON.parse(readFileSync(option('--rules', RULES), 'utf8'));
  console.log(JSON.stringify(evaluate(registry, rules, { now: new Date(option('--now', new Date().toISOString())) }), null, 2));
}
