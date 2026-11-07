import { test } from 'node:test';
import assert from 'node:assert/strict';
import { processedThrough, downloadRows, eventProblems, itemState, latest, parseLines, profileProblems, rank, renderBoard } from '../../skills/app-marketing/scripts/marketing.mjs';

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
