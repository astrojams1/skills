import { test } from 'node:test';
import assert from 'node:assert/strict';
import { busy, firstFree, isFree, localDay, windows, zoned } from '../../skills/app-marketing/scripts/gcal.mjs';

const iso = t => new Date(t).toISOString();

test('Pacific wall-clock times survive daylight saving', () => {
  assert.equal(iso(zoned('2026-07-15', 9)), '2026-07-15T16:00:00.000Z');   // PDT
  assert.equal(iso(zoned('2026-12-15', 9)), '2026-12-15T17:00:00.000Z');   // PST
  assert.equal(iso(zoned('2026-11-02', 9)), '2026-11-02T17:00:00.000Z');   // the day after the change
  assert.equal(localDay(Date.parse('2026-11-08T06:00:00Z')), '2026-11-07'); // 22:00 the evening before
});

test('windows are weekday mornings at the Mac pass\'s hour, at least a day ahead', () => {
  assert.equal(iso(zoned('2026-11-10', 5.5)), '2026-11-10T13:30:00.000Z');  // 5:30 PST
  assert.equal(iso(zoned('2026-07-15', 5.5)), '2026-07-15T12:30:00.000Z');  // 5:30 PDT
  // Saturday 2026-11-07 05:34 Pacific: the first window is Monday 5:30 to 8:30, and no weekend appears
  const now = Date.parse('2026-11-07T13:34:00Z');
  const list = windows(now);
  assert.equal(iso(list[0].start), '2026-11-09T13:30:00.000Z');
  assert.equal(list[0].end - list[0].start, 3 * 3600000);
  assert.ok(list.every(w => ![0, 6].includes(new Date(w.start - 8 * 3600000).getUTCDay())));
  // Monday 05:34: Tuesday 5:30 is under 24 hours away, so Wednesday is first, and its reminder a day ahead still fires
  assert.equal(iso(windows(Date.parse('2026-11-09T13:34:00Z'))[0].start), '2026-11-11T13:30:00.000Z');
});

test('free time ignores our own, cancelled, declined and free all-day events, but not timed events marked free', () => {
  const w = { start: Date.parse('2026-11-10T17:00:00Z'), end: Date.parse('2026-11-10T19:00:00Z') };
  const at = (s, e, extra) => ({ start: { dateTime: s }, end: { dateTime: e }, summary: 'x', ...extra });
  const ignored = [
    at('2026-11-10T17:00:00Z', '2026-11-10T19:00:00Z', { extendedProperties: { private: { appMarketing: 'show-hn' } } }),
    { start: { date: '2026-11-10' }, end: { date: '2026-11-11' }, transparency: 'transparent' },
    at('2026-11-10T17:00:00Z', '2026-11-10T18:00:00Z', { status: 'cancelled' }),
    at('2026-11-10T17:00:00Z', '2026-11-10T18:00:00Z', { attendees: [{ self: true, responseStatus: 'declined' }] }),
    at('2026-11-10T16:00:00Z', '2026-11-10T17:00:00Z')  // ends as the window starts
  ];
  assert.ok(isFree(w, busy(ignored)));
  assert.ok(!isFree(w, busy([at('2026-11-10T18:30:00Z', '2026-11-10T20:00:00Z')])));
  assert.ok(!isFree(w, busy([at('2026-11-10T17:00:00Z', '2026-11-10T18:00:00Z', { transparency: 'transparent' })])));
  assert.ok(!isFree(w, busy([{ start: { date: '2026-11-10' }, end: { date: '2026-11-11' } }])));
  const later = { start: w.start + 86400000, end: w.end + 86400000 };
  assert.equal(firstFree([w, later], busy([at('2026-11-10T17:30:00Z', '2026-11-10T18:00:00Z')])), later);
  assert.equal(firstFree([w], busy([at('2026-11-10T17:30:00Z', '2026-11-10T18:00:00Z')])), null);
});
