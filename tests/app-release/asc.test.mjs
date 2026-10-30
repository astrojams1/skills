// asc.test.mjs
// The App Store Connect decision helpers, ported from Space Worms' release tests: screenshot and attachment
// reconciliation, review submissions and resubmission, Game Center leaderboards, TestFlight groups, readback privacy,
// and pricing for free and paid apps.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as asc from '../../skills/app-release/scripts/asc.mjs';

const shot = (fileName, checksum, state) => ({ id: fileName + '-id', attributes: { fileName: fileName, sourceFileChecksum: checksum, assetDeliveryState: { state: state } } });
const LEADERBOARD = { vendorIdentifier: 'com.example.app.longest', referenceName: 'Longest life (online)', defaultFormatter: 'ELAPSED_TIME_SECOND',
  submissionType: 'BEST_SCORE', scoreSortType: 'DESC', localization: { name: 'Longest Life (Online)' } };
const KILLS = { vendorIdentifier: 'com.example.app.kills', localization: { name: 'Most Kills (Online)', formatterSuffix: ' kills', formatterSuffixSingular: ' kill' } };

test('screenshot uploads skip finished copies, replace unfinished ones and refuse to overwrite changed ones', () => {
  assert.deepEqual(asc.screenshotAction([], 'a.jpg', 'x'), { action: 'upload' });
  assert.deepEqual(asc.screenshotAction([shot('a.jpg', 'x', 'COMPLETE')], 'a.jpg', 'x'), { action: 'keep', id: 'a.jpg-id' });
  assert.deepEqual(asc.screenshotAction([shot('a.jpg', null, 'AWAITING_UPLOAD')], 'a.jpg', 'x'), { action: 'replace', id: 'a.jpg-id' });
  assert.deepEqual(asc.screenshotAction([shot('a.jpg', 'x', 'FAILED')], 'a.jpg', 'x'), { action: 'replace', id: 'a.jpg-id' });
  assert.deepEqual(asc.screenshotAction([shot('a.jpg', 'y', 'COMPLETE')], 'a.jpg', 'x'), { action: 'conflict', id: 'a.jpg-id' });
});

test('screenshot reconciliation removes sets and files the manifest no longer lists', () => {
  const set = (id, type) => ({ id: id, attributes: { screenshotDisplayType: type } });
  const manifest = [{ displayType: 'APP_IPHONE_67', files: ['shots/iphone-1.jpg'] }];
  assert.deepEqual(asc.staleScreenshotSets([set('phone', 'APP_IPHONE_67'), set('old', 'APP_IPHONE_65')], manifest).map(item => item.id), ['old']);
  assert.deepEqual(asc.staleScreenshots([shot('iphone-1.jpg', 'x', 'COMPLETE'), shot('iphone-9.jpg', 'y', 'COMPLETE')], manifest[0].files).map(item => item.attributes.fileName), ['iphone-9.jpg']);
});

test('a review submission is sent only when it holds this version and nothing else', () => {
  const item = id => ({ relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: id } } } });
  assert.deepEqual(asc.submissionPlan([], 'v1'), { action: 'add' });
  assert.deepEqual(asc.submissionPlan([item('v1')], 'v1'), { action: 'submit' });
  assert.deepEqual(asc.submissionPlan([item('v0')], 'v1'), { action: 'conflict' });
  assert.deepEqual(asc.submissionPlan([{ relationships: {} }], 'v1'), { action: 'conflict' });
});

test('TestFlight adds builds only to the configured internal group when it lacks all-build access', () => {
  const group = (name, internal, all) => ({ attributes: { name: name, isInternalGroup: internal, hasAccessToAllBuilds: all } });
  const groups = [group('Release QA', true, false), group('Partners', true, false), group('Everyone', true, true), group('Public', false, false)];
  assert.deepEqual(asc.manualTestflightGroups(groups, 'Release QA').map(item => item.attributes.name), ['Release QA']);
  assert.deepEqual(asc.manualTestflightGroups([group('Release QA', true, true)], 'Release QA'), []);
});

test('readback errors never print the review contact phone', () => {
  assert.throws(() => asc.assertSaved('Review details', { contactPhone: '+1 555 0100' }, { contactPhone: '+15550100' }), error => {
    assert.doesNotMatch(error.message, /555/);
    return /contactPhone: <hidden>/.test(error.message);
  });
});

test('version state reads appVersionState first and falls back to the deprecated appStoreState', () => {
  assert.equal(asc.versionState({ attributes: { appVersionState: 'READY_FOR_DISTRIBUTION', appStoreState: 'READY_FOR_SALE' } }), 'READY_FOR_DISTRIBUTION');
  assert.equal(asc.versionState({ attributes: { appStoreState: 'PREPARE_FOR_SUBMISSION' } }), 'PREPARE_FOR_SUBMISSION');
  assert.equal(asc.versionState({ attributes: {} }), '');
});

test('pricing reads a base price, free by default, and checks an existing schedule for free and paid apps', () => {
  assert.deepEqual(asc.priceTarget(undefined), { territory: 'USA', price: 0 });
  assert.deepEqual(asc.priceTarget({ baseTerritory: 'USA', basePrice: '1.00' }), { territory: 'USA', price: 1 });
  assert.throws(() => asc.priceTarget({ basePrice: '$1' }), /decimal/);
  const point = price => ({ attributes: { customerPrice: price } });
  assert.equal(asc.scheduleMatches([point('0.0')], 0), true);
  assert.equal(asc.scheduleMatches([point('0.99'), point('0.0')], 0), false, 'a free app holds no paid price');
  assert.equal(asc.scheduleMatches([point('1.0')], 1), true);
  assert.equal(asc.scheduleMatches([point('1.0'), point('0')], 1), false, 'a free price in a paid schedule is a sale or a mistake');
  assert.equal(asc.scheduleMatches([point('0.99')], 1), false);
  assert.equal(asc.scheduleMatches([], 0), false);
  assert.equal(asc.scheduleMatches([null], 0), false);
});

test('a price schedule lists the price point of every manual price, whatever its dates', () => {
  const price = (id, start, end, point) => ({ id: id, attributes: { startDate: start, endDate: end }, relationships: { appPricePoint: { data: { type: 'appPricePoints', id: point } } } });
  const points = [{ type: 'appPricePoints', id: 'paid', attributes: { customerPrice: '0.99' } }, { type: 'appPricePoints', id: 'free', attributes: { customerPrice: '0.0' } }];
  const ids = schedule => asc.schedulePricePoints(schedule).map(item => item.id);
  assert.deepEqual(ids({ data: [price('usa', null, null, 'free')], included: points }), ['free']);
  assert.deepEqual(ids({ data: [price('base', null, null, 'paid'), price('sale', '2026-10-01', '2026-11-01', 'free')], included: points }), ['paid', 'free']);
  assert.deepEqual(asc.schedulePricePoints({ data: [], included: [] }), []);
});

test('categories map to App Info relationships, with subcategories only where given', () => {
  assert.deepEqual(Object.keys(asc.categoryRelationships({ primaryCategory: 'GAMES', primarySubcategories: ['GAMES_ACTION', 'GAMES_CASUAL'] })),
    ['primaryCategory', 'primarySubcategoryOne', 'primarySubcategoryTwo']);
  assert.deepEqual(asc.categoryRelationships({ primaryCategory: 'NEWS' }), { primaryCategory: { data: { type: 'appCategories', id: 'NEWS' } } });
  assert.equal(asc.categoryRelationships({ primaryCategory: 'NEWS', secondaryCategory: 'REFERENCE' }).secondaryCategory.data.id, 'REFERENCE');
  assert.throws(() => asc.categoryRelationships({}), /primaryCategory/);
});

test('listing edits only an explicitly editable App Info', () => {
  const info = (id, state, legacy) => ({ id: id, attributes: { state: state, appStoreState: legacy } });
  assert.equal(asc.editableAppInfo([info('live', 'READY_FOR_DISTRIBUTION'), info('next', 'PREPARE_FOR_SUBMISSION')]).id, 'next');
  assert.equal(asc.editableAppInfo([info('gone', undefined, 'DEVELOPER_REMOVED_FROM_SALE'), info('next', undefined, 'PREPARE_FOR_SUBMISSION')]).id, 'next');
  assert.equal(asc.editableAppInfo([info('review', 'WAITING_FOR_REVIEW')]), null);
  assert.equal(asc.editableAppInfo([{ id: 'meta', attributes: { state: 'METADATA_REJECTED' } }]).id, 'meta');
});

test('a build lookup must find exactly one build of the configured version', () => {
  assert.equal(asc.pickBuild([{ id: 'b4' }], '4', '1.0.0').id, 'b4');
  assert.throws(() => asc.pickBuild([{ id: 'a' }, { id: 'b' }], '1', '1.1.0'), /Several builds numbered 1 for version 1.1.0/);
  assert.throws(() => asc.pickBuild([], '5', '1.0.0'), /has not reached App Store Connect/);
});

test('submission retries recognise a version already in review and resolve rejected items first', () => {
  const item = (version, state) => ({ id: version + '-' + state, attributes: { state: state }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version } } } });
  const waiting = { attributes: { state: 'WAITING_FOR_REVIEW' } };
  assert.equal(asc.alreadyInReview(waiting, [item('v1', 'READY_FOR_REVIEW')], 'v1'), true);
  assert.equal(asc.alreadyInReview(waiting, [item('v0', 'READY_FOR_REVIEW')], 'v1'), false);
  assert.equal(asc.alreadyInReview({ attributes: { state: 'UNRESOLVED_ISSUES' } }, [item('v1', 'REJECTED')], 'v1'), false);
  assert.deepEqual(asc.itemsToResolve([item('v1', 'REJECTED'), item('v1', 'ACCEPTED'), item('v0', 'REJECTED')], 'v1').map(entry => entry.id), ['v1-REJECTED']);
});

test('Game Center setup turns the capability on only once and matches leaderboards by vendor identifier', () => {
  const capability = type => ({ attributes: { capabilityType: type } });
  assert.equal(asc.hasCapability([capability('IN_APP_PURCHASE')], 'GAME_CENTER'), false);
  assert.equal(asc.hasCapability([capability('GAME_CENTER')], 'GAME_CENTER'), true);
  const board = attributes => ({ id: 'lb', attributes: Object.assign({ vendorIdentifier: LEADERBOARD.vendorIdentifier, referenceName: LEADERBOARD.referenceName,
    defaultFormatter: LEADERBOARD.defaultFormatter, submissionType: 'BEST_SCORE', scoreSortType: 'DESC', archived: false }, attributes) });
  assert.deepEqual(asc.leaderboardPlan([], LEADERBOARD), { action: 'create' });
  assert.deepEqual(asc.leaderboardPlan([board({})], LEADERBOARD), { action: 'keep', id: 'lb' });
  assert.deepEqual(asc.leaderboardPlan([board({ defaultFormatter: 'INTEGER', archived: true })], LEADERBOARD),
    { action: 'update', id: 'lb', attributes: { defaultFormatter: 'ELAPSED_TIME_SECOND', archived: false } });
});

test('leaderboard text is edited only on an editable version, and a live one gets a new version', () => {
  const version = (id, number, state) => ({ id: id, attributes: { version: number, state: state } });
  assert.deepEqual(asc.leaderboardVersionPlan([]), { action: 'create' });
  assert.deepEqual(asc.leaderboardVersionPlan([version('v1', 1, 'LIVE'), version('v2', 2, 'REJECTED')]), { action: 'use', id: 'v2', state: 'REJECTED' });
  assert.deepEqual(asc.leaderboardVersionPlan([version('v2', 2, 'LIVE')]), { action: 'live', id: 'v2', state: 'LIVE' });
  assert.deepEqual(asc.leaderboardVersionPlan([version('v1', 1, 'WAITING_FOR_REVIEW')]), { action: 'locked', id: 'v1', state: 'WAITING_FOR_REVIEW' });
  assert.deepEqual(asc.localizationAttributes(KILLS), { name: 'Most Kills (Online)', formatterSuffix: ' kills', formatterSuffixSingular: ' kill', description: null });
  const size = asc.localizationAttributes({ localization: { name: 'Best Size (Online)' } });
  assert.deepEqual(asc.localizationPlan([], 'en-US', size), { action: 'create', attributes: { locale: 'en-US', name: 'Best Size (Online)' } });
  const text = attributes => ({ id: 'loc', attributes: Object.assign({ locale: 'en-US' }, attributes) });
  assert.deepEqual(asc.localizationPlan([text({ name: 'Best Size (Online)', formatterSuffix: null })], 'en-US', size), { action: 'keep', id: 'loc' });
  assert.doesNotThrow(() => asc.assertSaved('Leaderboard localization', size, asc.savedLocalization({ name: 'Best Size (Online)', formatterSuffix: '', description: '' })));
  assert.deepEqual(asc.uniqueById([{ id: 'a' }, { id: 'b' }, { id: 'a' }]).map(item => item.id), ['a', 'b']);
});

test('leaderboards join the open review submission once and go to App Review beside the version', () => {
  const versionItem = (id, state) => ({ id: 'item-' + id, attributes: { state: state }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: id } }, gameCenterLeaderboardVersion: { data: null } } });
  const boardItem = (id, state) => ({ id: 'item-' + id, attributes: { state: state }, relationships: { appStoreVersion: { data: null }, gameCenterLeaderboardVersion: { data: { type: 'gameCenterLeaderboardVersions', id: id } } } });
  const versions = [{ id: 'lv1', state: 'PREPARE_FOR_SUBMISSION' }, { id: 'lv2', state: 'READY_FOR_REVIEW' }, { id: 'lv3', state: 'WAITING_FOR_REVIEW' }];
  assert.deepEqual(asc.leaderboardVersionsToAttach([versionItem('v1', 'REJECTED')], versions), ['lv1', 'lv2']);
  assert.deepEqual(asc.leaderboardVersionsToAttach([versionItem('v1', 'REJECTED'), boardItem('lv1', 'READY_FOR_REVIEW')], versions), ['lv2']);
  assert.deepEqual(asc.submissionPlan([boardItem('lv1', 'READY_FOR_REVIEW')], 'v1'), { action: 'add' });
  assert.deepEqual(asc.itemsToResolve([versionItem('v1', 'REJECTED'), boardItem('lv1', 'REJECTED'), boardItem('lv2', 'READY_FOR_REVIEW')], 'v1').map(item => item.id), ['item-v1', 'item-lv1']);
});

test('attachments keep a finished identical copy, wait on one still processing, and otherwise upload', () => {
  const copy = (id, checksum, state, fileSize) => ({ id, attributes: { fileName: 'tour.mp4', fileSize, sourceFileChecksum: checksum, assetDeliveryState: { state } } });
  assert.deepEqual(asc.attachmentPlan([], 'tour.mp4', 'abc'), { action: 'upload', remove: [] });
  assert.deepEqual(asc.attachmentPlan([copy('a', 'abc', 'COMPLETE')], 'tour.mp4', 'abc'), { action: 'keep', id: 'a', remove: [] });
  assert.deepEqual(asc.attachmentPlan([copy('a', 'abc', 'UPLOAD_COMPLETE')], 'tour.mp4', 'abc'), { action: 'wait', id: 'a', remove: [] });
  assert.deepEqual(asc.attachmentPlan([copy('a', 'old', 'COMPLETE')], 'tour.mp4', 'abc'), { action: 'upload', remove: ['a'] });
  assert.deepEqual(asc.attachmentPlan([copy('a', null, 'UPLOAD_COMPLETE', 100)], 'tour.mp4', 'abc', 100), { action: 'wait', id: 'a', remove: [] });
  assert.equal(asc.attachmentSettled('COMPLETE'), 'complete');
  assert.equal(asc.attachmentSettled('UPLOAD_COMPLETE'), 'pending');
  assert.equal(asc.attachmentReadBack({ sourceFileChecksum: null }, 'abc'), 'pending');
  assert.equal(asc.attachmentReadBack({ sourceFileChecksum: 'def' }, 'abc'), 'mismatch');
});

test('leaderboard readiness and resubmission never send a smaller set than configured', () => {
  const board = (vendorIdentifier, versions, archived) => ({ vendorIdentifier, archived: archived === true, versions });
  const boards = [board('a', [{ id: 'a1', state: 'PREPARE_FOR_SUBMISSION' }]), board('b', [{ id: 'b1', state: 'LIVE' }]),
    board('c', [{ id: 'c1', state: 'REPLACED_WITH_NEW_VERSION' }]), board('d', [{ id: 'd1', state: 'READY_FOR_REVIEW' }], true)];
  assert.deepEqual(asc.leaderboardReadiness(['a', 'b', 'c', 'd', 'e'], boards), { editable: [{ id: 'a1', state: 'PREPARE_FOR_SUBMISSION' }], missing: ['c', 'd', 'e'] });
  const sub = state => ({ id: 's', attributes: { state } });
  const version = { id: 'iv', attributes: { state: 'REJECTED' }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: 'v' } } } };
  assert.deepEqual(asc.resubmissionPlan(sub('UNRESOLVED_ISSUES'), [version], ['l1', 'l2']), { action: 'replace', missing: ['l1', 'l2'] });
  assert.deepEqual(asc.resubmissionPlan(sub('UNRESOLVED_ISSUES'), [version], []), { action: 'reuse' }, 'an app without leaderboards resubmits in place');
  assert.deepEqual(asc.resubmissionPlan(sub('READY_FOR_REVIEW'), [version], ['l1']), { action: 'reuse' });
  for (const state of ['CANCELING', 'COMPLETING']) assert.equal(asc.cancelSettled(state), false);
  assert.equal(asc.cancelSettled(null), true);
  assert.deepEqual(asc.missingSubmissionItems([], 'v', []), { version: true, leaderboards: [] });
});

test('release notes are left out of a first version and required on every update', () => {
  assert.deepEqual(asc.whatsNewPlan(false, ''), { send: false });
  assert.deepEqual(asc.whatsNewPlan(false, 'New intro!'), { send: false });
  assert.deepEqual(asc.whatsNewPlan(true, '  New intro!\n'), { send: true, whatsNew: 'New intro!' });
  assert.throws(() => asc.whatsNewPlan(true, ''), /release notes/);
  assert.throws(() => asc.whatsNewPlan(true, '   '), /release notes/);
  assert.throws(() => asc.whatsNewPlan(true, undefined), /release notes/);
});

test('Asset Library entries name their placement and profile, and unknown ones stop the run', () => {
  assert.equal(asc.assetEntryProblem({ file: 'h.png', category: 'CREATIVE_ASSETS', placementType: 'PRODUCT_PAGE_HEADER_ASSET', placementGroup: 'DEFAULT_PROFILE' }), null);
  assert.equal(asc.assetEntryProblem({ file: 'd.jpg', category: 'APP_SCREENSHOTS_AND_PREVIEWS', placementType: 'APP_SCREENSHOT', placementGroup: 'IPHONE_DUO_PROFILE' }), null);
  assert.match(asc.assetEntryProblem({ file: 'h.png', category: 'CREATIVE_ASSETS', placementType: 'PRODUCT_PAGE_HEADER_ASSET', placementGroup: 'IPHONE_DUO_PROFILE' }), /does not take/);
  assert.match(asc.assetEntryProblem({ file: 'x.png', category: 'CREATIVE_ASSETS', placementType: 'TODAY_TAB_ADS_ASSET', placementGroup: 'DEFAULT_PROFILE' }), /unsupported/);
  assert.match(asc.assetEntryProblem({ file: 'x.png', category: 'OTHER', placementType: 'APP_SCREENSHOT', placementGroup: 'IPHONE_DUO_PROFILE' }), /category/);
});

test('Asset Library uploads keep finished copies, replace unfinished ones and treat a changed file as new', () => {
  const ref = asc.assetReference('header.png', Buffer.from('a'));
  assert.match(ref, /^header\.png@[0-9a-f]{12}$/);
  assert.notEqual(ref, asc.assetReference('header.png', Buffer.from('b')));
  const image = (state, referenceName) => ({ id: state, attributes: { state: state, referenceName: referenceName } });
  assert.deepEqual(asc.assetUploadAction([], ref), { action: 'upload' });
  assert.deepEqual(asc.assetUploadAction([image('COMPLETE', ref)], ref), { action: 'keep', id: 'COMPLETE' });
  assert.deepEqual(asc.assetUploadAction([image('APPROVED', ref)], ref), { action: 'keep', id: 'APPROVED' });
  assert.deepEqual(asc.assetUploadAction([image('AWAITING_UPLOAD', ref)], ref), { action: 'replace', id: 'AWAITING_UPLOAD' });
  assert.deepEqual(asc.assetUploadAction([image('FAILED', ref)], ref), { action: 'replace', id: 'FAILED' });
  assert.deepEqual(asc.assetUploadAction([image('ARCHIVED', ref)], ref), { action: 'upload' });
});

test('placements follow store data: missing images are placed and other images\' placements are stale', () => {
  const placed = (id, image) => ({ id: id, relationships: { image: { data: { id: image } } } });
  assert.deepEqual(asc.placementPlan([], ['a', 'b']), { missing: ['a', 'b'], stale: [] });
  assert.deepEqual(asc.placementPlan([placed('p1', 'a')], ['a', 'b']), { missing: ['b'], stale: [] });
  assert.deepEqual(asc.placementPlan([placed('p1', 'old'), placed('p2', 'a')], ['a']), { missing: [], stale: ['p1'] });
  assert.deepEqual(asc.placementPlan([placed('p1', 'a')], []), { missing: [], stale: ['p1'] });
});

test('only processed images can be placed, and screenshots only on profiles without a display type', () => {
  assert.ok(asc.PLACEABLE_STATES.includes('COMPLETE') && asc.PLACEABLE_STATES.includes('APPROVED'));
  for (const state of ['AWAITING_UPLOAD', 'UPLOAD_COMPLETE', 'FAILED', 'REJECTED', 'ARCHIVED']) assert.ok(!asc.PLACEABLE_STATES.includes(state), state);
  assert.match(asc.assetEntryProblem({ file: 's.jpg', category: 'APP_SCREENSHOTS_AND_PREVIEWS', placementType: 'APP_SCREENSHOT', placementGroup: 'IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE' }), /does not take/);
});

test('only processed, unsubmitted images listed in store data go to App Review', () => {
  const image = (id, ref, state) => ({ id: id, attributes: { referenceName: ref, state: state } });
  const images = [image('1', 'a@x', 'PREPARE_FOR_SUBMISSION'), image('2', 'b@x', 'WAITING_FOR_REVIEW'), image('3', 'c@x', 'APPROVED'),
    image('4', 'd@x', 'COMPLETE'), image('5', 'e@x', 'ARCHIVED'), image('6', 'f@x', 'UPLOAD_COMPLETE'), image('7', 'g@x', 'REJECTED')];
  const plan = asc.assetsToSubmit(images, ['a@x', 'b@x', 'c@x', 'd@x', 'e@x', 'f@x', 'g@x', 'h@x']);
  assert.deepEqual(plan.send, ['1', '4']);
  assert.deepEqual(plan.skipped, ['b@x (WAITING_FOR_REVIEW)', 'c@x (APPROVED)', 'e@x (not uploaded)', 'f@x (UPLOAD_COMPLETE)', 'g@x (REJECTED)', 'h@x (not uploaded)']);
});


test('a newly prepared version waits for its editable App Info instead of refusing the listing', async () => {
  const info = (id, state) => ({ id: id, attributes: { state: state } });
  const live = [info('live', 'READY_FOR_DISTRIBUTION')];
  const reads = [live, live, [...live, info('next', 'PREPARE_FOR_SUBMISSION')]];
  const waits = [];
  const found = await asc.awaitEditableInfo(async () => reads.shift(), { wait: async ms => { waits.push(ms); } });
  assert.equal(found.id, 'next');
  assert.deepEqual(waits, [2000, 2000]);
  let calls = 0;
  const none = await asc.awaitEditableInfo(async () => { calls++; return live; }, { attempts: 3, wait: async () => {} });
  assert.equal(none, null);
  assert.equal(calls, 3);
});
