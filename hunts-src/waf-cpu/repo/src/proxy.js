const http = require('http');

const ORIGIN = { host: 'origin.internal', port: 80 };

function proxy(req, res, body) {
  const upstream = http.request(
    { ...ORIGIN, path: req.url, method: req.method, headers: req.headers },
    (reply) => {
      res.writeHead(reply.statusCode, reply.headers);
      reply.pipe(res);
    }
  );
  upstream.on('error', () => {
    res.writeHead(502);
    res.end('Bad gateway');
  });
  upstream.end(body);
}

module.exports = { proxy };
