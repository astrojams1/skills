#!/usr/bin/env node
// ledger.mjs
// The release ledger: a JSON record of every gate (its state, owner, evidence basis, result and next action) with an
// append-only event history, and a Markdown view generated from it. The JSON is canonical; never edit the view. Paths
// come from the app's app-release.config.json (`ledger.gates`, `ledger.view`). Each record is also appended to the
// owner's shared agent activity ledger when the configuration names one.
//
//   node ledger.mjs init --objective TEXT [--platforms web,ios,android]   create the ledger (refuses to overwrite)
//   node ledger.mjs record --gate ID --summary TEXT [--state S] [--owner O] [--basis B] [--evidence TEXT]... [--next TEXT]
//   node ledger.mjs status [--stale-days N]   unfinished gates, release gates first, stale ones flagged
//   node ledger.mjs render | check | validate

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './lib/config.mjs';

export const STATES = ['todo', 'in_progress', 'waiting_user', 'waiting_provider', 'waiting_verification', 'uncertain', 'failed', 'done', 'not_applicable'];
export const OWNERS = ['agent', 'user', 'provider'];
export const BASES = ['observed', 'user_reported', 'inferred'];
export const PLATFORMS = ['web', 'ios', 'android'];
// Gates under these prefixes are the store release itself; everything else (design, widget, ui…) is product
// verification the app chose to track here, and is listed after them.
export const RELEASE_PREFIXES = ['scope', 'web', 'apple', 'google', 'account'];
const FINISHED = ['done', 'not_applicable'];
const GATE_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const DEFAULT_ACTIVITY_HELPER = '~/.codex/skills/mac-memory-maintenance/scripts/ledger.py';

// isReleaseGate reports whether a gate belongs to the store release rather than product verification.
export function isReleaseGate(gate) {
  return RELEASE_PREFIXES.includes(gate.split(/[._-]/)[0]);
}

// timestamp formats a date the way existing ledgers store it: seconds precision with an explicit UTC offset.
export function timestamp(at) {
  return at.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

// createLedger returns an empty ledger for an app.
export function createLedger({ app, repository, objective, platforms }, at) {
  if (!objective) throw new Error('init needs --objective');
  const list = platforms || PLATFORMS;
  for (const platform of list) if (!PLATFORMS.includes(platform)) throw new Error('platforms are ' + PLATFORMS.join(', '));
  const now = timestamp(at || new Date());
  return { schema_version: 1, app: app, repository: repository || '', objective: objective, platforms: list, created_at: now, updated_at: now,
    steps: {}, events: [], metrics: { tokens: null, cost_usd: null } };
}

// cell escapes text for one Markdown table cell.
const cell = text => (text || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// render produces the Markdown view: release gates, then product verification gates, then the event history.
export function render(ledger, source) {
  const lines = [
    '# ' + ledger.app + ' release ledger', '',
    'Updated: ' + ledger.updated_at, '',
    'Repository: ' + ledger.repository, '',
    'Objective: ' + ledger.objective, '',
    'Generated from ' + (source || 'the adjacent JSON ledger') + ' by the app-release skill\'s `ledger.mjs`; never edit this view.', ''
  ];
  const gates = Object.entries(ledger.steps);
  const table = (title, rows) => {
    if (!rows.length) return;
    lines.push('## ' + title, '', '| Gate | State | Owner | Evidence basis | Updated | Result | Next action |', '|---|---|---|---|---|---|---|');
    for (const [gate, step] of rows) {
      lines.push('| ' + gate + ' | ' + step.state + ' | ' + step.owner + ' | ' + step.basis + ' | ' + String(step.updated_at || '').slice(0, 10) + ' | ' +
        cell(step.summary) + ' | ' + cell(step.next_action) + ' |');
    }
    lines.push('');
  };
  table('Release gates', gates.filter(([gate]) => isReleaseGate(gate)));
  table('Product verification gates', gates.filter(([gate]) => !isReleaseGate(gate)));
  lines.push('## Evidence and history', '');
  for (const event of ledger.events) {
    const result = event.result;
    lines.push('### ' + event.sequence + '. ' + event.gate + ' — ' + result.state, '', event.at + ' · ' + result.basis + ' · ' + result.owner, '');
    lines.push(result.summary, '');
    for (const item of result.evidence || []) lines.push('- ' + item);
    if ((result.evidence || []).length) lines.push('');
    if (result.next_action) lines.push('Next: ' + result.next_action, '');
  }
  return lines.join('\n');
}

// record appends one event and updates its gate. Omitted state, owner, basis and next action carry over from the gate;
// `next: ''` clears the next action. New claims follow the evidence rules: `done` needs observed evidence and an
// unfinished gate needs a next action. An identical retry adds nothing.
export function record(ledger, input, at) {
  const { gate, summary } = input;
  if (!gate || !summary) throw new Error('record needs --gate and --summary');
  if (!GATE_ID.test(gate)) throw new Error('gate ids are lowercase words joined by . _ or -, such as apple.review');
  const previous = ledger.steps[gate] || null;
  const pick = (value, key) => (value !== undefined && value !== null ? value : previous ? previous[key] : undefined);
  const result = {
    state: pick(input.state, 'state'),
    owner: pick(input.owner, 'owner'),
    basis: pick(input.basis, 'basis'),
    summary: summary,
    evidence: input.evidence || [],
    next_action: input.next !== undefined && input.next !== null ? input.next : previous && previous.next_action ? previous.next_action : '',
    updated_at: timestamp(at || new Date())
  };
  if (!STATES.includes(result.state)) throw new Error('state must be one of ' + STATES.join(', '));
  if (!OWNERS.includes(result.owner)) throw new Error('owner must be one of ' + OWNERS.join(', ') + (previous ? '' : ' (a new gate needs --owner)'));
  if (!BASES.includes(result.basis)) throw new Error('basis must be one of ' + BASES.join(', ') + (previous ? '' : ' (a new gate needs --basis)'));
  if (result.state === 'done' && (result.basis !== 'observed' || !result.evidence.length)) {
    throw new Error('done needs --basis observed and at least one --evidence; record a user report as waiting_verification until you read it back');
  }
  if (!FINISHED.includes(result.state) && !result.next_action) throw new Error('an unfinished gate needs --next');
  if (previous && sameClaim(previous, result)) return { ledger: ledger, changed: false };
  const sequence = ledger.events.reduce((max, event) => Math.max(max, event.sequence), 0) + 1;
  ledger.steps[gate] = result;
  ledger.events.push({ sequence: sequence, at: result.updated_at, gate: gate, result: result });
  ledger.updated_at = result.updated_at;
  return { ledger: ledger, changed: true };
}

// sameClaim compares two gate results apart from their time, so a retried command does not duplicate history.
function sameClaim(a, b) {
  const strip = value => JSON.stringify(Object.assign({}, value, { updated_at: null }));
  return strip(a) === strip(b);
}

// validate returns hard errors (a malformed ledger) and warnings (history that predates the evidence rules, or gates
// whose last event disagrees with them). Only errors fail `validate`.
export function validate(ledger) {
  const errors = [];
  const warnings = [];
  if (ledger.schema_version !== 1) errors.push('schema_version must be 1');
  for (const key of ['app', 'objective', 'created_at', 'updated_at']) if (typeof ledger[key] !== 'string' || !ledger[key].trim()) errors.push('missing ' + key);
  if (!Array.isArray(ledger.platforms) || ledger.platforms.some(item => !PLATFORMS.includes(item))) errors.push('platforms must be among ' + PLATFORMS.join(', '));
  if (!ledger.steps || typeof ledger.steps !== 'object' || !Array.isArray(ledger.events)) {
    errors.push('steps must be an object and events an array');
    return { errors, warnings };
  }
  for (const [gate, step] of Object.entries(ledger.steps)) {
    if (!GATE_ID.test(gate)) errors.push('invalid gate id ' + gate);
    if (!STATES.includes(step.state)) errors.push(gate + ': unknown state ' + step.state);
    if (!OWNERS.includes(step.owner)) warnings.push(gate + ': owner ' + step.owner + ' is not one of ' + OWNERS.join(', '));
    if (!BASES.includes(step.basis)) errors.push(gate + ': unknown basis ' + step.basis);
    if (!step.summary || !step.updated_at) errors.push(gate + ': missing summary or updated_at');
    if (step.state === 'done' && step.basis !== 'observed') warnings.push(gate + ': done on ' + step.basis + ' evidence; read it back');
    if (!FINISHED.includes(step.state) && !step.next_action) warnings.push(gate + ': unfinished with no next action');
  }
  ledger.events.forEach((event, index) => {
    if (event.sequence !== index + 1) errors.push('event ' + (index + 1) + ' has sequence ' + event.sequence + '; history must be contiguous');
    if (!ledger.steps[event.gate]) errors.push('event ' + event.sequence + ' names unknown gate ' + event.gate);
  });
  for (const [gate, step] of Object.entries(ledger.steps)) {
    const last = ledger.events.filter(event => event.gate === gate).pop();
    if (!last || JSON.stringify(last.result) !== JSON.stringify(step)) errors.push(gate + ': latest event does not match the gate');
  }
  return { errors, warnings };
}

// staleGates lists unfinished gates not updated for `days` days, release gates first.
export function staleGates(ledger, now, days) {
  const limit = now.getTime() - days * 86400000;
  return Object.entries(ledger.steps)
    .filter(([, step]) => !FINISHED.includes(step.state) && Date.parse(step.updated_at) < limit)
    .sort(([a], [b]) => Number(isReleaseGate(b)) - Number(isReleaseGate(a)))
    .map(([gate]) => gate);
}

// statusLines summarizes unfinished gates by state, release gates first, marking stale ones.
export function statusLines(ledger, now, days) {
  const stale = new Set(staleGates(ledger, now, days));
  const lines = [ledger.app + ' — ' + ledger.objective, 'Updated ' + ledger.updated_at];
  for (const [title, release] of [['Release gates', true], ['Product verification gates', false]]) {
    const open = Object.entries(ledger.steps).filter(([gate, step]) => isReleaseGate(gate) === release && !FINISHED.includes(step.state));
    if (!open.length) continue;
    lines.push('', title + ':');
    for (const state of STATES) {
      for (const [gate, step] of open.filter(([, item]) => item.state === state)) {
        lines.push('  ' + (stale.has(gate) ? '! ' : '  ') + gate + ' [' + state + ', ' + step.owner + ', ' + String(step.updated_at).slice(0, 10) + '] next: ' + (step.next_action || '—'));
      }
    }
  }
  if (stale.size) lines.push('', '! not updated for ' + days + ' days: read the provider state back and record it, or close the gate.');
  return lines;
}

// activityEvent shapes one record for the shared agent activity ledger (schema v1 of its helper).
export function activityEvent(config, gate, result, runId) {
  return {
    run_id: runId,
    skill: 'app-release',
    agent: process.env.APP_RELEASE_AGENT || 'claude',
    event: result.state === 'done' ? 'verify' : 'action',
    status: result.state === 'failed' ? 'failed' : result.state === 'done' ? 'ok' : 'partial',
    targets: [config.app + ':' + gate],
    operation: 'ledger-record',
    evidence: { gate: gate, state: result.state, summary: result.summary.slice(0, 500) },
    next: result.next_action || ''
  };
}

// appendActivity hands the event to the owner's activity-ledger helper, which locks, rotates and appends; a missing
// helper is reported, never fatal, since the app ledger already holds the record.
function appendActivity(config, gate, result) {
  if (!config.activityLog) return;
  const helper = (process.env.APP_RELEASE_ACTIVITY_HELPER || DEFAULT_ACTIVITY_HELPER).replace(/^~\//, process.env.HOME + '/');
  if (!existsSync(helper)) {
    console.error('Activity helper ' + helper + ' is missing; the shared activity ledger was not updated.');
    return;
  }
  const runId = process.env.APP_RELEASE_RUN_ID || 'app-release-' + config.slug + '-' + result.updated_at.slice(0, 10);
  const run = spawnSync('python3', [helper], { input: JSON.stringify(activityEvent(config, gate, result, runId)), encoding: 'utf8' });
  if (run.status !== 0) console.error('Activity ledger append failed: ' + String(run.stderr).trim());
}

// parseFlags reads --name value pairs; --evidence repeats.
export function parseFlags(args) {
  const flags = { evidence: [] };
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index].startsWith('--')) throw new Error('Unexpected argument ' + args[index]);
    const key = args[index].slice(2);
    const value = args[index + 1];
    if (value === undefined) throw new Error('--' + key + ' needs a value');
    if (key === 'evidence') flags.evidence.push(value);
    else flags[key] = value;
  }
  return flags;
}

// save writes the JSON atomically, then the view.
function save(config, ledger) {
  const temporary = config.ledger.gates + '.tmp';
  writeFileSync(temporary, JSON.stringify(ledger, null, 2) + '\n');
  renameSync(temporary, config.ledger.gates);
  writeFileSync(config.ledger.view, render(ledger, viewSource(config)));
}

// viewSource names the JSON relative to the view, for the view's header line.
function viewSource(config) {
  return '`' + relative(dirname(config.ledger.view), config.ledger.gates) + '`';
}

async function main(args) {
  const command = args[0] || 'status';
  const flags = parseFlags(args.slice(1));
  const config = loadConfig();
  if (command === 'init') {
    if (existsSync(config.ledger.gates)) throw new Error(config.ledger.gates + ' exists; init never overwrites a ledger');
    const platforms = flags.platforms ? flags.platforms.split(',') : PLATFORMS.filter(item => item === 'web' || config[item === 'ios' ? 'ios' : 'android']);
    save(config, createLedger({ app: config.app, repository: config.repository, objective: flags.objective, platforms: platforms }));
    console.log('Created ' + config.ledger.gates);
    return;
  }
  const ledger = JSON.parse(readFileSync(config.ledger.gates, 'utf8'));
  if (command === 'render') {
    writeFileSync(config.ledger.view, render(ledger, viewSource(config)));
  } else if (command === 'check') {
    if (!existsSync(config.ledger.view) || readFileSync(config.ledger.view, 'utf8') !== render(ledger, viewSource(config))) {
      throw new Error(config.ledger.view + ' is out of date: run ledger.mjs render');
    }
  } else if (command === 'validate') {
    const { errors, warnings } = validate(ledger);
    for (const warning of warnings) console.log('warning: ' + warning);
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Ledger valid: ' + Object.keys(ledger.steps).length + ' gates, ' + ledger.events.length + ' events, ' + warnings.length + ' warnings.');
  } else if (command === 'status') {
    console.log(statusLines(ledger, new Date(), Number(flags['stale-days'] || 7)).join('\n'));
  } else if (command === 'record') {
    const outcome = record(ledger, { gate: flags.gate, state: flags.state, owner: flags.owner, basis: flags.basis, summary: flags.summary,
      evidence: flags.evidence, next: flags.next });
    if (!outcome.changed) {
      console.log('No change: ' + flags.gate + ' already records this.');
      return;
    }
    save(config, outcome.ledger);
    appendActivity(config, flags.gate, outcome.ledger.steps[flags.gate]);
    console.log('Recorded ' + flags.gate + ' (' + outcome.ledger.steps[flags.gate].state + ') as event ' + outcome.ledger.events.length);
  } else {
    throw new Error('Commands: init, record, status, render, check, validate');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
