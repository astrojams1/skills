import test from 'node:test';
import assert from 'node:assert/strict';
import { verifySubscriptionReview, reviewItemPlan, itemResource, REVIEW_RELATIONSHIPS, reviewItemsQuery } from '../../skills/app-release/scripts/lib/review-items.mjs';
import { fillSubmission, submissionPlan, resubmissionPlan, itemsToResolve } from '../../skills/app-release/scripts/asc.mjs';

const config = { appStoreId: 'product', groupId: 'group', productId: 'com.example.yearly', subscriptionVersionId: 'sv1', subscriptionGroupVersionId: 'gv1' };
const targets = [
  { relation: 'subscriptionVersion', type: 'subscriptionVersions', id: 'sv1' },
  { relation: 'subscriptionGroupVersion', type: 'subscriptionGroupVersions', id: 'gv1' },
];
const app = { relation: 'appStoreVersion', type: 'appStoreVersions', id: 'v1' };
const board = { relation: 'gameCenterLeaderboardVersion', type: 'gameCenterLeaderboardVersions', id: 'lb1' };
const item = (resource, state = 'READY_FOR_REVIEW') => ({ id: resource.id + '-item', attributes: { state }, relationships: {
  [resource.relation]: { data: { type: resource.type, id: resource.id } }, reviewSubmission: { data: { type: 'reviewSubmissions', id: 'draft' } },
} });
const collections = () => new Map([
  ['/v1/apps/app/subscriptionGroups?limit=200', [{ id: 'group' }]],
  ['/v1/subscriptionGroups/group/subscriptions?limit=200', [{ id: 'product', attributes: { productId: 'com.example.yearly' } }]],
  ['/v1/subscriptions/product/versions?limit=200', [{ id: 'sv1' }]],
  ['/v1/subscriptionGroups/group/versions?limit=200', [{ id: 'gv1' }]],
]);
const reader = map => async path => { assert.ok(map.has(path), 'unexpected API read ' + path); return structuredClone(map.get(path)); };

test('subscription targets require explicit complete identity and are bound through every API parent', async () => {
  assert.deepEqual(await verifySubscriptionReview(config, 'app', reader(collections())), targets);
  let calls = 0;
  for (const absent of [undefined, {}, { productId: 'existing-but-not-for-this-review' }]) {
    assert.deepEqual(await verifySubscriptionReview(absent, 'app', async () => { calls += 1; }), []);
  }
  assert.equal(calls, 0, 'no-subscription apps make no new API calls');
  for (const field of Object.keys(config)) {
    const incomplete = { ...config }; delete incomplete[field];
    await assert.rejects(verifySubscriptionReview(incomplete, 'app', async () => { throw Error('must not read'); }), /required/);
  }
});

test('wrong app, wrong group, wrong product and foreign review versions stop before attachment', async () => {
  for (const [path, label] of [
    ['/v1/apps/app/subscriptionGroups?limit=200', 'group/app'],
    ['/v1/subscriptionGroups/group/subscriptions?limit=200', 'Subscription/group'],
    ['/v1/subscriptions/product/versions?limit=200', 'version/product'],
    ['/v1/subscriptionGroups/group/versions?limit=200', 'version/group'],
  ]) {
    const map = collections(); map.set(path, [{ id: 'foreign' }]);
    await assert.rejects(verifySubscriptionReview(config, 'app', reader(map)), new RegExp(label));
  }
  const wrongProduct = collections(); wrongProduct.get('/v1/subscriptionGroups/group/subscriptions?limit=200')[0].attributes.productId = 'com.other.yearly';
  await assert.rejects(verifySubscriptionReview(config, 'app', reader(wrongProduct)), /productId mismatch/);
  const duplicate = collections(); duplicate.get('/v1/apps/app/subscriptionGroups?limit=200').push({ id: 'group' });
  await assert.rejects(verifySubscriptionReview(config, 'app', reader(duplicate)), /ambiguous identity/);
});

test('an app version cannot mask unexpected, duplicate, removed, foreign or ambiguous review items', () => {
  assert.equal(submissionPlan([item(app), ...targets.map(t => item(t))], 'v1', targets).action, 'submit');
  assert.equal(submissionPlan([item(app)], 'v1', targets).action, 'add', 'configured subscriptions are required');
  assert.equal(submissionPlan([...targets.map(t => item(t))], 'v1', targets).action, 'add');
  assert.equal(submissionPlan([item(app), item(board)], 'v1').action, 'submit', 'legacy Game Center remains supported');
  assert.equal(submissionPlan([item(app), item(targets[0])], 'v1').action, 'conflict', 'unconfigured subscription cannot be silently accepted');
  const bad = [
    item({ ...app, id: 'another-app-version' }),
    item({ ...targets[0], id: 'foreign-version' }),
    item({ relation: 'appEvent', type: 'appEvents', id: 'event' }),
    item({ ...targets[0], type: 'inAppPurchaseVersions' }),
    { relationships: {} },
    item(targets[0], 'REMOVED'),
    { relationships: { subscriptionVersion: { data: [{ type: 'subscriptionVersions', id: 'sv1' }] } } },
    { relationships: { ...item(app).relationships, ...item(targets[0]).relationships } },
  ];
  for (const entry of bad) assert.equal(submissionPlan([item(app), entry], 'v1', targets).action, 'conflict');
  for (const target of [app, board, ...targets]) assert.equal(submissionPlan([item(app), item(target), item(target)], 'v1', targets).action, 'conflict');
  assert.equal(itemResource({ relationships: { appStoreVersion: { data: null } } }), null);
  assert.ok(REVIEW_RELATIONSHIPS.includes('appEvent') && REVIEW_RELATIONSHIPS.includes('subscriptionGroupVersion'), 'reads include unsupported resource linkages to detect them');
});

test('rejected drafts preserve subscription targets and never cancel a foreign-item submission', () => {
  const rejected = { attributes: { state: 'UNRESOLVED_ISSUES' } };
  assert.deepEqual(resubmissionPlan(rejected, [item(app)], [], 'v1', targets), { action: 'replace', missing: ['subscriptionVersion:subscriptionVersions:sv1', 'subscriptionGroupVersion:subscriptionGroupVersions:gv1'] });
  const held = [item(app, 'REJECTED'), item(board, 'REJECTED'), item(targets[0], 'REJECTED'), item(targets[1], 'ACCEPTED')];
  assert.deepEqual(resubmissionPlan(rejected, held, ['lb1'], 'v1', targets), { action: 'reuse' });
  assert.deepEqual(itemsToResolve(held, 'v1', targets).map(x => x.id), ['v1-item', 'lb1-item', 'sv1-item']);
  assert.equal(resubmissionPlan(rejected, [...held, item({ ...targets[0], id: 'foreign' })], ['missing-board'], 'v1', targets).action, 'conflict');
});

function memoryTransport(initial = []) {
  const state = { items: structuredClone(initial), writes: [], reads: 0 };
  state.readItems = async id => { assert.equal(id, 'draft'); state.reads += 1; return structuredClone(state.items); };
  state.write = async (path, method, body) => {
    assert.equal(path, '/v1/reviewSubmissionItems'); assert.equal(method, 'POST');
    const links = body.data.relationships;
    assert.equal(links.reviewSubmission.data.id, 'draft');
    const [relation, { data }] = Object.entries(links).find(([name]) => name !== 'reviewSubmission');
    state.writes.push({ relation, ...data }); state.items.push(item({ relation, ...data }));
  };
  return state;
}

test('attachment resumes partial drafts, verifies each write, and a rerun creates no duplicate', async () => {
  const state = memoryTransport([item(app), item(targets[0])]);
  await fillSubmission({ id: 'draft' }, 'v1', [], targets, state);
  assert.deepEqual(state.writes, [targets[1]]);
  assert.equal(reviewItemPlan(state.items, 'v1', targets).missing.length, 0);
  await fillSubmission({ id: 'draft' }, 'v1', [], targets, state);
  assert.equal(state.writes.length, 1);
  const legacy = memoryTransport();
  await fillSubmission({ id: 'draft' }, 'v1', [{ id: 'lb1', state: 'READY_FOR_REVIEW' }], [], legacy);
  assert.deepEqual(legacy.writes, [app, board], 'existing apps still attach only their app and editable leaderboards');
});

test('attachment stops on a conflicting draft, a missing readback or a dropped write response', async () => {
  const conflicting = memoryTransport([item(app), item({ ...targets[0], id: 'foreign' })]);
  await assert.rejects(fillSubmission({ id: 'draft' }, 'v1', [], targets, conflicting), /conflicting/);
  assert.equal(conflicting.writes.length, 0);
  const missing = memoryTransport([item(app)]);
  missing.write = async (...args) => { missing.writes.push(args); };
  await assert.rejects(fillSubmission({ id: 'draft' }, 'v1', [], targets, missing), /did not read back/);
  assert.equal(missing.writes.length, 1, 'does not continue after an unverified attachment');
  const dropped = memoryTransport([item(app)]);
  const write = dropped.write;
  dropped.write = async (...args) => { await write(...args); throw Error('connection dropped after acceptance'); };
  await assert.rejects(fillSubmission({ id: 'draft' }, 'v1', [], targets, dropped), /connection dropped/);
  assert.equal(dropped.writes.length, 1, 'never retries a mutation with uncertain outcome');
  dropped.write = write;
  await fillSubmission({ id: 'draft' }, 'v1', [], targets, dropped);
  assert.deepEqual(dropped.writes, targets, 'rerun reads accepted item and adds only remaining target');
});

test('a concurrent unexpected item after a write prevents further attachment', async () => {
  const state = memoryTransport([item(app)]); const write = state.write;
  state.write = async (...args) => { await write(...args); state.items.push(item({ relation: 'appEvent', type: 'appEvents', id: 'concurrent' })); };
  await assert.rejects(fillSubmission({ id: 'draft' }, 'v1', [], targets, state), /did not read back/);
  assert.equal(state.writes.length, 1);
});


test('review-item reads avoid mutually exclusive includes while retaining every relationship field', () => {
  const query = new URLSearchParams(reviewItemsQuery());
  assert.deepEqual(query.get('include').split(','), ['appStoreVersion', 'gameCenterLeaderboardVersion', 'subscriptionVersion', 'subscriptionGroupVersion']);
  for (const relationship of REVIEW_RELATIONSHIPS) assert.ok(query.get('fields[reviewSubmissionItems]').split(',').includes(relationship));
  assert.ok(query.get('fields[reviewSubmissionItems]').includes('appStoreVersionExperimentV2'));
  assert.equal(query.get('include').includes('appStoreVersionExperiment'), false);
});
