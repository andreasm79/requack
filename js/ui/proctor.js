import { toast } from './dom.js';

export const FLAG_NAMES = {
  tab: ['tab switch', 'tab switches'],
  fullscreen: ['fullscreen exit', 'fullscreen exits'],
  paste: ['paste attempt', 'paste attempts'],
  copy: ['copy attempt', 'copy attempts'],
};

export function emptyFlags() {
  return { tab: 0, fullscreen: 0, paste: 0, copy: 0 };
}

export function totalFlags(flags) {
  return Object.values(flags || {}).reduce((sum, value) => sum + value, 0);
}

export function describe(flags) {
  const parts = Object.entries(flags || {})
    .filter(([, value]) => value > 0)
    .map(([name, value]) => `${value} ${FLAG_NAMES[name][value === 1 ? 0 : 1]}`);
  return parts.length > 0 ? parts.join(', ') : 'clean';
}

export function createProctor({ onFlag = () => {} } = {}) {
  const flags = emptyFlags();
  let active = false;
  let inFullscreen = false;

  function bump(name, message) {
    flags[name] += 1;
    if (message) toast(message);
    onFlag(flags);
  }

  const handlers = {
    visibilitychange: () => { if (active && document.hidden) bump('tab'); },
    fullscreenchange: () => {
      if (document.fullscreenElement) inFullscreen = true;
      else if (inFullscreen) {
        inFullscreen = false;
        if (active) bump('fullscreen', 'You left fullscreen. Logged.');
      }
    },
    copy: (event) => { if (active) { event.preventDefault(); bump('copy', 'Copying is off during an OA. Logged.'); } },
    cut: (event) => { if (active) { event.preventDefault(); bump('copy', 'Copying is off during an OA. Logged.'); } },
    paste: (event) => { if (active) { event.preventDefault(); bump('paste', 'Pasting is off during an OA. Logged.'); } },
  };

  return {
    flags,
    start() {
      if (active) return;
      active = true;
      inFullscreen = Boolean(document.fullscreenElement);
      for (const [name, handler] of Object.entries(handlers)) document.addEventListener(name, handler, true);
      const root = document.documentElement;
      if (!inFullscreen && root.requestFullscreen) {
        root.requestFullscreen().catch(() => toast('Fullscreen is blocked here. The timer and the integrity log still run.'));
      }
    },
    stop() {
      if (!active) return;
      active = false;
      for (const [name, handler] of Object.entries(handlers)) document.removeEventListener(name, handler, true);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    },
    isActive: () => active,
  };
}
