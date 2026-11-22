import test from 'node:test';
import assert from 'node:assert/strict';
import { ratingFor, sameAnswer, show, verdict } from '../js/core/judge.js';
import { starterCode } from '../js/core/starter.js';
import { RUNNABLE } from '../js/data/runnable.js';
import { RUNNABLE_IDS } from '../js/data/runnable-index.js';
import { PROBLEMS } from '../js/data/problems.js';
import { buildProblems, renderIndex, renderModule } from '../scripts/build-problems.mjs';
import { readFileSync } from 'node:fs';

test('comparison modes', () => {
  assert.ok(sameAnswer([1, 2], [1, 2]));
  assert.ok(!sameAnswer([1, 2], [2, 1]));
  assert.ok(sameAnswer([1, 2], [2, 1], 'unordered'));
  assert.ok(sameAnswer([['ate', 'tea'], ['bat']], [['bat'], ['tea', 'ate']], 'groups'));
  assert.ok(!sameAnswer([['a'], ['b']], [['a', 'b']], 'groups'));
  assert.ok(sameAnswer([[-1, 0, 1]], [[0, 1, -1]], 'sets'));
  assert.ok(sameAnswer(true, true));
  assert.ok(!sameAnswer(1, true));
  assert.ok(!sameAnswer(null, 0));
  assert.ok(!sameAnswer([1], null, 'unordered'));
});

test('show trims long values', () => {
  assert.equal(show([1, 2]), '[1, 2]');
  assert.ok(show(Array.from({ length: 500 }, (_, i) => i)).endsWith('…'));
});

test('verdict and rating', () => {
  assert.deepEqual(verdict([{ status: 'pass' }, { status: 'fail' }]), { passed: 1, total: 2, allPassed: false });
  assert.equal(ratingFor(0, 5), 'again');
  assert.equal(ratingFor(3, 5), 'hard');
  assert.equal(ratingFor(5, 5), 'good');
});

test('every runnable problem maps to a NeetCode problem and has examples and tests', () => {
  const ids = new Set(PROBLEMS.map((problem) => problem.id));
  for (const problem of RUNNABLE) {
    assert.ok(ids.has(problem.id), problem.id);
    assert.ok(problem.examples.length >= 2, problem.id);
    assert.ok(problem.tests.length >= 20, problem.id);
    for (const t of [...problem.examples, ...problem.tests]) assert.equal(t.args.length, problem.params.length, problem.id);
    assert.ok(starterCode(problem, 'python').startsWith(`def ${problem.fn.python}(`));
    assert.ok(starterCode(problem, 'javascript').includes(`function ${problem.fn.js}(`));
  }
  assert.deepEqual(RUNNABLE_IDS, RUNNABLE.map((problem) => problem.id));
});

test('generated problem modules are up to date', () => {
  const problems = buildProblems();
  const read = (name) => readFileSync(new URL(`../js/data/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(read('runnable.js'), renderModule(problems), 'run npm run build:problems');
  assert.equal(read('runnable-index.js'), renderIndex(problems), 'run npm run build:problems');
});
