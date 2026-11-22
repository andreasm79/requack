const test = require('node:test');
const assert = require('node:assert');
const { RateLimiter } = require('../src/auth/rateLimiter');

function clock(start) {
  let t = start;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

test('the 11th attempt within a minute is blocked, even when spread out', () => {
  const now = clock(1_000_000);
  const limiter = new RateLimiter({ maxAttempts: 10, windowSeconds: 60 }, now);
  for (let i = 0; i < 10; i++) {
    assert.equal(limiter.allow('ip'), true, `attempt ${i + 1} should be allowed`);
    now.advance(500);
  }
  assert.equal(limiter.allow('ip'), false, 'attempt 11, five seconds in, was allowed');
});

test('a new window opens after 60 seconds', () => {
  const now = clock(5_000_000);
  const limiter = new RateLimiter({ maxAttempts: 1, windowSeconds: 60 }, now);
  limiter.allow('ip');
  now.advance(59_000);
  assert.equal(limiter.allow('ip'), false);
  now.advance(2_000);
  assert.equal(limiter.allow('ip'), true);
});
