const http = require('http');
const { handle } = require('./http/router');

http.createServer((req, res) => {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : {};
    const result = handle({ method: req.method, path: req.url, ip: req.socket.remoteAddress, body });
    res.writeHead(result.status);
    res.end(result.body);
  });
}).listen(3000);
