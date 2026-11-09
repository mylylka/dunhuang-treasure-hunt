import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hotReload = process.env.DUNHUANG_DEV_HMR === '1';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Vite can send a full reload over its socket even when file HMR is disabled.
  server: { hmr: hotReload, ws: hotReload ? undefined : false },
  build: { outDir: 'outputs/web', emptyOutDir: false, chunkSizeWarningLimit: 2000 },
});
