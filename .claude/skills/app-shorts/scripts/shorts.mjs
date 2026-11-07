#!/usr/bin/env node
// shorts.mjs
// The app-shorts registry: which apps the owner ships, which Shorts exist for each, when the next ones go out and
// which posted Shorts are due a metrics read. One JSON file (default /Volumes/ssd/projects/app-shorts/registry.json)
// is the record every run reads first and writes last. Node 22, no dependencies.
//
//   node shorts.mjs roster [--code DIR]            apps found from app-release.config.json files (main checkouts first)
//   node shorts.mjs sync [--code DIR]              add newly found apps to the registry; never removes or edits any
//   node shorts.mjs record <episode.json>          add or update one episode (matched by id)
//   node shorts.mjs plan [--days 14] [--gap 2]     a posting calendar: a Short every `gap` days, the most overdue app first
//   node shorts.mjs due                            live Shorts due a metrics read (3, 7, 28 days) and scheduled ones now live
//   node shorts.mjs link <app> <campaign>          the app's App Store link with a campaign token, for attribution
//   node shorts.mjs status                         per app: episodes by status, last post, next due
//
// --registry PATH and --now ISO-TIME work with every command (the second for tests and dry runs).

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';

// Analytics settle 48–72 hours after the day they describe, so the first real read is at day 3.
export const READS = [3, 7, 28];
export const STATUSES = ['idea', 'recorded', 'rendered', 'scheduled', 'live', 'retired'];
const DAY = 86400000;

const postedAt = e => e.publishAt ?? e.postedAt ?? null;

export function emptyRegistry() {
  return { version: 1, channel: {}, teams: {}, apps: {}, episodes: [] };
}

// Apps from every app-release.config.json under the code directory. A repository's main checkout wins over its
// worktrees (several may hold the same bundle ID).
export function roster(codeDir) {
  const found = new Map();
  for (const name of readdirSync(codeDir).sort()) {
    const config = join(codeDir, name, 'app-release.config.json');
    if (!existsSync(config)) continue;
    let c;
    try { c = JSON.parse(readFileSync(config, 'utf8')); } catch { continue; }
    const bundle = c.ios?.bundleId ?? c.android?.packageName ?? c.slug;
    if (!bundle) continue;
    const main = existsSync(join(codeDir, name, '.git')) && statSync(join(codeDir, name, '.git')).isDirectory();
    const app = { slug: c.slug ?? name, name: c.app ?? c.slug ?? name, type: c.type ?? null, team: c.ios?.teamId ?? null,
      ascAppId: c.ios?.ascAppId ?? null, bundleId: bundle, repository: join(codeDir, name), main };
    const prior = found.get(bundle);
    if (!prior || (main && !prior.main)) found.set(bundle, app);
  }
  return [...found.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function sync(registry, apps) {
  const added = [];
  for (const app of apps) {
    if (registry.apps[app.slug]) continue;
    registry.apps[app.slug] = { name: app.name, type: app.type, team: app.team, ascAppId: app.ascAppId,
      repository: app.repository, cadenceDays: 7, formats: [], active: true };
    added.push(app.slug);
  }
  return added;
}

// Adds or merges an episode. Warnings flag what makes a channel look mass-produced: the same music bed or the
// same hook as one of the channel's last few Shorts.
export function record(registry, episode, { recent = 6 } = {}) {
  if (!episode.id || !episode.app) throw new Error('An episode needs an id and an app');
  if (episode.status && !STATUSES.includes(episode.status)) throw new Error(`Unknown status "${episode.status}"`);
  const index = registry.episodes.findIndex(e => e.id === episode.id);
  if (index < 0) registry.episodes.push({ status: 'idea', metrics: [], ...episode });
  else registry.episodes[index] = { ...registry.episodes[index], ...episode };
  const saved = registry.episodes.find(e => e.id === episode.id);
  const others = registry.episodes.filter(e => e.id !== saved.id && postedAt(e)).sort((a, b) => postedAt(b).localeCompare(postedAt(a))).slice(0, recent);
  const warnings = [];
  for (const [field, label] of [['music', 'music bed'], ['hook', 'hook']]) {
    const same = saved[field] && others.find(e => e[field] && e[field].toLowerCase() === saved[field].toLowerCase());
    if (same) warnings.push(`Same ${label} as ${same.id} ("${saved[field]}"): vary it`);
  }
  return { episode: saved, warnings };
}

// A calendar of `days` days from `now`: one Short every `gap` days across the channel (2 gives three or four a
// week, a pace distinct ideas can sustain). Each slot goes to the active app most overdue against its cadence
// that has a rendered episode ready; due apps with nothing ready are listed as needing production.
export function plan(registry, { now = new Date(), days = 14, gap = 2 } = {}) {
  const last = {};
  for (const e of registry.episodes) {
    const at = postedAt(e);
    if (at && ['scheduled', 'live'].includes(e.status) && (!last[e.app] || at > last[e.app])) last[e.app] = at;
  }
  const ready = {};
  for (const e of registry.episodes) if (e.status === 'rendered') (ready[e.app] ??= []).push(e);
  const posts = registry.episodes.filter(e => postedAt(e) && ['scheduled', 'live'].includes(e.status)).map(e => new Date(postedAt(e)));
  const slots = [], needs = new Set();
  const start = new Date(now); start.setUTCHours(0, 0, 0, 0);
  for (let d = 0; d < days; d += 1) {
    const day = new Date(start.getTime() + d * DAY), key = day.toISOString().slice(0, 10);
    if (posts.some(p => Math.abs(Math.floor(p / DAY) - Math.floor(day / DAY)) < gap)) continue;
    const due = Object.entries(registry.apps)
      .filter(([, a]) => a.active !== false)
      .map(([slug, a]) => ({ slug, overdue: last[slug] ? (day - new Date(last[slug])) / DAY - (a.cadenceDays ?? 7) : Infinity }))
      .filter(a => a.overdue >= 0)
      .sort((a, b) => b.overdue - a.overdue || a.slug.localeCompare(b.slug));
    for (const a of due) if (!ready[a.slug]?.length) needs.add(a.slug);
    const pick = due.find(a => ready[a.slug]?.length);
    if (!pick) continue;
    const episode = ready[pick.slug].shift();
    slots.push({ date: key, app: pick.slug, episode: episode.id, title: episode.title ?? null });
    last[pick.slug] = day.toISOString();
    posts.push(day);
  }
  return { slots, needsProduction: [...needs].sort() };
}

// What a run should do now: scheduled Shorts whose time has passed (mark live, pin the comment) and live Shorts that
// have reached a read age (2, 7, 28 days) without a snapshot taken at or after it.
export function due(registry, { now = new Date() } = {}) {
  const live = [], reads = [];
  for (const e of registry.episodes) {
    const at = postedAt(e);
    if (!at) continue;
    const age = (now - new Date(at)) / DAY;
    if (e.status === 'scheduled' && age >= 0) live.push({ episode: e.id, app: e.app, videoId: e.videoId ?? null, since: at });
    if (!['scheduled', 'live'].includes(e.status) || age < 0) continue;
    for (const read of READS) {
      if (age < read) continue;
      const done = (e.metrics ?? []).some(m => (new Date(m.at) - new Date(at)) / DAY >= read);
      if (!done) { reads.push({ episode: e.id, app: e.app, videoId: e.videoId ?? null, read: `${read}d`, age: Math.floor(age) }); break; }
    }
  }
  return { live, reads };
}

// An App Store link that App Store Connect can attribute: pt is the team's provider token, ct the campaign (both
// shown in App Store Connect → Analytics → Campaigns). Without a provider token the link still works, unattributed.
export function link(registry, slug, campaign) {
  const app = registry.apps[slug];
  if (!app) throw new Error(`No app "${slug}" in the registry`);
  if (!app.ascAppId) throw new Error(`"${slug}" has no App Store ID`);
  const url = new URL(`https://apps.apple.com/app/id${app.ascAppId}`);
  const pt = registry.teams?.[app.team]?.providerToken;
  if (pt) url.searchParams.set('pt', pt);
  url.searchParams.set('ct', campaign.slice(0, 40));
  url.searchParams.set('mt', '8');
  return { url: url.toString(), attributed: Boolean(pt) };
}

export function status(registry, { now = new Date() } = {}) {
  return Object.entries(registry.apps).map(([slug, a]) => {
    const mine = registry.episodes.filter(e => e.app === slug);
    const counts = Object.fromEntries(STATUSES.map(s => [s, mine.filter(e => e.status === s).length]).filter(([, n]) => n));
    const posted = mine.map(postedAt).filter(Boolean).sort().pop() ?? null;
    const next = posted ? new Date(new Date(posted).getTime() + (a.cadenceDays ?? 7) * DAY).toISOString().slice(0, 10) : 'now';
    return { app: slug, active: a.active !== false, formats: a.formats?.length ?? 0, ...counts, lastPost: posted, nextDue: a.active === false ? null : next < now.toISOString().slice(0, 10) ? 'now' : next };
  });
}

function load(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : emptyRegistry();
}

function save(path, registry) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path + '.tmp', JSON.stringify(registry, null, 2) + '\n');
  renameSync(path + '.tmp', path);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
  const path = option('--registry', '/Volumes/ssd/projects/app-shorts/registry.json');
  const now = new Date(option('--now', new Date().toISOString()));
  const code = option('--code', '/Volumes/ssd/code');
  const days = Number(option('--days', 14)), gap = Number(option('--gap', 2));
  const [command, ...rest] = args;
  const registry = load(path);
  const print = value => console.log(JSON.stringify(value, null, 2));
  switch (command) {
    case 'roster': print(roster(code)); break;
    case 'sync': { const added = sync(registry, roster(code)); save(path, registry); print({ added, apps: Object.keys(registry.apps).length }); break; }
    case 'record': { const result = record(registry, JSON.parse(readFileSync(rest[0], 'utf8'))); save(path, registry); print(result); break; }
    case 'plan': print(plan(registry, { now, days, gap })); break;
    case 'due': print(due(registry, { now })); break;
    case 'link': print(link(registry, rest[0], rest[1] ?? 'youtube-shorts')); break;
    case 'status': print(status(registry, { now })); break;
    default:
      console.error('usage: node shorts.mjs roster|sync|record <episode.json>|plan|due|link <app> <campaign>|status [--registry PATH] [--now ISO]');
      process.exit(2);
  }
}
