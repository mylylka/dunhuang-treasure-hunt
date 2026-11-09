import { access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { createPreviewServer } from './serve-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = resolve(root, process.env.DUNHUANG_PLAYTEST_BUILD ?? 'work/world/music-companion-build-v002');
const entry = 'music-companion-v002.html';
const port = Number(process.env.DUNHUANG_PLAYTEST_PORT ?? 4228);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口无效');
await access(resolve(build, entry));
const server = createPreviewServer(build, {
  assetsDirectory: resolve(root, 'public'), defaultEntry: entry, compressModels: true,
});
server.on('error', error => { console.error(`双层同行试玩服务：${error.message}`); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => {
  console.log(`双层同行压缩试玩 http://localhost:${port}/${entry}`);
  const lan = Object.values(networkInterfaces()).flat().find(a => a?.family === 'IPv4' && !a.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address));
  if (lan) console.log(`同一 Wi-Fi http://${lan.address}:${port}/${entry}`);
});
