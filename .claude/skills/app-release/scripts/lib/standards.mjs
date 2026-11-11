// standards.mjs
// Audits an app repository against the shared app standards in assets/standards.json. Every check reads the app's
// configuration, its store data and its git-tracked source; nothing here touches the network, the vault or a store, so
// `standards.mjs audit`, `asc.mjs submit`, `ios-release.mjs archive` and `android-release.mjs` can share one answer.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A reason short enough to be "n/a" or "later" records nothing a later run could weigh.
const MIN_REASON = 10;

export function loadCatalog() {
  return JSON.parse(readFileSync(new URL('../../assets/standards.json', import.meta.url), 'utf8'));
}

// valueAt reads a dotted path such as feedback.email.
function valueAt(object, path) {
  return path.split('.').reduce((value, key) => (value === undefined || value === null ? undefined : value[key]), object);
}

// isSourcePath keeps the app's own source: vendored skills, discovery copies (any dot folder), dependencies, build
// output, websites, store and ledger files and tests never count, or a skill's reference copy would pass the audit.
export function isSourcePath(path, scan) {
  const parts = path.split('/');
  const folders = parts.slice(0, -1);
  if (scan.rootDirs.includes(parts[0])) return false;
  if (folders.some(part => part.startsWith('.') || scan.dirs.includes(part) || part.endsWith('Tests'))) return false;
  if (scan.skipFiles.some(pattern => new RegExp(pattern).test(path))) return false;
  return scan.extensions.includes(extname(path).toLowerCase());
}

function git(root, args) {
  // Optional locks off: an audit of a checkout the owner is using must never write to its index.
  const result = spawnSync('git', ['-C', root].concat(args), { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (result.status !== 0) throw new Error('The standards audit reads git-tracked source, and ' + root + ' is not a readable git checkout: ' + String(result.stderr).trim());
  return result.stdout;
}

// sourceFiles reads the tracked app source under the configured project directory.
export function sourceFiles(config, scan) {
  const prefix = relative(config.root, config.projectDir);
  const scoped = path => (prefix ? path.slice(prefix.length + 1) : path);
  const files = [];
  for (const path of git(config.root, ['ls-files', '-z']).split('\0')) {
    if (!path || (prefix && !path.startsWith(prefix + '/'))) continue;
    if (!isSourcePath(path, scan) || !isSourcePath(scoped(path), scan)) continue;
    const absolute = join(config.root, path);
    try {
      const stat = statSync(absolute);
      if (stat.isFile() && stat.size <= scan.maxBytes) files.push({ path, text: readFileSync(absolute, 'utf8') });
    } catch {
      // A tracked file deleted from the working tree is not in the build.
    }
  }
  return files;
}

function matcher(check, context) {
  const literals = (check.literalsFromConfig || []).map(path => valueAt(context.config, path))
    .concat((check.literalsFromStore || []).map(path => valueAt(context.store, path)))
    .filter(value => typeof value === 'string' && value.trim());
  const patterns = (check.anyOf || []).map(pattern => new RegExp(pattern, check.flags || ''));
  return text => literals.some(value => text.includes(value)) || patterns.some(pattern => pattern.test(text));
}

// Each check returns a problem, or null when it passes or does not apply; `evidence` collects the files that satisfied it.
const CHECKS = {
  config(check, context) {
    const value = valueAt(context.config, check.path);
    const valid = typeof value === 'string' && value.trim() && (check.format !== 'email' || EMAIL.test(value.trim()));
    return valid ? null : check.problem;
  },
  marker(check, context) {
    context.marked = context.files.filter(file => file.text.includes(check.text));
    context.evidence.push(...context.marked.map(file => file.path));
    return context.marked.length ? null : check.problem;
  },
  source(check, context) {
    // With no marked file there is nothing to inspect, and the marker's own problem already says so.
    if (check.in === 'marker' && !context.marked.length) return null;
    const hits = (check.in === 'marker' ? context.marked : context.files).filter(file => matcher(check, context)(file.text));
    if (check.in !== 'marker') context.evidence.push(...hits.slice(0, 3).map(file => file.path));
    return hits.length ? null : check.problem;
  },
  // A file dropped into the repository is not a control on a screen: what the marked file defines must be used elsewhere.
  wired(check, context) {
    context.callers = [];
    for (const name of check.names) {
      const defined = context.marked.filter(file => new RegExp('\\b(?:struct|class|func|function|const)\\s+' + name + '\\b').test(file.text));
      if (!defined.length) continue;
      const callers = context.files.filter(file => !defined.includes(file) && new RegExp('\\b' + name + '\\b').test(file.text));
      if (!callers.length) return check.problem;
      context.callers.push(...callers);
    }
    return null;
  },
  // A store data URL must be its own page, not one of the others: a privacy "policy" that is just the marketing page
  // passed every other check (Hanzi Cards, 2026-11-10). Trailing slashes and case are ignored.
  distinctStore(check, context) {
    const norm = value => typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '').toLowerCase() : null;
    const value = norm(valueAt(context.store, check.path));
    if (!value) return null;
    return check.from.some(path => norm(valueAt(context.store, path)) === value) ? check.problem : null;
  },
  // Links out of a Kids Category app sit behind a parental gate, so the screen holding the control should show one.
  kidsGate(check, context) {
    if (!valueAt(context.store, 'ageRating.kidsAgeBand') || !context.marked.length) return null;
    const screens = context.callers && context.callers.length ? context.callers : context.marked;
    const gate = new RegExp(check.anyOf.join('|'), 'i');
    return screens.some(file => gate.test(file.path) || gate.test(file.text)) ? null : check.problem;
  }
};

function optOutReason(config, id) {
  const optOut = valueAt(config, 'standards.optOut');
  return optOut && Object.hasOwn(optOut, id) ? optOut[id] : undefined;
}

// gateFor names the ledger gate a missing standard becomes: an issue, so `ledger.mjs issues` holds the run open until
// it is fixed and verified.
export function gateFor(id) {
  return 'issue.standard.' + id;
}

// readStore tolerates an app with no store data yet; the checks that read it simply find nothing.
function readStore(config) {
  if (!config.storeData || !existsSync(config.storeData)) return {};
  return JSON.parse(readFileSync(config.storeData, 'utf8'));
}

// auditApp reports each standard as pass, missing or opted-out. Source is read only when some standard needs it, so an
// app that has opted out of everything needs no checkout.
export function auditApp(config, catalog = loadCatalog()) {
  let files = null;
  const store = readStore(config);
  const standards = catalog.standards.map(standard => {
    const base = { id: standard.id, title: standard.title, doc: standard.doc };
    const reason = optOutReason(config, standard.id);
    const validReason = typeof reason === 'string' && reason.trim().length >= MIN_REASON;
    if (validReason) return { ...base, status: 'opted-out', reason: reason.trim(), problems: [], evidence: [] };
    files = files || sourceFiles(config, catalog.scan);
    const context = { config, store, files, marked: [], evidence: [] };
    const problems = standard.checks.map(check => CHECKS[check.type](check, context)).filter(Boolean);
    if (reason !== undefined) problems.unshift('standards.optOut.' + standard.id + ' does not record a reason of at least ' + MIN_REASON + ' characters, so it does not count');
    const evidence = [...new Set(context.evidence)];
    if (!problems.length) return { ...base, status: 'pass', problems, evidence };
    return { ...base, status: 'missing', problems, evidence, fix: standard.fix, verify: standard.verify, gate: gateFor(standard.id) };
  });
  const known = new Set(catalog.standards.map(standard => standard.id));
  const warnings = Object.keys(valueAt(config, 'standards.optOut') || {}).filter(id => !known.has(id))
    .map(id => 'standards.optOut names ' + id + ', which is not in the catalog');
  return { app: config.app, root: config.root, ok: standards.every(item => item.status !== 'missing'), standards, warnings };
}

// standardsRefusal is the sentence a release step refuses with, naming what is missing, or null when nothing is.
export function standardsRefusal(config, catalog) {
  const missing = auditApp(config, catalog).standards.filter(item => item.status === 'missing');
  if (!missing.length) return null;
  return config.app + ' is missing required app standards: ' + missing.map(item => item.id + ' (' + item.problems.join('; ') + ')').join('; ')
    + '. Fix them in this run (`standards.mjs audit` says how; references/standards.md is the spec).';
}
