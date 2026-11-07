import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLedger, record, issueReport, render, statusLines, STATES, parseFlags } from '../../skills/app-release/scripts/ledger.mjs';

const AT = new Date('2026-10-25T12:00:00Z');
const fresh = () => createLedger({ app: 'Example', objective: 'Release', platforms: ['ios'] }, AT);
const issue = (data, extra = {}) => record(data, { gate: 'issue.launcher', state: 'in_progress', owner: 'agent', basis: 'observed',
  summary: 'Launcher rejected', evidence: ['diagnostic.json'], next: 'Verify original launcher', ...extra }, AT);
const SCRIPT = fileURLToPath(new URL('../../skills/app-release/scripts/ledger.mjs', import.meta.url));

// Checks exercise real ledger state transitions and the CLI without provider access.
test('every unfinished issue state blocks completion, including external owners', () => {
  for (const state of STATES.filter(state => !['done', 'not_applicable'].includes(state))) {
    for (const owner of ['agent', 'user', 'provider']) {
      const data = fresh(); issue(data, { state, owner });
      assert.equal(issueReport(data).open.length, 1, state + '/' + owner);
    }
  }
});

test('verified closure preserves the original failure and reopening blocks again', () => {
  const data = fresh(); issue(data, { state: 'failed' });
  issue(data, { state: 'done', summary: 'Original launcher verified; modified copy rejected', evidence: ['guard-results.json'], next: '' });
  assert.equal(issueReport(data).open.length, 0);
  assert.deepEqual(issueReport(data).errors, []);
  assert.equal(data.events[0].result.state, 'failed');
  assert.equal(data.events[0].result.summary, 'Launcher rejected');
  assert.equal(data.events[1].result.state, 'done');
  issue(data, { summary: 'Failure recurred' });
  assert.equal(issueReport(data).open.length, 1);
  assert.equal(data.events.length, 3);
});

test('recording closed issues cannot bypass evidence through not_applicable or blank references', () => {
  for (const state of ['done', 'not_applicable']) {
    for (const evidence of [[], [''], ['   '], 'not-an-array', [null]]) {
      assert.throws(() => issue(fresh(), { state, evidence }), /observed|evidence/);
    }
    assert.throws(() => issue(fresh(), { state, basis: 'inferred' }), /observed/);
    assert.throws(() => issue(fresh(), { state, summary: '   ' }), /nonblank/);
  }
  const data = fresh();
  issue(data, { state: 'not_applicable', summary: 'False alarm: original launcher passes both checks', evidence: ['reproduction.json'] });
  assert.deepEqual(issueReport(data).errors, []);
});

test('legacy closed claims and exclusions do not silently pass without verified evidence', () => {
  for (const change of [{ basis: 'inferred' }, { evidence: [] }, { evidence: [' '] }, { evidence: {} }, { summary: ' ' }]) {
    for (const state of ['done', 'not_applicable']) {
      const data = fresh(); issue(data);
      const step = { ...data.steps['issue.launcher'], state, ...change };
      data.steps['issue.launcher'] = step; data.events[0].result = step;
      assert.ok(issueReport(data).errors.length, JSON.stringify(change));
    }
  }
});

test('malformed or rewritten issue history cannot produce a clean completion check', () => {
  const data = fresh(); issue(data);
  data.steps['issue.launcher'] = { ...data.steps['issue.launcher'], state: 'done' };
  assert.match(issueReport(data).errors.join('\n'), /latest event/);
});

test('failed and uncertain release gates cannot hide behind zero logged issues', () => {
  for (const state of ['failed', 'uncertain']) {
    const data = fresh();
    record(data, { gate: 'apple.upload', state, owner: 'agent', basis: 'observed', summary: 'Upload not verified', next: 'Read provider state' }, AT);
    assert.match(issueReport(data).errors.join('\n'), /untriaged/);
  }
  const data = fresh();
  record(data, { gate: 'apple.review', state: 'waiting_provider', owner: 'provider', basis: 'observed', summary: 'Waiting for review', next: 'Read status' }, AT);
  assert.deepEqual(issueReport(data).errors, [], 'normal review processing is not itself an execution defect');
});

test('issue summaries are visible separately from product checks', () => {
  const data = fresh(); issue(data);
  assert.match(render(data), /Run issues[\s\S]*issue\.launcher/);
  assert.match(statusLines(data, AT, 7).join('\n'), /Run issues[\s\S]*Verify original launcher/);
  assert.throws(() => parseFlags(['--ignore', '1'], 'issues'), /not an option/);
});

test('real CLI fails on open issues, passes only verified closure, and leaves files unchanged', () => {
  const root = mkdtempSync(join(tmpdir(), 'release-issues-'));
  try {
    mkdirSync(join(root, 'store'));
    writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example', ledger: { gates: 'store/ledger.json', view: 'store/ledger.md' } }));
    const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, APP_RELEASE_CONFIG: '', APP_RELEASE_SKIP_FRESHNESS: '1' } });
    assert.equal(run(['init', '--objective', 'Release']).status, 0);
    const empty = run(['issues']); assert.equal(empty.status, 0); assert.match(empty.stdout, /No recorded issues/);
    assert.match(empty.stdout, /Reconcile/);
    const open = run(['record', '--gate', 'issue.launcher', '--state', 'failed', '--owner', 'agent', '--basis', 'observed', '--summary', 'Launcher rejected', '--next', 'Verify original']);
    assert.equal(open.status, 0, open.stderr);
    const paths = [join(root, 'store/ledger.json'), join(root, 'store/ledger.md')];
    const before = paths.map(path => readFileSync(path, 'utf8'));
    const blocked = run(['issues']); assert.equal(blocked.status, 1); assert.match(blocked.stderr, /unresolved issue/);
    assert.deepEqual(paths.map(path => readFileSync(path, 'utf8')), before);
    assert.equal(run(['validate']).status, 0, 'structural validity is distinct from closure');
    const closed = run(['record', '--gate', 'issue.launcher', '--state', 'done', '--summary', 'Original signature verified', '--evidence', 'guard.json', '--next', '']);
    assert.equal(closed.status, 0, closed.stderr);
    assert.equal(run(['issues']).status, 0);
    const history = JSON.parse(readFileSync(paths[0], 'utf8')).events;
    assert.deepEqual(history.map(event => event.result.state), ['failed', 'done']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
