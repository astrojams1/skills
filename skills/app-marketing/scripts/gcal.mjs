#!/usr/bin/env node
// gcal.mjs
// The owner's Google Calendar (primary calendar of astrojams1@gmail.com) for Show HN timing: find a weekday morning
// they are free, put a heads-up event on it, check it is still free before posting, and add the thread link after.
// Credentials live in the 1Password item "Google Calendar" (vault "API Tokens"): `refresh token`, written by `auth`.
// `client id` and `client secret` come from that item, or else from "YouTube API", whose Desktop OAuth client lives
// in the same Google Cloud project. Values never reach output, arguments or logs. Node 22, no dependencies.
//
//   node gcal.mjs check                          which fields exist (no values), whether they work, which calendar
//   node gcal.mjs auth [--print-url] [--token-file PATH]   one-time consent; stores the refresh token in 1Password,
//                                                or, when the service account is read-only, writes it to --token-file for the owner
//   node gcal.mjs slot [--json]                  the first free weekday window (9-11 Pacific, 24+ hours ahead, 14 days)
//   node gcal.mjs booked [--day YYYY-MM-DD]      Show HN events on that Pacific day (default today), and whether the
//                                                owner is still free around them
//   node gcal.mjs book --app ID --start ISO --title T --description-file F [--confirm]   add the heads-up event
//   node gcal.mjs note --event ID --text T [--confirm]   append a line (the thread link) to the event's description
//   node gcal.mjs cancel --event ID [--confirm]  remove a Show HN event this tool made (refuses any other event)
//
// Scope: calendar.events (read events to judge free time, write only the events this tool makes).

import { readFileSync, writeFileSync, mkdtempSync, rmSync, chmodSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ITEM = 'Google Calendar', CLIENT_ITEM = 'YouTube API', VAULT = 'API Tokens';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const API = 'https://www.googleapis.com/calendar/v3/calendars/primary';
export const TZ = 'America/Los_Angeles';
export const WINDOW = { hour: 9, hours: 2, leadHours: 24, days: 14 };
export const TAG = { appMarketing: 'show-hn' };
const HOUR = 3600000, DAY = 24 * HOUR;

// ---- time ----

// offset is how far the zone's wall clock is ahead of UTC at instant t.
function offset(t, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
}

// zoned returns the instant of a wall-clock time (date YYYY-MM-DD, hour) in a time zone, across daylight saving.
export function zoned(ymd, hour, tz = TZ) {
  const [y, m, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  const first = guess - offset(guess, tz);
  return guess - offset(first, tz);
}

// localDay is the YYYY-MM-DD date in the time zone at instant t.
export const localDay = (t, tz = TZ) => new Date(t + offset(t, tz)).toISOString().slice(0, 10);

// windows lists the weekday posting windows, each starting at least leadHours after now.
export function windows(now, { hour, hours, leadHours, days } = WINDOW, tz = TZ) {
  const [y, m, d] = localDay(now, tz).split('-').map(Number);
  const out = [];
  for (let i = 0; i <= days; i += 1) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
    const start = zoned(day.toISOString().slice(0, 10), hour, tz);
    if (start - now >= leadHours * HOUR) out.push({ start, end: start + hours * HOUR });
  }
  return out;
}

// busy turns calendar events into busy intervals. Every timed event counts, even one marked "free": the owner's
// calendar marks real plans free too. Free time ignores this tool's own events, cancelled events, invitations the
// owner declined, and all-day events marked free (birthdays, holidays). An all-day event marked busy counts.
export function busy(events, tz = TZ) {
  const at = v => v.dateTime ? Date.parse(v.dateTime) : zoned(v.date, 0, tz);
  return events.filter(e => e.status !== 'cancelled' && !(e.start?.date && e.transparency === 'transparent')
    && e.extendedProperties?.private?.appMarketing !== TAG.appMarketing
    && !(e.attendees || []).some(a => a.self && a.responseStatus === 'declined'))
    .map(e => ({ start: at(e.start), end: at(e.end), summary: e.summary || '' }));
}

export const isFree = (window, intervals) => !intervals.some(b => b.start < window.end && b.end > window.start);
export const firstFree = (list, intervals) => list.find(w => isFree(w, intervals)) || null;

// ---- credentials ----

function vaultEnv() {
  const token = readFileSync('/Volumes/ssd/1password-token.md', 'utf8').match(/ops_[A-Za-z0-9_-]+/)?.[0];
  if (!token) throw new Error('The documented token file holds no service-account token');
  return { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token };
}
function readItem(title) {
  const got = spawnSync('op', ['item', 'get', title, '--vault', VAULT, '--format', 'json'], { env: vaultEnv(), encoding: 'utf8' });
  return got.status === 0 ? JSON.parse(got.stdout) : null;
}
const field = (item, label) => item?.fields?.find(f => (f.label ?? '').toLowerCase() === label)?.value || null;

function client() {
  const own = readItem(ITEM), shared = readItem(CLIENT_ITEM);
  const id = field(own, 'client id') || field(shared, 'client id');
  const secret = field(own, 'client secret') || field(shared, 'client secret');
  return { own, id, secret, refresh: field(own, 'refresh token') };
}

// storeRefreshToken creates or edits the item through a private template file, so the value never appears in an argument.
function storeRefreshToken(token) {
  const own = readItem(ITEM);
  const item = own || { title: ITEM, category: 'API_CREDENTIAL', fields: [] };
  const existing = item.fields.find(f => (f.label ?? '').toLowerCase() === 'refresh token');
  if (existing) existing.value = token;
  else item.fields.push({ label: 'refresh token', type: 'CONCEALED', value: token });
  const dir = mkdtempSync(join(tmpdir(), 'gcal-'));
  chmodSync(dir, 0o700);
  try {
    writeFileSync(join(dir, 'item.json'), JSON.stringify(item), { mode: 0o600 });
    const args = own ? ['item', 'edit', own.id, '--vault', VAULT, `--template=${join(dir, 'item.json')}`]
      : ['item', 'create', '--vault', VAULT, `--template=${join(dir, 'item.json')}`];
    const done = spawnSync('op', args, { env: vaultEnv(), encoding: 'utf8' });
    if (done.status !== 0) throw new Error('Storing the refresh token failed (the service account may be read-only): ' + done.stderr.split('\n')[0]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function accessToken() {
  const { id, secret, refresh } = client();
  if (!id || !secret || !refresh) throw new Error('Google Calendar is not connected: run `check`, then `auth`');
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${body.error ?? res.status}`);
  return body.access_token;
}

async function api(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(path.startsWith('http') ? path : API + path, { method, headers: { authorization: `Bearer ${token}`,
    ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (method === 'DELETE' && res.ok) return {};
  const json = await res.json();
  if (!res.ok) throw new Error(`Calendar API ${method} answered ${res.status}: ${json.error?.message ?? ''}`);
  return json;
}

// calendarId names the primary calendar (the owner's address) from an events listing, which calendar.events allows.
const calendarId = async token => (await api(token, '/events?maxResults=1')).summary;

async function events(token, from, to, extra = '') {
  const q = new URLSearchParams({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), singleEvents: 'true',
    orderBy: 'startTime', maxResults: '2500' });
  return (await api(token, `/events?${q}${extra}`)).items || [];
}

async function authFlow({ printUrl, tokenFile }) {
  const { id, secret } = client();
  if (!id || !secret) throw new Error(`No OAuth client: "${CLIENT_ITEM}" or "${ITEM}" in "${VAULT}" needs client id and client secret`);
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('hex');
  let redirect;
  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.searchParams.get('state') !== state) { res.end('Unexpected request'); return; }
      res.end('Google Calendar connected for app marketing. You can close this tab.');
      server.close();
      u.searchParams.get('code') ? resolve(u.searchParams.get('code')) : reject(new Error(u.searchParams.get('error') ?? 'No code returned'));
    }).listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${server.address().port}`;
      const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: id, redirect_uri: redirect,
        response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state,
        code_challenge: challenge, code_challenge_method: 'S256', login_hint: 'astrojams1@gmail.com' });
      if (printUrl) { console.log(url); return; }
      console.log('Opening the consent page. Sign in as astrojams1@gmail.com and allow access.');
      spawnSync('open', [url]);
    });
    setTimeout(() => { server.close(); reject(new Error('No consent within 10 minutes')); }, 600000).unref();
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: id, client_secret: secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect }) });
  const body = await res.json();
  if (!res.ok || !body.refresh_token) throw new Error(`Token exchange failed: ${body.error ?? res.status}`);
  let stored = false;
  try { storeRefreshToken(body.refresh_token); stored = true; } catch (error) { console.error(error.message); }
  const calendar = await calendarId(body.access_token).catch(() => 'the owner');
  if (!stored) {
    if (!tokenFile) throw new Error('Not stored, and no --token-file to fall back to: run auth again with one');
    writeFileSync(tokenFile, [
      'Add this to 1Password, then delete this file.', '',
      `Vault: ${VAULT}`, `Item: a new API Credential named exactly "${ITEM}"`,
      'Field: a password field named exactly "refresh token", with this value:', '', body.refresh_token, '',
      `It lets the app-marketing skill read and add events on ${calendar}'s calendar. Revoke it any time at`,
      'https://myaccount.google.com/connections', ''].join('\n'), { mode: 0o600 });
  }
  console.log(JSON.stringify({ connected: true, calendar, stored: stored ? '1Password' : tokenFile }));
}

// ---- commands ----

function option(args, name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; }
const pt = t => new Date(t).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

async function main(args) {
  const [command] = args;
  const confirm = args.includes('--confirm');
  if (command === 'check') {
    const { own, id, secret, refresh } = client();
    let calendar = null, works = false;
    if (id && secret && refresh) { calendar = await calendarId(await accessToken()); works = true; }
    return console.log(JSON.stringify({ item: Boolean(own), clientId: Boolean(id), clientSecret: Boolean(secret), refreshToken: Boolean(refresh), works, calendar }));
  }
  if (command === 'auth') return authFlow({ printUrl: args.includes('--print-url'), tokenFile: option(args, '--token-file') });
  const token = await accessToken();
  if (command === 'slot') {
    const now = Date.now();
    const list = windows(now);
    const intervals = busy(await events(token, now, list.length ? list[list.length - 1].end : now + DAY));
    const slot = firstFree(list, intervals);
    const out = slot ? { free: true, start: new Date(slot.start).toISOString(), end: new Date(slot.end).toISOString(), local: pt(slot.start) }
      : { free: false, reason: `no free weekday ${WINDOW.hour}:00 window in the next ${WINDOW.days} days` };
    return console.log(args.includes('--json') ? JSON.stringify(out) : (slot ? `free: ${out.local} Pacific (${out.start})` : out.reason));
  }
  if (command === 'booked') {
    const day = option(args, '--day') || localDay(Date.now());
    const from = zoned(day, 0), to = zoned(day, 24);
    const all = await events(token, from, to);
    const intervals = busy(all);
    const mine = all.filter(e => e.extendedProperties?.private?.appMarketing === TAG.appMarketing && e.status !== 'cancelled').map(e => {
      const w = { start: Date.parse(e.start.dateTime), end: Date.parse(e.end.dateTime) };
      return { id: e.id, app: e.extendedProperties.private.app, start: e.start.dateTime, end: e.end.dateTime, stillFree: isFree(w, intervals),
        clashes: intervals.filter(b => b.start < w.end && b.end > w.start).map(b => b.summary) };
    });
    return console.log(JSON.stringify({ day, booked: mine }, null, 2));
  }
  if (command === 'book') {
    const app = option(args, '--app'), title = option(args, '--title'), file = option(args, '--description-file');
    const start = Date.parse(option(args, '--start') || '');
    if (!app || !title || !file || Number.isNaN(start)) throw new Error('book needs --app, --start ISO, --title and --description-file');
    const end = start + WINDOW.hours * HOUR;
    const existing = (await events(token, Date.now(), Date.now() + 30 * DAY, `&privateExtendedProperty=${encodeURIComponent(`app=${app}`)}`))
      .filter(e => e.extendedProperties?.private?.appMarketing === TAG.appMarketing);
    if (existing.length) throw new Error(`Already booked for ${app}: ${existing[0].start.dateTime} (${existing[0].id})`);
    if (!isFree({ start, end }, busy(await events(token, start, end)))) throw new Error('That window is no longer free');
    const event = { summary: title, description: readFileSync(file, 'utf8'), start: { dateTime: new Date(start).toISOString(), timeZone: TZ },
      end: { dateTime: new Date(end).toISOString(), timeZone: TZ }, extendedProperties: { private: { ...TAG, app } },
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 15 }] } };
    if (!confirm) return console.log(JSON.stringify({ dryRun: true, ...event, description: `${event.description.length} characters` }, null, 2));
    const made = await api(token, '/events', { method: 'POST', body: event });
    return console.log(JSON.stringify({ booked: true, id: made.id, link: made.htmlLink, start: made.start.dateTime }));
  }
  if (command === 'note' || command === 'cancel') {
    const id = option(args, '--event');
    if (!id) throw new Error(`${command} needs --event ID`);
    const event = await api(token, `/events/${encodeURIComponent(id)}`);
    if (event.extendedProperties?.private?.appMarketing !== TAG.appMarketing) throw new Error('Refused: that event was not made by this tool');
    if (command === 'note') {
      const text = option(args, '--text');
      if (!text) throw new Error('note needs --text');
      if (!confirm) return console.log(JSON.stringify({ dryRun: true, append: text }));
      await api(token, `/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: { description: `${event.description || ''}\n\n${text}` } });
      return console.log(JSON.stringify({ noted: true, id }));
    }
    if (!confirm) return console.log(JSON.stringify({ dryRun: true, cancel: id, start: event.start.dateTime }));
    await api(token, `/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return console.log(JSON.stringify({ cancelled: true, id }));
  }
  throw new Error('Usage: gcal.mjs check|auth|slot|booked|book|note|cancel');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exit(1); });
}
