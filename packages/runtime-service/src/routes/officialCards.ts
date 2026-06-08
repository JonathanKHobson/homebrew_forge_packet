import {
  addOfficialCardToCollection,
  addOfficialCardToDeck,
  listOfficialCardPrintVariants,
  listCollections,
  listDecks,
  officialCardCatalogStatus,
  searchOfficialCards,
  type AddOfficialCardToCollectionRequest,
  type AddOfficialCardToDeckRequest,
  type OfficialCardSearchFilters
} from '@homebrew-forge/forge';

export function readRuntimeOfficialCardStatus(repoRoot: string) {
  return officialCardCatalogStatus(repoRoot);
}

export function searchRuntimeOfficialCards(repoRoot: string, params: URLSearchParams) {
  const filters: OfficialCardSearchFilters = {
    view: officialCatalogViewParam(params.get('view')),
    query: params.get('query') ?? '',
    setCode: params.get('setCode') ?? undefined,
    rarity: params.get('rarity') ?? undefined,
    colorIdentity: params.get('colorIdentity') ?? undefined,
    typeLine: params.get('typeLine') ?? undefined,
    layout: params.get('layout') ?? undefined,
    finish: params.get('finish') ?? undefined,
    lang: params.get('lang') ?? undefined,
    manaValueMin: numberParam(params.get('manaValueMin')),
    manaValueMax: numberParam(params.get('manaValueMax')),
    priceCurrency: officialPriceCurrencyParam(params.get('priceCurrency')),
    priceMin: numberParam(params.get('priceMin')),
    priceMax: numberParam(params.get('priceMax')),
    releasedAfter: params.get('releasedAfter') ?? undefined,
    releasedBefore: params.get('releasedBefore') ?? undefined,
    year: params.get('year') ?? undefined,
    hasImage: officialImageFilterParam(params.get('hasImage')),
    cardCategory: officialCardCategoryParam(params.get('cardCategory')),
    sort: officialCardSortParam(params.get('sort')),
    sortDirection: params.get('sortDirection') === 'desc' ? 'desc' : params.get('sortDirection') === 'asc' ? 'asc' : undefined,
    limit: numberParam(params.get('limit')),
    offset: numberParam(params.get('offset'))
  };
  return searchOfficialCards(repoRoot, filters);
}

export function listRuntimeOfficialCardPrintVariants(repoRoot: string, params: URLSearchParams) {
  return listOfficialCardPrintVariants(repoRoot, {
    cardId: params.get('cardId') ?? undefined,
    oracleId: params.get('oracleId') ?? undefined,
    variantKey: params.get('variantKey') ?? undefined,
    name: params.get('name') ?? undefined,
    query: params.get('query') ?? undefined,
    limit: numberParam(params.get('limit')),
    offset: numberParam(params.get('offset'))
  });
}

export async function addRuntimeOfficialCardToCollection(repoRoot: string, request: AddOfficialCardToCollectionRequest) {
  const collection = await addOfficialCardToCollection(repoRoot, request);
  return { collections: await listCollections(repoRoot), collection };
}

export async function addRuntimeOfficialCardToDeck(repoRoot: string, request: AddOfficialCardToDeckRequest) {
  const deck = await addOfficialCardToDeck(repoRoot, request);
  return { decks: await listDecks(repoRoot), deck };
}

function numberParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function officialCatalogViewParam(value: string | null): OfficialCardSearchFilters['view'] {
  return value === 'oracle' || value === 'unique' ? value : 'prints';
}

function officialPriceCurrencyParam(value: string | null): OfficialCardSearchFilters['priceCurrency'] {
  return value === 'usdFoil' || value === 'eur' || value === 'eurFoil' || value === 'tix' ? value : value === 'usd' ? 'usd' : undefined;
}

function officialImageFilterParam(value: string | null): OfficialCardSearchFilters['hasImage'] {
  return value === 'yes' || value === 'no' ? value : undefined;
}

function officialCardCategoryParam(value: string | null): OfficialCardSearchFilters['cardCategory'] {
  return value === 'normal' || value === 'token' || value === 'art' || value === 'extra' || value === 'funny' ? value : undefined;
}

function officialCardSortParam(value: string | null): OfficialCardSearchFilters['sort'] {
  return value === 'auto' ||
    value === 'relevance' ||
    value === 'name' ||
    value === 'released' ||
    value === 'price' ||
    value === 'manaValue' ||
    value === 'rarity' ||
    value === 'set' ||
    value === 'colorIdentity' ||
    value === 'type'
    ? value
    : undefined;
}
