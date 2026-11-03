// soundtrack.test.mjs
// soundtrack.mjs synthesises its sounds itself, so the mix can be checked without ffmpeg: the right length, silent
// where nothing is cued, sound where a cue lands, and never over full scale.

import test from 'node:test';
import assert from 'node:assert/strict';
import { soundtrack } from '../../skills/youtube-shorts/scripts/soundtrack.mjs';

const RATE = 48000;
const peak = (mix, from, to) => mix[0].subarray(Math.round(from * RATE), Math.round(to * RATE)).reduce((m, x) => Math.max(m, Math.abs(x)), 0);

test('cues land where they are placed and nowhere else', () => {
  const mix = soundtrack({ cues: [{ at: 1, sound: 'pop' }, { at: 2, sound: 'type', until: 2.5 }] }, 3);
  assert.equal(mix[0].length, 3 * RATE);
  assert.equal(peak(mix, 0, 0.99), 0);
  assert.ok(peak(mix, 1, 1.1) > 0.05, 'the pop sounds');
  assert.equal(peak(mix, 1.3, 1.99), 0);
  assert.ok(peak(mix, 2, 2.5) > 0.01, 'the typing sounds');
});

test('music fills the clip, fades out at the end and stays under full scale', () => {
  const mix = soundtrack({ music: true, cues: [{ at: 0.5, sound: 'ding' }, { at: 0.5, sound: 'whoosh' }] }, 4);
  assert.ok(peak(mix, 0, 4) <= 0.9);
  assert.ok(peak(mix, 2, 3) > 0.01, 'the bed plays');
  assert.equal(Math.abs(mix[0][mix[0].length - 1]), 0);
});

test('an unknown sound is an error', () => {
  assert.throws(() => soundtrack({ cues: [{ at: 0, sound: 'airhorn' }] }, 1), /Unknown sound/);
});
