const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, extra = {}) {
  const context = { exports: {}, FormData, Blob, AbortController, URL, TextEncoder, ...extra };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, context);
  return context.exports;
}
const ok = (data) => ({ ok: true, status: 200, data, message: data.message || '' });
function library(apiRequest = async () => { throw Error('Unexpected request'); }) { return load('src/lib/articles.ts', { require: () => ({ apiRequest }) }); }
function fields(kind, file = true) {
  const form = new FormData();
  for (const [k, v] of Object.entries({ title: 'Draft', description: 'Description', slug: 'changed-slug', [kind === 'posts' ? 'category' : 'types']: 'Category name' })) form.set(k, v);
  if (file) form.set('file', new Blob(['image'], { type: 'image/png' }), 'fixture.png');
  return form;
}

test('payloads: names instead of relation IDs, no client slug on create, repeated tag fields, optional image on update', () => {
  const lib = library();
  for (const kind of ['posts', 'news']) {
    const form = fields(kind); form.append('tag', 'one'); form.append('tag', 'two');
    const body = lib.buildArticleBody(kind, form, '<p>Full HTML</p>');
    assert.ok(body instanceof FormData);
    assert.equal(body.get(kind === 'posts' ? 'category' : 'types'), 'Category name');
    assert.equal(body.has('categoryId'), false); assert.equal(body.has('typesid'), false);
    assert.equal(body.has('slug'), false); assert.equal(body.get('file').name, 'fixture.png');
    assert.equal(body.get('content'), '<p>Full HTML</p>');
    if (kind === 'news') assert.deepEqual(body.getAll('tag'), ['one', 'two']);
    const updated = JSON.parse(lib.buildArticleBody(kind, fields(kind, false), '<p>Changed HTML</p>', { id: 'immutable-id', tag: ['old'] }));
    assert.equal(updated.slug, 'changed-slug'); assert.equal(updated.content, '<p>Changed HTML</p>');
    assert.equal('file' in updated, false);
    if (kind === 'news') assert.deepEqual(updated.tag, []);
  }
  assert.throws(() => lib.buildArticleBody('posts', fields('posts', false), 'HTML'), /ảnh/);
  assert.throws(() => lib.buildArticleBody('news', fields('news'), 'HTML', { id: 'id', tag: ['old'] }), /tag/);
});

test('payload respects actual UTF-8 multipart boundaries and JSON body limits without splitting writes', () => {
  const lib = library();
  assert.ok(lib.buildArticleBody('posts', fields('posts'), 'a'.repeat(102399)) instanceof FormData);
  assert.throws(() => lib.buildArticleBody('posts', fields('posts'), 'a'.repeat(102400)), /100 KiB/);
  assert.throws(() => lib.buildArticleBody('posts', fields('posts'), '\u1ea1'.repeat(34134)), /100 KiB/);
  const form = fields('news');
  for (let i = 0; i < 15; i++) form.append('tag', 'tag-' + i);
  assert.ok(lib.buildArticleBody('news', form, 'content') instanceof FormData);
  form.append('tag', 'sixteenth');
  assert.throws(() => lib.buildArticleBody('news', form, 'content'), /19/);
  assert.throws(() => lib.buildArticleBody('news', fields('news', false), '\u1ea1'.repeat(400000), { id: 'id' }), /1 MiB/);
  assert.equal(JSON.parse(lib.buildArticleBody('news', fields('news', false), 'a'.repeat(110000), { id: 'id' })).content.length, 110000);
});

test('success requires exact acknowledgement and ID, not HTTP 200; conflict and unknown block retries', () => {
  const { classifyArticleWrite: classify } = library();
  const messages = { posts: 'Đã thêm bài viết', news: 'Thêm thành công' };
  for (const kind of ['posts', 'news']) {
    assert.equal(classify(kind, 'create', ok({ message: messages[kind], id: 'created' })).state, 'success');
    assert.equal(classify(kind, 'create', ok({ message: 'Không tìm thấy Danh mục' })).state, 'error');
    assert.equal(classify(kind, 'update', ok({ message: 'Cập nhật thành công', id: 'wrong' }), 'id').state, 'unknown');
    assert.equal(classify(kind, 'update', { ok: false, status: 409, data: {} }, 'id').state, 'conflict');
    assert.equal(classify(kind, 'create', ok({ message: messages[kind] })).state, 'unknown');
    for (const [action, key] of [['create', 'creationStatus'], ['update', 'updateStatus'], ['delete', 'deleteStatus']]) {
      assert.equal(classify(kind, action, { ok: false, status: 503, data: { [key]: 'unknown', id: 'id' } }, 'id').state, 'unknown');
    }
    assert.equal(classify(kind, 'delete', { ok: false, status: 0, data: null }, 'id').state, 'unknown');
    assert.equal(classify(kind, 'delete', ok({ message: 'Đã xóa bài viết', id: 'id' }), 'id').state, 'success');
  }
});

test('detail uses ID endpoints, encodes ID, requires full record and never substitutes list data', async () => {
  const calls = [];
  const lib = library(async (path) => { calls.push(path); return ok({ id: 'id/1', content: '<p>Detail only</p>', categoryId: 'c' }); });
  for (const kind of ['posts', 'news']) assert.equal((await lib.fetchArticleDetail(kind, 'id/1')).content, '<p>Detail only</p>');
  assert.deepEqual(calls, ['/post/id%2F1', '/Newsid/id%2F1']);
  await assert.rejects(() => library(async () => ok({ id: 'id', title: 'List only' })).fetchArticleDetail('posts', 'id'));
  await assert.rejects(() => library(async () => ({ ok: false, status: 505, data: {} })).fetchArticleDetail('news', 'missing'));
});

test('pagination preserves requested page and refetches last valid page after deletion for both backend behaviours', async () => {
  for (const kind of ['posts', 'news']) {
    const calls = [];
    const lib = library(async (path) => {
      calls.push(path); const page = Number(path.split('=')[1]);
      return ok({ data: page === 3 ? [] : [{ id: 'remaining' }], total: 16, pages: 2, currentPage: kind === 'news' ? Math.min(page, 2) : page, limit: 8 });
    });
    assert.equal((await lib.fetchArticlePage(kind, 2)).page, 2);
    calls.length = 0;
    const result = await lib.fetchArticlePage(kind, 3);
    assert.equal(result.page, 2); assert.equal(result.data[0].id, 'remaining');
    assert.deepEqual(calls, [lib.articleConfig[kind].list + '?page=3', lib.articleConfig[kind].list + '?page=2']);
  }
  const empty = library(async () => ok({ data: [], total: 0, pages: 0, currentPage: 0, limit: 8 }));
  assert.equal((await empty.fetchArticlePage('news', 1)).page, 1);
  assert.throws(() => empty.parseArticlePage([], 1));
});

function editorHarness(kind, record, reply) {
  let cursor = 0, effects = [], response = reply, resets = 0, saved = 0;
  const state = [], deps = [], calls = [];
  const jsx = (type, props) => ({ type, props });
  const api = async (path, options) => {
    if (options?.method === 'POST') { calls.push({ path, options }); return response; }
    return ok(path === '/alltag' ? [{ name: 'one' }] : [{ id: 'c', name: 'Category name' }]);
  };
  const lib = library(api);
  const component = load('src/components/admin/articles/ArticleEditor.tsx', {
    FormData: class extends FormData { constructor(form) { super(); for (const [k, value] of form.fields) this.append(k, value); } },
    require: (name) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react') return {
        useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
        useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
        useEffect(fn, next) { const index = cursor++; if (!deps[index] || next.some((v, i) => v !== deps[index][i])) { deps[index] = next; effects.push(fn); } },
      };
      if (name === 'next/dynamic') return () => 'TinyEditor';
      if (name === '@/lib/api') return { apiRequest: api, normalizeList: (data) => data || [] };
      if (name === '@/lib/articles') return lib;
      if (name === './WriteReview') return { default: 'WriteReview', __esModule: true };
      throw Error('Unexpected dependency');
    },
  }).default;
  function render() { cursor = 0; return component({ kind, record, onSaved: () => { saved++; } }); }
  function find(node, predicate) { if (!node || typeof node !== 'object') return; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; } }
  const form = { fields: fields(kind, !record), reset() { resets++; } };
  return {
    calls, get resets() { return resets; }, get saved() { return saved; },
    async ready() { for (let i = 0; i < 4; i++) { render(); const work = effects; effects = []; work.forEach((fn) => fn()); await new Promise(setImmediate); } },
    content() { return find(render(), (n) => n.type === 'TinyEditor').props.value; },
    changeContent(value) { find(render(), (n) => n.type === 'TinyEditor').props.onChange(value); },
    async submit(next = response) { response = next; await render().props.onSubmit({ preventDefault() {}, currentTarget: form }); },
    blocked() { return !!find(render(), (n) => n.type === 'WriteReview'); },
  };
}

for (const kind of ['posts', 'news']) test(`${kind} form retains TinyMCE and fields on business error/409/unknown; never auto-retries; only resets acknowledged create`, async () => {
  const oversized = editorHarness(kind, undefined, ok({}));
  await oversized.ready(); oversized.changeContent('x'.repeat(102400)); await oversized.submit();
  assert.equal(oversized.calls.length, 0); assert.equal(oversized.resets, 0); assert.equal(oversized.content().length, 102400);
  const h = editorHarness(kind, undefined, ok({ message: 'Không tìm thấy Danh mục' }));
  await h.ready(); h.changeContent('<p>Unsaved draft</p>'); await h.submit();
  assert.equal(h.content(), '<p>Unsaved draft</p>'); assert.equal(h.resets, 0); assert.equal(h.saved, 0);
  assert.equal(h.calls[0].options.body.get('title'), 'Draft');
  await h.submit({ ok: false, status: 503, data: { creationStatus: 'unknown', id: 'candidate' } });
  assert.equal(h.blocked(), true); const count = h.calls.length;
  await h.submit(); assert.equal(h.calls.length, count); assert.equal(h.resets, 0); assert.equal(h.content(), '<p>Unsaved draft</p>');
  const update = editorHarness(kind, { id: 'id', content: 'Original', categoryId: 'c', typesid: 'c' }, { ok: false, status: 409, data: {} });
  await update.ready(); update.changeContent('Changed'); await update.submit(); assert.equal(update.blocked(), true); assert.equal(update.content(), 'Changed'); assert.equal(update.saved, 0);
  assert.equal(update.calls[0].path, kind === 'posts' ? '/updatePost/id' : '/updateNews/id');
  const success = editorHarness(kind, undefined, ok({ message: kind === 'posts' ? 'Đã thêm bài viết' : 'Thêm thành công', id: 'id' }));
  await success.ready(); success.changeContent('Final'); await success.submit(); assert.equal(success.saved, 1); assert.equal(success.resets, 1); assert.equal(success.content(), '');
});
