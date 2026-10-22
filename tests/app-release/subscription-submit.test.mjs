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
const resource = (relation, type, id) => ({ relation, type, id });
const app = resource('appStoreVersion', 'appStoreVersions', 'v1');
const sub = resource('subscriptionVersion', 'subscriptionVersions', 'sv1');
const group = resource('subscriptionGroupVersion', 'subscriptionGroupVersions', 'gv1');
const item = target => ({ id: target.id + '-item', attributes: { state: 'READY_FOR_REVIEW' }, relationships: { [target.relation]: { data: { type: target.type, id: target.id } } } });

function fixture(options = {}) {
  writeFileSync(join(root, 'store.json'), JSON.stringify({ version: '1.0', listing: { locale: 'en-US' }, ...(options.noSubscription ? {} : { subscription: config }) }));
  setup(root);
  const state = { items: structuredClone(options.items || [item(app)]), writes: [], reads: [], submitted: false };
  globalThis.fetch = async (url, request) => {
    const u = new URL(url); const path = u.pathname; const method = request.method || 'GET';
    assert.equal(u.origin, 'https://api.appstoreconnect.apple.com');
    if (method !== 'GET') {
      const body = JSON.parse(request.body); state.writes.push({ path, method, body });
      if (method === 'POST' && path === '/v1/reviewSubmissionItems') {
        const links = Object.entries(body.data.relationships).filter(([name]) => name !== 'reviewSubmission');
        assert.equal(links.length, 1); const [relation, { data }] = links[0];
        state.items.push(item(resource(relation, data.type, data.id)));
        return { ok: true, text: async () => JSON.stringify({ data: state.items.at(-1) }) };
      }
      assert.equal(path, '/v1/reviewSubmissions/draft'); assert.equal(method, 'PATCH'); assert.equal(body.data.attributes.submitted, true);
      state.submitted = true;
      return { ok: true, text: async () => JSON.stringify({ data: { id: 'draft', attributes: { state: 'WAITING_FOR_REVIEW' } } }) };
    }
    state.reads.push(path);
    let data;
    if (path === '/v1/apps/app') data = { id: 'app', attributes: { bundleId: options.wrongBundle ? 'com.foreign.app' : 'com.example.app' } };
    else if (path === '/v1/apps/app/appInfos') data = [];
    else if (path === '/v1/apps/app/appStoreVersions') data = [{ id: 'v1', attributes: { versionString: '1.0' } }];
    else if (path === '/v1/apps/app/subscriptionGroups') data = options.wrongApp || (options.ownershipChanges && state.reads.filter(x => x === path).length > 1) ? [] : [{ id: 'group' }];
    else if (path === '/v1/subscriptionGroups/group/subscriptions') data = [{ id: 'product', attributes: { productId: 'com.example.yearly' } }];
    else if (path === '/v1/subscriptions/product/versions') data = [{ id: options.foreignVersion ? 'foreign' : 'sv1' }];
    else if (path === '/v1/subscriptionGroups/group/versions') data = [{ id: 'gv1' }];
    else if (path === '/v1/apps/app/reviewSubmissions') {
      const filter = u.searchParams.get('filter[state]');
      data = filter === 'READY_FOR_REVIEW,UNRESOLVED_ISSUES' ? [{ id: 'draft', attributes: { state: 'READY_FOR_REVIEW' } }] : [];
      if (options.multipleDrafts && filter === 'READY_FOR_REVIEW,UNRESOLVED_ISSUES') data.push({ id: 'another-draft', attributes: { state: 'READY_FOR_REVIEW' } });
      if (options.pending && filter === 'WAITING_FOR_REVIEW,IN_REVIEW') data = [{ id: 'draft', attributes: { state: 'WAITING_FOR_REVIEW' } }];
    } else if (path === '/v1/reviewSubmissions/draft/items') {
      assert.ok(u.searchParams.get('include').includes('subscriptionVersion'));
      assert.ok(u.searchParams.get('fields[reviewSubmissionItems]').includes('appEvent'), 'unexpected resources remain visible');
      data = state.items;
    } else if (path === '/v1/reviewSubmissions/draft') data = { id: 'draft', attributes: { state: state.submitted ? 'WAITING_FOR_REVIEW' : 'READY_FOR_REVIEW' } };
    else if (path === '/v1/appStoreVersions/v1') data = { id: 'v1', attributes: { appVersionState: options.staleReadback ? 'PREPARE_FOR_SUBMISSION' : 'WAITING_FOR_REVIEW' } };
    else throw Error('Unexpected mocked API read ' + path);
    return { ok: true, text: async () => JSON.stringify({ data: structuredClone(data) }) };
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
