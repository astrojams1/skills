#!/usr/bin/env node
// Read-only preflight for the Apple launcher needed by native XCTest automation.
import { spawnSync } from 'node:child_process';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = 'Usage: node skills/skills/app-release/scripts/native-qa.mjs preflight [--launcher PATH]';
const IDENTIFIER = 'com.apple.dt.xcodebuild';
const APPLE_REQUIREMENT = 'identifier "' + IDENTIFIER + '" and anchor apple';
const REQUIRED_ENTITLEMENTS = ['com.apple.private.DTServiceHubClient', 'com.apple.dt.testmanagerd.control.client'];
const REMEDY = 'Use the original Apple-signed xcodebuild selected by xcrun --find xcodebuild. ' +
  'Do not re-sign Apple tools or transplant entitlements. A rejected launcher is not evidence of a broken simulator runtime.';

export function parseArgs(args) {
  if (args[0] !== 'preflight') throw new Error(USAGE);
  let launcher = null;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] !== '--launcher' || launcher !== null) throw new Error(USAGE);
    launcher = args[++index];
    if (!launcher || launcher.startsWith('--') || launcher.includes('\0')) throw new Error(USAGE);
  }
  return { launcher };
}

// Accept the displayed Apple requirement as a conjunction; unknown expressions fail closed.
// The CLI also asks codesign to evaluate APPLE_REQUIREMENT against the actual signature.
export function parseCodesignIdentity(output) {
  const lines = String(output || '').split(/\r?\n/);
  const identifiers = lines.filter(line => line.startsWith('Identifier=')).map(line => line.slice(11));
  const requirements = lines.filter(line => line.startsWith('designated => ')).map(line => line.slice(14));
  const identifier = identifiers.length === 1 ? identifiers[0] : null;
  const requirement = requirements.length === 1 ? requirements[0] : null;
  const parts = requirement?.split(/\s+and\s+/) || [];
  const expectedIdentifier = 'identifier "' + IDENTIFIER + '"';
  const appleRequirement = parts.length === 2 && parts.includes(expectedIdentifier) && parts.includes('anchor apple');
  return {
    identifier,
    appleRequirement,
    adHoc: lines.some(line => /^Signature=adhoc$/.test(line) || /^CodeDirectory .*\(adhoc\)/.test(line)),
    wellFormed: identifiers.length === 1 && requirements.length === 1 && appleRequirement,
  };
}

// codesign emits XML with --xml. Parse only the plist value grammar, without external
// entities or dependencies, so portable tests can cover missing and nested entitlements.
export function parseCodesignEntitlements(output) {
  try {
    const plists = String(output || '').match(/<plist\b[^>]*>[\s\S]*?<\/plist>/g) || [];
    if (plists.length !== 1) return null;
    const content = plists[0].replace(/^<plist\b[^>]*>/, '').replace(/<\/plist>$/, '');
    const tokens = content.match(/<[^>]+>|[^<]+/g) || [];
    if (tokens.join('') !== content) return null;
    let index = 0;
    const skipSpace = () => { while (tokens[index]?.trim() === '') index += 1; };
    const take = expected => {
      skipSpace();
      if (tokens[index++] !== expected) throw new Error('Malformed plist');
    };
    const textElement = name => {
      take('<' + name + '>');
      const value = tokens[index]?.startsWith('<') ? '' : tokens[index++] || '';
      take('</' + name + '>');
      return value;
    };
    const value = (depth = 0) => {
      if (depth > 64) throw new Error('Nested plist');
      skipSpace();
      const token = tokens[index];
      if (/^<(true|false)\s*\/>$/.test(token)) {
        index += 1;
        return token.startsWith('<true');
      }
      if (/^<(dict|array)\s*\/>$/.test(token)) {
        index += 1;
        return token.startsWith('<dict') ? Object.create(null) : [];
      }
      if (token === '<dict>') {
        index += 1;
        const dict = Object.create(null);
        skipSpace();
        while (tokens[index] !== '</dict>') {
          const key = textElement('key');
          if (Object.hasOwn(dict, key)) throw new Error('Duplicate key');
          dict[key] = value(depth + 1);
          skipSpace();
        }
        take('</dict>');
        return dict;
      }
      if (token === '<array>') {
        index += 1;
        const array = [];
        skipSpace();
        while (tokens[index] !== '</array>') {
          array.push(value(depth + 1));
          skipSpace();
        }
        take('</array>');
        return array;
      }
      const name = /^<(string|integer|real|date|data)>$/.exec(token)?.[1];
      if (name) return textElement(name);
      if (/^<(string|data)\s*\/>$/.test(token)) { index += 1; return ''; }
      throw new Error('Unsupported plist value');
    };
    const parsed = value();
    skipSpace();
    if (index !== tokens.length || !parsed || Array.isArray(parsed) || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function assessLauncher({ strictStatus, appleRequirementStatus, identityStatus, identityOutput, entitlementsStatus, entitlementsOutput }) {
  const identity = parseCodesignIdentity(identityOutput);
  const entitlements = parseCodesignEntitlements(entitlementsOutput);
  const checks = {
    strictSignature: strictStatus === 0,
    appleCodeRequirement: appleRequirementStatus === 0,
    appleDesignatedIdentity: identityStatus === 0 && identity.wellFormed && identity.identifier === IDENTIFIER && !identity.adHoc,
    entitlements: Object.fromEntries(REQUIRED_ENTITLEMENTS.map(key => [key, entitlementsStatus === 0 && entitlements?.[key] === true])),
  };
  const issues = [];
  if (!checks.strictSignature) issues.push('strict-signature-invalid');
  if (!checks.appleCodeRequirement) issues.push('apple-code-requirement-not-met');
  if (!checks.appleDesignatedIdentity) issues.push('apple-designated-identity-invalid');
  for (const [key, present] of Object.entries(checks.entitlements)) {
    if (!present) issues.push('required-entitlement-missing:' + key);
  }
  return { ok: issues.length === 0, checks, issues, remedy: issues.length ? REMEDY : null };
}

function runCommand(command, args) {
  return spawnSync(command, args, { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 });
}

// Only xcrun and codesign are executed. The candidate launcher is always an argument.
export function preflight({ launcher = null, run = runCommand } = {}) {
  if (!launcher) {
    const found = run('/usr/bin/xcrun', ['--find', 'xcodebuild']);
    launcher = found.stdout?.trim();
    if (found.status !== 0 || !launcher || !isAbsolute(launcher) || /[\r\n\0]/.test(launcher)) {
      return { command: 'preflight', launcher: null, ok: false, issues: ['launcher-resolution-failed'], remedy: REMEDY };
    }
  }
  launcher = resolve(launcher);
  const strict = run('/usr/bin/codesign', ['--verify', '--strict', launcher]);
  // '=' makes this literal requirement source; without it codesign treats it as a filename.
  const apple = run('/usr/bin/codesign', ['--verify', '--strict', '--test-requirement', '=' + APPLE_REQUIREMENT, launcher]);
  const identity = run('/usr/bin/codesign', ['--display', '--verbose=4', '--requirements', '-', launcher]);
  const entitlements = run('/usr/bin/codesign', ['--display', '--entitlements', '-', '--xml', launcher]);
  return {
    command: 'preflight',
    launcher,
    ...assessLauncher({
      strictStatus: strict.status,
      appleRequirementStatus: apple.status,
      identityStatus: identity.status,
      identityOutput: (identity.stdout || '') + '\n' + (identity.stderr || ''),
      entitlementsStatus: entitlements.status,
      entitlementsOutput: (entitlements.stdout || '') + '\n' + (entitlements.stderr || ''),
    }),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === '--help') console.log(USAGE);
    else {
      const result = preflight(parseArgs(process.argv.slice(2)));
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
