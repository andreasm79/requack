import test from 'node:test';
import assert from 'node:assert/strict';
import { activity, dueCards, forecast, huntOfTheDay, huntTotals, newQueue, patternStats, projection, streak, totals, weakestPattern } from '../js/core/stats.js';
import { newCard, review } from '../js/core/scheduler.js';
import { defaultState, sanitize } from '../js/core/store.js';
import { buildDemoState } from '../js/core/demo.js';
import { addDays } from '../js/core/dates.js';

const TODAY = '2026-11-16';

function stateWith(entries) {
  const state = defaultState();
  for (const [id, rating, day] of entries) {
    state.cards[id] = review(state.cards[id] || newCard(id), rating, day);
  }
  return state;
}

test('streak counts back from today or yesterday', () => {
  const days = new Map([[TODAY, 1], [addDays(TODAY, -1), 2], [addDays(TODAY, -2), 1], [addDays(TODAY, -4), 1]]);
  assert.equal(streak(days, TODAY), 3);
  assert.equal(streak(days, addDays(TODAY, 1)), 3);
  assert.equal(streak(days, addDays(TODAY, 2)), 0);
});

test('due cards come back oldest first', () => {
  const state = stateWith([['two-sum', 'good', addDays(TODAY, -10)], ['3sum', 'again', addDays(TODAY, -3)], ['subsets', 'easy', TODAY]]);
  assert.deepEqual(dueCards(state.cards, TODAY).map((card) => card.id), ['two-sum', '3sum']);
});

test('new queue respects the daily goal and skips solved problems', () => {
  const state = stateWith([['contains-duplicate', 'good', addDays(TODAY, -1)]]);
  assert.deepEqual(newQueue(state, TODAY).map((problem) => problem.id), ['valid-anagram', 'two-sum']);
  const after = stateWith([['contains-duplicate', 'good', addDays(TODAY, -1)], ['valid-anagram', 'good', TODAY]]);
  assert.deepEqual(newQueue(after, TODAY).map((problem) => problem.id), ['two-sum']);
});

test('forecast puts overdue cards on day zero', () => {
  const state = stateWith([['two-sum', 'good', addDays(TODAY, -10)], ['3sum', 'good', TODAY]]);
  const days = forecast(state.cards, TODAY, 7);
  assert.equal(days[0].count, 1);
  assert.equal(days[4].count, 1);
});

test('totals and pattern stats agree', () => {
  const state = stateWith([['two-sum', 'good', TODAY], ['3sum', 'again', TODAY], ['3sum', 'hard', TODAY], ['3sum', 'again', TODAY]]);
  const summary = totals(state, TODAY);
  assert.equal(summary.total, 182);
  assert.equal(summary.solved, 2);
  const rows = patternStats(state, TODAY);
  assert.equal(rows.reduce((sum, row) => sum + row.solved, 0), 2);
  assert.equal(weakestPattern(rows).pattern, 'Two Pointers');
});

test('blind 75 list narrows the totals', () => {
  const state = defaultState();
  state.settings.list = 'blind75';
  assert.equal(totals(state, TODAY).total, 107);
});

test('projection uses recent pace', () => {
  const state = stateWith(Array.from({ length: 7 }, (_, i) => [['contains-duplicate', 'valid-anagram', 'two-sum', 'group-anagrams', 'valid-sudoku', '3sum', 'subsets'][i], 'good', addDays(TODAY, -i)]));
  state.settings.interviewDate = addDays(TODAY, 28);
  const result = projection(state, TODAY);
  assert.equal(result.daysLeft, 28);
  assert.equal(result.projected, 21);
});

test('demo data is deterministic, valid and survives sanitising', () => {
  const demo = buildDemoState(TODAY);
  assert.deepEqual(demo, buildDemoState(TODAY));
  assert.ok(Object.keys(demo.cards).length > 30);
  assert.ok(dueCards(demo.cards, TODAY).length > 0);
  assert.ok(streak(activity(demo.cards), TODAY) >= 6);
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(demo))), demo);
});

test('sanitise drops junk', () => {
  const state = sanitize({ cards: { x: { history: [{ date: 'nope', rating: 'good' }] }, y: 4 }, custom: [{ title: '' }, { title: 'Mine', url: 'javascript:alert(1)' }], settings: { list: 'zzz', newPerDay: 99 } });
  assert.deepEqual(state.cards, {});
  assert.equal(state.custom.length, 1);
  assert.equal(state.custom[0].url, '');
  assert.equal(state.custom[0].kind, 'coding');
  assert.equal(state.custom[0].pattern, 'Other coding');
  assert.equal(state.settings.list, 'neetcode150');
  assert.equal(state.settings.newPerDay, 10);
});

test('custom problems of any kind keep their fields', () => {
  const state = sanitize({ custom: [
    { title: 'Design a URL shortener', kind: 'design', prompt: 'Scale to 100M links.\n\n', difficulty: 'Hard' },
    { title: 'Tell me about a conflict', kind: 'behavioural', pattern: 'Amazon LPs' },
    { title: 'Mystery', kind: 'nonsense' },
  ] });
  assert.equal(state.custom[0].pattern, 'System design');
  assert.equal(state.custom[0].prompt, 'Scale to 100M links.');
  assert.equal(state.custom[1].pattern, 'Amazon LPs');
  assert.equal(state.custom[2].kind, 'coding');
  assert.equal(totals(state, TODAY).total, 185);
});

test('bug hunts stay out of the new queue and rotate daily', () => {
  const state = defaultState();
  state.settings.newPerDay = 10;
  assert.ok(newQueue(state, TODAY).every((problem) => !problem.files));
  const first = huntOfTheDay(state, TODAY);
  const second = huntOfTheDay(state, addDays(TODAY, 1));
  assert.ok(first && second && first.id !== second.id);
  assert.deepEqual(huntTotals(state), { total: 32, done: 0 });
  state.cards[first.id] = review(newCard(first.id), 'good', TODAY);
  assert.equal(huntTotals(state).done, 1);
  assert.equal(newQueue(state, TODAY).length, 10);
});
