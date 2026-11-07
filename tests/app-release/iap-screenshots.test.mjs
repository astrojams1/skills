import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { iapReviewScreenshots, iapReviewScreenshotStatus, uploadParts } from '../../skills/app-release/scripts/asc.mjs';

const root = mkdtempSync(join(tmpdir(), 'iap-review-screenshots-'));
const bytes = Buffer.from('synthetic screenshot fixture');
const checksum = createHash('md5').update(bytes).digest('hex');
writeFileSync(join(root, 'shop.png'), bytes);
test.after(() => rmSync(root, { recursive: true, force: true }));
const TYPE = 'inAppPurchaseAppStoreReviewScreenshots';
const ios = { ascAppId: 'app', bundleId: 'com.example.app' };
const row = (id = 'one') => ({ appStoreId: id, productId: 'com.example.' + id, reviewScreenshot: 'shop.png' });
const image = (state, extra = {}, id = 'shot-one') => ({ type: TYPE, id, attributes: {
  fileName: 'shop.png', fileSize: bytes.length, assetDeliveryState: { state }, sourceFileChecksum: checksum, ...extra,
} });

// All API traffic and uploads are injected; these tests need no signing keys, tokens or account access.
function fixture(options = {}) {
  const rows = options.rows || [row()];
  const state = { events: [], reports: [], images: { ...(options.images || {}) }, posts: 0 };
  const products = options.products || ['one', 'two'].map(id => ({ type: 'inAppPurchases', id, attributes: { productId: 'com.example.' + id } }));
  const request = async (path, method = 'GET', payload) => {
    state.events.push({ path, method, payload });
    if (method === 'GET') {
      if (path === '/v1/apps/app') return { data: { type: 'apps', id: 'app', attributes: { bundleId: options.bundleId || ios.bundleId } } };
      if (path === '/v1/apps/app/inAppPurchasesV2?limit=200') {
        return { data: products.slice(0, 1), links: { next: 'https://api.appstoreconnect.apple.com/v1/apps/app/inAppPurchasesV2?cursor=page2' } };
      }
      if (path === '/v1/apps/app/inAppPurchasesV2?cursor=page2') return { data: products.slice(1), links: {} };
      const product = /^\/v2\/inAppPurchases\/([^/]+)\/appStoreReviewScreenshot$/.exec(path)?.[1];
      if (product) {
        if (options.absent404 && !state.images[product]) throw new Error('GET ' + path + ' -> 404 []');
        return { data: state.images[product] || null };
      }
      if (path.startsWith('/v1/' + TYPE + '/')) {
        const found = Object.values(state.images).find(item => item.id === path.split('/').at(-1));
        return { data: options.readback ? options.readback(found) : found };
      }
    }
    if (method === 'POST' && path === '/v1/' + TYPE) {
      state.posts += 1;
      const product = payload.data.relationships.inAppPurchaseV2.data.id;
      const reserved = image('AWAITING_UPLOAD', { sourceFileChecksum: null, uploadOperations: [
        { method: 'PUT', url: 'https://upload.example.invalid/secret-signed-url', offset: 0, length: bytes.length,
          requestHeaders: [{ name: 'X-Fixture', value: 'upload-only' }] },
      ] }, 'shot-' + product);
      state.images[product] = reserved;
      if (options.lostReservation) throw new Error('lost reservation https://upload.example.invalid/secret-signed-url');
      return { data: reserved };
    }
    if (method === 'PATCH' && path.startsWith('/v1/' + TYPE + '/')) {
      const found = Object.values(state.images).find(item => item.id === payload.data.id);
      assert.ok(found);
      found.attributes.sourceFileChecksum = payload.data.attributes.sourceFileChecksum;
      found.attributes.assetDeliveryState = { state: options.afterState || 'UPLOAD_COMPLETE' };
      if (options.lostCommit) throw new Error('lost commit with private upload response');
      return { data: found };
    }
    throw new Error('Unexpected request ' + method + ' ' + path);
  };
  const upload = (operations, body, label) => uploadParts(operations, body, label, async (url, init) => {
    state.events.push({ method: init.method, bytes: Buffer.from(init.body) });
    assert.equal(url, 'https://upload.example.invalid/secret-signed-url');
    assert.deepEqual(init.headers, { 'X-Fixture': 'upload-only' });
    assert.deepEqual(init.body, bytes);
    if (options.lostTransfer) throw new Error('failed signed URL ' + url);
    return { ok: true };
  });
  const args = { config: { root }, ios, store: { inAppPurchases: rows }, request, upload,
    report: (...parts) => state.reports.push(parts.join(' ')) };
  return { state, args, request };
}

test('the actual mutation sequence reserves against the parent, transfers bytes, commits MD5 and reads processing state', async () => {
  const { state, args } = fixture({ rows: [row('two')], absent404: true });
  const result = await iapReviewScreenshots(args);
  assert.equal(result[0].action, 'pending');
  assert.equal(result[0].state, 'UPLOAD_COMPLETE');
  assert.equal(result[0].checksum, checksum);
  const writes = state.events.filter(event => event.method !== 'GET');
  assert.deepEqual(writes.map(event => event.method), ['POST', 'PUT', 'PATCH']);
  assert.deepEqual(writes[0].payload, { data: { type: TYPE, attributes: { fileName: 'shop.png', fileSize: bytes.length },
    relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: 'two' } } } } });
  assert.deepEqual(writes[2].payload, { data: { type: TYPE, id: 'shot-two', attributes: { uploaded: true, sourceFileChecksum: checksum } } });
  assert.equal(state.events.at(-1).path, '/v1/' + TYPE + '/shot-two');
  assert.ok(state.events.findIndex(event => event.path?.includes('cursor=page2')) < state.events.findIndex(event => event.method === 'POST'));
  assert.doesNotMatch(state.reports.join('\n'), /secret-signed-url|upload\.example|\bCOMPLETE\b/);
});

test('a matching COMPLETE screenshot is kept without any write or transfer, regardless of its filename', async () => {
  const { state, args } = fixture({ images: { one: image('COMPLETE', { fileName: 'earlier-native-capture.png' }) } });
  const [result] = await iapReviewScreenshots(args);
  assert.equal(result.action, 'keep'); assert.equal(result.state, 'COMPLETE');
  assert.equal(state.posts, 0); assert.ok(state.events.every(event => event.method === 'GET'));
});

test('all selected products must belong to the exact configured app before any write', async () => {
  const { state, args } = fixture({ rows: [row('one'), row('foreign')] });
  await assert.rejects(iapReviewScreenshots(args), /ownership or identity mismatch/);
  assert.ok(state.events.every(event => event.method === 'GET'));
  assert.equal(state.events.some(event => event.path.startsWith('/v2/')), false);
  const wrongBundle = fixture({ bundleId: 'com.other.app' });
  await assert.rejects(iapReviewScreenshots(wrongBundle.args), /app\/bundle identity mismatch/);
  assert.equal(wrongBundle.state.events.length, 1);
});

test('mismatched product IDs, duplicate configuration and ambiguous server identities all stop before writes', async () => {
  for (const options of [
    { rows: [{ ...row(), productId: 'com.other.product' }] },
    { rows: [row(), row()] },
    { rows: [row(), { ...row('two'), productId: row().productId }] },
    { products: [{ type: 'inAppPurchases', id: 'one', attributes: { productId: row().productId } },
      { type: 'inAppPurchases', id: 'one', attributes: { productId: row().productId } }] },
    { products: [{ type: 'inAppPurchases', id: 'one', attributes: { productId: row().productId } },
      { type: 'inAppPurchases', id: 'foreign', attributes: { productId: row().productId } }] },
  ]) {
    const { state, args } = fixture(options);
    await assert.rejects(iapReviewScreenshots(args), /Duplicate|identity mismatch/);
    assert.ok(state.events.every(event => event.method === 'GET'));
  }
});

test('every source path and required identity is checked before any reservation', async () => {
  for (const rows of [
    [row(), { ...row('two'), reviewScreenshot: 'missing.png' }],
    [{ ...row(), reviewScreenshot: '.' }],
    [{ ...row(), appStoreId: '' }], [{ ...row(), productId: '' }], [{ ...row(), reviewScreenshot: null }],
  ]) {
    const { state, args } = fixture({ rows });
    await assert.rejects(iapReviewScreenshots(args));
    assert.equal(state.events.length, 0);
  }
});

test('a conflicting later screenshot protects every existing image and prevents earlier reservations', async () => {
  for (const extra of [{ sourceFileChecksum: 'f'.repeat(32) }, { sourceFileChecksum: null }]) {
    const { state, args } = fixture({ rows: [row(), row('two')], images: { two: image('COMPLETE', extra, 'shot-two') } });
    await assert.rejects(iapReviewScreenshots(args), /conflict.*preserved.*nothing was uploaded/);
    assert.ok(state.events.every(event => event.method === 'GET'));
    assert.equal(state.images.two.id, 'shot-two');
  }
});

test('processing and unknown same-source reservations are reported pending instead of duplicated', async () => {
  for (const pending of [image('UPLOAD_COMPLETE'), image('AWAITING_UPLOAD', { sourceFileChecksum: null }), image('UNKNOWN', { sourceFileChecksum: null })]) {
    const { state, args } = fixture({ images: { one: pending } });
    const [result] = await iapReviewScreenshots(args);
    assert.equal(result.action, 'pending');
    assert.ok(state.events.every(event => event.method === 'GET'));
  }
});

test('lost reservation responses are never retried and a rerun reads the surviving reservation', async () => {
  const { state, args } = fixture({ lostReservation: true });
  await assert.rejects(iapReviewScreenshots(args), error => /outcome unknown/.test(error.message) && !error.message.includes('secret-signed-url'));
  assert.equal(state.posts, 1);
  const [result] = await iapReviewScreenshots(args);
  assert.equal(result.action, 'pending'); assert.equal(result.state, 'AWAITING_UPLOAD');
  assert.equal(state.posts, 1);
});

test('unknown transfer and commit outcomes preserve the reservation without exposing upload URLs', async () => {
  for (const options of [{ lostTransfer: true }, { lostCommit: true }]) {
    const { state, args } = fixture(options);
    await assert.rejects(iapReviewScreenshots(args), error => /outcome unknown.*preserved/.test(error.message) && !error.message.includes('upload.example'));
    assert.equal(state.posts, 1);
    const [result] = await iapReviewScreenshots(args);
    assert.equal(result.action, 'pending'); assert.equal(state.posts, 1);
  }
});

test('successful uploads are COMPLETE only after the checksum and delivery state read back', async () => {
  const complete = fixture({ afterState: 'COMPLETE' });
  const [result] = await iapReviewScreenshots(complete.args);
  assert.equal(result.action, 'uploaded'); assert.equal(result.state, 'COMPLETE'); assert.equal(result.checksum, checksum);
  for (const options of [
    { readback: found => ({ ...found, attributes: { ...found.attributes, sourceFileChecksum: 'f'.repeat(32) } }) },
    { afterState: 'COMPLETE', readback: found => ({ ...found, attributes: { ...found.attributes, sourceFileChecksum: null } }) },
    { afterState: 'FAILED' },
  ]) {
    const { state, args } = fixture(options);
    await assert.rejects(iapReviewScreenshots(args), /mismatch|FAILED/);
    assert.equal(state.posts, 1); assert.equal(state.events.some(event => event.method === 'DELETE'), false);
  }
});

test('read-only image status shows configured states and no-IAP apps make no new API calls', async () => {
  const { args } = fixture({ images: { one: image('UPLOAD_COMPLETE') } });
  assert.deepEqual(await iapReviewScreenshotStatus(args), [{ productId: row().productId, id: 'shot-one', state: 'UPLOAD_COMPLETE', checksum }]);
  for (const store of [{}, { inAppPurchases: [] }, { inAppPurchases: [{ appStoreId: 'historical', productId: 'historical' }] }]) {
    const input = { store, request: async () => { throw new Error('No IAP read expected'); }, report: () => {} };
    assert.deepEqual(await iapReviewScreenshots(input), []);
    assert.deepEqual(await iapReviewScreenshotStatus(input), []);
  }
});
