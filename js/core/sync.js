import { sanitize } from './store.js';

function lastDate(card) {
  return card.history.length ? card.history[card.history.length - 1].date : '';
}

function pickCard(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.history.length !== b.history.length) return a.history.length > b.history.length ? a : b;
  return lastDate(a) >= lastDate(b) ? a : b;
}

function unionById(local, remote) {
  const out = new Map();
  for (const item of remote) out.set(item.id, item);
  for (const item of local) out.set(item.id, item);
  return [...out.values()];
}

export function isEmpty(state) {
  return Object.keys(state.cards).length === 0 && state.custom.length === 0 && state.lists.length === 0;
}

export function mergeStates(localRaw, remoteRaw) {
  const local = sanitize(localRaw);
  const remote = sanitize(remoteRaw);
  if (isEmpty(remote)) return local;
  if (isEmpty(local)) return { ...remote, settings: { ...remote.settings, introSeen: true } };
  const cards = {};
  for (const id of new Set([...Object.keys(local.cards), ...Object.keys(remote.cards)])) cards[id] = pickCard(local.cards[id], remote.cards[id]);
  const lists = unionById(local.lists, remote.lists).map((list) => {
    const mine = local.lists.find((item) => item.id === list.id);
    const theirs = remote.lists.find((item) => item.id === list.id);
    return { ...list, items: [...new Set([...(mine ? mine.items : []), ...(theirs ? theirs.items : [])])] };
  });
  return sanitize({
    ...local,
    cards,
    custom: unionById(local.custom, remote.custom),
    lists,
    code: { ...remote.code, ...local.code },
    settings: { ...local.settings, demo: local.settings.demo && remote.settings.demo, introSeen: true },
  });
}
