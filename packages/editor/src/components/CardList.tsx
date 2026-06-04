import { useMemo, useState } from 'react';
import type { CardSummary } from '../domain/editorTypes.js';
import type { CardListDensity } from '../domain/editorUiTypes.js';
import {
  CARD_STATUS_OPTIONS,
  countActiveFilters,
  includesAnyFilterText,
  includesFilterText,
  matchesNumberQuery,
  matchesTagFilter
} from '../domain/filterTypes.js';
import { BrowseFilterOverlay } from './filters/BrowseFilterOverlay.js';
import { FilterButton } from './filters/FilterButton.js';
import { FilteredEmptyState } from './filters/FilteredEmptyState.js';
import { Icon } from './Icon.js';

interface CardListProps {
  cards: CardSummary[];
  selectedId: string;
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
}

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
  toughness: ''
};

export function CardList({ cards, selectedId, density, onSelect, onNew, onCollapse }: CardListProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CardFilters>(defaultCardFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    { value: filters.toughness, defaultValue: defaultCardFilters.toughness }
  ]);

  const filteredCards = useMemo(() => cards.filter((card) => cardMatches(card, query, filters)), [cards, filters, query]);

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
        <div>
          <h2>Cards</h2>
          <p>{filteredCards.length} of {cards.length} in current set</p>
        </div>
        <div className="panel-heading-actions">
          {onCollapse ? (
            <button type="button" className="panel-control-button" onClick={onCollapse} title="Hide cards panel" aria-label="Hide cards panel">
              <Icon name="collapseLeft" />
            </button>
          ) : null}
          <FilterButton label="Filter cards" activeCount={activeFilterCount} onClick={() => setFiltersOpen(true)} />
          <button type="button" className="icon-button" onClick={onNew} title="New card">
            +
          </button>
        </div>
      </div>
      <div className="card-list-tools">
        <label className="search-field">
          <Icon name="search" />
          <input value={query} placeholder="Search cards..." onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="card-list-scroll">
        {filteredCards.length ? (
          filteredCards.map((card) => <CardRow key={card.cardId} card={card} density={density} selected={card.cardId === selectedId} onSelect={() => selectCard(card.cardId)} />)
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
          resultsLabel={`${filteredCards.length} matching cards`}
          activeFilterCount={activeFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={resetFilters}
          results={
            <div className="filter-result-list">
              {filteredCards.length ? (
                filteredCards.map((card) => <CardRow key={card.cardId} card={card} density="comfortable" selected={card.cardId === selectedId} onSelect={() => selectCard(card.cardId, true)} />)
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
    </div>
  );
}

function CardRow({ card, density, selected, onSelect }: { card: CardSummary; density: CardListDensity; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" className={`card-row ${density === 'compact' ? 'compact' : ''} ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className="collector">{card.collectorNumber}</span>
      <span>
        <strong>{card.name}</strong>
        {density === 'comfortable' ? <small>{card.typeLine}</small> : null}
      </span>
      <span className={`rarity-dot rarity-${card.rarity}`} title={`${card.rarity} ${card.colorIdentity || card.colors || 'C'}`} />
    </button>
  );
}

function cardMatches(card: CardSummary, query: string, filters: CardFilters): boolean {
  const typeLine = card.typeLine.toLowerCase();
  const subtypeNeedle = filters.subtype.trim().toLowerCase();
  const identity = card.colorIdentity || card.colors;
  const matchesQuery = includesAnyFilterText(
    [card.collectorNumber, card.name, card.typeLine, card.manaCost, card.oracleText, card.flavorText, card.status, card.notes, card.tags.join(' ')],
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
  const matchesSubtype = !subtypeNeedle || typeLine.split(' - ')[1]?.includes(subtypeNeedle) || typeLine.includes(subtypeNeedle);
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
    matchesToughness
  );
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
