import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const output = process.env.DUNHUANG_PLAYTEST_BUILD;
if (!output) {
  throw new Error('日常试玩请运行 npm run dev。留档时请用 DUNHUANG_PLAYTEST_BUILD 指定新目录。');
}
const outDir = resolve(output);
await mkdir(dirname(outDir), { recursive: true });
try {
  await mkdir(outDir);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  throw new Error(`试玩构建目录「${outDir}」已存在，请指定新目录。`);
}

const { build } = await import('vite');

const input = [
  'first-gallery-v001.html', 'music-companion-v002.html', 'mogao-exhibit-v001.html',
  'mogao-upper-v001.html', 'mogao-upper-v002.html', 'terrain-v013.html',
].map(file => resolve(file));

await build({
  build: {
    outDir,
    copyPublicDir: false,
    emptyOutDir: false,
    rolldownOptions: { input },
  },
});
