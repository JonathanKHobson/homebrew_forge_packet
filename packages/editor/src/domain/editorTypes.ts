import type {
  CardRecord,
  CardFaceRecord,
  CardVariantExportMode,
  CardVariantRecord,
  CollectionExportResult,
  CollectionExportTarget,
  CollectionEntry,
  CollectionImportContentFormat,
  CollectionImportMode,
  CollectionImportResult,
  CollectionImportSummary,
  CollectionKind,
  CollectionListCategory,
  CollectionMetadata,
  CollectionOwnershipStatus,
  CollectionPriceImportRequest,
  CollectionPriceRefreshRequest,
  CollectionPriceRefreshResult,
  CollectionPriceRefreshSummary,
  CollectionPurpose,
  CollectionSourcePreset,
  CollectionState,
  CollectionSummary,
  CreateCollectionRequest,
  SaveCollectionRequest,
  CreateDeckRequest as ForgeCreateDeckRequest,
  DeckCardOption,
  DeckEntry,
  DeckExportResult,
  DeckImportResult,
  DeckMetadata,
  DeckState,
  DeckSummary,
  PrintInkMode,
  PrintLayout,
  PrintOutputFormat,
  PrintPaper,
  ImportDeckRequest,
  SaveDeckRequest
} from '@homebrew-forge/forge';
import type { CardPowerAssessment } from '@homebrew-forge/forge';
import type {
  AddOfficialCardToCollectionRequest,
  AddOfficialCardToDeckRequest,
  AddOfficialCardToSetRequest,
  OfficialCardCatalogStatus,
  OfficialCardCatalogView,
  OfficialCardSearchCard,
  OfficialCardSearchFilters,
  OfficialCardSearchResult
} from '@homebrew-forge/forge';
import type { FrameBorderColor, FrameSupportState } from './frameSupportTypes.js';

export interface UniverseSummary {
  id: string;
  name: string;
  description?: string;
  status?: string;
  tags?: string[];
  coverImageUrl?: string;
}

export interface SetSummary {
  setCode: string;
  setName: string;
  universeId: string;
  status: string;
  tags: string[];
  cardCount: number;
  sortOrder: number;
}

export interface LibraryState {
  universes: UniverseSummary[];
  sets: SetSummary[];
  selectedUniverseId: string;
  selectedSetCode: string;
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
  forgeDist: {
    stale: boolean;
    reason: 'fresh' | 'missing-source' | 'missing-dist' | 'source-newer-than-dist';
    sourceNewestMtimeMs: number;
    distNewestMtimeMs: number;
  };
}

export type { CardVariantExportMode, DeckCardOption, DeckEntry, DeckExportResult, DeckImportResult, DeckMetadata, DeckState, DeckSummary, ForgeCreateDeckRequest as CreateDeckRequest, ImportDeckRequest, SaveDeckRequest };
export type { PrintInkMode, PrintLayout, PrintOutputFormat, PrintPaper };
export type {
  AddOfficialCardToCollectionRequest,
  AddOfficialCardToDeckRequest,
  AddOfficialCardToSetRequest,
  OfficialCardCatalogStatus,
  OfficialCardCatalogView,
  OfficialCardSearchCard,
  OfficialCardSearchFilters,
  OfficialCardSearchResult
};

export interface AddOfficialCardToSetResult {
  project: EditorProject;
  summary: {
    setCode: string;
    cardId: string;
    name: string;
    collectorNumber: string;
    sourceSetCode?: string;
    sourceCollectorNumber?: string;
  };
}

export interface ImportCollectionToSetRequest {
  collectionId: string;
  setCode: string;
  entryIds?: string[];
  status?: 'idea' | 'draft' | 'review' | 'playtest' | 'final' | 'cut' | 'archived';
}

export interface ImportCollectionToSetResult {
  project: EditorProject;
  summary: {
    collectionId: string;
    setCode: string;
    requestedRows: number;
    importedRows: number;
    skippedRows: number;
    warnings: string[];
    importedNames: string[];
  };
}
export type {
  CollectionExportResult,
  CollectionExportTarget,
  CollectionEntry,
  CollectionImportContentFormat,
  CollectionImportMode,
  CollectionImportResult,
  CollectionImportSummary,
  CollectionKind,
  CollectionListCategory,
  CollectionMetadata,
  CollectionOwnershipStatus,
  CollectionPriceImportRequest,
  CollectionPriceRefreshRequest,
  CollectionPriceRefreshResult,
  CollectionPriceRefreshSummary,
  CollectionPurpose,
  CollectionSourcePreset,
  CollectionState,
  CollectionSummary,
  CreateCollectionRequest,
  SaveCollectionRequest
};

export interface CreateSetRequest {
  universeId: string;
  universeName?: string;
  setCode: string;
  setName: string;
  author?: string;
  status?: string;
  tags?: string[];
  notes?: string;
}

export interface CreateUniverseRequest {
  name: string;
  description?: string;
  status?: string;
  tags?: string[];
}

export interface UpdateUniverseRequest {
  universeId: string;
  name: string;
  description?: string;
  status?: string;
  tags?: string[];
}

export interface UpdateSetRequest {
  setCode: string;
  setName: string;
  status: string;
  universeId: string;
  tags?: string[];
}

export type ExportSourceTarget =
  | 'set_csv'
  | 'cards_csv'
  | 'faces_csv'
  | 'art_csv'
  | 'profiles_csv'
  | 'print_pdf'
  | 'cockatrice_xml'
  | 'cockatrice_zip';

export interface ExportSourceRequest {
  setCode: string;
  target: ExportSourceTarget;
  variantMode?: CardVariantExportMode;
}

export interface ExportSourceResult {
  filename: string;
  mimeType: string;
  encoding: 'text' | 'base64';
  content: string;
  sync?: CockatriceSyncResult;
}

export type PrintSourceKind = 'current_card' | 'active_set' | 'deck' | 'collection' | 'project';

export interface PrintExportRequest {
  sourceKind: PrintSourceKind;
  draft?: CardDraft;
  setCode?: string;
  deckId?: string;
  collectionId?: string;
  universeId?: string;
  variantMode?: CardVariantExportMode;
  outputFormat: PrintOutputFormat;
  paper: PrintPaper;
  layout: PrintLayout;
  inkMode: PrintInkMode;
  copies: number;
  includeCropMarks: boolean;
  includeCutLines: boolean;
  scalePercent: number;
}

export interface PrintExportResult {
  filename: string;
  mimeType: string;
  encoding: 'base64';
  content: string;
  warnings: string[];
  summary: {
    sourceKind: PrintSourceKind;
    cardCount: number;
    pageCount: number;
    paper: PrintPaper;
    layout: PrintLayout;
    inkMode: PrintInkMode;
    outputFormat: PrintOutputFormat;
    scalePercent: number;
  };
}

export interface EditorProject {
  setCode: string;
  setName: string;
  language: string;
  designer: string;
  assetPackId: string;
  cards: CardSummary[];
  drafts: CardDraft[];
  libraryAssets: LibraryAssetSummary[];
  frames: FrameOption[];
  discoveredFrameFamilies: string[];
  lastCockatriceSync?: CockatriceSyncResult;
}

export interface LibraryAssetSummary {
  artId: string;
  name: string;
  assetType: string;
  filePath: string;
  sourceUrl: string;
  sourceType: string;
  artist: string;
  license: string;
  permissionStatus: string;
  notes: string;
  assignedCards: Array<{ cardId: string; name: string }>;
}

export interface CreateLibraryAssetRequest {
  setCode: string;
  artId: string;
  assetType: string;
  sourceMode: 'upload' | 'url' | 'local';
  dataUri?: string;
  filename?: string;
  filePath?: string;
  sourceUrl?: string;
  artist?: string;
  license?: string;
  permissionStatus?: string;
  notes?: string;
  assignedCardIds?: string[];
  assignedVariantIds?: string[];
}

export interface CardSummary {
  cardId: string;
  collectorNumber: string;
  name: string;
  typeLine: string;
  rarity: CardRecord['rarity'];
  colors: string;
  layout: CardRecord['layout'];
  frameType: string;
  status: CardRecord['status'];
  tags: string[];
  notes: string;
  manaCost: string;
  colorIdentity: string;
  oracleText: string;
  flavorText: string;
  power: string;
  toughness: string;
  hasArt: boolean;
  needsReview: boolean;
  primaryVariantId: string;
  activeVariantId?: string;
  variantCount: number;
  variants: CardVariantSummary[];
}

export interface CardVariantSummary {
  variantId: string;
  cardId: string;
  displayName: string;
  kind: CardVariantRecord['kind'];
  status: CardVariantRecord['status'];
  isPrimary: boolean;
  exportPolicy: CardVariantRecord['exportPolicy'];
  tags: string[];
  notes: string;
  searchText: string;
}

export interface CardDraft {
  cardId: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  setTotal: string;
  language: string;
  designer: string;
  name: string;
  manaCost: string;
  rarity: CardRecord['rarity'];
  layout: CardRecord['layout'];
  mode: CardRecord['mode'];
  frameType: string;
  frameOverrideId: string;
  supertypes: string[];
  cardTypes: string[];
  subtypes: string;
  typeLine: string;
  oracleText: string;
  flavorText: string;
  rulesTextSize: string;
  rulesTextPaddingTop: string;
  rulesTextPaddingRight: string;
  rulesTextPaddingBottom: string;
  rulesTextPaddingLeft: string;
  rulesTextReminderMode: CardFaceRecord['rulesTextReminderMode'];
  power: string;
  toughness: string;
  loyalty: string;
  planeswalkerAbilityCount: '3' | '4';
  planeswalkerAbility1Cost: string;
  planeswalkerAbility1Text: string;
  planeswalkerAbility2Cost: string;
  planeswalkerAbility2Text: string;
  planeswalkerAbility3Cost: string;
  planeswalkerAbility3Text: string;
  planeswalkerAbility4Cost: string;
  planeswalkerAbility4Text: string;
  colors: string;
  colorIndicator: string;
  borderColor: FrameBorderColor;
  foilTreatment: 'none' | 'foil' | 'etched' | 'showcase';
  artId: string;
  artFilePath: string;
  artUrl: string;
  artDataUri?: string;
  artPositionX: string;
  artPositionY: string;
  artScale: string;
  artCropX: string;
  artCropY: string;
  artCropW: string;
  artCropH: string;
  artist: string;
  setSymbolPath: string;
  setSymbolUrl: string;
  watermark: string;
  status: CardRecord['status'];
  tags: string[];
  notes: string;
  variantId: string;
  variantDisplayName: string;
  variantKind: CardVariantRecord['kind'];
  variantStatus: CardVariantRecord['status'];
  variantIsPrimary: boolean;
  variantExportPolicy: CardVariantRecord['exportPolicy'];
  variantTags: string[];
  variantNotes: string;
  variantCreatedAt?: string;
  variantUpdatedAt?: string;
  variantSummaries: CardVariantSummary[];
  creationStatus?: CardRecord['status'];
  creationNotes?: string;
  sourceCard?: CardRecord;
  sourceFace?: CardFaceRecord;
}

export interface FrameOption {
  id: string;
  label: string;
  family: string;
  layout: CardRecord['layout'];
  frameType: string;
  renderable: boolean;
  description: string;
  supportedTypes: string[];
  source: 'basic-m15' | 'full-magic-pack' | 'figma' | 'genevensis' | 'private' | 'planned' | 'reference';
  supportState?: FrameSupportState;
  supportedBorderColors?: FrameBorderColor[];
}

export interface PreviewResponse {
  imageDataUri?: string;
  warnings: string[];
  inferredFrame: FrameOption;
  powerAssessment?: CardPowerAssessment;
}

export interface ImportCardsRequest {
  setCode: string;
  format: 'csv' | 'xml' | 'cockatrice' | 'planesculptors';
  mode: 'append' | 'replace';
  content: string;
  dryRun?: boolean;
}

export interface ImportCardsSummary {
  importedCards: number;
  importedFaces: number;
  importedVariants: number;
  importedVariantFaces: number;
  artReferences: number;
  missingArt: number;
  legacyRenderReferences: number;
  editableArtNeeded: number;
  parsedTokens: number;
  parsedSagas: number;
  possibleTransformCards: number;
  unsupportedLayouts: Array<{ layout: string; count: number }>;
  duplicates: Array<{ collectorNumber: string; cardIds: string[] }>;
  warnings: Array<{ code: string; severity: string; cardId?: string; collectorNumber?: string; name?: string; message: string }>;
  rawSourcePath?: string;
  reportPath?: string;
  mode: 'append' | 'replace';
  sourceFormat: ImportCardsRequest['format'];
  dryRun: boolean;
  markdownSummary: string;
}

export interface CockatriceSyncResult {
  xmlPath: string;
  zipPath?: string;
  imageCount: number;
  warnings: string[];
}
