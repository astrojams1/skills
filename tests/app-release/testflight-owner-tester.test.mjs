import test from 'node:test';
import assert from 'node:assert/strict';
import * as ios from '../../skills/app-release/scripts/ios-release.mjs';

// The owner is always added to the internal group, even when another tester (an account holder who is someone else)
// is already there (Hanzi Cards on the OURO team, 2026-11-08).
function fixture({ users = [{ id: 'u-owner', attributes: { username: 'astrojams1@gmail.com', firstName: 'A', lastName: 'J', roles: ['ADMIN'] } }],
  existingTester = null, readsBack = true } = {}) {
  const writes = [];
  let members = [{ id: 't-holder', attributes: { email: 'holder@example.com', state: 'INVITED' } }];
  const add = () => { if (readsBack) members = members.concat({ id: 't-owner', attributes: { email: 'astrojams1@gmail.com', state: 'INVITED' } }); };
  const io = {
    ios: { ascAppId: 'app', testflightGroup: 'Release QA', testers: ['astrojams1@gmail.com'] }, version: '1.0.0',
    now: () => 0, deadline: 1, pause: async () => {}, log: () => {},
    api: async (path, method = 'GET', body) => {
      if (method !== 'GET') { writes.push({ path, method, body }); if (path.includes('betaTesters')) add(); return { data: {} }; }
      if (path.startsWith('/v1/builds?')) return { data: [{ id: 'b1', attributes: { version: '1', processingState: 'VALID' } }] };
      if (path.startsWith('/v1/betaGroups?')) return { data: [{ id: 'g0', attributes: { name: 'Release QA', isInternalGroup: true, hasAccessToAllBuilds: true } }] };
      if (path === '/v1/builds/b1/buildBetaDetail') return { data: { attributes: { internalBuildState: 'IN_BETA_TESTING' } } };
      if (path.startsWith('/v1/betaTesters?filter[email]=')) return { data: existingTester ? [existingTester] : [] };
      throw new Error('Unexpected read ' + path);
    },
    listAll: async path => path.endsWith('/betaTesters?limit=200') ? members
      : path.startsWith('/v1/users') ? users : [{ id: 'b1' }]
  };
  return { io, writes };
}

test('the owner is added beside an existing account holder', async () => {
  const f = fixture();
  const result = await ios.testers(1, f.io);
  assert.equal(result.testers, 2);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].path, '/v1/betaTesters');
  assert.equal(f.writes[0].body.data.attributes.email, 'astrojams1@gmail.com');
  assert.deepEqual(f.writes[0].body.data.relationships.betaGroups.data, [{ type: 'betaGroups', id: 'g0' }]);
});

test('an existing beta tester record is linked to the group instead of recreated', async () => {
  const f = fixture({ existingTester: { id: 't-owner' } });
  await ios.testers(1, f.io);
  assert.deepEqual(f.writes, [{ path: '/v1/betaGroups/g0/relationships/betaTesters', method: 'POST',
    body: { data: [{ type: 'betaTesters', id: 't-owner' }] } }]);
});

test('an owner who is not a user of the team fails with the fix', async () => {
  const f = fixture({ users: [] });
  await assert.rejects(() => ios.testers(1, f.io), /not an App Store Connect user of this team.*Users and Access/);
  assert.equal(f.writes.length, 0);
});

test('an add that does not read back fails', async () => {
  const f = fixture({ readsBack: false });
  await assert.rejects(() => ios.testers(1, f.io), /did not read back/);
});
