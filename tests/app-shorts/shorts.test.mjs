// shorts.test.mjs
// The app-shorts registry: roster discovery prefers main checkouts, the calendar rotates apps by cadence and says
// which due apps have nothing ready, and due() finds the reads and go-lives a run must act on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { roster, sync, record, plan, due, link, status, emptyRegistry, findable, onSale, views, searchRank, phrase, section, rules } from '../../skills/app-shorts/scripts/shorts.mjs';

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
  record(registry, { id: 'fud-crusts', app: 'fud', status: 'rendered', title: 'Crusts', searchPhrase: 'Füd family' });
  record(registry, { id: 'fud-crusts', app: 'fud', status: 'live', videoId: 'abc' });
  assert.equal(registry.episodes.length, 1);
  assert.equal(registry.episodes[0].title, 'Crusts');
  assert.equal(registry.episodes[0].videoId, 'abc');
  assert.throws(() => record(registry, { id: 'x', app: 'fud', status: 'viral' }), /Unknown status/);
});

test('record warns when a music bed or hook repeats one of the recent Shorts', () => {
  const registry = emptyRegistry();
  const phrase = { searchPhrase: 'Füd family' };
  record(registry, { id: 'a', app: 'fud', status: 'live', postedAt: '2026-11-01T00:00:00Z', music: '112-F-p0-m0-f0', hook: 'Do your kids’ crusts count?', ...phrase });
  const same = record(registry, { id: 'b', app: 'fud', status: 'rendered', music: '112-F-p0-m0-f0', hook: 'One dinner. Three people.', ...phrase });
  assert.equal(same.warnings.length, 1);
  assert.match(same.warnings[0], /music bed as a/);
  const fresh = record(registry, { id: 'c', app: 'fud', status: 'rendered', music: '96-C-p2-m1-f1', hook: 'Parent lunch', ...phrase });
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

test('plan gives an app not on sale no slot and lists it apart', () => {
  const registry = emptyRegistry();
  registry.apps = { fud: { team: 'T', cadenceDays: 0 }, giraffe: { team: 'T', cadenceDays: 0 }, rhythm: { team: 'T', cadenceDays: 0 } };
  registry.episodes = [{ id: 'f', app: 'fud', status: 'rendered' }, { id: 'g', app: 'giraffe', status: 'rendered' }];
  const profiles = [{ id: 'fud', stage: 'live' }, { id: 'giraffe', stage: 'prelaunch' }];
  const result = plan(registry, { now: new Date('2026-11-12T09:00:00Z'), days: 7, gap: 1, profiles });
  assert.deepEqual(result.slots.map(s => s.app), ['fud']);
  assert.deepEqual(result.needsProduction, ['fud']);
  assert.deepEqual(result.notOnSale, ['giraffe', 'rhythm'], 'rhythm has no profile, so it is unconfirmed');
});

test('due holds scheduled Shorts for an app not on sale and re-checks held ones once it is', () => {
  const registry = emptyRegistry();
  registry.apps = { giraffe: { team: 'T' }, fud: { team: 'T' } };
  registry.episodes = [
    { id: 'soon', app: 'giraffe', status: 'scheduled', videoId: 'etQ22IRIyLM', publishAt: '2026-11-13T01:00:00Z' },
    { id: 'kept', app: 'fud', status: 'held', videoId: 'v2', publishAt: null },
  ];
  const now = new Date('2026-11-14T00:00:00Z');
  const before = due(registry, { now, profiles: [{ id: 'giraffe', stage: 'prelaunch' }, { id: 'fud', stage: 'prelaunch' }] });
  assert.deepEqual(before.hold.map(h => [h.episode, h.videoId]), [['soon', 'etQ22IRIyLM']]);
  assert.deepEqual([before.live, before.reads, before.recheck], [[], [], []], 'a held or holdable Short never goes live or gets a read');
  const after = due(registry, { now, profiles: [{ id: 'giraffe', stage: 'prelaunch' }, { id: 'fud', stage: 'live' }] });
  assert.deepEqual(after.recheck.map(r => r.episode), ['kept']);
});

test('a held Short is not a Short in views or status, and an app not on sale is never due', () => {
  const registry = emptyRegistry();
  registry.apps = { giraffe: { team: 'T', cadenceDays: 7 } };
  registry.episodes = [{ id: 'soon', app: 'giraffe', status: 'held', videoId: 'v', wasPublishAt: '2026-11-13T01:00:00Z', publishAt: null }];
  const [v] = views(registry, { profiles: [{ id: 'giraffe', stage: 'prelaunch' }] });
  assert.deepEqual([v.shortsViews, v.liveOrScheduled, v.held, v.nextPublic], [0, false, 1, null]);
  const [s] = status(registry, { now: new Date('2026-11-12T00:00:00Z'), profiles: [{ id: 'giraffe', stage: 'prelaunch' }] });
  assert.deepEqual([s.held, s.onSale, s.nextDue, s.liveOrScheduled], [1, false, null, false]);
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

test('record refuses a made episode with no search phrase, or one its description does not lead with', () => {
  const registry = emptyRegistry();
  record(registry, { id: 'idea', app: 'importron', status: 'idea' });
  assert.throws(() => record(registry, { id: 'x', app: 'importron', status: 'scheduled', description: 'Importron puts labs in Health.' }), /no searchPhrase/);
  assert.throws(() => record(registry, { id: 'x', app: 'importron', status: 'scheduled', searchPhrase: 'Importron health',
    description: 'Importron puts labs in Health.\nSearch \'Importron health\' on the App Store.' }), /first line/);
  record(registry, { id: 'x', app: 'importron', status: 'scheduled', searchPhrase: 'Importron health',
    description: 'Importron puts labs in Health. Search \'Importron health\' on the App Store.\n\nMore.' });
  assert.throws(() => record(registry, { id: 'x', searchPhrase: '' , app: 'importron' }), /no searchPhrase/, 'a merge cannot drop the phrase');
  assert.equal(registry.episodes.length, 2);
});

test('an app is on sale when its profile is live or names a pre-order page; an App Store app with no profile is not', () => {
  assert.equal(onSale({ team: 'T' }, { stage: 'live' }), true);
  assert.equal(onSale({ team: 'T' }, { stage: 'prelaunch' }), false);
  assert.equal(onSale({ team: 'T' }, { stage: 'prelaunch', preorder: 'https://apps.apple.com/app/id1' }), true);
  assert.equal(onSale({ team: 'T', ascAppId: '1' }, null), false, 'unconfirmed');
  assert.equal(onSale({ type: 'local-service' }, null), true, 'not an App Store app');
});

test('an app not on sale gets no Short: nothing past idea but held, and legacy Shorts stay exempt', () => {
  const registry = emptyRegistry();
  registry.apps.giraffe = { team: 'T', ascAppId: '1' };
  const prelaunch = { profile: { stage: 'prelaunch' } };
  for (const status of ['recorded', 'rendered', 'scheduled', 'live', 'retired']) {
    assert.throws(() => record(registry, { id: `g-${status}`, app: 'giraffe', status, searchPhrase: 'Giraffe Stretch', description: 'Giraffe Stretch' }, prelaunch), /not on sale/);
  }
  record(registry, { id: 'g', app: 'giraffe', status: 'idea' }, prelaunch);
  record(registry, { id: 'soon', app: 'giraffe', status: 'held', videoId: 'v', description: 'Coming soon.' }, prelaunch);
  assert.throws(() => record(registry, { id: 'soon', app: 'giraffe', status: 'scheduled' }, prelaunch), /not on sale/, 'a held Short stays held');
  assert.throws(() => record(registry, { id: 'x', app: 'giraffe', status: 'rendered' }), /not on sale/, 'no profile: unconfirmed');
  record(registry, { id: 'l', app: 'giraffe', status: 'live', legacy: true }, prelaunch);
  assert.equal(findable({ id: 'n', app: 'n', status: 'live' }, { profile: { stage: 'live' } }) !== null, true, 'live apps still need the phrase');
  assert.equal(registry.episodes.length, 3);
});

test('pulled and superseded statuses are known, and never count as a Short', () => {
  const registry = emptyRegistry();
  registry.apps = { fud: { cadenceDays: 7 }, sw: { cadenceDays: 7 } };
  registry.episodes = [
    { id: 'a', app: 'fud', status: 'pulled', postedAt: '2026-11-04T00:00:00Z', metrics: [{ at: '2026-11-05T00:00:00Z', views: 120 }] },
    { id: 'b', app: 'fud', status: 'superseded' },
    { id: 'c', app: 'sw', status: 'pulled', postedAt: '2026-11-06T00:00:00Z', metrics: [{ at: '2026-11-10T00:00:00Z', views: 804 }] },
    { id: 'd', app: 'sw', status: 'live', postedAt: '2026-10-23T00:00:00Z', metrics: [{ at: '2026-11-01T00:00:00Z', views: 20 }, { at: '2026-11-10T00:00:00Z', views: 26 }] },
    { id: 'e', app: 'sw', status: 'scheduled', publishAt: '2026-11-20T01:00:00Z' },
  ];
  record(registry, { id: 'a', app: 'fud', status: 'pulled' });
  const byApp = Object.fromEntries(views(registry, { profiles: [{ id: 'space-worms', shortsSlug: 'sw' }] }).map(v => [v.app, v]));
  assert.equal(byApp.fud.shortsViews, 0);
  assert.equal(byApp.fud.liveOrScheduled, false);
  assert.equal(byApp.fud.excluded, 2);
  assert.equal(byApp.sw.shortsViews, 26, 'only the live Short, at its latest read');
  assert.equal(byApp.sw.liveOrScheduled, true);
  assert.equal(byApp.sw.nextPublic, '2026-11-20T01:00:00Z');
  assert.equal(byApp.sw.marketingId, 'space-worms');
  const fud = status(registry, { now: new Date('2026-11-12T00:00:00Z') }).find(s => s.app === 'fud');
  assert.equal(fud.lastPost, null);
  assert.equal(fud.liveOrScheduled, false);
  assert.equal(fud.nextDue, 'now');
});

test('the store search rank is where the app id first appears', () => {
  const html = '<a href="/us/app/x/id1111111">x</a><a href="/us/app/x/id1111111">x</a><a href="/us/app/y/id2222222">y</a>';
  assert.equal(searchRank(html, '1111111'), 1);
  assert.equal(searchRank(html, 2222222), 2);
  assert.equal(searchRank(html, '3333333'), null);
});

test('phrase prefers the profile, then the first candidate the store ranks first', async () => {
  const registry = emptyRegistry();
  registry.apps.importron = { name: 'Importron', ascAppId: '6826002393' };
  registry.apps.giraffe = { name: 'Giraffe Stretch Test 1', ascAppId: '1' };
  const fetcher = async url => {
    if (url.includes('lookup')) return { ok: true, json: async () => ({ results: [{ trackName: 'Importron' }] }) };
    const term = decodeURIComponent(new URL(url).searchParams.get('term'));
    return { ok: true, text: async () => (term === 'Importron health' ? '/id6826002393 /id9999999' : '/id9999999 /id8888888 /id6826002393') };
  };
  const fromProfile = await phrase(registry, 'importron', { profiles: [{ id: 'importron', stage: 'live', searchPhrase: 'Importron health' }], fetcher });
  assert.deepEqual([fromProfile.phrase, fromProfile.rank, fromProfile.source], ['Importron health', 1, 'profile']);
  const checked = await phrase(registry, 'importron', { profiles: [], fetcher });
  assert.deepEqual([checked.phrase, checked.rank], ['Importron', 3], 'no candidate ranks first, so the best-ranked one');
  const tried = await phrase(registry, 'importron', { profiles: [], tries: ['Importron health'], fetcher });
  assert.equal(tried.phrase, 'Importron health');
  const soon = await phrase(registry, 'giraffe', { profiles: [{ id: 'g', shortsSlug: 'giraffe', name: 'Giraffe Stretch', stage: 'prelaunch' }], fetcher });
  assert.deepEqual([soon.phrase, soon.source], [null, 'not on sale: no Short until it is'], 'no "coming soon" phrase');
});

test('rules gathers this skill\'s rules, the app\'s own, and the owner\'s verdicts, and names what is missing', () => {
  const files = {
    '/s/SKILL.md': '# X\n\n## Rules\n\n- **Say what it is.**\n\nWhen a scheduled pass runs this skill, run rules hold:\n\n**Run rules (James).**\n- Do all known work.\n\n## Ledger\n',
    '/v/SKILL.md': '## Rules\n\n- **No gambling imagery, ever.**\n',
    '/s/verdicts.md': '# Verdicts\n\n| a | b |\n',
  };
  const read = p => files[p], exists = p => p in files;
  assert.equal(section(files['/s/SKILL.md'], 'Rules'), '- **Say what it is.**');
  const sources = { always: [{ file: '/s/SKILL.md', section: 'Rules' }], apps: { vm: [{ file: '/v/SKILL.md', section: 'Rules' }, { file: '/v/marketing.md', section: 'Never' }] }, verdicts: [{ file: '/s/verdicts.md' }] };
  const vm = rules('vm', { sources, read, exists });
  assert.match(vm.text, /Say what it is/);
  assert.match(vm.text, /No gambling imagery/);
  assert.match(vm.text, /Verdicts/);
  assert.doesNotMatch(vm.text, /Do all known work/);
  assert.deepEqual(vm.missing, ['/v/marketing.md']);
  const app = rules('importron', { sources, read, exists, profiles: [{ id: 'importron', name: 'Importron', rules: ['Fictional lab reports only.'] }] });
  assert.match(app.text, /Fictional lab reports only/);
  assert.deepEqual(app.missing, []);
  assert.match(rules('rhythm', { sources, read, exists }).missing[0], /no written rules for "rhythm"/);
});

test('the real rule sources load for Vegas Microworks', () => {
  const vm = rules('vegas-microworks', { profiles: [] });
  assert.match(vm.text, /No gambling imagery, ever/);
  assert.match(vm.text, /What he rejected/);
});
