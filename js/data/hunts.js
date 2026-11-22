import { HUNT_PATTERN } from './kinds.js';
import { REPO_HUNTS } from './repos.js';

const BUG_MARK = '!!';

export function parseMarked(code) {
  const raw = String(code).replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  const bugs = [];
  const lines = raw.map((line, index) => {
    if (!line.startsWith(BUG_MARK)) return line;
    bugs.push(index);
    return line.slice(BUG_MARK.length);
  });
  return { lines, bugs };
}

const RAW = [
  {
    id: 'hunt-shared-basket',
    title: 'The basket that remembers strangers',
    lang: 'python',
    difficulty: 'Easy',
    tag: 'Shared state',
    scenario: 'An agent wrote this helper for a shop. QA reports that a brand-new customer sometimes opens a basket that already has someone else\'s items in it.',
    files: [{ name: 'basket.py', code: `
class Basket:
!!    def __init__(self, owner, items=[]):
        self.owner = owner
        self.items = items

    def add(self, sku, qty=1):
        self.items.append((sku, qty))

    def total_items(self):
        return sum(qty for _, qty in self.items)


def checkout_preview(owner, sku):
    basket = Basket(owner)
    basket.add(sku)
    return basket.total_items()
` }],
    explanation: 'Default arguments are evaluated once, when the function is defined. Every Basket created without items shares the same list object, so one customer\'s add() shows up in everyone else\'s basket.',
    fix: `def __init__(self, owner, items=None):
    self.owner = owner
    self.items = list(items) if items else []`,
  },
  {
    id: 'hunt-foreach-await',
    title: 'Receipts that always succeed',
    lang: 'javascript',
    difficulty: 'Medium',
    tag: 'Async',
    scenario: 'The nightly job reports every receipt as sent, even on the night the mail provider was down for six hours.',
    files: [{ name: 'receipts.js', code: `
async function sendReceipts(orders, mailer) {
  const failed = [];

!!  orders.forEach(async (order) => {
    try {
      await mailer.send(order.email, renderReceipt(order));
    } catch (err) {
      failed.push(order.id);
    }
  });

  return { sent: orders.length - failed.length, failed };
}
` }],
    explanation: 'forEach ignores the promises its callback returns. The function reaches the return statement before a single send has finished, so failed is still empty and every order counts as sent.',
    fix: `for (const order of orders) {
  try {
    await mailer.send(order.email, renderReceipt(order));
  } catch (err) {
    failed.push(order.id);
  }
}`,
  },
  {
    id: 'hunt-lower-bound',
    title: 'The search that never comes back',
    lang: 'java',
    difficulty: 'Medium',
    tag: 'Off-by-one',
    scenario: 'A lower-bound search used by autocomplete. Most requests are fine. Some never return and pin a CPU core at 100%.',
    files: [{ name: 'Search.java', code: `
public static int firstAtLeast(int[] sorted, int target) {
    int lo = 0;
    int hi = sorted.length;

    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;
        if (sorted[mid] < target) {
!!            lo = mid;
        } else {
            hi = mid;
        }
    }
    return lo;
}
` }],
    explanation: 'When hi is lo + 1, mid equals lo. If sorted[mid] is still below the target, lo = mid changes nothing and the loop spins forever. The left bound has to move past mid.',
    fix: `if (sorted[mid] < target) {
    lo = mid + 1;
} else {
    hi = mid;
}`,
  },
  {
    id: 'hunt-integer-cache',
    title: 'Double-booked in the back rows',
    lang: 'java',
    difficulty: 'Hard',
    tag: 'Equality',
    scenario: 'A double-booking check for a 300-seat lecture theatre. Tests with seats 1 to 100 pass. In production, duplicates slip through, but only in the back rows.',
    files: [{ name: 'SeatAllocator.java', code: `
public class SeatAllocator {
    private final Map<String, Integer> seatByTicket = new HashMap<>();

    public void assign(String ticket, int seat) {
        seatByTicket.put(ticket, seat);
    }

    public boolean sameSeat(String ticketA, String ticketB) {
        Integer a = seatByTicket.get(ticketA);
        Integer b = seatByTicket.get(ticketB);
        if (a == null || b == null) {
            return false;
        }
!!        return a == b;
    }
}
` }],
    explanation: '== on two Integer objects compares references, not values. Java caches boxed integers from -128 to 127, so small seat numbers happen to be the same object and the tests pass. Seat 128 and up are separate objects and compare as different.',
    fix: `return a.equals(b);`,
  },
  {
    id: 'hunt-late-binding',
    title: 'Every button deletes',
    lang: 'python',
    difficulty: 'Medium',
    tag: 'Closures',
    scenario: 'A generated toolbar. Whichever button you press, the delete action runs.',
    files: [{ name: 'toolbar.py', code: `
def build_handlers(buttons):
    handlers = {}
    for name in buttons:
!!        handlers[name] = lambda: print(f"clicked {name}")
    return handlers


handlers = build_handlers(["save", "export", "delete"])
handlers["save"]()
` }],
    explanation: 'The lambda captures the variable name, not its value at that moment. By the time any handler runs, the loop has finished and name is "delete" for all of them.',
    fix: `handlers[name] = lambda name=name: print(f"clicked {name}")`,
  },
  {
    id: 'hunt-sql-injection',
    title: 'Failed the security review in a minute',
    lang: 'python',
    difficulty: 'Easy',
    tag: 'Security',
    scenario: 'Search endpoint for a society membership list. It passes every functional test. The security reviewer rejected it almost immediately.',
    files: [{ name: 'search.py', code: `
def find_students(conn, surname, year):
    query = (
        "SELECT id, name, email FROM students "
!!        f"WHERE surname = '{surname}' AND year = {year} "
        "ORDER BY name"
    )
    cursor = conn.cursor()
    cursor.execute(query)
    return cursor.fetchall()
` }],
    explanation: 'User input is pasted straight into the SQL text. A surname of \' OR \'1\'=\'1 returns every student, and worse payloads can read or change other tables. Values must be passed as parameters so the driver never treats them as SQL.',
    fix: `query = (
    "SELECT id, name, email FROM students "
    "WHERE surname = ? AND year = ? "
    "ORDER BY name"
)
cursor.execute(query, (surname, year))`,
  },
  {
    id: 'hunt-numeric-sort',
    title: 'The median of 5, 10 and 40 is 40',
    lang: 'javascript',
    difficulty: 'Easy',
    tag: 'Type coercion',
    scenario: 'A grades dashboard. For the marks 5, 10 and 40 it shows a median of 40.',
    files: [{ name: 'stats.js', code: `
function median(values) {
  if (values.length === 0) return null;

!!  const sorted = [...values].sort();
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
` }],
    explanation: 'Array.prototype.sort with no comparator converts elements to strings and sorts them alphabetically. "10" < "40" < "5", so the middle element is 40.',
    fix: `const sorted = [...values].sort((a, b) => a - b);`,
  },
  {
    id: 'hunt-role-check',
    title: 'Everyone is a moderator',
    lang: 'python',
    difficulty: 'Easy',
    tag: 'Logic',
    scenario: 'Any logged-in member can delete anyone\'s posts on the society forum.',
    files: [{ name: 'permissions.py', code: `
def can_delete_post(user, post):
    if user.is_banned:
        return False
!!    if user.role == "admin" or "moderator":
        return True
    return post.author_id == user.id
` }],
    explanation: 'The condition reads as (user.role == "admin") or ("moderator"). A non-empty string is truthy, so the whole expression is always true.',
    fix: `if user.role in ("admin", "moderator"):
    return True`,
  },
  {
    id: 'hunt-missing-await',
    title: 'Any session header gets the export',
    lang: 'javascript',
    difficulty: 'Hard',
    tag: 'Async, auth',
    scenario: 'Three files from an agent-built members API. Anyone who sends an x-session header, even a made-up one, can download the full member export.',
    files: [
      { name: 'routes.js', code: `
const express = require('express');
const { requireMember } = require('./auth');

const router = express.Router();

router.get('/members/export', requireMember, (req, res) => {
  res.json({ exportedBy: req.session.userId, rows: loadAllMembers() });
});

module.exports = router;
` },
      { name: 'auth.js', code: `
const db = require('./db');

async function requireMember(req, res, next) {
  const token = req.headers['x-session'];
  if (!token) {
    return res.status(401).json({ error: 'No session' });
  }

!!  const session = db.findSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }

  req.session = session;
  next();
}

module.exports = { requireMember };
` },
      { name: 'db.js', code: `
const sessions = new Map();

async function findSession(token) {
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  return session;
}

module.exports = { findSession, sessions };
` },
    ],
    explanation: 'findSession is async, so it returns a Promise. Without await, session is that Promise, which is always truthy, and the invalid-session branch can never run. The route then serves the export with exportedBy undefined.',
    fix: `const session = await db.findSession(token);`,
  },
  {
    id: 'hunt-pagination',
    title: 'Page 1 starts at event 21',
    lang: 'python',
    difficulty: 'Medium',
    tag: 'Off-by-one',
    scenario: 'Events listing for a society site. Nobody can find the 20 soonest events. Page 1 opens on the 21st.',
    files: [{ name: 'events.py', code: `
PAGE_SIZE = 20


def list_events(conn, page):
    """Pages are numbered from 1 in the URL: /events?page=1"""
!!    offset = page * PAGE_SIZE
    rows = conn.execute(
        "SELECT id, title, starts_at FROM events "
        "ORDER BY starts_at LIMIT ? OFFSET ?",
        (PAGE_SIZE, offset),
    ).fetchall()
    return {"page": page, "events": rows}
` }],
    explanation: 'Pages are 1-indexed but the offset is computed as if they were 0-indexed, so page 1 skips the first 20 rows.',
    fix: `offset = (page - 1) * PAGE_SIZE`,
  },
  {
    id: 'hunt-oversold',
    title: '214 tickets for 200 seats',
    lang: 'python',
    difficulty: 'Hard',
    tag: 'Concurrency',
    scenario: 'Ball tickets, capacity 200. Sales opened, everyone clicked at once, and 214 were sold.',
    files: [{ name: 'tickets.py', code: `
import threading


class TicketPool:
    def __init__(self, capacity):
        self.remaining = capacity
        self.lock = threading.Lock()
        self.holders = []

    def reserve(self, student_id):
!!        if self.remaining <= 0:
!!            return False
!!        with self.lock:
            self.remaining -= 1
            self.holders.append(student_id)
        return True
` }],
    explanation: 'The capacity check happens outside the lock. With one ticket left, many threads pass the check before any of them decrements, and each then takes a ticket. Check and update have to happen together under the lock.',
    fix: `def reserve(self, student_id):
    with self.lock:
        if self.remaining <= 0:
            return False
        self.remaining -= 1
        self.holders.append(student_id)
        return True`,
  },
  {
    id: 'hunt-shallow-copy',
    title: 'One opt-out silences everyone',
    lang: 'javascript',
    difficulty: 'Medium',
    tag: 'Mutation',
    scenario: 'After the first user opts out of email, nobody receives emails any more.',
    files: [{ name: 'settings.js', code: `
const DEFAULT_SETTINGS = {
  theme: 'dark',
  notifications: { email: true, push: false },
};

function settingsFor(user) {
!!  const settings = { ...DEFAULT_SETTINGS };
  if (user.optedOutOfEmail) {
!!    settings.notifications.email = false;
  }
  return settings;
}
` }],
    explanation: 'Object spread copies one level. settings.notifications is the same object as DEFAULT_SETTINGS.notifications, so writing to it changes the defaults for every later user.',
    fix: `const settings = structuredClone(DEFAULT_SETTINGS);`,
  },
  {
    id: 'hunt-remove-iterating',
    title: 'Expired sessions that survive cleanup',
    lang: 'python',
    difficulty: 'Medium',
    tag: 'Iteration',
    scenario: 'A cleanup job leaves some expired sessions behind. It is always the one right after another expired session.',
    files: [{ name: 'cleanup.py', code: `
def drop_expired(sessions, now):
!!    for session in sessions:
        if session.expires_at <= now:
!!            sessions.remove(session)
    return sessions
` }],
    explanation: 'Removing from a list while iterating over it shifts the remaining items left, so the iterator skips the element that slid into the removed slot.',
    fix: `def drop_expired(sessions, now):
    sessions[:] = [s for s in sessions if s.expires_at > now]
    return sessions`,
  },
  {
    id: 'hunt-int-division',
    title: '69.5 rounds down to a 2.1',
    lang: 'java',
    difficulty: 'Easy',
    tag: 'Types',
    scenario: 'A module average of 69 and 70 displays as 69.0, and a student misses a First.',
    files: [{ name: 'Marks.java', code: `
public static double averageMark(int[] marks) {
    if (marks.length == 0) {
        return 0.0;
    }
    int sum = 0;
    for (int mark : marks) {
        sum += mark;
    }
!!    return sum / marks.length;
}
` }],
    explanation: 'Both operands are ints, so Java does integer division and throws away the fraction before the result is widened to double.',
    fix: `return (double) sum / marks.length;`,
  },
  {
    id: 'hunt-left-join',
    title: 'Societies with no events vanish',
    lang: 'sql',
    difficulty: 'Hard',
    tag: 'Joins',
    scenario: 'A report of every society and how many events it ran this term. Societies with zero events should show 0. They do not appear at all.',
    files: [{ name: 'report.sql', code: `
-- Every society, with how many events it ran this term.
-- Societies with no events should show 0.
SELECT s.name, COUNT(e.id) AS events_this_term
FROM societies s
LEFT JOIN events e ON e.society_id = s.id
!!WHERE e.starts_at >= '2026-09-01'
GROUP BY s.name
ORDER BY events_this_term DESC;
` }],
    explanation: 'For a society with no events the LEFT JOIN produces a row where every e column is NULL. The WHERE clause then rejects it because NULL >= date is not true, which turns the query into an inner join. The date filter belongs in the join condition.',
    fix: `LEFT JOIN events e
  ON e.society_id = s.id
 AND e.starts_at >= '2026-09-01'`,
  },
  {
    id: 'hunt-cache-key',
    title: 'Member price for everyone',
    lang: 'python',
    difficulty: 'Medium',
    tag: 'Caching',
    scenario: 'Two files. After a member views an event, non-members are charged the member price for it too, and the other way round.',
    files: [
      { name: 'pricing.py', code: `
from cache import memoize


@memoize
def ticket_price(event_id, is_member):
    base = load_base_price(event_id)
    return base * 0.5 if is_member else base
` },
      { name: 'cache.py', code: `
_store = {}


def memoize(fn):
    def wrapper(*args):
!!        key = (fn.__name__, args[0])
        if key not in _store:
            _store[key] = fn(*args)
        return _store[key]
    return wrapper
` },
    ],
    explanation: 'The cache key only uses the first argument. ticket_price(7, True) and ticket_price(7, False) share one entry, so whoever asks first decides the price for everyone.',
    fix: `key = (fn.__name__, args)`,
  },
  {
    id: 'hunt-parseint-map',
    title: '[12, NaN, NaN]',
    lang: 'javascript',
    difficulty: 'Easy',
    tag: 'API misuse',
    scenario: 'The seat picker turns "12, 7, 30" into [12, NaN, NaN].',
    files: [{ name: 'seats.js', code: `
function parseSeatList(input) {
  // "12, 7, 30" -> [12, 7, 30]
  return input
    .split(',')
    .map((part) => part.trim())
!!    .map(parseInt);
}
` }],
    explanation: 'map calls its callback with (value, index). parseInt takes (string, radix), so the index becomes the radix: parseInt("7", 1) and parseInt("30", 2) are both NaN.',
    fix: `.map((part) => Number.parseInt(part, 10));`,
  },
  {
    id: 'hunt-swallowed-error',
    title: 'Saved successfully (it was not)',
    lang: 'python',
    difficulty: 'Medium',
    tag: 'Error handling',
    scenario: 'The grader logs "results saved" on every run. The file is not on disk and there is no error anywhere.',
    files: [{ name: 'results.py', code: `
import json


def save_results(path, results):
    try:
        with open(path, "w") as handle:
            json.dump(results, handle)
!!    except Exception:
!!        pass
    return True
` }],
    explanation: 'The bare except swallows every failure, including a missing directory or a permissions error, and the function still returns True. The caller has no way to know the write failed.',
    fix: `def save_results(path, results):
    with open(path, "w") as handle:
        json.dump(results, handle)
    return True`,
  },
];

function toHunt(hunt) {
  const files = hunt.files.map((file) => ({ name: file.name, ...parseMarked(file.code) }));
  return {
    id: hunt.id,
    title: hunt.title,
    kind: 'bug',
    pattern: HUNT_PATTERN,
    difficulty: hunt.difficulty,
    lang: hunt.lang,
    tag: hunt.tag,
    scenario: hunt.scenario || hunt.ticket,
    explanation: hunt.explanation,
    fix: hunt.fix,
    files,
    source: hunt.source || null,
    acceptance: hunt.acceptance || [],
    blind75: false,
    premium: false,
    url: '',
    prompt: '',
    custom: false,
  };
}

export const HUNTS = [...RAW, ...REPO_HUNTS].map(toHunt);

const TEST_FILE = /(^|\/)(test_[^/]*\.py|[^/]*\.test\.js)$/;

export function testFilesOf(problem) {
  return problem.files.map((file) => file.name).filter((name) => TEST_FILE.test(name));
}

export function isRunnableRepo(problem) {
  return Boolean(problem.files) && ['python', 'javascript'].includes(problem.lang) && (problem.acceptance || []).length > 0;
}

export function isRepo(problem) {
  return Boolean(problem.files) && problem.files.length > 3;
}
