import { useEffect, useMemo, useState } from 'react';
import { fetchCollection, fetchCollections } from '../../api/client.js';
import type { CollectionEntry, CollectionState, CollectionSummary, CreateDeckRequest, DeckCardOption, DeckEntry, EditorProject, LibraryState } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { CollapsibleSection } from '../CollapsibleSection.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';
import { CreateFlowStatusMessage } from './CreateFlowStatusMessage.js';
import { splitTagInput } from '../../domain/filterTypes.js';

export type CreateDeckOverlayEntry = Omit<DeckEntry, 'deckId'>;

interface CreateDeckOverlayProps {
  library: LibraryState | null;
  project: EditorProject | null;
  onCreateDeck: (request: CreateDeckRequest, entries: CreateDeckOverlayEntry[]) => Promise<void>;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CreateDeckOverlay({ library, project, onCreateDeck, onStatus, onClose }: CreateDeckOverlayProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState<CreateDeckRequest['status']>('draft');
  const [tags, setTags] = useState('');
  const [linkedUniverseId, setLinkedUniverseId] = useState(library?.selectedUniverseId ?? '');
  const [linkedSetCode, setLinkedSetCode] = useState(library?.selectedSetCode ?? project?.setCode ?? '');
  const [notes, setNotes] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [collectionQuery, setCollectionQuery] = useState('');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [entries, setEntries] = useState<CreateDeckOverlayEntry[]>([]);
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = Boolean(name || description || format || notes || tags || entries.length || status !== 'draft');

  useEffect(() => {
    let mounted = true;
    async function loadCollections() {
      try {
        const loaded = await fetchCollections();
        if (!mounted) {
          return;
        }
        setCollections(loaded);
        if (loaded[0]) {
          await selectCollection(loaded[0].collectionId, mounted);
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

  const availableCards = useMemo<DeckCardOption[]>(
    () =>
      (project?.drafts ?? []).map((draft) => ({
        setCode: draft.setCode,
        setName: draft.setName,
        cardId: draft.cardId,
        collectorNumber: draft.collectorNumber,
        name: draft.name,
        typeLine: draft.typeLine,
        rarity: draft.rarity,
        colors: draft.colors,
        manaCost: draft.manaCost,
        colorIdentity: draft.colorIndicator || draft.colors,
        oracleText: draft.oracleText,
        flavorText: draft.flavorText,
        power: draft.power,
        toughness: draft.toughness,
        status: draft.status,
        tags: draft.tags
      })),
    [project?.drafts]
  );

  const filteredCards = useMemo(() => {
    const needle = cardQuery.trim().toLowerCase();
    return availableCards
      .filter((card) => !needle || `${card.name} ${card.typeLine} ${card.setCode} ${card.collectorNumber} ${card.oracleText} ${card.flavorText} ${card.tags.join(' ')}`.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [availableCards, cardQuery]);

  const filteredCollectionEntries = useMemo(() => {
    const needle = collectionQuery.trim().toLowerCase();
    return (collection?.entries ?? [])
      .filter((entry) => !needle || `${entry.cardName} ${entry.setCode ?? ''} ${entry.collectorNumber ?? ''} ${entry.condition ?? ''} ${entry.reviewNotes ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [collection?.entries, collectionQuery]);

  function markDirty() {
    setFlowState('dirty');
  }

  function addCard(card: DeckCardOption, section: DeckEntry['section']) {
    setEntries((current) => {
      const index = current.findIndex((entry) => entry.section === section && entry.setCode === card.setCode && entry.cardId === card.cardId);
      if (index >= 0) {
        return current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, count: entry.count + 1 } : entry));
      }
      return [
        ...current,
        {
          section,
          count: 1,
          setCode: card.setCode,
          cardId: card.cardId,
          nameSnapshot: card.name
        }
      ];
    });
    setFlowState('dirty');
  }

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

  function addCollectionEntry(entry: CollectionEntry, section: DeckEntry['section']) {
    const setCode = (entry.setCode || collection?.metadata.collectionId || 'COLL').toUpperCase();
    const cardId = entry.scryfallId || entry.entryId;
    setEntries((current) => {
      const index = current.findIndex((deckEntry) => deckEntry.section === section && deckEntry.setCode === setCode && deckEntry.cardId === cardId);
      if (index >= 0) {
        return current.map((deckEntry, entryIndex) => (entryIndex === index ? { ...deckEntry, count: deckEntry.count + 1, nameSnapshot: entry.cardName } : deckEntry));
      }
      return [
        ...current,
        {
          section,
          count: 1,
          setCode,
          cardId,
          nameSnapshot: entry.cardName
        }
      ];
    });
    setFlowState('dirty');
  }

  function updateEntry(index: number, next: Partial<CreateDeckOverlayEntry>) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              ...next,
              count: Math.max(1, Number(next.count ?? entry.count) || 1)
            }
          : entry
      )
    );
    setFlowState('dirty');
  }

  async function submit() {
    setFlowState('saving');
    setError('');
    try {
      await onCreateDeck(
        {
          name,
          description,
          linkedUniverseId: linkedUniverseId || undefined,
          linkedSetCode: linkedSetCode || undefined,
          format,
          status,
          tags: splitTagInput(tags),
          notes
        },
        entries
      );
      setFlowState('saved');
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setFlowState('error');
      onStatus(message);
    }
  }

  const footer = (
    <>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="secondary-button" disabled>
        Import Deck
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !name.trim()} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Creating...' : 'Create Draft'}
      </button>
    </>
  );

  return (
    <OverlayShell title="New Deck" eyebrow="Create" subtitle="Start with metadata and any known cards; deeper deck tuning stays in the Decks workspace." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
      <CreateFlowStatusMessage state={flowState} error={error} />
      <div className="create-overlay-grid">
        <CollapsibleSection title="Deck Metadata" subtitle="Name, project links, status, and notes">
          <div className="grid-2">
            <Field label="Deck name">
              <input value={name} placeholder="New playtest deck" onChange={(event) => { setName(event.target.value); markDirty(); }} />
            </Field>
            <Field label="Format">
              <input value={format} placeholder="Kitchen table, Commander, playtest..." onChange={(event) => { setFormat(event.target.value); markDirty(); }} />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={description} rows={3} onChange={(event) => { setDescription(event.target.value); markDirty(); }} />
          </Field>
          <Field label="Tags">
            <input value={tags} placeholder="playtest, aggro, commander" onChange={(event) => { setTags(event.target.value); markDirty(); }} />
          </Field>
          <div className="grid-3">
            <Field label="Status">
              <select value={status} onChange={(event) => { setStatus(event.target.value as CreateDeckRequest['status']); markDirty(); }}>
                <option value="idea">idea</option>
                <option value="draft">draft</option>
                <option value="playtest">playtest</option>
                <option value="final">final</option>
                <option value="archived">archived</option>
              </select>
            </Field>
            <Field label="Project">
              <select value={linkedUniverseId} onChange={(event) => { setLinkedUniverseId(event.target.value); markDirty(); }}>
                <option value="">None</option>
                {(library?.universes ?? []).map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Set">
              <select value={linkedSetCode} onChange={(event) => { setLinkedSetCode(event.target.value); markDirty(); }}>
                <option value="">None</option>
                {(library?.sets ?? []).map((set) => (
                  <option key={set.setCode} value={set.setCode}>
                    {set.setCode} - {set.setName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={notes} rows={4} onChange={(event) => { setNotes(event.target.value); markDirty(); }} />
          </Field>
        </CollapsibleSection>

        <CollapsibleSection title="Starting Cards" subtitle="Add known cards to Main, Sideboard, or Maybeboard">
          <label className="search-field overlay-search">
            <Icon name="search" />
            <input value={cardQuery} placeholder="Search current set cards..." onChange={(event) => setCardQuery(event.target.value)} />
          </label>
          <div className="overlay-card-picker">
            {filteredCards.map((card) => (
              <div key={`${card.setCode}-${card.cardId}`} className="overlay-card-option">
                <span>
                  <strong>{card.name}</strong>
                  <small>
                    {card.setCode} {card.collectorNumber} - {card.typeLine || card.rarity}
                  </small>
                </span>
                <div className="export-actions">
                  <button type="button" className="secondary-button" onClick={() => addCard(card, 'main')}>
                    Main
                  </button>
                  <button type="button" className="secondary-button" onClick={() => addCard(card, 'side')}>
                    Side
                  </button>
                  <button type="button" className="secondary-button" onClick={() => addCard(card, 'maybe')}>
                    Maybe
                  </button>
                </div>
              </div>
            ))}
            {!filteredCards.length ? (
              <div className="preview-empty compact-empty">
                <strong>No cards available</strong>
                <span>Load a set first or create the deck empty.</span>
              </div>
            ) : null}
          </div>
          <div className="overlay-entry-table">
            <div className="overlay-entry-heading">
              <span>Count</span>
              <span>Card</span>
              <span>Board</span>
              <span />
            </div>
            {entries.map((entry, index) => (
              <div key={`${entry.setCode}-${entry.cardId}-${entry.section}`} className="overlay-entry-row">
                <input type="number" min="1" value={entry.count} onChange={(event) => updateEntry(index, { count: Number(event.target.value) })} />
                <span>
                  <strong>{entry.nameSnapshot}</strong>
                  <small>{entry.setCode}</small>
                </span>
                <select value={entry.section} onChange={(event) => updateEntry(index, { section: event.target.value as DeckEntry['section'] })}>
                  <option value="main">Main</option>
                  <option value="side">Side</option>
                  <option value="maybe">Maybe</option>
                </select>
                <button type="button" className="icon-button" title="Remove card" onClick={() => { setEntries((current) => current.filter((_, entryIndex) => entryIndex !== index)); markDirty(); }}>
                  <Icon name="trash" />
                </button>
              </div>
            ))}
            {!entries.length ? <p className="workspace-copy">No starting cards added yet.</p> : null}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Collection Cards" subtitle="Add isolated collection rows without creating authored card records">
          <div className="grid-2">
            <Field label="Collection">
              <select value={selectedCollectionId} onChange={(event) => void selectCollection(event.target.value)}>
                <option value="">No collection</option>
                {collections.map((candidate) => (
                  <option key={candidate.collectionId} value={candidate.collectionId}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="search-field overlay-search">
              <Icon name="search" />
              <input value={collectionQuery} placeholder="Search collection cards..." onChange={(event) => setCollectionQuery(event.target.value)} />
            </label>
          </div>
          <div className="overlay-card-picker compact">
            {filteredCollectionEntries.map((entry) => (
              <div key={entry.entryId} className={`overlay-card-option ${entry.reviewStatus === 'needs_review' ? 'needs-review' : ''}`}>
                <span>
                  <strong>{entry.cardName}</strong>
                  <small>
                    {entry.quantity} owned - {[entry.setCode, entry.collectorNumber].filter(Boolean).join(' ') || entry.setName || 'unresolved print'} - {entry.reviewStatus === 'needs_review' ? 'review' : 'matched'}
                  </small>
                </span>
                <div className="export-actions">
                  <button type="button" className="secondary-button" onClick={() => addCollectionEntry(entry, 'main')}>
                    Main
                  </button>
                  <button type="button" className="secondary-button" onClick={() => addCollectionEntry(entry, 'side')}>
                    Side
                  </button>
                  <button type="button" className="secondary-button" onClick={() => addCollectionEntry(entry, 'maybe')}>
                    Maybe
                  </button>
                </div>
              </div>
            ))}
            {!filteredCollectionEntries.length ? (
              <div className="preview-empty compact-empty">
                <strong>No collection rows</strong>
                <span>Select a collection or adjust the search.</span>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      </div>
    </OverlayShell>
  );
}
