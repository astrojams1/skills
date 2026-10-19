// ios-release.test.mjs
// The shared local iOS release: build numbers from App Store Connect, Apple-managed signing through the API key with the
// key passed by path and hidden when echoed, entitlement and app-group checks on every bundle, and uploads only of a
// clean, unchanged archive.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ios from '../../skills/app-release/scripts/ios-release.mjs';

const SCRIPT = readFileSync(new URL('../../skills/app-release/scripts/ios-release.mjs', import.meta.url), 'utf8');
const IOS = { workspace: 'App.xcworkspace', scheme: 'App', teamId: 'CWQ9AWJF8T' };

test('the next build number follows the highest finished build or in-flight upload', () => {
  assert.equal(ios.nextBuildNumber(['9', '8', '2'], ['9', '8']), 10);
  assert.equal(ios.nextBuildNumber(['8'], ['9']), 10, 'an upload Apple has not turned into a build yet still counts');
  assert.equal(ios.nextBuildNumber([], []), 1);
  assert.throws(() => ios.nextBuildNumber(['1.2'], []), /not a whole number/);
});

test('arguments are checked, and a dirty archive never reaches App Store Connect', () => {
  assert.deepEqual(ios.parseArgs(['archive']), { command: 'archive', build: null, allowDirty: false });
  assert.deepEqual(ios.parseArgs(['archive', '--allow-dirty', '--build-number', '12']), { command: 'archive', build: 12, allowDirty: true });
  assert.equal(ios.parseArgs(['upload', '12']).build, 12);
  assert.throws(() => ios.parseArgs(['ship']), /Usage/);
  assert.throws(() => ios.parseArgs(['upload']), /needs a build number/);
  assert.throws(() => ios.parseArgs(['release', '--allow-dirty']), /clean checkout/);
  assert.throws(() => ios.parseArgs(['archive', '--uplaod']), /Unknown option --uplaod/);
  assert.throws(() => ios.parseBuildNumber('1.5'), /positive whole number/);
});

test('upload takes only an unchanged archive built from a clean commit', () => {
  const clean = { commit: 'c'.repeat(40), dirty: false, sha256: 'd1' };
  assert.equal(ios.uploadProblem(clean, 'd1'), null);
  assert.match(ios.uploadProblem(null, 'd1'), /no summary/);
  assert.match(ios.uploadProblem(Object.assign({}, clean, { dirty: true }), 'd1'), /uncommitted/);
  assert.match(ios.uploadProblem(Object.assign({}, clean, { commit: 'HEAD' }), 'd1'), /no commit/);
  assert.match(ios.uploadProblem(clean, 'd2'), /changed/);
});

test('archive and export use Apple-managed signing through the API key, and altool takes the key by path', () => {
  const key = { path: '/tmp/x/AuthKey_K.p8', keyId: 'K', issuerId: 'I' };
  const archive = ios.archiveArgs(IOS, '/out/a.xcarchive', '/out/DerivedData', key);
  for (const arg of ['-allowProvisioningUpdates', '-authenticationKeyPath', '-authenticationKeyID', '-authenticationKeyIssuerID', 'CODE_SIGN_STYLE=Automatic',
    'DEVELOPMENT_TEAM=CWQ9AWJF8T', 'generic/platform=iOS', 'App.xcworkspace']) assert.ok(archive.includes(arg), 'archive passes ' + arg);
  assert.equal(archive[archive.length - 1], 'archive');
  const exported = ios.exportArgs('/out/a.xcarchive', '/out/export', '/out/o.plist', key);
  assert.ok(exported.includes('-exportArchive') && exported.includes('-allowProvisioningUpdates'));
  const options = ios.exportOptionsPlist('CWQ9AWJF8T');
  assert.match(options, /<key>method<\/key><string>app-store-connect<\/string>/);
  assert.match(options, /<key>signingStyle<\/key><string>automatic<\/string>/);
  assert.match(options, /<key>manageAppVersionAndBuildNumber<\/key><false\/>/);
  const upload = ios.altoolArgs('--upload-app', '/out/export/App.ipa', key);
  assert.deepEqual(upload.slice(0, 3), ['altool', '--upload-app', '-f']);
  assert.equal(upload[upload.indexOf('--p8-file-path') + 1], key.path);
  assert.ok(!upload.includes('--auth-string'));
  const echoed = ios.redactArgs(archive.concat(upload)).join(' ');
  assert.doesNotMatch(echoed, /AuthKey_K|\bK\b|\bI\b/);
  assert.match(echoed, /-authenticationKeyID <hidden>.*--api-issuer <hidden>/);
});

test('entitlements are read as booleans, strings or arrays', () => {
  const xml = '<plist><dict><key>aps-environment</key><string>production</string><key>com.apple.developer.game-center</key><true/>' +
    '<key>com.apple.security.application-groups</key><array><string>group.a</string><string>group.b</string></array></dict></plist>';
  assert.equal(ios.entitlementValue(xml, 'aps-environment'), 'production');
  assert.equal(ios.entitlementValue(xml, 'com.apple.developer.game-center'), true);
  assert.equal(ios.entitlementValue(xml, 'com.apple.security.application-groups'), 'group.a,group.b');
  assert.equal(ios.entitlementValue(xml, 'get-task-allow'), null);
});

test('the store binary keeps its configured entitlements and app group and is never development-signed', () => {
  const xml = (extra, debug) => '<plist><dict>' + extra + '<key>get-task-allow</key>' + (debug ? '<true/>' : '<false/>') + '</dict></plist>';
  const gameCenter = { 'com.apple.developer.game-center': true };
  assert.deepEqual(ios.entitlementProblems(xml('<key>com.apple.developer.game-center</key><true/>', false), gameCenter), []);
  assert.deepEqual(ios.entitlementProblems(xml('', false), gameCenter), ['com.apple.developer.game-center is missing']);
  assert.deepEqual(ios.entitlementProblems(xml('<key>com.apple.developer.game-center</key><true/>', true), gameCenter), ['get-task-allow is true (development signing)']);
  const push = { 'aps-environment': 'production' };
  assert.deepEqual(ios.entitlementProblems(xml('<key>aps-environment</key><string>development</string>', false), push), ['aps-environment is "development", expected "production"']);
  const group = '<key>com.apple.security.application-groups</key><array><string>group.com.example.widgets</string></array>';
  assert.deepEqual(ios.entitlementProblems(xml(group, false), {}, 'group.com.example.widgets'), []);
  assert.deepEqual(ios.entitlementProblems(xml('', false), {}, 'group.com.example.widgets'), ['app group group.com.example.widgets is missing']);
});

test('upload polling reads the record for its own build number', () => {
  const upload = (version, state, errors) => ({ attributes: { cfBundleVersion: version, state: { state: state, errors: errors || [] } } });
  assert.equal(ios.uploadState([upload('9', 'COMPLETE')], 10), null);
  assert.deepEqual(ios.uploadState([upload('9', 'COMPLETE'), upload('10', 'PROCESSING')], 10), { state: 'PROCESSING', errors: [] });
  assert.deepEqual(ios.uploadState([upload('10', 'FAILED', [{ code: 'X' }])], '10'), { state: 'FAILED', errors: [{ code: 'X' }] });
});

test('the build checks every bundle and the scene manifest, and never runs EAS', () => {
  for (const check of ['CFBundleVersion', 'TeamIdentifier=', 'UIApplicationSceneManifest', 'PlugIns', 'summary.json']) assert.ok(SCRIPT.includes(check), check + ' is checked');
  assert.match(SCRIPT, /The checkout changed during the build/);
  assert.doesNotMatch(SCRIPT, /'eas'/);
  assert.match(ios.releaseEnv({ EXPO_PUBLIC_API: 'http://localhost', PATH: '/bin' }, { CI: '1' }).EXPO_NO_DOTENV, /1/);
  assert.equal(ios.releaseEnv({ EXPO_PUBLIC_API: 'http://localhost' }, {}).EXPO_PUBLIC_API, undefined);
});

// A status read that cannot reach Apple is retried, since the upload itself already succeeded (Space Worms #1969).
test('upload polling retries an unreachable status read and settles on Apple\'s answer', async () => {
  let clock = 0;
  const answers = [() => { throw new Error('fetch failed'); }, () => [], () => [{ attributes: { cfBundleVersion: '7', state: { state: 'COMPLETE' } } }]];
  const io = { read: async () => answers.shift()(), pause: async () => { clock += 30000; }, now: () => clock, deadline: 600000 };
  assert.equal(await ios.waitForUpload(7, io), 'COMPLETE');
  const failed = { read: async () => [{ attributes: { cfBundleVersion: '7', state: { state: 'FAILED', errors: [{ code: 'X' }] } } }], pause: async () => {}, now: () => 0, deadline: 1 };
  await assert.rejects(ios.waitForUpload(7, failed), /rejected build 7/);
  const stuck = { read: async () => { throw new Error('offline'); }, pause: async () => { clock += 30000; }, now: () => clock, deadline: clock + 60000 };
  await assert.rejects(ios.waitForUpload(7, stuck), /still processing after 30 minutes/);
});
