import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { archiveProvenance, claim, finish, mapRepo, recordedProvenance, splitPaths } from '../../skills/app-release/scripts/review-sweep.mjs';
import { liveVersion, occupancy, unattended, unattendedSubmitRefusal } from '../../skills/app-release/scripts/lib/review-state.mjs';

const version = (id, versionString, state, createdDate, releaseType = 'MANUAL') => ({ id, attributes: { versionString, appVersionState: state, createdDate, releaseType } });
const submission = (id, state) => ({ id, attributes: { state } });
const live = version('a', '1.0', 'READY_FOR_DISTRIBUTION', '2026-01-01');

test('an app that never launched has no live version', () => {
  assert.equal(liveVersion([version('a', '1.0', 'WAITING_FOR_REVIEW', '2026-01-01')]), null);
});

test('the newest public version is the live one', () => {
  assert.equal(liveVersion([live, version('b', '1.1', 'READY_FOR_SALE', '2026-02-01')]).id, 'b');
});

for (const state of ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'REJECTED', 'SOME_NEW_APPLE_STATE']) {
  test('a newer version in ' + state + ' occupies the app', () => {
    assert.equal(occupancy([live, version('b', '1.1', state, '2026-02-01')], []).length, 1);
  });
}

test('a draft next version leaves the app free', () => {
  assert.deepEqual(occupancy([live, version('b', '1.1', 'PREPARE_FOR_SUBMISSION', '2026-02-01')], [submission('s', 'COMPLETE')]), []);
});

for (const state of ['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES', 'CANCELING', 'COMPLETING']) {
  test('a ' + state + ' submission occupies the app', () => {
    assert.equal(occupancy([live], [submission('s', state)]).length, 1);
  });
}

test('unattended submit refuses anything that approval could publish', () => {
  for (const type of ['AFTER_APPROVAL', 'SCHEDULED']) {
    const draft = version('b', '1.1', 'PREPARE_FOR_SUBMISSION', '2026-02-01', type);
    assert.match(unattendedSubmitRefusal(draft, [live, draft], []), /MANUAL/);
  }
});

test('unattended submit may fill its own draft submission but not an unresolved one', () => {
  const draft = version('b', '1.1', 'PREPARE_FOR_SUBMISSION', '2026-02-01');
  assert.equal(unattendedSubmitRefusal(draft, [live, draft], [submission('s', 'READY_FOR_REVIEW')]), null);
  assert.match(unattendedSubmitRefusal(draft, [live, draft], [submission('s', 'UNRESOLVED_ISSUES')]), /UNRESOLVED_ISSUES/);
});

test('the guard is on only when the sweep sets it', () => {
  assert.equal(unattended({}), false);
  assert.equal(unattended({ APP_RELEASE_UNATTENDED: '1' }), true);
});

test('maintenance paths are not product changes', () => {
  const { product, other } = splitPaths(['README.md', 'docs/a.txt', '.github/ci.yml', 'store/store.json', 'skills', 'tests/a.js', 'src/a.test.ts', 'src/App.tsx', 'ios/App/Info.plist'], '.');
  assert.deepEqual(product, ['src/App.tsx', 'ios/App/Info.plist']);
  assert.equal(other.length, 7);
});

test('a subdirectory app counts only its own directory', () => {
  assert.deepEqual(splitPaths(['server/api.js', 'apps/client/src/a.tsx', 'apps/client/README.md'], 'apps/client').product, ['apps/client/src/a.tsx']);
});

test('provenance needs the exact clean build', () => {
  const summary = { commit: 'a'.repeat(40), dirty: false, bundleId: 'x', version: '1.0', build: 3 };
  const expected = { bundleId: 'x', version: '1.0', build: '3' };
  assert.equal(archiveProvenance(summary, expected).commit, summary.commit);
  assert.match(archiveProvenance({ ...summary, dirty: true }, expected).problem, /dirty/);
  assert.match(archiveProvenance({ ...summary, build: 4 }, expected).problem, /build/);
  assert.match(archiveProvenance({ ...summary, commit: 'abc' }, expected).problem, /commit/);
  assert.ok(archiveProvenance(null, expected).problem);
});

test('a repository maps only when id, bundle and team all agree', () => {
  const entry = (ascAppId, bundleId, teamId) => ({ dir: ascAppId + bundleId, config: { ios: { ascAppId, bundleId, teamId } } });
  const app = { id: '1', attributes: { bundleId: 'b' } };
  assert.ok(mapRepo([entry('1', 'b', 'T')], app, 'T').repo);
  assert.ok(mapRepo([entry('1', 'b', 'OTHER')], app, 'T').problem);
  assert.ok(mapRepo([entry('1', 'b', 'T'), entry('2', 'b', 'T')], app, 'T').problem);
  assert.match(mapRepo([], app, 'T').problem, /no repository/);
});

test('a claim is exclusive and a submitted key never runs twice', () => {
  const root = mkdtempSync(join(tmpdir(), 'sweep-'));
  assert.ok(claim(root, '1', '1.1-abc', 'run-a').ok);
  assert.match(claim(root, '1', '1.1-abc', 'run-b').reason, /run-a/);
  assert.equal(finish(root, '1', '1.1-abc', 'run-b', 'submitted').ok, false);
  assert.ok(finish(root, '1', '1.1-abc', 'run-a', 'submitted').ok);
  assert.equal(claim(root, '1', '1.1-abc', 'run-c').reason, 'already submitted');
});

test('a deferred key can retry and a stale lock is taken over', () => {
  const root = mkdtempSync(join(tmpdir(), 'sweep-'));
  claim(root, '1', 'k', 'run-a');
  finish(root, '1', 'k', 'run-a', 'deferred');
  assert.ok(claim(root, '1', 'k', 'run-b').ok);
  const old = new Date(Date.now() - 13 * 3600 * 1000);
  utimesSync(join(root, 'locks', '1'), old, old);
  assert.ok(claim(root, '1', 'k', 'run-c').ok);
});

test('a recorded build must be the live build, with evidence, and shows what it cannot prove', () => {
  const saved = { appleBuildId: 'b', commit: 'a'.repeat(40), evidence: ['eas'] };
  assert.equal(recordedProvenance(saved, 'b').cleanTree, 'unproven');
  assert.equal(recordedProvenance({ ...saved, cleanTree: true }, 'b').cleanTree, 'proven');
  assert.ok(recordedProvenance(saved, 'other').problem);
  assert.ok(recordedProvenance({ ...saved, cleanTree: false }, 'b').problem);
  assert.ok(recordedProvenance({ ...saved, evidence: [] }, 'b').problem);
  assert.ok(recordedProvenance({ ...saved, commit: 'f9ffa29' }, 'b').problem);
});

for (const command of ['release', 'withdraw', 'pricing']) {
  test('the real CLI refuses ' + command + ' when unattended, before reading anything', () => {
    const script = new URL('../../skills/app-release/scripts/asc.mjs', import.meta.url).pathname;
    const result = spawnSync(process.execPath, [script, command, '--confirm'], { encoding: 'utf8', cwd: tmpdir(), env: { ...process.env, APP_RELEASE_UNATTENDED: '1' } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refused in an unattended run/);
  });
}
