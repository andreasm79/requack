import { h, plural, toast } from '../dom.js';
import { startTopicDrill } from '../flows.js';
import { statsText } from '../../core/share.js';
import { store } from '../../core/store.js';
import { activity, forecast, huntTotals, patternStats, projection, streak, totals, weakestPattern } from '../../core/stats.js';
import { addDays, formatShort, fromKey } from '../../core/dates.js';
import { LISTS } from '../../data/problems.js';

const HEAT_WEEKS = 20;

function tile(value, suffix, name) {
  return h('div', { class: 'tile' }, h('span', { class: 'value' }, value, suffix ? h('small', null, suffix) : null), h('span', { class: 'name' }, name));
}

function level(count) {
  if (count === 0) return '';
  if (count === 1) return 'l1';
  if (count <= 3) return 'l2';
  if (count <= 5) return 'l3';
  return 'l4';
}

function heatmap(days, today) {
  const weekday = (fromKey(today).getDay() + 6) % 7;
  const start = addDays(today, -(weekday + 7 * (HEAT_WEEKS - 1)));
  const cells = [];
  for (let i = 0; i < HEAT_WEEKS * 7; i++) {
    const day = addDays(start, i);
    const count = days.get(day) || 0;
    const future = i > weekday + 7 * (HEAT_WEEKS - 1);
    cells.push(h('i', { class: future ? 'future' : level(count), title: future ? '' : `${formatShort(day)}: ${plural(count, 'review')}` }));
  }
  return h('div', { class: 'heat-wrap' }, h('div', { class: 'heat', role: 'img', 'aria-label': `Reviews per day over the last ${HEAT_WEEKS} weeks` }, cells));
}

function forecastChart(days) {
  const max = Math.max(1, ...days.map((day) => day.count));
  return [
    h('div', { class: 'bars' }, days.map((day, i) =>
      h('div', { class: `bar ${i === 0 ? 'today' : ''}`, title: `${formatShort(day.date)}: ${day.count} due` },
        h('span', { class: 'n' }, day.count > 0 ? String(day.count) : ''),
        h('span', { class: 'fill', style: `height:${Math.round((day.count / max) * 80)}%` })
      )
    )),
    h('div', { class: 'bar-labels' }, days.map((day, i) => h('span', null, i === 0 ? 'now' : i % 2 === 0 ? String(fromKey(day.date).getDate()) : ''))),
  ];
}

function patternRow(row) {
  const mastered = (row.mastered / row.total) * 100;
  const learning = ((row.solved - row.mastered) / row.total) * 100;
  return h('div', { class: 'pattern-row' },
    h('span', { class: 'name' }, row.pattern),
    h('span', { class: 'num' }, `${row.solved}/${row.total}`),
    h('div', { class: 'pbar' }, h('span', { class: 'mastered', style: `width:${mastered}%` }), h('span', { class: 'learning', style: `width:${learning}%` }))
  );
}

function projectionLine(result) {
  if (!result) return null;
  const pace = result.perDay * 7;
  const text = result.perDay === 0
    ? `Interview in ${plural(result.daysLeft, 'day')}. No new problems in the last two weeks, so the projection is flat.`
    : `Interview in ${plural(result.daysLeft, 'day')}. At your pace of ${pace.toFixed(1)} new problems a week you will have solved about ${result.projected} of ${result.total} by then.`;
  return h('p', { class: 'callout' }, text);
}

function shareCard(state, today) {
  const text = statsText(state, today);
  const box = h('pre', { class: 'prompt-box' }, text.split('\n').slice(1, -1).join('\n'));
  return h('section', { class: 'card' },
    h('h2', null, 'brag in the discord'),
    box,
    h('div', { class: 'actions' }, h('button', {
      class: 'btn', type: 'button',
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast('Copied as a code block. Paste it in Discord.');
        } catch (error) {
          const range = document.createRange();
          range.selectNodeContents(box);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          toast('Could not copy automatically. The text is selected, copy it yourself.');
        }
      },
    }, 'Copy stats'))
  );
}

export function renderProgress(today) {
  const state = store.get();
  const summary = totals(state, today);
  const days = activity(state.cards);
  const rows = patternStats(state, today);
  const weakest = weakestPattern(rows);
  const listLabel = LISTS[state.settings.list].label;
  const hunts = huntTotals(state);

  return [
    h('h1', null, 'Progress'),
    h('div', { class: 'tiles' },
      tile(String(summary.solved), `/${summary.total}`, `attempted (${listLabel} + hunts + yours)`),
      tile(String(summary.mastered), null, 'mastered (3+ weeks out)'),
      tile(String(streak(days, today)), 'd', 'current streak'),
      tile(String(hunts.done), `/${hunts.total}`, 'bug hunts attempted')
    ),
    projectionLine(projection(state, today)),
    h('section', { class: 'card' },
      h('h2', null, 'recalls coming up'),
      h('p', { class: 'muted small' }, 'Problems due each day for the next two weeks. Overdue ones count under now.'),
      forecastChart(forecast(state.cards, today))
    ),
    h('section', { class: 'card' },
      h('h2', null, 'by topic'),
      weakest ? h('div', { class: 'callout' },
        h('p', null, `Weakest topic: ${weakest.pattern}. ${Math.round(weakest.rate * 100)}% of your attempts there were FAIL or FLAKY.`),
        h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: () => startTopicDrill(weakest.pattern) }, `Drill ${weakest.pattern}`))) : null,
      h('div', { class: 'key' },
        h('span', null, h('i', { style: 'background:var(--pass)' }), 'mastered'),
        h('span', null, h('i', { style: 'background:var(--duck)' }), 'learning')
      ),
      h('div', { class: 'patterns' }, rows.map(patternRow))
    ),
    shareCard(state, today),
    h('section', { class: 'card' },
      h('h2', null, 'activity'),
      heatmap(days, today),
      h('p', { class: 'muted small' }, `Each square is a day, last ${HEAT_WEEKS} weeks, Monday at the top. Brighter means more attempts and recalls.`)
    ),
  ];
}
