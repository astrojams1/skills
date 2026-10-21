#!/usr/bin/env node
// ios-release.mjs
// Builds, signs, verifies and uploads an App Store build on the owner's Mac with Xcode, with no EAS Build: expo
// prebuild, pod install, xcodebuild archive and -exportArchive with Apple-managed signing through the App Store Connect
// API key from 1Password, checks on the .ipa before anything leaves the Mac, altool upload, Apple's processing, and the
// internal TestFlight group. The build number is the highest App Store Connect holds, plus one. Settings come from the
// app's app-release.config.json (`ios`, `buildRoot`, `slug`). Run from the app repository.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, listAll, loadCredentials, setup as setupAsc } from './asc.mjs';
import { privateDir } from './lib/vault.mjs';
import { freshBuildTmp } from './lib/build-tmp.mjs';

const COMMANDS = ['next-build-number', 'archive', 'validate', 'upload', 'testers', 'release'];
const USAGE = 'Usage: node skills/skills/app-release/scripts/ios-release.mjs <command> [N] [--build-number N] [--allow-dirty]\n' +
  '  next-build-number   print App Store Connect\'s highest build number plus one\n' +
  '  archive             prebuild, pod install, archive, export and verify an .ipa (writes summary.json)\n' +
  '  validate <N>        validate build N\'s .ipa with App Store Connect, uploading nothing\n' +
  '  upload <N>          upload build N\'s .ipa and wait for Apple\'s processing\n' +
  '  testers <N>         add processed build N to the configured internal TestFlight group\n' +
  '  release             archive, upload and testers in one run\n' +
  '--allow-dirty makes a local test archive from uncommitted changes; upload refuses it.';
// Apple reports an upload as one of these once it stops processing.
const UPLOAD_SETTLED = ['COMPLETE', 'FAILED'];
const WAIT_MS = 30 * 60 * 1000;

let CONFIG = null;
let IOS = null;

// parseArgs reads the command and its documented options, so a typo never silently skips a check.
export function parseArgs(args) {
  const command = args[0];
  if (!COMMANDS.includes(command)) throw new Error(USAGE);
  const flags = { command: command, build: null, allowDirty: false };
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--allow-dirty') flags.allowDirty = true;
    else if (arg === '--build-number') {
      flags.build = parseBuildNumber(args[index + 1]);
      index += 1;
    } else if (!arg.startsWith('--') && flags.build === null) flags.build = parseBuildNumber(arg);
    else throw new Error('Unknown option ' + arg + '.\n' + USAGE);
  }
  if (['validate', 'upload', 'testers'].includes(command) && flags.build === null) throw new Error(command + ' needs a build number\n' + USAGE);
  // What reaches App Store Connect must match a commit; a dirty tree makes a local test archive only.
  if (flags.allowDirty && ['upload', 'release'].includes(command)) throw new Error('An upload needs a clean checkout; --allow-dirty is for local test archives only.');
  return flags;
}

// parseBuildNumber accepts the whole numbers CFBundleVersion takes here.
export function parseBuildNumber(value) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) throw new Error('A build number is a positive whole number');
  return Number(value);
}

// nextBuildNumber returns one more than the highest build number App Store Connect holds in finished builds or
// uploads still processing, since Apple refuses a CFBundleVersion it has already seen for the app.
export function nextBuildNumber(buildVersions, uploadVersions) {
  let latest = 0;
  for (const value of buildVersions.concat(uploadVersions || [])) {
    if (!/^\d+$/.test(String(value))) throw new Error('Build number ' + value + ' is not a whole number; pass --build-number by hand.');
    latest = Math.max(latest, Number(value));
  }
  return latest + 1;
}

// exportOptionsPlist describes an App Store Connect export signed by Xcode's automatic, Apple-managed signing. Xcode
// must not renumber the build: the number is chosen before prebuild.
export function exportOptionsPlist(teamId) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n<dict>\n' +
    '  <key>method</key><string>app-store-connect</string>\n' +
    '  <key>destination</key><string>export</string>\n' +
    '  <key>signingStyle</key><string>automatic</string>\n' +
    '  <key>teamID</key><string>' + teamId + '</string>\n' +
    '  <key>manageAppVersionAndBuildNumber</key><false/>\n' +
    '  <key>uploadSymbols</key><true/>\n' +
    '</dict>\n</plist>\n';
}

// authArgs lets xcodebuild create and update certificates and profiles through the API key, without an Xcode login.
export function authArgs(key) {
  return ['-allowProvisioningUpdates', '-authenticationKeyPath', key.path, '-authenticationKeyID', key.keyId, '-authenticationKeyIssuerID', key.issuerId];
}

// archiveArgs builds the Release device archive with automatic signing for the store team.
export function archiveArgs(ios, archivePath, derivedData, key) {
  return ['-workspace', ios.workspace, '-scheme', ios.scheme, '-configuration', 'Release', '-destination', 'generic/platform=iOS',
    '-archivePath', archivePath, '-derivedDataPath', derivedData]
    .concat(authArgs(key), ['CODE_SIGN_STYLE=Automatic', 'DEVELOPMENT_TEAM=' + ios.teamId, 'archive']);
}

// exportArgs re-signs the archive for App Store distribution into an .ipa.
export function exportArgs(archivePath, exportPath, optionsPath, key) {
  return ['-exportArchive', '-archivePath', archivePath, '-exportPath', exportPath, '-exportOptionsPlist', optionsPath].concat(authArgs(key));
}

// altoolArgs validates or uploads the .ipa; the key goes by file path so its body never appears in the process list.
// Validation uses --validate-app (both apps, 2026-10-14); upload uses --upload-package with --wait, the form that
// uploaded Newsworthy's build 28 (#210).
export function altoolArgs(verb, ipaPath, key) {
  const auth = ['--api-key', key.keyId, '--api-issuer', key.issuerId, '--p8-file-path', key.path];
  if (verb === '--upload-package') return ['altool', '--upload-package', ipaPath].concat(auth, ['--wait', '--output-format', 'normal']);
  return ['altool', verb, '-f', ipaPath, '-t', 'ios'].concat(auth);
}

// entitlementValue reads one entitlement from codesign's XML: true/false for booleans, the text for a string, the
// strings of an array joined by commas, or null when absent.
export function entitlementValue(xml, name) {
  const key = '<key>' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</key>\\s*';
  const flag = xml.match(new RegExp(key + '<(true|false)\\s*/>'));
  if (flag) return flag[1] === 'true';
  const text = xml.match(new RegExp(key + '<string>([^<]*)</string>'));
  if (text) return text[1];
  const list = xml.match(new RegExp(key + '<array>([\\s\\S]*?)</array>'));
  if (list) return (list[1].match(/<string>([^<]*)<\/string>/g) || []).map(item => item.replace(/<\/?string>/g, '')).join(',');
  return null;
}

// entitlementProblems lists what is wrong with a signed store binary's entitlements: each configured entitlement must
// survive Apple-managed signing with its value (an array entitlement must contain it), the app group must be present
// when configured, and a debuggable (development-signed) binary must never be uploaded.
export function entitlementProblems(xml, required, appGroup) {
  const problems = [];
  for (const name of Object.keys(required || {})) {
    const wanted = required[name];
    const found = entitlementValue(xml, name);
    const ok = typeof wanted === 'string' && typeof found === 'string' ? found.split(',').includes(wanted) : found === wanted;
    if (!ok) problems.push(name + (found === null ? ' is missing' : ' is ' + JSON.stringify(found) + ', expected ' + JSON.stringify(wanted)));
  }
  if (appGroup) {
    const groups = entitlementValue(xml, 'com.apple.security.application-groups');
    if (typeof groups !== 'string' || !groups.split(',').includes(appGroup)) problems.push('app group ' + appGroup + ' is missing');
  }
  if (entitlementValue(xml, 'get-task-allow') === true) problems.push('get-task-allow is true (development signing)');
  return problems;
}

// uploadState reads the processing state of the upload record carrying one build number, or null before it appears.
export function uploadState(uploads, buildNumber) {
  const match = uploads.find(upload => String(upload.attributes.cfBundleVersion) === String(buildNumber));
  if (!match) return null;
  const state = match.attributes.state || {};
  return { state: state.state || 'UNKNOWN', errors: state.errors || [] };
}

// uploadProblem names why an archived build may not go to App Store Connect, or returns null.
export function uploadProblem(summary, digest) {
  if (!summary) return 'it has no summary.json; run archive first';
  if (summary.dirty !== false) return 'it was archived from uncommitted changes; archive again from a clean commit';
  if (!/^[0-9a-f]{40}$/.test(String(summary.commit))) return 'its summary names no commit; archive it again';
  if (digest !== summary.sha256) return 'the .ipa changed since it was verified; archive it again';
  return null;
}

// releaseEnv is the environment prebuild and xcodebuild run in: Expo inlines EXPO_PUBLIC_* values into the release
// JavaScript and loads ignored .env files, either of which could point a clean-looking build at a staging or local
// server, so dotenv is off and the only EXPO_PUBLIC_* values are the ones the release sets.
export function releaseEnv(env, sets) {
  const result = {};
  for (const name of Object.keys(env)) if (!name.startsWith('EXPO_PUBLIC_')) result[name] = env[name];
  return Object.assign(result, { EXPO_NO_DOTENV: '1' }, sets);
}

// redactArgs hides the API key's identifiers and file path in an echoed command line.
export function redactArgs(args) {
  const secretAfter = ['-authenticationKeyPath', '-authenticationKeyID', '-authenticationKeyIssuerID', '--api-key', '--api-issuer', '--p8-file-path'];
  return args.map((arg, index) => (index > 0 && secretAfter.includes(args[index - 1]) ? '<hidden>' : arg));
}

// run executes a command, its output inherited or written to a log, and stops the release on failure. Node's own
// error repeats the full argument list, so a failure is rethrown with the redacted one.
function run(command, args, options) {
  const opts = options || {};
  const shown = command + ' ' + redactArgs(args).join(' ');
  console.log('\n$ ' + shown + (opts.log ? '  > ' + opts.log : ''));
  const fd = opts.log ? openSync(opts.log, 'w') : 'inherit';
  const result = spawnSync(command, args, { cwd: opts.cwd || CONFIG.projectDir, env: opts.env || process.env, stdio: ['ignore', fd, fd] });
  if (opts.log) closeSync(fd);
  if (result.status !== 0) {
    if (opts.log) console.error(readFileSync(opts.log, 'utf8').split('\n').filter(line => /error:|\*\* .* FAILED \*\*/.test(line)).slice(-20).join('\n'));
    throw new Error('Command failed (status ' + (result.status === null ? result.signal : result.status) + '): ' + shown);
  }
}

// capture returns a command's trimmed standard output.
function capture(command, args, cwd) {
  const result = spawnSync(command, args, { cwd: cwd || CONFIG.root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(command + ' ' + args[0] + ' failed: ' + String(result.stderr).trim());
  return result.stdout.trim();
}

const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const outDir = build => join(CONFIG.buildRoot, 'xcode', CONFIG.slug, 'release', String(build));
const ipaFor = build => join(outDir(build), 'export', IOS.scheme + '.ipa');

// readBuildNumbers asks App Store Connect for every build and upload number of the app.
async function readBuildNumbers() {
  const builds = await listAll('/v1/builds?filter[app]=' + IOS.ascAppId + '&fields[builds]=version&limit=200');
  const uploads = await listAll('/v1/apps/' + IOS.ascAppId + '/buildUploads?limit=200');
  return { builds: builds.map(build => build.attributes.version), uploads: uploads.map(upload => upload.attributes.cfBundleVersion) };
}

// writeKey writes the API key for xcodebuild and altool into the private directory and returns its location.
function writeKey() {
  const credentials = loadCredentials();
  const path = join(privateDir('app-release-asc'), 'AuthKey_' + credentials.keyId + '.p8');
  writeFileSync(path, credentials.key, { mode: 0o600 });
  return { path: path, keyId: credentials.keyId, issuerId: credentials.issuerId };
}

// bundlesIn lists the app bundle and every extension bundle under it.
function bundlesIn(app) {
  const plugins = join(app, 'PlugIns');
  return [app].concat(existsSync(plugins) ? readdirSync(plugins).map(name => join(plugins, name)) : []);
}

// plist reads one Info.plist value.
const plist = (file, key) => capture('plutil', ['-extract', key, 'raw', '-o', '-', file]);

// verify unpacks the exported app and checks, for the app and every extension, the build number, the signing team, the
// entitlements the configuration requires and the app group; the app also needs a scene manifest, since an iOS 27 SDK
// build without the UIScene life cycle stops at launch. It returns the summary written beside the .ipa.
function verify(out, build, ipa, provenance) {
  const unzipped = join(out, 'ipa');
  rmSync(unzipped, { recursive: true, force: true });
  capture('ditto', ['-x', '-k', ipa, unzipped]);
  const payload = join(unzipped, 'Payload');
  const appName = readdirSync(payload).find(name => name.endsWith('.app'));
  if (!appName) throw new Error('The .ipa holds no .app');
  const app = join(payload, appName);
  const info = join(app, 'Info.plist');
  for (const bundle of bundlesIn(app)) {
    const found = plist(join(bundle, 'Info.plist'), 'CFBundleVersion');
    if (found !== String(build)) throw new Error(bundle + ' has CFBundleVersion ' + found + ', expected ' + build);
    const signing = spawnSync('codesign', ['-dv', bundle], { encoding: 'utf8' });
    const team = (String(signing.stderr).match(/TeamIdentifier=(\S+)/) || [])[1];
    if (team !== IOS.teamId) throw new Error(bundle + ' is signed by team ' + team + ', expected ' + IOS.teamId);
    const xml = capture('codesign', ['-d', '--entitlements', '-', '--xml', bundle]);
    const required = bundle === app ? IOS.requiredEntitlements : {};
    const problems = entitlementProblems(xml, required, IOS.appGroup);
    if (problems.length) throw new Error(bundle + ' is not ready for the store: ' + problems.join('; '));
  }
  const bundleId = plist(info, 'CFBundleIdentifier');
  if (bundleId !== IOS.bundleId) throw new Error('The app is ' + bundleId + ', expected ' + IOS.bundleId);
  capture('plutil', ['-extract', 'UIApplicationSceneManifest', 'xml1', '-o', '-', info]);
  return {
    build: build, version: plist(info, 'CFBundleShortVersionString'), bundleId: bundleId,
    xcode: plist(info, 'DTXcodeBuild'), sdk: plist(info, 'DTSDKName'), commit: provenance.commit, dirty: provenance.dirty,
    ipa: ipa, sha256: sha256(ipa)
  };
}

// archive runs prebuild, pod install, archive, export and verify from the checkout, refusing a dirty one unless
// --allow-dirty, and refusing to record a build whose checkout moved during the run.
async function archive(flags) {
  const before = { commit: capture('git', ['rev-parse', 'HEAD']), status: capture('git', ['status', '--porcelain']) };
  if (before.status && !flags.allowDirty) throw new Error('The checkout has uncommitted changes; archive from a clean commit or pass --allow-dirty for a test build.');
  let build = flags.build;
  if (build === null) {
    const numbers = await readBuildNumbers();
    build = nextBuildNumber(numbers.builds, numbers.uploads);
    console.log('App Store Connect holds builds up to ' + (build - 1) + '; this is build ' + build + '.');
  }
  const out = outDir(build);
  mkdirSync(out, { recursive: true });
  console.log(capture('xcodebuild', ['-version']).replace(/\n/g, ', ') + ' - commit ' + before.commit.slice(0, 7) + (before.status ? ' (dirty)' : ''));
  // A per-build TMPDIR keeps Metro's cache from another checkout out of the bundle (lib/build-tmp.mjs).
  const sets = { CI: '1', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', TMPDIR: freshBuildTmp(out) };
  sets[IOS.buildNumberEnv] = String(build);
  sets[CONFIG.buildShaEnv] = before.commit.slice(0, 7);
  const env = IOS.scrubPublicEnv === false ? Object.assign({}, process.env, sets) : releaseEnv(process.env, sets);
  const key = writeKey();
  const archivePath = join(out, IOS.scheme + '.xcarchive');
  const exportPath = join(out, 'export');
  rmSync(archivePath, { recursive: true, force: true });
  rmSync(exportPath, { recursive: true, force: true });
  run('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install', '--clean'], { env: env });
  // CocoaPods fails on Unicode normalization without a UTF-8 locale.
  run('pod', ['install'], { cwd: join(CONFIG.projectDir, 'ios'), env: env, log: join(out, 'pod-install.log') });
  run('xcodebuild', archiveArgs(IOS, archivePath, join(CONFIG.buildRoot, 'xcode', CONFIG.slug, 'DerivedData'), key),
    { cwd: join(CONFIG.projectDir, 'ios'), env: env, log: join(out, 'xcodebuild-archive.log') });
  const optionsPath = join(out, 'ExportOptions.plist');
  writeFileSync(optionsPath, exportOptionsPlist(IOS.teamId));
  run('xcodebuild', exportArgs(archivePath, exportPath, optionsPath, key), { env: env, log: join(out, 'xcodebuild-export.log') });
  const after = { commit: capture('git', ['rev-parse', 'HEAD']), status: capture('git', ['status', '--porcelain']) };
  if (after.commit !== before.commit || after.status !== before.status) throw new Error('The checkout changed during the build, so the archive may mix sources; archive again without touching it');
  const ipa = ipaFor(build);
  if (!existsSync(ipa)) throw new Error('No .ipa at ' + ipa);
  const summary = verify(out, build, ipa, { commit: before.commit, dirty: before.status !== '' });
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

// validate asks App Store Connect to check build N's .ipa without uploading it.
function validate(build) {
  const ipa = ipaFor(build);
  if (!existsSync(ipa)) throw new Error('No archive for build ' + build + '; run archive first');
  run('xcrun', altoolArgs('--validate-app', ipa, writeKey()), { cwd: CONFIG.root });
}

// upload sends build N's verified .ipa and waits until Apple's upload record settles.
async function upload(build) {
  const summaryPath = join(outDir(build), 'summary.json');
  const summary = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, 'utf8')) : null;
  const ipa = ipaFor(build);
  const problem = uploadProblem(summary, existsSync(ipa) ? sha256(ipa) : null);
  if (problem) throw new Error('Build ' + build + ' cannot be uploaded: ' + problem);
  run('xcrun', altoolArgs('--upload-package', ipa, writeKey()), { cwd: CONFIG.root });
  await waitForUpload(build);
}

// waitForUpload polls Apple's upload record until it settles, failing on Apple's reported errors. A status read that
// cannot reach Apple is retried until the deadline, since the upload itself has already succeeded (Space Worms #1969).
// `io` replaces the reader, pause and clock in tests.
export async function waitForUpload(build, io) {
  const read = io ? io.read : () => listAll('/v1/apps/' + IOS.ascAppId + '/buildUploads?limit=200');
  const pause = io ? io.pause : () => new Promise(done => setTimeout(done, 30000));
  const now = io ? io.now : Date.now;
  const deadline = io ? io.deadline : now() + WAIT_MS;
  while (now() < deadline) {
    let found = null;
    try {
      found = uploadState(await read(), build);
    } catch (error) {
      console.log('Could not read the upload status (' + error.message + '); trying again in 30 s');
      await pause();
      continue;
    }
    if (found && UPLOAD_SETTLED.includes(found.state)) {
      if (found.state === 'FAILED') throw new Error('App Store Connect rejected build ' + build + ': ' + JSON.stringify(found.errors));
      console.log('App Store Connect finished processing the upload of build ' + build + '.');
      return found.state;
    }
    console.log('Build ' + build + (found ? ' is ' + found.state : ' is not listed yet') + ' - checking again in 30 s');
    await pause();
  }
  throw new Error('Build ' + build + ' is still processing after 30 minutes; check `asc.mjs status` before testers or attach-build.');
}

// testers waits for build N to be VALID, then adds it to the configured internal group unless that group already gets
// every build; a processed build otherwise reaches no tester.
async function testers(build) {
  let found = null;
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    const { data } = await api('/v1/builds?filter[app]=' + IOS.ascAppId + '&filter[version]=' + build + '&fields[builds]=version,processingState');
    found = data[0] || null;
    const state = found ? found.attributes.processingState : null;
    if (state === 'VALID') break;
    if (state === 'FAILED' || state === 'INVALID') throw new Error('Build ' + build + ' is ' + state);
    await new Promise(done => setTimeout(done, 30000));
  }
  if (!found || found.attributes.processingState !== 'VALID') throw new Error('Build ' + build + ' is not VALID after 30 minutes');
  // The app's own /v1/apps/{id}/betaGroups refuses filter[name] with a 400; the top-level collection takes both.
  const groups = (await api('/v1/betaGroups?filter[app]=' + IOS.ascAppId + '&filter[name]=' + encodeURIComponent(IOS.testflightGroup))).data
    .filter(group => group.attributes.isInternalGroup);
  if (groups.length !== 1) throw new Error('Expected one internal TestFlight group named ' + IOS.testflightGroup + ', found ' + groups.length);
  const group = groups[0];
  if (group.attributes.hasAccessToAllBuilds) {
    console.log(IOS.testflightGroup + ' receives every build on its own.');
    return;
  }
  const present = await listAll('/v1/betaGroups/' + group.id + '/builds?limit=200');
  if (present.some(item => item.id === found.id)) console.log('Build ' + build + ' is already in ' + IOS.testflightGroup + '.');
  else await api('/v1/betaGroups/' + group.id + '/relationships/builds', 'POST', { data: [{ type: 'builds', id: found.id }] });
  const detail = (await api('/v1/builds/' + found.id + '/buildBetaDetail')).data.attributes;
  console.log('Build ' + build + ' (' + found.id + ') is in ' + IOS.testflightGroup + '; internal state ' + detail.internalBuildState + '.');
}

async function main(args) {
  if (!args.length || args[0] === '--help') {
    console.log(USAGE);
    return;
  }
  const flags = parseArgs(args);
  const loaded = setupAsc();
  CONFIG = loaded.config;
  IOS = loaded.ios;
  if (flags.command === 'next-build-number') {
    const numbers = await readBuildNumbers();
    console.log(nextBuildNumber(numbers.builds, numbers.uploads));
  }
  if (flags.command === 'archive') await archive(flags);
  if (flags.command === 'validate') validate(flags.build);
  if (flags.command === 'upload') await upload(flags.build);
  if (flags.command === 'testers') await testers(flags.build);
  if (flags.command === 'release') {
    const summary = await archive(flags);
    await upload(summary.build);
    await testers(summary.build);
    console.log('Next: asc.mjs attach-build ' + summary.build + ' for a release, after the owner\'s device check.');
  }
}

// Run only when invoked as a command, so tests can import the helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
