#!/usr/bin/env node
// yt-api.mjs
// The YouTube APIs for the growth loop: one-time OAuth for the owner's channel, analytics snapshots for Shorts into
// the app-shorts registry, and new comments to mine for episodes. Credentials live in the 1Password item
// "YouTube API" (vault "API Tokens"): `client id` and `client secret` from a Google Cloud OAuth client of type
// Desktop app, and `refresh token`, which `auth` writes. Values never reach output, arguments or logs. Node 22.
//
//   node yt-api.mjs check                       which credential fields exist (no values) and whether they work
//   node yt-api.mjs auth [--print-url] [--token-file PATH]   one-time consent in the browser; stores the refresh token.
//                                               --print-url prints the consent URL instead of opening it, for an agent's own
//                                               browser tab. --token-file writes the token to a private file for the owner
//                                               to add to 1Password, for a read-only service account
//   node yt-api.mjs pull [--registry PATH]      analytics for every Short the registry says is due a read (or --videos a,b)
//   node yt-api.mjs comments --video ID         newest comment threads on one video, as JSON
//   node yt-api.mjs unanswered [--registry PATH]  comments on live Shorts the channel has not answered, as JSON
//   node yt-api.mjs reply --parent ID --text T [--confirm]   reply to a top-level comment; refuses a thread already answered
//   node yt-api.mjs upload --episode ID [--confirm]   upload a registry episode (public, or scheduled at its publishAt)
//   node yt-api.mjs unschedule --episode ID [--confirm]   cancel a scheduled episode: the video stays on the channel,
//                                               private with no publish time, and the registry marks it "pulled"
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

// The comments a run should consider answering: top-level, not the channel's own, with no reply from the channel.
export function unansweredThreads(threads, ownerChannelId) {
  const byOwner = c => c.snippet.authorChannelId?.value === ownerChannelId;
  return threads.filter(t => !byOwner(t.snippet.topLevelComment) && !(t.replies?.comments ?? []).some(byOwner))
    .map(t => ({ id: t.id, at: t.snippet.topLevelComment.snippet.publishedAt, author: t.snippet.topLevelComment.snippet.authorDisplayName,
      text: t.snippet.topLevelComment.snippet.textOriginal, likes: t.snippet.topLevelComment.snippet.likeCount }));
}

// A reply is short plain text: links read as spam on YouTube and get held or removed.
export function replyRequest(parentId, text) {
  const body = (text ?? '').trim();
  if (!parentId) throw new Error('--parent ID is required');
  if (!body) throw new Error('--text is required');
  if (body.length > 300) throw new Error(`A reply is at most 300 characters; this is ${body.length}`);
  if (/https?:\/\/|www\./i.test(body)) throw new Error('A reply carries no links');
  return { snippet: { parentId, textOriginal: body } };
}

const ownChannelId = async token => (await api(token, 'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true')).items?.[0]?.id;
const threadsUrl = query => `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&${query}`;

async function postReply(token, request) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/comments?part=snippet', { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(request) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Reply failed: ${body.error?.message ?? res.status}`);
  return { id: body.id, parentId: request.snippet.parentId };
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

async function authFlow({ printUrl, tokenFile }) {
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
      if (printUrl) { console.log(url); return; }
      console.log('Opening the consent page. Sign in as the channel owner and allow access.');
      spawnSync('open', [url]);
    });
    setTimeout(() => { server.close(); reject(new Error('No consent within 5 minutes')); }, 300000).unref();
  });
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: id, client_secret: secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect }) });
  const body = await res.json();
  if (!res.ok || !body.refresh_token) throw new Error(`Token exchange failed: ${body.error ?? res.status}`);
  if (tokenFile) writeFileSync(tokenFile, [`For 1Password: add a password field named "refresh token" to the item "${ITEM}" in vault "${VAULT}".`,
    '', `refresh token: ${body.refresh_token}`, '', 'Delete this file once it is in 1Password.', ''].join('\n'), { mode: 0o600 });
  else storeRefreshToken(body.refresh_token);
  const me = await api(body.access_token, 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true');
  console.log(JSON.stringify({ connected: true, channel: me.items?.[0]?.snippet?.title ?? null, channelId: me.items?.[0]?.id ?? null }));
}
// The status for a scheduled video taken back: private, no publish time, every other status field kept as it was
// (videos.update replaces the whole status part, so a field left out would reset, made-for-kids among them).
export function unscheduleStatus(status) {
  const { publishAt, uploadStatus, failureReason, rejectionReason, privacyStatus, ...kept } = status ?? {};
  return { ...kept, privacyStatus: 'private' };
}

async function unschedule(token, videoId) {
  const found = await api(token, `https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(videoId)}`);
  const video = found.items?.[0];
  if (!video) throw new Error(`No video "${videoId}" on the channel`);
  if (video.status.privacyStatus === 'public') throw new Error(`${videoId} is already public; unschedule only takes back scheduled videos`);
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', { method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id: videoId, status: unscheduleStatus(video.status) }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Unschedule failed: ${body.error?.message ?? res.status}`);
  return { videoId, was: { privacyStatus: video.status.privacyStatus, publishAt: video.status.publishAt ?? null },
    now: { privacyStatus: body.status?.privacyStatus, publishAt: body.status?.publishAt ?? null } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
  const registryPath = option('--registry', '/Volumes/ssd/projects/app-shorts/registry.json');
  const videos = option('--videos', null), video = option('--video', null), tokenFile = option('--token-file', null);
  const [command] = args;
  try {
    if (command === 'check') {
      const item = readItem();
      const present = Object.fromEntries(['client id', 'client secret', 'refresh token'].map(l => [l, Boolean(field(item, l))]));
      let works = false, canReply = false;
      if (Object.values(present).every(Boolean)) {
        const token = await accessToken();
        works = true;
        const info = await (await fetch('https://oauth2.googleapis.com/tokeninfo', { method: 'POST', body: new URLSearchParams({ access_token: token }) })).json();
        canReply = (info.scope ?? '').split(' ').includes('https://www.googleapis.com/auth/youtube.force-ssl');
      }
      console.log(JSON.stringify({ item: Boolean(item), ...present, works, canReply }));
    } else if (command === 'auth') {
      await authFlow({ printUrl: args.includes('--print-url'), tokenFile });
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
    } else if (command === 'unschedule') {
      const id = option('--episode', null), confirm = args.includes('--confirm'), reason = option('--reason', null);
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const episode = registry.episodes.find(e => e.id === id);
      if (!episode) throw new Error(`No episode "${id}" in the registry`);
      if (!episode.videoId) throw new Error(`${id} has no video on YouTube`);
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, episode: id, videoId: episode.videoId, publishAt: episode.publishAt })); process.exit(0); }
      const result = await unschedule(await accessToken(), episode.videoId);
      Object.assign(episode, { status: 'pulled', pulledAt: new Date().toISOString(), wasPublishAt: episode.publishAt, publishAt: null,
        ...(reason ? { pulledReason: reason } : {}) });
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
      console.log(JSON.stringify(result));
    } else if (command === 'unanswered') {
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const token = await accessToken(), owner = await ownChannelId(token), found = [], skipped = [];
      for (const e of registry.episodes.filter(x => x.status === 'live' && x.videoId)) {
        try {
          const body = await api(token, threadsUrl(`order=time&maxResults=50&videoId=${encodeURIComponent(e.videoId)}`));
          for (const c of unansweredThreads(body.items, owner)) found.push({ episode: e.id, app: e.app, videoId: e.videoId, ...c });
        } catch (error) { skipped.push({ videoId: e.videoId, reason: error.message }); } // comments off on one video stops nothing
      }
      console.log(JSON.stringify({ unanswered: found, skipped }, null, 2));
    } else if (command === 'reply') {
      const parent = option('--parent', null), text = option('--text', null), confirm = args.includes('--confirm');
      const request = replyRequest(parent, text);
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, ...request }, null, 2)); process.exit(0); }
      const token = await accessToken();
      const thread = await api(token, threadsUrl(`id=${encodeURIComponent(parent)}`));
      if (!thread.items?.length) throw new Error(`No comment thread "${parent}"`);
      if (!unansweredThreads(thread.items, await ownChannelId(token)).length) throw new Error(`${parent} is already answered`);
      console.log(JSON.stringify(await postReply(token, request)));
    } else if (command === 'comments') {
      if (!video) throw new Error('--video ID is required');
      const token = await accessToken();
      const body = await api(token, `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=time&maxResults=50&videoId=${encodeURIComponent(video)}`);
      console.log(JSON.stringify(body.items.map(t => ({ id: t.id, at: t.snippet.topLevelComment.snippet.publishedAt,
        author: t.snippet.topLevelComment.snippet.authorDisplayName, text: t.snippet.topLevelComment.snippet.textOriginal,
        likes: t.snippet.topLevelComment.snippet.likeCount, replies: t.snippet.totalReplyCount })), null, 2));
    } else {
      console.error('usage: node yt-api.mjs check|auth|pull [--videos a,b]|comments --video ID|unanswered|reply --parent ID --text T [--confirm]|upload --episode ID [--confirm]|unschedule --episode ID [--reason R] [--confirm] [--registry PATH]');
      process.exit(2);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
