import { h } from './dom.js';
import { endSession, sessionLabel } from './session.js';

let active = null;
let opener = null;

function onKey(event) {
  if (event.key === 'Escape') closeSheet();
}

export function closeSheet(byUser = true) {
  if (!active) return;
  active.remove();
  active = null;
  document.removeEventListener('keydown', onKey);
  if (byUser !== false) {
    endSession();
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }
}

export function sheetOpen() {
  return active !== null;
}

export function openSheet(title, build, { wide = false } = {}) {
  const previousOpener = active ? opener : document.activeElement;
  closeSheet(false);
  opener = previousOpener;
  const badge = sessionLabel();
  const body = h('div', { class: 'sheet-body' });
  const sheet = h('div', { class: wide ? 'sheet wide' : 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, tabIndex: -1 },
    h('div', { class: 'sheet-head' },
      h('div', { class: 'sheet-title' },
        badge ? h('span', { class: 'chip attention' }, `session ${badge}`) : null,
        h('h2', null, title)
      ),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close', onclick: () => closeSheet() }, '×')
    ),
    body
  );
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: (event) => { if (event.target === backdrop) closeSheet(); } }, sheet);
  document.body.append(backdrop);
  active = backdrop;
  document.addEventListener('keydown', onKey);
  build(body);
  sheet.focus();
  return body;
}
