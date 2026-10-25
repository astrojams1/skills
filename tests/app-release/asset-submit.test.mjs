// Exercise the image-only review workflow with injected provider transport. No credentials or network are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { submitAssetImages, listAll } from '../../skills/app-release/scripts/asc.mjs';

const originalFetch = globalThis.fetch;
test.before(() => { globalThis.fetch = async () => { throw new Error('Unexpected real network request'); }; });
test.after(() => { globalThis.fetch = originalFetch; });

const item = (relation, type, id) => ({ id: id + '-item', attributes: { state: 'READY_FOR_REVIEW' },
  relationships: { [relation]: { data: { type, id } } } });
const image = id => item('appAssetLibraryImage', 'appAssetLibraryImages', id);
const app = () => item('appStoreVersion', 'appStoreVersions', 'version');
const iap = () => item('inAppPurchaseVersion', 'inAppPurchaseVersions', 'purchase');

function fixture(options = {}) {
  const state = { items: structuredClone(options.items || []), events: [], opens: 0,
    status: options.status || 'READY_FOR_REVIEW' };
  const submission = () => ({ type: 'reviewSubmissions', id: 'draft', attributes: { state: state.status } });
  const request = async (path, method = 'GET', payload) => {
    state.events.push({ path, method, payload });
    if (method === 'GET' && path.startsWith('/v1/reviewSubmissions/draft/items?')) {
      const secondPage = path.includes('cursor=second');
      const data = options.readback ? options.readback(state) : state.items;
      if (options.paginate && !secondPage) return { data: data.slice(0, 1), links: {
        next: 'https://api.appstoreconnect.apple.com/v1/reviewSubmissions/draft/items?cursor=second' } };
      return { data: options.paginate ? data.slice(1) : structuredClone(data) };
    }
    if (method === 'GET' && path === '/v1/reviewSubmissions/draft') {
      if (options.beforeSubmissionRead) options.beforeSubmissionRead(state);
      return { data: submission() };
    }
    if (method === 'POST' && path === '/v1/reviewSubmissionItems') {
      const links = payload.data.relationships;
      assert.deepEqual(links.reviewSubmission, { data: { type: 'reviewSubmissions', id: 'draft' } });
      assert.equal(links.appAssetLibraryImage.data.type, 'appAssetLibraryImages');
      const added = image(links.appAssetLibraryImage.data.id);
      state.items.push(added);
      if (options.afterAdd) options.afterAdd(state);
      if (options.lostAdd) throw new Error('lost attachment response');
      return { data: added };
    }
    if (method === 'PATCH' && path === '/v1/reviewSubmissions/draft') {
      assert.deepEqual(payload.data.attributes, { submitted: true });
      state.status = options.afterSubmit || 'WAITING_FOR_REVIEW';
      if (options.lostSubmit) throw new Error('lost submission response');
      return { data: { ...submission(), attributes: { state: 'WAITING_FOR_REVIEW' } } };
    }
    throw new Error('Unexpected transport call: ' + method + ' ' + path);
  };
  return { state, transport: { request, report: () => {}, openSubmission: async () => { state.opens += 1; return submission(); },
    readItems: () => listAll('/v1/reviewSubmissions/draft/items?limit=200', request) } };
}

const writes = f => f.state.events.filter(event => event.method !== 'GET');

test('pre-existing app and IAP draft items stop image-only submission before any mutation', async () => {
  for (const other of [app(), iap()]) {
    const f = fixture({ items: [other] });
    await assert.rejects(submitAssetImages(['wanted'], f.transport), /conflict/);
    assert.deepEqual(writes(f), []);
  }
});

test('every page and every held relationship is checked for foreign, ambiguous, removed or duplicate resources', async () => {
  for (const other of [
    image('foreign'), image('wanted'),
    item('appEvent', 'appEvents', 'event'),
    { ...image('other'), relationships: { ...image('other').relationships, ...iap().relationships } },
    { ...image('other'), attributes: { state: 'REMOVED' } },
    { id: 'empty', relationships: { appAssetLibraryImage: { data: null } } },
    item('appAssetLibraryImage', 'appStoreVersions', 'wanted'),
  ]) {
    const f = fixture({ items: [image('wanted'), other], paginate: true });
    await assert.rejects(submitAssetImages(['wanted', 'other'], f.transport), /conflict/);
    assert.deepEqual(writes(f), []);
    assert.ok(f.state.events.some(event => event.path.includes('cursor=second')));
  }
});

test('only missing intended images are attached, duplicate selections are deduplicated and the exact set is read back', async () => {
  const f = fixture({ items: [image('first')] });
  const result = await submitAssetImages(['first', 'second', 'second'], f.transport);
  assert.equal(result.attributes.state, 'WAITING_FOR_REVIEW');
  assert.deepEqual(writes(f).map(event => [event.method, event.path]), [
    ['POST', '/v1/reviewSubmissionItems'], ['PATCH', '/v1/reviewSubmissions/draft'],
  ]);
  assert.equal(writes(f)[0].payload.data.relationships.appAssetLibraryImage.data.id, 'second');
  const submitIndex = f.state.events.findIndex(event => event.method === 'PATCH');
  assert.match(f.state.events[submitIndex - 1].path, /\/items\?/);
  assert.deepEqual(f.state.events.at(-1), { path: '/v1/reviewSubmissions/draft', method: 'GET', payload: undefined });
});

test('a complete intended draft is reused without duplicate attachments', async () => {
  const f = fixture({ items: [image('wanted')] });
  await submitAssetImages(['wanted'], f.transport);
  assert.deepEqual(writes(f).map(event => event.method), ['PATCH']);
});

test('a rejected draft is preserved and is never resolved or canceled by image-only submission', async () => {
  const f = fixture({ status: 'UNRESOLVED_ISSUES', items: [image('wanted')] });
  await assert.rejects(submitAssetImages(['wanted'], f.transport), /READY_FOR_REVIEW/);
  assert.deepEqual(writes(f), []);
});

test('missing or conflicting attachment readback prevents submission', async () => {
  for (const options of [
    { readback: () => [] },
    { afterAdd: state => state.items.push(app()) },
    { afterAdd: state => state.items.push(image('wanted')) },
  ]) {
    const f = fixture(options);
    await assert.rejects(submitAssetImages(['wanted'], f.transport), /read back|conflict/);
    assert.deepEqual(writes(f).map(event => event.method), ['POST']);
  }
});

test('a concurrent resource added after all attachments is refused by the final exact-set read', async () => {
  const f = fixture({ items: [image('wanted')], beforeSubmissionRead: state => state.items.push(iap()) });
  await assert.rejects(submitAssetImages(['wanted'], f.transport), /conflict/);
  assert.deepEqual(writes(f), []);
});

test('an intended image removed or a draft changed just before submission is preserved', async () => {
  for (const beforeSubmissionRead of [state => { state.items = []; }, state => { state.status = 'UNRESOLVED_ISSUES'; }]) {
    const f = fixture({ items: [image('wanted')], beforeSubmissionRead });
    await assert.rejects(submitAssetImages(['wanted'], f.transport), /missing intended images|changed before submission/);
    assert.deepEqual(writes(f), []);
  }
});

test('empty or malformed selections never open a draft and an uncertain open is not retried', async () => {
  for (const ids of [[], null, [''], ['wanted', null]]) {
    const f = fixture();
    await assert.rejects(submitAssetImages(ids, f.transport), /explicit image IDs/);
    assert.equal(f.state.opens, 0);
    assert.deepEqual(writes(f), []);
  }
  const f = fixture();
  f.transport.openSubmission = async () => { f.state.opens += 1; throw new Error('lost draft response'); };
  await assert.rejects(submitAssetImages(['wanted'], f.transport), /lost draft/);
  assert.equal(f.state.opens, 1);
  assert.deepEqual(writes(f), []);
});

test('lost attachment and submission responses stop immediately; a later run reuses a surviving image', async () => {
  const add = fixture({ lostAdd: true });
  await assert.rejects(submitAssetImages(['wanted'], add.transport), /lost attachment/);
  assert.deepEqual(writes(add).map(event => event.method), ['POST']);
  assert.equal(add.state.opens, 1);
  await submitAssetImages(['wanted'], add.transport);
  assert.deepEqual(writes(add).map(event => event.method), ['POST', 'PATCH']);
  const submit = fixture({ items: [image('wanted')], lostSubmit: true });
  await assert.rejects(submitAssetImages(['wanted'], submit.transport), /lost submission/);
  assert.deepEqual(writes(submit).map(event => event.method), ['PATCH']);
  assert.equal(submit.state.opens, 1);
});

test('submission acknowledgement alone cannot replace an independent waiting/in-review readback', async () => {
  const f = fixture({ items: [image('wanted')], afterSubmit: 'READY_FOR_REVIEW' });
  await assert.rejects(submitAssetImages(['wanted'], f.transport), /readback/);
  assert.deepEqual(writes(f).map(event => event.method), ['PATCH']);
});
