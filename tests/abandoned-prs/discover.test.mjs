import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { lastActivity, triage } from '../../skills/abandoned-prs/scripts/discover.mjs';

const script = fileURLToPath(new URL('../../skills/abandoned-prs/scripts/discover.mjs', import.meta.url));
const scope = JSON.parse(readFileSync(new URL('../../skills/abandoned-prs/assets/scope.json', import.meta.url)));
const NOW = Date.parse('2026-11-08T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();

function pr(over = {}) {
  return {
    number: 1, title: 'Fix it', url: 'https://github.com/astrojams1/app/pull/1', isDraft: false,
    createdAt: daysAgo(20), updatedAt: daysAgo(1), headRefName: 'fix/it', baseRefName: 'main',
    isCrossRepository: false, mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN', reviewDecision: null,
    author: { login: 'astrojams1', __typename: 'User' },
    repository: { nameWithOwner: 'astrojams1/app', viewerPermission: 'ADMIN', isArchived: false },
    labels: { nodes: [] }, comments: { nodes: [] }, reviews: { nodes: [] }, reviewThreads: { nodes: [] },
    commits: { nodes: [{ commit: { oid: 'abc', committedDate: daysAgo(10), statusCheckRollup: { state: 'SUCCESS' } } }] },
    ...over,
  };
}

const bucketOf = (p, state = {}) => {
  const out = triage([p], scope, state, NOW);
  return Object.keys(out).find((k) => out[k].length);
};

test('a quiet PR by the owner is a candidate', () => {
  assert.equal(bucketOf(pr()), 'candidate');
});

test('bot comments do not count as activity, people do', () => {
  const bot = { createdAt: daysAgo(1), author: { login: 'vercel', __typename: 'Bot' } };
  assert.equal(bucketOf(pr({ comments: { nodes: [bot] } })), 'candidate');
  const person = { createdAt: daysAgo(1), author: { login: 'astrojams1', __typename: 'User' } };
  assert.equal(bucketOf(pr({ comments: { nodes: [person] } })), 'active');
  assert.equal(lastActivity(pr({ comments: { nodes: [person] } })), daysAgo(1));
});

test('a fresh commit makes a PR active', () => {
  const commits = { nodes: [{ commit: { oid: 'abc', committedDate: daysAgo(2), statusCheckRollup: null } }] };
  assert.equal(bucketOf(pr({ commits })), 'active');
});

test('forks and strangers are never candidates', () => {
  assert.equal(bucketOf(pr({ isCrossRepository: true })), 'foreign');
  assert.equal(bucketOf(pr({ author: { login: 'stranger', __typename: 'User' } })), 'foreign');
  assert.equal(bucketOf(pr({ author: null })), 'foreign');
});

test('agent authors are trusted with or without the bot suffix', () => {
  assert.equal(bucketOf(pr({ author: { login: 'copilot-swe-agent[bot]', __typename: 'Bot' } })), 'candidate');
});

test('read-only access beats everything else', () => {
  const repository = { nameWithOwner: 'churnlabs/app', viewerPermission: 'READ', isArchived: false };
  assert.equal(bucketOf(pr({ repository })), 'noAuthority');
});

test('hold labels, titles and staging branches are held', () => {
  assert.equal(bucketOf(pr({ labels: { nodes: [{ name: 'Do-Not-Merge' }] } })), 'held');
  assert.equal(bucketOf(pr({ title: 'Load test, never merge' })), 'held');
  assert.equal(bucketOf(pr({ headRefName: 'staging/rig' })), 'held');
});

test('a draft alone is still a candidate', () => {
  assert.equal(bucketOf(pr({ isDraft: true })), 'candidate');
});

test('a saved decision skips the PR until something changes', () => {
  const saved = { decision: 'held', head: 'abc', reason: 'cost', recordedAt: daysAgo(7) };
  const key = 'astrojams1/app#1';
  assert.equal(bucketOf(pr(), { [key]: saved }), 'unchanged');
  assert.equal(bucketOf(pr(), { [key]: { ...saved, head: 'def' } }), 'candidate');
  assert.equal(bucketOf(pr(), { [key]: { ...saved, recordedAt: daysAgo(15) } }), 'candidate');
  const old = { ...saved, recordedAt: daysAgo(29) };
  const commits = { nodes: [{ commit: { oid: 'abc', committedDate: daysAgo(40), statusCheckRollup: null } }] };
  assert.equal(bucketOf(pr({ commits, createdAt: daysAgo(40) }), { [key]: old }), 'candidate');
});

test('the quietest PRs come first', () => {
  const older = pr({ number: 2, commits: { nodes: [{ commit: { oid: 'x', committedDate: daysAgo(18), statusCheckRollup: null } }] } });
  const out = triage([pr(), older], scope, {}, NOW);
  assert.deepEqual(out.candidate.map((c) => c.quietDays), [18, 10]);
});

test('record and forget edit the state file', () => {
  const file = join(mkdtempSync(join(tmpdir(), 'abandoned-prs-')), 'state.json');
  const run = (...args) => execFileSync(process.execPath, [script, ...args, '--state', file]);
  run('record', 'astrojams1/app#1', '--decision', 'held', '--head', 'abc', '--reason', 'cost hold');
  assert.equal(JSON.parse(readFileSync(file, 'utf8'))['astrojams1/app#1'].reason, 'cost hold');
  assert.throws(() => run('record', 'nonsense', '--decision', 'merged', '--head', 'abc', '--reason', 'x'), /usage/);
  run('forget', 'astrojams1/app#1');
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), {});
});
