import { fill, h, toast } from './dom.js';
import { closeSheet, openSheet } from './sheet.js';
import { store } from '../core/store.js';
import { mergeStates } from '../core/sync.js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config.js';

const LIBRARY = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const TABLE = 'requack_state';
const PUSH_DELAY_MS = 3000;

const account = { client: null, user: null, status: 'idle', lastSynced: null, applying: false, timer: null, button: null };

export function accountsEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && typeof window !== 'undefined' && typeof window.claude === 'undefined';
}

function loadLibrary() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LIBRARY;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load the sign-in library.'));
    document.head.append(script);
  });
}

function ago(date) {
  if (!date) return 'not yet';
  const seconds = Math.round((Date.now() - date) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 90) return `${seconds} s ago`;
  return `${Math.round(seconds / 60)} min ago`;
}

function paintButton() {
  const button = account.button;
  if (!button) return;
  if (!account.user) {
    fill(button, 'sign in');
    button.setAttribute('aria-label', 'Sign in to sync your progress');
    button.className = 'cmdk account-btn';
    return;
  }
  const letter = (account.user.email || '?')[0].toUpperCase();
  fill(button, h('span', { class: 'avatar' }, letter), h('span', { class: `sync-dot ${account.status}` }));
  button.setAttribute('aria-label', `Signed in as ${account.user.email}. Sync ${account.status === 'error' ? 'failed' : account.status}.`);
  button.className = 'cmdk account-btn signed-in';
}

function setStatus(status) {
  account.status = status;
  paintButton();
}

async function push() {
  if (!account.client || !account.user) return;
  setStatus('syncing');
  const { error } = await account.client.from(TABLE).upsert({ user_id: account.user.id, state: store.get(), updated_at: new Date().toISOString() });
  if (error) {
    setStatus('error');
    return;
  }
  account.lastSynced = Date.now();
  setStatus('synced');
}

export async function syncNow() {
  if (!account.client || !account.user) return;
  setStatus('syncing');
  const { data, error } = await account.client.from(TABLE).select('state, updated_at').eq('user_id', account.user.id).maybeSingle();
  if (error) {
    setStatus('error');
    return;
  }
  account.applying = true;
  store.replace(mergeStates(store.get(), data ? data.state : {}));
  account.applying = false;
  await push();
}

function schedulePush() {
  if (account.applying || !account.user) return;
  clearTimeout(account.timer);
  account.timer = setTimeout(push, PUSH_DELAY_MS);
}

function setUser(user) {
  const changed = (user && user.id) !== (account.user && account.user.id);
  account.user = user || null;
  if (!user) setStatus('idle');
  else paintButton();
  return changed;
}

export async function initAccount(button) {
  if (!accountsEnabled() || !button) return;
  account.button = button;
  button.hidden = false;
  paintButton();
  button.addEventListener('click', openAccount);
  try {
    await loadLibrary();
    account.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await account.client.auth.getSession();
    if (setUser(data && data.session ? data.session.user : null) && account.user) syncNow();
    account.client.auth.onAuthStateChange((event, session) => {
      if (setUser(session ? session.user : null) && account.user) syncNow();
    });
    store.subscribe(schedulePush);
  } catch (error) {
    button.hidden = true;
    console.warn('reQuack sign-in is unavailable', error);
  }
}

function signedOutForm(body) {
  const ui = { mode: 'in' };
  const email = h('input', { id: 'acct-email', type: 'email', autocomplete: 'email', placeholder: 'you@tcd.ie' });
  const password = h('input', { id: 'acct-password', type: 'password', autocomplete: 'current-password', minLength: 8, placeholder: 'at least 8 characters' });
  const message = h('p', { class: 'small', role: 'status' });
  const submit = h('button', { class: 'btn primary wide', type: 'submit' });
  const modes = h('div', { class: 'pills', role: 'group', 'aria-label': 'Account' });
  const form = h('form', { class: 'account-form', noValidate: true });

  function paint() {
    fill(modes, ...[['in', 'Sign in'], ['up', 'Create account']].map(([value, label]) =>
      h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.mode === value), onclick: () => { ui.mode = value; paint(); } }, label)));
    submit.textContent = ui.mode === 'in' ? 'Sign in' : 'Create account';
    password.autocomplete = ui.mode === 'in' ? 'current-password' : 'new-password';
  }

  function say(text, kind = 'muted') {
    message.className = kind === 'error' ? 'error' : 'small muted';
    message.textContent = text;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!account.client) {
      say('Sign-in is still loading. Try again in a second.', 'error');
      return;
    }
    if (!email.value.includes('@') || password.value.length < 8) {
      say('Enter your email and a password of at least 8 characters.', 'error');
      return;
    }
    submit.disabled = true;
    say(ui.mode === 'in' ? 'Signing in…' : 'Creating your account…');
    const call = ui.mode === 'in'
      ? account.client.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
      : account.client.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: location.href.split('#')[0] } });
    const { data, error } = await call;
    submit.disabled = false;
    if (error) {
      say(error.message || 'That did not work. Check your email and password.', 'error');
      return;
    }
    if (ui.mode === 'up' && !(data && data.session)) {
      say('Check your inbox and click the confirmation link, then sign in here.');
      ui.mode = 'in';
      paint();
      return;
    }
    closeSheet();
    toast('Signed in. Your progress now syncs across devices.');
  });

  const forgot = h('button', {
    class: 'link-btn', type: 'button',
    onclick: async () => {
      if (!email.value.includes('@')) {
        say('Type your email above first.', 'error');
        return;
      }
      const { error } = await account.client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.href.split('#')[0] });
      say(error ? error.message : 'If that email has an account, a reset link is on its way.', error ? 'error' : 'muted');
    },
  }, 'Forgot password?');

  paint();
  fill(form,
    h('div', { class: 'field' }, h('label', { for: 'acct-email' }, 'Email'), email),
    h('div', { class: 'field' }, h('label', { for: 'acct-password' }, 'Password'), password),
    submit);
  fill(body,
    h('p', { class: 'muted' }, 'Optional. reQuack works without an account. Signing in keeps your progress, lists and code in sync between your laptop and your phone.'),
    modes,
    form,
    message,
    forgot);
}

function signedInView(body) {
  const status = h('p', { class: 'small muted', role: 'status' }, `Last synced ${ago(account.lastSynced)}.`);
  fill(body,
    h('div', { class: 'chips' }, h('span', { class: 'chip ok' }, 'signed in'), h('span', { class: 'chip' }, account.user.email)),
    h('p', { class: 'muted' }, 'Every change syncs a few seconds after you make it. On another device, sign in with the same email and your progress merges in.'),
    status,
    h('div', { class: 'actions' },
      h('button', {
        class: 'btn primary', type: 'button',
        onclick: async () => {
          status.textContent = 'Syncing…';
          await syncNow();
          status.textContent = account.status === 'error' ? 'Sync failed. Check your connection and try again.' : `Last synced ${ago(account.lastSynced)}.`;
        },
      }, 'Sync now'),
      h('button', {
        class: 'btn', type: 'button',
        onclick: async () => {
          clearTimeout(account.timer);
          await push();
          await account.client.auth.signOut();
          setUser(null);
          closeSheet();
          toast('Signed out. Your progress stays in this browser.');
        },
      }, 'Sign out')));
}

export function openAccount() {
  openSheet(account.user ? 'Your account' : 'Sign in to sync', (body) => (account.user ? signedInView(body) : signedOutForm(body)));
}
