import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'outputs/web', emptyOutDir: false, chunkSizeWarningLimit: 2000 },
});
