// privacy-label.mjs
// Keeps three records of what an app collects in step: the privacy manifest(s) built into the app, the App Privacy
// answers the store data expects (`appPrivacy`), and the label Apple actually publishes on the App Store page. Apple
// has no API for App Privacy answers, so the published label is read from the public product page, whose server-side
// render carries it as JSON (`serialized-server-data`, the privacy detail shelves). A confirmation read in App Store
// Connect itself covers the hours before the public page catches up.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

// Apple's data types: the privacy manifest key suffix, the name App Store Connect and the product page show, and the
// category it sits under. From "Describing data use in privacy manifests" and the App privacy details page.
export const DATA_TYPES = [
  ['Name', 'Name', 'Contact Info'], ['EmailAddress', 'Email Address', 'Contact Info'], ['PhoneNumber', 'Phone Number', 'Contact Info'],
  ['PhysicalAddress', 'Physical Address', 'Contact Info'], ['OtherUserContactInfo', 'Other User Contact Info', 'Contact Info'],
  ['Health', 'Health', 'Health & Fitness'], ['Fitness', 'Fitness', 'Health & Fitness'],
  ['PaymentInfo', 'Payment Info', 'Financial Info'], ['CreditInfo', 'Credit Info', 'Financial Info'], ['OtherFinancialInfo', 'Other Financial Info', 'Financial Info'],
  ['PreciseLocation', 'Precise Location', 'Location'], ['CoarseLocation', 'Coarse Location', 'Location'],
  ['SensitiveInfo', 'Sensitive Info', 'Sensitive Info'], ['Contacts', 'Contacts', 'Contacts'],
  ['EmailsOrTextMessages', 'Emails or Text Messages', 'User Content'], ['PhotosorVideos', 'Photos or Videos', 'User Content'],
  ['AudioData', 'Audio Data', 'User Content'], ['GameplayContent', 'Gameplay Content', 'User Content'],
  ['CustomerSupport', 'Customer Support', 'User Content'], ['OtherUserContent', 'Other User Content', 'User Content'],
  ['BrowsingHistory', 'Browsing History', 'Browsing History'], ['SearchHistory', 'Search History', 'Search History'],
  ['UserID', 'User ID', 'Identifiers'], ['DeviceID', 'Device ID', 'Identifiers'], ['PurchaseHistory', 'Purchase History', 'Purchases'],
  ['ProductInteraction', 'Product Interaction', 'Usage Data'], ['AdvertisingData', 'Advertising Data', 'Usage Data'], ['OtherUsageData', 'Other Usage Data', 'Usage Data'],
  ['CrashData', 'Crash Data', 'Diagnostics'], ['PerformanceData', 'Performance Data', 'Diagnostics'], ['OtherDiagnosticData', 'Other Diagnostic Data', 'Diagnostics'],
  ['EnvironmentScanning', 'Environment Scanning', 'Surroundings'], ['Hands', 'Hands', 'Body'], ['Head', 'Head', 'Body'],
  ['OtherDataTypes', 'Other Data Types', 'Other Data']
].map(([key, name, category]) => ({ key, name, category }));

export const PURPOSES = [
  ['ThirdPartyAdvertising', 'Third-Party Advertising'], ['DeveloperAdvertising', 'Developer’s Advertising or Marketing'],
  ['Analytics', 'Analytics'], ['ProductPersonalization', 'Product Personalization'], ['AppFunctionality', 'App Functionality'], ['Other', 'Other Purposes']
].map(([key, name]) => ({ key, name }));

const squash = value => String(value).toLowerCase().replace(/[^a-z]/g, '');
const TYPE_INDEX = new Map(DATA_TYPES.flatMap(type => [[squash(type.key), type], [squash(type.name), type], [squash('NSPrivacyCollectedDataType' + type.key), type]]));
const PURPOSE_INDEX = new Map(PURPOSES.flatMap(purpose => [[squash(purpose.key), purpose], [squash(purpose.name), purpose],
  [squash('NSPrivacyCollectedDataTypePurpose' + purpose.key), purpose]]));
// The product page's purpose identifiers, where they differ from the names.
for (const [id, key] of [['DEVELOPERS_ADVERTISING', 'DeveloperAdvertising'], ['OTHER_PURPOSES', 'Other'], ['OTHER', 'Other']]) {
  PURPOSE_INDEX.set(squash(id), PURPOSES.find(purpose => purpose.key === key));
}

export const typeOf = value => TYPE_INDEX.get(squash(value)) || null;
export const purposeOf = value => PURPOSE_INDEX.get(squash(value)) || null;
export const describeType = key => { const type = typeOf(key); return type ? type.category + ' > ' + type.name : key; };
const purposeName = key => purposeOf(key)?.name || key;

// mergeEntries folds entries into one per data type: purposes join, and linked or tracking anywhere wins.
export function mergeEntries(entries) {
  const merged = new Map();
  for (const entry of entries) {
    const found = merged.get(entry.type);
    if (!found) { merged.set(entry.type, { ...entry, purposes: [...new Set(entry.purposes)].sort() }); continue; }
    found.linked = found.linked || entry.linked;
    found.tracking = found.tracking || entry.tracking;
    found.purposes = [...new Set(found.purposes.concat(entry.purposes))].sort();
    if (entry.notInManifest && !found.notInManifest) found.notInManifest = entry.notInManifest;
  }
  return [...merged.values()].sort((a, b) => a.type.localeCompare(b.type));
}

// ---- Privacy manifests --------------------------------------------------------------------------------------------

// parsePlist reads the XML property list subset privacy manifests use.
export function parsePlist(xml) {
  const tokens = xml.replace(/<\?xml[^>]*>|<!DOCTYPE[^>]*>|<!--[\s\S]*?-->/g, '').match(/<[^>]+>|[^<]+/g) || [];
  let index = 0;
  const next = () => tokens[index++];
  const text = close => { let value = ''; while (index < tokens.length && tokens[index] !== close) value += tokens[index++]; index++; return value.trim(); };
  function value(token) {
    if (token === '<dict>') {
      const out = {};
      for (let t = next(); t !== '</dict>'; t = next()) {
        if (t === undefined) throw new Error('unterminated <dict>');
        if (!t.trim()) continue;
        if (t !== '<key>') throw new Error('expected <key>, found ' + t);
        const key = text('</key>');
        let v = next(); while (v !== undefined && !v.trim()) v = next();
        out[key] = value(v);
      }
      return out;
    }
    if (token === '<array>') {
      const out = [];
      for (let t = next(); t !== '</array>'; t = next()) {
        if (t === undefined) throw new Error('unterminated <array>');
        if (t.trim()) out.push(value(t));
      }
      return out;
    }
    if (token === '<dict/>') return {};
    if (token === '<array/>') return [];
    if (token === '<true/>') return true;
    if (token === '<false/>') return false;
    if (token === '<string/>') return '';
    if (token === '<string>') return text('</string>').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    if (token === '<integer>' || token === '<real>') return Number(text(token.replace('<', '</')));
    throw new Error('unsupported plist token ' + token);
  }
  let first = next();
  while (first !== undefined && (first === '<plist>' || /^<plist\s/.test(first) || !first.trim())) first = next();
  return first === undefined ? {} : value(first);
}

// collectedFrom turns a manifest's NSPrivacyCollectedDataTypes into entries; problems name what cannot be read.
export function collectedFrom(manifest, source) {
  const list = manifest && manifest.NSPrivacyCollectedDataTypes;
  if (list === undefined) return { entries: [], problems: [] };
  if (!Array.isArray(list)) return { entries: [], problems: [source + ': NSPrivacyCollectedDataTypes is not a list'] };
  const entries = [], problems = [];
  for (const item of list) {
    const type = typeOf(item?.NSPrivacyCollectedDataType || '');
    if (!type) { problems.push(source + ': unknown data type ' + JSON.stringify(item?.NSPrivacyCollectedDataType)); continue; }
    const purposes = (item.NSPrivacyCollectedDataTypePurposes || []).map(value => purposeOf(value));
    if (purposes.some(purpose => !purpose) || !purposes.length) { problems.push(source + ': ' + type.name + ' has no recognised purpose'); continue; }
    entries.push({ type: type.key, linked: item.NSPrivacyCollectedDataTypeLinked === true, tracking: item.NSPrivacyCollectedDataTypeTracking === true,
      purposes: purposes.map(purpose => purpose.key), source });
  }
  return { entries, problems };
}

const MANIFEST_NAMES = /(?:^|\/)(?:PrivacyInfo\.xcprivacy|app\.json|app\.config\.[cm]?[jt]s)$/;

// evaluateExpoConfig runs an Expo app config the way Expo does (a module whose default export is the config or a
// function of the static app.json config) in a child process, and returns its ios.privacyManifests.
function evaluateExpoConfig(path, staticConfig) {
  const probe = 'const m = await import(process.argv[1]); let c = m.default ?? m;'
    + 'if (typeof c === "function") c = await c({ config: JSON.parse(process.argv[2]) });'
    + 'c = c && c.expo ? c.expo : c; process.stdout.write(JSON.stringify(c?.ios?.privacyManifests ?? null));';
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', probe, pathToFileURL(path).href, JSON.stringify(staticConfig || {})],
    { cwd: dirname(path), encoding: 'utf8', timeout: 20000 });
  if (result.status !== 0) throw new Error(String(result.stderr || result.error || 'exit ' + result.status).trim().split('\n').slice(-1)[0]);
  return JSON.parse(result.stdout || 'null');
}

// manifestFiles lists the tracked manifests under projectDir: dependencies, build output, vendored skills and dot
// folders do not count.
export function manifestFiles(config, scan) {
  const prefix = relative(config.root, config.projectDir);
  const result = spawnSync('git', ['-C', config.root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (result.status !== 0) throw new Error(config.root + ' is not a readable git checkout');
  return result.stdout.split('\0').filter(path => path && (!prefix || path.startsWith(prefix + '/')) && MANIFEST_NAMES.test(path))
    .filter(path => {
      const parts = (prefix ? path.slice(prefix.length + 1) : path).split('/');
      return !scan.rootDirs.includes(parts[0]) && !parts.slice(0, -1).some(part => part.startsWith('.') || scan.dirs.includes(part));
    });
}

// manifestCollection reads every privacy manifest the app builds with and merges what they declare.
export function manifestCollection(config, scan) {
  const sources = [], entries = [], problems = [];
  for (const path of manifestFiles(config, scan)) {
    const absolute = join(config.root, path);
    if (!existsSync(absolute)) continue;
    try {
      let manifest;
      if (path.endsWith('.xcprivacy')) manifest = parsePlist(readFileSync(absolute, 'utf8'));
      else if (path.endsWith('app.json')) manifest = JSON.parse(readFileSync(absolute, 'utf8'))?.expo?.ios?.privacyManifests;
      else {
        const appJson = join(dirname(absolute), 'app.json');
        manifest = evaluateExpoConfig(absolute, existsSync(appJson) ? JSON.parse(readFileSync(appJson, 'utf8')).expo : {});
      }
      if (!manifest) continue;
      const read = collectedFrom(manifest, path);
      sources.push(path);
      entries.push(...read.entries);
      problems.push(...read.problems);
    } catch (error) {
      problems.push(path + ' could not be read: ' + error.message);
    }
  }
  return { sources, entries: mergeEntries(entries), problems };
}

// ---- Expected answers (store data `appPrivacy`) -------------------------------------------------------------------

// expectedLabel reads store data `appPrivacy.collected`: [{ type, purposes, linked, tracking, why, notInManifest? }].
// An empty list is "Data Not Collected". Returns null when the store data has no appPrivacy.
export function expectedLabel(store) {
  const privacy = store && store.appPrivacy;
  if (!privacy) return null;
  const problems = [], entries = [];
  if (!Array.isArray(privacy.collected)) return { entries, problems: ['appPrivacy.collected must be a list ([] for Data Not Collected)'] };
  for (const [index, item] of privacy.collected.entries()) {
    const where = 'appPrivacy.collected[' + index + ']';
    const type = typeOf(item?.type || '');
    if (!type) { problems.push(where + ': unknown data type ' + JSON.stringify(item?.type) + ' (use the App Store Connect name, such as "Product Interaction")'); continue; }
    const purposes = (item.purposes || []).map(purposeOf);
    if (!purposes.length || purposes.some(purpose => !purpose)) { problems.push(where + ' (' + type.name + '): purposes must name App Store Connect purposes, such as "Analytics"'); continue; }
    if (typeof item.linked !== 'boolean' || typeof item.tracking !== 'boolean') { problems.push(where + ' (' + type.name + '): linked and tracking must be true or false'); continue; }
    const entry = { type: type.key, linked: item.linked, tracking: item.tracking, purposes: purposes.map(purpose => purpose.key) };
    if (item.notInManifest !== undefined) entry.notInManifest = item.notInManifest;
    entries.push(entry);
  }
  return { entries: mergeEntries(entries), problems };
}

const same = (a, b) => a.length === b.length && a.every(item => b.includes(item));
const flags = entry => (entry.linked ? 'linked' : 'not linked') + ', ' + (entry.tracking ? 'tracking' : 'not tracking');
const summary = entry => describeType(entry.type) + ' for ' + entry.purposes.map(purposeName).join(' and ') + ' (' + flags(entry) + ')';

// manifestDrift lists where the manifest(s) and the expected answers disagree. A data type collected outside the
// app's code (a provider's logs) may stand in the expected answers alone with `notInManifest` naming why.
export function manifestDrift(manifest, expected) {
  const problems = [];
  for (const entry of manifest) {
    const want = expected.find(item => item.type === entry.type);
    if (!want) { problems.push('the privacy manifest (' + entry.source + ') declares ' + summary(entry) + ', which appPrivacy.collected does not list'); continue; }
    if (want.linked !== entry.linked || want.tracking !== entry.tracking || !same(want.purposes, entry.purposes)) {
      problems.push(describeType(entry.type) + ': the privacy manifest says ' + summary(entry) + ' but appPrivacy.collected says ' + summary(want));
    }
  }
  for (const want of expected) {
    if (manifest.some(entry => entry.type === want.type)) continue;
    if (typeof want.notInManifest === 'string' && want.notInManifest.trim().length >= 10) continue;
    problems.push('appPrivacy.collected lists ' + summary(want) + ', which no privacy manifest declares; declare it in the manifest, or give `notInManifest` the reason it is collected outside the app\'s code');
  }
  return problems;
}

// ---- The published label ------------------------------------------------------------------------------------------

export const storePageUrl = id => 'https://apps.apple.com/us/app/id' + id;

// parseStorePage reads the App Privacy section of a product page's server-side render: the "See Details" page data
// holds each privacy type (tracking, linked, not linked, not collected) with its purposes, categories and data types.
export function parseStorePage(html) {
  const match = String(html).match(/<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('the page has no serialized-server-data block; Apple may have changed the page');
  const data = JSON.parse(match[1]);
  const mapping = data?.data?.[0]?.data?.shelfMapping;
  const detail = mapping?.privacyHeader?.seeAllAction?.pageData?.shelves;
  const summaryItems = mapping?.privacyTypes?.items || [];
  const items = (detail || []).flatMap(shelf => shelf.items || []).filter(item => item.$kind === 'PrivacyType');
  const kinds = (items.length ? items : summaryItems).map(item => item.identifier);
  if (!kinds.length) throw new Error('the page shows no App Privacy section; Apple may have changed the page');
  if (kinds.includes('DATA_NOT_COLLECTED')) return { notCollected: true, entries: [], kinds, unknown: [] };
  if (!items.length) throw new Error('the App Privacy details are missing from the page; Apple may have changed the page');
  const entries = [], unknown = [], tracked = new Set();
  const typeFrom = name => { const type = typeOf(name); if (!type) unknown.push(name); return type; };
  for (const item of items) {
    if (item.identifier === 'DATA_USED_TO_TRACK_YOU') {
      for (const category of item.categories || []) for (const name of category.dataTypes || []) { const type = typeFrom(name); if (type) tracked.add(type.key); }
      continue;
    }
    if (!['DATA_LINKED_TO_YOU', 'DATA_NOT_LINKED_TO_YOU'].includes(item.identifier)) continue;
    for (const purpose of item.purposes || []) {
      const known = purposeOf(purpose.identifier) || purposeOf(purpose.title || '');
      if (!known) { unknown.push('purpose ' + (purpose.title || purpose.identifier)); continue; }
      for (const category of purpose.categories || []) for (const name of category.dataTypes || []) {
        const type = typeFrom(name);
        if (type) entries.push({ type: type.key, linked: item.identifier === 'DATA_LINKED_TO_YOU', tracking: false, purposes: [known.key] });
      }
    }
  }
  // Tracked data also appears under linked or not linked with its purposes; a tracked type found nowhere else still counts.
  for (const key of tracked) if (!entries.some(entry => entry.type === key)) entries.push({ type: key, linked: false, tracking: true, purposes: [] });
  return { notCollected: false, entries: mergeEntries(entries).map(entry => ({ ...entry, tracking: entry.tracking || tracked.has(entry.type) })), kinds, unknown };
}

// readPublishedLabel fetches the US product page and parses its label.
export async function readPublishedLabel(appStoreId, fetchImpl = globalThis.fetch) {
  const url = storePageUrl(appStoreId);
  const response = await fetchImpl(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', 'accept-language': 'en-US' } });
  if (!response.ok) throw new Error(url + ' answered ' + response.status);
  return { url, readAt: new Date().toISOString(), ...parseStorePage(await response.text()) };
}

// coverageProblems names each required collection (manifest and expected answers) the label does not disclose. A label
// may say more than required (linked where not linked, an extra purpose); it may never say less.
export function coverageProblems(required, label) {
  const problems = [];
  for (const need of required) {
    const have = label.entries.find(entry => entry.type === need.type);
    if (!have) { problems.push('add ' + summary(need)); continue; }
    const missing = need.purposes.filter(purpose => !have.purposes.includes(purpose));
    const fixes = [];
    if (missing.length) fixes.push('add the purpose ' + missing.map(purposeName).join(' and '));
    if (need.linked && !have.linked) fixes.push('answer that it is linked to the user');
    if (need.tracking && !have.tracking) fixes.push('answer that it is used for tracking');
    if (fixes.length) problems.push(describeType(need.type) + ': ' + fixes.join(', ') + ' (the label now says ' + summary(have) + ')');
  }
  return problems;
}

// differences lists what the label says beyond the expected answers: not a refusal, but the run makes them match.
export function differences(expected, label) {
  const notes = [];
  for (const have of label.entries) {
    const want = expected.find(entry => entry.type === have.type);
    if (!want) notes.push('the label also lists ' + summary(have) + ', which appPrivacy.collected does not');
    else if (want.linked !== have.linked || want.tracking !== have.tracking || !same(want.purposes, have.purposes)) notes.push(describeType(have.type) + ': the label says ' + summary(have) + ', appPrivacy.collected says ' + summary(want));
  }
  return notes;
}

// ---- Confirmations read in App Store Connect ------------------------------------------------------------------------

export const CONFIRMATION_ROOT = process.env.APP_PRIVACY_CONFIRMATIONS || '/Volumes/ssd/projects/app-release-daily/state/app-privacy';
export const CONFIRMATION_DAYS = 3;
const confirmationPath = (appStoreId, root = CONFIRMATION_ROOT) => join(root, appStoreId + '.json');

// readConfirmation returns a confirmation recorded from App Store Connect's own App Privacy page, or null.
export function readConfirmation(appStoreId, root = CONFIRMATION_ROOT) {
  const path = confirmationPath(appStoreId, root);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

export function writeConfirmation(appStoreId, record, root = CONFIRMATION_ROOT) {
  mkdirSync(root, { recursive: true });
  writeFileSync(confirmationPath(appStoreId, root), JSON.stringify(record, null, 2) + '\n');
  return confirmationPath(appStoreId, root);
}

// ---- The gate -----------------------------------------------------------------------------------------------------

// labelGate decides whether a build may go to App Review. Offline problems (drift between manifest and expected
// answers) and the published label's gaps both refuse; a fresh App Store Connect confirmation of the expected answers
// stands in for a public page that has not caught up yet.
export async function labelGate(config, store, scan, { fetchImpl, now = Date.now(), confirmations = CONFIRMATION_ROOT } = {}) {
  const manifest = manifestCollection(config, scan);
  const expected = expectedLabel(store);
  const result = { manifest, expected, problems: [...manifest.problems], notes: [], published: null, confirmation: null };
  if (!expected) {
    if (manifest.entries.length) result.problems.push('the store data has no appPrivacy, but the privacy manifest declares ' + manifest.entries.map(summary).join('; ')
      + '. Add appPrivacy.collected with the answers App Store Connect must show (`privacy-label.mjs init` writes them from the manifest)');
    return result;
  }
  result.problems.push(...expected.problems, ...manifestDrift(manifest.entries, expected.entries));
  const required = mergeEntries(manifest.entries.concat(expected.entries));
  const appStoreId = config.ios && config.ios.ascAppId;
  if (!appStoreId) return result;
  try {
    result.published = await readPublishedLabel(appStoreId, fetchImpl);
  } catch (error) {
    result.readError = error.message;
  }
  const gaps = result.published ? coverageProblems(required, result.published) : null;
  if (result.published) {
    if (result.published.unknown.length) result.notes.push('the page names data the gate does not know: ' + result.published.unknown.join(', '));
    result.notes.push(...differences(expected.entries, result.published));
  }
  if (gaps && !gaps.length) return result;
  // The public page lags App Store Connect: a confirmation that the expected answers were published there, recorded
  // within the last few days, covers the gap until the page updates.
  const confirmation = readConfirmation(appStoreId, confirmations);
  const fresh = confirmation && (now - Date.parse(confirmation.confirmedAt)) < CONFIRMATION_DAYS * 86400000;
  if (fresh && !coverageProblems(required, { entries: confirmation.entries || [] }).length) {
    result.confirmation = confirmation;
    result.notes.push('the public page does not show it yet; App Store Connect showed it published at ' + confirmation.confirmedAt + ' (' + confirmation.evidence + ')');
    return result;
  }
  if (!result.published) {
    result.problems.push('the published App Privacy label could not be read from ' + storePageUrl(appStoreId) + ' (' + result.readError + ') and no App Store Connect confirmation from the last '
      + CONFIRMATION_DAYS + ' days covers it');
  } else {
    result.problems.push('App Store Connect, App Privacy (' + storePageUrl(appStoreId) + ' shows ' + (result.published.notCollected ? 'Data Not Collected' : result.published.entries.map(summary).join('; ')) + '): '
      + gaps.join('; ') + '. Publish the change there (references/privacy.md, "Change the published label"), then check again');
  }
  return result;
}

// labelRefusal is the sentence `asc.mjs submit` refuses with, or null. An app opted out of the privacy-label standard
// with a recorded reason (standards.md, Opting out) is not checked.
export async function labelRefusal(config, store, scan, options) {
  const reason = config.standards?.optOut?.['privacy-label'];
  if (typeof reason === 'string' && reason.trim().length >= 10) return null;
  const result = await labelGate(config, store, scan, options);
  if (!result.problems.length) return null;
  return 'App Privacy does not match what this build collects: ' + result.problems.join('; ') + '. Nothing was submitted.';
}

// labelFromEntries writes entries back in the store data's shape.
export function storeShape(entries) {
  return entries.map(entry => ({ type: typeOf(entry.type).name, purposes: entry.purposes.map(purposeName), linked: entry.linked, tracking: entry.tracking }));
}
