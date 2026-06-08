export const APP_LABEL: 'Homebrew Forge Editor';
export const DEFAULT_PORT: 5177;
export const DEFAULT_WATCHED_PATHS: string[];

export interface ForgeDistFreshness {
  stale: boolean;
  reason: 'fresh' | 'missing-source' | 'missing-dist' | 'source-newer-than-dist';
  sourceNewestMtimeMs: number;
  distNewestMtimeMs: number;
}

export interface RuntimeHealth {
  appLabel: string;
  repoRoot: string;
  processId: number;
  startedAt: string;
  port: number;
  startupFingerprint: string;
  currentFingerprint: string;
  stale: boolean;
  staleReasons: string[];
  forgeDist: ForgeDistFreshness;
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
  watchedPaths?: string[];
}): Promise<RuntimeHealth>;
export function checkServerStatus(
  healthUrl: string,
  expected: {
    repoRoot: string;
    port: number;
    appLabel?: string;
    timeoutMs?: number;
  }
): Promise<{ status: ServerStatus; health?: RuntimeHealth }>;
