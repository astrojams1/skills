// growth.test.mjs
// The growth loop's decisions come from the channel's own numbers once there are enough of them, formats are judged
// only on mature episodes, and API requests state every policy answer explicitly. No network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, quantile, cutoffs, RULES } from '../../skills/youtube-growth/scripts/evaluate.mjs';
import { analyticsQuery, rowsToSnapshots, uploadRequest, unansweredThreads, replyRequest, unscheduleStatus, updatedStatus } from '../../skills/youtube-growth/scripts/yt-api.mjs';

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
