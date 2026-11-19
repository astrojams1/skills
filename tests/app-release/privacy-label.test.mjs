// The App Privacy gate: privacy manifests, the store data's expected answers and the label the App Store publishes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { normalizeConfig } from '../../skills/app-release/scripts/lib/config.mjs';
import { loadCatalog } from '../../skills/app-release/scripts/lib/standards.mjs';
import { collectedFrom, coverageProblems, expectedLabel, labelGate, labelRefusal, manifestCollection, manifestDrift, parsePlist, parseStorePage, storeShape, writeConfirmation }
  from '../../skills/app-release/scripts/lib/privacy-label.mjs';

const scan = loadCatalog().scan;
const firstLaunch = { type: 'ProductInteraction', linked: false, tracking: false, purposes: ['Analytics'] };
const plist = entries => '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>'
  + '<key>NSPrivacyTracking</key><false/><key>NSPrivacyCollectedDataTypes</key><array>'
  + entries.map(([type, linked, purposes]) => '<dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataType' + type + '</string>'
    + '<key>NSPrivacyCollectedDataTypeLinked</key>' + (linked ? '<true/>' : '<false/>') + '<key>NSPrivacyCollectedDataTypeTracking</key><false/>'
    + '<key>NSPrivacyCollectedDataTypePurposes</key><array>' + purposes.map(p => '<string>NSPrivacyCollectedDataTypePurpose' + p + '</string>').join('') + '</array></dict>').join('')
  + '</array><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>\n';

// page builds a product page the way apps.apple.com renders it: the App Privacy "See Details" page data in JSON.
function page(types) {
  const items = types.map(([identifier, purposes]) => ({ $kind: 'PrivacyType', identifier, categories: [],
    purposes: purposes.map(([id, title, categories]) => ({ identifier: id, title, categories: categories.map(([cat, dataTypes]) => ({ identifier: cat, dataTypes })) })) }));
  const data = { data: [{ data: { shelfMapping: {
    privacyTypes: { items: items.map(item => ({ ...item, purposes: [] })) },
    privacyHeader: { seeAllAction: { pageData: { shelves: [{ contentType: 'privacyHeader', items: [{ $kind: 'PrivacyHeader' }] }, { contentType: 'privacyType', items }] } } }
  } } }] };
  return '<html><body><script type="application/json" id="serialized-server-data">' + JSON.stringify(data) + '</script></body></html>';
}
const notCollected = page([['DATA_NOT_COLLECTED', []]]);
const withFirstLaunch = page([['DATA_NOT_LINKED_TO_YOU', [['ANALYTICS', 'Analytics', [['USAGE_DATA', ['Product Interaction']]]]]]]);
const fetchOf = html => async () => ({ ok: true, status: 200, text: async () => html });

function repo(t, { files = {}, store = {}, ascAppId = '123' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'privacy-label-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = { app: 'Example', slug: 'example', storeData: 'store.json', ledger: { gates: 'l.json', view: 'l.md' }, ios: { ascAppId } };
  writeFileSync(join(root, 'app-release.config.json'), JSON.stringify(config));
  writeFileSync(join(root, 'store.json'), JSON.stringify(store));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: root, stdio: 'ignore' });
  git('init', '-q'); git('config', 'user.email', 'qa@example.test'); git('config', 'user.name', 'QA'); git('add', '.'); git('commit', '-qm', 'fixture');
  return { root, config: normalizeConfig(JSON.parse(readFileSync(join(root, 'app-release.config.json'), 'utf8')), join(root, 'app-release.config.json')), store };
}
const answers = collected => ({ appPrivacy: { collected } });
const productInteraction = { type: 'Product Interaction', purposes: ['Analytics'], linked: false, tracking: false };

test('a privacy manifest reads as data types with purposes, linked and tracking', () => {
  const parsed = parsePlist(plist([['ProductInteraction', false, ['Analytics']], ['UserID', true, ['AppFunctionality', 'Analytics']]]));
  const { entries, problems } = collectedFrom(parsed, 'App/PrivacyInfo.xcprivacy');
  assert.deepEqual(problems, []);
  assert.deepEqual(entries.map(({ source, ...entry }) => entry), [firstLaunch, { type: 'UserID', linked: true, tracking: false, purposes: ['AppFunctionality', 'Analytics'] }]);
  assert.throws(() => parsePlist(plist([['ProductInteraction', false, ['Analytics']]]).replace('</array></dict></array>', '</array></dict></array></array>')), /unexpected|expected/);
  assert.match(collectedFrom({ NSPrivacyCollectedDataTypes: [{ NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeTelepathy', NSPrivacyCollectedDataTypePurposes: [] }] }, 'x').problems[0], /unknown data type/);
});

test('the published label is read from the product page, and a page without it is an error, not a pass', () => {
  assert.deepEqual(parseStorePage(notCollected), { notCollected: true, entries: [], kinds: ['DATA_NOT_COLLECTED'], unknown: [] });
  assert.deepEqual(parseStorePage(withFirstLaunch).entries, [firstLaunch]);
  const linked = parseStorePage(page([['DATA_LINKED_TO_YOU', [['APP_FUNCTIONALITY', 'App Functionality', [['IDENTIFIERS', ['User ID']], ['DIAGNOSTICS', ['Performance Data']]]],
    ['ANALYTICS', 'Analytics', [['IDENTIFIERS', ['User ID']]]]]]]));
  assert.deepEqual(linked.entries, [{ type: 'PerformanceData', linked: true, tracking: false, purposes: ['AppFunctionality'] }, { type: 'UserID', linked: true, tracking: false, purposes: ['Analytics', 'AppFunctionality'] }]);
  assert.throws(() => parseStorePage('<html>no data</html>'), /serialized-server-data/);
  assert.throws(() => parseStorePage(page([])), /no App Privacy section/);
});

test('the label must disclose what is collected; saying more is allowed, saying less is not', () => {
  assert.match(coverageProblems([firstLaunch], parseStorePage(notCollected))[0], /^add Usage Data > Product Interaction for Analytics \(not linked, not tracking\)$/);
  assert.deepEqual(coverageProblems([firstLaunch], parseStorePage(withFirstLaunch)), []);
  // Füd: Product Interaction already linked, for Analytics and App Functionality, covers the anonymous count.
  assert.deepEqual(coverageProblems([firstLaunch], { entries: [{ type: 'ProductInteraction', linked: true, tracking: false, purposes: ['Analytics', 'AppFunctionality'] }] }), []);
  const wrongPurpose = coverageProblems([firstLaunch], { entries: [{ type: 'ProductInteraction', linked: false, tracking: false, purposes: ['AppFunctionality'] }] });
  assert.match(wrongPurpose[0], /add the purpose Analytics/);
  const notLinked = coverageProblems([{ ...firstLaunch, linked: true }], parseStorePage(withFirstLaunch));
  assert.match(notLinked[0], /answer that it is linked to the user/);
});

test('the manifest and the expected answers must agree, unless the answer says why it is outside the app', () => {
  const manifest = [{ ...firstLaunch, source: 'App/PrivacyInfo.xcprivacy' }];
  assert.deepEqual(manifestDrift(manifest, expectedLabel(answers([productInteraction])).entries), []);
  assert.match(manifestDrift(manifest, [])[0], /declares Usage Data > Product Interaction .* which appPrivacy.collected does not list/);
  assert.match(manifestDrift(manifest, expectedLabel(answers([{ ...productInteraction, linked: true }])).entries)[0], /manifest says .*not linked.* appPrivacy.collected says .*linked/);
  const logs = { type: 'Other Diagnostic Data', purposes: ['App Functionality'], linked: false, tracking: false };
  assert.match(manifestDrift(manifest, expectedLabel(answers([productInteraction, logs])).entries)[0], /no privacy manifest declares/);
  assert.deepEqual(manifestDrift(manifest, expectedLabel(answers([productInteraction, { ...logs, notInManifest: 'Provider logs around the optional server request' }])).entries), []);
  assert.match(expectedLabel(answers([{ type: 'Telepathy', purposes: ['Analytics'], linked: false, tracking: false }])).problems[0], /unknown data type/);
  assert.match(expectedLabel({ appPrivacy: {} }).problems[0], /must be a list/);
  assert.deepEqual(storeShape([firstLaunch]), [productInteraction]);
});

test('Expo app configs are read as Expo reads them, functions and computed lists included', t => {
  const fixture = repo(t, { files: {
    'app.json': JSON.stringify({ expo: { name: 'Example' } }),
    'app.config.js': "module.exports = ({ config }) => ({ ...config, ios: { privacyManifests: { NSPrivacyCollectedDataTypes: ['DeviceID'].map(type => ({ NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataType' + type,"
      + " NSPrivacyCollectedDataTypeLinked: true, NSPrivacyCollectedDataTypeTracking: false, NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] })) } } });\n",
    'targets/widget/PrivacyInfo.xcprivacy': plist([['ProductInteraction', false, ['Analytics']]]),
    'node_modules/some-sdk/PrivacyInfo.xcprivacy': plist([['CrashData', false, ['Analytics']]]),
    'skills/skills/app-release/assets/PrivacyInfo.xcprivacy': plist([['Name', false, ['Analytics']]])
  } });
  const read = manifestCollection(fixture.config, scan);
  assert.deepEqual(read.problems, []);
  assert.deepEqual(read.sources.sort(), ['app.config.js', 'targets/widget/PrivacyInfo.xcprivacy']);
  assert.deepEqual(read.entries.map(entry => entry.type), ['DeviceID', 'ProductInteraction']);
  const esm = repo(t, { files: { 'app.config.js': "export default { ios: { privacyManifests: { NSPrivacyCollectedDataTypes: [] } } };\n" } });
  assert.deepEqual(manifestCollection(esm.config, scan), { sources: ['app.config.js'], entries: [], problems: [] });
  const broken = repo(t, { files: { 'app.config.js': "module.exports = require('./missing.json');\n" } });
  assert.match(manifestCollection(broken.config, scan).problems[0], /app.config.js could not be read/);
});

test('the gate refuses a build whose collection is not on the published label, and says what to change', async t => {
  const confirmations = mkdtempSync(join(tmpdir(), 'privacy-confirmations-'));
  t.after(() => rmSync(confirmations, { recursive: true, force: true }));
  const fixture = repo(t, { files: { 'App/PrivacyInfo.xcprivacy': plist([['ProductInteraction', false, ['Analytics']]]) }, store: answers([productInteraction]) });
  const options = html => ({ fetchImpl: fetchOf(html), confirmations });
  assert.equal(await labelRefusal(fixture.config, fixture.store, scan, options(withFirstLaunch)), null);
  const refusal = await labelRefusal(fixture.config, fixture.store, scan, options(notCollected));
  assert.match(refusal, /shows Data Not Collected\): add Usage Data > Product Interaction for Analytics \(not linked, not tracking\)\. Publish the change there/);
  assert.match(refusal, /Nothing was submitted\.$/);
  // No answers written: the manifest alone still blocks, and says how to write them.
  assert.match(await labelRefusal(fixture.config, {}, scan, options(withFirstLaunch)), /no appPrivacy.*privacy-label.mjs init/);
  // An unreadable page never passes on its own.
  const down = { fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' }), confirmations };
  assert.match(await labelRefusal(fixture.config, fixture.store, scan, down), /could not be read .*503/);
  // A fresh App Store Connect confirmation of the expected answers covers the public page's lag; an old one does not.
  writeConfirmation('123', { confirmedAt: new Date().toISOString(), evidence: 'App Privacy page showed Published', entries: [firstLaunch] }, confirmations);
  const lagging = await labelGate(fixture.config, fixture.store, scan, options(notCollected));
  assert.deepEqual(lagging.problems, []);
  assert.match(lagging.notes.join(), /does not show it yet/);
  assert.equal(await labelRefusal(fixture.config, fixture.store, scan, down), null);
  const later = Date.now() + 4 * 86400000;
  assert.match(await labelRefusal(fixture.config, fixture.store, scan, { ...options(notCollected), now: later }), /add Usage Data > Product Interaction/);
  // Only a recorded opt-out turns the gate off.
  assert.equal(await labelRefusal({ ...fixture.config, standards: { optOut: { 'privacy-label': 'The owner decided this app ships no label.' } } }, {}, scan, down), null);
  assert.match(await labelRefusal({ ...fixture.config, standards: { optOut: { 'privacy-label': 'later' } } }, {}, scan, options(withFirstLaunch)), /no appPrivacy/);
  // A label that says more than expected passes with a note, so the run can tidy it.
  const extra = page([['DATA_NOT_LINKED_TO_YOU', [['ANALYTICS', 'Analytics', [['USAGE_DATA', ['Product Interaction']]]], ['APP_FUNCTIONALITY', 'App Functionality', [['DIAGNOSTICS', ['Crash Data']]]]]]]);
  const more = await labelGate(fixture.config, fixture.store, scan, options(extra));
  assert.deepEqual(more.problems, []);
  assert.match(more.notes.join(), /also lists Diagnostics > Crash Data/);
});

test('an app with no App Store id is checked offline only', async t => {
  const fixture = repo(t, { files: { 'App/PrivacyInfo.xcprivacy': plist([['ProductInteraction', false, ['Analytics']]]) }, store: answers([productInteraction]), ascAppId: '' });
  const result = await labelGate(fixture.config, fixture.store, scan, { fetchImpl: () => { throw new Error('no network expected'); } });
  assert.deepEqual(result.problems, []);
  assert.equal(result.published, null);
});
