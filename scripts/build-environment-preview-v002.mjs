import { build } from 'vite';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'outputs/environment-preview/v002');
const assets = ['courtyard/v002/courtyard.glb', 'shared/v001/traveler.glb', 'environment-sample/v001/tree-a.glb', 'environment-sample/v001/shrub-a.glb', 'environment-sample/v001/dunes.glb', 'environment-sample/v002/tree-a.glb', 'environment-sample/v002/shrub-a.glb', 'environment-sample/v002/dunes.glb'];
for (const asset of assets) await stat(resolve(root, 'public/assets/world', asset));
await build({ configFile: false, root, base: './', publicDir: false, build: { outDir: out, emptyOutDir: false, chunkSizeWarningLimit: 2000, rollupOptions: { input: resolve(root, 'environment-preview-v002.html') } } });
const manifest = [];
for (const asset of assets) {
  const source = resolve(root, 'public/assets/world', asset), target = resolve(out, 'assets/world', asset);
  await mkdir(dirname(target), { recursive: true }); await copyFile(source, target);
  manifest.push({ path: `assets/world/${asset}`, bytes: (await stat(source)).size });
}
await copyFile(resolve(out, 'environment-preview-v002.html'), resolve(out, 'index.html'));
await writeFile(resolve(out, 'sample-manifest.json'), JSON.stringify({ sample: 'environment-preview-v002', assets: manifest }, null, 2));
console.log(`独立样片已构建：${out}（仅复制8个引用GLB）`);
