import { fill, h, toast } from './dom.js';
import { duck } from './duck.js';
import { gradeButtons, GRADE_LABELS, VERDICTS } from './grade.js';
import { oaLimitFor, openHunt } from './hunt.js';
import { isRunnable, openSolve } from './solve.js';
import { listMembership } from './lists.js';
import { openSheet, closeSheet } from './sheet.js';
import { startSession } from './session.js';
import { store } from '../core/store.js';
import { allHunts, allProblems, dueCards, problemIndex, weakestCards } from '../core/stats.js';
import { intervalLabel, status } from '../core/scheduler.js';
import { formatShort, relative, todayKey } from '../core/dates.js';
import { DIFFICULTIES, KINDS, LANGUAGES } from '../data/kinds.js';

function oaFlags(oa) {
  return Object.values(oa.flags).reduce((sum, value) => sum + value, 0);
}

function link(problem) {
  if (!problem.url) return null;
  const label = problem.kind === 'coding' && !problem.custom ? (problem.premium ? 'LeetCode (Premium) ↗' : 'LeetCode ↗') : 'Open link ↗';
  return h('a', { href: problem.url, target: '_blank', rel: 'noopener' }, label);
}

function meta(problem, showTopic) {
  return h('div', { class: 'sheet-meta' },
    h('span', null, KINDS[problem.kind].label),
    h('span', { class: `diff ${problem.difficulty}` }, problem.difficulty),
    showTopic && problem.pattern !== KINDS[problem.kind].label ? h('span', null, problem.pattern) : null,
    link(problem)
  );
}

function promptBox(problem) {
  return problem.prompt ? h('div', { class: 'prompt-box' }, problem.prompt) : null;
}

function renderGradeStep(body, problem, mode) {
  const card = store.get().cards[problem.id];
  const isCoding = problem.kind === 'coding' || problem.kind === 'bug';
  const note = h('textarea', {
    id: 'note-input', value: card ? card.note : '',
    placeholder: isCoding ? 'e.g. HashMap of value to index, check target - x before inserting.' : 'The answer you want to be able to give, in a few lines.',
  });
  const minutes = h('input', { id: 'minutes-input', type: 'number', min: 1, max: 600, inputMode: 'numeric', placeholder: 'optional' });
  const readInputs = () => ({ note: note.value.trim(), minutes: Number(minutes.value) > 0 ? Number(minutes.value) : null });
  const labels = mode === 'recall' ? GRADE_LABELS.recall : isCoding ? GRADE_LABELS.codingFirst : GRADE_LABELS.otherFirst;
  fill(body, meta(problem, true),
    promptBox(problem),
    h('div', { class: 'field' },
      h('label', { for: 'note-input' }, isCoding ? 'The trick, in one or two lines' : 'Your answer, in short'),
      note,
      h('span', { class: 'hint' }, 'This is what you see after you try to recall it. Keep it short.')
    ),
    h('div', { class: 'field' }, h('label', { for: 'minutes-input' }, 'Minutes it took'), minutes),
    h('div', { class: 'field' },
      h('span', { class: 'label' }, mode === 'recall' ? 'How well did you recall it? Tap to save.' : 'How did it go? Tap to save.'),
      gradeButtons(problem, labels, readInputs)
    )
  );
}

export function openLog(problem) {
  openSheet(problem.title, (body) => renderGradeStep(body, problem, 'log'));
}

export function openRecall(problem) {
  openSheet(problem.title, (body) => {
    fill(body, meta(problem, false),
      promptBox(problem),
      h('div', { class: 'duck-says' }, duck('calm', 60),
        h('p', null, problem.kind === 'coding'
          ? 'Explain the approach to the duck before you look. Data structure, the key idea, time complexity.'
          : 'Answer it to the duck before you look. Out loud or typed, but commit to an answer.')),
      h('div', { class: 'field' },
        h('label', { for: 'explain-input' }, 'Your explanation'),
        h('textarea', { id: 'explain-input', placeholder: 'Not saved. This is only here to make you commit.' })
      ),
      h('button', { class: 'btn primary wide', type: 'button', 'data-primary': true, onclick: () => renderGradeStep(body, problem, 'recall') }, 'Show my notes and grade myself'),
      isRunnable(problem.id) ? h('button', { class: 'btn wide', type: 'button', onclick: () => openSolve(problem.id) }, '▶ Re-solve it in the editor instead') : null,
      h('button', { class: 'btn wide', type: 'button', onclick: () => { store.snooze(problem.id); closeSheet(); toast('Snoozed until tomorrow.'); } }, 'Not today, snooze until tomorrow')
    );
  });
}

export function openPractice(problem) {
  if (problem.files) openHunt(problem);
  else if (store.get().cards[problem.id]) openRecall(problem);
  else openLog(problem);
}

export function startDueSession() {
  const state = store.get();
  const index = problemIndex(state);
  const queue = dueCards(state.cards, todayKey()).map((card) => index.get(card.id)).filter(Boolean);
  if (queue.length === 0) {
    toast('Nothing is due right now.');
    return;
  }
  startSession(queue, openPractice);
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function mockOaSet(state) {
  const hunts = allHunts(state);
  const fresh = (list) => [...shuffle(list.filter((hunt) => !state.cards[hunt.id])), ...shuffle(list.filter((hunt) => state.cards[hunt.id]))];
  const repos = fresh(hunts.filter((hunt) => hunt.files.length >= 4));
  const small = fresh(hunts.filter((hunt) => hunt.files.length < 4));
  return [...small.slice(0, 2), ...repos.slice(0, 1)];
}

export function startMockOa() {
  const queue = mockOaSet(store.get());
  if (queue.length === 0) return;
  startSession(queue, (hunt) => openHunt(hunt, { oa: { limit: oaLimitFor(hunt) } }));
}

export function openOa(hunt) {
  openHunt(hunt, { oa: { limit: oaLimitFor(hunt) } });
}

export function startTopicDrill(pattern) {
  const queue = weakestCards(store.get(), pattern);
  if (queue.length === 0) return;
  startSession(queue, openPractice);
}

function topics() {
  const seen = new Set();
  for (const problem of allProblems(store.get())) seen.add(problem.pattern);
  return [...seen];
}

function customForm(body, existing) {
  const kind = h('select', { id: 'custom-kind' }, Object.entries(KINDS).map(([value, item]) =>
    h('option', { value, selected: (existing ? existing.kind : 'coding') === value }, item.label)));
  const title = h('input', { id: 'custom-title', type: 'text', maxLength: 120, value: existing ? existing.title : '', placeholder: 'e.g. Design a rate limiter' });
  const topic = h('input', { id: 'custom-topic', type: 'text', maxLength: 40, list: 'topic-options', value: existing ? existing.pattern : '', placeholder: KINDS[kind.value].topic });
  const difficulty = h('select', { id: 'custom-difficulty' }, DIFFICULTIES.map((name) =>
    h('option', { value: name, selected: (existing ? existing.difficulty : 'Medium') === name }, name)));
  const url = h('input', { id: 'custom-url', type: 'url', value: existing ? existing.url : '', placeholder: 'https://…' });
  const prompt = h('textarea', { id: 'custom-prompt', class: 'mono', value: existing ? existing.prompt : '', placeholder: 'Paste the question, the buggy code, the scenario. Shown when you recall it.' });
  const error = h('p', { class: 'error', role: 'alert' });
  kind.addEventListener('change', () => { topic.placeholder = KINDS[kind.value].topic; });

  const read = () => ({ kind: kind.value, title: title.value, pattern: topic.value, difficulty: difficulty.value, url: url.value, prompt: prompt.value });
  const save = (then) => {
    if (!title.value.trim()) {
      error.textContent = 'Give it a title.';
      title.focus();
      return;
    }
    if (existing) {
      store.updateCustom(existing.id, read());
      closeSheet();
      toast('Saved.');
      return;
    }
    const problem = store.addCustom(read());
    if (then === 'log') openLog(problem);
    else {
      closeSheet();
      toast('Added. It is under Problems.');
    }
  };

  fill(body, h('div', { class: 'field-row' },
      h('div', { class: 'field' }, h('label', { for: 'custom-kind' }, 'Kind'), kind),
      h('div', { class: 'field' }, h('label', { for: 'custom-difficulty' }, 'Difficulty'), difficulty)
    ),
    h('div', { class: 'field' }, h('label', { for: 'custom-title' }, 'Title'), title),
    h('div', { class: 'field' }, h('label', { for: 'custom-topic' }, 'Topic'), topic,
      h('datalist', { id: 'topic-options' }, topics().map((name) => h('option', { value: name }))),
      h('span', { class: 'hint' }, 'Groups it on the Problems and Progress pages. Leave empty for the default.')),
    h('div', { class: 'field' }, h('label', { for: 'custom-prompt' }, 'Question'), prompt, h('span', { class: 'hint' }, 'Optional.')),
    h('div', { class: 'field' }, h('label', { for: 'custom-url' }, 'Link'), url, h('span', { class: 'hint' }, 'Optional. LeetCode, HackerRank, a doc, anything.')),
    error,
    existing
      ? h('button', { class: 'btn primary wide', type: 'button', onclick: () => save('edit') }, 'Save changes')
      : h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onclick: () => save('log') }, 'Add and log first attempt'),
        h('button', { class: 'btn', type: 'button', onclick: () => save('later') }, 'Add for later'))
  );
}

export function openCustom(existing = null) {
  openSheet(existing ? 'Edit problem' : 'Add anything', (body) => customForm(body, existing));
}

export function openDetail(problem) {
  openSheet(problem.title, (body) => {
    const today = todayKey();
    const card = store.get().cards[problem.id];
    const state = status(card, today);
    const isHunt = Boolean(problem.files);
    const editable = problem.custom && !isHunt;
    const confirmBox = h('div', { class: 'actions' });
    const wipe = () => {
      if (problem.custom) store.removeCustom(problem.id);
      else store.resetCard(problem.id);
      closeSheet();
      toast('Removed.');
    };
    const resetButton = h('button', {
      class: 'btn danger', type: 'button',
      onclick: () => fill(confirmBox, h('span', { class: 'small' }, problem.custom ? 'Delete this problem and its history?' : 'Wipe history and notes for this problem?'),
        h('button', { class: 'btn danger', type: 'button', onclick: wipe }, 'Yes'),
        h('button', { class: 'btn', type: 'button', onclick: () => fill(confirmBox, ...baseActions) }, 'No')
      ),
    }, problem.custom ? 'Delete' : 'Reset progress');
    const baseActions = [
      editable ? h('button', { class: 'btn', type: 'button', onclick: () => openCustom(problem) }, 'Edit') : null,
      card || problem.custom ? resetButton : null,
    ].filter(Boolean);
    confirmBox.append(...baseActions);

    const head = isHunt
      ? h('div', { class: 'sheet-meta' }, h('span', null, 'Bug hunt'), h('span', null, LANGUAGES[problem.lang] || problem.lang), h('span', { class: `diff ${problem.difficulty}` }, problem.difficulty))
      : meta(problem, true);

    if (!card) {
      fill(body, head,
        isHunt ? h('p', { class: 'muted' }, problem.scenario) : promptBox(problem),
        isHunt ? null : h('p', { class: 'muted' }, 'Not attempted yet. Try it, then log how it went.'),
        isRunnable(problem.id) ? h('button', { class: 'btn primary wide', type: 'button', onclick: () => openSolve(problem.id) }, '▶ Solve it here, with tests') : null,
        h('button', { class: `btn ${isRunnable(problem.id) ? '' : 'primary '}wide`, type: 'button', onclick: () => openPractice(problem) }, isHunt ? 'Start the hunt' : 'I solved it elsewhere, log it'),
        listMembership(problem),
        confirmBox
      );
      return;
    }

    const noteArea = h('textarea', { id: 'detail-note', value: card.note });
    fill(body, head,
      h('div', { class: 'chips' },
        h('span', { class: `chip ${state === 'due' ? 'attention' : state === 'mastered' ? 'ok' : ''}` }, state === 'due' ? `due ${relative(card.due, today)}` : `next recall ${relative(card.due, today)}`),
        h('span', { class: 'chip' }, `interval ${intervalLabel(card.interval)}`),
        h('span', { class: 'chip' }, `failed ${card.lapses}×`)
      ),
      h('button', { class: 'btn primary wide', type: 'button', onclick: () => openPractice(problem) },
        isHunt ? 'Hunt it again' : state === 'due' ? 'Recall now' : 'Recall early'),
      isRunnable(problem.id) ? h('button', { class: 'btn wide', type: 'button', onclick: () => openSolve(problem.id) }, '▶ Open in the editor') : null,
      h('div', { class: 'field' },
        h('label', { for: 'detail-note' }, 'Your notes'),
        noteArea,
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: () => { store.setNote(problem.id, noteArea.value.trim()); toast('Notes saved.'); } }, 'Save notes'))
      ),
      listMembership(problem),
      h('div', { class: 'field' },
        h('span', { class: 'label' }, 'History'),
        h('ul', { class: 'history' }, [...card.history].reverse().map((entry) =>
          h('li', null,
            h('span', null, formatShort(entry.date)),
            h('span', { class: `rating-${entry.rating}` },
              VERDICTS[entry.rating] + (entry.minutes ? `  ${entry.minutes} min` : '') + (entry.oa ? `  OA ${oaFlags(entry.oa) === 0 ? 'clean' : `${oaFlags(entry.oa)} flags`}` : ''))
          )
        ))
      ),
      confirmBox
    );
  });
}
