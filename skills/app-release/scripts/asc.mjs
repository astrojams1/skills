#!/usr/bin/env node
// asc.mjs
// Drives every App Store Connect step of an iOS release through Apple's API: status, listing copy, age rating,
// pricing and availability, screenshots, App Review details and attachments, Game Center leaderboards, TestFlight,
// build selection, submission, withdrawal from review and manual release. Identity comes from the app's app-release.config.json (`ios`) and
// copy from its store data file; credentials come from 1Password in memory; every write is read back so a release
// never depends on clicking through the web console. Run from the app repository.

import { createHash, sign } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, loadStoreData, requireSection, screenshotGroups } from './lib/config.mjs';
import { opRead, pem } from './lib/vault.mjs';
import { reviewItemsQuery, itemResource, resourceKey, reviewItemPlan, verifyPurchaseReviewTargets } from './lib/review-items.mjs';

const API = 'https://api.appstoreconnect.apple.com';
const COMMANDS = ['status', 'listing', 'age-rating', 'pricing', 'screenshots', 'iap-review-screenshots', 'review-details', 'review-attachment', 'game-center', 'attach-build', 'submit', 'withdraw', 'testflight', 'release', 'assets'];

// CONFIG, IOS and STORE are read on first use, so tests can import the decision helpers without a configured app.
let CONFIG = null;
let IOS = null;
let STORE = null;

// setup reads the app's configuration and store data.
export function setup(start, fields) {
  CONFIG = loadConfig(start);
  // API access does not establish Xcode signing authority; its team/scheme/build settings may still be unverified.
  // Callers that never address the app record (an archive with a chosen build number) may omit ascAppId.
  IOS = requireSection(CONFIG, 'ios', fields || ['ascAppId', 'bundleId', 'vault', 'platform']);
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
// A dropped connection (fetch throws) on a read is retried up to three times; an HTTP error is not (Newsworthy #210).
// Writes are never retried: a POST that reached Apple before the connection dropped would create a second draft,
// item or reservation, so a failed write is reported and the next run reads Apple's state first.
export async function api(path, method, payload, attempt) {
  const options = { method: method || 'GET', headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' } };
  if (payload) options.body = JSON.stringify(payload);
  let response;
  try {
    response = await fetch(API + path, options);
  } catch (error) {
    const tries = attempt || 1;
    if (options.method !== 'GET' || tries >= 3) throw error;
    await new Promise(done => setTimeout(done, 5000 * tries));
    return api(path, method, payload, tries + 1);
  }
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
export async function listAll(path, request = api) {
  const items = [];
  let next = path;
  while (next) {
    const page = await request(next);
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

// awaitEditableInfo re-reads App Info after a version is prepared. Apple makes the next version's editable App Info
// only when that version exists, so the list read before creating it has none (Füd 1.2.0, 2026-10-30); the record can
// lag the version briefly, so it reads a few times before giving up with null.
export async function awaitEditableInfo(readInfos, { attempts = 5, delay = 2000, wait = ms => new Promise(done => setTimeout(done, ms)) } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const info = editableAppInfo(await readInfos());
    if (info || attempt === attempts) return info;
    await wait(delay);
  }
}

// PRIVATE_FIELDS are never printed, even in a readback error.
const PRIVATE_FIELDS = ['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone'];

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
export function resubmissionPlan(submission, items, leaderboardVersionIds, versionId, reviewTargets = []) {
  // Existing callers may omit versionId; infer only the app-version item for the legacy decision helper.
  const intendedVersion = versionId || items.map(item => relatedId(item, 'appStoreVersion')).find(Boolean);
  const plan = reviewItemPlan(items, intendedVersion, reviewTargets);
  if (plan.conflict) return { action: 'conflict' };
  const present = items.map(item => relatedId(item, 'gameCenterLeaderboardVersion')).filter(Boolean);
  const missing = leaderboardVersionIds.filter(id => !present.includes(id));
  const lacksVersion = Boolean(versionId) && !plan.hasVersion;
  if (submission.attributes.state === 'UNRESOLVED_ISSUES' && (missing.length || lacksVersion || plan.missing.length)) {
    return { action: 'replace', missing: missing.concat(plan.missing.map(resourceKey)) };
  }
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

// submissionPlan accepts this version, existing Game Center items and explicitly verified purchase targets.
export function submissionPlan(items, versionId, reviewTargets = []) {
  const plan = reviewItemPlan(items, versionId, reviewTargets);
  if (plan.conflict) return { action: 'conflict' };
  return { action: plan.hasVersion && !plan.missing.length ? 'submit' : 'add' };
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

// withdrawPlan picks the submission `withdraw --confirm` cancels: the one waiting for or in review with this version.
// None means there is nothing to withdraw; more than one is a state the script will not guess its way through.
export function withdrawPlan(active, itemsById, versionId) {
  const holding = active.filter(submission => alreadyInReview(submission, itemsById[submission.id] || [], versionId));
  if (!holding.length) return { action: 'none' };
  if (holding.length > 1) return { action: 'conflict', ids: holding.map(submission => submission.id) };
  return { action: 'cancel', id: holding[0].id };
}

// itemsToResolve returns this version's and its leaderboards' rejected items, which Apple requires marked resolved
// before resubmission.
export function itemsToResolve(items, versionId, reviewTargets = []) {
  const targetKeys = new Set(reviewTargets.map(resourceKey));
  return items.filter(item => {
    const resource = itemResource(item);
    const intended = itemVersionId(item) === versionId || relatedId(item, 'gameCenterLeaderboardVersion') ||
      (resource && targetKeys.has(resourceKey(resource)));
    return intended && item.attributes && item.attributes.state === 'REJECTED';
  });
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

// listingCharacterProblems names store copy fields holding pictographic symbols. Apple refused a description containing
// a check mark (U+2713) with INVALID_CHARACTERS after the app info was already saved (Giraffe Stretch, 2026-10-30), so
// dingbats and emoji are caught before any write.
export function listingCharacterProblems(copy) {
  const symbol = /[\u2700-\u27BF\u{1F000}-\u{1FAFF}\u2600-\u26FF]/u;
  return ['name', 'subtitle', 'promotionalText', 'description', 'keywords', 'whatsNew']
    .filter(field => typeof copy[field] === 'string' && symbol.test(copy[field]))
    .map(field => field + ' contains ' + JSON.stringify(copy[field].match(symbol)[0]) + ', which App Store Connect rejects; spell it out');
}

// whatsNewPlan decides whether a version's copy carries release notes. Apple refuses "What's New" on an app's first
// version, so nothing is sent before a version is live; every later version is an update and must ship notes, so an
// update with empty notes stops the command instead of reaching App Review without them.
export function whatsNewPlan(live, whatsNew) {
  const notes = typeof whatsNew === 'string' ? whatsNew.trim() : '';
  if (!live) return { send: false };
  if (!notes) throw new Error('This version is an update: write its release notes in listing.whatsNew (store data) before `listing`.');
  return { send: true, whatsNew: notes };
}

// manualTestflightGroups returns the configured internal group when it needs the build added; a group with access to
// all builds receives every build on its own and rejects a manual add, and other groups are left alone.
export function manualTestflightGroups(groups, name) {
  return groups.filter(group => group.attributes.name === name && group.attributes.isInternalGroup && !group.attributes.hasAccessToAllBuilds);
}

// testflightState says where a build stands in TestFlight, from the buildBetaDetail a builds read includes: internal
// testers can install it at IN_BETA_TESTING, while external testers need Beta App Review first.
export function testflightState(build, included) {
  const link = build.relationships && build.relationships.buildBetaDetail && build.relationships.buildBetaDetail.data;
  const detail = link && (included || []).find(item => item.type === 'buildBetaDetails' && item.id === link.id);
  const state = detail ? 'TestFlight internal ' + detail.attributes.internalBuildState + ', external ' + detail.attributes.externalBuildState
    : 'TestFlight state unknown';
  // Apple usually reports an expired build's beta states as EXPIRED already; say so only when it does not.
  return build.attributes.expired && !state.includes('EXPIRED') ? state + ', expired' : state;
}

// testflightGroups reads every TestFlight group and whether it holds the build; `read` lists a collection, so a group
// that receives every build on its own is still checked rather than assumed.
export async function testflightGroups(appId, buildId, read = listAll) {
  const groups = [];
  for (const group of await read('/v1/apps/' + appId + '/betaGroups')) {
    const builds = await read('/v1/betaGroups/' + group.id + '/builds?limit=200');
    groups.push({ name: group.attributes.name, internal: group.attributes.isInternalGroup === true, hasBuild: builds.some(item => item.id === buildId) });
  }
  return groups;
}

// context finds the app, its editable App Info and the iOS version being prepared; writing commands pass
// prepare=true to create or rename that version when the configured version string has none yet.
async function context(prepare) {
  const app = (await api('/v1/apps/' + IOS.ascAppId)).data;
  const infos = await listAll('/v1/apps/' + IOS.ascAppId + '/appInfos');
  // Only metadata edits need an editable App Info; submit and release read the version alone.
  let editableInfo = editableAppInfo(infos);
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
    if (!editableInfo) editableInfo = await awaitEditableInfo(() => listAll('/v1/apps/' + IOS.ascAppId + '/appInfos'));
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
  for (const image of await iapReviewScreenshotStatus({ app })) {
    console.log('  IAP review screenshot', image.productId, image.state, 'id', image.id || 'none', 'checksum', image.checksum || 'pending');
  }
  const versions = await listAll('/v1/apps/' + IOS.ascAppId + '/appStoreVersions?filter[platform]=IOS');
  for (const item of versions) console.log('  version', item.attributes.versionString, versionState(item), 'id', item.id);
  const builds = await api('/v1/builds?filter[app]=' + IOS.ascAppId + '&sort=-uploadedDate&limit=5&include=buildBetaDetail');
  for (const item of builds.data) {
    console.log('  build', item.attributes.version, item.attributes.processingState, item.attributes.uploadedDate, testflightState(item, builds.included));
  }
  // The newest build is the one a tester asks about, attached to a version or not.
  if (builds.data.length) {
    for (const group of await testflightGroups(IOS.ascAppId, builds.data[0].id)) {
      console.log('    TestFlight group', group.name, group.internal ? 'internal' : 'external', group.hasBuild ? 'has build ' + builds.data[0].attributes.version : 'does not have it');
    }
  }
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
  const resource = itemResource(item);
  return resource ? resource.relation + ' ' + resource.id : 'unrecognized resource';
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
  // Checked before context(true), which may already create or rename the version.
  const symbols = listingCharacterProblems(STORE.listing);
  if (symbols.length) throw new Error('Store copy cannot be sent: ' + symbols.join('; '));
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
  const live = (await listAll('/v1/apps/' + IOS.ascAppId + '/appStoreVersions?filter[platform]=IOS')).some(item => LIVE_STATES.includes(versionState(item)));
  const notes = whatsNewPlan(live, copy.whatsNew);
  if (notes.send) copyAttributes.whatsNew = notes.whatsNew;
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
  const groups = screenshotGroups(CONFIG, STORE.screenshots);
  if (!groups.length) throw new Error('The store data lists no screenshots');
  // With ios.pruneScreenshots, remove whole sets for display types the manifest no longer lists, so their screenshots
  // leave the product page; otherwise report them and leave them alone.
  for (const stale of staleScreenshotSets(sets, groups)) {
    if (!IOS.pruneScreenshots) {
      console.log('left set', stale.attributes.screenshotDisplayType, 'in place (not in the store data; ios.pruneScreenshots removes it)');
      continue;
    }
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
    // With ios.pruneScreenshots the store data is canonical: remove screenshots it no longer lists.
    const kept = IOS.pruneScreenshots ? [] : staleScreenshots(existing, group.files).map(item => item.id);
    for (const stale of staleScreenshots(existing, group.files)) {
      if (!IOS.pruneScreenshots) {
        console.log('left', group.displayType, stale.attributes.fileName, 'in place (not in the store data; ios.pruneScreenshots removes it)');
        continue;
      }
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
    // Screenshots left in place because pruning is off keep their places after the listed ones.
    const order = ordered.concat(kept);
    await api('/v1/appScreenshotSets/' + set.id + '/relationships/appScreenshots', 'PATCH', { data: order.map(id => ({ type: 'appScreenshots', id: id })) });
    const after = await listAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots');
    if (after.map(item => item.id).join() !== order.join()) throw new Error('Screenshot order did not read back for ' + group.displayType);
  }
  console.log('Run `status` until every screenshot reads COMPLETE.');
}

// uploadParts sends a reserved asset's bytes through the upload operations Apple returned, one part per operation.
export async function uploadParts(operations, bytes, label, send = fetch) {
  for (const operation of operations) {
    const headers = {};
    for (const header of operation.requestHeaders) headers[header.name] = header.value;
    const part = bytes.subarray(operation.offset, operation.offset + operation.length);
    const response = await send(operation.url, { method: operation.method, headers: headers, body: part });
    if (!response.ok) throw new Error('Upload of ' + label + ' failed with ' + response.status);
  }
}

const IAP_REVIEW_SCREENSHOT_TYPE = 'inAppPurchaseAppStoreReviewScreenshots';
const IAP_REVIEW_SCREENSHOT_PATH = '/v1/' + IAP_REVIEW_SCREENSHOT_TYPE;

// Only explicit image rows opt in. Product identities and screenshot paths remain app facts.
function iapReviewScreenshotRows(store) {
  if (store?.inAppPurchases === undefined) return [];
  if (!Array.isArray(store.inAppPurchases)) throw new Error('store data inAppPurchases must be an array.');
  const selected = [];
  const ids = new Set(); const productIds = new Set();
  for (const row of store.inAppPurchases) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('store data inAppPurchases rows must be objects.');
    if (!Object.hasOwn(row, 'reviewScreenshot')) continue;
    for (const field of ['appStoreId', 'productId', 'reviewScreenshot']) {
      if (typeof row[field] !== 'string' || !row[field].trim() || row[field] !== row[field].trim() || row[field].includes('\0')) {
        throw new Error('inAppPurchases.' + field + ' must be an explicit nonblank string for a review screenshot.');
      }
    }
    if (ids.has(row.appStoreId) || productIds.has(row.productId)) throw new Error('Duplicate inAppPurchases screenshot identity; nothing was uploaded.');
    ids.add(row.appStoreId); productIds.add(row.productId); selected.push(row);
  }
  return selected;
}

// Ownership is read from the app's entire paginated parent collection before any reservation.
async function iapReviewScreenshotTargets(rows, ios, request, readAll, app) {
  if (!rows.length) return [];
  if (!ios?.ascAppId || !ios?.bundleId) throw new Error('Configured app ID and bundle ID are required for IAP review screenshots.');
  const found = app || (await request('/v1/apps/' + encodeURIComponent(ios.ascAppId))).data;
  if (found?.id !== ios.ascAppId || found.type !== 'apps' || found.attributes?.bundleId !== ios.bundleId) {
    throw new Error('IAP review screenshot app/bundle identity mismatch; nothing was uploaded.');
  }
  const products = await readAll('/v1/apps/' + encodeURIComponent(ios.ascAppId) + '/inAppPurchasesV2?limit=200');
  for (const row of rows) {
    const matches = products.filter(item => item.id === row.appStoreId);
    if (matches.length !== 1 || matches[0].type !== 'inAppPurchases' || matches[0].attributes?.productId !== row.productId ||
        products.filter(item => item.attributes?.productId === row.productId).length !== 1) {
      throw new Error('IAP review screenshot product ownership or identity mismatch for ' + row.productId + '; nothing was uploaded.');
    }
  }
  const targets = [];
  for (const row of rows) {
    let screenshot;
    try {
      screenshot = (await request('/v2/inAppPurchases/' + encodeURIComponent(row.appStoreId) + '/appStoreReviewScreenshot')).data;
    } catch (error) {
      if (!String(error.message).includes(' -> 404 ')) throw error;
      screenshot = null;
    }
    if (screenshot !== null && (!screenshot?.id || screenshot.type !== IAP_REVIEW_SCREENSHOT_TYPE)) {
      throw new Error('Ambiguous linked IAP review screenshot for ' + row.productId + '; nothing was uploaded.');
    }
    targets.push({ ...row, screenshot });
  }
  return targets;
}

function iapReviewImageState(image) {
  return { id: image?.id || null, state: image?.attributes?.assetDeliveryState?.state || (image ? 'UNKNOWN' : 'MISSING'),
    checksum: image?.attributes?.sourceFileChecksum || null };
}

// A missing checksum is an unknown outcome, not permission to replace a reserved image.
export function iapReviewScreenshotPlan(image, source) {
  if (!image) return { action: 'upload' };
  const current = iapReviewImageState(image);
  if (current.checksum && current.checksum.toLowerCase() !== source.checksum) return { action: 'conflict' };
  if (current.state === 'COMPLETE') return { action: current.checksum ? 'keep' : 'conflict' };
  if (!current.checksum && ((image.attributes?.fileName && image.attributes.fileName !== source.fileName) ||
      (image.attributes?.fileSize !== undefined && image.attributes.fileSize !== source.bytes.length))) return { action: 'conflict' };
  return { action: current.state === 'FAILED' ? 'failed' : 'pending' };
}

// This read-only status needs no local screenshot bytes and makes no IAP calls for apps without opted-in rows.
export async function iapReviewScreenshotStatus({ ios = IOS, store = STORE, request = api, readAll = path => listAll(path, request), app } = {}) {
  const targets = await iapReviewScreenshotTargets(iapReviewScreenshotRows(store), ios, request, readAll, app);
  return targets.map(target => ({ productId: target.productId, ...iapReviewImageState(target.screenshot) }));
}

// Review screenshots still target the parent IAP after the metadata-to-v2 migration.
// Reserve, transfer, commit and read back once; a rerun reads uncertain outcomes instead of duplicating them.
export async function iapReviewScreenshots({ config = CONFIG, ios = IOS, store = STORE, request = api,
  readAll = path => listAll(path, request), upload = uploadParts, report = console.log } = {}) {
  const rows = iapReviewScreenshotRows(store);
  if (!rows.length) { report('No IAP review screenshots configured.'); return []; }
  // Read every source before any mutation, retaining these exact bytes throughout the upload.
  const sources = rows.map(row => {
    const path = resolve(config.root, row.reviewScreenshot);
    if (!statSync(path).isFile()) throw new Error('IAP review screenshot source is not a file: ' + row.reviewScreenshot);
    const bytes = readFileSync(path);
    if (!bytes.length) throw new Error('IAP review screenshot source is empty: ' + row.reviewScreenshot);
    return { ...row, bytes, fileName: basename(path), checksum: createHash('md5').update(bytes).digest('hex') };
  });
  const targets = await iapReviewScreenshotTargets(sources, ios, request, readAll);
  const plans = targets.map(target => ({ ...target, plan: iapReviewScreenshotPlan(target.screenshot, target) }));
  for (const target of plans) {
    if (target.plan.action === 'conflict' || target.plan.action === 'failed') {
      throw new Error('IAP review screenshot ' + target.plan.action + ' for ' + target.productId + '; existing images were preserved and nothing was uploaded.');
    }
  }
  const results = [];
  for (const target of plans) {
    let image = target.screenshot;
    let action = target.plan.action;
    if (action === 'upload') {
      let reserved;
      try {
        reserved = (await request(IAP_REVIEW_SCREENSHOT_PATH, 'POST', { data: {
          type: IAP_REVIEW_SCREENSHOT_TYPE, attributes: { fileName: target.fileName, fileSize: target.bytes.length },
          relationships: { inAppPurchaseV2: relation('inAppPurchases', target.appStoreId) },
        } })).data;
      } catch {
        throw new Error('IAP review screenshot reservation outcome unknown for ' + target.productId + '; rerun to read its state before another upload.');
      }
      if (!reserved?.id || reserved.type !== IAP_REVIEW_SCREENSHOT_TYPE || !Array.isArray(reserved.attributes?.uploadOperations) || !reserved.attributes.uploadOperations.length) {
        throw new Error('IAP review screenshot reservation was incomplete for ' + target.productId + '; preserved for readback on rerun.');
      }
      try {
        await upload(reserved.attributes.uploadOperations, target.bytes, target.fileName);
        await request(IAP_REVIEW_SCREENSHOT_PATH + '/' + encodeURIComponent(reserved.id), 'PATCH', { data: {
          type: IAP_REVIEW_SCREENSHOT_TYPE, id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: target.checksum },
        } });
      } catch {
        throw new Error('IAP review screenshot transfer/commit outcome unknown for ' + target.productId + '; reservation preserved. Rerun to read its state; no duplicate was reserved.');
      }
      image = (await request(IAP_REVIEW_SCREENSHOT_PATH + '/' + encodeURIComponent(reserved.id))).data;
      if (image?.id !== reserved.id || image.type !== IAP_REVIEW_SCREENSHOT_TYPE ||
          iapReviewScreenshotPlan(image, target).action === 'conflict') {
        throw new Error('IAP review screenshot readback mismatch for ' + target.productId + '; reservation preserved.');
      }
      const current = iapReviewImageState(image);
      if (current.state === 'FAILED') throw new Error('Apple reports FAILED for IAP review screenshot ' + target.productId + '; reservation preserved.');
      action = current.state === 'COMPLETE' && current.checksum ? 'uploaded' : 'pending';
    }
    const result = { productId: target.productId, action, ...iapReviewImageState(image) };
    results.push(result);
    report('IAP review screenshot', result.productId, result.action, result.state, 'id', result.id, 'checksum', result.checksum || 'pending');
  }
  return results;
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

// reviewDetails retains this version's authorized contact when omitted from store data. First creation
// requires a complete explicit identity and runtime phone; no account-wide contact lookup is performed.
export async function reviewDetails() {
  const ctx = await context();
  const contact = STORE.review;
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) throw new Error('store data review must be an object.');
  const current = await related('/v1/appStoreVersions/' + ctx.version.id + '/appStoreReviewDetail');
  const existing = current.data?.attributes || {};
  const attributes = {};
  const identity = [['firstName', 'contactFirstName'], ['lastName', 'contactLastName'], ['email', 'contactEmail']];
  // With no contact named in the store data and none on this version yet, the app takes the team's established review
  // contact from its other apps, name and phone together, so the owner is never asked for what the team already has.
  let adopted = null;
  if (!identity.some(([field]) => Object.hasOwn(contact, field)) && !Object.hasOwn(process.env, 'ASC_REVIEW_PHONE')
      && !identity.every(([, attribute]) => typeof existing[attribute] === 'string' && existing[attribute].trim())) {
    adopted = teamReviewContact(await reviewContactsOnFile(IOS.ascAppId));
    if (adopted) console.log('Using the App Review contact already on file with ' + adopted.appName + ' ' + adopted.versionString + '.');
  }
  for (const [field, attribute] of identity) {
    const value = Object.hasOwn(contact, field) ? contact[field] : adopted ? adopted[attribute] : existing[attribute];
    if (typeof value !== 'string' || !value.trim()) throw new Error('A complete review contact is required: supply review.' + field + ' or retain a valid current same-app contact.');
    attributes[attribute] = value;
  }
  // A different identity cannot silently inherit the prior contact's private phone number.
  const sameContact = ['contactFirstName', 'contactLastName', 'contactEmail'].every(field => attributes[field] === existing[field]);
  let phone = Object.hasOwn(process.env, 'ASC_REVIEW_PHONE') ? process.env.ASC_REVIEW_PHONE
    : adopted ? adopted.contactPhone : sameContact ? existing.contactPhone : undefined;
  if (phone === undefined) {
    // The same person's number is already on file with the team's other apps: reuse it rather than ask the owner.
    const found = reviewPhoneOnFile(attributes, await reviewContactsOnFile(IOS.ascAppId));
    if (found) {
      phone = found.contactPhone;
      console.log('Using the review phone already on file for this contact with ' + found.appName + ' ' + found.versionString + '.');
    }
  }
  if (typeof phone !== 'string' || !phone.trim()) throw new Error('A review contact phone is required and none is on file for this contact with the team\'s other apps; set ASC_REVIEW_PHONE for this run and never commit it.');
  attributes.contactPhone = phone;
  const demoAccountRequired = Object.hasOwn(contact, 'demoAccountRequired') ? contact.demoAccountRequired : existing.demoAccountRequired ?? false;
  if (typeof demoAccountRequired !== 'boolean') throw new Error('review.demoAccountRequired must be a boolean.');
  attributes.demoAccountRequired = demoAccountRequired;
  if (Object.hasOwn(contact, 'notes')) attributes.notes = contact.notes;
  else if (Object.hasOwn(existing, 'notes')) attributes.notes = existing.notes;
  const saved = current.data
    ? await api('/v1/appStoreReviewDetails/' + current.data.id, 'PATCH', { data: { type: 'appStoreReviewDetails', id: current.data.id, attributes: attributes } })
    : await api('/v1/appStoreReviewDetails', 'POST', { data: { type: 'appStoreReviewDetails', attributes: attributes, relationships: { appStoreVersion: relation('appStoreVersions', ctx.version.id) } } });
  assertSaved('Review details', attributes, saved.data.attributes);
  console.log('Saved and verified the review contact and notes.');
}

// reviewPhoneOnFile picks, from the review contacts the team's other apps hold, the phone of the person being saved:
// the same email, or failing that the same first and last name. An email match beats a name match, then the newest
// version wins. Another person's number is never used. Returns the matching record, or null.
export function reviewPhoneOnFile(identity, records) {
  const lower = value => String(value || '').trim().toLowerCase();
  const sameEmail = record => Boolean(lower(identity.contactEmail)) && lower(record.contactEmail) === lower(identity.contactEmail);
  const sameName = record => Boolean(lower(identity.contactFirstName) && lower(identity.contactLastName))
    && lower(record.contactFirstName) === lower(identity.contactFirstName) && lower(record.contactLastName) === lower(identity.contactLastName);
  const matches = records.filter(record => typeof record.contactPhone === 'string' && record.contactPhone.trim() && (sameEmail(record) || sameName(record)));
  matches.sort((a, b) => (Number(sameEmail(b)) - Number(sameEmail(a))) || String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
  return matches[0] || null;
}

// teamReviewContact is the team's established App Review contact: the newest one on file with a complete name, email
// and phone. Returns the record, or null when no other app has one.
export function teamReviewContact(records) {
  const complete = records.filter(record => ['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone']
    .every(field => typeof record[field] === 'string' && record[field].trim()));
  complete.sort((a, b) => String(b.createdDate || '').localeCompare(String(a.createdDate || '')));
  return complete[0] || null;
}

// reviewContactsOnFile reads the App Review contact of every version of the team's other apps, with each app's name
// and the version's string and creation date. Values stay in memory; callers print only where one came from.
export async function reviewContactsOnFile(appId) {
  const records = [];
  for (const app of await listAll('/v1/apps?limit=200&fields[apps]=name')) {
    if (app.id === appId) continue;
    let next = '/v1/apps/' + app.id + '/appStoreVersions?limit=50&include=appStoreReviewDetail'
      + '&fields[appStoreVersions]=versionString,createdDate,appStoreReviewDetail'
      + '&fields[appStoreReviewDetails]=contactFirstName,contactLastName,contactEmail,contactPhone';
    while (next) {
      const page = await api(next);
      const versions = new Map((page.data || []).map(version => [relatedId(version, 'appStoreReviewDetail'), version]));
      for (const detail of page.included || []) {
        const version = detail.type === 'appStoreReviewDetails' ? versions.get(detail.id) : null;
        if (version) records.push({ ...detail.attributes, appName: app.attributes.name, versionString: version.attributes.versionString, createdDate: version.attributes.createdDate });
      }
      next = page.links && page.links.next ? page.links.next.replace(API, '') : null;
    }
  }
  return records;
}

// openReviewSubmission returns the app's open (draft or rejected) review submission, creating a draft when there is
// none; `submit` sends it, and `game-center` adds the leaderboards to it first so they go to App Review together.
async function openReviewSubmission() {
  const open = (await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=READY_FOR_REVIEW,UNRESOLVED_ISSUES')).data;
  if (open.length > 1) throw new Error('Multiple open review submissions; inspect App Store Connect before changing anything.');
  if (open.length) return open[0];
  return (await api('/v1/reviewSubmissions', 'POST', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: relation('apps', IOS.ascAppId) } } })).data;
}

// submissionInReview returns the submission already waiting for or in review with this version, or null.
async function submissionInReview(versionId, reviewTargets = []) {
  const active = (await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=WAITING_FOR_REVIEW,IN_REVIEW')).data;
  for (const pending of active) {
    const items = await submissionItems(pending.id);
    if (alreadyInReview(pending, items, versionId)) {
      if (submissionPlan(items, versionId, reviewTargets).action !== 'submit') throw new Error('Pending review does not hold the exact configured review targets; inspect it before retrying.');
      return pending;
    }
  }
  return null;
}

// submissionItems requests every resource linkage, so unsupported items remain visible to the conflict guard.
function submissionItems(submissionId) {
  return listAll('/v1/reviewSubmissions/' + submissionId + '/items?' + reviewItemsQuery());
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
  const reviewTargets = await verifyPurchaseReviewTargets(STORE, IOS.ascAppId, listAll);
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
  const inReview = await submissionInReview(ctx.version.id, reviewTargets);
  if (inReview) {
    // A submission already in review cannot gain items; a draft beside it would only strand the leaderboards.
    console.log('Version', STORE.version, 'is', inReview.attributes.state, 'in submission', inReview.id + '; leaderboards join the next submission.');
    return;
  }
  const submission = await openReviewSubmission();
  const held = await submissionItems(submission.id);
  const plan = resubmissionPlan(submission, held, versions.map(version => version.id), ctx.version.id, reviewTargets);
  if (plan.action === 'conflict') throw new Error('Open review submission holds conflicting items; no leaderboards were attached.');
  if (plan.action === 'replace') {
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
  console.log('Canceled rejected submission', submission.id, 'so the required items can go to review with the version');
  await waitForCancel(submission.id);
  return openReviewSubmission();
}

// fillSubmission reads before every item mutation, then reads each attachment back. A lost response is never retried.
export async function fillSubmission(submission, versionId, leaderboards, reviewTargets = [], transport = {}) {
  const readItems = transport.readItems || submissionItems;
  const write = transport.write || api;
  const targets = [{ relation: 'appStoreVersion', type: 'appStoreVersions', id: versionId },
    ...leaderboards.filter(version => GAME_CENTER_EDITABLE.includes(version.state) || version.carried === true)
      .map(version => ({ relation: 'gameCenterLeaderboardVersion', type: 'gameCenterLeaderboardVersions', id: version.id })),
    ...reviewTargets];
  for (const target of targets) {
    const held = await readItems(submission.id);
    if (submissionPlan(held, versionId, reviewTargets).action === 'conflict') throw new Error('Review submission holds conflicting items; nothing further was attached or submitted.');
    if (!held.some(item => resourceKey(itemResource(item)) === resourceKey(target))) {
      await write('/v1/reviewSubmissionItems', 'POST', { data: { type: 'reviewSubmissionItems', relationships: {
        reviewSubmission: relation('reviewSubmissions', submission.id), [target.relation]: relation(target.type, target.id),
      } } });
      const saved = await readItems(submission.id);
      if (submissionPlan(saved, versionId, reviewTargets).action === 'conflict' ||
          !saved.some(item => itemResource(item) && resourceKey(itemResource(item)) === resourceKey(target))) {
        throw new Error('Review item attachment did not read back; nothing was submitted. Rerun only after reading provider state.');
      }
    }
  }
  const saved = await readItems(submission.id);
  const left = missingSubmissionItems(saved, versionId, leaderboards);
  if (submissionPlan(saved, versionId, reviewTargets).action !== 'submit' || left.version || left.leaderboards.length) {
    throw new Error('Review submission ' + submission.id + ' still lacks configured review targets or holds conflicting items; nothing was submitted.');
  }
  console.log('Submission', submission.id, 'holds the app version,', leaderboards.length, 'leaderboard versions and', reviewTargets.length, 'purchase review versions.');
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
export async function submit(flag) {
  if (flag !== '--confirm') throw new Error('Submitting for review is outward-facing; rerun as `asc.mjs submit --confirm` once the owner has approved it.');
  const ctx = await context();
  if (ctx.app.attributes.bundleId !== IOS.bundleId) throw new Error('Configured app/bundle identity mismatch; nothing was submitted.');
  let reviewTargets = await verifyPurchaseReviewTargets(STORE, IOS.ascAppId, listAll);
  // A retry after a lost response finds the version already in review; report it instead of submitting again.
  const pending = await submissionInReview(ctx.version.id, reviewTargets);
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
  if (submissionPlan(held, ctx.version.id, reviewTargets).action === 'conflict') throw new Error('Open review submission ' + submission.id + ' holds other items; clear it in App Store Connect first.');
  if (resubmissionPlan(submission, held, leaderboards.map(board => board.id), ctx.version.id, reviewTargets).action === 'replace') {
    submission = await replaceRejectedSubmission(submission);
    // A cancel returns accepted items to the developer, so refresh readiness and carry what the old submission held.
    leaderboards = replacementLeaderboards(await editableLeaderboardVersions(), held);
    reviewTargets = await verifyPurchaseReviewTargets(STORE, IOS.ascAppId, listAll);
  }
  if (submission.attributes.state === 'READY_FOR_REVIEW') await fillSubmission(submission, ctx.version.id, leaderboards, reviewTargets);
  const items = await submissionItems(submission.id);
  const plan = submissionPlan(items, ctx.version.id, reviewTargets);
  if (plan.action !== 'submit') throw new Error('Review submission ' + submission.id + ' does not hold version ' + STORE.version + '; nothing was submitted.');
  for (const rejected of itemsToResolve(items, ctx.version.id, reviewTargets)) {
    await api('/v1/reviewSubmissionItems/' + rejected.id, 'PATCH', { data: { type: 'reviewSubmissionItems', id: rejected.id, attributes: { resolved: true } } });
    console.log('Marked rejected item', rejected.id, 'resolved');
  }
  // Revalidate ownership and item completeness immediately before the outward-facing submission.
  reviewTargets = await verifyPurchaseReviewTargets(STORE, IOS.ascAppId, listAll);
  const finalItems = await submissionItems(submission.id);
  if (submissionPlan(finalItems, ctx.version.id, reviewTargets).action !== 'submit' ||
      missingSubmissionItems(finalItems, ctx.version.id, leaderboards).leaderboards.length) {
    throw new Error('Review targets changed before submission; nothing was submitted.');
  }
  await api('/v1/reviewSubmissions/' + submission.id, 'PATCH', { data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } } });
  const saved = (await api('/v1/reviewSubmissions/' + submission.id)).data;
  const version = (await api('/v1/appStoreVersions/' + ctx.version.id)).data;
  if (!['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(saved.attributes.state) ||
      !['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(versionState(version))) {
    throw new Error('Review submission/version readback is not waiting for or in review; inspect provider state before retrying.');
  }
  console.log('Review submission', submission.id, 'is', saved.attributes.state, '; app version is', versionState(version));
}

// release publishes an approved version held for manual release; it needs --confirm and the owner's physical-device OK.
async function release(flag) {
  if (flag !== '--confirm') throw new Error('Releasing publishes the app; rerun as `asc.mjs release --confirm` once the owner has checked the TestFlight build on a physical device.');
  const ctx = await context();
  if (versionState(ctx.version) !== 'PENDING_DEVELOPER_RELEASE') throw new Error('Version ' + STORE.version + ' is ' + versionState(ctx.version) + ', not awaiting release.');
  await api('/v1/appStoreVersionReleaseRequests', 'POST', { data: { type: 'appStoreVersionReleaseRequests', relationships: { appStoreVersion: relation('appStoreVersions', ctx.version.id) } } });
  console.log('Release requested for version', STORE.version + '; `status` shows it once Apple processes it.');
}

// assetReference names an Asset Library image by its file and content, so a rerun recognises an upload Apple already
// holds and a changed file uploads as a new image instead of being mistaken for the old one.
export function assetReference(fileName, bytes) {
  return fileName + '@' + createHash('sha256').update(bytes).digest('hex').slice(0, 12);
}

// ASSET_PLACEMENTS are the placement types `assets` places on a version's localization, each with the profile group
// Apple's reference data gives it; anything else in store data stops the run before it uploads.
export const ASSET_PLACEMENTS = {
  PRODUCT_PAGE_HEADER_ASSET: ['DEFAULT_PROFILE'],
  APP_STORE_SEARCH_RESULTS_ASSET: ['DEFAULT_PROFILE'],
  // Other screenshot profiles have display types that `screenshots` manages; only Duo has none.
  APP_SCREENSHOT: ['IPHONE_DUO_PROFILE'],
};

// assetEntryProblem checks one store-data `assetLibrary` entry, returning what is wrong or null.
export function assetEntryProblem(entry) {
  if (!entry || typeof entry.file !== 'string') return 'an entry has no file';
  if (!['CREATIVE_ASSETS', 'APP_SCREENSHOTS_AND_PREVIEWS'].includes(entry.category)) return entry.file + ': unknown category ' + entry.category;
  const groups = ASSET_PLACEMENTS[entry.placementType];
  if (!groups) return entry.file + ': unsupported placementType ' + entry.placementType;
  if (!groups.includes(entry.placementGroup)) return entry.file + ': placementGroup ' + entry.placementGroup + ' does not take ' + entry.placementType;
  return null;
}

// assetUploadAction compares a file's reference with the library's images: keep a finished or in-review copy, replace
// one whose upload never finished or failed, and upload when none exists. Archived images never count.
export function assetUploadAction(images, reference) {
  const found = images.find(image => image.attributes.referenceName === reference && image.attributes.state !== 'ARCHIVED');
  if (!found) return { action: 'upload' };
  if (['AWAITING_UPLOAD', 'FAILED'].includes(found.attributes.state)) return { action: 'replace', id: found.id };
  return { action: 'keep', id: found.id };
}

// PLACEABLE_STATES are the image states a placement accepts: processed, and not failed or archived.
export const PLACEABLE_STATES = ['COMPLETE', 'PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'ACCEPTED', 'APPROVED'];

// placementPlan compares a localization's placements of one type and profile with the images store data wants there,
// in order: which images still need a placement, and which placements hold an image store data no longer lists.
export function placementPlan(existing, wantedImageIds) {
  const imageOf = item => (item.relationships && item.relationships.image && item.relationships.image.data ? item.relationships.image.data.id : null);
  const placedImages = existing.map(imageOf);
  return {
    missing: wantedImageIds.filter(id => !placedImages.includes(id)),
    stale: existing.filter(item => !wantedImageIds.includes(imageOf(item))).map(item => item.id),
  };
}

// SUBMITTABLE_ASSET_STATES are the Asset Library states an image can be sent to App Review from.
export const SUBMITTABLE_ASSET_STATES = ['COMPLETE', 'PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW'];

// assetsToSubmit picks the store data's images that still need App Review, and reports the others' states, so a rerun
// never sends an image twice and an unprocessed or rejected one is named instead of sent.
export function assetsToSubmit(images, references) {
  const send = [];
  const skipped = [];
  for (const reference of references) {
    const image = images.find(item => item.attributes.referenceName === reference && item.attributes.state !== 'ARCHIVED');
    if (!image) skipped.push(reference + ' (not uploaded)');
    else if (SUBMITTABLE_ASSET_STATES.includes(image.attributes.state)) send.push(image.id);
    else skipped.push(reference + ' (' + image.attributes.state + ')');
  }
  return { send: send, skipped: skipped };
}

// An image-only action must never inherit another item's submission authorization.
// Inspect every resource linkage (including unsupported ones), preserving uncertain or conflicting drafts.
function assetReviewItems(items, wanted) {
  const seen = new Set();
  for (const item of items) {
    const resource = itemResource(item);
    if (!resource || resource.relation !== 'appAssetLibraryImage' || resource.type !== 'appAssetLibraryImages' ||
        !wanted.has(resource.id) || seen.has(resource.id)) {
      throw new Error('Image review submission holds conflicting items; nothing further was attached or submitted.');
    }
    seen.add(resource.id);
  }
  return seen;
}

// Read all held items before each add, read each attachment back, and require the exact final image set.
// Transport injection exercises this same orchestration without credentials or provider mutations.
export async function submitAssetImages(imageIds, { openSubmission = openReviewSubmission, readItems = submissionItems, request = api, report = console.log } = {}) {
  if (!Array.isArray(imageIds) || !imageIds.length || imageIds.some(id => typeof id !== 'string' || !id.trim())) {
    throw new Error('Image review submission needs explicit image IDs.');
  }
  const wanted = new Set(imageIds);
  const submission = await openSubmission();
  if (!submission?.id || submission.attributes?.state !== 'READY_FOR_REVIEW') {
    throw new Error('Image review submission must be READY_FOR_REVIEW; existing draft preserved. Inspect rejected or changed submissions separately.');
  }
  assetReviewItems(await readItems(submission.id), wanted);
  for (const id of wanted) {
    if (assetReviewItems(await readItems(submission.id), wanted).has(id)) continue;
    await request('/v1/reviewSubmissionItems', 'POST', { data: { type: 'reviewSubmissionItems', relationships: {
      reviewSubmission: relation('reviewSubmissions', submission.id), appAssetLibraryImage: relation('appAssetLibraryImages', id) } } });
    if (!assetReviewItems(await readItems(submission.id), wanted).has(id)) {
      throw new Error('Image review attachment did not read back; nothing was submitted. Read provider state before retrying.');
    }
  }
  const path = '/v1/reviewSubmissions/' + submission.id;
  const current = (await request(path)).data;
  if (current?.id !== submission.id || current.attributes?.state !== 'READY_FOR_REVIEW') {
    throw new Error('Image review submission changed before submission; nothing was submitted.');
  }
  const final = assetReviewItems(await readItems(submission.id), wanted);
  if (final.size !== wanted.size) throw new Error('Image review submission is missing intended images; nothing was submitted.');
  // Writes are attempted once. An uncertain response stops this run before any retry or replacement draft.
  await request(path, 'PATCH', { data: { type: 'reviewSubmissions', id: submission.id, attributes: { submitted: true } } });
  const saved = (await request(path)).data;
  if (saved?.id !== submission.id || !['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(saved.attributes?.state)) {
    throw new Error('Image review submission readback is not waiting for or in review; inspect provider state before retrying.');
  }
  report('Review submission', submission.id, 'with', wanted.size, 'image(s) is', saved.attributes.state);
  return saved;
}

// assets lists, uploads (`upload`) or places (`place`) the store data's Asset Library images: the product page header,
// the search-results creative and screenshots for profiles without a screenshot display type, such as iPhone Duo.
// Uploads stay unsubmitted drafts until placed and sent to App Review with a version or from App Store Connect.
async function assets(mode) {
  const entries = STORE.assetLibrary || [];
  for (const entry of entries) {
    const problem = assetEntryProblem(entry);
    if (problem) throw new Error('store data assetLibrary: ' + problem);
  }
  const library = (await api('/v1/apps/' + IOS.ascAppId + '/assetLibrary')).data;
  const images = await listAll('/v1/appAssetLibraries/' + library.id + '/images');
  if (!mode) {
    for (const image of images) {
      const placements = await listAll('/v1/appAssetLibraryImages/' + image.id + '/placements');
      console.log('  image', image.attributes.referenceName || image.attributes.fileName, image.attributes.category, image.attributes.state,
        placements.map(item => item.attributes.placementType + '/' + item.attributes.placementGroup + ' ' + item.attributes.state).join(', ') || 'unplaced');
    }
    console.log(images.length + ' Asset Library images; store data lists ' + entries.length + '.');
    return;
  }
  if (mode === 'submit') {
    // An approved version takes only approved images, so on such a version the images go to App Review on their own.
    if (process.argv[4] !== '--confirm') throw new Error('Sending images to App Review is outward-facing; rerun as `asc.mjs assets submit --confirm` with the owner\'s approval.');
    const references = entries.map(entry => assetReference(basename(resolve(CONFIG.root, entry.file)), readFileSync(resolve(CONFIG.root, entry.file))));
    const plan = assetsToSubmit(images, references);
    for (const line of plan.skipped) console.log('not sent:', line);
    if (!plan.send.length) {
      console.log('No listed image needs App Review.');
      return;
    }
    await submitAssetImages(plan.send);
    return;
  }
  if (!['upload', 'place'].includes(mode)) throw new Error('Usage: asc.mjs assets [upload|place|submit --confirm]');
  const localization = mode === 'place' ? await versionLocalization((await context()).version.id, false) : null;
  // Each placement type and profile, with the image ids store data wants there in order.
  const wanted = new Map();
  for (const entry of entries) {
    const path = resolve(CONFIG.root, entry.file);
    const bytes = readFileSync(path);
    const reference = assetReference(basename(path), bytes);
    const plan = assetUploadAction(images, reference);
    if (mode === 'upload') {
      if (plan.action === 'keep') {
        console.log('kept', reference);
        continue;
      }
      if (plan.action === 'replace') await api('/v1/appAssetLibraryImages/' + plan.id, 'DELETE');
      const reserved = (await api('/v1/appAssetLibraryImages', 'POST', { data: { type: 'appAssetLibraryImages',
        attributes: { category: entry.category, fileName: basename(path), fileSize: statSync(path).size, referenceName: reference },
        relationships: { assetLibrary: relation('appAssetLibraries', library.id) } } })).data;
      await uploadParts(reserved.attributes.uploadOperations, bytes, basename(path));
      await api('/v1/appAssetLibraryImages/' + reserved.id, 'PATCH', { data: { type: 'appAssetLibraryImages', id: reserved.id, attributes: { uploaded: true } } });
      // A later entry with the same bytes then finds this upload instead of making another.
      images.push({ id: reserved.id, attributes: { referenceName: reference, state: 'UPLOAD_COMPLETE' } });
      console.log('uploaded', reference, 'for', entry.placementType, entry.placementGroup);
      continue;
    }
    const image = images.find(item => item.id === plan.id);
    if (plan.action !== 'keep' || !PLACEABLE_STATES.includes(image.attributes.state)) {
      throw new Error(reference + ' is ' + (image ? image.attributes.state : 'not in the Asset Library') + '; run `assets upload`, then `assets` until it has finished processing.');
    }
    const key = entry.placementType + ' ' + entry.placementGroup;
    if (!wanted.has(key)) wanted.set(key, { type: entry.placementType, group: entry.placementGroup, ids: [] });
    wanted.get(key).ids.push(plan.id);
  }
  for (const slot of wanted.values()) {
    const query = '?filter[placementType]=' + slot.type + '&filter[placementGroup]=' + slot.group + '&include=image';
    const existing = await listAll('/v1/appStoreVersionLocalizations/' + localization.id + '/placements' + query);
    const plan = placementPlan(existing, slot.ids);
    if (plan.stale.length && !IOS.pruneScreenshots) {
      throw new Error(slot.type + ' ' + slot.group + ' holds ' + plan.stale.length + ' placement(s) store data does not list; remove them in App Store Connect, or set ios.pruneScreenshots.');
    }
    for (const id of plan.stale) {
      await api('/v1/appAssetLibraryPlacements/' + id, 'DELETE');
      console.log('removed placement', id, slot.type, slot.group, '(not in the store data)');
    }
    for (const imageId of plan.missing) {
      await api('/v1/appAssetLibraryPlacements', 'POST', { data: { type: 'appAssetLibraryPlacements',
        attributes: { placementType: slot.type, placementGroup: slot.group },
        relationships: { image: relation('appAssetLibraryImages', imageId), appStoreVersionLocalization: relation('appStoreVersionLocalizations', localization.id) } } });
      console.log('placed', imageId, slot.type, slot.group);
    }
    if (slot.ids.length > 1) {
      // Order the slot as store data lists it, as `screenshots` orders a set.
      const placed = await listAll('/v1/appStoreVersionLocalizations/' + localization.id + '/placements' + query);
      const imageOf = item => item.relationships.image.data.id;
      const ordered = slot.ids.map(id => placed.find(item => imageOf(item) === id)).filter(Boolean);
      await api('/v1/appAssetLibraryPlacementOrderingRequests', 'POST', { data: { type: 'appAssetLibraryPlacementOrderingRequests',
        attributes: { placementGroup: slot.group },
        relationships: { orderedPlacements: { data: ordered.map(item => ({ type: 'appAssetLibraryPlacements', id: item.id })) },
          appStoreVersionLocalization: relation('appStoreVersionLocalizations', localization.id) } } });
      const after = await listAll('/v1/appStoreVersionLocalizations/' + localization.id + '/placements' + query);
      if (after.map(imageOf).join() !== slot.ids.join()) console.log('Order requested for', slot.type, slot.group + '; check it in App Store Connect, since the list did not read back in that order.');
    }
  }
  console.log('Run `assets` until every image has finished processing.');
}

// withdraw takes the version out of App Review so another build can be attached; `submit --confirm` then sends it
// back. It needs --confirm because the version loses its place in Apple's queue.
async function withdraw(flag) {
  if (flag !== '--confirm') throw new Error('Withdrawing from review gives up the place in Apple\'s queue; rerun as `asc.mjs withdraw --confirm` once the owner has approved it.');
  const ctx = await context();
  if (ctx.app.attributes.bundleId !== IOS.bundleId) throw new Error('Configured app/bundle identity mismatch; nothing was withdrawn.');
  // A cancel an earlier run left in flight finishes first, so a rerun after a lost response reads the settled state.
  for (const settling of settlingSubmissions((await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=CANCELING,COMPLETING')).data)) {
    console.log('Waiting for submission', settling.id, 'to finish', settling.attributes.state);
    await waitForCancel(settling.id);
  }
  const active = (await api('/v1/apps/' + IOS.ascAppId + '/reviewSubmissions?filter[platform]=IOS&filter[state]=WAITING_FOR_REVIEW,IN_REVIEW')).data;
  const items = {};
  for (const submission of active) items[submission.id] = await submissionItems(submission.id);
  const plan = withdrawPlan(active, items, ctx.version.id);
  if (plan.action === 'conflict') throw new Error('Version ' + STORE.version + ' is in review in more than one submission (' + plan.ids.join(', ') + '); inspect App Store Connect. Nothing was withdrawn.');
  if (plan.action === 'cancel') {
    await api('/v1/reviewSubmissions/' + plan.id, 'PATCH', { data: { type: 'reviewSubmissions', id: plan.id, attributes: { canceled: true } } });
    console.log('Canceled review submission', plan.id);
    await waitForCancel(plan.id);
  } else {
    console.log('Version', STORE.version, 'is not waiting for or in review; nothing was withdrawn.');
  }
  const version = (await api('/v1/appStoreVersions/' + ctx.version.id)).data;
  if (['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(versionState(version))) throw new Error('Version ' + STORE.version + ' still reads ' + versionState(version) + '; inspect provider state before retrying.');
  console.log('Version', STORE.version, 'is', versionState(version) + '; attach a build with `attach-build <N>`, then `submit --confirm`.');
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
  if (command === 'iap-review-screenshots') await iapReviewScreenshots();
  if (command === 'review-details') await reviewDetails();
  if (command === 'review-attachment') await reviewAttachment(argument);
  if (command === 'game-center') await gameCenter();
  if (command === 'attach-build') await attachBuild(argument);
  if (command === 'testflight') await testflight(argument);
  if (command === 'submit') await submit(argument);
  if (command === 'withdraw') await withdraw(argument);
  if (command === 'release') await release(argument);
  if (command === 'assets') await assets(argument);
}

// Run only when invoked as a command, so tests can import the decision helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
