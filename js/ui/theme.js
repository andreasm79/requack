import { fill, staticSvg } from './dom.js';

const KEY = 'requack.theme';
const MODES = ['system', 'light', 'dark'];
const LABELS = { system: 'auto', light: 'light', dark: 'dark' };
const ICONS = {
  system: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="9" rx="1"/><path d="M5.5 14.5h5M8 11.5v3"/></svg>',
  light: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"/></svg>',
  dark: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7z"/></svg>',
};

const root = document.documentElement;
const hostTheme = root.getAttribute('data-theme');

function read() {
  try {
    const value = localStorage.getItem(KEY);
    return MODES.includes(value) ? value : 'system';
  } catch (error) {
    return 'system';
  }
}

function apply(mode) {
  if (mode === 'system') {
    if (hostTheme) root.setAttribute('data-theme', hostTheme);
    else root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', mode);
  }
}

export function initTheme(button) {
  let mode = read();
  const paint = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    fill(button, staticSvg(ICONS[mode]), LABELS[mode]);
    button.setAttribute('aria-label', `Theme: ${LABELS[mode]}. Switch to ${LABELS[next]}.`);
    button.title = `Theme: ${LABELS[mode]}`;
  };
  apply(mode);
  paint();
  button.addEventListener('click', () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    try {
      localStorage.setItem(KEY, mode);
    } catch (error) {
      console.warn('Requack could not save the theme', error);
    }
    apply(mode);
    paint();
  });
}
