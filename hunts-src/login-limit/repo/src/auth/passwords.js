const crypto = require('crypto');

const USERS = new Map([
  ['ada@tcd.ie', { salt: 'c1', hash: 'f3a9' }],
  ['grace@tcd.ie', { salt: '7e', hash: '0b12' }],
]);

function hash(password, salt) {
  let h = 0;
  for (const c of salt + password) h = (h * 31 + c.charCodeAt(0)) % 65536;
  return h.toString(16).padStart(4, '0');
}

function checkPassword(email, password) {
  const user = USERS.get(email);
  return Boolean(user) && hash(password, user.salt) === user.hash;
}

module.exports = { checkPassword, hash };
