import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { createPreviewServer } from './serve-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const server = createPreviewServer(root);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
function get(path, headers = {}, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, headers, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.end();
  });
}
try {
  const original = await readFile(resolve(root, 'index.html'));
  const plain = await get('/');
  assert.equal(plain.status, 200); assert.deepEqual(plain.body, original);
  assert.equal(plain.headers['cache-control'], 'no-cache');
  const gzip = await get('/', { 'accept-encoding': 'gzip' });
  assert.equal(gzip.headers['content-encoding'], 'gzip'); assert.deepEqual(gunzipSync(gzip.body), original);
  const br = await get('/', { 'accept-encoding': 'gzip, br' });
  assert.equal(br.headers['content-encoding'], 'br'); assert.deepEqual(brotliDecompressSync(br.body), original);
  const refused = await get('/', { 'accept-encoding': 'br;q=0, gzip;q=0' });
  assert.equal(refused.headers['content-encoding'], undefined); assert.deepEqual(refused.body, original);
  const cached = await get('/', { 'if-none-match': plain.headers.etag });
  assert.equal(cached.status, 304); assert.equal(cached.body.length, 0);
  const head = await get('/', { 'accept-encoding': 'gzip' }, 'HEAD');
  assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), gzip.body.length);
  const range = await get('/index.html', { range: 'bytes=10-29', 'accept-encoding': 'gzip' });
  assert.equal(range.status, 206); assert.deepEqual(range.body, original.subarray(10, 30));
  assert.equal(range.headers['content-encoding'], undefined);
  const invalidRange = await get('/index.html', { range: 'bytes=99999999-' });
  assert.equal(invalidRange.status, 416);
  const asset = await get('/public/assets/shared/hidden-object/v002/animals-001.png');
  assert.equal(asset.status, 200); assert.match(asset.headers['cache-control'], /immutable/);
  assert.equal(asset.headers['content-type'], 'image/png');
  assert.equal((await get('/%2e%2e%2fpackage.json')).status, 403);
  assert.equal((await get('/', {}, 'POST')).status, 405);
  console.log('Preview server: raw/gzip/brotli, cache revalidation, HEAD, byte ranges, artwork cache and path isolation passed.');
} finally { await new Promise(resolve => server.close(resolve)); }
