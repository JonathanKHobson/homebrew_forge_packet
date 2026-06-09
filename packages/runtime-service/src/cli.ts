#!/usr/bin/env node
import { resolve } from 'node:path';
import { startRuntimeServer } from './createRuntimeServer.js';

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg?.startsWith('--')) {
    continue;
  }
  const next = process.argv[index + 1];
  if (next && !next.startsWith('--')) {
    args.set(arg.slice(2), next);
    index += 1;
  } else {
    args.set(arg.slice(2), 'true');
  }
}

const repoRoot = resolve(args.get('repo-root') ?? process.cwd());
const preferredPort = Number(args.get('port') ?? process.env.HOMEBREW_FORGE_PORT ?? '5177');
const editorDistDir = args.get('editor-dist') ? resolve(args.get('editor-dist') ?? '') : undefined;

const runtime = await startRuntimeServer({
  repoRoot,
  preferredPort: Number.isFinite(preferredPort) ? preferredPort : 5177,
  editorDistDir,
  deliveryMode: editorDistDir ? 'packaged' : 'runtime-dev'
});

process.stdout.write(
  `${JSON.stringify({
    origin: runtime.origin,
    port: runtime.port,
    pid: process.pid,
    mode: editorDistDir ? 'packaged' : 'runtime-dev',
    healthUrl: runtime.healthUrl,
    versionUrl: runtime.versionUrl
  })}\n`
);

async function close(): Promise<void> {
  await runtime.close();
  process.exit(0);
}

process.once('SIGINT', () => {
  void close();
});
process.once('SIGTERM', () => {
  void close();
});

setInterval(() => undefined, 2 ** 30);
