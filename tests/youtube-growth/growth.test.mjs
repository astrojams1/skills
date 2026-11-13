// growth.test.mjs
// The growth loop's decisions come from the channel's own numbers once there are enough of them, formats are judged
// only on mature episodes, and API requests state every policy answer explicitly. No network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, quantile, cutoffs, RULES, downloadDays, downloadVerdict, downloadsBySlug, readMetrics, siteDays, siteVerdict, decommission } from '../../skills/youtube-growth/scripts/evaluate.mjs';
import { analyticsQuery, rowsToSnapshots, uploadRequest, unansweredThreads, replyRequest, unscheduleStatus, updatedStatus, updatedSnippet, heldOrPulled, publishNowStatus, publishedNow, commentRequest, sameTags } from '../../skills/youtube-growth/scripts/yt-api.mjs';

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

test('uploads go public now, never scheduled, and always state kids and synthetic media', () => {
  const base = { id: 'e', title: 'T', description: 'D', file: '/x.mp4' };
  const request = uploadRequest({ ...base, publishAt: '2026-11-06T01:00:00Z' });
  assert.equal(request.status.privacyStatus, 'public');
  assert.ok(!('publishAt' in request.status), 'a stale publishAt in the registry never schedules');
  assert.equal(request.status.selfDeclaredMadeForKids, false);
  assert.equal(request.status.containsSyntheticMedia, false);
  assert.throws(() => uploadRequest({ id: 'x' }), /no title/);
});

test('publishNowStatus makes a scheduled video public with no publish time and keeps its other settings', () => {
  const status = { privacyStatus: 'private', publishAt: '2026-11-17T01:00:00Z', uploadStatus: 'processed', madeForKids: false,
    selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube', containsSyntheticMedia: false };
  assert.deepEqual(publishNowStatus(status), { privacyStatus: 'public', selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube', containsSyntheticMedia: false });
  const at = '2026-11-12T22:05:41.066Z';
  assert.deepEqual(publishedNow({ id: 'a', status: 'scheduled', publishAt: '2026-11-17T01:00:00Z' }, at),
    { status: 'live', postedAt: at, wasPublishAt: '2026-11-17T01:00:00Z', publishAt: null }, 'the verdict clock starts when it really went public');
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

test('updatedStatus sets not-for-kids and never sets a publish time, keeping other settings', () => {
  const status = { privacyStatus: 'public', uploadStatus: 'processed', madeForKids: true, selfDeclaredMadeForKids: true, embeddable: true, license: 'youtube' };
  assert.deepEqual(updatedStatus(status, { notForKids: true, publishAt: '2026-11-13T01:00:00Z' }),
    { privacyStatus: 'public', selfDeclaredMadeForKids: false, embeddable: true, license: 'youtube' });
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
  assert.match(downloadVerdict(pub('i', 'rhythm', '2026-11-02T01:00:00Z'), undefined, rule, { now: AFTER, views: 900 }).why, /no Apple first-time downloads data/);
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

test('updatedSnippet can replace the title, keep the description, and refuses an empty or over-long title', () => {
  const snippet = { title: 'Old', categoryId: '28', description: 'keep', tags: ['a'] };
  assert.deepEqual(updatedSnippet(snippet, { title: 'New' }), { title: 'New', categoryId: '28', description: 'keep', tags: ['a'] });
  assert.deepEqual(updatedSnippet(snippet, { title: 'New', description: 'd' }), { title: 'New', categoryId: '28', description: 'd', tags: ['a'] });
  assert.throws(() => updatedSnippet(snippet, { title: ' ' }), /1 to 100/);
  assert.throws(() => updatedSnippet(snippet, { title: 'x'.repeat(101) }), /1 to 100/);
});

// Decommissioning (James, 2026-11-12). Fixtures: decommission-metrics.jsonl gives a flat app ("flat"), an app that
// lifts once ("mixed"), and site visits and leads for a business ("vmw").
const dmetrics = readMetrics(fixture('decommission-metrics.jsonl'));
const dprofiles = [{ id: 'flat', stage: 'live' }, { id: 'mixed', stage: 'live' }, { id: 'nodata', stage: 'live' }];
const DNOW = new Date('2026-11-30T00:00:00Z');
const at = day => `2026-11-${String(day).padStart(2, '0')}T01:00:00Z`;
const judgedShort = (id, app, format, day, views = 900) => ({ id, app, format, status: 'live', postedAt: at(day), videoId: id, metrics: [{ at: '2026-11-29T00:00:00Z', views }] });
const dregistry = (episodes, apps = {}) => ({ apps: { flat: { team: 'T', ascAppId: '1' }, mixed: { team: 'T', ascAppId: '2' }, nodata: { team: 'T', ascAppId: '3' }, vmw: { name: 'Vegas Microworks' }, ...apps }, episodes });
const run = (registry, extra = {}) => evaluate(registry, rules, { now: DNOW, downloads: downloadsBySlug(dmetrics, dprofiles), sites: siteDays(dmetrics), profiles: dprofiles, ...extra });

test('an app whose last 3 judged Shorts are all no-effect is retired, with its reason, and gets no produce action', () => {
  const result = run(dregistry([judgedShort('f1', 'flat', 'demo', 10), judgedShort('f2', 'flat', 'demo', 14), judgedShort('f3', 'flat', 'demo', 18)]));
  assert.deepEqual(result.downloads.map(v => v.label), ['no-effect', 'no-effect', 'no-effect']);
  assert.deepEqual(result.retired.apps.map(r => r.app), ['flat']);
  assert.match(result.retired.apps[0].why, /last 3 judged Shorts had no effect \(f1, f2, f3\)/);
  assert.ok(result.actions.some(a => a.kind === 'retire-app' && a.app === 'flat'));
  assert.ok(!result.actions.some(a => a.kind === 'produce' && a.app === 'flat'), 'a retired app is not listed to produce');
  assert.ok(result.actions.some(a => a.kind === 'produce' && a.app === 'mixed'));
});

test('two strikes, a lift in between, or Shorts sharing one window do not retire an app', () => {
  const two = run(dregistry([judgedShort('f1', 'flat', 'demo', 10), judgedShort('f2', 'flat', 'demo', 14)]));
  assert.deepEqual(two.retired.apps, []);
  assert.equal(two.retired.standing.flat.noEffectInARow, 2);
  const lifted = run(dregistry([judgedShort('m1', 'mixed', 'demo', 10), judgedShort('m2', 'mixed', 'demo', 14), judgedShort('m3', 'mixed', 'demo', 18), judgedShort('m4', 'mixed', 'demo', 22)]));
  assert.deepEqual(lifted.downloads.map(v => v.label), ['no-effect', 'lifted', 'no-effect', 'no-effect']);
  assert.deepEqual(lifted.retired.apps, [], 'the lift on day 14 resets the count');
  const batch = run(dregistry([judgedShort('b1', 'flat', 'demo', 10), judgedShort('b2', 'flat', 'demo', 10), judgedShort('b3', 'flat', 'demo', 11)]));
  assert.equal(batch.retired.standing.flat.judged, 1, 'three Shorts public within one 72-hour window are one judgement');
  assert.deepEqual(batch.retired.apps, []);
});

test('inconclusive verdicts from missing Apple data are not strikes and say what data is missing', () => {
  const result = run(dregistry([judgedShort('n1', 'nodata', 'demo', 10), judgedShort('n2', 'nodata', 'demo', 14), judgedShort('n3', 'nodata', 'demo', 18)]));
  assert.deepEqual(result.downloads.map(v => v.label), ['inconclusive', 'inconclusive', 'inconclusive']);
  assert.match(result.downloads[0].missing, /Apple first-time downloads for nodata/);
  assert.deepEqual(result.retired.apps, []);
  const pending = run(dregistry([judgedShort('p1', 'flat', 'demo', 28)]));
  assert.equal(pending.downloads[0].dueAt, '2026-12-01T01:00:00.000Z', 'a Short still in its window says when its verdict is due');
});

test('a format with 3 no-effects across apps is retired; a recorded return lets an app count again', () => {
  const result = run(dregistry([judgedShort('f1', 'flat', 'talk', 10), judgedShort('m1', 'mixed', 'talk', 10), judgedShort('f2', 'flat', 'other', 18)]));
  assert.deepEqual(result.retired.formats.map(r => r.format), []);
  const three = run(dregistry([judgedShort('f1', 'flat', 'talk', 10), judgedShort('m1', 'mixed', 'talk', 10), judgedShort('m3', 'mixed', 'talk', 18)]));
  assert.deepEqual(three.retired.formats.map(r => r.format), ['talk']);
  assert.ok(three.actions.some(a => a.kind === 'retire-format' && a.format === 'talk'));
  const back = run(dregistry([judgedShort('f1', 'flat', 'demo', 10), judgedShort('f2', 'flat', 'demo', 14), judgedShort('f3', 'flat', 'demo', 18)],
    { flat: { team: 'T', ascAppId: '1', shortsRetired: { at: '2026-11-22T00:00:00Z', why: 'x' }, shortsReturn: { at: '2026-11-23T00:00:00Z', why: 'version 2.0 shipped' } } }));
  assert.deepEqual(back.retired.apps, [], 'only Shorts public after the return count');
  assert.ok(!back.actions.some(a => a.kind === 'retire-app'));
  const idleBack = run(dregistry([], { flat: { team: 'T', ascAppId: '1', shortsRetired: { at: '2026-11-01T00:00:00Z', why: 'x' }, shortsReturn: { at: '2026-11-02T00:00:00Z', why: 'version 2.0 shipped' } } }));
  assert.ok(idleBack.actions.some(a => a.kind === 'produce' && a.app === 'flat'), 'a returned app is listed to produce again');
  const recorded = run(dregistry([], { flat: { team: 'T', ascAppId: '1', shortsRetired: { at: '2026-11-22T00:00:00Z', why: 'x' } } }));
  assert.ok(!recorded.actions.some(a => a.kind === 'produce' && a.app === 'flat'), 'a recorded retirement holds with no return');
});

test('Vegas Microworks Shorts are judged on site visits and leads, with the same three strikes', () => {
  const data = siteDays(dmetrics).vmw, rule = rules.downloads;
  assert.equal(siteVerdict(judgedShort('v1', 'vmw', 'tip', 10), data, rule, { now: DNOW, views: 900 }).label, 'no-effect');
  const lead = siteVerdict(judgedShort('v2', 'vmw', 'tip', 22), data, rule, { now: DNOW, views: 900 });
  assert.equal(lead.label, 'lifted');
  assert.equal(lead.basis, 'site leads');
  assert.match(siteVerdict(judgedShort('v3', 'vmw', 'tip', 10), undefined, rule, { now: DNOW, views: 900 }).missing, /site visits and leads/);
  const result = run(dregistry([judgedShort('v1', 'vmw', 'tip', 10), judgedShort('v4', 'vmw', 'tip', 14), judgedShort('v5', 'vmw', 'tip', 18)]));
  assert.equal(result.retired.standing.vmw.basis, 'site visits and leads');
  assert.deepEqual(result.retired.apps.map(r => r.app), ['vmw']);
  assert.deepEqual(decommission([], { apps: {} }, { ...rules.decommission, windowHours: 72 }).apps, []);
});

test('commentRequest builds the channel\'s first comment and refuses links, blanks and long text', () => {
  assert.deepEqual(commentRequest('V1', " Search 'Space Worms' on the App Store. "), { snippet: { videoId: 'V1', topLevelComment: { snippet: { textOriginal: "Search 'Space Worms' on the App Store." } } } });
  assert.throws(() => commentRequest('V1', 'Get it https://apps.apple.com/app/id1'), /no links/);
  assert.throws(() => commentRequest('V1', 'www.example.com'), /no links/);
  assert.throws(() => commentRequest('V1', ' '), /--text/);
  assert.throws(() => commentRequest('V1', 'x'.repeat(501)), /500/);
  assert.throws(() => commentRequest(null, 'hi'), /videoId/);
});

test('updatedSnippet replaces tags when given and caps them; tags compare as a set', () => {
  const snippet = { title: 'T', categoryId: '28', description: 'd', tags: ['a'] };
  assert.deepEqual(updatedSnippet(snippet, { tags: ['x', 'y'] }).tags, ['x', 'y']);
  assert.deepEqual(updatedSnippet(snippet, {}).tags, ['a']);
  assert.throws(() => updatedSnippet(snippet, { tags: Array.from({ length: 16 }, (_, i) => `t${i}`) }), /at most 15/);
  assert.ok(sameTags(['Füd', 'fud'], ['fud', 'füd']));
  assert.ok(!sameTags(['a'], ['a', 'b']));
});

test('a re-upload marked sameVideoAs is read and judged once, under the original', () => {
  const registry = { apps: { fud: {} }, episodes: [
    short('a', 'meal', 1, { engagedViews: 100 }), short('b', 'meal', 2, { engagedViews: 100 }),
    { ...short('a2', 'meal', 3, { engagedViews: 100 }), sameVideoAs: 'a' },
  ] };
  const { shorts, downloads } = evaluate(registry, rules, { now: NOW });
  assert.ok(!shorts.some(s => s.episode === 'a2'));
  assert.ok(!downloads.some(v => v.episode === 'a2'));
});
