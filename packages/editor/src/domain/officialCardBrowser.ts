import type {
  OfficialCardCategoryFilter,
  OfficialCardImageFilter,
  OfficialCardPriceCurrency,
  OfficialCardSearchFilters,
  OfficialCardSortDirection,
  OfficialCardSortKey
} from './editorTypes.js';

export type OfficialCardBrowserViewMode = 'list' | 'grid' | 'table' | 'single';
export type OfficialCardDetailMode = 'full' | 'image' | 'rules' | 'metadata';
export type OfficialCardActionTarget = '' | 'collection' | 'deck' | 'set';
export type OfficialCardSortOptionId =
  | 'auto'
  | 'name-asc'
  | 'name-desc'
  | 'released-desc'
  | 'released-asc'
  | 'price-asc'
  | 'price-desc'
  | 'manaValue-asc'
  | 'manaValue-desc'
  | 'rarity-asc'
  | 'rarity-desc'
  | 'set-asc'
  | 'colorIdentity-asc'
  | 'type-asc';

export interface OfficialCardBrowserFilters {
  setCode: string;
  rarity: string;
  colorIdentity: string;
  typeLine: string;
  layout: string;
  finish: string;
  lang: string;
  manaValueMin: string;
  manaValueMax: string;
  priceCurrency: OfficialCardPriceCurrency;
  priceMin: string;
  priceMax: string;
  releasedAfter: string;
  releasedBefore: string;
  year: string;
  hasImage: 'all' | OfficialCardImageFilter;
  cardCategory: 'all' | OfficialCardCategoryFilter;
}

export interface OfficialCardSortOption {
  id: OfficialCardSortOptionId;
  label: string;
  sort: OfficialCardSortKey;
  sortDirection: OfficialCardSortDirection;
}

export const OFFICIAL_CARD_VIEW_MODE_OPTIONS: Array<{ id: OfficialCardBrowserViewMode; label: string; icon: 'list' | 'grid' | 'view' | 'single' }> = [
  { id: 'list', label: 'List', icon: 'list' },
  { id: 'grid', label: 'Grid', icon: 'grid' },
  { id: 'table', label: 'Table', icon: 'view' },
  { id: 'single', label: 'Single', icon: 'single' }
];

export const OFFICIAL_CARD_DETAIL_MODE_OPTIONS: Array<{ id: OfficialCardDetailMode; label: string }> = [
  { id: 'full', label: 'Full' },
  { id: 'image', label: 'Image' },
  { id: 'rules', label: 'Rules' },
  { id: 'metadata', label: 'Metadata' }
];

export const OFFICIAL_CARD_SORT_OPTIONS: OfficialCardSortOption[] = [
  { id: 'auto', label: 'Best match', sort: 'auto', sortDirection: 'asc' },
  { id: 'name-asc', label: 'Name A-Z', sort: 'name', sortDirection: 'asc' },
  { id: 'name-desc', label: 'Name Z-A', sort: 'name', sortDirection: 'desc' },
  { id: 'released-desc', label: 'Released newest', sort: 'released', sortDirection: 'desc' },
  { id: 'released-asc', label: 'Released oldest', sort: 'released', sortDirection: 'asc' },
  { id: 'price-asc', label: 'Price low-high', sort: 'price', sortDirection: 'asc' },
  { id: 'price-desc', label: 'Price high-low', sort: 'price', sortDirection: 'desc' },
  { id: 'manaValue-asc', label: 'Mana value low-high', sort: 'manaValue', sortDirection: 'asc' },
  { id: 'manaValue-desc', label: 'Mana value high-low', sort: 'manaValue', sortDirection: 'desc' },
  { id: 'rarity-asc', label: 'Rarity common-mythic', sort: 'rarity', sortDirection: 'asc' },
  { id: 'rarity-desc', label: 'Rarity mythic-common', sort: 'rarity', sortDirection: 'desc' },
  { id: 'set-asc', label: 'Set / collector', sort: 'set', sortDirection: 'asc' },
  { id: 'colorIdentity-asc', label: 'Color identity', sort: 'colorIdentity', sortDirection: 'asc' },
  { id: 'type-asc', label: 'Type line', sort: 'type', sortDirection: 'asc' }
];

export const DEFAULT_OFFICIAL_CARD_FILTERS: OfficialCardBrowserFilters = {
  setCode: '',
  rarity: 'all',
  colorIdentity: 'all',
  typeLine: '',
  layout: 'all',
  finish: 'all',
  lang: '',
  manaValueMin: '',
  manaValueMax: '',
  priceCurrency: 'usd',
  priceMin: '',
  priceMax: '',
  releasedAfter: '',
  releasedBefore: '',
  year: '',
  hasImage: 'all',
  cardCategory: 'all'
};

export function officialCardSortOption(id: OfficialCardSortOptionId): OfficialCardSortOption {
  return OFFICIAL_CARD_SORT_OPTIONS.find((option) => option.id === id) ?? OFFICIAL_CARD_SORT_OPTIONS[0]!;
}

export function officialCardActiveFilterCount(filters: OfficialCardBrowserFilters): number {
  return [
    filters.setCode,
    filters.rarity !== 'all' ? filters.rarity : '',
    filters.colorIdentity !== 'all' ? filters.colorIdentity : '',
    filters.typeLine,
    filters.layout !== 'all' ? filters.layout : '',
    filters.finish !== 'all' ? filters.finish : '',
    filters.lang,
    filters.manaValueMin,
    filters.manaValueMax,
    filters.priceMin,
    filters.priceMax,
    filters.releasedAfter,
    filters.releasedBefore,
    filters.year,
    filters.hasImage !== 'all' ? filters.hasImage : '',
    filters.cardCategory !== 'all' ? filters.cardCategory : ''
  ].filter((value) => String(value).trim()).length;
}

export function officialCardSearchFiltersFromBrowser(args: {
  view: OfficialCardSearchFilters['view'];
  query: string;
  filters: OfficialCardBrowserFilters;
  sortOptionId: OfficialCardSortOptionId;
  limit: number;
  offset: number;
}): OfficialCardSearchFilters {
  const sort = officialCardSortOption(args.sortOptionId);
  const filters = args.filters;
  return {
    view: args.view,
    query: args.query,
    setCode: normalizedString(filters.setCode)?.toUpperCase(),
    rarity: filters.rarity === 'all' ? undefined : filters.rarity,
    colorIdentity: filters.colorIdentity === 'all' ? undefined : filters.colorIdentity,
    typeLine: normalizedString(filters.typeLine),
    layout: filters.layout === 'all' ? undefined : filters.layout,
    finish: filters.finish === 'all' ? undefined : filters.finish,
    lang: normalizedString(filters.lang)?.toLowerCase(),
    manaValueMin: numericFilter(filters.manaValueMin),
    manaValueMax: numericFilter(filters.manaValueMax),
    priceCurrency: filters.priceCurrency,
    priceMin: numericFilter(filters.priceMin),
    priceMax: numericFilter(filters.priceMax),
    releasedAfter: normalizedString(filters.releasedAfter),
    releasedBefore: normalizedString(filters.releasedBefore),
    year: normalizedString(filters.year),
    hasImage: filters.hasImage === 'all' ? undefined : filters.hasImage,
    cardCategory: filters.cardCategory === 'all' ? undefined : filters.cardCategory,
    sort: sort.sort,
    sortDirection: sort.sortDirection,
    limit: args.limit,
    offset: args.offset
  };
}

function normalizedString(value: string): string | undefined {
  const cleaned = value.trim();
  return cleaned || undefined;
}

function numericFilter(value: string): number | undefined {
  const cleaned = value.trim();
  if (!cleaned) {
    return undefined;
  }
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : undefined;
}
