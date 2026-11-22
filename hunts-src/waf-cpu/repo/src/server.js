const http = require('http');
const { loadRules } = require('./waf/rules');
const { inspect } = require('./waf/engine');
const { proxy } = require('./proxy');
const config = require('./config');

const rules = loadRules(config.ruleset);

http.createServer(async (req, res) => {
  const body = await readBody(req, config.maxBodyBytes);
  const verdict = inspect(rules, { url: req.url, body });
  if (verdict.block) {
    res.writeHead(403);
    return res.end(`Blocked by rule ${verdict.ruleId}`);
  }
  return proxy(req, res, body);
}).listen(config.port);

function readBody(req, limit) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      if (data.length < limit) data += chunk;
    });
    req.on('end', () => resolve(data));
  });
}
