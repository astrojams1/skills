// problems.mjs
// Repeating problems in app marketing (SKILL.md "Repeating problems"). The owner, 2026-11-13: "if an issue has shown up
// 32 times, how come it hasn't already been flagged and fixed? That's also a problem that needs to be fixed", and "If
// there's a problem, it should fix it, not just the top three."
//
// Every run logs through `marketing.mjs log` into marketing/ledger.jsonl (astrojams1/app-sites). From
// PROBLEM_KEYS_FROM, a line that records a problem names its family in `problem` (a key in
// references/problem-families.json). Older lines, and lines that only describe a problem in words, are mapped by the
// family's `text` patterns, so the count covers every run since 2026-11-05. A family's `history` adds the days the
// merged pull requests show it, with the PR that shows it.
//
// A family is closed only by evidence:
// - FIXED: the newest closing line is `closes: "fixed"` with `cause` and `change` (a PR as skills#N, app-sites#N or
//   owner/repo#N, or `commit <sha>`). The change has landed (git history of the skills or app-sites checkout, or
//   `landed` for another repository or a shallow clone) and no occurrence is recorded after it landed.
// - PENDING: a valid fixed line whose change has not landed. Open.
// - REOPENED: seen after a fix landed ("fix failed"). The same change cannot close it again. Open.
// - STANDING: `closes: "standing"` with `owner_step`, `unblocks` and `tried`: only the owner can remove the cause.
//   Open, counted apart; no run reports or pushes about it again.
// - RECURRING (3 or more days) or seen (1 or 2 days): no valid closing line. Open.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FAMILIES_FILE = fileURLToPath(new URL('../references/problem-families.json', import.meta.url));
export const SKILLS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const RECURRING_DAYS = 3;       // distinct days that make a family RECURRING (the owner, 2026-11-13)
export const PROBLEM_KEYS_FROM = Date.parse('2026-11-13T21:00:00Z'); // lines from here on carry `problem`
export const OPEN = ['RECURRING', 'REOPENED', 'PENDING', 'seen'];
const PROBLEM_STATUS = ['deferred', 'failed', 'partial'];
// A line that reports a fix (it names the problem it removed) counts toward the days seen, but never as a sighting
// after that fix landed.
const FIX_NOTE = /^(fixed|corrected|correction)\b/i;
const NO_CAUSE = /^(none known|unknown|tbd|n\/a|find the cause)/i;
const REF = /\b(?:(?:astrojams1\/)?(skills|app-sites)|([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+))#(\d+)\b|\bcommit ([0-9a-f]{7,40})\b/g;

export const pacificDay = ms => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const dayStart = day => Date.parse(`${day}T08:00:00Z`); // midnight Pacific (standard time), for day-only evidence

export function loadFamilies(path = FAMILIES_FILE) {
  if (!existsSync(path)) return [];
  const file = JSON.parse(readFileSync(path, 'utf8'));
  const families = compileFamilies(file.families || []);
  families.expected = (file.expected || []).map(x => ({ ...x, _re: new RegExp(x.text, 'i') }));
  return families;
}

// isExpected: an outside wait or a recorded decision (the families file's `expected`), not a fault.
export const isExpected = (e, families) => (families.expected || []).some(x => x._re.test(lineText(e)));

export function compileFamilies(families) {
  return families.map(f => ({ ...f, _text: (f.text || []).map(t => new RegExp(t, 'i')), _not: (f.not_text || []).map(t => new RegExp(t, 'i')) }));
}

// familyProblems: what is wrong with the families file itself.
export function familyProblems(families) {
  const problems = [], keys = new Set();
  for (const f of families) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.key || '')) problems.push(`family ${f.key}: key must be lowercase words joined by dashes`);
    if (keys.has(f.key)) problems.push(`family ${f.key}: duplicate key`);
    keys.add(f.key);
    for (const k of ['title', 'cause', 'fix']) if (!String(f[k] || '').trim()) problems.push(`family ${f.key}: missing ${k}`);
    for (const h of f.history || []) if (!/^\d{4}-\d{2}-\d{2} \S+: \S/.test(h)) problems.push(`family ${f.key}: history "${h}" must read "YYYY-MM-DD <where>: <what>"`);
    for (const t of [...(f.text || []), ...(f.not_text || [])]) { try { new RegExp(t); } catch { problems.push(`family ${f.key}: bad pattern ${t}`); } }
  }
  return problems;
}

// The words of a ledger line that can describe a problem.
export function lineText(e) {
  const open = (Array.isArray(e.left_open) ? e.left_open : []).map(o => `${o?.issue || ''} ${o?.needs || ''}`);
  return [e.operation, e.reason, e.next, ...open].filter(Boolean).join(' | ');
}

const isClose = e => e.closes === 'fixed' || e.closes === 'standing';
// isProblemLine: the line records something that went wrong or stayed open.
export const isProblemLine = e => !isClose(e) && (PROBLEM_STATUS.includes(e.status)
  || (e.status === 'skipped' && e.event !== 'end') || !!e.blocked_by || (Array.isArray(e.left_open) && e.left_open.length > 0));

// familiesOf: the families one ledger line meets, by its `problem` key (and its left_open entries' keys) or its words.
export function familiesOf(e, families) {
  if (isClose(e)) return new Set();
  const found = new Set();
  const keys = [e.problem, ...(Array.isArray(e.left_open) ? e.left_open.map(o => o?.problem) : [])].filter(Boolean);
  for (const k of keys) if (families.some(f => f.key === k)) found.add(k);
  const text = lineText(e);
  for (const f of families) if (!found.has(f.key) && f._text.some(t => t.test(text)) && !f._not.some(t => t.test(text))) found.add(f.key);
  return found;
}

// pitchOccurrences: a human reply still unanswered at a pitches snapshot although an earlier snapshot already saw it,
// so a whole run passed it by.
export function pitchOccurrences(metrics) {
  const snaps = new Map();
  for (const m of metrics) if (m.source === 'pitches' && Array.isArray(m.pitches)) {
    const s = snaps.get(m.at) || snaps.set(m.at, []).get(m.at);
    for (const p of m.pitches) for (const r of p.replies || []) if (r.kind === 'other' && !r.answered) s.push(`${p.id}@${r.at}`);
  }
  const ats = [...snaps.keys()].sort(), out = [];
  ats.forEach((at, i) => {
    if (!i) return;
    const before = new Set(snaps.get(ats[i - 1]));
    const left = snaps.get(at).filter(k => before.has(k));
    if (left.length) out.push({ family: 'replies-unanswered', at: Date.parse(at), source: 'metrics pitches', text: `${left.length} human repl${left.length > 1 ? 'ies' : 'y'} still unanswered a run later` });
  });
  return out;
}

export function familyRecords(events, families, metrics = []) {
  const recs = Object.fromEntries(families.map(f => [f.key, { occ: [], closes: [] }]));
  events.forEach((e, i) => {
    const at = Date.parse(e.ts);
    if (isClose(e)) { if (recs[e.problem]) recs[e.problem].closes.push({ ...e, at, line: i + 1 }); return; }
    for (const key of familiesOf(e, families)) {
      recs[key].occ.push({ at, day: pacificDay(at), source: `${e.run_id} ${e.event}`, text: lineText(e), note: FIX_NOTE.test(e.operation || '') });
    }
  });
  for (const o of pitchOccurrences(metrics)) if (recs[o.family]) recs[o.family].occ.push({ ...o, day: pacificDay(o.at), note: false });
  for (const f of families) for (const h of f.history || []) {
    const day = h.slice(0, 10);
    recs[f.key].occ.push({ at: dayStart(day), day, source: h.slice(11).split(':')[0], text: h.slice(11), note: true });
  }
  for (const r of Object.values(recs)) { r.occ.sort((a, b) => a.at - b.at); r.closes.sort((a, b) => a.at - b.at); }
  return recs;
}

export function changeRefs(text) {
  const refs = [];
  for (const m of String(text || '').matchAll(REF)) refs.push(m[4] ? `commit ${m[4]}` : `${m[1] || m[2]}#${m[3]}`);
  return refs;
}

// closeProblems: why a closing line closes nothing (empty when it is valid).
export function closeProblems(e) {
  if (e.closes === 'fixed') {
    const p = ['cause', 'change'].filter(k => !String(e[k] || '').trim()).map(k => `a fixed line needs ${k}`);
    if (e.cause && NO_CAUSE.test(e.cause)) p.push('the cause is not known, so nothing was fixed');
    if (e.change && !changeRefs(e.change).length) p.push('change names no PR (skills#N, app-sites#N, owner/repo#N) or commit <sha>');
    if (e.landed && Number.isNaN(Date.parse(e.landed))) p.push('landed must be a date');
    return p;
  }
  if (e.closes === 'standing') return ['owner_step', 'unblocks', 'tried'].filter(k => !String(e[k] || '').trim()).map(k => `a standing line needs ${k}`);
  return [];
}

const gitCache = new Map();
// gitLandings: when each PR and commit landed on main, per checkout ({ 'skills#12': ms, 'commit abc...': ms }), and
// each shallow checkout's oldest commit (a change missing from a shallow clone landed before it).
export function gitLandings(roots = {}) {
  const key = JSON.stringify(roots);
  if (gitCache.has(key)) return gitCache.get(key);
  const res = { refs: {}, commits: [], floors: {}, seen: {} };
  for (const [repo, root] of Object.entries(roots)) {
    if (!root || !existsSync(join(root, '.git'))) continue;
    const has = ref => spawnSync('git', ['-C', root, 'rev-parse', '--verify', '-q', ref]).status === 0;
    const refs = ['HEAD', ...['origin/main', 'origin/master'].filter(has)];
    const out = spawnSync('git', ['-C', root, 'log', '--format=%H%x09%cI%x09%s', ...refs], { encoding: 'utf8', maxBuffer: 64 << 20 });
    if (out.status !== 0) continue;
    res.seen[repo] = true;
    let oldest = Infinity;
    for (const row of out.stdout.split('\n').filter(Boolean)) {
      const [sha, iso, subject] = row.split('\t');
      const at = Date.parse(iso);
      oldest = Math.min(oldest, at);
      res.commits.push([sha, at]);
      const n = /\(#(\d+)\)\s*$/.exec(subject)?.[1] || /^Merge pull request #(\d+)\b/.exec(subject)?.[1];
      if (n && !(res.refs[`${repo}#${n}`] <= at)) res.refs[`${repo}#${n}`] = at;
    }
    const shallow = spawnSync('git', ['-C', root, 'rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).stdout.trim() === 'true';
    if (shallow) res.floors[repo] = oldest;
  }
  gitCache.set(key, res);
  return res;
}

// landedAt: when the change landed, and how that is known. All of a line's refs must have landed; the latest counts.
export function landedAt(e, git) {
  const refs = changeRefs(e.change);
  let latest = -Infinity;
  for (const ref of refs) {
    let at = git.refs[ref];
    if (at === undefined && ref.startsWith('commit ')) at = git.commits.find(([sha]) => sha.startsWith(ref.slice(7)))?.[1];
    if (at === undefined) {
      const repo = ref.split('#')[0];
      const stated = e.landed ? Date.parse(e.landed) : NaN;
      const known = repo in git.seen;
      if (Number.isNaN(stated)) return { at: null, how: `${ref} has not landed` };
      if (known && !(git.floors[repo] > stated)) return { at: null, how: `${ref} is not in ${repo}'s history (landed ${e.landed} stated)` };
      at = stated;
    }
    latest = Math.max(latest, at);
  }
  return { at: latest, how: refs.join(', ') };
}

export function judge(rec, git) {
  const occ = rec.occ, valid = [], ignored = [], failed = [];
  for (const c of rec.closes) {
    const probs = closeProblems(c);
    if (probs.length) { ignored.push({ ...c, problems: probs }); continue; }
    const v = { ...c };
    if (c.closes === 'fixed') {
      Object.assign(v, landedAt(c, git));
      if (v.at !== null) {
        const after = occ.find(o => !o.note && o.at > v.at);
        if (after && !failed.some(x => x.change === c.change)) failed.push({ change: c.change, landed: v.at, seenAfter: after });
      }
    }
    valid.push(v);
  }
  const last = valid.at(-1);
  let status;
  if (last?.closes === 'standing') status = 'STANDING';
  else if (last?.closes === 'fixed') status = failed.some(x => x.change === last.change) ? 'REOPENED' : last.at === null ? 'PENDING' : 'FIXED';
  else if (failed.length) status = 'REOPENED';
  else status = new Set(occ.map(o => o.day)).size >= RECURRING_DAYS ? 'RECURRING' : 'seen';
  return { status, close: last || null, failed, ignored };
}

export function recurring(events, families, { metrics = [], git = { refs: {}, commits: [], floors: {}, seen: {} } } = {}) {
  const recs = familyRecords(events, families, metrics);
  const rows = families.map(f => {
    const rec = recs[f.key], j = judge(rec, git);
    const days = [...new Set(rec.occ.map(o => o.day))].sort();
    return { family: f.key, title: f.title, status: j.status, days: days.length, first: days[0] || null, last: days.at(-1) || null, close: j.close, failed: j.failed, ignored: j.ignored, cause: f.cause, fix: f.fix, occurrences: rec.occ };
  }).filter(r => r.days || r.close);
  const order = s => ['REOPENED', 'RECURRING', 'PENDING', 'seen', 'STANDING', 'FIXED'].indexOf(s);
  return rows.sort((a, b) => order(a.status) - order(b.status) || b.days - a.days || a.family.localeCompare(b.family));
}

// unmapped: every ledger line that records a problem and meets no family, so a reader can check the mapping.
export function unmapped(events, families) {
  return events.map((e, i) => ({ e, i })).filter(({ e }) => isProblemLine(e) && !familiesOf(e, families).size && !isExpected(e, families))
    .map(({ e, i }) => ({ line: i + 1, day: pacificDay(Date.parse(e.ts)), run: e.run_id, app: e.app || '', text: lineText(e) }));
}

export function reportLine(rows) {
  const open = rows.filter(r => OPEN.includes(r.status)), standing = rows.filter(r => r.status === 'STANDING');
  return `Problem families open: ${open.length + standing.length} (${open.length} to fix${open.length ? ': ' + open.map(r => `${r.family} ${r.status} ${r.days}d`).join(', ') : ''}; ${standing.length} STANDING on the owner${standing.length ? ': ' + standing.map(r => r.family).join(', ') : ''})`;
}

// logProblems: what `marketing.mjs log` refuses about a line, from PROBLEM_KEYS_FROM.
// - A line that records a problem names its family in `problem`; each left_open entry does too.
// - `problem` is a family key. A new problem gets its family in references/problem-families.json in the same run.
// - A closing line is valid; a fixed line does not cite a change that already failed, or one that landed before the
//   family's last sighting (that change did not remove the cause).
// - An `end` refuses a run that met an open family seen on 3 or more days, or seen again after a fix, and wrote no
//   closing line for it: the run fixes it, removes the dependency, or writes the standing line.
export function logProblems(event, events, families, { metrics = [], git } = {}) {
  if (!(Date.parse(event.ts) >= PROBLEM_KEYS_FROM)) return [];
  const problems = [], keys = new Set(families.map(f => f.key));
  const known = k => keys.has(k);
  if (event.problem !== undefined && !known(event.problem)) problems.push(`problem "${event.problem}" is not a family in references/problem-families.json: use the family that fits, or add the new family there in this run`);
  if (isProblemLine(event) && event.event !== 'end' && !event.problem && !isExpected(event, families)) problems.push('a line that records a problem names its family in problem (references/problem-families.json)');
  (Array.isArray(event.left_open) ? event.left_open : []).forEach((o, i) => { if (!known(o?.problem)) problems.push(`left_open ${i + 1} names its family in problem`); });
  if (isClose(event)) {
    if (!known(event.problem)) problems.push('a closing line names its family in problem');
    const invalid = closeProblems(event);
    problems.push(...invalid);
    if (event.closes === 'fixed' && known(event.problem) && !invalid.length && git) {
      const rec = familyRecords(events, families, metrics)[event.problem], j = judge(rec, git);
      if (j.failed.some(x => x.change === event.change)) problems.push(`${event.change} already failed to fix ${event.problem}: find why and cite the change that removes the cause`);
      const { at } = landedAt(event, git);
      const lastSeen = rec.occ.filter(o => !o.note).at(-1);
      if (at !== null && lastSeen && lastSeen.at > at) problems.push(`${event.change} landed before ${event.problem} was seen on ${lastSeen.day}, so it did not remove the cause`);
    }
  }
  if (event.event === 'end' && git) {
    const mine = events.filter(e => e.run_id === event.run_id).concat(event);
    const met = new Set(mine.flatMap(e => [...familiesOf(e, families)]));
    const closed = new Set(mine.filter(isClose).map(e => e.problem));
    const rows = recurring(events, families, { metrics, git });
    for (const r of rows) if (met.has(r.family) && !closed.has(r.family) && (r.status === 'RECURRING' || r.status === 'REOPENED')) {
      problems.push(`${r.family} is ${r.status} (${r.days} days) and this run met it again: fix the cause, remove the dependency, or (owner-only) write the standing line, in this run`);
    }
  }
  return problems;
}

// printRecurring: the command's output. `lines` adds every sighting.
export function printRecurring(rows, { lines = false, log = console.log } = {}) {
  log(reportLine(rows));
  log(`${'family'.padEnd(30)} ${'status'.padEnd(9)} days  first       last`);
  for (const r of rows) {
    log(`${r.family.padEnd(30)} ${r.status.padEnd(9)} ${String(r.days).padStart(4)}  ${r.first || '-'.padEnd(10)}  ${r.last || '-'}`);
    for (const x of r.failed) log(`    fix failed: ${x.change} landed ${new Date(x.landed).toISOString().slice(0, 16)}Z, seen again ${x.seenAfter.day} (${x.seenAfter.source})`);
    const c = r.close;
    if (c?.closes === 'fixed') log(`    fixed: ${c.change}${c.at ? ` (landed ${new Date(c.at).toISOString().slice(0, 10)})` : ` (${c.how})`}; cause: ${c.cause}`);
    if (c?.closes === 'standing') log(`    standing: owner step: ${c.owner_step}. Unblocks: ${c.unblocks}. Tried: ${c.tried}`);
    if (r.ignored.length) log(`    ignored ${r.ignored.length} closing line(s): ${[...new Set(r.ignored.flatMap(i => i.problems))].join('; ')}`);
    if (r.status !== 'FIXED' && r.status !== 'STANDING') log(`    cause: ${r.cause}\n    fix: ${r.fix}`);
    if (lines) for (const o of r.occurrences) log(`      ${o.day} ${o.source}: ${o.text.slice(0, 160)}`);
  }
}
