import type { CardSummary, CollectionKind, CollectionListCategory, CollectionOwnershipStatus, CollectionState, CollectionSummary, DeckState, DeckSummary, EditorProject, LibraryState } from './editorTypes.js';
import { normalizeCollectionOwnerName } from './collectionOwnership.js';
import { collectionValueEstimateFromEntry, metadataFromCollectionEntry } from './officialCardMetadata.js';

export type DashboardScopeKind = 'all' | 'project' | 'set' | 'deck' | 'collection' | 'binder' | 'list' | 'custom';
export type DashboardSourceKind = 'authored_card' | 'deck_entry' | 'collection_row';
export type DashboardRecommendationSeverity = 'good' | 'info' | 'watch' | 'risk';

export interface DashboardScope {
  kind: DashboardScopeKind;
  id: string;
  label: string;
  deckVariantId?: string;
  deckVariantName?: string;
  customKeys?: Set<string>;
}

export interface DashboardScopeOption {
  value: string;
  label: string;
  detail: string;
}

export interface DashboardCardFact {
  key: string;
  sourceKind: DashboardSourceKind;
  sourceId: string;
  sourceName: string;
  projectId?: string;
  setCode?: string;
  setName?: string;
  deckId?: string;
  deckVariantId?: string;
  deckVariantName?: string;
  activeDeckVariant?: boolean;
  collectionId?: string;
  collectionKind?: CollectionKind;
  collectionListCategory?: CollectionListCategory;
  ownershipStatus?: CollectionOwnershipStatus;
  ownerName?: string;
  cardId?: string;
  variantId?: string;
  name: string;
  quantity: number;
  section?: string;
  typeLine: string;
  manaCost: string;
  colors: string[];
  colorIdentity: string[];
  supertypes: string[];
  cardTypes: string[];
  subtypes: string[];
  keywords: string[];
  tags: string[];
  status?: string;
  rarity?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  layout?: string;
  frameType?: string;
  reviewStatus?: string;
  matchStrategy?: string;
  hasArt?: boolean;
  needsReview?: boolean;
  manaValue?: number;
  oracleText?: string;
  purchaseValue?: number;
  purchaseCurrency?: string;
  marketValue?: number;
  marketCurrency?: string;
  flagged?: boolean;
  markedForDeletion?: boolean;
  deckRoles: string[];
  roleSource?: string;
  candidateStatus?: string;
  impactRating?: number;
  synergyRating?: number;
  qualityRating?: number;
  searchText: string;
}

export interface DashboardChartDatum {
  label: string;
  value: number;
  detail?: string;
  tone?: string;
}

export interface DashboardProbabilityDatum {
  label: string;
  hits: number;
  draws: number;
  need: number;
  probability: number;
  detail: string;
}

export interface DashboardRecommendation {
  id: string;
  severity: DashboardRecommendationSeverity;
  title: string;
  body: string;
  source: string;
}

export interface DashboardCubeCell {
  color: string;
  type: string;
  value: number;
}

export interface DashboardStats {
  totalRows: number;
  totalQuantity: number;
  uniqueNames: number;
  authoredQuantity: number;
  deckQuantity: number;
  collectionQuantity: number;
  collectionEstimatedValue: number;
  collectionValueRows: number;
  collectionValueCurrency: string;
  collectionPurchaseValue: number;
  collectionPurchaseRows: number;
  collectionPurchaseCurrency: string;
  collectionFlaggedRows: number;
  collectionDeletionRows: number;
  missingArt: number;
  reviewRows: number;
  unresolvedRows: number;
  metadataGapRows: number;
  landCount: number;
  creatureCount: number;
  nonCreatureNonLandCount: number;
  sourceRows: DashboardChartDatum[];
  typeRows: DashboardChartDatum[];
  creatureTypeRows: DashboardChartDatum[];
  subtypeRows: DashboardChartDatum[];
  supertypeRows: DashboardChartDatum[];
  colorRows: DashboardChartDatum[];
  manaRows: DashboardChartDatum[];
  keywordRows: DashboardChartDatum[];
  roleRows: DashboardChartDatum[];
  reviewRowsByStatus: DashboardChartDatum[];
  deckRatioRows: DashboardChartDatum[];
  landManaRows: DashboardChartDatum[];
  probabilityRows: DashboardProbabilityDatum[];
  recommendationRows: DashboardRecommendation[];
  cubeRows: DashboardCubeCell[];
}

interface BuildDashboardFactsArgs {
  library: LibraryState | null;
  projectsBySet: Record<string, EditorProject>;
  currentProject: EditorProject | null;
  currentCards: CardSummary[];
  decks: DeckSummary[];
  deckStates: Record<string, DeckState>;
  collections: CollectionSummary[];
  collectionStates: Record<string, CollectionState>;
}

interface DashboardCardLike {
  cardId?: string;
  activeVariantId?: string;
  primaryVariantId?: string;
  name?: string;
  typeLine?: string;
  manaCost?: string;
  manaValue?: number;
  colors?: string;
  colorIdentity?: string;
  oracleText?: string;
  flavorText?: string;
  power?: string;
  toughness?: string;
  layout?: string;
  frameType?: string;
  tags?: string[];
  status?: string;
  rarity?: string;
  hasArt?: boolean;
  needsReview?: boolean;
  collectionId?: string;
  collectionKind?: CollectionKind;
  collectionListCategory?: CollectionListCategory;
  ownershipStatus?: CollectionOwnershipStatus;
  ownerName?: string;
}

interface CollectionDeckValueSource {
  purchaseAmount?: number;
  purchaseCurrency?: string;
  marketAmount?: number;
  marketCurrency?: string;
  ownerName?: string;
  ownershipStatus?: CollectionOwnershipStatus;
}

const CARD_TYPES = new Set(['artifact', 'battle', 'creature', 'enchantment', 'instant', 'kindred', 'land', 'planeswalker', 'sorcery', 'token']);
const SUPERTYPES = new Set(['basic', 'legendary', 'ongoing', 'snow', 'world']);
const COLOR_LABELS: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless'
};

const KEYWORD_TERMS = [
  'adapt',
  'affinity',
  'afterlife',
  'amass',
  'annihilator',
  'ascend',
  'backup',
  'bargain',
  'battle cry',
  'blitz',
  'bloodthirst',
  'cascade',
  'casualty',
  'champion',
  'changeling',
  'cipher',
  'cleave',
  'companion',
  'convoke',
  'crew',
  'cycling',
  'dash',
  'daybound',
  'deathtouch',
  'defender',
  'delve',
  'descend',
  'discover',
  'disturb',
  'double strike',
  'dredge',
  'echo',
  'embalm',
  'emerge',
  'enlist',
  'equip',
  'escalate',
  'escape',
  'exalted',
  'exploit',
  'explore',
  'fabricate',
  'first strike',
  'flash',
  'flashback',
  'flying',
  'foretell',
  'haste',
  'hexproof',
  'indestructible',
  'kicker',
  'landfall',
  'lifelink',
  'madness',
  'menace',
  'mentor',
  'mill',
  'modular',
  'mutate',
  'ninjutsu',
  'outlast',
  'overload',
  'persist',
  'proliferate',
  'prowess',
  'raid',
  'reach',
  'rebound',
  'reconfigure',
  'riot',
  'scry',
  'skulk',
  'spectacle',
  'surveil',
  'suspend',
  'toxic',
  'trample',
  'transform',
  'undying',
  'unearth',
  'vigilance',
  'ward'
];

export function buildDashboardFacts({
  library,
  projectsBySet,
  currentProject,
  currentCards,
  decks,
  deckStates,
  collections,
  collectionStates
}: BuildDashboardFactsArgs): DashboardCardFact[] {
  const facts: DashboardCardFact[] = [];
  const setsByCode = new Map((library?.sets ?? []).map((set) => [set.setCode, set]));
  const projects = new Map<string, EditorProject>(Object.entries(projectsBySet));
  if (currentProject) {
    projects.set(currentProject.setCode, currentProject);
  }
  const deckValueSources = buildCollectionDeckValueIndex(collections, collectionStates);

  for (const [setCode, project] of projects) {
    const setSummary = setsByCode.get(setCode);
    const cards = currentProject?.setCode === setCode ? currentCards : project.cards;
    for (const card of cards) {
      facts.push(cardSummaryToFact(card, {
        key: `authored:${setCode}:${card.cardId}:${card.activeVariantId ?? card.primaryVariantId}`,
        sourceKind: 'authored_card',
        sourceId: setCode,
        sourceName: project.setName,
        projectId: setSummary?.universeId,
        setCode,
        setName: project.setName,
        quantity: 1
      }));
    }
  }

  for (const deck of decks) {
    const deckState = deckStates[deck.deckId];
    if (!deckState) {
      continue;
    }
    const activeVariantId = deckState.activeVariantId || deck.activeVariantId;
    const variantsById = new Map(deckState.metadata.variants.map((variant) => [variant.variantId, variant]));
    const commanderReferences = deckState.metadata.variants.length ? deckState.metadata.variants : [{ ...deckState.activeVariant, variantId: activeVariantId || deckState.activeVariant.variantId }];
    for (const variant of commanderReferences) {
      const commander = variant.commander ?? deckState.metadata.commander;
      const commanderCard = commander ? deckState.availableCards.find((card) => card.setCode === commander.setCode && card.cardId === commander.cardId) : undefined;
      if (!commander || !commanderCard) {
        continue;
      }
      const commanderValueSource = collectionDeckValueForCard(deckValueSources, commander.cardId, commanderCard, commander.nameSnapshot);
      facts.push(cardSummaryToFact(commanderCard, {
        key: `deck:${deck.deckId}:${variant.variantId}:commander:${commander.setCode}:${commander.cardId}`,
        sourceKind: 'deck_entry',
        sourceId: deck.deckId,
        sourceName: deck.name,
        projectId: deck.linkedUniverseId,
        setCode: commander.setCode,
        setName: commanderCard.setName,
        deckId: deck.deckId,
        deckVariantId: variant.variantId,
        deckVariantName: variant.name,
        activeDeckVariant: variant.variantId === activeVariantId,
        cardId: commander.cardId,
        variantId: commander.variantId,
        quantity: 1,
        section: 'commander',
        name: commanderCard.name,
        tags: [...(variant.tags ?? []), 'commander-zone'],
        status: 'active',
        deckRoles: ['commander'],
        roleSource: 'manual',
        candidateStatus: 'active',
        purchaseValue: commanderValueSource?.purchaseAmount,
        purchaseCurrency: commanderValueSource?.purchaseCurrency,
        marketValue: commanderValueSource?.marketAmount,
        marketCurrency: commanderValueSource?.marketCurrency,
        ownershipStatus: commanderCard.ownershipStatus ?? commanderValueSource?.ownershipStatus,
        ownerName: commanderCard.ownerName ?? commanderValueSource?.ownerName
      }));
    }
    const deckEntries = deckState.entries.filter((entry) => !entry.markedForDeletion && entry.candidateStatus !== 'candidate' && entry.candidateStatus !== 'cut');
    for (const [index, entry] of deckEntries.entries()) {
      const card = entry.card;
      const fallbackProject = entry.setCode ? projects.get(entry.setCode) : undefined;
      const fallbackCard = fallbackProject?.cards.find((candidate) => candidate.cardId === entry.cardId);
      const cardLike = card ?? fallbackCard;
      const entryVariantId = entry.deckVariantId || activeVariantId;
      const entryVariant = entryVariantId ? variantsById.get(entryVariantId) : undefined;
      const deckValueSource = collectionDeckValueForEntry(deckValueSources, entry, cardLike);
      facts.push(cardSummaryToFact(cardLike, {
        key: `deck:${deck.deckId}:${entryVariantId ?? 'default'}:${entry.section}:${entry.setCode}:${entry.cardId}:${entry.variantId ?? ''}:${index}`,
        sourceKind: 'deck_entry',
        sourceId: deck.deckId,
        sourceName: deck.name,
        projectId: deck.linkedUniverseId,
        setCode: entry.setCode,
        setName: card?.setName ?? fallbackProject?.setName,
        deckId: deck.deckId,
        deckVariantId: entryVariantId,
        deckVariantName: entryVariant?.name,
        activeDeckVariant: !entryVariantId || entryVariantId === activeVariantId,
        cardId: entry.cardId,
        variantId: entry.variantId,
        quantity: entry.count,
        section: entry.section,
        name: cardLike?.name ?? entry.nameSnapshot ?? entry.cardId,
        tags: [...(entry.entryTags ?? []), ...(entry.flags ?? [])],
        status: entry.candidateStatus ?? cardLike?.status,
        deckRoles: entry.roles ?? [],
        roleSource: entry.roleSource,
        candidateStatus: entry.candidateStatus,
        impactRating: entry.impactRating,
        synergyRating: entry.synergyRating,
        qualityRating: entry.qualityRating,
        purchaseValue: deckValueSource?.purchaseAmount === undefined ? undefined : deckValueSource.purchaseAmount * entry.count,
        purchaseCurrency: deckValueSource?.purchaseCurrency,
        marketValue: deckValueSource?.marketAmount === undefined ? undefined : deckValueSource.marketAmount * entry.count,
        marketCurrency: deckValueSource?.marketCurrency,
        ownershipStatus: card?.ownershipStatus ?? deckValueSource?.ownershipStatus,
        ownerName: card?.ownerName ?? deckValueSource?.ownerName,
        flagged: Boolean(entry.starred || entry.flags?.length),
        markedForDeletion: entry.markedForDeletion,
        warning: entry.warning
      }));
    }
  }

  for (const collection of collections) {
    const collectionState = collectionStates[collection.collectionId];
    if (!collectionState) {
      continue;
    }
    for (const entry of collectionState.entries) {
      const linkedSetCode = entry.linkedSetCode || entry.setCode;
      const linkedProject = linkedSetCode ? projects.get(linkedSetCode) : undefined;
      const linkedCard = linkedProject?.cards.find((candidate) => candidate.cardId === entry.linkedCardId);
      const collectionCard = linkedCard ?? metadataFromCollectionEntry(entry);
      const valueEstimate = collectionValueEstimateFromEntry(entry);
      const ownerName = normalizeCollectionOwnerName(entry.ownerName);
      facts.push(cardSummaryToFact(collectionCard, {
        key: `collection:${collection.collectionId}:${entry.entryId}`,
        sourceKind: 'collection_row',
        sourceId: collection.collectionId,
        sourceName: collection.name,
        projectId: collection.linkedUniverseId,
        setCode: linkedSetCode,
        setName: entry.setName ?? linkedProject?.setName,
        collectionId: collection.collectionId,
        collectionKind: collection.kind ?? 'binder',
        collectionListCategory: collection.listCategory ?? 'general',
        ownershipStatus: entry.ownershipStatus,
        ownerName,
        cardId: entry.linkedCardId,
        variantId: entry.linkedVariantId,
        quantity: entry.quantity,
        name: collectionCard?.name ?? entry.cardName,
        reviewStatus: entry.reviewStatus,
        matchStrategy: entry.matchStrategy,
        status: entry.reviewStatus,
        tags: [entry.finish, entry.condition, entry.language, entry.location, entry.source, collection.kind ?? 'binder', collection.listCategory ?? 'general', entry.ownershipStatus, ownerName, ...(entry.tags ?? [])].filter(Boolean) as string[],
        purchaseValue: entry.purchasePrice === undefined ? undefined : entry.purchasePrice * entry.quantity,
        purchaseCurrency: entry.purchaseCurrency,
        marketValue: valueEstimate ? valueEstimate.amount * entry.quantity : undefined,
        marketCurrency: valueEstimate?.currency,
        flagged: entry.flagged,
        markedForDeletion: entry.markedForDeletion
      }));
    }
  }

  return facts;
}

function buildCollectionDeckValueIndex(collections: CollectionSummary[], collectionStates: Record<string, CollectionState>): {
  byCardId: Map<string, CollectionDeckValueSource[]>;
  byName: Map<string, CollectionDeckValueSource[]>;
} {
  const byCardId = new Map<string, CollectionDeckValueSource[]>();
  const byName = new Map<string, CollectionDeckValueSource[]>();
  for (const collection of collections) {
    const collectionState = collectionStates[collection.collectionId];
    if (!collectionState) {
      continue;
    }
    for (const entry of collectionState.entries) {
      const valueEstimate = collectionValueEstimateFromEntry(entry);
      const source: CollectionDeckValueSource = {
        purchaseAmount: entry.purchasePrice,
        purchaseCurrency: entry.purchaseCurrency,
        marketAmount: valueEstimate?.amount,
        marketCurrency: valueEstimate?.currency,
        ownerName: normalizeCollectionOwnerName(entry.ownerName),
        ownershipStatus: entry.ownershipStatus
      };
      if (source.purchaseAmount === undefined && source.marketAmount === undefined) {
        continue;
      }
      addCollectionDeckValueSource(byName, normalizedName(entry.cardName), source);
      for (const cardId of [entry.scryfallId, entry.linkedCardId].map(normalizedId).filter(Boolean)) {
        addCollectionDeckValueSource(byCardId, cardId, source);
      }
    }
  }
  return { byCardId, byName };
}

function collectionDeckValueForEntry(
  index: { byCardId: Map<string, CollectionDeckValueSource[]>; byName: Map<string, CollectionDeckValueSource[]> },
  entry: DeckState['entries'][number],
  card: DashboardCardLike | undefined
): CollectionDeckValueSource | undefined {
  return collectionDeckValueForCard(index, entry.cardId, card, entry.nameSnapshot ?? entry.cardId);
}

function collectionDeckValueForCard(
  index: { byCardId: Map<string, CollectionDeckValueSource[]>; byName: Map<string, CollectionDeckValueSource[]> },
  cardId: string | undefined,
  card: DashboardCardLike | undefined,
  fallbackName?: string
): CollectionDeckValueSource | undefined {
  for (const candidateCardId of [cardId, card?.cardId].map(normalizedId).filter(Boolean)) {
    const exact = pickPreferredCollectionDeckValueSource(index.byCardId.get(candidateCardId));
    if (exact) {
      return exact;
    }
  }
  return pickPreferredCollectionDeckValueSource(index.byName.get(normalizedName(card?.name ?? fallbackName)));
}

function addCollectionDeckValueSource(map: Map<string, CollectionDeckValueSource[]>, key: string, source: CollectionDeckValueSource) {
  if (!key) {
    return;
  }
  map.set(key, [...(map.get(key) ?? []), source]);
}

function pickPreferredCollectionDeckValueSource(sources: CollectionDeckValueSource[] | undefined): CollectionDeckValueSource | undefined {
  return sources
    ?.slice()
    .sort((left, right) => collectionDeckValueSourceScore(right) - collectionDeckValueSourceScore(left))[0];
}

function collectionDeckValueSourceScore(source: CollectionDeckValueSource): number {
  let score = 0;
  if (source.ownershipStatus === 'owned') {
    score += 4;
  }
  if (source.marketAmount !== undefined) {
    score += 2;
  }
  if (source.purchaseAmount !== undefined) {
    score += 1;
  }
  return score;
}

export function filterDashboardFacts(facts: DashboardCardFact[], scope: DashboardScope, query: string): DashboardCardFact[] {
  const normalizedQuery = query.trim().toLowerCase();
  return facts.filter((fact) => {
    if (scope.kind === 'project') {
      if (fact.sourceKind !== 'authored_card') {
        return false;
      }
      if (scope.id && fact.projectId !== scope.id) {
        return false;
      }
    }
    if (scope.kind === 'set') {
      if (fact.sourceKind !== 'authored_card') {
        return false;
      }
      if (scope.id && fact.setCode !== scope.id) {
        return false;
      }
    }
    if (scope.kind === 'deck') {
      if (fact.sourceKind !== 'deck_entry') {
        return false;
      }
      if (scope.id && fact.deckId !== scope.id) {
        return false;
      }
    }
    if (scope.kind === 'collection') {
      if (fact.sourceKind !== 'collection_row') {
        return false;
      }
      if (scope.id && fact.collectionId !== scope.id) {
        return false;
      }
    }
    if (scope.kind === 'binder') {
      if (fact.sourceKind !== 'collection_row' || fact.collectionKind === 'list') {
        return false;
      }
      if (scope.id && fact.collectionId !== scope.id) {
        return false;
      }
    }
    if (scope.kind === 'list') {
      if (fact.sourceKind !== 'collection_row' || fact.collectionKind !== 'list') {
        return false;
      }
      if (scope.id && fact.collectionId !== scope.id) {
        return false;
      }
    }
    if (scope.kind === 'custom' && scope.customKeys?.size && !scope.customKeys.has(fact.key)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return fact.searchText.includes(normalizedQuery);
  });
}

export function buildDashboardScopeOptions(kind: DashboardScopeKind, library: LibraryState | null, decks: DeckSummary[], collections: CollectionSummary[]): DashboardScopeOption[] {
  if (kind === 'project') {
    return (library?.universes ?? []).map((project) => ({
      value: project.id,
      label: project.name,
      detail: project.status ?? 'project'
    }));
  }
  if (kind === 'set') {
    return (library?.sets ?? []).map((set) => ({
      value: set.setCode,
      label: `${set.setCode} - ${set.setName}`,
      detail: `${set.cardCount} cards`
    }));
  }
  if (kind === 'deck') {
    return decks.map((deck) => ({
      value: deck.deckId,
      label: deck.name,
      detail: `${deck.mainCount}/${deck.sideCount}/${deck.maybeCount}`
    }));
  }
  if (kind === 'collection') {
    return collections.map((collection) => ({
      value: collection.collectionId,
      label: collection.name,
      detail: `${collection.cardCount} cards, ${collection.reviewCount} review`
    }));
  }
  if (kind === 'binder') {
    return collections.filter((collection) => collection.kind !== 'list').map((collection) => ({
      value: collection.collectionId,
      label: collection.name,
      detail: `${collection.cardCount} cards, ${collection.reviewCount} review`
    }));
  }
  if (kind === 'list') {
    return collections.filter((collection) => collection.kind === 'list').map((collection) => ({
      value: collection.collectionId,
      label: collection.name,
      detail: `${collection.cardCount} references, ${collection.reviewCount} review`
    }));
  }
  return [];
}

export function computeDashboardStats(facts: DashboardCardFact[], scope: DashboardScope): DashboardStats {
  const totalQuantity = sum(facts.map((fact) => fact.quantity));
  const uniqueNames = new Set(facts.map((fact) => fact.name.toLowerCase())).size;
  const source = new Map<string, number>();
  const types = new Map<string, number>();
  const creatureTypes = new Map<string, number>();
  const subtypes = new Map<string, number>();
  const supertypes = new Map<string, number>();
  const colors = new Map<string, number>();
  const mana = new Map<string, number>();
  const keywords = new Map<string, number>();
  const roles = new Map<string, number>();
  const review = new Map<string, number>();
  const landMana = new Map<string, number>();
  const cube = new Map<string, DashboardCubeCell>();
  let authoredQuantity = 0;
  let deckQuantity = 0;
  let collectionQuantity = 0;
  let collectionEstimatedValue = 0;
  let collectionValueRows = 0;
  let collectionValueCurrency = 'USD';
  let collectionPurchaseValue = 0;
  let collectionPurchaseRows = 0;
  let collectionPurchaseCurrency = 'USD';
  let collectionFlaggedRows = 0;
  let collectionDeletionRows = 0;
  let missingArt = 0;
  let reviewRows = 0;
  let unresolvedRows = 0;
  let metadataGapRows = 0;
  let landCount = 0;
  let creatureCount = 0;
  let nonCreatureNonLandCount = 0;

  for (const fact of facts) {
    const quantity = fact.quantity;
    add(source, sourceKindLabel(fact.sourceKind), quantity);
    if (fact.sourceKind === 'authored_card') {
      authoredQuantity += quantity;
    } else if (fact.sourceKind === 'deck_entry') {
      deckQuantity += quantity;
    } else {
      collectionQuantity += quantity;
      if (fact.flagged) {
        collectionFlaggedRows += quantity;
      }
      if (fact.markedForDeletion) {
        collectionDeletionRows += quantity;
      }
    }
    if (fact.marketValue !== undefined) {
      collectionEstimatedValue += fact.marketValue;
      collectionValueRows += 1;
      collectionValueCurrency = fact.marketCurrency ?? collectionValueCurrency;
    }
    if (fact.purchaseValue !== undefined) {
      collectionPurchaseValue += fact.purchaseValue;
      collectionPurchaseRows += 1;
      collectionPurchaseCurrency = fact.purchaseCurrency ?? collectionPurchaseCurrency;
    }
    if (fact.hasArt === false) {
      missingArt += quantity;
    }
    if (fact.reviewStatus === 'needs_review' || fact.needsReview) {
      reviewRows += quantity;
    }
    if (fact.matchStrategy === 'unresolved') {
      unresolvedRows += quantity;
    }
    if (fact.reviewStatus) {
      add(review, titleCase(fact.reviewStatus.replace(/_/g, ' ')), quantity);
    }

    const hasTypedMetadata = fact.cardTypes.length > 0;
    if (!hasTypedMetadata) {
      metadataGapRows += quantity;
    }
    const factTypes = hasTypedMetadata ? fact.cardTypes : [];
    for (const type of factTypes) {
      add(types, titleCase(type), quantity);
    }

    const isLand = fact.cardTypes.includes('land');
    const isCreature = fact.cardTypes.includes('creature');
    for (const supertype of fact.supertypes) {
      add(supertypes, titleCase(supertype), quantity);
    }
    for (const subtype of fact.subtypes) {
      const label = titleCase(subtype);
      add(subtypes, label, quantity);
      if (isCreature) {
        add(creatureTypes, label, quantity);
      }
    }
    if (isLand) {
      landCount += quantity;
      for (const sourceColor of inferLandManaSources(fact)) {
        add(landMana, sourceColor, quantity);
      }
    } else if (isCreature) {
      creatureCount += quantity;
    } else {
      nonCreatureNonLandCount += quantity;
    }

    const factColors = fact.colors.length ? fact.colors : fact.colorIdentity.length ? fact.colorIdentity : hasTypedMetadata ? ['C'] : [];
    for (const color of factColors) {
      add(colors, COLOR_LABELS[color] ?? color, quantity);
    }

    if (hasTypedMetadata && !isLand && fact.manaValue !== undefined) {
      add(mana, manaValueBucket(fact.manaValue), quantity);
    }

    for (const keyword of fact.keywords) {
      add(keywords, titleCase(keyword), quantity);
    }

    for (const role of inferRoles(fact)) {
      add(roles, role, quantity);
    }

    if (hasTypedMetadata) {
      const cubeColor = COLOR_LABELS[factColors[0] ?? 'C'] ?? 'Colorless';
      const cubeType = titleCase(factTypes[0] ?? 'Other');
      const cubeKey = `${cubeColor}:${cubeType}`;
      const current = cube.get(cubeKey) ?? { color: cubeColor, type: cubeType, value: 0 };
      cube.set(cubeKey, { ...current, value: current.value + quantity });
    }
  }

  const deckRatioRows = [
    { label: 'Land', value: landCount, tone: 'land' },
    { label: 'Creature', value: creatureCount, tone: 'creature' },
    { label: 'Other', value: nonCreatureNonLandCount, tone: 'other' }
  ].filter((row) => row.value > 0);

  const probabilityRows = buildProbabilityRows(totalQuantity, landCount, creatureCount, keywordRowsFromMap(keywords));
  const stats: DashboardStats = {
    totalRows: facts.length,
    totalQuantity,
    uniqueNames,
    authoredQuantity,
    deckQuantity,
    collectionQuantity,
    collectionEstimatedValue,
    collectionValueRows,
    collectionValueCurrency,
    collectionPurchaseValue,
    collectionPurchaseRows,
    collectionPurchaseCurrency,
    collectionFlaggedRows,
    collectionDeletionRows,
    missingArt,
    reviewRows,
    unresolvedRows,
    metadataGapRows,
    landCount,
    creatureCount,
    nonCreatureNonLandCount,
    sourceRows: mapRows(source),
    typeRows: mapRows(types, 10),
    creatureTypeRows: mapRows(creatureTypes, 16),
    subtypeRows: mapRows(subtypes, 16),
    supertypeRows: mapRows(supertypes, 12),
    colorRows: mapRows(colors, 8),
    manaRows: manaRowsFromMap(mana),
    keywordRows: mapRows(keywords, 12),
    roleRows: roleRowsFromMap(roles),
    reviewRowsByStatus: mapRows(review),
    deckRatioRows,
    landManaRows: mapRows(landMana, 8),
    probabilityRows,
    recommendationRows: [],
    cubeRows: Array.from(cube.values()).sort((a, b) => b.value - a.value).slice(0, 30)
  };
  stats.recommendationRows = buildRecommendations(stats, scope);
  return stats;
}

function cardSummaryToFact(
  card: DashboardCardLike | undefined,
  meta: {
    key: string;
    sourceKind: DashboardSourceKind;
    sourceId: string;
    sourceName: string;
    projectId?: string;
    setCode?: string;
    setName?: string;
    deckId?: string;
    deckVariantId?: string;
    deckVariantName?: string;
    activeDeckVariant?: boolean;
    collectionId?: string;
    collectionKind?: CollectionKind;
    collectionListCategory?: CollectionListCategory;
    ownershipStatus?: CollectionOwnershipStatus;
    ownerName?: string;
    cardId?: string;
    variantId?: string;
    quantity: number;
    section?: string;
    name?: string;
    reviewStatus?: string;
    matchStrategy?: string;
    status?: string;
    tags?: string[];
    warning?: string;
    purchaseValue?: number;
    purchaseCurrency?: string;
    marketValue?: number;
    marketCurrency?: string;
    flagged?: boolean;
    markedForDeletion?: boolean;
    deckRoles?: string[];
    roleSource?: string;
    candidateStatus?: string;
    impactRating?: number;
    synergyRating?: number;
    qualityRating?: number;
  }
): DashboardCardFact {
  const typeLine = card?.typeLine ?? '';
  const parsedTypeLine = parseTypeLine(typeLine);
  const oracleText = card?.oracleText ?? '';
  const flavorText = card?.flavorText ?? '';
  const tags = [...(card?.tags ?? []), ...(meta.tags ?? [])].filter(Boolean);
  const name = meta.name ?? card?.name ?? 'Unknown card';
  const manaCost = card?.manaCost ?? '';
  const keywords = extractKeywords(`${oracleText} ${tags.join(' ')}`);
  const colors = normalizeColors(card?.colors ?? '');
  const colorIdentity = normalizeColors(card?.colorIdentity ?? card?.colors ?? '');
  const status = meta.status ?? card?.status;
  const searchText = [
    name,
    typeLine,
    manaCost,
    oracleText,
    flavorText,
    card?.power,
    card?.toughness,
    card?.layout,
    card?.frameType,
    meta.sourceName,
    meta.setCode,
    meta.section,
    meta.deckVariantName,
    status,
    meta.reviewStatus,
    meta.matchStrategy,
    meta.collectionKind,
    meta.collectionListCategory,
    meta.ownershipStatus,
    meta.ownerName,
    meta.warning,
    meta.candidateStatus,
    meta.roleSource,
    meta.deckRoles?.join(' '),
    tags.join(' '),
    keywords.join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  return {
    key: meta.key,
    sourceKind: meta.sourceKind,
    sourceId: meta.sourceId,
    sourceName: meta.sourceName,
    projectId: meta.projectId,
    setCode: meta.setCode,
    setName: meta.setName,
    deckId: meta.deckId,
    deckVariantId: meta.deckVariantId,
    deckVariantName: meta.deckVariantName,
    activeDeckVariant: meta.activeDeckVariant,
    collectionId: meta.collectionId ?? card?.collectionId,
    collectionKind: meta.collectionKind ?? card?.collectionKind,
    collectionListCategory: meta.collectionListCategory ?? card?.collectionListCategory,
    ownershipStatus: meta.ownershipStatus ?? card?.ownershipStatus,
    ownerName: meta.ownerName ?? card?.ownerName,
    cardId: meta.cardId ?? card?.cardId,
    variantId: meta.variantId ?? card?.activeVariantId ?? card?.primaryVariantId,
    name,
    quantity: Math.max(1, meta.quantity || 1),
    section: meta.section,
    typeLine,
    manaCost,
    colors,
    colorIdentity,
    supertypes: parsedTypeLine.supertypes,
    cardTypes: parsedTypeLine.cardTypes,
    subtypes: parsedTypeLine.subtypes,
    keywords,
    tags,
    status,
    rarity: card?.rarity,
    flavorText,
    power: card?.power,
    toughness: card?.toughness,
    layout: card?.layout,
    frameType: card?.frameType,
    reviewStatus: meta.reviewStatus,
    matchStrategy: meta.matchStrategy,
    hasArt: card?.hasArt,
    needsReview: card?.needsReview,
    manaValue: card?.manaValue ?? parseManaValue(manaCost),
    oracleText,
    purchaseValue: meta.purchaseValue,
    purchaseCurrency: meta.purchaseCurrency,
    marketValue: meta.marketValue,
    marketCurrency: meta.marketCurrency,
    flagged: meta.flagged,
    markedForDeletion: meta.markedForDeletion,
    deckRoles: meta.deckRoles ?? [],
    roleSource: meta.roleSource,
    candidateStatus: meta.candidateStatus,
    impactRating: meta.impactRating,
    synergyRating: meta.synergyRating,
    qualityRating: meta.qualityRating,
    searchText
  };
}

function parseTypeLine(typeLine: string): { supertypes: string[]; cardTypes: string[]; subtypes: string[] } {
  const [left, right = ''] = typeLine.split(/\u2014|--|-/);
  const leftTerms = left.trim().split(/\s+/).filter(Boolean).map((term) => term.toLowerCase());
  return {
    supertypes: leftTerms.filter((term) => SUPERTYPES.has(term)),
    cardTypes: leftTerms.filter((term) => CARD_TYPES.has(term)),
    subtypes: right.trim().split(/\s+/).filter(Boolean).map((term) => term.toLowerCase())
  };
}

function normalizeColors(value: string): string[] {
  const compact = value.toUpperCase().replace(/[^WUBRGC]/g, '');
  const seen = new Set<string>();
  for (const color of compact) {
    seen.add(color);
  }
  return Array.from(seen).filter((color) => color !== 'C');
}

function normalizedId(value: string | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizedName(value: string | undefined): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’`]/g, "'")
    .trim()
    .toLowerCase();
}

function parseManaValue(manaCost: string): number | undefined {
  const trimmed = manaCost.trim();
  if (!trimmed) {
    return undefined;
  }
  const symbolMatches = trimmed.match(/\{[^}]+\}/g);
  if (symbolMatches?.length) {
    return symbolMatches.reduce((total, symbol) => total + manaSymbolValue(symbol.replace(/[{}]/g, '')), 0);
  }
  let total = 0;
  const compact = trimmed.toUpperCase();
  const numbers = compact.match(/\d+/g) ?? [];
  for (const number of numbers) {
    total += Number(number) || 0;
  }
  total += compact.replace(/\d+/g, '').split('').filter((char) => 'WUBRGCXYZ'.includes(char) && char !== 'X' && char !== 'Y' && char !== 'Z').length;
  return total;
}

function manaSymbolValue(symbol: string): number {
  if (/^\d+$/.test(symbol)) {
    return Number(symbol);
  }
  if (symbol.toUpperCase() === 'X' || symbol.toUpperCase() === 'Y' || symbol.toUpperCase() === 'Z') {
    return 0;
  }
  return 1;
}

function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  return KEYWORD_TERMS.filter((keyword) => normalized.includes(keyword));
}

function inferRoles(fact: DashboardCardFact): string[] {
  if (fact.deckRoles.length) {
    return fact.deckRoles.map(roleLabel).filter(Boolean);
  }
  const text = `${fact.oracleText ?? ''} ${fact.tags.join(' ')}`.toLowerCase();
  const roles: string[] = [];
  if (/add \{?[wubrgc]\}?|search your library for.*land|treasure|mana|ramp/.test(text)) {
    roles.push('Ramp');
  }
  if (/draw (a|two|three|x|that many|cards?)|card draw|investigate/.test(text)) {
    roles.push('Draw');
  }
  if (/destroy target|exile target|damage to any target|counter target|fight target|removal/.test(text)) {
    roles.push('Removal');
  }
  if (/destroy all|exile all|each creature|all creatures|board wipe|wrath/.test(text)) {
    roles.push('Board wipe');
  }
  if (/hexproof|indestructible|protection|phase out|prevent all|ward/.test(text)) {
    roles.push('Protection');
  }
  if (/search your library for.*card|tutor/.test(text)) {
    roles.push('Tutor');
  }
  if (/return.*from your graveyard|reanimate|recursion/.test(text)) {
    roles.push('Recursion');
  }
  if (/win the game|each opponent loses|double strike|trample|cannot be blocked|finisher|wincon/.test(text)) {
    roles.push('Finisher');
  }
  return roles;
}

function inferLandManaSources(fact: DashboardCardFact): string[] {
  const name = fact.name.toLowerCase();
  const subtypeSet = new Set(fact.subtypes);
  const oracle = (fact.oracleText ?? '').toLowerCase();
  const sources = new Set<string>();
  const addSource = (symbol: string) => {
    const label = COLOR_LABELS[symbol] ?? (symbol === 'C' ? 'Colorless' : symbol);
    sources.add(label);
  };
  if (name === 'plains' || subtypeSet.has('plains')) addSource('W');
  if (name === 'island' || subtypeSet.has('island')) addSource('U');
  if (name === 'swamp' || subtypeSet.has('swamp')) addSource('B');
  if (name === 'mountain' || subtypeSet.has('mountain')) addSource('R');
  if (name === 'forest' || subtypeSet.has('forest')) addSource('G');
  for (const match of oracle.matchAll(/add\s+\{([wubrgc])\}/gi)) {
    addSource(match[1]?.toUpperCase() ?? '');
  }
  if (/add (one|a) mana of any color|add .*mana.*any color|chosen color|commander'?s color identity/.test(oracle)) {
    sources.add('Any color');
  }
  if (/add \{c\}|colorless/.test(oracle)) {
    sources.add('Colorless');
  }
  return sources.size ? Array.from(sources) : ['Unspecified'];
}

function roleLabel(role: string): string {
  const normalized = role.toLowerCase().replace(/[\s-]+/g, '_');
  const labels: Record<string, string> = {
    ramp: 'Ramp',
    mana_source: 'Mana source',
    fixing: 'Fixing',
    draw: 'Draw',
    targeted_removal: 'Removal',
    board_wipe: 'Board wipe',
    stack_interaction: 'Stack interaction',
    protection: 'Protection',
    recursion: 'Recursion',
    tutor: 'Tutor',
    finisher: 'Finisher',
    enabler: 'Enabler',
    payoff: 'Payoff',
    synergy_piece: 'Synergy',
    utility: 'Utility',
    threat: 'Threat',
    land: 'Land',
    commander: 'Commander',
    sideboard_tech: 'Sideboard tech'
  };
  return labels[normalized] ?? titleCase(normalized.replace(/_/g, ' '));
}

function buildRecommendations(stats: DashboardStats, scope: DashboardScope): DashboardRecommendation[] {
  const recommendations: DashboardRecommendation[] = [];
  const isDeckLike = scope.kind === 'deck' || stats.deckQuantity >= Math.max(40, stats.totalQuantity * 0.7);
  const total = Math.max(stats.totalQuantity, 1);
  const landPercent = stats.landCount / total;

  if (stats.totalQuantity === 0) {
    recommendations.push({
      id: 'empty',
      severity: 'info',
      title: 'No dashboard rows in this scope',
      body: 'Choose a broader scope or clear search filters to populate the dashboard.',
      source: 'Dashboard scope state'
    });
    return recommendations;
  }

  if (isDeckLike) {
    if (stats.totalQuantity >= 80 && stats.landCount < 35) {
      recommendations.push({
        id: 'commander-low-land',
        severity: 'risk',
        title: 'Commander-style land count looks low',
        body: `${stats.landCount} lands in ${stats.totalQuantity} cards is below common Commander starting templates. Check curve, ramp, draw, and commander role before cutting more lands.`,
        source: 'Wizards mana basics and Command Zone-style Commander templates'
      });
    } else if (stats.totalQuantity >= 80 && stats.landCount > 40) {
      recommendations.push({
        id: 'commander-high-land',
        severity: 'watch',
        title: 'Commander-style land count looks high',
        body: `${stats.landCount} lands may be right for landfall or control, but this deserves a curve and ramp check.`,
        source: 'Wizards mana basics and Command Zone-style Commander templates'
      });
    } else if (stats.totalQuantity <= 75 && (landPercent < 0.34 || landPercent > 0.46)) {
      recommendations.push({
        id: 'sixty-card-land-range',
        severity: 'watch',
        title: 'Land ratio is outside the rough 40% starting point',
        body: `${Math.round(landPercent * 100)}% lands can be correct, but should be justified by curve, cantrips, ramp, or format.`,
        source: 'Wizards The Basics of Mana'
      });
    }

    const roleMap = new Map(stats.roleRows.map((row) => [row.label, row.value]));
    if (stats.totalQuantity >= 80 && (roleMap.get('Ramp') ?? 0) < 8) {
      recommendations.push({
        id: 'low-ramp',
        severity: 'watch',
        title: 'Ramp coverage may be thin',
        body: 'The dashboard sees fewer than 8 ramp-like cards. This is heuristic text/tag detection, so treat it as a review queue, not a verdict.',
        source: 'Commander template research; local text/tag heuristic'
      });
    }
    if (stats.totalQuantity >= 80 && (roleMap.get('Draw') ?? 0) < 8) {
      recommendations.push({
        id: 'low-draw',
        severity: 'watch',
        title: 'Card draw coverage may be thin',
        body: 'Commander decks often want a visible card-advantage plan. Add tags or role metadata later if the heuristic misses synergy pieces.',
        source: 'Commander template research; local text/tag heuristic'
      });
    }
  }

  if (stats.reviewRows > 0 || stats.unresolvedRows > 0) {
    recommendations.push({
      id: 'collection-review',
      severity: 'info',
      title: 'Some collection rows need review',
      body: `${stats.reviewRows} rows need review and ${stats.unresolvedRows} rows are unresolved. These rows should stay visible because they affect collection and deck availability stats.`,
      source: 'Homebrew Forge collection review model'
    });
  }

  if (stats.metadataGapRows > 0) {
    recommendations.push({
      id: 'metadata-gaps',
      severity: 'info',
      title: 'Some rows are excluded from card-shape charts',
      body: `${stats.metadataGapRows} weighted rows do not have resolved type/color/mana metadata. They are included in totals, but excluded from type, color, mana, role, and matrix charts so they do not appear as fake Unknown or Colorless cards.`,
      source: 'Dashboard source-aware metadata guard'
    });
  }

  if (stats.missingArt > 0) {
    recommendations.push({
      id: 'missing-art',
      severity: 'info',
      title: 'Some authored cards are missing art',
      body: `${stats.missingArt} authored card rows have no art. That is useful set-production cleanup, not a gameplay problem.`,
      source: 'Homebrew Forge authored card data'
    });
  }

  const topKeyword = stats.keywordRows[0];
  if (topKeyword && topKeyword.value / total > 0.35 && stats.authoredQuantity > 0) {
    recommendations.push({
      id: 'keyword-density',
      severity: 'watch',
      title: `${topKeyword.label} dominates this card pool`,
      body: `${topKeyword.value} weighted rows mention ${topKeyword.label}. If this is a set theme, mark it intentional; otherwise it may be a design-pattern rut.`,
      source: 'Local reference/text frequency'
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 'healthy-snapshot',
      severity: 'good',
      title: 'No obvious dashboard warnings',
      body: 'The visible scope has enough data for a clean first-pass snapshot. Use filters or custom selection to inspect a smaller slice.',
      source: 'Dashboard local metrics'
    });
  }

  return recommendations;
}

function buildProbabilityRows(total: number, landCount: number, creatureCount: number, keywordRows: DashboardChartDatum[]): DashboardProbabilityDatum[] {
  if (total <= 0) {
    return [];
  }
  const rows: DashboardProbabilityDatum[] = [];
  if (landCount > 0) {
    rows.push(probabilityRow('2+ lands in opening 7', total, landCount, 7, 2));
    rows.push(probabilityRow('4+ lands by turn 4', total, landCount, 10, 4));
  }
  if (creatureCount > 0) {
    rows.push(probabilityRow('1+ creature by turn 3', total, creatureCount, 9, 1));
  }
  const topKeyword = keywordRows[0];
  if (topKeyword) {
    rows.push(probabilityRow(`1+ ${topKeyword.label} by turn 4`, total, topKeyword.value, 10, 1));
  }
  return rows;
}

function probabilityRow(label: string, deckSize: number, hits: number, draws: number, need: number): DashboardProbabilityDatum {
  return {
    label,
    hits,
    draws,
    need,
    probability: probabilityAtLeast(deckSize, hits, draws, need),
    detail: `${hits} hits / ${deckSize} cards, ${draws} cards seen`
  };
}

function probabilityAtLeast(deckSize: number, hits: number, draws: number, need: number): number {
  if (deckSize <= 0 || hits <= 0 || draws <= 0) {
    return 0;
  }
  const maxHits = Math.min(hits, draws);
  let probability = 0;
  for (let k = need; k <= maxHits; k += 1) {
    probability += combination(hits, k) * combination(deckSize - hits, draws - k) / combination(deckSize, draws);
  }
  return Number.isFinite(probability) ? Math.max(0, Math.min(1, probability)) : 0;
}

function combination(n: number, k: number): number {
  if (k < 0 || k > n) {
    return 0;
  }
  const boundedK = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= boundedK; i += 1) {
    result = result * (n - boundedK + i) / i;
  }
  return result;
}

function sourceKindLabel(kind: DashboardSourceKind): string {
  if (kind === 'authored_card') {
    return 'Authored cards';
  }
  if (kind === 'deck_entry') {
    return 'Deck entries';
  }
  return 'Collection rows';
}

function manaValueBucket(value: number | undefined): string {
  if (value === undefined) {
    return 'No mana value';
  }
  return value >= 7 ? 'MV 7+' : `MV ${value}`;
}

function manaRowsFromMap(map: Map<string, number>): DashboardChartDatum[] {
  const order = ['MV 0', 'MV 1', 'MV 2', 'MV 3', 'MV 4', 'MV 5', 'MV 6', 'MV 7+'];
  return order.map((label) => ({ label, value: map.get(label) ?? 0 })).filter((row) => row.value > 0);
}

function roleRowsFromMap(map: Map<string, number>): DashboardChartDatum[] {
  const order = ['Land', 'Mana source', 'Fixing', 'Ramp', 'Draw', 'Removal', 'Board wipe', 'Stack interaction', 'Protection', 'Tutor', 'Recursion', 'Finisher', 'Enabler', 'Payoff', 'Synergy', 'Utility', 'Threat', 'Commander', 'Sideboard tech'];
  const ordered = order.map((label) => ({ label, value: map.get(label) ?? 0 })).filter((row) => row.value > 0);
  const orderedLabels = new Set(order);
  const extra = mapRows(new Map([...map.entries()].filter(([label]) => !orderedLabels.has(label))));
  return [...ordered, ...extra];
}

function keywordRowsFromMap(map: Map<string, number>): DashboardChartDatum[] {
  return mapRows(map, 12);
}

function mapRows(map: Map<string, number>, limit = 999): DashboardChartDatum[] {
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}
