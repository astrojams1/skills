// youtube-shorts: the Blender kit. The wrapper's argument checks run everywhere; the kit's own self-test (safe box,
// occlusion, pixel placement) runs where Blender is installed and is skipped elsewhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../../skills/youtube-shorts/scripts/', import.meta.url));
const wrapper = `${dir}blender-short.sh`;
const selftest = `${dir}blender/selftest.py`;
const BLENDER = process.env.BLENDER
  || ['/Applications/Blender.app/Contents/MacOS/Blender'].find(existsSync)
  || (spawnSync('blender', ['--version']).error ? null : 'blender');

test('the wrapper prints its usage and refuses to run without a scene and an output folder', () => {
  const r = spawnSync('bash', [wrapper], { encoding: 'utf8' });
  assert.equal(r.status, 64);
  assert.match(r.stdout, /SCENE\.py OUT_DIR/);
});

test('on the Mac the wrapper refuses an output folder off the SSD', { skip: process.platform !== 'darwin' }, () => {
  const r = spawnSync('bash', [wrapper, selftest, '/tmp/blender-short-test-out'], { encoding: 'utf8' });
  assert.equal(r.status, 64);
  assert.match(r.stderr, /must be on \/Volumes\/ssd/);
});

test('the kit passes a good caption and catches a hidden or covered one', { skip: !BLENDER && 'Blender not installed', timeout: 300000 }, () => {
  const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python-exit-code', '1', '-P', selftest], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.split('\n').filter(l => /FAIL|Error|Traceback/.test(l)).join('\n'));
  assert.match(r.stdout, /selftest: ok/);
});
