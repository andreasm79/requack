import test from 'node:test';
import assert from 'node:assert/strict';
import { HUNTS, parseMarked } from '../js/data/hunts.js';
import { buildHuntPrompt, normalizeGeneratedHunt } from '../js/core/huntgen.js';
import { sanitize } from '../js/core/store.js';

test('every built-in hunt has marked bug lines and clean code', () => {
  const ids = new Set();
  for (const hunt of HUNTS) {
    ids.add(hunt.id);
    assert.ok(hunt.scenario && hunt.explanation && hunt.fix, hunt.id);
    assert.ok(hunt.files.some((file) => file.bugs.length > 0), hunt.id);
    for (const file of hunt.files) {
      assert.ok(file.lines.length > 0, hunt.id);
      for (const line of file.lines) assert.ok(!line.includes('!!'), `${hunt.id}: stray marker`);
      for (const index of file.bugs) assert.ok(file.lines[index].trim().length > 0, `${hunt.id}: empty bug line`);
    }
  }
  assert.equal(ids.size, HUNTS.length);
  assert.equal(HUNTS.length, 18);
});

test('markers are stripped and indentation survives', () => {
  const parsed = parseMarked('\ndef f(x):\n!!    return x + 1\n');
  assert.deepEqual(parsed.lines, ['def f(x):', '    return x + 1']);
  assert.deepEqual(parsed.bugs, [1]);
});

test('the bugs behave as described (JavaScript ones run for real)', () => {
  assert.deepEqual([5, 10, 40].sort()[1], 40);
  assert.deepEqual(['12', '7', '30'].map(parseInt), [12, NaN, NaN]);
  const defaults = { n: { email: true } };
  const copy = { ...defaults };
  copy.n.email = false;
  assert.equal(defaults.n.email, false);
  const promise = (async () => null)();
  assert.ok(promise);
});

test('a generated hunt is validated and survives storage', () => {
  const raw = {
    title: 'Cart total drifts',
    difficulty: 'Hard',
    tag: 'Floats',
    scenario: 'Totals are off by a cent.',
    explanation: 'Floating point.',
    fix: 'use integers',
    files: [{ name: 'cart.py', code: 'def total(items):\n!!    return sum(i.price for i in items)\n' }],
  };
  const hunt = normalizeGeneratedHunt(raw, 'python');
  assert.equal(hunt.files[0].bugs[0], 1);
  assert.equal(hunt.files[0].lines[1], '    return sum(i.price for i in items)');
  const stored = sanitize({ custom: [{ ...hunt, id: 'custom-x' }] }).custom[0];
  assert.deepEqual(stored.files, hunt.files);
  assert.equal(stored.pattern, 'Bug hunts');
});

test('generated hunts without a marked bug or with junk are rejected', () => {
  assert.equal(normalizeGeneratedHunt(null, 'python'), null);
  assert.equal(normalizeGeneratedHunt({ title: 't', scenario: 's', explanation: 'e', files: [{ name: 'a', code: 'x = 1' }] }, 'python'), null);
  assert.equal(normalizeGeneratedHunt({ title: '', scenario: 's', explanation: 'e', files: [{ name: 'a', code: '!!x = 1' }] }, 'python'), null);
  assert.ok(buildHuntPrompt('java', 'race conditions').includes('Java'));
});
