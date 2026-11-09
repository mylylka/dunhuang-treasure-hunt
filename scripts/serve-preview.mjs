import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import { brotliCompress, createGzip, gzip, constants } from 'node:zlib';

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../outputs/web');
const portArgument = process.argv.find(value => value.startsWith('--port='));
const port = portArgument ? Number(portArgument.slice(7)) : 4186;
const localUrl = `http://localhost:${port}`;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.pdf': 'application/pdf', '.json': 'application/json; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.glb': 'model/gltf-binary' };
const openBrowser = () => {
  if (!process.argv.includes('--no-open') && process.platform === 'darwin') spawn('open', [localUrl], { stdio: 'ignore' }).unref();
};

const compressBrotli = promisify(brotliCompress), compressGzip = promisify(gzip);

export function createPreviewServer(directory = webRoot, { assetsDirectory, defaultEntry = 'index.html', compressModels = false } = {}) {
 const compressed = new Map();
 return http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  if (request.url?.split('?')[0] === '/__dunhuang_preview__') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ app: 'dunhuang-treasure', version: '0.1.0', compressed: true })); return;
  }
  try {
    const requested = decodeURIComponent(new URL(request.url ?? '/', localUrl).pathname);
    const pathname = requested === '/' ? `/${defaultEntry}` : requested;
    let file = resolve(directory, `.${pathname}`);
    if (!file.startsWith(`${directory}${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
    let info = await stat(file).catch(() => undefined);
    if (!info?.isFile() && assetsDirectory && pathname.startsWith('/assets/')) {
      file = resolve(assetsDirectory, `.${pathname}`);
      if (!file.startsWith(`${assetsDirectory}${sep}assets${sep}`)) { response.writeHead(403); response.end('Forbidden'); return; }
      info = await stat(file).catch(() => undefined);
    }
    if (!info?.isFile()) throw new Error('Not a file');
    const extension = extname(file);
    const text = ['.html', '.js', '.css', '.svg', '.json', '.txt'].includes(extension);
    const accept = request.headers['accept-encoding'] ?? '';
    const accepts = name => accept.split(',').some(part => {
      const [encoding, quality] = part.trim().split(';');
      return encoding === name && !/^\s*q=0(?:\.0*)?\s*$/.test(quality ?? '');
    });
    const model = compressModels && extension === '.glb';
    const encoding = !request.headers.range && info.size > 512
      ? text ? accepts('br') ? 'br' : accepts('gzip') ? 'gzip' : '' : model && accepts('gzip') ? 'gzip' : ''
      : '';
    const etag = `W/"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-${encoding || 'raw'}"`;
    // Hashed bundles and explicitly versioned artwork can be reused across levels.
    // HTML and unversioned files revalidate, so a rebuilt game never sticks on old code.
    const versioned = /\/v\d{3}\//.test(pathname) || /[.-]v\d{3}\./.test(pathname)
      || /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(pathname);
    const headers = { 'Content-Type': mime[extension] ?? 'application/octet-stream', ETag: etag,
      'Cache-Control': extension !== '.html' && versioned ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Accept-Ranges': 'bytes', ...(text || model ? { Vary: 'Accept-Encoding' } : {}),
      ...(encoding ? { 'Content-Encoding': encoding } : {}) };
    if (request.headers['if-none-match'] === etag && !request.headers.range) {
      response.writeHead(304, headers); response.end(); return;
    }
    if (model && encoding === 'gzip') {
      response.writeHead(200, headers);
      if (request.method === 'HEAD') response.end();
      else await pipeline(createReadStream(file), createGzip({ level: 3 }), response).catch(() => response.destroy());
      return;
    }
    let data = await readFile(file);
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      const start = match?.[1] ? Number(match[1]) : Math.max(0, data.length - Number(match?.[2]));
      const end = match?.[1] && match?.[2] ? Math.min(data.length - 1, Number(match[2])) : data.length - 1;
      if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)
        || start > end || start >= data.length) {
        response.writeHead(416, { ...headers, 'Content-Range': `bytes */${data.length}`, 'Content-Length': 0 }); response.end(); return;
      }
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
      response.end(request.method === 'HEAD' ? undefined : data.subarray(start, end + 1)); return;
    }
    if (encoding) {
      const key = `${file}:${etag}`;
      let pending = compressed.get(key);
      if (!pending) {
        pending = encoding === 'br' ? compressBrotli(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }) : compressGzip(data);
        // Cache only text encodings, not hundreds of megabytes of media.
        if (compressed.size >= 64) compressed.delete(compressed.keys().next().value);
        compressed.set(key, pending);
        pending.catch(() => compressed.delete(key));
      }
      data = await pending;
    }
    response.writeHead(200, { ...headers, 'Content-Length': data.length });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('找不到这个文件。'); }
 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('端口无效');
try { await stat(resolve(webRoot, 'index.html')); }
catch { console.error('还没有试玩构建。请先在项目目录运行 npm run build。'); process.exit(1); }
const server = createPreviewServer();

server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(`${localUrl}/__dunhuang_preview__`);
      if (response.ok && (await response.json()).app === 'dunhuang-treasure') {
        console.log(`游戏已经在运行：${localUrl}`); openBrowser(); return;
      }
    } catch { /* Another application may own this port. Do not stop it. */ }
    console.error(`${port} 端口已被其他程序占用，请联系开发 Agent 调整端口。`); process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`敦煌寻宝记 · AI 美术试玩版\n电脑打开：${localUrl}`);
  const entries = Object.entries(networkInterfaces()).sort(([a], [b]) => Number(!a.startsWith('en')) - Number(!b.startsWith('en')));
  const lan = entries.flatMap(([, addresses]) => addresses ?? []).find(address => address.family === 'IPv4' && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address));
  if (lan) console.log(`同一 Wi-Fi 手机可尝试：http://${lan.address}:${port}`);
  console.log('关闭这个终端窗口或按 Control+C 可结束预览。'); openBrowser();
});
}
