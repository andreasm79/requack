const { login } = require('../auth/login');

const routes = {
  'POST /login': (req) => login({ ip: req.ip, ...req.body }),
  'GET /health': () => ({ status: 200, body: 'ok' }),
};

function handle(req) {
  const route = routes[`${req.method} ${req.path}`];
  return route ? route(req) : { status: 404, body: 'Not found' };
}

module.exports = { handle };
