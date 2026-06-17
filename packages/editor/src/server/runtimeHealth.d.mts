export const APP_LABEL: 'Homebrew Forge Editor';
export const DEFAULT_PORT: 5177;
export const RUNTIME_API_CONTRACT_VERSION: 'runtime-api-v1';

export type RuntimeDeliveryMode = 'web-dev' | 'runtime-dev' | 'desktop-dev' | 'mac-desktop' | 'win-desktop' | 'packaged';
export const DEFAULT_WATCHED_PATHS: string[];

export interface ForgeDistFreshness {
  stale: boolean;
  reason: 'fresh' | 'missing-source' | 'missing-dist' | 'source-newer-than-dist';
  sourceNewestMtimeMs: number;
  distNewestMtimeMs: number;
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

export type ServerStatus = 'fresh' | 'stale' | 'foreign' | 'unreachable';

export function createSourceFingerprint(repoRoot: string, options?: { watchedPaths?: string[] }): Promise<string>;
export function inspectForgeDistFreshness(repoRoot: string): Promise<ForgeDistFreshness>;
export function buildRuntimeHealth(options: {
  repoRoot: string;
  processId: number;
  startedAt: string;
  port: number;
  startupFingerprint?: string;
  appLabel?: string;
  deliveryMode?: RuntimeDeliveryMode;
  projectRoot?: string | null;
  parentProcessId?: number;
  watchedPaths?: string[];
}): Promise<RuntimeHealth>;
export function buildRuntimeVersion(options: {
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
}): RuntimeVersion;
export function checkServerStatus(
  healthUrl: string,
  expected: {
    repoRoot: string;
    port: number;
    appLabel?: string;
    timeoutMs?: number;
  }
): Promise<{ status: ServerStatus; health?: RuntimeHealth }>;
