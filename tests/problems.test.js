import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERNS, PROBLEMS, slugify } from '../js/data/problems.js';

test('150 problems, 75 in Blind 75, 18 patterns', () => {
  assert.equal(PROBLEMS.length, 150);
  assert.equal(PROBLEMS.filter((problem) => problem.blind75).length, 75);
  assert.equal(PATTERNS.length, 18);
});

test('ids are unique', () => {
  const ids = new Set(PROBLEMS.map((problem) => problem.id));
  assert.equal(ids.size, PROBLEMS.length);
});

test('slugs match LeetCode URLs', () => {
  assert.equal(slugify('Pow(x, n)'), 'powx-n');
  assert.equal(slugify('Two Sum II - Input Array Is Sorted'), 'two-sum-ii-input-array-is-sorted');
  assert.equal(slugify('Implement Trie (Prefix Tree)'), 'implement-trie-prefix-tree');
  assert.equal(slugify('Time Based Key-Value Store'), 'time-based-key-value-store');
  assert.equal(slugify('3Sum'), '3sum');
});
