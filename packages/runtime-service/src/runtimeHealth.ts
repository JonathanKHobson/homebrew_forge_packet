import { createHash } from 'node:crypto';
import { stat, readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

export const APP_LABEL = 'Homebrew Forge Editor';
export const DEFAULT_PORT = 5177;
export const RUNTIME_API_CONTRACT_VERSION = 'runtime-api-v1';

export type RuntimeDeliveryMode = 'web-dev' | 'runtime-dev' | 'desktop-dev' | 'mac-desktop' | 'win-desktop' | 'packaged';

export interface RuntimeVersion {
  app: 'Homebrew Forge';
  deliveryMode: RuntimeDeliveryMode;
  apiContractVersion: typeof RUNTIME_API_CONTRACT_VERSION;
  editorBuild: string;
  forgeBuild: string;
  runtimeBuild: string;
  desktopBuild: string | null;
  repoRoot: string;
  projectRoot: string | null;
  selectedPort: number;
  processId: number;
  parentProcessId: number;
  startedAt: string;
}

export interface RuntimeHealth {
  appLabel: string;
  deliveryMode: RuntimeDeliveryMode;
  repoRoot: string;
  projectRoot: string | null;
  processId: number;
  parentProcessId: number;
  startedAt: string;
  port: number;
  selectedPort: number;
  startupFingerprint: string;
  currentFingerprint: string;
  stale: boolean;
  staleReasons: string[];
  forgeDist: ForgeDistFreshness;
}

export interface ForgeDistFreshness {
  stale: boolean;
  reason: 'missing-source' | 'missing-dist' | 'source-newer-than-dist' | 'fresh';
  sourceNewestMtimeMs: number;
  distNewestMtimeMs: number;
}

export interface RuntimeHealthOptions {
  repoRoot: string;
  appLabel?: string;
  deliveryMode?: RuntimeDeliveryMode;
  projectRoot?: string | null;
  processId?: number;
  parentProcessId?: number;
  startedAt?: string;
  port?: number;
  startupFingerprint?: string;
  watchedPaths?: string[];
}

export interface RuntimeVersionOptions {
  repoRoot: string;
  deliveryMode?: RuntimeDeliveryMode;
  projectRoot?: string | null;
  selectedPort?: number;
  processId?: number;
  parentProcessId?: number;
  startedAt?: string;
  editorBuild?: string;
  forgeBuild?: string;
  runtimeBuild?: string;
  desktopBuild?: string | null;
}

export const DEFAULT_WATCHED_PATHS = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'packages/editor/package.json',
  'packages/editor/vite.config.ts',
  'packages/editor/src',
  'packages/forge/package.json',
  'packages/forge/src',
  'packages/runtime-service/package.json',
  'packages/runtime-service/src',
  'scripts/launch-homebrew-forge-app.sh',
  'scripts/run-homebrew-forge-editor.mjs'
];

const WATCHED_FILE_EXTENSIONS = new Set(['.css', '.cjs', '.html', '.js', '.json', '.jsx', '.mjs', '.sh', '.ts', '.tsx']);
const FORGE_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const FORGE_DIST_EXTENSIONS = new Set(['.d.ts', '.js', '.js.map']);
const IGNORED_DIRECTORIES = new Set(['.git', '.turbo', '.vite', 'coverage', 'node_modules', 'output', 'output-live']);

export async function createSourceFingerprint(repoRoot: string, options: { watchedPaths?: string[] } = {}): Promise<string> {
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

export async function inspectForgeDistFreshness(repoRoot: string): Promise<ForgeDistFreshness> {
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

export async function buildRuntimeHealth(options: RuntimeHealthOptions): Promise<RuntimeHealth> {
  const repoRoot = resolve(options.repoRoot);
  const currentFingerprint = await createSourceFingerprint(repoRoot, {
    watchedPaths: options.watchedPaths
  });
  const forgeDist = await inspectForgeDistFreshness(repoRoot);
  const startupFingerprint = options.startupFingerprint || currentFingerprint;
  const staleReasons: string[] = [];

  if (startupFingerprint !== currentFingerprint) {
    staleReasons.push('source-changed-since-start');
  }
  if (forgeDist.stale) {
    staleReasons.push(`forge-dist-${forgeDist.reason}`);
  }

  const port = Number(options.port || DEFAULT_PORT);
  return {
    appLabel: options.appLabel ?? APP_LABEL,
    deliveryMode: options.deliveryMode ?? 'web-dev',
    repoRoot,
    projectRoot: options.projectRoot ?? null,
    processId: options.processId ?? process.pid,
    parentProcessId: options.parentProcessId ?? process.ppid,
    startedAt: options.startedAt ?? new Date().toISOString(),
    port,
    selectedPort: port,
    startupFingerprint,
    currentFingerprint,
    stale: staleReasons.length > 0,
    staleReasons,
    forgeDist
  };
}

export function buildRuntimeVersion(options: RuntimeVersionOptions): RuntimeVersion {
  return {
    app: 'Homebrew Forge',
    deliveryMode: options.deliveryMode ?? 'web-dev',
    apiContractVersion: RUNTIME_API_CONTRACT_VERSION,
    editorBuild: options.editorBuild ?? 'dev',
    forgeBuild: options.forgeBuild ?? 'dev',
    runtimeBuild: options.runtimeBuild ?? 'dev',
    desktopBuild: options.desktopBuild ?? null,
    repoRoot: resolve(options.repoRoot),
    projectRoot: options.projectRoot ?? null,
    selectedPort: Number(options.selectedPort || DEFAULT_PORT),
    processId: options.processId ?? process.pid,
    parentProcessId: options.parentProcessId ?? process.ppid,
    startedAt: options.startedAt ?? new Date().toISOString()
  };
}

export async function checkServerStatus(healthUrl: string, expected: { repoRoot: string; port?: number; appLabel?: string; timeoutMs?: number }): Promise<{ status: 'fresh' | 'stale' | 'foreign' | 'unreachable'; health?: RuntimeHealth | unknown }> {
  let response: Response;
  try {
    response = await fetch(healthUrl, { signal: AbortSignal.timeout(expected.timeoutMs ?? 2000) });
  } catch {
    return { status: 'unreachable' };
  }

  if (!response.ok) {
    return { status: 'foreign' };
  }

  let health: unknown;
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

async function collectFiles(repoRoot: string, watchedPaths: string[], extensions: Set<string>): Promise<string[]> {
  const files: string[] = [];
  for (const watchedPath of watchedPaths) {
    const absolutePath = resolve(repoRoot, watchedPath);
    await collectPath(absolutePath, files, extensions);
  }
  return files.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right)));
}

async function collectPath(absolutePath: string, files: string[], extensions: Set<string>): Promise<void> {
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

async function newestMtimeMs(files: string[]): Promise<number> {
  const mtimes = await Promise.all(
    files.map(async (file) => {
      const info = await stat(file);
      return info.mtimeMs;
    })
  );
  return mtimes.length ? Math.max(...mtimes) : 0;
}

function isIncludedFile(path: string, extensions: Set<string>): boolean {
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

function isExpectedHealth(value: unknown, expected: { repoRoot: string; port?: number; appLabel?: string }): value is RuntimeHealth {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const health = value as Partial<RuntimeHealth>;
  if (health.appLabel !== (expected.appLabel ?? APP_LABEL)) {
    return false;
  }
  if (resolve(String(health.repoRoot ?? '')) !== resolve(expected.repoRoot)) {
    return false;
  }
  if (Number(health.port) !== Number(expected.port ?? DEFAULT_PORT)) {
    return false;
  }
  return true;
}

function normalizePath(path: string): string {
  return path.split(sep).join('/');
}
