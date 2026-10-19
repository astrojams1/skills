// config.mjs
// Finds and reads the app repository's app-release.config.json, the one file that names an app's store identity,
// vault items, build settings, store data and ledger paths. Every release script reads it lazily, so tests can import
// the scripts' decision helpers without a configured app.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export const CONFIG_NAME = 'app-release.config.json';

// findConfig walks up from a directory to the nearest app-release.config.json; APP_RELEASE_CONFIG names one directly.
// Walking up from the caller's directory, not the script's, matters because the scripts live in a skills submodule.
export function findConfig(start, env) {
  const named = (env || process.env).APP_RELEASE_CONFIG;
  if (named) {
    const path = resolve(start, named);
    if (!existsSync(path)) throw new Error('APP_RELEASE_CONFIG names ' + path + ', which does not exist');
    return path;
  }
  let dir = resolve(start);
  for (;;) {
    const candidate = join(dir, CONFIG_NAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('No ' + CONFIG_NAME + ' in ' + resolve(start) + ' or above; run from the app repository (see references/config.md)');
    dir = parent;
  }
}

// expandHome turns a leading ~ into the home directory, for paths such as the shared activity log.
export function expandHome(path) {
  return path && path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
}

// REQUIRED lists the fields each section needs before any command uses it, so a typo fails before an API call.
const REQUIRED = {
  root: ['app', 'slug', 'ledger'],
  ios: ['ascAppId', 'bundleId', 'teamId', 'scheme', 'buildNumberEnv'],
  android: ['package', 'vault', 'versionCodeEnv', 'artifactName']
};

// missingFields names the required fields a section leaves out.
export function missingFields(section, value) {
  return REQUIRED[section].filter(key => value === undefined || value === null || value[key] === undefined || value[key] === '');
}

// normalizeConfig fills defaults and resolves repository-relative paths; it never reads the network or the vault.
export function normalizeConfig(raw, path) {
  const missing = missingFields('root', raw);
  if (missing.length) throw new Error(CONFIG_NAME + ' lacks ' + missing.join(', '));
  const root = dirname(path);
  const inRepo = value => (value ? (isAbsolute(value) ? value : resolve(root, value)) : null);
  const config = Object.assign({}, raw);
  config.path = path;
  config.root = root;
  config.projectDir = inRepo(raw.projectDir || '.');
  config.storeData = inRepo(raw.storeData || null);
  config.buildRoot = expandHome(raw.buildRoot || join(root, 'build', 'app-release'));
  config.buildShaEnv = raw.buildShaEnv || 'EXPO_PUBLIC_BUILD_SHA';
  config.ledger = {
    gates: inRepo(raw.ledger.gates),
    view: inRepo(raw.ledger.view),
    runs: inRepo(raw.ledger.runs || null)
  };
  config.activityLog = raw.activityLog === undefined ? null : expandHome(raw.activityLog);
  if (raw.ios) {
    config.ios = Object.assign({ vault: 'op://API Tokens/App Store Connect', testflightGroup: 'Release QA', requiredEntitlements: {}, appGroup: null,
      workspace: raw.ios.scheme + '.xcworkspace', platform: 'IOS' }, raw.ios);
  }
  if (raw.android) {
    config.android = Object.assign({ keyAlias: 'upload', minTargetSdk: 36, googleServices: false, blockedPermissions: [], requiredResources: [],
      tracks: ['internal', 'alpha', 'beta'] }, raw.android);
  }
  return config;
}

let cached = null;

// loadConfig reads the configuration once per process.
export function loadConfig(start) {
  if (cached) return cached;
  const path = findConfig(start || process.cwd());
  cached = normalizeConfig(JSON.parse(readFileSync(path, 'utf8')), path);
  return cached;
}

// requireSection returns one platform's settings, failing with the exact fields still missing.
export function requireSection(config, section) {
  const missing = missingFields(section, config[section]);
  if (missing.length) throw new Error(CONFIG_NAME + ' ' + section + ' section lacks ' + missing.join(', '));
  return config[section];
}

// loadStoreData reads the store copy file the configuration names (see references/config.md for its shape).
export function loadStoreData(config) {
  if (!config.storeData) throw new Error(CONFIG_NAME + ' names no storeData file');
  return JSON.parse(readFileSync(config.storeData, 'utf8'));
}

// manifestGroups turns an asset manifest ({ file, platform, displayType }, paths relative to `base`) into screenshot
// groups in manifest order, so an app whose render scripts write a manifest need not list its files twice.
export function manifestGroups(entries, platform, base) {
  const groups = [];
  for (const entry of entries) {
    if (entry.platform !== platform || !entry.displayType) continue;
    let group = groups.find(item => item.displayType === entry.displayType);
    if (!group) {
      group = { displayType: entry.displayType, files: [] };
      groups.push(group);
    }
    group.files.push(base ? join(base, entry.file) : entry.file);
  }
  return groups;
}

// screenshotGroups resolves store data's `screenshots`: either explicit groups or { manifest, base } pointing at an
// asset manifest. File paths come back relative to the repository root.
export function screenshotGroups(config, screenshots) {
  if (Array.isArray(screenshots)) return screenshots;
  if (!screenshots || !screenshots.manifest) return [];
  const entries = JSON.parse(readFileSync(resolve(config.root, screenshots.manifest), 'utf8'));
  return manifestGroups(entries, 'ios', screenshots.base || '');
}
