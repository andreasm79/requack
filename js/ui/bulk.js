import { fill, h, plural, toast } from './dom.js';
import { closeSheet, openSheet } from './sheet.js';
import { store } from '../core/store.js';
import { activeProblems } from '../core/stats.js';

export function openBulk() {
  openSheet('Already solved some?', (body) => {
    const state = store.get();
    const picked = new Set();
    const groups = new Map();
    for (const problem of activeProblems(state)) {
      if (problem.files || state.cards[problem.id]) continue;
      if (!groups.has(problem.pattern)) groups.set(problem.pattern, []);
      groups.get(problem.pattern).push(problem);
    }
    const submit = h('button', { class: 'btn primary wide', type: 'button', disabled: true }, 'Tick the ones you have solved');
    const update = () => {
      submit.disabled = picked.size === 0;
      submit.textContent = picked.size === 0 ? 'Tick the ones you have solved' : `Add ${plural(picked.size, 'problem')} to the recall queue`;
    };
    submit.addEventListener('click', () => {
      const added = store.seedSolved([...picked]);
      closeSheet();
      toast(`${plural(added, 'problem')} queued. First recalls start tomorrow.`);
    });

    const sections = [...groups].map(([pattern, problems], groupIndex) => {
      const boxes = [];
      const count = h('span', { class: 'count' }, `0/${problems.length}`);
      const refresh = () => {
        count.textContent = `${boxes.filter((box) => box.checked).length}/${problems.length}`;
        update();
      };
      const rows = problems.map((problem, i) => {
        const id = `bulk-${groupIndex}-${i}`;
        const box = h('input', {
          id, type: 'checkbox',
          onchange: () => {
            if (box.checked) picked.add(problem.id);
            else picked.delete(problem.id);
            refresh();
          },
        });
        boxes.push(box);
        return h('label', { class: 'check-row', for: id }, box, h('span', { class: 'check-title' }, problem.title), h('span', { class: `diff ${problem.difficulty} mono small` }, problem.difficulty.toLowerCase()));
      });
      const all = h('button', {
        class: 'pill', type: 'button',
        onclick: () => {
          const target = boxes.some((box) => !box.checked);
          boxes.forEach((box, i) => {
            box.checked = target;
            if (target) picked.add(problems[i].id);
            else picked.delete(problems[i].id);
          });
          refresh();
        },
      }, 'Toggle all');
      return h('details', { class: 'group', open: groupIndex === 0 }, h('summary', null, pattern, count), h('div', { class: 'check-tools' }, all), rows);
    });

    fill(body, h('p', { class: 'muted' }, 'Tick what you have solved before. Each one enters the recall queue, spread over the next two weeks, so you find out which ones you still remember without logging them one by one.'),
      ...(sections.length > 0 ? sections : [h('p', { class: 'muted' }, 'Every problem in your list is already tracked.')]),
      h('div', { class: 'sheet-foot' }, submit)
    );
  }, { wide: true });
}
