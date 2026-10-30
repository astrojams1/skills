#!/usr/bin/env node
// ios-release.mjs
// Builds, signs, verifies and uploads an App Store build on the owner's Mac with Xcode, with no EAS Build: expo
// prebuild, pod install, xcodebuild archive and -exportArchive with Apple-managed signing through the App Store Connect
// API key from 1Password, checks on the .ipa before anything leaves the Mac, altool upload, Apple's processing, and the
// internal TestFlight group. The build number is the highest App Store Connect holds, plus one. Settings come from the
// app's app-release.config.json (`ios`, `buildRoot`, `slug`). Run from the app repository.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, listAll, loadCredentials, setup as setupAsc } from './asc.mjs';
import { privateDir } from './lib/vault.mjs';
import { freshBuildTmp } from './lib/build-tmp.mjs';
import { requireSection } from './lib/config.mjs';

const COMMANDS = ['next-build-number', 'archive', 'validate', 'upload', 'testers', 'release'];
const USAGE = 'Usage: node skills/skills/app-release/scripts/ios-release.mjs <command> [N] [--build-number N] [--allow-dirty]\n' +
  '  next-build-number   print App Store Connect\'s highest build number plus one\n' +
  '  archive             prebuild/pod install (none for ios.project), archive, export, verify (writes summary.json)\n' +
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
let STORE = null;

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

// Signing defaults to automatic; manual mode reuses a verified local distribution identity/profile.
export function signingSettings(value) {
  if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) throw new Error('ios.signing must be an object');
  const signing = value || {};
  const style = signing.style === undefined ? 'automatic' : signing.style;
  if (!['automatic', 'manual'].includes(style)) throw new Error('ios.signing.style must be automatic or manual');
  if (style === 'automatic') return { style };
  if (!/^[a-fA-F0-9]{40}$/.test(signing.certificate || '')) throw new Error('Manual signing needs ios.signing.certificate: the installed distribution certificate SHA-1');
  if (typeof signing.profile !== 'string' || !signing.profile.trim() || /[\r\n\0]/.test(signing.profile)) throw new Error('Manual signing needs ios.signing.profile: the verified distribution profile name or UUID');
  return { style, certificate: signing.certificate, profile: signing.profile };
}

const xmlText = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function exportOptionsPlist(teamId, configuredSigning, bundleId) {
  const signing = signingSettings(configuredSigning);
  if (signing.style === 'manual' && !bundleId) throw new Error('Manual export needs the app bundle ID');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n<dict>\n' +
    '  <key>method</key><string>app-store-connect</string>\n' +
    '  <key>destination</key><string>export</string>\n' +
    '  <key>signingStyle</key><string>' + signing.style + '</string>\n' +
    '  <key>teamID</key><string>' + xmlText(teamId) + '</string>\n' +
    (signing.style === 'manual' ? '  <key>signingCertificate</key><string>' + xmlText(signing.certificate) + '</string>\n' +
      '  <key>provisioningProfiles</key><dict><key>' + xmlText(bundleId) + '</key><string>' + xmlText(signing.profile) + '</string></dict>\n' : '') +
    '  <key>manageAppVersionAndBuildNumber</key><false/>\n' +
    '  <key>uploadSymbols</key><true/>\n' +
    '</dict>\n</plist>\n';
}

// authArgs lets xcodebuild create and update certificates and profiles through the API key, without an Xcode login.
export function authArgs(key) {
  return ['-allowProvisioningUpdates', '-authenticationKeyPath', key.path, '-authenticationKeyID', key.keyId, '-authenticationKeyIssuerID', key.issuerId];
}

// archiveSigningMode reads `ios.archiveSigning`: "archive" (default) signs while archiving; "export" leaves the archive
// unsigned and lets the App Store export sign it. Automatic archive signing uses a development profile, which Apple only
// issues to a team with registered devices; a distribution profile needs none (Giraffe Stretch on Ouro, 2026-10-30).
export function archiveSigningMode(ios) {
  const mode = ios.archiveSigning === undefined ? 'archive' : ios.archiveSigning;
  if (!['archive', 'export'].includes(mode)) throw new Error('ios.archiveSigning must be "archive" or "export"');
  if (mode === 'export' && signingSettings(ios.signing).style !== 'automatic') throw new Error('ios.archiveSigning "export" needs automatic signing');
  return mode;
}

// archiveArgs builds the Release device archive with the configured store signing and chosen build number. A bare
// Xcode project (`ios.project`) is archived with -project; everything else through its workspace.
export function archiveArgs(ios, archivePath, derivedData, key, build) {
  const signing = signingSettings(ios.signing);
  const signingArgs = archiveSigningMode(ios) === 'export'
    ? ['CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO']
    : signing.style === 'manual'
      ? ['CODE_SIGN_STYLE=Manual', 'CODE_SIGN_IDENTITY=' + signing.certificate, 'PROVISIONING_PROFILE_SPECIFIER=' + signing.profile]
      : authArgs(key).concat(['CODE_SIGN_STYLE=Automatic']);
  if (ios.prebuild === false && build === undefined) throw new Error('A tracked native archive needs its chosen build number');
  const container = ios.project ? ['-project', ios.project] : ['-workspace', ios.workspace];
  return container.concat(['-scheme', ios.scheme, '-configuration', 'Release', '-destination', 'generic/platform=iOS',
    '-archivePath', archivePath, '-derivedDataPath', derivedData])
    .concat(signingArgs, ['DEVELOPMENT_TEAM=' + ios.teamId], build === undefined ? [] : ['CURRENT_PROJECT_VERSION=' + parseBuildNumber(build)], ['archive']);
}

// exportArgs re-signs the archive for App Store distribution into an .ipa.
export function exportArgs(archivePath, exportPath, optionsPath, key, configuredSigning) {
  return ['-exportArchive', '-archivePath', archivePath, '-exportPath', exportPath, '-exportOptionsPlist', optionsPath]
    .concat(signingSettings(configuredSigning).style === 'manual' ? [] : authArgs(key));
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
  const list = entitlementArray(xml, name);
  if (list) return list.join(',');
  return null;
}

function entitlementArray(xml, name) {
  const key = '<key>' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</key>\\s*';
  const list = xml.match(new RegExp(key + '<array>([\\s\\S]*?)</array>'));
  return list ? (list[1].match(/<string>([^<]*)<\/string>/g) || []).map(item => item.replace(/<\/?string>/g, '')) : null;
}

// entitlementProblems lists what is wrong with a signed store binary's entitlements: each configured entitlement must
// survive Apple-managed signing with its value (an array entitlement must contain it), the app group must be present
// when configured, and a debuggable (development-signed) binary must never be uploaded.
export function entitlementProblems(xml, required, appGroup) {
  const problems = [];
  for (const name of Object.keys(required || {})) {
    const wanted = required[name];
    const found = entitlementValue(xml, name);
    const array = Array.isArray(wanted) ? entitlementArray(xml, name) : null;
    const ok = Array.isArray(wanted) ? array !== null && wanted.every(value => array.includes(value))
      : typeof wanted === 'string' && typeof found === 'string' ? found.split(',').includes(wanted) : found === wanted;
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
export function uploadProblem(summary, digest, expected) {
  if (!summary) return 'it has no summary.json; run archive first';
  if (summary.dirty !== false) return 'it was archived from uncommitted changes; archive again from a clean commit';
  if (!/^[0-9a-f]{40}$/.test(String(summary.commit))) return 'its summary names no commit; archive it again';
  if (digest !== summary.sha256) return 'the .ipa changed since it was verified; archive it again';
  for (const name of ['bundleId', 'version', 'build']) {
    if (expected && String(summary[name]) !== String(expected[name])) return 'its ' + name + ' does not match the requested release; archive it again';
  }
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

// nativeRoot is where xcodebuild runs: the generated or tracked `ios/` folder, or for a bare Xcode project
// (`ios.project`) the project directory itself.
export function nativeRoot(config, ios) {
  return ios.project ? resolve(config.projectDir) : resolve(config.projectDir, 'ios');
}

// Tracked-native mode supports a flat workspace of local projects plus generated Pods, or a bare Xcode project with
// no Expo and no CocoaPods (`ios.project`). Check the actual references, not just that some native project is in Git.
function checkedNativeInfo() {
  if (!IOS.infoPlist) throw new Error('ios.prebuild=false needs ios.infoPlist, relative to ' + (IOS.project ? 'the project directory' : 'the ios directory'));
  const root = nativeRoot(CONFIG, IOS);
  const tracked = new Set(capture('git', ['ls-files', '-z']).split('\0'));
  const requireTracked = path => {
    const local = relative(CONFIG.root, path);
    if (isAbsolute(local) || local.startsWith('..') || !tracked.has(local) || !existsSync(path)) throw new Error('Tracked native input must exist in Git: ' + local);
    if (realpathSync(path) !== resolve(realpathSync(CONFIG.root), local)) throw new Error('Tracked native inputs must not use symlinks: ' + local);
  };
  const info = resolve(root, IOS.infoPlist);
  if (IOS.project) {
    if (!IOS.project.endsWith('.xcodeproj') || isAbsolute(IOS.project)) throw new Error('ios.project must be a relative path to a .xcodeproj');
    const project = resolve(root, IOS.project);
    for (const path of [info, join(project, 'project.pbxproj'), join(project, 'xcshareddata', 'xcschemes', IOS.scheme + '.xcscheme')]) requireTracked(path);
    return info;
  }
  const workspace = resolve(root, IOS.workspace, 'contents.xcworkspacedata');
  for (const path of [info, workspace, join(root, 'Podfile'), join(root, 'Podfile.lock')]) requireTracked(path);
  const xml = readFileSync(workspace, 'utf8');
  if (/<Group\b/.test(xml)) throw new Error('Tracked native mode needs a flat workspace; nested workspace groups are unsupported');
  const projects = [...xml.matchAll(/<FileRef\b[^>]*\blocation\s*=\s*(["'])([^"']+)\1/g)].map(match => match[2]);
  if (!projects.length) throw new Error('Tracked native workspace has no project references');
  if (projects.length !== [...xml.matchAll(/<FileRef\b/g)].length) throw new Error('Unsupported tracked native workspace reference syntax');
  const schemePaths = [join(dirname(workspace), 'xcshareddata', 'xcschemes', IOS.scheme + '.xcscheme')];
  let appProjects = 0;
  for (const location of projects) {
    if (location === 'group:Pods/Pods.xcodeproj') continue;
    if (!location.startsWith('group:') || !location.endsWith('.xcodeproj') || /[&<>]/.test(location)) throw new Error('Unsupported tracked native project reference: ' + location);
    const project = resolve(dirname(dirname(workspace)), location.slice(6));
    requireTracked(join(project, 'project.pbxproj'));
    appProjects++;
    schemePaths.push(join(project, 'xcshareddata', 'xcschemes', IOS.scheme + '.xcscheme'));
  }
  if (!appProjects) throw new Error('Tracked native workspace needs a reviewed app project');
  const scheme = schemePaths.find(path => tracked.has(relative(CONFIG.root, path)) && existsSync(path));
  if (!scheme) throw new Error('Tracked native mode needs the configured shared scheme in Git');
  requireTracked(scheme);
  return info;
}

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
    capture('codesign', ['--verify', '--deep', '--strict', bundle]);
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
  const version = plist(info, 'CFBundleShortVersionString');
  if (version !== STORE.version) throw new Error('The app version is ' + version + ', expected ' + STORE.version);
  capture('plutil', ['-extract', 'UIApplicationSceneManifest', 'xml1', '-o', '-', info]);
  return {
    build: build, version: version, bundleId: bundleId,
    xcode: plist(info, 'DTXcodeBuild'), sdk: plist(info, 'DTSDKName'), commit: provenance.commit, dirty: provenance.dirty,
    ipa: ipa, sha256: sha256(ipa)
  };
}

// archive runs prebuild, pod install, archive, export and verify from the checkout, refusing a dirty one unless
// --allow-dirty, and refusing to record a build whose checkout moved during the run.
async function archive(flags) {
  const signing = signingSettings(IOS.signing);
  if (IOS.prebuild !== undefined && typeof IOS.prebuild !== 'boolean') throw new Error('ios.prebuild must be true or false');
  if (IOS.project && IOS.prebuild !== false) throw new Error('ios.project is a bare Xcode project; set ios.prebuild to false');
  archiveSigningMode(IOS);
  if (IOS.prebuild === false) {
    const nativeInfo = checkedNativeInfo();
    if (plist(nativeInfo, 'CFBundleVersion') !== '$(CURRENT_PROJECT_VERSION)') throw new Error('Tracked native CFBundleVersion must be $(CURRENT_PROJECT_VERSION) so the chosen build number can be applied without editing source');
  }
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
  // A failed rerun must not retain an earlier success receipt beside replacement artifacts.
  rmSync(join(out, 'summary.json'), { force: true });
  console.log(capture('xcodebuild', ['-version']).replace(/\n/g, ', ') + ' - commit ' + before.commit.slice(0, 7) + (before.status ? ' (dirty)' : ''));
  // A per-build TMPDIR keeps Metro's cache from another checkout out of the bundle (lib/build-tmp.mjs).
  const sets = { CI: '1', LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8', TMPDIR: freshBuildTmp(out) };
  sets[IOS.buildNumberEnv] = String(build);
  sets[CONFIG.buildShaEnv] = before.commit.slice(0, 7);
  const env = IOS.scrubPublicEnv === false ? Object.assign({}, process.env, sets) : releaseEnv(process.env, sets);
  const archivePath = join(out, IOS.scheme + '.xcarchive');
  const exportPath = join(out, 'export');
  rmSync(archivePath, { recursive: true, force: true });
  rmSync(exportPath, { recursive: true, force: true });
  if (IOS.project) {
    // A bare Xcode project has no Expo config to evaluate and no CocoaPods to install.
  } else if (IOS.prebuild === false) {
    // Evaluate the same release config/guards without replacing a reviewed native project.
    run('npx', ['expo', 'config', '--type', 'public', '--json'], { env: env, log: join(out, 'expo-config.json') });
  } else {
    run('npx', ['expo', 'prebuild', '--platform', 'ios', '--no-install', '--clean'], { env: env });
  }
  // CocoaPods fails on Unicode normalization without a UTF-8 locale.
  if (!IOS.project) run('pod', IOS.prebuild === false ? ['install', '--deployment'] : ['install'], { cwd: nativeRoot(CONFIG, IOS), env: env, log: join(out, 'pod-install.log') });
  const prepared = { commit: capture('git', ['rev-parse', 'HEAD']), status: capture('git', ['status', '--porcelain']) };
  if (prepared.commit !== before.commit || prepared.status !== before.status) throw new Error('Native preparation changed tracked source; review and commit those changes, then archive again with the same chosen build number. No archive or export was started.');
  const key = signing.style === 'automatic' ? writeKey() : null;
  run('xcodebuild', archiveArgs(IOS, archivePath, join(CONFIG.buildRoot, 'xcode', CONFIG.slug, 'DerivedData'), key, build),
    { cwd: nativeRoot(CONFIG, IOS), env: env, log: join(out, 'xcodebuild-archive.log') });
  const optionsPath = join(out, 'ExportOptions.plist');
  writeFileSync(optionsPath, exportOptionsPlist(IOS.teamId, IOS.signing, IOS.bundleId));
  run('xcodebuild', exportArgs(archivePath, exportPath, optionsPath, key, IOS.signing), { env: env, log: join(out, 'xcodebuild-export.log') });
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
  const problem = uploadProblem(summary, existsSync(ipa) ? sha256(ipa) : null, { bundleId: IOS.bundleId, version: STORE.version, build });
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

// VALID and automatic group access do not establish testability: export compliance can still block a build.
// Verify exact group membership and the build's internal beta state on both group paths.
export async function testers(build, io) {
  const config = io ? io.ios : IOS;
  const version = io ? io.version : STORE.version;
  const read = io ? io.api : api;
  const all = io ? io.listAll : listAll;
  const pause = io ? io.pause : () => new Promise(done => setTimeout(done, 30000));
  const now = io ? io.now : Date.now;
  const log = io ? io.log : console.log;
  let found = null;
  const deadline = io ? io.deadline : now() + WAIT_MS;
  while (now() < deadline) {
    const { data } = await read('/v1/builds?filter[app]=' + config.ascAppId + '&filter[version]=' + build +
      '&filter[preReleaseVersion.version]=' + encodeURIComponent(version) + '&filter[preReleaseVersion.platform]=IOS&fields[builds]=version,processingState');
    if (data.length > 1) throw new Error('Expected one iOS build ' + version + '/' + build + ', found ' + data.length);
    found = data.find(item => String(item.attributes.version) === String(build)) || null;
    const state = found ? found.attributes.processingState : null;
    if (state === 'VALID') break;
    if (state === 'FAILED' || state === 'INVALID') throw new Error('Build ' + build + ' is ' + state);
    await pause();
  }
  if (!found || found.attributes.processingState !== 'VALID') throw new Error('Build ' + build + ' is not VALID after 30 minutes');
  // The app's own /v1/apps/{id}/betaGroups refuses filter[name] with a 400; the top-level collection takes both.
  const readGroups = async () => (await read('/v1/betaGroups?filter[app]=' + config.ascAppId + '&filter[name]=' +
    encodeURIComponent(config.testflightGroup))).data
    .filter(group => group.attributes.isInternalGroup && group.attributes.name === config.testflightGroup);
  let groups = await readGroups();
  const anyInternal = groups.length || (await read('/v1/betaGroups?filter[app]=' + config.ascAppId + '&filter[isInternalGroup]=true')).data.length;
  if (!anyInternal) {
    // A brand-new app has no internal groups, and the API can create one; read it back rather than trusting the reply.
    // An app that already has internal groups but not this name keeps failing below, so a typo never adds a group.
    await read('/v1/betaGroups', 'POST', { data: { type: 'betaGroups',
      attributes: { name: config.testflightGroup, isInternalGroup: true, hasAccessToAllBuilds: false },
      relationships: { app: { data: { type: 'apps', id: config.ascAppId } } } } });
    groups = await readGroups();
    log('Created the internal TestFlight group ' + config.testflightGroup + '; add its testers in App Store Connect or with the API.');
  }
  if (groups.length !== 1) throw new Error('Expected one internal TestFlight group named ' + config.testflightGroup + ', found ' + groups.length);
  const group = groups[0];
  if (group.attributes.hasAccessToAllBuilds) {
    log(config.testflightGroup + ' receives every build on its own.');
  } else {
    const present = await all('/v1/betaGroups/' + group.id + '/builds?limit=200');
    if (present.some(item => item.id === found.id)) log('Build ' + build + ' is already in ' + config.testflightGroup + '.');
    else await read('/v1/betaGroups/' + group.id + '/relationships/builds', 'POST', { data: [{ type: 'builds', id: found.id }] });
  }
  let internalBuildState = null;
  let buildPresent = false;
  while (now() < deadline) {
    const detail = (await read('/v1/builds/' + found.id + '/buildBetaDetail')).data.attributes;
    internalBuildState = detail.internalBuildState;
    const testable = ['READY_FOR_BETA_TESTING', 'IN_BETA_TESTING'].includes(internalBuildState);
    if (!testable && internalBuildState !== 'PROCESSING') {
      throw new Error('Build ' + build + ' is not internally testable: ' + internalBuildState + '; resolve that state in App Store Connect before requesting a device check.');
    }
    buildPresent = (await all('/v1/betaGroups/' + group.id + '/builds?limit=200')).some(item => item.id === found.id);
    if (testable && buildPresent) {
      log('Build ' + build + ' (' + found.id + ') is in ' + config.testflightGroup + '; internal state ' + internalBuildState + '.');
      return { build: String(build), buildId: found.id, groupId: group.id, internalBuildState, buildPresent };
    }
    log('Waiting for build ' + build + ' internal TestFlight readiness: ' + internalBuildState + ', group membership ' + buildPresent + '.');
    await pause();
  }
  throw new Error('Build ' + build + ' is not internally testable after 30 minutes: ' + internalBuildState + ', group membership ' + buildPresent + '; read provider state before retrying.');
}

async function main(args) {
  if (!args.length || args[0] === '--help') {
    console.log(USAGE);
    return;
  }
  const flags = parseArgs(args);
  // An archive with a chosen build number never reads App Store Connect, so it can run before the app record exists.
  const offline = flags.command === 'archive' && flags.build !== null;
  const loaded = setupAsc(undefined, offline ? ['bundleId', 'vault', 'platform'] : undefined);
  CONFIG = loaded.config;
  STORE = loaded.store;
  IOS = requireSection(CONFIG, 'ios', offline ? ['bundleId', 'teamId', 'scheme', 'buildNumberEnv'] : undefined);
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
