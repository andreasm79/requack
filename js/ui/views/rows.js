import { h } from '../dom.js';
import { status } from '../../core/scheduler.js';
import { relative } from '../../core/dates.js';
import { KINDS, LANGUAGES } from '../../data/kinds.js';
import { RUNNABLE_IDS } from '../../data/runnable-index.js';
import { isRunnableRepo } from '../../data/hunts.js';

export function lineNumber(index) {
  return h('span', { class: 'ln', 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0'));
}

export function kindLabel(problem) {
  if (problem.files && problem.files.length >= 4) return `repo · ${problem.files.length} files · ${LANGUAGES[problem.lang] || problem.lang}`;
  if (problem.files) return `bug hunt · ${LANGUAGES[problem.lang] || problem.lang}`;
  return KINDS[problem.kind].label.toLowerCase();
}

export function statusText(card, state, today) {
  if (state === 'new') return 'not attempted';
  if (state === 'due') return `due ${relative(card.due, today)}`;
  return `${state}, next ${relative(card.due, today)}`;
}

export function problemRow(problem, card, today, index, onOpen) {
  const state = status(card, today);
  return h('button', { class: 'row', type: 'button', onclick: () => onOpen(problem) },
    lineNumber(index),
    h('div', { class: 'row-main' },
      h('span', { class: 'row-title' }, h('span', { class: `dot ${state}` }), problem.title),
      h('span', { class: 'row-meta' },
        h('span', { class: `diff ${problem.difficulty}` }, problem.difficulty.toLowerCase()),
        problem.kind !== 'coding' || problem.custom ? h('span', null, kindLabel(problem)) : null,
        h('span', { class: state === 'due' ? 'overdue' : '' }, statusText(card, state, today)),
        problem.custom ? h('span', null, problem.files ? 'ai-generated' : 'yours') : null,
        RUNNABLE_IDS.includes(problem.id) || isRunnableRepo(problem) ? h('span', { class: 'runnable-tag' }, '▶ runnable') : null
      )
    )
  );
}
