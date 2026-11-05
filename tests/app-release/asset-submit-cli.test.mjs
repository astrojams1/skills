// The real CLI reads a query-sensitive Apple fixture. Synthetic keys only; no provider access.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../skills/app-release/scripts/asc.mjs', import.meta.url));
const hash = text => createHash('sha256').update(text).digest('hex').slice(0, 12);

function run(options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'asset-submit-cli-'));
  try {
    const keyFile = join(root, 'synthetic.p8');
    writeFileSync(keyFile, generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example',
      ledger: { gates: 'ledger.json', view: 'ledger.md' }, storeData: 'store.json',
      ios: { ascAppId: 'app', bundleId: 'com.example.app' } }));
    writeFileSync(join(root, 'header.png'), 'synthetic-header');
    writeFileSync(join(root, 'search.png'), 'synthetic-search');
    writeFileSync(join(root, 'store.json'), JSON.stringify({ version: '1.0', listing: { locale: 'en-US' }, assetLibrary: [
      { file: 'header.png', category: 'CREATIVE_ASSETS', placementType: 'PRODUCT_PAGE_HEADER_ASSET', placementGroup: 'DEFAULT_PROFILE', cropChecked: hash('synthetic-header') },
      { file: 'search.png', category: 'CREATIVE_ASSETS', placementType: 'APP_STORE_SEARCH_RESULTS_ASSET', placementGroup: 'DEFAULT_PROFILE', cropChecked: options.uncheckedCrop ? undefined : hash('synthetic-search') },
    ] }));
    const receipt = join(root, 'receipt.json');
    writeFileSync(receipt, JSON.stringify({ events: [], items: [], created: false }));
    const preload = join(root, 'mock-api.mjs');
    writeFileSync(preload, `import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const options = ${JSON.stringify(options)};
const state = { events: [], items: [], status: 'READY_FOR_REVIEW', created: false };
const image = id => ({ type: 'reviewSubmissionItems', id: id + '-item', attributes: { state: 'READY_FOR_REVIEW' },
  relationships: { appAssetLibraryImage: { data: { type: 'appAssetLibraryImages', id } } } });
const reply = body => ({ ok: true, text: async () => JSON.stringify(body) });
globalThis.fetch = async (url, request) => {
  const u = new URL(url), path = u.pathname, method = (request && request.method) || 'GET';
  if (u.origin === 'https://cdn.example') {
    state.events.push({ path, query: '', method });
    writeFileSync(${JSON.stringify(receipt)}, JSON.stringify(state));
    return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('jpeg-bytes').buffer };
  }
  if (u.origin !== 'https://api.appstoreconnect.apple.com') throw Error('Unexpected origin');
  state.events.push({ path, query: u.search, method });
  writeFileSync(${JSON.stringify(receipt)}, JSON.stringify(state));
  let data;
  if (method === 'GET' && path === '/v1/apps/app/assetLibrary') data = { id: 'library' };
  else if (method === 'GET' && path === '/v1/appAssetLibraries/library/videos') data = [];
  else if (method === 'GET' && path === '/v1/appAssetLibraries/library/images') data = ['header', 'search'].map(id => ({ id,
    attributes: { referenceName: id + '.png@' + createHash('sha256').update('synthetic-' + id).digest('hex').slice(0, 12),
      imageAsset: { templateUrl: 'https://cdn.example/' + id + '/{w}x{h}bb.{f}', width: 5244, height: 2950 },
      state: id === 'search' ? options.searchState || 'PREPARE_FOR_SUBMISSION' : 'PREPARE_FOR_SUBMISSION' } }));
  else if (method === 'GET' && path === '/v1/apps/app/appStoreVersions') data = [{ id: 'version',
    attributes: { appVersionState: options.versionState || 'READY_FOR_DISTRIBUTION' } }];
  else if (method === 'GET' && path === '/v1/apps/app/reviewSubmissions') data = [];
  else if (method === 'POST' && path === '/v1/reviewSubmissions') {
    state.created = true; data = { id: 'draft', attributes: { state: state.status } };
  } else if (method === 'GET' && path === '/v1/reviewSubmissions/draft/items') {
    // Live Apple readback only exposed included relationships despite all sparse fields being requested.
    const includes = (u.searchParams.get('include') || '').split(',');
    const fields = (u.searchParams.get('fields[reviewSubmissionItems]') || '').split(',');
    data = state.items.map(item => ({ ...item, relationships: Object.fromEntries(includes
      .filter(name => fields.includes(name)).map(name => [name, item.relationships[name] || { data: null }])) }));
  } else if (method === 'POST' && path === '/v1/reviewSubmissionItems') {
    const links = JSON.parse(request.body).data.relationships;
    data = image(links.appAssetLibraryImage.data.id); state.items.push(data);
  } else if (method === 'GET' && path === '/v1/reviewSubmissions/draft') data = { id: 'draft', attributes: { state: state.status } };
  else if (method === 'PATCH' && path === '/v1/reviewSubmissions/draft') {
    state.status = 'WAITING_FOR_REVIEW'; data = { id: 'draft', attributes: { state: state.status } };
  } else throw Error('Unexpected transport: ' + method + ' ' + path);
  writeFileSync(${JSON.stringify(receipt)}, JSON.stringify(state));
  return reply({ data });
};`);
    const args = options.crops ? ['assets', 'crops', join(root, 'crops')] : ['assets', 'submit', '--confirm'];
    const result = spawnSync(process.execPath, ['--import', preload, script, ...args], {
      cwd: root, encoding: 'utf8', env: { ...process.env, APP_RELEASE_CONFIG: join(root, 'app-release.config.json'),
        ASC_KEY_ID: 'synthetic-key', ASC_ISSUER_ID: 'synthetic-issuer', ASC_PRIVATE_KEY_PATH: keyFile },
    });
    assert.ifError(result.error);
    const saved = result.stdout.split('\n').filter(line => line.endsWith('.jpg'));
    return { ...result, saved: saved.filter(existsSync).map(file => file.slice(file.lastIndexOf('/') + 1)), state: JSON.parse(readFileSync(receipt, 'utf8')) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('assets submit roundtrips actual include/fields through attachment readback and final exact-set verification', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.state.status, 'WAITING_FOR_REVIEW');
  assert.deepEqual(result.state.items.map(item => item.relationships.appAssetLibraryImage.data.id), ['header', 'search']);
  assert.equal(result.state.events.filter(event => event.method === 'POST' && event.path === '/v1/reviewSubmissionItems').length, 2);
  const queries = result.state.events.filter(event => event.path.endsWith('/items'));
  assert.ok(queries.length >= 5, 'attachments and final set independently read back');
  for (const event of queries) assert.ok(new URLSearchParams(event.query).get('include').split(',').includes('appAssetLibraryImage'));
});

test('assets submit refuses a first version waiting for review before creating any draft or attachment', () => {
  const result = run({ versionState: 'WAITING_FOR_REVIEW' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /approved iOS version/);
  assert.equal(result.state.created, false);
  assert.ok(result.state.events.every(event => event.method === 'GET'));
});

test('assets submit waits for all selected new images instead of attaching a ready subset', () => {
  for (const searchState of ['UPLOAD_COMPLETE', 'AWAITING_UPLOAD', 'FAILED', 'REJECTED']) {
    const result = run({ searchState });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not ready.*search|search.*not ready/);
    assert.equal(result.state.created, false);
    assert.ok(result.state.events.every(event => event.method === 'GET'));
  }
});

test('assets submit refuses a creative whose crops nobody has looked at, before touching Apple', () => {
  const result = run({ uncheckedCrop: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Crops not checked: search\.png@[0-9a-f]{12}/);
  assert.deepEqual(result.state.events, []);
});

test('assets crops saves Apple\'s render of each creative for every slot a universal image can fill', () => {
  const result = run({ crops: true, uncheckedCrop: true });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.saved.length, 4);
  assert.ok(result.saved.includes('search.png-' + hash('synthetic-search') + '-search-3x2.jpg'));
  assert.ok(result.state.events.some(event => event.path === '/search/1200x800UAS.ApGCL01.jpg'));
  assert.match(result.stdout, /set cropChecked to "[0-9a-f]{12}"/);
});
