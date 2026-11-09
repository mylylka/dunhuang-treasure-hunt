import { access } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviewServer } from './serve-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = resolve(root, process.env.DUNHUANG_PLAYTEST_BUILD ?? 'work/world/mogao-exhibit-v001/build');
const entry = 'mogao-exhibit-v001.html';
const port = Number(process.env.DUNHUANG_PLAYTEST_PORT ?? 4230);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口无效');
await access(resolve(build, entry));
const server = createPreviewServer(build, {
  assetsDirectory: resolve(root, 'public'), defaultEntry: entry, compressModels: true,
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => {
  const lan = Object.values(networkInterfaces()).flat().find(address => address?.family === 'IPv4'
    && !address.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address.address));
  console.log(`第三馆及三馆联通试玩 http://localhost:${port}/${entry}`);
  if (lan) console.log(`同一 Wi-Fi http://${lan.address}:${port}/${entry}`);
});
