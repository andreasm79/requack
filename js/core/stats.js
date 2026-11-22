import { addDays, diffDays } from './dates.js';
import { isDue, status } from './scheduler.js';
import { LISTS, PROBLEMS } from '../data/problems.js';
import { HUNTS } from '../data/hunts.js';

const PACE_WINDOW = 14;

export function allProblems(state) {
  return [...PROBLEMS, ...HUNTS, ...state.custom];
}

export function activeProblems(state) {
  const list = LISTS[state.settings.list] || LISTS.neetcode150;
  return [...PROBLEMS.filter(list.filter), ...HUNTS, ...state.custom];
}

export function problemIndex(state) {
  const index = new Map();
  for (const problem of allProblems(state)) index.set(problem.id, problem);
  return index;
}

export function activity(cards) {
  const days = new Map();
  for (const card of Object.values(cards)) {
    for (const entry of card.history) {
      if (!entry.seeded) days.set(entry.date, (days.get(entry.date) || 0) + 1);
    }
  }
  return days;
}

export function streak(days, today) {
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count += 1;
    day = addDays(day, -1);
  }
  return count;
}

export function dueCards(cards, today) {
  return Object.values(cards)
    .filter((card) => isDue(card, today))
    .sort((a, b) => diffDays(b.due, a.due) || a.id.localeCompare(b.id));
}

export function newSolvedOn(state, day) {
  const index = problemIndex(state);
  let count = 0;
  for (const card of Object.values(state.cards)) {
    const problem = index.get(card.id);
    if (card.history[0].date === day && !card.history[0].seeded && problem && !problem.files) count += 1;
  }
  return count;
}

export function newQueue(state, today) {
  const remaining = Math.max(0, state.settings.newPerDay - newSolvedOn(state, today));
  return activeProblems(state)
    .filter((problem) => !problem.files && !state.cards[problem.id])
    .slice(0, remaining);
}

export function allHunts(state) {
  return activeProblems(state).filter((problem) => problem.files);
}

export function huntOfTheDay(state, today) {
  const open = allHunts(state).filter((hunt) => !state.cards[hunt.id]);
  if (open.length === 0) return null;
  return open[diffDays('2026-01-01', today) % open.length];
}

export function huntTotals(state) {
  const hunts = allHunts(state);
  return { total: hunts.length, done: hunts.filter((hunt) => state.cards[hunt.id]).length };
}

export function forecast(cards, today, days = PACE_WINDOW) {
  const counts = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i), count: 0 }));
  for (const card of Object.values(cards)) {
    const offset = Math.max(0, diffDays(today, card.due));
    if (offset < days) counts[offset].count += 1;
  }
  return counts;
}

export function totals(state, today) {
  const problems = activeProblems(state);
  const result = { total: problems.length, solved: 0, mastered: 0, due: 0, reviews: 0, byDifficulty: {} };
  for (const level of ['Easy', 'Medium', 'Hard']) result.byDifficulty[level] = { solved: 0, total: 0 };
  for (const problem of problems) {
    const card = state.cards[problem.id];
    const cardStatus = status(card, today);
    result.byDifficulty[problem.difficulty].total += 1;
    if (cardStatus === 'new') continue;
    result.solved += 1;
    result.byDifficulty[problem.difficulty].solved += 1;
    result.reviews += card.history.length;
    if (cardStatus === 'mastered') result.mastered += 1;
    if (cardStatus === 'due') result.due += 1;
  }
  return result;
}

export function patternStats(state, today) {
  const rows = new Map();
  for (const problem of activeProblems(state)) {
    if (!rows.has(problem.pattern)) {
      rows.set(problem.pattern, { pattern: problem.pattern, total: 0, solved: 0, mastered: 0, reviews: 0, struggles: 0 });
    }
    const row = rows.get(problem.pattern);
    const card = state.cards[problem.id];
    row.total += 1;
    if (!card) continue;
    row.solved += 1;
    if (status(card, today) === 'mastered') row.mastered += 1;
    for (const entry of card.history) {
      row.reviews += 1;
      if (entry.rating === 'again' || entry.rating === 'hard') row.struggles += 1;
    }
  }
  return [...rows.values()];
}

export function weakestPattern(rows) {
  let weakest = null;
  for (const row of rows) {
    if (row.reviews < 3 || row.struggles === 0) continue;
    const rate = row.struggles / row.reviews;
    if (!weakest || rate > weakest.rate) weakest = { ...row, rate };
  }
  return weakest;
}

export function pace(state, today) {
  let recent = 0;
  for (const card of Object.values(state.cards)) {
    const age = diffDays(card.history[0].date, today);
    if (!card.history[0].seeded && age >= 0 && age < PACE_WINDOW) recent += 1;
  }
  return recent / PACE_WINDOW;
}

export function projection(state, today) {
  const deadline = state.settings.interviewDate;
  if (!deadline) return null;
  const daysLeft = diffDays(today, deadline);
  if (daysLeft < 0) return null;
  const summary = totals(state, today);
  const perDay = pace(state, today);
  const projected = Math.min(summary.total, Math.round(summary.solved + perDay * daysLeft));
  return { daysLeft, perDay, projected, total: summary.total };
}

export function weakestCards(state, pattern, limit = 10) {
  return activeProblems(state)
    .filter((problem) => problem.pattern === pattern && state.cards[problem.id])
    .sort((a, b) => state.cards[a.id].ease - state.cards[b.id].ease || state.cards[b.id].lapses - state.cards[a.id].lapses)
    .slice(0, limit);
}
