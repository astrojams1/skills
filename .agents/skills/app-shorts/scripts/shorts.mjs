#!/usr/bin/env node
// shorts.mjs
// The app-shorts registry: which apps the owner ships, which Shorts exist for each, when the next ones go out and
// which posted Shorts are due a metrics read. One JSON file (default /Volumes/ssd/projects/app-shorts/registry.json)
// is the record every run reads first and writes last. Node 22, no dependencies.
//
//   node shorts.mjs roster [--code DIR]            apps found from app-release.config.json files (main checkouts first)
//   node shorts.mjs sync [--code DIR]              add newly found apps to the registry; never removes or edits any
//   node shorts.mjs record <episode.json>          add or update one episode (matched by id); refuses a made episode with
//                                                  no searchPhrase, or whose description's first line lacks it, and any
//                                                  episode past "idea" (except "held") for an app not on sale
//   node shorts.mjs phrase <app> [--try "a|b"]      the search phrase that finds the app on the App Store: the profile's,
//                                                  else the first candidate the store's search ranks first
//   node shorts.mjs views                          per app: Shorts views on public Shorts only, and whether a live or
//                                                  scheduled Short exists (what app-marketing reads)
//   node shorts.mjs rules <app>                    the reviewer pack's rules: this skill's, the app's or business's own,
//                                                  and the owner's recorded verdicts (exits 1 if a source is missing)
//   node shorts.mjs plan [--days 14] [--gap 2]     a posting calendar: a Short every `gap` days, the most overdue app first;
//                                                  apps not on sale get no slot and are listed as notOnSale
//   node shorts.mjs due                            live Shorts due a metrics read (3, 7, 28 days), scheduled ones now live,
//                                                  scheduled ones to hold (app not on sale) and held ones to re-check
//   node shorts.mjs link <app> <campaign>          the app's App Store link with a campaign token, for attribution
//   node shorts.mjs status                         per app: episodes by status, last post, next due
//
// --registry PATH, --profiles DIR and --now ISO-TIME work with every command (the last for tests and dry runs).

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, renameSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

// Analytics settle 48–72 hours after the day they describe, so the first real read is at day 3.
export const READS = [3, 7, 28];
// What each status means on the channel:
//   idea, recorded, rendered   not on YouTube yet
//   scheduled                  on YouTube, private, goes public at publishAt
//   held                       on YouTube, private, no publish time: made for an app that is not on sale, kept until
//                              it is, then re-checked against the current rules before it is scheduled
//   live                       public
//   retired                    still public, but its series stopped
//   pulled                     taken back to private (by the owner or a run); never counts as a Short
//   superseded                 replaced by a remake before it was ever uploaded
export const STATUSES = ['idea', 'recorded', 'rendered', 'scheduled', 'held', 'live', 'retired', 'pulled', 'superseded'];
export const PUBLIC = ['live', 'retired'];
export const ON_CHANNEL = ['scheduled', ...PUBLIC];
// A made episode is one a viewer could see: it needs a search phrase before it is recorded at these statuses.
const MADE = ['rendered', 'scheduled', 'live', 'retired'];
// Statuses that mean a Short is being made or is on its way to viewers. An app not on sale gets none of them.
const MAKING = ['recorded', ...MADE];
const DAY = 86400000;
const SKILL = fileURLToPath(new URL('..', import.meta.url));
export const PROFILES = '/Volumes/ssd/code/app-sites/marketing/apps';

const postedAt = e => e.publishAt ?? e.postedAt ?? null;
const onChannel = e => ON_CHANNEL.includes(e.status);

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

// Whether a viewer can get the app today, so a Short may be made or published for it (James, 2026-11-12: "why have
// we been creating giraffe stretch youtube shorts if the app is not even released in the app store yet?"). Yes when
// its marketing profile's stage is "live" (app-marketing flips it when Apple's lookup finds the app), or the profile's
// `preorder` names a live pre-order page. An App Store app with no profile is unconfirmed, so no. An entry with no App
// Store record at all (no team, no ascAppId), such as a local business, is not an app and this rule does not hold it.
export function onSale(app, profile) {
  if (profile) return profile.stage === 'live' || /^https:\/\//.test(profile.preorder ?? '');
  return !(app?.team || app?.ascAppId);
}

// Why an episode cannot be recorded as it stands, or null. Shorts exist to win downloads, so an app not on sale gets
// no Short: nothing past "idea" except "held". Links in Shorts do not click, so a viewer finds the app only by
// searching: a made episode's phrase must exist and lead the description. Legacy Shorts predate both rules.
export function findable(episode, { profile = null, app = null } = {}) {
  if (episode.legacy) return null;
  if (MAKING.includes(episode.status) && !onSale(app, profile)) {
    return `${episode.id}: ${episode.app} is not on sale, so it gets no Short. Keep it as "idea", or "held" (private, no publish time) if it is on YouTube, until its marketing profile's stage is live`;
  }
  if (!MADE.includes(episode.status)) return null;
  const phrase = (episode.searchPhrase ?? '').trim();
  if (!phrase) return `${episode.id} has no searchPhrase: add the app's verified phrase (node shorts.mjs phrase ${episode.app})`;
  const first = (episode.description ?? '').split('\n')[0].toLowerCase();
  if (episode.description && !first.includes(phrase.toLowerCase())) return `${episode.id}: the description's first line must give the search phrase "${phrase}"`;
  return null;
}

// Adds or merges an episode. Warnings flag what makes a channel look mass-produced: the same music bed or the
// same hook as one of the channel's last few Shorts.
export function record(registry, episode, { recent = 6, profile = null } = {}) {
  if (!episode.id || !episode.app) throw new Error('An episode needs an id and an app');
  if (episode.status && !STATUSES.includes(episode.status)) throw new Error(`Unknown status "${episode.status}"`);
  const index = registry.episodes.findIndex(e => e.id === episode.id);
  const merged = index < 0 ? { status: 'idea', metrics: [], ...episode } : { ...registry.episodes[index], ...episode };
  const refused = findable(merged, { profile, app: registry.apps[merged.app] ?? null });
  if (refused) throw new Error(refused);
  if (index < 0) registry.episodes.push(merged);
  else registry.episodes[index] = merged;
  const saved = merged;
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
// that has a rendered episode ready; due apps with nothing ready are listed as needing production. An app not on
// sale gets no slot and is never listed as needing production, only as notOnSale.
export function plan(registry, { now = new Date(), days = 14, gap = 2, profiles = [] } = {}) {
  const selling = slug => onSale(registry.apps[slug], profileFor(profiles, slug));
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
      .filter(([slug, a]) => a.active !== false && selling(slug))
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
  const notOnSale = Object.entries(registry.apps).filter(([slug, a]) => a.active !== false && !selling(slug)).map(([slug]) => slug).sort();
  return { slots, needsProduction: [...needs].sort(), notOnSale };
}

// What a run should do now: scheduled Shorts whose time has passed (mark live) and live Shorts that have reached a
// read age (3, 7, 28 days) without a snapshot taken at or after it. A scheduled Short for an app not on sale is
// listed to hold instead (`yt-api.mjs unschedule --hold`), and a held one whose app is now on sale to re-check
// against the current rules before it is given a publish time.
export function due(registry, { now = new Date(), profiles = [] } = {}) {
  const live = [], reads = [], hold = [], recheck = [];
  const selling = slug => onSale(registry.apps[slug], profileFor(profiles, slug));
  for (const e of registry.episodes) {
    if (e.status === 'held' && selling(e.app)) recheck.push({ episode: e.id, app: e.app, videoId: e.videoId ?? null });
    if (e.status === 'scheduled' && !e.legacy && !selling(e.app)) { hold.push({ episode: e.id, app: e.app, videoId: e.videoId ?? null, publishAt: e.publishAt ?? null }); continue; }
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
  return { live, reads, hold, recheck };
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

export function status(registry, { now = new Date(), profiles = [] } = {}) {
  return Object.entries(registry.apps).map(([slug, a]) => {
    const selling = onSale(a, profileFor(profiles, slug));
    const mine = registry.episodes.filter(e => e.app === slug);
    const counts = Object.fromEntries(STATUSES.map(s => [s, mine.filter(e => e.status === s).length]).filter(([, n]) => n));
    const posted = mine.filter(onChannel).map(postedAt).filter(Boolean).sort().pop() ?? null;
    const next = posted ? new Date(new Date(posted).getTime() + (a.cadenceDays ?? 7) * DAY).toISOString().slice(0, 10) : 'now';
    return { app: slug, active: a.active !== false, onSale: selling, formats: a.formats?.length ?? 0, ...counts, liveOrScheduled: mine.some(onChannel),
      lastPost: posted, nextDue: a.active === false || !selling ? null : next < now.toISOString().slice(0, 10) ? 'now' : next };
  });
}

// What app-marketing reads per app: views summed over public Shorts only (a pulled or superseded Short never
// counts, whatever views it had), and whether the app has a live or scheduled Short right now. `marketingId` is the
// app's id in app-sites (`marketing/apps/<id>.json`, matched on its `shortsSlug`).
export function views(registry, { profiles = [] } = {}) {
  return Object.keys(registry.apps).map(slug => {
    const mine = registry.episodes.filter(e => e.app === slug);
    const pub = mine.filter(e => PUBLIC.includes(e.status));
    const latestViews = e => (e.metrics ?? []).filter(m => Number.isFinite(m.views)).sort((a, b) => a.at.localeCompare(b.at)).at(-1)?.views ?? 0;
    const scheduled = mine.filter(e => e.status === 'scheduled').map(e => e.publishAt).filter(Boolean).sort();
    return { app: slug, marketingId: profiles.find(p => (p.shortsSlug ?? p.id) === slug)?.id ?? null,
      shortsViews: pub.reduce((sum, e) => sum + latestViews(e), 0), publicShorts: pub.length, scheduledShorts: scheduled.length,
      liveOrScheduled: pub.length + scheduled.length > 0, nextPublic: scheduled[0] ?? null,
      held: mine.filter(e => e.status === 'held').length, excluded: mine.filter(e => ['pulled', 'superseded'].includes(e.status)).length };
  });
}

// The marketing profiles in app-sites, for the search phrase, the stage and the app's own rules.
export function loadProfiles(dir = PROFILES) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => { try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; } }).filter(Boolean);
}
export const profileFor = (profiles, slug) => profiles.find(p => (p.shortsSlug ?? p.id) === slug) ?? null;

// The App Store's own search page lists results in rank order; an app's rank is where its id first appears.
export function searchRank(html, appId) {
  const ids = [...new Set([...String(html).matchAll(/\/id(\d{6,})/g)].map(m => m[1]))];
  const at = ids.indexOf(String(appId));
  return at < 0 ? null : at + 1;
}

export async function checkPhrase(phrase, appId, { fetcher = fetch } = {}) {
  const res = await fetcher(`https://apps.apple.com/us/iphone/search?term=${encodeURIComponent(phrase)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`App Store search answered ${res.status}`);
  return searchRank(await res.text(), appId);
}

// The app's name on the App Store (Apple's public lookup), or null.
export async function storeName(appId, { fetcher = fetch } = {}) {
  if (!appId) return null;
  const res = await fetcher(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=us`);
  if (!res.ok) return null;
  return (await res.json()).results?.[0]?.trackName ?? null;
}

// The phrase a Short gives: the profile's searchPhrase when app-marketing has set one (it checks it daily), else the
// first candidate the store ranks first, else the best-ranked one. Candidates: --try, the store name, its part
// before a colon, the store name without punctuation, the registry and profile names.
export async function phrase(registry, slug, { profiles = [], tries = [], fetcher = fetch } = {}) {
  const app = registry.apps[slug];
  if (!app) throw new Error(`No app "${slug}" in the registry`);
  const profile = profileFor(profiles, slug);
  const fromProfile = typeof profile?.searchPhrase === 'string' ? profile.searchPhrase : profile?.searchPhrase?.phrase;
  const name = (profile?.name ?? app.name ?? '').trim();
  if (profile && !onSale(app, profile)) return { app: slug, phrase: null, rank: null, source: 'not on sale: no Short until it is', checked: [] };
  const store = await storeName(app.ascAppId, { fetcher }) ?? name;
  const plain = n => n.replace(/[:|–—-]/g, ' ').replace(/\s+/g, ' ');
  const candidates = [...new Set([fromProfile, ...tries, store, store.split(':')[0], plain(store), name, app.name].map(c => c?.trim()).filter(Boolean))];
  const checked = [];
  for (const candidate of candidates) {
    const rank = app.ascAppId ? await checkPhrase(candidate, app.ascAppId, { fetcher }) : null;
    checked.push({ phrase: candidate, rank });
    if (rank === 1) return { app: slug, phrase: candidate, rank, source: candidate === fromProfile ? 'profile' : 'checked', checked };
  }
  const best = checked.filter(c => c.rank).sort((a, b) => a.rank - b.rank)[0];
  if (best) return { app: slug, phrase: best.phrase, rank: best.rank, source: 'checked', checked };
  return { app: slug, phrase: fromProfile ?? name, rank: null, source: fromProfile ? 'profile, not found by the store today' : 'store name, not found by the store today', checked };
}

// A section of a Markdown file: from its "## <name>" heading to the next "## " heading, without a skill's copied
// run rules block (those are run rules, not content rules).
export function section(text, name) {
  const lines = String(text).split('\n');
  const start = lines.findIndex(l => l.replace(/^#+\s*/, '').trim().toLowerCase() === name.toLowerCase() && /^##\s/.test(l));
  if (start < 0) return null;
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line) || /^\*\*Run rules/.test(line) || /^When a scheduled pass runs this skill/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

// The rules every reviewer must check a Short against: this skill's own rules, the app's or business's written
// rules (its marketing profile's `rules`, and the sources in assets/rule-sources.json), and the owner's recorded
// verdicts. A Short that breaks one fails review as a rule breach.
export function rules(slug, { profiles = [], sources = null, read = p => readFileSync(p, 'utf8'), exists = existsSync } = {}) {
  const config = sources ?? JSON.parse(readFileSync(join(SKILL, 'assets', 'rule-sources.json'), 'utf8'));
  const resolve = p => (isAbsolute(p) ? p : join(SKILL, p));
  const parts = [], missing = [];
  const add = ({ file, section: name, title }) => {
    const path = resolve(file);
    if (!exists(path)) { missing.push(path); return; }
    const body = name ? section(read(path), name) : read(path).trim();
    if (!body) { missing.push(`${path} (section "${name}")`); return; }
    parts.push(`## ${title ?? `${file}${name ? `, "${name}"` : ''}`}\n\n${body}`);
  };
  for (const s of config.always ?? []) add(s);
  const profile = profileFor(profiles, slug);
  if (profile?.rules?.length) parts.push(`## ${profile.name ?? slug}: rules from its marketing profile (app-sites marketing/apps/${profile.id}.json)\n\n${profile.rules.map(r => `- ${r}`).join('\n')}`);
  for (const s of config.apps?.[slug] ?? []) add(s);
  if (!profile?.rules?.length && !(config.apps?.[slug] ?? []).length) missing.push(`no written rules for "${slug}": add a marketing profile or an entry in assets/rule-sources.json`);
  for (const s of config.verdicts ?? []) add(s);
  return { app: slug, text: `# Rules for ${slug}\n\nA Short that breaks any line below fails review as a rule breach, not a taste note.\n\n${parts.join('\n\n')}\n`, missing };
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
  const profiles = loadProfiles(option('--profiles', PROFILES));
  const tries = (option('--try', '') ?? '').split('|').filter(Boolean);
  const [command, ...rest] = args;
  const registry = load(path);
  const print = value => console.log(JSON.stringify(value, null, 2));
  try {
  switch (command) {
    case 'roster': print(roster(code)); break;
    case 'sync': { const added = sync(registry, roster(code)); save(path, registry); print({ added, apps: Object.keys(registry.apps).length }); break; }
    case 'record': {
      const episode = JSON.parse(readFileSync(rest[0], 'utf8'));
      const app = episode.app ?? registry.episodes.find(e => e.id === episode.id)?.app;
      const result = record(registry, episode, { profile: profileFor(profiles, app) }); save(path, registry); print(result); break;
    }
    case 'phrase': print(await phrase(registry, rest[0], { profiles, tries })); break;
    case 'views': print(views(registry, { profiles })); break;
    case 'rules': { const r = rules(rest[0], { profiles }); console.log(r.text); if (r.missing.length) { console.error(`Missing rule sources: ${r.missing.join('; ')}`); process.exit(1); } break; }
    case 'plan': print(plan(registry, { now, days, gap, profiles })); break;
    case 'due': print(due(registry, { now, profiles })); break;
    case 'link': print(link(registry, rest[0], rest[1] ?? 'youtube-shorts')); break;
    case 'status': print(status(registry, { now, profiles })); break;
    default:
      console.error('usage: node shorts.mjs roster|sync|record <episode.json>|phrase <app> [--try "a|b"]|views|rules <app>|plan|due|link <app> <campaign>|status [--registry PATH] [--profiles DIR] [--now ISO]');
      process.exit(2);
  }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
