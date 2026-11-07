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

// A Short moves the device per clip (`shift`) and blends the background over the top and bottom (`fade`), so the
// device can pass under the captions and YouTube's controls without showing an edge. Render a tiny cut from a test
// pattern and read pixels back: the fades are solid background and the second clip's screen sits higher.
const ffmpeg = process.platform === 'darwin' ? spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }) : null;
test('render moves the screen by clip shift and draws solid fades', {
  skip: !swiftc || swiftc.status !== 0 || !ffmpeg || ffmpeg.status !== 0 ? 'needs macOS with Swift and ffmpeg' : false, timeout: 300000,
}, async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'app-preview-'));
  try {
    const source = join(dir, 'source.mov');
    const made = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:size=60x130:rate=30', '-t', '3', '-pix_fmt', 'yuv420p', source]);
    assert.equal(made.status, 0, String(made.stderr));
    const spec = {
      output: join(dir, 'out.mov'), size: [108, 192], fps: 30, background: '#0000FF', crossfade: 0, move: 0.2,
      screen: { x: 24, y: 60, width: 60, height: 130, radius: 6 },
      fade: { top: [40, 30], bottom: [170, 180] },
      clips: [{ file: source, from: 0, to: 1 }, { file: source, from: 1, to: 2, shift: -30 }],
    };
    writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec));
    const rendered = spawnSync('xcrun', ['swift', script, 'render', join(dir, 'spec.json')], { encoding: 'utf8' });
    assert.equal(rendered.status, 0, rendered.stderr);
    const pixel = (seconds, x, y) => {
      const raw = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(seconds), '-i', spec.output, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
      const at = (y * 108 + x) * 3;
      return [...raw.stdout.subarray(at, at + 3)];
    };
    const blue = ([r, g, b]) => b > 200 && r < 60 && g < 60;
    const red = ([r, g, b]) => r > 200 && g < 60 && b < 60;
    assert.ok(blue(pixel(0.5, 54, 10)), 'top fade is solid background');
    assert.ok(blue(pixel(0.5, 54, 186)), 'bottom fade is solid background');
    assert.ok(blue(pixel(0.5, 54, 50)), 'above the unshifted screen is background');
    assert.ok(red(pixel(1.7, 54, 50)), 'the shifted screen has moved up 30 px');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// A clip's zoom scales the device about its focus point: zoomed 2x about the screen's top-left corner, the screen
// covers twice the width to the right of where it started.
test('render zooms the screen about its focus', {
  skip: !swiftc || swiftc.status !== 0 || !ffmpeg || ffmpeg.status !== 0 ? 'needs macOS with Swift and ffmpeg' : false, timeout: 300000,
}, async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'app-preview-'));
  try {
    const source = join(dir, 'source.mov');
    spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:size=40x80:rate=30', '-t', '2', '-pix_fmt', 'yuv420p', source]);
    const spec = {
      output: join(dir, 'out.mov'), size: [108, 192], fps: 30, background: '#0000FF', crossfade: 0,
      screen: { x: 10, y: 20, width: 40, height: 80, radius: 0 },
      clips: [{ file: source, from: 0, to: 0.5 }, { file: source, from: 0.5, to: 1.5, zoom: 2, focus: [0, 0], move: 0.1 }],
    };
    writeFileSync(join(dir, 'spec.json'), JSON.stringify(spec));
    const rendered = spawnSync('xcrun', ['swift', script, 'render', join(dir, 'spec.json')], { encoding: 'utf8' });
    assert.equal(rendered.status, 0, rendered.stderr);
    const pixel = (seconds, x, y) => {
      const raw = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(seconds), '-i', spec.output, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
      const at = (y * 108 + x) * 3;
      return [...raw.stdout.subarray(at, at + 3)];
    };
    const red = ([r, g, b]) => r > 200 && g < 60 && b < 60;
    assert.ok(!red(pixel(0.25, 70, 30)), 'beyond the unzoomed screen is background');
    assert.ok(red(pixel(1.2, 70, 30)), 'the zoomed screen reaches it');
    assert.ok(red(pixel(1.2, 12, 22)), 'the focus corner stays put');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// App Review rejects a preview in a device frame (Guideline 2.3.4): `check` must flag a framed render and pass a
// full-screen one.
test('check flags a device frame and passes a full-screen capture', {
  skip: !swiftc || swiftc.status !== 0 || !ffmpeg || ffmpeg.status !== 0 ? 'needs macOS with Swift and ffmpeg' : false, timeout: 300000,
}, async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'app-preview-frame-'));
  try {
    const source = join(dir, 'source.mov');
    const made = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=90x194:rate=30', '-t', '4', '-pix_fmt', 'yuv420p', source]);
    assert.equal(made.status, 0, String(made.stderr));
    const run = (name, extra) => {
      const spec = { output: join(dir, name + '.mov'), size: [216, 468], fps: 30, background: '#F4EEE1', crossfade: 0,
        clips: [{ file: source, from: 0, to: 3.5 }], ...extra };
      writeFileSync(join(dir, name + '.json'), JSON.stringify(spec));
      const rendered = spawnSync('xcrun', ['swift', script, 'render', join(dir, name + '.json')], { encoding: 'utf8' });
      assert.equal(rendered.status, 0, rendered.stderr);
      return spawnSync('xcrun', ['swift', script, 'check', spec.output], { encoding: 'utf8' }).stdout;
    };
    assert.match(run('framed', { screen: { x: 30, y: 60, width: 156, height: 336, radius: 16, bezel: 4 } }), /device frame/);
    assert.doesNotMatch(run('full', {}), /device frame/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
