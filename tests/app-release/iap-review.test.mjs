import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyInAppPurchaseReview, verifyPurchaseReviewTargets } from '../../skills/app-release/scripts/lib/review-items.mjs';
import { fillSubmission, submissionPlan, resubmissionPlan, itemsToResolve } from '../../skills/app-release/scripts/asc.mjs';

const purchase = { appStoreId: 'iap1', productId: 'com.example.import', reviewVersionId: 'iv1' };
const target = { relation: 'inAppPurchaseVersion', type: 'inAppPurchaseVersions', id: 'iv1' };
const app = { relation: 'appStoreVersion', type: 'appStoreVersions', id: 'v1' };
const item = (resource, state = 'READY_FOR_REVIEW') => ({ id: resource.id + '-item', attributes: { state }, relationships: { [resource.relation]: { data: { type: resource.type, id: resource.id } } } });
const collections = () => new Map([
  ['/v1/apps/app/inAppPurchasesV2?limit=200', [{ id: 'iap1', attributes: { productId: purchase.productId } }, { id: 'iap2', attributes: { productId: 'com.example.unlock' } }]],
  ['/v2/inAppPurchases/iap1/versions?limit=200', [{ id: 'iv1' }]],
  ['/v2/inAppPurchases/iap2/versions?limit=200', [{ id: 'iv2' }]],
]);
const reader = map => async path => { assert.ok(map.has(path), 'unexpected API read ' + path); return structuredClone(map.get(path)); };

test('only explicit IAP review versions add API reads, and multiple products bind through their parents', async () => {
  for (const absent of [undefined, [], [{ appStoreId: 'historical', productId: 'old' }]]) {
    assert.deepEqual(await verifyInAppPurchaseReview(absent, 'app', async () => { assert.fail('must not read'); }), []);
  }
  assert.deepEqual(await verifyPurchaseReviewTargets({}, 'app', async () => { assert.fail('must not read'); }), []);
  assert.deepEqual(await verifyInAppPurchaseReview([purchase, { appStoreId: 'iap2', productId: 'com.example.unlock', reviewVersionId: 'iv2' }], 'app', reader(collections())),
    [target, { ...target, id: 'iv2' }]);
});

test('invalid or duplicate selected IAP configuration fails before any provider reads', async () => {
  const mustNotRead = async () => { assert.fail('must not read'); };
  for (const invalid of [null, {}, [null], [[purchase]], [{ reviewVersionId: '' }], [{ ...purchase, appStoreId: '' }], [{ ...purchase, productId: '' }], [purchase, purchase]]) {
    await assert.rejects(verifyInAppPurchaseReview(invalid, 'app', mustNotRead), /must be|rows must|required|Duplicate/);
  }
  for (const field of Object.keys(purchase)) {
    const second = { appStoreId: 'iap2', productId: 'another.product', reviewVersionId: 'iv2', [field]: purchase[field] };
    await assert.rejects(verifyInAppPurchaseReview([purchase, second], 'app', mustNotRead), /Duplicate/);
  }
});

test('foreign app products, mismatched product IDs, foreign versions and ambiguous API results are refused', async () => {
  for (const path of collections().keys()) {
    if (path.includes('iap2')) continue;
    for (const replacement of [[], [{ id: 'foreign' }], [...collections().get(path), ...collections().get(path)]]) {
      const map = collections(); map.set(path, replacement);
      await assert.rejects(verifyInAppPurchaseReview([purchase], 'app', reader(map)), /ownership mismatch|ambiguous identity/);
    }
  }
  const map = collections(); map.get('/v1/apps/app/inAppPurchasesV2?limit=200')[0].attributes.productId = 'com.other.import';
  await assert.rejects(verifyInAppPurchaseReview([purchase], 'app', reader(map)), /productId mismatch/);
});

test('IAP targets participate in rejection recovery and exact-item conflict guards', () => {
  const rejected = { attributes: { state: 'UNRESOLVED_ISSUES' } };
  assert.equal(resubmissionPlan(rejected, [item(app)], [], 'v1', [target]).action, 'replace');
  const held = [item(app, 'REJECTED'), item(target, 'REJECTED')];
  assert.equal(resubmissionPlan(rejected, held, [], 'v1', [target]).action, 'reuse');
  assert.deepEqual(itemsToResolve(held, 'v1', [target]).map(x => x.id), ['v1-item', 'iv1-item']);
  assert.equal(submissionPlan(held, 'v1', []).action, 'conflict', 'unconfigured IAP cannot pass');
  for (const extra of [item(target), item({ ...target, id: 'foreign' }), item({ ...target, type: 'subscriptionVersions' })]) {
    assert.equal(resubmissionPlan(rejected, [...held, extra], [], 'v1', [target]).action, 'conflict');
  }
});

test('IAP attachment reads back and resumes idempotently while missing readback stops', async () => {
  const state = { items: [item(app)], writes: [] };
  const transport = {
    readItems: async () => structuredClone(state.items),
    write: async (path, method, body) => {
      assert.equal(path, '/v1/reviewSubmissionItems'); assert.equal(method, 'POST');
      assert.deepEqual(body.data.relationships.inAppPurchaseVersion.data, { type: 'inAppPurchaseVersions', id: 'iv1' });
      state.writes.push(body); state.items.push(item(target));
    },
  };
  await fillSubmission({ id: 'draft' }, 'v1', [], [target], transport);
  await fillSubmission({ id: 'draft' }, 'v1', [], [target], transport);
  assert.equal(state.writes.length, 1);
  let writes = 0;
  await assert.rejects(fillSubmission({ id: 'draft' }, 'v1', [], [target], {
    readItems: async () => [item(app)], write: async () => { writes += 1; },
  }), /did not read back/);
  assert.equal(writes, 1);
});
