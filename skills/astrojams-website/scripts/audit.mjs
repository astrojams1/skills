#!/usr/bin/env node
// audit.mjs
// Compares every app on the personal James Thompson App Store Connect team with the astrojams website's catalog, so
// the site never trails the apps: new records the site neither lists nor excludes, renamed apps or subtitles,
// releases the site has not synced, and catalog entries that are no longer on the team. With --pull it downloads an
// app's App Store Connect screenshots (and its small build icon) for the site. Node 22, no dependencies; read-only
// against Apple.
//
//   node audit.mjs [--site /Volumes/ssd/code/astrojams-apps] [--code /Volumes/ssd/code] [--json]
//   node audit.mjs --pull <appStoreId> --out <dir>
//
// Credentials: the App Store Connect key in the 1Password item named by any team app's app-release.config.json
// (`ios.vault`, matched on the catalog's developer.teamId). The service-account token comes from
// OP_SERVICE_ACCOUNT_TOKEN, OP_KEY or the owner's token file; it is passed only to `op` and never printed.
// Exit codes: 0 nothing to do, 2 the site needs an update (see the action list), 1 the audit could not run.

import { spawnSync } from 'node:child_process';
import { sign } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.appstoreconnect.apple.com';
const TOKEN_FILE = '/Volumes/ssd/1password-token.md';
const RELEASED = new Set(['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION']);

export function parseArgs(argv) {
  const args = { site: '/Volumes/ssd/code/astrojams-apps', code: '/Volumes/ssd/code', json: false, pull: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'json') args.json = true;
    else if (key in args) args[key] = argv[++i];
    else throw new Error('Unknown argument ' + argv[i]);
  }
  return args;
}

// serviceToken finds the 1Password service-account token without printing it: the environment first, then the
// owner's Markdown token file, whose `OP_KEY=` prefix and formatting are stripped.
export function serviceToken(env = process.env, readFile = readFileSync) {
  const raw = env.OP_SERVICE_ACCOUNT_TOKEN || env.OP_KEY || '';
  const fromEnv = raw.replace(/^OP_KEY=/, '').trim();
  if (fromEnv) return fromEnv;
  const match = readFile(TOKEN_FILE, 'utf8').match(/ops_[A-Za-z0-9+/=_-]+/);
  if (!match) throw new Error(`No 1Password service-account token in the environment or ${TOKEN_FILE}`);
  return match[0];
}

function opRead(item, field, token) {
  const reference = item.replace(/\/$/, '') + '/' + field;
  const result = spawnSync('op', ['read', reference], { env: { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: token }, encoding: 'utf8' });
  if (result.error) throw new Error('op is not installed: ' + result.error.message);
  if (result.status !== 0) throw new Error(`op read "${reference}" failed: ${String(result.stderr).trim()}`);
  return result.stdout.trim();
}

export function pem(body) {
  const key = body.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  return '-----BEGIN PRIVATE KEY-----\n' + key.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
}

// teamConfigs lists the app repositories whose app-release.config.json belongs to the given App Store team. Several
// folders can hold the same app (a main checkout and its worktrees); `worktree` marks the ones whose .git is a file.
export function teamConfigs(codeRoot, teamId) {
  const found = [];
  for (const name of existsSync(codeRoot) ? readdirSync(codeRoot) : []) {
    const file = join(codeRoot, name, 'app-release.config.json');
    if (!existsSync(file)) continue;
    try {
      const config = JSON.parse(readFileSync(file, 'utf8'));
      if (!config.ios || config.ios.teamId !== teamId) continue;
      let listing = null;
      try { listing = JSON.parse(readFileSync(join(codeRoot, name, config.storeData || 'store/store.json'), 'utf8')).listing || null; } catch { /* no store data yet */ }
      let worktree = false;
      try { worktree = statSync(join(codeRoot, name, '.git')).isFile(); } catch { /* not a git checkout */ }
      found.push({ dir: join(codeRoot, name), config, listing, worktree });
    } catch { /* an unreadable config is not ours to judge here */ }
  }
  return found;
}

function client(vault, token) {
  const credentials = { keyId: opRead(vault, 'key id', token), issuerId: opRead(vault, 'issuer id', token), key: pem(opRead(vault, 'credential', token)) };
  const jwt = () => {
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = encode({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' }) + '.' + encode({ iss: credentials.issuerId, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
    return unsigned + '.' + sign('sha256', Buffer.from(unsigned), { key: credentials.key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  };
  return async path => {
    const response = await fetch(API + path, { headers: { Authorization: 'Bearer ' + jwt() } });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`GET ${path} -> ${response.status} ${JSON.stringify(body && body.errors)}`);
    return body;
  };
}

async function readTeam(api) {
  const apps = await api('/v1/apps?limit=200&fields[apps]=name,bundleId');
  const rows = [];
  for (const app of apps.data) {
    const versions = await api(`/v1/apps/${app.id}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appVersionState,appStoreState,platform`);
    const infos = await api(`/v1/apps/${app.id}/appInfos?include=appInfoLocalizations&limit=5`);
    const localization = (infos.included || []).find(x => x.type === 'appInfoLocalizations' && /^en/.test(x.attributes.locale)) || (infos.included || [])[0];
    const states = versions.data.map(v => ({ version: v.attributes.versionString, state: v.attributes.appVersionState || v.attributes.appStoreState }));
    rows.push({
      appStoreId: app.id,
      bundleId: app.attributes.bundleId,
      name: localization ? localization.attributes.name : app.attributes.name,
      subtitle: localization ? localization.attributes.subtitle || '' : '',
      latest: states[0] || null,
      released: states.some(s => RELEASED.has(s.state))
    });
  }
  return rows;
}

// compare turns App Store Connect's view and the site's catalog into a list of actions. Pure, so it is tested.
export function compare(team, catalog, store, configs) {
  const listed = new Map(catalog.apps.map(app => [app.appStoreId, app]));
  const excluded = new Map((catalog.excluded || []).map(app => [app.appStoreId, app]));
  const repos = primaryConfigs(configs);
  const actions = [];
  const rows = team.map(row => {
    const site = listed.get(row.appStoreId);
    const live = Boolean(store.apps && store.apps[row.appStoreId]);
    let status = site ? (live ? 'site: available' : 'site: coming soon') : excluded.has(row.appStoreId) ? 'excluded' : 'NEW';
    if (status === 'NEW') actions.push(`Add or exclude ${row.name} (${row.appStoreId}, ${row.bundleId}): decide whether to show it (a real app the owner is shipping) or exclude it (duplicate, placeholder or test record).`);
    if (site) {
      if (row.name !== site.fullName) actions.push(`${site.name}: App Store name is now "${row.name}" (site has "${site.fullName}").`);
      if (row.subtitle && row.subtitle !== site.subtitle) actions.push(`${site.name}: subtitle is now "${row.subtitle}" (site has "${site.subtitle}").`);
      if (row.released && !live) actions.push(`${site.name} is released but the site still says coming soon: run npm run sync:store (the public lookup can lag Apple by a few hours).`);
    }
    return { ...row, status, repo: repos.has(row.appStoreId) ? repos.get(row.appStoreId).dir : null };
  });
  const onTeam = new Set(team.map(row => row.appStoreId));
  for (const app of catalog.apps) {
    if (!onTeam.has(app.appStoreId)) actions.push(`${app.name} (${app.appStoreId}) is in the catalog but not on the App Store Connect team.`);
  }
  // An app with a website of its own keeps it as its App Store "Marketing URL"; an app without one uses its page on
  // this site. The app's store data holds the URL and app-release's next `asc.mjs listing` sends it, so an empty one is
  // a follow-up in that app's repository (its main checkout when worktrees share the app).
  const followUps = [];
  for (const [appStoreId, { dir, config, listing }] of repos) {
    const app = listed.get(appStoreId);
    if (!app || !listing || listing.marketingUrl) continue;
    const expected = new URL(`/${app.slug}/`, catalog.site.url).toString();
    followUps.push(`${app.name}: set listing.marketingUrl to ${expected} in ${join(dir, config.storeData || 'store/store.json')} (it has none); app-release sends it with the next listing.`);
  }
  return { rows, actions, followUps };
}

// primaryConfigs keeps one repository per App Store app: a main checkout over its worktrees, otherwise the first found.
export function primaryConfigs(configs) {
  const byApp = new Map();
  for (const entry of configs) {
    const id = String(entry.config.ios.ascAppId || '');
    if (!id) continue;
    const seen = byApp.get(id);
    if (!seen || (seen.worktree && !entry.worktree)) byApp.set(id, entry);
  }
  return byApp;
}

async function pull(api, appStoreId, out) {
  mkdirSync(out, { recursive: true });
  const save = async (url, file) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    writeFileSync(join(out, file), Buffer.from(await response.arrayBuffer()));
    console.log('saved ' + join(out, file));
  };
  const fill = (asset, w, h) => asset.templateUrl.replace('{w}', w).replace('{h}', h).replace('{f}', 'png');
  const builds = await api(`/v1/builds?filter[app]=${appStoreId}&sort=-uploadedDate&limit=1&fields[builds]=version,iconAssetToken`);
  const icon = builds.data[0] && builds.data[0].attributes.iconAssetToken;
  if (icon) {
    await save(fill(icon, icon.width, icon.height), 'build-icon.png');
    console.log(`note: build icons are only ${icon.width}px; use the app repository's 1024px AppIcon or the App Store artwork instead`);
  }
  const versions = await api(`/v1/apps/${appStoreId}/appStoreVersions?limit=1&include=appStoreVersionLocalizations`);
  const localization = (versions.included || []).find(x => x.type === 'appStoreVersionLocalizations');
  if (!localization) return console.log('no version localization, so no screenshots');
  const sets = await api(`/v1/appStoreVersionLocalizations/${localization.id}/appScreenshotSets?include=appScreenshots&limit=50`);
  const shots = new Map((sets.included || []).map(s => [s.id, s]));
  for (const set of sets.data) {
    const type = set.attributes.screenshotDisplayType;
    if (!/IPHONE/.test(type)) continue;
    let n = 0;
    for (const ref of set.relationships.appScreenshots.data || []) {
      const asset = shots.get(ref.id) && shots.get(ref.id).attributes.imageAsset;
      if (asset) await save(fill(asset, asset.width, asset.height), `${type}-${String(++n).padStart(2, '0')}.png`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalog = JSON.parse(readFileSync(join(args.site, 'src/data/apps.json'), 'utf8'));
  const store = JSON.parse(readFileSync(join(args.site, 'src/data/store.json'), 'utf8'));
  const configs = teamConfigs(args.code, catalog.developer.teamId);
  const vault = (configs.find(c => c.config.ios.vault) || {}).config;
  if (!vault) throw new Error(`No app-release.config.json under ${args.code} names a vault for team ${catalog.developer.teamId}`);
  const api = client(vault.ios.vault, serviceToken());
  if (args.pull) {
    if (!args.out) throw new Error('--pull needs --out <dir>');
    return pull(api, args.pull, args.out);
  }
  const team = await readTeam(api);
  const { rows, actions, followUps } = compare(team, catalog, store, configs);
  if (args.json) console.log(JSON.stringify({ rows, actions, followUps }, null, 2));
  else {
    for (const row of rows) {
      const state = row.latest ? `${row.latest.version} ${row.latest.state}` : 'no version';
      console.log(`${row.appStoreId}  ${row.status.padEnd(18)} ${state.padEnd(34)} ${row.name}${row.repo ? '  [' + row.repo + ']' : ''}`);
    }
    console.log(actions.length ? '\nActions:\n- ' + actions.join('\n- ') : '\nThe site matches App Store Connect.');
    if (followUps.length) console.log('\nApp repository follow-ups (app-release applies them):\n- ' + followUps.join('\n- '));
  }
  process.exitCode = actions.length ? 2 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error('audit failed: ' + error.message); process.exit(1); });
}
