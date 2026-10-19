#!/usr/bin/env node
// android-release.mjs
// Builds, signs, verifies and uploads a Google Play bundle on the owner's Mac, with no EAS Build: expo prebuild, Gradle
// bundleRelease signed with the Play upload key from 1Password, checks on the .aab before anything leaves the Mac, one
// universal APK for an emulator or adb install, and testing-track releases through the Play Developer API. Settings come
// from the app's app-release.config.json (`android`, `buildRoot`, `slug`). Run from the app repository.

import { spawnSync } from 'node:child_process';
import { createHash, sign } from 'node:crypto';
import { chmodSync, closeSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, requireSection } from './lib/config.mjs';
import { opRead, privateDir } from './lib/vault.mjs';

const PLAY = 'https://androidpublisher.googleapis.com';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
// The service account may release to testing tracks only; production stays in Play Console. "alpha" is closed testing
// and "beta" open testing.
export const TRACKS = ['internal', 'alpha', 'beta'];
// The toolchain lives on the SSD because the Mac's internal drive is nearly full; any variable the caller sets wins.
export const TOOLCHAIN = {
  JAVA_HOME: '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',
  ANDROID_HOME: '/Volumes/ssd/toolchains/android-sdk',
  GRADLE_USER_HOME: '/Volumes/ssd/toolchains/gradle',
  ANDROID_USER_HOME: '/Volumes/ssd/toolchains/android-user'
};
// Commit query strings. By default a commit fails rather than cancel a review already in progress (Play's own default
// cancels it and resubmits everything). --hold keeps the changes out of review until the owner sends them from
// Publishing overview; Play requires that while an earlier submission stands rejected (Newsworthy, 19 October 2026).
export const COMMIT_DEFAULT = 'changesInReviewBehavior=ERROR_IF_IN_REVIEW';
export const COMMIT_HELD = 'changesNotSentForReview=true';
const COMMANDS = ['next-version-code', 'bundle', 'verify', 'apk', 'upload', 'promote', 'release', 'tracks'];
const USAGE = 'Usage: node skills/skills/app-release/scripts/android-release.mjs <command> [--version-code N] [--track T] [--notes TEXT] [--hold] [--allow-dirty]\n' +
  '  next-version-code  print Play\'s highest version code plus one\n' +
  '  tracks             print every track\'s releases\n' +
  '  bundle             prebuild, build and sign a release .aab, and verify it\n' +
  '  verify             check bundle N again without rebuilding, keeping its build-time commit\n' +
  '  apk                turn that bundle into one signed universal APK for adb install\n' +
  '  upload             upload bundle N to --track (default internal) and commit\n' +
  '  promote            put a bundle Play already holds (--version-code) on --track, uploading nothing\n' +
  '  release            bundle and apk, then upload when --track is given\n' +
  '--version-code defaults to Play\'s highest plus one for bundle and release.\n' +
  '--track is one of ' + TRACKS.join(', ') + '; --notes are the en-US release notes.\n' +
  '--hold commits without sending changes for review (the owner sends them in Play Console).\n' +
  '--allow-dirty builds from uncommitted changes for a local test; such a bundle is never uploaded.';

let CONFIG = null;
let ANDROID = null;

// setup reads the app's configuration.
export function setup(start) {
  CONFIG = loadConfig(start);
  ANDROID = requireSection(CONFIG, 'android');
  return { config: CONFIG, android: ANDROID };
}

// nextVersionCode returns one more than the highest version code Play holds. Play refuses a code it has accepted
// before, and a bundle uploaded but never put on a track still holds its code, so the edit's bundles count as well as
// every track's releases. Play answers with no field when it holds nothing; a malformed code is skipped rather than
// turning the answer into NaN after a long build.
export function nextVersionCode(tracks, bundles) {
  const codes = [];
  for (const track of tracks || []) for (const release of track.releases || []) codes.push.apply(codes, release.versionCodes || []);
  for (const bundle of bundles || []) codes.push(bundle.versionCode);
  let latest = 0;
  for (const code of codes.map(Number).filter(Number.isInteger)) latest = Math.max(latest, code);
  return latest + 1;
}

// parseVersionCode accepts the whole numbers Play allows for versionCode.
export function parseVersionCode(value) {
  const code = Number(value);
  if (!/^\d+$/.test(String(value)) || code < 1 || code > 2100000000) throw new Error('--version-code takes a positive integer');
  return code;
}

// parseTrack accepts only testing tracks; production is released by hand in Play Console.
export function parseTrack(value) {
  if (!TRACKS.includes(value)) throw new Error('--track takes ' + TRACKS.join(', ') + '; production is released in Play Console');
  return value;
}

// parseArgs reads the command and its documented options, so a typo never silently skips a check.
export function parseArgs(args) {
  const command = args[0];
  if (!COMMANDS.includes(command)) throw new Error(USAGE);
  const flags = { command: command, versionCode: null, track: null, notes: null, allowDirty: false, hold: false };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--allow-dirty') {
      flags.allowDirty = true;
      continue;
    }
    if (arg === '--hold') {
      flags.hold = true;
      continue;
    }
    if (!['--version-code', '--track', '--notes'].includes(arg)) throw new Error('Unknown option ' + arg + '.\n' + USAGE);
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(arg + ' needs a value');
    index += 1;
    if (arg === '--version-code') flags.versionCode = parseVersionCode(value);
    else if (arg === '--track') flags.track = parseTrack(value);
    else flags.notes = value;
  }
  if (command === 'upload' && !flags.track) flags.track = 'internal';
  if (flags.track && !['upload', 'promote', 'release'].includes(command)) throw new Error('--track applies to upload, promote and release\n' + USAGE);
  if (flags.hold && !['upload', 'promote', 'release'].includes(command)) throw new Error('--hold applies to upload, promote and release\n' + USAGE);
  if (flags.versionCode === null && ['verify', 'apk', 'upload', 'promote'].includes(command)) throw new Error(command + ' needs --version-code\n' + USAGE);
  if (command === 'promote' && !flags.track) throw new Error('promote needs --track\n' + USAGE);
  // What reaches Play must match a commit; a dirty tree makes a phone test build only.
  if (flags.allowDirty && flags.track) throw new Error('An upload needs a clean checkout; --allow-dirty is for local test builds only.');
  return flags;
}

// commitQuery picks the edit commit behavior.
export function commitQuery(hold) {
  return hold ? COMMIT_HELD : COMMIT_DEFAULT;
}

// signingEnv makes the Android Gradle plugin sign with the upload key in place of the debug config Expo's template
// sets for release. Passed as environment, so no password appears in a process list.
export function signingEnv(key, alias) {
  const prefix = 'ORG_GRADLE_PROJECT_android.injected.signing.';
  const env = {};
  env[prefix + 'store.file'] = key.store;
  env[prefix + 'store.password'] = key.password;
  env[prefix + 'key.alias'] = alias;
  env[prefix + 'key.password'] = key.password;
  return env;
}

// playTrackName maps a --track value to the identifier this app's Play edit lists. Google documents internal testing
// as "qa" while tools and older apps use "internal", so internal takes whichever of the two Play reports; a name Play
// does not list is refused rather than guessed.
export function playTrackName(requested, tracks) {
  const listed = (tracks || []).map(track => track.track);
  const candidates = requested === 'internal' ? ['internal', 'qa'] : [requested];
  const found = candidates.find(name => listed.includes(name));
  if (!found) throw new Error('Play lists no ' + requested + ' track for this app (it lists ' + (listed.join(', ') || 'none') + ')');
  return found;
}

// trackRelease is a track holding one completed release with en-US notes, replacing what the track served; the
// track's countries and testers are separate settings and stay as they are.
export function trackRelease(track, code, notes) {
  return { track: track, releases: [{ versionCodes: [String(code)], status: 'completed', releaseNotes: [{ language: 'en-US', text: notes }] }] };
}

// jwtClaims and assertion build the RS256 JWT a service account trades for an hour's androidpublisher token.
export function jwtClaims(account, now) {
  return { iss: account.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: account.token_uri, iat: now, exp: now + 3600 };
}
export function assertion(account, now) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = encode({ alg: 'RS256', typ: 'JWT', kid: account.private_key_id }) + '.' + encode(jwtClaims(account, now));
  return unsigned + '.' + sign('sha256', Buffer.from(unsigned), account.private_key).toString('base64url');
}

// keptProvenance carries a bundle's build-time commit and dirty flag through a re-verify. The checkout may have moved
// since the build, so they are never read from git again; a bundle with no summary, or one that changed since its
// summary was written, has no provenance and is refused.
export function keptProvenance(previous, digest) {
  if (!previous) throw new Error('No summary.json for this bundle; rebuild it with bundle');
  if (previous.sha256 !== digest) throw new Error('The bundle changed since it was built; rebuild it with bundle');
  return { commit: previous.commit, dirty: previous.dirty };
}

// uploadProblem names why a bundle may not go to Play, or returns null: it must match its summary and come from a
// clean commit.
export function uploadProblem(summary, digest) {
  if (summary.dirty !== false) return 'it was built from uncommitted changes; rebuild from a clean commit to upload';
  if (!/^[0-9a-f]{40}$/.test(String(summary.commit))) return 'its summary names no commit; rebuild it with bundle';
  if (digest !== summary.sha256) return 'it has changed since it was verified; rebuild it with bundle';
  return null;
}

// releaseEnv is the environment prebuild and Gradle run in: Expo inlines EXPO_PUBLIC_* values into the release
// JavaScript and loads ignored .env files, either of which could point a clean-looking bundle at a staging or local
// server, so dotenv is off and the only EXPO_PUBLIC_* values are the ones the release sets.
export function releaseEnv(env, sets) {
  const result = {};
  for (const name of Object.keys(env)) if (!name.startsWith('EXPO_PUBLIC_')) result[name] = env[name];
  return Object.assign(result, { EXPO_NO_DOTENV: '1' }, sets);
}

// sameCheckout reports whether the checkout still matches what the build started from, so a commit or edit made during
// the long build is never recorded under the earlier commit.
export function sameCheckout(before, after) {
  return before.commit === after.commit && before.status === after.status;
}

// certificateDigest reads the SHA-256 fingerprint keytool prints as "SHA256: AB:CD:…", or null.
export function certificateDigest(text) {
  const match = String(text).match(/SHA256:\s*([0-9A-F:]{95})/);
  return match ? match[1] : null;
}

// blockedPermissionsIn lists the configured blocked permissions a merged manifest still requests. A tools:node="remove"
// entry is how prebuild blocks one, and bundletool's dump drops those.
export function blockedPermissionsIn(manifest, blocked) {
  return (blocked || []).filter(name => new RegExp('<uses-permission[^>]*android:name="' + name.replace(/\./g, '\\.') + '"').test(manifest));
}

// missingResources lists the configured resource names (such as string/google_app_id, which push needs) that a
// bundletool resource dump lacks.
export function missingResources(dump, required) {
  return (required || []).filter(name => !new RegExp(' - ' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm').test(dump));
}

// toolchainEnv fills in the SSD toolchain for any variable the caller has not set, and puts its tools first on PATH.
export function toolchainEnv(env) {
  const result = Object.assign({}, env);
  for (const name of Object.keys(TOOLCHAIN)) if (!result[name]) result[name] = TOOLCHAIN[name];
  // Only the JDK and platform tools go first; Homebrew (bundletool) goes last so the caller's Node still wins.
  result.PATH = [join(result.JAVA_HOME, 'bin'), join(result.ANDROID_HOME, 'platform-tools'), result.PATH || '', '/opt/homebrew/bin'].join(':');
  return result;
}

// uploadKey returns the upload keystore path and password; ANDROID_UPLOAD_KEYSTORE and ANDROID_UPLOAD_KEYSTORE_PASSWORD
// take precedence over the vault item's `upload.jks` attachment and `keystore password` field.
function uploadKey() {
  // The per-app names the scripts used before v2 (NEWSWORTHY_…, SPACE_WORMS_…) are read too.
  const legacy = ANDROID.versionCodeEnv.replace(/_VERSION_CODE$/, '_KEYSTORE');
  const store = process.env.ANDROID_UPLOAD_KEYSTORE || process.env[legacy];
  const password = process.env.ANDROID_UPLOAD_KEYSTORE_PASSWORD || process.env[legacy + '_PASSWORD'];
  if (store && password) return { store: store, password: password };
  const key = { store: join(privateDir('app-release-android'), 'upload.jks'), password: opRead(ANDROID.vault, 'keystore password') };
  opRead(ANDROID.vault, 'upload.jks', key.store);
  return key;
}

// googleServices returns the Firebase file push builds need (vault attachment google-services.json, or
// GOOGLE_SERVICES_JSON as a path), or null when the configuration does not use push.
function googleServices() {
  if (!ANDROID.googleServices) return null;
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  const file = join(privateDir('app-release-android'), 'google-services.json');
  opRead(ANDROID.vault, 'google-services.json', file);
  return file;
}

// playAccount returns the Play service account's JSON key; GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (a path) takes precedence.
export function playAccount() {
  if (!ANDROID) setup();
  let file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!file) {
    file = join(privateDir('app-release-android'), 'play-service-account.json');
    opRead(ANDROID.vault, 'play-service-account.json', file);
  }
  const account = JSON.parse(readFileSync(file, 'utf8'));
  if (account.type !== 'service_account' || !account.private_key || !account.client_email) throw new Error('The Play key is not a service-account JSON key');
  if (!account.token_uri) account.token_uri = TOKEN_URI;
  return account;
}

// accessToken trades the signed assertion for an access token.
async function accessToken(account) {
  const response = await fetch(account.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assertion(account, Math.floor(Date.now() / 1000)) })
  });
  const json = await response.json();
  if (!response.ok) throw new Error('Google token exchange: ' + response.status + ' ' + (json.error_description || json.error));
  return json.access_token;
}

// playApi returns a caller for this app's androidpublisher v3 resources; upload sends raw bytes to the upload host.
function playApi(token) {
  return async (path, options) => {
    const opts = options || {};
    const method = opts.method || 'GET';
    const base = opts.upload ? PLAY + '/upload' : PLAY;
    const init = { method: method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': opts.contentType || (opts.upload ? 'application/octet-stream' : 'application/json') } };
    if (opts.upload) init.body = opts.upload;
    else if (opts.body) init.body = JSON.stringify(opts.body);
    const response = await fetch(base + '/androidpublisher/v3/applications/' + ANDROID.package + path, init);
    const text = await response.text();
    const json = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(method + ' ' + path.split('?')[0] + ': ' + response.status + ' ' + (json && json.error ? json.error.message : text));
    return json;
  };
}

// withEdit runs work inside a Play edit, the only way the API changes an app; an edit not committed is deleted, so a
// failed run changes nothing on Play. Work returns { committed: true } once it has committed.
export async function withEdit(account, work) {
  if (!ANDROID) setup();
  const api = playApi(await accessToken(account));
  const edit = await api('/edits', { method: 'POST' });
  let committed = false;
  try {
    const result = await work(api, '/edits/' + edit.id);
    committed = Boolean(result && result.committed === true);
    return result;
  } finally {
    if (!committed) await api('/edits/' + edit.id, { method: 'DELETE' }).catch(() => {});
  }
}

// commitEdit commits an edit with the chosen review behavior.
export async function commitEdit(api, edit, hold) {
  await api(edit + ':commit?' + commitQuery(hold), { method: 'POST' });
  return { committed: true };
}

// playNextVersionCode asks Play for every track's releases and every uploaded bundle.
function playNextVersionCode(account) {
  return withEdit(account, async (api, edit) => {
    const answers = await Promise.all([api(edit + '/tracks'), api(edit + '/bundles')]);
    return nextVersionCode(answers[0].tracks, answers[1].bundles);
  });
}

// run executes a command, its output inherited or written to log, and stops the release on failure.
function run(command, args, options) {
  const opts = options || {};
  console.log('\n$ ' + [command].concat(args).join(' ') + (opts.log ? '  > ' + opts.log : ''));
  const fd = opts.log ? openSync(opts.log, 'w') : 'inherit';
  const result = spawnSync(command, args, { cwd: opts.cwd || CONFIG.projectDir, env: Object.assign({}, opts.env || process.env), stdio: ['ignore', fd, fd] });
  if (opts.log) closeSync(fd);
  if (result.status !== 0) {
    if (opts.log) console.error(readFileSync(opts.log, 'utf8').split('\n').filter(line => /error|FAILED|What went wrong/i.test(line)).slice(-20).join('\n'));
    throw new Error(command + ' exited with ' + (result.status === null ? result.signal : result.status));
  }
}

// capture returns a command's trimmed standard output.
function capture(command, args, env) {
  const result = spawnSync(command, args, { cwd: CONFIG.root, encoding: 'utf8', env: env || process.env, maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(command + ' ' + args[0] + ' failed: ' + String(result.stderr).trim());
  return result.stdout.trim();
}

const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const outDir = code => join(CONFIG.buildRoot, 'android', CONFIG.slug, String(code));
const aabFor = code => join(outDir(code), ANDROID.artifactName + '.aab');

// verify checks the store bundle before anything leaves the Mac: the chosen version code on the right package, a
// target SDK Play accepts, the release JavaScript, configured resources present and blocked permissions absent, and the
// upload key's signature rather than the debug key Expo's template signs release with. It returns the summary written
// beside the bundle, with the build's provenance.
function verify(aab, code, key, env, provenance) {
  const manifest = xpath => capture('bundletool', ['dump', 'manifest', '--bundle=' + aab, '--xpath=' + xpath], env);
  const found = {
    packageName: manifest('/manifest/@package'),
    versionCode: Number(manifest('/manifest/@android:versionCode')),
    versionName: manifest('/manifest/@android:versionName'),
    targetSdk: Number(manifest('/manifest/uses-sdk/@android:targetSdkVersion'))
  };
  if (found.packageName !== ANDROID.package) throw new Error('Bundle is ' + found.packageName + ', expected ' + ANDROID.package);
  if (found.versionCode !== code) throw new Error('Bundle has versionCode ' + found.versionCode + ', expected ' + code);
  if (!(found.targetSdk >= ANDROID.minTargetSdk)) throw new Error('Bundle targets SDK ' + found.targetSdk + '; Play needs ' + ANDROID.minTargetSdk + ' or later');
  const entries = capture('unzip', ['-Z1', aab], env).split('\n');
  if (!entries.includes('base/assets/index.android.bundle')) throw new Error('Bundle carries no release JavaScript');
  if (ANDROID.requiredResources.length) {
    // `--resource=` answers nothing for some bundles; the full table names every resource.
    const missing = missingResources(capture('bundletool', ['dump', 'resources', '--bundle=' + aab], env), ANDROID.requiredResources);
    if (missing.length) throw new Error('Bundle lacks resources ' + missing.join(', ') + (ANDROID.googleServices ? '; push needs google-services.json' : ''));
  }
  const requested = blockedPermissionsIn(capture('bundletool', ['dump', 'manifest', '--bundle=' + aab], env), ANDROID.blockedPermissions);
  if (requested.length) throw new Error('Bundle requests blocked permissions: ' + requested.join(', '));
  const keytool = join(env.JAVA_HOME, 'bin/keytool');
  const signer = certificateDigest(capture(keytool, ['-printcert', '-jarfile', aab], env));
  const upload = certificateDigest(capture(keytool, ['-list', '-v', '-keystore', key.store, '-alias', ANDROID.keyAlias, '-storepass:env', 'APP_RELEASE_STOREPASS'],
    Object.assign({}, env, { APP_RELEASE_STOREPASS: key.password })));
  if (!signer || signer !== upload) throw new Error('Bundle is signed by ' + (signer || 'nothing') + ', not the upload key ' + upload);
  return Object.assign(found, {
    uploadCertificateSha256: upload,
    commit: provenance.commit,
    dirty: provenance.dirty,
    java: String(spawnSync(join(env.JAVA_HOME, 'bin/java'), ['-version'], { encoding: 'utf8' }).stderr).split('\n')[0],
    aab: aab,
    sha256: sha256(aab)
  });
}

// requireToolchain stops early, with the fix, when a tool the build needs is missing.
function requireToolchain(env) {
  for (const path of [env.JAVA_HOME, env.ANDROID_HOME]) {
    if (!existsSync(path)) throw new Error(path + ' is missing; see the toolchain in the app-release skill\'s references/android.md');
  }
  if (spawnSync('bundletool', ['version'], { env: env }).status !== 0) throw new Error('bundletool is missing; brew install bundletool');
}

// bundle prebuilds the native project with the version code and Gradle-builds the signed .aab, or with build false
// re-verifies bundle N where an earlier build left it, keeping that build's commit and dirty flag.
function bundle(key, code, flags, env) {
  requireToolchain(env);
  const out = outDir(code);
  const aab = aabFor(code);
  const summaryPath = join(out, 'summary.json');
  mkdirSync(out, { recursive: true });
  let provenance;
  if (flags.build) {
    const before = { commit: capture('git', ['rev-parse', 'HEAD']), status: capture('git', ['status', '--porcelain']) };
    if (before.status && !flags.allowDirty) throw new Error('The checkout has uncommitted changes; build from a clean commit or pass --allow-dirty for a test build.');
    provenance = { commit: before.commit, dirty: before.status !== '' };
    rmSync(summaryPath, { force: true });
    console.log('Building ' + ANDROID.package + ' versionCode ' + code + ' from ' + before.commit.slice(0, 7) + (before.status ? ' (dirty)' : ''));
    const sets = { CI: '1' };
    sets[ANDROID.versionCodeEnv] = String(code);
    sets[CONFIG.buildShaEnv] = before.commit.slice(0, 7);
    const services = googleServices();
    if (services) sets.GOOGLE_SERVICES_JSON = services;
    const buildEnv = releaseEnv(env, sets);
    run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install'], { env: buildEnv });
    run('./gradlew', ['--no-daemon', 'bundleRelease'], {
      cwd: join(CONFIG.projectDir, 'android'),
      env: Object.assign({}, buildEnv, { NODE_ENV: 'production' }, signingEnv(key, ANDROID.keyAlias)),
      log: join(out, 'gradle-bundle.log')
    });
    const after = { commit: capture('git', ['rev-parse', 'HEAD']), status: capture('git', ['status', '--porcelain']) };
    if (!sameCheckout(before, after)) throw new Error('The checkout changed during the build, so the bundle may mix sources; rebuild without touching it');
    copyFileSync(join(CONFIG.projectDir, 'android/app/build/outputs/bundle/release/app-release.aab'), aab);
    chmodSync(aab, 0o644);
  } else {
    if (!existsSync(aab)) throw new Error('No bundle for versionCode ' + code + '; run bundle first');
    provenance = keptProvenance(existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, 'utf8')) : null, sha256(aab));
  }
  const summary = verify(aab, code, key, env, provenance);
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

// apk turns the store bundle into one universal APK signed with the same upload key, for adb install on an emulator.
function apk(key, code, env) {
  const out = outDir(code);
  const aab = aabFor(code);
  if (!existsSync(aab)) throw new Error('No bundle for versionCode ' + code + '; run bundle first');
  const apks = join(out, ANDROID.artifactName + '.apks');
  rmSync(apks, { force: true });
  // bundletool takes a password only as pass: (a process list shows it) or file:, so it reads a file in the private
  // directory, which exit and signal handlers delete even if the run is interrupted.
  const scratch = mkdtempSync(join(privateDir('app-release-android'), 'apks-'));
  const pass = join(scratch, 'pass');
  writeFileSync(pass, key.password, { mode: 0o600 });
  try {
    run('bundletool', ['build-apks', '--bundle=' + aab, '--output=' + apks, '--mode=universal',
      '--ks=' + key.store, '--ks-pass=file:' + pass, '--ks-key-alias=' + ANDROID.keyAlias, '--key-pass=file:' + pass], { env: env });
    rmSync(pass, { force: true });
    run('unzip', ['-q', apks, 'universal.apk', '-d', scratch], { env: env });
    const file = join(out, ANDROID.artifactName + '-universal.apk');
    copyFileSync(join(scratch, 'universal.apk'), file);
    chmodSync(file, 0o644);
    console.log(file + '\nsha256 ' + sha256(file) + '\nInstall with: adb install -r ' + file);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// readTrack reads one track back in a fresh edit, the run's proof of a commit.
async function readTrack(account, name) {
  return withEdit(account, (api, edit) => api(edit + '/tracks/' + name));
}

// upload sends the verified bundle to a testing track as a completed release and commits; Play's own SHA-256 of what
// it received must match ours, and a bundle built from uncommitted changes is refused.
async function upload(account, code, track, notes, hold) {
  const aab = aabFor(code);
  const summaryPath = join(outDir(code), 'summary.json');
  if (!existsSync(aab) || !existsSync(summaryPath)) throw new Error('No verified bundle for versionCode ' + code + '; run bundle first');
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const digest = sha256(aab);
  const problem = uploadProblem(summary, digest);
  if (problem) throw new Error('Bundle ' + code + ' cannot be uploaded: ' + problem);
  const text = notes || CONFIG.app + ' ' + summary.versionName + ' (' + code + ').';
  let name = track;
  await withEdit(account, async (api, edit) => {
    // The track is resolved first, so a missing track fails before the bundle is sent.
    name = playTrackName(track, (await api(edit + '/tracks')).tracks);
    console.log('Uploading ' + aab + ' (sha256 ' + digest + ') to Play for ' + name);
    const uploaded = await api(edit + '/bundles?uploadType=media', { method: 'POST', upload: readFileSync(aab) });
    if (uploaded.versionCode !== code) throw new Error('Play read versionCode ' + uploaded.versionCode + ', expected ' + code);
    if (uploaded.sha256 !== digest) throw new Error('Play received sha256 ' + uploaded.sha256 + ', expected ' + digest);
    await api(edit + '/tracks/' + name, { method: 'PUT', body: trackRelease(name, code, text) });
    // Commit validates the edit itself; a separate :validate rejects changesNotSentForReview as unknown.
    return commitEdit(api, edit, hold);
  });
  const after = await readTrack(account, name);
  console.log('versionCode ' + code + ' committed to ' + name + (hold ? ' (held: send it for review in Publishing overview)' : '') + ': ' + JSON.stringify(after.releases));
}

// promote puts a version Play already holds on another testing track, as Play Console's "Promote release" does.
async function promote(account, code, track, notes, hold) {
  let name = track;
  await withEdit(account, async (api, edit) => {
    name = playTrackName(track, (await api(edit + '/tracks')).tracks);
    const held = ((await api(edit + '/bundles')).bundles || []).map(item => item.versionCode);
    if (!held.includes(code)) throw new Error('Play holds no bundle with versionCode ' + code + '; upload it first');
    await api(edit + '/tracks/' + name, { method: 'PUT', body: trackRelease(name, code, notes || CONFIG.app + ' (' + code + ').') });
    return commitEdit(api, edit, hold);
  });
  const after = await readTrack(account, name);
  console.log('versionCode ' + code + ' promoted to ' + name + (hold ? ' (held: send it for review in Publishing overview)' : '') + ': ' + JSON.stringify(after.releases));
}

// tracks prints every track's releases, read-only.
async function tracks(account) {
  const list = await withEdit(account, async (api, edit) => (await api(edit + '/tracks')).tracks || []);
  for (const track of list) {
    for (const release of track.releases || []) console.log(track.track, release.status, (release.versionCodes || []).join(','), release.name || '');
    if (!(track.releases || []).length) console.log(track.track, '(empty)');
  }
}

// main runs one command; an upload or promotion is outward-facing, so the skill has the owner confirm each one first.
async function main(args) {
  if (!args.length || args[0] === '--help') {
    console.log(USAGE);
    return;
  }
  const flags = parseArgs(args);
  setup();
  // An app whose owner sends every change for review from Play Console holds every commit by default.
  if (ANDROID.holdForReview === true) flags.hold = true;
  const env = toolchainEnv(process.env);
  const needsPlay = ['next-version-code', 'tracks', 'promote'].includes(flags.command) || Boolean(flags.track) || flags.versionCode === null;
  const account = needsPlay ? playAccount() : null;
  if (flags.command === 'next-version-code') return console.log(await playNextVersionCode(account));
  if (flags.command === 'tracks') return tracks(account);
  const code = flags.versionCode === null ? await playNextVersionCode(account) : flags.versionCode;
  if (flags.command === 'upload') return upload(account, code, flags.track, flags.notes, flags.hold);
  if (flags.command === 'promote') return promote(account, code, flags.track, flags.notes, flags.hold);
  const key = uploadKey();
  if (flags.command === 'verify') return bundle(key, code, { build: false }, env);
  if (flags.command !== 'apk') bundle(key, code, { build: true, allowDirty: flags.allowDirty }, env);
  if (flags.command !== 'bundle') apk(key, code, env);
  if (flags.command === 'release' && flags.track) await upload(account, code, flags.track, flags.notes, flags.hold);
}

// Run only when invoked as a command, so tests can import the helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
