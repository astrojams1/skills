// shorts.test.mjs
// The app-shorts registry: roster discovery prefers main checkouts, the calendar rotates apps by cadence and says
// which due apps have nothing ready, and due() finds the reads and go-lives a run must act on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { roster, sync, record, plan, due, link, status, emptyRegistry } from '../../skills/app-shorts/scripts/shorts.mjs';

test('roster reads app-release configs and prefers a main checkout over its worktrees', () => {
  const code = mkdtempSync(join(tmpdir(), 'shorts-code-'));
  try {
    const app = (dir, gitDir) => {
      mkdirSync(join(code, dir), { recursive: true });
      writeFileSync(join(code, dir, 'app-release.config.json'), JSON.stringify({ app: 'Füd', slug: 'fud', type: 'health-fitness', ios: { bundleId: 'com.example.fud', teamId: 'TEAM1', ascAppId: '123' } }));
      if (gitDir) mkdirSync(join(code, dir, '.git')); else writeFileSync(join(code, dir, '.git'), 'gitdir: elsewhere');
    };
    app('fud-worktree', false);
    app('fud', true);
    mkdirSync(join(code, 'not-an-app'));
    const apps = roster(code);
    assert.equal(apps.length, 1);
    assert.equal(apps[0].repository, join(code, 'fud'));
    assert.equal(apps[0].ascAppId, '123');
  } finally {
    rmSync(code, { recursive: true, force: true });
  }
});

test('sync adds new apps and leaves existing ones alone', () => {
  const registry = emptyRegistry();
  registry.apps.fud = { name: 'Füd', cadenceDays: 3, formats: ['meal'] };
  const added = sync(registry, [{ slug: 'fud', name: 'X' }, { slug: 'rhythm', name: 'Rhythm', type: 'music', team: 'T2', ascAppId: '9' }]);
  assert.deepEqual(added, ['rhythm']);
  assert.equal(registry.apps.fud.cadenceDays, 3);
  assert.equal(registry.apps.rhythm.cadenceDays, 7);
});

test('record adds then merges by id and rejects unknown statuses', () => {
  const registry = emptyRegistry();
  record(registry, { id: 'fud-crusts', app: 'fud', status: 'rendered', title: 'Crusts' });
  record(registry, { id: 'fud-crusts', app: 'fud', status: 'live', videoId: 'abc' });
  assert.equal(registry.episodes.length, 1);
  assert.equal(registry.episodes[0].title, 'Crusts');
  assert.equal(registry.episodes[0].videoId, 'abc');
  assert.throws(() => record(registry, { id: 'x', app: 'fud', status: 'viral' }), /Unknown status/);
});

test('record warns when a music bed or hook repeats one of the recent Shorts', () => {
  const registry = emptyRegistry();
  record(registry, { id: 'a', app: 'fud', status: 'live', postedAt: '2026-11-01T00:00:00Z', music: '112-F-p0-m0-f0', hook: 'Do your kids’ crusts count?' });
  const same = record(registry, { id: 'b', app: 'fud', status: 'rendered', music: '112-F-p0-m0-f0', hook: 'One dinner. Three people.' });
  assert.equal(same.warnings.length, 1);
  assert.match(same.warnings[0], /music bed as a/);
  const fresh = record(registry, { id: 'c', app: 'fud', status: 'rendered', music: '96-C-p2-m1-f1', hook: 'Parent lunch' });
  assert.deepEqual(fresh.warnings, []);
});

test('plan gives each slot to the most overdue app with a ready episode and flags the rest', () => {
  const registry = emptyRegistry();
  registry.apps = { fud: { cadenceDays: 2 }, rhythm: { cadenceDays: 7 }, nametag: { cadenceDays: 7, active: false } };
  registry.episodes = [
    { id: 'f1', app: 'fud', status: 'live', postedAt: '2026-11-01T17:00:00Z' },
    { id: 'f2', app: 'fud', status: 'rendered', title: 'Dinner' },
    { id: 'f3', app: 'fud', status: 'rendered', title: 'Leftovers' },
  ];
  const { slots, needsProduction } = plan(registry, { now: new Date('2026-11-04T09:00:00Z'), days: 4, gap: 1 });
  assert.deepEqual(slots.map(s => [s.date, s.episode]), [['2026-11-04', 'f2'], ['2026-11-06', 'f3']]);
  assert.deepEqual(needsProduction, ['rhythm'], 'rhythm has never posted and has nothing ready; nametag is inactive');
});

test('plan keeps a gap of days between the channel\'s Shorts, scheduled ones included', () => {
  const registry = emptyRegistry();
  registry.apps = { fud: { cadenceDays: 0 }, rhythm: { cadenceDays: 0 } };
  registry.episodes = [
    { id: 's', app: 'fud', status: 'scheduled', publishAt: '2026-11-04T17:00:00Z' },
    { id: 'r1', app: 'fud', status: 'rendered' },
    { id: 'r2', app: 'rhythm', status: 'rendered' },
  ];
  const { slots } = plan(registry, { now: new Date('2026-11-04T09:00:00Z'), days: 7, gap: 2 });
  assert.deepEqual(slots.map(s => s.date), ['2026-11-06', '2026-11-08']);
});

test('due finds go-lives and the first missing read, oldest window first', () => {
  const registry = emptyRegistry();
  registry.episodes = [
    { id: 'a', app: 'fud', status: 'live', postedAt: '2026-10-25T00:00:00Z', metrics: [{ at: '2026-10-28T01:00:00Z' }] },
    { id: 'b', app: 'fud', status: 'scheduled', publishAt: '2026-11-03T17:00:00Z' },
    { id: 'c', app: 'fud', status: 'live', postedAt: '2026-11-03T00:00:00Z' },
  ];
  const { live, reads } = due(registry, { now: new Date('2026-11-04T12:00:00Z') });
  assert.deepEqual(live.map(l => l.episode), ['b']);
  assert.deepEqual(reads.map(r => [r.episode, r.read]), [['a', '7d']]);
});

test('link adds the provider token when the team has one', () => {
  const registry = emptyRegistry();
  registry.apps.fud = { ascAppId: '6739075763', team: 'AYCDG243RJ' };
  assert.deepEqual(link(registry, 'fud', 'yt-crusts'), { url: 'https://apps.apple.com/app/id6739075763?ct=yt-crusts&mt=8', attributed: false });
  registry.teams.AYCDG243RJ = { providerToken: '118' };
  assert.equal(link(registry, 'fud', 'yt-crusts').url, 'https://apps.apple.com/app/id6739075763?pt=118&ct=yt-crusts&mt=8');
});

test('status summarises each app', () => {
  const registry = emptyRegistry();
  registry.apps = { fud: { cadenceDays: 7, formats: ['meal'] } };
  registry.episodes = [{ id: 'a', app: 'fud', status: 'live', postedAt: '2026-11-04T00:00:00Z' }, { id: 'b', app: 'fud', status: 'idea' }];
  const [fud] = status(registry, { now: new Date('2026-11-05T00:00:00Z') });
  assert.equal(fud.live, 1);
  assert.equal(fud.idea, 1);
  assert.equal(fud.nextDue, '2026-11-11');
});
