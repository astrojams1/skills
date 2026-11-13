import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeRefs, closeProblems, compileFamilies, familiesOf, familyProblems, judge, familyRecords, landedAt, loadFamilies, logProblems, pitchOccurrences, recurring, reportLine, unmapped } from '../../skills/app-marketing/scripts/problems.mjs';
import { eventProblems, leftOpenProblems, missingProfiles, profileProblems, rank } from '../../skills/app-marketing/scripts/marketing.mjs';

const fams = compileFamilies([
  { key: 'pin-comment', title: 'Pinned comment', text: ['cannot pin'], cause: 'API has no pin', fix: 'Studio' },
  { key: 'token', title: 'Provider token', text: ['provider token'], not_text: ['token from 20'], cause: 'signed-in only', fix: 'owner' },
  { key: 'quiet', title: 'Quiet', text: ['never matches this'], cause: 'c', fix: 'f', history: ['2026-11-07 skills#1: seen in a PR'] }
]);
const at = (day, hour = 15) => `2026-11-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`;
const ev = extra => ({ v: 1, skill: 'app-marketing', agent: 't', run_id: 'r', event: 'finding', status: 'ok', operation: 'x', ...extra });
const git = { refs: { 'skills#10': Date.parse(at(12, 12)), 'app-sites#5': Date.parse(at(13, 1)) }, commits: [['abcdef1234567', Date.parse(at(11))]], floors: {}, seen: { skills: true, 'app-sites': true } };
const pins = [5, 7, 9].map(d => ev({ ts: at(d), operation: 'Pinned comment skipped: the API cannot pin' }));

test('the families file is valid and every family has a cause and a fix', () => {
  const real = loadFamilies();
  assert.ok(real.length >= 20);
  assert.deepEqual(familyProblems(real), []);
  assert.ok(familyProblems(compileFamilies([{ key: 'Bad Key', title: 't' }])).some(p => p.includes('lowercase')));
  assert.ok(familyProblems(compileFamilies([{ key: 'a', title: 't', cause: 'c', fix: 'f', history: ['yesterday'] }])).some(p => p.includes('history')));
});

test('a line meets a family by its problem key or its words, never a not_text line or a closing line', () => {
  assert.deepEqual([...familiesOf(ev({ problem: 'token', operation: 'other words' }), fams)], ['token']);
  assert.deepEqual([...familiesOf(ev({ operation: 'Looked for the provider token' }), fams)], ['token']);
  assert.deepEqual([...familiesOf(ev({ operation: 'next: space-worms/campaign provider token from 2026-11-12' }), fams)], []);
  assert.deepEqual([...familiesOf(ev({ left_open: [{ issue: 'x', needs: 'y', problem: 'pin-comment' }] }), fams)], ['pin-comment']);
  assert.deepEqual([...familiesOf(ev({ problem: 'token', closes: 'fixed', operation: 'provider token' }), fams)], []);
});

test('three days with no closing line is RECURRING; one or two is seen; history days count', () => {
  const rows = recurring(pins, fams, { git });
  const pin = rows.find(r => r.family === 'pin-comment');
  assert.equal(pin.status, 'RECURRING');
  assert.equal(pin.days, 3);
  assert.equal(pin.first, '2026-11-05');
  assert.equal(pin.last, '2026-11-09');
  assert.equal(recurring(pins.slice(0, 2), fams, { git }).find(r => r.family === 'pin-comment').status, 'seen');
  const quiet = rows.find(r => r.family === 'quiet');
  assert.equal(quiet.days, 1);
  assert.equal(quiet.first, '2026-11-07');
});

test('FIXED needs a landed change and no sighting after it; a sighting after is REOPENED with the failed fix', () => {
  const fix = ev({ ts: at(12, 20), problem: 'pin-comment', closes: 'fixed', cause: 'API has no pin', change: 'skills#10 Studio pins', check: 'due lists none' });
  assert.equal(recurring([...pins, fix], fams, { git }).find(r => r.family === 'pin-comment').status, 'FIXED');
  const again = ev({ ts: at(13), operation: 'the API cannot pin' });
  const row = recurring([...pins, fix, again], fams, { git }).find(r => r.family === 'pin-comment');
  assert.equal(row.status, 'REOPENED');
  assert.equal(row.failed[0].change, fix.change);
  // A line that reports the fix itself never reopens it.
  const note = ev({ ts: at(13), operation: 'Fixed: the API cannot pin, so Studio pins now' });
  assert.equal(recurring([...pins, fix, note], fams, { git }).find(r => r.family === 'pin-comment').status, 'FIXED');
});

test('PENDING until the change lands; another repository needs landed; a shallow clone takes a stated date before its floor', () => {
  const open = ev({ ts: at(12, 20), problem: 'pin-comment', closes: 'fixed', cause: 'c', change: 'skills#99 not merged' });
  assert.equal(recurring([...pins, open], fams, { git }).find(r => r.family === 'pin-comment').status, 'PENDING');
  assert.equal(landedAt({ change: 'wendigo124/FSRN_Subs#185' }, git).at, null);
  assert.equal(landedAt({ change: 'wendigo124/FSRN_Subs#185', landed: at(12, 18) }, git).at, Date.parse(at(12, 18)));
  assert.equal(landedAt({ change: 'skills#3', landed: at(1) }, git).at, null, 'a stated date git contradicts is not taken');
  assert.equal(landedAt({ change: 'skills#3', landed: at(1) }, { ...git, floors: { skills: Date.parse(at(4)) } }).at, Date.parse(at(1)));
  assert.equal(landedAt({ change: 'commit abcdef1' }, git).at, Date.parse(at(11)));
  assert.deepEqual(changeRefs('skills#10 and astrojams1/app-sites#5, wendigo124/FSRN_Subs#185, commit abcdef1'), ['skills#10', 'app-sites#5', 'wendigo124/FSRN_Subs#185', 'commit abcdef1']);
});

test('STANDING needs the owner step, what it unblocks and what was tried; it counts as open', () => {
  const st = ev({ ts: at(12), problem: 'token', closes: 'standing', owner_step: 'paste the token', unblocks: 'campaign attribution', tried: 'API, browser' });
  const rows = recurring([ev({ ts: at(9), operation: 'provider token missing' }), st], fams, { git });
  assert.equal(rows.find(r => r.family === 'token').status, 'STANDING');
  assert.match(reportLine(rows), /Problem families open: 2 \(1 to fix: quiet seen 1d; 1 STANDING on the owner: token\)/);
  assert.ok(closeProblems({ closes: 'standing', owner_step: 'x' }).some(p => p.includes('unblocks')));
});

test('a closing line with no cause, an unknown cause or no change closes nothing', () => {
  assert.ok(closeProblems({ closes: 'fixed', change: 'skills#10' }).some(p => p.includes('cause')));
  assert.ok(closeProblems({ closes: 'fixed', cause: 'unknown', change: 'skills#10' }).some(p => p.includes('not known')));
  assert.ok(closeProblems({ closes: 'fixed', cause: 'c', change: 'made it better' }).some(p => p.includes('names no PR')));
  const bad = ev({ ts: at(12, 20), problem: 'pin-comment', closes: 'fixed', cause: 'c', change: 'better now' });
  const row = recurring([...pins, bad], fams, { git }).find(r => r.family === 'pin-comment');
  assert.equal(row.status, 'RECURRING');
  assert.equal(row.ignored.length, 1);
});

test('log: a problem line names a known family; a refix of a failed or too-early change is refused', () => {
  const now = '2026-11-13T20:30:00Z';
  assert.ok(logProblems(ev({ ts: now, status: 'deferred', blocked_by: 'outside', reason: 'r' }), [], fams).some(p => p.includes('names its family')));
  assert.ok(logProblems(ev({ ts: now, problem: 'nope' }), [], fams).some(p => p.includes('not a family')));
  assert.deepEqual(logProblems(ev({ ts: now, status: 'deferred', blocked_by: 'outside', reason: 'r', problem: 'token' }), [], fams), []);
  assert.ok(logProblems(ev({ ts: now, event: 'end', left_open: [{ issue: 'i', blocked_by: 'outside', needs: 'n' }] }), [], fams).some(p => p.includes('left_open 1')));
  const early = ev({ ts: now, problem: 'pin-comment', closes: 'fixed', cause: 'c', change: 'commit abcdef1' });
  assert.ok(logProblems(early, [...pins, ev({ ts: at(12), operation: 'the API cannot pin' })], fams, { git }).some(p => p.includes('did not remove the cause')));
  const fix = ev({ ts: at(12, 20), problem: 'pin-comment', closes: 'fixed', cause: 'c', change: 'skills#10' });
  const again = ev({ ts: at(13), operation: 'the API cannot pin' });
  assert.ok(logProblems({ ...fix, ts: now }, [...pins, fix, again], fams, { git }).some(p => p.includes('already failed')));
  assert.deepEqual(logProblems(ev({ ts: at(12), status: 'deferred' }), [], fams), [], 'lines before the rule are not judged');
});

test('log refuses an end that met a recurring family and closed nothing; a closing line in the run lets it end', () => {
  const now = '2026-11-14T15:00:00Z';
  const met = ev({ ts: now, run_id: 'run1', problem: 'pin-comment', operation: 'the API cannot pin', status: 'deferred', blocked_by: 'outside', reason: 'r' });
  const end = ev({ ts: now, run_id: 'run1', event: 'end', left_open: [] });
  assert.ok(logProblems(end, [...pins, met], fams, { git }).some(p => p.includes('RECURRING')));
  const close = ev({ ts: now, run_id: 'run1', problem: 'pin-comment', closes: 'standing', owner_step: 's', unblocks: 'u', tried: 't' });
  assert.deepEqual(logProblems(end, [...pins, met, close], fams, { git }), []);
});

test('a human reply still unanswered a run later is an occurrence of replies-unanswered', () => {
  const snap = (when, answered) => ({ at: when, source: 'pitches', pitches: [{ id: 'p1', replies: [{ kind: 'other', at: at(12, 10), answered }] }] });
  assert.equal(pitchOccurrences([snap(at(12, 11), false)]).length, 0);
  assert.equal(pitchOccurrences([snap(at(12, 11), false), snap(at(12, 18), false)]).length, 1);
  assert.equal(pitchOccurrences([snap(at(12, 11), false), snap(at(12, 18), true)]).length, 0);
  const f = compileFamilies([{ key: 'replies-unanswered', title: 't', cause: 'c', fix: 'f' }]);
  assert.equal(familyRecords([], f, [snap(at(12, 11), false), snap(at(12, 18), false)])['replies-unanswered'].occ.length, 1);
});

test('unmapped lists problem lines in no family, not expected waits', () => {
  const f = compileFamilies([{ key: 'a', title: 't', text: ['alpha'], cause: 'c', fix: 'f' }]);
  f.expected = [{ _re: /first report takes a day/i }];
  const rows = unmapped([ev({ ts: at(5), status: 'deferred', operation: 'beta broke' }), ev({ ts: at(5), status: 'deferred', operation: 'alpha broke' }), ev({ ts: at(5), status: 'deferred', operation: 'first report takes a day or two' })], f);
  assert.equal(rows.length, 1);
  assert.match(rows[0].text, /beta/);
});

test('a corrected closing line is read through its correction', () => {
  const fix = ev({ ts: at(12, 20), problem: 'pin-comment', closes: 'fixed', cause: 'API has no pin', change: 'skills#10' });
  const fixOf = ev({ ts: at(12, 21), problem: 'pin-comment', corrects: fix.ts, operation: 'Correction: not fixed yet' });
  assert.equal(recurring([...pins, fix, fixOf], fams, { git }).find(r => r.family === 'pin-comment').status, 'RECURRING');
});

test('judge orders closing lines by time and the newest counts', () => {
  const rec = { occ: [], closes: [{ closes: 'standing', owner_step: 's', unblocks: 'u', tried: 't', at: 1 }, { closes: 'fixed', cause: 'c', change: 'skills#10', at: 2 }] };
  assert.equal(judge(rec, git).status, 'FIXED');
});

// The rules the repeating problems found (marketing.mjs).
const MORE = '2026-11-14T15:00:00Z';
const base = extra => ({ v: 1, ts: MORE, run_id: 'mkt-cloud-x', skill: 'app-marketing', agent: 't', event: 'finding', status: 'ok', operation: 'o', ...extra });

test('waits-on-owner: no finding waits on the owner, and no line waits for a go-ahead', () => {
  assert.ok(leftOpenProblems(base({ status: 'deferred', blocked_by: 'owner', reason: 'r' })).some(p => p.includes('owner')));
  assert.ok(leftOpenProblems(base({ status: 'deferred', reason: 'r' })).some(p => p.includes('a deferred finding needs blocked_by')));
  assert.ok(leftOpenProblems(base({ operation: 'title staged; applying waits for the owner\'s go-ahead in chat' })).some(p => p.includes('go-ahead')));
  assert.deepEqual(leftOpenProblems(base({ operation: 'title applied' })), []);
  assert.deepEqual(leftOpenProblems({ ...base({ status: 'deferred', blocked_by: 'owner', reason: 'r' }), ts: '2026-11-13T06:42:00Z' }), [], 'earlier lines are not judged again');
});

test('work-left-undone: an end that says work was not built in this run is refused', () => {
  const end = extra => base({ event: 'end', left_open: [], ...extra });
  assert.ok(leftOpenProblems(end({ operation: 'Picks for the web products were not built in this run' })).some(p => p.includes('left undone')));
  assert.ok(leftOpenProblems(end({ next: 'left for the next run' })).some(p => p.includes('left undone')));
  assert.deepEqual(leftOpenProblems(end({ operation: 'All items done' })), []);
});

test('live-app-without-profile: next lists a profile item for a live store app with no profile', () => {
  const profile = { id: 'x', name: 'X', stage: 'live', appStoreId: '1', goal: 'g', audience: 'a', positioning: 'p', backlog: [] };
  const store = [{ site: 'ouro', id: '1', name: 'X', status: 'available' }, { site: 'ouro', id: '2', name: 'New App', status: 'available' }, { site: 'ouro', id: '3', name: 'Soon', status: 'coming-soon' }];
  assert.deepEqual(missingProfiles([profile], store).map(a => a.id), ['2']);
  const items = rank([profile], [], { runner: 'cloud', storeApps: store });
  assert.deepEqual(items.filter(i => i.app === 'all').map(i => `${i.app}/${i.id}`), ['all/profile-2']);
  assert.equal(rank([profile], [], { runner: 'mac', storeApps: store }).filter(i => i.app === 'all').length, 0, 'the cloud writes profiles');
  assert.equal(rank([profile], [{ event: 'action', run_id: 'r1', app: 'all', item: 'profile-2', status: 'deferred' }], { runner: 'cloud', storeApps: store, run_id: 'r1' }).filter(i => i.app === 'all').length, 0);
});

test('not-live-product-marketed: an experiment for a product not live must be retired', () => {
  const x = { id: 'e', idea: 'i', pattern: 'p', url: 'https://example.com/e/', measure: 'm', shipped: '2026-11-13', judge: '2026-11-27' };
  const p = { id: 'g', name: 'G', stage: 'prelaunch', goal: 'g', audience: 'a', positioning: 'p', backlog: [], experiments: [x] };
  assert.ok(profileProblems(p).some(m => m.includes('not live')));
  assert.deepEqual(profileProblems({ ...p, experiments: [{ ...x, verdicts: [{ on: '2026-11-13', verdict: 'retire', evidence: 'not on sale' }] }] }).filter(m => m.includes('not live')), []);
});

test('eventProblems carries the new rules for check', () => {
  assert.ok(eventProblems(base({ status: 'deferred', blocked_by: 'owner', reason: 'r' })).length > 0);
});
