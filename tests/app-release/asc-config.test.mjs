import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = fileURLToPath(new URL('../../skills/app-release/scripts/', import.meta.url));

// Exercise the real CLI in a fresh process for each config. Synthetic credentials and a fetch
// preload prevent any account access; the receipt proves which reads or writes actually ran.
function run(script, args, ios = {}, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'asc-config-'));
  try {
    const keyFile = join(root, 'synthetic.p8');
    writeFileSync(keyFile, generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    const config = { app: 'Example', slug: 'example', ledger: { gates: 'ledger.json', view: 'ledger.md' },
      storeData: options.noStore ? undefined : 'store.json', ios: { ascAppId: 'app', bundleId: 'com.example.app', ...ios } };
    writeFileSync(join(root, 'app-release.config.json'), JSON.stringify(config));
    writeFileSync(join(root, 'store.json'), JSON.stringify({ version: '1.0', listing: { locale: 'en-US' } }));
    const receipt = join(root, 'requests.json');
    writeFileSync(receipt, '[]');
    const preload = join(root, 'mock-api.mjs');
    writeFileSync(preload, `import { readFileSync, writeFileSync } from 'node:fs';
globalThis.fetch = async (url, request) => {
  const receipt = ${JSON.stringify(receipt)};
  const requests = JSON.parse(readFileSync(receipt, 'utf8'));
  const path = new URL(url).pathname;
  requests.push({ path, method: request.method });
  writeFileSync(receipt, JSON.stringify(requests));
  if (request.method !== 'GET') throw Error('Unexpected API mutation');
  if (${Boolean(options.denied)}) return { ok: false, status: 403, text: async () => JSON.stringify({ errors: [{ code: 'FORBIDDEN' }] }) };
  const data = path === '/v1/apps/app' ? { id: 'app', attributes: { name: 'Example', bundleId: 'com.example.app' } } : [];
  return { ok: true, text: async () => JSON.stringify({ data }) };
};`);
    const result = spawnSync(process.execPath, ['--import', preload, join(scripts, script), ...args], {
      cwd: root, encoding: 'utf8', env: { ...process.env, APP_RELEASE_CONFIG: join(root, 'app-release.config.json'),
        ASC_KEY_ID: 'synthetic-key', ASC_ISSUER_ID: 'synthetic-issuer', ASC_PRIVATE_KEY_PATH: keyFile }
    });
    assert.ifError(result.error);
    return { ...result, requests: JSON.parse(readFileSync(receipt, 'utf8')) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('ASC status reads Apple with signing fields absent or deliberately unverified', () => {
  for (const ios of [{}, { teamId: '', scheme: '', buildNumberEnv: '' }]) {
    const result = run('asc.mjs', ['status'], ios);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /App Example com\.example\.app id app/);
    assert.deepEqual(result.requests.map(item => item.path), ['/v1/apps/app', '/v1/apps/app/appStoreVersions', '/v1/builds', '/v1/apps/app/reviewSubmissions']);
    assert.ok(result.requests.every(item => item.method === 'GET'));
  }
});

test('ASC status exposes a provider denial instead of masking it with a signing error', () => {
  const result = run('asc.mjs', ['status'], { teamId: '' }, { denied: true });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GET \/v1\/apps\/app -> 403/);
  assert.deepEqual(result.requests, [{ path: '/v1/apps/app', method: 'GET' }]);
});

test('ASC still requires its identity, vault, platform and store data before any API call', () => {
  for (const field of ['ascAppId', 'bundleId', 'vault', 'platform']) {
    for (const value of ['', null]) {
      const result = run('asc.mjs', ['status'], { [field]: value });
      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp('ios section lacks ' + field));
      assert.deepEqual(result.requests, []);
    }
  }
  const noStore = run('asc.mjs', ['status'], {}, { noStore: true });
  assert.equal(noStore.status, 1);
  assert.match(noStore.stderr, /names no storeData file/);
  assert.deepEqual(noStore.requests, []);
});

test('iOS archive still refuses every absent or blank signing setting before external work', () => {
  const signing = { teamId: 'synthetic-team', scheme: 'Example', buildNumberEnv: 'BUILD' };
  for (const field of Object.keys(signing)) {
    for (const value of [undefined, '', null]) {
      const result = run('ios-release.mjs', ['archive', '--build-number', '1'], { ...signing, [field]: value });
      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp('ios section lacks ' + field));
      assert.deepEqual(result.requests, []);
    }
  }
});
