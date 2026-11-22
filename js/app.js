import { fill } from './ui/dom.js';
import { store } from './core/store.js';
import { todayKey } from './core/dates.js';
import { duck } from './ui/duck.js';
import { renderToday } from './ui/views/today.js';
import { renderProblems } from './ui/views/problems.js';
import { renderBugs } from './ui/views/bugs.js';
import { onRefresh } from './ui/refresh.js';
import { openPalette } from './ui/palette.js';
import { initTheme } from './ui/theme.js';
import { openBulk } from './ui/bulk.js';
import { openCustom, openDetail, openPractice, startDueSession } from './ui/flows.js';
import { allHunts, dueCards, huntOfTheDay, problemIndex } from './core/stats.js';
import { isDue } from './core/scheduler.js';
import { renderProgress } from './ui/views/progress.js';
import { renderMore } from './ui/views/more.js';

const VIEWS = { today: renderToday, problems: renderProblems, bugs: renderBugs, progress: renderProgress, more: renderMore };
const main = document.getElementById('main');
let renderedDay = todayKey();

function currentView() {
  const name = location.hash.slice(1);
  return VIEWS[name] ? name : 'today';
}

function updateBadges() {
  const state = store.get();
  const index = problemIndex(state);
  const due = dueCards(state.cards, renderedDay).filter((card) => index.has(card.id)).length;
  const bugs = allHunts(state).filter((hunt) => isDue(state.cards[hunt.id], renderedDay)).length;
  document.getElementById('badge-today').textContent = due > 0 ? String(due) : '';
  document.getElementById('badge-bugs').textContent = bugs > 0 ? String(bugs) : '';
}

function go(view) {
  return () => { location.hash = `#${view}`; };
}

function commands() {
  return [
    { label: 'Run all due recalls', keywords: 'session start review', run: startDueSession },
    { label: 'Bug hunt of the day', keywords: 'hunt find bug', run: () => { const hunt = huntOfTheDay(store.get(), todayKey()); if (hunt) openPractice(hunt); else location.hash = '#bugs'; } },
    { label: 'Add anything', keywords: 'new custom problem create', run: () => openCustom() },
    { label: 'Mark problems as already solved', keywords: 'bulk import seed', run: openBulk },
    { label: 'Go to Today', keywords: 'home', run: go('today') },
    { label: 'Go to Problems', keywords: 'list', run: go('problems') },
    { label: 'Go to Bugs', keywords: 'hunts', run: go('bugs') },
    { label: 'Go to Progress', keywords: 'stats streak share', run: go('progress') },
    { label: 'Go to More', keywords: 'backup export plan interview date keyboard', run: go('more') },
  ];
}

function showPalette() {
  openPalette(commands(), (problem) => (problem.files && !store.get().cards[problem.id] ? openPractice(problem) : openDetail(problem)));
}

function onKey(event) {
  const key = event.key;
  if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === 'k') {
    event.preventDefault();
    showPalette();
    return;
  }
  const tag = event.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.metaKey || event.ctrlKey || event.altKey) return;
  if (key === '/') {
    event.preventDefault();
    showPalette();
  } else if (key >= '1' && key <= '4') {
    const button = document.querySelectorAll('.sheet .grade')[Number(key) - 1];
    if (button) button.click();
  } else if (key === 'Enter' && tag !== 'BUTTON' && tag !== 'A' && tag !== 'SUMMARY') {
    const primary = document.querySelector('.sheet [data-primary]');
    if (primary && !primary.disabled) {
      event.preventDefault();
      primary.click();
    }
  }
}

function render() {
  const name = currentView();
  const focusedId = document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : '';
  renderedDay = todayKey();
  fill(main, ...VIEWS[name](renderedDay).filter(Boolean));
  for (const link of document.querySelectorAll('.tabs a')) {
    if (link.dataset.view === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  updateBadges();
  if (focusedId) {
    const again = document.getElementById(focusedId);
    if (again) again.focus();
  }
}

document.getElementById('brand-duck').append(duck('calm', 36));
document.getElementById('open-palette').addEventListener('click', showPalette);
initTheme(document.getElementById('theme-toggle'));
document.addEventListener('keydown', onKey);
window.addEventListener('hashchange', () => {
  render();
  window.scrollTo(0, 0);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && todayKey() !== renderedDay) render();
});
store.subscribe(render);
onRefresh(render);
render();
