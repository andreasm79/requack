const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
const MAX_LOG_LINES = 200;

const PY_HARNESS = String.raw`
import io, json, os, sys, time, traceback, types
import bridge

def _frames(exc, files):
    keep = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in files]
    lines = [f'  {f.filename}, line {f.lineno}, in {f.name}' + (f'\n    {f.line}' if f.line else '') for f in keep]
    return '\n'.join(lines + [f'{type(exc).__name__}: {exc}'])

def _jsonable(value):
    if isinstance(value, (set, frozenset, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    return value

class _Tee(io.StringIO):
    def __init__(self):
        super().__init__()
        self.lines = 0

def run_function(code, fn_name, tests_json):
    tests = json.loads(tests_json)
    out = _Tee()
    sys.stdout = out
    ns = {'__name__': '__solution__'}
    try:
        exec(compile(code, 'solution.py', 'exec'), ns)
    except BaseException as exc:
        sys.stdout = sys.__stdout__
        bridge.post(json.dumps({'type': 'fatal', 'error': _frames(exc, {'solution.py'}) if not isinstance(exc, SyntaxError) else f'SyntaxError: {exc.msg} (line {exc.lineno})', 'logs': out.getvalue()}))
        return
    fn = ns.get(fn_name)
    if not callable(fn):
        sys.stdout = sys.__stdout__
        bridge.post(json.dumps({'type': 'fatal', 'error': f'Define a function called {fn_name}.', 'logs': out.getvalue()}))
        return
    for index, test in enumerate(tests):
        bridge.post(json.dumps({'type': 'start', 'index': index}))
        before = out.tell()
        started = time.perf_counter()
        try:
            actual = _jsonable(fn(*test))
            result = {'type': 'result', 'index': index, 'actual': actual, 'ms': round((time.perf_counter() - started) * 1000, 1)}
        except BaseException as exc:
            result = {'type': 'result', 'index': index, 'error': _frames(exc, {'solution.py'}), 'ms': round((time.perf_counter() - started) * 1000, 1)}
        result['logs'] = out.getvalue()[before:before + 4000]
        try:
            bridge.post(json.dumps(result))
        except TypeError:
            result.pop('actual', None)
            result['error'] = 'Your function returned something that is not a list, number, string or bool.'
            bridge.post(json.dumps(result))
    sys.stdout = sys.__stdout__
    bridge.post(json.dumps({'type': 'done'}))

_BASELINE = None

def run_repo(files_json, test_paths_json):
    global _BASELINE
    files = json.loads(files_json)
    test_paths = json.loads(test_paths_json)
    root = '/repo'
    if os.path.exists(root):
        for base, dirs, names in os.walk(root, topdown=False):
            for name in names:
                os.remove(os.path.join(base, name))
            for name in dirs:
                os.rmdir(os.path.join(base, name))
    for path, code in files.items():
        full = os.path.join(root, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, 'w') as handle:
            handle.write(code)
    if _BASELINE is None:
        _BASELINE = set(sys.modules)
    for name in list(sys.modules):
        if name not in _BASELINE:
            del sys.modules[name]
    if root not in sys.path:
        sys.path.insert(0, root)
    os.chdir(root)
    import importlib
    importlib.invalidate_caches()
    known = {os.path.join(root, p) for p in files}
    out = _Tee()
    sys.stdout = out
    for path in test_paths:
        full = os.path.join(root, path)
        module = types.ModuleType(path.replace('/', '.').rsplit('.', 1)[0])
        module.__file__ = full
        before = out.tell()
        try:
            exec(compile(files[path], full, 'exec'), module.__dict__)
        except BaseException as exc:
            bridge.post(json.dumps({'type': 'result', 'file': path, 'name': '(import)', 'status': 'error', 'error': _frames(exc, known), 'logs': out.getvalue()[before:]}))
            continue
        tests = [(name, fn) for name, fn in vars(module).items() if name.startswith('test_') and callable(fn)]
        for name, fn in tests:
            bridge.post(json.dumps({'type': 'start', 'file': path, 'name': name}))
            before = out.tell()
            started = time.perf_counter()
            try:
                fn()
                status, error = 'pass', ''
            except AssertionError as exc:
                status, error = 'fail', _frames(exc, known)
            except BaseException as exc:
                status, error = 'error', _frames(exc, known)
            bridge.post(json.dumps({'type': 'result', 'file': path, 'name': name, 'status': status, 'error': error, 'ms': round((time.perf_counter() - started) * 1000, 1), 'logs': out.getvalue()[before:before + 4000]}))
    sys.stdout = sys.__stdout__
    bridge.post(json.dumps({'type': 'done'}))
`;

const PY_WORKER = `
let ready = null;
function boot(base) {
  if (!ready) {
    ready = (async () => {
      importScripts(base + 'pyodide.js');
      const pyodide = await loadPyodide({ indexURL: base });
      pyodide.registerJsModule('bridge', { post: (text) => self.postMessage(JSON.parse(text)) });
      pyodide.runPython(${JSON.stringify(PY_HARNESS)});
      return pyodide;
    })();
  }
  return ready;
}
self.onmessage = async ({ data }) => {
  try {
    const pyodide = await boot(data.base);
    if (data.mode === 'warm') return;
    self.postMessage({ type: 'ready' });
    const fn = pyodide.globals.get(data.mode === 'repo' ? 'run_repo' : 'run_function');
    if (data.mode === 'repo') fn(JSON.stringify(data.files), JSON.stringify(data.tests));
    else fn(data.code, data.fn, JSON.stringify(data.tests));
    fn.destroy();
  } catch (error) {
    self.postMessage({ type: 'fatal', error: String(error && error.message || error) });
  }
};
`;

const JS_WORKER = `
const MAX_LOG = 4000;
let logs = '';
const write = (...parts) => {
  if (logs.length < MAX_LOG) logs += parts.map((p) => (typeof p === 'string' ? p : safe(p))).join(' ') + '\\n';
};
function safe(value) {
  try { return JSON.stringify(value); } catch (e) { return String(value); }
}
self.console = { log: write, info: write, warn: write, error: write, debug: write };
function takeLogs() { const out = logs; logs = ''; return out; }
function frames(error) {
  const lines = String((error && error.stack) || error).split('\\n');
  const where = lines.filter((line) => /solution\\.js|repo:/.test(line)).slice(0, 4).map((line) => '  at ' + line.replace(/^\\s*at\\s*/, '').replace(/^.*\\((.*)\\)$/, '$1').replace(/(solution\\.js|repo:[^:]+):(\\d+)/, (m, file, n) => file.replace('repo:', '') + ':' + (Number(n) - 2)));
  return [lines[0], ...where].join('\\n');
}

function runFunction(data) {
  let fn;
  try {
    fn = new Function(data.code + '\\n//# sourceURL=solution.js\\nreturn typeof ' + data.fn + " === 'function' ? " + data.fn + ' : undefined;')();
  } catch (error) {
    self.postMessage({ type: 'fatal', error: String(error), logs: takeLogs() });
    return;
  }
  if (!fn) {
    self.postMessage({ type: 'fatal', error: 'Define a function called ' + data.fn + '.', logs: takeLogs() });
    return;
  }
  data.tests.forEach((args, index) => {
    self.postMessage({ type: 'start', index });
    const started = performance.now();
    try {
      const actual = fn(...structuredClone(args));
      self.postMessage({ type: 'result', index, actual: actual === undefined ? null : JSON.parse(JSON.stringify(actual)), ms: Math.round((performance.now() - started) * 10) / 10, logs: takeLogs() });
    } catch (error) {
      self.postMessage({ type: 'result', index, error: frames(error), ms: Math.round((performance.now() - started) * 10) / 10, logs: takeLogs() });
    }
  });
  self.postMessage({ type: 'done' });
}

function makeAssert() {
  class AssertionError extends Error {}
  const fail = (message, fallback) => { throw new AssertionError(message || fallback); };
  const deep = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const show = (v) => safe(v);
  const assert = (value, message) => { if (!value) fail(message, 'expected a truthy value, got ' + show(value)); };
  assert.ok = assert;
  assert.equal = (a, b, m) => { if (a != b) fail(m, 'expected ' + show(b) + ', got ' + show(a)); };
  assert.strictEqual = (a, b, m) => { if (a !== b) fail(m, 'expected ' + show(b) + ', got ' + show(a)); };
  assert.notEqual = (a, b, m) => { if (a == b) fail(m, 'expected something other than ' + show(b)); };
  assert.notStrictEqual = (a, b, m) => { if (a === b) fail(m, 'expected something other than ' + show(b)); };
  assert.deepEqual = assert.deepStrictEqual = (a, b, m) => { if (!deep(a, b)) fail(m, 'expected ' + show(b) + ', got ' + show(a)); };
  assert.match = (s, re, m) => { if (!re.test(s)) fail(m, 'expected ' + show(s) + ' to match ' + re); };
  assert.throws = (fn, m) => { try { fn(); } catch (e) { return; } fail(typeof m === 'string' ? m : '', 'expected the function to throw'); };
  assert.AssertionError = AssertionError;
  assert.strict = assert;
  return assert;
}

function runRepo(data) {
  const files = data.files;
  const cache = {};
  const registered = [];
  const assert = makeAssert();
  const builtins = {
    assert, 'node:assert': assert, 'node:assert/strict': assert, 'assert/strict': assert,
    'node:test': Object.assign((name, fn) => registered.push({ name, fn }), { test: (name, fn) => registered.push({ name, fn }) }),
    http: { createServer: () => ({ listen() { return this; } }), request: () => ({ on() {}, end() {} }) },
    events: { EventEmitter: class { on() { return this; } emit() { return false; } } },
    crypto: { randomUUID: () => crypto.randomUUID() },
  };
  for (const key of Object.keys(builtins)) if (!key.startsWith('node:')) builtins['node:' + key] = builtins[key];
  const dirname = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const normalise = (p) => {
    const out = [];
    for (const part of p.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') out.pop(); else out.push(part);
    }
    return out.join('/');
  };
  function resolve(spec, from) {
    if (builtins[spec]) return { builtin: spec };
    if (!spec.startsWith('.')) throw new Error("Cannot find module '" + spec + "' (only the repo's own files and node:test / node:assert are available)");
    const base = normalise((from ? from + '/' : '') + spec);
    for (const candidate of [base, base + '.js', base + '.json', base + '/index.js']) if (files[candidate] !== undefined) return { path: candidate };
    throw new Error("Cannot find module '" + spec + "'");
  }
  function load(path) {
    if (cache[path]) return cache[path].exports;
    const module = { exports: {} };
    cache[path] = module;
    if (path.endsWith('.json')) { module.exports = JSON.parse(files[path]); return module.exports; }
    const require = (spec) => { const found = resolve(spec, dirname(path)); return found.builtin ? builtins[found.builtin] : load(found.path); };
    new Function('require', 'module', 'exports', '__filename', '__dirname', files[path] + '\\n//# sourceURL=repo:' + path)(require, module, module.exports, '/' + path, '/' + dirname(path));
    return module.exports;
  }
  return (async () => {
    for (const path of data.tests) {
      registered.length = 0;
      try {
        load(path);
      } catch (error) {
        self.postMessage({ type: 'result', file: path, name: '(load)', status: 'error', error: frames(error), logs: takeLogs() });
        continue;
      }
      for (const { name, fn } of [...registered]) {
        self.postMessage({ type: 'start', file: path, name });
        const started = performance.now();
        let status = 'pass';
        let error = '';
        try {
          await fn();
        } catch (e) {
          status = e instanceof assert.AssertionError ? 'fail' : 'error';
          error = (e && e.message ? e.message : String(e)) + (status === 'error' ? '\\n' + frames(e) : '');
        }
        self.postMessage({ type: 'result', file: path, name, status, error, ms: Math.round((performance.now() - started) * 10) / 10, logs: takeLogs() });
      }
    }
    self.postMessage({ type: 'done' });
  })();
}

self.onmessage = ({ data }) => {
  self.postMessage({ type: 'ready' });
  if (data.mode === 'repo') runRepo(data);
  else runFunction(data);
};
`;

const workers = { python: null, javascript: null };

function spawn(lang) {
  const source = lang === 'python' ? PY_WORKER : JS_WORKER;
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}

function workerFor(lang) {
  if (!workers[lang]) workers[lang] = spawn(lang);
  return workers[lang];
}

function kill(lang) {
  if (workers[lang]) workers[lang].terminate();
  workers[lang] = null;
}

export function pythonReady() {
  return workers.python !== null;
}

export function warmPython() {
  const worker = workerFor('python');
  worker.postMessage({ mode: 'warm', base: PYODIDE_BASE });
}

let running = null;

function run(lang, payload, { timeoutMs, onEvent }) {
  if (running) running.cancel('Superseded by a new run.');
  return new Promise((resolve) => {
    const worker = workerFor(lang);
    const events = [];
    let timer = null;
    let booted = lang === 'javascript';
    const finish = (outcome) => {
      clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
      running = null;
      resolve({ ...outcome, events });
    };
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        kill(lang);
        finish({ timedOut: true });
      }, timeoutMs);
    };
    running = {
      cancel: (reason) => {
        kill(lang);
        finish({ cancelled: reason });
      },
    };
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        if (!booted) {
          booted = true;
          onEvent({ type: 'booted' });
        }
        arm();
        return;
      }
      events.push(data);
      onEvent(data);
      if (data.type === 'done') finish({});
      else if (data.type === 'fatal') {
        if (/pyodide|importScripts|NetworkError|Failed to fetch|load/i.test(data.error || '') && !booted) {
          kill(lang);
          finish({ unavailable: 'Python could not load. Check your connection and try again, or switch to JavaScript.' });
        } else finish({});
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      kill(lang);
      finish({ unavailable: lang === 'python' ? 'Python could not load here. Try again, or switch to JavaScript.' : String(event.message || 'The JavaScript runner crashed.') });
    };
    if (booted) arm();
    else {
      timer = setTimeout(() => {
        kill(lang);
        finish({ unavailable: 'Python took too long to load. Check your connection and try again.' });
      }, 60000);
    }
    worker.postMessage({ ...payload, base: PYODIDE_BASE });
  });
}

export function runFunctionTests({ lang, code, fn, tests, timeoutMs = 6000, onEvent = () => {} }) {
  return run(lang, { mode: 'function', code, fn, tests }, { timeoutMs, onEvent });
}

export function runRepoTests({ lang, files, tests, timeoutMs = 6000, onEvent = () => {} }) {
  return run(lang, { mode: 'repo', files, tests }, { timeoutMs, onEvent });
}

export function cancelRun() {
  if (running) running.cancel('Stopped.');
}

export function trimLogs(text) {
  const lines = String(text || '').split('\n');
  return lines.length > MAX_LOG_LINES ? `${lines.slice(0, MAX_LOG_LINES).join('\n')}\n… output cut at ${MAX_LOG_LINES} lines` : text;
}
