import { fill, h, plural, toast } from './dom.js';
import { duck } from './duck.js';
import { closeSheet, openSheet, sheetOpen } from './sheet.js';
import { createProctor, describe, totalFlags } from './proctor.js';
import { isRunnable, openSolve } from './solve.js';
import { listPicker } from './lists.js';
import { store } from '../core/store.js';
import { listName } from '../core/lists.js';
import { listProblems } from '../core/stats.js';
import { ratingFor } from '../core/judge.js';
import { VERDICTS } from './grade.js';

const COUNTS = [2, 3, 4];
const MINUTES = { 2: 60, 3: 75, 4: 90 };
const ORDER = { Easy: 0, Medium: 1, Hard: 2 };

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickQuestions(pool, count, cards = {}) {
  const fresh = shuffle(pool.filter((problem) => !cards[problem.id]));
  const seen = shuffle(pool.filter((problem) => cards[problem.id]));
  const ranked = [...fresh, ...seen];
  const easy = ranked.find((problem) => problem.difficulty === 'Easy');
  const picked = easy && count > 2 ? [easy] : [];
  for (const problem of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(problem)) picked.push(problem);
  }
  return picked.sort((a, b) => ORDER[a.difficulty] - ORDER[b.difficulty]);
}

function runnablePool(state, listId) {
  return listProblems(state, listId).filter((problem) => isRunnable(problem.id));
}

export function openCodingOaSetup() {
  openSheet('Coding OA', (body) => {
    const state = store.get();
    const ui = { list: state.settings.list, count: 3 };
    const info = h('div', { class: 'oa-info' });
    const start = h('button', { class: 'btn primary wide', type: 'button', 'data-primary': true }, '');
    const counts = h('div', { class: 'pills', role: 'group', 'aria-label': 'Questions' });

    function paint() {
      const pool = runnablePool(store.get(), ui.list);
      fill(counts, ...COUNTS.map((n) => h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.count === n), onclick: () => { ui.count = n; paint(); } }, `${n} questions`)));
      start.disabled = pool.length === 0;
      start.textContent = pool.length === 0 ? 'No solvable problems in this list' : `Let the duck pick ${Math.min(ui.count, pool.length)} and start (${MINUTES[ui.count]} min)`;
      fill(info, pool.length === 0
        ? h('p', { class: 'callout fail' }, `None of the problems in ${listName(store.get(), ui.list)} can run in reQuack yet. Pick "Solvable in reQuack", NeetCode 150, or a list you imported that includes NeetCode problems.`)
        : h('p', { class: 'muted small' }, `${plural(pool.length, 'problem')} in this list can run here. The duck picks at random, favouring ones you haven't done, easiest first.`));
    }

    start.addEventListener('click', () => {
      const pool = runnablePool(store.get(), ui.list);
      const questions = pickQuestions(pool, ui.count, store.get().cards);
      if (questions.length === 0) return;
      briefing(questions, MINUTES[ui.count], listName(store.get(), ui.list));
    });

    const picker = listPicker(state, { onChange: (id) => { ui.list = id; paint(); } });
    fill(body,
      h('div', { class: 'duck-says' }, duck('calm', 60), h('p', null, 'Pick a list and I will pull random questions from it, like an online assessment. You write and run real code against hidden tests.')),
      h('div', { class: 'field' }, h('label', { for: 'list-picker' }, 'Questions from'), picker),
      h('div', { class: 'field' }, h('span', { class: 'label' }, 'Length'), counts),
      info,
      start);
    paint();
  });
}

function briefing(questions, minutes, source) {
  openSheet('Coding OA', (body) => {
    fill(body,
      h('div', { class: 'chips' },
        h('span', { class: 'chip' }, source),
        h('span', { class: 'chip' }, plural(questions.length, 'question')),
        h('span', { class: 'chip attention' }, `${minutes} min`)),
      h('div', { class: 'callout' }, h('b', null, 'RULES'), 'This runs like a HackerRank or CodeSignal assessment.'),
      h('ul', { class: 'rules' },
        h('li', null, `${minutes} minutes for all ${questions.length} questions. Move between them freely. The timer does not pause.`),
        h('li', null, 'Submit as often as you like. Your best submission for each question counts. When time runs out, the test ends.'),
        h('li', null, 'The test goes fullscreen. Leaving fullscreen or switching tabs is logged.'),
        h('li', null, 'Copy and paste are blocked, and each attempt is logged.'),
        h('li', null, 'Hidden test inputs stay hidden, like on a real OA. You see which ones fail.')),
      h('button', { class: 'btn primary wide', type: 'button', 'data-primary': true, onclick: () => run(questions, minutes, source) }, '▶ Start the assessment'));
  });
}

function run(questions, minutes, source) {
  const session = {
    deadline: Date.now() + minutes * 60000,
    started: Date.now(),
    index: 0,
    scores: {},
    navigating: false,
    finished: false,
  };
  const chip = h('span', { class: 'chip attention' }, 'OA · 0 flags');
  const proctor = createProctor({ onFlag: (flags) => { chip.textContent = `OA · ${plural(totalFlags(flags), 'flag')}`; } });
  proctor.start();

  function show(index) {
    session.index = index;
    session.navigating = true;
    openSolve(questions[index].id, {
      oa: {
        deadline: session.deadline,
        position: index + 1,
        count: questions.length,
        hasPrevious: index > 0,
        chip,
        record: (id, result) => {
          const best = session.scores[id];
          if (!best || result.passed > best.passed) session.scores[id] = result;
        },
        go: (delta) => {
          const next = index + delta;
          if (next >= questions.length) finish('submitted');
          else show(next);
        },
      },
      onFinish: () => { session.navigating = false; },
    }).then(() => { session.navigating = false; });
  }

  const watch = setInterval(() => {
    if (session.finished) return;
    if (Date.now() >= session.deadline) finish('time');
    else if (!session.navigating && !sheetOpen()) finish('left');
  }, 500);

  function finish(reason) {
    if (session.finished) return;
    session.finished = true;
    clearInterval(watch);
    proctor.stop();
    const usedMinutes = Math.max(1, Math.round((Date.now() - session.started) / 60000));
    const flags = { ...proctor.flags };
    const rows = questions.map((problem) => {
      const score = session.scores[problem.id];
      const passed = score ? score.passed : 0;
      const total = score ? score.total : 0;
      const rating = ratingFor(passed, total);
      store.logReview(problem.id, rating, {
        minutes: Math.round(usedMinutes / questions.length) || 1,
        oa: { limit: minutes * 60, used: Math.round((Date.now() - session.started) / 1000), timedOut: reason === 'time', flags },
      });
      return { problem, passed, total, rating, lang: score ? score.lang : null };
    });
    const percent = Math.round((rows.reduce((sum, row) => sum + (row.total ? row.passed / row.total : 0), 0) / rows.length) * 100);
    const flagged = totalFlags(flags);
    openSheet('OA report', (body) => {
      fill(body,
        h('div', { class: 'oa-score' },
          h('span', { class: 'oa-percent' }, `${percent}%`),
          h('span', { class: 'muted' }, `${source} · ${plural(questions.length, 'question')} · ${usedMinutes} of ${minutes} min`)),
        reason === 'time' ? h('p', { class: 'callout' }, h('b', null, 'TIME UP'), 'Your best submission for each question was kept.') : null,
        reason === 'left' ? h('p', { class: 'callout' }, h('b', null, 'ENDED EARLY'), 'You closed the assessment, so it was submitted as it stood.') : null,
        h('div', { class: 'list' }, rows.map((row, i) => h('div', { class: 'row' },
          h('span', { class: 'ln' }, String(i + 1).padStart(2, '0')),
          h('div', { class: 'row-main' },
            h('span', { class: 'row-title' }, row.problem.title),
            h('span', { class: 'row-meta' },
              h('span', { class: `diff ${row.problem.difficulty}` }, row.problem.difficulty.toLowerCase()),
              h('span', null, row.total ? `${row.passed}/${row.total} tests` : 'not submitted'),
              row.lang ? h('span', null, row.lang) : null,
              h('span', { class: `rating-${row.rating}` }, VERDICTS[row.rating]))),
          h('div', { class: 'row-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => openSolve(row.problem.id) }, 'Open'))))),
        h('div', { class: `callout ${flagged === 0 ? 'pass' : 'fail'}` },
          h('b', null, flagged === 0 ? 'INTEGRITY: CLEAN' : `INTEGRITY: ${plural(flagged, 'flag').toUpperCase()}`),
          flagged === 0 ? 'You stayed in the test the whole time.' : `${describe(flags)}. A real OA shows these to the reviewer.`),
        h('p', { class: 'muted small' }, 'Each question is now in your recall queue, scheduled from how many tests passed.'),
        h('button', { class: 'btn primary wide', type: 'button', onclick: () => { closeSheet(); toast(`OA saved: ${percent}%.`); } }, 'Done'));
    });
  }

  show(0);
}
