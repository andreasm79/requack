const test = require('node:test');
const assert = require('node:assert');
const { handle } = require('../src/http/router');

test('unknown routes are 404', () => {
  assert.equal(handle({ method: 'GET', path: '/nope' }).status, 404);
});

test('health check is up', () => {
  assert.equal(handle({ method: 'GET', path: '/health' }).body, 'ok');
});
