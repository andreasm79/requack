import { h, plural, toast } from '../dom.js';
import { duck, quip } from '../duck.js';
import { openLog, openPractice, startDueSession } from '../flows.js';
import { isRunnable, openSolve } from '../solve.js';
import { openCodingOaSetup } from '../oa.js';
import { startMockOa } from '../flows.js';
import { openBulk } from '../bulk.js';
import { kindLabel, lineNumber } from './rows.js';
import { store } from '../../core/store.js';
import { buildDemoState } from '../../core/demo.js';
import { activity, dueCards, huntOfTheDay, newQueue, problemIndex, streak } from '../../core/stats.js';
import { diffDays, fromKey, relative } from '../../core/dates.js';
import { LANGUAGES } from '../../data/kinds.js';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning.';
  if (hour < 18) return 'Good afternoon.';
  return 'Good evening.';
}

function intro(today) {
  return h('section', { class: 'card feature' },
    h('h3', null, 'Solve it once. Remember it at the interview.'),
    h('ol', { class: 'steps' },
      h('li', null, 'Solve a problem, then log how it went and the trick in one line.'),
      h('li', null, 'Requack schedules the recall: tomorrow if you struggled, weeks out if it was easy.'),
      h('li', null, 'On recall day, explain it to the duck before you see your notes.'),
      h('li', null, 'Between problems, hunt bugs in code an AI wrote.')
    ),
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => store.updateSettings({ introSeen: true }) }, 'Start fresh'),
      h('button', { class: 'btn', type: 'button', onclick: openBulk }, 'I have solved some already'),
      h('button', { class: 'btn', type: 'button', onclick: () => { store.replace(buildDemoState(today)); toast('Demo data loaded. Clear it under More.'); } }, 'Look around with demo data')
    )
  );
}

function demoBanner() {
  return h('div', { class: 'banner' },
    h('span', null, 'Demo data: six weeks of a made-up student.'),
    h('button', { class: 'btn', type: 'button', onclick: () => { store.clear(); toast('Demo data cleared.'); } }, 'Clear and start fresh')
  );
}

function dueRow(card, problem, today, index) {
  const late = diffDays(card.due, today);
  return h('div', { class: 'row' },
    lineNumber(index),
    h('div', { class: 'row-main' },
      h('span', { class: 'row-title' }, h('span', { class: 'dot due' }), problem.title),
      h('span', { class: 'row-meta' },
        h('span', { class: `diff ${problem.difficulty}` }, problem.difficulty.toLowerCase()),
        problem.kind !== 'coding' || problem.custom ? h('span', null, kindLabel(problem)) : null,
        h('span', { class: late > 0 ? 'overdue' : '' }, late > 0 ? `due ${relative(card.due, today)}` : 'due today')
      )
    ),
    h('div', { class: 'row-actions' }, h('button', { class: 'btn', type: 'button', onclick: () => openPractice(problem) }, problem.files ? 'Hunt' : 'Recall'))
  );
}

function newRow(problem, index) {
  return h('div', { class: 'row' },
    lineNumber(index),
    h('div', { class: 'row-main' },
      h('span', { class: 'row-title' }, h('span', { class: 'dot' }), problem.title),
      h('span', { class: 'row-meta' },
        h('span', { class: `diff ${problem.difficulty}` }, problem.difficulty.toLowerCase()),
        h('span', null, problem.pattern),
        problem.url ? h('a', { href: problem.url, target: '_blank', rel: 'noopener' }, problem.premium ? 'open (premium) ↗' : 'open ↗') : null
      )
    ),
    h('div', { class: 'row-actions' },
      isRunnable(problem.id) ? h('button', { class: 'btn primary', type: 'button', onclick: () => openSolve(problem.id) }, '▶ Solve') : null,
      h('button', { class: 'btn', type: 'button', onclick: () => openLog(problem) }, isRunnable(problem.id) ? 'Log' : 'Log solve'))
  );
}

const BAR_WIDTH = 16;

function progressLine(done, remaining) {
  const plan = done + remaining;
  if (plan === 0) return null;
  const filled = Math.round((done / plan) * BAR_WIDTH);
  return h('p', { class: 'prompt bar-line', role: 'img', 'aria-label': `${done} of ${plan} done today` },
    'today ', h('span', { class: 'bar-fill' }, '█'.repeat(filled)), h('span', { class: 'bar-rest' }, '░'.repeat(BAR_WIDTH - filled)), ` ${done}/${plan}`,
    remaining === 0 ? h('b', null, '  done') : null);
}

function huntCard(hunt) {
  if (!hunt) {
    return h('div', { class: 'list' }, h('div', { class: 'empty' }, 'Every hunt attempted. They come back through the recall queue.'));
  }
  const lines = hunt.files.reduce((sum, file) => sum + file.lines.length, 0);
  return h('div', { class: 'card feature' },
    h('div', { class: 'chips' },
      h('span', { class: 'chip' }, LANGUAGES[hunt.lang] || hunt.lang),
      h('span', { class: `chip diff ${hunt.difficulty}` }, hunt.difficulty),
      h('span', { class: 'chip' }, `${plural(hunt.files.length, 'file')}, ${lines} lines`)
    ),
    h('h3', null, hunt.title),
    h('p', { class: 'muted' }, hunt.scenario),
    h('div', { class: 'actions' },
      h('button', { class: 'btn primary', type: 'button', onclick: () => openPractice(hunt) }, 'Find the bug'),
      h('a', { class: 'btn', href: '#bugs' }, 'All hunts')
    )
  );
}

export function renderToday(today) {
  const state = store.get();
  const index = problemIndex(state);
  const due = dueCards(state.cards, today).filter((card) => index.has(card.id));
  const fresh = newQueue(state, today);
  const days = activity(state.cards);
  const run = streak(days, today);
  const doneToday = days.get(today) || 0;
  const hasCards = Object.keys(state.cards).length > 0;
  const seed = fromKey(today).getDate();
  const mood = due.length > 0 ? 'calm' : doneToday > 0 ? 'hype' : 'sleepy';
  const line = !hasCards ? quip('fresh', seed) : due.length > 0 ? quip('due', seed) : quip('clear', seed);
  const deadline = state.settings.interviewDate;
  const daysLeft = deadline ? diffDays(today, deadline) : null;

  return [
    state.settings.demo ? demoBanner() : null,
    h('section', { class: 'term' },
      h('div', { class: 'term-bar', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('span', null, 'requack status')),
      h('div', { class: 'term-body' },
        h('p', { class: 'prompt', 'aria-hidden': 'true' }, h('b', null, 'ducss@tcd'), ':~$ ', h('em', null, 'requack status')),
        h('div', { class: 'hero' },
          duck(mood, 88),
          h('div', { class: 'hero-text' }, h('h1', null, greeting()), h('p', null, line))
        ),
        progressLine(doneToday, due.length + fresh.length),
        h('div', { class: 'chips' },
          h('span', { class: `chip ${due.length > 0 ? 'attention' : 'ok'}` }, due.length > 0 ? `${due.length} due` : '0 due'),
          h('span', { class: 'chip' }, `streak ${plural(run, 'day')}`),
          h('span', { class: 'chip' }, `${doneToday} done today`),
          daysLeft !== null && daysLeft >= 0 ? h('span', { class: 'chip' }, daysLeft === 0 ? 'interview today' : `interview in ${daysLeft}d`) : null
        )
      )
    ),
    !hasCards && !state.settings.introSeen ? intro(today) : null,
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', null, 'recall due'), h('span', { class: 'count' }, String(due.length))),
      due.length > 0 ? h('button', { class: 'btn primary wide', type: 'button', onclick: startDueSession }, due.length === 1 ? '▶ Run the recall' : `▶ Run all ${due.length} recalls`) : null,
      h('div', { class: 'list' },
        due.length > 0
          ? due.map((card, i) => dueRow(card, index.get(card.id), today, i))
          : h('div', { class: 'empty' }, hasCards ? 'Nothing to recall today. Solve something new below.' : 'Problems you log show up here when it is time to re-test yourself.')
      )
    ),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', null, 'new today'), h('span', { class: 'count' }, `goal ${state.settings.newPerDay}/day`)),
      h('div', { class: 'list' },
        fresh.length > 0
          ? fresh.map(newRow)
          : h('div', { class: 'empty' }, state.settings.newPerDay === 0 ? 'New problems are switched off. Change the daily goal under More.' : 'New-problem goal hit for today. Pick more from Problems if you want.')
      )
    ),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', null, 'practice like the real thing'), h('span', { class: 'count' }, 'timed · fullscreen · proctored')),
      h('div', { class: 'oa-grid' },
        h('button', { class: 'oa-tile', type: 'button', onclick: openCodingOaSetup },
          h('span', { class: 'oa-tile-title' }, '▶ Coding OA'),
          h('span', { class: 'oa-tile-text' }, 'The duck picks 2 to 4 problems from your list. Write Python or JavaScript and run it against hidden tests.')),
        h('button', { class: 'oa-tile', type: 'button', onclick: startMockOa },
          h('span', { class: 'oa-tile-title' }, '▶ Code review OA'),
          h('span', { class: 'oa-tile-text' }, 'Two snippets and one repo with a bug in it. Find it, or fix it and pass the hidden tests.')))
    ),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h2', null, 'bug hunt of the day'), h('span', { class: 'count' }, 'AI-written code')),
      huntCard(huntOfTheDay(state, today))
    ),
  ];
}
