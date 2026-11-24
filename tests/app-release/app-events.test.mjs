// In-App Events as store data: Apple's limits, API attributes, the create/update plan and which events go to review.
import test from 'node:test';
import assert from 'node:assert/strict';
import { attributeChanges, compareVersions, eventAttributes, eventPlan, eventProblems, eventReviewTargets, imageSize, mediaProblem }
  from '../../skills/app-release/scripts/lib/app-events.mjs';
import { eventImageName, standaloneEventTargets } from '../../skills/app-release/scripts/asc.mjs';

const entry = (over = {}) => ({
  referenceName: 'Winter holidays 2026',
  badge: 'SPECIAL_EVENT',
  why: 'A snowy holiday theme is on in the game from 14 December to 3 January.',
  start: '2026-12-14T00:00:00-08:00',
  end: '2027-01-04T00:00:00-08:00',
  publish: '2026-11-30T00:00:00-08:00',
  shipsWith: '1.2.0',
  text: { name: 'Winter Holiday Arenas', shortDescription: 'Snow falls on every arena', longDescription: 'Every arena is dressed for winter until January 3.' },
  media: { card: 'store/events/card.png', details: 'store/events/details.png' },
  deepLink: 'com.example.game://winter',
  ...over,
});

const png = (width, height) => {
  const bytes = Buffer.alloc(33);
  bytes.writeUInt32BE(0x89504e47, 0);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

test('a complete event has no problems', () => {
  assert.deepEqual(eventProblems(entry(), Date.parse('2026-11-19T00:00:00Z')), []);
});

test('Apple text limits, badge, dates and media are checked', () => {
  const problems = eventProblems(entry({
    badge: 'SALE',
    start: '2026-12-14T00:00:00-08:00',
    end: '2027-01-20T00:00:00-08:00',
    publish: '2026-11-01T00:00:00-08:00',
    text: { name: 'A name that is far longer than thirty', shortDescription: 'Now only $0.99 for the holidays', longDescription: 'FREE' },
    media: { card: 'card.gif' },
  }));
  const joined = problems.join('\n');
  for (const part of ['badge must be one of', 'at most 31 days', 'more than 14 days before start', 'text.name is 37 characters', 'names a price',
    'all capitals', 'must be a .png or .jpg', 'media.details (EVENT_DETAILS_PAGE) is required']) {
    assert.ok(joined.includes(part), part + ' missing from ' + joined);
  }
});

test('an event needs a deep link: App Review refuses one without it (409 deepLink required, 2026-11-24)', () => {
  assert.ok(eventProblems(entry({ deepLink: undefined })).some(item => item.includes('deepLink is required')));
  assert.ok(eventProblems(entry({ deepLink: ' ' })).some(item => item.includes('deepLink is required')));
  assert.ok(eventProblems(entry({ deepLink: 'not a url' })).some(item => item.includes('deepLink is not a URL')));
  const now = Date.parse('2026-11-20T17:00:00Z');
  const bare = { id: 'e1', attributes: { referenceName: 'Winter holidays 2026', eventState: 'DRAFT' } };
  assert.deepEqual(eventReviewTargets([entry()], [bare], '1.2.0', now).unlinked, ['Winter holidays 2026']);
  const linked = { id: 'e1', attributes: { ...bare.attributes, deepLink: 'com.example.game://winter' } };
  assert.deepEqual(eventReviewTargets([entry()], [linked], '1.2.0', now).unlinked, []);
  const alone = standaloneEventTargets([entry()], [bare], '1.2.0', now);
  assert.deepEqual(alone.send, []);
  assert.ok(alone.waiting[0].includes('no deep link'));
});

test('an event must say what really happens and start in the future', () => {
  const problems = eventProblems(entry({ why: 'promo' }), Date.parse('2026-12-20T00:00:00Z'));
  assert.ok(problems.some(item => item.includes('why must say')));
  assert.ok(problems.some(item => item.includes('start has passed')));
});

test('image sizes follow Apple: card 16:9 from 1920x1080, details 9:16 from 1080x1920', () => {
  assert.deepEqual(imageSize(png(1920, 1080)), [1920, 1080]);
  assert.equal(mediaProblem('EVENT_CARD', [1920, 1080]), null);
  assert.equal(mediaProblem('EVENT_DETAILS_PAGE', [1080, 1920]), null);
  assert.match(mediaProblem('EVENT_CARD', [1280, 720]), /Apple takes 1920x1080/);
  assert.match(mediaProblem('EVENT_DETAILS_PAGE', [1200, 1920]), /not 9:16/);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x07, 0x80, 0x04, 0x38, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(imageSize(jpeg), [1080, 1920]);
});

test('attributes are written in UTC for every storefront unless territories are listed', () => {
  const attributes = eventAttributes(entry(), ['USA', 'GBR'], 'en-US');
  assert.equal(attributes.purpose, 'APPROPRIATE_FOR_ALL_USERS');
  assert.equal(attributes.priority, 'NORMAL');
  assert.equal(attributes.purchaseRequirement, 'NO_COST_ASSOCIATED');
  assert.equal(attributes.deepLink, 'com.example.game://winter');
  assert.deepEqual(attributes.territorySchedules, [{ territories: ['GBR', 'USA'], publishStart: '2026-11-30T08:00:00.000Z',
    eventStart: '2026-12-14T08:00:00.000Z', eventEnd: '2027-01-04T08:00:00.000Z' }]);
  assert.deepEqual(eventAttributes(entry({ territories: ['USA'] }), ['USA', 'GBR'], 'en-US').territorySchedules[0].territories, ['USA']);
});

test('the plan creates, keeps, updates a draft and never touches an event with Apple', () => {
  const wanted = eventAttributes(entry(), ['USA'], 'en-US');
  const live = (state, attributes = wanted) => ({ id: 'e1', attributes: { ...attributes, eventState: state } });
  assert.equal(eventPlan([entry()], [], ['USA'], 'en-US')[0].action, 'create');
  assert.equal(eventPlan([entry()], [live('DRAFT')], ['USA'], 'en-US')[0].action, 'keep');
  const moved = { ...wanted, territorySchedules: [{ ...wanted.territorySchedules[0], eventStart: '2026-12-15T08:00:00Z' }] };
  const update = eventPlan([entry()], [live('DRAFT', moved)], ['USA'], 'en-US')[0];
  assert.equal(update.action, 'update');
  assert.deepEqual(update.changes, ['territorySchedules']);
  assert.equal(eventPlan([entry()], [live('APPROVED', moved)], ['USA'], 'en-US')[0].action, 'locked');
  assert.equal(eventPlan([entry()], [live('ARCHIVED')], ['USA'], 'en-US')[0].action, 'create');
  assert.deepEqual(attributeChanges({ ...wanted, badge: 'CHALLENGE' }, wanted), ['badge']);
});

test('submit sends an event with the first version that carries it, and refuses one not created yet', () => {
  const now = Date.parse('2026-11-20T17:00:00Z');
  const draft = { id: 'e1', attributes: { referenceName: 'Winter holidays 2026', eventState: 'DRAFT', deepLink: 'com.example.game://winter' } };
  assert.deepEqual(eventReviewTargets([entry()], [draft], '1.1.9', now).targets, []);
  assert.deepEqual(eventReviewTargets([entry()], [draft], '1.2.0', now).targets, [{ relation: 'appEvent', type: 'appEvents', id: 'e1' }]);
  assert.equal(eventReviewTargets([entry()], [draft], '1.2.1', now).targets.length, 1);
  assert.deepEqual(eventReviewTargets([entry()], [], '1.2.0', now).missing, ['Winter holidays 2026']);
  const waiting = { id: 'e1', attributes: { referenceName: 'Winter holidays 2026', eventState: 'WAITING_FOR_REVIEW' } };
  const held = eventReviewTargets([entry()], [waiting], '1.2.0', now);
  assert.deepEqual(held.targets, []);
  assert.equal(held.held.length, 1);
  const late = eventReviewTargets([entry()], [draft], '1.2.0', Date.parse('2026-12-20T00:00:00Z'));
  assert.deepEqual(late.targets, []);
  assert.equal(late.skipped.length, 1);
});

test('an event goes to review on its own only once its version is live', () => {
  const now = Date.parse('2026-11-20T17:00:00Z');
  const draft = { id: 'e1', attributes: { referenceName: 'Winter holidays 2026', eventState: 'DRAFT', deepLink: 'com.example.game://winter' } };
  assert.deepEqual(standaloneEventTargets([entry()], [draft], '1.1.0', now).send, []);
  assert.equal(standaloneEventTargets([entry()], [draft], '1.1.0', now).waiting.length, 1);
  assert.deepEqual(standaloneEventTargets([entry()], [draft], '1.2.0', now).send, ['e1']);
  assert.deepEqual(standaloneEventTargets([entry({ shipsWith: undefined })], [draft], null, now).send, ['e1']);
});

test('versions compare numerically and image names follow their content', () => {
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
  assert.equal(compareVersions('1.2', '1.2.0'), 0);
  assert.notEqual(eventImageName('a/card.png', Buffer.from('one')), eventImageName('a/card.png', Buffer.from('two')));
  assert.match(eventImageName('a/card.png', Buffer.from('one')), /^[0-9a-f]{12}-card\.png$/);
});
