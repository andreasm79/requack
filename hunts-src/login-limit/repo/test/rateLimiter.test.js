const test = require('node:test');
const assert = require('node:assert');
const { RateLimiter } = require('../src/auth/rateLimiter');

test('allows up to the limit', () => {
  const limiter = new RateLimiter({ maxAttempts: 3, windowSeconds: 60 }, () => 1000);
  assert.equal(limiter.allow('ip'), true);
  assert.equal(limiter.allow('ip'), true);
  assert.equal(limiter.allow('ip'), true);
});

test('blocks the attempt after the limit', () => {
  const limiter = new RateLimiter({ maxAttempts: 2, windowSeconds: 60 }, () => 1000);
  limiter.allow('ip');
  limiter.allow('ip');
  assert.equal(limiter.allow('ip'), false);
});

test('keeps separate counts per IP', () => {
  const limiter = new RateLimiter({ maxAttempts: 1, windowSeconds: 60 }, () => 1000);
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('b'), true);
});
