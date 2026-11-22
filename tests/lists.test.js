import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, titleFromSlug } from '../js/core/lists.js';
import { sanitize, store } from '../js/core/store.js';
import { activeProblems, listProblems, newQueue } from '../js/core/stats.js';
import { todayKey } from '../js/core/dates.js';
import { PROBLEMS } from '../js/data/problems.js';

test('import matches URLs, numbered titles and CSV rows, and keeps the rest as new problems', () => {
  const text = [
    'https://leetcode.com/problems/two-sum/',
    '146. LRU Cache',
    '"Merge Intervals",Medium,64.2%',
    '#200 - Number of Islands (Medium)',
    'https://leetcode.com/problems/minimum-path-sum/description/',
    'Design a parking lot',
    'two sum',
    '',
  ].join('\n');
  const { matched, unmatched } = parseImport(text);
  assert.deepEqual(matched, ['two-sum', 'lru-cache', 'merge-intervals', 'number-of-islands']);
  assert.deepEqual(unmatched.map((item) => item.title), ['Minimum Path Sum', 'Design a parking lot']);
  assert.equal(unmatched[0].url, 'https://leetcode.com/problems/minimum-path-sum/');
  assert.equal(titleFromSlug('word-search-ii'), 'Word Search Ii');
});

test('imported lists become the active list, with new problems added as yours', () => {
  store.clear();
  const { matched, unmatched } = parseImport('two-sum\nhttps://leetcode.com/problems/minimum-path-sum/\nValid Anagram');
  const list = store.importList('Amazon (from my sheet)', matched, unmatched);
  const state = store.get();
  assert.equal(state.settings.list, list.id);
  assert.deepEqual(listProblems(state, list.id).map((problem) => problem.id).slice(0, 2), ['two-sum', 'valid-anagram']);
  assert.equal(listProblems(state, list.id).length, 3);
  assert.equal(state.custom.length, 1);
  assert.equal(newQueue({ ...state, settings: { ...state.settings, newPerDay: 5 } }, todayKey())[0].id, 'two-sum');
  assert.ok(activeProblems(state).some((problem) => problem.files));
});

test('lists can be toggled, renamed, deleted, and survive sanitising', () => {
  store.clear();
  const list = store.createList('Graphs week', ['number-of-islands']);
  store.toggleInList(list.id, 'clone-graph');
  store.toggleInList(list.id, 'number-of-islands');
  store.renameList(list.id, 'Graphs');
  let state = store.get();
  assert.deepEqual(state.lists[0], { id: list.id, name: 'Graphs', items: ['clone-graph'] });
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(state))).lists, state.lists);
  store.deleteList(list.id);
  state = store.get();
  assert.equal(state.lists.length, 0);
  assert.equal(state.settings.list, 'neetcode150');
  assert.equal(sanitize({ lists: [{ id: 'nope', name: 'x' }, { id: 'list-a', name: '' }] }).lists.length, 0);
});

test('built-in runnable list has the 29 solvable problems', () => {
  store.clear();
  assert.equal(listProblems(store.get(), 'runnable').length, 29);
});

test('the duck picks an easy opener and orders by difficulty', async () => {
  const { pickQuestions } = await import('../js/ui/oa.js').catch(() => ({}));
  if (!pickQuestions) return;
  const pool = PROBLEMS.filter((problem) => ['two-sum', '3sum', 'trapping-rain-water', 'coin-change', 'valid-anagram'].includes(problem.id));
  for (let i = 0; i < 20; i++) {
    const picked = pickQuestions(pool, 3, {});
    assert.equal(picked.length, 3);
    assert.equal(picked[0].difficulty, 'Easy');
    assert.equal(new Set(picked.map((p) => p.id)).size, 3);
  }
});
