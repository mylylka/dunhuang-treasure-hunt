import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../outputs/mogao/v010');
const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const port = 4217, url = `http://localhost:${port}`;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.webm': 'video/webm', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
try { await stat(resolve(root, 'index.html')); } catch { console.error('请先运行 node scripts/build-mogao-v010.mjs'); process.exit(1); }
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-cache');
  if (request.url?.split('?')[0] === '/__mogao_preview__') { response.writeHead(200, { 'Content-Type': mime['.json'] }); response.end(JSON.stringify({ app: 'dunhuang-mogao-v010' })); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', url).pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    let bytes;
    try { bytes = await readFile(file); }
    catch (error) {
      // Existing game content is served read-only, without copying or changing it.
      if (error.code !== 'ENOENT' || !pathname.startsWith('/assets/')) throw error;
      const source = resolve(publicRoot, `.${pathname}`);
      if (!source.startsWith(`${publicRoot}${sep}`)) throw error;
      bytes = await readFile(source);
    }
    const headers = { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes' };
    // Safari requests byte ranges to establish audio duration and seek on replay.
    // A chunked-only response makes a finite MP3 look like an unseekable stream.
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match?.[2]));
      const end = match?.[1] && match?.[2] ? Math.min(bytes.length - 1, Number(match[2])) : bytes.length - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= bytes.length) {
        response.writeHead(416, { ...headers, 'Content-Range': `bytes */${bytes.length}`, 'Content-Length': 0 }); response.end(); return;
      }
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
      response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1)); return;
    }
    response.writeHead(200, { ...headers, 'Content-Length': bytes.length }); response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404); response.end('Preview file not found'); }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try { const response = await fetch(`${url}/__mogao_preview__`); if ((await response.json()).app === 'dunhuang-mogao-v010') { console.log(`莫高窟独立预览已运行：${url}`); return; } } catch { /* Preserve the existing service. */ }
    console.error('4217端口被其他程序占用，未停止该程序。'); process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`莫高窟独立预览：${url}`);
  const lan = Object.values(networkInterfaces()).flat().find(address => address?.family === 'IPv4' && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address));
  if (lan) console.log(`同一Wi-Fi：http://${lan.address}:${port}`);
});
