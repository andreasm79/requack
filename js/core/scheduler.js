import { addDays, diffDays } from './dates.js';

export const RATINGS = ['again', 'hard', 'good', 'easy'];
export const MAX_INTERVAL = 180;
export const MIN_EASE = 1.3;
export const START_EASE = 2.5;
export const MASTERED_INTERVAL = 21;

const FIRST_INTERVALS = { again: 1, hard: 2, good: 4, easy: 7 };
const EASE_DELTAS = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 };
const FINAL_LOOK_SPREAD = 5;
const FINAL_LOOK_MIN_GAP = 3;

export function newCard(id) {
  return { id, reps: 0, lapses: 0, interval: 0, ease: START_EASE, due: null, note: '', history: [] };
}

export function nextInterval(card, rating) {
  if (card.history.length === 0 || card.interval === 0) return FIRST_INTERVALS[rating];
  if (rating === 'again') return 1;
  const prev = card.interval;
  let next;
  if (rating === 'hard') next = Math.max(prev + 1, Math.round(prev * 1.2));
  else if (rating === 'good') next = Math.max(prev + 1, Math.round(prev * card.ease));
  else next = Math.max(prev + 2, Math.round(prev * card.ease * 1.3));
  return Math.min(MAX_INTERVAL, next);
}

function nextEase(card, rating) {
  if (card.history.length === 0) return card.ease;
  const ease = Math.round((card.ease + EASE_DELTAS[rating]) * 100) / 100;
  return Math.max(MIN_EASE, ease);
}

function hash(text) {
  let total = 0;
  for (let i = 0; i < text.length; i++) total = (total * 31 + text.charCodeAt(i)) % 100003;
  return total;
}

export function clampToDeadline(due, today, deadline, id) {
  if (!deadline || diffDays(due, deadline) >= 0) return due;
  const finalLook = addDays(deadline, -(1 + (hash(id) % FINAL_LOOK_SPREAD)));
  if (diffDays(today, finalLook) < FINAL_LOOK_MIN_GAP) return due;
  return finalLook;
}

export function review(card, rating, today, deadline = null, minutes = null) {
  const interval = nextInterval(card, rating);
  const lapsed = rating === 'again' && card.history.length > 0;
  return {
    ...card,
    reps: rating === 'again' ? 0 : card.reps + 1,
    lapses: card.lapses + (lapsed ? 1 : 0),
    interval,
    ease: nextEase(card, rating),
    due: clampToDeadline(addDays(today, interval), today, deadline, card.id),
    history: [...card.history, { date: today, rating, minutes }],
  };
}

export function isDue(card, today) {
  return Boolean(card && card.due) && diffDays(card.due, today) >= 0;
}

export function status(card, today) {
  if (!card || card.history.length === 0) return 'new';
  if (isDue(card, today)) return 'due';
  return card.interval >= MASTERED_INTERVAL ? 'mastered' : 'learning';
}

export function intervalLabel(days) {
  if (days < 30) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}
