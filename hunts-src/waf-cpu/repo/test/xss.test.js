const test = require('node:test');
const assert = require('node:assert');
const { inspect } = require('../src/waf/engine');
const { loadRules } = require('../src/waf/rules');

const rules = loadRules('managed');

test('blocks a script tag', () => {
  assert.equal(inspect(rules, { url: '/?q=<script>alert(1)</script>' }).ruleId, 'xss-300');
});

test('flags a quote breakout', () => {
  assert.equal(inspect(rules, { url: "/?q=1';alert(document.cookie)=1" }).ruleId, 'xss-302');
});

test('lets normal traffic through', () => {
  assert.equal(inspect(rules, { url: '/products?page=2' }).block, false);
});
