import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir, stat, cp } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'outputs/terrain/v003');
await build({ configFile: false, root, base: './', publicDir: false, plugins: [react()],
  build: { outDir: out, emptyOutDir: false, chunkSizeWarningLimit: 2000, rollupOptions: { input: [resolve(root, 'terrain-v003.html'), resolve(root, 'index.html')] } } });
for (const asset of ['buddha-narration/v001/buddha-narration.mp3', 'mogao/v011/mountain.glb', 'mogao-massing/v003/tower.glb', 'mogao/v011/entry.glb', 'mogao/v010/interior.glb', 'mogao/v009/buddha.glb', 'courtyard/v002/courtyard.glb', 'traveler-tripo/v002/traveler.glb', 'shared/v001/traveler.glb', 'environment-sample/v002/tree-a.glb', 'environment-sample/v002/shrub-a.glb', 'environment-sample/v002/dunes.glb', 'music-pavilion/v005/music-pavilion.glb', 'music-pavilion/v002/mural-original.png', 'music-pavilion/v002/mural-underlay-crop.png', 'music-pavilion/v002/ribbon-masks-crop.png', 'music-pavilion/v002/route-dune.glb', 'music-pavilion/v002/arrival-plucks.wav', 'flying-voice/v001/flying-question-native.mp3', 'traveler-voice/v001/music-question.mp3', 'traveler-voice/v001/mural-admiration.mp3']) {
  const target = resolve(out, 'assets/world', asset); await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, 'public/assets/world', asset), target); await stat(target);
}
await cp(resolve(root,'public/assets/world/story/v003'),resolve(out,'assets/world/story/v003'),{recursive:true});
await cp(resolve(root,'public/assets/world/story/v002'),resolve(out,'assets/world/story/v002'),{recursive:true});
await cp(resolve(root,'public/assets/world/novice-story/v001'),resolve(out,'assets/world/novice-story/v001'),{recursive:true});
// The preview shares the existing app shell and its "enter theme" navigation.
// Package those unchanged resources too, so fonts, panels and sound cues (and
// the destination screens) do not silently depend on the local public fallback.
for (const directory of ['shared', 'themes', 'lessons', 'levels']) {
  await cp(resolve(root, 'public/assets', directory), resolve(out, 'assets', directory), { recursive: true });
}
await cp(resolve(root,'public/assets/world/tower-trees/v001'),resolve(out,'assets/world/tower-trees/v001'),{recursive:true});
await cp(resolve(root,'public/assets/world/music-courtyard-tree/v001'),resolve(out,'assets/world/music-courtyard-tree/v001'),{recursive:true});
await copyFile(resolve(out, 'index.html'), resolve(out, 'baseline.html'));
await copyFile(resolve(out, 'terrain-v003.html'), resolve(out, 'index.html'));
console.log(`地形独立构建：${out}`);
