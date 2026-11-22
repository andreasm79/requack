import { fill, h } from './dom.js';
import { codeBlock } from './code.js';
import { gradeButtons, GRADE_LABELS } from './grade.js';
import { openSheet } from './sheet.js';
import { store } from '../core/store.js';
import { LANGUAGES } from '../data/kinds.js';

function key(file, line) {
  return `${file}:${line}`;
}

export function openHunt(problem) {
  const bugKeys = new Set();
  problem.files.forEach((file, f) => file.bugs.forEach((line) => bugKeys.add(key(f, line))));
  const firstBugFile = problem.files.findIndex((file) => file.bugs.length > 0);
  const ui = { file: 0, picked: new Set(), phase: 'pick', outcome: null, hinted: false, started: Date.now(), seconds: 0 };

  openSheet(problem.title, (body) => {
    const clock = h('span', { class: 'chip', 'aria-label': 'Time spent' }, '00:00');
    const tick = () => {
      if (!document.contains(body)) {
        clearInterval(timer);
        return;
      }
      if (ui.phase === 'pick') ui.seconds = Math.floor((Date.now() - ui.started) / 1000);
      clock.textContent = `${String(Math.floor(ui.seconds / 60)).padStart(2, '0')}:${String(ui.seconds % 60).padStart(2, '0')}`;
    };
    const timer = setInterval(tick, 1000);

    function marksFor(f) {
      const marks = new Map();
      problem.files[f].lines.forEach((_, line) => {
        const k = key(f, line);
        if (ui.phase === 'pick') {
          if (ui.picked.has(k)) marks.set(line, 'picked');
        } else if (bugKeys.has(k)) marks.set(line, 'bug');
        else if (ui.picked.has(k)) marks.set(line, 'wrong');
      });
      return marks;
    }

    function fileTabs() {
      if (problem.files.length < 2) return null;
      return h('div', { class: 'file-tabs', role: 'tablist' }, problem.files.map((file, f) => {
        let picks = 0;
        for (const k of ui.picked) if (k.startsWith(`${f}:`)) picks += 1;
        const flag = ui.phase === 'result' ? (file.bugs.length > 0 ? '●' : '') : picks > 0 ? String(picks) : '';
        return h('button', { class: 'file-tab', type: 'button', role: 'tab', 'aria-selected': String(ui.file === f), onclick: () => { ui.file = f; render(); } },
          file.name, flag ? h('span', { class: 'mark' }, flag) : null);
      }));
    }

    function check(gaveUp) {
      let hits = 0;
      let wrong = 0;
      for (const k of ui.picked) {
        if (bugKeys.has(k)) hits += 1;
        else wrong += 1;
      }
      ui.outcome = gaveUp ? 'shown' : hits > 0 ? (wrong === 0 ? 'found' : 'partly') : 'missed';
      tick();
      ui.phase = 'result';
      ui.file = firstBugFile;
      render();
    }

    function verdict() {
      const file = problem.files[firstBugFile];
      const where = `${file.name}, line ${file.bugs[0] + 1}`;
      if (ui.outcome === 'found') return h('p', { class: 'callout pass' }, h('b', null, 'FOUND IT'), `Correct. The bug is in ${where}.`);
      if (ui.outcome === 'partly') return h('p', { class: 'callout pass' }, h('b', null, 'FOUND IT, WITH NOISE'), `You flagged the bug in ${where}, and also lines that are fine (red).`);
      if (ui.outcome === 'missed') return h('p', { class: 'callout fail' }, h('b', null, 'MISSED'), `The lines you flagged are fine. The bug is in ${where} (green).`);
      return h('p', { class: 'callout' }, h('b', null, 'REVEALED'), `The bug is in ${where} (green).`);
    }

    function render() {
      const file = problem.files[ui.file];
      const head = [
        h('div', { class: 'chips' },
          h('span', { class: 'chip' }, LANGUAGES[problem.lang] || problem.lang),
          h('span', { class: `chip diff ${problem.difficulty}` }, problem.difficulty),
          problem.custom ? h('span', { class: 'chip ai' }, 'AI-generated') : null,
          ui.phase === 'result' || ui.hinted ? h('span', { class: 'chip attention' }, ui.phase === 'result' ? problem.tag : `hint: ${problem.tag}`) : null,
          clock
        ),
        h('p', { class: 'callout' }, h('b', null, 'SYMPTOM'), problem.scenario),
        h('div', null,
          fileTabs(),
          codeBlock(file.lines, problem.lang, {
            marks: marksFor(ui.file),
            onPick: ui.phase === 'pick' ? (line) => {
              const k = key(ui.file, line);
              if (ui.picked.has(k)) ui.picked.delete(k);
              else ui.picked.add(k);
              const scroller = body.querySelector('.code');
              const left = scroller ? scroller.scrollLeft : 0;
              render();
              const next = body.querySelector('.code');
              if (next) next.scrollLeft = left;
            } : null,
          })
        ),
      ];

      if (ui.phase === 'pick') {
        fill(body, ...head,
          h('p', { class: 'muted small' }, 'Tap the line you would flag in code review. You can flag more than one.'),
          h('div', { class: 'actions' },
            h('button', { class: 'btn primary', type: 'button', 'data-primary': true, disabled: ui.picked.size === 0, onclick: () => check(false) }, ui.picked.size > 0 ? `Check ${ui.picked.size} flagged` : 'Check my answer'),
            ui.hinted ? null : h('button', { class: 'btn', type: 'button', onclick: () => { ui.hinted = true; render(); } }, 'Hint'),
            h('button', { class: 'btn', type: 'button', onclick: () => check(true) }, 'Show me the bug')
          )
        );
        return;
      }

      const card = store.get().cards[problem.id];
      const note = h('textarea', { id: 'hunt-note', value: card ? card.note : '', placeholder: 'What will you look for next time? e.g. "async function called without await is always truthy".' });
      const suggested = ui.outcome === 'found' ? (ui.hinted ? 'hard' : 'good') : ui.outcome === 'partly' ? 'hard' : 'again';
      const minutes = Math.max(1, Math.round(ui.seconds / 60));
      fill(body, ...head,
        verdict(),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Why it is a bug'), h('p', null, problem.explanation)),
        problem.fix ? h('div', { class: 'field' }, h('span', { class: 'label' }, 'Fix'), codeBlock(problem.fix.split('\n'), problem.lang)) : null,
        h('div', { class: 'field' }, h('label', { for: 'hunt-note' }, 'Your takeaway'), note),
        h('div', { class: 'field' },
          h('span', { class: 'label' }, 'Grade yourself. Tap to save.'),
          gradeButtons(problem, GRADE_LABELS.hunt, () => ({ note: note.value.trim(), minutes }), suggested)
        )
      );
    }

    render();
  }, { wide: true });
}
