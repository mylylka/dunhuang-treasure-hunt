import { mkdir, stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import { createPreviewServer } from './serve-preview.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const branchPublic = resolve(root, 'public');
const worktreeSharedPublic = resolve(root, '../../public');
const hasAssets = async directory => (await stat(resolve(directory, 'assets')).catch(() => null))?.isDirectory();
const sharedPublic = process.env.DUNHUANG_SHARED_PUBLIC
  ? resolve(process.env.DUNHUANG_SHARED_PUBLIC)
  : await hasAssets(worktreeSharedPublic) ? worktreeSharedPublic : branchPublic;
const port = Number(process.env.DUNHUANG_DESERT_PORT ?? 5174);
const host = process.env.DUNHUANG_DESERT_HOST ?? '0.0.0.0';
const buildDirectory = process.env.DUNHUANG_DESERT_BUILD;

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('试玩端口无效');
if (!await hasAssets(sharedPublic)) {
  throw new Error('共享素材目录不存在。用 DUNHUANG_SHARED_PUBLIC 指定现有 public 目录。');
}

const assetServers = [...new Set([branchPublic, sharedPublic])].map(directory => ({
  directory,
  server: createPreviewServer(directory, { compressModels: true }),
}));

async function servePublicAsset(request, response) {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (!pathname.startsWith('/assets/')) return false;
  const asset = decodeURIComponent(pathname);
  for (const { directory, server } of assetServers) {
    const file = resolve(directory, `.${asset}`);
    if (!file.startsWith(`${directory}${sep}assets${sep}`)) return false;
    if ((await stat(file).catch(() => null))?.isFile()) {
      server.emit('request', request, response);
      return true;
    }
  }
  return false;
}

if (buildDirectory) {
  const outDir = resolve(root, buildDirectory);
  if (process.argv.includes('--compile')) {
    await mkdir(dirname(outDir), { recursive: true });
    await mkdir(outDir);
    await build({
      root,
      build: {
        outDir,
        copyPublicDir: false,
        emptyOutDir: false,
        rolldownOptions: { input: [resolve(root, 'index.html'), resolve(root, 'first-gallery-v001.html')] },
      },
    });
  }
  await Promise.all(['index.html', 'first-gallery-v001.html'].map(entry => stat(resolve(outDir, entry))));
  const preview = createPreviewServer(outDir);
  const server = createHttpServer((request, response) => {
    void servePublicAsset(request, response).then(served => {
      if (!served) preview.emit('request', request, response);
    }).catch(() => {
      response.writeHead(400);
      response.end();
    });
  });
  server.listen(port, host, () => console.log(`敦煌沙漠验收构建 http://${host}:${port}/`));
} else {
  const server = await createServer({
    root,
    server: { host, port, strictPort: true, hmr: false, ws: false },
    plugins: [{
      name: 'dunhuang-desert-shared-playtest-assets',
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          void servePublicAsset(request, response).then(served => {
            if (!served) next();
          }).catch(next);
        });
      },
    }],
  });
  await server.listen();
  server.printUrls();
}
