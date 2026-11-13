import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hnStories, hnSubmitLink, hnTitleProblems, hnVerdict, processedThrough, downloadRows, discoveryRows, referrerRows, newestPerDay, mergedDays, reportValues, downloadsMismatch, eventProblems, endProblems, itemState, leftOpenProblems, latest, parseLines, profileProblems, rank, renderBoard, shortsResults, guideResults, storeResults, killVerdict, lifted, showHnFile, runnerOf, approachResults, coverageResults, pitchSnapshot, latestPitches, queueProof, youtubeSnapshots, experimentState, experimentItems, ideaProblems, ownerOptions, learnApp, channelOf, productOf, visitTotals, visitSnapshot, latestVisits } from '../../skills/app-marketing/scripts/marketing.mjs';
import { readFileSync } from 'node:fs';

const DAY = 86400000;
const NOW = Date.parse('2026-11-05T12:00:00Z');
const ago = days => new Date(NOW - days * DAY).toISOString();
const event = extra => ({ v: 1, ts: ago(0), run_id: 'r', skill: 'app-marketing', agent: 'test', event: 'action', status: 'ok', ...extra });
const item = extra => ({ id: 'a', title: 'A', channel: 'web', runner: 'cloud', impact: 3, effort: 1, ...extra });
const profile = extra => ({ id: 'x', name: 'X', stage: 'live', goal: 'g', audience: 'a', positioning: 'p', searchPhrase: { phrase: 'X app', rank: 1, checked: '2026-11-12' }, backlog: [item()], ...extra });

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

test('a repeat shorter than a day still rests right after it is done', () => {
  const i = item({ repeat_days: 0.5 });
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', ts: ago(0) })], 'x', NOW).state, 'resting');
  assert.equal(itemState(i, [event({ app: 'x', item: 'a', ts: ago(0.5) })], 'x', NOW).state, 'open');
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
  const ids = rank([p], [], { runner: 'cloud', now: NOW }).filter(i => i.channel !== 'invent').map(i => i.id);
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
  assert.deepEqual(out.days['2026-11-03'], { first: 5, re: 4, sources: { 'App Store search': 3, 'Web referrer': 2 } });
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

test('from 2026-11-11 a run cannot leave an issue open without naming what blocks it', () => {
  const after = '2026-11-12T12:00:00Z';
  assert.deepEqual(leftOpenProblems(event({ ts: ago(0), status: 'deferred' })), [], 'older events are not checked');
  assert.ok(leftOpenProblems(event({ ts: after, status: 'deferred' })).length > 0, 'a deferral without a blocker is refused');
  assert.ok(leftOpenProblems(event({ ts: after, status: 'skipped', blocked_by: 'later', reason: 'x' })).length > 0, 'an unknown blocker is refused');
  assert.deepEqual(leftOpenProblems(event({ ts: after, status: 'failed', blocked_by: 'owner', reason: 'needs a sign-in' })), []);
  assert.deepEqual(leftOpenProblems(event({ ts: after, status: 'ok' })), []);
  assert.ok(leftOpenProblems(event({ ts: after, status: 'deferred', item: 'fud/shorts', blocked_by: 'pacing', reason: 'slots taken' })).length > 0, 'a taken slot never defers a Short');
  assert.ok(leftOpenProblems(event({ ts: after, event: 'end' })).length > 0, 'an end must list what is left open');
  assert.deepEqual(leftOpenProblems(event({ ts: after, event: 'end', left_open: [] })), []);
  assert.ok(leftOpenProblems(event({ ts: after, event: 'end', left_open: [{ issue: 'x' }] })).length > 0);
  assert.deepEqual(leftOpenProblems(event({ ts: after, event: 'end', left_open: [{ issue: 'Fud Short', blocked_by: 'owner', needs: 'App Store sign-in' }] })), []);
  assert.ok(eventProblems(event({ ts: after, status: 'deferred' })).some(p => /blocked_by/.test(p)), 'eventProblems carries the rule');
});

// ---- 1.14.0: downloads counted once, more of Apple's reports, Shorts state from the registry, autonomy ----

const AFTER = '2026-11-13T12:00:00Z';

test('a date Apple repeats in a later instance is counted once, from the newest instance', () => {
  // Füd on 2026-11-11 and 11-12: the 11-10 downloads came in both instances, and a pull added them twice (5, true 3).
  const day = (first, search = first) => ({ first, re: 0, sources: { 'App Store search': search } });
  const merged = newestPerDay([
    { processingDate: '2026-11-12', days: { '2026-11-10': day(2), '2026-11-11': day(1) } },
    { processingDate: '2026-11-11', days: { '2026-11-09': day(0), '2026-11-10': day(2) } },
    { processingDate: '2026-11-12', days: { '2026-11-11': { first: 0, re: 1 } } }
  ]);
  assert.deepEqual(merged['2026-11-10'], day(2), 'the newer instance replaces the date, never adds to it');
  assert.equal(merged['2026-11-11'].re, 1, 'segments of one instance add up');
  assert.equal(reportValues('asc-analytics', merged).downloads, 3);
});

test('stored lines merge by date, so totals come from unique days and a wrong total is caught', () => {
  const metrics = [
    { app: 'fud', source: 'asc-analytics', days: { '2026-11-09': { first: 0, re: 0 }, '2026-11-10': { first: 2, re: 0 } }, values: { downloads: 2 } },
    { app: 'fud', source: 'asc-analytics', days: { '2026-11-10': { first: 2, re: 0 }, '2026-11-11': { first: 1, re: 0 } }, values: { downloads: 5 } },
    { app: 'fud', source: 'itunes-lookup', values: { ratingCount: 11 } }
  ];
  assert.equal(Object.keys(mergedDays(metrics, 'fud')).length, 3);
  assert.deepEqual(downloadsMismatch(metrics, 'fud'), { shown: 5, unique: 3 });
  const corrected = [...metrics, { app: 'fud', source: 'asc-analytics', recount: true, days: {}, values: { downloads: 3 } }];
  assert.equal(downloadsMismatch(corrected, 'fud'), null, 'an appended correcting line fixes it without rewriting history');
  assert.equal(downloadsMismatch([], 'fud'), null);
});

test('processedThrough is kept per report', () => {
  const metrics = [{ app: 'a', source: 'asc-analytics', processedThrough: '2026-11-12' }, { app: 'a', source: 'asc-discovery', processedThrough: '2026-11-10' }];
  assert.equal(processedThrough(metrics, 'a', 'asc-discovery'), '2026-11-10');
  assert.equal(processedThrough(metrics, 'a'), '2026-11-12');
});

test('the discovery report gives impressions, page views and page views by source', () => {
  const tsv = ['Date\tEvent\tPage Type\tSource Type\tCounts\tUnique Counts', '2026-11-10\tImpression\tNo page\tApp Store search\t8\t8',
    '2026-11-10\tPage view\tProduct page\tApp Store search\t3\t3', '2026-11-10\tPage view\tProduct page\tWeb referrer\t2\t2', '2026-11-10\tTap\tNo page\tApp Store search\t1\t1'].join('\n');
  assert.deepEqual(discoveryRows(tsv).days['2026-11-10'], { impressions: 8, pageViews: 5, taps: 1, pageViewSources: { 'App Store search': 3, 'Web referrer': 2 } });
});

test('Detailed reports name the web or app referrer behind a download', () => {
  const tsv = ['Date\tDownload Type\tSource Type\tSource Info\tCounts', '2026-11-10\tFirst-time download\tWeb referrer\touro-apps.vercel.app\t5',
    '2026-11-10\tFirst-time download\tApp referrer\tcom.google.ios.youtube\t6', '2026-11-10\tFirst-time download\tApp Store search\t\t9', '2026-11-10\tAuto-update\tWeb referrer\tx.com\t7'].join('\n');
  assert.deepEqual(referrerRows(tsv).days['2026-11-10'].referrers, { 'Web referrer: ouro-apps.vercel.app': 5, 'App referrer: com.google.ios.youtube': 6 });
});

test('a Shorts item is done only while its Short is live or scheduled in the registry', () => {
  const i = item({ id: 'shorts', channel: 'youtube-shorts', runner: 'mac' });
  const made = event({ app: 'x', item: 'shorts', ts: ago(1), operation: 'Made x-cereal, scheduled' });
  const ep = extra => ({ id: 'x-cereal', app: 'x', videoId: 'abc', status: 'scheduled', publishAt: ago(-4), ...extra });
  assert.equal(itemState(i, [made], 'x', NOW, [ep()]).state, 'done');
  assert.equal(itemState(i, [made], 'x', NOW, [ep({ status: 'pulled' })]).state, 'open', 'a pulled Short reopens the item');
  assert.equal(itemState(i, [made], 'x', NOW, [ep({ id: 'old', status: 'live', publishAt: undefined, postedAt: ago(30) })]).state, 'open', 'an old live Short does not count');
  assert.equal(itemState(i, [made], 'x', NOW, []).state, 'open', 'nothing uploaded');
  assert.equal(itemState(i, [made], 'x', NOW).state, 'done', 'without the registry (the cloud) the ledger decides');
  const p = profile({ shortsSlug: 'x-2', backlog: [i] });
  assert.equal(rank([p], [made], { runner: 'mac', now: NOW, registry: { episodes: [ep({ app: 'x-2', status: 'pulled' })] } }).length, 1);
  assert.equal(rank([p], [made], { runner: 'mac', now: NOW, registry: { episodes: [ep({ app: 'x-2' })] } }).length, 0);
});

test('an end that leaves due work undone is refused', () => {
  const p = profile({ backlog: [item({ runner: 'mac' })] });
  const end = extra => ({ v: 1, ts: AFTER, run_id: 'mkt-mac-20261113T133500Z', skill: 'app-marketing', agent: 't', event: 'end', status: 'ok', left_open: [], ...extra });
  const nowEnd = Date.parse(AFTER);
  assert.equal(runnerOf(end()), 'mac');
  assert.match(endProblems(end(), [p], [], { now: nowEnd })[0], /x\/a/);
  assert.deepEqual(endProblems(end(), [p], [event({ ts: AFTER, app: 'x', item: 'a' })], { now: nowEnd }), [], 'done in this run');
  assert.deepEqual(endProblems(end(), [p], [event({ ts: AFTER, app: 'x', item: 'a', status: 'deferred', blocked_by: 'outside', reason: 'Apple down', retry_after: '2026-11-14T00:00:00Z' })], { now: nowEnd }), [], 'logged with a blocker');
  assert.ok(!endProblems(end({ run_id: 'mkt-cloud-1' }), [p], [], { now: nowEnd }).some(x => /x\/a\b/.test(x)), 'another runner\'s item');
  assert.deepEqual(endProblems(end({ ts: '2026-11-12T14:25:00Z' }), [p], [], { now: nowEnd }), [], 'history is not re-judged');
  assert.ok(eventProblems(end({ operation: 'Not reached this run, and not blocked: two Shorts' })).some(x => /undone/.test(x)));
});

test('the Mac pass core stage and Shorts stage each answer for their own items', () => {
  const p = profile({ backlog: [item({ runner: 'mac' }), item({ id: 's', runner: 'mac', channel: 'youtube-shorts' })] });
  const end = run_id => ({ v: 1, ts: AFTER, run_id, skill: 'app-marketing', agent: 't', event: 'end', status: 'ok', left_open: [] });
  const nowEnd = Date.parse(AFTER);
  assert.deepEqual(endProblems(end('mkt-mac-20261113T133500Z'), [p], [], { now: nowEnd }).map(x => /x\/a/.test(x) && !/x\/s/.test(x)), [true]);
  assert.deepEqual(endProblems(end('mkt-mac-shorts-20261113T150000Z'), [p], [], { now: nowEnd }).map(x => /x\/s/.test(x) && !/x\/a/.test(x)), [true]);
});

test('youtube snapshots come from shorts.mjs views: public Shorts only, one line per app with a profile', () => {
  const registry = { apps: { 'x-2': {}, orphan: {} }, episodes: [
    { id: 'a', app: 'x-2', status: 'live', metrics: [{ at: '2026-11-10T00:00:00Z', views: 40 }] },
    { id: 'b', app: 'x-2', status: 'pulled', metrics: [{ at: '2026-11-10T00:00:00Z', views: 900 }] },
    { id: 'c', app: 'x-2', status: 'scheduled', publishAt: '2026-11-20T00:00:00Z' }] };
  const lines = youtubeSnapshots(registry, [profile({ shortsSlug: 'x-2' })], 'T');
  assert.deepEqual(lines, [{ at: 'T', app: 'x', source: 'youtube', values: { shortsViews: 40, publicShorts: 1, scheduledShorts: 1 } }]);
});

test('from 2026-11-12 nothing waits on the owner: owner-only work is dropped, not left open', () => {
  assert.ok(leftOpenProblems(event({ ts: AFTER, status: 'deferred', blocked_by: 'owner', reason: 'needs a sign-in' }))[0].includes('drop'));
  assert.deepEqual(leftOpenProblems(event({ ts: AFTER, status: 'skipped', dropped: true, reason: 'owner-only claim' })), []);
  assert.ok(leftOpenProblems(event({ ts: AFTER, event: 'end', left_open: [{ issue: 'Business Hub claim', blocked_by: 'owner', needs: 'the owner claims it' }] })).length > 0);
  assert.deepEqual(leftOpenProblems(event({ ts: '2026-11-12T12:00:00Z', status: 'failed', blocked_by: 'owner', reason: 'x' })), [], 'older lines stay valid');
});

const daysOf = (from, counts, source = 'App Store search') => Object.fromEntries(counts.map((n, i) => [new Date(Date.parse(from) + i * DAY).toISOString().slice(0, 10), { first: n, re: 0, sources: { [source]: n } }]));

test('a Short is judged on search and browse downloads in its 72 hours against the 7 days before', () => {
  const days = daysOf('2026-11-01', [0, 0, 1, 0, 0, 0, 1, 4, 3, 2, 0, 0]);   // Short on 11-08: 9 in 3 days vs about 0.3 a day
  const [r] = shortsResults([{ id: 's1', status: 'live', postedAt: '2026-11-08T01:00:00Z' }], days, {}, Date.parse('2026-11-13T00:00:00Z'));
  assert.equal(r.judged, true);
  assert.equal(r.after, 9);
  assert.ok(r.effect);
  const flat = shortsResults([{ id: 's2', status: 'live', postedAt: '2026-11-08T01:00:00Z' }], daysOf('2026-11-01', [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1]), {}, Date.parse('2026-11-13T00:00:00Z'));
  assert.equal(flat[0].effect, false);
  const young = shortsResults([{ id: 's3', status: 'scheduled', publishAt: '2026-11-11T01:00:00Z' }], days, {}, Date.parse('2026-11-13T00:00:00Z'));
  assert.equal(young[0].judged, false, 'its 72 hours are not in the data yet');
  const pulledEarly = shortsResults([{ id: 's4', status: 'pulled', publishAt: '2026-11-11T01:00:00Z', pulledAt: '2026-11-10T00:00:00Z' }], days, {}, Date.parse('2026-11-13T00:00:00Z'));
  assert.equal(pulledEarly.length, 0, 'a Short pulled before it went public is not a result');
  const burst = shortsResults([{ id: 'a', status: 'live', postedAt: '2026-11-05T01:00:00Z' }, { id: 'b', status: 'live', postedAt: '2026-11-06T01:00:00Z' }], days, {}, Date.parse('2026-11-13T00:00:00Z'));
  assert.deepEqual(burst[0].shorts, ['a', 'b'], 'Shorts inside each other\'s 72 hours are one result');
  const viaYouTube = shortsResults([{ id: 's5', status: 'live', postedAt: '2026-11-08T01:00:00Z' }], daysOf('2026-11-01', Array(12).fill(1)), { '2026-11-09': { referrers: { 'App referrer: com.google.ios.youtube': 5 } } }, Date.parse('2026-11-13T00:00:00Z'));
  assert.equal(viaYouTube[0].effect, true, 'a YouTube referrer download counts');
});

test('three mature results with no download effect stop the channel, and rank then skips it', () => {
  const r = effect => ({ judged: true, effect, start: '2026-11-01', after: 0, expected: 1 });
  assert.equal(killVerdict([r(true), r(false), r(false), r(false)]).verdict, 'stop');
  assert.equal(killVerdict([r(false), r(false), r(true)]).verdict, 'working');
  assert.equal(killVerdict([r(false), r(false), { judged: false }]).verdict, 'keep');
  assert.ok(lifted(3, 0) && !lifted(1, 0) && !lifted(4, 3) && lifted(6, 3));
  const p = profile({ backlog: [item({ id: 's', channel: 'youtube-shorts' }), item({ id: 'g' })], stopped: { 'youtube-shorts': { since: '2026-11-20', evidence: 'three flat reads' } } });
  assert.deepEqual(rank([p], [], { runner: 'cloud', now: NOW }).filter(i => i.channel !== 'invent').map(i => i.id), ['g']);
  assert.deepEqual(profileProblems(p), []);
  assert.ok(profileProblems(profile({ stopped: { seo: {} } }))[0].includes('stopped.seo'));
});

test('guides are judged on web-referrer downloads from eight weeks on; store text on the week after a change', () => {
  const days = daysOf('2026-09-01', Array(150).fill(0), 'Web referrer');
  days['2026-12-01'].sources['Web referrer'] = 2;
  const g = guideResults('2026-09-01T15:00:00Z', days);
  assert.equal(g[0].start, '2026-10-27');
  assert.equal(g.length, 3);
  assert.deepEqual(g.map(b => b.effect), [false, true, false]);
  assert.equal(guideResults(undefined, days).length, 0);
  const sdays = daysOf('2026-11-01', [1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3]);
  const [c] = storeResults([{ ts: '2026-11-08T10:00:00Z', item: 'keywords', changed: 'subtitle' }], sdays, {});
  assert.equal(c.judged, true);
  assert.equal(c.before.downloads, 7);
  assert.equal(c.after.downloads, 21);
  assert.ok(c.effect);
});

test('the Show HN file says "none" unless a booking is ahead', () => {
  const dev = profile({ id: 'tool', hackerNews: hn });
  assert.match(showHnFile([dev, profile()], [], NOW), /booked: none/);
  const booked = event({ app: 'tool', channel: 'hacker-news', item: 'show-hn', status: 'deferred', blocked_by: 'pacing', operation: 'Show HN booked for 2026-11-07', retry_after: '2026-11-07T17:00:00Z' });
  assert.match(showHnFile([dev], [booked], NOW), /booked: 2026-11-07 tool/);
  assert.match(showHnFile([dev], [booked, event({ app: 'tool', channel: 'hacker-news', status: 'deferred', blocked_by: 'pacing', operation: 'Cancelled: not free', retry_after: '2026-11-08T17:00:00Z' })], NOW), /booked: none/);
});

test('a live app needs a checked search phrase; a retired Short still stands', () => {
  assert.ok(profileProblems(profile({ searchPhrase: undefined }))[0].includes('searchPhrase'));
  assert.deepEqual(profileProblems(profile({ stage: 'prelaunch', searchPhrase: undefined })), []);
  // A web product needs no App Store search phrase, but does need the https address people open.
  assert.deepEqual(profileProblems(profile({ platform: 'web', webUrl: 'https://x.example', searchPhrase: undefined })), []);
  assert.ok(profileProblems(profile({ platform: 'web', searchPhrase: undefined }))[0].includes('webUrl'));
  assert.ok(profileProblems(profile({ platform: 'web', webUrl: 'https://x.example', appStoreId: '1' })).some(p => p.includes('appStoreId')));
  assert.ok(profileProblems(profile({ platform: 'android' }))[0].includes('platform'));
  assert.deepEqual(profileProblems(profile({ searchPhrase: { phrase: 'Data Center: AI Frontier', rank: null, checked: '2026-11-12' } })), []);
  const made = event({ app: 'x', item: 'shorts', ts: ago(1) });
  assert.equal(itemState(item({ id: 'shorts', channel: 'youtube-shorts' }), [made], 'x', NOW, [{ id: 'e', status: 'retired', postedAt: ago(0.5) }]).state, 'done');
});

test('a Shorts item rests for the registry\'s cadence, which youtube-growth owns', () => {
  const i = item({ id: 'shorts', channel: 'youtube-shorts', runner: 'mac' });
  const made = event({ app: 'x', item: 'shorts', ts: ago(3) });
  const live = [{ id: 'e', status: 'live', postedAt: ago(2.9) }];
  assert.equal(itemState(i, [made], 'x', NOW, { episodes: live, cadenceDays: 7 }).state, 'resting');
  assert.equal(itemState(i, [made], 'x', NOW, { episodes: live, cadenceDays: 2 }).state, 'open', 'a doubled-down app comes back sooner');
  assert.equal(itemState(i, [made], 'x', NOW, { episodes: [], cadenceDays: 7 }).state, 'open');
});

test('a pitch approach with 30 sent and no positive reply is retired; one positive keeps it working', () => {
  const queue = [{ type: 'approach', id: 'a1' }, { type: 'approach', id: 'a2' }];
  const snapshot = [];
  for (let i = 0; i < 30; i += 1) {
    queue.push({ type: 'pitch', id: `p${i}`, app: 'x', approach: 'a1' }, { type: 'pitch', id: `q${i}`, app: 'x', approach: 'a2' });
    snapshot.push({ id: `p${i}`, first: { status: 'sent' }, replies: i === 0 ? [{ kind: 'no' }] : [], visits: 1 });
    snapshot.push({ id: `q${i}`, first: { status: i < 29 ? 'sent' : 'failed' }, replies: [], visits: 0 });
  }
  const [a1, a2] = approachResults(queue, snapshot);
  assert.deepEqual([a1.verdict, a1.sent, a1.optOuts, a1.visits], ['retire', 30, 1, 30]);
  assert.deepEqual([a2.verdict, a2.sent], ['keep', 29]);
  queue.push({ type: 'outcome', pitch: 'p3', kind: 'positive' });
  assert.equal(approachResults(queue, snapshot)[0].verdict, 'working');
  queue.push({ type: 'retire', approach: 'a2' });
  assert.equal(approachResults(queue, snapshot)[1].verdict, 'retired');
});

test('coverage is judged on web-referrer downloads and on search and browse against the week before', () => {
  const days = {};
  for (let d = 1; d <= 30; d += 1) days[`2026-11-${String(d).padStart(2, '0')}`] = { first: 1, sources: { 'App Store search': 1 } };
  const flat = coverageResults([{ pitch: 'p', kind: 'coverage', at: '2026-11-10T12:00:00Z', url: 'https://x' }], days)[0];
  assert.deepEqual([flat.judged, flat.effect, flat.web], [true, false, 0]);
  days['2026-11-12'].sources['Web referrer'] = 1;
  assert.equal(coverageResults([{ pitch: 'p', kind: 'coverage', at: '2026-11-10T12:00:00Z' }], days)[0].effect, true);
  assert.equal(coverageResults([{ pitch: 'p', kind: 'coverage', ts: '2026-11-28T00:00:00Z' }], days)[0].judged, false);
});

test('a pitch snapshot keeps states and counts per app, never text', () => {
  const lines = pitchSnapshot({ pitches: [
    { id: 'p1', app: 'fud', approach: 'a', first: { status: 'sent', at: 't' }, followUp: null, replies: [{ id: 'r', kind: 'other', at: 't', answered: false, body: 'secret words', fromDomain: 'x.example' }], visits: 2 },
    { id: 'p2', app: 'space-worms', approach: 'a', first: { status: 'refused', at: null, error: 'refused: x' }, followUp: null, replies: [], visits: 0 }] }, 'now');
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[0].values, { pitchesSent: 1, pitchFollowUps: 0, pitchReplies: 1, pitchOptOuts: 0, pitchVisits: 2 });
  assert.doesNotMatch(JSON.stringify(lines), /secret words|x\.example/);
  assert.equal(latestPitches([...lines, { source: 'pitches', pitches: [{ id: 'p1', first: { status: 'sent' }, replies: [], visits: 5 }] }]).find(p => p.id === 'p1').visits, 5);
});

test('pitches only reads, and proves access with the deployed queue digest, which needs no token', () => {
  assert.equal(queueProof(Buffer.from('abc')), 'Queue ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const src = readFileSync(new URL('../../skills/app-marketing/scripts/marketing.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /args\.send/, 'no flag makes a run send');
  const calls = [...src.matchAll(/fetch\(`\$\{base\}\?[^`]*`|const url = `\$\{base\}\?[^`]*`/g)].map(m => m[0]);
  assert.ok(calls.length >= 2);
  for (const c of calls) assert.match(c, /dry=1/, c);
});

test('a ledger line is corrected by a later one with the same run and event that names its ts', async () => {
  const { correctedLines } = await import('../../skills/app-marketing/scripts/marketing.mjs');
  const end = { run_id: 'mkt-tick-1', event: 'end', ts: '2026-11-12T20:24:27.875Z' };
  const records = [{ ...end, event: 'action' }, end, { ...end, ts: '2026-11-12T21:00:00Z', corrects: end.ts, left_open: [] }];
  assert.deepEqual([...correctedLines(records).fixed], [1]);
  assert.deepEqual(correctedLines(records).problems, []);
  const stray = correctedLines([{ run_id: 'x', event: 'end', ts: 't2', corrects: 't1' }]);
  assert.match(stray.problems[0], /names no earlier end of x/);
});

// ---- the App Store funnel ----
import { funnelStage, listingTestResults, rescoreFunnel, FUNNEL_REF } from '../../skills/app-marketing/scripts/marketing.mjs';

const fdays = (from, n, make) => Object.fromEntries(Array.from({ length: n }, (_, i) => { const d = new Date(Date.parse(`${from}T00:00:00Z`) + i * DAY).toISOString().slice(0, 10); return [d, make(i)]; }));
const view = (imp, search, other = 0) => ({ impressions: imp, pageViews: search + other, taps: 0, pageViewSources: { 'App Store search': search, ...(other ? { Unavailable: other } : {}) } });
const dl = n => ({ first: n, re: 0, sources: { 'App Store search': n } });

test('funnel: low tap-through is named, and only App Store page views count against impressions', () => {
  const s = funnelStage(fdays('2026-11-01', 7, () => dl(2)), fdays('2026-11-01', 7, () => view(100, 2, 20)));
  assert.equal(s.stage, 'tap-through');
  assert.equal(s.storePageViews, 14);
  assert.equal(s.otherPageViews, 140);
  assert.equal(s.next.field, 'subtitle');
});

test('funnel: too few impressions are not judged further, and in-range stages leave reach as the limit', () => {
  assert.equal(funnelStage(fdays('2026-11-01', 5, () => dl(1)), fdays('2026-11-01', 5, () => view(15, 3))).stage, 'impressions');
  const ok = funnelStage(fdays('2026-11-01', 7, () => dl(2)), fdays('2026-11-01', 7, () => view(50, 5)));
  assert.equal(ok.stage, 'impressions');
  assert.match(ok.why, /reach limits/);
});

test('funnel: low conversion is named once tap-through is in range and the sample is big enough', () => {
  const s = funnelStage(fdays('2026-11-01', 7, () => dl(0)), fdays('2026-11-01', 7, () => view(50, 5)));
  assert.equal(s.stage, 'conversion');
  assert.equal(s.next.live, 'today');
  const small = funnelStage(fdays('2026-11-01', 7, () => dl(0)), fdays('2026-11-01', 7, () => view(50, 2)));
  assert.equal(small.judged.conversion, false);
  assert.notEqual(small.stage, 'conversion');
});

test('funnel: the window is the days both reports cover, at most 14', () => {
  const s = funnelStage(fdays('2026-11-03', 30, () => dl(1)), fdays('2026-11-01', 30, () => view(20, 2)));
  assert.equal(s.from, '2026-11-17');
  assert.equal(s.to, '2026-11-30');
  assert.equal(FUNNEL_REF.windowDays, 14);
});

test('listing tests wait for their version, then read the stage 7 days after against 7 before', () => {
  const days = fdays('2026-11-01', 20, () => dl(1));
  const disc = fdays('2026-11-01', 20, i => view(100, i < 10 ? 2 : 8));
  const test1 = { stage: 'tap-through', field: 'subtitle', prepared: '2026-11-05', version: '1.0.2', before: {} };
  assert.match(listingTestResults([test1], days, disc, [], Date.parse('2026-11-06T12:00:00Z'))[0].why, /queued 2026-11-05, not submitted after 1 days/);
  const lookups = [{ at: '2026-11-11T05:00:00Z', app: 'x', source: 'itunes-lookup', values: { version: '1.0.2' } }];
  const [r] = listingTestResults([test1], days, disc, lookups);
  assert.equal(r.live, '2026-11-11');
  assert.equal(r.firstRead, '2026-11-19');
  assert.equal(r.judged, true);
  assert.equal(r.effect, true);
});

test('rescoreFunnel adds the weak stage item at impact 5 and lowers other stages', () => {
  const p = profile({ backlog: [item({ id: 'funnel-impressions', impact: 5 })] });
  const s = funnelStage(fdays('2026-11-01', 7, () => dl(2)), fdays('2026-11-01', 7, () => view(100, 2)));
  const out = rescoreFunnel(p, s);
  assert.equal(out.backlog.find(b => b.id === 'funnel-tap-through').impact, 5);
  assert.equal(out.backlog.find(b => b.id === 'funnel-impressions').impact, 2);
  assert.deepEqual(profileProblems(out), []);
});

test('listingTests in a profile need a date, a snapshot and a live date or version', () => {
  assert.ok(profileProblems(profile({ listingTests: [{ stage: 'reach', field: 'keywords' }] })).some(p => p.includes('listingTests[0]')));
  assert.deepEqual(profileProblems(profile({ listingTests: [{ stage: 'impressions', field: 'keywords', prepared: '2026-11-12', version: '1.3.1', before: { impressions: 1 } }] })), []);
});

test('a listing test for the next version goes live with the first lookup showing a newer version', () => {
  const t = { stage: 'impressions', field: 'keywords', prepared: '2026-11-12', version: 'next', before: { listing: { version: '1.3.0' } } };
  const lookups = [['2026-11-11', '1.4.0'], ['2026-11-12', '1.3.0'], ['2026-11-15', '1.3.1']].map(([d, v]) => ({ at: `${d}T05:00:00Z`, values: { version: v } }));
  assert.equal(listingTestResults([t], {}, {}, lookups)[0].live, '2026-11-15');
});

test('a queued listing test shows its queue date and is stale after 3 days unsubmitted', () => {
  const t = { stage: 'tap-through', field: 'subtitle', prepared: '2026-11-12', version: 'next', before: { listing: { version: '1.3.0' } } };
  const at = d => Date.parse(`${d}T17:00:00Z`);
  assert.equal(listingTestResults([t], {}, {}, [], at('2026-11-15'))[0].stale, false);
  const late = listingTestResults([t], {}, {}, [], at('2026-11-16'))[0];
  assert.equal(late.stale, true);
  assert.match(late.why, /queued 2026-11-12, not submitted after 4 days: STALE/);
  const sent = listingTestResults([{ ...t, submitted: '2026-11-13' }], {}, {}, [], at('2026-11-16'))[0];
  assert.equal(sent.stale, false);
  assert.match(sent.why, /submitted 2026-11-13/);
});

test('site-visits turns the Neon aggregate into the row youtube-growth reads', async () => {
  const { siteVisitsRow, SITE_VISITS_SQL } = await import('../../skills/app-marketing/scripts/marketing.mjs');
  const { siteDays } = await import('../../skills/youtube-growth/scripts/evaluate.mjs');
  const row = siteVisitsRow('vegas-microworks', [{ day: '2026-11-11', visits: '7', leads: 0 }, { day: '2026-11-12', visits: 3, leads: 1 }], '2026-11-12T23:00:00Z');
  assert.deepEqual(row, { at: '2026-11-12T23:00:00Z', app: 'vegas-microworks', source: 'site-visits', days: { '2026-11-11': { visits: 7, leads: 0 }, '2026-11-12': { visits: 3, leads: 1 } } });
  assert.deepEqual(Object.keys(siteDays([row])['vegas-microworks'].days), ['2026-11-11', '2026-11-12']);
  assert.throws(() => siteVisitsRow('x', []), /query rows/);
  assert.throws(() => siteVisitsRow('x', [{ day: 'today', visits: 1, leads: 0 }]), /bad row/);
  assert.match(SITE_VISITS_SQL, /from site_visits/);
  assert.match(SITE_VISITS_SQL, /from interest i where i.id > 1/);
  assert.doesNotMatch(SITE_VISITS_SQL, /contact|name|problem|path/);
});

const idea = extra => ({ id: 'i1', title: 'Report card', pattern: 'public data story', reaches: 'reporters', size: 'about 40 desks', effort: 2, moves: 'page visits', ...extra });
const experiment = extra => ({ id: 'e1', idea: 'Report card', pattern: 'public data story', url: 'https://example.com/card/', measure: 'page visits (site-visits)', shipped: '2026-11-01', judge: '2026-11-15', ...extra });
const inventOf = (p, events = [], now = NOW) => rank([p], events, { runner: 'cloud', now }).filter(i => i.channel === 'invent').map(i => i.id);

test('invent is offered for every profile, web products included, and comes back weekly', () => {
  const web = profile({ id: 'w', platform: 'web', webUrl: 'https://w.example.com', searchPhrase: undefined, backlog: [], experiments: [experiment()] });
  assert.deepEqual(inventOf(web), ['invent'], 'never invented');
  const invented = [event({ app: 'w', item: 'invent', experiment: 'e1', ts: ago(2) })];
  assert.deepEqual(inventOf(web, invented), [], 'invented 2 days ago with an experiment in flight');
  assert.deepEqual(inventOf(web, [{ ...invented[0], ts: ago(7) }]), ['invent'], 'a week on');
  assert.equal(rank([web], [], { runner: 'mac', now: NOW }).filter(i => i.channel === 'invent').length, 0, 'the cloud runs it');
});

test('with no experiment in flight, invent comes back the next day', () => {
  const p = profile({ experiments: [experiment({ verdicts: [{ on: '2026-11-04', verdict: 'retire', evidence: '3 visits' }] })] });
  const invented = [event({ app: 'x', item: 'invent', experiment: 'e0', ts: ago(1) })];
  assert.deepEqual(inventOf(p, invented), ['invent']);
  assert.deepEqual(inventOf(p, [{ ...invented[0], ts: ago(0.1) }]), [], 'not twice in one run');
});

test('an experiment is judged when its date comes: keep, change once, or retire', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  assert.equal(experimentState(experiment(), NOW).state, 'in flight');
  assert.equal(experimentState(experiment(), now).state, 'due');
  assert.ok(inventOf(profile({ experiments: [experiment()] }), [], now).includes('judge-e1'));
  const kept = experiment({ verdicts: [{ on: '2026-11-15', verdict: 'keep', evidence: '120 visits, 3 links in' }] });
  assert.equal(experimentState(kept, now).state, 'keep');
  assert.deepEqual(inventOf(profile({ experiments: [kept] }), [], now).filter(i => i.startsWith('judge-')), []);
  const changed = experiment({ judge: '2026-11-29', verdicts: [{ on: '2026-11-15', verdict: 'change', evidence: 'few visits; new headline' }] });
  assert.equal(experimentState(changed, now).state, 'in flight');
  assert.deepEqual(ideaProblems(profile({ experiments: [changed] })), []);
  const twice = experiment({ judge: '2026-12-13', verdicts: [changed.verdicts[0], { on: '2026-11-29', verdict: 'change', evidence: 'again' }] });
  assert.ok(ideaProblems(profile({ experiments: [twice] })).some(p => /changes once/.test(p)));
  assert.ok(ideaProblems(profile({ experiments: [experiment({ verdicts: changed.verdicts })] })).some(p => /new judge date/.test(p)));
});

test('a judge date past 14 days needs a reason, and ideas need honest scores', () => {
  assert.deepEqual(profileProblems(profile({ ideas: [idea()], experiments: [experiment()] })), []);
  assert.ok(ideaProblems(profile({ experiments: [experiment({ judge: '2026-12-30' })] })).some(p => /judge_reason/.test(p)));
  assert.deepEqual(ideaProblems(profile({ experiments: [experiment({ judge: '2026-12-30', judge_reason: 'search pages take 8 weeks to rank' })] })), []);
  assert.ok(ideaProblems(profile({ ideas: [idea({ moves: undefined })] })).some(p => /missing moves/.test(p)));
  assert.ok(ideaProblems(profile({ ideas: [idea({ needs: 'money' })] })).some(p => /cost and returns/.test(p)));
});

test('ideas that need a person or money are the owner\'s options; an ok invent names its experiment', () => {
  const p = profile({ ideas: [idea(), idea({ id: 'i2', title: 'Door hangers', needs: 'person', cost: 'two crew hours', returns: 'about 5 patrons from 500 doors' })] });
  assert.deepEqual(ownerOptions(p).map(i => i.id), ['i2']);
  assert.ok(eventProblems(event({ app: 'x', item: 'invent' })).some(x => /needs experiment/.test(x)));
  assert.deepEqual(eventProblems(event({ app: 'x', item: 'invent', experiment: 'e1' })), []);
  const learned = learnApp({ ...p, experiments: [experiment()] }, [], [], undefined, NOW);
  assert.deepEqual(learned.experiments.map(x => x.state), ['in flight']);
  assert.deepEqual(learned.options.map(i => i.id), ['i2']);
});

test('visits: each source has a channel, each view a product, and totals leave agent test loads out', () => {
  assert.deepEqual(channelOf('p:xp-astrojams-lob'), { channel: 'cross-promo', tag: 'xp-astrojams-lob' });
  assert.deepEqual(channelOf('p:fud-parentmap-1'), { channel: 'pitch', tag: 'fud-parentmap-1' });
  assert.deepEqual(channelOf('ref:google.co.uk'), { channel: 'search', tag: 'google.co.uk' });
  assert.deepEqual(channelOf('ref:reddit.com'), { channel: 'referral', tag: 'reddit.com' });
  assert.deepEqual(channelOf('direct'), { channel: 'direct', tag: 'direct' });
  const profiles = [profile({ id: 'hanzi-cards', site: 'ouro', siteSlug: 'hanzi-cards' }), profile({ id: 'lob', site: 'astrojams', siteSlug: 'lob', platform: 'web' })];
  assert.equal(productOf(profiles, 'ouro', 'hanzi-cards'), 'hanzi-cards');
  assert.equal(productOf(profiles, 'ouro', ''), 'ouro-site');
  assert.equal(productOf(profiles, 'lob', ''), 'lob');
  assert.equal(productOf(profiles, 'astrojams', 'lob'), 'lob');
  const report = { today: '2026-11-30', first: '2026-11-12', rows: [
    { day: '2026-11-30', site: 'ouro', section: 'hanzi-cards', source: 'ref:google.com', n: 3 },
    { day: '2026-11-20', site: 'ouro', section: 'hanzi-cards', source: 'p:xp-astrojams-lob', n: 2 },
    { day: '2026-11-30', site: 'ouro', section: 'hanzi-cards', source: 'internal', n: 5 },
    { day: '2026-11-30', site: 'ouro', section: 'hanzi-cards', source: 'utm:agent-test', n: 9 },
    { day: '2026-10-01', site: 'ouro', section: 'hanzi-cards', source: 'direct', n: 7 },
    { day: '2026-11-29', site: 'lob', section: '', source: 'direct', n: 1 },
    { day: '2026-11-29', site: 'astrojams', section: 'lob', source: 'p:lob-pitch-1', n: 1 },
  ] };
  const [hanzi, lob, quiet] = visitTotals(report, [...profiles, profile({ id: 'quiet' }), profile({ id: 'soon', stage: 'prelaunch' })]);
  assert.deepEqual(quiet, { app: 'quiet', visits: { d7: 0, d28: 0 }, pageViews: { d7: 0, d28: 0 }, surfaces: {}, channels: {} });
  assert.ok(!visitTotals(report, [...profiles, profile({ id: 'soon', stage: 'prelaunch' })]).some(t => t.app === 'soon'));
  assert.deepEqual(hanzi.visits, { d7: 3, d28: 5 });
  assert.deepEqual(hanzi.pageViews, { d7: 8, d28: 10 });
  assert.deepEqual(hanzi.channels, { 'search google.com': { d7: 3, d28: 3 }, 'cross-promo xp-astrojams-lob': { d7: 0, d28: 2 } });
  assert.deepEqual(lob.surfaces, { lob: { d7: 1, d28: 1 }, astrojams: { d7: 1, d28: 1 } });
  const lines = visitSnapshot([hanzi, lob], report, '2026-11-30T20:00:00Z');
  assert.deepEqual(lines[0].values, { siteVisits7: 3, siteVisits28: 5, sitePageViews7: 8, sitePageViews28: 10 });
  assert.equal(latestVisits([...lines, { ...lines[0], through: '2026-12-01' }], 'hanzi-cards').through, '2026-12-01');
});

test('log refuses an app with no profile, which check would fail', async () => {
  const { appendEvent } = await import('../../skills/app-marketing/scripts/marketing.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, readFileSync: read } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const root = mkdtempSync(`${tmpdir()}/mkt-`);
  mkdirSync(`${root}/marketing/apps`, { recursive: true });
  writeFileSync(`${root}/marketing/apps/x.json`, JSON.stringify(profile()));
  writeFileSync(`${root}/marketing/ledger.jsonl`, '');
  const base = { run_id: 'r', agent: 't', event: 'finding', status: 'ok' };
  assert.throws(() => appendEvent(root, { ...base, app: 'elsewhere' }), /unknown app elsewhere/);
  appendEvent(root, { ...base, app: 'x' });
  appendEvent(root, { ...base, targets: ['elsewhere'] });
  assert.equal(read(`${root}/marketing/ledger.jsonl`, 'utf8').trim().split('\n').length, 2);
});
