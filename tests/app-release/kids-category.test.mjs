// The Kids Category check: App Review holds a Kids Category app until its notes answer the four Guideline 1.3 questions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { kidsReviewNotesProblems } from '../../skills/app-release/scripts/asc.mjs';

const kids = { kidsAgeBand: 'FIVE_AND_UNDER' };
const answered = [
  'Kids Category (Guideline 1.3):',
  '1. Third-party analytics: none; the app contains no analytics or third-party SDKs.',
  '2. Third-party advertising: none. The app shows no ads.',
  '3. Data shared with third parties: none.',
  '4. Other data collection: none. The app collects no user or device data.',
].join('\n');

test('apps outside the Kids Category owe no answers', () => {
  assert.deepEqual(kidsReviewNotesProblems({ kidsAgeBand: null }, ''), []);
  assert.deepEqual(kidsReviewNotesProblems({ advertising: false }, undefined), []);
  assert.deepEqual(kidsReviewNotesProblems(undefined, undefined), []);
});

test('notes answering all four questions pass', () => {
  assert.deepEqual(kidsReviewNotesProblems(kids, answered), []);
});

test('missing or empty notes leave every question unanswered', () => {
  for (const notes of [undefined, null, '']) assert.equal(kidsReviewNotesProblems(kids, notes).length, 4);
});

test('a general privacy line answers collection and ads but not analytics or third-party sharing', () => {
  // Giraffe Stretch's first notes said only this much, and App Review asked the remaining questions.
  const problems = kidsReviewNotesProblems(kids, 'The app collects no data and shows no ads.');
  assert.equal(problems.length, 2);
  assert.match(problems[0], /^third-party analytics/);
  assert.match(problems[1], /^data shared with third parties/);
});

test('Family Sharing is not an answer about sharing data with third parties', () => {
  const problems = kidsReviewNotesProblems(kids, 'Purchases are shared with the family through Family Sharing. No analytics, no ads, nothing collected.');
  assert.deepEqual(problems.map(problem => problem.split(' (')[0]), ['data shared with third parties']);
});
