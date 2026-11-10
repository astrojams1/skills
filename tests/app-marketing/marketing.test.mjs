import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hnStories, hnSubmitLink, hnTitleProblems, hnVerdict, processedThrough, downloadRows, eventProblems, itemState, latest, parseLines, profileProblems, rank, renderBoard } from '../../skills/app-marketing/scripts/marketing.mjs';

const DAY = 86400000;
const NOW = Date.parse('2026-11-05T12:00:00Z');
const ago = days => new Date(NOW - days * DAY).toISOString();
const event = extra => ({ v: 1, ts: ago(0), run_id: 'r', skill: 'app-marketing', agent: 'test', event: 'action', status: 'ok', ...extra });
const item = extra => ({ id: 'a', title: 'A', channel: 'web', runner: 'cloud', impact: 3, effort: 1, ...extra });
const profile = extra => ({ id: 'x', name: 'X', stage: 'live', goal: 'g', audience: 'a', positioning: 'p', backlog: [item()], ...extra });

test('a good event passes and a bad one names every problem', () => {
  assert.deepEqual(eventProblems(event()), []);
  const problems = eventProblems({ v: 2, event: 'nope', status: 'nope', ts: 'nope' });
  assert.ok(problems.includes('v must be 1') && problems.includes('unknown event nope') && problems.includes('ts is not a date'));
  assert.ok(problems.some(p => p === 'missing run_id'));
});

test('secrets and oversized events are refused', () => {
  assert.ok(eventProblems(event({ evidence: '-----BEGIN PRIVATE KEY-----' })).some(p => p.includes('secret')));
  assert.ok(eventProblems(event({ evidence: 'ops_' + 'a'.repeat(40) })).some(p => p.includes('secret')));
  assert.ok(eventProblems(event({ evidence: 'x'.repeat(17000) })).some(p => p.includes('16 KiB')));
});

test('profiles need their fields, valid scores and unique ids', () => {
  assert.deepEqual(profileProblems(profile()), []);
  assert.ok(profileProblems(profile({ stage: 'soon' }))[0].includes('unknown stage'));
  assert.ok(profileProblems(profile({ backlog: [item(), item()] }))[0].includes('duplicate'));
  assert.ok(profileProblems(profile({ backlog: [item({ impact: 9 })] }))[0].includes('1 to 5'));
});

test('item state comes from the newest event', () => {
  const i = item();
  assert.equal(itemState(i, [], 'x', NOW).state, 'open');
  assert.equal(itemState(i, [event({ app: 'x', item: 'a' })], 'x', NOW).state, 'done');
  assert.equal(itemState(i, [event({ app: 'y', item: 'a' })], 'x', NOW).state, 'open');
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', status: 'running' })], 'x', NOW).state, 'open');
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', status: 'skipped', dropped: true })], 'x', NOW).state, 'dropped');
});

test('a finding that mentions an item does not finish it', () => {
  const passedOver = event({ event: 'finding', app: 'x', item: 'a', operation: 'Passed over: budget spent' });
  assert.equal(itemState(item(), [passedOver], 'x', NOW).state, 'open');
  assert.equal(itemState(item(), [event({ app: 'x', item: 'a', ts: ago(1) }), passedOver], 'x', NOW).state, 'done');
});

test('a blocked item parks and then comes back by itself, so nothing waits on a person', () => {
  const blocked = event({ app: 'x', item: 'a', status: 'deferred', ts: ago(1) });
  assert.equal(itemState(item(), [blocked], 'x', NOW).state, 'parked');
  assert.equal(itemState(item(), [{ ...blocked, ts: ago(4) }], 'x', NOW).state, 'open');
  assert.equal(itemState(item(), [{ ...blocked, retry_after: ago(0.5) }], 'x', NOW).state, 'open');
});

test('recurring work rests and returns', () => {
  const i = item({ repeat_days: 7 });
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', ts: ago(2) })], 'x', NOW).state, 'resting');
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', ts: ago(8) })], 'x', NOW).state, 'open');
});

test('daily work comes back on the next daily run, even one that starts a little early', () => {
  const i = item({ repeat_days: 1 });
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', ts: ago(0.98) })], 'x', NOW).state, 'open');
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', ts: ago(0.2) })], 'x', NOW).state, 'resting');
});

test('a rest longer than a day must say why', () => {
  assert.deepEqual(profileProblems(profile({ backlog: [item({ repeat_days: 1 })] })), []);
  assert.ok(profileProblems(profile({ backlog: [item({ repeat_days: 7 })] }))[0].includes('pace_reason'));
  assert.deepEqual(profileProblems(profile({ backlog: [item({ repeat_days: 7, pace_reason: 'Shorts: the Mac pass makes every due Short' })] })), []);
});

test('rank filters by runner, stage and prerequisites, and favours the best ratio', () => {
  const p = profile({ stage: 'prelaunch', backlog: [
    item({ id: 'big', impact: 5, effort: 1 }), item({ id: 'small', impact: 1, effort: 5 }),
    item({ id: 'mac', runner: 'mac' }), item({ id: 'after-launch', requires: 'live' }), item({ id: 'second', after: ['big'] })
  ] });
  const ids = rank([p], [], { runner: 'cloud', now: NOW }).map(i => i.id);
  assert.deepEqual(ids, ['big', 'small']);
  const done = [event({ app: 'x', item: 'big' })];
  assert.ok(rank([p], done, { runner: 'cloud', now: NOW }).some(i => i.id === 'second'));
});

test('an idle app outranks one just worked on', () => {
  const a = profile({ id: 'a' }), b = profile({ id: 'b', backlog: [item({ id: 'b1' }), item({ id: 'b2' })] });
  const events = [event({ app: 'b', item: 'b1', ts: ago(0) })];
  assert.equal(rank([a, b], events, { runner: 'cloud', now: NOW })[0].app, 'a');
});

test('Apple downloads reports total first-time downloads by day and source', () => {
  const tsv = ['Date\tApp Name\tDownload Type\tSource Type\tCounts', '2026-11-03\tS\tFirst-time download\tApp Store search\t3', '2026-11-03\tS\tFirst-time download\tWeb referrer\t2', '2026-11-03\tS\tRedownload\tApp Store search\t4', '2026-11-04\tS\tAuto-update\tUnavailable\t9'].join('\n');
  const out = downloadRows(tsv);
  assert.deepEqual(out.days['2026-11-03'], { first: 5, re: 4 });
  assert.deepEqual(out.days['2026-11-04'], { first: 0, re: 0 });
  assert.deepEqual(out.sources, { 'App Store search': 3, 'Web referrer': 2 });
});

test('a report without the expected columns is an error, not a zero', () => {
  assert.throws(() => downloadRows('a\tb\n1\t2'), /no Date or Counts/);
});

test('latest keeps the newest value of each metric', () => {
  const metrics = [{ app: 'x', values: { a: 1, b: 1 } }, { app: 'x', values: { b: 2 } }, { app: 'y', values: { a: 9 } }];
  assert.deepEqual(latest(metrics, 'x'), { a: 1, b: 2 });
});

test('parseLines reports unreadable lines instead of dropping them silently', () => {
  const { records, problems } = parseLines('{"a":1}\nnope\n');
  assert.equal(records.length, 1);
  assert.deepEqual(problems, ['ledger line 2 is not JSON']);
});

test('the board says "not yet read" rather than inventing a zero', () => {
  const board = renderBoard([profile()], [event({ app: 'x', item: 'a', operation: 'did | it', channel: 'web' })], []);
  assert.ok(board.includes('not yet read'));
  assert.ok(board.includes('did / it'));
});

test('processedThrough tracks report instances, not the days inside them', () => {
  const metrics = [
    { app: 'a', source: 'asc-analytics', throughDay: '2026-11-04' },
    { app: 'a', source: 'asc-analytics', throughDay: '2026-11-05', processedThrough: '2026-11-07' },
    { app: 'a', source: 'itunes-lookup', processedThrough: '2026-12-01' },
    { app: 'b', source: 'asc-analytics', throughDay: '2026-11-02' }
  ];
  assert.equal(processedThrough(metrics, 'a'), '2026-11-07');
  assert.equal(processedThrough(metrics, 'b'), '2026-11-02');
  assert.equal(processedThrough(metrics, 'c'), undefined);
});

const hn = { url: 'https://example.com/tool', title: 'Show HN: Tool – a log viewer for the terminal', tryIt: 'Free download' };
const story = (days, extra) => ({ objectID: String(days), created_at: ago(days), title: 'Show HN: Tool', url: 'https://example.com/tool', points: 2, num_comments: 0, ...extra });

test('a hackerNews profile needs a plain Show HN title, an https URL and a way to try it', () => {
  assert.deepEqual(profileProblems(profile({ hackerNews: hn })), []);
  assert.deepEqual(profileProblems(profile()), []);
  const problems = profileProblems(profile({ hackerNews: { url: 'http://x', title: 'The best FASTER tool ever!' } }));
  for (const bit of ['https', 'tryIt', 'Show HN', 'exclamation', 'capitals', 'hype']) assert.ok(problems.some(p => p.includes(bit)), bit);
  assert.ok(hnTitleProblems('Show HN: ' + 'x'.repeat(80)).some(p => p.includes('80')));
});

test('only Show HN stories naming the app, or its URL, count as its stories', () => {
  const hits = [
    story(3), story(3),
    { objectID: 'b', created_at: ago(1), title: 'Tool time in the garden', url: 'https://other.org', points: 50, num_comments: 9 },
    { objectID: 'c', created_at: ago(2), title: 'Something', url: 'http://www.example.com/tool/', points: 1, num_comments: 0 }
  ];
  assert.deepEqual(hnStories(profile({ name: 'Tool', hackerNews: hn }), hits).map(s => s.objectID), ['3', 'c']);
});

test('Show HN is due once for a live developer tool, and never spammed', () => {
  const app = profile({ hackerNews: hn });
  assert.equal(hnVerdict(profile(), [], [], NOW).due, false);
  assert.equal(hnVerdict(profile({ hackerNews: hn, stage: 'prelaunch' }), [], [], NOW).due, false);
  assert.deepEqual(hnVerdict(app, [], [], NOW), { due: true, repost: false, reason: 'never submitted' });
  // one post a month across every app
  assert.match(hnVerdict(app, [], [event({ app: 'other', channel: 'hacker-news', ts: ago(10) })], NOW).reason, /one a month/);
  assert.equal(hnVerdict(app, [], [event({ app: 'other', channel: 'hacker-news', ts: ago(31) })], NOW).due, true);
  // a story with real attention ends it for a year; a quiet one allows one repost after two weeks
  assert.match(hnVerdict(app, [story(100, { points: 40 })], [], NOW).reason, /already discussed/);
  assert.equal(hnVerdict(app, [story(400, { points: 40 })], [], NOW).due, true);
  assert.match(hnVerdict(app, [story(5)], [], NOW).reason, /waits 14 days/);
  assert.deepEqual(hnVerdict(app, [story(20)], [], NOW).repost, true);
  assert.match(hnVerdict(app, [story(200), story(20)], [], NOW).reason, /no more reposts/);
});

test('the submit link is Hacker News\'s own pre-filled form', () => {
  assert.equal(hnSubmitLink('https://a.b/c?d=1', 'Show HN: A & B'), 'https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fa.b%2Fc%3Fd%3D1&t=Show%20HN%3A%20A%20%26%20B');
});
