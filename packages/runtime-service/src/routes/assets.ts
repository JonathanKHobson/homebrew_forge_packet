import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { loadAssetPack } from '@homebrew-forge/forge';

export interface RuntimeAssetResponse {
  absolutePath: string;
  body: Buffer;
  contentType: string;
}

export class RuntimeAssetError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'RuntimeAssetError';
    this.statusCode = statusCode;
  }
}

export async function readRuntimeManaSymbol(repoRoot: string, rawSymbol: string): Promise<RuntimeAssetResponse> {
  const symbol = normalizeManaSymbolKey(rawSymbol);
  const candidates = symbol ? await manaSymbolCandidatePaths(repoRoot, symbol) : [];
  for (const candidate of candidates) {
    try {
      const body = await readFile(candidate);
      return {
        absolutePath: candidate,
        body,
        contentType: mimeTypeForAsset(candidate)
      };
    } catch {
      // Try the next declared asset-pack candidate.
    }
  }
  throw new RuntimeAssetError(404, `Missing mana symbol ${symbol || rawSymbol}.`);
}

export async function readRuntimeAsset(repoRoot: string, assetPath: string | null): Promise<RuntimeAssetResponse> {
  if (!assetPath) {
    throw new RuntimeAssetError(400, 'Missing asset path.');
  }
  const absolutePath = isAbsolute(assetPath) ? resolve(assetPath) : resolve(repoRoot, assetPath);
  const root = resolve(repoRoot);
  if (!(await isAllowedRuntimeAssetPath(root, absolutePath))) {
    throw new RuntimeAssetError(403, 'Asset path is outside the project.');
  }
  try {
    return {
      absolutePath,
      body: await readFile(absolutePath),
      contentType: mimeTypeForAsset(absolutePath)
    };
  } catch (error) {
    throw new RuntimeAssetError(404, error instanceof Error ? error.message : String(error));
  }
}

async function isAllowedRuntimeAssetPath(repoRoot: string, absolutePath: string): Promise<boolean> {
  if (isPathInside(absolutePath, repoRoot)) {
    return true;
  }
  try {
    const packDirs = await readdir(join(repoRoot, 'assets', 'packs'), { withFileTypes: true });
    for (const entry of packDirs) {
      if (!entry.isDirectory()) {
        continue;
      }
      const pack = await loadAssetPack({ rootDir: repoRoot, packId: entry.name }).catch(() => null);
      if (!pack) {
        continue;
      }
      const allowedRoots = new Set(pack.roles.filter((role) => role.exists).map((role) => dirname(role.absolutePath)));
      for (const role of pack.roles) {
        if (role.absolutePath === absolutePath) {
          return true;
        }
      }
      for (const root of allowedRoots) {
        if (isPathInside(absolutePath, root)) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

async function manaSymbolCandidatePaths(repoRoot: string, symbol: string): Promise<string[]> {
  const fileNames = manaSymbolFileNames(symbol);
  const candidates: string[] = [];
  const packIds = await orderedAssetPackIds(repoRoot);
  for (const packId of packIds) {
    const pack = await loadAssetPack({ rootDir: repoRoot, packId }).catch(() => null);
    if (!pack) {
      continue;
    }
    const declared = pack.resolveRole({ role: 'symbol.mana', symbol });
    if (declared?.exists) {
      candidates.push(declared.absolutePath);
    }

    const symbolRoots = new Set(pack.roles.filter((role) => role.role === 'symbol.mana' && role.exists).map((role) => dirname(role.absolutePath)));
    for (const root of symbolRoots) {
      for (const fileName of fileNames) {
        candidates.push(join(root, fileName));
      }
    }
  }

  return [...new Set(candidates)];
}

async function orderedAssetPackIds(repoRoot: string): Promise<string[]> {
  const entries = await readdir(join(repoRoot, 'assets', 'packs'), { withFileTypes: true }).catch(() => []);
  const ids = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const preferred = ['genevensis-local', 'figma-mtg-card-assets', 'basic-m15-local', 'private-mtg-style'];
  return [...preferred.filter((id) => ids.includes(id)), ...ids.filter((id) => !preferred.includes(id))];
}

function normalizeManaSymbolKey(value: string): string {
  const cleaned = value.trim().replace(/^\{/, '').replace(/\}$/, '').toLowerCase().replace(/\s+/g, '');
  const aliases: Record<string, string> = {
    white: 'w',
    blue: 'u',
    black: 'b',
    red: 'r',
    green: 'g',
    colorless: 'c',
    tap: 't'
  };
  return aliases[cleaned] ?? cleaned;
}

function manaSymbolFileNames(symbol: string): string[] {
  const simple: Record<string, string> = {
    w: 'mana_sol_w.png',
    u: 'mana_sol_u.png',
    b: 'mana_sol_b.png',
    r: 'mana_sol_r.png',
    g: 'mana_sol_g.png',
    c: 'mana_sol_c.png',
    t: 'tap.png'
  };
  if (simple[symbol]) {
    return [simple[symbol]];
  }
  if (/^\d+$/.test(symbol)) {
    return [`mana_${symbol}.png`];
  }

  const compact = symbol.replace(/\//g, '').replace(/-/g, '');
  if (/^[wubrgcsp]{2}$/.test(compact)) {
    const reversed = compact.split('').reverse().join('');
    return [
      `mana_bi_${compact}.png`,
      `mana_bi_${reversed}.png`,
      `mana_h_${compact}.png`,
      `mana_h_${reversed}.png`,
      `mana_d_${compact}.png`,
      `mana_d_${reversed}.png`,
      `mana_f_${compact}.png`,
      `mana_f_${reversed}.png`
    ];
  }
  return [`mana_${compact}.png`, `${compact}.png`];
}

function isPathInside(targetPath: string, rootPath: string): boolean {
  const relativePath = relative(rootPath, resolve(targetPath));
  return Boolean(relativePath) && !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

function mimeTypeForAsset(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.svg':
      return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.json':
      return 'application/json';
    case '.txt':
      return 'text/plain';
    default:
      return 'image/png';
  }
}
