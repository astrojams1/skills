// vault.mjs
// Reads release credentials from 1Password through the service account whose token sits in OP_KEY, and keeps any
// credential that must touch disk in one private temporary directory that is deleted on exit or signal.

import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// serviceAccountEnv returns the environment op needs. The owner's Mac stores OP_KEY with a literal "OP_KEY=" prefix in
// front of the token, which op rejects as "unrecognized auth type", so the prefix is stripped.
export function serviceAccountEnv(env) {
  const result = Object.assign({}, env);
  const raw = result.OP_KEY || '';
  if (raw && !result.OP_SERVICE_ACCOUNT_TOKEN) result.OP_SERVICE_ACCOUNT_TOKEN = raw.startsWith('OP_KEY=') ? raw.slice('OP_KEY='.length) : raw;
  return result;
}

// opRead reads one field or attachment of a vault item (`op://Vault/Item`); with outFile the value goes to that file
// and nothing comes back. A failure names the reference, never a value.
export function opRead(item, field, outFile) {
  const reference = item.replace(/\/$/, '') + '/' + field;
  const args = ['read'].concat(outFile ? ['--out-file', outFile] : [], [reference]);
  const result = spawnSync('op', args, { env: serviceAccountEnv(process.env), encoding: 'utf8' });
  if (result.error) throw new Error('op is not installed (brew install --cask 1password-cli): ' + result.error.message);
  if (result.status !== 0) throw new Error('op read "' + reference + '" failed: ' + String(result.stderr).trim());
  return result.stdout.trim();
}

// pem restores the armor the vault strips from an App Store Connect .p8 body.
export function pem(body) {
  if (body.includes('BEGIN PRIVATE KEY')) return body.endsWith('\n') ? body : body + '\n';
  const key = body.replace(/\s+/g, '');
  return '-----BEGIN PRIVATE KEY-----\n' + key.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----\n';
}

let dir = null;

// removePrivateDir deletes the private directory and everything in it.
export function removePrivateDir() {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
}

// privateDir returns the run's mode-700 temporary directory, creating it on first use. Ctrl-C or a kill skips
// `finally`, so signals also delete it before the process exits.
export function privateDir(label) {
  if (dir) return dir;
  dir = mkdtempSync(join(tmpdir(), (label || 'app-release') + '-'));
  chmodSync(dir, 0o700);
  process.on('exit', removePrivateDir);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.once(signal, () => {
      removePrivateDir();
      process.exit(130);
    });
  }
  return dir;
}
