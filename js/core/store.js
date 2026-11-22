import { newCard, review, RATINGS } from './scheduler.js';
import { addDays, isKey, todayKey } from './dates.js';
import { LISTS, slugify } from '../data/problems.js';
import { DIFFICULTIES, HUNT_PATTERN, KINDS, LANGUAGES } from '../data/kinds.js';

const STORAGE_KEY = 'requack.v1';
const MAX_FILES = 14;
const MAX_LINES = 160;
const OA_FLAGS = ['tab', 'fullscreen', 'paste', 'copy'];
const SEED_SPREAD_DAYS = 14;
const MAX_CODE = 30000;
const MAX_REPO_FILES = 40;
const CODE_LANGS = ['python', 'javascript'];
const SEED_INTERVAL = 3;

export function defaultState() {
  return {
    version: 1,
    cards: {},
    custom: [],
    lists: [],
    code: {},
    settings: { list: 'neetcode150', newPerDay: 2, interviewDate: null, demo: false, introSeen: false },
  };
}

function text(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function count(value) {
  return Number.isFinite(value) && value > 0 ? Math.min(999, Math.round(value)) : 0;
}

export function cleanOa(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const flags = {};
  for (const flag of OA_FLAGS) flags[flag] = count(raw.flags && raw.flags[flag]);
  return { limit: count(raw.limit), used: count(raw.used), timedOut: raw.timedOut === true, flags };
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
      const oa = cleanOa(entry.oa);
      if (oa) clean.oa = oa;
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
    files.push({ name: text(file.name, 90) || 'snippet', lines, bugs: [...bugs].sort((a, b) => a - b) });
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
    if (raw.source && typeof raw.source === 'object' && /^https?:\/\//.test(raw.source.url || '')) {
      problem.source = { label: text(raw.source.label, 140) || raw.source.url, url: text(raw.source.url, 300) };
    }
  }
  return problem;
}

function cleanCode(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const entry = {};
  for (const lang of CODE_LANGS) if (typeof raw[lang] === 'string') entry[lang] = raw[lang].slice(0, MAX_CODE);
  if (CODE_LANGS.includes(raw.lang)) entry.lang = raw.lang;
  if (raw.files && typeof raw.files === 'object') {
    entry.files = {};
    for (const [path, value] of Object.entries(raw.files).slice(0, MAX_REPO_FILES)) {
      if (typeof value === 'string') entry.files[text(path, 120)] = value.slice(0, MAX_CODE);
    }
  }
  return Object.keys(entry).length > 0 ? entry : null;
}

export function sanitize(raw) {
  const state = defaultState();
  if (!raw || typeof raw !== 'object') return state;
  if (raw.code && typeof raw.code === 'object') {
    for (const [id, value] of Object.entries(raw.code)) {
      const entry = cleanCode(value);
      if (entry) state.code[text(id, 140)] = entry;
    }
  }
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
  if (Array.isArray(raw.lists)) {
    const ids = new Set();
    for (const list of raw.lists.slice(0, 50)) {
      if (!list || typeof list !== 'object') continue;
      const id = text(list.id, 60);
      const name = text(list.name, 60).trim();
      if (!id.startsWith('list-') || !name || ids.has(id)) continue;
      ids.add(id);
      const items = Array.isArray(list.items) ? [...new Set(list.items.filter((item) => typeof item === 'string').map((item) => item.slice(0, 140)))].slice(0, 1000) : [];
      state.lists.push({ id, name, items });
    }
  }
  if (LISTS[settings.list] || state.lists.some((list) => list.id === settings.list)) state.settings.list = settings.list;
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
      console.warn('reQuack could not save to this browser', error);
    }
    for (const listener of listeners) listener(state);
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    logReview(id, rating, { minutes = null, note = null, oa = null } = {}) {
      const today = todayKey();
      const current = state.cards[id] || newCard(id);
      const updated = review(current, rating, today, state.settings.interviewDate, minutes);
      if (note !== null) updated.note = text(note, 2000);
      const integrity = cleanOa(oa);
      if (integrity) updated.history[updated.history.length - 1].oa = integrity;
      lastChange = { id, previous: state.cards[id] || null };
      commit({ ...state, cards: { ...state.cards, [id]: updated } });
      return updated;
    },
    saveCode(id, patch) {
      const entry = cleanCode({ ...(state.code[id] || {}), ...patch });
      const code = { ...state.code };
      if (entry) code[id] = entry;
      else delete code[id];
      state = { ...state, code };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('reQuack could not save your code', error);
      }
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
    createList(name, items = [], { activate = true } = {}) {
      const list = { id: `list-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: text(name, 60).trim() || 'My list', items: [...new Set(items)] };
      commit(sanitize({ ...state, lists: [...state.lists, list], settings: { ...state.settings, list: activate ? list.id : state.settings.list } }));
      return list;
    },
    importList(name, matched, unmatched) {
      const created = [];
      for (const item of unmatched) {
        const problem = cleanCustom({ kind: 'coding', title: item.title, url: item.url, difficulty: item.difficulty, id: `custom-${slugify(item.title)}-${Date.now().toString(36)}${created.length}` });
        if (problem) created.push(problem);
      }
      const list = { id: `list-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: text(name, 60).trim() || 'Imported list', items: [...matched, ...created.map((problem) => problem.id)] };
      commit(sanitize({ ...state, custom: [...state.custom, ...created], lists: [...state.lists, list], settings: { ...state.settings, list: list.id } }));
      return list;
    },
    renameList(id, name) {
      commit(sanitize({ ...state, lists: state.lists.map((list) => (list.id === id ? { ...list, name } : list)) }));
    },
    deleteList(id) {
      const settings = state.settings.list === id ? { ...state.settings, list: 'neetcode150' } : state.settings;
      commit(sanitize({ ...state, lists: state.lists.filter((list) => list.id !== id), settings }));
    },
    toggleInList(listId, problemId) {
      const lists = state.lists.map((list) => {
        if (list.id !== listId) return list;
        const items = list.items.includes(problemId) ? list.items.filter((item) => item !== problemId) : [...list.items, problemId];
        return { ...list, items };
      });
      commit(sanitize({ ...state, lists }));
    },
    removeCustom(id) {
      const cards = { ...state.cards };
      delete cards[id];
      const lists = state.lists.map((list) => ({ ...list, items: list.items.filter((item) => item !== id) }));
      commit({ ...state, cards, lists, custom: state.custom.filter((problem) => problem.id !== id) });
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
