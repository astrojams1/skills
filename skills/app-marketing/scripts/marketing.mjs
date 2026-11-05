#!/usr/bin/env node
// marketing.mjs
// The state of the app-marketing loop. Strategy lives in one profile per app (marketing/apps/<id>.json in the
// app-sites repository); everything that happens is an append-only line in marketing/ledger.jsonl; numbers are
// append-only lines in marketing/metrics.jsonl. A backlog item's state is never stored: it is derived from the newest
// ledger event naming it, so two runs cannot disagree and history cannot be edited away. Node 22, no dependencies.
//
//   node marketing.mjs check                        validate profiles, ledger and metrics; exit 1 on any problem
//   node marketing.mjs status                       per app: stage, numbers, what shipped, what is open
//   node marketing.mjs next [--runner cloud|mac] [--limit N] [--json]   the open items worth doing now, best first
//   node marketing.mjs log [FILE]                   append one event (JSON from FILE or stdin), adding v, ts, skill
//   node marketing.mjs public [--write]             App Store ratings, version, price and stage for every app (no keys)
//   node marketing.mjs pull [--write]               Mac only: App Store downloads and page views through Apple's API
//   node marketing.mjs promo --app ID --text TEXT [--confirm]   Mac only: promotional text on the live version
//   node marketing.mjs board                        regenerate marketing/LEDGER.md from the ledger
//   node marketing.mjs mirror                       Mac only: copy new events into the shared activity ledger
//
// --root PATH names the app-sites checkout (default: the git top level of the working directory).

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVENTS = ['start', 'action', 'finding', 'verify', 'end'];
export const STATUSES = ['running', 'ok', 'failed', 'skipped', 'deferred', 'partial'];
export const STAGES = ['prelaunch', 'live'];
export const RUNNERS = ['cloud', 'mac'];
const REQUIRED = ['v', 'ts', 'run_id', 'skill', 'agent', 'event', 'status'];
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

// eventProblems returns what is wrong with one ledger event.
export function eventProblems(event) {
  const problems = REQUIRED.filter(key => event[key] === undefined || event[key] === '').map(key => `missing ${key}`);
  if (event.v !== undefined && event.v !== 1) problems.push('v must be 1');
  if (event.event && !EVENTS.includes(event.event)) problems.push(`unknown event ${event.event}`);
  if (event.status && !STATUSES.includes(event.status)) problems.push(`unknown status ${event.status}`);
  if (event.ts && Number.isNaN(Date.parse(event.ts))) problems.push('ts is not a date');
  if (event.retry_after && Number.isNaN(Date.parse(event.retry_after))) problems.push('retry_after is not a date');
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
  }
  return problems;
}

// itemState derives a backlog item's state from the ledger. The newest event naming the item decides: `ok` finishes it
// (until repeat_days pass for recurring work), `deferred` or `failed` parks it until retry_after (default three days),
// `skipped` with `dropped: true` retires it, and anything else leaves it open.
export function itemState(item, events, app, now = Date.now()) {
  const mine = events.filter(e => e.app === app && e.item === item.id && e.status !== 'running');
  const last = mine[mine.length - 1];
  if (!last) return { state: 'open', last: null };
  const at = Date.parse(last.ts);
  if (last.status === 'skipped' && last.dropped) return { state: 'dropped', last };
  if (last.status === 'ok' || last.status === 'partial') {
    if (item.repeat_days && now - at >= item.repeat_days * DAY) return { state: 'open', last };
    return { state: item.repeat_days ? 'resting' : 'done', last };
  }
  if (last.status === 'deferred' || last.status === 'failed' || last.status === 'skipped') {
    const until = last.retry_after ? Date.parse(last.retry_after) : at + 3 * DAY;
    return now >= until ? { state: 'open', last } : { state: 'parked', last };
  }
  return { state: 'open', last };
}

// rank orders the open items across apps by expected downloads per unit of work. Each app's `weight` is its share of
// attention, and an app that was worked on recently waits behind one that was not, so no app starves.
export function rank(profiles, events, { runner, now = Date.now() } = {}) {
  const items = [];
  for (const profile of profiles) {
    const appEvents = events.filter(e => e.app === profile.id && e.item && e.status === 'ok');
    const lastWorked = appEvents.length ? Date.parse(appEvents[appEvents.length - 1].ts) : 0;
    const idleDays = lastWorked ? Math.min((now - lastWorked) / DAY, 7) : 7;
    for (const item of profile.backlog) {
      if (runner && item.runner !== runner) continue;
      if (item.requires && item.requires !== profile.stage) continue;
      if (item.after && !item.after.every(id => itemState(profile.backlog.find(b => b.id === id) || { id }, events, profile.id, now).state === 'done' || itemState(profile.backlog.find(b => b.id === id) || { id }, events, profile.id, now).state === 'resting')) continue;
      if (itemState(item, events, profile.id, now).state !== 'open') continue;
      const score = (item.impact / item.effort) * (profile.weight || 1) * (1 + idleDays / 7);
      items.push({ app: profile.id, id: item.id, title: item.title, channel: item.channel, runner: item.runner, score: Math.round(score * 100) / 100, how: item.how });
    }
  }
  return items.sort((a, b) => b.score - a.score || a.app.localeCompare(b.app) || a.id.localeCompare(b.id));
}

// downloadRows totals one "App Downloads" report: first-time downloads and redownloads by day, and first-time
// downloads by source. The report is tab separated; Apple's column names are matched loosely in case of case changes.
export function downloadRows(tsv) {
  const [head, ...lines] = tsv.trim().split('\n');
  const columns = head.split('\t').map(c => c.trim().toLowerCase());
  const col = name => columns.indexOf(name);
  const [date, type, source, counts] = [col('date'), col('download type'), col('source type'), col('counts')];
  if (date < 0 || counts < 0) throw new Error('The downloads report has no Date or Counts column');
  const out = { days: {}, sources: {} };
  for (const line of lines) {
    const cell = line.split('\t');
    const count = Number(cell[counts]) || 0;
    const kind = String(cell[type] || '').toLowerCase();
    const day = (out.days[cell[date]] ||= { first: 0, re: 0 });
    if (kind.includes('first')) {
      day.first += count;
      const from = cell[source] || 'Unknown';
      out.sources[from] = (out.sources[from] || 0) + count;
    } else if (kind.includes('redownload')) day.re += count;
  }
  return out;
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

// appendEvent stamps, validates and appends one event.
export function appendEvent(root, input) {
  const event = { v: 1, ts: new Date().toISOString(), skill: 'app-marketing', ...input };
  const problems = eventProblems(event);
  if (problems.length) throw new Error('Not logged: ' + problems.join('; '));
  appendFileSync(join(dirOf(root), 'ledger.jsonl'), JSON.stringify(event) + '\n');
  return event;
}

// ---- commands ----

function cmdCheck(root) {
  const problems = [];
  const profiles = loadProfiles(root);
  profiles.forEach(p => problems.push(...profileProblems(p)));
  const ledger = loadJsonl(join(dirOf(root), 'ledger.jsonl'), 'ledger');
  problems.push(...ledger.problems);
  ledger.records.forEach((e, i) => eventProblems(e).forEach(p => problems.push(`ledger line ${i + 1}: ${p}`)));
  const ids = new Set(profiles.map(p => p.id));
  ledger.records.forEach((e, i) => { if (e.app && e.app !== 'all' && !ids.has(e.app)) problems.push(`ledger line ${i + 1}: unknown app ${e.app}`); });
  const metrics = loadJsonl(join(dirOf(root), 'metrics.jsonl'), 'metrics');
  problems.push(...metrics.problems);
  metrics.records.forEach((m, i) => { if (!m.at || !m.app || !m.source) problems.push(`metrics line ${i + 1}: needs at, app and source`); });
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`ok: ${profiles.length} apps, ${ledger.records.length} events, ${metrics.records.length} snapshots`);
}

// latest merges an app's newest value of every metric, newest snapshot winning.
export function latest(metrics, app) {
  const merged = {};
  for (const m of metrics.filter(x => x.app === app)) Object.assign(merged, m.values);
  return merged;
}

function summary(profiles, events, metrics) {
  return profiles.map(p => {
    const states = p.backlog.map(i => ({ ...i, ...itemState(i, events, p.id) }));
    const count = s => states.filter(i => i.state === s).length;
    return { id: p.id, name: p.name, stage: p.stage, numbers: latest(metrics, p.id), done: count('done') + count('resting'), open: count('open'), parked: count('parked'), states };
  });
}

function cmdStatus(root) {
  const events = loadEvents(root);
  for (const app of summary(loadProfiles(root), events, loadMetrics(root))) {
    console.log(`${app.name} (${app.stage}): ${app.done} done, ${app.open} open, ${app.parked} parked`);
    console.log('  numbers: ' + (JSON.stringify(app.numbers) === '{}' ? 'none yet' : JSON.stringify(app.numbers)));
  }
  const last = events[events.length - 1];
  console.log('last event: ' + (last ? `${last.ts} ${last.run_id} ${last.event} ${last.status}` : 'none'));
}

function cmdNext(root, args) {
  const items = rank(loadProfiles(root), loadEvents(root), { runner: args.runner }).slice(0, Number(args.limit) || 10);
  if (args.json) return console.log(JSON.stringify(items, null, 2));
  items.forEach(i => console.log(`${String(i.score).padStart(6)}  ${i.app}/${i.id} [${i.runner}, ${i.channel}]  ${i.title}`));
  if (!items.length) console.log('Nothing open for this runner: add ideas to a profile\'s backlog.');
}

function cmdLog(root, file) {
  const text = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
  const event = appendEvent(root, JSON.parse(text));
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

async function reportText(api, requestId, name, sinceDay) {
  const reports = (await api(`/v1/analyticsReportRequests/${requestId}/reports?filter[name]=${encodeURIComponent(name)}&limit=5`)).data || [];
  if (!reports.length) return [];
  const instances = (await api(`/v1/analyticsReports/${reports[0].id}/instances?filter[granularity]=DAILY&limit=60`)).data || [];
  const texts = [];
  for (const instance of instances.filter(i => !sinceDay || i.attributes.processingDate > sinceDay)) {
    const segments = (await api(`/v1/analyticsReportInstances/${instance.id}/segments?limit=20`)).data || [];
    for (const segment of segments) {
      const res = await fetch(segment.attributes.url);
      if (res.ok) texts.push(gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8'));
    }
  }
  return texts;
}

async function cmdPull(root, args) {
  const profiles = loadProfiles(root).filter(p => p.appStoreId && p.ascVault && p.stage === 'live');
  const previous = loadMetrics(root);
  for (const p of profiles) {
    const api = ascClient(p.ascVault);
    const request = await analyticsRequest(api, p.appStoreId);
    if (request.created) console.log(`${p.id}: analytics report request created; Apple's first reports take a day or two`);
    const seen = previous.filter(m => m.app === p.id && m.source === 'asc-analytics').map(m => m.throughDay).filter(Boolean).sort().pop();
    const texts = await reportText(api, request.id, 'App Downloads Standard', seen);
    if (!texts.length) { console.log(`${p.id}: no new downloads report yet`); continue; }
    const totals = { days: {}, sources: {} };
    for (const text of texts) {
      const part = downloadRows(text);
      for (const [day, v] of Object.entries(part.days)) { const t = (totals.days[day] ||= { first: 0, re: 0 }); t.first += v.first; t.re += v.re; }
      for (const [from, v] of Object.entries(part.sources)) totals.sources[from] = (totals.sources[from] || 0) + v;
    }
    const days = Object.keys(totals.days).sort();
    const before = latest(previous, p.id).downloads || 0;
    const added = days.reduce((sum, d) => sum + totals.days[d].first, 0);
    const line = { at: new Date().toISOString(), app: p.id, source: 'asc-analytics', throughDay: days[days.length - 1], values: { downloads: before + added, downloadsAdded: added, sources: totals.sources }, days: totals.days };
    if (args.write) appendFileSync(join(dirOf(root), 'metrics.jsonl'), JSON.stringify(line) + '\n');
    console.log(JSON.stringify({ app: p.id, ...line.values, throughDay: line.throughDay }));
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

// ---- reports ----

export function renderBoard(profiles, events, metrics) {
  const apps = summary(profiles, events, metrics);
  const cell = value => (value === undefined || value === null ? 'not yet read' : String(value));
  const lines = ['# Marketing ledger', '', 'Generated by `marketing.mjs board` from `ledger.jsonl` and `metrics.jsonl`; never edit this view.', '', '## Scoreboard', '',
    '| App | Stage | Downloads | Rating | Ratings | Shorts views | Done | Open | Parked |', '|---|---|---|---|---|---|---|---|---|'];
  for (const a of apps) {
    const n = a.numbers;
    lines.push(`| ${a.name} | ${a.stage} | ${cell(n.downloads)} | ${n.ratingCount ? n.rating.toFixed(2) : 'none yet'} | ${cell(n.ratingCount)} | ${cell(n.shortsViews)} | ${a.done} | ${a.open} | ${a.parked} |`);
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

function cmdBoard(root) {
  writeFileSync(join(dirOf(root), 'LEDGER.md'), renderBoard(loadProfiles(root), loadEvents(root), loadMetrics(root)));
  console.log('wrote marketing/LEDGER.md');
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
    const { app, channel, item, retry_after, dropped, ...rest } = event;
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
    check: () => cmdCheck(root), status: () => cmdStatus(root), next: () => cmdNext(root, args), log: () => cmdLog(root, file),
    public: () => cmdPublic(root, args), pull: () => cmdPull(root, args), promo: () => cmdPromo(root, args),
    board: () => cmdBoard(root), mirror: () => cmdMirror(root)
  };
  if (!commands[command]) throw new Error(`Usage: marketing.mjs ${Object.keys(commands).join('|')}`);
  await commands[command]();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exit(1); });
}
