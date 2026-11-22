import { fill, h, plural, toast } from './dom.js';
import { closeSheet, openSheet } from './sheet.js';
import { store } from '../core/store.js';
import { listsFor, parseImport } from '../core/lists.js';
import { listProblems } from '../core/stats.js';

const EXAMPLE = `https://leetcode.com/problems/two-sum/
146. LRU Cache
"Merge Intervals",Medium
Number of Islands
Design a parking lot`;

export function openImport() {
  openSheet('Import a list', (body) => {
    const name = h('input', { id: 'import-name', type: 'text', maxLength: 60, placeholder: 'e.g. Amazon OA, from my notes' });
    const area = h('textarea', { id: 'import-text', class: 'mono', rows: 10, placeholder: EXAMPLE });
    const preview = h('div', { class: 'import-preview', role: 'status' });
    const create = h('button', { class: 'btn primary wide', type: 'button', disabled: true }, 'Create list');
    const update = () => {
      const { matched, unmatched } = parseImport(area.value);
      create.disabled = matched.length + unmatched.length === 0;
      if (create.disabled) {
        fill(preview, h('p', { class: 'muted small' }, 'Paste one problem per line: LeetCode links, titles, numbered lists or CSV rows from a spreadsheet.'));
        return;
      }
      fill(preview,
        h('div', { class: 'chips' },
          h('span', { class: 'chip ok' }, `${matched.length} matched`),
          unmatched.length ? h('span', { class: 'chip attention' }, `${unmatched.length} new`) : null),
        unmatched.length
          ? h('p', { class: 'muted small' }, `New ones are added as your own problems: ${unmatched.slice(0, 4).map((item) => item.title).join(', ')}${unmatched.length > 4 ? '…' : ''}`)
          : null);
    };
    area.addEventListener('input', update);
    create.addEventListener('click', () => {
      const { matched, unmatched } = parseImport(area.value);
      const list = store.importList(name.value || 'Imported list', matched, unmatched);
      closeSheet();
      toast(`${list.name}: ${plural(list.items.length, 'problem')}. It is now your active list.`);
    });
    fill(body,
      h('p', { class: 'muted' }, 'Got a company list from a friend, a Discord pin or your own spreadsheet? Paste it here. Problems reQuack knows are matched, including the ones you can solve in the editor, and the rest are added as yours with their links.'),
      h('div', { class: 'field' }, h('label', { for: 'import-name' }, 'List name'), name),
      h('div', { class: 'field' }, h('label', { for: 'import-text' }, 'Problems'), area),
      preview,
      create);
    update();
  });
}

export function openNewList() {
  openSheet('New list', (body) => {
    const name = h('input', { id: 'new-list-name', type: 'text', maxLength: 60, placeholder: 'e.g. Graphs this week' });
    const error = h('p', { class: 'error', role: 'alert' });
    fill(body,
      h('p', { class: 'muted' }, 'Start an empty list, then add problems from their detail page.'),
      h('div', { class: 'field' }, h('label', { for: 'new-list-name' }, 'List name'), name),
      error,
      h('button', {
        class: 'btn primary wide', type: 'button',
        onclick: () => {
          if (!name.value.trim()) {
            error.textContent = 'Give the list a name.';
            return;
          }
          store.createList(name.value);
          closeSheet();
          toast('List created and selected. Add problems from their detail pages.');
        },
      }, 'Create list'));
    name.focus();
  });
}

export function listPicker(state, { onChange = (id) => store.updateSettings({ list: id }) } = {}) {
  return h('select', { id: 'list-picker', 'aria-label': 'Problem list', onchange: (event) => onChange(event.target.value) },
    listsFor(state).map((list) => h('option', { value: list.id, selected: state.settings.list === list.id },
      `${list.name} (${listProblems(state, list.id).length})`)));
}

export function listMembership(problem) {
  const state = store.get();
  if (state.lists.length === 0) return null;
  return h('div', { class: 'field' },
    h('span', { class: 'label' }, 'In your lists'),
    h('div', { class: 'pills' }, state.lists.map((list) => h('button', {
      class: 'pill', type: 'button', 'aria-pressed': String(list.items.includes(problem.id)),
      onclick: (event) => {
        store.toggleInList(list.id, problem.id);
        event.currentTarget.setAttribute('aria-pressed', String(store.get().lists.find((item) => item.id === list.id).items.includes(problem.id)));
      },
    }, list.name))));
}

export function manageListsCard(state) {
  if (state.lists.length === 0) return null;
  return h('section', { class: 'card' },
    h('h2', null, 'your lists'),
    h('div', { class: 'list' }, state.lists.map((list) => {
      const name = h('input', { type: 'text', value: list.name, maxLength: 60, 'aria-label': `Rename ${list.name}` });
      return h('div', { class: 'row list-row' },
        h('div', { class: 'row-main' }, name, h('span', { class: 'row-meta' }, plural(list.items.length, 'problem'))),
        h('div', { class: 'row-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => { store.renameList(list.id, name.value); toast('Renamed.'); } }, 'Save'),
          h('button', { class: 'btn danger', type: 'button', onclick: () => { store.deleteList(list.id); toast('List deleted. Its problems are still there.'); } }, 'Delete')));
    })));
}
