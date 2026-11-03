#!/usr/bin/env node
// soundtrack.mjs
// Gives a silent Short a soundtrack: a light synthesised music bed plus sound effects on cue (typing, taps, pops, a
// whoosh, a ding), all generated here so nothing needs a licence, mixed under the video and normalised for YouTube
// (about -14 LUFS, true peak -1.5 dBTP). Node 22; ffmpeg only for the final mux.
//
//   node soundtrack.mjs <spec.json>            writes spec.output (the video with sound)
//   node soundtrack.mjs <spec.json> --wav out.wav   writes the mixed soundtrack alone (no ffmpeg needed)
//
// A spec (paths relative to the spec file):
// {
//   "video": "short-silent.mp4", "output": "short.mp4", "duration": 12.4,
//   "music": { "bpm": 112, "key": "F", "gain": 0.18, "from": 0 },     omit or false for effects only
//   "cues": [ { "at": 0.2, "sound": "type", "until": 2.6 }, { "at": 3.1, "sound": "tap" }, { "at": 3.4, "sound": "whoosh" },
//             { "at": 5.0, "sound": "pop" }, { "at": 5.2, "sound": "pop" }, { "at": 6.0, "sound": "ding", "gain": 0.8 } ]
// }
// "duration" defaults to the video's. Sounds: type (clicks from at to until), tap, pop, whoosh, ding.
// For a Short people may also swap the bed for a track from YouTube's audio library while uploading; keep the
// effects, which carry the timing.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const RATE = 48000;

// A small seeded generator, so a soundtrack renders the same every time.
function random(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Adds a mono sound into a stereo buffer at a time, with gain and pan (-1 left … 1 right).
function place(mix, sound, at, gain = 1, pan = 0) {
  const start = Math.round(at * RATE);
  const left = gain * Math.min(1, 1 - pan), right = gain * Math.min(1, 1 + pan);
  for (let i = 0; i < sound.length; i += 1) {
    const j = start + i;
    if (j < 0 || j >= mix[0].length) continue;
    mix[0][j] += sound[i] * left;
    mix[1][j] += sound[i] * right;
  }
}

function make(seconds, fn) {
  const out = new Float32Array(Math.round(seconds * RATE));
  for (let i = 0; i < out.length; i += 1) out[i] = fn(i / RATE, i);
  return out;
}

// One-pole high-pass, to thin noise into clicks and hats.
function highpass(samples, amount = 0.9) {
  let previousIn = 0, previousOut = 0;
  return samples.map(x => (previousOut = amount * (previousOut + x - previousIn), previousIn = x, previousOut));
}

const noise = random(7);
const sounds = {
  kick: () => { let phase = 0; return make(0.4, t => { phase += 2 * Math.PI * (45 + 105 * Math.exp(-t * 28)) / RATE; return Math.sin(phase) * Math.exp(-t * 9); }); },
  clap: () => highpass(make(0.2, t => (noise() * 2 - 1) * (Math.exp(-t * 22) + (t > 0.012 ? 0.6 * Math.exp(-(t - 0.012) * 30) : 0))), 0.85),
  hat: () => highpass(make(0.05, t => (noise() * 2 - 1) * Math.exp(-t * 90)), 0.6),
  bass: f => make(0.26, t => (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(6 * Math.PI * f * t)) * Math.min(1, t * 200) * Math.exp(-t * 6)),
  pluck: f => make(0.35, t => (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(4 * Math.PI * f * t)) * Math.min(1, t * 400) * Math.exp(-t * 11)),
  type: () => highpass(make(0.012, t => (noise() * 2 - 1) * Math.exp(-t * 600) + 0.4 * Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 900)), 0.7),
  tap: () => make(0.08, t => 0.8 * Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t * 60) + (t < 0.004 ? (noise() * 2 - 1) * 0.6 : 0)),
  pop: () => { let phase = 0; return make(0.14, t => { phase += 2 * Math.PI * (420 + 600 * Math.min(1, t / 0.05)) / RATE; return Math.sin(phase) * Math.min(1, t * 900) * Math.exp(-t * 32); }); },
  whoosh: () => { let low = 0; return make(0.45, t => { const env = Math.sin(Math.PI * Math.min(1, t / 0.45)) ** 2; const k = 0.02 + 0.25 * env; low += k * ((noise() * 2 - 1) - low); return low * env * 2.2; }); },
  ding: () => make(1.2, t => (Math.sin(2 * Math.PI * 1318.5 * t) + 0.5 * Math.sin(2 * Math.PI * 1975.5 * t) + 0.2 * Math.sin(2 * Math.PI * 2637 * t)) * Math.min(1, t * 600) * Math.exp(-t * 4) * 0.5),
};

const KEYS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// I–V–vi–IV, one chord a bar, as semitones above the key's root.
const PROGRESSION = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]];
const pitch = semitones => 440 * 2 ** ((semitones - 9) / 12);

function music(mix, { bpm = 112, key = 'F', gain = 0.18, from = 0 }, duration) {
  const beat = 60 / bpm, root = (KEYS[key] ?? 5) - 12;
  const kick = sounds.kick(), clap = sounds.clap(), hat = sounds.hat();
  for (let b = 0; from + b * beat < duration; b += 1) {
    const t = from + b * beat, bar = Math.floor(b / 4), chord = PROGRESSION[bar % 4];
    place(mix, kick, t, gain * 0.6);
    if (b % 2 === 1) place(mix, clap, t, gain * 0.35);
    place(mix, hat, t + beat / 2, gain * 0.25, 0.3);
    place(mix, sounds.bass(pitch(root - 12 + chord[0])), t + beat / 2, gain * 0.45);
    for (let n = 0; n < 2; n += 1) {
      const note = chord[(b * 2 + n) % 3] + 12;
      place(mix, sounds.pluck(pitch(root + note)), t + n * beat / 2, gain * 0.22, n ? 0.25 : -0.25);
    }
  }
}

function cue(mix, c) {
  const gain = c.gain ?? 1;
  if (c.sound === 'type') {
    const r = random(Math.round(c.at * 1000)), click = sounds.type();
    for (let t = c.at; t < (c.until ?? c.at + 1); t += 0.07 + r() * 0.07) place(mix, click, t, gain * (0.26 + r() * 0.14), r() - 0.5);
    return;
  }
  if (!sounds[c.sound]) throw new Error(`Unknown sound "${c.sound}"`);
  const level = { tap: 0.55, pop: 0.6, whoosh: 0.5, ding: 0.55 }[c.sound] ?? 0.5;
  place(mix, sounds[c.sound](), c.at, gain * level);
}

function wav(mix) {
  const frames = mix[0].length, data = Buffer.alloc(frames * 4);
  for (let i = 0; i < frames; i += 1) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[0][i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[1][i])) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

export function soundtrack(spec, duration) {
  const mix = [new Float32Array(Math.round(duration * RATE)), new Float32Array(Math.round(duration * RATE))];
  if (spec.music) music(mix, spec.music === true ? {} : spec.music, duration);
  for (const c of spec.cues ?? []) cue(mix, c);
  // Fade the last 0.3 s so the loop back to the start does not click, then keep the peak under full scale.
  const fade = Math.round(0.3 * RATE);
  let peak = 0;
  for (const channel of mix) {
    for (let i = 0; i < fade; i += 1) channel[channel.length - 1 - i] *= i / fade;
    for (const x of channel) peak = Math.max(peak, Math.abs(x));
  }
  if (peak > 0.89) for (const channel of mix) for (let i = 0; i < channel.length; i += 1) channel[i] *= 0.89 / peak;
  return mix;
}

function videoDuration(file) {
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(`ffprobe could not read ${file}: ${probe.stderr}`);
  return Number(probe.stdout.trim());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [specPath, flag, wavOut] = process.argv.slice(2);
  if (!specPath) { console.error('usage: node soundtrack.mjs <spec.json> [--wav out.wav]'); process.exit(2); }
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const at = p => resolve(dirname(resolve(specPath)), p);
  const duration = spec.duration ?? videoDuration(at(spec.video));
  const audio = wav(soundtrack(spec, duration));
  if (flag === '--wav') { writeFileSync(wavOut, audio); console.log(`wrote ${wavOut}: ${duration.toFixed(2)} s`); process.exit(0); }
  const dir = mkdtempSync(join(tmpdir(), 'soundtrack-'));
  try {
    writeFileSync(join(dir, 'mix.wav'), audio);
    // One fixed gain towards spec.loudness (default -14 LUFS) into a 4x-oversampled limiter at -3 dBFS (AAC adds about a decibel), so effect
    // transients stay under -1.5 dBTP after AAC encoding; the limiter costs loudness, so measure twice. (loudnorm
    // falls back to its dynamic mode on a short, peaky clip and ramps the first seconds up from quiet.)
    const target = spec.loudness ?? -14;
    const chain = gain => `volume=${gain.toFixed(2)}dB,aresample=192000,alimiter=limit=0.7:level=false:attack=1,aresample=48000`;
    const measure = filter => Number(spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', join(dir, 'mix.wav'), '-af', `${filter}ebur128`, '-f', 'null', '-'],
      { encoding: 'utf8' }).stderr.match(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/)[1]);
    let gain = target - measure('');
    gain = Math.min(gain + (target - measure(`${chain(gain)},`)), gain + 6);
    const muxed = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', at(spec.video), '-i', join(dir, 'mix.wav'), '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-af', chain(gain), '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', at(spec.output)], { encoding: 'utf8' });
    if (muxed.status !== 0) throw new Error(muxed.stderr);
    console.log(`wrote ${at(spec.output)}: ${duration.toFixed(2)} s with ${(spec.cues ?? []).length} cues${spec.music ? ' and music' : ''}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
