#!/usr/bin/env node
// standards.mjs
// Checks an app repository against the shared app standards (assets/standards.json, references/standards.md). `audit`
// runs from the app repository at the start of every release run; `--all` sweeps every app on the Mac, read-only.
// Exits nonzero when a standard is missing.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_NAME, loadConfig, normalizeConfig } from './lib/config.mjs';
import { auditApp, loadCatalog } from './lib/standards.mjs';

const DEFAULT_ROOT = '/Volumes/ssd/code';
const USAGE = 'Usage: node skills/skills/app-release/scripts/standards.mjs audit [--json] [--all [--root DIR]]\n' +
  '  audit         check this app repository; nonzero exit when a standard is missing\n' +
  '  --json        print the result as JSON\n' +
  '  --all         check every repository under ' + DEFAULT_ROOT + ' with ' + CONFIG_NAME + ', skipping extra worktrees of one repository\n' +
  '  --root DIR    sweep DIR instead (with --all)';

export function parseArgs(args) {
  const flags = { json: false, all: false, root: DEFAULT_ROOT };
  if (args[0] !== 'audit') throw new Error(USAGE);
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') flags.json = true;
    else if (arg === '--all') flags.all = true;
    else if (arg === '--root' && args[index + 1]) flags.root = resolve(args[index += 1]);
    else throw new Error('Unknown option ' + arg + '\n' + USAGE);
  }
  return flags;
}

function gitValue(dir, args) {
  const result = spawnSync('git', ['-C', dir].concat(args), { encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  return result.status === 0 ? result.stdout.trim() : null;
}

// repositoryOf identifies a checkout's repository. Two checkouts of one repository share a common git directory or a
// remote; the main checkout, whose git directory is its own, represents them.
function repositoryOf(dir) {
  const common = gitValue(dir, ['rev-parse', '--git-common-dir']);
  const commonPath = common ? realpathSync(isAbsolute(common) ? common : join(dir, common)) : null;
  const remote = gitValue(dir, ['config', '--get', 'remote.origin.url']);
  return {
    key: remote ? remote.replace(/\.git$/, '').toLowerCase() : commonPath || dir,
    main: commonPath === join(realpathSync(dir), '.git')
  };
}

// discoverApps lists one checkout per repository under a directory, and the extra worktrees it set aside.
export function discoverApps(root) {
  const found = readdirSync(root, { withFileTypes: true })
    .filter(entry => (entry.isDirectory() || entry.isSymbolicLink()) && existsSync(join(root, entry.name, CONFIG_NAME)))
    .map(entry => join(root, entry.name)).sort();
  const seen = new Map();
  for (const dir of found) {
    let real;
    try {
      real = realpathSync(dir);
    } catch {
      continue;
    }
    const repository = repositoryOf(real);
    const current = seen.get(repository.key);
    if (!current) seen.set(repository.key, { dir, main: repository.main, duplicates: [] });
    else if (repository.main && !current.main) seen.set(repository.key, { dir, main: true, duplicates: current.duplicates.concat(current.dir) });
    else current.duplicates.push(dir);
  }
  const apps = [...seen.values()];
  return { apps: apps.map(item => item.dir), duplicates: apps.flatMap(item => item.duplicates).sort() };
}

function auditDir(dir, catalog) {
  const path = join(dir, CONFIG_NAME);
  try {
    const result = auditApp(normalizeConfig(JSON.parse(readFileSync(path, 'utf8')), path), catalog);
    return { ...result, branch: gitValue(dir, ['rev-parse', '--abbrev-ref', 'HEAD']) };
  } catch (error) {
    return { app: dir, root: dir, ok: false, error: error.message, standards: [], warnings: [] };
  }
}

// table lays the sweep out with one row per app and one column per standard.
export function table(results, catalog) {
  const ids = catalog.standards.map(standard => standard.id);
  const label = { pass: 'pass', missing: 'MISSING', 'opted-out': 'opted out', 'not-applicable': 'n/a' };
  const rows = [['App', 'Checkout', 'Branch'].concat(ids)].concat(results.map(result => {
    const cells = ids.map(id => (result.error ? 'error' : label[result.standards.find(item => item.id === id)?.status] || '?'));
    return [result.app, result.root.split('/').pop(), result.branch || '?'].concat(cells);
  }));
  const widths = rows[0].map((_, column) => Math.max(...rows.map(row => String(row[column]).length)));
  return rows.map(row => row.map((cell, column) => String(cell).padEnd(widths[column])).join('  ').trimEnd()).join('\n');
}

function report(result) {
  const lines = ['Standards audit: ' + result.app + ' (' + result.root + ')'];
  for (const item of result.standards) {
    if (item.status === 'pass') lines.push('  pass       ' + item.id + (item.evidence.length ? ': ' + item.evidence.join(', ') : ''));
    if (item.status === 'opted-out') lines.push('  opted out  ' + item.id + ': ' + item.reason);
    if (item.status === 'not-applicable') lines.push('  n/a        ' + item.id + ': the source shows nothing it applies to');
    if (item.status !== 'missing') continue;
    lines.push('  MISSING    ' + item.id + ': ' + item.title);
    for (const problem of item.problems) lines.push('             - ' + problem);
    lines.push('             Fix: ' + item.fix, '             Verify: ' + item.verify, '             Ledger gate: ' + item.gate + ' (spec: ' + item.doc + ')');
  }
  for (const warning of result.warnings) lines.push('  warning    ' + warning);
  return lines.join('\n');
}

function main(args) {
  if (!args.length || args[0] === '--help') return console.log(USAGE);
  const flags = parseArgs(args);
  const catalog = loadCatalog();
  if (flags.all) {
    const { apps, duplicates } = discoverApps(flags.root);
    const results = apps.map(dir => auditDir(dir, catalog));
    if (flags.json) console.log(JSON.stringify({ results, duplicates }, null, 2));
    else {
      console.log(table(results, catalog));
      for (const result of results.filter(item => item.error)) console.log('Error in ' + result.root + ': ' + result.error);
      if (duplicates.length) console.log('Skipped extra worktrees: ' + duplicates.map(dir => dir.split('/').pop()).join(', '));
    }
    if (!results.every(result => result.ok)) process.exitCode = 1;
    return;
  }
  const config = loadConfig(process.cwd());
  const result = { ...auditApp(config, catalog), branch: gitValue(config.root, ['rev-parse', '--abbrev-ref', 'HEAD']) };
  console.log(flags.json ? JSON.stringify(result, null, 2) : report(result));
  if (!result.ok) process.exitCode = 1;
}

// Run only when invoked as a command, so tests can import the helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
