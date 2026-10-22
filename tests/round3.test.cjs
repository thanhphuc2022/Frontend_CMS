const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = { exports: {}, Headers, FormData, File, Blob, Response, Event, TextEncoder, atob, ...globals };
  vm.runInNewContext(code, context, { filename: file });
  return context.exports;
}
function fixture(fetch) {
  const storage = new Map();
  const api = load('src/lib/api.ts', {
    window: { dispatchEvent() {} },
    localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) }, fetch,
  });
  return api;
}
const jwt = (exp) => `fixture.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.fixture`;

test('concurrent expired-token uploads share a refresh, read current token, preserve multipart and do not rotate refresh', async () => {
  const calls = [];
  const api = fixture(async (url, options) => {
    calls.push({ url, ...options });
    if (url.endsWith('/refreshtoken')) { await new Promise((r) => setTimeout(r, 20)); return Response.json({ accesstoken: 'fresh-fixture' }); }
    return Response.json({ location: '/fixture.png' });
  });
  api.saveTokens(jwt(1), 'refresh-fixture');
  const body = new FormData(); body.append('file', new Blob(['fixture']), 'fixture.png');
  const results = await Promise.all(Array.from({ length: 4 }, () => api.apiRequest('/uploadimagesPost', { method: 'POST', body })));
  assert.ok(results.every((r) => r.ok));
  assert.equal(calls.filter((c) => c.url.endsWith('/refreshtoken')).length, 1);
  for (const c of calls.filter((c) => c.url.endsWith('/uploadimagesPost'))) {
    assert.equal(c.headers.get('Authorization'), 'Bearer fresh-fixture');
    assert.equal(c.headers.has('Content-Type'), false);
    assert.equal(c.body, body);
  }
  assert.equal(api.getRefreshToken(), 'refresh-fixture');
});

test('401: refresh once, replay safe GET only; never replay POST or drop its draft', async () => {
  for (const method of ['GET', 'POST']) {
    const calls = [];
    let protectedCalls = 0;
    const api = fixture(async (url, options) => {
      calls.push({ url, ...options });
      if (url.endsWith('/refreshtoken')) return Response.json({ accesstoken: 'fresh-fixture' });
      return ++protectedCalls === 1 ? Response.json({ message: 'fixture unauthorized' }, { status: 401 }) : Response.json([]);
    });
    api.saveTokens('old-fixture', 'refresh-fixture');
    const result = await api.apiRequest('/protected', { method, ...(method === 'POST' ? { body: '{"title":"draft"}' } : {}) });
    assert.equal(protectedCalls, method === 'GET' ? 2 : 1);
    assert.equal(result.ok, method === 'GET');
    assert.equal(api.getAccessToken(), 'fresh-fixture');
  }
});

test('verification/network/500/503 and ambiguous checktoken=false/refresh401 never erase stored tokens', async () => {
  for (const failure of ['network', 500, 503, 'ambiguous']) {
    const calls = [];
    const api = fixture(async (url) => {
      calls.push(url);
      if (failure === 'network') throw Error('fixture offline');
      if (failure === 'ambiguous') return url.endsWith('/checktoken') ? Response.json(false) : Response.json({ message: 'fixture' }, { status: 401 });
      return Response.json({ message: 'fixture unavailable' }, { status: failure });
    });
    api.saveTokens('access-fixture', 'refresh-fixture');
    assert.equal(await api.verifySession(), failure === 'ambiguous' ? 'reauthenticate' : 'unavailable');
    assert.equal(api.getAccessToken(), 'access-fixture');
    assert.equal(api.getRefreshToken(), 'refresh-fixture');
    if (failure !== 'ambiguous') assert.equal(calls.length, 1);
  }
});

test('logout during refresh cannot resurrect credentials; refresh failure prevents sending an expired write', async () => {
  let finish;
  const api = fixture(() => new Promise((resolve) => { finish = resolve; }));
  api.saveTokens('access-fixture', 'refresh-fixture');
  const pending = api.refreshAccessToken();
  api.clearTokens();
  finish(Response.json({ accesstoken: 'must-not-be-saved' }));
  assert.equal((await pending).ok, false);
  assert.equal(api.getAccessToken(), '');
  assert.equal(api.getRefreshToken(), '');
  const calls = [];
  const offline = fixture(async (url) => { calls.push(url); return Response.json({}, { status: 503 }); });
  offline.saveTokens(jwt(1), 'refresh-fixture');
  assert.equal((await offline.apiRequest('/createcontact', { method: 'POST', body: '{}' })).ok, false);
  assert.deepEqual(calls, ['/api/backend/refreshtoken']);
});

test('403 distinguishes permission from authentication, without refresh or logout', async () => {
  const calls = [];
  const api = fixture(async (url) => { calls.push(url); return new Response('fixture forbidden', { status: 403 }); });
  api.saveTokens('access-fixture', 'refresh-fixture');
  const result = await api.apiRequest('/allaccount');
  assert.equal(result.status, 403);
  assert.ok(result.message.includes('403'));
  assert.equal(api.getAccessToken(), 'access-fixture');
  assert.deepEqual(calls, ['/api/backend/allaccount']);
});

test('wrong current password is a business 401: keep its message, tokens and do not refresh', async () => {
  const calls = [];
  const api = fixture(async (url) => { calls.push(url); return Response.json({ message: 'Mật khẩu không đúng' }, { status: 401 }); });
  api.saveTokens('access-fixture', 'refresh-fixture');
  const r = await api.apiRequest('/changePass', { method: 'POST', body: '{}' });
  assert.equal(r.message, 'Mật khẩu không đúng');
  assert.equal(api.getAccessToken(), 'access-fixture');
  assert.deepEqual(calls, ['/api/backend/changePass']);
});

test('accounts send boolean role; contact wrapper loads; business 200, unknown and conflict are not success', () => {
  const helpers = load('src/lib/cms-modules.ts', { require: () => ({}) });
  for (const role of ['false', 'true']) {
    const f = new FormData(); f.set('role', role);
    assert.equal(JSON.parse(helpers.cmsJsonBody('accounts', f)).role, role === 'true');
  }
  assert.equal(fixture(() => {}).normalizeList({ contact: [{ contact: 'fixture', map: 'fixture' }] }).length, 1);
  const classify = (status, data) => helpers.classifyCmsWrite('types', 'create', { ok: status === 200, status, data, message: data.message });
  assert.equal(classify(200, { message: 'Danh mục đã tồn tại' }).success, false);
  assert.equal(classify(200, { message: 'Tạo danh mục bài viết thành công', id: 'fixture' }).success, true);
  assert.equal(classify(503, { updateStatus: 'unknown' }).review, true);
  assert.equal(classify(409, {}).review, true);
  assert.equal(classify(200, { message: 'unexpected' }).review, true);
});

test('proxy preserves a slash-containing Cloudinary public_id as ONE encoded route parameter', async () => {
  let target;
  const route = load('src/app/api/backend/[...path]/route.ts', { require: () => ({ API_BASE: 'https://fixture.test/api' }), URL, fetch: async (url) => { target = url; return Response.json('Đã xoá'); } });
  await route.POST(new Request('http://localhost:3000/api/backend/deleteimagelogo/Tinhocnhuy%2Ffixture', { method: 'POST' }), { params: { path: ['deleteimagelogo', 'Tinhocnhuy/fixture'] } });
  assert.equal(target, 'https://fixture.test/api/deleteimagelogo/Tinhocnhuy%2Ffixture');
});

test('server-rendered login has POST action and disabled fields before hydration, without JavaScript', () => {
  const React = require('react');
  const ReactDOMServer = require('react-dom/server');
  const Auth = load('src/components/AuthForms.tsx', { require: (name) => name === '@/lib/api' ? {} : name === '@/lib/use-session' ? { useSession: () => ({ message: '' }) } : require(name) }).default;
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(Auth, { mode: 'login' }));
  assert.match(html, /<fieldset disabled=""/);
  assert.match(html, /<form method="post" action="\/login"/);
  assert.match(html, /<noscript>/);
  assert.doesNotMatch(html, /method="get"/);
});

test('public contact matches mailer payload; only exact mess acknowledgement resets; unknown preserves and blocks duplicate send', async () => {
  let state = [], cursor = 0, refs = [], refCursor = 0, response, resets = 0;
  const calls = [];
  const jsx = (type, props) => ({ type, props });
  const Component = load('src/components/PublicContactForm.tsx', {
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {
        useState: (initial) => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], (v) => { state[i] = v; }]; },
        useRef: (initial) => refs[refCursor++] ||= { current: initial },
      };
      if (name === '@/lib/api') return { apiRequest: async (path, options, auth) => { calls.push({ path, body: JSON.parse(options.body), auth }); return response; } };
      throw Error('Unexpected fixture dependency');
    },
    FormData: class { constructor(form) { this.form = form; } entries() { return Object.entries(this.form.fields); } },
  }).default;
  const render = () => { cursor = 0; refCursor = 0; return Component(); };
  const form = { fields: { name: 'Fixture User', email: 'fixture@example.test', phone: '000', services: 'CMS', content: 'Fixture text' }, reset() { resets++; } };
  async function submit(reply) { response = reply; await render().props.onSubmit({ preventDefault() {}, currentTarget: form }); }
  await submit({ ok: false, status: 400, message: 'Fixture invalid' });
  assert.deepEqual(calls[0], { path: '/contact', auth: false, body: { contact: 'Fixture User', subject: 'Liên hệ: CMS', info: 'Fixture User | Email: fixture@example.test | Điện thoại: 000', text: 'Fixture text' } });
  assert.equal(resets, 0);
  await submit({ ok: true, status: 200, data: { mess: 'da gui thanh cong' } });
  assert.equal(resets, 1);
  await submit({ ok: false, status: 502, message: 'Fixture unknown' });
  assert.equal(resets, 1);
  const count = calls.length;
  await submit({ ok: true, status: 200, data: { mess: 'da gui thanh cong' } });
  assert.equal(calls.length, count);
  assert.equal(resets, 1);
});
