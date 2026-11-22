import { fill, h, plural } from '../dom.js';
import { generateHunt, getSampler } from '../ai.js';
import { openDetail, openPractice } from '../flows.js';
import { problemRow } from './rows.js';
import { refresh } from '../refresh.js';
import { store } from '../../core/store.js';
import { allHunts, huntOfTheDay, huntTotals } from '../../core/stats.js';
import { isDue } from '../../core/scheduler.js';
import { LANGUAGES } from '../../data/kinds.js';

const ui = { lang: 'all', genLang: 'python' };

function featured(hunt) {
  if (!hunt) return null;
  return h('section', { class: 'card feature' },
    h('div', { class: 'chips' },
      h('span', { class: 'chip attention' }, 'hunt of the day'),
      h('span', { class: 'chip' }, LANGUAGES[hunt.lang] || hunt.lang),
      h('span', { class: `chip diff ${hunt.difficulty}` }, hunt.difficulty)
    ),
    h('h3', null, hunt.title),
    h('p', { class: 'muted' }, hunt.scenario),
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', type: 'button', onclick: () => openPractice(hunt) }, 'Find the bug'))
  );
}

function generator() {
  const holder = h('div');
  getSampler().then((sample) => {
    if (!sample) return;
    const language = h('select', { id: 'gen-lang', onchange: (event) => { ui.genLang = event.target.value; } },
      Object.entries(LANGUAGES).map(([value, label]) => h('option', { value, selected: ui.genLang === value }, label)));
    const focus = h('input', { id: 'gen-focus', type: 'text', maxLength: 80, placeholder: 'optional, e.g. race conditions' });
    const message = h('p', { class: 'small muted', role: 'status' });
    const button = h('button', {
      class: 'btn primary', type: 'button',
      onclick: async () => {
        button.disabled = true;
        message.className = 'small muted';
        message.textContent = 'Claude is writing something subtly broken…';
        try {
          const hunt = await generateHunt(language.value, focus.value.trim());
          const saved = store.addCustom(hunt);
          openPractice(saved);
        } catch (error) {
          message.className = 'error';
          message.textContent = error.message;
          button.disabled = false;
        }
      },
    }, 'Generate a hunt');
    fill(holder, h('section', { class: 'card' },
      h('h2', null, 'fresh hunt from claude'),
      h('p', { class: 'muted small' }, 'Asks Claude for a new buggy snippet. It is saved to your hunts and joins the recall queue. Generated code is not reviewed by a human, so treat the answer as a claim to check.'),
      h('div', { class: 'field-row' },
        h('div', { class: 'field' }, h('label', { for: 'gen-lang' }, 'Language'), language),
        h('div', { class: 'field' }, h('label', { for: 'gen-focus' }, 'Bug class'), focus)
      ),
      h('div', { class: 'actions' }, button),
      message
    ));
  });
  return holder;
}

export function renderBugs(today) {
  const state = store.get();
  const hunts = allHunts(state);
  const summary = huntTotals(state);
  const due = hunts.filter((hunt) => isDue(state.cards[hunt.id], today)).length;
  const shown = hunts.filter((hunt) => ui.lang === 'all' || hunt.lang === ui.lang);
  const langs = [['all', 'All'], ...Object.entries(LANGUAGES)];

  return [
    h('h1', null, 'Bug hunt'),
    h('p', { class: 'lede' }, 'An AI wrote this code. It reads fine, the tests pass, and it ships a bug. Tap the line you would flag in review, then see if you were right. Hunts come back on the same recall schedule as everything else.'),
    h('div', { class: 'chips' },
      h('span', { class: 'chip' }, `${summary.done}/${summary.total} attempted`),
      h('span', { class: `chip ${due > 0 ? 'attention' : 'ok'}` }, `${due} due`)
    ),
    featured(huntOfTheDay(state, today)),
    generator(),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', null, 'all hunts'), h('span', { class: 'count' }, plural(shown.length, 'hunt'))),
      h('div', { class: 'pills' }, langs.map(([value, label]) =>
        h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.lang === value), onclick: () => { ui.lang = value; refresh(); } }, label)
      )),
      h('div', { class: 'list' },
        shown.length > 0
          ? shown.map((hunt, i) => problemRow(hunt, state.cards[hunt.id], today, i, (problem) => (state.cards[problem.id] ? openDetail(problem) : openPractice(problem))))
          : h('div', { class: 'empty' }, 'No hunts in that language yet.')
      )
    ),
  ];
}
