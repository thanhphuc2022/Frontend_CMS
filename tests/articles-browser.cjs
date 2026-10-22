// Run with local servers and an isolated Chrome --remote-debugging-port=9225.
// GETs reach the real local backend. EVERY non-GET request is intercepted.
const assert = require('node:assert/strict');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  const pages = await (await fetch('http://localhost:9225/json/list')).json();
  const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0, simulateDeletedLastPage = false, deletionApplied = false;
  const pending = new Map(), writes = [], reads = [], replies = [];
  function send(method, params = {}) {
    const id = ++nextId;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  }
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const promise = pending.get(message.id); pending.delete(message.id);
      return message.error ? promise?.reject(Error('CDP command failed')) : promise?.resolve(message.result);
    }
    if (message.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = message.params;
    if (request.method === 'GET') {
      if (request.url.includes('/api/backend/')) reads.push(new URL(request.url).pathname + new URL(request.url).search);
      if (deletionApplied && request.url.includes('/api/backend/AllNews')) {
        const page = Number(new URL(request.url).searchParams.get('page'));
        const data = page === 4 ? { data: [], currentPage: 3, limit: 8 } : await (await fetch('http://localhost:8080/api/AllNews?page=' + page)).json();
        data.total = 24; data.pages = 3;
        await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(data)).toString('base64') });
        return;
      }
      await send('Fetch.continueRequest', { requestId });
    } else {
      writes.push({ path: new URL(request.url).pathname, method: request.method, body: request.postData || '', headers: request.headers });
      const reply = replies.shift() || { status: 500, data: { message: 'Unexpected write blocked by browser verification' } };
      if (simulateDeletedLastPage && request.url.includes('/deleteNews/')) deletionApplied = true;
      await send('Fetch.fulfillRequest', { requestId, responseCode: reply.status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(reply.data)).toString('base64') });
    }
  };
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error('Browser evaluation failed');
    return result.result.value;
  }
  async function until(expression) {
    for (let n = 0; n < 160; n++) { if (await evaluate(expression)) return; await delay(250); }
    throw Error('Timed out waiting for ' + expression);
  }
  async function click(text) {
    assert.ok(await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent===${JSON.stringify(text)});if(!b||b.disabled)return false;b.click();return true})()`));
  }
  const form = "document.querySelector('section[aria-label=\"Soạn nội dung\"] form')";
  await send('Page.enable');
  await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
  try {
    await send('Page.navigate', { url: 'http://localhost:3000/admin?contentModule=news&newsPage=2' });
    await until("document.querySelector('nav[aria-label=\"Phân trang\"]')?.textContent.includes('2/4')");
    await click('Tải lại danh sách'); await delay(400);
    assert.ok(reads.filter((p) => p === '/api/backend/AllNews?page=2').length >= 2);
    await click('Trang sau'); await until("location.search.includes('newsPage=3')");
    await send('Page.reload');
    await until("document.querySelector('nav[aria-label=\"Phân trang\"]')?.textContent.includes('3/4')");
    await click('Sửa');
    await until("!!window.tinymce?.activeEditor?.initialized");
    await until(form + "?.querySelector('input[name=title]')?.value.length>0");
    assert.ok(reads.some((p) => p.startsWith('/api/backend/Newsid/')));
    assert.ok(await evaluate(form + ".querySelector('select[name=types]').value.length>0"));
    const before = await evaluate("tinymce.activeEditor.getContent()");
    assert.ok(before.length > 0);
    const editPath = reads.findLast((p) => p.startsWith('/api/backend/Newsid/'));
    const id = decodeURIComponent(editPath.split('/').at(-1));
    await evaluate(`(()=>{const f=${form};const i=f.querySelector('input[name=title]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Round 2 draft fixture');i.dispatchEvent(new Event('input',{bubbles:true}));tinymce.activeEditor.setContent('<p>Round 2 unsaved draft</p>');tinymce.activeEditor.fire('change')})()`);
    await delay(200);
    async function submit(reply) {
      const count = writes.length; replies.push(reply);
      await evaluate(form + '.requestSubmit()');
      for (let n = 0; n < 80 && writes.length === count; n++) await delay(100);
      assert.equal(writes.length, count + 1); await delay(250);
      assert.equal(await evaluate(form + ".querySelector('input[name=title]').value"), 'Round 2 draft fixture');
      assert.ok((await evaluate('tinymce.activeEditor.getContent()')).includes('Round 2 unsaved draft'));
    }
    await submit({ status: 200, data: { message: 'Không tìm thấy Loại tin tức' } });
    assert.equal(JSON.parse(writes.at(-1).body).title, 'Round 2 draft fixture');
    assert.equal(writes.at(-1).path, '/api/backend/updateNews/' + encodeURIComponent(id));
    await submit({ status: 409, data: { message: 'Resource changed; reload before updating' } });
    assert.ok(await evaluate(form + ".querySelector('button[type=submit],button:not([type])').disabled"));
    const count = writes.length; await evaluate(form + '.requestSubmit()'); await delay(300); assert.equal(writes.length, count);
    await click('Đọc lại để đối chiếu');
    await until("[...document.querySelectorAll('button')].some(b=>b.textContent==='Tôi đã đối chiếu, cho phép thao tác thủ công tiếp')");
    await click('Tôi đã đối chiếu, cho phép thao tác thủ công tiếp');
    await submit({ status: 503, data: { message: 'Update outcome unknown', id, updateStatus: 'unknown' } });
    assert.equal(writes.length, count + 1);
    assert.ok(await evaluate("!!document.querySelector('[role=alert]')"));
    await send('Page.navigate', { url: 'http://localhost:3000/admin?contentModule=news&newsPage=4' });
    await until("document.querySelector('nav[aria-label=\"Phân trang\"]')?.textContent.includes('4/4')");
    const last = await (await fetch('http://localhost:8080/api/AllNews?page=4')).json();
    simulateDeletedLastPage = true;
    replies.push({ status: 200, data: { message: 'Đã xóa bài viết', id: last.data[0].id } });
    const readCount = reads.length;
    await click('Xóa'); await click('Xác nhận xóa');
    await until("document.querySelector('nav[aria-label=\"Phân trang\"]')?.textContent.includes('3/3')");
    assert.ok(reads.slice(readCount).includes('/api/backend/AllNews?page=4'));
    assert.ok(reads.slice(readCount).includes('/api/backend/AllNews?page=3'));
    assert.equal(reads.slice(readCount).includes('/api/backend/AllNews?page=1'), false);
    const unchanged = await (await fetch('http://localhost:8080/api/AllNews?page=4')).json();
    assert.equal(unchanged.total, 25); assert.equal(unchanged.data[0].id, last.data[0].id);
    console.log('PASS browser: real GET pagination/reload/detail/lookup; mocked 200 business error, 409 and 503 preserve draft and prevent automatic writes.');
    console.log('PASS browser: mocked deletion of last item reloads page 4 then page 3; real backend remains unchanged.');
    console.log('Intercepted writes:', writes.length, '(none forwarded to backend)');
  } finally { ws.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
