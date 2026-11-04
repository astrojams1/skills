#!/usr/bin/env node
// yt-api.mjs
// The YouTube APIs for the growth loop: one-time OAuth for the owner's channel, analytics snapshots for Shorts into
// the app-shorts registry, and new comments to mine for episodes. Credentials live in the 1Password item
// "YouTube API" (vault "API Tokens"): `client id` and `client secret` from a Google Cloud OAuth client of type
// Desktop app, and `refresh token`, which `auth` writes. Values never reach output, arguments or logs. Node 22.
//
//   node yt-api.mjs check                       which credential fields exist (no values) and whether they work
//   node yt-api.mjs auth                        one-time consent in the browser; stores the refresh token
//   node yt-api.mjs pull [--registry PATH]      analytics for every Short the registry says is due a read (or --videos a,b)
//   node yt-api.mjs comments --video ID         newest comment threads on one video, as JSON
//   node yt-api.mjs upload --episode ID [--confirm]   upload a registry episode (public, or scheduled at its publishAt)
//
// Scopes: youtube.readonly and yt-analytics.readonly (analytics needs both), youtube.force-ssl (comments) and
// youtube.upload. Since 2026-11-02 uploads from unaudited API projects are no longer forced private. "Related
// video" and pinned comments have no API: set them in Studio.

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { due } from '../../app-shorts/scripts/shorts.mjs';

const ITEM = 'YouTube API', VAULT = 'API Tokens';
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/youtube.upload'];
export const METRICS = ['views', 'engagedViews', 'estimatedMinutesWatched', 'averageViewDuration', 'averageViewPercentage',
  'likes', 'comments', 'shares', 'subscribersGained', 'subscribersLost'];

function vaultEnv() {
  const raw = readFileSync('/Volumes/ssd/1password-token.md', 'utf8');
  const token = raw.match(/ops_[A-Za-z0-9_-]+/)?.[0];
  if (!token) throw new Error('The documented token file holds no service-account token');
  return { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token };
}

function readItem() {
  const got = spawnSync('op', ['item', 'get', ITEM, '--vault', VAULT, '--format', 'json'], { env: vaultEnv(), encoding: 'utf8' });
  if (got.status !== 0) return null;
  return JSON.parse(got.stdout);
}

const field = (item, label) => item?.fields?.find(f => (f.label ?? '').toLowerCase() === label)?.value || null;

// Writes the refresh token through a private template file so the value never appears in a process argument.
function storeRefreshToken(token) {
  const item = readItem();
  if (!item) throw new Error(`Create the 1Password item "${ITEM}" in "${VAULT}" with the client id and secret first`);
  const existing = item.fields.find(f => (f.label ?? '').toLowerCase() === 'refresh token');
  if (existing) existing.value = token;
  else item.fields.push({ label: 'refresh token', type: 'CONCEALED', value: token });
  const dir = mkdtempSync(join(tmpdir(), 'yt-api-'));
  chmodSync(dir, 0o700);
  try {
    writeFileSync(join(dir, 'item.json'), JSON.stringify(item), { mode: 0o600 });
    const edited = spawnSync('op', ['item', 'edit', item.id, '--vault', VAULT, `--template=${join(dir, 'item.json')}`], { env: vaultEnv(), encoding: 'utf8' });
    if (edited.status !== 0) throw new Error('Storing the refresh token failed (the service account may be read-only): ' + edited.stderr.split('\n')[0]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function accessToken() {
  const item = readItem();
  const [id, secret, refresh] = ['client id', 'client secret', 'refresh token'].map(l => field(item, l));
  if (!id || !secret || !refresh) throw new Error('YouTube API is not connected: run `check`, then `auth`');
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${body.error ?? res.status} (a Testing-mode consent screen expires refresh tokens after 7 days)`);
  return body.access_token;
}

async function api(token, url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(`${new URL(url).pathname}: ${body.error?.message ?? res.status}`);
  return body;
}

// One analytics row per video, over the video's whole life so far (the API's data lags by about two days).
export function analyticsQuery(videoIds, { start = '2020-01-01', end = new Date().toISOString().slice(0, 10) } = {}) {
  const q = new URLSearchParams({ ids: 'channel==MINE', startDate: start, endDate: end, metrics: METRICS.join(','),
    dimensions: 'video', filters: `video==${videoIds.join(',')}`, maxResults: String(videoIds.length) });
  return `https://youtubeanalytics.googleapis.com/v2/reports?${q}`;
}

export function rowsToSnapshots(report, at = new Date().toISOString()) {
  const names = report.columnHeaders.map(h => h.name);
  return (report.rows ?? []).map(row => {
    const values = Object.fromEntries(names.map((n, i) => [n, row[i]]));
    const { video, ...metrics } = values;
    return { videoId: video, snapshot: { at, source: 'analytics-api', ...metrics } };
  });
}

// The upload request for an episode: private plus publishAt to schedule, public otherwise; the made-for-kids and
// synthetic-media answers are always stated, never left to defaults.
export function uploadRequest(episode, now = new Date()) {
  for (const f of ['title', 'description', 'file']) if (!episode[f]) throw new Error(`Episode ${episode.id} has no ${f}`);
  const scheduled = episode.publishAt && new Date(episode.publishAt) > now;
  return {
    snippet: { title: episode.title.slice(0, 100), description: episode.description, tags: episode.tags ?? [],
      categoryId: episode.categoryId ?? '28', defaultLanguage: 'en', defaultAudioLanguage: 'en' },
    status: { privacyStatus: scheduled ? 'private' : 'public', ...(scheduled ? { publishAt: new Date(episode.publishAt).toISOString() } : {}),
      selfDeclaredMadeForKids: episode.madeForKids === true, containsSyntheticMedia: episode.syntheticMedia === true, embeddable: true },
  };
}

async function upload(token, episode) {
  const body = uploadRequest(episode);
  const bytes = readFileSync(episode.file);
  const start = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(bytes.length) }, body: JSON.stringify(body) });
  if (!start.ok) throw new Error(`Upload start failed: ${(await start.json()).error?.message ?? start.status}`);
  const put = await fetch(start.headers.get('location'), { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: bytes });
  const video = await put.json();
  if (!put.ok) throw new Error(`Upload failed: ${video.error?.message ?? put.status}`);
  if (episode.cover) {
    const thumb = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${video.id}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: readFileSync(episode.cover) });
    if (!thumb.ok) console.error(`Thumbnail not set (${thumb.status}); Shorts thumbnails need the video processed first: retry later or use Studio`);
  }
  return { videoId: video.id, privacyStatus: video.status?.privacyStatus, publishAt: video.status?.publishAt ?? null };
}

async function authFlow() {
  const item = readItem();
  const [id, secret] = ['client id', 'client secret'].map(l => field(item, l));
  if (!id || !secret) throw new Error(`Add "client id" and "client secret" to the 1Password item "${ITEM}" (vault "${VAULT}") first`);
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = randomBytes(16).toString('hex');
  let redirect;
  const code = await new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.searchParams.get('state') !== state) { res.end('Unexpected request'); return; }
      res.end('YouTube growth loop connected. You can close this tab.');
      server.close();
      u.searchParams.get('code') ? resolve(u.searchParams.get('code')) : reject(new Error(u.searchParams.get('error') ?? 'No code returned'));
    }).listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${server.address().port}`;
      const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: id, redirect_uri: redirect,
        response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', state,
        code_challenge: challenge, code_challenge_method: 'S256' });
      console.log('Opening the consent page. Sign in as the channel owner and allow access.');
      spawnSync('open', [url]);
    });
    setTimeout(() => { server.close(); reject(new Error('No consent within 5 minutes')); }, 300000).unref();
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: id, client_secret: secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect }) });
  const body = await res.json();
  if (!res.ok || !body.refresh_token) throw new Error(`Token exchange failed: ${body.error ?? res.status}`);
  storeRefreshToken(body.refresh_token);
  const me = await api(body.access_token, 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true');
  console.log(JSON.stringify({ connected: true, channel: me.items?.[0]?.snippet?.title ?? null, channelId: me.items?.[0]?.id ?? null }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
  const registryPath = option('--registry', '/Volumes/ssd/projects/app-shorts/registry.json');
  const videos = option('--videos', null), video = option('--video', null);
  const [command] = args;
  try {
    if (command === 'check') {
      const item = readItem();
      const present = Object.fromEntries(['client id', 'client secret', 'refresh token'].map(l => [l, Boolean(field(item, l))]));
      let works = false;
      if (Object.values(present).every(Boolean)) { await accessToken(); works = true; }
      console.log(JSON.stringify({ item: Boolean(item), ...present, works }));
    } else if (command === 'auth') {
      await authFlow();
    } else if (command === 'pull') {
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const ids = videos ? videos.split(',') : [...new Set(due(registry).reads.map(r => r.videoId).filter(Boolean))];
      if (!ids.length) { console.log(JSON.stringify({ pulled: 0, reason: 'nothing due' })); process.exit(0); }
      const token = await accessToken();
      const snapshots = rowsToSnapshots(await api(token, analyticsQuery(ids)));
      for (const { videoId, snapshot } of snapshots) {
        const episode = registry.episodes.find(e => e.videoId === videoId);
        if (episode) (episode.metrics ??= []).push(snapshot);
      }
      if (existsSync(registryPath)) writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
      console.log(JSON.stringify({ pulled: snapshots.length, videos: snapshots.map(s => s.videoId) }));
    } else if (command === 'upload') {
      const id = option('--episode', null), confirm = args.includes('--confirm');
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const episode = registry.episodes.find(e => e.id === id);
      if (!episode) throw new Error(`No episode "${id}" in the registry`);
      if (episode.videoId) throw new Error(`${id} is already on YouTube (${episode.videoId})`);
      const request = uploadRequest(episode);
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, ...request }, null, 2)); process.exit(0); }
      const result = await upload(await accessToken(), episode);
      Object.assign(episode, { videoId: result.videoId, status: result.publishAt ? 'scheduled' : 'live',
        ...(result.publishAt ? {} : { postedAt: new Date().toISOString() }) });
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
      console.log(JSON.stringify(result));
    } else if (command === 'comments') {
      if (!video) throw new Error('--video ID is required');
      const token = await accessToken();
      const body = await api(token, `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=time&maxResults=50&videoId=${encodeURIComponent(video)}`);
      console.log(JSON.stringify(body.items.map(t => ({ id: t.id, at: t.snippet.topLevelComment.snippet.publishedAt,
        author: t.snippet.topLevelComment.snippet.authorDisplayName, text: t.snippet.topLevelComment.snippet.textOriginal,
        likes: t.snippet.topLevelComment.snippet.likeCount, replies: t.snippet.totalReplyCount })), null, 2));
    } else {
      console.error('usage: node yt-api.mjs check|auth|pull [--videos a,b]|comments --video ID|upload --episode ID [--confirm] [--registry PATH]');
      process.exit(2);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
