// shorts.test.mjs
// The app-shorts registry: roster discovery prefers main checkouts, the calendar rotates apps by cadence and says
// which due apps have nothing ready, and due() finds the reads and go-lives a run must act on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { retiredFromShorts, roster, sync, record, due, link, status, emptyRegistry, findable, findability, onSale, titleNamesApp, views, searchRank, phrase, section, rules, ruleItems, checklistTemplate, checklistProblems, attachChecklist, claimMusic, check, endCard, mark, followUpMissing } from '../../skills/app-shorts/scripts/shorts.mjs';

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
  const same = record(registry, { id: 'b', app: 'fud', status: 'rendered', music: '112-F-p0-m0-f0', musicClaimedAt: '2026-11-02T00:00:00Z', hook: 'One dinner. Three people.', ...phrase });
  assert.equal(same.warnings.length, 1);
  assert.match(same.warnings[0], /music bed as a/);
  const fresh = record(registry, { id: 'c', app: 'fud', status: 'rendered', music: '96-C-p2-m1-f1', musicClaimedAt: '2026-11-02T00:00:00Z', hook: 'Parent lunch', ...phrase });
  assert.deepEqual(fresh.warnings, []);
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
  const web = await phrase({ apps: { lob: { name: 'LOB' } }, episodes: [] }, 'lob', { profiles: [{ id: 'lob', stage: 'live', platform: 'web', webUrl: 'https://lob-game.vercel.app' }], fetcher });
  assert.deepEqual([web.phrase, web.ending, web.endCard], ['lob-game.vercel.app', 'address', 'Open lob-game.vercel.app in your browser.'], 'a web product ends on its address, never the App Store');
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

test('a made Short\'s title names the app within the 40 characters the player shows', () => {
  assert.equal(titleNamesApp('Function Health lab results in Apple Health, on your iPhone | Importron', 'Importron'), false);
  assert.equal(titleNamesApp('Importron: Function Health labs in Apple Health', 'Importron'), true);
  assert.equal(titleNamesApp('Build the data center that trains an AI. Then 9 protesters show up. | Data Center: AI Frontier', 'Data Center: AI Frontier'), false);
  assert.equal(titleNamesApp('Data Center: AI Frontier, 9 protesters arrive', 'Data Center: AI Frontier'), true);
  assert.equal(titleNamesApp('Space Worms: 1 tiny worm vs 3 giants', ['Space Worms: Swarm', 'Space Worms']), true, 'the verified search phrase names the app too');
  assert.equal(titleNamesApp('Space Worms: 1 tiny worm vs 3 giants', 'Space Worms: Swarm'), false);
  const profile = { name: 'Importron', stage: 'live', searchPhrase: { phrase: 'Importron health' } };
  const base = { id: 'i', app: 'importron', status: 'scheduled', searchPhrase: 'Importron health', description: "Importron. Search 'Importron health' on the App Store." };
  assert.match(findable({ ...base, title: 'Function Health lab results in Apple Health | Importron' }, { profile }), /first 40 characters/);
  assert.equal(findable({ ...base, title: 'Importron: Function Health labs in Apple Health' }, { profile }), null);
  assert.equal(findable({ ...base, legacy: true, status: 'live', title: 'No app name in this title at all, not one' }, { profile }), null);
});

test('phrase waits out a rate limit and records a refused query instead of stopping', async () => {
  const registry = emptyRegistry();
  registry.apps = { dc: { name: 'Data Center', ascAppId: '6827325155' } };
  let calls = 0;
  const fetcher = async url => {
    if (url.includes('itunes.apple.com')) return { ok: true, json: async () => ({ results: [{ trackName: 'Data Center: AI Frontier' }] }) };
    calls += 1;
    if (url.includes('term=Data%20Center%3A%20AI%20Frontier')) return calls < 2 ? { ok: false, status: 429 } : { ok: true, text: async () => '<a href="/us/app/x/id6827325155">' };
    return { ok: false, status: 429 };
  };
  const got = await phrase(registry, 'dc', { fetcher, waits: [0], sleep: async () => {} });
  assert.equal(got.phrase, 'Data Center: AI Frontier');
  assert.equal(got.rank, 1);
  const none = await phrase(registry, 'dc', { fetcher: async url => url.includes('itunes') ? { ok: true, json: async () => ({ results: [] }) } : { ok: false, status: 429 }, waits: [0], sleep: async () => {} });
  assert.equal(none.rank, null);
  assert.match(none.checked[0].error, /429/);
});

test('a Short ends on the profile phrase: a search line when the store finds the app, else the store name on the App Store', () => {
  const found = { id: 'i', name: 'Importron', stage: 'live', searchPhrase: { phrase: 'Importron health', rank: 1, checked: '2026-11-12' } };
  const missing = { id: 'd', name: 'Data Center: AI Frontier', stage: 'live', searchPhrase: { phrase: 'Data Center: AI Frontier', rank: null, checked: '2026-11-12' } };
  const ep = extra => ({ id: 'e', app: 'i', status: 'scheduled', title: 'Importron: labs in Apple Health', ...extra });
  assert.equal(findable(ep({ searchPhrase: 'Importron health', description: "Search 'Importron health' on the App Store." }), { profile: found }), null);
  assert.match(findable(ep({ searchPhrase: 'Importron', description: 'Importron on the App Store.' }), { profile: found }), /profile's phrase is "Importron health"/);
  const dc = extra => ({ id: 'd1', app: 'd', status: 'scheduled', title: 'Data Center: AI Frontier | 9 protesters', searchPhrase: 'Data Center: AI Frontier', ...extra });
  assert.equal(findable(dc({ description: 'Data Center: AI Frontier, on the App Store.' }), { profile: missing }), null);
  assert.match(findable(dc({ description: 'Data Center: AI Frontier is a game.' }), { profile: missing }), /is on the App Store/);
  const web = { id: 'lob', name: 'LOB', stage: 'live', platform: 'web', searchPhrase: { phrase: 'lob-game.vercel.app', rank: null, checked: '2026-11-13' } };
  assert.equal(findable({ id: 'l1', app: 'lob', status: 'live', title: 'LOB artillery game', searchPhrase: 'lob-game.vercel.app', description: 'LOB, in your browser: open lob-game.vercel.app.' }, { profile: web }), null);
  assert.equal(endCard('Importron health', 1), "Search 'Importron health' on the App Store.");
  assert.equal(endCard('Hanzi Cards: Learn Mandarin', null), 'Hanzi Cards: Learn Mandarin, on the App Store.');
});

test('phrase falls back to the exact store name with ending "name" when no phrase finds the app', async () => {
  const registry = { apps: { d: { name: 'Data Center', ascAppId: '6827325155', team: 'T' } }, episodes: [] };
  const fetcher = async url => (url.includes('lookup')
    ? { ok: true, json: async () => ({ results: [{ trackName: 'Data Center: AI Frontier' }] }) }
    : { ok: true, text: async () => '<a href="/app/x/id1111111">' });
  const got = await phrase(registry, 'd', { profiles: [{ id: 'data-center', shortsSlug: 'd', stage: 'live', name: 'Data Center: AI Frontier' }], fetcher });
  assert.equal(got.phrase, 'Data Center: AI Frontier');
  assert.equal(got.ending, 'name');
  assert.equal(got.endCard, 'Data Center: AI Frontier, on the App Store.');
});

test('a business with no profile is checked by its own name', () => {
  const app = { name: 'Vegas Microworks' };
  const ep = { id: 'v', app: 'vegas-microworks', status: 'scheduled', description: 'A free tool from Vegas Microworks.' };
  assert.match(findable({ ...ep, title: 'Missed call cost calculator for small businesses' }, { app }), /Vegas Microworks/);
  assert.deepEqual(findability({ ...ep, title: 'Vegas Microworks: missed call calculator' }, { app }), []);
});

test('the rules checklist covers every rule, and a fail or an unmarked rule blocks', () => {
  const text = '# Rules\n\n## A\n\n- **One.** First rule\n  goes on.\n- Two.\n\n## What worked\n\n| a | b |\n|---|---|\n| x | y |\n\n## What he rejected\n\n| Date | Rule |\n|---|---|\n| 2026 | No slots |\n';
  assert.deepEqual(ruleItems(text), ['**One.** First rule goes on.', 'Two.', '| 2026 | No slots |']);
  const list = checklistTemplate('x', 'e', text);
  assert.equal(list.checks.length, 3);
  const files = {};
  const io = { read: p => files[p], exists: p => p in files };
  const ep = { id: 'e', app: 'x', rulesChecklist: '/c.json' };
  assert.match(checklistProblems({ id: 'e', app: 'x' }, text, io)[0], /no rules checklist/);
  files['/c.json'] = list;
  assert.equal(checklistProblems(ep, text, io).length, 3);
  files['/c.json'] = { checks: list.checks.map(c => ({ ...c, result: 'pass', evidence: '12.5 s caption' })) };
  assert.deepEqual(checklistProblems(ep, text, io), []);
  files['/c.json'].checks[1] = { rule: 'Two.', result: 'fail', evidence: '4 s: results without "not medical advice"' };
  assert.match(checklistProblems(ep, text, io)[0], /breaks a written rule/);
  assert.match(checklistProblems(ep, `${text}- Three.\n`, io).at(-1), /not on its checklist/);
});

test('a checklist written for an episode is linked to it, even one scheduled before music claims existed', () => {
  const registry = emptyRegistry();
  registry.episodes = [{ id: 'old', app: 'fud', status: 'scheduled', music: 'Loop' }];
  assert.equal(attachChecklist(registry, 'old', '/ssd/old.rules-checklist.json'), true);
  assert.equal(registry.episodes[0].rulesChecklist, '/ssd/old.rules-checklist.json');
  assert.equal(attachChecklist(registry, 'missing', '/ssd/x.json'), false);
  assert.match(checklistProblems({ id: 'n', app: 'fud' }, '- A rule.\n')[0], /links FILE to the episode/);
});

test('record refuses a rendered episode whose checklist fails, or whose music was not claimed', () => {
  const registry = emptyRegistry();
  const base = { id: 'a', app: 'fud', status: 'rendered', searchPhrase: 'Füd family' };
  assert.throws(() => record(registry, base, { checkRules: () => ['a: breaks a written rule'] }), /breaks a written rule/);
  assert.throws(() => record(registry, { ...base, music: 'Loop' }, { checkRules: () => [] }), /claim its music first/);
  assert.equal(record(registry, { ...base, music: 'Loop', musicClaimedAt: '2026-11-12T00:00:00Z' }, { checkRules: () => [] }).episode.id, 'a');
});

test('a music claim refuses a bed public or claimed within 14 days', () => {
  const registry = emptyRegistry();
  registry.episodes = [
    { id: 'old', app: 'x', status: 'live', postedAt: '2026-10-01T00:00:00Z', music: 'Apple Loops: Silver and Gold Piano' },
    { id: 'soon', app: 'y', status: 'live', postedAt: '2026-11-12T01:00:00Z', music: 'Apple Loops: Northern Hills Bass, Hourglass Synth' },
    { id: 'gone', app: 'y', status: 'pulled', publishAt: '2026-11-14T01:00:00Z', music: 'Raindrops Ping' }];
  const now = new Date('2026-11-12T12:00:00Z');
  assert.throws(() => claimMusic(registry, { id: 'n', app: 'z', music: 'Hourglass Synth|Other', now }), /Hourglass Synth.*soon/);
  assert.deepEqual(claimMusic(registry, { id: 'n', app: 'z', music: 'Silver and Gold Piano|Raindrops Ping', now }).claimed, ['Silver and Gold Piano', 'Raindrops Ping']);
  assert.throws(() => claimMusic(registry, { id: 'm', app: 'z', music: 'Raindrops Ping', now }), /\(n, idea/, 'a claim holds the bed for the next maker');
});

test('check covers every scheduled Short, with or without a profile, and flags banned words', () => {
  const registry = { apps: { 'vegas-microworks': { name: 'Vegas Microworks' } }, episodes: [
    { id: 'v1', app: 'vegas-microworks', status: 'scheduled', publishAt: '2026-11-17T01:00:00Z', title: 'Vegas Microworks: beat the odds on missed calls', description: 'A free tool from Vegas Microworks.', tags: ['jackpot'] },
    { id: 'v2', app: 'vegas-microworks', status: 'live', title: 'x' }] };
  const out = check(registry, { sources: { banned: { 'vegas-microworks': ['odds', 'jackpot', 'dice'] } }, rulesFor: () => ({ text: '- A rule.', missing: [] }), checklist: () => [] });
  assert.equal(out.length, 1);
  assert.equal(out[0].ok, false);
  assert.match(out[0].problems.join('\n'), /forbid: odds, jackpot/);
  assert.match(out[0].profile, /business rules/);
});

test('check flags a Short scheduled more than an hour ahead as a defect; within the hour it passes', () => {
  const ep = (id, publishAt) => ({ id, app: 'vegas-microworks', status: 'scheduled', publishAt, title: 'Vegas Microworks: missed calls', description: 'A free tool from Vegas Microworks.' });
  const registry = { apps: { 'vegas-microworks': { name: 'Vegas Microworks' } }, episodes: [ep('soon', '2026-11-12T12:30:00Z'), ep('later', '2026-11-17T01:00:00Z')] };
  const out = check(registry, { sources: { banned: {} }, rulesFor: () => ({ text: '- A rule.', missing: [] }), checklist: () => [], now: new Date('2026-11-12T12:00:00Z') });
  assert.deepEqual(out.map(r => [r.episode, r.ok]), [['soon', true], ['later', false]]);
  assert.match(out[1].problems.join('\n'), /more than an hour ahead: a defect/);
});

test('an app retired from Shorts has no next due date until a later return is recorded', () => {
  const registry = emptyRegistry();
  registry.apps = { fud: { cadenceDays: 7, shortsRetired: { at: '2026-11-20T00:00:00Z', why: 'fud retired from Shorts: last 3 judged Shorts had no effect' } } };
  const [fud] = status(registry, { now: new Date('2026-11-25T00:00:00Z') });
  assert.equal(fud.nextDue, null);
  assert.match(fud.retired, /no effect/);
  assert.equal(retiredFromShorts(registry.apps.fud), true);
  registry.apps.fud.shortsReturn = { at: '2026-11-24T00:00:00Z', why: 'version 2.0 shipped' };
  assert.equal(status(registry, { now: new Date('2026-11-25T00:00:00Z') })[0].nextDue, 'now');
});

test('ruleItems reads numbered guidelines with their continuation lines', () => {
  const items = ruleItems('## Make it\n\n### First\n\n1. **Open on the payoff.** No title card.\n   _Common practice. Status: testing (E3)._\n2. **Loop it.**\n');
  assert.deepEqual(items, ['**Open on the payoff.** No title card. _Common practice. Status: testing (E3)._', '**Loop it.**']);
});

test('the guidelines "Make it" section is on every rules pack, and "After it is public" is not', () => {
  const r = rules('vegas-microworks');
  assert.match(r.text, /Open on the payoff, already moving/);
  assert.doesNotMatch(r.text, /Post the channel's first comment and pin it/);
});

test('due lists public Shorts missing the comment, the pin or the Related video, and mark records them', () => {
  const registry = emptyRegistry();
  registry.apps.biz = { name: 'Biz' };
  registry.episodes.push({ id: 'b1', app: 'biz', status: 'live', videoId: 'V1', postedAt: '2026-11-12T00:00:00Z', metrics: [], file: '/masters/b1.mp4' });
  const now = new Date('2026-11-13T00:00:00Z');
  assert.deepEqual(followUpMissing({ id: 'old', status: 'live', videoId: 'V0' }), ['comment', 'pin', 'related video', 'tiktok']);
  assert.deepEqual(due(registry, { now }).followUp, [{ episode: 'b1', app: 'biz', videoId: 'V1', missing: ['comment', 'pin', 'related video', 'tiktok'] }]);
  registry.episodes[0].comment = { id: 'C1', text: 't', at: now.toISOString() };
  assert.throws(() => mark(registry, 'b1', { pinned: 'C2', now }), /recorded comment is C1/);
  assert.throws(() => mark(registry, 'b1', { related: 'V1', now }), /its own/);
  assert.throws(() => mark(registry, 'b1', { now }), /Nothing to mark/);
  mark(registry, 'b1', { pinned: 'C1', related: 'V2', now });
  assert.deepEqual(followUpMissing(registry.episodes[0]), ['tiktok']);
  assert.throws(() => mark(registry, 'b1', { tiktok: 'https://youtu.be/x', now }), /post's URL/);
  mark(registry, 'b1', { tiktok: 'https://www.tiktok.com/@astrojams/video/7500000000000000001', now });
  assert.equal(registry.episodes[0].tiktok.id, '7500000000000000001');
  assert.deepEqual(followUpMissing(registry.episodes[0]), []);
  assert.equal(due(registry, { now }).followUp.length, 0);
  mark(registry, 'b1', { related: 'V3', now });
  assert.equal(registry.episodes[0].relatedVideo.was, 'V2');
});

test('a walkthrough is a regular video: its first description line is the App Store link, and it needs no Shorts follow-up', () => {
  const registry = emptyRegistry();
  registry.apps.newsworthy = { name: 'Newsworthy', team: 'T', ascAppId: '1' };
  const profile = { stage: 'live', name: 'Newsworthy: Calm News', searchPhrase: { phrase: 'Newsworthy Calm News', rank: 1 } };
  const base = { id: 'w1', app: 'newsworthy', kind: 'walkthrough', status: 'rendered', title: 'Newsworthy: Calm News walkthrough', searchPhrase: 'Newsworthy Calm News' };
  const ok = { ...base, description: 'https://apps.apple.com/app/id1?ct=yt&mt=8\nSearch \'Newsworthy Calm News\' on the App Store.\nWorld news, rated.' };
  assert.deepEqual(findability(ok, { profile, app: registry.apps.newsworthy }), []);
  const noLink = { ...base, description: "Search 'Newsworthy Calm News' on the App Store.\nhttps://apps.apple.com/app/id1" };
  assert.match(findability(noLink, { profile, app: registry.apps.newsworthy })[0], /starts with its App Store link/);
  const noPhrase = { ...base, description: 'https://apps.apple.com/app/id1\nA news app.\nMore.\nNewsworthy Calm News' };
  assert.match(findability(noPhrase, { profile, app: registry.apps.newsworthy })[0], /first three lines/);
  assert.deepEqual(followUpMissing({ ...ok, status: 'live', videoId: 'W' }), []);
});
