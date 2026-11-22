import test from 'node:test';
import assert from 'node:assert/strict';
import { isEmpty, mergeStates } from '../js/core/sync.js';
import { defaultState } from '../js/core/store.js';
import { newCard, review } from '../js/core/scheduler.js';

function card(id, ratings, start = '2026-11-01') {
  let c = newCard(id);
  let day = start;
  for (const r of ratings) {
    c = review(c, r, day);
    day = c.due;
  }
  return c;
}

test('an empty side takes the other one', () => {
  const remote = defaultState();
  remote.cards['two-sum'] = card('two-sum', ['good']);
  assert.ok(isEmpty(defaultState()));
  assert.deepEqual(Object.keys(mergeStates(defaultState(), remote).cards), ['two-sum']);
  assert.deepEqual(Object.keys(mergeStates(remote, defaultState()).cards), ['two-sum']);
});

test('cards merge by keeping the longer history, lists and custom problems union', () => {
  const local = defaultState();
  const remote = defaultState();
  local.cards['two-sum'] = card('two-sum', ['good']);
  remote.cards['two-sum'] = card('two-sum', ['good', 'good']);
  local.cards['3sum'] = card('3sum', ['hard']);
  remote.cards['subsets'] = card('subsets', ['easy']);
  local.custom.push({ id: 'custom-a', title: 'Design a cache', kind: 'design' });
  remote.custom.push({ id: 'custom-b', title: 'Tell me about a conflict', kind: 'behavioural' });
  local.lists.push({ id: 'list-x', name: 'Amazon', items: ['two-sum'] });
  remote.lists.push({ id: 'list-x', name: 'Amazon', items: ['3sum'] }, { id: 'list-y', name: 'Graphs', items: [] });
  local.code = { 'two-sum': { python: 'local' } };
  remote.code = { 'two-sum': { python: 'remote' }, '3sum': { javascript: 'r' } };
  const merged = mergeStates(local, remote);
  assert.equal(merged.cards['two-sum'].history.length, 2);
  assert.deepEqual(Object.keys(merged.cards).sort(), ['3sum', 'subsets', 'two-sum']);
  assert.deepEqual(merged.custom.map((p) => p.id).sort(), ['custom-a', 'custom-b']);
  assert.deepEqual(merged.lists.find((l) => l.id === 'list-x').items.sort(), ['3sum', 'two-sum']);
  assert.equal(merged.lists.length, 2);
  assert.equal(merged.code['two-sum'].python, 'local');
  assert.equal(merged.code['3sum'].javascript, 'r');
});
