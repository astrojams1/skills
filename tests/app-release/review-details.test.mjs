import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setup, reviewDetails, assertSaved, reviewPhoneOnFile, teamReviewContact } from '../../skills/app-release/scripts/asc.mjs';

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
    const others = options.others || [];
    const other = others.find(app => path === '/v1/apps/' + app.id + '/appStoreVersions');
    let data, included;
    if (path === '/v1/apps/app') data = { id: 'app', attributes: { bundleId: 'com.example.app' } };
    else if (path === '/v1/apps') data = [{ id: 'app', attributes: { name: 'Example' } }, ...others.map(app => ({ id: app.id, attributes: { name: app.name } }))];
    else if (path === '/v1/apps/app/appInfos') data = [];
    else if (path === '/v1/apps/app/appStoreVersions') data = [{ id: 'v1', attributes: { versionString: '1.0' } }];
    else if (path === '/v1/appStoreVersions/v1/appStoreReviewDetail') data = state.attributes ? { id: 'detail', attributes: state.attributes } : null;
    else if (other) {
      // The team's other apps: each version with its App Review contact included.
      data = other.versions.map((version, i) => ({ id: other.id + '-v' + i, attributes: { versionString: version.versionString, createdDate: version.createdDate },
        relationships: { appStoreReviewDetail: { data: { type: 'appStoreReviewDetails', id: other.id + '-d' + i } } } }));
      included = other.versions.map((version, i) => ({ type: 'appStoreReviewDetails', id: other.id + '-d' + i, attributes: version.contact }));
    } else throw Error('Unexpected API read ' + path);
    return { ok: true, text: async () => JSON.stringify(included ? { data, included } : { data }) };
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

test('creation requires a complete explicit contact and a phone from the run or on file for that person', async () => {
  for (const review of [{ notes: 'New notes' }, ...['firstName', 'lastName', 'email'].map(field => ({ ...complete, [field]: undefined }))]) {
    const state = fixture({ noCurrent: true, phone: contact.contactPhone, review });
    await assert.rejects(reviewDetails(), /required|complete/);
    assert.equal(state.writes.length, 0);
  }
  const noPhone = fixture({ noCurrent: true, review: complete });
  await assert.rejects(reviewDetails(), /ASC_REVIEW_PHONE/); assert.equal(noPhone.writes.length, 0);
  assert.equal(noPhone.reads.includes('/v1/apps'), true);
  const created = fixture({ noCurrent: true, review: complete, phone: contact.contactPhone });
  await reviewDetails();
  assert.equal(created.writes[0].method, 'POST');
  assert.deepEqual(created.writes[0].body.data.relationships, { appStoreVersion: { data: { type: 'appStoreVersions', id: 'v1' } } });
  assert.deepEqual(created.attributes, { ...contact, notes: 'Revised notes', demoAccountRequired: false });
});

test('an explicit contact change needs its own phone instead of borrowing the existing persons number', async () => {
  const review = { ...complete, firstName: 'Another', lastName: 'Fixture', email: 'another@example.invalid' };
  // Another app on file holds only the previous person's number: it is not this person's, so nothing is saved.
  const missingPhone = fixture({ review, others: [{ id: 'sibling', name: 'Sibling', versions: [{ versionString: '2.0', createdDate: '2026-01-01T00:00:00Z', contact }] }] });
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

test('without a run phone, a new app reuses the number the team already holds for the same person, and never prints it', async () => {
  const sibling = { id: 'sibling', name: 'Sibling', versions: [
    { versionString: '1.0', createdDate: '2026-01-01T00:00:00Z', contact },
    { versionString: '1.1', createdDate: '2026-03-01T00:00:00Z', contact: { ...contact, contactPhone: '+1 202 555 0111' } },
  ] };
  const stranger = { id: 'stranger', name: 'Stranger', versions: [
    { versionString: '9.0', createdDate: '2026-09-01T00:00:00Z', contact: { contactFirstName: 'Someone', contactLastName: 'Else', contactEmail: 'else@example.invalid', contactPhone: '+1 202 555 0199' } },
  ] };
  const logged = []; const savedLog = console.log; console.log = (...parts) => logged.push(parts.join(' '));
  try {
    const state = fixture({ noCurrent: true, review: complete, others: [stranger, sibling] });
    await reviewDetails();
    assert.equal(state.writes[0].method, 'POST');
    assert.equal(state.attributes.contactPhone, '+1 202 555 0111');
    assert.equal(state.reads.includes('/v1/apps/app/appStoreVersions'), true);
  } finally { console.log = savedLog; }
  assert.equal(logged.some(line => line.includes('Sibling 1.1')), true);
  assert.equal(logged.some(line => /555/.test(line)), false);
});

test('reviewPhoneOnFile prefers the same email, then the same name, then the newest version, and skips other people', () => {
  const person = { contactFirstName: 'Fixture', contactLastName: 'Contact', contactEmail: 'Fixture@Example.invalid' };
  const record = (extra) => ({ contactFirstName: 'Fixture', contactLastName: 'Contact', contactEmail: 'old@example.invalid', contactPhone: '+1 202 555 0100', createdDate: '2026-01-01', ...extra });
  assert.equal(reviewPhoneOnFile(person, []), null);
  assert.equal(reviewPhoneOnFile(person, [{ contactFirstName: 'Someone', contactLastName: 'Else', contactEmail: 'else@example.invalid', contactPhone: '+1 202 555 0199' }]), null);
  assert.equal(reviewPhoneOnFile(person, [record({ contactPhone: '' }), record({ contactPhone: null })]), null);
  const byName = record({ contactPhone: '+1 202 555 0101', createdDate: '2026-09-01' });
  const byEmail = record({ contactEmail: 'fixture@example.invalid', contactPhone: '+1 202 555 0102', createdDate: '2026-02-01' });
  const newerEmail = record({ contactEmail: 'fixture@example.invalid', contactPhone: '+1 202 555 0103', createdDate: '2026-05-01' });
  assert.equal(reviewPhoneOnFile(person, [byName]).contactPhone, '+1 202 555 0101');
  assert.equal(reviewPhoneOnFile(person, [byName, byEmail]).contactPhone, '+1 202 555 0102');
  assert.equal(reviewPhoneOnFile(person, [byName, byEmail, newerEmail]).contactPhone, '+1 202 555 0103');
  assert.equal(reviewPhoneOnFile({ ...person, contactEmail: '' }, [byEmail]).contactPhone, '+1 202 555 0102');
});

test('a new app with no contact named takes the newest complete review contact on the team, name and phone together', async () => {
  const older = { versionString: '1.0', createdDate: '2026-01-01T00:00:00Z', contact: { ...contact, contactPhone: '+1 202 555 0120' } };
  const newer = { versionString: '2.0', createdDate: '2026-06-01T00:00:00Z', contact: { contactFirstName: 'Team', contactLastName: 'Contact', contactEmail: 'team@example.invalid', contactPhone: '+1 202 555 0121' } };
  const incomplete = { versionString: '3.0', createdDate: '2026-09-01T00:00:00Z', contact: { contactFirstName: 'No', contactLastName: 'Phone', contactEmail: 'nophone@example.invalid', contactPhone: null } };
  const logged = []; const savedLog = console.log; console.log = (...parts) => logged.push(parts.join(' '));
  try {
    const state = fixture({ noCurrent: true, review: { notes: 'New notes', demoAccountRequired: false }, others: [{ id: 'sibling', name: 'Sibling', versions: [older, newer, incomplete] }] });
    await reviewDetails();
    assert.deepEqual(state.attributes, { ...newer.contact, notes: 'New notes', demoAccountRequired: false });
  } finally { console.log = savedLog; }
  assert.equal(logged.some(line => line.includes('Sibling 2.0')), true);
  assert.equal(logged.some(line => /555|team@/.test(line)), false);
  // Nothing on file: still stopped before saving, with the instruction to supply the contact.
  const none = fixture({ noCurrent: true, review: { notes: 'New notes' } });
  await assert.rejects(reviewDetails(), /required|complete/); assert.equal(none.writes.length, 0);
  assert.equal(teamReviewContact([incomplete.contact]), null);
});
