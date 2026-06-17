export type OfficialCardCatalogView = 'prints' | 'unique' | 'oracle';
export type OfficialCardSyncView = 'prints' | 'oracle' | 'both';
export type OfficialCardSortKey = 'auto' | 'relevance' | 'name' | 'released' | 'price' | 'manaValue' | 'rarity' | 'set' | 'colorIdentity' | 'type';
export type OfficialCardSortDirection = 'asc' | 'desc';
export type OfficialCardPriceCurrency = 'usd' | 'usdFoil' | 'eur' | 'eurFoil' | 'tix';
export type OfficialCardImageFilter = 'yes' | 'no';
export type OfficialCardCategoryFilter = 'normal' | 'token' | 'art' | 'extra' | 'funny';

export interface OfficialCardImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  artCrop?: string;
  borderCrop?: string;
}

export interface OfficialCardPrices {
  usd?: string;
  usdFoil?: string;
  eur?: string;
  eurFoil?: string;
  tix?: string;
}

export interface OfficialCardFace {
  name?: string;
  manaCost?: string;
  typeLine?: string;
  oracleText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors?: string[];
  imageUris?: OfficialCardImageUris;
}

export interface OfficialCardBase {
  id: string;
  oracleId?: string;
  variantKey?: string;
  variantCount?: number;
  filteredVariantCount?: number;
  name: string;
  manaCost?: string;
  manaValue?: number;
  typeLine?: string;
  oracleText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  defense?: string;
  colors: string[];
  colorIdentity: string[];
  layout?: string;
  scryfallUri?: string;
  imageUris?: OfficialCardImageUris;
  cardFaces?: OfficialCardFace[];
}

export interface OfficialCardPrint extends OfficialCardBase {
  view: 'prints';
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  rarity?: string;
  releasedAt?: string;
  finishes: string[];
  lang?: string;
  prices?: OfficialCardPrices;
}

export interface OfficialCardOracle extends OfficialCardBase {
  view: 'oracle';
  printSearchUri?: string;
}

export type OfficialCardSearchCard = OfficialCardPrint | OfficialCardOracle;

export interface OfficialCardCacheSourceStatus {
  available: boolean;
  count: number;
  syncedAt?: string;
  upstreamUpdatedAt?: string;
  downloadUri?: string;
}

export interface OfficialCardCatalogStatus {
  version: 1;
  cacheDir: string;
  checkedAt: string;
  prints: OfficialCardCacheSourceStatus;
  oracle: OfficialCardCacheSourceStatus;
  lastError?: string;
}

export interface OfficialCardSearchFilters {
  view?: OfficialCardCatalogView;
  query?: string;
  setCode?: string;
  rarity?: string;
  colorIdentity?: string;
  typeLine?: string;
  layout?: string;
  finish?: string;
  lang?: string;
  manaValueMin?: number;
  manaValueMax?: number;
  priceCurrency?: OfficialCardPriceCurrency;
  priceMin?: number;
  priceMax?: number;
  releasedAfter?: string;
  releasedBefore?: string;
  year?: string;
  hasImage?: OfficialCardImageFilter;
  cardCategory?: OfficialCardCategoryFilter;
  sort?: OfficialCardSortKey;
  sortDirection?: OfficialCardSortDirection;
  limit?: number;
  offset?: number;
}

export interface OfficialCardSearchResult {
  view: OfficialCardCatalogView;
  query: string;
  total: number;
  limit: number;
  offset: number;
  sort: OfficialCardSortKey;
  sortDirection: OfficialCardSortDirection;
  unsupportedQueryTerms: string[];
  cards: OfficialCardSearchCard[];
  status: OfficialCardCatalogStatus;
}

export interface OfficialCardPrintVariantsResult {
  variantKey: string;
  oracleId?: string;
  name: string;
  total: number;
  limit: number;
  offset: number;
  cards: OfficialCardPrint[];
  status: OfficialCardCatalogStatus;
}

export interface OfficialCardSyncOptions {
  view?: OfficialCardSyncView;
  fetchImpl?: typeof fetch;
  syncedAt?: string;
}

export interface AddOfficialCardToCollectionRequest {
  cardId: string;
  collectionId?: string;
  collectionName?: string;
  linkedUniverseId?: string;
  quantity?: number;
  kind?: 'binder' | 'list';
  listCategory?: 'general' | 'wishlist' | 'recommendation' | 'starred' | 'flagged' | 'gift';
  ownershipStatus?: 'owned' | 'wanted' | 'recommended' | 'reference' | 'proxy' | 'homebrew_unprinted';
  ownerName?: string;
  tags?: string[];
  starred?: boolean;
  flagged?: boolean;
  proxy?: boolean;
  homebrew?: boolean;
  finish?: string;
  condition?: string;
  language?: string;
  location?: string;
}

export interface AddOfficialCardToDeckRequest {
  cardId: string;
  deckId: string;
  section?: 'main' | 'side' | 'maybe';
  quantity?: number;
  collectionId?: string;
  collectionName?: string;
  linkedUniverseId?: string;
  finish?: string;
  condition?: string;
  language?: string;
  location?: string;
}

export interface AddOfficialCardToSetRequest {
  cardId: string;
  setCode: string;
  cardIdOverride?: string;
  collectorNumber?: string;
  status?: 'idea' | 'draft' | 'review' | 'playtest' | 'final' | 'cut' | 'archived';
}
