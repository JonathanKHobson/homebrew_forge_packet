import { useEffect, useMemo, useState } from 'react';
import { fetchCollection, fetchCollections } from '../../api/client.js';
import { isOwnedStatus, listCategoryLabel, ownershipStatusLabel } from '../../domain/collectionLists.js';
import type { CollectionEntry, CollectionListCategory, CollectionState, CollectionSummary, DeckCardOption, DeckEntry, DeckState } from '../../domain/editorTypes.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from './OverlayShell.js';

type CollectionSourceFilter = 'all' | 'binder' | 'list';

interface DeckAddCardsOverlayProps {
  deck: DeckState;
  onAddCard: (card: DeckCardOption, section: DeckEntry['section'], count: number, candidateStatus: DeckEntry['candidateStatus']) => void;
  onAddCollectionEntry: (entry: CollectionEntry, collection: CollectionState | null, section: DeckEntry['section'], count: number, candidateStatus: DeckEntry['candidateStatus']) => void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function DeckAddCardsOverlay({ deck, onAddCard, onAddCollectionEntry, onStatus, onClose }: DeckAddCardsOverlayProps) {
  const [section, setSection] = useState<DeckEntry['section']>('main');
  const [candidateStatus, setCandidateStatus] = useState<DeckEntry['candidateStatus']>('active');
  const [count, setCount] = useState(1);
  const [cardQuery, setCardQuery] = useState('');
  const [collectionQuery, setCollectionQuery] = useState('');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionSourceFilter, setCollectionSourceFilter] = useState<CollectionSourceFilter>('all');
  const [listCategoryFilter, setListCategoryFilter] = useState<CollectionListCategory | 'all'>('all');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [lastAdded, setLastAdded] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadCollections() {
      try {
        const loaded = await fetchCollections();
        if (!mounted) {
          return;
        }
        setCollections(loaded);
        const first = loaded[0];
        if (first) {
          await selectCollection(first.collectionId, mounted);
        }
      } catch (caught) {
        onStatus(caught instanceof Error ? caught.message : String(caught));
      }
    }
    void loadCollections();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const needle = cardQuery.trim().toLowerCase();
    return deck.availableCards
      .filter((card) => card.source !== 'collection')
      .filter((card) => !needle || `${card.name} ${card.typeLine} ${card.setCode} ${card.setName} ${card.oracleText} ${card.flavorText} ${card.status} ${card.tags.join(' ')}`.toLowerCase().includes(needle))
      .slice(0, 120);
  }, [cardQuery, deck.availableCards]);

  const filteredCollections = useMemo(
    () =>
      collections.filter((candidate) => {
        if (collectionSourceFilter === 'binder' && candidate.kind === 'list') {
          return false;
        }
        if (collectionSourceFilter === 'list' && candidate.kind !== 'list') {
          return false;
        }
        if (listCategoryFilter !== 'all' && candidate.listCategory !== listCategoryFilter) {
          return false;
        }
        return true;
      }),
    [collectionSourceFilter, collections, listCategoryFilter]
  );

  const filteredCollectionEntries = useMemo(() => {
    const needle = collectionQuery.trim().toLowerCase();
    return (collection?.entries ?? [])
      .filter((entry) => !needle || `${entry.cardName} ${entry.setCode ?? ''} ${entry.collectorNumber ?? ''} ${entry.condition ?? ''} ${entry.reviewNotes ?? ''} ${entry.ownershipStatus ?? ''} ${(entry.tags ?? []).join(' ')}`.toLowerCase().includes(needle))
      .slice(0, 120);
  }, [collection?.entries, collectionQuery]);

  useEffect(() => {
    if (!collections.length) {
      return;
    }
    if (selectedCollectionId && filteredCollections.some((candidate) => candidate.collectionId === selectedCollectionId)) {
      return;
    }
    const first = filteredCollections[0];
    if (!first) {
      setSelectedCollectionId('');
      setCollection(null);
      return;
    }
    void selectCollection(first.collectionId);
  }, [collections.length, filteredCollections, selectedCollectionId]);

  async function selectCollection(collectionId: string, mounted = true) {
    setSelectedCollectionId(collectionId);
    if (!collectionId) {
      setCollection(null);
      return;
    }
    try {
      const loaded = await fetchCollection(collectionId);
      if (mounted) {
        setCollection(loaded);
      }
    } catch (caught) {
      onStatus(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function addAuthoredCard(card: DeckCardOption) {
    onAddCard(card, section, count, candidateStatus);
    setLastAdded(`Added ${count} ${card.name} to ${sectionLabel(section)} as ${candidateStatusLabel(candidateStatus)}.`);
  }

  function addCollectionRow(entry: CollectionEntry) {
    onAddCollectionEntry(entry, collection, section, count, candidateStatus);
    setLastAdded(`Added ${count} ${entry.cardName} to ${sectionLabel(section)} as ${candidateStatusLabel(candidateStatus)}.`);
  }

  const footer = (
    <>
      {lastAdded ? <span className="overlay-confirmation">{lastAdded}</span> : null}
      <button type="button" className="primary-button" onClick={onClose}>
        Done
      </button>
    </>
  );

  return (
    <OverlayShell title="Add Cards" eyebrow="Deck Builder" subtitle={`Add cards to ${deck.metadata.name} with an explicit count and board target.`} dirty={false} footer={footer} onClose={onClose}>
      <div className="create-overlay-grid">
        <div className="grid-2">
          <Field label="Board">
            <select value={section} onChange={(event) => setSection(event.target.value as DeckEntry['section'])}>
              <option value="main">Main</option>
              <option value="side">Sideboard</option>
              <option value="maybe">Maybeboard</option>
            </select>
          </Field>
          <Field label="Count">
            <input type="number" min="1" value={count} onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))} />
          </Field>
        </div>
        <Field label="Candidate status">
          <select value={candidateStatus ?? 'active'} onChange={(event) => setCandidateStatus(event.target.value as DeckEntry['candidateStatus'])}>
            <option value="active">Active</option>
            <option value="candidate">Candidate</option>
            <option value="testing">Testing</option>
            <option value="locked">Locked</option>
            <option value="cut">Cut</option>
          </select>
        </Field>

        <section className="overlay-source-panel">
          <h3>Authored Cards</h3>
          <label className="search-field overlay-search">
            <Icon name="search" />
            <input value={cardQuery} placeholder="Search all authored cards..." onChange={(event) => setCardQuery(event.target.value)} />
          </label>
          <div className="overlay-card-picker compact">
            {filteredCards.map((card) => (
              <div key={`${card.setCode}-${card.cardId}`} className="overlay-card-option">
                <span>
                  <strong>{card.name}</strong>
                  <small>
                    {card.setCode} {card.collectorNumber} - {card.typeLine || card.rarity}
                  </small>
                </span>
                <button type="button" className="secondary-button" onClick={() => addAuthoredCard(card)}>
                  Add
                </button>
              </div>
            ))}
            {!filteredCards.length ? <p className="workspace-copy">No authored cards match the current search.</p> : null}
          </div>
        </section>

        <section className="overlay-source-panel">
          <h3>Collection Rows</h3>
          <div className="grid-3">
            <Field label="Source">
              <select value={collectionSourceFilter} onChange={(event) => setCollectionSourceFilter(event.target.value as CollectionSourceFilter)}>
                <option value="all">Collections, binders, and lists</option>
                <option value="binder">Binders only</option>
                <option value="list">Lists only</option>
              </select>
            </Field>
            <Field label="List category">
              <select value={listCategoryFilter} disabled={collectionSourceFilter === 'binder'} onChange={(event) => setListCategoryFilter(event.target.value as CollectionListCategory | 'all')}>
                <option value="all">Any list category</option>
                <option value="general">General</option>
                <option value="wishlist">Wish list</option>
                <option value="recommendation">Recommendations</option>
                <option value="starred">Starred</option>
                <option value="flagged">Flagged</option>
                <option value="gift">Gift list</option>
              </select>
            </Field>
            <Field label="Collection">
              <select value={selectedCollectionId} onChange={(event) => void selectCollection(event.target.value)}>
                <option value="">No collection</option>
                {filteredCollections.map((candidate) => (
                  <option key={candidate.collectionId} value={candidate.collectionId}>
                    {candidate.kind === 'list' ? `${candidate.name} - ${listCategoryLabel(candidate.listCategory ?? 'general')}` : candidate.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <label className="search-field overlay-search">
              <Icon name="search" />
              <input value={collectionQuery} placeholder="Search collection rows..." onChange={(event) => setCollectionQuery(event.target.value)} />
            </label>
          </div>
          <div className="overlay-card-picker compact">
            {filteredCollectionEntries.map((entry) => (
              <div key={entry.entryId} className={`overlay-card-option ${entry.reviewStatus === 'needs_review' ? 'needs-review' : ''} ${!isOwnedStatus(entry.ownershipStatus) ? 'not-owned' : ''}`}>
                <span>
                  <strong>{entry.cardName}</strong>
                  <small>
                    {entry.quantity} available - {[entry.setCode, entry.collectorNumber].filter(Boolean).join(' ') || entry.setName || 'unresolved print'} - {!isOwnedStatus(entry.ownershipStatus) ? ownershipStatusLabel(entry.ownershipStatus) : entry.reviewStatus === 'needs_review' ? 'review' : 'matched'}
                  </small>
                </span>
                <button type="button" className="secondary-button" onClick={() => addCollectionRow(entry)}>
                  Add
                </button>
              </div>
            ))}
            {!filteredCollectionEntries.length ? <p className="workspace-copy">No collection rows match the current search.</p> : null}
          </div>
        </section>
      </div>
    </OverlayShell>
  );
}

function sectionLabel(section: DeckEntry['section']): string {
  if (section === 'side') {
    return 'Sideboard';
  }
  if (section === 'maybe') {
    return 'Maybeboard';
  }
  return 'Main';
}

function candidateStatusLabel(value: DeckEntry['candidateStatus']): string {
  if (value === 'candidate') {
    return 'candidate';
  }
  if (value === 'testing') {
    return 'testing';
  }
  if (value === 'locked') {
    return 'locked';
  }
  if (value === 'cut') {
    return 'cut';
  }
  return 'active';
}
