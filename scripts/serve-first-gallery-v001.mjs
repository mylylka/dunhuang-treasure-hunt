import http from 'node:http';
import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createPreviewServer } from './serve-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = resolve(root, process.env.DUNHUANG_PLAYTEST_BUILD ?? 'work/world/first-gallery-v001/build');
const entry = '/first-gallery-v001.html', port = 4229;
await access(resolve(build, entry.slice(1)));
const bundles = createPreviewServer(build).listeners('request')[0];
const publicDir = resolve(root, 'public');
const assets = createPreviewServer(publicDir).listeners('request')[0];

async function serveCompressedModel(path, request, response) {
  if (!/^\/assets\/world\/[^/]+\/v\d{3}\/[^/]+\.glb$/.test(path) || request.headers.range
    || !['GET', 'HEAD'].includes(request.method ?? '')) return false;
  const file = resolve(publicDir, `.${path}`);
  if (!file.startsWith(publicDir + sep)) return false;
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return false;
  const acceptsGzip = (request.headers['accept-encoding'] ?? '').split(',').some(value => {
    const [encoding, quality] = value.trim().split(';');
    return encoding === 'gzip' && !/^\s*q=0(?:\.0*)?\s*$/.test(quality ?? '');
  });
  if (!acceptsGzip) { response.setHeader('Vary', 'Accept-Encoding'); return false; }
  const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-glb-gzip"`;
  const headers = { 'Content-Type': 'model/gltf-binary', 'Content-Encoding': 'gzip',
    'Cache-Control': 'public, max-age=31536000, immutable', Vary: 'Accept-Encoding', ETag: etag };
  if (request.headers['if-none-match'] === etag) { response.writeHead(304, headers); response.end(); return true; }
  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end();
  else await pipeline(createReadStream(file), createGzip({ level: 3 }), response).catch(() => response.destroy());
  return true;
}

http.createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url ?? '/', `http://localhost:${port}`).pathname);
    if (path === '/') { response.writeHead(302, { Location: entry }); response.end(); return; }
    const file = resolve(build, `.${path}`);
    if (!file.startsWith(build + sep)) { response.writeHead(403); response.end(); return; }
    try { await access(file); bundles(request, response); }
    catch {
      if (path.startsWith('/assets/')) {
        if (!await serveCompressedModel(path, request, response)) assets(request, response);
      } else { response.writeHead(404); response.end('Preview file not found'); }
    }
  } catch { response.writeHead(400); response.end(); }
}).listen(port, '0.0.0.0', () => {
  console.log(`第一馆剧情试玩：http://localhost:${port}${entry}`);
  const lan = Object.values(networkInterfaces()).flat().find(item => item?.family === 'IPv4' && !item.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address));
  if (lan) console.log(`同一 Wi-Fi：http://${lan.address}:${port}${entry}`);
});
