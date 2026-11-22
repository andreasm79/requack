import { fill, h, plural, toast } from './dom.js';
import { codeBlock, langFor } from './code.js';
import { gradeButtons, GRADE_LABELS } from './grade.js';
import { openSheet } from './sheet.js';
import { sessionLabel } from './session.js';
import { store } from '../core/store.js';
import { LANGUAGES } from '../data/kinds.js';
import { isRunnableRepo } from '../data/hunts.js';
import { createIde } from './ide.js';

const REPO_MIN_FILES = 4;
let activeHunt = null;
const GREP_MIN = 2;
const GREP_MAX_RESULTS = 40;
const FLAG_WORDS = {
  tab: ['tab switch', 'tab switches'],
  fullscreen: ['fullscreen exit', 'fullscreen exits'],
  paste: ['paste attempt', 'paste attempts'],
  copy: ['copy attempt', 'copy attempts'],
};

function key(file, line) {
  return `${file}:${line}`;
}

function clockText(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function oaLimitFor(problem) {
  const repo = problem.files.length >= REPO_MIN_FILES;
  const minutes = { Easy: repo ? 12 : 4, Medium: repo ? 15 : 6, Hard: repo ? 20 : 8 }[problem.difficulty] || 8;
  return minutes * 60;
}

export function flagCount(flags) {
  return Object.values(flags || {}).reduce((sum, value) => sum + value, 0);
}

export function describeFlags(flags) {
  const parts = Object.entries(flags || {})
    .filter(([, value]) => value > 0)
    .map(([name, value]) => `${value} ${FLAG_WORDS[name][value === 1 ? 0 : 1]}`);
  return parts.length > 0 ? parts.join(', ') : 'clean';
}

function picksIn(ui, f) {
  let picks = 0;
  for (const k of ui.picked) if (k.startsWith(`${f}:`)) picks += 1;
  return picks;
}

function fileFlag(ui, file, f) {
  if (ui.phase === 'result') return file.bugs.length > 0 ? '●' : '';
  const picks = picksIn(ui, f);
  return picks > 0 ? String(picks) : '';
}

function fileTree(problem, ui, onOpen) {
  const rows = [];
  let previous = [];
  problem.files.forEach((file, f) => {
    const parts = file.name.split('/');
    const dirs = parts.slice(0, -1);
    let shared = 0;
    while (shared < dirs.length && dirs[shared] === previous[shared]) shared += 1;
    for (let depth = shared; depth < dirs.length; depth++) {
      rows.push(h('div', { class: 'tree-dir', style: `padding-left:${10 + depth * 12}px` }, `${dirs[depth]}/`));
    }
    previous = dirs;
    const flag = fileFlag(ui, file, f);
    rows.push(h('button', {
      class: `tree-file${ui.file === f ? ' active' : ''}`, type: 'button', style: `padding-left:${10 + dirs.length * 12}px`,
      'aria-current': ui.file === f ? 'true' : null, onclick: () => onOpen(f),
    }, h('span', { class: 'tree-name' }, parts[parts.length - 1]), flag ? h('span', { class: 'mark' }, flag) : null));
  });
  return h('nav', { class: 'tree', 'aria-label': 'Files' }, rows);
}

function fileSelect(problem, ui, onOpen) {
  return h('select', { class: 'file-select', 'aria-label': 'Open file', onchange: (event) => onOpen(Number(event.target.value)) },
    problem.files.map((file, f) => {
      const flag = fileFlag(ui, file, f);
      return h('option', { value: String(f), selected: ui.file === f }, flag ? `${file.name}  [${flag}]` : file.name);
    }));
}

function fileTabs(problem, ui, onOpen) {
  return h('div', { class: 'file-tabs', role: 'tablist' }, problem.files.map((file, f) => {
    const flag = fileFlag(ui, file, f);
    return h('button', { class: 'file-tab', type: 'button', role: 'tab', 'aria-selected': String(ui.file === f), onclick: () => onOpen(f) },
      file.name, flag ? h('span', { class: 'mark' }, flag) : null);
  }));
}

function grepPanel(problem, onJump) {
  const results = h('div', { class: 'grep-results' });
  const input = h('input', { type: 'search', class: 'grep-input', placeholder: `grep across ${problem.files.length} files…`, 'aria-label': 'Search all files' });
  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (query.length < GREP_MIN) {
      fill(results);
      return;
    }
    const hits = [];
    problem.files.forEach((file, f) => file.lines.forEach((line, l) => {
      if (hits.length < GREP_MAX_RESULTS && line.toLowerCase().includes(query)) hits.push({ f, l, line });
    }));
    fill(results, hits.length === 0
      ? h('p', { class: 'muted small grep-empty' }, 'No matches.')
      : hits.map((hit) => h('button', { class: 'grep-hit', type: 'button', onclick: () => onJump(hit.f, hit.l) },
        h('span', { class: 'grep-loc' }, `${problem.files[hit.f].name}:${hit.l + 1}`),
        h('span', { class: 'grep-text' }, hit.line.trim()))));
  });
  return h('div', { class: 'grep' }, input, results);
}

export function openHunt(problem, { oa = null } = {}) {
  const repo = problem.files.length >= REPO_MIN_FILES;
  const bugKeys = new Set();
  problem.files.forEach((file, f) => file.bugs.forEach((line) => bugKeys.add(key(f, line))));
  const firstBugFile = problem.files.findIndex((file) => file.bugs.length > 0);
  const ui = {
    file: 0, picked: new Set(), phase: oa ? 'brief' : 'pick', outcome: null, hinted: false,
    started: Date.now(), seconds: 0, flash: null, timedOut: false,
    flags: { tab: 0, fullscreen: 0, paste: 0, copy: 0 }, inFullscreen: false,
    view: 'review', fixed: false,
  };
  const runnable = isRunnableRepo(problem);
  let ide = null;
  const token = {};
  activeHunt = token;

  openSheet(problem.title, (body) => {
    const clock = h('span', { class: 'chip', 'aria-label': oa ? 'Time left' : 'Time spent' }, oa ? clockText(oa.limit) : '00:00');
    const oaChip = oa ? h('span', { class: 'chip attention' }, 'OA · 0 flags') : null;
    let grep = null;
    let watching = false;

    function bump(flag) {
      ui.flags[flag] += 1;
      oaChip.textContent = `OA · ${plural(flagCount(ui.flags), 'flag')}`;
    }

    const guards = {
      visibility: () => { if (document.hidden && ui.phase === 'pick') bump('tab'); },
      fullscreen: () => {
        if (document.fullscreenElement) {
          ui.inFullscreen = true;
        } else if (ui.inFullscreen) {
          ui.inFullscreen = false;
          if (ui.phase === 'pick') bump('fullscreen');
        }
      },
      copy: (event) => {
        if (ui.phase !== 'pick') return;
        event.preventDefault();
        bump('copy');
        toast('Copying is off during an OA. Logged.');
      },
      paste: (event) => {
        if (ui.phase !== 'pick') return;
        event.preventDefault();
        bump('paste');
        toast('Pasting is off during an OA. Logged.');
      },
    };

    function watch(on) {
      if (watching === on) return;
      watching = on;
      const method = on ? 'addEventListener' : 'removeEventListener';
      document[method]('visibilitychange', guards.visibility);
      document[method]('fullscreenchange', guards.fullscreen);
      document[method]('copy', guards.copy, true);
      document[method]('cut', guards.copy, true);
      document[method]('paste', guards.paste, true);
    }

    function leaveFullscreen() {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }

    function moreOaToCome() {
      const label = sessionLabel();
      if (!oa || !label) return false;
      const [done, total] = label.split('/').map(Number);
      return done < total;
    }

    function tick() {
      if (!document.contains(body)) {
        clearInterval(timer);
        watch(false);
        if (activeHunt === token) leaveFullscreen();
        return;
      }
      if (ui.phase === 'pick') ui.seconds = Math.floor((Date.now() - ui.started) / 1000);
      if (!oa) {
        clock.textContent = clockText(ui.seconds);
        return;
      }
      const left = oa.limit - ui.seconds;
      if (ui.phase !== 'brief') clock.textContent = clockText(left);
      clock.classList.toggle('attention', ui.phase === 'pick' && left <= 60);
      if (left <= 0 && ui.phase === 'pick') {
        ui.timedOut = true;
        check(false);
      }
    }
    const timer = setInterval(tick, 1000);

    function marksFor(f) {
      const marks = new Map();
      problem.files[f].lines.forEach((_, line) => {
        const k = key(f, line);
        if (ui.phase !== 'result') {
          if (ui.picked.has(k)) marks.set(line, 'picked');
        } else if (bugKeys.has(k)) marks.set(line, 'bug');
        else if (ui.picked.has(k)) marks.set(line, 'wrong');
        if (ui.flash && ui.flash.f === f && ui.flash.l === line && !marks.has(line)) marks.set(line, 'flash');
      });
      return marks;
    }

    function openFile(f, line = null) {
      ui.file = f;
      ui.flash = line === null ? null : { f, l: line };
      render();
      const code = body.querySelector('.code');
      if (!code) return;
      if (line === null) {
        code.scrollTop = 0;
        return;
      }
      const target = code.querySelector(`[data-line="${line}"]`);
      if (target) code.scrollTop = Math.max(0, target.offsetTop - code.clientHeight / 2);
    }

    function fixedIt() {
      ui.fixed = true;
      if (ui.phase === 'pick') {
        if (ui.picked.size === 0) problem.files.forEach((file, f) => file.bugs.forEach((line) => ui.picked.add(key(f, line))));
        check(false, true);
      } else {
        render();
      }
    }

    function check(gaveUp, viaFix = false) {
      let hits = 0;
      let wrong = 0;
      for (const k of ui.picked) {
        if (bugKeys.has(k)) hits += 1;
        else wrong += 1;
      }
      ui.outcome = gaveUp ? 'shown' : hits > 0 ? (wrong === 0 ? 'found' : 'partly') : 'missed';
      if (viaFix) ui.outcome = 'fixed';
      ui.view = 'review';
      if (ui.phase === 'pick') ui.seconds = Math.floor((Date.now() - ui.started) / 1000);
      ui.phase = 'result';
      ui.file = firstBugFile;
      ui.flash = null;
      watch(false);
      if (!moreOaToCome()) leaveFullscreen();
      render();
      const code = body.querySelector('.code');
      const bug = code && code.querySelector('.code-line.bug');
      if (bug) code.scrollTop = Math.max(0, bug.offsetTop - code.clientHeight / 2);
    }

    function start() {
      ui.phase = 'pick';
      ui.started = Date.now();
      ui.inFullscreen = Boolean(document.fullscreenElement);
      watch(true);
      const root = document.documentElement;
      if (!ui.inFullscreen && root.requestFullscreen) {
        root.requestFullscreen().catch(() => toast('Fullscreen is blocked here. The timer and the integrity log still run.'));
      }
      clock.textContent = clockText(oa.limit);
      render();
    }

    function verdict() {
      const file = problem.files[firstBugFile];
      const where = `${file.name}, line ${file.bugs[0] + 1}`;
      const late = ui.timedOut ? ' Time ran out, so your flags were submitted automatically.' : '';
      if (ui.outcome === 'fixed') return h('div', { class: 'callout pass' }, h('b', null, 'FIXED'), `Your change makes every visible and hidden test pass. The bug was in ${where}.`);
      if (ui.outcome === 'found') return h('div', { class: 'callout pass' }, h('b', null, 'FOUND IT'), `Correct. The bug is in ${where}.${late}${runnable && !ui.fixed ? ' Now try to fix it in Fix & test.' : ''}`);
      if (ui.outcome === 'partly') return h('div', { class: 'callout pass' }, h('b', null, 'FOUND IT, WITH NOISE'), `You flagged the bug in ${where}, and also lines that are fine (red).${late}`);
      if (ui.outcome === 'missed') {
        return h('div', { class: 'callout fail' }, h('b', null, ui.timedOut ? 'TIME UP' : 'MISSED'),
          `${ui.picked.size > 0 ? 'The lines you flagged are fine. ' : ''}The bug is in ${where} (green).`);
      }
      return h('div', { class: 'callout' }, h('b', null, 'REVEALED'), `The bug is in ${where} (green).`);
    }

    function integrityReport() {
      if (!oa) return null;
      const total = flagCount(ui.flags);
      return h('div', { class: `callout ${total === 0 ? 'pass' : 'fail'}` },
        h('b', null, total === 0 ? 'INTEGRITY: CLEAN' : `INTEGRITY: ${plural(total, 'flag').toUpperCase()}`),
        total === 0
          ? `Used ${clockText(ui.seconds)} of ${clockText(oa.limit)} without leaving the test.`
          : `${describeFlags(ui.flags)}. A real OA logs these for the reviewer.`);
    }

    function pick(line) {
      const k = key(ui.file, line);
      if (ui.picked.has(k)) ui.picked.delete(k);
      else ui.picked.add(k);
      const scroller = body.querySelector('.code');
      const left = scroller ? scroller.scrollLeft : 0;
      const top = scroller ? scroller.scrollTop : 0;
      ui.flash = null;
      render();
      const next = body.querySelector('.code');
      if (next) {
        next.scrollLeft = left;
        next.scrollTop = top;
      }
    }

    function viewSwitch() {
      if (!runnable) return null;
      const pill = (value, label) => h('button', {
        class: 'pill', type: 'button', 'aria-pressed': String(ui.view === value),
        onclick: () => { ui.view = value; render(); if (value === 'ide') ide.refresh(); },
      }, label);
      return h('div', { class: 'view-switch', role: 'group', 'aria-label': 'View' }, pill('review', 'Review'), pill('ide', `Fix & test${ui.fixed ? ' ✓' : ''}`));
    }

    function codeArea() {
      if (runnable && ui.view === 'ide') {
        if (!ide) ide = createIde(problem, { onFixed: fixedIt });
        return ide.el;
      }
      const file = problem.files[ui.file];
      const block = codeBlock(file.lines, langFor(file.name, problem.lang), {
        marks: marksFor(ui.file),
        onPick: ui.phase === 'pick' ? pick : null,
      });
      if (!repo) return h('div', null, problem.files.length > 1 ? fileTabs(problem, ui, openFile) : null, block);
      if (!grep) grep = grepPanel(problem, (f, l) => openFile(f, l));
      return h('div', { class: 'repo' },
        fileTree(problem, ui, openFile),
        h('div', { class: 'repo-main' },
          grep,
          h('div', { class: 'repo-path' },
            fileSelect(problem, ui, openFile),
            h('span', { class: 'repo-name' }, file.name),
            h('span', { class: 'repo-lines' }, `${file.lines.length} lines`)),
          block));
    }

    function briefing() {
      const lines = problem.files.reduce((sum, file) => sum + file.lines.length, 0);
      const minutes = Math.round(oa.limit / 60);
      return [
        h('div', { class: 'chips' },
          h('span', { class: 'chip' }, LANGUAGES[problem.lang] || problem.lang),
          h('span', { class: `chip diff ${problem.difficulty}` }, problem.difficulty),
          h('span', { class: 'chip' }, `${plural(problem.files.length, 'file')}, ${lines} lines`),
          h('span', { class: 'chip attention' }, `${minutes} min`)),
        h('div', { class: 'callout' }, h('b', null, 'OA MODE'), 'This runs like an online assessment. Read the rules, then start when you are ready.'),
        h('ul', { class: 'rules' },
          h('li', null, `You have ${minutes} minutes. The timer does not pause, and whatever you have flagged is submitted at zero.`),
          h('li', null, 'The test goes fullscreen. Leaving fullscreen or switching tabs is logged.'),
          h('li', null, 'Copy and paste are blocked, and each attempt is logged.'),
          h('li', null, 'No hints and no "show me". You get an integrity report at the end.')),
        h('button', { class: 'btn primary wide', type: 'button', 'data-primary': true, onclick: start }, '▶ Start the assessment'),
      ];
    }

    function render() {
      if (ui.phase === 'brief') {
        fill(body, ...briefing());
        return;
      }
      const head = [
        h('div', { class: 'chips' },
          h('span', { class: 'chip' }, LANGUAGES[problem.lang] || problem.lang),
          h('span', { class: `chip diff ${problem.difficulty}` }, problem.difficulty),
          repo ? h('span', { class: 'chip' }, plural(problem.files.length, 'file')) : null,
          problem.custom ? h('span', { class: 'chip ai' }, 'AI-generated') : null,
          ui.phase === 'result' || ui.hinted ? h('span', { class: 'chip attention' }, ui.phase === 'result' ? problem.tag : `hint: ${problem.tag}`) : null,
          oaChip,
          clock
        ),
        h('div', { class: 'callout' }, h('b', null, repo ? 'TICKET' : 'SYMPTOM'), problem.scenario),
        viewSwitch(),
        codeArea(),
      ];

      if (ui.phase === 'pick') {
        fill(body, ...head,
          h('p', { class: 'muted small' }, ui.view === 'ide'
            ? 'Fix the bug and Submit fix. Passing the hidden tests counts as finding it.'
            : repo
              ? `Open files from the tree, or grep. Tap the line you would flag in review. You can flag lines in more than one file.${runnable ? ' Or go to Fix & test and fix it.' : ''}`
              : 'Tap the line you would flag in code review. You can flag more than one.'),
          h('div', { class: 'actions' },
            h('button', { class: 'btn primary', type: 'button', 'data-primary': true, disabled: ui.picked.size === 0, onclick: () => check(false) },
              ui.picked.size > 0 ? `Submit ${ui.picked.size} flagged` : 'Submit'),
            ui.hinted || oa ? null : h('button', { class: 'btn', type: 'button', onclick: () => { ui.hinted = true; render(); } }, 'Hint'),
            oa ? null : h('button', { class: 'btn', type: 'button', onclick: () => check(true) }, 'Show me the bug')
          )
        );
        return;
      }

      const card = store.get().cards[problem.id];
      const note = h('textarea', { id: 'hunt-note', value: card ? card.note : '', placeholder: 'What will you look for next time? e.g. "async function called without await is always truthy".' });
      const suggested = ui.outcome === 'fixed' ? (ui.hinted ? 'hard' : 'good') : ui.outcome === 'found' ? (ui.hinted ? 'hard' : 'good') : ui.outcome === 'partly' ? 'hard' : 'again';
      const minutes = Math.max(1, Math.round(ui.seconds / 60));
      const integrity = oa ? { limit: oa.limit, used: ui.seconds, timedOut: ui.timedOut, flags: { ...ui.flags } } : null;
      const fixFile = problem.files[firstBugFile];
      if (ui.view === 'ide') {
        fill(body, ...head, verdict(), integrityReport());
        return;
      }
      fill(body, ...head,
        verdict(),
        integrityReport(),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Why it is a bug'), h('p', null, problem.explanation)),
        problem.fix ? h('div', { class: 'field' }, h('span', { class: 'label' }, 'Fix'), codeBlock(problem.fix.split('\n'), langFor(fixFile.name, problem.lang))) : null,
        problem.source ? h('p', { class: 'source-line' }, 'Based on a real incident: ', h('a', { href: problem.source.url, target: '_blank', rel: 'noopener' }, `${problem.source.label} ↗`)) : null,
        h('div', { class: 'field' }, h('label', { for: 'hunt-note' }, 'Your takeaway'), note),
        h('div', { class: 'field' },
          h('span', { class: 'label' }, 'Grade yourself. Tap to save.'),
          gradeButtons(problem, GRADE_LABELS.hunt, () => ({ note: note.value.trim(), minutes, oa: integrity }), suggested)
        )
      );
    }

    render();
  }, { wide: true, xwide: repo });
}
