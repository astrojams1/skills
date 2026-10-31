// Exercise the real submit orchestration against an in-memory Apple API. No live credentials or provider writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setup, submit } from '../../skills/app-release/scripts/asc.mjs';

const root = mkdtempSync(join(tmpdir(), 'subscription-submit-'));
const keyFile = join(root, 'test.p8');
writeFileSync(keyFile, generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
process.env.ASC_KEY_ID = 'synthetic-key'; process.env.ASC_ISSUER_ID = 'synthetic-issuer'; process.env.ASC_PRIVATE_KEY_PATH = keyFile;
writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example', ledger: { gates: 'ledger.json', view: 'ledger.md' }, storeData: 'store.json',
  ios: { ascAppId: 'app', bundleId: 'com.example.app', teamId: 'synthetic-team', scheme: 'Example', buildNumberEnv: 'BUILD' } }));
test.after(() => { globalThis.fetch = savedFetch; process.env = savedEnv; rmSync(root, { recursive: true, force: true }); });
const config = { appStoreId: 'product', groupId: 'group', productId: 'com.example.yearly', subscriptionVersionId: 'sv1', subscriptionGroupVersionId: 'gv1' };
const purchase = { appStoreId: 'iap', productId: 'com.example.import', reviewVersionId: 'iv1' };
const resource = (relation, type, id) => ({ relation, type, id });
const app = resource('appStoreVersion', 'appStoreVersions', 'v1');
const iap = resource('inAppPurchaseVersion', 'inAppPurchaseVersions', 'iv1');
const sub = resource('subscriptionVersion', 'subscriptionVersions', 'sv1');
const group = resource('subscriptionGroupVersion', 'subscriptionGroupVersions', 'gv1');
const item = target => ({ id: target.id + '-item', attributes: { state: 'READY_FOR_REVIEW' }, relationships: { [target.relation]: { data: { type: target.type, id: target.id } } } });

function fixture(options = {}) {
  writeFileSync(join(root, 'store.json'), JSON.stringify({ version: '1.0', listing: { locale: 'en-US' }, ...(options.noSubscription ? {} : { subscription: config }), ...(options.iap ? { inAppPurchases: options.purchaseConfig || [purchase] } : {}), ...(Object.hasOwn(options, 'kidsNotes') ? { ageRating: { kidsAgeBand: 'FIVE_AND_UNDER' } } : {}) }));
  setup(root);
  const state = { items: structuredClone(options.items || [item(app)]), writes: [], reads: [], submitted: false, activeId: 'draft' };
  globalThis.fetch = async (url, request) => {
    const u = new URL(url); const path = u.pathname; const method = request.method || 'GET';
    assert.equal(u.origin, 'https://api.appstoreconnect.apple.com');
    if (method !== 'GET') {
      const body = JSON.parse(request.body); state.writes.push({ path, method, body });
      if (method === 'POST' && path === '/v1/reviewSubmissionItems') {
        const links = Object.entries(body.data.relationships).filter(([name]) => name !== 'reviewSubmission');
        assert.equal(links.length, 1); const [relation, { data }] = links[0];
        state.items.push(item(resource(relation, data.type, data.id)));
        if (options.lostIapResponse && relation === 'inAppPurchaseVersion') throw Error('connection lost after attachment');
        if (options.concurrentItem && relation === 'inAppPurchaseVersion') state.items.push(item(resource('appEvent', 'appEvents', 'foreign')));
        return { ok: true, text: async () => JSON.stringify({ data: state.items.at(-1) }) };
      }
      if (path === '/v1/reviewSubmissions' && method === 'POST') {
        assert.equal(state.canceled, true, 'old submission cancellation settled before replacement');
        state.activeId = 'replacement'; state.items = [];
        return { ok: true, text: async () => JSON.stringify({ data: { id: state.activeId, attributes: { state: 'READY_FOR_REVIEW' } } }) };
      }
      if (path.startsWith('/v1/reviewSubmissionItems/') && method === 'PATCH') {
        assert.equal(body.data.attributes.resolved, true);
        const held = state.items.find(x => x.id === body.data.id); assert.ok(held);
        held.attributes.resolved = true;
        return { ok: true, text: async () => JSON.stringify({ data: held }) };
      }
      assert.equal(path, '/v1/reviewSubmissions/' + state.activeId); assert.equal(method, 'PATCH'); if (body.data.attributes.canceled) { state.canceled = true; return { ok: true, text: async () => JSON.stringify({ data: { id: 'draft', attributes: { state: 'COMPLETE' } } }) }; }
      assert.equal(body.data.attributes.submitted, true);
      state.submitted = true;
      if (options.lostSubmitResponse) throw Error('connection lost after submission');
      return { ok: true, text: async () => JSON.stringify({ data: { id: 'draft', attributes: { state: 'WAITING_FOR_REVIEW' } } }) };
    }
    state.reads.push(path);
    let data;
    if (path === '/v1/apps/app') data = { id: 'app', attributes: { bundleId: options.wrongBundle ? 'com.foreign.app' : 'com.example.app' } };
    else if (path === '/v1/apps/app/appInfos') data = [];
    else if (path === '/v1/apps/app/appStoreVersions') data = [{ id: 'v1', attributes: { versionString: '1.0' } }];
    else if (path === '/v1/apps/app/inAppPurchasesV2') data = options.wrongIapApp || (options.iapOwnershipChanges && state.reads.filter(x => x === path).length > 1) ? [] : [{ id: 'iap', attributes: { productId: options.wrongIapProduct ? 'com.other.import' : 'com.example.import' } }];
    else if (path === '/v2/inAppPurchases/iap/versions') data = [{ id: options.wrongIapVersion ? 'foreign' : 'iv1' }];
    else if (path === '/v1/apps/app/subscriptionGroups') data = options.wrongApp || (options.ownershipChanges && state.reads.filter(x => x === path).length > 1) ? [] : [{ id: 'group' }];
    else if (path === '/v1/subscriptionGroups/group/subscriptions') data = [{ id: 'product', attributes: { productId: 'com.example.yearly' } }];
    else if (path === '/v1/subscriptions/product/versions') data = [{ id: options.foreignVersion ? 'foreign' : 'sv1' }];
    else if (path === '/v1/subscriptionGroups/group/versions') data = [{ id: 'gv1' }];
    else if (path === '/v1/apps/app/reviewSubmissions') {
      const filter = u.searchParams.get('filter[state]');
      data = filter === 'READY_FOR_REVIEW,UNRESOLVED_ISSUES' && !state.canceled ? [{ id: 'draft', attributes: { state: options.rejected ? 'UNRESOLVED_ISSUES' : 'READY_FOR_REVIEW' } }] : [];
      if (options.multipleDrafts && filter === 'READY_FOR_REVIEW,UNRESOLVED_ISSUES') data.push({ id: 'another-draft', attributes: { state: 'READY_FOR_REVIEW' } });
      if (options.pending && filter === 'WAITING_FOR_REVIEW,IN_REVIEW') data = [{ id: 'draft', attributes: { state: 'WAITING_FOR_REVIEW' } }];
    } else if (path === '/v1/reviewSubmissions/' + state.activeId + '/items') {
      assert.ok(u.searchParams.get('include').includes('subscriptionVersion'));
      assert.ok(u.searchParams.get('fields[reviewSubmissionItems]').includes('appEvent'), 'unexpected resources remain visible');
      data = state.items;
    } else if (path === '/v1/reviewSubmissions/draft' && state.canceled) data = { id: 'draft', attributes: { state: 'COMPLETE' } };
    else if (path === '/v1/reviewSubmissions/' + state.activeId) data = { id: state.activeId, attributes: { state: state.submitted ? 'WAITING_FOR_REVIEW' : 'READY_FOR_REVIEW' } };
    else if (path === '/v1/appStoreVersions/v1') data = { id: 'v1', attributes: { appVersionState: options.staleReadback ? 'PREPARE_FOR_SUBMISSION' : 'WAITING_FOR_REVIEW' } };
    else if (path === '/v1/appStoreVersions/v1/appStoreReviewDetail') {
      if (options.kidsNotes === null) return { ok: false, status: 404, text: async () => JSON.stringify({ errors: [{ status: '404' }] }) };
      data = { id: 'detail', attributes: { notes: options.kidsNotes } };
    }
    else throw Error('Unexpected mocked API read ' + path);
    const links = options.paginatedIap && path === '/v1/apps/app/inAppPurchasesV2' && !u.searchParams.has('cursor')
      ? { next: 'https://api.appstoreconnect.apple.com/v1/apps/app/inAppPurchasesV2?cursor=next' } : undefined;
    return { ok: true, text: async () => JSON.stringify({ data: links ? [] : structuredClone(data), ...(links ? { links } : {}) }) };
  };
  return state;
}

test('submit attaches the two verified first-subscription versions once and independently reads submission/version back', async () => {
  const state = fixture(); await submit('--confirm');
  assert.deepEqual(state.writes.map(x => x.path), ['/v1/reviewSubmissionItems', '/v1/reviewSubmissionItems', '/v1/reviewSubmissions/draft']);
  assert.deepEqual(state.items.map(x => Object.keys(x.relationships)[0]), ['appStoreVersion', 'subscriptionVersion', 'subscriptionGroupVersion']);
  assert.equal(state.reads.filter(x => x === '/v1/apps/app/subscriptionGroups').length, 2, 'ownership checked initially and immediately before submit');
  assert.ok(state.reads.includes('/v1/reviewSubmissions/draft') && state.reads.includes('/v1/appStoreVersions/v1'));
});

test('the full submit path performs zero mutations for wrong-app, wrong-bundle or foreign-version ownership', async () => {
  for (const options of [{ wrongApp: true }, { wrongBundle: true }, { foreignVersion: true }]) {
    const state = fixture(options); await assert.rejects(submit('--confirm'), /identity mismatch|ownership mismatch/);
    assert.equal(state.writes.length, 0);
  }
});

test('the full submit path refuses unexpected, duplicate and unconfigured review resources before mutation', async () => {
  for (const options of [
    { items: [item(app), item(sub), item(sub)] },
    { items: [item(app), item(resource('appEvent', 'appEvents', 'event'))] },
    { items: [item(app), item(resource('subscriptionVersion', 'subscriptionVersions', 'foreign'))] },
    { noSubscription: true, items: [item(app), item(sub), item(group)] },
  ]) {
    const state = fixture(options); await assert.rejects(submit('--confirm'), /holds other items/);
    assert.equal(state.writes.length, 0);
  }
});

test('no-subscription apps use the existing app-only submission path without subscription API reads', async () => {
  const state = fixture({ noSubscription: true }); await submit('--confirm');
  assert.deepEqual(state.writes.map(x => x.path), ['/v1/reviewSubmissions/draft']);
  assert.equal(state.reads.some(x => x.includes('subscription')), false);
});

test('a successful submit response is not reported complete if independent version readback disagrees', async () => {
  const state = fixture({ noSubscription: true, staleReadback: true });
  await assert.rejects(submit('--confirm'), /readback is not waiting/);
  assert.equal(state.writes.length, 1, 'does not repeat the accepted submit mutation');
});


test('a pending complete submission is reused without mutation, while a smaller pending set is refused', async () => {
  const complete = fixture({ pending: true, items: [item(app), item(sub), item(group)] });
  await submit('--confirm'); assert.equal(complete.writes.length, 0);
  const missing = fixture({ pending: true });
  await assert.rejects(submit('--confirm'), /exact configured review targets/); assert.equal(missing.writes.length, 0);
});

test('multiple editable submissions are not selected arbitrarily', async () => {
  const state = fixture({ multipleDrafts: true });
  await assert.rejects(submit('--confirm'), /Multiple open review submissions/); assert.equal(state.writes.length, 0);
});

test('ownership that changes after attachments blocks the final submit mutation', async () => {
  const state = fixture({ ownershipChanges: true });
  await assert.rejects(submit('--confirm'), /ownership mismatch/);
  assert.deepEqual(state.writes.map(x => x.path), ['/v1/reviewSubmissionItems', '/v1/reviewSubmissionItems']);
  assert.equal(state.submitted, false);
});


test('IAP-only and mixed purchase submissions attach explicit targets and revalidate ownership', async () => {
  for (const noSubscription of [true, false]) {
    const state = fixture({ iap: true, noSubscription });
    await submit('--confirm');
    assert.deepEqual(state.items.map(x => Object.keys(x.relationships)[0]), noSubscription
      ? ['appStoreVersion', 'inAppPurchaseVersion']
      : ['appStoreVersion', 'subscriptionVersion', 'subscriptionGroupVersion', 'inAppPurchaseVersion']);
    assert.equal(state.reads.filter(x => x === '/v1/apps/app/inAppPurchasesV2').length, 2);
    assert.equal(state.writes.at(-1).body.data.attributes.submitted, true);
  }
});

test('IAP ownership and held-resource conflicts cause zero mutations in the real submit path', async () => {
  for (const options of [
    { wrongIapApp: true }, { wrongIapProduct: true }, { wrongIapVersion: true },
    { items: [item(app), item(iap), item(iap)] },
    { items: [item(app), item(resource('inAppPurchaseVersion', 'inAppPurchaseVersions', 'foreign'))] },
    { items: [item(app), item({ ...iap, type: 'subscriptionVersions' })] },
    { purchaseConfig: [purchase, purchase] },
  ]) {
    const state = fixture({ iap: true, noSubscription: true, ...options });
    await assert.rejects(submit('--confirm'), /mismatch|holds other items|Duplicate/);
    assert.equal(state.writes.length, 0);
  }
});

test('IAP ownership is checked again immediately before submission after an attachment', async () => {
  const state = fixture({ iap: true, noSubscription: true, iapOwnershipChanges: true });
  await assert.rejects(submit('--confirm'), /ownership mismatch/);
  assert.deepEqual(state.writes.map(x => x.path), ['/v1/reviewSubmissionItems']);
  assert.equal(state.submitted, false);
});

test('pending IAP submission reuse requires the exact configured version and adds no writes', async () => {
  const complete = fixture({ iap: true, noSubscription: true, pending: true, items: [item(app), item(iap)] });
  await submit('--confirm'); assert.equal(complete.writes.length, 0);
  const missing = fixture({ iap: true, noSubscription: true, pending: true });
  await assert.rejects(submit('--confirm'), /exact configured review targets/); assert.equal(missing.writes.length, 0);
});

test('unknown IAP attachment or submit write outcomes stop and rerun only reads existing state', async () => {
  const state = fixture({ iap: true, noSubscription: true, lostIapResponse: true });
  await assert.rejects(submit('--confirm'), /connection lost after attachment/);
  assert.equal(state.writes.length, 1); assert.equal(state.submitted, false);
  const resumed = fixture({ iap: true, noSubscription: true, items: state.items });
  await submit('--confirm'); assert.deepEqual(resumed.writes.map(x => x.path), ['/v1/reviewSubmissions/draft']);
  const submitted = fixture({ iap: true, noSubscription: true, items: resumed.items, lostSubmitResponse: true });
  await assert.rejects(submit('--confirm'), /connection lost after submission/);
  assert.equal(submitted.writes.length, 1);
  const readback = fixture({ iap: true, noSubscription: true, pending: true, items: submitted.items });
  await submit('--confirm'); assert.equal(readback.writes.length, 0);
});

test('a concurrent foreign item after IAP attachment prevents the submit mutation', async () => {
  const state = fixture({ iap: true, noSubscription: true, concurrentItem: true });
  await assert.rejects(submit('--confirm'), /did not read back/);
  assert.equal(state.writes.length, 1); assert.equal(state.submitted, false);
});


test('replacing a rejected incomplete submission carries its explicitly configured IAP into a new draft', async () => {
  const state = fixture({ iap: true, noSubscription: true, rejected: true });
  await submit('--confirm');
  assert.deepEqual(state.writes.map(x => x.path), [
    '/v1/reviewSubmissions/draft', '/v1/reviewSubmissions', '/v1/reviewSubmissionItems',
    '/v1/reviewSubmissionItems', '/v1/reviewSubmissions/replacement',
  ]);
  assert.equal(state.writes[0].body.data.attributes.canceled, true);
  assert.equal(state.writes.at(-1).body.data.attributes.submitted, true);
  assert.deepEqual(state.items.map(x => Object.keys(x.relationships)[0]), ['appStoreVersion', 'inAppPurchaseVersion']);
  assert.equal(state.reads.filter(x => x === '/v1/apps/app/inAppPurchasesV2').length, 3, 'ownership checked before cancel, after cancel and before submit');
  const foreign = fixture({ iap: true, noSubscription: true, rejected: true, items: [item(app), item(resource('inAppPurchaseVersion', 'inAppPurchaseVersions', 'foreign'))] });
  await assert.rejects(submit('--confirm'), /holds other items/);
  assert.equal(foreign.writes.length, 0, 'foreign item prevents cancellation');
});


test('an existing rejected IAP target is resolved with its app version without canceling the complete draft', async () => {
  const rejectedItem = resource => { const held = item(resource); held.attributes.state = 'REJECTED'; return held; };
  const state = fixture({ iap: true, noSubscription: true, rejected: true, items: [rejectedItem(app), rejectedItem(iap)] });
  await submit('--confirm');
  assert.deepEqual(state.writes.map(x => x.path), [
    '/v1/reviewSubmissionItems/v1-item', '/v1/reviewSubmissionItems/iv1-item', '/v1/reviewSubmissions/draft',
  ]);
  assert.equal(state.canceled, undefined);
  assert.equal(state.submitted, true);
});


test('IAP ownership follows paginated app collections instead of refusing a product on a later page', async () => {
  const state = fixture({ iap: true, noSubscription: true, paginatedIap: true });
  await submit('--confirm');
  assert.equal(state.reads.filter(x => x === '/v1/apps/app/inAppPurchasesV2').length, 4);
  assert.equal(state.submitted, true);
});

test('a Kids Category app whose saved notes skip the Guideline 1.3 questions is refused before any write', async () => {
  for (const kidsNotes of [null, 'The app collects no data and shows no ads.']) {
    const state = fixture({ noSubscription: true, kidsNotes });
    await assert.rejects(submit('--confirm'), /Guideline 1\.3[\s\S]*third-party analytics[\s\S]*nothing was submitted/);
    assert.equal(state.writes.length, 0);
    assert.equal(state.reads.includes('/v1/apps/app/reviewSubmissions'), false, 'refused before any submission is opened');
  }
});

test('a Kids Category app whose saved notes answer the Guideline 1.3 questions is submitted', async () => {
  const kidsNotes = 'No third-party analytics. No ads. No data shared with third parties. The app collects no user or device data.';
  const state = fixture({ noSubscription: true, kidsNotes });
  await submit('--confirm');
  assert.ok(state.reads.includes('/v1/appStoreVersions/v1/appStoreReviewDetail'));
  assert.equal(state.submitted, true);
});

test('apps outside the Kids Category never read the review notes at submit', async () => {
  const state = fixture({ noSubscription: true });
  await submit('--confirm');
  assert.equal(state.reads.includes('/v1/appStoreVersions/v1/appStoreReviewDetail'), false);
});
