import { createHash } from 'node:crypto';
import { stat, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_LABEL = 'Homebrew Forge Editor';
export const DEFAULT_PORT = 5177;

export const DEFAULT_WATCHED_PATHS = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'packages/editor/package.json',
  'packages/editor/vite.config.ts',
  'packages/editor/src',
  'packages/forge/package.json',
  'packages/forge/src',
  'scripts/launch-homebrew-forge-app.sh',
  'scripts/run-homebrew-forge-editor.mjs'
];

const WATCHED_FILE_EXTENSIONS = new Set(['.css', '.cjs', '.html', '.js', '.json', '.jsx', '.mjs', '.sh', '.ts', '.tsx']);
const FORGE_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const FORGE_DIST_EXTENSIONS = new Set(['.d.ts', '.js', '.js.map']);
const IGNORED_DIRECTORIES = new Set(['.git', '.turbo', '.vite', 'coverage', 'node_modules', 'output', 'output-live']);

export async function createSourceFingerprint(repoRoot, options = {}) {
  const root = resolve(repoRoot);
  const watchedPaths = options.watchedPaths ?? DEFAULT_WATCHED_PATHS;
  const files = await collectFiles(root, watchedPaths, WATCHED_FILE_EXTENSIONS);
  const hash = createHash('sha256');
  hash.update('homebrew-forge-runtime-v1');
  for (const file of files) {
    const relativePath = normalizePath(relative(root, file));
    hash.update('\0path:');
    hash.update(relativePath);
    hash.update('\0content:');
    hash.update(await readFile(file));
  }
  return hash.digest('hex');
}

export async function inspectForgeDistFreshness(repoRoot) {
  const root = resolve(repoRoot);
  const sourceFiles = await collectFiles(root, ['packages/forge/src'], FORGE_SOURCE_EXTENSIONS);
  const distFiles = await collectFiles(root, ['packages/forge/dist'], FORGE_DIST_EXTENSIONS);
  const sourceNewestMtimeMs = await newestMtimeMs(sourceFiles);
  const distNewestMtimeMs = await newestMtimeMs(distFiles);

  if (!sourceFiles.length) {
    return {
      stale: false,
      reason: 'missing-source',
      sourceNewestMtimeMs,
      distNewestMtimeMs
    };
  }

  if (!distFiles.length) {
    return {
      stale: true,
      reason: 'missing-dist',
      sourceNewestMtimeMs,
      distNewestMtimeMs
    };
  }

  const stale = sourceNewestMtimeMs > distNewestMtimeMs;
  return {
    stale,
    reason: stale ? 'source-newer-than-dist' : 'fresh',
    sourceNewestMtimeMs,
    distNewestMtimeMs
  };
}

export async function buildRuntimeHealth(options) {
  const repoRoot = resolve(options.repoRoot);
  const currentFingerprint = await createSourceFingerprint(repoRoot, {
    watchedPaths: options.watchedPaths
  });
  const forgeDist = await inspectForgeDistFreshness(repoRoot);
  const startupFingerprint = options.startupFingerprint || currentFingerprint;
  const staleReasons = [];

  if (startupFingerprint !== currentFingerprint) {
    staleReasons.push('source-changed-since-start');
  }
  if (forgeDist.stale) {
    staleReasons.push(`forge-dist-${forgeDist.reason}`);
  }

  return {
    appLabel: options.appLabel ?? APP_LABEL,
    repoRoot,
    processId: options.processId,
    startedAt: options.startedAt,
    port: options.port,
    startupFingerprint,
    currentFingerprint,
    stale: staleReasons.length > 0,
    staleReasons,
    forgeDist
  };
}

export async function checkServerStatus(healthUrl, expected) {
  let response;
  try {
    response = await fetch(healthUrl, { signal: AbortSignal.timeout(expected.timeoutMs ?? 2000) });
  } catch {
    return { status: 'unreachable' };
  }

  if (!response.ok) {
    return { status: 'foreign' };
  }

  let health;
  try {
    health = await response.json();
  } catch {
    return { status: 'foreign' };
  }

  if (!isExpectedHealth(health, expected)) {
    return { status: 'foreign', health };
  }

  return {
    status: health.stale ? 'stale' : 'fresh',
    health
  };
}

async function collectFiles(repoRoot, watchedPaths, extensions) {
  const files = [];
  for (const watchedPath of watchedPaths) {
    const absolutePath = resolve(repoRoot, watchedPath);
    await collectPath(absolutePath, files, extensions);
  }
  return files.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

async function collectPath(absolutePath, files, extensions) {
  let info;
  try {
    info = await stat(absolutePath);
  } catch {
    return;
  }

  if (info.isDirectory()) {
    if (IGNORED_DIRECTORIES.has(absolutePath.split(sep).at(-1) ?? '')) {
      return;
    }
    const entries = await readdir(absolutePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await collectPath(join(absolutePath, entry.name), files, extensions);
    }
    return;
  }

  if (info.isFile() && isIncludedFile(absolutePath, extensions)) {
    files.push(absolutePath);
  }
}

async function newestMtimeMs(files) {
  const mtimes = await Promise.all(
    files.map(async (file) => {
      const info = await stat(file);
      return info.mtimeMs;
    })
  );
  return mtimes.length ? Math.max(...mtimes) : 0;
}

function isIncludedFile(path, extensions) {
  const basename = path.split(sep).at(-1) ?? '';
  if (basename === 'package.json' || basename === 'pnpm-workspace.yaml') {
    return true;
  }
  const extension = extname(path);
  if (extension === '.ts' && path.endsWith('.d.ts')) {
    return extensions.has('.d.ts');
  }
  if (path.endsWith('.js.map')) {
    return extensions.has('.js.map');
  }
  return extensions.has(extension);
}

function isExpectedHealth(value, expected) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (value.appLabel !== (expected.appLabel ?? APP_LABEL)) {
    return false;
  }
  if (resolve(String(value.repoRoot ?? '')) !== resolve(expected.repoRoot)) {
    return false;
  }
  if (Number(value.port) !== Number(expected.port ?? DEFAULT_PORT)) {
    return false;
  }
  return true;
}

function normalizePath(path) {
  return path.split(sep).join('/');
}

async function runCli() {
  const [, , command, ...args] = process.argv;
  if (command === 'fingerprint') {
    process.stdout.write(`${await createSourceFingerprint(args[0] ?? process.cwd())}\n`);
    return;
  }
  if (command === 'dist-stale') {
    const result = await inspectForgeDistFreshness(args[0] ?? process.cwd());
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.stale ? 2 : 0;
    return;
  }
  if (command === 'check-server') {
    const [healthUrl, repoRoot, port] = args;
    const result = await checkServerStatus(healthUrl, { repoRoot, port: Number(port || DEFAULT_PORT) });
    process.stdout.write(`${result.status}\n`);
    process.exitCode = result.status === 'fresh' ? 0 : result.status === 'stale' ? 2 : result.status === 'foreign' ? 3 : 4;
    return;
  }
  if (command === 'server-pid') {
    const [healthUrl, repoRoot, port] = args;
    const result = await checkServerStatus(healthUrl, { repoRoot, port: Number(port || DEFAULT_PORT) });
    if (result.health?.processId) {
      process.stdout.write(`${result.health.processId}\n`);
      return;
    }
    process.exitCode = 1;
    return;
  }
  if (command === 'health') {
    const repoRoot = args[0] ?? process.cwd();
    const fingerprint = await createSourceFingerprint(repoRoot);
    const health = await buildRuntimeHealth({
      repoRoot,
      processId: process.pid,
      startedAt: new Date().toISOString(),
      port: Number(args[1] || DEFAULT_PORT),
      startupFingerprint: fingerprint
    });
    process.stdout.write(`${JSON.stringify(health, null, 2)}\n`);
    return;
  }

  process.stderr.write('Usage: runtimeHealth.mjs fingerprint|dist-stale|check-server|server-pid|health ...\n');
  process.exitCode = 1;
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  void runCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
