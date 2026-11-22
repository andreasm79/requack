import test from 'node:test';
import assert from 'node:assert/strict';
import { clampToDeadline, isDue, MAX_INTERVAL, MIN_EASE, newCard, nextInterval, review, status } from '../js/core/scheduler.js';
import { addDays, diffDays } from '../js/core/dates.js';

const TODAY = '2026-11-16';

test('first solve schedules by how it went', () => {
  assert.equal(review(newCard('a'), 'again', TODAY).due, '2026-11-17');
  assert.equal(review(newCard('a'), 'hard', TODAY).due, '2026-11-18');
  assert.equal(review(newCard('a'), 'good', TODAY).due, '2026-11-20');
  assert.equal(review(newCard('a'), 'easy', TODAY).due, '2026-11-23');
});

test('good recalls grow the interval every time', () => {
  let card = review(newCard('a'), 'good', TODAY);
  let day = TODAY;
  let previous = card.interval;
  for (let i = 0; i < 5; i++) {
    day = card.due;
    card = review(card, 'good', day);
    assert.ok(card.interval > previous);
    previous = card.interval;
  }
});

test('blanking resets to tomorrow, counts a lapse and lowers ease', () => {
  let card = review(newCard('a'), 'good', TODAY);
  card = review(card, 'good', card.due);
  const ease = card.ease;
  const lapsed = review(card, 'again', card.due);
  assert.equal(lapsed.interval, 1);
  assert.equal(lapsed.lapses, 1);
  assert.equal(lapsed.reps, 0);
  assert.ok(lapsed.ease < ease);
});

test('a failed first attempt is not a lapse', () => {
  assert.equal(review(newCard('a'), 'again', TODAY).lapses, 0);
});

test('ease and interval stay within bounds', () => {
  let card = review(newCard('a'), 'good', TODAY);
  for (let i = 0; i < 20; i++) card = review(card, 'again', TODAY);
  assert.ok(card.ease >= MIN_EASE);
  for (let i = 0; i < 30; i++) card = review(card, 'easy', TODAY);
  assert.ok(card.interval <= MAX_INTERVAL);
});

test('rating order gives ordered intervals', () => {
  const card = { ...newCard('a'), interval: 10, history: [{ date: TODAY, rating: 'good', minutes: null }] };
  const [again, hard, good, easy] = ['again', 'hard', 'good', 'easy'].map((rating) => nextInterval(card, rating));
  assert.ok(again < hard && hard < good && good < easy);
});

test('review does not mutate the card', () => {
  const card = newCard('a');
  review(card, 'good', TODAY);
  assert.equal(card.history.length, 0);
  assert.equal(card.due, null);
});

test('status moves from new to learning to due to mastered', () => {
  assert.equal(status(undefined, TODAY), 'new');
  const card = review(newCard('a'), 'good', TODAY);
  assert.equal(status(card, TODAY), 'learning');
  assert.equal(status(card, card.due), 'due');
  assert.ok(isDue(card, addDays(card.due, 3)));
  assert.equal(status({ ...card, interval: 30, due: addDays(TODAY, 30) }, TODAY), 'mastered');
});

test('a review that would land after the interview is pulled into the final week', () => {
  const deadline = addDays(TODAY, 20);
  const due = clampToDeadline(addDays(TODAY, 60), TODAY, deadline, 'two-sum');
  const before = diffDays(due, deadline);
  assert.ok(before >= 1 && before <= 5);
});

test('reviews before the interview are left alone, and so are last-minute ones', () => {
  const deadline = addDays(TODAY, 20);
  assert.equal(clampToDeadline(addDays(TODAY, 4), TODAY, deadline, 'a'), addDays(TODAY, 4));
  const soon = addDays(TODAY, 2);
  assert.equal(clampToDeadline(addDays(TODAY, 9), TODAY, soon, 'a'), addDays(TODAY, 9));
  assert.equal(clampToDeadline(addDays(TODAY, 9), TODAY, null, 'a'), addDays(TODAY, 9));
});
