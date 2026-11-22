import { fill, h, plural } from '../dom.js';
import { generateHunt, generateRepoFromReport, getSampler } from '../ai.js';
import { mockOaSet, openDetail, openOa, openPractice, startMockOa } from '../flows.js';
import { problemRow } from './rows.js';
import { refresh } from '../refresh.js';
import { store } from '../../core/store.js';
import { allHunts, huntOfTheDay, huntTotals } from '../../core/stats.js';
import { isDue } from '../../core/scheduler.js';
import { LANGUAGES } from '../../data/kinds.js';
import { oaLimitFor } from '../hunt.js';

const ui = { lang: 'all', genLang: 'python', genMode: 'report' };

function mockOaCard(state) {
  const set = mockOaSet(state);
  const minutes = Math.round(set.reduce((sum, hunt) => sum + oaLimitFor(hunt), 0) / 60);
  return h('section', { class: 'card feature oa-card' },
    h('div', null,
      h('h3', null, 'Mock OA'),
      h('p', { class: 'muted' }, `${set.length} hunts back to back, about ${minutes} minutes: two snippets and one repo. Timed, fullscreen, copy and paste blocked, integrity report at the end.`)),
    h('button', { class: 'btn primary', type: 'button', onclick: startMockOa }, '▶ Start mock OA'));
}

function featured(hunt) {
  if (!hunt) return null;
  const repo = hunt.files.length >= 4;
  return h('section', { class: 'card' },
    h('div', { class: 'chips' },
      h('span', { class: 'chip attention' }, 'hunt of the day'),
      h('span', { class: 'chip' }, LANGUAGES[hunt.lang] || hunt.lang),
      h('span', { class: `chip diff ${hunt.difficulty}` }, hunt.difficulty),
      repo ? h('span', { class: 'chip' }, plural(hunt.files.length, 'file')) : null),
    h('h3', null, hunt.title),
    h('p', { class: 'muted' }, hunt.scenario),
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => openPractice(hunt) }, 'Find the bug'),
      h('button', { class: 'btn', type: 'button', onclick: () => openOa(hunt) }, 'Do it as an OA'))
  );
}

function generator() {
  const holder = h('div');
  getSampler().then((sample) => {
    if (!sample) return;
    const language = h('select', { id: 'gen-lang', onchange: (event) => { ui.genLang = event.target.value; } },
      Object.entries(LANGUAGES).map(([value, label]) => h('option', { value, selected: ui.genLang === value }, label)));
    const report = h('textarea', { id: 'gen-report', class: 'mono', placeholder: 'Paste a GitHub issue, a CVE write-up or a postmortem, with its link if you have one.' });
    const focus = h('input', { id: 'gen-focus', type: 'text', maxLength: 80, placeholder: 'optional, e.g. race conditions' });
    const message = h('p', { class: 'small muted', role: 'status' });
    const fields = h('div', { class: 'field' });
    const button = h('button', { class: 'btn primary', type: 'button' });
    const modes = h('div', { class: 'pills' });

    function paintMode() {
      fill(modes, ...[['report', 'Repo from a bug report'], ['snippet', 'Quick snippet']].map(([value, label]) =>
        h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.genMode === value), onclick: () => { ui.genMode = value; paintMode(); } }, label)));
      if (ui.genMode === 'report') {
        fill(fields, h('label', { for: 'gen-report' }, 'Bug report'), report,
          h('span', { class: 'hint' }, 'Claude builds a 6 to 10 file codebase with the same kind of bug, for a made-up product. Takes about a minute.'));
        button.textContent = 'Build a practice repo';
      } else {
        fill(fields, h('label', { for: 'gen-focus' }, 'Bug class'), focus);
        button.textContent = 'Generate a snippet';
      }
    }

    button.addEventListener('click', async () => {
      if (ui.genMode === 'report' && report.value.trim().length < 40) {
        message.className = 'error';
        message.textContent = 'Paste a bit more of the report, at least a couple of sentences.';
        return;
      }
      button.disabled = true;
      message.className = 'small muted';
      message.textContent = ui.genMode === 'report' ? 'Claude is building a codebase with the same kind of bug…' : 'Claude is writing something subtly broken…';
      try {
        const hunt = ui.genMode === 'report'
          ? await generateRepoFromReport(report.value, language.value)
          : await generateHunt(language.value, focus.value.trim());
        const saved = store.addCustom(hunt);
        report.value = '';
        message.textContent = '';
        openPractice(saved);
      } catch (error) {
        message.className = 'error';
        message.textContent = error.message;
      }
      button.disabled = false;
    });

    paintMode();
    fill(holder, h('section', { class: 'card' },
      h('h2', null, 'generate with claude'),
      h('p', { class: 'muted small' }, 'New hunts are saved to your list and join the recall queue. Nobody reviews generated code, so treat the answer as a claim to check.'),
      modes,
      h('div', { class: 'field' }, h('label', { for: 'gen-lang' }, 'Language'), language),
      fields,
      h('div', { class: 'actions' }, button),
      message
    ));
  });
  return holder;
}

function huntList(title, hunts, state, today) {
  return h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('h2', null, title), h('span', { class: 'count' }, plural(hunts.length, 'hunt'))),
    h('div', { class: 'list' },
      hunts.length > 0
        ? hunts.map((hunt, i) => problemRow(hunt, state.cards[hunt.id], today, i, (problem) => (state.cards[problem.id] ? openDetail(problem) : openPractice(problem))))
        : h('div', { class: 'empty' }, 'None in that language yet.')));
}

export function renderBugs(today) {
  const state = store.get();
  const hunts = allHunts(state);
  const summary = huntTotals(state);
  const due = hunts.filter((hunt) => isDue(state.cards[hunt.id], today)).length;
  const shown = hunts.filter((hunt) => ui.lang === 'all' || hunt.lang === ui.lang);
  const repos = shown.filter((hunt) => hunt.files.length >= 4);
  const snippets = shown.filter((hunt) => hunt.files.length < 4);
  const langs = [['all', 'All'], ...Object.entries(LANGUAGES)];

  return [
    h('h1', null, 'Bug hunt'),
    h('p', { class: 'lede' }, 'Code that reads fine, passes its tests and ships a bug. Tap the line you would flag in review. Repo hunts are whole codebases based on real outages and CVEs. Everything comes back on the recall schedule.'),
    h('div', { class: 'chips' },
      h('span', { class: 'chip' }, `${summary.done}/${summary.total} attempted`),
      h('span', { class: `chip ${due > 0 ? 'attention' : 'ok'}` }, `${due} due`)),
    mockOaCard(state),
    featured(huntOfTheDay(state, today)),
    generator(),
    h('div', { class: 'pills', role: 'group', 'aria-label': 'Language' }, langs.map(([value, label]) =>
      h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.lang === value), onclick: () => { ui.lang = value; refresh(); } }, label))),
    repos.length > 0 ? huntList('repo hunts · real incidents', repos, state, today) : null,
    snippets.length > 0 || repos.length === 0 ? huntList('snippets', snippets, state, today) : null,
  ];
}
