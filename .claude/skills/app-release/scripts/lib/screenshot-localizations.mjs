// screenshot-localizations.mjs
// App Store screenshots per listing language: the store data's `localizedScreenshots` object, checked before anything
// is sent, the per-set sync that `asc.mjs screenshots` runs for the primary language and for each listed language, and
// the comparison with what is live that `asc.mjs status` and `review-sweep.mjs sweep` report. Apple calls are injected
// (`request`, `readAll`, `upload`), so tests run on fake API data. Sources and dates are in references/ios.md,
// "Screenshots per language".

import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { manifestGroups } from './config.mjs';

// Apple: "You must include at least one screenshot and can upload up to 10 screenshots per device size in .jpeg, .jpg,
// or .png formats" (Screenshot specifications, developer.apple.com/help/app-store-connect/reference/app-information/
// screenshot-specifications, read 2026-11-18).
export const SCREENSHOTS_PER_SET = { min: 1, max: 10 };

// md5 is the checksum Apple keeps as an appScreenshot's sourceFileChecksum.
export const md5 = bytes => createHash('md5').update(bytes).digest('hex');

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

// imageInfo reads a PNG or JPEG header: { format, width, height }, or null for any other file.
export function imageInfo(bytes) {
  if (!bytes || bytes.length < 24) return null;
  if (bytes.readUInt32BE(0) === 0x89504e47 && bytes.toString('latin1', 12, 16) === 'IHDR') {
    return { format: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  for (let at = 2; at + 9 < bytes.length;) {
    if (bytes[at] !== 0xff) return null;
    const marker = bytes[at + 1];
    if (marker === 0xff) { at += 1; continue; }
    const length = bytes.readUInt16BE(at + 2);
    // SOF0 to SOF15 carry the frame size; C4 (Huffman), C8 (reserved) and CC (arithmetic) do not.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { format: 'jpeg', width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    }
    at += 2 + length;
  }
  return null;
}

// resolveGroups reads a language's screenshots in the same two shapes as the primary `screenshots`: explicit groups
// [{ displayType, files }], or { manifest, base } naming an asset manifest whose `ios` entries are used. Returns null
// for any other shape.
export function resolveGroups(spec, readJson) {
  if (Array.isArray(spec)) return spec;
  if (spec && typeof spec === 'object' && typeof spec.manifest === 'string') return manifestGroups(readJson(spec.manifest), 'ios', spec.base || '');
  return null;
}

// localizedScreenshotEntries returns store data's localizedScreenshots as [locale, spec] pairs, in the order written.
export function localizedScreenshotEntries(store) {
  const map = store && store.localizedScreenshots;
  return map && typeof map === 'object' && !Array.isArray(map) ? Object.entries(map) : [];
}

// localizedScreenshotGroups resolves every listed language: [{ locale, groups }]. Call it after
// localizedScreenshotProblems has passed.
export function localizedScreenshotGroups(store, readJson) {
  return localizedScreenshotEntries(store).map(([locale, spec]) => ({ locale, groups: resolveGroups(spec, readJson) }));
}

// localizedScreenshotProblems names everything wrong with store data's localizedScreenshots before any write. The
// locale must be a language listing.localizations carries (the primary language's screenshots are `screenshots`);
// every group must use a display type the primary lists, hold 1 to 10 files with distinct names that exist, and each
// file must be a PNG or JPEG whose pixel size is one the primary already uses for that display type. `readFile(path)`
// returns the bytes or null when the file does not exist; `readJson(path)` parses a manifest.
export function localizedScreenshotProblems(store, primaryGroups, { readFile, readJson }) {
  if (!store || store.localizedScreenshots === undefined) return [];
  const map = store.localizedScreenshots;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return ['localizedScreenshots must be an object keyed by locale code'];
  const listing = store.listing || {};
  const primary = listing.locale || 'en-US';
  const languages = Object.keys((listing.localizations && typeof listing.localizations === 'object') ? listing.localizations : {});
  const problems = [];
  const sizes = new Map();
  for (const group of primaryGroups || []) {
    const seen = sizes.get(group.displayType) || new Set();
    for (const file of group.files || []) {
      const info = imageInfo(readFile(file));
      if (info) seen.add(info.width + 'x' + info.height);
    }
    sizes.set(group.displayType, seen);
  }
  for (const [locale, spec] of Object.entries(map)) {
    const where = 'localizedScreenshots.' + locale;
    if (locale === primary) {
      problems.push(where + ': ' + locale + ' is the primary listing.locale; its screenshots belong in `screenshots`');
      continue;
    }
    if (!languages.includes(locale)) {
      problems.push(where + ': ' + locale + ' is not a language in listing.localizations; add its listing first');
      continue;
    }
    let groups;
    try {
      groups = resolveGroups(spec, readJson);
    } catch (error) {
      problems.push(where + ': the manifest could not be read (' + error.message + ')');
      continue;
    }
    if (!groups) {
      problems.push(where + ' must be a list of { displayType, files } or { manifest, base }, as `screenshots` is');
      continue;
    }
    const types = new Set();
    for (const group of groups) {
      const type = group && group.displayType;
      if (!type || !Array.isArray(group.files)) {
        problems.push(where + ': each group needs a displayType and a files list');
        continue;
      }
      const at = where + ' ' + type;
      if (types.has(type)) problems.push(at + ' is listed twice');
      types.add(type);
      if (!sizes.has(type)) problems.push(at + ': the primary `screenshots` has no ' + type + ' set, so this language may not add one');
      const count = group.files.length;
      if (count < SCREENSHOTS_PER_SET.min || count > SCREENSHOTS_PER_SET.max) {
        problems.push(at + ' has ' + count + ' files; Apple takes ' + SCREENSHOTS_PER_SET.min + ' to ' + SCREENSHOTS_PER_SET.max + ' per display type');
      }
      const names = new Set();
      for (const file of group.files) {
        const name = basename(String(file));
        if (names.has(name)) problems.push(at + ': two files are named ' + name + '; uploads match screenshots in a set by file name');
        names.add(name);
        const bytes = readFile(file);
        if (!bytes) {
          problems.push(at + ': ' + file + ' does not exist');
          continue;
        }
        const info = imageInfo(bytes);
        if (!info) {
          problems.push(at + ': ' + file + ' is not a PNG or JPEG');
          continue;
        }
        const allowed = sizes.get(type);
        const size = info.width + 'x' + info.height;
        if (allowed && allowed.size && !allowed.has(size)) {
          problems.push(at + ': ' + file + ' is ' + size + '; the primary ' + type + ' screenshots are ' + [...allowed].join(' or '));
        }
      }
    }
  }
  return problems;
}

// syncScreenshotGroups makes one localization's screenshot sets match `groups`: it creates missing sets, uploads files
// Apple lacks, keeps finished files with the same checksum, replaces unfinished uploads, refuses to overwrite a
// finished file whose bytes changed, handles sets and files store data no longer lists as `prune` says (delete them,
// or report and leave them), puts each set in the listed order and reads the order back. `label` starts every line
// and error (the locale). The primary language and every listed language run this same code.
export async function syncScreenshotGroups({ localizationId, groups, prune, label, request, readAll, readFile, upload, log = console.log }) {
  const tag = label ? label + ' ' : '';
  const relation = (type, id) => ({ data: { type, id } });
  const sets = await readAll('/v1/appStoreVersionLocalizations/' + localizationId + '/appScreenshotSets');
  for (const stale of staleScreenshotSets(sets, groups)) {
    if (!prune) {
      log(tag + 'left set ' + stale.attributes.screenshotDisplayType + ' in place (not in the store data; ios.pruneScreenshots removes it)');
      continue;
    }
    await request('/v1/appScreenshotSets/' + stale.id, 'DELETE');
    log(tag + 'removed set ' + stale.attributes.screenshotDisplayType + ' (not in the manifest)');
  }
  for (const group of groups) {
    let set = sets.find(item => item.attributes.screenshotDisplayType === group.displayType);
    if (!set) {
      set = (await request('/v1/appScreenshotSets', 'POST', { data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: group.displayType }, relationships: { appStoreVersionLocalization: relation('appStoreVersionLocalizations', localizationId) } } })).data;
      log(tag + 'created set ' + group.displayType);
    }
    const existing = await readAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots');
    const ordered = [];
    const stale = staleScreenshots(existing, group.files);
    // With ios.pruneScreenshots the store data is canonical: remove screenshots it no longer lists.
    const kept = prune ? [] : stale.map(item => item.id);
    for (const item of stale) {
      if (!prune) {
        log(tag + 'left ' + group.displayType + ' ' + item.attributes.fileName + ' in place (not in the store data; ios.pruneScreenshots removes it)');
        continue;
      }
      await request('/v1/appScreenshots/' + item.id, 'DELETE');
      log(tag + 'removed ' + group.displayType + ' ' + item.attributes.fileName + ' (not in the manifest)');
    }
    for (const file of group.files) {
      const name = basename(file);
      const bytes = readFile(file);
      if (!bytes) throw new Error(tag + file + ' does not exist');
      const checksum = md5(bytes);
      const plan = screenshotAction(existing, name, checksum);
      if (plan.action === 'conflict') throw new Error(tag + name + ' differs from the uploaded copy; delete it in App Store Connect to replace it.');
      if (plan.action === 'keep') {
        ordered.push(plan.id);
        log(tag + 'kept ' + group.displayType + ' ' + name);
        continue;
      }
      // An upload that never finished leaves a reservation without a checksum; drop it and upload again.
      if (plan.action === 'replace') await request('/v1/appScreenshots/' + plan.id, 'DELETE');
      const reserved = (await request('/v1/appScreenshots', 'POST', { data: { type: 'appScreenshots', attributes: { fileName: name, fileSize: bytes.length }, relationships: { appScreenshotSet: relation('appScreenshotSets', set.id) } } })).data;
      await upload(reserved.attributes.uploadOperations, bytes, name);
      await request('/v1/appScreenshots/' + reserved.id, 'PATCH', { data: { type: 'appScreenshots', id: reserved.id, attributes: { uploaded: true, sourceFileChecksum: checksum } } });
      ordered.push(reserved.id);
      log(tag + 'uploaded ' + group.displayType + ' ' + name);
    }
    // Put the set in the listed order, which a rerun that only reorders files would otherwise leave unchanged.
    // Screenshots left in place because pruning is off keep their places after the listed ones.
    const order = ordered.concat(kept);
    await request('/v1/appScreenshotSets/' + set.id + '/relationships/appScreenshots', 'PATCH', { data: order.map(id => ({ type: 'appScreenshots', id })) });
    const after = await readAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots');
    if (after.map(item => item.id).join() !== order.join()) throw new Error(tag + 'screenshot order did not read back for ' + group.displayType);
  }
}

// syncLocalizedScreenshots runs syncScreenshotGroups for each listed language on that language's localization of the
// version. A language that fails is recorded in `failed` and the rest go on; nothing is done for a language store data
// does not list. Languages with their own live sets that store data does not list come back in `unlisted`, never
// deleted. `localizations` are the version's appStoreVersionLocalizations; `languages` comes from
// localizedScreenshotGroups.
export async function syncLocalizedScreenshots({ languages, localizations, primary, prune, request, readAll, readFile, upload, log = console.log }) {
  const done = [];
  const failed = [];
  for (const { locale, groups } of languages) {
    try {
      const localization = localizations.find(item => item.attributes.locale === locale);
      if (!localization) throw new Error('no ' + locale + ' version localization; run `listing` first');
      await syncScreenshotGroups({ localizationId: localization.id, groups, prune, label: locale, request, readAll, readFile, upload, log });
      done.push(locale);
    } catch (error) {
      const message = error.message.startsWith(locale + ' ') ? error.message.slice(locale.length + 1) : error.message;
      failed.push({ locale, error: message });
      log(locale + ' screenshots failed: ' + message);
    }
  }
  const listed = new Set(languages.map(item => item.locale));
  const unlisted = [];
  for (const localization of localizations) {
    const locale = localization.attributes.locale;
    if (locale === primary || listed.has(locale)) continue;
    const sets = await readAll('/v1/appStoreVersionLocalizations/' + localization.id + '/appScreenshotSets');
    if (sets.length) unlisted.push({ locale, displayTypes: sets.map(set => set.attributes.screenshotDisplayType) });
  }
  return { done, failed, unlisted };
}

// readLiveScreenshots reads every non-primary localization's screenshot sets: Map locale -> [{ displayType, shots }].
// Only GET is sent, so the read-only sweep can use it.
export async function readLiveScreenshots(localizations, primary, readAll) {
  const live = new Map();
  for (const localization of localizations) {
    const locale = localization.attributes.locale;
    if (locale === primary) continue;
    const sets = await readAll('/v1/appStoreVersionLocalizations/' + localization.id + '/appScreenshotSets');
    const groups = [];
    for (const set of sets) groups.push({ displayType: set.attributes.screenshotDisplayType, shots: await readAll('/v1/appScreenshotSets/' + set.id + '/appScreenshots') });
    live.set(locale, groups);
  }
  return live;
}

// localizedScreenshotChanges compares each listed language's screenshots with the live ones. `live` is
// readLiveScreenshots' map; `checksum(file)` is the file's MD5, or null when it cannot be read. `missing` names
// languages with no live localization, `changed` the display types whose listed files are absent, out of order or
// have other bytes, and `unlisted` the live languages with their own sets that store data does not list (reported,
// never deleted). A file live but not listed is not a difference: `screenshots` leaves it unless pruning is on.
export function localizedScreenshotChanges(languages, live, checksum) {
  const missing = [];
  const changed = [];
  const listed = new Set(languages.map(item => item.locale));
  for (const { locale, groups } of languages) {
    if (!live.has(locale)) {
      missing.push(locale);
      continue;
    }
    const sets = live.get(locale);
    const types = [];
    for (const group of groups || []) {
      const set = sets.find(item => item.displayType === group.displayType);
      const names = group.files.map(file => basename(file));
      const shots = set ? set.shots.filter(shot => names.includes(shot.attributes.fileName)) : [];
      const same = set && shots.length === names.length &&
        shots.every((shot, index) => shot.attributes.fileName === names[index] && shot.attributes.sourceFileChecksum === checksum(group.files[index]));
      if (!same) types.push(group.displayType);
    }
    if (types.length) changed.push({ locale, displayTypes: types });
  }
  const unlisted = [...live.entries()].filter(([locale, sets]) => !listed.has(locale) && sets.length).map(([locale]) => locale).sort();
  return { missing, changed, unlisted };
}

// localizedScreenshotSummary is one line for a report, or '' when every listed language matches.
export function localizedScreenshotSummary(changes) {
  const parts = [];
  if (changes.missing.length) parts.push('screenshot languages not live: ' + changes.missing.join(', '));
  for (const entry of changes.changed) parts.push(entry.locale + ' screenshots differ in ' + entry.displayTypes.join(', '));
  return parts.join('; ');
}
