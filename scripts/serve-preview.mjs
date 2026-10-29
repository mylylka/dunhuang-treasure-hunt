import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../outputs/web');
const port = 4186;
const localUrl = `http://localhost:${port}`;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.json': 'application/json; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const openBrowser = () => {
  if (!process.argv.includes('--no-open') && process.platform === 'darwin') spawn('open', [localUrl], { stdio: 'ignore' }).unref();
};

try { await stat(resolve(webRoot, 'index.html')); }
catch { console.error('还没有试玩构建。请先在项目目录运行 npm run build。'); process.exit(1); }

const server = http.createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-cache');
  if (request.url?.split('?')[0] === '/__dunhuang_preview__') {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ app: 'dunhuang-treasure', version: '0.1.0' })); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', localUrl).pathname);
    const file = resolve(webRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${webRoot}${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('找不到这个文件。'); }
});

server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(`${localUrl}/__dunhuang_preview__`);
      if (response.ok && (await response.json()).app === 'dunhuang-treasure') {
        console.log(`游戏已经在运行：${localUrl}`); openBrowser(); return;
      }
    } catch { /* Another application may own this port. Do not stop it. */ }
    console.error('4186 端口已被其他程序占用，请联系开发 Agent 调整端口。'); process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`敦煌寻宝记 · AI 美术试玩版\n电脑打开：${localUrl}`);
  const entries = Object.entries(networkInterfaces()).sort(([a], [b]) => Number(!a.startsWith('en')) - Number(!b.startsWith('en')));
  const lan = entries.flatMap(([, addresses]) => addresses ?? []).find(address => address.family === 'IPv4' && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address));
  if (lan) console.log(`同一 Wi-Fi 手机可尝试：http://${lan.address}:${port}`);
  console.log('关闭这个终端窗口或按 Control+C 可结束预览。'); openBrowser();
});
