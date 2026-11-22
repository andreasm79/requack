const PY_TYPES = { int: 'int', bool: 'bool', str: 'str', 'int[]': 'list[int]', 'str[]': 'list[str]', 'int[][]': 'list[list[int]]', 'str[][]': 'list[list[str]]' };
const JS_TYPES = { int: 'number', bool: 'boolean', str: 'string', 'int[]': 'number[]', 'str[]': 'string[]', 'int[][]': 'number[][]', 'str[][]': 'string[][]' };

export function starterCode(problem, lang) {
  if (lang === 'python') {
    const args = problem.params.map(([name, type]) => `${name}: ${PY_TYPES[type]}`).join(', ');
    return `def ${problem.fn.python}(${args}) -> ${PY_TYPES[problem.returns]}:\n    pass\n`;
  }
  const docs = problem.params.map(([name, type]) => ` * @param {${JS_TYPES[type]}} ${name}`).join('\n');
  const args = problem.params.map(([name]) => name).join(', ');
  return `/**\n${docs}\n * @return {${JS_TYPES[problem.returns]}}\n */\nfunction ${problem.fn.js}(${args}) {\n  \n}\n`;
}

export function signature(problem, lang) {
  const names = problem.params.map(([name]) => name).join(', ');
  return `${lang === 'python' ? problem.fn.python : problem.fn.js}(${names})`;
}
