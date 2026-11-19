#!/usr/bin/env node
// more-apps.mjs
// Writes the bundled list behind an app's "More apps" row (references/standards.md, More apps) from the shared
// catalogue in astrojams1/app-sites: every live App Store app of both teams, except the app itself, with name, one
// line, App Store id and a 96-pixel JPEG of its icon. Run it from the app repository; the app's own bundle id and App
// Store id come from its app-release.config.json. Mac only (icons are resized with sips).
//
//   node more-apps.mjs write --swift <folder>/MoreAppsCatalog.swift     a native app
//   node more-apps.mjs write --ts <folder>/moreAppsCatalog.ts           an Expo, React Native or Capacitor app
//   node more-apps.mjs list [--json]                                    what this app would list, without writing
//
//   --sites DIR   the app-sites checkout (default /Volumes/ssd/code/app-sites, or APP_SITES_ROOT); it is fetched first
//                 and read at origin/main, never from its working tree
//   --no-fetch    read origin/main as it is

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.mjs';
import { APP_SITES_ROOT, expectedApps, listFor, readCatalogue, renderSwift, renderTs } from './lib/more-apps.mjs';

const USAGE = 'Usage: node more-apps.mjs write (--swift FILE | --ts FILE) [--sites DIR] [--no-fetch]\n       node more-apps.mjs list [--json] [--sites DIR] [--no-fetch]';

export function parseArgs(args) {
  const flags = { command: args[0], sites: APP_SITES_ROOT, fetch: true, json: false };
  if (!['write', 'list'].includes(flags.command)) throw new Error(USAGE);
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === '--swift' || arg === '--ts') && args[index + 1]) { flags.lang = arg.slice(2); flags.out = resolve(args[index += 1]); }
    else if (arg === '--sites' && args[index + 1]) flags.sites = resolve(args[index += 1]);
    else if (arg === '--no-fetch') flags.fetch = false;
    else if (arg === '--json') flags.json = true;
    else throw new Error('Unknown option ' + arg + '\n' + USAGE);
  }
  if (flags.command === 'write' && !flags.out) throw new Error(USAGE);
  return flags;
}

// iconBase64 shrinks a 1024-pixel icon to a 96-pixel JPEG (App Store icons are opaque squares) and returns it as base64.
function iconBase64(png) {
  const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'more-apps-'));
  try {
    writeFileSync(join(dir, 'icon.png'), png);
    const done = spawnSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', '96', join(dir, 'icon.png'), '--out', join(dir, 'icon.jpg')], { encoding: 'utf8' });
    if (done.status !== 0) throw new Error('sips could not resize the icon: ' + String(done.stderr).trim());
    return readFileSync(join(dir, 'icon.jpg')).toString('base64');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main(args) {
  if (!args.length || args[0] === '--help') return console.log(USAGE);
  const flags = parseArgs(args);
  if (flags.fetch) spawnSync('git', ['-C', flags.sites, 'fetch', '-q', 'origin', 'main'], { stdio: 'inherit' });
  const catalogue = readCatalogue(flags.sites);
  if (!catalogue) throw new Error('Cannot read ' + flags.sites + ' at origin/main: clone astrojams1/app-sites there or pass --sites');
  const config = loadConfig(process.cwd());
  const self = { bundleId: config.ios && config.ios.bundleId, appStoreId: config.ios && config.ios.ascAppId };
  const apps = listFor(expectedApps(catalogue), self);
  if (flags.command === 'list') {
    if (flags.json) return console.log(JSON.stringify(apps, null, 2));
    for (const app of apps) console.log(app.id.padEnd(18) + app.name + ' - ' + app.subtitle + ' (id' + app.appStoreId + ')');
    return;
  }
  for (const app of apps) {
    const png = catalogue.gitShow('sites/' + app.site + '/src/assets/apps/' + app.slug + '/' + (app.icon || 'icon.png'), 'buffer');
    if (!png || !png.length) throw new Error('No icon for ' + app.id + ' in app-sites; the row would show a blank square');
    app.iconBase64 = iconBase64(png);
  }
  const meta = { generated: new Date().toISOString().slice(0, 10), source: 'astrojams1/app-sites ' + catalogue.commit };
  writeFileSync(flags.out, flags.lang === 'swift' ? renderSwift(apps, meta) : renderTs(apps, meta));
  console.log('Wrote ' + apps.length + ' apps (' + apps.map(app => app.id).join(', ') + ') to ' + flags.out);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
