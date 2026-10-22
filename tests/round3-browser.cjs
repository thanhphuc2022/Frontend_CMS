// Local frontend + isolated Chrome on 9228. ALL browser API requests and ALL
// non-GET requests are mocked. No real credentials, writes, uploads or emails.
const assert = require('node:assert/strict');
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const pages = await (await fetch('http://localhost:9228/json/list')).json();
  const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const pending = new Map(), calls = [], held = [];
  let id = 0, holdScripts = false, nextWrite, accountStatus = 200;
  function send(method, params = {}) {
    const current = ++id;
    return new Promise((resolve, reject) => { pending.set(current, { resolve, reject }); ws.send(JSON.stringify({ id: current, method, params })); });
  }
  const fixtures = {
    '/AllPost': { data: [], total: 0, pages: 0, currentPage: 1, limit: 9 },
    '/loadAllCategories': [], '/alltype': [{ id: 'fixture-type', name: 'Fixture type' }], '/alltag': [],
    '/allcontentbanner': { content_banner: [{ id: 'fixture-banner', title: 'Original banner', content: '<p>Original content</p>', linkservices: '/services', images: '' }] },
    '/allabout': [{ id: 'fixture-about', title: 'Original about', content: '<p>About</p>', images: '' }],
    '/aboutcontent': [{ _id: 'fixture-intro', content: '<p>Existing intro</p>' }],
    '/allaboutimage': [{ public_id: 'Tinhocnhuy/fixture-image', link_images: '' }],
    '/allimagelogo': [{ public_id: 'Tinhocnhuy/fixture-logo', link_Images: '' }],
    '/getcontact': { contact: [{ _id: 'fixture-contact', contact: 'Fixture contact', map: 'Fixture map' }] },
    '/allaccount': [{ username: 'fixture-user', fullname: 'Fixture User', email: 'fixture@example.test', role: true }],
  };
  async function fulfill(requestId, status, data, html = false) {
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: html ? 'text/html' : 'application/json' }], body: Buffer.from(html ? data : JSON.stringify(data)).toString('base64') });
  }
  let interceptFailure;
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id) { const p = pending.get(msg.id); pending.delete(msg.id); return msg.error ? p?.reject(Error('CDP command failed')) : p?.resolve(msg.result); }
    if (msg.method !== 'Fetch.requestPaused') return;
    try {
      const { requestId, request } = msg.params;
      const url = new URL(request.url);
      if (holdScripts && url.pathname.endsWith('.js')) { held.push(requestId); return; }
      if (url.pathname.startsWith('/api/backend/') || request.method !== 'GET') {
        const path = url.pathname.replace('/api/backend', '');
        calls.push({ path, method: request.method, query: url.search, body: request.postData || '', authorization: Object.entries(request.headers).some(([k, v]) => k.toLowerCase() === 'authorization' && v === 'Bearer access-fixture') });
        if (!url.pathname.startsWith('/api/backend/')) return await fulfill(requestId, 200, '<html><body>Native POST fixture</body></html>', true);
        if (path === '/checktoken') return await fulfill(requestId, 200, true);
        if (path === '/allaccount' && accountStatus !== 200) return await fulfill(requestId, accountStatus, { message: 'Fixture permission failure' });
        if (request.method === 'GET') return await fulfill(requestId, 200, fixtures[path] || []);
        if (path === '/login') return await fulfill(requestId, 200, { message: 'Đăng nhập thành công', accesstoken: 'access-fixture', refreshtoken: 'refresh-fixture' });
        const reply = nextWrite || { status: 500, data: { message: 'Unexpected write mocked' } }; nextWrite = null;
        return await fulfill(requestId, reply.status, reply.data);
      }
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return await fulfill(requestId, 200, {});
      await send('Fetch.continueRequest', { requestId });
    } catch { interceptFailure = true; }
  };
  async function evaluate(expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw Error('Browser evaluation failed');
    return r.result.value;
  }
  async function until(expression) {
    for (let n = 0; n < 160; n++) { if (interceptFailure) throw Error('Interception failed'); if (await evaluate(expression)) return; await delay(200); }
    throw Error('Browser fixture condition timed out');
  }
  async function click(text) {
    assert.ok(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)});if(!b||b.disabled)return false;b.click();return true})()`));
  }
  async function set(name, value, tag = 'input') {
    await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(tag + '[name="' + name + '"]')});Object.getOwnPropertyDescriptor(${tag === 'textarea' ? 'HTMLTextAreaElement' : tag === 'select' ? 'HTMLSelectElement' : 'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  }
  const submit = () => evaluate("document.querySelector('form').requestSubmit()");
  async function editFirst(label) { await click(label); await until("!![...document.querySelectorAll('button')].find(x=>x.textContent==='Sửa')"); await click('Sửa'); await click('Mở form sửa'); await until("!!document.querySelector('form')"); }
  try {
    await send('Page.enable'); await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    // This asserts the native HTML behaviour. There is no GET/query blocking
    // rule in the interceptor: a regression actually sends GET and fails here.
    for (const mode of ['no-javascript', 'before-hydration']) {
      await send('Emulation.setScriptExecutionDisabled', { value: mode === 'no-javascript' });
      holdScripts = mode === 'before-hydration';
      await send('Page.navigate', { url: 'http://localhost:3000/login' });
      await until("!!document.querySelector('form')");
      assert.equal(await evaluate("document.querySelector('form').method"), 'post');
      assert.equal(await evaluate("document.querySelector('input[name=password]').matches(':disabled')"), true);
      // Even forced native submit with JS handlers bypassed stays POST. Only
      // fixture values are used, and the request is fulfilled locally.
      await set('username', 'fixture-native'); await set('password', 'fixture-native-password');
      const count = calls.length;
      await evaluate("document.querySelector('form').submit()");
      await until("document.body?.textContent.includes('Native POST fixture')");
      const native = calls.slice(count).find((c) => c.path === '/login');
      assert.equal(native?.method, 'POST'); assert.equal(native.query, '');
      assert.equal(native.body, ''); // Disabled fieldset omits credential fields.
      holdScripts = false;
      for (const requestId of held.splice(0)) await send('Fetch.failRequest', { requestId, errorReason: 'Aborted' }).catch(() => {});
      console.log(mode + ': native POST, empty query, disabled credentials PASS');
    }
    await send('Emulation.setScriptExecutionDisabled', { value: false });
    await send('Page.navigate', { url: 'http://localhost:3000/login' });
    await until("document.querySelector('input[name=password]') && !document.querySelector('input[name=password]').matches(':disabled')");
    await set('username', 'fixture-user'); await set('password', 'fixture-password');
    await submit();
    await until("location.pathname==='/admin' && document.body.textContent.includes('Phiên đã được backend xác minh')");
    assert.equal(calls.findLast((c) => c.path === '/login').method, 'POST');
    assert.equal(calls.findLast((c) => c.path === '/login').query, '');
    console.log('hydrated login and server-verified session: mocked PASS');

    await click('Liên hệ'); await until("document.body.textContent.includes('Fixture contact')");
    assert.equal(await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent==='Thêm mới').disabled"), true);
    await click('Sửa'); await click('Mở form sửa'); await until("!!document.querySelector('textarea[name=contact]')");
    assert.equal(await evaluate("document.querySelector('textarea[name=contact]').value"), 'Fixture contact');
    await click('Đóng');
    await editFirst('Nội dung giới thiệu');
    assert.equal(await evaluate("document.querySelector('textarea[name=content_about_index]').value"), '<p>Existing intro</p>');
    await click('Đóng');

    await editFirst('Tài khoản');
    for (const role of ['false', 'true']) {
      await set('role', role, 'select'); nextWrite = { status: 403, data: { message: 'Fixture forbidden' } }; await submit();
      await until("document.querySelector('form [role=status]')?.textContent.includes('403')");
      const c = calls.findLast((c) => c.path === '/updateauth/fixture-user');
      assert.equal(JSON.parse(c.body).role, role === 'true'); assert.equal(c.authorization, true);
      assert.equal(await evaluate("document.querySelector('select[name=role]').value"), role);
    }
    await click('Đóng');
    accountStatus = 403; await click('Tải lại'); await until("document.body.textContent.includes('403')");
    assert.equal(await evaluate("!![...document.querySelectorAll('article')].find(x=>x.textContent.includes('fixture-user'))"), false);
    assert.equal(await evaluate("localStorage.getItem('thny_access_token')==='access-fixture'"), true);
    console.log('contact/about mapping, boolean roles, 403 and retained session/form: mocked PASS');

    await click('Loại tin'); await until("document.body.textContent.includes('Fixture type')"); await click('Thêm mới');
    await set('name', 'Fixture duplicate'); nextWrite = { status: 200, data: { message: 'Danh mục đã tồn tại' } }; await submit();
    await until("document.querySelector('form [role=status]')?.textContent.includes('Danh mục đã tồn tại')");
    assert.equal(await evaluate("document.querySelector('input[name=name]').value"), 'Fixture duplicate');

    await editFirst('Banner'); await set('title', 'Unsaved banner fixture');
    await set('content', '<p>Unsaved HTML fixture</p>', 'textarea');
    nextWrite = { status: 503, data: { updateStatus: 'unknown', message: 'Fixture unknown' } }; await submit();
    await until("document.querySelector('form [role=status]')?.textContent.includes('chưa xác định')");
    const before = calls.filter((c) => c.path === '/updatecontentbanner/fixture-banner').length;
    await delay(600);
    assert.equal(calls.filter((c) => c.path === '/updatecontentbanner/fixture-banner').length, before);
    assert.equal(await evaluate("document.querySelector('input[name=title]').value"), 'Unsaved banner fixture');
    assert.equal(await evaluate("document.querySelector('textarea[name=content]').value"), '<p>Unsaved HTML fixture</p>');
    assert.equal(await evaluate("document.querySelector('form button').disabled"), true);
    await click('Tải lại danh sách để đối chiếu'); await until("![...document.querySelectorAll('button')].find(x=>x.textContent==='Tôi đã đối chiếu và xác nhận thử lại thủ công').disabled");
    assert.equal(await evaluate("document.querySelector('input[name=title]').value"), 'Unsaved banner fixture');
    await click('Tôi đã đối chiếu và xác nhận thử lại thủ công');
    assert.equal(await evaluate("document.querySelector('form button').disabled"), false);
    console.log('business HTTP 200 and unknown 503 retain drafts; manual review, no write replay: mocked PASS');
    await evaluate(`(()=>{const input=document.querySelector('input[name=file]');const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([137,80,78,71,13,10,26,10])],'round3-fixture.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
    nextWrite = { status: 409, data: { message: 'Resource changed; reload before updating' } }; await submit();
    await until("document.querySelector('form [role=status]')?.textContent.includes('409')");
    assert.equal(await evaluate("document.querySelector('input[name=file]').files[0]?.name"), 'round3-fixture.png');
    const withImage = calls.findLast((c) => c.path === '/updatecontentbanner/fixture-banner');
    assert.ok(withImage.body.includes('name="title"')); assert.equal(withImage.authorization, true);
    assert.equal(await evaluate("document.querySelector('textarea[name=content]').value"), '<p>Unsaved HTML fixture</p>');
    console.log('banner multipart image + HTML retained on 409: mocked PASS');
    await click('Đóng'); await click('Logo'); await until("document.body.textContent.includes('Tinhocnhuy/fixture-logo')");
    await click('Xóa'); nextWrite = { status: 200, data: 'Đã xoá' }; await click('Xóa mục này'); await delay(400);
    const deletion = calls.findLast((c) => c.path.startsWith('/deleteimagelogo/'));
    assert.equal(deletion.path, '/deleteimagelogo/Tinhocnhuy%2Ffixture-logo'); assert.equal(deletion.authorization, true);
    console.log('slash public_id delete request and Authorization: mocked PASS');
    assert.equal(interceptFailure, undefined);
    console.log('ALL browser writes/API responses were mocked; no live mutation or email.');
  } finally { ws.close(); }
})().catch(() => { console.error('Round 3 browser fixture failed (sensitive details omitted).'); process.exitCode = 1; });
