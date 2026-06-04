import type { AssetPack } from './AssetPack';
import type { CardFaceRecord, CardRecord } from './CardRecord';

export interface ResolvedArt {
  artId: string;
  filePath: string;
  crop?: { x: number; y: number; w: number; h: number };
  artist?: string;
}

export interface ExportProfile {
  profileId: string;
  target: 'images' | 'cockatrice' | 'print_pdf' | 'gallery';
  imageFormat: 'png' | 'jpg' | 'jpeg' | 'webp';
  widthPx: number;
  heightPx: number;
  quality?: number;
  includePlaytestWatermark: boolean;
  watermarkText?: string;
  allowPlaceholderArt: boolean;
}

export interface RenderRequest {
  card: CardRecord;
  faces: CardFaceRecord[];
  art: Record<string, ResolvedArt>;
  assetPack: AssetPack;
  exportProfile: ExportProfile;
}

export interface RenderResult {
  cardId: string;
  outputPath: string;
  hash: string;
  warnings: string[];
}

export interface Renderer {
  renderCard(request: RenderRequest): Promise<RenderResult>;
}
