import { useMemo, useState } from 'react';
import type { CardSummary } from '../domain/editorTypes.js';
import type { CardListDensity } from '../domain/editorUiTypes.js';
import { sortItemsByState, type ListSortOption, type ListSortState } from '../domain/listControls.js';
import { formatCount } from '../domain/uiText.js';
import {
  CARD_STATUS_OPTIONS,
  countActiveFilters,
  includesAnyFilterText,
  includesFilterText,
  matchesNumberQuery,
  matchesTagFilter
} from '../domain/filterTypes.js';
import { BrowseFilterOverlay } from './filters/BrowseFilterOverlay.js';
import { FilteredEmptyState } from './filters/FilteredEmptyState.js';
import { AdvancedFiltersButton, ListControlsBar, ListResultsSummary, SortMenu, StatusPill, type StatusPillTone } from './forge-ui/index.js';
import { Icon } from './Icon.js';
import { ManaSymbolSet } from './ManaSymbols.js';

interface CardListProps {
  cards: CardSummary[];
  selectedId: string;
  dirtyCardIds: Set<string>;
  density: CardListDensity;
  onSelect: (cardId: string) => void;
  onNew: () => void;
  onCollapse?: () => void;
}

interface CardFilters {
  rarity: string;
  status: string;
  tag: string;
  color: string;
  manaCost: string;
  cardType: string;
  supertype: string;
  subtype: string;
  frame: string;
  review: string;
  oracleText: string;
  flavorText: string;
  power: string;
  toughness: string;
  variantScope: 'primary' | 'active' | 'all' | 'archived';
  variantKind: string;
  variantStatus: string;
  variantExportPolicy: string;
  variantTag: string;
  variantNotes: string;
}

type CardListSortOptionId = 'name' | 'collector' | 'mana' | 'type' | 'rarity' | 'status';

const defaultCardFilters: CardFilters = {
  rarity: 'all',
  status: 'all',
  tag: '',
  color: 'all',
  manaCost: '',
  cardType: 'all',
  supertype: 'all',
  subtype: '',
  frame: 'all',
  review: 'all',
  oracleText: '',
  flavorText: '',
  power: '',
  toughness: '',
  variantScope: 'primary',
  variantKind: 'all',
  variantStatus: 'all',
  variantExportPolicy: 'all',
  variantTag: '',
  variantNotes: ''
};

const CARD_LIST_SORT_OPTIONS: Array<ListSortOption<CardListSortOptionId>> = [
  { id: 'name', label: 'Name' },
  { id: 'collector', label: 'Collector #' },
  { id: 'mana', label: 'Mana value' },
  { id: 'type', label: 'Type' },
  { id: 'rarity', label: 'Rarity' },
  { id: 'status', label: 'Status' }
];

export function CardList({ cards, selectedId, dirtyCardIds, density, onSelect, onNew, onCollapse }: CardListProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CardFilters>(defaultCardFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortState, setSortState] = useState<ListSortState<CardListSortOptionId>>({ option: 'collector', direction: 'asc' });
  const activeFilterCount = countActiveFilters([
    { value: filters.rarity, defaultValue: defaultCardFilters.rarity },
    { value: filters.status, defaultValue: defaultCardFilters.status },
    { value: filters.tag, defaultValue: defaultCardFilters.tag },
    { value: filters.color, defaultValue: defaultCardFilters.color },
    { value: filters.manaCost, defaultValue: defaultCardFilters.manaCost },
    { value: filters.cardType, defaultValue: defaultCardFilters.cardType },
    { value: filters.supertype, defaultValue: defaultCardFilters.supertype },
    { value: filters.subtype, defaultValue: defaultCardFilters.subtype },
    { value: filters.frame, defaultValue: defaultCardFilters.frame },
    { value: filters.review, defaultValue: defaultCardFilters.review },
    { value: filters.oracleText, defaultValue: defaultCardFilters.oracleText },
    { value: filters.flavorText, defaultValue: defaultCardFilters.flavorText },
    { value: filters.power, defaultValue: defaultCardFilters.power },
    { value: filters.toughness, defaultValue: defaultCardFilters.toughness },
    { value: filters.variantScope, defaultValue: defaultCardFilters.variantScope },
    { value: filters.variantKind, defaultValue: defaultCardFilters.variantKind },
    { value: filters.variantStatus, defaultValue: defaultCardFilters.variantStatus },
    { value: filters.variantExportPolicy, defaultValue: defaultCardFilters.variantExportPolicy },
    { value: filters.variantTag, defaultValue: defaultCardFilters.variantTag },
    { value: filters.variantNotes, defaultValue: defaultCardFilters.variantNotes }
  ]);

  const filteredCards = useMemo(() => cards.filter((card) => cardMatches(card, query, filters)), [cards, filters, query]);
  const sortedCards = useMemo(
    () =>
      sortItemsByState(
        filteredCards,
        sortState,
        {
          name: (card) => card.name,
          collector: (card) => card.collectorNumber,
          mana: (card) => manaValueFromCost(card.manaCost),
          type: (card) => card.typeLine,
          rarity: (card) => card.rarity,
          status: (card) => card.status
        },
        (card) => card.name
      ),
    [filteredCards, sortState]
  );

  const resetFilters = () => setFilters(defaultCardFilters);
  const selectCard = (cardId: string, closeOverlay = false) => {
    onSelect(cardId);
    if (closeOverlay) {
      setFiltersOpen(false);
    }
  };

  return (
    <aside className="card-list">
      <div className="panel-heading">
        <div className="panel-heading-title">
          <h2>Maker</h2>
          <span className="panel-heading-count" title={`${filteredCards.length} of ${cards.length} cards in current set`}>
            {filteredCards.length === cards.length ? cards.length : `${filteredCards.length} / ${cards.length}`}
          </span>
        </div>
        <div className="panel-heading-actions">
          {onCollapse ? (
            <button type="button" className="panel-control-button" onClick={onCollapse} title="Hide Maker list panel" aria-label="Hide Maker list panel">
              <Icon name="collapseLeft" />
            </button>
          ) : null}
          <button type="button" className="icon-button" onClick={onNew} title="New card">
            +
          </button>
        </div>
      </div>
      <div className="card-list-tools">
        <ListControlsBar
          searchLabel="Search Maker cards"
          searchValue={query}
          searchPlaceholder="Search cards..."
          onSearchChange={setQuery}
          sortControl={<SortMenu options={CARD_LIST_SORT_OPTIONS} state={sortState} onChange={setSortState} />}
          filterControl={<AdvancedFiltersButton label="Filters" activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />}
          resetControl={query.trim() || activeFilterCount ? <button type="button" className="secondary-button compact" onClick={() => { setQuery(''); resetFilters(); }}>Reset</button> : null}
          results={<ListResultsSummary shown={sortedCards.length} total={cards.length} label="card" />}
        />
      </div>
      <div className="card-list-scroll">
        {sortedCards.length ? (
          sortedCards.map((card) => <CardRow key={card.cardId} card={card} dirty={dirtyCardIds.has(card.cardId)} density={density} selected={card.cardId === selectedId} onSelect={() => selectCard(card.cardId)} />)
        ) : cards.length ? (
          <FilteredEmptyState
            title="No cards match"
            detail="Search or filters are hiding cards in this set."
            showClearSearch={Boolean(query.trim())}
            showResetFilters={activeFilterCount > 0}
            onClearSearch={() => setQuery('')}
            onResetFilters={resetFilters}
          />
        ) : (
          <FilteredEmptyState title="No cards yet" detail="Start with New Card or import CSV/XML." />
        )}
      </div>
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Cards"
          subtitle="Search stays in the card list. Use filters here when you need precise card narrowing."
          resultsLabel={`${sortedCards.length} matching cards`}
          activeFilterCount={activeFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={resetFilters}
          results={
            <div className="filter-result-list">
              {sortedCards.length ? (
                sortedCards.map((card) => <CardRow key={card.cardId} card={card} dirty={dirtyCardIds.has(card.cardId)} density="comfortable" selected={card.cardId === selectedId} onSelect={() => selectCard(card.cardId, true)} />)
              ) : (
                <FilteredEmptyState
                  title="No cards match"
                  detail="Reset filters or clear the card-list search to recover hidden cards."
                  showClearSearch={Boolean(query.trim())}
                  showResetFilters={activeFilterCount > 0}
                  onClearSearch={() => setQuery('')}
                  onResetFilters={resetFilters}
                />
              )}
            </div>
          }
        >
          <CardFilterControls filters={filters} onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))} />
        </BrowseFilterOverlay>
      ) : null}
    </aside>
  );
}

function CardFilterControls({ filters, onChange }: { filters: CardFilters; onChange: (patch: Partial<CardFilters>) => void }) {
  return (
    <div className="filter-panel">
      <label className="filter-field">
        <span>Rarity</span>
        <select value={filters.rarity} onChange={(event) => onChange({ rarity: event.target.value })}>
          <option value="all">All rarities</option>
          <option value="common">Common</option>
          <option value="uncommon">Uncommon</option>
          <option value="rare">Rare</option>
          <option value="mythic">Mythic</option>
          <option value="special">Special</option>
          <option value="bonus">Bonus</option>
          <option value="token">Token</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Status</span>
        <select value={filters.status} onChange={(event) => onChange({ status: event.target.value })}>
          <option value="all">All statuses</option>
          {CARD_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Tags</span>
        <input value={filters.tag} placeholder="needs_review, creature..." onChange={(event) => onChange({ tag: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Color identity</span>
        <select value={filters.color} onChange={(event) => onChange({ color: event.target.value })}>
          <option value="all">All colors</option>
          <option value="W">White</option>
          <option value="U">Blue</option>
          <option value="B">Black</option>
          <option value="R">Red</option>
          <option value="G">Green</option>
          <option value="multicolor">Multicolor</option>
          <option value="colorless">Colorless</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Mana cost</span>
        <input value={filters.manaCost} placeholder="{2}, {W}, X..." onChange={(event) => onChange({ manaCost: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Card type</span>
        <select value={filters.cardType} onChange={(event) => onChange({ cardType: event.target.value })}>
          <option value="all">All card types</option>
          <option value="Artifact">Artifact</option>
          <option value="Battle">Battle</option>
          <option value="Creature">Creature</option>
          <option value="Enchantment">Enchantment</option>
          <option value="Instant">Instant</option>
          <option value="Land">Land</option>
          <option value="Planeswalker">Planeswalker</option>
          <option value="Sorcery">Sorcery</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Supertype</span>
        <select value={filters.supertype} onChange={(event) => onChange({ supertype: event.target.value })}>
          <option value="all">All supertypes</option>
          <option value="Legendary">Legendary</option>
          <option value="Basic">Basic</option>
          <option value="Snow">Snow</option>
          <option value="World">World</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Subtype</span>
        <input value={filters.subtype} placeholder="Human, Soldier..." onChange={(event) => onChange({ subtype: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Frame</span>
        <select value={filters.frame} onChange={(event) => onChange({ frame: event.target.value })}>
          <option value="all">All frames</option>
          <option value="normal">Normal</option>
          <option value="artifact">Artifact</option>
          <option value="land">Land</option>
          <option value="token">Token</option>
          <option value="planeswalker">Planeswalker</option>
          <option value="battle">Battle</option>
          <option value="saga">Saga</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Review</span>
        <select value={filters.review} onChange={(event) => onChange({ review: event.target.value })}>
          <option value="all">All review states</option>
          <option value="needs_review">Needs review</option>
          <option value="missing_art">Missing art</option>
          <option value="unsupported">Unsupported layout</option>
          <option value="token">Tokens</option>
          <option value="saga">Sagas</option>
          <option value="transform">Possible transform</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Oracle text</span>
        <input value={filters.oracleText} placeholder="Draw, create, exile..." onChange={(event) => onChange({ oracleText: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Flavor text</span>
        <input value={filters.flavorText} placeholder="Search flavor..." onChange={(event) => onChange({ flavorText: event.target.value })} />
      </label>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Power</span>
          <input value={filters.power} placeholder="3, >=2, *" onChange={(event) => onChange({ power: event.target.value })} />
        </label>
        <label className="filter-field">
          <span>Toughness</span>
          <input value={filters.toughness} placeholder="3, <=4, *" onChange={(event) => onChange({ toughness: event.target.value })} />
        </label>
      </div>
      <label className="filter-field">
        <span>Variant scope</span>
        <select value={filters.variantScope} onChange={(event) => onChange({ variantScope: event.target.value as CardFilters['variantScope'] })}>
          <option value="primary">Primary variants only</option>
          <option value="active">Active variants</option>
          <option value="all">All variants</option>
          <option value="archived">Archived variants only</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Variant kind</span>
        <select value={filters.variantKind} onChange={(event) => onChange({ variantKind: event.target.value })}>
          <option value="all">All kinds</option>
          <option value="mechanics_test">Mechanics test</option>
          <option value="wording_test">Wording test</option>
          <option value="visual_alternate">Visual alternate</option>
          <option value="finish_alternate">Finish alternate</option>
          <option value="print_alternate">Print alternate</option>
          <option value="history_snapshot">History snapshot</option>
        </select>
      </label>
      <div className="grid-2 compact-filter-grid">
        <label className="filter-field">
          <span>Variant status</span>
          <select value={filters.variantStatus} onChange={(event) => onChange({ variantStatus: event.target.value })}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="testing">Testing</option>
            <option value="final">Final</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Variant export</span>
          <select value={filters.variantExportPolicy} onChange={(event) => onChange({ variantExportPolicy: event.target.value })}>
            <option value="all">All policies</option>
            <option value="default">Default</option>
            <option value="optional">Optional</option>
            <option value="excluded">Excluded</option>
          </select>
        </label>
      </div>
      <label className="filter-field">
        <span>Variant tags</span>
        <input value={filters.variantTag} placeholder="alt-art, playtest..." onChange={(event) => onChange({ variantTag: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Variant notes</span>
        <input value={filters.variantNotes} placeholder="Search variant notes..." onChange={(event) => onChange({ variantNotes: event.target.value })} />
      </label>
    </div>
  );
}

function CardRow({ card, dirty, density, selected, onSelect }: { card: CardSummary; dirty: boolean; density: CardListDensity; selected: boolean; onSelect: () => void }) {
  const identity = card.colorIdentity || card.colors || 'C';
  const variantCount = card.variantCount ?? 0;
  return (
    <button type="button" className={`card-row ${density === 'compact' ? 'compact' : ''} ${selected ? 'selected' : ''} ${dirty ? 'dirty' : ''}`} onClick={onSelect}>
      <span className="collector">{card.collectorNumber}</span>
      <span>
        <strong>{card.name}{dirty ? <span className="unsaved-dot" title="Unsaved changes" aria-label="Unsaved changes" /> : null}</strong>
        {density === 'comfortable' ? <small>{card.typeLine}</small> : null}
        {density === 'comfortable' ? (
          <span className="card-row-badges">
            <StatusPill tone={toneForCardStatus(card.status)}>{card.status || 'draft'}</StatusPill>
            {variantCount > 1 ? <StatusPill tone="info">{formatCount(variantCount, 'variant')}</StatusPill> : null}
            {card.needsReview ? <StatusPill tone="warning">Review</StatusPill> : null}
            {dirty ? <StatusPill tone="dirty">Unsaved</StatusPill> : null}
          </span>
        ) : null}
      </span>
      <span className="card-row-identity" title={`${card.rarity} - ${identity}`}>
        <ManaSymbolSet value={identity} className="compact" />
      </span>
    </button>
  );
}

function manaValueFromCost(manaCost: string): number {
  const symbols = manaCost.match(/\{[^}]+\}/g);
  if (symbols?.length) {
    return symbols.reduce((total, symbol) => total + manaSymbolValue(symbol.replace(/[{}]/g, '')), 0);
  }
  const numbers = manaCost.match(/\d+/g) ?? [];
  const numeric = numbers.reduce((total, value) => total + (Number(value) || 0), 0);
  const pips = manaCost
    .replace(/\d+/g, '')
    .toUpperCase()
    .split('')
    .filter((character) => 'WUBRGC'.includes(character)).length;
  return numeric + pips;
}

function manaSymbolValue(symbol: string): number {
  if (/^\d+$/.test(symbol)) {
    return Number(symbol);
  }
  if (symbol.includes('/')) {
    return 1;
  }
  if (symbol.toUpperCase() === 'X') {
    return 0;
  }
  return symbol.trim() ? 1 : 0;
}

function toneForCardStatus(status: string): StatusPillTone {
  if (status === 'published' || status === 'final' || status === 'complete') {
    return 'success';
  }
  if (status === 'review' || status === 'needs_review') {
    return 'warning';
  }
  if (status === 'error' || status === 'blocked') {
    return 'danger';
  }
  if (status === 'idea' || status === 'draft') {
    return 'info';
  }
  return 'neutral';
}

function cardMatches(card: CardSummary, query: string, filters: CardFilters): boolean {
  const typeLine = card.typeLine.toLowerCase();
  const subtypeNeedle = filters.subtype.trim().toLowerCase();
  const identity = card.colorIdentity || card.colors;
  const scopedVariants = variantsForScope(card, filters.variantScope);
  const matchesQuery = includesAnyFilterText(
    [card.collectorNumber, card.name, card.typeLine, card.manaCost, card.oracleText, card.flavorText, card.status, card.notes, card.tags.join(' '), ...scopedVariants.map((variant) => variant.searchText)],
    query
  );
  const matchesRarity = filters.rarity === 'all' || card.rarity === filters.rarity;
  const matchesStatus = filters.status === 'all' || card.status === filters.status;
  const matchesTags = matchesTagFilter(card.tags, filters.tag);
  const matchesColor =
    filters.color === 'all' ||
    (filters.color === 'multicolor' ? identity.length > 1 : filters.color === 'colorless' ? !identity || identity === 'C' : identity.includes(filters.color));
  const matchesManaCost = includesFilterText(card.manaCost, filters.manaCost);
  const matchesCardType = filters.cardType === 'all' || typeLine.includes(filters.cardType.toLowerCase());
  const matchesSupertype = filters.supertype === 'all' || typeLine.includes(filters.supertype.toLowerCase());
  const matchesSubtype = !subtypeNeedle || typeLine.split(/\s+[—-]\s+/)[1]?.includes(subtypeNeedle) || typeLine.includes(subtypeNeedle);
  const matchesFrame = filters.frame === 'all' || inferFrameFamily(card) === filters.frame;
  const matchesReview =
    filters.review === 'all' ||
    (filters.review === 'needs_review' && card.needsReview) ||
    (filters.review === 'missing_art' && !card.hasArt) ||
    (filters.review === 'unsupported' && card.tags.some((tag) => tag.startsWith('unsupported_layout:'))) ||
    (filters.review === 'token' && inferFrameFamily(card) === 'token') ||
    (filters.review === 'saga' && inferFrameFamily(card) === 'saga') ||
    (filters.review === 'transform' && card.tags.includes('possible_transform'));
  const matchesOracle = includesFilterText(card.oracleText, filters.oracleText);
  const matchesFlavor = includesFilterText(card.flavorText, filters.flavorText);
  const matchesPower = matchesNumberQuery(card.power, filters.power);
  const matchesToughness = matchesNumberQuery(card.toughness, filters.toughness);
  const matchesVariantScope = scopedVariants.length > 0;
  const matchesVariantKind = filters.variantKind === 'all' || scopedVariants.some((variant) => variant.kind === filters.variantKind);
  const matchesVariantStatus = filters.variantStatus === 'all' || scopedVariants.some((variant) => variant.status === filters.variantStatus);
  const matchesVariantExport = filters.variantExportPolicy === 'all' || scopedVariants.some((variant) => variant.exportPolicy === filters.variantExportPolicy);
  const matchesVariantTags = matchesTagFilter(scopedVariants.flatMap((variant) => variant.tags), filters.variantTag);
  const matchesVariantNotes = includesAnyFilterText(scopedVariants.map((variant) => variant.notes), filters.variantNotes);
  return (
    matchesQuery &&
    matchesRarity &&
    matchesStatus &&
    matchesTags &&
    matchesColor &&
    matchesManaCost &&
    matchesCardType &&
    matchesSupertype &&
    matchesSubtype &&
    matchesFrame &&
    matchesReview &&
    matchesOracle &&
    matchesFlavor &&
    matchesPower &&
    matchesToughness &&
    matchesVariantScope &&
    matchesVariantKind &&
    matchesVariantStatus &&
    matchesVariantExport &&
    matchesVariantTags &&
    matchesVariantNotes
  );
}

function variantsForScope(card: CardSummary, scope: CardFilters['variantScope']): CardSummary['variants'] {
  const variants = card.variants ?? [];
  if (scope === 'all') {
    return variants;
  }
  if (scope === 'archived') {
    return variants.filter((variant) => variant.status === 'archived');
  }
  if (scope === 'active') {
    return variants.filter((variant) => variant.status !== 'archived');
  }
  return variants.filter((variant) => variant.isPrimary);
}

function inferFrameFamily(card: CardSummary): string {
  const typeLine = card.typeLine.toLowerCase();
  if (card.layout === 'token' || card.frameType.includes('token')) {
    return 'token';
  }
  if (typeLine.includes('planeswalker')) {
    return 'planeswalker';
  }
  if (typeLine.includes('battle')) {
    return 'battle';
  }
  if (typeLine.includes('saga')) {
    return 'saga';
  }
  if (typeLine.includes('land')) {
    return 'land';
  }
  if (typeLine.includes('artifact') && !typeLine.includes('creature')) {
    return 'artifact';
  }
  return 'normal';
}
