// ledger-config.test.mjs
// The shared release ledger and configuration: evidence rules on new records, idempotent retries, history kept intact,
// release gates listed before product verification gates, stale gates flagged, configuration found from the app
// repository, and the ledger CLI run end to end in a scratch app repository.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ledger from '../../skills/app-release/scripts/ledger.mjs';
import { findConfig, manifestGroups, missingFields, normalizeConfig } from '../../skills/app-release/scripts/lib/config.mjs';
import { imagePlan, listingBody, listingProblems, mismatchedFields } from '../../skills/app-release/scripts/play.mjs';
import { pem, serviceAccountEnv } from '../../skills/app-release/scripts/lib/vault.mjs';

const LEDGER_SCRIPT = fileURLToPath(new URL('../../skills/app-release/scripts/ledger.mjs', import.meta.url));
const AT = new Date('2026-10-19T12:00:00Z');
const fresh = () => ledger.createLedger({ app: 'Example', repository: 'https://example.com/repo', objective: 'Ship 1.0 to both stores' }, AT);

test('new records follow the evidence rules', () => {
  const data = fresh();
  assert.throws(() => ledger.record(data, { gate: 'apple.review', summary: 'x', state: 'waiting_provider', basis: 'observed' }, AT), /a new gate needs --owner/);
  assert.throws(() => ledger.record(data, { gate: 'apple.review', summary: 'x', state: 'waiting_provider', owner: 'provider', basis: 'observed' }, AT), /needs --next/);
  assert.throws(() => ledger.record(data, { gate: 'apple.tax', summary: 'W-9 sent', state: 'done', owner: 'user', basis: 'user_reported', evidence: ['owner'] }, AT), /done needs --basis observed/);
  assert.throws(() => ledger.record(data, { gate: 'apple.upload', summary: 'ok', state: 'done', owner: 'agent', basis: 'observed' }, AT), /at least one --evidence/);
  assert.throws(() => ledger.record(data, { gate: 'Apple Review', summary: 'x' }, AT), /gate ids/);
  assert.throws(() => ledger.record(data, { gate: 'apple.review', summary: 'x', state: 'sent', owner: 'agent', basis: 'observed', next: 'y' }, AT), /state must be one of/);
});

test('a record carries the gate forward, an identical retry adds nothing, and history stays contiguous', () => {
  const data = fresh();
  ledger.record(data, { gate: 'apple.review', summary: 'Submitted', state: 'waiting_provider', owner: 'provider', basis: 'observed', evidence: ['submission s1'], next: 'Read status' }, AT);
  const retry = ledger.record(data, { gate: 'apple.review', summary: 'Submitted', evidence: ['submission s1'] }, new Date('2026-10-19T12:05:00Z'));
  assert.equal(retry.changed, false);
  assert.equal(data.events.length, 1);
  ledger.record(data, { gate: 'apple.review', summary: 'Approved', state: 'done', basis: 'observed', evidence: ['status read back PENDING_DEVELOPER_RELEASE'] }, AT);
  assert.equal(data.steps['apple.review'].owner, 'provider', 'owner carries over');
  assert.equal(data.steps['apple.review'].next_action, 'Read status', 'next action carries over unless cleared');
  assert.deepEqual(data.events.map(event => event.sequence), [1, 2]);
  assert.deepEqual(ledger.validate(data), { errors: [], warnings: [] });
});

test('validate separates malformed ledgers from history that predates the evidence rules', () => {
  const data = fresh();
  ledger.record(data, { gate: 'google.review', summary: 'In review', state: 'waiting_provider', owner: 'provider', basis: 'observed', next: 'Check Policy status' }, AT);
  data.steps['google.review'] = Object.assign({}, data.steps['google.review'], { owner: 'Astro' });
  data.events[0].result = data.steps['google.review'];
  assert.match(ledger.validate(data).warnings[0], /owner Astro/);
  data.events[0].sequence = 3;
  assert.match(ledger.validate(data).errors[0], /contiguous/);
});

test('the view lists release gates before product verification gates and stale gates are flagged', () => {
  const data = fresh();
  ledger.record(data, { gate: 'widget.refresh', summary: 'Needs a device check', state: 'waiting_verification', owner: 'agent', basis: 'observed', next: 'Check on a phone' }, new Date('2026-09-01T00:00:00Z'));
  ledger.record(data, { gate: 'google.closed-test', summary: '3 of 12 testers', state: 'in_progress', owner: 'user', basis: 'observed', next: 'Recruit testers' }, AT);
  const view = ledger.render(data, '`ledger.json`');
  assert.ok(view.indexOf('## Release gates') < view.indexOf('## Product verification gates'));
  assert.ok(view.indexOf('google.closed-test') < view.indexOf('widget.refresh'));
  assert.match(view, /never edit this view/);
  assert.equal(ledger.isReleaseGate('apple.review'), true);
  assert.equal(ledger.isReleaseGate('design.widget-gallery'), false);
  assert.deepEqual(ledger.staleGates(data, AT, 7), ['widget.refresh']);
  assert.match(ledger.statusLines(data, AT, 7).join('\n'), /! widget\.refresh/);
});

test('activity events carry the gate and never the full history', () => {
  const event = ledger.activityEvent({ app: 'Example' }, 'apple.upload', { state: 'done', summary: 'Build 12 VALID', next_action: '' }, 'run-1');
  assert.deepEqual([event.skill, event.event, event.status, event.targets[0]], ['app-release', 'verify', 'ok', 'Example:apple.upload']);
  assert.equal(ledger.activityEvent({ app: 'E' }, 'g', { state: 'failed', summary: 's' }, 'r').status, 'failed');
});

test('configuration is found from the app repository, with defaults filled and required fields named', () => {
  const root = mkdtempSync(join(tmpdir(), 'app-release-config-'));
  try {
    mkdirSync(join(root, 'apps', 'client'), { recursive: true });
    writeFileSync(join(root, 'app-release.config.json'), '{}');
    assert.equal(findConfig(join(root, 'apps', 'client'), {}), join(root, 'app-release.config.json'));
    assert.throws(() => findConfig(tmpdir(), { APP_RELEASE_CONFIG: 'missing.json' }), /does not exist/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  assert.throws(() => normalizeConfig({ app: 'E' }, '/repo/app-release.config.json'), /lacks slug, ledger/);
  const config = normalizeConfig({ app: 'E', slug: 'e', ledger: { gates: 'store/ledger.json', view: 'store/ledger.md' }, projectDir: 'apps/client',
    ios: { ascAppId: '1', bundleId: 'b', teamId: 't', scheme: 'E', buildNumberEnv: 'E_BUILD' }, android: { package: 'p' } }, '/repo/app-release.config.json');
  assert.equal(config.projectDir, '/repo/apps/client');
  assert.equal(config.ledger.gates, '/repo/store/ledger.json');
  assert.equal(config.ios.workspace, 'E.xcworkspace');
  assert.equal(config.ios.testflightGroup, 'Release QA');
  assert.equal(config.android.minTargetSdk, 36);
  assert.deepEqual(missingFields('android', config.android), ['vault', 'versionCodeEnv', 'artifactName']);
});

test('an asset manifest becomes screenshot groups and Play image lists', () => {
  const entries = [
    { file: 'assets/apple/iphone/01.png', platform: 'ios', displayType: 'APP_IPHONE_67' },
    { file: 'assets/apple/ipad/01.png', platform: 'ios', displayType: 'APP_IPAD_PRO_3GEN_129' },
    { file: 'assets/apple/iphone/02.png', platform: 'ios', displayType: 'APP_IPHONE_67' },
    { file: 'assets/google-play/phone/02.png', platform: 'android' },
    { file: 'assets/google-play/phone/01.png', platform: 'android' }
  ];
  assert.deepEqual(manifestGroups(entries, 'ios', 'store'), [
    { displayType: 'APP_IPHONE_67', files: ['store/assets/apple/iphone/01.png', 'store/assets/apple/iphone/02.png'] },
    { displayType: 'APP_IPAD_PRO_3GEN_129', files: ['store/assets/apple/ipad/01.png'] }
  ]);
  const images = imagePlan({ icon: 'store/icon.png', phoneScreenshots: { manifest: 'm.json', base: 'store', prefix: 'assets/google-play/phone/' } }, () => entries);
  assert.deepEqual(images, { icon: ['store/icon.png'], phoneScreenshots: ['store/assets/google-play/phone/01.png', 'store/assets/google-play/phone/02.png'] });
  assert.throws(() => imagePlan({ phoneScreenshots: ['one.png'] }), /2 to 8 phoneScreenshots/);
  assert.throws(() => imagePlan({ banner: 'b.png' }), /Unknown Play image type/);
});

test('Play listing text is checked against Play\'s limits and read back field by field', () => {
  assert.deepEqual(listingProblems({ title: 'T', shortDescription: 'S', fullDescription: 'F' }), []);
  assert.match(listingProblems({ title: 'x'.repeat(31), shortDescription: 'S' }).join(';'), /title is 31 characters.*fullDescription is missing/);
  assert.deepEqual(listingBody({ title: 'T', shortDescription: 'S', fullDescription: 'F' }), { language: 'en-US', title: 'T', shortDescription: 'S', fullDescription: 'F' });
  assert.deepEqual(mismatchedFields({ title: 'T', fullDescription: 'F' }, { title: 'T', fullDescription: 'G' }), ['fullDescription']);
});

test('the vault token loses its OP_KEY= prefix and a .p8 body regains its armor', () => {
  assert.equal(serviceAccountEnv({ OP_KEY: 'OP_KEY=ops_abc' }).OP_SERVICE_ACCOUNT_TOKEN, 'ops_abc');
  assert.equal(serviceAccountEnv({ OP_KEY: 'ops_abc', OP_SERVICE_ACCOUNT_TOKEN: 'kept' }).OP_SERVICE_ACCOUNT_TOKEN, 'kept');
  const body = 'A'.repeat(100);
  const key = pem(body);
  assert.match(key, /^-----BEGIN PRIVATE KEY-----\nA{64}\nA{36}\n-----END PRIVATE KEY-----\n$/);
  assert.equal(pem(key), key);
});

test('the ledger CLI initializes, records, renders and checks inside an app repository', () => {
  const root = mkdtempSync(join(tmpdir(), 'app-release-ledger-'));
  try {
    mkdirSync(join(root, 'store'));
    writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example', repository: 'https://example.com/r',
      ledger: { gates: 'store/ledger.json', view: 'store/ledger.md' }, ios: {} }));
    const run = args => spawnSync(process.execPath, [LEDGER_SCRIPT].concat(args), { cwd: root, encoding: 'utf8', env: Object.assign({}, process.env, { APP_RELEASE_CONFIG: '' }) });
    assert.equal(run(['init', '--objective', 'Ship 1.0']).status, 0);
    assert.notEqual(run(['init', '--objective', 'Again']).status, 0, 'init never overwrites');
    const recorded = run(['record', '--gate', 'apple.upload', '--state', 'done', '--owner', 'agent', '--basis', 'observed', '--summary', 'Build 3 VALID', '--evidence', 'asc status']);
    assert.equal(recorded.status, 0, recorded.stderr);
    assert.match(run(['record', '--gate', 'apple.upload', '--summary', 'Build 3 VALID', '--evidence', 'asc status']).stdout, /No change/);
    assert.equal(run(['check']).status, 0);
    assert.equal(run(['validate']).status, 0);
    const data = JSON.parse(readFileSync(join(root, 'store/ledger.json'), 'utf8'));
    assert.deepEqual(data.platforms, ['web', 'ios']);
    assert.equal(data.events.length, 1);
    writeFileSync(join(root, 'store/ledger.md'), 'edited by hand');
    assert.notEqual(run(['check']).status, 0, 'a hand-edited view fails check');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
