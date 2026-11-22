import { staticSvg } from './dom.js';

const PIXELS = [
  '................',
  '.........YYYY...',
  '........YYYYYY..',
  '........YYYKYY..',
  '........YYYYYOOO',
  '........YYYYYOO.',
  '.Y.......YYYY...',
  '.YY...YYYYYYYY..',
  '.YYYYYYYYYYYYYY.',
  '.YYYYSSSSSYYYYY.',
  '..YYYYSSSSYYYYY.',
  '..YYYYYYYYYYYY..',
  '...YYYYYYYYYY...',
];

const SPARKS = [[1, 0], [0, 1], [2, 1], [1, 2], [5, 3], [15, 1]];
const COLOURS = { Y: 'var(--duck)', S: 'var(--duck-dark)', O: 'var(--copper)', K: '#15161a' };

export function duck(mood = 'calm', size = 64) {
  const rects = [];
  PIXELS.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '.') return;
      const fill = cell === 'K' && mood === 'sleepy' ? COLOURS.S : COLOURS[cell];
      rects.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${fill}"/>`);
    });
  });
  if (mood === 'hype') {
    for (const [x, y] of SPARKS) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="var(--copper)"/>`);
  }
  const height = Math.round((size * PIXELS.length) / 16);
  const holder = staticSvg(`<svg viewBox="0 0 16 ${PIXELS.length}" width="${size}" height="${height}" shape-rendering="crispEdges" role="img" aria-label="Pixel rubber duck">${rects.join('')}</svg>`);
  holder.className = `duck ${mood}`;
  return holder;
}

const QUIPS = {
  due: [
    'Explain it to me like I am a duck. I am a duck.',
    'You solved these once. Prove it.',
    'Recall first, peek second.',
  ],
  clear: [
    'Nothing due. The pond is calm.',
    'Queue empty. Exit code 0.',
    'All caught up. Go break something new.',
  ],
  fresh: [
    'Solve one, tell me the trick, and I will quiz you later.',
    'Day one. Every 150 starts with Contains Duplicate.',
  ],
};

const AFTER = {
  again: ['Test failed. Re-running tomorrow.', 'Quack. Back in the queue for tomorrow.'],
  hard: ['Flaky. Coming back soon.', 'Passed, barely. I will check again soon.'],
  good: ['Test passed. Pushed further out.', 'Green. Next.'],
  easy: ['O(1) recall. Long break for that one.', 'Instant. I will stop asking for a while.'],
};

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

export function quip(kind, seed) {
  return pick(QUIPS[kind], seed);
}

export function afterQuip(rating, seed) {
  return pick(AFTER[rating], seed);
}
