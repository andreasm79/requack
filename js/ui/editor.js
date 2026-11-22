import { h } from './dom.js';

const MODES = { python: 'python', javascript: 'javascript', json: { name: 'javascript', json: true } };
const INDENT = { python: 4, javascript: 2 };

function modeFor(lang) {
  return MODES[lang] || null;
}

function fallback({ value, onChange, readOnly, lang }) {
  const area = h('textarea', { class: 'code-input', spellcheck: false, value, readOnly, 'aria-label': 'Code editor' });
  area.addEventListener('input', () => onChange(area.value));
  area.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || readOnly) return;
    event.preventDefault();
    const spaces = ' '.repeat(INDENT[lang] || 4);
    const { selectionStart: start, selectionEnd: end } = area;
    area.setRangeText(spaces, start, end, 'end');
    onChange(area.value);
  });
  return {
    el: area,
    getValue: () => area.value,
    setValue: (text) => { area.value = text; },
    setLang: () => {},
    setReadOnly: (on) => { area.readOnly = on; },
    focus: () => area.focus(),
    refresh: () => {},
    jumpTo: () => {},
  };
}

export function createEditor({ value = '', lang = 'python', onChange = () => {}, readOnly = false, onRun = null, onSubmit = null } = {}) {
  const CM = typeof window !== 'undefined' ? window.CodeMirror : null;
  if (!CM) return fallback({ value, onChange, readOnly, lang });
  const host = h('div', { class: 'editor' });
  const keys = {
    Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection(' '.repeat(cm.getOption('indentUnit')), 'end')),
    'Shift-Tab': (cm) => cm.indentSelection('subtract'),
  };
  if (onRun) keys['Ctrl-Enter'] = keys['Cmd-Enter'] = () => onRun();
  if (onSubmit) keys['Shift-Ctrl-Enter'] = keys['Shift-Cmd-Enter'] = () => onSubmit();
  const cm = CM(host, {
    value,
    mode: modeFor(lang),
    lineNumbers: true,
    indentUnit: INDENT[lang] || 4,
    tabSize: INDENT[lang] || 4,
    indentWithTabs: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    readOnly,
    viewportMargin: Infinity,
    extraKeys: keys,
    inputStyle: 'contenteditable',
    screenReaderLabel: 'Code editor',
  });
  cm.on('change', () => onChange(cm.getValue()));
  return {
    el: host,
    getValue: () => cm.getValue(),
    setValue: (text) => cm.setValue(text),
    setLang: (next) => {
      cm.setOption('mode', modeFor(next));
      cm.setOption('indentUnit', INDENT[next] || 4);
      cm.setOption('tabSize', INDENT[next] || 4);
    },
    setReadOnly: (on) => cm.setOption('readOnly', on),
    focus: () => cm.focus(),
    refresh: () => setTimeout(() => cm.refresh(), 0),
    jumpTo: (line) => {
      cm.setCursor({ line, ch: 0 });
      cm.scrollIntoView({ line, ch: 0 }, 120);
    },
  };
}
