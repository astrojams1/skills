#!/usr/bin/env node
// privacy-label.mjs
// Compares what an app collects (its privacy manifests), what its App Privacy answers should be (store data
// `appPrivacy.collected`) and what the App Store actually publishes (the product page's App Privacy section, read
// from the public page because Apple has no API for these answers). `asc.mjs submit` runs the same gate.
// Run from the app repository, except `read`.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.mjs';
import { loadCatalog } from './lib/standards.mjs';
import { CONFIRMATION_DAYS, CONFIRMATION_ROOT, describeType, expectedLabel, labelGate, manifestCollection, readPublishedLabel, storeShape, writeConfirmation } from './lib/privacy-label.mjs';

const USAGE = 'Usage: node skills/skills/app-release/scripts/privacy-label.mjs <command>\n'
  + '  check [--json]             manifest, appPrivacy.collected and the published label agree; nonzero exit when they do not\n'
  + '  read <App Store id>...     print the label the App Store publishes for each app (no app repository needed)\n'
  + '  init [--write]             print appPrivacy.collected from the privacy manifest; --write adds it to the store data when absent\n'
  + '  confirm --evidence <text>  after publishing in App Store Connect and reading the App Privacy page back there, record that\n'
  + '                             the expected answers are published, for the hours before the public page shows them\n'
  + '                             (kept ' + CONFIRMATION_DAYS + ' days in ' + CONFIRMATION_ROOT + ')';

const line = entry => describeType(entry.type) + ': ' + entry.purposes.join(', ') + '; ' + (entry.linked ? 'linked' : 'not linked') + '; ' + (entry.tracking ? 'tracking' : 'not tracking')
  + (entry.notInManifest ? ' (not in manifest: ' + entry.notInManifest + ')' : '');
const block = entries => (entries.length ? entries.map(entry => '    ' + line(entry)).join('\n') : '    Data Not Collected');

function report(config, result) {
  const lines = ['App Privacy: ' + config.app + (config.ios?.ascAppId ? ' (' + config.ios.ascAppId + ')' : '')];
  lines.push('  Privacy manifests: ' + (result.manifest.sources.join(', ') || 'none'), block(result.manifest.entries));
  lines.push('  Expected (store data appPrivacy.collected):', result.expected ? block(result.expected.entries) : '    none written');
  if (result.published) lines.push('  Published (' + result.published.url + ', read ' + result.published.readAt + '):', result.published.notCollected ? '    Data Not Collected' : block(result.published.entries));
  else if (result.readError) lines.push('  Published: could not be read (' + result.readError + ')');
  if (result.confirmation) lines.push('  Confirmed in App Store Connect at ' + result.confirmation.confirmedAt + ': ' + result.confirmation.evidence);
  for (const note of result.notes) lines.push('  note: ' + note);
  lines.push(result.problems.length ? '  FAIL\n' + result.problems.map(problem => '   - ' + problem).join('\n') : '  pass');
  return lines.join('\n');
}

async function main(args) {
  const command = args[0];
  if (!command || command === '--help') return console.log(USAGE);
  if (command === 'read') {
    if (args.length < 2) throw new Error(USAGE);
    for (const id of args.slice(1)) {
      const label = await readPublishedLabel(id);
      console.log(id + ' (' + label.url + '):\n' + (label.notCollected ? '    Data Not Collected' : block(label.entries)));
      if (label.unknown.length) console.log('    unknown: ' + label.unknown.join(', '));
    }
    return;
  }
  const config = loadConfig(process.cwd());
  const store = JSON.parse(readFileSync(config.storeData, 'utf8'));
  const scan = loadCatalog().scan;
  if (command === 'check') {
    const result = await labelGate(config, store, scan);
    if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
    else console.log(report(config, result));
    if (result.problems.length) process.exitCode = 1;
    return;
  }
  if (command === 'init') {
    const manifest = manifestCollection(config, scan);
    if (manifest.problems.length) throw new Error(manifest.problems.join('; '));
    const collected = storeShape(manifest.entries);
    console.log(JSON.stringify({ appPrivacy: { collected } }, null, 2));
    if (!args.includes('--write')) return;
    if (store.appPrivacy) throw new Error('The store data already has appPrivacy; edit it by hand.');
    store.appPrivacy = { collected };
    writeFileSync(config.storeData, JSON.stringify(store, null, 2) + '\n');
    console.log('Wrote appPrivacy to ' + config.storeData + '; add a `why` to each entry.');
    return;
  }
  if (command === 'confirm') {
    const at = args.indexOf('--evidence');
    const evidence = at > 0 ? args[at + 1] : '';
    if (!evidence || evidence.trim().length < 20) throw new Error('confirm needs --evidence: what App Store Connect showed and where it is kept (a screenshot path, the page\'s Published line).');
    const expected = expectedLabel(store);
    if (!expected || expected.problems.length) throw new Error('The store data has no valid appPrivacy.collected to confirm.');
    if (!config.ios?.ascAppId) throw new Error('The config has no ios.ascAppId.');
    const path = writeConfirmation(config.ios.ascAppId, { app: config.app, appStoreId: config.ios.ascAppId, confirmedAt: new Date().toISOString(), evidence: evidence.trim(), entries: expected.entries });
    console.log('Recorded the App Store Connect confirmation in ' + path + '; `check` and `asc.mjs submit` accept it for ' + CONFIRMATION_DAYS + ' days while the public page catches up.');
    return;
  }
  throw new Error(USAGE);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
