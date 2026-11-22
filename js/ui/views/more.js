import { fill, h, toast } from '../dom.js';
import { openBulk } from '../bulk.js';
import { store } from '../../core/store.js';
import { buildDemoState } from '../../core/demo.js';
import { LISTS } from '../../data/problems.js';

function settingsCard(state) {
  const settings = state.settings;
  return h('section', { class: 'card' },
    h('h2', null, 'plan'),
    h('div', { class: 'field' },
      h('label', { for: 'set-list' }, 'LeetCode list'),
      h('select', { id: 'set-list', onchange: (event) => store.updateSettings({ list: event.target.value }) },
        Object.entries(LISTS).map(([value, list]) => h('option', { value, selected: settings.list === value }, list.label))
      )
    ),
    h('div', { class: 'field' },
      h('label', { for: 'set-new' }, 'New problems a day'),
      h('input', {
        id: 'set-new', type: 'number', min: 0, max: 10, inputMode: 'numeric', value: String(settings.newPerDay),
        onchange: (event) => store.updateSettings({ newPerDay: Number(event.target.value) || 0 }),
      })
    ),
    h('div', { class: 'field' },
      h('label', { for: 'set-date' }, 'Interview or OA date'),
      h('input', {
        id: 'set-date', type: 'date', value: settings.interviewDate || '',
        onchange: (event) => store.updateSettings({ interviewDate: event.target.value || null }),
      }),
      h('span', { class: 'hint' }, 'Recalls that would land after this date are pulled into the final week, so everything gets one last look.')
    ),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: openBulk }, 'Mark problems I have already solved'))
  );
}

function backupCard() {
  const area = h('textarea', { id: 'backup-text', class: 'mono', placeholder: 'Your backup appears here. To restore, paste a backup and press Restore.', spellcheck: false });
  const message = h('p', { class: 'small', role: 'status' });
  const copy = async () => {
    area.value = store.export();
    area.select();
    try {
      await navigator.clipboard.writeText(area.value);
      message.textContent = 'Backup copied. Paste it somewhere safe, like a note or a gist.';
    } catch (error) {
      message.textContent = 'Backup is in the box. Select it and copy it yourself.';
    }
  };
  const restore = () => {
    try {
      const parsed = JSON.parse(area.value);
      if (!parsed || typeof parsed !== 'object' || typeof parsed.cards !== 'object') throw new Error('shape');
      store.replace({ ...parsed, settings: { ...parsed.settings, introSeen: true } });
      toast('Backup restored.');
    } catch (error) {
      message.textContent = 'That is not a Requack backup. Paste the full text you exported.';
    }
  };
  const fromFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    file.text().then((content) => {
      area.value = content;
      message.textContent = 'File loaded into the box. Press Restore to use it.';
    });
  };
  return h('section', { class: 'card' },
    h('h2', null, 'backup'),
    h('p', { class: 'muted small' }, 'Everything lives in this browser. No account, no server. Export now and then so a cleared browser does not cost you your history.'),
    area,
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: copy }, 'Export and copy'),
      h('button', { class: 'btn', type: 'button', onclick: restore }, 'Restore from box')
    ),
    h('div', { class: 'field' }, h('label', { for: 'backup-file' }, 'Or load a backup file'), h('input', { id: 'backup-file', type: 'file', accept: '.json,application/json,text/plain', onchange: fromFile })),
    message
  );
}

function dangerCard(state, today) {
  const box = h('div', { class: 'actions' });
  const reset = h('button', { class: 'btn danger', type: 'button', onclick: () => fill(box, h('span', { class: 'small' }, 'Delete every attempt, note, added problem and setting?'),
    h('button', { class: 'btn danger', type: 'button', onclick: () => { store.clear(); toast('Everything deleted.'); } }, 'Yes, delete it all'),
    h('button', { class: 'btn', type: 'button', onclick: () => fill(box, ...initial) }, 'Cancel')
  ) }, 'Delete everything');
  const hasCards = Object.keys(state.cards).length > 0;
  const demo = state.settings.demo
    ? h('button', { class: 'btn', type: 'button', onclick: () => { store.clear(); toast('Demo data cleared.'); } }, 'Clear demo data')
    : !hasCards
      ? h('button', { class: 'btn', type: 'button', onclick: () => { store.replace(buildDemoState(today)); toast('Demo data loaded.'); } }, 'Load demo data')
      : null;
  const initial = [demo, reset].filter(Boolean);
  box.append(...initial);
  return h('section', { class: 'card' }, h('h2', null, 'data'), box);
}

function shortcutsCard() {
  const keys = [['/', 'search problems, notes and commands'], ['Ctrl K', 'same, from anywhere'], ['Enter', 'reveal notes, or check a bug hunt'], ['1 2 3 4', 'grade FAIL, FLAKY, PASS, O(1)'], ['Esc', 'close']];
  return h('section', { class: 'card' },
    h('h2', null, 'keyboard'),
    h('dl', { class: 'keys' }, keys.map(([key, what]) => [h('dt', null, h('kbd', null, key)), h('dd', null, what)]))
  );
}

function aboutCard() {
  return h('section', { class: 'card' },
    h('h2', null, 'how the schedule works'),
    h('p', { class: 'small' }, 'First attempt: back tomorrow on a FAIL, in 2 days on FLAKY, 4 on PASS, 7 on O(1). After that each good recall multiplies the gap (about 2.5×), a shaky one grows it slowly, and blanking sends the problem back to tomorrow and makes it grow slower from then on. A problem counts as mastered once the gap passes three weeks.'),
    h('p', { class: 'small muted' }, 'Problem titles and links point to LeetCode. The NeetCode 150 and Blind 75 are community problem lists. Requack is not affiliated with either. The bug hunts are original.'),
    h('p', { class: 'small muted mono' }, 'Built for the DUCSS Project of the Month, November 2026.')
  );
}

export function renderMore(today) {
  const state = store.get();
  return [h('h1', null, 'More'), settingsCard(state), backupCard(), shortcutsCard(), dangerCard(state, today), aboutCard()];
}
