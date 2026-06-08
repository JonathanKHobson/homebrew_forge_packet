#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.CI = 'true';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const editorRoot = resolve(repoRoot, 'packages/editor');
const requireFromEditor = createRequire(resolve(editorRoot, 'package.json'));
const viteModule = await import(requireFromEditor.resolve('vite'));
const createServer = viteModule.createServer ?? viteModule.default?.createServer;

if (typeof createServer !== 'function') {
  throw new TypeError('Could not load Vite createServer from the editor dependency.');
}

const port = Number.parseInt(process.env.HOMEBREW_FORGE_PORT ?? '5177', 10);
const server = await createServer({
  root: editorRoot,
  configFile: resolve(editorRoot, 'vite.config.ts'),
  server: {
    host: '127.0.0.1',
    port: Number.isFinite(port) ? port : 5177,
    strictPort: true
  },
  clearScreen: false
});

await server.listen();
server.printUrls();

async function close() {
  await server.close();
  process.exit(0);
}

process.once('SIGINT', () => {
  void close();
});
process.once('SIGTERM', () => {
  void close();
});

setInterval(() => undefined, 2 ** 30);
