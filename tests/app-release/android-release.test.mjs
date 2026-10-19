// android-release.test.mjs
// The shared Google Play release script: no EAS Build, the upload key and Play key from the configured vault item, no
// password on a command line, the bundle verified before it leaves the Mac, uploads to testing tracks only, commits that
// never cancel a review, and Newsworthy's promote and hold-for-review paths.

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  COMMIT_DEFAULT, COMMIT_HELD, TOOLCHAIN, TRACKS, assertion, blockedPermissionsIn, certificateDigest, commitQuery, jwtClaims, keptProvenance,
  missingResources, nextVersionCode, parseArgs, parseTrack, parseVersionCode, playTrackName, releaseEnv, sameCheckout, signingEnv, toolchainEnv,
  trackRelease, uploadProblem
} from '../../skills/app-release/scripts/android-release.mjs';

const SCRIPT = readFileSync(new URL('../../skills/app-release/scripts/android-release.mjs', import.meta.url), 'utf8');

test('the version code is a positive integer', () => {
  assert.equal(parseVersionCode('13'), 13);
  for (const bad of ['0', '-1', '1.5', 'x', '', undefined]) assert.throws(() => parseVersionCode(bad), /positive integer/);
});

test('arguments are checked, and a dirty tree never reaches Play', () => {
  assert.deepEqual(parseArgs(['upload', '--version-code', '3']), { command: 'upload', versionCode: 3, track: 'internal', notes: null, allowDirty: false, hold: false });
  assert.equal(parseArgs(['release', '--track', 'alpha', '--notes', 'Hi']).track, 'alpha');
  assert.equal(parseArgs(['bundle', '--version-code', '1', '--allow-dirty']).allowDirty, true);
  assert.equal(parseArgs(['upload', '--version-code', '3', '--hold']).hold, true);
  assert.throws(() => parseArgs(['ship']), /Usage/);
  assert.throws(() => parseArgs(['bundle', '--versioncode', '1']), /Unknown option/);
  assert.throws(() => parseArgs(['bundle', '--track', 'internal']), /--track applies to upload, promote and release/);
  assert.throws(() => parseArgs(['bundle', '--hold']), /--hold applies/);
  assert.throws(() => parseArgs(['apk']), /apk needs --version-code/);
  assert.throws(() => parseArgs(['release', '--track', 'internal', '--allow-dirty']), /clean checkout/);
  assert.throws(() => parseArgs(['bundle', '--notes']), /needs a value/);
});

test('promote needs a version code Play holds and a testing track', () => {
  assert.deepEqual(parseArgs(['promote', '--version-code', '17', '--track', 'alpha']).track, 'alpha');
  assert.throws(() => parseArgs(['promote', '--track', 'alpha']), /promote needs --version-code/);
  assert.throws(() => parseArgs(['promote', '--version-code', '17']), /promote needs --track/);
  assert.throws(() => parseArgs(['promote', '--version-code', '17', '--track', 'production']), /Play Console/);
  assert.match(SCRIPT, /Play holds no bundle with versionCode/, 'promote refuses a code Play does not hold');
});

test('commits never cancel a review, and --hold keeps changes out of review', () => {
  assert.equal(commitQuery(false), COMMIT_DEFAULT);
  assert.equal(COMMIT_DEFAULT, 'changesInReviewBehavior=ERROR_IF_IN_REVIEW');
  assert.equal(commitQuery(true), COMMIT_HELD);
  assert.equal(COMMIT_HELD, 'changesNotSentForReview=true');
  assert.doesNotMatch(SCRIPT, /':validate'/, 'commit validates; a separate validate refuses changesNotSentForReview');
});

test('a re-verify keeps the build-time commit and dirty flag, so a dirty build never becomes uploadable', () => {
  const built = { commit: 'a'.repeat(40), dirty: true, sha256: 'd1' };
  assert.deepEqual(keptProvenance(built, 'd1'), { commit: built.commit, dirty: true });
  assert.throws(() => keptProvenance(null, 'd1'), /No summary/);
  assert.throws(() => keptProvenance(built, 'd2'), /changed since it was built/);
  assert.doesNotMatch(SCRIPT, /dirty: capture/, 'verify never reads the dirty flag from the current checkout');
});

test('the release JavaScript takes no stray EXPO_PUBLIC_* value or .env file', () => {
  const env = releaseEnv({ PATH: '/bin', EXPO_PUBLIC_WS_URL: 'ws://localhost:8787', EXPO_PUBLIC_BUILD_SHA: 'old' }, { EXPO_PUBLIC_BUILD_SHA: 'abc1234', CI: '1' });
  assert.deepEqual(env, { PATH: '/bin', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_BUILD_SHA: 'abc1234', CI: '1' });
  assert.match(SCRIPT, /const buildEnv = releaseEnv\(/);
});

test('a checkout that moves during the build is never recorded under the earlier commit', () => {
  const before = { commit: 'a'.repeat(40), status: '' };
  assert.equal(sameCheckout(before, { commit: 'a'.repeat(40), status: '' }), true);
  assert.equal(sameCheckout(before, { commit: 'b'.repeat(40), status: '' }), false);
  assert.equal(sameCheckout(before, { commit: 'a'.repeat(40), status: ' M App.jsx' }), false);
  assert.match(SCRIPT, /!sameCheckout\(before, after\)/);
});

test('upload takes only an unchanged bundle built from a clean commit', () => {
  const clean = { commit: 'b'.repeat(40), dirty: false, sha256: 'd1' };
  assert.equal(uploadProblem(clean, 'd1'), null);
  assert.match(uploadProblem(Object.assign({}, clean, { dirty: true }), 'd1'), /uncommitted/);
  assert.match(uploadProblem(Object.assign({}, clean, { dirty: undefined }), 'd1'), /uncommitted/);
  assert.match(uploadProblem(Object.assign({}, clean, { commit: 'HEAD' }), 'd1'), /no commit/);
  assert.match(uploadProblem(clean, 'd2'), /changed/);
});

test('Gradle signs with the upload key through injected properties passed as environment', () => {
  const env = signingEnv({ store: '/tmp/k.jks', password: 'secret' }, 'upload');
  const prefix = 'ORG_GRADLE_PROJECT_android.injected.signing.';
  assert.equal(env[prefix + 'store.file'], '/tmp/k.jks');
  assert.equal(env[prefix + 'store.password'], 'secret');
  assert.equal(env[prefix + 'key.alias'], 'upload');
  assert.equal(env[prefix + 'key.password'], 'secret');
  assert.doesNotMatch(SCRIPT, /-Pandroid\.injected/, 'no password on a command line');
  assert.match(SCRIPT, /--ks-pass=file:/);
  assert.match(SCRIPT, /mode: 0o600/);
  assert.match(SCRIPT, /'-storepass:env'/);
});

test('credentials come from the configured vault item and nothing builds in EAS', () => {
  for (const field of ["'upload.jks'", "'keystore password'", "'play-service-account.json'", "'google-services.json'"]) assert.ok(SCRIPT.includes(field), field + ' is read');
  assert.match(SCRIPT, /opRead\(ANDROID\.vault/);
  assert.doesNotMatch(SCRIPT, /'eas'/);
  for (const check of ['versionCode', 'targetSdkVersion', 'index.android.bundle', '-printcert']) assert.ok(SCRIPT.includes(check), check + ' is verified');
  assert.doesNotMatch(SCRIPT, /^import .* from '(?!node:|\.\/lib\/)/m, 'no dependencies');
});

test('blocked permissions and required resources are checked in the bundle', () => {
  const manifest = '<manifest><uses-permission android:name="android.permission.INTERNET"/><uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/></manifest>';
  assert.deepEqual(blockedPermissionsIn(manifest, ['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE']), ['android.permission.SYSTEM_ALERT_WINDOW']);
  assert.deepEqual(blockedPermissionsIn(manifest, []), []);
  const dump = 'Package [com.example]\n  0x7f0e0001 - string/app_name\n  0x7f0e0002 - string/google_app_id\n';
  assert.deepEqual(missingResources(dump, ['string/google_app_id']), []);
  assert.deepEqual(missingResources(dump, ['string/gcm_defaultSenderId']), ['string/gcm_defaultSenderId']);
});

test('the toolchain and its caches default to the SSD without overriding the caller', () => {
  for (const name of Object.keys(TOOLCHAIN)) if (name !== 'JAVA_HOME') assert.match(TOOLCHAIN[name], /^\/Volumes\/ssd\//);
  const env = toolchainEnv({ PATH: '/usr/bin', ANDROID_HOME: '/custom/sdk' });
  assert.equal(env.ANDROID_HOME, '/custom/sdk');
  assert.equal(env.GRADLE_USER_HOME, TOOLCHAIN.GRADLE_USER_HOME);
  assert.ok(env.PATH.startsWith(TOOLCHAIN.JAVA_HOME + '/bin:'));
  assert.ok(env.PATH.indexOf('/usr/bin') < env.PATH.indexOf('/opt/homebrew/bin'));
});

test('keytool certificate digests are read whole', () => {
  const digest = Array.from({ length: 32 }, (_, i) => i.toString(16).toUpperCase().padStart(2, '0')).join(':');
  assert.equal(certificateDigest('Owner: CN=x\n\t SHA1: AA\n\t SHA256: ' + digest + '\nSignature'), digest);
  assert.equal(certificateDigest('no certificate'), null);
});

test('the next version code is one above the highest Play holds, on a track or not', () => {
  const tracks = [
    { track: 'internal', releases: [{ versionCodes: ['14'], status: 'completed' }] },
    { track: 'production', releases: [] },
    { track: 'alpha' },
    { track: 'beta', releases: [{ versionCodes: ['9', '11'] }] }
  ];
  assert.equal(nextVersionCode(tracks, []), 15);
  assert.equal(nextVersionCode(tracks, [{ versionCode: 16 }]), 17);
  assert.equal(nextVersionCode(undefined, undefined), 1);
  assert.equal(nextVersionCode([{ releases: [{ versionCodes: ['x', '3'] }] }], [{}]), 4);
});

test('a release goes to a testing track as one completed release with en-US notes', () => {
  assert.deepEqual(trackRelease('internal', 2, 'App 1.0.0 (2).'), {
    track: 'internal', releases: [{ versionCodes: ['2'], status: 'completed', releaseNotes: [{ language: 'en-US', text: 'App 1.0.0 (2).' }] }]
  });
  assert.deepEqual(TRACKS, ['internal', 'alpha', 'beta']);
  assert.equal(parseTrack('internal'), 'internal');
  assert.throws(() => parseTrack('production'), /Play Console/);
  for (const step of ['/edits', 'bundles?uploadType=media', ':commit?']) assert.ok(SCRIPT.includes(step), step + ' is called');
  assert.match(SCRIPT, /uploaded\.sha256 !== digest/);
});

test('internal testing goes to whichever internal track Play lists, and an unlisted track is refused', () => {
  assert.equal(playTrackName('internal', [{ track: 'production' }, { track: 'qa' }]), 'qa');
  assert.equal(playTrackName('internal', [{ track: 'internal' }]), 'internal');
  assert.equal(playTrackName('alpha', [{ track: 'alpha' }, { track: 'qa' }]), 'alpha');
  assert.throws(() => playTrackName('alpha', [{ track: 'qa' }]), /no alpha track/);
  assert.throws(() => playTrackName('internal', undefined), /lists none/);
});

test('the service account signs its own token request with RS256', () => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { client_email: 'play@example.iam.gserviceaccount.com', private_key_id: 'abc123', private_key: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    token_uri: 'https://oauth2.googleapis.com/token' };
  assert.deepEqual(jwtClaims(account, 1000), { iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: account.token_uri, iat: 1000, exp: 4600 });
  const parts = assertion(account, 1000).split('.');
  const decode = part => JSON.parse(Buffer.from(part, 'base64url'));
  assert.deepEqual(decode(parts[0]), { alg: 'RS256', typ: 'JWT', kid: 'abc123' });
  assert.ok(verify('sha256', Buffer.from(parts[0] + '.' + parts[1]), pair.publicKey, Buffer.from(parts[2], 'base64url')));
});
