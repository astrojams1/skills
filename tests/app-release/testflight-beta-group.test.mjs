import test from 'node:test';
import assert from 'node:assert/strict';
import * as ios from '../../skills/app-release/scripts/ios-release.mjs';

// beta-group puts one build in front of a named TestFlight group: What to Test, membership and, for an external
// group, Beta App Review, each read back. A fake App Store Connect keeps every call in memory; nothing reaches Apple.
function fixture({ internal = false, automatic = false, notes = null, state = 'READY_FOR_BETA_SUBMISSION', submissions = [],
  groups = 1, membershipSticks = true, notesStick = true, submissionSticks = true, processing = 'VALID', refuse = null,
  train = [] } = {}) {
  let clock = 0;
  const writes = [];
  const live = { notes, inGroup: false, submissions: [...submissions], state };
  const io = {
    ios: { ascAppId: 'app', testflightGroup: 'Release QA' }, version: '1.1', locale: 'en-US',
    now: () => clock, deadline: 60000, pause: async () => { clock += 30000; }, log: () => {},
    api: async (path, method = 'GET', body) => {
      if (method !== 'GET') {
        writes.push({ path, method, body });
        if (path.startsWith('/v1/betaBuildLocalizations') && notesStick) live.notes = { id: 'loc1', text: body.data.attributes.whatsNew };
        if (path === '/v1/betaGroups/g0/relationships/builds' && membershipSticks) live.inGroup = true;
        if (path === '/v1/betaAppReviewSubmissions' && refuse) throw new Error('POST ' + path + ' -> 422 ' + JSON.stringify([{ code: refuse }]));
        if (path === '/v1/betaAppReviewSubmissions' && submissionSticks) {
          live.submissions.push({ id: 's1', attributes: { betaReviewState: 'WAITING_FOR_REVIEW' } });
          live.state = 'WAITING_FOR_BETA_REVIEW';
        }
        return { data: {} };
      }
      if (path.startsWith('/v1/builds?')) return { data: [{ id: 'b10', attributes: { version: '10', processingState: processing } }] };
      if (path.startsWith('/v1/betaGroups?')) return { data: Array.from({ length: groups }, (_, i) => ({ id: 'g' + i,
        attributes: { name: 'Early reviewers', isInternalGroup: internal, hasAccessToAllBuilds: automatic, publicLinkEnabled: false } })) };
      if (path === '/v1/builds/b10/buildBetaDetail') return { data: { attributes: { internalBuildState: 'IN_BETA_TESTING',
        externalBuildState: typeof live.state === 'function' ? live.state(clock) : live.state } } };
      if (path === '/v1/betaAppReviewSubmissions?filter[build]=b10') return { data: live.submissions };
      const other = train.find(item => path === '/v1/builds/' + item.id + '/buildBetaDetail');
      if (other) return { data: { attributes: { internalBuildState: 'IN_BETA_TESTING', externalBuildState: other.state } } };
      throw new Error('Unexpected provider read: ' + path);
    },
    listAll: async path => {
      if (path === '/v1/builds/b10/betaBuildLocalizations?limit=200') {
        return live.notes ? [{ id: live.notes.id, attributes: { locale: 'en-US', whatsNew: live.notes.text } }] : [];
      }
      if (path === '/v1/betaGroups/g0/builds?limit=200') return live.inGroup || automatic ? [{ id: 'b10' }] : [{ id: 'b9' }];
      if (path === '/v1/betaGroups/g0/betaTesters?limit=200') return [{ id: 't1' }, { id: 't2' }];
      if (path === '/v1/builds?filter[app]=app&filter[preReleaseVersion.version]=1.1&filter[preReleaseVersion.platform]=IOS&fields[builds]=version&limit=200') {
        return [{ id: 'b10', attributes: { version: '10' } }, ...train.map(item => ({ id: item.id, attributes: { version: item.version } }))];
      }
      throw new Error('Unexpected provider list: ' + path);
    }
  };
  return { io, writes, live };
}

const NOTES = 'Try the new word lists.\r\nThen open a plan link.\n\n';

test('an external group gets What to Test, the build and a Beta App Review submission, each read back', async () => {
  const f = fixture();
  const result = await ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, f.io);
  assert.deepEqual(f.writes.map(w => w.method + ' ' + w.path), ['POST /v1/betaBuildLocalizations',
    'POST /v1/betaGroups/g0/relationships/builds', 'POST /v1/betaAppReviewSubmissions']);
  assert.deepEqual(f.writes[0].body.data.attributes, { locale: 'en-US', whatsNew: 'Try the new word lists.\nThen open a plan link.' });
  assert.deepEqual(f.writes[0].body.data.relationships.build.data, { type: 'builds', id: 'b10' });
  assert.deepEqual(f.writes[2].body.data.relationships.build.data, { type: 'builds', id: 'b10' });
  assert.equal(result.external, true);
  assert.equal(result.whatToTest, 'set');
  assert.equal(result.buildPresent, true);
  assert.equal(result.submitted, true);
  assert.equal(result.betaReviewState, 'WAITING_FOR_REVIEW');
  assert.equal(result.externalBuildState, 'WAITING_FOR_BETA_REVIEW');
  assert.equal(result.testers, 2);
  assert.equal(result.queuedBehind, null);
});

test('existing What to Test is patched only when it differs', async () => {
  const same = fixture({ notes: { id: 'loc9', text: 'Try the new word lists.\nThen open a plan link.' } });
  assert.equal((await ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, same.io)).whatToTest, 'unchanged');
  assert.ok(!same.writes.some(w => w.path.startsWith('/v1/betaBuildLocalizations')));
  const older = fixture({ notes: { id: 'loc9', text: 'Old notes' } });
  await ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, older.io);
  assert.deepEqual(older.writes[0], { path: '/v1/betaBuildLocalizations/loc9', method: 'PATCH',
    body: { data: { type: 'betaBuildLocalizations', id: 'loc9', attributes: { whatsNew: 'Try the new word lists.\nThen open a plan link.' } } } });
});

test('What to Test that does not read back stops before the build is added', async () => {
  const f = fixture({ notesStick: false });
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, f.io), /did not read back as written/);
  assert.equal(f.writes.length, 1);
});

test('an external group refuses a build with no What to Test', async () => {
  const f = fixture();
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, f.io), /Beta App Review needs it/);
  assert.equal(f.writes.length, 0);
});

test('a build already in review, approved or submitted is not submitted again', async () => {
  for (const state of ['WAITING_FOR_BETA_REVIEW', 'IN_BETA_REVIEW', 'BETA_APPROVED', 'IN_BETA_TESTING']) {
    const f = fixture({ state, notes: { id: 'loc1', text: 'Notes' } });
    const result = await ios.betaGroup(10, { group: 'Early reviewers' }, f.io);
    assert.equal(result.submitted, false, state);
    assert.ok(!f.writes.some(w => w.path === '/v1/betaAppReviewSubmissions'), state);
  }
  const earlier = fixture({ notes: { id: 'loc1', text: 'Notes' }, submissions: [{ id: 's0', attributes: { betaReviewState: 'IN_REVIEW' } }] });
  const result = await ios.betaGroup(10, { group: 'Early reviewers' }, earlier.io);
  assert.equal(result.submitted, false);
  assert.equal(result.betaReviewState, 'IN_REVIEW');
});

test('a build already in the group is not added twice', async () => {
  const f = fixture({ notes: { id: 'loc1', text: 'Notes' } });
  f.live.inGroup = true;
  await ios.betaGroup(10, { group: 'Early reviewers' }, f.io);
  assert.ok(!f.writes.some(w => w.path.endsWith('/relationships/builds')));
});

test('membership or a submission that does not read back fails instead of reporting success', async () => {
  const group = fixture({ notes: { id: 'loc1', text: 'Notes' }, membershipSticks: false });
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, group.io), /not in Early reviewers after the add/);
  assert.equal(group.writes.filter(w => w.path.endsWith('/relationships/builds')).length, 1, 'the uncertain add is never repeated');
  const review = fixture({ notes: { id: 'loc1', text: 'Notes' }, submissionSticks: false });
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, review.io), /did not read back/);
});

test('a build queued behind another build of its version stays in the group, names that build and is not submitted', async () => {
  const f = fixture({ refuse: 'ENTITY_UNPROCESSABLE.ANOTHER_BUILD_IN_REVIEW',
    train: [{ id: 'b8', version: '8', state: 'IN_BETA_TESTING' }, { id: 'b9', version: '9', state: 'WAITING_FOR_BETA_REVIEW' }] });
  const lines = [];
  f.io.log = line => lines.push(line);
  const result = await ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, f.io);
  assert.equal(result.submitted, false);
  assert.equal(result.buildPresent, true);
  assert.equal(result.whatToTest, 'set');
  assert.deepEqual(result.queuedBehind, { build: '9', buildId: 'b9', externalBuildState: 'WAITING_FOR_BETA_REVIEW' });
  assert.equal(result.externalBuildState, 'READY_FOR_BETA_SUBMISSION');
  assert.ok(lines.some(line => /build 9 is WAITING_FOR_BETA_REVIEW.*rerun beta-group 10/.test(line)));
  assert.equal(f.writes.filter(w => w.path === '/v1/betaAppReviewSubmissions').length, 1, 'the refused submission is not retried');
  const unknown = fixture({ refuse: 'ENTITY_UNPROCESSABLE.ANOTHER_BUILD_IN_REVIEW' });
  assert.deepEqual((await ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, unknown.io)).queuedBehind,
    { build: null, buildId: null, externalBuildState: null });
  const other = fixture({ refuse: 'ENTITY_ERROR.ATTRIBUTE.REQUIRED' });
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, other.io), /ATTRIBUTE.REQUIRED/);
});

test('an internal group gets the build and What to Test but no Beta App Review', async () => {
  const f = fixture({ internal: true });
  const result = await ios.betaGroup(10, { group: 'Early reviewers', whatToTest: NOTES }, f.io);
  assert.equal(result.external, false);
  assert.equal(result.submitted, false);
  assert.equal(result.externalBuildState, null);
  assert.ok(!f.writes.some(w => w.path === '/v1/betaAppReviewSubmissions'));
  const automatic = fixture({ internal: true, automatic: true });
  await ios.betaGroup(10, { group: 'Early reviewers' }, automatic.io);
  assert.equal(automatic.writes.length, 0, 'a group that receives every build needs no add');
});

test('the external state is waited through processing, and a blocked build stops with its reason', async () => {
  const f = fixture({ notes: { id: 'loc1', text: 'Notes' }, state: clock => (clock ? 'READY_FOR_BETA_SUBMISSION' : 'PROCESSING') });
  assert.equal((await ios.betaGroup(10, { group: 'Early reviewers' }, f.io)).submitted, true);
  assert.equal(f.io.now(), 30000);
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, fixture({ notes: { id: 'loc1', text: 'Notes' }, state: 'MISSING_EXPORT_COMPLIANCE' }).io),
    /MISSING_EXPORT_COMPLIANCE/);
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, fixture({ notes: { id: 'loc1', text: 'Notes' }, state: 'BETA_REJECTED' }).io),
    /BETA_REJECTED.*new build/);
});

test('the group must exist once by its exact name, and the build must be processed', async () => {
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, fixture({ groups: 0 }).io), /Expected one TestFlight group named Early reviewers, found 0/);
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, fixture({ groups: 2 }).io), /found 2/);
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers' }, fixture({ processing: 'INVALID' }).io), /is INVALID/);
});

test('What to Test is checked against Apple\'s limit before anything is written', async () => {
  assert.equal(ios.whatToTestText(' a\r\nb \n'), 'a\nb');
  assert.throws(() => ios.whatToTestText('  \n'), /empty/);
  assert.throws(() => ios.whatToTestText('x'.repeat(4001)), /4001 characters; Apple allows 4000/);
  const f = fixture();
  await assert.rejects(() => ios.betaGroup(10, { group: 'Early reviewers', whatToTest: 'x'.repeat(4001) }, f.io), /Apple allows/);
  assert.equal(f.writes.length, 0);
});

test('betaReviewDecision submits only a build ready for Beta App Review', () => {
  assert.equal(ios.betaReviewDecision('READY_FOR_BETA_SUBMISSION', []).submit, true);
  assert.equal(ios.betaReviewDecision('READY_FOR_BETA_SUBMISSION', [{ attributes: { betaReviewState: 'REJECTED' } }]).submit, false);
  assert.equal(ios.betaReviewDecision('PROCESSING', []).wait, true);
  assert.throws(() => ios.betaReviewDecision('EXPIRED', []), /new build/);
});

test('beta-group parses a group name and a What to Test file', () => {
  assert.deepEqual(ios.parseArgs(['beta-group', '10', '--group', 'Early reviewers', '--what-to-test', 'notes.txt']),
    { command: 'beta-group', build: 10, allowDirty: false, group: 'Early reviewers', whatToTest: 'notes.txt' });
  assert.throws(() => ios.parseArgs(['beta-group', '10']), /needs --group/);
  assert.throws(() => ios.parseArgs(['beta-group', '--group', 'Early reviewers']), /needs a build number/);
  assert.throws(() => ios.parseArgs(['beta-group', '10', '--group']), /--group needs a value/);
  assert.throws(() => ios.parseArgs(['testers', '10', '--group', 'Early reviewers']), /Unknown option --group/);
});
