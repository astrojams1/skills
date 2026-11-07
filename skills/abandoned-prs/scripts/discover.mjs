#!/usr/bin/env node
// Lists open PRs in scope and sorts them into triage buckets. Read-only on GitHub.
//   discover.mjs [--state FILE] [--scope FILE]            print the buckets as JSON
//   discover.mjs record OWNER/REPO#N --decision held|blocked --head SHA --reason TEXT [--state FILE]
//   discover.mjs forget OWNER/REPO#N [--state FILE]       drop a saved decision
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SCOPE = join(HERE, '..', 'assets', 'scope.json');
const DEFAULT_STATE = '/Volumes/ssd/projects/abandoned-prs/state.json';
const DAY = 86400000;
const WRITE_ROLES = new Set(['ADMIN', 'MAINTAIN', 'WRITE']);

const QUERY = `query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: 25, after: $after) {
    pageInfo { hasNextPage endCursor }
    nodes { ... on PullRequest {
      number title url isDraft createdAt updatedAt headRefName baseRefName
      isCrossRepository mergeable mergeStateStatus reviewDecision
      author { login __typename }
      repository { nameWithOwner viewerPermission isArchived }
      labels(first: 20) { nodes { name } }
      comments(last: 30) { nodes { createdAt author { login __typename } } }
      reviews(last: 30) { nodes { submittedAt author { login __typename } } }
      reviewThreads(first: 100) { nodes { isResolved } }
      commits(last: 1) { nodes { commit { oid committedDate statusCheckRollup { state } } } }
    } }
  }
}`;

// Bots touch PRs constantly, so only people and commits count as activity.
export function lastActivity(pr) {
  const human = (n) => n.author && n.author.__typename !== 'Bot';
  const times = [pr.createdAt, pr.commits.nodes[0]?.commit.committedDate];
  for (const c of pr.comments.nodes) if (human(c)) times.push(c.createdAt);
  for (const r of pr.reviews.nodes) if (human(r)) times.push(r.submittedAt);
  return new Date(Math.max(...times.filter(Boolean).map((t) => Date.parse(t)))).toISOString();
}

export function summarize(pr, now) {
  const commit = pr.commits.nodes[0]?.commit;
  const activity = lastActivity(pr);
  return {
    id: `${pr.repository.nameWithOwner}#${pr.number}`,
    url: pr.url,
    title: pr.title,
    author: pr.author?.login ?? 'ghost',
    draft: pr.isDraft,
    head: commit?.oid ?? null,
    branch: pr.headRefName,
    base: pr.baseRefName,
    labels: pr.labels.nodes.map((l) => l.name),
    mergeable: pr.mergeable,
    mergeState: pr.mergeStateStatus,
    review: pr.reviewDecision,
    checks: commit?.statusCheckRollup?.state ?? 'NONE',
    unresolvedThreads: pr.reviewThreads.nodes.filter((t) => !t.isResolved).length,
    lastActivity: activity,
    quietDays: Math.floor((now - Date.parse(activity)) / DAY),
  };
}

// The order matters: a PR we may not touch stays out however quiet it is.
export function bucketFor(pr, item, scope, state, now) {
  const repo = pr.repository.nameWithOwner;
  if (pr.repository.isArchived || scope.excludedRepos.includes(repo)) return 'excluded';
  if (!WRITE_ROLES.has(pr.repository.viewerPermission)) return 'noAuthority';
  if (pr.isCrossRepository || !scope.trustedAuthors.includes(item.author.replace(/\[bot\]$/, ''))) return 'foreign';
  if (item.quietDays < scope.quietDays) return 'active';
  const labels = item.labels.map((l) => l.toLowerCase());
  if (labels.some((l) => scope.holdLabels.includes(l))) return 'held';
  if (new RegExp(scope.holdPattern, 'i').test(`${item.title} ${item.branch}`)) return 'held';
  const saved = state[item.id];
  if (saved && saved.head === item.head
    && Date.parse(item.lastActivity) <= Date.parse(saved.recordedAt)
    && now - Date.parse(saved.recordedAt) < scope.recheckDays * DAY) return 'unchanged';
  return 'candidate';
}

export function triage(prs, scope, state, now) {
  const out = { excluded: [], noAuthority: [], foreign: [], active: [], held: [], unchanged: [], candidate: [] };
  for (const pr of prs) {
    const item = summarize(pr, now);
    const bucket = bucketFor(pr, item, scope, state, now);
    out[bucket].push(bucket === 'unchanged' ? { ...item, saved: state[item.id] } : item);
  }
  // Longest quiet first, so a capped run always reaches the most neglected PRs.
  out.candidate.sort((a, b) => b.quietDays - a.quietDays);
  return out;
}

function fetchOpen(owner, sinceDate) {
  const q = `is:pr is:open archived:false user:${owner} updated:>=${sinceDate}`;
  const prs = [];
  let after = null;
  do {
    const args = ['api', 'graphql', '-f', `query=${QUERY}`, '-f', `q=${q}`];
    if (after) args.push('-f', `after=${after}`);
    const res = JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    prs.push(...res.data.search.nodes.filter((n) => n.number));
    after = res.data.search.pageInfo.hasNextPage ? res.data.search.pageInfo.endCursor : null;
  } while (after);
  return prs;
}

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);

function saveState(file, state) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(`${file}.tmp`, file);
}

function flag(args, name, fallback) {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
}

function main(args) {
  const stateFile = flag(args, '--state', DEFAULT_STATE);
  const state = readJson(stateFile, {});
  if (args[0] === 'record') {
    const decision = flag(args, '--decision');
    const head = flag(args, '--head');
    const reason = flag(args, '--reason');
    if (!/^[^/\s]+\/[^#\s]+#\d+$/.test(args[1] ?? '') || !['held', 'blocked'].includes(decision) || !head || !reason) {
      throw new Error('usage: record OWNER/REPO#N --decision held|blocked --head SHA --reason TEXT');
    }
    state[args[1]] = { decision, head, reason, recordedAt: new Date().toISOString() };
    saveState(stateFile, state);
    return;
  }
  if (args[0] === 'forget') {
    delete state[args[1]];
    saveState(stateFile, state);
    return;
  }
  const scope = readJson(flag(args, '--scope', DEFAULT_SCOPE));
  const now = Date.now();
  const since = new Date(now - scope.windowDays * DAY).toISOString().slice(0, 10);
  const seen = new Map();
  for (const owner of scope.owners) for (const pr of fetchOpen(owner, since)) seen.set(pr.url, pr);
  const buckets = triage([...seen.values()], scope, state, now);
  const worked = buckets.candidate.slice(0, scope.maxWorkedPerRun);
  const deferred = buckets.candidate.slice(scope.maxWorkedPerRun);
  console.log(JSON.stringify({ since, ...buckets, candidate: worked, deferred }, null, 2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
