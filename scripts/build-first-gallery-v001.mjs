import { build } from 'vite';
import { resolve } from 'node:path';
await build({ build: { outDir: 'work/world/first-gallery-v001/build', emptyOutDir: false, copyPublicDir: false, rollupOptions: { input: resolve('first-gallery-v001.html') } } });
