import { fill, h, plural, toast } from './dom.js';
import { createEditor } from './editor.js';
import { gradeButtons, GRADE_LABELS } from './grade.js';
import { openSheet } from './sheet.js';
import { runFunctionTests, pythonReady, trimLogs } from './runtime.js';
import { store } from '../core/store.js';
import { ratingFor, sameAnswer, show } from '../core/judge.js';
import { signature, starterCode } from '../core/starter.js';
import { RUNNABLE_IDS } from '../data/runnable-index.js';

const LANGS = { python: 'Python', javascript: 'JavaScript' };
let bank = null;

export function isRunnable(id) {
  return RUNNABLE_IDS.includes(id);
}

export async function loadRunnable(id) {
  if (!bank) bank = (await import('../data/runnable.js')).RUNNABLE;
  return bank.find((problem) => problem.id === id) || null;
}

function argsText(problem, args) {
  return problem.params.map(([name], i) => `${name} = ${show(args[i], 120)}`).join(', ');
}

function statement(problem) {
  return h('div', { class: 'statement' },
    problem.statement.map((paragraph) => h('p', null, paragraph)),
    problem.examples.map((example, i) => h('div', { class: 'example' },
      h('span', { class: 'label' }, `Example ${i + 1}`),
      h('pre', null, `Input:  ${argsText(problem, example.args)}\nOutput: ${show(example.expected, 200)}`))),
    h('div', { class: 'example' }, h('span', { class: 'label' }, 'Constraints'),
      h('ul', { class: 'constraints' }, problem.constraints.map((line) => h('li', null, line)))));
}

export async function openSolve(id, { oa = null, onFinish = null } = {}) {
  const problem = await loadRunnable(id);
  if (!problem) {
    toast('That problem has no runnable version yet.');
    return;
  }
  const saved = store.get().code[id] || {};
  const ui = {
    lang: saved.lang || 'python',
    status: 'Write your solution, then Run to try the examples or Submit to run every test.',
    statusKind: '',
    results: [],
    logs: '',
    busy: false,
    best: null,
    started: Date.now(),
    tab: 'tests',
  };
  const codeFor = (lang) => (store.get().code[id] || {})[lang] || starterCode(problem, lang);

  openSheet(problem.title, (body) => {
    let saveTimer = null;
    const editor = createEditor({
      value: codeFor(ui.lang),
      lang: ui.lang,
      onChange: (value) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => store.saveCode(id, { [ui.lang]: value, lang: ui.lang }), 400);
      },
      onRun: () => execute(false),
      onSubmit: () => execute(true),
    });
    const status = h('p', { class: 'run-status', role: 'status' });
    const signatureChip = h('span', { class: 'chip mono' }, signature(problem, ui.lang));
    const results = h('div', { class: 'run-results' });
    const clock = h('span', { class: 'chip' }, '00:00');
    const runButton = h('button', { class: 'btn', type: 'button', onclick: () => execute(false) }, '▷ Run');
    const submitButton = h('button', { class: 'btn primary', type: 'button', 'data-primary': true, onclick: () => execute(true) }, 'Submit');
    const grade = h('div');
    const timer = setInterval(() => {
      if (!document.contains(body)) {
        clearInterval(timer);
        return;
      }
      const seconds = Math.floor((Date.now() - ui.started) / 1000);
      if (oa) {
        const left = Math.max(0, oa.deadline - Date.now());
        clock.textContent = `${String(Math.floor(left / 60000)).padStart(2, '0')}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`;
        clock.classList.toggle('attention', left < 60000);
      } else {
        clock.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      }
    }, 1000);

    function setStatus(text, kind = '') {
      ui.status = text;
      ui.statusKind = kind;
      status.textContent = text;
      status.className = `run-status ${kind}`;
    }

    function switchLang(lang) {
      if (lang === ui.lang || ui.busy) return;
      store.saveCode(id, { [ui.lang]: editor.getValue(), lang });
      ui.lang = lang;
      editor.setLang(lang);
      editor.setValue(codeFor(lang));
      paintLangs();
      signatureChip.textContent = signature(problem, lang);
      setStatus(lang === 'python' && !pythonReady() ? 'Python loads the first time you run (about 10 MB, once per visit).' : `Switched to ${LANGS[lang]}.`);
    }

    const langPills = h('div', { class: 'pills', role: 'group', 'aria-label': 'Language' });
    function paintLangs() {
      fill(langPills, ...Object.entries(LANGS).map(([value, label]) =>
        h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.lang === value), onclick: () => switchLang(value) }, label)));
    }

    function row(result) {
      const icon = result.status === 'pass' ? '✓' : result.status === 'skip' ? '·' : '✗';
      const head = h('div', { class: 'test-head' },
        h('span', { class: `test-icon ${result.status}` }, icon),
        h('span', null, result.label),
        result.ms !== undefined ? h('span', { class: 'test-ms' }, `${result.ms} ms`) : null);
      if (result.status === 'pass' && !result.showDetail) return h('div', { class: 'test-row' }, head);
      const lines = [];
      if (result.input) lines.push(`Input:    ${result.input}`);
      if (result.expected !== undefined) lines.push(`Expected: ${result.expected}`);
      if (result.got !== undefined) lines.push(`Got:      ${result.got}`);
      if (result.error) lines.push(result.error);
      return h('div', { class: 'test-row' }, head, lines.length ? h('pre', { class: 'test-detail' }, lines.join('\n')) : null);
    }

    function paintResults() {
      const tabs = h('div', { class: 'pills' },
        h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.tab === 'tests'), onclick: () => { ui.tab = 'tests'; paintResults(); } }, `Tests${ui.results.length ? ` (${ui.results.filter((r) => r.status === 'pass').length}/${ui.results.length})` : ''}`),
        h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.tab === 'console'), onclick: () => { ui.tab = 'console'; paintResults(); } }, `Console${ui.logs ? ' •' : ''}`));
      const content = ui.tab === 'console'
        ? h('pre', { class: 'console' }, ui.logs ? trimLogs(ui.logs) : 'print() / console.log() output shows up here.')
        : ui.results.length > 0
          ? h('div', { class: 'test-list' }, ui.results.map(row))
          : h('p', { class: 'muted small' }, 'No runs yet.');
      fill(results, tabs, content);
    }

    async function execute(submit) {
      if (ui.busy) return;
      ui.busy = true;
      runButton.disabled = true;
      submitButton.disabled = true;
      const code = editor.getValue();
      store.saveCode(id, { [ui.lang]: code, lang: ui.lang });
      const cases = submit ? [...problem.examples, ...problem.tests] : problem.examples;
      ui.results = cases.map((test, i) => ({ status: 'skip', label: test.kind === 'example' ? `Example ${i + 1}` : `Hidden test ${i + 1 - problem.examples.length}${test.kind === 'large' ? ' (large input)' : ''}` }));
      ui.logs = '';
      ui.tab = 'tests';
      paintResults();
      setStatus(ui.lang === 'python' && !pythonReady() ? 'Loading Python (first run only)…' : `Running ${plural(cases.length, 'test')}…`);
      const outcome = await runFunctionTests({
        lang: ui.lang,
        code,
        fn: problem.fn[ui.lang === 'python' ? 'python' : 'js'],
        tests: cases.map((test) => test.args),
        timeoutMs: ui.lang === 'python' ? 10000 : 6000,
        onEvent: (event) => {
          if (event.type === 'booted') setStatus(`Python ready. Running ${plural(cases.length, 'test')}…`);
        },
      });
      ui.busy = false;
      runButton.disabled = false;
      submitButton.disabled = false;
      if (outcome.unavailable) {
        setStatus(outcome.unavailable, 'bad');
        return;
      }
      const fatal = outcome.events.find((event) => event.type === 'fatal');
      if (fatal) {
        ui.logs = fatal.logs || '';
        ui.results = [{ status: 'fail', label: fatal.error.startsWith('Define') ? 'Missing function' : 'Your code did not run', error: fatal.error }];
        setStatus(fatal.error.split('\n').pop(), 'bad');
        paintResults();
        return;
      }
      const started = new Set(outcome.events.filter((event) => event.type === 'start').map((event) => event.index));
      for (const event of outcome.events.filter((e) => e.type === 'result')) {
        const test = cases[event.index];
        const hidden = test.kind !== 'example';
        const detail = !hidden || !oa;
        const ok = !event.error && sameAnswer(test.expected, event.actual, problem.compare);
        ui.logs += event.logs || '';
        ui.results[event.index] = {
          ...ui.results[event.index],
          status: ok ? 'pass' : 'fail',
          ms: event.ms,
          showDetail: !hidden,
          input: detail ? argsText(problem, test.args) : '',
          expected: detail ? show(test.expected) : undefined,
          got: event.error ? undefined : detail ? show(event.actual) : undefined,
          error: event.error ? (detail ? event.error : event.error.split('\n').pop()) : '',
        };
      }
      if (outcome.timedOut) {
        const stuck = [...started].find((index) => ui.results[index].status === 'skip');
        if (stuck !== undefined) ui.results[stuck] = { ...ui.results[stuck], status: 'fail', error: 'Time limit exceeded. Look for an O(n²) loop or one that never ends.' };
      }
      const passed = ui.results.filter((result) => result.status === 'pass').length;
      const firstBad = ui.results.find((result) => result.status === 'fail');
      if (passed === cases.length) setStatus(submit ? `Accepted. All ${cases.length} tests passed.` : 'All examples pass. Submit to run the hidden tests.', 'good');
      else if (firstBad) setStatus(`${passed}/${cases.length} passed. ${firstBad.label}: ${firstBad.error && firstBad.error.startsWith('Time limit') ? 'time limit exceeded' : firstBad.error ? 'error' : 'wrong answer'}.`, 'bad');
      else setStatus(`${passed}/${cases.length} passed.`, 'bad');
      paintResults();
      if (submit) finishSubmit(passed, cases.length);
    }

    function finishSubmit(passed, total) {
      const minutes = Math.max(1, Math.round((Date.now() - ui.started) / 60000));
      ui.best = !ui.best || passed > ui.best.passed ? { passed, total, lang: ui.lang } : ui.best;
      if (oa) {
        oa.record(id, { passed, total, lang: ui.lang });
        return;
      }
      fill(grade, h('div', { class: 'field' },
        h('span', { class: 'label' }, passed === total ? 'Accepted. Grade how it felt, to schedule the recall.' : 'Not all tests pass yet. Keep going, or grade it now.'),
        gradeButtons({ id, title: problem.title }, GRADE_LABELS.codingFirst, () => ({ minutes, note: null }), ratingFor(passed, total))));
    }

    paintLangs();
    paintResults();
    setStatus(ui.status);
    const nav = oa ? h('div', { class: 'actions' },
      h('span', { class: 'muted small' }, `Question ${oa.position} of ${oa.count}`),
      oa.hasPrevious ? h('button', { class: 'btn', type: 'button', onclick: () => oa.go(-1) }, '← Previous') : null,
      h('button', { class: 'btn', type: 'button', onclick: () => oa.go(1) }, oa.position < oa.count ? 'Next question →' : 'Review and finish')) : null;

    fill(body,
      h('div', { class: 'chips' },
        h('span', { class: `chip diff ${problem.difficulty}` }, problem.difficulty),
        signatureChip,
        oa ? oa.chip : null,
        clock),
      h('div', { class: 'solve' },
        h('div', { class: 'solve-left' }, statement(problem)),
        h('div', { class: 'solve-right' },
          langPills,
          editor.el,
          h('div', { class: 'actions run-bar' }, runButton, submitButton,
            h('button', { class: 'btn', type: 'button', onclick: () => { if (!ui.busy) { editor.setValue(starterCode(problem, ui.lang)); setStatus('Reset to the starter code.'); } } }, 'Reset'),
            h('span', { class: 'muted small kbd-hint' }, 'Ctrl+Enter run · Ctrl+Shift+Enter submit')),
          status,
          results,
          grade)),
      nav);
    editor.refresh();
    if (onFinish) onFinish(body);
  }, { wide: true, xwide: true });
}
