import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { RUNTIME_SCRIPTS } from './src/runtimeScripts.js';

function copyRuntimeFile(path) {
  const destination = `dist/${path}`;
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(path, destination);
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    rollupOptions: {
      input: { main: 'index.html' }
    }
  },
  server: { open: true },
  plugins: [{
    name: 'copy-corebound-runtime',
    closeBundle() {
      RUNTIME_SCRIPTS.forEach(copyRuntimeFile);
      ['icons', 'images', 'sounds'].forEach(directory => {
        cpSync(directory, `dist/${directory}`, { recursive: true });
      });
    }
  }]
});
