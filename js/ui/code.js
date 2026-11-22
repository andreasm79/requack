import { h } from './dom.js';

const KEYWORDS = {
  python: 'def class return if elif else for while in not and or is None True False import from as with try except finally raise pass lambda yield async await break continue global del assert'.split(' '),
  javascript: 'function const let var return if else for while of in new async await try catch finally throw class extends import export default from null undefined true false typeof instanceof break continue switch case this require'.split(' '),
  java: 'public private protected static final class interface extends implements return if else for while new int long double float boolean char void null true false try catch finally throw throws import package this super break continue switch case'.split(' '),
  c: 'int char void return if else for while do switch case break continue goto struct typedef static const unsigned signed long short sizeof include define ifndef endif NULL size_t uint8_t uint32_t uint64_t'.split(' '),
  sql: 'SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER ON AND OR NOT NULL IS IN AS GROUP BY ORDER DESC ASC LIMIT OFFSET COUNT SUM AVG MIN MAX INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE HAVING DISTINCT UNION'.split(' '),
};

const COMMENT = { python: '#', javascript: '//', java: '//', sql: '--', c: '//', plain: '#' };
const BY_EXTENSION = { py: 'python', js: 'javascript', mjs: 'javascript', java: 'java', sql: 'sql', c: 'c', h: 'c' };

export function langFor(name, fallback) {
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (BY_EXTENSION[extension]) return BY_EXTENSION[extension];
  return extension === '' ? fallback : 'plain';
}
const cache = new Map();

function grammar(lang) {
  if (!cache.has(lang)) {
    const mark = (COMMENT[lang] || '//').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    cache.set(lang, {
      pattern: `(${mark}.*$)|("""[\\s\\S]*?"""|[fr]?"(?:\\\\.|[^"\\\\])*"|[fr]?'(?:\\\\.|[^'\\\\])*')|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_][A-Za-z0-9_]*)`,
      keywords: new Set(KEYWORDS[lang] || []),
      upper: lang === 'sql',
    });
  }
  return cache.get(lang);
}

export function highlight(line, lang) {
  const { pattern, keywords, upper } = grammar(lang);
  const matcher = new RegExp(pattern, 'g');
  const nodes = [];
  let last = 0;
  let match = matcher.exec(line);
  while (match) {
    if (match.index > last) nodes.push(line.slice(last, match.index));
    const [whole, comment, string, number, word] = match;
    if (comment) nodes.push(h('span', { class: 'tok-com' }, whole));
    else if (string) nodes.push(h('span', { class: 'tok-str' }, whole));
    else if (number) nodes.push(h('span', { class: 'tok-num' }, whole));
    else if (keywords.has(upper ? word.toUpperCase() : word)) nodes.push(h('span', { class: 'tok-kw' }, whole));
    else nodes.push(whole);
    last = match.index + whole.length;
    match = matcher.exec(line);
  }
  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}

export function codeBlock(lines, lang, { marks = new Map(), onPick = null } = {}) {
  const rows = lines.map((line, index) => {
    const attrs = { 'data-line': String(index) };
    const mark = marks.get(index) || '';
    const content = [h('span', { class: 'num' }, String(index + 1)), h('span', { class: 'src' }, highlight(line, lang))];
    if (onPick && line.trim() !== '') {
      return h('button', {
        ...attrs, class: `code-line ${mark}`, type: 'button', 'aria-pressed': String(mark === 'picked'),
        'aria-label': `Line ${index + 1}: ${line.trim()}`, onclick: () => onPick(index),
      }, content);
    }
    return h('div', { ...attrs, class: `code-line ${mark}` }, content);
  });
  return h('div', { class: 'code' }, h('div', { class: 'code-inner' }, rows));
}
