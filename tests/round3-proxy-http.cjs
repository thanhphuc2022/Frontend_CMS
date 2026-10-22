// Requires the production build in out/integration-round3. Both Next and the
// fake upstream bind to loopback. No production backend or credentials used.
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let phase = 'start';
(async () => {
  const received = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    received.push({ url: req.url, headers: req.headers, body: Buffer.concat(chunks), method: req.method });
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Fixture conflict' }));
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const reservation = http.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const frontendPort = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const next = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: path.resolve('out/integration-round3'), windowsHide: true, stdio: 'ignore',
    env: { ...process.env, BACKEND_API_BASE_URL: `http://127.0.0.1:${upstream.address().port}/api` },
  });
  let spawnFailed = false; next.on('error', () => { spawnFailed = true; });
  const base = `http://127.0.0.1:${frontendPort}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (spawnFailed || next.exitCode !== null) throw Error('Fixture Next could not start');
      try { if ((await fetch(base + '/login')).ok) { ready = true; break; } } catch {}
      await delay(150);
    }
    assert.ok(ready);
    phase = 'production login HTML';
    const html = await (await fetch(base + '/login')).text();
    assert.match(html, /<form\b[^>]*method="post"/);
    assert.match(html, /<form\b[^>]*action="\/login"/);
    assert.match(html, /<fieldset\b[^>]*disabled=""/);
    phase = 'encoded route parameter';
    const response = await fetch(base + '/api/backend/deleteimagelogo/Tinhocnhuy%2Ffixture?q=a%2Fb', { method: 'POST', headers: { Authorization: 'Bearer fixture-http' } });
    assert.equal(response.status, 409);
    const deletion = received.at(-1);
    assert.equal(deletion.url, '/api/deleteimagelogo/Tinhocnhuy%2Ffixture?q=a%2Fb');
    assert.equal(deletion.headers.authorization, 'Bearer fixture-http');
    assert.equal(deletion.method, 'POST');
    phase = 'multipart forwarding';
    const body = new FormData(); body.append('file', new Blob(['fixture image'], { type: 'image/png' }), 'fixture.png'); body.append('title', 'Fixture title');
    const request = new Request(base + '/api/backend/createcontentbanner?fixture=1', { method: 'POST', headers: { Authorization: 'Bearer fixture-http' }, body });
    const bytes = Buffer.from(await request.clone().arrayBuffer());
    const uploaded = await fetch(request);
    assert.equal(uploaded.status, 409);
    const upload = received.at(-1);
    assert.equal(upload.url, '/api/createcontentbanner?fixture=1');
    assert.equal(upload.headers['content-type'], request.headers.get('content-type'));
    assert.deepEqual(upload.body, bytes);
    assert.equal(upload.headers.authorization, 'Bearer fixture-http');
    console.log('Production Next + fake HTTP backend: encoded public_id, query, POST, Authorization, exact multipart bytes/boundary and 409 PASS.');
    console.log('Production login HTML: POST action + disabled-before-hydration fieldset PASS. No live requests.');
  } finally {
    if (next.exitCode === null) { const exited = new Promise((resolve) => next.once('exit', resolve)); next.kill(); await exited; }
    await new Promise((resolve) => upstream.close(resolve));
  }
})().catch((error) => { console.error(`Round 3 local HTTP fixture failed at ${phase}: ${error.code || error.name} (details omitted).`); process.exitCode = 1; });
