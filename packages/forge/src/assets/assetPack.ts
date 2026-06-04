import { access, readFile } from 'node:fs/promises';
import { extname, isAbsolute, join } from 'node:path';
import YAML from 'yaml';
import { assetPackManifestSchema, type AssetPackManifest, type AssetRoleRef, type LayoutMap } from '../domain/schemas.js';

export interface LoadedAssetRoleRef extends AssetRoleRef {
  absolutePath: string;
  dataUri?: string;
  exists: boolean;
}

export interface AssetPack {
  manifest: AssetPackManifest;
  rootDir: string;
  roles: LoadedAssetRoleRef[];
  resolveRole(args: { role: string; layout?: string; color?: string; symbol?: string }): LoadedAssetRoleRef | null;
  getLayoutMap(layout: string): LayoutMap | null;
}

export interface LoadAssetPackOptions {
  rootDir: string;
  packId: string;
}

export async function loadAssetPack(options: LoadAssetPackOptions): Promise<AssetPack> {
  const rootDir = join(options.rootDir, 'assets', 'packs', options.packId);
  const manifestPath = join(rootDir, 'manifest.yaml');
  const manifest = assetPackManifestSchema.parse(YAML.parse(await readFile(manifestPath, 'utf8')));
  const assetBasePath = manifest.assetBasePath ?? rootDir;
  const roles = await Promise.all(
    manifest.roles.map(async (role) => {
      const absolutePath = isAbsolute(role.path) ? role.path : join(assetBasePath, role.path);
      const exists = await fileExists(absolutePath);
      return {
        ...role,
        absolutePath,
        exists,
        dataUri: exists ? await readAssetDataUri(absolutePath) : undefined
      };
    })
  );

  return {
    manifest,
    rootDir,
    roles,
    resolveRole(args) {
      return (
        roles.find(
          (role) =>
            role.role === args.role &&
            (!args.layout || !role.layout || role.layout === args.layout) &&
            (!args.color || !role.colorVariant || role.colorVariant === 'all' || role.colorVariant === args.color) &&
            (!args.symbol || !role.symbol || role.symbol === args.symbol)
        ) ?? null
      );
    },
    getLayoutMap(layout) {
      return (
        manifest.layoutMaps.find((map) => map.layout === layout) ??
        manifest.layoutMaps.find((map) => map.layout === 'normal') ??
        null
      );
    }
  };
}

export interface AssetCheckResult {
  packId: string;
  missing: LoadedAssetRoleRef[];
  present: LoadedAssetRoleRef[];
}

export function checkAssetPack(assetPack: AssetPack): AssetCheckResult {
  return {
    packId: assetPack.manifest.packId,
    missing: assetPack.roles.filter((role) => role.required && !role.exists),
    present: assetPack.roles.filter((role) => role.exists)
  };
}

async function readAssetDataUri(path: string): Promise<string> {
  const mimeType = mimeTypeFor(path);
  const data = await readFile(path);
  return `data:${mimeType};base64,${data.toString('base64')}`;
}

function mimeTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.svg':
      return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.ttf':
      return 'font/ttf';
    case '.otf':
      return 'font/otf';
    default:
      return 'image/png';
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
