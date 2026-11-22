const sqli = require('./sqli');
const xss = require('./xss');
const traversal = require('./traversal');

const SETS = {
  managed: [...sqli, ...xss, ...traversal],
};

function loadRules(name) {
  const rules = SETS[name];
  if (!rules) throw new Error(`Unknown ruleset ${name}`);
  return rules.filter((rule) => rule.enabled);
}

module.exports = { loadRules };
