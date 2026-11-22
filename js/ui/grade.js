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

function sessionSummary(results) {
  const parts = RATINGS.filter((rating) => results[rating] > 0).map((rating) => `${results[rating]} ${VERDICTS[rating]}`);
  return `Session done: ${parts.join(', ')}.`;
}

function save(problem, rating, inputs) {
  const updated = store.logReview(problem.id, rating, inputs);
  const step = advance(rating);
  if (step && step.next) {
    toast(`${VERDICTS[rating]}. Next recall ${relative(updated.due, todayKey())}.`, UNDO);
    return;
  }
  closeSheet();
  if (step) toast(sessionSummary(step.results));
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
