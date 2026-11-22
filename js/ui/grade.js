import { h, toast } from './dom.js';
import { afterQuip } from './duck.js';
import { closeSheet } from './sheet.js';
import { advance } from './session.js';
import { store } from '../core/store.js';
import { intervalLabel, newCard, nextInterval, RATINGS } from '../core/scheduler.js';
import { relative, todayKey } from '../core/dates.js';

export const VERDICTS = { again: 'FAIL', hard: 'FLAKY', good: 'PASS', easy: 'O(1)' };

export const GRADE_LABELS = {
  codingFirst: ['Needed the solution', 'Struggled', 'Solved it', 'Too easy'],
  otherFirst: ['No idea', 'Shaky', 'Knew it', 'Trivial'],
  recall: ['Blanked', 'Shaky', 'Got it', 'Instant'],
  hunt: ['Missed it', 'Found it slowly', 'Found it', 'Spotted it instantly'],
};

const UNDO = { label: 'Undo', run: () => { if (store.undoLast()) toast('Undone. Nothing was saved.'); } };

function sessionSummary(step) {
  const parts = RATINGS.filter((rating) => step.results[rating] > 0).map((rating) => `${step.results[rating]} ${VERDICTS[rating]}`);
  if (step.oa) return `Mock OA done: ${parts.join(', ')}. Integrity: ${step.flags === 0 ? 'clean' : `${step.flags} flagged`}.`;
  return `Session done: ${parts.join(', ')}.`;
}

function totalFlags(oa) {
  if (!oa) return null;
  return Object.values(oa.flags).reduce((sum, value) => sum + value, 0);
}

function save(problem, rating, inputs) {
  const updated = store.logReview(problem.id, rating, inputs);
  const step = advance(rating, totalFlags(inputs.oa));
  if (step && step.next) {
    toast(`${VERDICTS[rating]}. Next recall ${relative(updated.due, todayKey())}.`, UNDO);
    return;
  }
  closeSheet();
  if (step) toast(sessionSummary(step));
  else toast(`${afterQuip(rating, updated.history.length)} Next recall ${relative(updated.due, todayKey())}.`, UNDO);
}

export function gradeButtons(problem, labels, readInputs, suggested = null) {
  const card = store.get().cards[problem.id] || newCard(problem.id);
  return h('div', { class: 'grade-grid' }, RATINGS.map((rating, index) =>
    h('button', {
      class: `grade ${rating}${suggested === rating ? ' suggested' : ''}`,
      type: 'button',
      onclick: () => save(problem, rating, readInputs()),
    },
      h('span', { class: 'verdict' }, h('kbd', { 'aria-hidden': 'true' }, String(index + 1)), VERDICTS[rating]),
      h('span', { class: 'what' }, labels[index]),
      h('small', null, `again in ${intervalLabel(nextInterval(card, rating))}`)
    )
  ));
}
