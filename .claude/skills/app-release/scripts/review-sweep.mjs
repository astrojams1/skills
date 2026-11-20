#!/usr/bin/env node
// review-sweep.mjs
// The read-only eligibility pass for unattended App Review submissions, across every team, from Apple's current
// inventory rather than a list of apps. For each app it reads the public version and its build, whether anything
// occupies the next review, which repository owns it, the exact commit the public build came from, and which files
// changed since. It only ever sends GET to App Store Connect. A candidate still needs an agent to read the diff.
//
//   sweep [--out file] [--code-root dir] [--no-fetch]   classify every app; prints JSON
//   claim --app ID --key VERSION-COMMIT --run RUN        take the per-app lock; refuses a key already submitted
//   finish --app ID --key KEY --run RUN --result R       record submitted|deferred and drop the lock
//   run -- COMMAND...                                    run a release script with vault access and the unattended
//                                                        guard on, which refuses release, withdraw and price changes

import { spawnSync } from 'node:child_process';
import { sign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { opRead, pem } from './lib/vault.mjs';
import { UNATTENDED_ENV, liveVersion, occupancy, versionStateOf } from './lib/review-state.mjs';
import { compareVersions } from './lib/app-events.mjs';
import { publishedLabelGap } from './lib/privacy-label.mjs';
import { localizationChanges, localizationSummary } from './lib/listing-localizations.mjs';
import { localizedScreenshotChanges, localizedScreenshotEntries, localizedScreenshotGroups, localizedScreenshotProblems, localizedScreenshotSummary, md5,
  readLiveScreenshots, resolveGroups } from './lib/screenshot-localizations.mjs';

const API = 'https://api.appstoreconnect.apple.com';
const CODE_ROOT = '/Volumes/ssd/code';
const STATE_ROOT = '/Volumes/ssd/projects/app-release-daily/state';
const TOKEN_FILE = '/Volumes/ssd/1password-token.md';
const LOCK_STALE_MS = 12 * 3600 * 1000;

// TEAMS names each team's App Store Connect key item; a key only sees its own team, so both are always read.
export const TEAMS = [
  { id: 'CWQ9AWJF8T', name: 'James Thompson', vault: 'op://API Tokens/App Store Connect' },
  { id: 'AYCDG243RJ', name: 'Ouro LLC', vault: 'op://fwzzg67kzjexwx4tzglkdiftki/okirxsw33waqbau4tpfakhu3ny' },
];

// NON_PRODUCT paths never reach the shipped binary: records, tests, tooling, store data and marketing.
const NON_PRODUCT = [/^docs?\//, /^\.[^/]+(\/|$)/, /^(vendor\/)?skills(\/|$)/, /^local-skills\//, /^store\//, /^tasks\//,
  /^tests?\//, /(^|\/)__tests__\//, /\.test\.[a-z]+$/, /\.md$/, /^scripts\//, /^marketing\//, /^design\//, /^LICENSE/,
  /^app-release[^/]*\.json$/];

// splitPaths separates files that can change the shipped app from those that cannot. When the app lives in a
// subdirectory, only that directory counts; the rest of the repository is another product's or tooling.
export function splitPaths(paths, projectDir) {
  const root = !projectDir || projectDir === '.' ? '' : projectDir.replace(/\/$/, '') + '/';
  const product = [];
  const other = [];
  for (const path of paths) {
    const inside = path.startsWith(root) ? path.slice(root.length) : null;
    if (inside === null || NON_PRODUCT.some(pattern => pattern.test(inside))) other.push(path);
    else product.push(path);
  }
  return { product, other };
}

// Store text Apple takes only with a new version: name and subtitle on the App Info, keywords, description and URLs
// on the version. Promotional text changes any time and `whatsNew` belongs to each version, so neither ships an app.
const INFO_FIELDS = ['name', 'subtitle'];
const VERSION_FIELDS = ['keywords', 'description', 'supportUrl', 'marketingUrl'];
export const LISTING_FIELDS = [...INFO_FIELDS, ...VERSION_FIELDS];

// listingChanges names each version-bound field the merged store data sets to something other than what is live.
// A merged listing change is a reason to ship by itself (references/daily-review-run.md, "A listing change ships").
export function listingChanges(wanted, live) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  return LISTING_FIELDS.filter(field => text(wanted?.[field]) && text(wanted[field]) !== text(live?.[field]));
}

// liveAppInfo picks the App Info the storefront shows; a draft version adds a second, editable one.
export function liveAppInfo(infos) {
  const state = info => info.attributes.state || info.attributes.appStoreState;
  return infos.find(info => ['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'].includes(state(info))) || (infos.length === 1 ? infos[0] : null);
}

// archiveProvenance accepts an `ios-release.mjs archive` summary only when it is exactly this build from a clean tree.
export function archiveProvenance(summary, expected) {
  if (!summary) return { problem: 'no archive summary' };
  if (summary.dirty !== false) return { problem: 'archived from a dirty tree' };
  if (!/^[0-9a-f]{40}$/.test(String(summary.commit))) return { problem: 'summary names no full commit' };
  for (const name of ['bundleId', 'version', 'build']) {
    if (String(summary[name]) !== String(expected[name])) return { problem: 'summary ' + name + ' is ' + summary[name] + ', not ' + expected[name] };
  }
  return { commit: summary.commit };
}

// recordedProvenance accepts a saved record for a build with no archive summary, such as a cloud build. It must name
// Apple's id for this exact build and its evidence; `cleanTree` stays visible because a cloud record may not prove it.
export function recordedProvenance(saved, appleBuildId) {
  if (saved.appleBuildId !== appleBuildId) return { problem: 'recorded appleBuildId does not match the live build' };
  if (!/^[0-9a-f]{40}$/.test(String(saved.commit))) return { problem: 'recorded commit is not a full hash' };
  if (!saved.evidence?.length) return { problem: 'record has no evidence' };
  if (saved.cleanTree === false) return { problem: 'record says the tree was dirty' };
  return { commit: saved.commit, cleanTree: saved.cleanTree === true ? 'proven' : 'unproven' };
}

// serviceToken reads the 1Password service account token without displaying it, as the credential procedure requires.
function serviceToken() {
  if (process.env.OP_SERVICE_ACCOUNT_TOKEN) return process.env.OP_SERVICE_ACCOUNT_TOKEN;
  const raw = process.env.OP_KEY || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8') : '');
  const found = raw.match(/ops_[A-Za-z0-9_\-+/=]+/);
  if (!found) throw new Error('No 1Password service account token in OP_KEY or ' + TOKEN_FILE);
  return found[0];
}

// client returns a GET-only App Store Connect reader for one team's key.
function client(team) {
  const key = { id: opRead(team.vault, 'key id'), issuer: opRead(team.vault, 'issuer id'), pem: pem(opRead(team.vault, 'credential')) };
  const jwt = () => {
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const unsigned = encode({ alg: 'ES256', kid: key.id, typ: 'JWT' }) + '.' + encode({ iss: key.issuer, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
    return unsigned + '.' + sign('sha256', Buffer.from(unsigned), { key: key.pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  };
  const get = async path => {
    const response = await fetch(path.startsWith('http') ? path : API + path, { headers: { Authorization: 'Bearer ' + jwt() } });
    const text = await response.text();
    if (response.status === 404) return { data: null };
    if (!response.ok) throw new Error('GET ' + path + ' -> ' + response.status + ' ' + text.slice(0, 300));
    return JSON.parse(text);
  };
  const all = async path => {
    const rows = [];
    for (let next = path; next;) {
      const page = await get(next);
      rows.push(...(page.data || []));
      next = page.links && page.links.next;
    }
    return rows;
  };
  return { get, all };
}

const git = (dir, ...args) => {
  const result = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return result.status === 0 ? result.stdout.trim() : null;
};

// gitBytes reads one file at a commit as bytes, or null when it is not there.
const gitBytes = (dir, commit, path) => {
  const result = spawnSync('git', ['-C', dir, 'show', commit + ':' + path.replace(/^\.\//, '')], { maxBuffer: 256 * 1024 * 1024 });
  return result.status === 0 ? result.stdout : null;
};

const remoteKey = url => String(url || '').replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '').toLowerCase();

const defaultRef = dir => {
  const head = git(dir, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD');
  return head || (git(dir, 'rev-parse', '--verify', '-q', 'origin/main') ? 'origin/main' : null);
};

// repoIndex reads every checkout's configuration from committed history only, so a dirty or feature-branch checkout
// cannot change what an app maps to. Several checkouts of one remote count once.
export function repoIndex(codeRoot) {
  const index = [];
  const seen = new Set();
  const dirs = readdirSync(codeRoot).filter(name => !name.startsWith('.')).sort((a, b) => a.length - b.length || a.localeCompare(b));
  for (const name of dirs) {
    const dir = join(codeRoot, name);
    if (!statSync(dir).isDirectory() || !existsSync(join(dir, '.git'))) continue;
    const remote = remoteKey(git(dir, 'remote', 'get-url', 'origin'));
    if (remote && seen.has(remote)) continue;
    const ref = remote ? defaultRef(dir) : null;
    const raw = ref && git(dir, 'show', ref + ':app-release.config.json');
    if (!raw) continue;
    let config;
    try { config = JSON.parse(raw); } catch { continue; }
    if (!config.ios) continue;
    seen.add(remote);
    index.push({ dir, remote, ref, config });
  }
  return index;
}

// mapRepo requires the app id, bundle id and team to agree; one match is a mapping, anything else is not.
export function mapRepo(index, app, teamId) {
  const matches = index.filter(entry => String(entry.config.ios.ascAppId) === app.id ||
    entry.config.ios.bundleId === app.attributes.bundleId);
  const exact = matches.filter(entry => String(entry.config.ios.ascAppId) === app.id &&
    entry.config.ios.bundleId === app.attributes.bundleId && entry.config.ios.teamId === teamId);
  if (exact.length === 1 && matches.length === 1) return { repo: exact[0] };
  if (!matches.length) return { problem: 'no repository on this Mac has a matching app-release.config.json on its default branch' };
  return { problem: 'repository mapping is ambiguous or disagrees on identity: ' + matches.map(entry => entry.dir).join(', ') };
}

// readProvenance prefers the archive summary written when the build was made, then a recorded and evidenced override
// in the sweep's state folder for builds made before summaries existed.
function readProvenance(repo, app, version, build, stateRoot) {
  const expected = { bundleId: app.attributes.bundleId, version: version.attributes.versionString, build: build.attributes.version };
  const root = repo.config.buildRoot ? String(repo.config.buildRoot).replace(/^~/, process.env.HOME) : '/Volumes/ssd/builds';
  const path = join(root, 'xcode', repo.config.slug, 'release', String(expected.build), 'summary.json');
  const summary = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
  const archive = archiveProvenance(summary, expected);
  if (archive.commit) return { commit: archive.commit, cleanTree: 'proven', source: path };
  const record = join(stateRoot, 'provenance', app.id + '-' + expected.version + '-' + expected.build + '.json');
  if (existsSync(record)) {
    const saved = recordedProvenance(JSON.parse(readFileSync(record, 'utf8')), build.id);
    return saved.commit ? { ...saved, source: record } : { problem: saved.problem + ' in ' + record };
  }
  return { problem: archive.problem + ' at ' + path };
}

// mergeWouldChange merges `commit` into `target` in memory (`git merge-tree --write-tree` writes objects only, never a
// ref, index or work tree) and lists the files the merge would change or conflict in; an empty list means `target`
// already holds every change `commit` made since their merge base. null means git could not run the merge.
function mergeWouldChange(dir, target, commit) {
  const merged = spawnSync('git', ['-C', dir, 'merge-tree', '--write-tree', '--name-only', '--no-messages', target, commit], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (merged.status !== 0 && merged.status !== 1) return null;
  const [tree, ...conflicted] = merged.stdout.split('\n').map(line => line.trim()).filter(Boolean);
  const differs = merged.status === 0 ? (git(dir, 'diff', '--name-only', target, tree) || '').split('\n').filter(Boolean) : [];
  return [...new Set([...conflicted, ...differs])].sort();
}

const listFiles = files => files.length + ' file' + (files.length === 1 ? '' : 's') + ' (' + files.slice(0, 20).join(', ') + (files.length > 20 ? ', …' : '') + ')';

// contentOnHead decides whether the release branch holds everything the live build's commit holds, so that a new
// build from head cannot silently drop something people have installed. An ancestor holds it by definition. A
// squash-merged or rebased release branch passes on content instead:
//   1. merging the commit into head changes nothing, so every change it made since the merge base is on head; or
//   2. some commit S on head's first-parent history since the merge base passes test 1 (S is the squash), and every
//      file a merge into head would still touch has changed again since S rather than gone back to its merge-base
//      content. Later edits on main to those files are main's own commits, exactly as they would be after a real
//      merge, and they show in the commit-to-head diff the run reads for materiality.
// It defers when no commit on head ever held all of the commit's changes (a partial squash) and when head has put a
// file back the way it was before the commit (a revert), and names the files either way.
export function contentOnHead(dir, commit, head) {
  if (git(dir, 'cat-file', '-e', commit + '^{commit}') === null) return { problem: 'commit ' + commit + ' is not in ' + dir };
  if (spawnSync('git', ['-C', dir, 'merge-base', '--is-ancestor', commit, head]).status === 0) return { ancestor: true };
  const notAncestor = 'commit ' + commit + ' is not an ancestor of ' + head;
  const base = git(dir, 'merge-base', commit, head);
  if (!base) return { problem: notAncestor + ' and shares no history with it' };
  const touched = (git(dir, 'diff', '--name-only', base, commit) || '').split('\n').filter(Boolean);
  const missing = mergeWouldChange(dir, head, commit);
  if (missing === null) return { problem: notAncestor + ', and git merge-tree could not test whether its content is there' };
  const held = notAncestor + ' (squash-merged or rebased), but its changes to ' + touched.length + ' file' + (touched.length === 1 ? '' : 's') + ' since ' + base.slice(0, 8);
  if (!missing.length) return { ancestor: false, base, note: held + ' are all on ' + head };
  const line = (git(dir, 'rev-list', '--first-parent', '--reverse', base + '..' + head) || '').split('\n').filter(Boolean).slice(-500);
  const squash = line.find(candidate => { const left = mergeWouldChange(dir, candidate, commit); return left !== null && !left.length; });
  if (!squash) return { problem: notAncestor + ', and no commit on ' + head + ' since ' + base.slice(0, 8) + ' holds all of its changes; missing from ' + head + ': ' + listFiles(missing), missing };
  const blob = (ref, path) => git(dir, 'rev-parse', '-q', '--verify', ref + ':' + path);
  const reverted = missing.filter(path => blob(head, path) === blob(base, path));
  if (reverted.length) return { problem: notAncestor + '; ' + squash.slice(0, 8) + ' on ' + head + ' held its changes, but ' + head + ' has since put back ' + listFiles(reverted) + ' as they were before it', missing: reverted };
  return { ancestor: false, base, squash, changedSince: missing, note: held + ' landed on ' + head + ' at ' + squash.slice(0, 8) + '; ' + listFiles(missing) + ' changed again on ' + head + ' since then (read them in the diff)' };
}

// changes lists what moved on the release branch since the public build's commit.
function changes(repo, commit, head) {
  const held = contentOnHead(repo.dir, commit, head);
  if (held.problem) return { problem: held.problem };
  const paths = (git(repo.dir, 'diff', '--name-only', commit, head) || '').split('\n').filter(Boolean);
  const { product, other } = splitPaths(paths, repo.config.projectDir);
  const commits = product.length ? (git(repo.dir, 'log', '--no-merges', '--format=%h %s', '-n', '40', commit + '..' + head, '--', ...product.slice(0, 200)) || '').split('\n').filter(Boolean) : [];
  return { product, otherCount: other.length, commits, ancestry: held.note || null };
}

async function publicVersion(appId) {
  try {
    const response = await fetch('https://itunes.apple.com/lookup?id=' + appId + '&country=us');
    return (await response.json()).results?.[0]?.version || null;
  } catch {
    return null;
  }
}

// storefrontCheck compares the public lookup with App Store Connect's live version. The lookup trails an approval by
// hours (seven apps approved on 2026-11-19 still read their old versions there that evening), and Apple takes the next
// version as soon as App Store Connect reads READY_FOR_DISTRIBUTION, so an older public version is only noted: deferring
// on it would cost every freshly approved app a day. A public version newer than App Store Connect's is a real
// disagreement and defers.
export function storefrontCheck(published, live) {
  if (!published || published === live) return {};
  if (compareVersions(published, live) < 0) return { note: 'storefront still shows ' + published + ' while App Store Connect has ' + live + ' live; the public lookup trails an approval' };
  return { problem: 'storefront shows ' + published + ', App Store Connect shows ' + live };
}

// classify reads one app and returns its row; a failure is that app's deferral, never the end of the sweep.
async function classify(api, app, team, index, stateRoot) {
  const row = { team: team.id, ascAppId: app.id, bundleId: app.attributes.bundleId, name: app.attributes.name };
  const versions = await api.all('/v1/apps/' + app.id + '/appStoreVersions?filter[platform]=IOS&limit=200');
  const submissions = await api.all('/v1/apps/' + app.id + '/reviewSubmissions?filter[platform]=IOS&limit=200');
  const live = liveVersion(versions);
  row.versions = versions.map(item => item.attributes.versionString + ' ' + versionStateOf(item) + ' ' + item.attributes.releaseType);
  if (!live) return { ...row, status: 'not_live', reason: 'no public iOS version' };
  const build = (await api.get('/v1/appStoreVersions/' + live.id + '/build')).data;
  row.live = { version: live.attributes.versionString, build: build ? build.attributes.version : null };
  row.occupied = occupancy(versions, submissions, { draftOk: true });
  const mapped = mapRepo(index, app, team.id);
  if (mapped.repo) {
    row.repo = mapped.repo.dir;
    row.releaseBranch = mapped.repo.config.releaseBranch ? 'origin/' + mapped.repo.config.releaseBranch : mapped.repo.ref;
    row.head = git(mapped.repo.dir, 'rev-parse', row.releaseBranch);
    // App Privacy is the app's, not a version's: it is read for every live app, a version in review included, so the
    // run publishes it today and the next submission does not wait on it (daily-review-run.md, step 1).
    row.privacy = await pendingPrivacy(mapped.repo, app, row.head);
  }
  if (row.occupied.length) return { ...row, status: 'occupied', reason: row.occupied.join('; ') };
  if (!build) return { ...row, status: 'deferred', reason: 'live version has no readable build' };
  const published = await publicVersion(app.id);
  row.publicVersion = published;
  const storefront = storefrontCheck(published, live.attributes.versionString);
  if (storefront.problem) return { ...row, status: 'deferred', reason: storefront.problem };
  if (storefront.note) row.storefront = storefront.note;
  if (!mapped.repo) return { ...row, status: 'deferred', reason: mapped.problem };
  const repo = mapped.repo;
  const provenance = readProvenance(repo, app, live, build, stateRoot);
  if (provenance.problem) return { ...row, status: 'deferred', reason: 'unknown provenance: ' + provenance.problem };
  row.provenance = provenance;
  const diff = changes(repo, provenance.commit, row.head);
  if (diff.problem) return { ...row, status: 'deferred', reason: diff.problem };
  row.changes = { productFiles: diff.product.length, otherFiles: diff.otherCount, sample: diff.product.slice(0, 30), commits: diff.commits };
  // A squash-merged release branch is not a deferral when head holds the live commit's content; the row says so.
  if (diff.ancestry) row.ancestry = diff.ancestry;
  const via = diff.ancestry ? '; ' + diff.ancestry : '';
  row.listing = await pendingListing(api, app, live, repo, row.head);
  const dedupeKey = live.attributes.versionString + '-' + row.head.slice(0, 12);
  if (diff.product.length) return { ...row, status: 'candidate', kind: 'product', reason: diff.product.length + ' product files changed; read the diff before treating it as material' + via, dedupeKey };
  const why = listingReason(row.listing);
  if (why) row.listing.ships = why;
  if (why) return { ...row, status: 'candidate', kind: 'listing', reason: 'merged store listing differs from the live one (' + why + '); ship it as a metadata-only version' + via, dedupeKey };
  if (row.listing.problem) return { ...row, status: 'deferred', reason: 'no product change, and the listing could not be compared: ' + row.listing.problem };
  return { ...row, status: 'no_product_change', reason: 'no file that ships changed since ' + provenance.commit.slice(0, 8) + ', and the live listing matches the store data' + via };
}

// pendingPrivacy reads the store data's App Privacy answers on the release branch and names what the published label
// lacks. An app opted out of the privacy-label standard with a recorded reason is not read.
async function pendingPrivacy(repo, app, head, readPublished = publishedLabelGap) {
  const reason = repo.config.standards?.optOut?.['privacy-label'];
  if (typeof reason === 'string' && reason.trim().length >= 10) return { optedOut: reason };
  try {
    const raw = head && repo.config.storeData && git(repo.dir, 'show', head + ':' + repo.config.storeData);
    if (!raw) return { problem: 'no store data at ' + (repo.config.storeData || '(storeData unset)') };
    const gap = await readPublished(JSON.parse(raw), app.id);
    if (gap.missing?.length) gap.changeNow = 'App Privacy in App Store Connect: ' + gap.missing.join('; ');
    return gap;
  } catch (error) {
    return { problem: error.message };
  }
}

// listingReason says why a listing ships: a primary field that differs, an extra language that is missing live or
// differs in name, subtitle, keywords or description, or a language in localizedScreenshots whose listed screenshots
// are missing live or differ. Empty when nothing does. A product candidate that is not
// material reads the same (daily-review-run.md, step 2).
export function listingReason(listing) {
  if (!listing || listing.problem) return '';
  const parts = [];
  if (listing.fields?.length) parts.push(listing.fields.join(', '));
  const languages = listing.localizations ? localizationSummary(listing.localizations) : '';
  if (languages) parts.push(languages);
  const screenshots = listing.screenshots && !listing.screenshots.problems?.length ? localizedScreenshotSummary(listing.screenshots) : '';
  if (screenshots) parts.push(screenshots);
  return parts.join('; ');
}

// pendingListing compares the store data on the release branch with the live App Info and version texts. A failure
// here is reported, never read as "nothing to ship".
async function pendingListing(api, app, live, repo, head) {
  try {
    const raw = repo.config.storeData && git(repo.dir, 'show', head + ':' + repo.config.storeData);
    if (!raw) return { problem: 'no store data at ' + (repo.config.storeData || '(storeData unset)') };
    const store = JSON.parse(raw);
    const wanted = store.listing || {};
    const locale = wanted.locale || 'en-US';
    const info = liveAppInfo(await api.all('/v1/apps/' + app.id + '/appInfos'));
    if (!info) return { problem: 'no live App Info' };
    const infoLocalizations = await api.all('/v1/appInfos/' + info.id + '/appInfoLocalizations');
    const versionLocalizations = await api.all('/v1/appStoreVersions/' + live.id + '/appStoreVersionLocalizations');
    const infoText = infoLocalizations.find(item => item.attributes.locale === locale);
    const versionText = versionLocalizations.find(item => item.attributes.locale === locale);
    if (!infoText || !versionText) return { problem: 'no live ' + locale + ' localization' };
    const fields = listingChanges(wanted, { ...versionText.attributes, ...infoText.attributes });
    // Extra languages: missing live or different ships the app; live but absent from store data is only reported.
    const localizations = localizationChanges(wanted, infoLocalizations, versionLocalizations);
    // Screenshots per language: missing or different ships the app, as a listing language does.
    const screenshots = await pendingScreenshots(api, store, versionLocalizations, locale, repo, head);
    return { locale, fields, wanted: Object.fromEntries(fields.map(field => [field, wanted[field]])), localizations, ...(screenshots ? { screenshots } : {}) };
  } catch (error) {
    return { problem: error.message };
  }
}

// pendingScreenshots compares localizedScreenshots on the release branch with the live version's screenshot sets per
// language, reading files from that commit, never the working tree. Undefined when store data lists none; problems in
// store data are returned beside the comparison and do not make a candidate.
export async function pendingScreenshots(api, store, versionLocalizations, primary, repo, head, readBytes = gitBytes) {
  if (!localizedScreenshotEntries(store).length) return undefined;
  const readFile = file => readBytes(repo.dir, head, file);
  const readJson = file => {
    const bytes = readFile(file);
    if (!bytes) throw new Error(file + ' is not at ' + head.slice(0, 8));
    return JSON.parse(bytes.toString('utf8'));
  };
  let primaryGroups = [];
  try {
    primaryGroups = resolveGroups(store.screenshots, readJson) || [];
  } catch (error) {
    return { problems: ['screenshots: ' + error.message], missing: [], changed: [], unlisted: [] };
  }
  const problems = localizedScreenshotProblems(store, primaryGroups, { readFile, readJson });
  if (problems.length) return { problems, missing: [], changed: [], unlisted: [] };
  const languages = localizedScreenshotGroups(store, readJson);
  const live = await readLiveScreenshots(versionLocalizations, primary, path => api.all(path));
  const checksum = file => {
    const bytes = readFile(file);
    return bytes ? md5(bytes) : null;
  };
  return { problems: [], ...localizedScreenshotChanges(languages, live, checksum) };
}

async function sweep(options) {
  process.env.OP_SERVICE_ACCOUNT_TOKEN = serviceToken();
  const codeRoot = options['code-root'] || CODE_ROOT;
  const stateRoot = options.state || STATE_ROOT;
  let index = repoIndex(codeRoot);
  if (!options['no-fetch']) {
    for (const entry of index) git(entry.dir, 'fetch', '-q', 'origin');
    index = repoIndex(codeRoot);
  }
  const report = { at: new Date().toISOString(), readOnly: true, teams: [], apps: [] };
  for (const team of TEAMS) {
    try {
      const api = client(team);
      const apps = await api.all('/v1/apps?limit=200');
      report.teams.push({ id: team.id, name: team.name, apps: apps.length, enumerated: true });
      for (const app of apps) {
        try {
          report.apps.push(await classify(api, app, team, index, stateRoot));
        } catch (error) {
          report.apps.push({ team: team.id, ascAppId: app.id, name: app.attributes.name, status: 'deferred', reason: 'read failed: ' + error.message });
        }
      }
    } catch (error) {
      report.teams.push({ id: team.id, name: team.name, enumerated: false, error: error.message });
    }
  }
  report.counts = report.apps.reduce((all, app) => ({ ...all, [app.status]: (all[app.status] || 0) + 1 }), {});
  const text = JSON.stringify(report, null, 2) + '\n';
  if (options.out) writeFileSync(options.out, text);
  process.stdout.write(text);
  if (report.teams.some(team => !team.enumerated)) process.exitCode = 2;
}

// claim takes the app's lock with an atomic mkdir, so retried or overlapping runs cannot work on one app at once, and
// refuses a version and commit that already went to review.
export function claim(root, app, key, run, now = Date.now()) {
  const lock = join(root, 'locks', app);
  const record = join(root, 'keys', app, key + '.json');
  if (existsSync(record) && JSON.parse(readFileSync(record, 'utf8')).result === 'submitted') return { ok: false, reason: 'already submitted' };
  mkdirSync(join(root, 'locks'), { recursive: true });
  if (existsSync(lock) && now - statSync(lock).mtimeMs > LOCK_STALE_MS) rmSync(lock, { recursive: true, force: true });
  try {
    mkdirSync(lock);
  } catch {
    return { ok: false, reason: 'locked by ' + (existsSync(join(lock, 'run')) ? readFileSync(join(lock, 'run'), 'utf8') : 'another run') };
  }
  writeFileSync(join(lock, 'run'), run);
  return { ok: true };
}

// finish records the outcome and drops the lock, only for the run that holds it.
export function finish(root, app, key, run, result) {
  const lock = join(root, 'locks', app);
  if (!existsSync(join(lock, 'run')) || readFileSync(join(lock, 'run'), 'utf8') !== run) return { ok: false, reason: 'this run does not hold the lock' };
  mkdirSync(join(root, 'keys', app), { recursive: true });
  const path = join(root, 'keys', app, key + '.json');
  writeFileSync(path + '.tmp', JSON.stringify({ result, run, at: new Date().toISOString() }) + '\n');
  renameSync(path + '.tmp', path);
  rmSync(lock, { recursive: true, force: true });
  return { ok: true };
}

function options(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith('--')) continue;
    const next = args[i + 1];
    parsed[args[i].slice(2)] = next && !next.startsWith('--') ? args[++i] : true;
  }
  return parsed;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'run') {
    const child = rest[0] === '--' ? rest.slice(1) : rest;
    if (!child.length) throw new Error('Usage: review-sweep.mjs run -- COMMAND...');
    const env = { ...process.env, OP_SERVICE_ACCOUNT_TOKEN: serviceToken(), OP_KEY: serviceToken(), [UNATTENDED_ENV]: '1' };
    process.exitCode = spawnSync(child[0], child.slice(1), { stdio: 'inherit', env }).status ?? 1;
    return;
  }
  const flags = options(rest);
  const root = flags.state || STATE_ROOT;
  if (command === 'sweep') return sweep(flags);
  if (command === 'claim' || command === 'finish') {
    if (!flags.app || !flags.key || !flags.run) throw new Error('--app, --key and --run are required');
    const result = command === 'claim' ? claim(root, flags.app, flags.key, flags.run) : finish(root, flags.app, flags.key, flags.run, flags.result);
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 3;
    return;
  }
  console.log('Usage: review-sweep.mjs sweep|claim|finish|run');
  process.exitCode = command ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
