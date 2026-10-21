const { createServer } = require('http');
const next = require('next');

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || 'localhost';
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
  });
});
