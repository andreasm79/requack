function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'number' && Object.is(value, -0)) return '0';
  return JSON.stringify(value === undefined ? null : value);
}

function sortedCopy(list) {
  return [...list].map(canonical).sort();
}

export function sameAnswer(expected, actual, mode = 'exact') {
  if (mode === 'exact') return canonical(expected) === canonical(actual);
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  if (mode === 'unordered') return canonical(sortedCopy(expected)) === canonical(sortedCopy(actual));
  if (mode === 'groups' || mode === 'sets') {
    if (!actual.every(Array.isArray)) return false;
    const normalise = (groups) => groups.map((group) => canonical([...group].map(canonical).sort())).sort();
    return canonical(normalise(expected)) === canonical(normalise(actual));
  }
  return false;
}

export function show(value, max = 160) {
  const text = canonical(value).replace(/,/g, ', ');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function verdict(results) {
  const passed = results.filter((result) => result.status === 'pass').length;
  return { passed, total: results.length, allPassed: results.length > 0 && passed === results.length };
}

export function ratingFor(passed, total) {
  if (total === 0 || passed === 0) return 'again';
  if (passed < total) return 'hard';
  return 'good';
}
