import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setup, reviewDetails, assertSaved } from '../../skills/app-release/scripts/asc.mjs';

const root = mkdtempSync(join(tmpdir(), 'review-details-'));
const keyFile = join(root, 'synthetic.p8');
writeFileSync(keyFile, generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
const savedEnv = { ...process.env }; const savedFetch = globalThis.fetch;
process.env.ASC_KEY_ID = 'synthetic-key'; process.env.ASC_ISSUER_ID = 'synthetic-issuer'; process.env.ASC_PRIVATE_KEY_PATH = keyFile;
writeFileSync(join(root, 'app-release.config.json'), JSON.stringify({ app: 'Example', slug: 'example', ledger: { gates: 'ledger.json', view: 'ledger.md' }, storeData: 'store.json',
  ios: { ascAppId: 'app', bundleId: 'com.example.app', teamId: 'synthetic-team', scheme: 'Example', buildNumberEnv: 'BUILD' } }));
test.after(() => { globalThis.fetch = savedFetch; process.env = savedEnv; rmSync(root, { recursive: true, force: true }); });

// Invented fixture contact only. Tests never access the owner's account or credentials.
const contact = { contactFirstName: 'Fixture', contactLastName: 'Contact', contactEmail: 'fixture@example.invalid', contactPhone: '+1 202 555 0100' };
const complete = { firstName: contact.contactFirstName, lastName: contact.contactLastName, email: contact.contactEmail, notes: 'Revised notes', demoAccountRequired: false };
function fixture(options = {}) {
  delete process.env.ASC_REVIEW_PHONE;
  if (Object.hasOwn(options, 'phone')) process.env.ASC_REVIEW_PHONE = options.phone;
  writeFileSync(join(root, 'store.json'), JSON.stringify({ version: '1.0', listing: { locale: 'en-US' }, review: options.review || { notes: 'Revised notes', demoAccountRequired: false } }));
  setup(root);
  const state = { reads: [], writes: [], attributes: options.noCurrent ? null : { ...contact, notes: 'Old notes', demoAccountRequired: true, demoAccountName: 'fixture-demo', demoAccountPassword: 'fixture-password', ...(options.current || {}) } };
  globalThis.fetch = async (url, request) => {
    const path = new URL(url).pathname; const method = request.method || 'GET';
    if (method !== 'GET') {
      const body = JSON.parse(request.body); state.writes.push({ path, method, body });
      assert.equal(path, state.attributes ? '/v1/appStoreReviewDetails/detail' : '/v1/appStoreReviewDetails');
      state.attributes = { ...(state.attributes || {}), ...body.data.attributes };
      if (options.lostWriteResponse) throw Error('connection lost after save');
      return { ok: true, text: async () => JSON.stringify({ data: { id: 'detail', attributes: { ...state.attributes, ...(options.echo || {}) } } }) };
    }
    state.reads.push(path);
    let data;
    if (path === '/v1/apps/app') data = { id: 'app', attributes: { bundleId: 'com.example.app' } };
    else if (path === '/v1/apps/app/appInfos') data = [];
    else if (path === '/v1/apps/app/appStoreVersions') data = [{ id: 'v1', attributes: { versionString: '1.0' } }];
    else if (path === '/v1/appStoreVersions/v1/appStoreReviewDetail') data = state.attributes ? { id: 'detail', attributes: state.attributes } : null;
    else throw Error('Unexpected API read; unrelated app/contact lookup is forbidden');
    return { ok: true, text: async () => JSON.stringify({ data }) };
  };
  return state;
}

test('notes-only review updates preserve the current same-app contact and pass echoed readback', async () => {
  const state = fixture();
  await reviewDetails();
  assert.equal(state.writes.length, 1);
  assert.deepEqual(state.writes[0].body.data.attributes, { ...contact, notes: 'Revised notes', demoAccountRequired: false });
  assert.equal(state.attributes.demoAccountName, 'fixture-demo');
  assert.equal(state.attributes.demoAccountPassword, 'fixture-password');
  assert.equal(state.reads.includes('/v1/apps'), false);
});

test('omitted review notes and demo requirement retain their existing values', async () => {
  const state = fixture({ review: {} });
  await reviewDetails();
  assert.equal(state.writes[0].body.data.attributes.demoAccountRequired, true);
  assert.equal(state.writes[0].body.data.attributes.notes, 'Old notes');
});

test('creation requires a complete explicit contact and never searches unrelated apps', async () => {
  for (const review of [{ notes: 'New notes' }, ...['firstName', 'lastName', 'email'].map(field => ({ ...complete, [field]: undefined }))]) {
    const state = fixture({ noCurrent: true, phone: contact.contactPhone, review });
    await assert.rejects(reviewDetails(), /required|complete/);
    assert.equal(state.writes.length, 0);
  }
  const noPhone = fixture({ noCurrent: true, review: complete });
  await assert.rejects(reviewDetails(), /ASC_REVIEW_PHONE/); assert.equal(noPhone.writes.length, 0);
  const created = fixture({ noCurrent: true, review: complete, phone: contact.contactPhone });
  await reviewDetails();
  assert.equal(created.writes[0].method, 'POST');
  assert.deepEqual(created.writes[0].body.data.relationships, { appStoreVersion: { data: { type: 'appStoreVersions', id: 'v1' } } });
  assert.deepEqual(created.attributes, { ...contact, notes: 'Revised notes', demoAccountRequired: false });
});

test('an explicit contact change needs its own phone instead of borrowing the existing persons number', async () => {
  const review = { ...complete, firstName: 'Another', lastName: 'Fixture', email: 'another@example.invalid' };
  const missingPhone = fixture({ review });
  await assert.rejects(reviewDetails(), /ASC_REVIEW_PHONE/); assert.equal(missingPhone.writes.length, 0);
  const changed = fixture({ review, phone: '+1 202 555 0199' }); await reviewDetails();
  assert.equal(changed.attributes.contactFirstName, review.firstName);
  assert.equal(changed.attributes.contactPhone, '+1 202 555 0199');
});

test('blank identity overrides, incomplete current contacts and invalid demo requirements stop before mutation', async () => {
  for (const options of [
    { review: { notes: 'New', firstName: '' } }, { review: { notes: 'New', email: null } },
    { current: { contactEmail: null } }, { phone: '' }, { review: { demoAccountRequired: 'false' } },
  ]) {
    const state = fixture(options);
    await assert.rejects(reviewDetails(), /required|complete|boolean|ASC_REVIEW_PHONE/);
    assert.equal(state.writes.length, 0);
  }
});

test('private contact values stay hidden in readback errors', async () => {
  for (const field of Object.keys(contact)) {
    assert.throws(() => assertSaved('Review details', { [field]: 'expected' }, { [field]: contact[field] }), error => {
      assert.equal(error.message.includes(contact[field]), false); return error.message.includes('<hidden>');
    });
  }
  const state = fixture({ echo: { contactFirstName: 'Unexpected synthetic contact' } });
  await assert.rejects(reviewDetails(), error => !error.message.includes('Unexpected synthetic contact') && /contactFirstName: <hidden>/.test(error.message));
  assert.equal(state.writes.length, 1);
});

test('a lost save response is never retried automatically', async () => {
  const state = fixture({ lostWriteResponse: true });
  await assert.rejects(reviewDetails(), /connection lost after save/);
  assert.equal(state.writes.length, 1); assert.equal(state.attributes.notes, 'Revised notes');
});
