import { fill, h } from './dom.js';
import { createEditor } from './editor.js';
import { langFor } from './code.js';
import { runRepoTests, pythonReady } from './runtime.js';
import { store } from '../core/store.js';
import { testFilesOf } from '../data/hunts.js';

const TIMEOUT_MS = 6000;

function editorLang(path, fallback) {
  const lang = langFor(path, fallback);
  if (path.endsWith('.json')) return 'json';
  return lang === 'python' || lang === 'javascript' ? lang : 'plain';
}

export function createIde(problem, { onFixed = () => {} } = {}) {
  const originals = Object.fromEntries(problem.files.map((file) => [file.name, `${file.lines.join('\n')}\n`]));
  const saved = (store.get().code[problem.id] || {}).files || {};
  const edits = Object.fromEntries(Object.entries(saved).filter(([path]) => originals[path] !== undefined));
  const visibleTests = testFilesOf(problem);
  const ui = { path: visibleTests.length ? problem.files.find((file) => !visibleTests.includes(file.name)).name : problem.files[0].name, busy: false, lines: [] };
  const content = (path) => (edits[path] !== undefined ? edits[path] : originals[path]);

  let saveTimer = null;
  const editor = createEditor({
    value: content(ui.path),
    lang: editorLang(ui.path, problem.lang),
    onChange: (value) => {
      if (value === originals[ui.path]) delete edits[ui.path];
      else edits[ui.path] = value;
      paintTree();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => store.saveCode(problem.id, { files: { ...edits } }), 400);
    },
    onRun: () => execute(false),
    onSubmit: () => execute(true),
  });

  const tree = h('nav', { class: 'tree', 'aria-label': 'Files' });
  const select = h('select', { class: 'file-select', 'aria-label': 'Open file', onchange: (event) => open(event.target.value) });
  const pathLabel = h('span', { class: 'repo-name' });
  const terminal = h('pre', { class: 'terminal', 'aria-live': 'polite' });
  const runButton = h('button', { class: 'btn', type: 'button', onclick: () => execute(false) }, '▷ Run tests');
  const submitButton = h('button', { class: 'btn primary', type: 'button', onclick: () => execute(true) }, 'Submit fix');
  const resetButton = h('button', {
    class: 'btn', type: 'button',
    onclick: () => {
      delete edits[ui.path];
      editor.setValue(originals[ui.path]);
      store.saveCode(problem.id, { files: { ...edits } });
      paintTree();
    },
  }, 'Reset file');

  function open(path) {
    ui.path = path;
    editor.setValue(content(path));
    editor.setLang(editorLang(path, problem.lang));
    paintTree();
    editor.refresh();
  }

  function paintTree() {
    const rows = [];
    let previous = [];
    problem.files.forEach((file) => {
      const parts = file.name.split('/');
      const dirs = parts.slice(0, -1);
      let shared = 0;
      while (shared < dirs.length && dirs[shared] === previous[shared]) shared += 1;
      for (let depth = shared; depth < dirs.length; depth++) rows.push(h('div', { class: 'tree-dir', style: `padding-left:${10 + depth * 12}px` }, `${dirs[depth]}/`));
      previous = dirs;
      rows.push(h('button', {
        class: `tree-file${ui.path === file.name ? ' active' : ''}`, type: 'button', style: `padding-left:${10 + dirs.length * 12}px`,
        'aria-current': ui.path === file.name ? 'true' : null, onclick: () => open(file.name),
      }, h('span', { class: 'tree-name' }, parts[parts.length - 1]), edits[file.name] !== undefined ? h('span', { class: 'edited', title: 'Edited' }, 'M') : null));
    });
    fill(tree, ...rows);
    fill(select, ...problem.files.map((file) => h('option', { value: file.name, selected: ui.path === file.name }, `${file.name}${edits[file.name] !== undefined ? '  (edited)' : ''}`)));
    pathLabel.textContent = ui.path;
  }

  function print(text, cls = '') {
    ui.lines.push({ text, cls });
    fill(terminal, ...ui.lines.map((line) => (line.cls ? h('span', { class: line.cls }, line.text) : line.text)));
    terminal.scrollTop = terminal.scrollHeight;
  }

  async function execute(submit) {
    if (ui.busy) return;
    ui.busy = true;
    runButton.disabled = true;
    submitButton.disabled = true;
    ui.lines = [];
    const files = Object.fromEntries(problem.files.map((file) => [file.name, content(file.name)]));
    const tests = [...visibleTests];
    if (submit) {
      for (const file of problem.acceptance) files[file.name] = file.code;
      tests.push(...problem.acceptance.map((file) => file.name));
    }
    const command = problem.lang === 'python' ? 'python -m pytest' : 'node --test';
    print(`$ ${command}${submit ? '  # plus hidden acceptance tests' : ''}\n`, 't-head');
    if (problem.lang === 'python' && !pythonReady()) print('loading Python (first run only)…\n', 't-dim');
    let current = null;
    const outcome = await runRepoTests({
      lang: problem.lang, files, tests, timeoutMs: TIMEOUT_MS,
      onEvent: (event) => {
        if (event.type === 'start') current = event;
        if (event.type !== 'result') return;
        current = null;
        const label = `${event.file} :: ${event.name}`;
        if (event.logs) print(event.logs.replace(/\n?$/, '\n'), 't-dim');
        if (event.status === 'pass') print(`PASS  ${label}  (${event.ms} ms)\n`, 't-pass');
        else {
          print(`${event.status === 'fail' ? 'FAIL' : 'ERROR'}  ${label}\n`, 't-fail');
          if (event.error) print(`${event.error.replace(/^/gm, '      ')}\n`, 't-dim');
        }
      },
    });
    ui.busy = false;
    runButton.disabled = false;
    submitButton.disabled = false;
    if (outcome.unavailable) {
      print(`\n${outcome.unavailable}\n`, 't-fail');
      return;
    }
    const results = outcome.events.filter((event) => event.type === 'result');
    let failed = results.filter((event) => event.status !== 'pass').length;
    if (outcome.timedOut) {
      failed += 1;
      print(`TIMEOUT  ${current ? `${current.file} :: ${current.name}` : 'test run'} took longer than ${TIMEOUT_MS / 1000} s and was stopped\n`, 't-fail');
    }
    const passed = results.length - results.filter((event) => event.status !== 'pass').length;
    print(`\n${passed} passed${failed ? `, ${failed} failed` : ''}\n`, failed ? 't-fail' : 't-pass');
    if (submit && failed === 0 && results.length > 0) {
      print('Fix verified: every visible and hidden test passes.\n', 't-head');
      onFixed({ edited: Object.keys(edits) });
    }
  }

  paintTree();
  print(`Edit any file, then Run tests (the repo's own tests) or Submit fix (adds hidden acceptance tests).\n`, 't-dim');
  if (visibleTests.length === 0) print('This repo has no visible tests. Submit fix runs the hidden ones.\n', 't-dim');

  const el = h('div', { class: 'repo repo-ide' },
    tree,
    h('div', { class: 'repo-main' },
      h('div', { class: 'repo-path' }, select, pathLabel, h('span', { class: 'repo-lines' }, problem.lang === 'python' ? 'Python 3.12' : 'JavaScript')),
      editor.el,
      h('div', { class: 'actions run-bar' }, runButton, submitButton, resetButton, h('span', { class: 'muted small kbd-hint' }, 'Ctrl+Enter run · Ctrl+Shift+Enter submit')),
      terminal));
  return { el, refresh: () => editor.refresh(), editedCount: () => Object.keys(edits).length };
}
