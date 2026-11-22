import { fill, h } from './dom.js';
import { store } from '../core/store.js';
import { allProblems } from '../core/stats.js';
import { status } from '../core/scheduler.js';
import { todayKey } from '../core/dates.js';
import { KINDS } from '../data/kinds.js';

const MAX_RESULTS = 9;
let overlay = null;

export function closePalette() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
}

function score(haystack, title, tokens) {
  let total = 0;
  for (const token of tokens) {
    if (!haystack.includes(token)) return -1;
    total += title.startsWith(token) ? 3 : title.includes(token) ? 2 : 1;
  }
  return total;
}

function search(query, commands, onProblem) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const state = store.get();
  const today = todayKey();
  const items = [];
  for (const command of commands) {
    const title = command.label.toLowerCase();
    const points = tokens.length === 0 ? 1 : score(`${title} ${command.keywords || ''}`, title, tokens);
    if (points >= 0) items.push({ points: points + 0.5, label: command.label, meta: 'command', run: command.run });
  }
  if (tokens.length > 0) {
    for (const problem of allProblems(state)) {
      const card = state.cards[problem.id];
      const title = problem.title.toLowerCase();
      const points = score(`${title} ${problem.pattern} ${problem.tag || ''} ${card ? card.note : ''}`.toLowerCase(), title, tokens);
      if (points < 0) continue;
      const kind = problem.files ? 'bug hunt' : KINDS[problem.kind].label.toLowerCase();
      items.push({ points, label: problem.title, meta: `${kind} · ${problem.pattern} · ${status(card, today)}`, run: () => onProblem(problem) });
    }
  }
  return items.sort((a, b) => b.points - a.points).slice(0, MAX_RESULTS);
}

export function openPalette(commands, onProblem) {
  closePalette();
  let results = [];
  let cursor = 0;
  const list = h('div', { class: 'palette-list', role: 'listbox' });
  const input = h('input', { id: 'palette-input', type: 'text', placeholder: 'Search problems, notes, or type a command', autocomplete: 'off', 'aria-label': 'Search problems and commands' });

  const run = (item) => {
    closePalette();
    item.run();
  };
  const paint = () => {
    fill(list, ...(results.length > 0
      ? results.map((item, i) => h('button', { class: `palette-item${i === cursor ? ' active' : ''}`, type: 'button', role: 'option', 'aria-selected': String(i === cursor), onclick: () => run(item) },
        h('span', { class: 'palette-label' }, item.label), h('span', { class: 'palette-meta' }, item.meta)))
      : [h('p', { class: 'empty' }, 'No match.')]));
  };
  const refresh = () => {
    results = search(input.value, commands, onProblem);
    cursor = 0;
    paint();
  };
  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) return;
      cursor = (cursor + (event.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length;
      paint();
    } else if (event.key === 'Enter' && results[cursor]) {
      event.preventDefault();
      run(results[cursor]);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      closePalette();
    }
  });

  overlay = h('div', { class: 'palette-backdrop', onclick: (event) => { if (event.target === overlay) closePalette(); } },
    h('div', { class: 'palette', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search and commands' },
      h('div', { class: 'palette-input' }, h('span', { class: 'mono', 'aria-hidden': 'true' }, '>'), input, h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: closePalette }, '×')),
      list,
      h('p', { class: 'palette-help', 'aria-hidden': 'true' }, '↑↓ move · enter open · esc close')
    ));
  document.body.append(overlay);
  refresh();
  input.focus();
}
