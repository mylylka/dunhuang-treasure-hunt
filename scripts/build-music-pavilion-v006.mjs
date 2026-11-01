import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'outputs/music-pavilion/v006');
await build({ configFile: false, root, base: './', publicDir: false, plugins: [react()],
  build: { outDir: out, emptyOutDir: false, chunkSizeWarningLimit: 2000, rollupOptions: { input: [resolve(root, 'music-pavilion-v006.html'), resolve(root, 'index.html')] } } });
for (const asset of ['courtyard/v002/courtyard.glb', 'traveler-tripo/v002/traveler.glb', 'environment-sample/v002/tree-a.glb', 'environment-sample/v002/shrub-a.glb', 'environment-sample/v002/dunes.glb', 'music-pavilion/v005/music-pavilion.glb', 'music-pavilion/v002/mural-original.png', 'music-pavilion/v002/mural-underlay-crop.png', 'music-pavilion/v002/ribbon-masks-crop.png', 'music-pavilion/v002/route-dune.glb', 'music-pavilion/v002/arrival-plucks.wav', 'flying-voice/v001/flying-question-native.mp3', 'traveler-voice/v001/music-question.mp3', 'traveler-voice/v001/mural-admiration.mp3']) {
  const target = resolve(out, 'assets/world', asset); await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, 'public/assets/world', asset), target); await stat(target);
}
await copyFile(resolve(out, 'index.html'), resolve(out, 'baseline.html'));
await copyFile(resolve(out, 'music-pavilion-v006.html'), resolve(out, 'index.html'));
console.log(`乐舞馆字幕交互独立构建：${out}`);
