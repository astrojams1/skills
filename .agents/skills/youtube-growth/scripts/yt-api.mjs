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
//   node yt-api.mjs show --episode ID           what YouTube holds for an episode now: title, description, privacy, publish time
//   node yt-api.mjs comments --video ID         newest comment threads on one video, as JSON
//   node yt-api.mjs unanswered [--registry PATH]  comments on live Shorts the channel has not answered, as JSON
//   node yt-api.mjs reply --parent ID --text T [--confirm]   reply to a top-level comment; refuses a thread already answered
//   node yt-api.mjs comment --episode ID --text T [--confirm]   the channel's first comment on a Short (no links), recorded
//                                               in the registry as `comment`; pin it on the Short's page, then shorts.mjs mark
//   node yt-api.mjs upload --episode ID [--confirm]   upload a registry episode, always public at once (never scheduled);
//                                               refuses one for an app not on sale, with no search phrase on its
//                                               description's first line, or without a rules checklist that passes
//                                               every written rule (shorts.mjs rules <app> --checklist)
//   node yt-api.mjs publish --episode ID [--confirm]   make a scheduled Short public now: privacy public, publishAt
//                                               cleared, read back until YouTube shows it; the registry marks it live
//                                               with postedAt at that moment. Refuses what upload refuses
//   node yt-api.mjs update --episode ID [--not-for-kids] [--title T] [--tags "a|b"] [--description-file F [--search-phrase P]]
//                                               [--confirm]   set a posted Short "not made for kids", or replace its
//                                               title (which must name the app in its first 40 characters) or
//                                               description (whose first line must give the search phrase), keeping
//                                               its other settings; the registry keeps the old text as wasTitle and
//                                               wasDescription. --publish-at is refused: Shorts are never scheduled
//   node yt-api.mjs unschedule --episode ID [--live] [--hold] [--confirm]   cancel a scheduled episode (or, with --live,
//                                               take a live one down): the video stays on the channel, private with no
//                                               publish time, and the registry marks it "pulled", or "held" with
//                                               --hold (made for an app not on sale; it waits until the app is)
//
// Scopes: youtube.readonly and yt-analytics.readonly (analytics needs both), youtube.force-ssl (comments) and
// youtube.upload. Since 2026-11-02 uploads from unaudited API projects are no longer forced private. "Related
// video" and pinning have no API: they are set in Studio or on the Short's page and recorded with shorts.mjs mark.

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { due, findable, loadProfiles, profileFor, rules, checklistProblems } from '../../app-shorts/scripts/shorts.mjs';

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

// The upload request for an episode: always public now, never scheduled (James, 2026-11-12: a Short held for a later
// slot cannot show its effect until then). The made-for-kids and synthetic-media answers are always stated.
export function uploadRequest(episode) {
  for (const f of ['title', 'description', 'file']) if (!episode[f]) throw new Error(`Episode ${episode.id} has no ${f}`);
  return {
    snippet: { title: episode.title.slice(0, 100), description: episode.description, tags: episode.tags ?? [],
      categoryId: episode.categoryId ?? '28', defaultLanguage: 'en', defaultAudioLanguage: 'en' },
    status: { privacyStatus: 'public', selfDeclaredMadeForKids: episode.madeForKids === true, containsSyntheticMedia: episode.syntheticMedia === true, embeddable: true },
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

// The channel's own first comment on a Short (guidelines.md 22): where to get the product and one easy question. Links
// in Shorts comments do not click (since 2023-08-31) and read as spam, so it carries none; it is pinned by hand on the
// Short's page (no API pins), then `shorts.mjs mark --pinned`.
export function commentRequest(videoId, text) {
  const body = (text ?? '').trim();
  if (!videoId) throw new Error('The episode has no videoId');
  if (!body) throw new Error('--text is required');
  if (body.length > 500) throw new Error(`A first comment is at most 500 characters; this is ${body.length}`);
  if (/https?:\/\/|www\./i.test(body)) throw new Error('A comment on a Short carries no links (they do not click); give the search phrase or the address as plain words');
  return { snippet: { videoId, topLevelComment: { snippet: { textOriginal: body } } } };
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

async function postComment(token, request) {
  const res = await fetch('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(request) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Comment failed: ${body.error?.message ?? res.status}`);
  return { id: body.id, text: body.snippet?.topLevelComment?.snippet?.textOriginal ?? request.snippet.topLevelComment.snippet.textOriginal };
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

// The registry fields for an episode taken off the schedule: "pulled", or "held" when it waits for its app to go on
// sale. Its old publish time and status are kept, the first ones only, so a second call loses nothing.
export function heldOrPulled(episode, { hold = false, reason = null, now = new Date() } = {}) {
  const at = hold ? 'heldAt' : 'pulledAt';
  return { status: hold ? 'held' : 'pulled', [at]: episode[at] ?? now.toISOString(), wasPublishAt: episode.wasPublishAt ?? episode.publishAt ?? null,
    wasStatus: episode.wasStatus ?? episode.status, publishAt: null, ...(reason ? { [hold ? 'heldReason' : 'pulledReason']: reason } : {}) };
}

// The status for a private or scheduled video made public now: public, no publish time, every other field kept.
// A Short goes public the moment it passes the rule gate and review, never at a later time (James, 2026-11-12).
export function publishNowStatus(status) {
  const { publishAt, uploadStatus, failureReason, rejectionReason, madeForKids, privacyStatus, ...kept } = status ?? {};
  return { ...kept, privacyStatus: 'public' };
}

// The registry fields for an episode made public now: live from `at`, its old publish time kept as wasPublishAt.
export function publishedNow(episode, at = new Date()) {
  return { status: 'live', postedAt: new Date(at).toISOString(), wasPublishAt: episode.wasPublishAt ?? episode.publishAt ?? null, publishAt: null };
}

// The status for a video whose audience changes, every other field kept.
export function updatedStatus(status, { notForKids } = {}) {
  const { uploadStatus, failureReason, rejectionReason, madeForKids, ...kept } = status ?? {};
  const next = { ...kept };
  if (notForKids) next.selfDeclaredMadeForKids = false;
  return next;
}

// The snippet for a video whose description changes. videos.update replaces the whole snippet part, so the title,
// category, tags and languages are sent back as they are; read-only fields are left out.
export function updatedSnippet(snippet, { description, title: newTitle, tags: newTags } = {}) {
  const { title: oldTitle, categoryId, tags, defaultLanguage, defaultAudioLanguage, description: oldDescription } = snippet ?? {};
  if (!oldTitle || !categoryId) throw new Error('The video has no title or category to keep');
  if (newTitle !== undefined && newTitle !== null && (!String(newTitle).trim() || String(newTitle).length > 100)) throw new Error('A title is 1 to 100 characters');
  const title = newTitle ?? oldTitle;
  if (newTags && (newTags.length > 15 || newTags.join(',').length > 500)) throw new Error('Tags: at most 15, 500 characters in all (guidelines.md 18 asks for 3 to 8)');
  const kept = newTags ?? tags;
  return { title, categoryId, description: description ?? oldDescription ?? '', ...(kept ? { tags: kept } : {}), ...(defaultLanguage ? { defaultLanguage } : {}),
    ...(defaultAudioLanguage ? { defaultAudioLanguage } : {}) };
}

// YouTube may hand tags back in another order or case, so compare them as a set.
export const sameTags = (a = [], b = []) => { const norm = t => [...new Set((t ?? []).map(x => x.toLowerCase().normalize('NFC')))].sort().join('|'); return norm(a) === norm(b); };

// Replaces a video's description, title and/or tags (null keeps each), then reads them back.
async function updateSnippet(token, videoId, { description = null, title = null, tags = null }) {
  const read = async () => (await api(token, `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`)).items?.[0];
  const video = await read();
  if (!video) throw new Error(`No video "${videoId}" on the channel`);
  const sent = updatedSnippet(video.snippet, { description: description ?? undefined, title: title ?? undefined, tags: tags ?? undefined });
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet', { method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id: videoId, snippet: sent }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Snippet update failed: ${body.error?.message ?? res.status}`);
  // A read straight after the update can still return the old text (seen 2026-11-12), so read back a few times.
  let after = {};
  for (let i = 0; i < 5; i += 1) {
    after = (await read())?.snippet ?? {};
    if (after.description === sent.description && after.title === sent.title && (!tags || sameTags(after.tags, sent.tags))) break;
    await new Promise(r => setTimeout(r, 3000));
  }
  if (after.description !== sent.description) throw new Error(`${videoId} does not read back the new description; check with show, then run update again`);
  if (after.title !== sent.title) throw new Error(`${videoId} does not read back the expected title; check with show, then run update again`);
  if (tags && !sameTags(after.tags, sent.tags)) throw new Error(`${videoId} does not read back the new tags; check with show, then run update again`);
  return { was: { title: video.snippet.title, description: video.snippet.description, tags: video.snippet.tags ?? [] }, now: { title: after.title, description: after.description, tags: after.tags ?? [] } };
}

async function updateVideo(token, videoId, changes) {
  const read = async () => (await api(token, `https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(videoId)}`)).items?.[0];
  const video = await read();
  if (!video) throw new Error(`No video "${videoId}" on the channel`);
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', { method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id: videoId, status: updatedStatus(video.status, changes) }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Update failed: ${body.error?.message ?? res.status}`);
  const after = (await read())?.status ?? {};
  return { videoId, now: { privacyStatus: after.privacyStatus, publishAt: after.publishAt ?? null, madeForKids: after.madeForKids, selfDeclaredMadeForKids: after.selfDeclaredMadeForKids } };
}

async function publishNow(token, videoId) {
  const read = async () => (await api(token, `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(videoId)}`)).items?.[0];
  const video = await read();
  if (!video) throw new Error(`No video "${videoId}" on the channel`);
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', { method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id: videoId, status: publishNowStatus(video.status) }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Publish failed: ${body.error?.message ?? res.status}`);
  // A read straight after an update can echo the old state (seen 2026-11-12), so read back a few times.
  let after = {};
  for (let i = 0; i < 6; i += 1) {
    after = await read() ?? {};
    if (after.status?.privacyStatus === 'public' && !after.status?.publishAt) break;
    await new Promise(r => setTimeout(r, 3000));
  }
  if (after.status?.privacyStatus !== 'public' || after.status?.publishAt) throw new Error(`${videoId} still reads ${after.status?.privacyStatus} at ${after.status?.publishAt ?? 'no time'}; check with show, then run publish again`);
  return { videoId, was: { privacyStatus: video.status.privacyStatus, publishAt: video.status.publishAt ?? null },
    now: { privacyStatus: after.status.privacyStatus, publishAt: null, publishedAt: after.snippet?.publishedAt ?? null }, confirmedAt: new Date().toISOString() };
}

async function unschedule(token, videoId, { live = false } = {}) {
  const found = await api(token, `https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(videoId)}`);
  const video = found.items?.[0];
  if (!video) throw new Error(`No video "${videoId}" on the channel`);
  if (video.status.privacyStatus === 'public' && !live) throw new Error(`${videoId} is public; add --live to take a live Short down to private`);
  const res = await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', { method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({ id: videoId, status: unscheduleStatus(video.status) }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Unschedule failed: ${body.error?.message ?? res.status}`);
  // The update's own response can echo the old publish time, and a read straight after it can too (all five reads
  // on 2026-11-12 did, then cleared within seconds), so read back a few times before calling it failed.
  let after = {};
  for (let i = 0; i < 6; i += 1) {
    after = (await api(token, `https://www.googleapis.com/youtube/v3/videos?part=status&id=${encodeURIComponent(videoId)}`)).items?.[0]?.status ?? {};
    if (after.privacyStatus === 'private' && !after.publishAt) break;
    await new Promise(r => setTimeout(r, 3000));
  }
  if (after.privacyStatus !== 'private' || after.publishAt) throw new Error(`${videoId} still reads ${after.privacyStatus} at ${after.publishAt ?? 'no time'}; run unschedule again`);
  return { videoId, was: { privacyStatus: video.status.privacyStatus, publishAt: video.status.publishAt ?? null },
    now: { privacyStatus: after.privacyStatus, publishAt: after.publishAt ?? null } };
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
      const profiles = loadProfiles();
      const refused = findable({ ...episode, status: 'scheduled' }, { profile: profileFor(profiles, episode.app), app: registry.apps?.[episode.app] });
      if (refused) throw new Error(refused);
      const unmet = checklistProblems(episode, rules(episode.app, { profiles }).text);
      if (unmet.length) throw new Error(unmet.join('\n'));
      const request = uploadRequest(episode);
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, ...request }, null, 2)); process.exit(0); }
      const result = await upload(await accessToken(), episode);
      // Other makers write the registry while a video uploads, so read it again and change only this episode.
      const fresh = JSON.parse(readFileSync(registryPath, 'utf8'));
      Object.assign(fresh.episodes.find(e => e.id === id), { videoId: result.videoId, status: 'live', postedAt: new Date().toISOString(), publishAt: null });
      writeFileSync(registryPath, JSON.stringify(fresh, null, 2) + '\n');
      console.log(JSON.stringify(result));
    } else if (command === 'publish') {
      const id = option('--episode', null), confirm = args.includes('--confirm');
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const episode = registry.episodes.find(e => e.id === id);
      if (!episode?.videoId) throw new Error(`No episode "${id}" on YouTube in the registry`);
      if (episode.status !== 'scheduled') throw new Error(`${id} is ${episode.status}; only a scheduled Short is made public here (a held one waits for its app or rule)`);
      const refused = findable({ ...episode, legacy: false }, { profile: profileFor(loadProfiles(), episode.app), app: registry.apps?.[episode.app] });
      if (refused) throw new Error(refused);
      const unmet = checklistProblems({ ...episode, legacy: false }, rules(episode.app, { profiles: loadProfiles() }).text);
      if (unmet.length) throw new Error(unmet.join('\n'));
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, episode: id, videoId: episode.videoId, publishAt: episode.publishAt ?? null, becomes: 'public now' })); process.exit(0); }
      const result = await publishNow(await accessToken(), episode.videoId);
      // Other makers write the registry meanwhile, so read it again and change only this episode.
      const fresh = JSON.parse(readFileSync(registryPath, 'utf8'));
      const mine = fresh.episodes.find(e => e.id === id);
      Object.assign(mine, publishedNow(mine, result.confirmedAt));
      writeFileSync(registryPath, JSON.stringify(fresh, null, 2) + '\n');
      console.log(JSON.stringify({ episode: id, ...result }));
    } else if (command === 'update') {
      const id = option('--episode', null), confirm = args.includes('--confirm'), notForKids = args.includes('--not-for-kids');
      const descriptionFile = option('--description-file', null), searchPhrase = option('--search-phrase', null), title = option('--title', null);
      const tagsArg = option('--tags', null), tags = tagsArg ? tagsArg.split('|').map(t => t.trim()).filter(Boolean) : null;
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const episode = registry.episodes.find(e => e.id === id);
      if (!episode?.videoId) throw new Error(`No episode "${id}" on YouTube in the registry`);
      if (args.includes('--publish-at')) throw new Error('Shorts are never scheduled: a Short that passes the gate goes public now (yt-api.mjs publish --episode ID)');
      if (!notForKids && !descriptionFile && !title && !tags) throw new Error('Nothing to change: pass --not-for-kids, --title, --tags and/or --description-file');
      const description = descriptionFile ? readFileSync(descriptionFile, 'utf8').replace(/\s+$/, '') : null;
      // A new description or title must give the phrase and name the app.
      if (description || title) {
        const refused = findable({ ...episode, description: description ?? episode.description, title: title ?? episode.title, searchPhrase: searchPhrase ?? episode.searchPhrase,
          status: 'scheduled', legacy: false }, { profile: profileFor(loadProfiles(), episode.app), app: registry.apps?.[episode.app] });
        if (refused) throw new Error(refused);
      }
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, episode: id, videoId: episode.videoId, notForKids, title, tags, searchPhrase, description })); process.exit(0); }
      const token = await accessToken();
      const result = { videoId: episode.videoId };
      if (notForKids) Object.assign(result, await updateVideo(token, episode.videoId, { notForKids }));
      if (description || title || tags) {
        const changed = await updateSnippet(token, episode.videoId, { description, title, tags });
        if (tags) { episode.wasTags ??= changed.was.tags; episode.tags = changed.now.tags; }
        if (description) { episode.wasDescription ??= changed.was.description; episode.description = changed.now.description; }
        if (title) { episode.wasTitle ??= changed.was.title; episode.title = changed.now.title; }
        if (searchPhrase) episode.searchPhrase = searchPhrase;
        result.snippet = changed;
      }
      if (notForKids) episode.madeForKids = false;
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
      console.log(JSON.stringify(result));
    } else if (command === 'unschedule') {
      const id = option('--episode', null), confirm = args.includes('--confirm'), reason = option('--reason', null), live = args.includes('--live'), hold = args.includes('--hold');
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const episode = registry.episodes.find(e => e.id === id);
      if (!episode) throw new Error(`No episode "${id}" in the registry`);
      if (!episode.videoId) throw new Error(`${id} has no video on YouTube`);
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, episode: id, videoId: episode.videoId, publishAt: episode.publishAt, becomes: hold ? 'held' : 'pulled' })); process.exit(0); }
      const result = await unschedule(await accessToken(), episode.videoId, { live });
      Object.assign(episode, heldOrPulled(episode, { hold, reason }));
      writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
      console.log(JSON.stringify(result));
    } else if (command === 'show') {
      const id = option('--episode', null);
      const episode = JSON.parse(readFileSync(registryPath, 'utf8')).episodes.find(e => e.id === id);
      if (!episode?.videoId) throw new Error(`No episode "${id}" on YouTube in the registry`);
      const video = (await api(await accessToken(), `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${encodeURIComponent(episode.videoId)}`)).items?.[0];
      if (!video) throw new Error(`No video "${episode.videoId}" on the channel`);
      console.log(JSON.stringify({ videoId: video.id, title: video.snippet.title, description: video.snippet.description,
        privacyStatus: video.status.privacyStatus, uploadStatus: video.status.uploadStatus, publishAt: video.status.publishAt ?? null,
        publishedAt: video.snippet.publishedAt ?? null, madeForKids: video.status.madeForKids, tags: video.snippet.tags ?? [] }, null, 2));
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
    } else if (command === 'comment') {
      const id = option('--episode', null), text = option('--text', null), confirm = args.includes('--confirm');
      const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
      const episode = registry.episodes.find(e => e.id === id);
      if (!episode?.videoId) throw new Error(`No episode "${id}" on YouTube in the registry`);
      if (episode.comment?.id) throw new Error(`${id} already has the channel's comment ${episode.comment.id}`);
      const request = commentRequest(episode.videoId, text);
      if (!confirm) { console.log(JSON.stringify({ dryRun: true, episode: id, ...request }, null, 2)); process.exit(0); }
      const posted = await postComment(await accessToken(), request);
      // Other makers write the registry meanwhile, so read it again and change only this episode.
      const fresh = JSON.parse(readFileSync(registryPath, 'utf8'));
      fresh.episodes.find(e => e.id === id).comment = { id: posted.id, text: posted.text, at: new Date().toISOString() };
      writeFileSync(registryPath, JSON.stringify(fresh, null, 2) + '\n');
      console.log(JSON.stringify({ episode: id, videoId: episode.videoId, comment: posted.id, next: 'pin it on the Short\'s page, then shorts.mjs mark ' + id + ' --pinned ' + posted.id }));
    } else if (command === 'comments') {
      if (!video) throw new Error('--video ID is required');
      const token = await accessToken();
      const body = await api(token, `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=time&maxResults=50&videoId=${encodeURIComponent(video)}`);
      console.log(JSON.stringify(body.items.map(t => ({ id: t.id, at: t.snippet.topLevelComment.snippet.publishedAt,
        author: t.snippet.topLevelComment.snippet.authorDisplayName, text: t.snippet.topLevelComment.snippet.textOriginal,
        likes: t.snippet.topLevelComment.snippet.likeCount, replies: t.snippet.totalReplyCount })), null, 2));
    } else {
      console.error('usage: node yt-api.mjs check|auth|pull [--videos a,b]|show --episode ID|comments --video ID|unanswered|reply --parent ID --text T [--confirm]|comment --episode ID --text T [--confirm]|upload --episode ID [--confirm]|publish --episode ID [--confirm]|update --episode ID [--not-for-kids] [--title T] [--tags "a|b"] [--description-file F] [--search-phrase P] [--confirm]|unschedule --episode ID [--live] [--reason R] [--confirm] [--registry PATH]');
      process.exit(2);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
