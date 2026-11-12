import test from 'node:test';
import assert from 'node:assert/strict';
import { identityProblems, identityRefusal, rejectionAdvice, kidsRejectionAdvice } from '../../skills/app-release/scripts/asc.mjs';

const app = (id, name, bundleId, sku = bundleId) => ({ id, attributes: { name, bundleId, sku } });

// Giraffe Stretch 1.0 was rejected under 4.3 and 4.2.6 on 2026-11-12: its bundle ID ended in "test1", and two earlier
// records of the same game had sat on the team beside it.
const giraffe = app('6828973581', 'Giraffe Stretch: ABC', 'com.ouro.giraffestretchtest1', 'giraffe-stretch-test-1');

test('a test-named bundle ID and SKU and a duplicate record are named', () => {
  const problems = identityProblems(giraffe, [
    giraffe,
    app('6828550236', 'Stretch the Giraffe: ABC', 'com.ouro.stretch'),
    app('6828975001', 'Hanzi Cards: Learn Mandarin', 'com.ouro.hanzicards'),
  ]);
  assert.equal(problems.length, 3);
  assert.match(problems[0], /bundleId "com\.ouro\.giraffestretchtest1" contains "giraffestretchtest1"/);
  assert.match(problems[1], /sku "giraffe-stretch-test-1" contains "test"/);
  assert.match(problems[2], /Stretch the Giraffe: ABC.*shares the words stretch, giraffe/);
});

test('distinct apps on one team pass', () => {
  const pipsqueak = app('1', 'Pipsqueak: Speech Practice', 'com.ouro.pipsqueak');
  const others = [
    app('2', 'Hanzi Cards: Learn Mandarin', 'com.ouro.hanzicards'),
    app('3', 'Nametag: Little Hellos', 'com.ouro.nametag'),
    app('4', 'Füd: Family Food Tracker', 'com.ouro.fud'),
    app('5', 'Care Near', 'com.ouro.carenear'),
  ];
  assert.deepEqual(identityProblems(pipsqueak, others), []);
  // Shared filler words (kids, learn, abc, game) do not make two apps the same.
  assert.deepEqual(identityProblems(app('6', 'ABC Kids: Learn Shapes', 'com.x.shapes'), [app('7', 'ABC Kids: Learn Numbers', 'com.x.numbers')]), []);
  // Words that merely contain "test" are not placeholders.
  assert.deepEqual(identityProblems(app('8', 'Contest Timer', 'com.x.latest'), []), []);
});

test('a waiver accepts a placeholder that cannot change, never a duplicate', () => {
  const placeholderOnly = identityProblems(giraffe, []);
  assert.match(identityRefusal(placeholderOnly, undefined), /Guideline 4\.3.*Nothing was submitted/);
  assert.equal(identityRefusal(placeholderOnly, 'Bundle ID is fixed on this record; explained to App Review'), null);
  assert.equal(identityRefusal(placeholderOnly, '  '), identityRefusal(placeholderOnly, undefined));
  const withDuplicate = identityProblems(giraffe, [app('6828550236', 'Stretch the Giraffe: ABC', 'com.ouro.stretch')]);
  assert.match(identityRefusal(withDuplicate, 'any reason'), /Stretch the Giraffe/);
  assert.equal(identityRefusal([], undefined), null);
});

test('every rejected version is told to check the guideline, and a 4.3 notice is not resubmitted', () => {
  for (const ageRating of [{ kidsAgeBand: 'FIVE_AND_UNDER' }, { kidsAgeBand: null }, undefined]) {
    const advice = rejectionAdvice(ageRating, 'REJECTED');
    assert.match(advice, /guideline it cites/);
    assert.match(advice, /4\.3 \(Spam\) or 4\.2\.6, do not run `submit --confirm`/);
  }
  assert.match(kidsRejectionAdvice({ kidsAgeBand: 'FIVE_AND_UNDER' }, 'REJECTED'), /Guideline 1\.3/);
  assert.equal(rejectionAdvice({ kidsAgeBand: 'FIVE_AND_UNDER' }, 'WAITING_FOR_REVIEW'), null);
});
