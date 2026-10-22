// Offline verification using installed backend middleware and Mongoose casting.
// Does NOT import server/controllers/config, connect to DB, execute queries,
// contact Cloudinary, or send any HTTP request.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { Readable } = require('node:stream');
const backend = process.env.CMS_BACKEND_DIR || 'D:/CMSfix_codex/Backend_Tinhocnhuy';
process.env.TS_NODE_PROJECT = path.join(backend, 'tsconfig.json');
require(path.join(backend, 'node_modules/ts-node/register'));
const { midlleware_file } = require(path.join(backend, 'src/middleware/file.ts'));
const { NewsModel } = require(path.join(backend, 'src/Model/News_Models.ts'));
const mongoose = require(path.join(backend, 'node_modules/mongoose'));

async function parse(fields) {
  const form = new FormData();
  for (const [name, value] of fields) form.append(name, value);
  form.append('file', new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]), 'fixture.png');
  // Construct a Request solely to serialize FormData. This URL is never fetched.
  const serialized = new Request('http://localhost.invalid', { method: 'POST', body: form });
  const bytes = Buffer.from(await serialized.arrayBuffer());
  const req = Readable.from([bytes]);
  req.headers = { 'content-type': serialized.headers.get('content-type'), 'content-length': String(bytes.length) };
  req.method = 'POST';
  return new Promise((resolve) => midlleware_file(req, {
    status(code) { this.code = code; return this; },
    json() { resolve({ status: this.code }); },
  }, () => resolve({ status: 200, tag: req.body.tag, file: req.file })));
}

test('real Multer + Mongoose: omitted/empty/bracket/JSON-text tag cannot clear an array in multipart', async () => {
  const cases = [
    [[], undefined, undefined],
    [[['tag', '']], '', ['']],
    [[['tag[]', '']], [''], ['']],
    [[['tag[0]', '']], [''], ['']],
    [[['tag', '[]']], '[]', ['[]']],
    [[['tag', 'one'], ['tag', 'two']], ['one', 'two'], ['one', 'two']],
  ];
  for (const [fields, expected, cast] of cases) {
    const parsed = await parse(fields);
    assert.equal(parsed.status, 200); assert.deepEqual(parsed.tag, expected);
    assert.equal(parsed.file.fieldname, 'file');
    const query = NewsModel.findOneAndUpdate({ id: 'fixture-query-never-executed' }, { tag: parsed.tag });
    // Cast only; never call exec/then/save.
    const update = query._castUpdate(query.getUpdate());
    assert.deepEqual(update.$set?.tag, cast);
  }
  const query = NewsModel.findOneAndUpdate({ id: 'fixture-query-never-executed' }, { tag: [] });
  assert.deepEqual(query._castUpdate(query.getUpdate()), { $set: { tag: [] } });
  assert.equal(mongoose.connection.readyState, 0);
});

test('real Multer limits: UTF-8 field <100 KiB and at most 19 fields with a file', async () => {
  assert.equal((await parse([['content', 'a'.repeat(102399)]])).status, 200);
  assert.equal((await parse([['content', 'a'.repeat(102400)]])).status, 400);
  assert.equal((await parse([['content', '\u1ea1'.repeat(34134)]])).status, 400);
  assert.equal((await parse(Array.from({ length: 19 }, (_, i) => ['f' + i, 'x']))).status, 200);
  assert.equal((await parse(Array.from({ length: 20 }, (_, i) => ['f' + i, 'x']))).status, 400);
  assert.equal(mongoose.connection.readyState, 0);
});
