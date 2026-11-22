class RateLimiter {
  constructor({ maxAttempts, windowSeconds }, now = () => Date.now()) {
    this.maxAttempts = maxAttempts;
    this.windowSeconds = windowSeconds;
    this.now = now;
    this.entries = new Map();
  }

  allow(key) {
    const now = this.now();
    const entry = this.entries.get(key) || { windowStart: now, count: 0 };
!!    if (now - entry.windowStart >= this.windowSeconds) {
      entry.windowStart = now;
      entry.count = 0;
    }
    entry.count += 1;
    this.entries.set(key, entry);
    return entry.count <= this.maxAttempts;
  }
}

module.exports = { RateLimiter };
