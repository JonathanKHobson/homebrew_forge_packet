export interface AssetRoleRef {
  id: string;
  role: string;
  layout?: string;
  colorVariant?: string;
  path: string;
  sourceId?: string;
  checksumSha256?: string;
}

export interface LayoutZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutMap {
  layout: string;
  canvas: { width: number; height: number };
  zones: Record<string, LayoutZone>;
}

export interface AssetPackManifest {
  packId: string;
  name: string;
  version: string;
  sourceSummary?: string;
  redistributionAllowed: boolean;
  commitAllowed: boolean;
  supportedLayouts: string[];
  roles: AssetRoleRef[];
  layoutMaps: LayoutMap[];
}

export interface AssetPack {
  manifest: AssetPackManifest;
  rootDir: string;
  resolveRole(args: { role: string; layout?: string; color?: string }): AssetRoleRef | null;
  getLayoutMap(layout: string): LayoutMap | null;
}
