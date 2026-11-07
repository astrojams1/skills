import test from 'node:test';
import assert from 'node:assert/strict';
import { listingCharacterProblems } from '../../skills/app-release/scripts/asc.mjs';

test('pictographic symbols in store copy are refused before any write', () => {
  const problems = listingCharacterProblems({ name: 'Giraffe', description: 'Hold the ✓ button', keywords: 'abc,🦒' });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /description contains "✓"/);
  assert.match(problems[1], /keywords contains "🦒"/);
});

test('ordinary punctuation, accents and bullets pass', () => {
  assert.deepEqual(listingCharacterProblems({ description: 'Calm • kind — “quiet” café, 5–8 years', subtitle: 'Say a letter' }), []);
});
