#!/usr/bin/env node
// asc.mjs
// Drives every App Store Connect step of an iOS release through Apple's API: status, listing copy, age rating,
// pricing and availability, screenshots, App Review details and attachments, Game Center leaderboards, TestFlight,
// build selection, submission and manual release. Identity comes from the app's app-release.config.json (`ios`) and
// copy from its store data file; credentials come from 1Password in memory; every write is read back so a release
// never depends on clicking through the web console. Run from the app repository.

import { createHash, sign } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadStoreData, requireSection, screenshotGroups } from './lib/config.mjs';
import { opRead, pem } from './lib/vault.mjs';

const API = 'https://api.appstoreconnect.apple.com';
const COMMANDS = ['status', 'listing', 'age-rating', 'pricing', 'screenshots', 'review-details', 'review-attachment', 'game-center', 'attach-build', 'submit', 'testflight', 'release'];

// CONFIG, IOS and STORE are read on first use, so tests can import the decision helpers without a configured app.
let CONFIG = null;
let IOS = null;
let STORE = null;

// setup reads the app's configuration and store data.
export function setup(start) {
  CONFIG = loadConfig(start);
  IOS = requireSection(CONFIG, 'ios');
  STORE = loadStoreData(CONFIG);
  return { config: CONFIG, ios: IOS, store: STORE };
}

// loadCredentials prefers explicit ASC_* variables and otherwise reads the configured vault item (`credential` is the
// .p8 body without its armor, beside `key id` and `issuer id`); nothing is written to disk.
export function loadCredentials() {
  if (process.env.ASC_KEY_ID && process.env.ASC_ISSUER_ID && process.env.ASC_PRIVATE_KEY_PATH) {
    return { keyId: process.env.ASC_KEY_ID, issuerId: process.env.ASC_ISSUER_ID, key: readFileSync(process.env.ASC_PRIVATE_KEY_PATH, 'utf8') };
  }
  if (!IOS) setup();
  return { keyId: opRead(IOS.vault, 'key id'), issuerId: opRead(IOS.vault, 'issuer id'), key: pem(opRead(IOS.vault, 'credential')) };
}

let credentials = null;

// token signs a short-lived ES256 JWT for the App Store Connect API.
function token() {
  if (!credentials) credentials = loadCredentials();
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = encode({ alg: 'ES256', kid: credentials.keyId, typ: 'JWT' }) + '.' +
    encode({ iss: credentials.issuerId, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' });
  const signature = sign('sha256', Buffer.from(unsigned), { key: credentials.key, dsaEncoding: 'ieee-p1363' });
  return unsigned + '.' + signature.toString('base64url');
}

// api sends one JSON request and throws Apple's error list on failure so a half-finished step is never reported done.
export async function api(path, method, payload) {
  const options = { method: method || 'GET', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' } };
  if (payload) options.body = JSON.stringify(payload);
  const response = await fetch(API + path, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(options.method + ' ' + path + ' -> ' + response.status + ' ' + JSON.stringify(body && body.errors));
  }
  return body;
}

// related reads a to-one related resource, treating Apple's documented 404 for an absent one as `data: null`.
async function related(path) {
  try {
    return await api(path);
  } catch (error) {
    if (String(error.message).includes(' -> 404 ')) return { data: null };
    throw error;
  }
}

// listAll follows `links.next` so collections longer than one page are read completely.
export async function listAll(path) {
  const items = [];
  let next = path;
  while (next) {
    const page = await api(next);
    for (const item of page.data) items.push(item);
    next = page.links && page.links.next ? page.links.next.replace(API, '') : null;
  }
  return items;
}

// relation builds a JSON:API relationship object.
function relation(type, id) {
  return { data: { type: type, id: id } };
}

// LIVE_STATES and EDITABLE_STATES cover both Apple's appVersionState and the deprecated appStoreState values.
const LIVE_STATES = ['READY_FOR_DISTRIBUTION', 'READY_FOR_SALE'];
const EDITABLE_STATES = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'];

// versionState reads a version's state from appVersionState, falling back to the deprecated appStoreState.
export function versionState(version) {
  return version.attributes.appVersionState || version.attributes.appStoreState || '';
}

// schedulePricePoints returns the price point of every manual price in a schedule, whatever its dates: an ended
// temporary price falls back to an earlier one and a future one can start before review ends, so all of them count.
export function schedulePricePoints(prices) {
  return prices.data.map(price => {
    const link = price.relationships && price.relationships.appPricePoint ? price.relationships.appPricePoint.data : null;
    return link ? prices.included.find(item => item.type === 'appPricePoints' && item.id === link.id) || null : null;
  });
}

// editableAppInfo returns the App Info whose state (or deprecated appStoreState) is explicitly editable.
export function editableAppInfo(infos) {
  return infos.find(info => EDITABLE_STATES.includes(info.attributes.state || info.attributes.appStoreState || '')) || null;
}

// PRIVATE_FIELDS are never printed, even in a readback error.
const PRIVATE_FIELDS = ['contactPhone'];

// assertSaved compares each requested attribute with Apple's echoed value; an attribute Apple leaves out reads as null.
export function assertSaved(label, wanted, saved) {
  for (const key of Object.keys(wanted)) {
    const echoed = Object.hasOwn(saved, key) ? saved[key] : null;
    if (JSON.stringify(echoed) !== JSON.stringify(wanted[key])) {
      const shown = PRIVATE_FIELDS.includes(key) ? '<hidden>' : JSON.stringify(saved[key]);
      throw new Error(label + ' readback mismatch on ' + key + ': ' + shown);
    }
  }
}

// screenshotAction decides what to do with one listed file given the set's current screenshots: upload it when
// absent, keep a finished copy with the same checksum, replace one whose upload never finished, and refuse to
// overwrite a finished copy whose bytes differ.
export function screenshotAction(existing, fileName, checksum) {
  const found = existing.find(item => item.attributes.fileName === fileName);
  if (!found) return { action: 'upload' };
  const delivery = found.attributes.assetDeliveryState;
  const state = delivery ? delivery.state : '';
  const finished = state === 'COMPLETE' || state === 'UPLOAD_COMPLETE';
  if (!found.attributes.sourceFileChecksum || !finished) return { action: 'replace', id: found.id };
  if (found.attributes.sourceFileChecksum === checksum) return { action: 'keep', id: found.id };
  return { action: 'conflict', id: found.id };
}

// attachmentPlan reconciles every App Review attachment with this file name: keep a finished copy with the same
// checksum, wait for an identical copy still processing, or upload; `remove` lists the other same-name copies, which
// go only once the kept or new copy is COMPLETE, since a processing copy can still turn FAILED. Apple reports no
// checksum while a copy processes, so a same-size copy still processing without one counts as identical.
export function attachmentPlan(existing, fileName, checksum, fileSize) {
  const same = existing.filter(item => item.attributes.fileName === fileName);
  const state = item => (item.attributes.assetDeliveryState ? item.attributes.assetDeliveryState.state : '');
  const matching = item => item.attributes.sourceFileChecksum === checksum;
  const others = chosen => same.filter(item => item !== chosen).map(item => item.id);
  const done = same.find(item => matching(item) && state(item) === 'COMPLETE');
  if (done) return { action: 'keep', id: done.id, remove: others(done) };
  const pendingCopy = item => matching(item) || (!item.attributes.sourceFileChecksum && fileSize !== undefined && item.attributes.fileSize === fileSize);
  const processing = same.find(item => pendingCopy(item) && state(item) === 'UPLOAD_COMPLETE');
  if (processing) return { action: 'wait', id: processing.id, remove: others(processing) };
  return { action: 'upload', remove: same.map(item => item.id) };
}

// attachmentSettled reads an attachment's delivery state as complete, failed, or still pending.
export function attachmentSettled(state) {
  if (state === 'COMPLETE') return 'complete';
  if (state === 'FAILED') return 'failed';
  return 'pending';
}

// attachmentReadBack compares an attachment's stored checksum with the uploaded file's: Apple reports none until it
// has processed the upload, so null is pending rather than a mismatch.
export function attachmentReadBack(attributes, checksum) {
  const stored = attributes ? attributes.sourceFileChecksum : null;
  if (!stored) return 'pending';
  return stored === checksum ? 'ok' : 'mismatch';
}

// LEADERBOARD_SETTLED are leaderboard version states already with or past App Review, which need no new item.
const LEADERBOARD_SETTLED = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'ACCEPTED', 'PENDING_RELEASE', 'LIVE'];

// leaderboardReadiness checks every leaderboard store.json the store data configures by its newest version: `editable` lists the
// versions to send with the app, and `missing` names each configured leaderboard that is absent, archived, or whose
// newest version is neither ready to send nor already accepted, so `submit` never sends a smaller set than
// configured. With a `locale`, an editable version also needs that localization, since Apple refuses a leaderboard
// version with no language.
export function leaderboardReadiness(configuredIds, boards, locale) {
  const editable = [];
  const missing = [];
  for (const vendorIdentifier of configuredIds) {
    const board = boards.find(item => item.vendorIdentifier === vendorIdentifier && !item.archived);
    const versions = board ? board.versions : [];
    // Each leaderboard is judged by its newest version alone; an older live one cannot cover an unfinished newer one.
    const newest = versions.reduce((latest, version) => (!latest || (version.version || 0) > (latest.version || 0) ? version : latest), null);
    const named = newest && (!locale || (Array.isArray(newest.locales) && newest.locales.includes(locale)));
    if (newest && GAME_CENTER_EDITABLE.includes(newest.state) && named) editable.push(newest);
    else if (!newest || !LEADERBOARD_SETTLED.includes(newest.state)) missing.push(vendorIdentifier);
  }
  return { editable, missing };
}

// resubmissionPlan decides whether a resubmission can reuse the open submission. Apple lets a rejected
// (UNRESOLVED_ISSUES) submission take no new items, so one that lacks a leaderboard version that must go to review is
// replaced by a new submission holding the version and every leaderboard (409 seen 2026-10-13); so is one that lacks
// the app version `versionId`, such as a rejected submission holding only leaderboards.
export function resubmissionPlan(submission, items, leaderboardVersionIds, versionId) {
  const versions = items.filter(item => !relatedId(item, 'gameCenterLeaderboardVersion')).map(item => relatedId(item, 'appStoreVersion'));
  // A submission holding anything but this version and leaderboards is never canceled.
  if (new Set(versions).size > 1) return { action: 'conflict' };
  const present = items.map(item => relatedId(item, 'gameCenterLeaderboardVersion')).filter(Boolean);
  const missing = leaderboardVersionIds.filter(id => !present.includes(id));
  const lacksVersion = Boolean(versionId) && !versions.includes(versionId);
  if (submission.attributes.state === 'UNRESOLVED_ISSUES' && (missing.length || lacksVersion)) return { action: 'replace', missing: missing };
  return { action: 'reuse' };
}

// cancelSettled reports whether a canceled submission has finished: COMPLETE, or gone (null). COMPLETING is still in
// flight, and opening a new draft beside it can be refused.
export function cancelSettled(state) {
  return state === null || state === 'COMPLETE';
}

// settlingSubmissions returns the submissions whose cancellation is still in flight, which a rerun waits for before
// opening a new one.
export function settlingSubmissions(submissions) {
  return submissions.filter(item => ['CANCELING', 'COMPLETING'].includes(item.attributes.state));
}

// missingSubmissionItems returns what an open submission still lacks: the App Store version, and each editable
// leaderboard version, so `submit` can fill a draft left half-built by an earlier run before sending it.
export function missingSubmissionItems(items, versionId, leaderboardVersions) {
  return {
    version: !items.some(item => relatedId(item, 'appStoreVersion') === versionId),
    leaderboards: leaderboardVersionsToAttach(items, leaderboardVersions),
  };
}

// relatedId returns the id an item's to-one relationship carries, or null.
function relatedId(item, name) {
  const link = item.relationships && item.relationships[name] ? item.relationships[name].data : null;
  return link ? link.id : null;
}

// submissionPlan checks an open review submission's items: besides this version it may hold only Game Center
// leaderboard versions, which `game-center` adds to go to App Review with it, and it gains the version if missing.
export function submissionPlan(items, versionId) {
  const versions = items.filter(item => !relatedId(item, 'gameCenterLeaderboardVersion')).map(item => relatedId(item, 'appStoreVersion'));
  if (versions.some(id => id !== versionId)) return { action: 'conflict' };
  return { action: versions.includes(versionId) ? 'submit' : 'add' };
}

// staleScreenshotSets returns the sets whose display type the manifest no longer lists.
export function staleScreenshotSets(sets, manifest) {
  const types = manifest.map(group => group.displayType);
  return sets.filter(set => !types.includes(set.attributes.screenshotDisplayType));
}

// staleScreenshots returns the screenshots in a listed set whose file names its manifest group no longer lists.
export function staleScreenshots(existing, files) {
  const listed = files.map(file => basename(file));
  return existing.filter(item => !listed.includes(item.attributes.fileName));
}

// pickBuild returns the single build a lookup found, refusing an ambiguous or empty result.
export function pickBuild(builds, buildNumber, version) {
  if (builds.length > 1) throw new Error('Several builds numbered ' + buildNumber + ' for version ' + version + '; resolve them in App Store Connect.');
  if (!builds.length) throw new Error('Build ' + buildNumber + ' of version ' + version + ' has not reached App Store Connect yet.');
  return builds[0];
}

// itemVersionId returns the App Store version a review submission item carries, or null.
function itemVersionId(item) {
  return relatedId(item, 'appStoreVersion');
}

// alreadyInReview reports whether a submission waiting for or in review already carries this version.
export function alreadyInReview(submission, items, versionId) {
  return ['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(submission.attributes.state) && items.some(item => itemVersionId(item) === versionId);
}

// itemsToResolve returns this version's and its leaderboards' rejected items, which Apple requires marked resolved
// before resubmission.
export function itemsToResolve(items, versionId) {
  return items.filter(item => (itemVersionId(item) === versionId || relatedId(item, 'gameCenterLeaderboardVersion'))
    && item.attributes && item.attributes.state === 'REJECTED');
}

// GAME_CENTER_EDITABLE are the leaderboard version states whose localizations can change and that can go to review.
const GAME_CENTER_EDITABLE = ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'DEVELOPER_REJECTED', 'REJECTED'];
// LEADERBOARD_FIELDS are the store.json leaderboard attributes Apple lets an existing leaderboard change.
const LEADERBOARD_FIELDS = ['referenceName', 'defaultFormatter', 'submissionType', 'scoreSortType'];

// hasCapability reports whether a bundle ID's capability list already holds the given capability type.
export function hasCapability(capabilities, type) {
  return capabilities.some(item => item.attributes && item.attributes.capabilityType === type);
}

// leaderboardPlan matches one configured leaderboard to the app's existing ones by vendor identifier, which Apple never
// lets change: create it when absent, otherwise patch only the editable attributes that differ, unarchiving it too.
export function leaderboardPlan(existing, wanted) {
  const found = existing.find(item => item.attributes.vendorIdentifier === wanted.vendorIdentifier);
  if (!found) return { action: 'create' };
  const attributes = {};
  for (const key of LEADERBOARD_FIELDS) {
    if (found.attributes[key] !== wanted[key]) attributes[key] = wanted[key];
  }
  if (found.attributes.archived) attributes.archived = false;
  return Object.keys(attributes).length ? { action: 'update', id: found.id, attributes: attributes } : { action: 'keep', id: found.id };
}

// leaderboardVersionPlan picks the leaderboard version whose localization a run may edit: the newest one when it is
// still editable; a live newest version needs a new version for changed text, and one in review is left alone.
export function leaderboardVersionPlan(versions) {
  if (!versions.length) return { action: 'create' };
  const newest = versions.slice().sort((a, b) => (b.attributes.version || 0) - (a.attributes.version || 0))[0];
  const state = newest.attributes.state;
  if (GAME_CENTER_EDITABLE.includes(state)) return { action: 'use', id: newest.id, state: state };
  if (state === 'LIVE') return { action: 'live', id: newest.id, state: state };
  return { action: 'locked', id: newest.id, state: state };
}

// localizationAttributes returns the localization a configured leaderboard wants, with absent optional text as null.
export function localizationAttributes(wanted) {
  const copy = wanted.localization;
  return { name: copy.name, formatterSuffix: copy.formatterSuffix || null, formatterSuffixSingular: copy.formatterSuffixSingular || null, description: copy.description || null };
}

// savedLocalization reads Apple's echoed localization the way localizationPlan compares it, an empty string as null.
export function savedLocalization(attributes) {
  const read = {};
  for (const key of Object.keys(attributes)) read[key] = attributes[key] === '' ? null : attributes[key];
  return read;
}

// uniqueById drops repeated resources, as when one listing is read twice with different filters.
export function uniqueById(items) {
  const seen = new Set();
  return items.filter(item => !seen.has(item.id) && seen.add(item.id));
}

// localizationPlan creates the locale's leaderboard localization when missing and patches only the fields that differ.
export function localizationPlan(existing, locale, wanted) {
  const found = existing.find(item => item.attributes.locale === locale);
  if (!found) {
    // A new localization sends only the text it has; null clears a field only on an existing one.
    const attributes = { locale: locale };
    for (const key of Object.keys(wanted)) if (wanted[key] !== null) attributes[key] = wanted[key];
    return { action: 'create', attributes: attributes };
  }
  const attributes = {};
  for (const key of Object.keys(wanted)) {
    const current = Object.hasOwn(found.attributes, key) ? found.attributes[key] : null;
    if ((current || null) !== wanted[key]) attributes[key] = wanted[key];
  }
  return Object.keys(attributes).length ? { action: 'update', id: found.id, attributes: attributes } : { action: 'keep', id: found.id };
}

// leaderboardVersionsToAttach returns the editable leaderboard versions a review submission does not hold yet, so a
// rerun never adds one twice.
export function leaderboardVersionsToAttach(items, versions) {
  const present = items.map(item => relatedId(item, 'gameCenterLeaderboardVersion')).filter(Boolean);
  return versions.filter(version => (GAME_CENTER_EDITABLE.includes(version.state) || version.carried === true) && !present.includes(version.id))
    .map(version => version.id);
}

// replacementLeaderboards lists the leaderboard versions a replacement draft must hold: the refreshed editable ones and
// every one the canceled submission held, since Apple requires accepted items to be resubmitted after a cancel.
export function replacementLeaderboards(refreshed, heldItems) {
  const ids = refreshed.map(version => version.id);
  const carried = heldItems.map(item => relatedId(item, 'gameCenterLeaderboardVersion')).filter(id => id && !ids.includes(id))
    .map(id => ({ id: id, carried: true }));
  return refreshed.concat(carried);
}

// manualTestflightGroups returns the configured internal group when it needs the build added; a group with access to
// all builds receives every build on its own and rejects a manual add, and other groups are left alone.
export function manualTestflightGroups(groups, name) {
  return groups.filter(group => group.attributes.name === name && group.attributes.isInternalGroup && !group.attributes.hasAccessToAllBuilds);
}

// context finds the app, its editable App Info and the iOS version being prepared; writing commands pass
// prepare=true to create or rename that version when the configured version string has none yet.
async function context(prepare) {
  const app = (await api('/v1/apps/' + IOS.ascAppId)).data;
  const infos = await listAll('/v1/apps/' + IOS.ascAppId + '/appInfos');
  // Only metadata edits need an editable App Info; submit and release read the version alone.
  const editableInfo = editableAppInfo(infos);
  const versions = await listAll('/v1/apps/' + IOS.ascAppId + '/appStoreVersions?filter[platform]=IOS');
  let version = versions.find(item => item.attributes.versionString === STORE.version);
  if (!version && !prepare) throw new Error('No iOS version ' + STORE.version + ' yet; run `listing` to prepare it.');
  if (!version) {
    const editable = versions.find(item => EDITABLE_STATES.includes(versionState(item)));
    if (editable) {
      version = (await api('/v1/appStoreVersions/' + editable.id, 'PATCH', { data: { type: 'appStoreVersions', id: editable.id, attributes: { versionString: STORE.version } } })).data;
    } else {
      version = (await api('/v1/appStoreVersions', 'POST', { data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString: STORE.version }, relationships: { app: relation('apps', IOS.ascAppId) } } })).data;
    }
  }
  return { app: app, info: editableInfo, version: version };
}

// requireEditableInfo stops a metadata edit when no App Info can be edited.
function requireEditableInfo(ctx) {
  if (!ctx.info) throw new Error('No editable App Info; create the next version in App Store Connect first.');
}

// versionLocalization returns the version's localization for the listing locale; `create` makes it when a newly
// prepared version does not have one yet.
async function versionLocalization(versionId, create) {
  const items = await listAll('/v1/appStoreVersions/' + versionId + '/appStoreVersionLocalizations');
  const found = items.find(item => item.attributes.locale === STORE.listing.locale);
  if (found) return found;
  if (!create) throw new Error('No ' + STORE.listing.locale + ' version localization; run `listing` first.');
  return (await api('/v1/appStoreVersionLocalizations', 'POST', { data: { type: 'appStoreVersionLocalizations', attributes: { locale: STORE.listing.locale }, relationships: { appStoreVersion: relation('appStoreVersions', versionId) } } })).data;
}

// status prints the release state Apple reports, so every run starts from facts rather than memory.
async function status() {
  const app = (await api('/v1/apps/' + IOS.ascAppId)).data;
  console.log('App', app.attributes.name, app.attributes.bundleId, 'id', app.id);
  const versions = await listAll('/v1/apps/' + IOS.ascAppId + '/appStoreVersions?filter[platform]=IOS');
  for (const item of versions) console.log('  version', item.attributes.versionString, versionState(item), 'id', item.id);
  const builds = await api('/v1/builds?filter[app]=' + IOS.ascAppId + '&sort=-uploadedDate&limit=5');
  for (const item of builds.data) console.log('  build', item.attributes.version, item.attributes.processingState, item.attributes.uploadedDate);
  const submissions = await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&limit=5');
  for (const item of submissions.data) {
    console.log('  review submission', item.id, item.attributes.state, item.attributes.submittedDate || '');
    // Open and rejected submissions show what they hold; UNRESOLVED_ISSUES means App Review rejected it.
    if (['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES', 'WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(item.attributes.state)) {
      for (const entry of await submissionItems(item.id)) console.log('    item', entry.id, entry.attributes.state, describeItem(entry));
    }
  }
  const version = versions.find(item => item.attributes.versionString === STORE.version);
  if (!version) {
    console.log('No version', STORE.version, 'yet; `listing` prepares it.');
    return;
  }
  const ctx = { version: version };
  const build = await related('/v1/appStoreVersions/' + ctx.version.id + '/build');
  console.log('Attached build', build.data ? build.data.attributes.version + ' ' + build.data.attributes.processingState : 'none');
  const localizations = await listAll('/v1/appStoreVersions/' + ctx.version.id + '/appStoreVersionLocalizations');
  const localization = localizations.find(item => item.attributes.locale === STORE.listing.locale);
  if (!localization) {
    console.log('No', STORE.listing.locale, 'version localization yet; `listing` creates it.');
    return;
  }
  const sets = await listAll('/v1/appStoreVersionLocalizations/' + localization.id + '/appScreenshotSets');
  for (const set of sets) {
    const shots = await listAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots');
    console.log('  screenshots', set.attributes.screenshotDisplayType, shots.map(shot => shot.attributes.assetDeliveryState.state).join(','));
  }
  const reviewDetail = await related('/v1/appStoreVersions/' + ctx.version.id + '/appStoreReviewDetail');
  if (reviewDetail.data) {
    for (const file of await listAll('/v1/appStoreReviewDetails/' + reviewDetail.data.id + '/appStoreReviewAttachments')) {
      const delivery = file.attributes.assetDeliveryState;
      console.log('  review attachment', file.attributes.fileName, delivery ? delivery.state : 'unknown');
    }
  }
  if (STORE.gameCenter) await gameCenterStatus(ctx.version.id);
}

// describeItem names what a review submission item carries.
function describeItem(item) {
  if (relatedId(item, 'appStoreVersion')) return 'appStoreVersion ' + relatedId(item, 'appStoreVersion');
  if (relatedId(item, 'gameCenterLeaderboardVersion')) return 'leaderboard version ' + relatedId(item, 'gameCenterLeaderboardVersion');
  return '';
}

// gameCenterStatus prints the bundle capability, Game Center detail, leaderboards and the version's Game Center link.
async function gameCenterStatus(versionId) {
  if (!IOS.bundleIdResource) {
    console.log('Game Center: set ios.bundleIdResource in app-release.config.json to read the capability.');
    return;
  }
  const capabilities = await listAll('/v1/bundleIds/' + IOS.bundleIdResource + '/bundleIdCapabilities');
  console.log('Game Center capability', hasCapability(capabilities, 'GAME_CENTER') ? 'on' : 'off');
  const detail = await related('/v1/apps/' + IOS.ascAppId + '/gameCenterDetail');
  if (!detail.data) {
    console.log('Game Center not enabled for the app; `game-center` enables it.');
    return;
  }
  const boards = await listAll('/v1/gameCenterDetails/' + detail.data.id + '/gameCenterLeaderboardsV2?limit=200');
  for (const board of boards) {
    const versions = await listAll('/v2/gameCenterLeaderboards/' + board.id + '/versions?limit=200');
    console.log('  leaderboard', board.attributes.vendorIdentifier, versions.map(item => 'v' + item.attributes.version + ' ' + item.attributes.state).join(', '));
  }
  const link = await related('/v1/appStoreVersions/' + versionId + '/gameCenterAppVersion');
  console.log('  version', STORE.version, 'Game Center', link.data ? (link.data.attributes.enabled ? 'enabled' : 'disabled') : 'not linked');
}

// categoryRelationships maps the listing's categories to App Info relationships. Only game categories have
// subcategories (GET /v1/appCategories/GAMES/subcategories); a secondary category is optional.
export function categoryRelationships(copy) {
  if (!copy.primaryCategory) throw new Error('The listing names no primaryCategory');
  const relationships = { primaryCategory: relation('appCategories', copy.primaryCategory) };
  const subcategories = copy.primarySubcategories || [];
  if (subcategories[0]) relationships.primarySubcategoryOne = relation('appCategories', subcategories[0]);
  if (subcategories[1]) relationships.primarySubcategoryTwo = relation('appCategories', subcategories[1]);
  if (copy.secondaryCategory) relationships.secondaryCategory = relation('appCategories', copy.secondaryCategory);
  return relationships;
}

// listing saves the name, subtitle, privacy URL, categories, content rights, copyright and version copy.
async function listing() {
  const ctx = await context(true);
  requireEditableInfo(ctx);
  const copy = STORE.listing;
  const infoLocalizations = await listAll('/v1/appInfos/' + ctx.info.id + '/appInfoLocalizations');
  const infoLocalization = infoLocalizations.find(item => item.attributes.locale === copy.locale);
  if (!infoLocalization) throw new Error('No ' + copy.locale + ' App Info localization; add the locale in App Store Connect first.');
  const infoAttributes = { name: copy.name, subtitle: copy.subtitle, privacyPolicyUrl: copy.privacyPolicyUrl };
  const savedInfo = await api('/v1/appInfoLocalizations/' + infoLocalization.id, 'PATCH', { data: { type: 'appInfoLocalizations', id: infoLocalization.id, attributes: infoAttributes } });
  assertSaved('App Info localization', infoAttributes, savedInfo.data.attributes);
  const relationships = categoryRelationships(copy);
  await api('/v1/appInfos/' + ctx.info.id, 'PATCH', { data: { type: 'appInfos', id: ctx.info.id, relationships: relationships } });
  for (const key of Object.keys(relationships)) {
    const saved = await api('/v1/appInfos/' + ctx.info.id + '/relationships/' + key);
    if (!saved.data || saved.data.id !== relationships[key].data.id) throw new Error('Category readback mismatch on ' + key);
  }
  if (copy.contentRightsDeclaration) {
    const appAttributes = { contentRightsDeclaration: copy.contentRightsDeclaration };
    const savedApp = await api('/v1/apps/' + IOS.ascAppId, 'PATCH', { data: { type: 'apps', id: IOS.ascAppId, attributes: appAttributes } });
    assertSaved('App', appAttributes, savedApp.data.attributes);
  }
  const versionAttributes = { copyright: copy.copyright, releaseType: copy.releaseType || 'MANUAL' };
  const savedVersion = await api('/v1/appStoreVersions/' + ctx.version.id, 'PATCH', { data: { type: 'appStoreVersions', id: ctx.version.id, attributes: versionAttributes } });
  assertSaved('Version', versionAttributes, savedVersion.data.attributes);
  const localization = await versionLocalization(ctx.version.id, true);
  const copyAttributes = { description: copy.description, keywords: copy.keywords, promotionalText: copy.promotionalText, supportUrl: copy.supportUrl, marketingUrl: copy.marketingUrl };
  // Apple rejects "What's New" on an app's first version, so it is sent only once a version is live.
  const live = (await listAll('/v1/apps/' + IOS.ascAppId + '/appStoreVersions?filter[platform]=IOS')).some(item => LIVE_STATES.includes(versionState(item)));
  if (live && copy.whatsNew) copyAttributes.whatsNew = copy.whatsNew;
  const savedCopy = await api('/v1/appStoreVersionLocalizations/' + localization.id, 'PATCH', { data: { type: 'appStoreVersionLocalizations', id: localization.id, attributes: copyAttributes } });
  assertSaved('Version localization', copyAttributes, savedCopy.data.attributes);
  console.log('Saved and verified name, subtitle, privacy URL, categories, content rights, copyright and listing copy.');
}

// ageRating answers the age-rating questionnaire from store.json, sending only attributes Apple currently accepts.
async function ageRating() {
  if (!STORE.ageRating) throw new Error('The store data has no ageRating answers');
  const ctx = await context();
  requireEditableInfo(ctx);
  const declaration = (await api('/v1/appInfos/' + ctx.info.id + '/ageRatingDeclaration')).data;
  const attributes = {};
  for (const key of Object.keys(STORE.ageRating)) {
    if (Object.hasOwn(declaration.attributes, key)) attributes[key] = STORE.ageRating[key];
    else console.log('Apple no longer has age-rating question', key, '- remove it from the store data');
  }
  const unanswered = Object.keys(declaration.attributes).filter(key => !Object.hasOwn(STORE.ageRating, key));
  if (unanswered.length) console.log('Questions the store data does not answer (left as Apple has them):', unanswered.join(', '));
  const saved = await api('/v1/ageRatingDeclarations/' + declaration.id, 'PATCH', { data: { type: 'ageRatingDeclarations', id: declaration.id, attributes: attributes } });
  assertSaved('Age rating', attributes, saved.data.attributes);
  console.log('Saved and verified the age-rating declaration.');
}

// priceTarget reads the store data's pricing: a base territory and its customer price, free when absent.
export function priceTarget(pricing) {
  const value = pricing && pricing.basePrice !== undefined ? String(pricing.basePrice) : '0';
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('pricing.basePrice must be a decimal such as 0 or 1.00');
  return { territory: (pricing && pricing.baseTerritory) || 'USA', price: Number(value) };
}

// scheduleMatches reports whether an existing schedule's manual prices carry the wanted price. A free app needs every
// manual price free; a paid one needs the wanted base price and no free price, which would be a sale or a mistake.
export function scheduleMatches(points, price) {
  if (!points.length || points.some(point => !point)) return false;
  const prices = points.map(point => Number(point.attributes.customerPrice));
  if (price === 0) return prices.every(value => value === 0);
  return prices.includes(price) && !prices.includes(0);
}

// pricing sets the base-territory price from the store data (Apple equalizes the other storefronts) and makes the app
// available in every territory, including future ones. A paid price also needs an active Paid Apps Agreement.
async function pricing() {
  const target = priceTarget(STORE.pricing);
  const points = await listAll('/v1/apps/' + IOS.ascAppId + '/appPricePoints?filter[territory]=' + target.territory + '&limit=200');
  const point = points.find(item => Number(item.attributes.customerPrice) === target.price);
  if (!point) throw new Error('No ' + target.territory + ' price point of ' + target.price + '; pick one Apple lists under Pricing and Availability');
  try {
    await api('/v1/appPriceSchedules', 'POST', {
      data: { type: 'appPriceSchedules', relationships: { app: relation('apps', IOS.ascAppId), baseTerritory: relation('territories', target.territory), manualPrices: { data: [{ type: 'appPrices', id: '${price}' }] } } },
      included: [{ type: 'appPrices', id: '${price}', attributes: { startDate: null }, relationships: { appPricePoint: relation('appPricePoints', point.id) } }]
    });
  } catch (error) {
    // A rerun after an earlier success meets the existing schedule; keep it and go on to availability.
    if (!String(error.message).includes(' -> 409 ')) throw error;
    const schedule = await related('/v1/apps/' + IOS.ascAppId + '/appPriceSchedule');
    if (!schedule.data) throw error;
    // Read every storefront's manual prices with their price points, following pagination.
    const prices = { data: [], included: [] };
    let next = '/v1/appPriceSchedules/' + schedule.data.id + '/manualPrices?include=appPricePoint&limit=200';
    while (next) {
      const page = await api(next);
      for (const item of page.data) prices.data.push(item);
      for (const item of page.included || []) prices.included.push(item);
      next = page.links && page.links.next ? page.links.next.replace(API, '') : null;
    }
    if (!scheduleMatches(schedulePricePoints(prices), target.price)) {
      throw new Error('The existing price schedule does not hold ' + target.territory + ' ' + target.price + '; change it under Pricing and Availability, then rerun `pricing`.');
    }
    console.log('Price schedule already exists at ' + target.territory + ' ' + target.price + '.');
  }
  const territories = await listAll('/v1/territories?limit=200');
  const included = territories.map(territory => ({ type: 'territoryAvailabilities', id: '${' + territory.id + '}', attributes: { available: true }, relationships: { territory: relation('territories', territory.id) } }));
  try {
    await api('/v2/appAvailabilities', 'POST', {
      data: { type: 'appAvailabilities', attributes: { availableInNewTerritories: true }, relationships: { app: relation('apps', IOS.ascAppId), territoryAvailabilities: { data: included.map(item => ({ type: item.type, id: item.id })) } } },
      included: included
    });
  } catch (error) {
    // An app keeps one availability record; a 409 means it exists, so report it rather than recreating it.
    if (!String(error.message).includes('409')) throw error;
    // The app already has an availability record, so turn on each territory it leaves unavailable.
    const availability = (await api('/v1/apps/' + IOS.ascAppId + '/appAvailabilityV2')).data;
    const current = await listAll('/v2/appAvailabilities/' + availability.id + '/territoryAvailabilities?limit=200');
    for (const item of current.filter(entry => !entry.attributes.available)) {
      await api('/v1/territoryAvailabilities/' + item.id, 'PATCH', { data: { type: 'territoryAvailabilities', id: item.id, attributes: { available: true } } });
    }
    // Apple accepts the future-storefront flag only when the record is created (apps has no such attribute and the
    // record cannot be edited), so report it rather than claim it.
    if (!availability.attributes.availableInNewTerritories) {
      throw new Error('New storefronts are off on the existing availability record; turn on "Make available in all future countries" under Pricing and Availability, then rerun `pricing`.');
    }
    console.log('Availability existed; enabled', current.filter(entry => !entry.attributes.available).length, 'unavailable territories of', current.length + '.');
    return;
  }
  console.log('Requested', target.territory, target.price, 'and availability in', territories.length, 'territories; confirm under Pricing and Availability.');
}

// screenshots uploads each listed image that is missing from its display-type set, verifying Apple's checksum.
async function screenshots() {
  const ctx = await context();
  const localization = await versionLocalization(ctx.version.id);
  const sets = await listAll('/v1/appStoreVersionLocalizations/' + localization.id + '/appScreenshotSets');
  // Remove whole sets for display types the manifest no longer lists, so their screenshots leave the product page.
  const groups = screenshotGroups(CONFIG, STORE.screenshots);
  if (!groups.length) throw new Error('The store data lists no screenshots');
  for (const stale of staleScreenshotSets(sets, groups)) {
    await api('/v1/appScreenshotSets/' + stale.id, 'DELETE');
    console.log('removed set', stale.attributes.screenshotDisplayType, '(not in the manifest)');
  }
  for (const group of groups) {
    let set = sets.find(item => item.attributes.screenshotDisplayType === group.displayType);
    if (!set) {
      set = (await api('/v1/appScreenshotSets', 'POST', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: group.displayType }, relationships: { appStoreVersionLocalization: relation('appStoreVersionLocalizations', localization.id) } } })).data;
    }
    const existing = await listAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots');
    const ordered = [];
    // The manifest is canonical: remove screenshots it no longer lists so they leave the product page.
    for (const stale of staleScreenshots(existing, group.files)) {
      await api('/v1/appScreenshots/' + stale.id, 'DELETE');
      console.log('removed', group.displayType, stale.attributes.fileName, '(not in the manifest)');
    }
    for (const file of group.files) {
      const path = resolve(CONFIG.root, file);
      const bytes = readFileSync(path);
      const checksum = createHash('md5').update(bytes).digest('hex');
      const plan = screenshotAction(existing, basename(path), checksum);
      if (plan.action === 'conflict') throw new Error(basename(path) + ' differs from the uploaded copy; delete it in App Store Connect to replace it.');
      if (plan.action === 'keep') {
        ordered.push(plan.id);
        console.log('kept', group.displayType, basename(path));
        continue;
      }
      // An upload that never finished leaves a reservation without a checksum; drop it and upload again.
      if (plan.action === 'replace') await api('/v1/appScreenshots/' + plan.id, 'DELETE');
      const reserved = (await api('/v1/appScreenshots', 'POST', { data: { type: 'appScreenshots', attributes: { fileName: basename(path), fileSize: statSync(path).size }, relationships: { appScreenshotSet: relation('appScreenshotSets', set.id) } } })).data;
      await uploadParts(reserved.attributes.uploadOperations, bytes, basename(path));
      await api('/v1/appScreenshots/' + reserved.id, 'PATCH', { data: { type: 'appScreenshots', id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: checksum } } });
      ordered.push(reserved.id);
      console.log('uploaded', group.displayType, basename(path));
    }
    // Put the set in the manifest's order, which a rerun that only reorders files would otherwise leave unchanged.
    await api('/v1/appScreenshotSets/' + set.id + '/relationships/appScreenshots', 'PATCH', { data: ordered.map(id => ({ type: 'appScreenshots', id: id })) });
    const after = await listAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots');
    if (after.map(item => item.id).join() !== ordered.join()) throw new Error('Screenshot order did not read back for ' + group.displayType);
  }
  console.log('Run `status` until every screenshot reads COMPLETE.');
}

// uploadParts sends a reserved asset's bytes through the upload operations Apple returned, one part per operation.
async function uploadParts(operations, bytes, label) {
  for (const operation of operations) {
    const headers = {};
    for (const header of operation.requestHeaders) headers[header.name] = header.value;
    const part = bytes.subarray(operation.offset, operation.offset + operation.length);
    const response = await fetch(operation.url, { method: operation.method, headers: headers, body: part });
    if (!response.ok) throw new Error('Upload of ' + label + ' failed with ' + response.status);
  }
}

// waitForAttachment polls an attachment until Apple finishes processing it, returning 'complete', 'failed', or
// 'pending' when it is still processing after about ten minutes.
async function waitForAttachment(id) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const current = (await api('/v1/appStoreReviewAttachments/' + id)).data;
    const delivery = current.attributes.assetDeliveryState;
    const settled = attachmentSettled(delivery ? delivery.state : '');
    if (settled !== 'pending') return settled;
    await new Promise(done => setTimeout(done, 5000));
  }
  return 'pending';
}

// reviewAttachment uploads a file App Review asked for (such as the walkthrough recording) to the version's App
// Review Information attachments. Every copy with the same name is reconciled: an identical finished copy is kept, and
// the others are deleted only once the kept or new copy is COMPLETE, so App Review always has a usable one. The file
// stays outside the repository; `status` lists each attachment's state.
async function reviewAttachment(file) {
  if (!file) throw new Error('Usage: asc.mjs review-attachment <path to the file>');
  const ctx = await context();
  const path = resolve(file);
  const detail = await related('/v1/appStoreVersions/' + ctx.version.id + '/appStoreReviewDetail');
  if (!detail.data) throw new Error('Version ' + STORE.version + ' has no App Review details yet; run `review-details` first.');
  const listPath = '/v1/appStoreReviewDetails/' + detail.data.id + '/appStoreReviewAttachments';
  const bytes = readFileSync(path);
  const checksum = createHash('md5').update(bytes).digest('hex');
  const plan = attachmentPlan(await listAll(listPath), basename(path), checksum, statSync(path).size);
  let id = plan.id;
  if (plan.action === 'upload') {
    const reserved = (await api('/v1/appStoreReviewAttachments', 'POST', { data: { type: 'appStoreReviewAttachments', attributes: { fileName: basename(path), fileSize: statSync(path).size }, relationships: { appStoreReviewDetail: relation('appStoreReviewDetails', detail.data.id) } } })).data;
    await uploadParts(reserved.attributes.uploadOperations, bytes, basename(path));
    await api('/v1/appStoreReviewAttachments/' + reserved.id, 'PATCH', { data: { type: 'appStoreReviewAttachments', id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: checksum } } });
    const saved = (await api('/v1/appStoreReviewAttachments/' + reserved.id)).data;
    if (attachmentReadBack(saved.attributes, checksum) === 'mismatch') throw new Error('Attachment ' + basename(path) + ' read back with a different checksum');
    id = reserved.id;
    console.log('uploaded attachment', basename(path), (statSync(path).size / 1048576).toFixed(1) + ' MB; waiting for Apple to process it');
  }
  const settled = plan.action === 'keep' ? 'complete' : await waitForAttachment(id);
  if (settled === 'failed') throw new Error('Apple failed to process ' + basename(path) + '; earlier copies were kept. Rerun to upload it again.');
  if (settled === 'pending') {
    console.log('Attachment', basename(path), 'is still processing; earlier copies were kept. Rerun later to finish.');
    return;
  }
  // Once processed, the kept or new copy must carry this file's checksum before any earlier copy goes.
  if (attachmentReadBack((await api('/v1/appStoreReviewAttachments/' + id)).data.attributes, checksum) !== 'ok') {
    throw new Error('Attachment ' + basename(path) + ' finished without this file\'s checksum; earlier copies were kept.');
  }
  for (const stale of plan.remove) {
    await api('/v1/appStoreReviewAttachments/' + stale, 'DELETE');
    console.log('removed an earlier', basename(path));
  }
  console.log(plan.action === 'keep' ? 'kept attachment' : 'attachment ready:', basename(path), 'COMPLETE');
}

// reviewDetails saves the App Review contact and notes; the phone number comes from ASC_REVIEW_PHONE or from an
// existing review detail on any of the developer's apps, held in memory and never written to the repository.
async function reviewDetails() {
  const ctx = await context();
  const contact = STORE.review;
  let phone = process.env.ASC_REVIEW_PHONE || '';
  const current = await related('/v1/appStoreVersions/' + ctx.version.id + '/appStoreReviewDetail');
  if (!phone && current.data) phone = current.data.attributes.contactPhone || '';
  if (!phone) {
    for (const app of await listAll('/v1/apps')) {
      for (const version of await listAll('/v1/apps/' + app.id + '/appStoreVersions?limit=5')) {
        const detail = await related('/v1/appStoreVersions/' + version.id + '/appStoreReviewDetail');
        const found = detail.data ? detail.data.attributes : null;
        // Reuse only the same person's number, never another contact's.
        if (found && found.contactPhone && found.contactFirstName === contact.firstName && found.contactLastName === contact.lastName) {
          phone = found.contactPhone;
          break;
        }
      }
      if (phone) break;
    }
  }
  if (!phone) throw new Error('Apple requires a review contact phone; set ASC_REVIEW_PHONE for this run and never commit it.');
  const attributes = { contactFirstName: contact.firstName, contactLastName: contact.lastName, contactEmail: contact.email, contactPhone: phone, demoAccountRequired: contact.demoAccountRequired === true, notes: contact.notes };
  const saved = current.data
    ? await api('/v1/appStoreReviewDetails/' + current.data.id, 'PATCH', { data: { type: 'appStoreReviewDetails', id: current.data.id, attributes: attributes } })
    : await api('/v1/appStoreReviewDetails', 'POST', { data: { type: 'appStoreReviewDetails', attributes: attributes, relationships: { appStoreVersion: relation('appStoreVersions', ctx.version.id) } } });
  assertSaved('Review details', attributes, saved.data.attributes);
  console.log('Saved and verified the review contact and notes.');
}

// openReviewSubmission returns the app's open (draft or rejected) review submission, creating a draft when there is
// none; `submit` sends it, and `game-center` adds the leaderboards to it first so they go to App Review together.
async function openReviewSubmission() {
  const open = (await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES')).data;
  if (open.length) return open[0];
  return (await api('/v1/reviewSubmissions', 'POST', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: relation('apps', IOS.ascAppId) } } })).data;
}

// submissionInReview returns the submission already waiting for or in review with this version, or null.
async function submissionInReview(versionId) {
  const active = (await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=WAITING_FOR_REVIEW,IN_REVIEW')).data;
  for (const pending of active) {
    if (alreadyInReview(pending, await submissionItems(pending.id), versionId)) return pending;
  }
  return null;
}

// submissionItems lists a review submission's items with the version and leaderboard version each one carries.
function submissionItems(submissionId) {
  return listAll('/v1/reviewSubmissions/' + submissionId + '/items?include=appStoreVersion,gameCenterLeaderboardVersion');
}

// enableGameCenterCapability turns on the bundle ID's GAME_CENTER capability, which the app's entitlement needs; the
// provisioning profile must be regenerated afterwards, because a profile carries the capabilities it was made with.
async function enableGameCenterCapability() {
  if (!IOS.bundleIdResource) throw new Error('app-release.config.json ios.bundleIdResource (the bundle ID resource id from GET /v1/bundleIds) is needed for Game Center');
  const path = '/v1/bundleIds/' + IOS.bundleIdResource + '/bundleIdCapabilities';
  if (hasCapability(await listAll(path), 'GAME_CENTER')) {
    console.log('GAME_CENTER capability already on for', IOS.bundleId);
    return false;
  }
  await api('/v1/bundleIdCapabilities', 'POST', { data: { type: 'bundleIdCapabilities', attributes: { capabilityType: 'GAME_CENTER' }, relationships: { bundleId: relation('bundleIds', IOS.bundleIdResource) } } });
  if (!hasCapability(await listAll(path), 'GAME_CENTER')) throw new Error('GAME_CENTER capability did not read back');
  console.log('Enabled GAME_CENTER on', IOS.bundleId + '; regenerate the provisioning profile before the next build.');
  return true;
}

// enableGameCenterDetail returns the app's Game Center detail, creating it (Game Center on for the app) when absent.
async function enableGameCenterDetail() {
  const current = await related('/v1/apps/' + IOS.ascAppId + '/gameCenterDetail');
  if (current.data) return current.data;
  await api('/v1/gameCenterDetails', 'POST', { data: { type: 'gameCenterDetails', relationships: { app: relation('apps', IOS.ascAppId) } } });
  const saved = await related('/v1/apps/' + IOS.ascAppId + '/gameCenterDetail');
  if (!saved.data) throw new Error('Game Center detail did not read back');
  console.log('Enabled Game Center for the app');
  return saved.data;
}

// syncLeaderboard creates or updates one configured leaderboard and its listing-locale localization, returning the
// leaderboard version that should go to App Review with the app version, or null when none can.
async function syncLeaderboard(detailId, existing, wanted) {
  const label = wanted.vendorIdentifier;
  const attributes = { vendorIdentifier: wanted.vendorIdentifier };
  for (const key of LEADERBOARD_FIELDS) attributes[key] = wanted[key];
  const plan = leaderboardPlan(existing, wanted);
  let id = plan.id;
  if (plan.action === 'create') {
    // Apple's v2 API creates a leaderboard together with its first version, referenced by a local id.
    const created = await api('/v2/gameCenterLeaderboards', 'POST', {
      data: { type: 'gameCenterLeaderboards', attributes: attributes, relationships: { gameCenterDetail: relation('gameCenterDetails', detailId), versions: { data: [{ type: 'gameCenterLeaderboardVersions', id: '${version}' }] } } },
      included: [{ type: 'gameCenterLeaderboardVersions', id: '${version}' }]
    });
    id = created.data.id;
    console.log('created leaderboard', label);
  } else if (plan.action === 'update') {
    await api('/v2/gameCenterLeaderboards/' + id, 'PATCH', { data: { type: 'gameCenterLeaderboards', id: id, attributes: plan.attributes } });
    console.log('updated leaderboard', label, Object.keys(plan.attributes).join(', '));
  }
  assertSaved('Leaderboard ' + label, Object.assign(attributes, { archived: false }), (await api('/v2/gameCenterLeaderboards/' + id)).data.attributes);
  const versions = await listAll('/v2/gameCenterLeaderboards/' + id + '/versions?limit=200');
  const versionPlan = leaderboardVersionPlan(versions);
  if (versionPlan.action === 'locked') {
    console.log('kept', label, 'text: its version is', versionPlan.state);
    return null;
  }
  const locale = STORE.listing.locale;
  const copy = localizationAttributes(wanted);
  let versionId = versionPlan.id;
  let action = versionPlan.action;
  if (action === 'live') {
    // Live text changes only through a new version, made only when the text actually differs.
    const live = await listAll('/v2/gameCenterLeaderboardVersions/' + versionId + '/localizations');
    if (localizationPlan(live, locale, copy).action === 'keep') {
      console.log('kept', label, '(live, unchanged)');
      return null;
    }
    action = 'create';
  }
  if (action === 'create') {
    versionId = (await api('/v2/gameCenterLeaderboardVersions', 'POST', { data: { type: 'gameCenterLeaderboardVersions', relationships: { leaderboard: relation('gameCenterLeaderboards', id) } } })).data.id;
  }
  const textPlan = localizationPlan(await listAll('/v2/gameCenterLeaderboardVersions/' + versionId + '/localizations'), locale, copy);
  let savedId = textPlan.id;
  if (textPlan.action === 'create') {
    savedId = (await api('/v2/gameCenterLeaderboardLocalizations', 'POST', { data: { type: 'gameCenterLeaderboardLocalizations', attributes: textPlan.attributes, relationships: { version: relation('gameCenterLeaderboardVersions', versionId) } } })).data.id;
  } else if (textPlan.action === 'update') {
    await api('/v2/gameCenterLeaderboardLocalizations/' + savedId, 'PATCH', { data: { type: 'gameCenterLeaderboardLocalizations', id: savedId, attributes: textPlan.attributes } });
  }
  assertSaved('Leaderboard localization ' + label, copy, savedLocalization((await api('/v2/gameCenterLeaderboardLocalizations/' + savedId)).data.attributes));
  const version = (await api('/v2/gameCenterLeaderboardVersions/' + versionId)).data;
  return { id: version.id, state: version.attributes.state };
}

// enableVersionGameCenter links the App Store version to Game Center, the version page's Game Center switch.
async function enableVersionGameCenter(versionId) {
  const path = '/v1/appStoreVersions/' + versionId + '/gameCenterAppVersion';
  let link = (await related(path)).data;
  if (!link) {
    await api('/v1/gameCenterAppVersions', 'POST', { data: { type: 'gameCenterAppVersions', relationships: { appStoreVersion: relation('appStoreVersions', versionId) } } });
    link = (await related(path)).data;
    if (!link) throw new Error('Game Center app version did not read back');
  }
  if (link.attributes.enabled !== true) {
    const saved = await api('/v1/gameCenterAppVersions/' + link.id, 'PATCH', { data: { type: 'gameCenterAppVersions', id: link.id, attributes: { enabled: true } } });
    assertSaved('Game Center app version', { enabled: true }, saved.data.attributes);
  }
  console.log('Game Center is on for version', STORE.version);
}

// gameCenter sets up Game Center from store.json and is safe to rerun: capability, app detail, leaderboards with their
// localization, the version's Game Center switch, then the leaderboards added to the open review submission so the
// next `submit --confirm` sends them to App Review with the app.
async function gameCenter() {
  const config = STORE.gameCenter;
  if (!config || !Array.isArray(config.leaderboards) || !config.leaderboards.length) throw new Error('The store data has no gameCenter.leaderboards');
  const ctx = await context();
  const profileStale = await enableGameCenterCapability();
  const detail = await enableGameCenterDetail();
  // Archived leaderboards are read too, since a vendor identifier can never be reused and an archived one is restored.
  const path = '/v1/gameCenterDetails/' + detail.id + '/gameCenterLeaderboardsV2?limit=200';
  const existing = uniqueById((await listAll(path)).concat(await listAll(path + '&filter[archived]=true')));
  const versions = [];
  for (const wanted of config.leaderboards) {
    const version = await syncLeaderboard(detail.id, existing, wanted);
    if (version) versions.push(version);
  }
  await enableVersionGameCenter(ctx.version.id);
  const inReview = await submissionInReview(ctx.version.id);
  if (inReview) {
    // A submission already in review cannot gain items; a draft beside it would only strand the leaderboards.
    console.log('Version', STORE.version, 'is', inReview.attributes.state, 'in submission', inReview.id + '; leaderboards join the next submission.');
    return;
  }
  const submission = await openReviewSubmission();
  const held = await submissionItems(submission.id);
  if (resubmissionPlan(submission, held, versions.map(version => version.id), ctx.version.id).action === 'replace') {
    // A rejected submission takes no new items; `submit --confirm` replaces it with one holding the leaderboards.
    console.log('Submission', submission.id, 'is rejected and cannot take the leaderboards; `submit --confirm` opens a new one with them.');
    if (profileStale) console.log('Regenerate the provisioning profile (references/ios.md, Game Center) before building.');
    return;
  }
  const toAttach = leaderboardVersionsToAttach(held, versions);
  for (const id of toAttach) {
    await api('/v1/reviewSubmissionItems', 'POST', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: relation('reviewSubmissions', submission.id), gameCenterLeaderboardVersion: relation('gameCenterLeaderboardVersions', id) } } });
  }
  const missing = leaderboardVersionsToAttach(await submissionItems(submission.id), versions);
  if (missing.length) throw new Error('Leaderboard versions did not read back in review submission ' + submission.id + ': ' + missing.join(', '));
  console.log('Review submission', submission.id, 'holds', versions.length, 'leaderboard versions (' + toAttach.length + ' added); `submit --confirm` sends them with the app.');
  if (profileStale) console.log('Regenerate the provisioning profile (references/ios.md, Game Center) before building.');
}

// readLeaderboards returns the app's leaderboards with their archive flag and versions, for leaderboardReadiness.
async function readLeaderboards() {
  const detail = await related('/v1/apps/' + IOS.ascAppId + '/gameCenterDetail');
  if (!detail.data) return [];
  const path = '/v1/gameCenterDetails/' + detail.data.id + '/gameCenterLeaderboardsV2?limit=200';
  const boards = uniqueById((await listAll(path)).concat(await listAll(path + '&filter[archived]=true')));
  const found = [];
  for (const board of boards) {
    const versions = [];
    for (const version of await listAll('/v2/gameCenterLeaderboards/' + board.id + '/versions?limit=200')) {
      // Only versions that could still go to review need their localizations read.
      const locales = GAME_CENTER_EDITABLE.includes(version.attributes.state)
        ? (await listAll('/v2/gameCenterLeaderboardVersions/' + version.id + '/localizations')).map(item => item.attributes.locale) : [];
      versions.push({ id: version.id, version: version.attributes.version, state: version.attributes.state, locales: locales });
    }
    found.push({ vendorIdentifier: board.attributes.vendorIdentifier, archived: board.attributes.archived === true, versions: versions });
  }
  return found;
}

// editableLeaderboardVersions returns the versions of store.json's leaderboards to send with the app, refusing when
// any configured leaderboard is missing so `submit` never sends a smaller set; `game-center` creates them.
async function editableLeaderboardVersions() {
  const configured = STORE.gameCenter && Array.isArray(STORE.gameCenter.leaderboards) ? STORE.gameCenter.leaderboards.map(board => board.vendorIdentifier) : [];
  if (!configured.length) return [];
  const readiness = leaderboardReadiness(configured, await readLeaderboards(), STORE.listing.locale);
  if (readiness.missing.length) throw new Error('Leaderboards not ready for review: ' + readiness.missing.join(', ') + '; run `game-center` first. Nothing was canceled or submitted.');
  return readiness.editable;
}

// waitForCancel polls a canceled submission until Apple reports it COMPLETE (or gone), so a new one can open.
async function waitForCancel(id) {
  for (let attempt = 0; ; attempt += 1) {
    const current = await related('/v1/reviewSubmissions/' + id);
    if (cancelSettled(current.data ? current.data.attributes.state : null)) return;
    if (attempt >= 40) throw new Error('Submission ' + id + ' is still ' + current.data.attributes.state + '; rerun `submit --confirm` later, which waits for it.');
    await new Promise(done => setTimeout(done, 3000));
  }
}

// replaceRejectedSubmission cancels a rejected submission that cannot take new items, waits until Apple reports it
// COMPLETE (or gone), and returns the new draft; `fillSubmission` then adds the version and leaderboards.
async function replaceRejectedSubmission(submission) {
  await api('/v1/reviewSubmissions/' + submission.id, 'PATCH', { data: { type: 'reviewSubmissions', id: submission.id, attributes: { canceled: true } } });
  console.log('Canceled rejected submission', submission.id, 'so the leaderboards can go to review with the version');
  await waitForCancel(submission.id);
  return openReviewSubmission();
}

// fillSubmission adds whatever an open draft lacks (the version, any editable leaderboard version), reads the items
// back and refuses to continue while something is still missing, so a rerun after a partial failure completes it.
async function fillSubmission(submission, versionId, leaderboards) {
  const missing = missingSubmissionItems(await submissionItems(submission.id), versionId, leaderboards);
  if (missing.version) {
    await api('/v1/reviewSubmissionItems', 'POST', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: relation('reviewSubmissions', submission.id), appStoreVersion: relation('appStoreVersions', versionId) } } });
  }
  for (const id of missing.leaderboards) {
    await api('/v1/reviewSubmissionItems', 'POST', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: relation('reviewSubmissions', submission.id), gameCenterLeaderboardVersion: relation('gameCenterLeaderboardVersions', id) } } });
  }
  const left = missingSubmissionItems(await submissionItems(submission.id), versionId, leaderboards);
  if (left.version || left.leaderboards.length) throw new Error('Review submission ' + submission.id + ' still lacks ' + (left.version ? 'the version' : left.leaderboards.length + ' leaderboard versions') + '; nothing was submitted.');
  if (missing.version || missing.leaderboards.length) console.log('Submission', submission.id, 'now holds the version and', leaderboards.length, 'leaderboard versions');
}

// findBuild returns the processed build with the given build number.
async function findBuild(buildNumber) {
  // Build numbers can restart for each version, so scope the lookup to this version on iOS and refuse ambiguity.
  const builds = await api('/v1/builds?filter[app]=' + IOS.ascAppId + '&filter[version]=' + encodeURIComponent(buildNumber) +
    '&filter[preReleaseVersion.version]=' + encodeURIComponent(STORE.version) + '&filter[preReleaseVersion.platform]=IOS&limit=5');
  const build = pickBuild(builds.data, buildNumber, STORE.version);
  if (build.attributes.processingState !== 'VALID') throw new Error('Build ' + buildNumber + ' is ' + build.attributes.processingState + '; wait for VALID.');
  return build;
}

// attachBuild selects the processed build for the version under review.
async function attachBuild(buildNumber) {
  if (!buildNumber) throw new Error('Usage: asc.mjs attach-build <build number>');
  const ctx = await context();
  const build = await findBuild(buildNumber);
  await api('/v1/appStoreVersions/' + ctx.version.id + '/relationships/build', 'PATCH', relation('builds', build.id));
  const attached = await related('/v1/appStoreVersions/' + ctx.version.id + '/build');
  if (!attached.data || attached.data.id !== build.id) throw new Error('Build attachment did not read back');
  console.log('Attached build', buildNumber, 'to version', STORE.version);
}

// testflight adds a processed build to the internal groups that do not receive every build on their own.
async function testflight(buildNumber) {
  if (!buildNumber) throw new Error('Usage: asc.mjs testflight <build number>');
  const build = await findBuild(buildNumber);
  const groups = await listAll('/v1/apps/' + IOS.ascAppId + '/betaGroups');
  // The owner's device check needs the configured group, so a missing or duplicated group stops the release loop.
  const named = groups.filter(group => group.attributes.name === IOS.testflightGroup && group.attributes.isInternalGroup);
  if (named.length !== 1) throw new Error('Expected one internal TestFlight group named ' + IOS.testflightGroup + ', found ' + named.length + '.');
  const targets = manualTestflightGroups(named, IOS.testflightGroup);
  if (!targets.length) console.log(IOS.testflightGroup, 'receives every build on its own.');
  for (const group of targets) {
    // A rerun finds the build already in the group; Apple refuses to add it twice.
    const present = await listAll('/v1/betaGroups/' + group.id + '/builds?limit=200');
    if (present.some(item => item.id === build.id)) {
      console.log('Build', buildNumber, 'is already in', group.attributes.name);
      continue;
    }
    await api('/v1/betaGroups/' + group.id + '/relationships/builds', 'POST', { data: [{ type: 'builds', id: build.id }] });
    console.log('Added build', buildNumber, 'to', group.attributes.name);
  }
  if (!groups.length) console.log('No beta groups yet; create one in App Store Connect > TestFlight.');
}

// submit sends the prepared version to App Review; it needs --confirm because it is the one irreversible step.
async function submit(flag) {
  if (flag !== '--confirm') throw new Error('Submitting for review is outward-facing; rerun as `asc.mjs submit --confirm` once the owner has approved it.');
  const ctx = await context();
  // A retry after a lost response finds the version already in review; report it instead of submitting again.
  const pending = await submissionInReview(ctx.version.id);
  if (pending) {
    console.log('Version', STORE.version, 'is already', pending.attributes.state, 'in submission', pending.id);
    return;
  }
  // Leaderboard readiness is checked before any submission is opened or created, so a refusal changes nothing.
  let leaderboards = await editableLeaderboardVersions();
  // A cancellation an earlier run left in flight is resumed: wait for it instead of opening a second submission.
  for (const settling of settlingSubmissions((await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=CANCELING,COMPLETING')).data)) {
    console.log('Waiting for submission', settling.id, 'to finish', settling.attributes.state);
    await waitForCancel(settling.id);
  }
  let submission = await openReviewSubmission();
  const held = await submissionItems(submission.id);
  // The conflict guard runs before anything is canceled or added.
  if (submissionPlan(held, ctx.version.id).action === 'conflict') throw new Error('Open review submission ' + submission.id + ' holds other items; clear it in App Store Connect first.');
  if (resubmissionPlan(submission, held, leaderboards.map(board => board.id), ctx.version.id).action === 'replace') {
    submission = await replaceRejectedSubmission(submission);
    // A cancel returns accepted items to the developer, so refresh readiness and carry what the old submission held.
    leaderboards = replacementLeaderboards(await editableLeaderboardVersions(), held);
  }
  if (submission.attributes.state === 'READY_FOR_REVIEW') await fillSubmission(submission, ctx.version.id, leaderboards);
  const items = await submissionItems(submission.id);
  const plan = submissionPlan(items, ctx.version.id);
  if (plan.action !== 'submit') throw new Error('Review submission ' + submission.id + ' does not hold version ' + STORE.version + '; nothing was submitted.');
  for (const rejected of itemsToResolve(items, ctx.version.id)) {
    await api('/v1/reviewSubmissionItems/' + rejected.id, 'PATCH', { data: { type: 'reviewSubmissionItems', id: rejected.id, attributes: { resolved: true } } });
    console.log('Marked rejected item', rejected.id, 'resolved');
  }
  const saved = await api('/v1/reviewSubmissions/' + submission.id, 'PATCH', { data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } } });
  console.log('Review submission', submission.id, 'is', saved.data.attributes.state);
}

// release publishes an approved version held for manual release; it needs --confirm and the owner's physical-device OK.
async function release(flag) {
  if (flag !== '--confirm') throw new Error('Releasing publishes the app; rerun as `asc.mjs release --confirm` once the owner has checked the TestFlight build on a physical device.');
  const ctx = await context();
  if (versionState(ctx.version) !== 'PENDING_DEVELOPER_RELEASE') throw new Error('Version ' + STORE.version + ' is ' + versionState(ctx.version) + ', not awaiting release.');
  await api('/v1/appStoreVersionReleaseRequests', 'POST', { data: { type: 'appStoreVersionReleaseRequests', relationships: { appStoreVersion: relation('appStoreVersions', ctx.version.id) } } });
  console.log('Release requested for version', STORE.version + '; `status` shows it once Apple processes it.');
}

// main dispatches one command.
async function main() {
  const command = process.argv[2];
  const argument = process.argv[3];
  if (!COMMANDS.includes(command)) {
    console.log('Usage: node skills/skills/app-release/scripts/asc.mjs ' + COMMANDS.join('|') + ' [argument]');
    process.exit(command ? 1 : 0);
  }
  setup();
  if (command === 'status') await status();
  if (command === 'listing') await listing();
  if (command === 'age-rating') await ageRating();
  if (command === 'pricing') await pricing();
  if (command === 'screenshots') await screenshots();
  if (command === 'review-details') await reviewDetails();
  if (command === 'review-attachment') await reviewAttachment(argument);
  if (command === 'game-center') await gameCenter();
  if (command === 'attach-build') await attachBuild(argument);
  if (command === 'testflight') await testflight(argument);
  if (command === 'submit') await submit(argument);
  if (command === 'release') await release(argument);
}

// Run only when invoked as a command, so tests can import the decision helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
