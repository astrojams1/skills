import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { archiveProvenance, claim, contentOnHead, finish, listingChanges, liveAppInfo, mapRepo, recordedProvenance, splitPaths } from '../../skills/app-release/scripts/review-sweep.mjs';
import { liveVersion, occupancy, releaseTypeRefusal, unattended, unattendedSubmitRefusal } from '../../skills/app-release/scripts/lib/review-state.mjs';

const version = (id, versionString, state, createdDate, releaseType = 'AFTER_APPROVAL') => ({ id, attributes: { versionString, appVersionState: state, createdDate, releaseType } });
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

test('unattended submit refuses anything approval would not release', () => {
  for (const type of ['MANUAL', 'SCHEDULED']) {
    const draft = version('b', '1.1', 'PREPARE_FOR_SUBMISSION', '2026-02-01', type);
    assert.match(unattendedSubmitRefusal(draft, [live, draft], []), /AFTER_APPROVAL/);
  }
});

test('no run submits a version approval would not release', () => {
  assert.equal(releaseTypeRefusal(version('d', '1.1', 'PREPARE_FOR_SUBMISSION', '2026-02-01')), null);
  assert.match(releaseTypeRefusal(version('d', '1.1', 'PREPARE_FOR_SUBMISSION', '2026-02-01', 'MANUAL')), /AFTER_APPROVAL/);
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

test('a merged subtitle or keyword change is a reason to ship; promotional text and release notes are not', () => {
  const live = { name: 'Space Worms: Swarm', subtitle: 'Grow, boost, survive the swarm', keywords: 'worm,io', promotionalText: 'Old', whatsNew: 'Old notes' };
  assert.deepEqual(listingChanges({ ...live, subtitle: 'Multiplayer worm game, no ads', keywords: 'io,arena' }, live), ['subtitle', 'keywords']);
  assert.deepEqual(listingChanges({ ...live, promotionalText: 'New', whatsNew: 'New notes' }, live), []);
  assert.deepEqual(listingChanges({ ...live, subtitle: ' Grow, boost, survive the swarm ' }, live), []);
  assert.deepEqual(listingChanges({ subtitle: '' }, live), [], 'an empty field in store data is not a change');
});

test('the live App Info is the one the storefront shows, not the draft', () => {
  const info = (id, state) => ({ id, attributes: { state } });
  assert.equal(liveAppInfo([info('draft', 'PREPARE_FOR_SUBMISSION'), info('live', 'READY_FOR_DISTRIBUTION')]).id, 'live');
  assert.equal(liveAppInfo([{ id: 'old', attributes: { appStoreState: 'READY_FOR_SALE' } }]).id, 'old');
  assert.equal(liveAppInfo([info('a', 'PREPARE_FOR_SUBMISSION'), info('b', 'WAITING_FOR_REVIEW')]), null);
});

// A scratch repository: main and a release branch from one base. `write` takes { path: text or null to delete }.
function scratchRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'sweep-ancestry-'));
  const run = (...args) => {
    const result = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const commit = (message, files) => {
    for (const [path, text] of Object.entries(files)) {
      if (text === null) rmSync(join(dir, path));
      else writeFileSync(join(dir, path), text);
    }
    run('add', '-A');
    run('commit', '-q', '--allow-empty', '-m', message);
    return run('rev-parse', 'HEAD');
  };
  run('init', '-q', '-b', 'main');
  commit('base', { 'app.json': '{"version":"1.0"}\n', 'screen.js': 'one\ntwo\nthree\n', 'README.md': 'readme\n' });
  run('checkout', '-q', '-b', 'release');
  commit('feature', { 'screen.js': 'one\nTWO\nthree\n', 'icon.txt': 'icon\n' });
  const live = commit('bump', { 'app.json': '{"version":"1.1"}\n' });
  run('checkout', '-q', 'main');
  return { dir, run, commit, live, done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('a live commit that is an ancestor of main passes as before', () => {
  const repo = scratchRepo();
  try {
    repo.run('merge', '-q', '--no-ff', '-m', 'merge release', 'release');
    assert.deepEqual(contentOnHead(repo.dir, repo.live, 'main'), { ancestor: true });
  } finally { repo.done(); }
});

test('a squash-merged release whose content is on main is a candidate and says why', () => {
  const repo = scratchRepo();
  try {
    repo.run('merge', '-q', '--squash', 'release');
    repo.run('commit', '-q', '-m', 'squash release');
    repo.commit('unrelated docs', { 'README.md': 'readme, longer\n' });
    const result = contentOnHead(repo.dir, repo.live, 'main');
    assert.equal(result.problem, undefined);
    assert.equal(result.ancestor, false);
    assert.match(result.note, /not an ancestor of main \(squash-merged or rebased\), but its changes to 3 files .* are all on main/);
  } finally { repo.done(); }
});

test('a squash-merged release passes when main has since edited the same lines again', () => {
  const repo = scratchRepo();
  try {
    repo.run('merge', '-q', '--squash', 'release');
    repo.run('commit', '-q', '-m', 'squash release');
    repo.commit('next version', { 'app.json': '{"version":"1.2"}\n' });
    const result = contentOnHead(repo.dir, repo.live, 'main');
    assert.equal(result.problem, undefined);
    assert.deepEqual(result.changedSince, ['app.json']);
    assert.match(result.note, /landed on main at [0-9a-f]{8}; 1 file \(app\.json\) changed again/);
  } finally { repo.done(); }
});

test('a squash-merged release that main then reverted still defers and names the files', () => {
  const repo = scratchRepo();
  try {
    repo.run('merge', '-q', '--squash', 'release');
    repo.run('commit', '-q', '-m', 'squash release');
    repo.run('revert', '--no-edit', 'HEAD');
    const result = contentOnHead(repo.dir, repo.live, 'main');
    assert.match(result.problem, /has since put back 3 files \(app\.json, icon\.txt, screen\.js\) as they were before it/);
    assert.deepEqual(result.missing, ['app.json', 'icon.txt', 'screen.js']);
  } finally { repo.done(); }
});

test('a release that reached main only in part still defers and names what is missing', () => {
  const repo = scratchRepo();
  try {
    repo.commit('partial squash', { 'screen.js': 'one\nTWO\nthree\n', 'app.json': '{"version":"1.1"}\n' });
    const result = contentOnHead(repo.dir, repo.live, 'main');
    assert.match(result.problem, /no commit on main since [0-9a-f]{8} holds all of its changes; missing from main: 1 file \(icon\.txt\)/);
    assert.deepEqual(result.missing, ['icon.txt']);
  } finally { repo.done(); }
});

test('a squash-merged release with one file reverted later still defers on that file', () => {
  const repo = scratchRepo();
  try {
    repo.run('merge', '-q', '--squash', 'release');
    repo.run('commit', '-q', '-m', 'squash release');
    repo.commit('drop the feature', { 'screen.js': 'one\ntwo\nthree\n' });
    const result = contentOnHead(repo.dir, repo.live, 'main');
    assert.deepEqual(result.missing, ['screen.js']);
  } finally { repo.done(); }
});

test('a live commit with no history in common with main defers', () => {
  const repo = scratchRepo();
  try {
    repo.run('checkout', '-q', '--orphan', 'other');
    const orphan = repo.commit('orphan', { 'README.md': 'other\n' });
    assert.match(contentOnHead(repo.dir, orphan, 'main').problem, /shares no history/);
  } finally { repo.done(); }
});
