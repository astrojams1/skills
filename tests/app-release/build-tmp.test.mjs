// build-tmp.test.mjs
// A release build's TMPDIR starts empty and private, so Metro cannot reuse another checkout's cached transforms.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freshBuildTmp } from '../../skills/app-release/scripts/lib/build-tmp.mjs';

test('each build gets an empty, owner-only temporary folder inside its output folder', () => {
  const out = mkdtempSync(join(tmpdir(), 'build-tmp-test-'));
  try {
    mkdirSync(join(out, 'tmp', 'metro-cache'), { recursive: true });
    writeFileSync(join(out, 'tmp', 'metro-cache', 'stale'), 'other checkout');
    const dir = freshBuildTmp(out);
    assert.equal(dir, join(out, 'tmp'));
    assert.deepEqual(readdirSync(dir), []);
    assert.equal(statSync(dir).mode & 0o777, 0o700);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
