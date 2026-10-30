import test from 'node:test';
import assert from 'node:assert/strict';
import * as ios from '../../skills/app-release/scripts/ios-release.mjs';

// A new app has no TestFlight groups; testers creates the configured internal group and reads it back.
function fixture({ createdGroups = 1, otherInternal = 0 } = {}) {
  const writes = [];
  let groupReads = 0;
  const io = {
    ios: { ascAppId: 'app', testflightGroup: 'Release QA' }, version: '1.0.0',
    now: () => 0, deadline: 1, pause: async () => {}, log: () => {},
    api: async (path, method = 'GET', body) => {
      if (method !== 'GET') { writes.push({ path, method, body }); return { data: { id: 'new-group' } }; }
      if (path.startsWith('/v1/builds?')) return { data: [{ id: 'b1', attributes: { version: '1', processingState: 'VALID' } }] };
      if (path.includes('filter[isInternalGroup]=true')) return { data: Array.from({ length: otherInternal }, (_, i) => ({ id: 'other' + i, attributes: { name: 'Team', isInternalGroup: true } })) };
      if (path.startsWith('/v1/betaGroups?')) {
        const count = groupReads++ === 0 ? 0 : createdGroups;
        return { data: Array.from({ length: count }, (_, i) => ({ id: 'g' + i, attributes: { name: 'Release QA', isInternalGroup: true, hasAccessToAllBuilds: false } })) };
      }
      if (path === '/v1/builds/b1/buildBetaDetail') return { data: { attributes: { internalBuildState: 'READY_FOR_BETA_TESTING' } } };
      throw new Error('Unexpected read ' + path);
    },
    listAll: async () => (writes.some(w => w.path.endsWith('/relationships/builds')) ? [{ id: 'b1' }] : [])
  };
  return { io, writes };
}

test('a missing internal group is created for the app, read back, and receives the build', async () => {
  const f = fixture();
  const result = await ios.testers(1, f.io);
  assert.equal(result.groupId, 'g0');
  assert.deepEqual(f.writes[0], { path: '/v1/betaGroups', method: 'POST', body: { data: { type: 'betaGroups',
    attributes: { name: 'Release QA', isInternalGroup: true, hasAccessToAllBuilds: false },
    relationships: { app: { data: { type: 'apps', id: 'app' } } } } } });
  assert.equal(f.writes[1].path, '/v1/betaGroups/g0/relationships/builds');
});

test('a creation that cannot be read back stops before adding the build', async () => {
  const f = fixture({ createdGroups: 0 });
  await assert.rejects(() => ios.testers(1, f.io), /Expected one internal TestFlight group named Release QA, found 0/);
  assert.equal(f.writes.length, 1, 'the uncertain create is never repeated');
});

test('an app that already has other internal groups never gains a new one from a mistyped name', async () => {
  const f = fixture({ otherInternal: 1 });
  await assert.rejects(() => ios.testers(1, f.io), /Expected one internal TestFlight group named Release QA, found 0/);
  assert.equal(f.writes.length, 0);
});
