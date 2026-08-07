import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    open: true
  },
  plugins: [
    {
      name: 'copy-icons-to-dist',
      closeBundle() {
        cpSync('icons', 'dist/icons', { recursive: true });
      }
    }
  ]
});
