// screenshot-localizations.test.mjs
// App Store screenshots per listing language, on fake API data: the store data check before any write, the per-language
// sync (create, upload, skip by checksum, stale files, unlisted languages, one failure not stopping the rest), and the
// comparison that `status` and the sweep report. No network.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  imageInfo, localizedScreenshotChanges, localizedScreenshotGroups, localizedScreenshotProblems, localizedScreenshotSummary, md5,
  readLiveScreenshots, syncLocalizedScreenshots, syncScreenshotGroups,
} from '../../skills/app-release/scripts/lib/screenshot-localizations.mjs';
import { pendingScreenshots, listingReason } from '../../skills/app-release/scripts/review-sweep.mjs';
import * as asc from '../../skills/app-release/scripts/asc.mjs';

// png makes the first bytes of a PNG of the given size; `tag` changes the bytes so checksums differ.
function png(width, height, tag = '') {
  const bytes = Buffer.alloc(33 + tag.length);
  bytes.writeUInt32BE(0x89504e47, 0);
  bytes.writeUInt32BE(0x0d0a1a0a, 4);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'latin1');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes.write(tag, 33, 'latin1');
  return bytes;
}

function jpeg(width, height) {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03, 0, 0, 0, 0, 0, 0, 0]);
}

const PHONE = 'APP_IPHONE_67';
const IPAD = 'APP_IPAD_PRO_3GEN_129';
const disk = {
  'store/shots/1.png': png(1320, 2868, 'en1'),
  'store/shots/2.png': png(1320, 2868, 'en2'),
  'store/ipad/1.png': png(2064, 2752, 'en-ipad'),
  'store/es-MX/1.png': png(1320, 2868, 'es1'),
  'store/es-MX/2.png': png(1320, 2868, 'es2'),
  'store/fr-FR/1.png': png(1320, 2868, 'fr1'),
  'store/de-DE/1.png': png(1320, 2868, 'de1'),
  'store/small.png': png(1242, 2688),
  'store/notes.txt': Buffer.from('not an image at all, just text'),
  'store/manifest.json': Buffer.from(JSON.stringify([{ file: 'ja/1.png', platform: 'ios', displayType: PHONE }, { file: 'android.png', platform: 'android' }])),
  'store/ja/1.png': png(1320, 2868, 'ja1'),
};
const files = {
  readFile: file => disk[file] || null,
  readJson: file => JSON.parse(disk[file].toString('utf8')),
};
const primaryGroups = [{ displayType: PHONE, files: ['store/shots/1.png', 'store/shots/2.png'] }, { displayType: IPAD, files: ['store/ipad/1.png'] }];
const listing = { locale: 'en-US', localizations: { 'es-MX': {}, 'fr-FR': {}, 'de-DE': {}, ja: {} } };
const store = localized => ({ listing, screenshots: primaryGroups, localizedScreenshots: localized });

// fakeApple keeps sets and screenshots per localization and records every write, so a test can say what was sent.
function fakeApple(initial = {}, { failOn } = {}) {
  let next = 1;
  const sets = [];
  const shots = new Map();
  const writes = [];
  for (const [localization, groups] of Object.entries(initial)) {
    for (const [displayType, items] of Object.entries(groups)) {
      const set = { id: 'set' + next++, localization, attributes: { screenshotDisplayType: displayType } };
      sets.push(set);
      shots.set(set.id, items.map(([fileName, checksum, state = 'COMPLETE']) => ({ id: 'shot' + next++, attributes: { fileName, sourceFileChecksum: checksum, assetDeliveryState: { state } } })));
    }
  }
  const readAll = async path => {
    let match = path.match(/^\/v1\/appStoreVersionLocalizations\/([^/]+)\/appScreenshotSets$/);
    if (match) return sets.filter(set => set.localization === match[1]);
    match = path.match(/^\/v1\/appScreenshotSets\/([^/]+)\/appScreenshots$/);
    if (match) return shots.get(match[1]) || [];
    throw new Error('unexpected read ' + path);
  };
  const request = async (path, method, body) => {
    writes.push(method + ' ' + path);
    if (failOn && failOn(path, method, body)) throw new Error('Apple refused ' + method + ' ' + path);
    if (method === 'POST' && path === '/v1/appScreenshotSets') {
      const set = { id: 'set' + next++, localization: body.data.relationships.appStoreVersionLocalization.data.id, attributes: { screenshotDisplayType: body.data.attributes.screenshotDisplayType } };
      sets.push(set);
      shots.set(set.id, []);
      return { data: set };
    }
    if (method === 'POST' && path === '/v1/appScreenshots') {
      const shot = { id: 'shot' + next++, attributes: { fileName: body.data.attributes.fileName, sourceFileChecksum: null, assetDeliveryState: { state: 'AWAITING_UPLOAD' }, uploadOperations: [] } };
      shots.get(body.data.relationships.appScreenshotSet.data.id).push(shot);
      return { data: shot };
    }
    if (method === 'PATCH' && path.startsWith('/v1/appScreenshots/')) {
      for (const list of shots.values()) for (const shot of list) if (shot.id === body.data.id) {
        shot.attributes.sourceFileChecksum = body.data.attributes.sourceFileChecksum;
        shot.attributes.assetDeliveryState = { state: 'UPLOAD_COMPLETE' };
      }
      return { data: {} };
    }
    let match = path.match(/^\/v1\/appScreenshotSets\/([^/]+)\/relationships\/appScreenshots$/);
    if (method === 'PATCH' && match) {
      const list = shots.get(match[1]);
      shots.set(match[1], body.data.map(item => list.find(shot => shot.id === item.id)));
      return {};
    }
    match = path.match(/^\/v1\/appScreenshots\/(.+)$/);
    if (method === 'DELETE' && match) {
      for (const [id, list] of shots) shots.set(id, list.filter(shot => shot.id !== match[1]));
      return {};
    }
    match = path.match(/^\/v1\/appScreenshotSets\/(.+)$/);
    if (method === 'DELETE' && match) {
      sets.splice(sets.findIndex(set => set.id === match[1]), 1);
      return {};
    }
    throw new Error('unexpected write ' + method + ' ' + path);
  };
  const uploaded = [];
  const upload = async (operations, bytes, name) => { uploaded.push(name); };
  const names = async localization => {
    const out = {};
    for (const set of sets.filter(item => item.localization === localization)) out[set.attributes.screenshotDisplayType] = shots.get(set.id).map(shot => shot.attributes.fileName);
    return out;
  };
  return { readAll, request, upload, writes, uploaded, names };
}

const localizations = ['en-US', 'es-MX', 'fr-FR', 'de-DE', 'ja'].map(locale => ({ id: 'loc-' + locale, attributes: { locale } }));
const quiet = () => {};

test('the PNG and JPEG headers give the pixel size; other files read as no image', () => {
  assert.deepEqual(imageInfo(png(1320, 2868)), { format: 'png', width: 1320, height: 2868 });
  assert.deepEqual(imageInfo(jpeg(2064, 2752)), { format: 'jpeg', width: 2064, height: 2752 });
  assert.equal(imageInfo(disk['store/notes.txt']), null);
  assert.equal(imageInfo(null), null);
});

test('valid languages pass, in either shape, and no localizedScreenshots is no problem', () => {
  const data = store({ 'es-MX': [{ displayType: PHONE, files: ['store/es-MX/1.png', 'store/es-MX/2.png'] }], ja: { manifest: 'store/manifest.json', base: 'store' } });
  assert.deepEqual(localizedScreenshotProblems(data, primaryGroups, files), []);
  assert.deepEqual(localizedScreenshotGroups(data, files.readJson).map(item => [item.locale, item.groups]), [
    ['es-MX', [{ displayType: PHONE, files: ['store/es-MX/1.png', 'store/es-MX/2.png'] }]],
    ['ja', [{ displayType: PHONE, files: ['store/ja/1.png'] }]],
  ]);
  assert.deepEqual(localizedScreenshotProblems({ listing, screenshots: primaryGroups }, primaryGroups, files), []);
});

test('a bad locale, a missing file, an extra display type, a wrong size and a bad count are refused before any write', () => {
  const problems = localizedScreenshotProblems(store({
    'en-US': [{ displayType: PHONE, files: ['store/shots/1.png'] }],
    'it': [{ displayType: PHONE, files: ['store/es-MX/1.png'] }],
    'es-MX': [{ displayType: PHONE, files: ['store/es-MX/1.png', 'store/es-MX/missing.png', 'store/small.png', 'store/notes.txt'] }],
    'fr-FR': [{ displayType: 'APP_IPHONE_65', files: ['store/fr-FR/1.png'] }, { displayType: IPAD, files: [] }],
    'de-DE': [{ displayType: PHONE, files: Array(11).fill('store/de-DE/1.png') }],
    ja: { nothing: true },
  }), primaryGroups, files);
  for (const expected of [
    /localizedScreenshots\.en-US: en-US is the primary listing\.locale/,
    /localizedScreenshots\.it: it is not a language in listing\.localizations/,
    /localizedScreenshots\.es-MX APP_IPHONE_67: store\/es-MX\/missing\.png does not exist/,
    /localizedScreenshots\.es-MX APP_IPHONE_67: store\/small\.png is 1242x2688; the primary APP_IPHONE_67 screenshots are 1320x2868/,
    /localizedScreenshots\.es-MX APP_IPHONE_67: store\/notes\.txt is not a PNG or JPEG/,
    /localizedScreenshots\.fr-FR APP_IPHONE_65: the primary `screenshots` has no APP_IPHONE_65 set/,
    /localizedScreenshots\.fr-FR APP_IPAD_PRO_3GEN_129 has 0 files; Apple takes 1 to 10/,
    /localizedScreenshots\.de-DE APP_IPHONE_67 has 11 files/,
    /localizedScreenshots\.de-DE APP_IPHONE_67: two files are named 1\.png/,
    /localizedScreenshots\.ja must be a list/,
  ]) assert.ok(problems.some(problem => expected.test(problem)), String(expected) + '\n' + problems.join('\n'));
  assert.deepEqual(localizedScreenshotProblems({ listing, localizedScreenshots: [] }, primaryGroups, files), ['localizedScreenshots must be an object keyed by locale code']);
});

test('a language with no screenshots is untouched, and a new language gets its set and files', async () => {
  const apple = fakeApple({ 'loc-en-US': { [PHONE]: [['1.png', md5(disk['store/shots/1.png'])]] } });
  const languages = [{ locale: 'es-MX', groups: [{ displayType: PHONE, files: ['store/es-MX/1.png', 'store/es-MX/2.png'] }] }];
  const result = await syncLocalizedScreenshots({ languages, localizations, primary: 'en-US', prune: false, ...apple, readFile: files.readFile, log: quiet });
  assert.deepEqual(result, { done: ['es-MX'], failed: [], unlisted: [] });
  assert.deepEqual(await apple.names('loc-es-MX'), { [PHONE]: ['1.png', '2.png'] });
  assert.deepEqual(apple.uploaded, ['1.png', '2.png']);
  assert.ok(apple.writes.every(write => !write.includes('loc-fr-FR') && !write.includes('loc-de-DE')), 'no write names an unlisted language');
  assert.equal(apple.writes.filter(write => write === 'POST /v1/appScreenshotSets').length, 1);
  assert.deepEqual(await apple.names('loc-fr-FR'), {}, 'fr-FR keeps falling back to the primary');
  assert.deepEqual(await apple.names('loc-en-US'), { [PHONE]: ['1.png'] }, 'the primary is not touched by the language pass');
});

test('an unchanged file is skipped by checksum, and a changed finished file is refused for that language only', async () => {
  const apple = fakeApple({ 'loc-es-MX': { [PHONE]: [['1.png', md5(disk['store/es-MX/1.png'])], ['2.png', 'old-bytes']] } });
  const languages = [{ locale: 'es-MX', groups: [{ displayType: PHONE, files: ['store/es-MX/1.png'] }] }];
  const result = await syncLocalizedScreenshots({ languages, localizations, primary: 'en-US', prune: false, ...apple, readFile: files.readFile, log: quiet });
  assert.deepEqual(result.done, ['es-MX']);
  assert.deepEqual(apple.uploaded, [], 'nothing uploaded when the checksum matches');
  const changed = fakeApple({ 'loc-es-MX': { [PHONE]: [['1.png', 'other-bytes']] } });
  const refused = await syncLocalizedScreenshots({ languages, localizations, primary: 'en-US', prune: false, ...changed, readFile: files.readFile, log: quiet });
  assert.equal(refused.failed.length, 1);
  assert.match(refused.failed[0].error, /^1\.png differs from the uploaded copy/);
});

test('a stale file in a listed set is left with pruning off and removed with it on, as for the primary', async () => {
  const groups = [{ displayType: PHONE, files: ['store/es-MX/1.png'] }];
  const initial = { 'loc-es-MX': { [PHONE]: [['old.png', 'x'], ['1.png', md5(disk['store/es-MX/1.png'])]], [IPAD]: [['ipad.png', 'y']] } };
  const kept = fakeApple(initial);
  const lines = [];
  await syncScreenshotGroups({ localizationId: 'loc-es-MX', groups, prune: false, label: 'es-MX', ...kept, readFile: files.readFile, log: line => lines.push(line) });
  assert.deepEqual(await kept.names('loc-es-MX'), { [PHONE]: ['1.png', 'old.png'], [IPAD]: ['ipad.png'] }, 'listed first, the stale file after it');
  assert.ok(lines.includes('es-MX left APP_IPHONE_67 old.png in place (not in the store data; ios.pruneScreenshots removes it)'));
  assert.ok(lines.includes('es-MX left set APP_IPAD_PRO_3GEN_129 in place (not in the store data; ios.pruneScreenshots removes it)'));
  const pruned = fakeApple(initial);
  await syncScreenshotGroups({ localizationId: 'loc-es-MX', groups, prune: true, label: 'es-MX', ...pruned, readFile: files.readFile, log: quiet });
  assert.deepEqual(await pruned.names('loc-es-MX'), { [PHONE]: ['1.png'] });
});

test('an unfinished upload is replaced, as for the primary', async () => {
  const apple = fakeApple({ 'loc-es-MX': { [PHONE]: [['1.png', null, 'AWAITING_UPLOAD']] } });
  await syncScreenshotGroups({ localizationId: 'loc-es-MX', groups: [{ displayType: PHONE, files: ['store/es-MX/1.png'] }], prune: false, label: 'es-MX', ...apple, readFile: files.readFile, log: quiet });
  assert.deepEqual(apple.uploaded, ['1.png']);
  assert.equal(apple.writes.filter(write => write.startsWith('DELETE /v1/appScreenshots/')).length, 1);
});

test('an unlisted language with its own live sets is reported, never deleted, even with pruning on', async () => {
  const apple = fakeApple({ 'loc-de-DE': { [PHONE]: [['de.png', 'z']] } });
  const result = await syncLocalizedScreenshots({ languages: [], localizations, primary: 'en-US', prune: true, ...apple, readFile: files.readFile, log: quiet });
  assert.deepEqual(result.unlisted, [{ locale: 'de-DE', displayTypes: [PHONE] }]);
  assert.deepEqual(apple.writes, []);
  assert.deepEqual(await apple.names('loc-de-DE'), { [PHONE]: ['de.png'] });
});

test('one language failing does not stop the others', async () => {
  const apple = fakeApple({}, { failOn: (path, method, body) => method === 'POST' && path === '/v1/appScreenshotSets' && body.data.relationships.appStoreVersionLocalization.data.id === 'loc-es-MX' });
  const languages = [
    { locale: 'es-MX', groups: [{ displayType: PHONE, files: ['store/es-MX/1.png'] }] },
    { locale: 'it', groups: [{ displayType: PHONE, files: ['store/es-MX/1.png'] }] },
    { locale: 'fr-FR', groups: [{ displayType: PHONE, files: ['store/fr-FR/1.png'] }] },
  ];
  const result = await syncLocalizedScreenshots({ languages, localizations, primary: 'en-US', prune: false, ...apple, readFile: files.readFile, log: quiet });
  assert.deepEqual(result.done, ['fr-FR']);
  assert.deepEqual(result.failed.map(entry => entry.locale), ['es-MX', 'it']);
  assert.match(result.failed[0].error, /Apple refused POST/);
  assert.match(result.failed[1].error, /no it version localization; run `listing` first/);
  assert.deepEqual(await apple.names('loc-fr-FR'), { [PHONE]: ['1.png'] });
});

test('status compares each listed language with what is live', async () => {
  const apple = fakeApple({
    'loc-es-MX': { [PHONE]: [['1.png', md5(disk['store/es-MX/1.png'])], ['2.png', md5(disk['store/es-MX/2.png'])], ['extra.png', 'q']] },
    'loc-fr-FR': { [PHONE]: [['1.png', 'older']] },
    'loc-de-DE': { [PHONE]: [['de.png', 'z']] },
  });
  const live = await readLiveScreenshots(localizations.filter(item => item.attributes.locale !== 'ja'), 'en-US', apple.readAll);
  const checksum = file => disk[file] ? md5(disk[file]) : null;
  const languages = [
    { locale: 'es-MX', groups: [{ displayType: PHONE, files: ['store/es-MX/1.png', 'store/es-MX/2.png'] }] },
    { locale: 'fr-FR', groups: [{ displayType: PHONE, files: ['store/fr-FR/1.png'] }] },
    { locale: 'ja', groups: [{ displayType: PHONE, files: ['store/ja/1.png'] }] },
  ];
  const changes = localizedScreenshotChanges(languages, live, checksum);
  assert.deepEqual(changes, { missing: ['ja'], changed: [{ locale: 'fr-FR', displayTypes: [PHONE] }], unlisted: ['de-DE'] });
  assert.equal(localizedScreenshotSummary(changes), 'screenshot languages not live: ja; fr-FR screenshots differ in APP_IPHONE_67');
  const reordered = localizedScreenshotChanges([{ locale: 'es-MX', groups: [{ displayType: PHONE, files: ['store/es-MX/2.png', 'store/es-MX/1.png'] }] }], live, checksum);
  assert.deepEqual(reordered.changed, [{ locale: 'es-MX', displayTypes: [PHONE] }], 'order counts');
  assert.equal(localizedScreenshotSummary({ missing: [], changed: [], unlisted: ['de-DE'] }), '', 'an unlisted language ships nothing');
});

test('the sweep reads files from the release commit and marks a listing candidate when a language differs', async () => {
  const apple = fakeApple({ 'loc-es-MX': { [PHONE]: [['1.png', 'older']] } });
  const api = { all: apple.readAll };
  const data = store({ 'es-MX': [{ displayType: PHONE, files: ['store/es-MX/1.png'] }] });
  const reads = [];
  const readBytes = (dir, commit, file) => { reads.push(commit + ':' + file); return disk[file] || null; };
  const result = await pendingScreenshots(api, data, localizations, 'en-US', { dir: '/repo' }, 'abc123def456', readBytes);
  assert.deepEqual(result, { problems: [], missing: [], changed: [{ locale: 'es-MX', displayTypes: [PHONE] }], unlisted: [] });
  assert.ok(reads.every(read => read.startsWith('abc123def456:')));
  assert.equal(listingReason({ fields: [], localizations: { changed: [], missing: [], unlisted: [] }, screenshots: result }), 'es-MX screenshots differ in APP_IPHONE_67');
  assert.equal(await pendingScreenshots(api, { listing, screenshots: primaryGroups }, localizations, 'en-US', { dir: '/repo' }, 'abc', readBytes), undefined);
  const bad = await pendingScreenshots(api, store({ 'es-MX': [{ displayType: PHONE, files: ['store/gone.png'] }] }), localizations, 'en-US', { dir: '/repo' }, 'abc', readBytes);
  assert.match(bad.problems[0], /store\/gone\.png does not exist/);
  assert.equal(listingReason({ fields: [], screenshots: bad }), '', 'bad store data is reported, not shipped');
});

test('asc.mjs still exports the shared screenshot helpers', () => {
  assert.equal(typeof asc.screenshotAction, 'function');
  assert.equal(typeof asc.staleScreenshots, 'function');
  assert.equal(typeof asc.staleScreenshotSets, 'function');
});
