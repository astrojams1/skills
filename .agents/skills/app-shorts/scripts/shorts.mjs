#!/usr/bin/env node
// shorts.mjs
// The app-shorts registry: which apps the owner ships, which Shorts exist for each, and which public Shorts are due
// a metrics read. A finished Short goes public at once; nothing is scheduled into the future (James, 2026-11-12). One JSON file (default /Volumes/ssd/projects/app-shorts/registry.json)
// is the record every run reads first and writes last. Node 22, no dependencies.
//
//   node shorts.mjs roster [--code DIR]            apps found from app-release.config.json files (main checkouts first)
//   node shorts.mjs sync [--code DIR]              add newly found apps to the registry; never removes or edits any
//   node shorts.mjs record <episode.json>          add or update one episode (matched by id); refuses a made episode
//                                                  whose phrase is not the profile's, whose description's first line
//                                                  lacks it, or whose title hides the app's name past 40 characters;
//                                                  any episode past "idea" (except "held") for an app not on sale; and a
//                                                  rendered or scheduled one without a passing rules checklist, or whose
//                                                  music was not claimed first
//   node shorts.mjs phrase <app> [--try "a|b"]      how a Short ends: the search phrase the App Store's search finds the
//                                                  app with ("search"), or, when none does yet, its exact store name
//                                                  ("name": the end card says it is on the App Store)
//   node shorts.mjs claim <episode> --app A --music "loop|loop"   claim the music beds when the episode is started;
//                                                  refuses a bed used by a Short public within 14 days
//   node shorts.mjs check                          the pre-publish check of every scheduled Short: on sale, title,
//                                                  phrase, rules checklist and the business's banned words. A Short
//                                                  scheduled more than an hour ahead is a defect: make it public now
//                                                  (yt-api.mjs publish) or hold it
//   node shorts.mjs views                          per app: Shorts views on public Shorts only, and whether a live or
//                                                  scheduled Short exists (what app-marketing reads)
//   node shorts.mjs rules <app> [--checklist FILE --episode ID]   the reviewer pack's rules: this skill's, the app's
//                                                  or business's own, and the owner's recorded verdicts (exits 1 if a
//                                                  source is missing); --checklist writes (or tops up) the per-rule
//                                                  checklist each rule is marked pass or fail in, with its evidence;
//                                                  with --episode it also points that episode's rulesChecklist at FILE
//   node shorts.mjs due                            live Shorts due a metrics read (3, 7, 28 days), scheduled ones now live,
//                                                  scheduled ones to hold (app not on sale) and held ones to re-check
//   node shorts.mjs link <app> <campaign>          the app's App Store link with a campaign token, for attribution
//   node shorts.mjs status                         per app: episodes by status, last post, next due (none for an app
//                                                  retired from Shorts: youtube-growth evaluate.mjs --record)
//
// --registry PATH, --profiles DIR and --now ISO-TIME work with every command (the last for tests and dry runs).

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve as absolute } from 'node:path';
import { fileURLToPath } from 'node:url';

// Analytics settle 48–72 hours after the day they describe, so the first real read is at day 3.
export const READS = [3, 7, 28];
// What each status means on the channel:
//   idea, recorded, rendered   not on YouTube yet
//   scheduled                  on YouTube, private, with a publish time: a defect since 2026-11-12, made public at once
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
// The player shows about the first 40 characters of a title over a Short, so the app's store name or its verified
// search phrase must sit whole inside them (part of a name can be ordinary words: "the data center" is not
// "Data Center: AI Frontier").
export const TITLE_VISIBLE = 40;
const plain = text => String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function titleNamesApp(title, names) {
  const wanted = [names].flat().map(plain).filter(Boolean);
  const shown = plain(String(title ?? '').slice(0, TITLE_VISIBLE));
  return !wanted.length || !title || wanted.some(n => shown.includes(n));
}

// The phrase a profile says a Short ends on, and its rank on the App Store's search (null: no phrase finds the app
// yet, so the phrase is the exact store name and the end card says it is on the App Store).
export function profilePhrase(profile) {
  const sp = profile?.searchPhrase;
  if (typeof sp === 'string') return { phrase: sp, rank: 1 };
  return sp?.phrase ? { phrase: sp.phrase, rank: sp.rank ?? null } : null;
}

// Every reason a made episode cannot be found or should not exist. For a business with no App Store record and no
// profile (Vegas Microworks), its registry name is the name and the phrase.
export function findability(episode, { profile = null, app = null } = {}) {
  if (episode.legacy) return [];
  if (MAKING.includes(episode.status) && !onSale(app, profile)) {
    return [`${episode.id}: ${episode.app} is not on sale, so it gets no Short. Keep it as "idea", or "held" (private, no publish time) if it is on YouTube, until its marketing profile's stage is live`];
  }
  if (!MADE.includes(episode.status)) return [];
  const business = !profile && app && !(app.team || app.ascAppId) ? app.name : null;
  const wanted = profilePhrase(profile);
  const names = [profile?.name ?? business, wanted?.phrase].filter(Boolean);
  const out = [];
  if (names.length && !titleNamesApp(episode.title, names)) out.push(`${episode.id}: the title must name "${names.join('" or "')}" within its first ${TITLE_VISIBLE} characters (the player hides the rest)`);
  const phrase = (episode.searchPhrase ?? business ?? '').trim();
  if (!phrase) return [...out, `${episode.id} has no searchPhrase: add the app's verified phrase (node shorts.mjs phrase ${episode.app})`];
  if (wanted && phrase.toLowerCase() !== wanted.phrase.trim().toLowerCase()) {
    out.push(`${episode.id} ends on "${phrase}", but the profile's phrase is "${wanted.phrase}" (${wanted.rank ? `the store's search finds the app with it, rank ${wanted.rank}` : 'no phrase finds the app yet, so the end card gives this exact store name'})`);
  }
  const first = (episode.description ?? '').split('\n')[0].toLowerCase();
  if (episode.description && !first.includes(phrase.toLowerCase())) out.push(`${episode.id}: the description's first line must give the search phrase "${phrase}"`);
  else if (episode.description && wanted && !wanted.rank && !first.includes('app store')) out.push(`${episode.id}: no phrase finds the app yet, so the description's first line must say "${phrase}" is on the App Store`);
  return out;
}
export const findable = (episode, context) => findability(episode, context)[0] ?? null;

// The written rules as a checklist: each bullet, and each row of a rules table (not the "what worked" table).
export function ruleItems(text) {
  const items = [];
  let heading = '', current = null, header = false;
  for (const line of String(text).split('\n')) {
    if (/^#+\s/.test(line)) { heading = line.toLowerCase(); current = null; continue; }
    if (/^- /.test(line)) { current = line.slice(2).trim(); items.push(current); continue; }
    if (current !== null && /^\s+\S/.test(line)) { items[items.length - 1] = `${items.at(-1)} ${line.trim()}`; continue; }
    current = null;
    if (/^\|/.test(line) && !heading.includes('worked')) {
      if (/^\|[\s|:-]+\|$/.test(line.trim())) { header = false; items.pop(); continue; }
      items.push(line.trim());
    }
  }
  return [...new Set(items)];
}

// A rules checklist (a JSON file the episode names in `rulesChecklist`): every written rule, marked pass, n/a or
// fail, each with the frame or caption that shows it. A Short that fails a rule, or leaves one unmarked, is fixed
// before the taste review, and `record` and `yt-api.mjs upload` refuse it.
export function checklistTemplate(slug, episodeId, text, prior = null) {
  const marked = new Map((prior?.checks ?? []).map(c => [c.rule, c]));
  return { app: slug, episode: episodeId, how: 'Mark each rule "pass", "n/a" or "fail", and give the frame (seconds) or caption that shows it. Fix every fail before the reviewer panel.',
    checks: ruleItems(text).map(rule => marked.get(rule) ?? { rule, result: null, evidence: null }) };
}
// Points an episode at its checklist file, so a Short already made or scheduled gets one without re-running `record`
// (which also wants a music claim that older Shorts never had). Returns false when the registry has no such episode.
export function attachChecklist(registry, episodeId, file) {
  const episode = registry.episodes.find(e => e.id === episodeId);
  if (!episode) return false;
  episode.rulesChecklist = absolute(file);
  return true;
}
export function checklistProblems(episode, text, { read = p => JSON.parse(readFileSync(p, 'utf8')), exists = existsSync } = {}) {
  if (episode.legacy) return [];
  const file = episode.rulesChecklist;
  if (!file) return [`${episode.id} has no rules checklist: run "shorts.mjs rules ${episode.app} --checklist FILE --episode ${episode.id}" (it links FILE to the episode), then mark every rule`];
  if (!exists(file)) return [`${episode.id}: its rules checklist ${file} is missing`];
  const checks = new Map((read(file).checks ?? []).map(c => [c.rule, c]));
  const out = [];
  for (const rule of ruleItems(text)) {
    const c = checks.get(rule), short = rule.length > 90 ? `${rule.slice(0, 90)}…` : rule;
    if (!c) out.push(`${episode.id}: rule not on its checklist (the rules changed; top it up): ${short}`);
    else if (c.result === 'fail') out.push(`${episode.id} breaks a written rule (${c.evidence ?? 'no evidence'}): ${short}`);
    else if (!['pass', 'n/a'].includes(c.result) || !String(c.evidence ?? '').trim()) out.push(`${episode.id}: rule not marked pass or n/a with the frame or caption that shows it: ${short}`);
  }
  return out;
}

// Music beds are claimed when the episode is started, so Shorts made in parallel never share one. A bed is taken
// while a Short using it went public, or was claimed, within this many days.
export const MUSIC_DAYS = 14;
const GONE = ['pulled', 'superseded'];
export function claimMusic(registry, { id, app, music, now = new Date() }) {
  if (!id || !app) throw new Error('A claim needs an episode id and --app');
  const loops = [music ?? ''].flat().join('|').split('|').map(l => l.trim()).filter(Boolean);
  if (!loops.length) throw new Error('Name the music beds: --music "loop|loop"');
  const at = new Date(now);
  const taken = [];
  for (const e of registry.episodes) {
    if (e.id === id || GONE.includes(e.status) || !e.music) continue;
    const when = postedAt(e) ?? e.musicClaimedAt;
    if (!when || Math.abs(new Date(when) - at) > MUSIC_DAYS * DAY) continue;
    for (const loop of loops) if (e.music.toLowerCase().includes(loop.toLowerCase())) taken.push(`"${loop}" (${e.id}, ${e.status}, ${when})`);
  }
  if (taken.length) throw new Error(`Music already used by a Short public or claimed within ${MUSIC_DAYS} days: ${taken.join('; ')}. Pick other beds`);
  const index = registry.episodes.findIndex(e => e.id === id);
  const claim = { music: loops.join(', '), musicClaimedAt: new Date(now).toISOString() };
  if (index < 0) registry.episodes.push({ id, app, status: 'idea', metrics: [], ...claim });
  else registry.episodes[index] = { ...registry.episodes[index], ...claim };
  return { episode: id, claimed: loops };
}

// Adds or merges an episode. Warnings flag what makes a channel look mass-produced: the same music bed or the
// same hook as one of the channel's last few Shorts.
// `checkRules` (the CLI passes one) returns what a rendered or scheduled episode's rules checklist lacks.
export function record(registry, episode, { recent = 6, profile = null, checkRules = null } = {}) {
  if (!episode.id || !episode.app) throw new Error('An episode needs an id and an app');
  if (episode.status && !STATUSES.includes(episode.status)) throw new Error(`Unknown status "${episode.status}"`);
  const index = registry.episodes.findIndex(e => e.id === episode.id);
  const merged = index < 0 ? { status: 'idea', metrics: [], ...episode } : { ...registry.episodes[index], ...episode };
  const refused = findable(merged, { profile, app: registry.apps[merged.app] ?? null });
  if (refused) throw new Error(refused);
  if (!merged.legacy && ['rendered', 'scheduled'].includes(merged.status)) {
    if (merged.music && !merged.musicClaimedAt) throw new Error(`${merged.id}: claim its music first (node shorts.mjs claim ${merged.id} --app ${merged.app} --music "loop|loop")`);
    const missing = checkRules?.(merged) ?? [];
    if (missing.length) throw new Error(missing.join('\n'));
  }
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

// Whether an app is retired from Short-making: youtube-growth's evaluate.mjs records `shortsRetired` after three
// no-effect Shorts in a row, and only a later `shortsReturn` (a new version, a format that lifted elsewhere) undoes it.
export function retiredFromShorts(app) {
  const at = app?.shortsRetired?.at;
  return Boolean(at) && !(app.shortsReturn?.at && Date.parse(app.shortsReturn.at) > Date.parse(at));
}

export function status(registry, { now = new Date(), profiles = [] } = {}) {
  return Object.entries(registry.apps).map(([slug, a]) => {
    const selling = onSale(a, profileFor(profiles, slug));
    const mine = registry.episodes.filter(e => e.app === slug);
    const counts = Object.fromEntries(STATUSES.map(s => [s, mine.filter(e => e.status === s).length]).filter(([, n]) => n));
    const posted = mine.filter(onChannel).map(postedAt).filter(Boolean).sort().pop() ?? null;
    const next = posted ? new Date(new Date(posted).getTime() + (a.cadenceDays ?? 7) * DAY).toISOString().slice(0, 10) : 'now';
    const retired = retiredFromShorts(a);
    return { app: slug, active: a.active !== false, onSale: selling, formats: a.formats?.length ?? 0, ...counts, liveOrScheduled: mine.some(onChannel),
      lastPost: posted, ...(retired ? { retired: a.shortsRetired.why } : {}),
      nextDue: a.active === false || !selling || retired ? null : next < now.toISOString().slice(0, 10) ? 'now' : next };
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

// The store's search page rate-limits (429) after a few queries (2026-11-12), so wait and try again before giving up.
export async function checkPhrase(phrase, appId, { fetcher = fetch, waits = [10000, 30000], sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetcher(`https://apps.apple.com/us/iphone/search?term=${encodeURIComponent(phrase)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) return searchRank(await res.text(), appId);
    if (![429, 503].includes(res.status) || attempt >= waits.length) throw new Error(`App Store search answered ${res.status}`);
    await sleep(waits[attempt]);
  }
}

// The app's name on the App Store (Apple's public lookup), or null.
export async function storeName(appId, { fetcher = fetch } = {}) {
  if (!appId) return null;
  const res = await fetcher(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=us`);
  if (!res.ok) return null;
  return (await res.json()).results?.[0]?.trackName ?? null;
}

// How a Short ends (app-shorts, Rules, "Every Short says how to find the app"): a phrase the store's search finds
// the app with, or, when none does yet, the exact store name and that it is on the App Store.
export const endCard = (text, rank) => (rank ? `Search '${text}' on the App Store.` : `${text}, on the App Store.`);

// The phrase a Short gives: the profile's searchPhrase when app-marketing has set one (it checks it daily), else the
// first candidate the store ranks first, else the best-ranked one. Candidates: --try, the store name, its part
// before a colon, the store name without punctuation, the registry and profile names.
export async function phrase(registry, slug, { profiles = [], tries = [], fetcher = fetch, waits, sleep } = {}) {
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
    // One refused query (rate limit, outage) is recorded and the next candidate is tried; it never ends the check.
    let rank = null, error;
    try { rank = app.ascAppId ? await checkPhrase(candidate, app.ascAppId, { fetcher, waits, sleep }) : null; } catch (e) { error = e.message; }
    checked.push({ phrase: candidate, rank, ...(error ? { error } : {}) });
    if (rank === 1) return { app: slug, phrase: candidate, rank, ending: 'search', endCard: endCard(candidate, rank), source: candidate === fromProfile ? 'profile' : 'checked', checked };
  }
  const best = checked.filter(c => c.rank).sort((a, b) => a.rank - b.rank)[0];
  if (best) return { app: slug, phrase: best.phrase, rank: best.rank, ending: 'search', endCard: endCard(best.phrase, best.rank), source: 'checked', checked };
  return { app: slug, phrase: store, rank: null, ending: 'name', endCard: endCard(store, null), source: 'store name: no phrase finds the app today', checked };
}

// The pre-publish check of every scheduled Short in the registry, whether or not it has a marketing profile: on
// sale, title, phrase, a passing rules checklist against today's rules, and the business's banned words in its
// title, description, tags and captions. Shorts are never scheduled (James, 2026-11-12: "if you wanted to test a
// short you should have released it right away"), so one left scheduled more than an hour ahead is a defect.
export const SCHEDULED_GRACE_MS = 3600000;
export function check(registry, { profiles = [], sources = null, rulesFor = slug => rules(slug, { profiles, sources }), checklist = checklistProblems, now = new Date() } = {}) {
  const config = sources ?? JSON.parse(readFileSync(join(SKILL, 'assets', 'rule-sources.json'), 'utf8'));
  return registry.episodes.filter(e => e.status === 'scheduled').sort((a, b) => String(a.publishAt).localeCompare(String(b.publishAt))).map(e => {
    const profile = profileFor(profiles, e.app), pack = rulesFor(e.app);
    const words = config.banned?.[e.app] ?? [];
    const text = [e.title, e.description, ...(e.tags ?? []), ...[e.captions ?? []].flat().map(c => (typeof c === 'string' ? c : c?.text))].filter(Boolean).join('\n');
    const hits = words.filter(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
    const problems = [...findability({ ...e, legacy: false }, { profile, app: registry.apps[e.app] ?? null }),
      ...pack.missing.map(m => `${e.id}: missing rule source: ${m}`), ...checklist({ ...e, legacy: false }, pack.text),
      ...(hits.length ? [`${e.id} uses words its business's rules forbid: ${hits.join(', ')}`] : []),
      ...(e.publishAt && Date.parse(e.publishAt) - now.getTime() > SCHEDULED_GRACE_MS ? [`${e.id} is scheduled for ${e.publishAt}, more than an hour ahead: a defect. Make it public now (yt-api.mjs publish --episode ${e.id} --confirm) if everything else passes, or hold it`] : [])];
    return { episode: e.id, app: e.app, publishAt: e.publishAt ?? null, profile: profile ? profile.id : 'none: checked against its business rules', ok: !problems.length, problems };
  });
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

// One writer at a time: makers run in parallel, so a write command holds this lock from read to write.
function lock(path, { waitMs = 60000 } = {}) {
  const file = `${path}.lock`, until = Date.now() + waitMs;
  mkdirSync(dirname(path), { recursive: true });
  for (;;) {
    try { closeSync(openSync(file, 'wx')); return () => { try { unlinkSync(file); } catch {} }; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    try { if (Date.now() - statSync(file).mtimeMs > 120000) { unlinkSync(file); continue; } } catch {}
    if (Date.now() > until) throw new Error(`The registry is locked (${file}); another maker is writing`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }
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
  const profiles = loadProfiles(option('--profiles', PROFILES));
  const tries = (option('--try', '') ?? '').split('|').filter(Boolean);
  const checklistFile = option('--checklist', null), episodeId = option('--episode', null);
  const claimApp = option('--app', null), music = option('--music', null);
  if (args.includes('--publish-at')) { console.error('Shorts are never scheduled: a finished Short that passes check goes public now'); process.exit(2); }
  const [command, ...rest] = args;
  const writes = ['sync', 'record', 'claim'].includes(command) || (command === 'rules' && checklistFile && episodeId);
  const unlock = writes ? lock(path) : () => {};
  const registry = load(path);
  const print = value => console.log(JSON.stringify(value, null, 2));
  const checkRules = episode => checklistProblems(episode, rules(episode.app, { profiles }).text);
  try {
  switch (command) {
    case 'roster': print(roster(code)); break;
    case 'sync': { const added = sync(registry, roster(code)); save(path, registry); print({ added, apps: Object.keys(registry.apps).length }); break; }
    case 'record': {
      const episode = JSON.parse(readFileSync(rest[0], 'utf8'));
      const app = episode.app ?? registry.episodes.find(e => e.id === episode.id)?.app;
      const result = record(registry, episode, { profile: profileFor(profiles, app), checkRules }); save(path, registry); print(result); break;
    }
    case 'claim': { const result = claimMusic(registry, { id: rest[0], app: claimApp, music, now }); save(path, registry); print(result); break; }
    case 'check': {
      const results = check(registry, { profiles, now });
      print(results);
      const bad = results.filter(r => !r.ok);
      console.error(`${results.length} scheduled Shorts checked: ${results.length - bad.length} pass, ${bad.length} fail${bad.length ? ` (${bad.map(r => r.episode).join(', ')})` : ''}`);
      if (bad.length) process.exitCode = 1;
      break;
    }
    case 'phrase': print(await phrase(registry, rest[0], { profiles, tries })); break;
    case 'views': print(views(registry, { profiles })); break;
    case 'rules': {
      const r = rules(rest[0], { profiles });
      if (checklistFile) {
        const prior = existsSync(checklistFile) ? JSON.parse(readFileSync(checklistFile, 'utf8')) : null;
        const list = checklistTemplate(rest[0], episodeId ?? prior?.episode ?? null, r.text, prior);
        writeFileSync(checklistFile, JSON.stringify(list, null, 2) + '\n');
        const linked = episodeId && attachChecklist(registry, episodeId, checklistFile);
        if (linked) save(path, registry);
        console.log(`wrote ${list.checks.length} rules to ${checklistFile} (${list.checks.filter(c => !c.result).length} unmarked)${linked ? `; ${episodeId}'s rulesChecklist points to it` : episodeId ? `; no episode "${episodeId}" in the registry to link it to` : ''}`);
      } else console.log(r.text);
      if (r.missing.length) { console.error(`Missing rule sources: ${r.missing.join('; ')}`); process.exitCode = 1; }
      break;
    }
    case 'plan': console.error('plan is gone: Shorts are never scheduled into slots. A finished Short goes public at once; youtube-growth evaluate.mjs lists the apps to produce'); process.exitCode = 2; break;
    case 'due': print(due(registry, { now, profiles })); break;
    case 'link': print(link(registry, rest[0], rest[1] ?? 'youtube-shorts')); break;
    case 'status': print(status(registry, { now, profiles })); break;
    default:
      console.error('usage: node shorts.mjs roster|sync|record <episode.json>|phrase <app> [--try "a|b"]|claim <episode> --app A --music "a|b"|check|views|rules <app> [--checklist FILE --episode ID]|due|link <app> <campaign>|status [--registry PATH] [--profiles DIR] [--now ISO]');
      process.exitCode = 2;
  }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    unlock();
  }
}
