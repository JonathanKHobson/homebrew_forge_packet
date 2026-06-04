export type AssetSourceType = 'local_directory' | 'npm_package' | 'github_release' | 'api_cache';

export interface LicenseReview {
  reviewedByUser: boolean;
  redistributionAllowed: boolean | 'check_package_license' | 'check_repository_license';
  commitAllowed: boolean;
  notes?: string;
}

export interface AssetSourceConfig {
  sourceId: string;
  type: AssetSourceType;
  enabled: boolean;
  licenseReview: LicenseReview;
  path?: string;
  package?: string;
  version?: string;
  repo?: string;
  tag?: string;
  intendedRoles: string[];
}

export interface AssetSyncResult {
  sourceId: string;
  filesAdded: number;
  filesUpdated: number;
  filesSkipped: number;
  warnings: string[];
  manifestPath?: string;
}

export interface AssetSourcePlugin {
  type: AssetSourceType;
  dryRun(config: AssetSourceConfig): Promise<AssetSyncResult>;
  sync(config: AssetSourceConfig): Promise<AssetSyncResult>;
}
