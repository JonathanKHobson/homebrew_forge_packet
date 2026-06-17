import type { CardRecord } from '@homebrew-forge/forge';

export type FrameSupportState =
  | 'renderable'
  | 'registered-only'
  | 'asset-present-unwired'
  | 'partial-renderer'
  | 'reference-only'
  | 'needs-assets'
  | 'blocked-license-review'
  | 'out-of-scope-for-now';

export type FrameSupportCategory =
  | 'card-type'
  | 'subtype'
  | 'layout'
  | 'frame-style'
  | 'treatment'
  | 'game-object';

export type FrameLicenseStatus = 'local-owned' | 'open-license-confirmed' | 'permission-needed' | 'reference-only' | 'unknown';

export type FrameBorderColor = 'black' | 'white' | 'white-mse' | 'silver' | 'gold' | 'borderless' | 'none';

export interface FrameSupportEntry {
  id: string;
  displayName: string;
  category: FrameSupportCategory;
  supportState: FrameSupportState;
  aliases?: string[];
  rulesTerms?: string[];
  inferredFrom?: {
    typeLineIncludes?: string[];
    oracleTextIncludes?: string[];
    layout?: CardRecord['layout'] | string;
    localManifestKey?: string;
  };
  requiredData?: string[];
  optionalData?: string[];
  renderer?: string;
  fallbackRenderer?: string;
  validator?: string;
  assetPackIds?: string[];
  licenseStatus: FrameLicenseStatus;
  qaReferences?: {
    officialRules?: string[];
    officialVisual?: string[];
    localFixtures?: string[];
  };
  demoTags: string[];
}

export interface BorderColorOption {
  value: FrameBorderColor;
  label: string;
  selectable: boolean;
  reason?: string;
}
