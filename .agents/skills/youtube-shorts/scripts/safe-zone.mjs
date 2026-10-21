#!/usr/bin/env node
// Draws YouTube's measured keep-out zones and the safe box over a vertical
// video or still, so what the player hides can be seen before uploading.
//
//   node safe-zone.mjs <video|image> [--every 1] [--cols 6] [--tile 270] [--at <s>] [--out <png>] [--zones <json>]
//
// A video becomes a contact sheet: one tile every --every seconds, read left
// to right, top to bottom. --at gives one full-size frame instead. A still
// (a cover, a storyboard frame) is drawn full size. Red is hidden or cropped
// on a phone; the green box is where information belongs; the yellow box is
// the extra room above the action rail. Needs ffmpeg (or FFMPEG=/path).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const STILL = /\.(png|jpe?g|webp|bmp|tiff?)$/i;

export function loadZones(file = path.join(here, '..', 'assets', 'zones.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

// The filter chain that normalizes a frame to the zones' canvas and draws them.
export function overlayFilters(zones) {
  const { width, height } = zones.frame;
  const box = (z, color, t) => `drawbox=x=${z.x}:y=${z.y}:w=${z.width}:h=${z.height}:color=${color}:t=${t}`;
  return [
    `scale=${width}:${height}:flags=bicubic`,
    ...zones.keepOut.map(z => box(z, 'red@0.3', 'fill')),
    box(zones.safeAboveRail, 'yellow@0.9', 3),
    box(zones.safe, '0x00ff66@0.95', 5),
  ];
}

export function sheetFilters(zones, { every, cols, rows, tile }) {
  return [`fps=1/${every}`, ...overlayFilters(zones), `scale=${tile}:-2`, `tile=${cols}x${rows}:padding=6:margin=6:color=0x202020`];
}

export function parseDuration(text) {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

export function sheetLayout(duration, every, cols) {
  const count = Math.floor(duration / every + 1e-9) + 1;
  const rows = Math.ceil(count / cols);
  const legend = Array.from({ length: rows }, (_, r) => {
    const first = r * cols * every;
    const last = Math.min(count - 1, (r + 1) * cols - 1) * every;
    return `row ${r + 1}: ${first.toFixed(1)}–${last.toFixed(1)} s`;
  });
  return { count, rows, legend };
}

function args(argv) {
  const out = { every: 1, cols: 6, tile: 270 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out.input = a; continue; }
    const key = a.slice(2), value = argv[++i];
    out[key] = ['every', 'cols', 'tile', 'at'].includes(key) ? Number(value) : value;
  }
  return out;
}

function run(list) {
  const r = spawnSync(FFMPEG, list, { encoding: 'utf8' });
  if (r.error) throw new Error(`cannot run ${FFMPEG}: ${r.error.message} (install ffmpeg or set FFMPEG)`);
  return r;
}

function main() {
  const o = args(process.argv.slice(2));
  if (!o.input) {
    console.error('usage: node safe-zone.mjs <video|image> [--every 1] [--cols 6] [--tile 270] [--at <s>] [--out <png>] [--zones <json>]');
    process.exit(2);
  }
  const zones = loadZones(o.zones);
  const out = o.out || o.input.replace(/\.[^.]+$/, '') + (o.at != null ? `-safe-zone-${o.at}s.png` : '-safe-zone.png');
  let list;
  if (STILL.test(o.input) || o.at != null) {
    list = [...(o.at != null ? ['-ss', String(o.at)] : []), '-i', o.input, '-frames:v', '1', '-vf', overlayFilters(zones).join(',')];
  } else {
    const duration = parseDuration(run(['-hide_banner', '-i', o.input]).stderr);
    if (!duration) throw new Error(`no duration found for ${o.input}`);
    const { rows, legend } = sheetLayout(duration, o.every, o.cols);
    list = ['-i', o.input, '-frames:v', '1', '-vf', sheetFilters(zones, { ...o, rows }).join(',')];
    console.log(legend.join('\n'));
  }
  const r = run(['-v', 'error', '-y', ...list, out]);
  if (r.status !== 0) throw new Error(r.stderr.trim() || `ffmpeg exited ${r.status}`);
  console.log(out);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}
