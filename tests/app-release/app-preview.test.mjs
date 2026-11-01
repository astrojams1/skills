// app-preview.test.mjs
// app-preview.swift is macOS-only (AVFoundation); on a Mac with Swift, make sure it still type-checks.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../skills/app-release/scripts/app-preview.swift', import.meta.url));
const swiftc = process.platform === 'darwin' ? spawnSync('xcrun', ['--find', 'swiftc'], { encoding: 'utf8' }) : null;

test('app-preview.swift type-checks', { skip: !swiftc || swiftc.status !== 0 ? 'needs macOS with Swift' : false, timeout: 180000 }, () => {
  const result = spawnSync('xcrun', ['swiftc', '-typecheck', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
