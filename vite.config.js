import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function createVercelIndex() {
  return {
    name: 'sigfrota-create-index',
    closeBundle() {
      const appHtml = resolve(process.cwd(), 'dist/app.html');
      const indexHtml = resolve(process.cwd(), 'dist/index.html');
      if (existsSync(appHtml)) copyFileSync(appHtml, indexHtml);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), createVercelIndex()],
  build: {
    rollupOptions: {
      input: resolve(process.cwd(), 'app.html'),
    },
  },
});
