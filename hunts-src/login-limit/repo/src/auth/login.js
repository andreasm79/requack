const config = require('../config');
const { RateLimiter } = require('./rateLimiter');
const { checkPassword } = require('./passwords');

const limiter = new RateLimiter(config.loginLimit);

function login({ ip, email, password }) {
  if (!limiter.allow(ip)) {
    return { status: 429, body: 'Too many attempts. Try again in a minute.' };
  }
  if (!checkPassword(email, password)) {
    return { status: 401, body: 'Wrong email or password.' };
  }
  return { status: 200, body: 'Welcome back.' };
}

module.exports = { login, limiter };
