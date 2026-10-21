// youtube-shorts: the zones file is self-consistent and the overlay script
// draws it. The ffmpeg run is skipped where ffmpeg is not installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadZones, overlayFilters, sheetFilters, parseDuration, sheetLayout } from '../../skills/youtube-shorts/scripts/safe-zone.mjs';

const script = fileURLToPath(new URL('../../skills/youtube-shorts/scripts/safe-zone.mjs', import.meta.url));
const zones = loadZones();
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const hasFfmpeg = !spawnSync(FFMPEG, ['-version']).error;

const inside = (a, b) => a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
const gap = (a, b) => Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width), b.y - (a.y + a.height), a.y - (b.y + b.height));
const pngSize = file => { const b = readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('every zone lies inside the frame', () => {
  const frame = { x: 0, y: 0, ...zones.frame };
  for (const z of [...zones.keepOut, zones.safe, zones.safeAboveRail]) assert.ok(inside(z, frame), JSON.stringify(z));
});

test('the safe areas clear every keep-out zone by the margin', () => {
  for (const area of [zones.safe, zones.safeAboveRail]) {
    for (const z of zones.keepOut) assert.ok(gap(area, z) >= zones.margin, `${z.id} is ${gap(area, z)} px from the safe area`);
  }
});

test('the room above the rail extends the safe box and does not reach below the rail top', () => {
  const rail = zones.keepOut.find(z => z.id === 'rail');
  assert.equal(zones.safeAboveRail.x, zones.safe.x);
  assert.equal(zones.safeAboveRail.y, zones.safe.y);
  assert.ok(zones.safeAboveRail.x + zones.safeAboveRail.width > zones.safe.x + zones.safe.width);
  assert.ok(zones.safeAboveRail.y + zones.safeAboveRail.height + zones.margin <= rail.y);
});

test('the overlay draws each keep-out zone and both safe boxes on the zones canvas', () => {
  const filters = overlayFilters(zones);
  assert.equal(filters[0], 'scale=1080:1920:flags=bicubic');
  assert.equal(filters.filter(f => f.startsWith('drawbox') && f.endsWith(':t=fill')).length, zones.keepOut.length);
  assert.ok(filters.includes(`drawbox=x=${zones.safe.x}:y=${zones.safe.y}:w=${zones.safe.width}:h=${zones.safe.height}:color=0x00ff66@0.95:t=5`));
  const sheet = sheetFilters(zones, { every: 2, cols: 6, rows: 3, tile: 270 });
  assert.equal(sheet[0], 'fps=1/2');
  assert.match(sheet.at(-1), /^tile=6x3:/);
});

test('durations parse from ffmpeg output and lay out into rows', () => {
  assert.equal(parseDuration('  Duration: 00:00:32.03, start: 0.000000'), 32.03);
  assert.equal(parseDuration('  Duration: 01:02:03.5, start'), 3723.5);
  assert.equal(parseDuration('no duration'), null);
  // A film exactly 32 s long has no frame at 32 s: an extra row would be empty.
  assert.deepEqual(sheetLayout(32, 2, 6), { count: 16, rows: 3, legend: ['row 1: 0.0–10.0 s', 'row 2: 12.0–22.0 s', 'row 3: 24.0–30.0 s'] });
  assert.equal(sheetLayout(32, 1, 8).rows, 4);
  assert.equal(sheetLayout(32.03, 1, 8).rows, 5);
});

test('a video becomes a contact sheet and a still keeps its size', { skip: !hasFfmpeg && 'ffmpeg not installed' }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'shorts-'));
  try {
    const video = path.join(dir, 'clip.mp4'), still = path.join(dir, 'still.png');
    const make = ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=540x960:rate=10:duration=3'];
    assert.equal(spawnSync(FFMPEG, [...make, '-pix_fmt', 'yuv420p', video]).status, 0);
    assert.equal(spawnSync(FFMPEG, [...make, '-frames:v', '1', still]).status, 0);
    const run = (...a) => spawnSync(process.execPath, [script, ...a], { encoding: 'utf8' });
    const sheet = run(video, '--every', '1', '--cols', '2', '--tile', '100');
    assert.equal(sheet.status, 0, sheet.stderr);
    assert.match(sheet.stdout, /row 2: 2\.0–2\.0 s/);
    assert.deepEqual(pngSize(path.join(dir, 'clip-safe-zone.png')), [2 * 100 + 3 * 6, 2 * 178 + 3 * 6]);
    const one = run(still);
    assert.equal(one.status, 0, one.stderr);
    assert.deepEqual(pngSize(path.join(dir, 'still-safe-zone.png')), [1080, 1920]);
    const at = run(video, '--at', '1.5');
    assert.equal(at.status, 0, at.stderr);
    assert.deepEqual(pngSize(path.join(dir, 'clip-safe-zone-1.5s.png')), [1080, 1920]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
