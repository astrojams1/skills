import test from 'node:test';
import assert from 'node:assert/strict';
import * as ios from '../../skills/app-release/scripts/ios-release.mjs';

function fixture({ otherVersion = null, lateBuild = false, automatic = true, state = 'IN_BETA_TESTING', membership = [true], groups = 1, people = [[{ id: 't1', attributes: { state: 'INVITED' } }]], users = [] } = {}) {
  let clock = 0;
  let membershipRead = 0;
  let testerReads = 0;
  const writes = [];
  const reads = [];
  const io = {
    ios: { ascAppId: 'app', testflightGroup: 'QA' }, version: '1.1.0',
    now: () => clock, deadline: 60000, pause: async () => { clock += 30000; }, log: () => {},
    api: async (path, method = 'GET', body) => {
      if (method !== 'GET') { writes.push({ path, method, body }); testerReads++; return {}; }
      reads.push(path);
      if (path.startsWith('/v1/builds?') && path.includes('include=preReleaseVersion')) return { data: [], included: otherVersion ? [{ type: 'preReleaseVersions', attributes: { version: otherVersion } }] : [] };
      if (path.startsWith('/v1/builds?')) return { data: lateBuild && !clock ? [] : [{ id: 'build191', attributes: { version: '191', processingState: 'VALID' } }] };
      if (path.startsWith('/v1/betaGroups?')) return { data: Array.from({ length: groups }, (_, i) => ({ id: 'group' + i, attributes: { name: 'QA', isInternalGroup: true, hasAccessToAllBuilds: automatic } })) };
      if (path === '/v1/builds/build191/buildBetaDetail') return { data: { attributes: { internalBuildState: typeof state === 'function' ? state(clock) : state } } };
      throw new Error('Unexpected provider read: ' + path);
    },
    listAll: async path => {
      if (path === '/v1/betaGroups/group0/betaTesters?limit=200') return people[Math.min(testerReads, people.length - 1)];
      if (path === '/v1/users?limit=200') return users;
      assert.equal(path, '/v1/betaGroups/group0/builds?limit=200');
      const present = membership[Math.min(membershipRead++, membership.length - 1)];
      return present ? [{ id: 'build191' }] : [{ id: 'older-build' }];
    }
  };
  return { io, writes, reads };
}

test('automatic group access does not hide missing export compliance', async () => {
  const f = fixture({ state: 'MISSING_EXPORT_COMPLIANCE' });
  await assert.rejects(() => ios.testers(191, f.io), /MISSING_EXPORT_COMPLIANCE/);
  assert.equal(f.writes.length, 0);
});

test('automatic group success requires the exact build and a testable internal state', async () => {
  const f = fixture();
  assert.deepEqual(await ios.testers(191, f.io), { build: '191', buildId: 'build191', groupId: 'group0', internalBuildState: 'IN_BETA_TESTING', buildPresent: true, testers: 1 });
  assert.equal(f.writes.length, 0);
  assert.ok(f.reads[0].includes('filter[preReleaseVersion.version]=1.1.0'));
  assert.ok(f.reads[0].includes('filter[preReleaseVersion.platform]=IOS'));
});

test('automatic membership propagation is polled without adding the build manually', async () => {
  const f = fixture({ membership: [false, true] });
  assert.equal((await ios.testers(191, f.io)).buildPresent, true);
  assert.equal(f.io.now(), 30000);
  assert.equal(f.writes.length, 0);
});

test('manual groups retain existing membership and read back a newly added build', async () => {
  const existing = fixture({ automatic: false });
  await ios.testers(191, existing.io);
  assert.equal(existing.writes.length, 0);
  const missing = fixture({ automatic: false, membership: [false, true] });
  await ios.testers(191, missing.io);
  assert.deepEqual(missing.writes, [{ path: '/v1/betaGroups/group0/relationships/builds', method: 'POST', body: { data: [{ type: 'builds', id: 'build191' }] } }]);
});

test('provider acknowledgement alone cannot establish group membership', async () => {
  const f = fixture({ automatic: false, membership: [false] });
  await assert.rejects(() => ios.testers(191, f.io), /not internally testable.*membership.*false/);
  assert.equal(f.writes.length, 1, 'the uncertain add is never repeated');
});

test('processing internal state waits for actual testability', async () => {
  const f = fixture({ state: clock => clock ? 'READY_FOR_BETA_TESTING' : 'PROCESSING' });
  assert.equal((await ios.testers(191, f.io)).internalBuildState, 'READY_FOR_BETA_TESTING');
  assert.equal(f.io.now(), 30000);
});

test('expired builds and ambiguous configured groups fail rather than claiming readiness', async () => {
  await assert.rejects(() => ios.testers(191, fixture({ state: 'EXPIRED' }).io), /EXPIRED/);
  await assert.rejects(() => ios.testers(191, fixture({ groups: 2 }).io), /Expected one internal/);
});

test('an empty group gets the account holder, because a build there reaches nobody', async () => {
  const added = [{ id: 't1', attributes: { state: 'INVITED' } }];
  const holder = { attributes: { username: 'owner@example.com', firstName: 'A', lastName: 'B', roles: ['ACCOUNT_HOLDER', 'ADMIN'] } };
  const other = { attributes: { username: 'support@example.com', roles: ['CUSTOMER_SUPPORT'] } };
  const f = fixture({ people: [[], added], users: [other, holder] });
  assert.equal((await ios.testers(191, f.io)).testers, 1);
  assert.equal(f.writes.length, 1);
  assert.equal(f.writes[0].path, '/v1/betaTesters');
  assert.equal(f.writes[0].body.data.attributes.email, 'owner@example.com');
  assert.deepEqual(f.writes[0].body.data.relationships.betaGroups.data, [{ type: 'betaGroups', id: 'group0' }]);
});

test('a build is not reported as testable when nobody can receive it', async () => {
  await assert.rejects(() => ios.testers(191, fixture({ people: [[]], users: [] }).io), /reaches nobody/);
  const holder = { attributes: { username: 'owner@example.com', roles: ['ACCOUNT_HOLDER'] } };
  await assert.rejects(() => ios.testers(191, fixture({ people: [[]], users: [holder] }).io), /did not read back/);
});

test('a tester who was never invited is invited', async () => {
  const f = fixture({ people: [[{ id: 't2', attributes: { state: 'NOT_INVITED' } }]] });
  await ios.testers(191, f.io);
  assert.equal(f.writes[0].path, '/v1/betaTesterInvitations');
  assert.equal(f.writes[0].body.data.relationships.betaTester.data.id, 't2');
});

test('a build uploaded under another version fails at once instead of waiting for a version that will never appear', async () => {
  const f = fixture({ otherVersion: '1.1.1', lateBuild: true });
  await assert.rejects(() => ios.testers(191, f.io), /Build 191 is version 1\.1\.1 on App Store Connect, but the store data says 1\.1\.0/);
  assert.equal(f.io.now(), 0, 'no wait');
  assert.equal(f.writes.length, 0);
});

test('a build still processing under the right version is waited for', async () => {
  const f = fixture({ lateBuild: true });
  assert.equal((await ios.testers(191, f.io)).buildPresent, true);
  assert.equal(f.io.now(), 30000);
});
