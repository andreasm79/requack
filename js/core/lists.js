import { LISTS, PROBLEMS, slugify } from '../data/problems.js';

const URL_SLUG = /leetcode\.com\/(?:problems|problem)\/([a-z0-9-]+)/i;
const NOISE = /^\s*(?:[-*•]|\d+[.)]|#\d+\s*[-:.]?|\d+\s*[-:]\s*)\s*/;
const DIFFICULTY_WORD = /\b(easy|medium|hard)\b/i;
const MAX_LINES = 500;

export function titleFromSlug(slug) {
  return slug.split('-').map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word)).join(' ');
}

function candidates(line) {
  const cells = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((cell) => cell.replace(/^"|"$/g, '').trim()).filter(Boolean);
  return [line.trim(), ...cells];
}

export function parseImport(text, catalogue = PROBLEMS) {
  const byId = new Map(catalogue.map((problem) => [problem.id, problem]));
  const byTitle = new Map(catalogue.map((problem) => [slugify(problem.title), problem]));
  const matched = [];
  const unmatched = [];
  const seen = new Set();
  const lines = String(text || '').split(/\r?\n/).slice(0, MAX_LINES);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const urlMatch = URL_SLUG.exec(line);
    let found = null;
    if (urlMatch) found = byId.get(urlMatch[1].toLowerCase()) || null;
    if (!found) {
      for (const cell of candidates(line)) {
        const cleaned = cell.replace(NOISE, '').replace(/\(.*?\)/g, '').replace(DIFFICULTY_WORD, '').replace(/https?:\/\/\S+/g, '').trim();
        const key = slugify(cleaned);
        if (key && (byTitle.has(key) || byId.has(key))) {
          found = byTitle.get(key) || byId.get(key);
          break;
        }
      }
    }
    if (found) {
      if (!seen.has(found.id)) {
        seen.add(found.id);
        matched.push(found.id);
      }
      continue;
    }
    const url = urlMatch ? `https://leetcode.com/problems/${urlMatch[1].toLowerCase()}/` : (line.match(/https?:\/\/\S+/) || [''])[0];
    const title = urlMatch
      ? titleFromSlug(urlMatch[1].toLowerCase())
      : line.replace(/https?:\/\/\S+/g, '').split(/\t|,/)[0].replace(NOISE, '').replace(DIFFICULTY_WORD, '').trim();
    const key = slugify(title);
    if (title && key && !seen.has(`new:${key}`)) {
      seen.add(`new:${key}`);
      unmatched.push({ title: title.slice(0, 120), url, difficulty: (line.match(DIFFICULTY_WORD) || [''])[0].replace(/^./, (c) => c.toUpperCase()) || 'Medium' });
    }
  }
  return { matched, unmatched };
}

export function listsFor(state) {
  return [
    ...Object.entries(LISTS).map(([id, list]) => ({ id, name: list.label, builtIn: true })),
    ...state.lists.map((list) => ({ id: list.id, name: list.name, builtIn: false, items: list.items })),
  ];
}

export function listName(state, id) {
  const found = listsFor(state).find((list) => list.id === id);
  return found ? found.name : LISTS.neetcode150.label;
}
