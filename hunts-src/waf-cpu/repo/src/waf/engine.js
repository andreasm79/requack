const { normalize } = require('./normalize');

function inspect(rules, request) {
  const targets = [normalize(request.url), normalize(request.body)];
  for (const rule of rules) {
    for (const target of targets) {
      if (rule.pattern.test(target)) {
        return { block: rule.action === 'block', ruleId: rule.id };
      }
    }
  }
  return { block: false };
}

module.exports = { inspect };
