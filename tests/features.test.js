import test from 'node:test';
import assert from 'node:assert/strict';
import { store, sanitize } from '../js/core/store.js';
import { activity, newQueue, pace, totals, weakestCards } from '../js/core/stats.js';
import { sparkline, statsText } from '../js/core/share.js';
import { addDays, todayKey } from '../js/core/dates.js';

const today = todayKey();

test('undo restores the previous card, or removes a first attempt', () => {
  store.clear();
  store.logReview('two-sum', 'good');
  assert.ok(store.undoLast());
  assert.equal(store.get().cards['two-sum'], undefined);
  store.logReview('two-sum', 'good');
  const before = store.get().cards['two-sum'];
  store.logReview('two-sum', 'again');
  store.undoLast();
  assert.deepEqual(store.get().cards['two-sum'], before);
  assert.equal(store.undoLast(), false);
});

test('snooze moves a card to tomorrow', () => {
  store.clear();
  store.logReview('3sum', 'again');
  store.snooze('3sum');
  assert.equal(store.get().cards['3sum'].due, addDays(today, 1));
});

test('marking problems as already solved spreads recalls and does not fake activity', () => {
  store.clear();
  const ids = Array.from({ length: 30 }, (_, i) => `p${i}`).concat(['contains-duplicate', 'valid-anagram']);
  assert.equal(store.seedSolved(ids), 32);
  assert.equal(store.seedSolved(ids), 0);
  const state = store.get();
  const dues = new Set(Object.values(state.cards).map((card) => card.due));
  assert.equal(dues.size, 14);
  assert.ok(!dues.has(today));
  assert.equal(activity(state.cards).size, 0);
  assert.equal(pace(state, today), 0);
  assert.equal(totals(state, today).solved, 2);
  assert.equal(newQueue(state, today)[0].id, 'two-sum');
  assert.equal(newQueue(state, today).length, 2);
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(state))).cards, state.cards);
});

test('weakest cards in a topic come lowest ease first', () => {
  store.clear();
  store.logReview('two-sum', 'good');
  store.logReview('valid-anagram', 'good');
  store.logReview('valid-anagram', 'again');
  assert.deepEqual(weakestCards(store.get(), 'Arrays & Hashing').map((problem) => problem.id), ['valid-anagram', 'two-sum']);
});

test('share text has a 14 character sparkline', () => {
  const days = new Map([[today, 4], [addDays(today, -1), 1]]);
  const line = sparkline(days, today);
  assert.equal([...line].length, 14);
  assert.ok(line.endsWith('█'));
  store.clear();
  assert.ok(statsText(store.get(), today).includes('attempted  0/168'));
});
