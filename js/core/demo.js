import { addDays } from './dates.js';
import { isDue, newCard, review } from './scheduler.js';
import { PROBLEMS } from '../data/problems.js';
import { HUNTS } from '../data/hunts.js';
import { defaultState } from './store.js';

const DAYS = 42;
const DEMO_NOTES = {
  'contains-duplicate': 'HashSet. If add() sees it already, return true. O(n).',
  'valid-anagram': 'Count letters in a 26-slot array, +1 for s, -1 for t, all zero at the end.',
  'two-sum': 'HashMap value -> index. For each x check if target - x is already in the map.',
  'group-anagrams': 'Key = sorted word (or letter counts). Map key -> list of words.',
  'top-k-frequent-elements': 'Count, then bucket sort by frequency. Walk buckets from the top. O(n).',
  'product-of-array-except-self': 'Prefix products left to right, then multiply by a running suffix right to left.',
  'longest-consecutive-sequence': 'Put all in a set. Only start counting from x when x - 1 is not in the set.',
  'valid-palindrome': 'Two pointers from both ends, skip non-alphanumerics, compare lowercase.',
  '3sum': 'Sort. Fix i, then two pointers on the rest. Skip duplicates for i and for left.',
  'container-with-most-water': 'Two pointers at the ends. Always move the shorter wall inward.',
  'best-time-to-buy-and-sell-stock': 'Track the lowest price so far, profit = price - lowest.',
  'longest-substring-without-repeating-characters': 'Sliding window + set. Shrink from the left while the new char is in the set.',
  'valid-parentheses': 'Stack of openers. On a closer, the top must be its match. Stack empty at the end.',
  'binary-search': 'lo <= hi, mid = lo + (hi - lo) / 2. Move lo or hi past mid.',
  'koko-eating-bananas': 'Binary search on the answer (speed 1..max pile). Check hours with ceil division.',
  'reverse-linked-list': 'prev = null. Save next, point cur.next at prev, advance both.',
  'linked-list-cycle': 'Slow and fast pointers. If they meet there is a cycle.',
  'invert-binary-tree': 'Swap left and right, recurse on both.',
  'daily-temperatures': 'Monotonic decreasing stack of indices. Pop while today is warmer.',
};

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRating(random, weights) {
  const roll = random();
  let sum = 0;
  for (const [rating, weight] of weights) {
    sum += weight;
    if (roll < sum) return rating;
  }
  return 'good';
}

export function buildDemoState(today) {
  const random = mulberry32(20261130);
  const state = defaultState();
  state.settings.demo = true;
  state.settings.introSeen = true;
  state.settings.interviewDate = addDays(today, 24);
  const firstTry = [['again', 0.15], ['hard', 0.25], ['good', 0.45], ['easy', 0.15]];
  const recall = [['again', 0.1], ['hard', 0.2], ['good', 0.55], ['easy', 0.15]];
  let nextNew = 0;
  let nextHunt = 0;

  for (let offset = DAYS; offset >= 1; offset--) {
    const day = addDays(today, -offset);
    const restDay = offset > 6 && random() < 0.18;
    if (restDay) continue;
    for (const card of Object.values(state.cards)) {
      if (isDue(card, day) && random() < 0.85) {
        state.cards[card.id] = review(card, pickRating(random, recall), day, null, 5 + Math.floor(random() * 15));
      }
    }
    const fresh = random() < 0.3 ? 2 : 1;
    for (let i = 0; i < fresh && nextNew < PROBLEMS.length; i++) {
      const problem = PROBLEMS[nextNew];
      nextNew += 1;
      const card = review(newCard(problem.id), pickRating(random, firstTry), day, null, 15 + Math.floor(random() * 30));
      card.note = DEMO_NOTES[problem.id] || '';
      state.cards[problem.id] = card;
    }
    if (nextHunt < 7 && random() < 0.2) {
      const hunt = HUNTS[nextHunt];
      nextHunt += 1;
      state.cards[hunt.id] = review(newCard(hunt.id), pickRating(random, firstTry), day, null, null);
    }
  }
  return state;
}
