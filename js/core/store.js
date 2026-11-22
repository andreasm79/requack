import { newCard, review, RATINGS } from './scheduler.js';
import { addDays, isKey, todayKey } from './dates.js';
import { LISTS, slugify } from '../data/problems.js';
import { DIFFICULTIES, HUNT_PATTERN, KINDS, LANGUAGES } from '../data/kinds.js';

const STORAGE_KEY = 'requack.v1';
const MAX_FILES = 3;
const MAX_LINES = 120;
const SEED_SPREAD_DAYS = 14;
const SEED_INTERVAL = 3;

export function defaultState() {
  return {
    version: 1,
    cards: {},
    custom: [],
    settings: { list: 'neetcode150', newPerDay: 2, interviewDate: null, demo: false, introSeen: false },
  };
}

function text(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function cleanCard(id, raw) {
  const card = newCard(id);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.history)) return null;
  card.history = raw.history
    .filter((entry) => entry && isKey(entry.date) && RATINGS.includes(entry.rating))
    .map((entry) => {
      const clean = {
        date: entry.date,
        rating: entry.rating,
        minutes: Number.isFinite(entry.minutes) && entry.minutes > 0 ? Math.round(entry.minutes) : null,
      };
      if (entry.seeded === true) clean.seeded = true;
      return clean;
    });
  if (card.history.length === 0) return null;
  card.reps = Number.isFinite(raw.reps) ? Math.max(0, Math.round(raw.reps)) : 0;
  card.lapses = Number.isFinite(raw.lapses) ? Math.max(0, Math.round(raw.lapses)) : 0;
  card.interval = Number.isFinite(raw.interval) ? Math.max(1, Math.round(raw.interval)) : 1;
  card.ease = Number.isFinite(raw.ease) ? Math.min(4, Math.max(1.3, raw.ease)) : card.ease;
  card.due = isKey(raw.due) ? raw.due : todayKey();
  card.note = text(raw.note, 2000);
  return card;
}

function cleanFiles(raw) {
  if (!Array.isArray(raw)) return null;
  const files = [];
  for (const file of raw.slice(0, MAX_FILES)) {
    if (!file || !Array.isArray(file.lines)) continue;
    const lines = file.lines.slice(0, MAX_LINES).map((line) => text(line, 200));
    const bugs = new Set();
    for (const index of Array.isArray(file.bugs) ? file.bugs : []) {
      if (Number.isInteger(index) && index >= 0 && index < lines.length) bugs.add(index);
    }
    files.push({ name: text(file.name, 60) || 'snippet', lines, bugs: [...bugs].sort((a, b) => a - b) });
  }
  return files.some((file) => file.bugs.length > 0) ? files : null;
}

function cleanCustom(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = text(raw.title, 120).trim();
  if (!title) return null;
  const url = text(raw.url, 300).trim();
  const kind = KINDS[raw.kind] ? raw.kind : 'coding';
  const problem = {
    id: text(raw.id, 140) || `custom-${slugify(title)}`,
    title,
    kind,
    pattern: text(raw.pattern, 40).trim() || KINDS[kind].topic,
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'Medium',
    blind75: false,
    premium: false,
    url: /^https?:\/\//.test(url) ? url : '',
    prompt: text(raw.prompt, 6000).replace(/\s+$/, ''),
    custom: true,
  };
  const files = kind === 'bug' ? cleanFiles(raw.files) : null;
  if (files) {
    problem.files = files;
    problem.pattern = HUNT_PATTERN;
    problem.lang = LANGUAGES[raw.lang] ? raw.lang : 'python';
    problem.tag = text(raw.tag, 40) || 'Bug';
    problem.scenario = text(raw.scenario, 500);
    problem.explanation = text(raw.explanation, 900);
    problem.fix = text(raw.fix, 2000);
  }
  return problem;
}

export function sanitize(raw) {
  const state = defaultState();
  if (!raw || typeof raw !== 'object') return state;
  if (raw.cards && typeof raw.cards === 'object') {
    for (const [id, value] of Object.entries(raw.cards)) {
      const card = cleanCard(id, value);
      if (card) state.cards[id] = card;
    }
  }
  if (Array.isArray(raw.custom)) {
    const seen = new Set();
    for (const value of raw.custom) {
      const problem = cleanCustom(value);
      if (problem && !seen.has(problem.id)) {
        seen.add(problem.id);
        state.custom.push(problem);
      }
    }
  }
  const settings = raw.settings || {};
  if (LISTS[settings.list]) state.settings.list = settings.list;
  if (Number.isFinite(settings.newPerDay)) state.settings.newPerDay = Math.min(10, Math.max(0, Math.round(settings.newPerDay)));
  if (isKey(settings.interviewDate)) state.settings.interviewDate = settings.interviewDate;
  state.settings.demo = settings.demo === true;
  state.settings.introSeen = settings.introSeen === true;
  return state;
}

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : defaultState();
  } catch (error) {
    return defaultState();
  }
}

function createStore() {
  let state = read();
  let lastChange = null;
  const listeners = new Set();

  function commit(next) {
    state = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Requack could not save to this browser', error);
    }
    for (const listener of listeners) listener(state);
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    logReview(id, rating, { minutes = null, note = null } = {}) {
      const today = todayKey();
      const current = state.cards[id] || newCard(id);
      const updated = review(current, rating, today, state.settings.interviewDate, minutes);
      if (note !== null) updated.note = text(note, 2000);
      lastChange = { id, previous: state.cards[id] || null };
      commit({ ...state, cards: { ...state.cards, [id]: updated } });
      return updated;
    },
    undoLast() {
      if (!lastChange) return false;
      const cards = { ...state.cards };
      if (lastChange.previous) cards[lastChange.id] = lastChange.previous;
      else delete cards[lastChange.id];
      lastChange = null;
      commit({ ...state, cards });
      return true;
    },
    snooze(id) {
      const card = state.cards[id];
      if (!card) return;
      commit({ ...state, cards: { ...state.cards, [id]: { ...card, due: addDays(todayKey(), 1) } } });
    },
    seedSolved(ids) {
      const today = todayKey();
      const cards = { ...state.cards };
      let added = 0;
      for (const id of ids) {
        if (cards[id]) continue;
        cards[id] = {
          ...newCard(id),
          reps: 1,
          interval: SEED_INTERVAL,
          due: addDays(today, 1 + (added % SEED_SPREAD_DAYS)),
          history: [{ date: today, rating: 'good', minutes: null, seeded: true }],
        };
        added += 1;
      }
      commit({ ...state, cards, settings: { ...state.settings, introSeen: true } });
      return added;
    },
    setNote(id, note) {
      if (!state.cards[id]) return;
      commit({ ...state, cards: { ...state.cards, [id]: { ...state.cards[id], note: text(note, 2000) } } });
    },
    resetCard(id) {
      const cards = { ...state.cards };
      delete cards[id];
      commit({ ...state, cards });
    },
    addCustom(input) {
      const problem = cleanCustom({ ...input, id: `custom-${slugify(input.title || '')}-${Date.now().toString(36)}` });
      if (!problem) return null;
      commit({ ...state, custom: [...state.custom, problem] });
      return problem;
    },
    updateCustom(id, patch) {
      const custom = state.custom.map((problem) => (problem.id === id ? cleanCustom({ ...problem, ...patch, id }) || problem : problem));
      commit({ ...state, custom });
    },
    removeCustom(id) {
      const cards = { ...state.cards };
      delete cards[id];
      commit({ ...state, cards, custom: state.custom.filter((problem) => problem.id !== id) });
    },
    updateSettings(patch) {
      commit(sanitize({ ...state, settings: { ...state.settings, ...patch } }));
    },
    replace(raw) {
      commit(sanitize(raw));
    },
    clear() {
      const fresh = defaultState();
      fresh.settings.introSeen = true;
      commit(fresh);
    },
    export: () => JSON.stringify(state, null, 2),
  };
}

export const store = createStore();
