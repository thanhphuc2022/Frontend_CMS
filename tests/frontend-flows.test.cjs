const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, globals = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const context = { exports: {}, Headers, FormData, Request, Response, URL, Event, ...globals };
  vm.runInNewContext(code, context, { filename: path });
  return context.exports;
}

test('backend selection: browser proxy, configured server URL, production default, no retry online', async () => {
  assert.equal(load('src/lib/api.ts', { window: {}, process: { env: {} } }).API_BASE, '/api/backend');
  const urls = [];
  const api = load('src/lib/api.ts', {
    process: { env: { BACKEND_API_BASE_URL: ' http://localhost:8080/api/// ' } },
    fetch: async (url) => { urls.push(url); throw new Error('Local backend unavailable'); },
  });
  assert.equal(api.API_BASE, 'http://localhost:8080/api');
  const result = await api.apiRequest('/AllPost');
  assert.equal(result.ok, false);
  assert.deepEqual(urls, ['http://localhost:8080/api/AllPost']);
  const server = load('src/lib/server-api.ts', {
    require: () => api,
    fetch: async (url, options) => {
      assert.equal(options.cache, 'no-store');
      urls.push(url);
      return Response.json([]);
    },
  });
  await server.serverGet('/AllPost');
  assert.equal(urls[1], 'http://localhost:8080/api/AllPost');
  assert.equal(load('src/lib/api.ts', { process: { env: {} } }).API_BASE, 'https://cms-backend-nodejs.vercel.app/api');
});

test('actual TinyMCE handler reads the latest token and preserves POST/file/location without Content-Type', async () => {
  const storage = new Map();
  const calls = [];
  const api = load('src/lib/api.ts', {
    window: { dispatchEvent() {} },
    localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    fetch: async (url, options) => { calls.push({ url, ...options }); return Response.json({ location: '/uploaded.png' }); },
  });
  const source = fs.readFileSync('src/components/admin/posts/TinyMceEditor.tsx', 'utf8');
  const body = source.match(/images_upload_handler: async \(blobInfo\) => \{([\s\S]*?)\n          \},/)[1];
  const code = ts.transpileModule(`exports.upload = async (blobInfo) => {${body}}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = { exports: {}, FormData, apiRequest: api.apiRequest, uploadPath: '/uploadimagesPost' };
  vm.runInNewContext(code, context);
  const blob = { blob: () => new Blob(['test'], { type: 'image/png' }), filename: () => 'test.png' };
  for (const token of ['fixture-one', 'fixture-two']) {
    api.saveTokens(token);
    assert.equal(await context.exports.upload(blob), '/uploaded.png');
    const call = calls.at(-1);
    assert.equal(call.url, '/api/backend/uploadimagesPost');
    assert.equal(call.headers.get('Authorization'), `Bearer ${token}`);
    assert.equal(call.method, 'POST');
    assert.equal(call.headers.has('Content-Type'), false);
    assert.equal(call.body.get('file').name, 'test.png');
  }
  context.uploadPath = '/uploadimagesNews';
  await context.exports.upload(blob);
  assert.equal(calls.at(-1).url, '/api/backend/uploadimagesNews');
  assert.equal(calls.at(-1).headers.get('Authorization'), 'Bearer fixture-two');
});

test('proxy preserves method, query, Authorization, multipart boundary, body and upstream status', async () => {
  const api = { API_BASE: 'http://localhost:8080/api' };
  let forwarded;
  const route = load('src/app/api/backend/[...path]/route.ts', {
    require: () => api,
    fetch: async (url, options) => { forwarded = { url, ...options }; return Response.json({ message: 'fixture' }, { status: 401 }); },
  });
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const body = new FormData();
    body.append('file', new Blob(['fixture']), 'test.png');
    const request = new Request('http://localhost:3000/api/backend/uploadimagesPost?q=a%2Fb&x=1', {
      method, headers: { Authorization: 'Bearer fixture' }, ...(method === 'GET' ? {} : { body }),
    });
    const bytes = await request.clone().arrayBuffer();
    const contentType = request.headers.get('Content-Type');
    const response = await route[method](request, { params: { path: ['uploadimagesPost'] } });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).message, 'fixture');
    assert.equal(forwarded.url, 'http://localhost:8080/api/uploadimagesPost?q=a%2Fb&x=1');
    assert.equal(forwarded.method, method);
    assert.equal(forwarded.headers.get('Authorization'), 'Bearer fixture');
    assert.equal(forwarded.headers.get('Content-Type'), contentType);
    if (method !== 'GET') assert.deepEqual(Buffer.from(forwarded.body), Buffer.from(bytes));
  }
});

function authHarness() {
  let cursor = 0;
  const state = [];
  const calls = [];
  let response;
  const jsx = (type, props) => ({ type, props });
  const component = load('src/components/AuthForms.tsx', {
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return { useState: (initial) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (value) => { state[index] = value; }];
      } };
      if (name === '@/lib/api') return { apiRequest: async (path, options) => {
        calls.push({ path, body: JSON.parse(options.body) });
        return response;
      } };
      if (name === '@/lib/use-session') return { useSession: () => ({ state: 'absent', message: '', check() {} }) };
      if (name === '@/lib/use-session') return { useSession: () => ({ state: 'absent', message: '', check() {} }) };
      throw new Error('Unexpected dependency');
    },
    FormData: class { constructor(form) { this.form = form; } entries() { return Object.entries(this.form); } },
  }).default;
  function render(mode) { cursor = 0; return component({ mode }); }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const found = find(child, predicate);
      if (found) return found;
    }
  }
  return {
    calls,
    async submit(mode, fields, reply) {
      response = reply;
      const form = find(render(mode), (n) => n.type === 'form');
      await form.props.onSubmit({ preventDefault() {}, currentTarget: fields });
    },
    hasOtp(mode) { return !!find(render(mode), (n) => n.props?.name === 'otp'); },
    back(mode) { find(render(mode), (n) => n.type === 'button' && n.props.type === 'button').props.onClick(); },
  };
}

for (const [mode, start, verify] of [['register', '/register', '/postregister'], ['forgot', '/forgotpass', '/forgotpassword']]) {
  test(`${mode}: failure/missing challenge stay on info; back/new challenge; failed OTP retries; success consumes challenge`, async () => {
    const h = authHarness();
    await h.submit(mode, { email: 'fixture@example.test' }, { ok: false, data: { challengeId: 'ignored' } });
    assert.equal(h.hasOtp(mode), false);
    await h.submit(mode, {}, { ok: true, data: {} });
    assert.equal(h.hasOtp(mode), false);
    await h.submit(mode, {}, { ok: true, data: { challengeId: 'old' } });
    assert.equal(h.calls.at(-1).path, start);
    assert.equal(h.hasOtp(mode), true);
    h.back(mode);
    assert.equal(h.hasOtp(mode), false);
    await h.submit(mode, {}, { ok: true, data: { challengeId: 'new' } });
    await h.submit(mode, { otp: '000001' }, { ok: false, data: null });
    assert.deepEqual(h.calls.at(-1), { path: verify, body: { otp: '000001', challengeId: 'new' } });
    assert.equal(h.hasOtp(mode), true);
    await h.submit(mode, { otp: '000002' }, { ok: true, data: {} });
    assert.equal(h.hasOtp(mode), false);
  });
}

test('registration and password reset keep separate challenges', async () => {
  const h = authHarness();
  await h.submit('register', {}, { ok: true, data: { challengeId: 'registration' } });
  assert.equal(h.hasOtp('forgot'), false);
  await h.submit('forgot', {}, { ok: true, data: { challengeId: 'reset' } });
  await h.submit('register', { otp: '000001' }, { ok: false });
  assert.equal(h.calls.at(-1).body.challengeId, 'registration');
  await h.submit('forgot', { otp: '000002' }, { ok: false });
  assert.equal(h.calls.at(-1).body.challengeId, 'reset');
});

test('installed TinyMCE Resource loader uses bundled Help keynav without requesting a script', async () => {
  const source = fs.readFileSync('node_modules/tinymce/tinymce.js', 'utf8');
  const start = source.indexOf('const create$1 = () => {', source.indexOf('const runErrMsg') - 600);
  const end = source.indexOf('const Resource = create$1();', start);
  assert.ok(start > 0 && end > start);
  let loads = 0;
  const context = { exports: {}, ScriptLoader: { ScriptLoader: { loadScript: () => { loads++; return Promise.resolve(); } } }, awaiter: () => ({ resolve() {}, reject() {}, start() {} }) };
  vm.runInNewContext(`${source.slice(start, end)} exports.resource = create$1();`, context);
  const resource = context.exports.resource;
  const editor = fs.readFileSync('src/components/admin/posts/TinyMceEditor.tsx', 'utf8');
  assert.ok(editor.includes("import 'tinymce/plugins/help/js/i18n/keynav/en';"));
  vm.runInNewContext(fs.readFileSync('node_modules/tinymce/plugins/help/js/i18n/keynav/en.js', 'utf8'), { tinymce: { Resource: resource } });
  const html = await resource.load('tinymce.html-i18n.help-keynav.en', '/would-otherwise-load.js');
  assert.ok(html.includes('Begin keyboard navigation'));
  assert.equal(loads, 0);
});
