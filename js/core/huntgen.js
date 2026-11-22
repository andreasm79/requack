import { parseMarked } from '../data/hunts.js';
import { DIFFICULTIES, HUNT_PATTERN, LANGUAGES } from '../data/kinds.js';

const MAX_FILES = 3;
const MAX_LINES = 90;
const MAX_LINE_LENGTH = 180;

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function buildHuntPrompt(language, focus) {
  const lang = LANGUAGES[language] ? language : 'python';
  return [
    'You write realistic "find the bug" code review exercises for computer science students preparing for software engineering interviews.',
    `Write ONE exercise in ${LANGUAGES[lang]}: a small, plausible piece of code that an AI coding assistant might produce, which reads as correct but contains exactly one real bug.`,
    focus ? `The bug should be about: ${focus}.` : 'Pick a bug class that shows up in real code review: off-by-one, async misuse, shared mutable state, wrong equality, injection, race condition, cache key, error swallowing, type coercion, boundary handling.',
    'Rules: 15 to 45 lines in total across 1 to 3 files. No comments that hint at the bug. The code must be syntactically valid. The bug must cause the symptom described in the scenario.',
    'Mark every line that is part of the bug by starting that line with two exclamation marks (!!) placed before the indentation. Mark 1 to 3 lines.',
    'Reply with JSON only, in this shape:',
    '{"title": "short intriguing title", "difficulty": "Easy|Medium|Hard", "tag": "bug class in 1-3 words", "scenario": "one or two sentences describing the symptom seen in production, without naming the cause", "files": [{"name": "file.ext", "code": "full file text with !! marks"}], "explanation": "why it is a bug, 2-3 sentences", "fix": "corrected code for the affected lines only"}',
  ].join('\n');
}

export function normalizeGeneratedHunt(raw, language) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.files)) return null;
  const title = text(raw.title, 90);
  const scenario = text(raw.scenario, 500);
  const explanation = text(raw.explanation, 900);
  if (!title || !scenario || !explanation) return null;

  const files = [];
  for (const file of raw.files.slice(0, MAX_FILES)) {
    if (!file || typeof file.code !== 'string') continue;
    const parsed = parseMarked(file.code);
    if (parsed.lines.length === 0 || parsed.lines.length > MAX_LINES) return null;
    files.push({
      name: text(file.name, 60) || 'snippet',
      lines: parsed.lines.map((line) => line.slice(0, MAX_LINE_LENGTH)),
      bugs: parsed.bugs,
    });
  }
  const marked = files.reduce((sum, file) => sum + file.bugs.length, 0);
  if (files.length === 0 || marked === 0 || marked > 6) return null;

  return {
    title,
    kind: 'bug',
    pattern: HUNT_PATTERN,
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'Medium',
    lang: LANGUAGES[language] ? language : 'python',
    tag: text(raw.tag, 40) || 'Bug',
    scenario,
    explanation,
    fix: typeof raw.fix === 'string' ? raw.fix.replace(/\s+$/, '').slice(0, 2000) : '',
    files,
    url: '',
    prompt: '',
  };
}
