import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../outputs/traveler-preview/v001');
const port = 4192, url = `http://localhost:${port}`;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8' };
try { await stat(resolve(root, 'index.html')); } catch { console.error('请先运行 node scripts/build-traveler-preview-v001.mjs'); process.exit(1); }
const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-cache');
  if (request.url?.split('?')[0] === '/__traveler_preview__') { response.writeHead(200, { 'Content-Type': mime['.json'] }); response.end(JSON.stringify({ app: 'dunhuang-traveler-preview-v001' })); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', url).pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    const bytes = await readFile(file); response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }); response.end(bytes);
  } catch { response.writeHead(404); response.end('Preview file not found'); }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try { const response = await fetch(`${url}/__traveler_preview__`); if ((await response.json()).app === 'dunhuang-traveler-preview-v001') { console.log(`独立人物预览已运行：${url}`); return; } } catch { /* Preserve the existing service. */ }
    console.error('4192端口被其他程序占用，未停止该程序。'); process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`独立人物预览：${url}`);
  const lan = Object.values(networkInterfaces()).flat().find(address => address?.family === 'IPv4' && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address));
  if (lan) console.log(`同一Wi-Fi：http://${lan.address}:${port}`);
});
