import { fill, h } from '../dom.js';
import { openCustom, openDetail } from '../flows.js';
import { openBulk } from '../bulk.js';
import { listPicker, openImport, openNewList } from '../lists.js';
import { problemRow } from './rows.js';
import { store } from '../../core/store.js';
import { activeProblems } from '../../core/stats.js';
import { status } from '../../core/scheduler.js';
import { DIFFICULTIES, KINDS } from '../../data/kinds.js';

const STATUS_FILTERS = [['all', 'All'], ['due', 'Due'], ['learning', 'Learning'], ['mastered', 'Mastered'], ['new', 'Not attempted']];

const ui = { query: '', status: 'all', difficulty: 'all', kind: 'all', open: new Set() };

function matchesKind(problem) {
  if (ui.kind === 'all') return true;
  if (ui.kind === 'yours') return problem.custom;
  return problem.kind === ui.kind;
}

function renderGroups(container, today) {
  const state = store.get();
  const query = ui.query.trim().toLowerCase();
  const filtering = query !== '' || ui.status !== 'all' || ui.difficulty !== 'all' || ui.kind !== 'all';
  const groups = new Map();
  for (const problem of activeProblems(state)) {
    if (!groups.has(problem.pattern)) groups.set(problem.pattern, { all: 0, done: 0, shown: [] });
    const group = groups.get(problem.pattern);
    const card = state.cards[problem.id];
    group.all += 1;
    if (card) group.done += 1;
    if (query && !`${problem.title} ${problem.tag || ''} ${card ? card.note : ''}`.toLowerCase().includes(query)) continue;
    if (ui.status !== 'all' && status(card, today) !== ui.status) continue;
    if (ui.difficulty !== 'all' && problem.difficulty !== ui.difficulty) continue;
    if (!matchesKind(problem)) continue;
    group.shown.push(problemRow(problem, card, today, group.shown.length, openDetail));
  }
  const nodes = [];
  for (const [pattern, group] of groups) {
    if (filtering && group.shown.length === 0) continue;
    nodes.push(h('details', {
      class: 'group',
      open: filtering || ui.open.has(pattern),
      ontoggle: (event) => {
        if (filtering) return;
        if (event.target.open) ui.open.add(pattern);
        else ui.open.delete(pattern);
      },
    },
      h('summary', null, pattern, h('span', { class: 'count' }, `${group.done}/${group.all}`)),
      group.shown
    ));
  }
  if (nodes.length === 0) nodes.push(h('div', { class: 'list' }, h('div', { class: 'empty' }, 'Nothing matches. Clear the search or filters.')));
  fill(container, ...nodes);
}

function select(id, label, key, options, rerender) {
  return h('div', { class: 'field' },
    h('label', { for: id }, label),
    h('select', { id, onchange: (event) => { ui[key] = event.target.value; rerender(); } },
      options.map(([value, text]) => h('option', { value, selected: ui[key] === value }, text)))
  );
}

export function renderProblems(today) {
  const container = h('div', { class: 'section' });
  const rerender = () => renderGroups(container, today);
  rerender();
  const kinds = [['all', 'Everything'], ...Object.entries(KINDS).map(([value, item]) => [value, item.label]), ['yours', 'Added by you']];
  const difficulties = [['all', 'Any'], ...DIFFICULTIES.map((name) => [name, name])];
  return [
    h('div', { class: 'page-head' },
      h('h1', null, 'Problems'),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: openBulk }, 'Mark solved'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => openCustom() }, '+ Add anything'))
    ),
    h('div', { class: 'list-bar' },
      h('div', { class: 'field' }, h('label', { for: 'list-picker' }, 'Working on'), listPicker(store.get())),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onclick: openImport }, 'Import a list'),
        h('button', { class: 'btn', type: 'button', onclick: openNewList }, 'New list'))),
    h('p', { class: 'lede' }, 'NeetCode 150, Blind 75 and bug hunts are built in. Import any list you found, or add your own problems: system design, behavioural, an OA question.'),
    h('div', { class: 'filters' },
      h('input', {
        id: 'problem-search', type: 'search', placeholder: 'grep titles, tags and your notes…', value: ui.query, 'aria-label': 'Search problems',
        oninput: (event) => { ui.query = event.target.value; rerender(); },
      }),
      h('div', { class: 'field-row' },
        select('filter-kind', 'Kind', 'kind', kinds, rerender),
        select('filter-difficulty', 'Difficulty', 'difficulty', difficulties, rerender)
      ),
      h('div', { class: 'pills' }, STATUS_FILTERS.map(([value, label]) =>
        h('button', {
          class: 'pill', type: 'button', 'aria-pressed': String(ui.status === value),
          onclick: (event) => {
            ui.status = value;
            for (const pill of event.currentTarget.parentElement.children) pill.setAttribute('aria-pressed', String(pill === event.currentTarget));
            rerender();
          },
        }, label)
      ))
    ),
    container,
  ];
}
