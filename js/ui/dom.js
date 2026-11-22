export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'for') el.htmlFor = value;
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key.includes('-') || key === 'role' || key === 'list') el.setAttribute(key, value === true ? '' : value);
    else el[key] = value;
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : String(child));
  }
}

export function fill(el, ...children) {
  el.replaceChildren();
  append(el, children);
  return el;
}

export function staticSvg(markup) {
  const holder = document.createElement('span');
  holder.style.display = 'inline-flex';
  holder.innerHTML = markup;
  return holder;
}

let toastTimer = null;

export function toast(message, action = null) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.replaceChildren(h('span', null, message));
  if (action) {
    el.append(h('button', { type: 'button', onclick: () => { el.classList.remove('show'); action.run(); } }, action.label));
  }
  el.classList.toggle('actionable', Boolean(action));
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 6000 : 2800);
}

export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
