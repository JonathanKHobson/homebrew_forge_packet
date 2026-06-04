import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { editorApiPlugin } from './src/server/editorApiPlugin.js';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export default defineConfig({
  plugins: [react(), editorApiPlugin({ repoRoot, defaultSetCode: 'DEMO' })],
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2022',
        jsx: 'react-jsx'
      }
    }
  },
  build: {
    target: 'es2022'
  },
  server: {
    port: 5177,
    strictPort: false
  }
});
