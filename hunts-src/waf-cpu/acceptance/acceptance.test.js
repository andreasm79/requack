const test = require('node:test');
const assert = require('node:assert');
const { inspect } = require('../src/waf/engine');
const { loadRules } = require('../src/waf/rules');

const rules = loadRules('managed');

test('a 5,000 character body is inspected in under a second', () => {
  const started = Date.now();
  inspect(rules, { url: '/upload', body: '1'.repeat(5000) });
  const took = Date.now() - started;
  assert.ok(took < 1000, `inspection took ${took} ms`);
});

test('the quote breakout is still flagged', () => {
  assert.equal(inspect(rules, { url: "/?q=1';alert(document.cookie)=1" }).ruleId, 'xss-302');
});

test('a script tag is still blocked', () => {
  assert.equal(inspect(rules, { url: '/?q=<script>x</script>' }).block, true);
});
