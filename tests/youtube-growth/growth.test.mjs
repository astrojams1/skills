// growth.test.mjs
// The growth loop's decisions come from the channel's own numbers once there are enough of them, formats are judged
// only on mature episodes, and API requests state every policy answer explicitly. No network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, quantile, cutoffs, RULES, downloadDays, downloadVerdict, downloadsBySlug, readMetrics } from '../../skills/youtube-growth/scripts/evaluate.mjs';
import { analyticsQuery, rowsToSnapshots, uploadRequest, unansweredThreads, replyRequest, unscheduleStatus, updatedStatus, updatedSnippet, heldOrPulled } from '../../skills/youtube-growth/scripts/yt-api.mjs';

const rules = JSON.parse(readFileSync(RULES, 'utf8'));
const NOW = new Date('2026-12-01T00:00:00Z');
const short = (id, format, day, m) => ({ id, app: 'fud', format, status: 'live', postedAt: `2026-11-${String(day).padStart(2, '0')}T00:00:00Z`,
  metrics: [{ at: `2026-11-${String(day + 8).padStart(2, '0')}T00:00:00Z`, ...m }] });

test('quantiles and cut-offs fall back to the rule until the channel has enough Shorts', () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(quantile([], 0.5), null);
  assert.deepEqual(cutoffs([70, 80], rules.hook, 8).basis, 'fallback (low confidence)');
  const channel = cutoffs([50, 60, 62, 65, 70, 72, 80, 90], rules.hook, 8);
  assert.match(channel.basis, /channel/);
  assert.ok(channel.weak > 60 && channel.weak < 65);
});

test('a Short gets hook, retention and reach notes against the channel', () => {
  const registry = { apps: { fud: {} }, episodes: [
    short('a', 'meal', 1, { engagedViews: 100, viewedRate: 50, averageViewPercentage: 120 }),
    short('b', 'meal', 2, { engagedViews: 100 }), short('c', 'meal', 3, { engagedViews: 100 }),
    short('d', 'meal', 4, { engagedViews: 900, viewedRate: 85 }),
  ] };
  const { shorts, actions } = evaluate(registry, rules, { now: NOW });
  const a = shorts.find(s => s.episode === 'a'), d = shorts.find(s => s.episode === 'd');
  assert.ok(a.notes.some(n => n.signal === 'hook' && n.verdict === 'weak'));
  assert.ok(a.notes.some(n => n.signal === 'retention' && n.verdict === 'loops'));
  assert.ok(d.notes.some(n => n.signal === 'reach' && n.verdict === 'outperformer'));
  assert.ok(actions.some(x => x.kind === 'make-next-episode' && x.why.startsWith('d:')));
});

test('formats wait for enough mature episodes, then double down or retire', () => {
  const weak = Array.from({ length: 8 }, (_, i) => short(`w${i}`, 'tour', i + 1, { engagedViews: 50 }));
  const strong = Array.from({ length: 5 }, (_, i) => short(`s${i}`, 'loop', i + 1, { engagedViews: 400 }));
  const young = [short('y0', 'new', 1, { engagedViews: 400 })];
  const { formats } = evaluate({ apps: {}, episodes: [...weak, ...strong, ...young] }, rules, { now: NOW });
  const by = Object.fromEntries(formats.map(f => [f.format, f.decision]));
  assert.equal(by.new, 'wait');
  assert.equal(by.loop, 'double-down');
  assert.equal(by.tour, 'drop');
});

test('legacy Shorts count toward the baseline but get no verdicts; idle apps get a produce action', () => {
  const registry = { apps: { fud: {}, rhythm: {}, old: { active: false } }, episodes: [
    { ...short('l', null, 1, { views: 1000 }), legacy: true }, short('n', 'meal', 2, { engagedViews: 10 })] };
  const { baseline, shorts, actions } = evaluate(registry, rules, { now: NOW });
  assert.equal(baseline, 505);
  assert.deepEqual(shorts.map(s => s.episode), ['n']);
  assert.deepEqual(actions.filter(a => a.kind === 'produce').map(a => a.app), ['fud', 'rhythm'], 'fud idle 29 days, rhythm never; old inactive');
});

test('analytics queries and rows map to registry snapshots', () => {
  const url = new URL(analyticsQuery(['a', 'b'], { end: '2026-11-04' }));
  assert.equal(url.searchParams.get('ids'), 'channel==MINE');
  assert.equal(url.searchParams.get('filters'), 'video==a,b');
  assert.match(url.searchParams.get('metrics'), /engagedViews/);
  const snaps = rowsToSnapshots({ columnHeaders: [{ name: 'video' }, { name: 'views' }, { name: 'engagedViews' }], rows: [['a', 120, 80]] }, '2026-11-07T00:00:00Z');
  assert.deepEqual(snaps, [{ videoId: 'a', snapshot: { at: '2026-11-07T00:00:00Z', source: 'analytics-api', views: 120, engagedViews: 80 } }]);
});

test('upload requests schedule future episodes privately and always state kids and synthetic media', () => {
  const base = { id: 'e', title: 'T', description: 'D', file: '/x.mp4' };
  const now = new Date('2026-11-04T00:00:00Z');
  const scheduled = uploadRequest({ ...base, publishAt: '2026-11-06T01:00:00Z' }, now);
  assert.equal(scheduled.status.privacyStatus, 'private');
  assert.equal(scheduled.status.publishAt, '2026-11-06T01:00:00.000Z');
  assert.equal(scheduled.status.selfDeclaredMadeForKids, false);
  assert.equal(scheduled.status.containsSyntheticMedia, false);
  assert.equal(uploadRequest(base, now).status.privacyStatus, 'public');
  assert.throws(() => uploadRequest({ id: 'x' }), /no title/);
});

test('unansweredThreads keeps only viewers\' comments the channel has not answered', () => {
  const comment = (author, text = 'hi') => ({ snippet: { authorChannelId: { value: author }, authorDisplayName: author, textOriginal: text, publishedAt: 't', likeCount: 0 } });
  const threads = [
    { id: 'open', snippet: { topLevelComment: comment('viewer', 'Does it work offline?') }, replies: { comments: [comment('other')] } },
    { id: 'answered', snippet: { topLevelComment: comment('viewer') }, replies: { comments: [comment('owner')] } },
    { id: 'own', snippet: { topLevelComment: comment('owner') } },
  ];
  assert.deepEqual(unansweredThreads(threads, 'owner').map(t => t.id), ['open']);
});

test('replyRequest builds plain short replies and refuses links, blanks and long text', () => {
  assert.deepEqual(replyRequest('p1', '  Yes, it works offline. '), { snippet: { parentId: 'p1', textOriginal: 'Yes, it works offline.' } });
  assert.throws(() => replyRequest('p1', 'See https://example.com'), /no links/);
  assert.throws(() => replyRequest('p1', ' '), /--text/);
  assert.throws(() => replyRequest('p1', 'x'.repeat(301)), /300/);
  assert.throws(() => replyRequest(null, 'hello'), /--parent/);
});

test('unscheduleStatus makes a scheduled video private with no publish time and keeps its other settings', () => {
  const status = { privacyStatus: 'private', publishAt: '2026-11-19T01:00:00Z', uploadStatus: 'processed',
    selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube', publicStatsViewable: true };
  assert.deepEqual(unscheduleStatus(status), { selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube',
    publicStatsViewable: true, privacyStatus: 'private' });
});

test('updatedStatus sets not-for-kids and a new publish time, keeping other settings', () => {
  const status = { privacyStatus: 'private', publishAt: '2026-11-15T01:00:00Z', uploadStatus: 'processed', madeForKids: true,
    selfDeclaredMadeForKids: true, embeddable: true, license: 'youtube' };
  assert.deepEqual(updatedStatus(status, { notForKids: true, publishAt: '2026-11-13T01:00:00Z' }),
    { privacyStatus: 'private', publishAt: '2026-11-13T01:00:00.000Z', selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube' });
});

const fixture = name => new URL(`./fixtures/${name}`, import.meta.url).pathname;
const metrics = readMetrics(fixture('metrics.jsonl'));
const profiles = JSON.parse(readFileSync(fixture('profiles.json'), 'utf8'));
const AFTER = new Date('2026-11-12T00:00:00Z');
const pub = (id, app, at, views, extra = {}) => ({ id, app, status: 'live', postedAt: at, videoId: id, format: 'f',
  metrics: views === null ? [] : [{ at: '2026-11-11T12:00:00Z', views }], ...extra });

test('download days keep the newest value of each day, never a sum', () => {
  const days = downloadDays(metrics);
  assert.deepEqual(days.fud.days['2026-11-01'], { first: 6, re: 0, sources: { 'App Store search': 1, 'App Store browse': 0, 'Web referrer': 5 } });
  assert.equal(days.fud.through, '2026-11-10');
  assert.ok(!days['space-worms'].days['2026-11-11'], 'a day no row reported is unknown, not zero');
  assert.deepEqual(Object.keys(downloadsBySlug(metrics, profiles)).sort(), ['fud', 'nametag', 'space-worms-2']);
});

test('a Short is lifted, no-effect or inconclusive on search and browse downloads in its 72 hours', () => {
  const data = downloadsBySlug(metrics, profiles), rule = rules.downloads;
  const lifted = downloadVerdict(pub('a', 'fud', '2026-11-08T01:00:00Z'), data.fud, rule, { now: AFTER, views: 900 });
  assert.equal(lifted.label, 'lifted');
  assert.deepEqual([lifted.window.downloads, lifted.expected, lifted.baseline.perDay], [10, 3, 1], 'web referrer downloads are left out');
  const flat = downloadVerdict(pub('b', 'space-worms-2', '2026-11-08T01:00:00Z'), data['space-worms-2'], rule, { now: AFTER, views: 800 });
  assert.equal(flat.label, 'no-effect');
  const few = downloadVerdict(pub('c', 'fud', '2026-11-08T01:00:00Z'), data.fud, rule, { now: AFTER, views: 120 });
  assert.equal(few.label, 'inconclusive');
  assert.match(few.why, /too few/);
  assert.equal(downloadVerdict(pub('d', 'fud', '2026-11-08T01:00:00Z'), data.fud, rule, { now: AFTER, views: null }).why, 'no views read yet');
  assert.match(downloadVerdict(pub('e', 'fud', '2026-11-10T01:00:00Z'), data.fud, rule, { now: AFTER, views: 900 }).why, /not over/);
  assert.match(downloadVerdict(pub('f', 'fud', '2026-11-09T01:00:00Z'), data.fud, rule, { now: new Date('2026-11-13T00:00:00Z'), views: 900 }).why, /not in yet for 2026-11-11/);
  assert.match(downloadVerdict(pub('g', 'fud', '2026-10-20T01:00:00Z'), data.fud, rule, { now: AFTER, views: 900 }).why, /starts 2026-11-01/);
  assert.match(downloadVerdict(pub('h', 'fud', '2026-11-02T01:00:00Z'), data.fud, rule, { now: AFTER, views: 900 }).why, /baseline has 1 of 7/);
  assert.match(downloadVerdict(pub('i', 'rhythm', '2026-11-02T01:00:00Z'), undefined, rule, { now: AFTER, views: 900 }).why, /no download data/);
  const all = downloadVerdict(pub('j', 'nametag', '2026-11-05T01:00:00Z'), data.nametag, rule, { now: AFTER, views: 900 });
  assert.match(all.basis, /all first-time/);
  assert.equal(all.label, 'no-effect');
});

test('double-down needs lifted downloads; on views alone it is provisional, and views without downloads iterate', () => {
  const downloads = downloadsBySlug(metrics, profiles);
  const now = new Date('2026-11-30T00:00:00Z');
  const ep = (id, app, format, day, views) => ({ id, app, format, status: 'live', postedAt: `2026-11-${String(day).padStart(2, '0')}T01:00:00Z`,
    metrics: [{ at: `2026-11-${String(day + 7).padStart(2, '0')}T02:00:00Z`, views, engagedViews: views }] });
  const filler = Array.from({ length: 12 }, (_, i) => ep(`q${i}`, 'rhythm', 'quiet', 1 + i, 50));
  const strongNoData = Array.from({ length: 5 }, (_, i) => ep(`s${i}`, 'rhythm', 'loop', 1 + i, 900));
  const strongFlat = Array.from({ length: 5 }, (_, i) => ep(`w${i}`, 'space-worms-2', 'raw', 4 + i % 2, 900));
  const lifted = [ep('l1', 'fud', 'calm', 8, 900), ep('l2', 'fud', 'calm', 8, 600)];
  const result = evaluate({ apps: {}, episodes: [...filler, ...strongNoData, ...strongFlat, ...lifted] }, rules, { now, downloads });
  const by = Object.fromEntries(result.formats.map(f => [f.format, f]));
  assert.equal(by.calm.decision, 'double-down', 'two lifted Shorts double a format down even before five episodes');
  assert.ok(!by.calm.provisional);
  assert.equal(by.loop.decision, 'double-down');
  assert.equal(by.loop.provisional, true);
  assert.equal(by.raw.decision, 'iterate');
  assert.ok(result.actions.some(a => a.kind === 'format-double-down' && a.format === 'loop' && a.provisional));
  assert.ok(result.actions.some(a => a.kind === 'make-next-episode' && /l1: lifted downloads/.test(a.why)));
  assert.ok(result.actions.some(a => a.kind === 'point-to-the-app' && a.app === 'space-worms-2'));
  assert.ok(result.downloads.find(d => d.episode === 'w0').overlaps.includes('w1'));
});

test('a pulled Short does not keep an app off the produce list', () => {
  const registry = { apps: { fud: {} }, episodes: [{ id: 'p', app: 'fud', status: 'pulled', postedAt: '2026-11-28T00:00:00Z' }] };
  assert.deepEqual(evaluate(registry, rules, { now: NOW }).actions.filter(a => a.kind === 'produce').map(a => a.why), ['no live or scheduled Short']);
});

test('an app not on sale gets no produce action, whatever its registry says', () => {
  const registry = { apps: { giraffe: { team: 'T', ascAppId: '1' }, fud: { team: 'T' }, lob: { team: 'T' } }, episodes: [] };
  const profiles = [{ id: 'g', shortsSlug: 'giraffe', stage: 'prelaunch' }, { id: 'fud', stage: 'live' }];
  assert.deepEqual(evaluate(registry, rules, { now: NOW, profiles }).actions.filter(a => a.kind === 'produce').map(a => a.app), ['fud'],
    'giraffe is prelaunch; lob has no profile, so it is unconfirmed');
});

test('heldOrPulled takes an episode off the schedule as held or pulled and keeps its first publish time', () => {
  const now = new Date('2026-11-12T19:00:00Z');
  const scheduled = { id: 'soon', status: 'scheduled', publishAt: '2026-11-13T01:00:00Z' };
  assert.deepEqual(heldOrPulled(scheduled, { hold: true, reason: 'app not on sale', now }),
    { status: 'held', heldAt: '2026-11-12T19:00:00.000Z', wasPublishAt: '2026-11-13T01:00:00Z', wasStatus: 'scheduled', publishAt: null, heldReason: 'app not on sale' });
  const again = heldOrPulled({ ...scheduled, ...heldOrPulled(scheduled, { hold: true, now }) }, { hold: true, now: new Date('2026-11-20T00:00:00Z') });
  assert.deepEqual([again.heldAt, again.wasPublishAt, again.wasStatus], ['2026-11-12T19:00:00.000Z', '2026-11-13T01:00:00Z', 'scheduled']);
  assert.equal(heldOrPulled(scheduled, { now }).status, 'pulled');
});

test('updatedSnippet replaces the description and sends the title, category, tags and languages back', () => {
  const snippet = { title: 'T', categoryId: '28', description: 'old', tags: ['a'], defaultLanguage: 'en', defaultAudioLanguage: 'en',
    publishedAt: 'x', channelId: 'c', thumbnails: {}, localized: {} };
  assert.deepEqual(updatedSnippet(snippet, { description: 'new' }), { title: 'T', categoryId: '28', description: 'new', tags: ['a'], defaultLanguage: 'en', defaultAudioLanguage: 'en' });
  assert.throws(() => updatedSnippet({ description: 'x' }, { description: 'y' }), /title or category/);
});
