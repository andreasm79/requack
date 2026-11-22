import { addDays } from './dates.js';
import { activity, huntTotals, streak, totals } from './stats.js';

const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const DAYS = 14;

export function sparkline(days, today, length = DAYS) {
  const counts = Array.from({ length }, (_, i) => days.get(addDays(today, i - length + 1)) || 0);
  const max = Math.max(1, ...counts);
  return counts.map((count) => (count === 0 ? '·' : BLOCKS[Math.min(BLOCKS.length - 1, Math.ceil((count / max) * BLOCKS.length) - 1)])).join('');
}

export function statsText(state, today) {
  const days = activity(state.cards);
  const summary = totals(state, today);
  const hunts = huntTotals(state);
  return [
    '```',
    'ducss@tcd:~$ requack status',
    `streak     ${streak(days, today)}d`,
    `attempted  ${summary.solved}/${summary.total}`,
    `mastered   ${summary.mastered}`,
    `bug hunts  ${hunts.done}/${hunts.total}`,
    `last ${DAYS}d   ${sparkline(days, today)}`,
    '```',
  ].join('\n');
}
