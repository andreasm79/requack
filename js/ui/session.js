let session = null;

export function startSession(problems, open) {
  if (problems.length === 0) return;
  session = { queue: problems, index: 0, open, results: { again: 0, hard: 0, good: 0, easy: 0 }, flags: 0, oa: false };
  open(problems[0]);
}

export function sessionLabel() {
  return session ? `${session.index + 1}/${session.queue.length}` : '';
}

export function endSession() {
  session = null;
}

export function advance(rating, flags = null) {
  if (!session) return null;
  session.results[rating] += 1;
  if (flags !== null) {
    session.oa = true;
    session.flags += flags;
  }
  session.index += 1;
  if (session.index < session.queue.length) {
    session.open(session.queue[session.index]);
    return { next: true };
  }
  const { results, oa } = session;
  const flagTotal = session.flags;
  session = null;
  return { next: false, results, oa, flags: flagTotal };
}
