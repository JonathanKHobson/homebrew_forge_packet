import { useEffect, useMemo, useRef, useState } from 'react';
import { addOfficialCardToCollection, addOfficialCardToDeck, addOfficialCardToSet, fetchCollection, fetchCollections, fetchDeck, fetchDecks, fetchOfficialCardStatus, fetchPreview, fetchProject, searchOfficialCardCatalog, saveCollection, syncOfficialCardCatalog } from '../api/client.js';
import {
  buildCardBrowserCompareItem,
  cardBrowserCompareDetailsForItem,
  cardBrowserCompareSourceLabel,
  comparePreviewKeyForDraft,
  findSavedDraftForCompareRow,
  type CardBrowserCompareItem,
  type CardBrowserCompareRow
} from '../domain/cardBrowserCompare.js';
import { isOwnedStatus, listCategoryLabel, ownershipStatusLabel } from '../domain/collectionLists.js';
import { collectionOwnerSuggestions, normalizeCollectionOwnerName, normalizeCollectionTags } from '../domain/collectionOwnership.js';
import type { CardDraft, CardSummary, CollectionEntry, CollectionKind, CollectionListCategory, CollectionOwnershipStatus, CollectionPurpose, CollectionState, CollectionSummary, DeckState, DeckSummary, EditorProject, FrameOption, LibraryState, OfficialCardCatalogStatus, OfficialCardCatalogView, OfficialCardSearchCard, OfficialCardSearchResult, PreviewResponse } from '../domain/editorTypes.js';
import type { InspectorTab } from '../domain/editorUiTypes.js';
import { countActiveFilters, matchesNumberQuery, matchesTagFilter } from '../domain/filterTypes.js';
import { sortItemsByState, type ListSortOption, type ListSortState } from '../domain/listControls.js';
import { imageUrlForMetadata, metadataFromCollectionEntry, metadataFromDeckCard } from '../domain/officialCardMetadata.js';
import { formatCount } from '../domain/uiText.js';
import { Field } from './Field.js';
import { BrowseFilterOverlay } from './filters/BrowseFilterOverlay.js';
import { AdvancedFiltersButton, ListControlsBar, ListResultsSummary, SortMenu, StatusPill, type StatusPillTone } from './forge-ui/index.js';
import { Icon, type IconName } from './Icon.js';
import { Inspector } from './Inspector.js';
import { ColorIdentitySymbols, ManaCostSymbols } from './ManaSymbols.js';
import { PanelResizeHandle } from './PanelResizeHandle.js';
import type { ReferenceCatalog } from '@homebrew-forge/forge';

type BrowserScope = 'all' | 'project' | 'set' | 'deck' | 'collection' | 'binder' | 'list' | 'official';
type BrowserPreviewMode = 'card' | 'art';
type BrowserCompareDisplayMode = 'compact' | 'detailed';
type BrowserCatalogViewMode = 'list' | 'grid' | 'columns';
type CardBrowserSurface = 'focused' | 'workspace';
type BrowserSourceKind = 'set' | 'deck' | 'collection' | 'official';
type OfficialActionTarget = '' | 'collection' | 'deck' | 'set';
type BrowserSortOptionId = 'default' | 'name' | 'source' | 'set' | 'mana' | 'color' | 'type' | 'status' | 'quantity' | 'deckSection' | 'rarity';

const OFFICIAL_PAGE_SIZE = 120;

interface BrowserFilters {
  sourceKind: BrowserSourceKind | 'all';
  cardType: string;
  color: string;
  manaValue: string;
  rarity: string;
  status: string;
  tag: string;
  deckSection: DeckState['entries'][number]['section'] | 'all';
  collectionKind: CollectionKind | 'all';
  reviewStatus: CollectionEntry['reviewStatus'] | 'all';
  linkedState: 'all' | 'linked' | 'unresolved';
}

const DEFAULT_BROWSER_FILTERS: BrowserFilters = {
  sourceKind: 'all',
  cardType: 'all',
  color: 'all',
  manaValue: '',
  rarity: 'all',
  status: 'all',
  tag: '',
  deckSection: 'all',
  collectionKind: 'all',
  reviewStatus: 'all',
  linkedState: 'all'
};

const BROWSER_SORT_OPTIONS: Array<ListSortOption<BrowserSortOptionId>> = [
  { id: 'default', label: 'Source order' },
  { id: 'name', label: 'Name' },
  { id: 'source', label: 'Source' },
  { id: 'set', label: 'Set / #' },
  { id: 'mana', label: 'Mana value' },
  { id: 'color', label: 'Color' },
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Status' },
  { id: 'quantity', label: 'Quantity', defaultDirection: 'desc' },
  { id: 'deckSection', label: 'Deck section' },
  { id: 'rarity', label: 'Rarity' }
];

type ComparePreviewCacheEntry =
  | { status: 'loading' }
  | { status: 'ready'; preview: PreviewResponse }
  | { status: 'error'; error: string };

interface CardBrowserViewProps {
  surface?: CardBrowserSurface;
  library: LibraryState | null;
  project: EditorProject | null;
  cardsForList: CardSummary[];
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  previewLoading: boolean;
  previewUpdating: boolean;
  hasUnsavedChanges: boolean;
  selectedFrame: FrameOption | null;
  referenceCatalog: ReferenceCatalog | null;
  inspectorTab: InspectorTab;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onDraftChange: (draft: CardDraft) => void;
  onVariantChange: (variantId: string) => void;
  onInspectorTabChange: (tab: InspectorTab) => void;
  onSaveVariant: (draft: CardDraft) => void;
  onExit?: () => void;
  onStatus: (status: string) => void;
}

interface BrowserRow extends CardBrowserCompareRow {
  key: string;
  sourceKind: BrowserSourceKind;
  sourceId: string;
  sourceName: string;
  projectId?: string;
  setCode?: string;
  setName?: string;
  cardId?: string;
  variantId?: string;
  collectionEntryId?: string;
  officialCard?: OfficialCardSearchCard;
  name: string;
  typeLine: string;
  manaCost: string;
  colors: string;
  status: string;
  tags: string[];
  quantity?: number;
  deckSection?: string;
  collectionKind?: CollectionKind;
  collectionListCategory?: CollectionListCategory;
  ownershipStatus?: CollectionOwnershipStatus;
  ownerName?: string;
  reviewStatus?: CollectionEntry['reviewStatus'];
  rarity?: string;
  manaValue?: number;
  collectorNumber?: string;
  imageUrl?: string;
  sourceOrder?: number;
  variants: CardSummary['variants'];
  searchText: string;
}

export function CardBrowserView({
  surface = 'focused',
  library,
  project,
  cardsForList,
  draft,
  preview,
  previewLoading,
  previewUpdating,
  hasUnsavedChanges,
  selectedFrame,
  referenceCatalog,
  inspectorTab,
  onOpenCard,
  onDraftChange,
  onVariantChange,
  onInspectorTabChange,
  onSaveVariant,
  onExit,
  onStatus
}: CardBrowserViewProps) {
  const [scope, setScope] = useState<BrowserScope>('all');
  const [scopeId, setScopeId] = useState('');
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [browserFilters, setBrowserFilters] = useState<BrowserFilters>(DEFAULT_BROWSER_FILTERS);
  const [browserFiltersOpen, setBrowserFiltersOpen] = useState(false);
  const [sortState, setSortState] = useState<ListSortState<BrowserSortOptionId>>({ option: 'name', direction: 'asc' });
  const [previewMode, setPreviewMode] = useState<BrowserPreviewMode>('card');
  const [compareDisplayMode, setCompareDisplayMode] = useState<BrowserCompareDisplayMode>('compact');
  const [catalogViewMode, setCatalogViewMode] = useState<BrowserCatalogViewMode>('list');
  const [catalogLeftOpen, setCatalogLeftOpen] = useState(false);
  const [catalogRightOpen, setCatalogRightOpen] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState('');
  const [compareRowKeys, setCompareRowKeys] = useState<string[]>([]);
  const [compareModeActive, setCompareModeActive] = useState(false);
  const [comparePreviewCache, setComparePreviewCache] = useState<Record<string, ComparePreviewCacheEntry>>({});
  const [browserPreviewCache, setBrowserPreviewCache] = useState<Record<string, ComparePreviewCacheEntry>>({});
  const [leftWidth, setLeftWidth] = useState(520);
  const [previewHeightPercent, setPreviewHeightPercent] = useState(54);
  const [projectsBySet, setProjectsBySet] = useState<Record<string, EditorProject>>({});
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [deckStates, setDeckStates] = useState<Record<string, DeckState>>({});
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionStates, setCollectionStates] = useState<Record<string, CollectionState>>({});
  const [collectionDirtyIds, setCollectionDirtyIds] = useState<Set<string>>(() => new Set());
  const [savingCollectionId, setSavingCollectionId] = useState('');
  const [officialView, setOfficialView] = useState<OfficialCardCatalogView>('prints');
  const [officialCards, setOfficialCards] = useState<OfficialCardSearchCard[]>([]);
  const [officialResult, setOfficialResult] = useState<OfficialCardSearchResult | null>(null);
  const [officialStatus, setOfficialStatus] = useState<OfficialCardCatalogStatus | null>(null);
  const [officialOffset, setOfficialOffset] = useState(0);
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialSyncing, setOfficialSyncing] = useState(false);
  const [officialAutoSyncStarted, setOfficialAutoSyncStarted] = useState(false);
  const [officialAction, setOfficialAction] = useState<OfficialActionTarget>('');
  const [officialCollectionId, setOfficialCollectionId] = useState('');
  const [officialCollectionName, setOfficialCollectionName] = useState('Official Cards');
  const [officialOwnerName, setOfficialOwnerName] = useState('Kyle');
  const [officialDeckId, setOfficialDeckId] = useState('');
  const [officialDeckSection, setOfficialDeckSection] = useState<'main' | 'side' | 'maybe'>('main');
  const [officialSetCode, setOfficialSetCode] = useState('');
  const [officialQuantity, setOfficialQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState('');
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const focusedSurface = surface === 'focused';

  useEffect(() => {
    let cancelled = false;
    async function loadBrowserData() {
      setLoading(true);
      const warnings: string[] = [];
      try {
        const setSummaries = library?.sets ?? [];
        const projectPairs = await Promise.all(
          setSummaries.map(async (set) => {
            if (project?.setCode === set.setCode) {
              return [set.setCode, project] as const;
            }
            try {
              return [set.setCode, await fetchProject(set.setCode)] as const;
            } catch (error) {
              warnings.push(error instanceof Error ? error.message : String(error));
              return null;
            }
          })
        );
        const loadedProjects = Object.fromEntries(projectPairs.filter((pair): pair is readonly [string, EditorProject] => Boolean(pair)));

        const loadedDecks = await fetchDecks().catch((error: unknown) => {
          warnings.push(error instanceof Error ? error.message : String(error));
          return [] as DeckSummary[];
        });
        const loadedDeckPairs = await Promise.all(
          loadedDecks.map(async (deck) => {
            try {
              return [deck.deckId, await fetchDeck(deck.deckId)] as const;
            } catch (error) {
              warnings.push(error instanceof Error ? error.message : String(error));
              return null;
            }
          })
        );
        const loadedCollections = await fetchCollections().catch((error: unknown) => {
          warnings.push(error instanceof Error ? error.message : String(error));
          return [] as CollectionSummary[];
        });
        const loadedOfficialStatus = await fetchOfficialCardStatus().catch((error: unknown) => {
          warnings.push(error instanceof Error ? error.message : String(error));
          return null;
        });
        const loadedCollectionPairs = await Promise.all(
          loadedCollections.map(async (collection) => {
            try {
              return [collection.collectionId, await fetchCollection(collection.collectionId)] as const;
            } catch (error) {
              warnings.push(error instanceof Error ? error.message : String(error));
              return null;
            }
          })
        );

        if (cancelled) {
          return;
        }
        setProjectsBySet(loadedProjects);
        setDecks(loadedDecks);
        setDeckStates(Object.fromEntries(loadedDeckPairs.filter((pair): pair is readonly [string, DeckState] => Boolean(pair))));
        setCollections(loadedCollections);
        setOfficialStatus(loadedOfficialStatus);
        setOfficialCollectionId(loadedCollections[0]?.collectionId ?? '');
        setOfficialDeckId(loadedDecks[0]?.deckId ?? '');
        setOfficialSetCode(project?.setCode ?? library?.selectedSetCode ?? setSummaries[0]?.setCode ?? '');
        setCollectionStates(Object.fromEntries(loadedCollectionPairs.filter((pair): pair is readonly [string, CollectionState] => Boolean(pair))));
        const nextStatus = warnings.length ? `Loaded browser view with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.` : 'Loaded card browser view.';
        setLoadStatus(nextStatus);
        onStatus(nextStatus);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadBrowserData();
    return () => {
      cancelled = true;
    };
  }, [library, onStatus, project]);

  useEffect(() => {
    if (!focusedSurface && scope === 'official') {
      setScope('all');
    }
  }, [focusedSurface, scope]);

  const rows = useMemo(
    () =>
      buildBrowserRows({
        library,
        projectsBySet,
        currentProject: project,
        currentCards: cardsForList,
        decks,
        deckStates,
        collections,
        collectionStates,
        officialCards: focusedSurface ? officialCards : []
      }),
    [cardsForList, collectionStates, collections, deckStates, decks, focusedSurface, library, officialCards, project, projectsBySet]
  );
  const ownerSuggestions = useMemo(
    () => collectionOwnerSuggestions(collections.flatMap((collection) => collection.ownerNames ?? []), Object.values(collectionStates).flatMap((state) => state.entries.map((entry) => entry.ownerName))),
    [collectionStates, collections]
  );
  const activeBrowserFilterCount = countActiveBrowserFilters(browserFilters, ownerFilter);
  const filteredRows = useMemo(() => filterBrowserRows(rows, scope, scopeId, query, ownerFilter, browserFilters), [browserFilters, ownerFilter, query, rows, scope, scopeId]);
  const sortedRows = useMemo(
    () =>
      sortItemsByState(
        filteredRows,
        sortState,
        {
          default: (row) => row.sourceOrder ?? 0,
          name: (row) => row.name,
          source: (row) => `${row.sourceKind}:${row.sourceName}`,
          set: (row) => `${row.setCode ?? ''}:${row.collectorNumber ?? ''}`,
          mana: (row) => row.manaValue ?? manaValueFromCost(row.manaCost),
          color: (row) => row.colors,
          type: (row) => row.typeLine,
          status: (row) => row.status || row.reviewStatus,
          quantity: (row) => row.quantity ?? 1,
          deckSection: (row) => row.deckSection ?? '',
          rarity: (row) => row.rarity ?? ''
        },
        (row) => row.name
      ),
    [filteredRows, sortState]
  );
  const rowByKey = useMemo(() => new Map(rows.map((row) => [row.key, row])), [rows]);
  const compareItems = useMemo(
    () =>
      compareRowKeys
        .map((key) => rowByKey.get(key))
        .filter((row): row is BrowserRow => Boolean(row))
        .map((row) => buildCardBrowserCompareItem(row, { projectsBySet, currentProject: project, collectionStates })),
    [collectionStates, compareRowKeys, project, projectsBySet, rowByKey]
  );
  const compareReady = compareItems.length === 2;
  const activeDirtyDraftInCompare = Boolean(
    hasUnsavedChanges &&
      draft &&
      compareItems.some((item) => item.row.setCode === draft.setCode && item.row.cardId === draft.cardId && (!item.row.variantId || item.row.variantId === draft.variantId))
  );
  const selectedRow = sortedRows.find((row) => row.key === selectedRowKey) ?? sortedRows[0] ?? null;
  const selectedCollection = selectedRow?.sourceKind === 'collection' ? collectionStates[selectedRow.sourceId] : null;
  const selectedCollectionEntry = selectedCollection?.entries.find((entry) => entry.entryId === selectedRow?.collectionEntryId);
  const selectedOfficialCard = selectedRow?.sourceKind === 'official' ? selectedRow.officialCard : undefined;
  const selectedCompareItem = useMemo(
    () => selectedRow ? buildCardBrowserCompareItem(selectedRow, { projectsBySet, currentProject: project, collectionStates }) : null,
    [collectionStates, project, projectsBySet, selectedRow]
  );
  const selectedSavedDraft = selectedCompareItem?.draft ?? null;
  const selectedPreviewKey = selectedSavedDraft ? comparePreviewKeyForDraft(selectedSavedDraft) : '';
  const selectedPreviewCacheEntry = selectedPreviewKey ? browserPreviewCache[selectedPreviewKey] : undefined;
  const activeDraftMatchesRow = Boolean(draft && selectedRow?.cardId && selectedRow.setCode === draft.setCode && selectedRow.cardId === draft.cardId && (!selectedRow.variantId || selectedRow.variantId === draft.variantId));
  const activeDraft = activeDraftMatchesRow ? draft : null;
  const entityOptions = useMemo(() => buildScopeOptions(scope, library, decks, collections), [collections, decks, library, scope]);
  const showScopeEntityPicker = scope !== 'all' && scope !== 'official' && entityOptions.length > 0;
  const previewRows = compareModeActive ? 'minmax(0, 1fr)' : `${previewHeightPercent}% 6px ${100 - previewHeightPercent}%`;
  const officialShowingStart = officialResult?.total ? officialResult.offset + 1 : 0;
  const officialShowingEnd = officialResult ? Math.min(officialResult.offset + officialResult.cards.length, officialResult.total) : 0;
  const browserFiltersOverlay = browserFiltersOpen ? (
    <BrowseFilterOverlay
      title="Browse Card Browser"
      subtitle="Filter source rows without hiding search or sort controls."
      resultsLabel={`${sortedRows.length} matching rows`}
      activeFilterCount={activeBrowserFilterCount}
      onClose={() => setBrowserFiltersOpen(false)}
      onResetFilters={resetBrowserFilters}
      results={
        <div className="filter-result-list">
          {sortedRows.slice(0, 80).map((row) => (
            <button key={row.key} type="button" className={`entity-row clickable ${row.key === selectedRow?.key ? 'selected' : ''}`} onClick={() => { setSelectedRowKey(row.key); setBrowserFiltersOpen(false); }}>
              <Icon name={iconForBrowserSource(row.sourceKind)} />
              <span>
                <strong>{row.name}</strong>
                <small>{sourceLabel(row)} - {row.sourceName}</small>
              </span>
            </button>
          ))}
          {!sortedRows.length ? (
            <div className="preview-empty compact-empty">
              <strong>No rows match</strong>
              <span>Reset filters or clear the Card Browser search.</span>
            </div>
          ) : null}
        </div>
      }
    >
      <BrowserAdvancedFilterControls
        filters={browserFilters}
        ownerFilter={ownerFilter}
        ownerSuggestions={ownerSuggestions}
        onFiltersChange={(patch) => setBrowserFilters((current) => ({ ...current, ...patch }))}
        onOwnerFilterChange={setOwnerFilter}
      />
    </BrowseFilterOverlay>
  ) : null;

  useEffect(() => {
    if (!sortedRows.length) {
      setSelectedRowKey('');
      return;
    }
    if (selectedRowKey && sortedRows.some((row) => row.key === selectedRowKey)) {
      return;
    }
    const currentDraftRow = draft ? sortedRows.find((row) => row.setCode === draft.setCode && row.cardId === draft.cardId) : undefined;
    setSelectedRowKey((currentDraftRow ?? sortedRows[0]).key);
  }, [draft, selectedRowKey, sortedRows]);

  useEffect(() => {
    setScopeId('');
  }, [scope]);

  useEffect(() => {
    setOfficialOffset(0);
  }, [officialView, query]);

  useEffect(() => {
    if (!officialDeckId && decks[0]) {
      setOfficialDeckId(decks[0].deckId);
    }
  }, [decks, officialDeckId]);

  useEffect(() => {
    if (!officialSetCode && library?.selectedSetCode) {
      setOfficialSetCode(library.selectedSetCode);
    }
  }, [library, officialSetCode]);

  useEffect(() => {
    setCompareRowKeys((current) => current.filter((key) => rowByKey.has(key)).slice(0, 2));
  }, [rowByKey]);

  useEffect(() => {
    if (compareModeActive && !compareReady) {
      setCompareModeActive(false);
    }
  }, [compareModeActive, compareReady]);

  useEffect(() => {
    if (scope !== 'official') {
      return;
    }
    let cancelled = false;
    setOfficialLoading(true);
    void searchOfficialCardCatalog({ view: officialView, query, limit: OFFICIAL_PAGE_SIZE, offset: officialOffset })
      .then((result) => {
        if (!cancelled) {
          setOfficialCards(result.cards);
          setOfficialResult(result);
          setOfficialStatus(result.status);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOfficialCards([]);
          setOfficialResult(null);
          onStatus(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOfficialLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [officialOffset, officialView, onStatus, query, scope]);

  useEffect(() => {
    if (scope !== 'official' || officialAutoSyncStarted || officialSyncing || !officialStatus) {
      return;
    }
    const source = officialCatalogSource(officialStatus, officialView);
    if (source.available) {
      return;
    }
    setOfficialAutoSyncStarted(true);
    onStatus('Official card catalog is missing; syncing live in the background. This can take a few minutes the first time.');
    void syncOfficialCatalog();
  }, [officialAutoSyncStarted, officialStatus, officialSyncing, officialView, onStatus, scope]);

  useEffect(() => {
    if (!compareModeActive) {
      return;
    }
    let cancelled = false;
    for (const item of compareItems) {
      if (!item.draft) {
        continue;
      }
      const key = comparePreviewKeyForDraft(item.draft);
      const current = comparePreviewCache[key];
      if (current?.status === 'loading' || current?.status === 'ready') {
        continue;
      }
      setComparePreviewCache((cache) => ({ ...cache, [key]: { status: 'loading' } }));
      void fetchPreview(item.draft)
        .then((nextPreview) => {
          if (!cancelled) {
            setComparePreviewCache((cache) => ({ ...cache, [key]: { status: 'ready', preview: nextPreview } }));
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setComparePreviewCache((cache) => ({ ...cache, [key]: { status: 'error', error: error instanceof Error ? error.message : String(error) } }));
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [compareItems, compareModeActive, comparePreviewCache]);

  useEffect(() => {
    if (!selectedSavedDraft || !selectedPreviewKey) {
      return;
    }
    const current = browserPreviewCache[selectedPreviewKey];
    if (current?.status === 'loading' || current?.status === 'ready') {
      return;
    }
    let cancelled = false;
    setBrowserPreviewCache((cache) => ({ ...cache, [selectedPreviewKey]: { status: 'loading' } }));
    void fetchPreview(selectedSavedDraft)
      .then((nextPreview) => {
        if (!cancelled) {
          setBrowserPreviewCache((cache) => ({ ...cache, [selectedPreviewKey]: { status: 'ready', preview: nextPreview } }));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setBrowserPreviewCache((cache) => ({ ...cache, [selectedPreviewKey]: { status: 'error', error: error instanceof Error ? error.message : String(error) } }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [browserPreviewCache, selectedPreviewKey, selectedSavedDraft]);

  function resizeLeft(delta: number) {
    setLeftWidth((width) => clamp(width + delta, 320, 760));
  }

  function resizePreview(delta: number) {
    const height = rightPaneRef.current?.clientHeight;
    if (!height || height <= 6) {
      return;
    }
    setPreviewHeightPercent((value) => clamp(value + (delta / (height - 6)) * 100, 28, 74));
  }

  async function selectRow(row: BrowserRow) {
    setSelectedRowKey(row.key);
    if (focusedSurface && row.setCode && row.cardId && row.sourceKind !== 'official' && (row.sourceKind === 'set' || Boolean(row.projectId))) {
      await onOpenCard(row.setCode, row.cardId, row.variantId);
    }
  }

  async function openRowInMaker(row: BrowserRow | null = selectedRow) {
    if (!row?.setCode || !row.cardId || row.sourceKind === 'official') {
      onStatus('Select an authored card row to open in Maker.');
      return;
    }
    await onOpenCard(row.setCode, row.cardId, row.variantId);
  }

  function toggleCompareRow(row: BrowserRow) {
    setCompareRowKeys((current) => {
      if (current.includes(row.key)) {
        return current.filter((key) => key !== row.key);
      }
      if (current.length >= 2) {
        return current;
      }
      return [...current, row.key];
    });
  }

  function openCompareMode() {
    if (!compareReady) {
      onStatus('Select exactly two source rows to compare.');
      return;
    }
    setCompareModeActive(true);
    setCompareDisplayMode('compact');
    onStatus(`Comparing ${compareItems[0]?.row.name ?? 'card'} and ${compareItems[1]?.row.name ?? 'card'}.`);
  }

  function clearCompareSelection() {
    setCompareModeActive(false);
    setCompareRowKeys([]);
    onStatus('Cleared card comparison selection.');
  }

  function resetBrowserFilters() {
    setOwnerFilter('');
    setBrowserFilters(DEFAULT_BROWSER_FILTERS);
  }

  function updateCollectionEntry(patch: Partial<CollectionEntry>) {
    if (!selectedCollection || !selectedCollectionEntry) {
      return;
    }
    setCollectionStates((current) => ({
      ...current,
      [selectedCollection.metadata.collectionId]: {
        ...selectedCollection,
        entries: selectedCollection.entries.map((entry) =>
          entry.entryId === selectedCollectionEntry.entryId
            ? {
                ...entry,
                ...patch,
                quantity: Math.max(1, Number(patch.quantity ?? entry.quantity) || 1)
              }
            : entry
        )
      }
    }));
    setCollectionDirtyIds((current) => new Set(current).add(selectedCollection.metadata.collectionId));
  }

  async function saveSelectedCollection() {
    if (!selectedCollection) {
      return;
    }
    setSavingCollectionId(selectedCollection.metadata.collectionId);
    try {
      const result = await saveCollection(selectedCollection);
      setCollections(result.collections);
      setCollectionStates((current) => ({ ...current, [result.collection.metadata.collectionId]: result.collection }));
      setCollectionDirtyIds((current) => {
        const next = new Set(current);
        next.delete(result.collection.metadata.collectionId);
        return next;
      });
      onStatus(`Saved collection ${result.collection.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingCollectionId('');
    }
  }

  async function syncOfficialCatalog() {
    if (officialSyncing) {
      return;
    }
    setOfficialSyncing(true);
    try {
      const status = await syncOfficialCardCatalog('both');
      const result = await searchOfficialCardCatalog({ view: officialView, query, limit: OFFICIAL_PAGE_SIZE, offset: officialOffset });
      setOfficialStatus(status);
      setOfficialCards(result.cards);
      setOfficialResult(result);
      onStatus(`Synced official card catalog. ${formatCount(status.prints.count + status.oracle.count, 'card record')} cached.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialSyncing(false);
    }
  }

  async function addOfficialSelectionToCollection() {
    if (!selectedOfficialCard || selectedOfficialCard.view !== 'prints') {
      onStatus('Switch official browsing to Prints before adding a card to a collection.');
      return;
    }
    setOfficialAction('collection');
    try {
      const result = await addOfficialCardToCollection({
        cardId: selectedOfficialCard.id,
        collectionId: officialCollectionId || undefined,
        collectionName: officialCollectionId ? undefined : officialCollectionName,
        quantity: officialQuantity,
        ownerName: normalizeCollectionOwnerName(officialOwnerName)
      });
      setCollections(result.collections);
      setCollectionStates((current) => ({ ...current, [result.collection.metadata.collectionId]: result.collection }));
      setOfficialCollectionId(result.collection.metadata.collectionId);
      onStatus(`Added ${selectedOfficialCard.name} to ${result.collection.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialAction('');
    }
  }

  async function addOfficialSelectionToDeck() {
    if (!selectedOfficialCard || selectedOfficialCard.view !== 'prints') {
      onStatus('Switch official browsing to Prints before adding a card to a deck.');
      return;
    }
    if (!officialDeckId) {
      onStatus('Create or choose a deck before adding an official card to a deck.');
      return;
    }
    setOfficialAction('deck');
    try {
      const result = await addOfficialCardToDeck({
        cardId: selectedOfficialCard.id,
        deckId: officialDeckId,
        section: officialDeckSection,
        quantity: officialQuantity,
        collectionId: officialCollectionId || 'official-cards',
        collectionName: officialCollectionId ? undefined : officialCollectionName || 'Official Cards'
      });
      setDecks(result.decks);
      setDeckStates((current) => ({ ...current, [result.deck.metadata.deckId]: result.deck }));
      const nextCollections = await fetchCollections();
      setCollections(nextCollections);
      const backingCollectionId = officialCollectionId || 'official-cards';
      const backingCollection = await fetchCollection(backingCollectionId).catch(() => null);
      if (backingCollection) {
        setCollectionStates((current) => ({ ...current, [backingCollection.metadata.collectionId]: backingCollection }));
        setOfficialCollectionId(backingCollection.metadata.collectionId);
      }
      onStatus(`Added ${selectedOfficialCard.name} to ${result.deck.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialAction('');
    }
  }

  async function addOfficialSelectionToSet() {
    if (!selectedOfficialCard || selectedOfficialCard.view !== 'prints') {
      onStatus('Switch official browsing to Prints before copying an official card into a set.');
      return;
    }
    if (!officialSetCode) {
      onStatus('Choose a set before copying an official card into a set.');
      return;
    }
    setOfficialAction('set');
    try {
      const result = await addOfficialCardToSet({
        cardId: selectedOfficialCard.id,
        setCode: officialSetCode
      });
      setProjectsBySet((current) => ({ ...current, [result.project.setCode]: result.project }));
      await onOpenCard(result.summary.setCode, result.summary.cardId);
      onStatus(`Copied ${result.summary.name} to ${result.project.setName}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialAction('');
    }
  }

  if (!focusedSurface) {
    const catalogColumns = `${catalogLeftOpen ? '300px' : '36px'} minmax(0, 1fr) ${catalogRightOpen ? '380px' : '36px'}`;
    return (
      <div className={`card-browser-view card-catalog-workspace ${catalogViewMode}`} style={{ gridTemplateColumns: catalogColumns }}>
        {catalogLeftOpen ? (
          <section className="card-browser-list-panel card-catalog-filter-panel">
            <div className="card-browser-header">
              <div>
                <h2>Filters</h2>
                <p>{formatCount(sortedRows.length, 'row')} shown</p>
              </div>
              <button type="button" className="icon-button" onClick={() => setCatalogLeftOpen(false)} title="Collapse filters" aria-label="Collapse filters">
                <Icon name="collapseLeft" />
              </button>
            </div>
            <div className="card-browser-controls">
              <div className="grid-2 compact-filter-grid">
                <label className="filter-field">
                  <span>Scope</span>
                  <select value={scope} onChange={(event) => setScope(event.target.value as BrowserScope)}>
                    <option value="all">All app cards</option>
                    <option value="project">Project</option>
                    <option value="set">Set</option>
                    <option value="deck">Deck</option>
                    <option value="collection">Collection</option>
                    <option value="binder">Binder</option>
                    <option value="list">List</option>
                  </select>
                </label>
                {showScopeEntityPicker ? (
                  <label className="filter-field">
                    <span>{scopeContextLabel(scope)}</span>
                    <select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                      <option value="">{allScopeLabel(scope)}</option>
                      {entityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="filter-field">
                  <span>Owner</span>
                  <input list="card-catalog-owner-filter-options" value={ownerFilter} placeholder="Any owner" onChange={(event) => setOwnerFilter(event.target.value)} />
                  <datalist id="card-catalog-owner-filter-options">
                    {ownerSuggestions.map((owner) => (
                      <option key={owner} value={owner} />
                    ))}
                  </datalist>
                </label>
              </div>
            </div>
            <div className="status-strip">{loading ? 'Loading card catalog...' : loadStatus}</div>
          </section>
        ) : (
          <button type="button" className="collapsed-panel-strip left" onClick={() => setCatalogLeftOpen(true)} title="Show card filters" aria-label="Show card filters">
            <Icon name="collapseRight" />
          </button>
        )}
        <section className="card-catalog-main" aria-label="Cards catalog">
          <div className="card-browser-header card-catalog-main-header">
            <div>
              <h2>Cards</h2>
              <p>{formatCount(sortedRows.length, 'row')} of {formatCount(rows.length, 'row')} in this app</p>
            </div>
            <div className="card-browser-preview-actions">
              <button type="button" className="secondary-button compact" onClick={() => setCatalogLeftOpen((value) => !value)}>
                Filters
              </button>
              <div className="segmented-actions" role="group" aria-label="Cards catalog view">
                <button type="button" className={`secondary-button compact ${catalogViewMode === 'list' ? 'active' : ''}`} onClick={() => setCatalogViewMode('list')}>
                  List
                </button>
                <button type="button" className={`secondary-button compact ${catalogViewMode === 'grid' ? 'active' : ''}`} onClick={() => setCatalogViewMode('grid')}>
                  Grid
                </button>
                <button type="button" className={`secondary-button compact ${catalogViewMode === 'columns' ? 'active' : ''}`} onClick={() => setCatalogViewMode('columns')}>
                  Columns
                </button>
              </div>
              <button type="button" className="secondary-button compact" disabled={!selectedRow} onClick={() => void openRowInMaker()}>
                Open in Maker
              </button>
              <button type="button" className="secondary-button compact" onClick={() => setCatalogRightOpen((value) => !value)}>
                Details
              </button>
            </div>
          </div>
          <div className="card-browser-controls card-catalog-search-row">
            <ListControlsBar
              searchLabel="Search app cards"
              searchValue={query}
              searchPlaceholder="Search app cards..."
              onSearchChange={setQuery}
              sortControl={<SortMenu options={BROWSER_SORT_OPTIONS} state={sortState} onChange={setSortState} />}
              filterControl={<AdvancedFiltersButton activeCount={activeBrowserFilterCount} onClick={() => setBrowserFiltersOpen(true)} />}
              resetControl={query.trim() || activeBrowserFilterCount ? <button type="button" className="secondary-button compact" onClick={() => { setQuery(''); resetBrowserFilters(); }}>Reset</button> : null}
              results={<ListResultsSummary shown={sortedRows.length} total={rows.length} />}
            />
          </div>
          <div className={`card-catalog-results ${catalogViewMode}`} role="list" aria-label="Cards in this app">
            {sortedRows.map((row) => (
              <button
                key={row.key}
                type="button"
                role="listitem"
                className={`card-catalog-result ${row.key === selectedRow?.key ? 'selected' : ''} ${row.ownershipStatus && !isOwnedStatus(row.ownershipStatus) ? 'not-owned' : ''}`}
                aria-current={row.key === selectedRow?.key ? 'true' : undefined}
                onClick={() => {
                  setSelectedRowKey(row.key);
                  setCatalogRightOpen(true);
                }}
                onDoubleClick={() => void openRowInMaker(row)}
              >
                <StatusPill tone={toneForBrowserSource(row.sourceKind)} className={`card-browser-source ${row.sourceKind}`}>
                  {sourceLabel(row)}
                </StatusPill>
                <span className="card-browser-row-main">
                  <strong>{row.name}</strong>
                  <small>{row.typeLine || row.sourceName}</small>
                  <span>{row.setCode ? `${row.setCode}${row.quantity ? ` x${row.quantity}` : ''}` : row.sourceName}{row.ownerName ? ` - ${row.ownerName}` : ''}{row.ownershipStatus && !isOwnedStatus(row.ownershipStatus) ? ` - ${ownershipStatusLabel(row.ownershipStatus)}` : ''}</span>
                </span>
                <span className="card-browser-row-meta">{row.variants.length ? `${row.variants.length}v` : row.reviewStatus === 'needs_review' ? 'Review' : ''}</span>
              </button>
            ))}
            {!sortedRows.length ? (
              <div className="preview-empty compact-empty">
                <strong>No cards match</strong>
                <span>Clear search or change the filter scope.</span>
              </div>
            ) : null}
          </div>
        </section>
        {catalogRightOpen ? (
          <section className="card-browser-detail-panel card-catalog-detail-panel">
            <div className="card-browser-preview-toggle">
              <div>
                <strong>{selectedRow?.name ?? 'No card selected'}</strong>
                <span>{selectedRow ? `${selectedRow.sourceName} - ${selectedRow.sourceKind}` : 'Details'}</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setCatalogRightOpen(false)} title="Collapse details" aria-label="Collapse details">
                <Icon name="collapseRight" />
              </button>
            </div>
            {selectedRow ? (
              <CatalogRowDetails row={selectedRow} onOpenInMaker={() => void openRowInMaker(selectedRow)} />
            ) : (
              <div className="card-browser-detail-empty">
                <h2>Details</h2>
                <p>Select a card row to inspect its source, status, tags, and app location.</p>
              </div>
            )}
          </section>
        ) : (
          <button type="button" className="collapsed-panel-strip right" onClick={() => setCatalogRightOpen(true)} title="Show card details" aria-label="Show card details">
            <Icon name="collapseLeft" />
          </button>
        )}
        {browserFiltersOverlay}
      </div>
    );
  }

  return (
    <div className="card-browser-view" style={{ gridTemplateColumns: `${leftWidth}px 6px minmax(0, 1fr)` }}>
      {onExit ? (
        <button type="button" className="focused-layout-exit-button" onClick={onExit} title="Exit Card Browser" aria-label="Exit Card Browser">
          <Icon name="close" />
        </button>
      ) : null}
      <section className="card-browser-list-panel">
        <div className="card-browser-header">
          <div>
            <h2>Card Browser</h2>
            <p>{formatCount(sortedRows.length, 'row')} of {formatCount(rows.length, 'row')}</p>
          </div>
        </div>
        <div className="card-browser-controls">
          <ListControlsBar
            searchLabel="Search Card Browser rows"
            searchValue={query}
            searchPlaceholder="Search cards..."
            onSearchChange={setQuery}
            sortControl={<SortMenu options={BROWSER_SORT_OPTIONS} state={sortState} onChange={setSortState} />}
            filterControl={<AdvancedFiltersButton activeCount={activeBrowserFilterCount} onClick={() => setBrowserFiltersOpen(true)} />}
            resetControl={query.trim() || activeBrowserFilterCount ? <button type="button" className="secondary-button compact" onClick={() => { setQuery(''); resetBrowserFilters(); }}>Reset</button> : null}
            results={<ListResultsSummary shown={sortedRows.length} total={rows.length} />}
          />
          <div className="grid-2 compact-filter-grid card-browser-scope-controls">
            <label className="filter-field">
              <span>Scope</span>
              <select value={scope} onChange={(event) => setScope(event.target.value as BrowserScope)}>
                <option value="all">All cards</option>
                <option value="project">Project</option>
                <option value="set">Set</option>
                <option value="deck">Deck</option>
                <option value="collection">Collection</option>
                <option value="binder">Binder</option>
                <option value="list">List</option>
                {focusedSurface ? <option value="official">Official catalog</option> : null}
              </select>
            </label>
            {showScopeEntityPicker ? (
              <label className="filter-field">
                <span>{scopeContextLabel(scope)}</span>
                <select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                  <option value="">{allScopeLabel(scope)}</option>
                  {entityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          {scope === 'official' ? (
            <div className="card-browser-official-tools">
              <div className="segmented-actions" role="group" aria-label="Official card catalog view">
                <button type="button" className={`secondary-button compact ${officialView === 'prints' ? 'active' : ''}`} onClick={() => setOfficialView('prints')}>
                  Prints
                </button>
                <button type="button" className={`secondary-button compact ${officialView === 'oracle' ? 'active' : ''}`} onClick={() => setOfficialView('oracle')}>
                  Oracle
                </button>
              </div>
              <button type="button" className="secondary-button compact" disabled={officialSyncing} onClick={() => void syncOfficialCatalog()}>
                {officialSyncing ? 'Syncing catalog...' : officialCatalogStatusLabel(officialStatus, officialView)}
              </button>
              <div className="official-pagination" aria-live="polite">
                <span>
                  {officialResult ? `${officialShowingStart.toLocaleString()}-${officialShowingEnd.toLocaleString()} of ${formatCount(officialResult.total, 'card')}` : 'No page loaded'}
                </span>
                <button type="button" className="secondary-button compact" disabled={officialLoading || officialOffset <= 0} onClick={() => setOfficialOffset((offset) => Math.max(0, offset - OFFICIAL_PAGE_SIZE))}>
                  Prev
                </button>
                <button
                  type="button"
                  className="secondary-button compact"
                  disabled={officialLoading || !officialResult || officialResult.offset + officialResult.cards.length >= officialResult.total}
                  onClick={() => setOfficialOffset((offset) => offset + OFFICIAL_PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="card-browser-compare-bar compact" aria-live="polite">
          <div>
            <strong>Compare {compareRowKeys.length}/2</strong>
            <span title="Compare two saved source rows without changing card, deck, or collection data.">Saved rows only</span>
          </div>
          <div className="card-browser-compare-actions">
            <button type="button" className="secondary-button compact" disabled={!compareReady} onClick={openCompareMode}>
              Compare
            </button>
            <button type="button" className="secondary-button compact" disabled={!compareRowKeys.length} onClick={clearCompareSelection}>
              Clear
            </button>
          </div>
        </div>
        <div className="card-browser-list" role="list" aria-label="Cards">
          {sortedRows.map((row) => {
            const compareSelected = compareRowKeys.includes(row.key);
            const compareDisabled = !compareSelected && compareRowKeys.length >= 2;
            return (
              <div key={row.key} role="listitem" className={`card-browser-row-shell ${compareSelected ? 'compare-selected' : ''}`}>
                <label className="card-browser-compare-check" title={compareDisabled ? 'Clear a selected row before choosing another comparison row.' : `Select ${row.name} for comparison`}>
                  <input type="checkbox" checked={compareSelected} disabled={compareDisabled} aria-label={`Select ${row.name} from ${row.sourceName} for comparison`} onChange={() => toggleCompareRow(row)} />
                </label>
                <button type="button" className={`card-browser-row ${row.key === selectedRow?.key ? 'selected' : ''} ${row.ownershipStatus && !isOwnedStatus(row.ownershipStatus) ? 'not-owned' : ''}`} aria-current={row.key === selectedRow?.key ? 'true' : undefined} onClick={() => void selectRow(row)}>
                  <StatusPill tone={toneForBrowserSource(row.sourceKind)} className={`card-browser-source ${row.sourceKind}`}>
                    {sourceLabel(row)}
                  </StatusPill>
                  <span className="card-browser-row-main">
                    <strong>{row.name}</strong>
                    <small>{row.typeLine || row.sourceName}</small>
                    <span>{row.setCode ? `${row.setCode}${row.quantity ? ` x${row.quantity}` : ''}` : row.sourceName}{row.ownerName ? ` - ${row.ownerName}` : ''}{row.ownershipStatus && !isOwnedStatus(row.ownershipStatus) ? ` - ${ownershipStatusLabel(row.ownershipStatus)}` : ''}</span>
                  </span>
                  <span className="card-browser-row-meta">{row.variants.length ? `${row.variants.length}v` : row.reviewStatus === 'needs_review' ? 'Review' : ''}</span>
                </button>
              </div>
            );
          })}
          {!sortedRows.length ? (
            <div className="preview-empty compact-empty">
              <strong>{scope === 'official' && officialSyncing ? 'Syncing official catalog' : 'No cards match'}</strong>
              <span>{scope === 'official' && officialSyncing ? 'Downloading the local Scryfall cache in the background.' : 'Clear search or change the scope filter.'}</span>
            </div>
          ) : null}
        </div>
        <div className="status-strip">{scope === 'official' && officialSyncing ? 'Syncing official catalog in the background...' : scope === 'official' && officialLoading ? 'Searching official catalog...' : loading ? 'Loading card browser...' : loadStatus}</div>
      </section>
      <PanelResizeHandle label="Resize card browser list" onResize={resizeLeft} />
      <div ref={rightPaneRef} className={`card-browser-right ${compareModeActive ? 'compare-mode' : ''}`} style={{ gridTemplateRows: previewRows }}>
        {compareModeActive ? (
          <CardBrowserComparePanel
            items={compareItems}
            previewCache={comparePreviewCache}
            displayMode={compareDisplayMode}
            activeDirtyDraftInCompare={activeDirtyDraftInCompare}
            onDisplayModeChange={setCompareDisplayMode}
            onExitCompare={() => setCompareModeActive(false)}
          />
        ) : (
          <>
            <section className="card-browser-preview-panel">
              <div className="card-browser-preview-toggle">
                <div>
                  <strong>{selectedRow?.name ?? 'No card selected'}</strong>
                  <span>{selectedRow ? `${selectedRow.sourceName} - ${selectedRow.sourceKind}` : 'Card preview'}</span>
                </div>
                <div className="card-browser-preview-actions">
                  {activeDraft && activeDraft.variantSummaries.length ? (
                    <label className="variant-switcher" title={formatCount(activeDraft.variantSummaries.length, 'variant')}>
                      <span>{formatCount(activeDraft.variantSummaries.length, 'variant')}</span>
                      <select value={activeDraft.variantId} onChange={(event) => onVariantChange(event.target.value)}>
                        {activeDraft.variantSummaries.map((variant) => (
                          <option key={variant.variantId} value={variant.variantId}>
                            {variant.isPrimary ? '* ' : ''}{variant.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="segmented-actions">
                    <button type="button" className={`secondary-button compact ${previewMode === 'card' ? 'active' : ''}`} onClick={() => setPreviewMode('card')}>
                      Card
                    </button>
                    <button type="button" className={`secondary-button compact ${previewMode === 'art' ? 'active' : ''}`} onClick={() => setPreviewMode('art')}>
                      Art
                    </button>
                  </div>
                </div>
              </div>
              {selectedRow?.sourceKind === 'official' ? (
                <OfficialBrowserPreview card={selectedOfficialCard} loading={officialLoading} />
              ) : previewMode === 'card' ? (
                <BrowserCardImage
                  draft={selectedSavedDraft}
                  row={selectedRow}
                  preview={selectedPreviewCacheEntry?.status === 'ready' ? selectedPreviewCacheEntry.preview : activeDraft ? preview : null}
                  previewLoading={selectedPreviewCacheEntry?.status === 'loading' || (activeDraft ? previewLoading : false)}
                  previewUpdating={activeDraft ? previewUpdating : false}
                  selectedFrame={selectedPreviewCacheEntry?.status === 'ready' ? selectedPreviewCacheEntry.preview.inferredFrame : activeDraft ? selectedFrame : null}
                  hasUnsavedChanges={Boolean(activeDraft && hasUnsavedChanges)}
                  previewError={selectedPreviewCacheEntry?.status === 'error' ? selectedPreviewCacheEntry.error : ''}
                />
              ) : (
                <ArtworkPreview draft={selectedSavedDraft} row={selectedRow} />
              )}
            </section>
            <PanelResizeHandle label="Resize card browser preview" orientation="horizontal" onResize={resizePreview} />
            <section className="card-browser-detail-panel">
              {selectedRow?.sourceKind === 'official' ? (
                <OfficialBrowserDetails
                  card={selectedOfficialCard}
                  collections={collections}
                  decks={decks}
                  sets={library?.sets ?? []}
                  collectionId={officialCollectionId}
                  collectionName={officialCollectionName}
                  ownerName={officialOwnerName}
                  ownerSuggestions={ownerSuggestions}
                  deckId={officialDeckId}
                  deckSection={officialDeckSection}
                  setCode={officialSetCode}
                  quantity={officialQuantity}
                  action={officialAction}
                  onCollectionIdChange={setOfficialCollectionId}
                  onCollectionNameChange={setOfficialCollectionName}
                  onOwnerNameChange={setOfficialOwnerName}
                  onDeckIdChange={setOfficialDeckId}
                  onDeckSectionChange={setOfficialDeckSection}
                  onSetCodeChange={setOfficialSetCode}
                  onQuantityChange={setOfficialQuantity}
                  onAddToCollection={() => void addOfficialSelectionToCollection()}
                  onAddToDeck={() => void addOfficialSelectionToDeck()}
                  onAddToSet={() => void addOfficialSelectionToSet()}
                />
              ) : selectedRow?.sourceKind === 'collection' ? (
                <CollectionBrowserDetails
                  collection={selectedCollection}
                  entry={selectedCollectionEntry}
                  dirty={Boolean(selectedCollection && collectionDirtyIds.has(selectedCollection.metadata.collectionId))}
                  saving={Boolean(selectedCollection && savingCollectionId === selectedCollection.metadata.collectionId)}
                  ownerSuggestions={ownerSuggestions}
                  onUpdate={updateCollectionEntry}
                  onSave={() => void saveSelectedCollection()}
                />
              ) : activeDraft ? (
                <Inspector
                  project={project}
                  draft={activeDraft}
                  preview={preview}
                  referenceCatalog={referenceCatalog}
                  activeTab={inspectorTab}
                  onTabChange={onInspectorTabChange}
                  onChange={onDraftChange}
                  onVariantChange={onVariantChange}
                  onSaveVariant={onSaveVariant}
                />
              ) : selectedSavedDraft && selectedRow ? (
                <CatalogRowDetails row={selectedRow} onOpenInMaker={() => void openRowInMaker(selectedRow)} />
              ) : (
                <div className="card-browser-detail-empty">
                  <h2>Details</h2>
                  <p>{selectedCompareItem?.renderUnavailableReason ?? 'Select an authored card row to inspect saved details.'}</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
      {browserFiltersOverlay}
    </div>
  );
}

function CatalogRowDetails({ row, onOpenInMaker }: { row: BrowserRow; onOpenInMaker: () => void }) {
  return (
    <div className="card-catalog-details">
      <div className="collection-detail-grid">
        <span>Name</span>
        <strong>{row.name}</strong>
        <span>Source</span>
        <strong>{row.sourceName}</strong>
        <span>Kind</span>
        <strong>{sourceLabel(row)}</strong>
        <span>Set</span>
        <strong>{row.setCode || row.setName || '-'}</strong>
        <span>Status</span>
        <strong>{row.status || row.reviewStatus || '-'}</strong>
        <span>Owner</span>
        <strong>{row.ownerName || '-'}</strong>
        <span>Quantity</span>
        <strong>{row.quantity ?? 1}</strong>
      </div>
      {row.tags.length ? (
        <div className="tag-list compact-tags" aria-label="Card tags">
          {row.tags.slice(0, 12).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
      <button type="button" className="primary-button" onClick={onOpenInMaker} disabled={!row.setCode || !row.cardId || row.sourceKind === 'official'}>
        Open in Maker
      </button>
    </div>
  );
}

function BrowserAdvancedFilterControls({
  filters,
  ownerFilter,
  ownerSuggestions,
  onFiltersChange,
  onOwnerFilterChange
}: {
  filters: BrowserFilters;
  ownerFilter: string;
  ownerSuggestions: string[];
  onFiltersChange: (patch: Partial<BrowserFilters>) => void;
  onOwnerFilterChange: (value: string) => void;
}) {
  return (
    <div className="filter-panel">
      <label className="filter-field">
        <span>Source</span>
        <select value={filters.sourceKind} onChange={(event) => onFiltersChange({ sourceKind: event.target.value as BrowserFilters['sourceKind'] })}>
          <option value="all">All sources</option>
          <option value="set">Set cards</option>
          <option value="deck">Deck rows</option>
          <option value="collection">Collection rows</option>
          <option value="official">Official catalog</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Card type</span>
        <select value={filters.cardType} onChange={(event) => onFiltersChange({ cardType: event.target.value })}>
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
        <span>Color</span>
        <select value={filters.color} onChange={(event) => onFiltersChange({ color: event.target.value })}>
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
        <span>Mana value</span>
        <input value={filters.manaValue} placeholder="2, >=4, <3..." onChange={(event) => onFiltersChange({ manaValue: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Rarity</span>
        <select value={filters.rarity} onChange={(event) => onFiltersChange({ rarity: event.target.value })}>
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
        <select value={filters.status} onChange={(event) => onFiltersChange({ status: event.target.value })}>
          <option value="all">All statuses</option>
          <option value="idea">Idea</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="playtest">Playtest</option>
          <option value="final">Final</option>
          <option value="cut">Cut</option>
          <option value="official">Official</option>
          <option value="needs_review">Needs review</option>
          <option value="matched">Matched</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Tags</span>
        <input value={filters.tag} placeholder="trade, commander..." onChange={(event) => onFiltersChange({ tag: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Owner</span>
        <input list="card-browser-advanced-owner-options" value={ownerFilter} placeholder="Any owner" onChange={(event) => onOwnerFilterChange(event.target.value)} />
        <datalist id="card-browser-advanced-owner-options">
          {ownerSuggestions.map((owner) => (
            <option key={owner} value={owner} />
          ))}
        </datalist>
      </label>
      <label className="filter-field">
        <span>Deck section</span>
        <select value={filters.deckSection} onChange={(event) => onFiltersChange({ deckSection: event.target.value as BrowserFilters['deckSection'] })}>
          <option value="all">All sections</option>
          <option value="main">Main board</option>
          <option value="side">Sideboard</option>
          <option value="maybe">Maybeboard</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Collection kind</span>
        <select value={filters.collectionKind} onChange={(event) => onFiltersChange({ collectionKind: event.target.value as BrowserFilters['collectionKind'] })}>
          <option value="all">All collection kinds</option>
          <option value="binder">Binders</option>
          <option value="list">Lists</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Review</span>
        <select value={filters.reviewStatus} onChange={(event) => onFiltersChange({ reviewStatus: event.target.value as BrowserFilters['reviewStatus'] })}>
          <option value="all">All review states</option>
          <option value="matched">Matched</option>
          <option value="needs_review">Needs review</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Linked render</span>
        <select value={filters.linkedState} onChange={(event) => onFiltersChange({ linkedState: event.target.value as BrowserFilters['linkedState'] })}>
          <option value="all">Any linked state</option>
          <option value="linked">Linked authored rows</option>
          <option value="unresolved">Unresolved rows</option>
        </select>
      </label>
    </div>
  );
}

function toneForBrowserSource(sourceKind: BrowserSourceKind): StatusPillTone {
  if (sourceKind === 'deck') {
    return 'success';
  }
  if (sourceKind === 'collection') {
    return 'warning';
  }
  if (sourceKind === 'official') {
    return 'info';
  }
  return 'neutral';
}

function iconForBrowserSource(sourceKind: BrowserSourceKind): IconName {
  if (sourceKind === 'deck') {
    return 'decks';
  }
  if (sourceKind === 'collection') {
    return 'collections';
  }
  if (sourceKind === 'official') {
    return 'guide';
  }
  return 'cards';
}

function CardBrowserComparePanel({
  items,
  previewCache,
  displayMode,
  activeDirtyDraftInCompare,
  onDisplayModeChange,
  onExitCompare
}: {
  items: CardBrowserCompareItem[];
  previewCache: Record<string, ComparePreviewCacheEntry>;
  displayMode: BrowserCompareDisplayMode;
  activeDirtyDraftInCompare: boolean;
  onDisplayModeChange: (mode: BrowserCompareDisplayMode) => void;
  onExitCompare: () => void;
}) {
  if (items.length !== 2) {
    return (
      <section className="card-browser-compare-panel">
        <div className="card-browser-detail-empty">
          <h2>Compare Cards</h2>
          <p>Select two source rows to compare saved card data side by side.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="card-browser-compare-panel" aria-label="Card comparison">
      <div className="card-browser-preview-toggle card-browser-compare-header">
        <div>
          <h2>Compare Cards</h2>
          <span>{items.map((item) => item.row.name).join(' / ')}</span>
        </div>
        <div className="card-browser-preview-actions">
          <div className="segmented-actions" role="group" aria-label="Comparison display">
            <button type="button" className={`secondary-button compact ${displayMode === 'compact' ? 'active' : ''}`} onClick={() => onDisplayModeChange('compact')}>
              Compact
            </button>
            <button type="button" className={`secondary-button compact ${displayMode === 'detailed' ? 'active' : ''}`} onClick={() => onDisplayModeChange('detailed')}>
              Detailed
            </button>
          </div>
          <button type="button" className="secondary-button compact" onClick={onExitCompare}>
            Exit Compare
          </button>
        </div>
      </div>
      {activeDirtyDraftInCompare ? (
        <div className="card-browser-compare-warning" role="status">
          Comparison uses saved card data. The active editor has unsaved changes that are not shown here.
        </div>
      ) : null}
      <div className={`card-browser-compare-content ${displayMode}`}>
        <div className="card-browser-compare-cards">
          {items.map((item) => (
            <CompareCardSlot key={item.key} item={item} previewCache={previewCache} />
          ))}
        </div>
        {displayMode === 'detailed' ? <CompareDetailTable items={items} /> : null}
      </div>
    </section>
  );
}

function CompareCardSlot({ item, previewCache }: { item: CardBrowserCompareItem; previewCache: Record<string, ComparePreviewCacheEntry> }) {
  const previewEntry = item.draft ? previewCache[comparePreviewKeyForDraft(item.draft)] : undefined;
  const previewName = item.draft?.name ?? item.row.name;
  const officialImageUrl = item.row.officialCard ? officialCardImageUrl(item.row.officialCard) : '';
  return (
    <article className={`card-browser-compare-card ${item.draft ? '' : 'unresolved'}`}>
      <div className="card-browser-compare-card-heading">
        <strong>{previewName}</strong>
        <span>{cardBrowserCompareSourceLabel(item.row)}</span>
      </div>
      <div className="card-browser-compare-image">
        {officialImageUrl ? (
          <img src={officialImageUrl} alt={`${previewName} official card image`} />
        ) : previewEntry?.status === 'ready' && previewEntry.preview.imageDataUri ? (
          <img src={previewEntry.preview.imageDataUri} alt={`${previewName} saved render`} />
        ) : (
          <div className="preview-empty compact-empty">
            <strong>{comparePreviewStateTitle(item, previewEntry)}</strong>
            <span>{comparePreviewStateBody(item, previewEntry)}</span>
          </div>
        )}
      </div>
      {previewEntry?.status === 'ready' ? (
        <div className="card-browser-compare-card-meta">
          <span>{previewEntry.preview.inferredFrame.label}</span>
          {previewEntry.preview.warnings.length ? <span>{formatCount(previewEntry.preview.warnings.length, 'warning')}</span> : null}
        </div>
      ) : item.row.officialCard ? (
        <div className="card-browser-compare-card-meta">
          <span>{officialCardLine(item.row.officialCard)}</span>
        </div>
      ) : null}
    </article>
  );
}

function CompareDetailTable({ items }: { items: CardBrowserCompareItem[] }) {
  const left = cardBrowserCompareDetailsForItem(items[0]!);
  const right = new Map(cardBrowserCompareDetailsForItem(items[1]!).map((detail) => [detail.label, detail.value]));
  return (
    <div className="card-browser-compare-table-wrap">
      <table className="card-browser-compare-table">
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">{items[0]?.row.name ?? 'Card A'}</th>
            <th scope="col">{items[1]?.row.name ?? 'Card B'}</th>
          </tr>
        </thead>
        <tbody>
          {left.map((detail) => (
            <tr key={detail.label}>
              <th scope="row">{detail.label}</th>
              <td>{compareDetailValue(detail.label, detail.value)}</td>
              <td>{compareDetailValue(detail.label, right.get(detail.label) ?? '-')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function compareDetailValue(label: string, value: string) {
  if (label === 'Mana cost') {
    return <ManaCostSymbols value={value === '-' ? '' : value} />;
  }
  if (label === 'Colors') {
    return <ColorIdentitySymbols value={value === '-' ? '' : value} />;
  }
  return value;
}

function comparePreviewStateTitle(item: CardBrowserCompareItem, previewEntry: ComparePreviewCacheEntry | undefined): string {
  if (!item.draft) {
    return 'No linked authored render';
  }
  if (previewEntry?.status === 'loading') {
    return 'Loading saved render';
  }
  if (previewEntry?.status === 'error') {
    return 'Preview failed';
  }
  return 'Waiting for saved render';
}

function comparePreviewStateBody(item: CardBrowserCompareItem, previewEntry: ComparePreviewCacheEntry | undefined): string {
  if (!item.draft) {
    return item.renderUnavailableReason;
  }
  if (previewEntry?.status === 'error') {
    return previewEntry.error;
  }
  return 'This comparison uses the saved card record, not unsaved editor changes.';
}

function buildBrowserRows({
  library,
  projectsBySet,
  currentProject,
  currentCards,
  decks,
  deckStates,
  collections,
  collectionStates,
  officialCards
}: {
  library: LibraryState | null;
  projectsBySet: Record<string, EditorProject>;
  currentProject: EditorProject | null;
  currentCards: CardSummary[];
  decks: DeckSummary[];
  deckStates: Record<string, DeckState>;
  collections: CollectionSummary[];
  collectionStates: Record<string, CollectionState>;
  officialCards: OfficialCardSearchCard[];
}): BrowserRow[] {
  const setLookup = new Map((library?.sets ?? []).map((set) => [set.setCode, set]));
  const rows: BrowserRow[] = [];
  const projectEntries = Object.entries(projectsBySet);
  const setProjects = projectEntries.length ? projectEntries : currentProject ? [[currentProject.setCode, { ...currentProject, cards: currentCards } as EditorProject] as const] : [];

  for (const [setCode, loadedProject] of setProjects) {
    const setSummary = setLookup.get(setCode);
    for (const card of loadedProject.cards) {
      rows.push(rowFromCardSummary({
        card,
        sourceKind: 'set',
        sourceId: setCode,
        sourceName: `${loadedProject.setName || setCode}`,
        projectId: setSummary?.universeId,
        setName: loadedProject.setName,
        rowKey: `set:${setCode}:${card.cardId}`
      }));
    }
  }

  for (const deck of decks) {
    const state = deckStates[deck.deckId];
    for (const entry of state?.entries ?? []) {
      if (!entry.card) {
        rows.push({
          key: `deck:${deck.deckId}:${entry.section}:${entry.setCode}:${entry.cardId}`,
          sourceKind: 'deck',
          sourceId: deck.deckId,
          sourceName: deck.name,
          setCode: entry.setCode,
          cardId: entry.cardId,
          variantId: entry.variantId,
          name: entry.nameSnapshot ?? entry.cardId,
          typeLine: 'Unresolved deck entry',
          manaCost: '',
          colors: '',
          status: 'needs_review',
          tags: [],
          quantity: entry.count,
          deckSection: entry.section,
          variants: [],
          searchText: [deck.name, entry.nameSnapshot, entry.setCode, entry.cardId, entry.section].filter(Boolean).join(' ')
        });
        continue;
      }
      const setSummary = setLookup.get(entry.card.setCode);
      rows.push(rowFromDeckEntry(deck, entry, setSummary?.universeId));
    }
  }

  for (const collection of collections) {
    const state = collectionStates[collection.collectionId];
    for (const entry of state?.entries ?? []) {
      rows.push(rowFromCollectionEntry(collection, entry, setLookup.get(entry.linkedSetCode || entry.setCode || '')?.universeId ?? collection.linkedUniverseId));
    }
  }

  for (const card of officialCards) {
    rows.push(rowFromOfficialCard(card));
  }

  return rows.map((row, index) => ({ ...row, sourceOrder: index }));
}

function rowFromCardSummary({
  card,
  sourceKind,
  sourceId,
  sourceName,
  projectId,
  setName,
  rowKey
}: {
  card: CardSummary;
  sourceKind: BrowserSourceKind;
  sourceId: string;
  sourceName: string;
  projectId?: string;
  setName?: string;
  rowKey: string;
}): BrowserRow {
  return {
    key: rowKey,
    sourceKind,
    sourceId,
    sourceName,
    projectId,
    setCode: sourceKind === 'set' ? sourceId : undefined,
    setName,
    cardId: card.cardId,
    variantId: card.activeVariantId || card.primaryVariantId,
    collectorNumber: card.collectorNumber,
    name: card.name,
    typeLine: card.typeLine,
    manaCost: card.manaCost,
    manaValue: manaValueFromCost(card.manaCost),
    colors: card.colors,
    rarity: card.rarity,
    status: card.status,
    tags: card.tags,
    variants: card.variants ?? [],
    searchText: [card.name, card.typeLine, card.oracleText, card.flavorText, card.tags?.join(' '), sourceName, sourceKind, sourceId].filter(Boolean).join(' ')
  };
}

function rowFromDeckEntry(deck: DeckSummary, entry: DeckState['entries'][number], projectId?: string): BrowserRow {
  const card = entry.card!;
  const metadata = metadataFromDeckCard(card);
  return {
    key: `deck:${deck.deckId}:${entry.section}:${entry.setCode}:${entry.cardId}:${entry.variantId ?? ''}`,
    sourceKind: 'deck',
    sourceId: deck.deckId,
    sourceName: deck.name,
    projectId,
    setCode: entry.setCode,
    setName: card.setName,
    cardId: entry.cardId,
    variantId: entry.variantId || card.variants.find((variant) => variant.isPrimary)?.variantId,
    collectorNumber: card.collectorNumber,
    name: card.name,
    typeLine: metadata?.typeLine ?? card.typeLine,
    manaCost: metadata?.manaCost ?? card.manaCost,
    manaValue: metadata?.manaValue ?? manaValueFromCost(card.manaCost),
    colors: metadata?.colorIdentity ?? card.colors,
    rarity: metadata?.rarity,
    status: card.status,
    tags: card.tags,
    quantity: entry.count,
    deckSection: entry.section,
    imageUrl: imageUrlForMetadata(metadata, 'normal'),
    variants: [],
    searchText: [deck.name, entry.section, card.name, card.typeLine, card.oracleText, card.tags.join(' ')].join(' ')
  };
}

function rowFromCollectionEntry(collection: CollectionSummary, entry: CollectionEntry, projectId?: string): BrowserRow {
  const linkedSetCode = entry.linkedSetCode || entry.setCode;
  const collectionKind = collection.kind ?? 'binder';
  const listCategory = collection.listCategory ?? 'general';
  const ownerName = normalizeCollectionOwnerName(entry.ownerName);
  const metadata = metadataFromCollectionEntry(entry);
  return {
    key: `collection:${collection.collectionId}:${entry.entryId}`,
    sourceKind: 'collection',
    sourceId: collection.collectionId,
    sourceName: collection.name,
    projectId,
    setCode: linkedSetCode,
    setName: entry.setName,
    cardId: entry.linkedCardId,
    variantId: entry.linkedVariantId,
    collectorNumber: entry.collectorNumber,
    collectionEntryId: entry.entryId,
    collectionKind,
    collectionListCategory: listCategory,
    ownershipStatus: entry.ownershipStatus,
    ownerName,
    name: entry.cardName,
    typeLine: metadata?.typeLine ?? (collectionKind === 'list' ? `${listCategoryLabel(listCategory)} row` : entry.reviewStatus === 'matched' ? 'Binder row' : 'Binder row needs review'),
    manaCost: metadata?.manaCost ?? '',
    manaValue: metadata?.manaValue,
    colors: metadata?.colorIdentity ?? '',
    rarity: metadata?.rarity,
    status: entry.reviewStatus,
    tags: entry.tags ?? [],
    quantity: entry.quantity,
    reviewStatus: entry.reviewStatus,
    imageUrl: imageUrlForMetadata(metadata, 'normal'),
    variants: [],
    searchText: [
      collection.name,
      collection.purpose,
      collection.source,
      collectionKind,
      listCategory,
      entry.ownershipStatus,
      ownerName,
      entry.cardName,
      entry.setCode,
      entry.setName,
      entry.collectorNumber,
      entry.finish,
      entry.condition,
      entry.location,
      entry.reviewNotes,
      ...(entry.tags ?? [])
    ].filter(Boolean).join(' ')
  };
}

function rowFromOfficialCard(card: OfficialCardSearchCard): BrowserRow {
  return {
    key: `official:${card.view}:${card.id}`,
    sourceKind: 'official',
    sourceId: card.view,
    sourceName: card.view === 'prints' ? 'Scryfall Prints' : 'Scryfall Oracle',
    officialCard: card,
    name: card.name,
    typeLine: card.typeLine ?? (card.view === 'prints' ? 'Official print' : 'Oracle card'),
    manaCost: card.manaCost ?? '',
    colors: card.colorIdentity.join(''),
    status: 'official',
    tags: [],
    variants: [],
    cardId: card.id,
    setCode: card.view === 'prints' ? card.setCode : undefined,
    setName: card.view === 'prints' ? card.setName : undefined,
    collectorNumber: card.view === 'prints' ? card.collectorNumber : undefined,
    manaValue: card.manaValue,
    rarity: card.view === 'prints' ? card.rarity : undefined,
    imageUrl: officialCardImageUrl(card),
    searchText: [
      card.name,
      card.typeLine,
      card.oracleText,
      card.flavorText,
      card.power,
      card.toughness,
      card.loyalty,
      card.view === 'prints' ? card.setCode : '',
      card.view === 'prints' ? card.setName : '',
      card.view === 'prints' ? card.collectorNumber : '',
      ...(card.cardFaces ?? []).flatMap((face) => [face.name, face.typeLine, face.oracleText, face.flavorText]),
      card.view
    ]
      .filter(Boolean)
      .join(' ')
  };
}

function filterBrowserRows(rows: BrowserRow[], scope: BrowserScope, scopeId: string, query: string, ownerFilter: string, filters: BrowserFilters): BrowserRow[] {
  const needle = query.trim().toLowerCase();
  const ownerNeedle = ownerFilter.trim().toLowerCase();
  return rows.filter((row) => {
    const matchesScope = matchesBrowserScope(row, scope, scopeId);
    const matchesQuery = !needle || row.searchText.toLowerCase().includes(needle);
    const matchesOwner = !ownerNeedle || (row.ownerName ?? '').toLowerCase().includes(ownerNeedle);
    const matchesSource = filters.sourceKind === 'all' || row.sourceKind === filters.sourceKind;
    const matchesType = filters.cardType === 'all' || row.typeLine.toLowerCase().includes(filters.cardType.toLowerCase());
    const matchesColor = filters.color === 'all' || colorMatches(row.colors, filters.color);
    const matchesMana = matchesNumberQuery(row.manaValue ?? manaValueFromCost(row.manaCost), filters.manaValue);
    const matchesRarity = filters.rarity === 'all' || row.rarity === filters.rarity;
    const matchesStatus = filters.status === 'all' || row.status === filters.status;
    const matchesTag = matchesTagFilter(row.tags, filters.tag);
    const matchesDeckSection = filters.deckSection === 'all' || row.deckSection === filters.deckSection;
    const matchesCollectionKind = filters.collectionKind === 'all' || row.collectionKind === filters.collectionKind;
    const matchesReview = filters.reviewStatus === 'all' || row.reviewStatus === filters.reviewStatus;
    const matchesLinked =
      filters.linkedState === 'all' ||
      (filters.linkedState === 'linked' && Boolean(row.setCode && row.cardId && row.sourceKind !== 'official')) ||
      (filters.linkedState === 'unresolved' && row.sourceKind !== 'official' && (!row.setCode || !row.cardId));
    return matchesScope && matchesQuery && matchesOwner && matchesSource && matchesType && matchesColor && matchesMana && matchesRarity && matchesStatus && matchesTag && matchesDeckSection && matchesCollectionKind && matchesReview && matchesLinked;
  });
}

function countActiveBrowserFilters(filters: BrowserFilters, ownerFilter: string): number {
  return countActiveFilters([
    { value: filters.sourceKind, defaultValue: DEFAULT_BROWSER_FILTERS.sourceKind },
    { value: filters.cardType, defaultValue: DEFAULT_BROWSER_FILTERS.cardType },
    { value: filters.color, defaultValue: DEFAULT_BROWSER_FILTERS.color },
    { value: filters.manaValue, defaultValue: DEFAULT_BROWSER_FILTERS.manaValue },
    { value: filters.rarity, defaultValue: DEFAULT_BROWSER_FILTERS.rarity },
    { value: filters.status, defaultValue: DEFAULT_BROWSER_FILTERS.status },
    { value: filters.tag, defaultValue: DEFAULT_BROWSER_FILTERS.tag },
    { value: filters.deckSection, defaultValue: DEFAULT_BROWSER_FILTERS.deckSection },
    { value: filters.collectionKind, defaultValue: DEFAULT_BROWSER_FILTERS.collectionKind },
    { value: filters.reviewStatus, defaultValue: DEFAULT_BROWSER_FILTERS.reviewStatus },
    { value: filters.linkedState, defaultValue: DEFAULT_BROWSER_FILTERS.linkedState },
    { value: ownerFilter, defaultValue: '' }
  ]);
}

function colorMatches(colors: string, filter: string): boolean {
  const normalized = colors.toUpperCase();
  if (filter === 'colorless') {
    return !normalized || normalized === 'C';
  }
  if (filter === 'multicolor') {
    return normalized.replace(/[^WUBRG]/g, '').length > 1;
  }
  return normalized.includes(filter.toUpperCase());
}

function manaValueFromCost(manaCost: string | undefined): number {
  const value = String(manaCost ?? '');
  const symbols = value.match(/\{[^}]+\}/g);
  if (symbols?.length) {
    return symbols.reduce((total, symbol) => total + manaSymbolValue(symbol.replace(/[{}]/g, '')), 0);
  }
  const numbers = value.match(/\d+/g) ?? [];
  const numeric = numbers.reduce((total, part) => total + (Number(part) || 0), 0);
  const pips = value
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
  return symbol.trim().toUpperCase() === 'X' ? 0 : 1;
}

function matchesBrowserScope(row: BrowserRow, scope: BrowserScope, scopeId: string): boolean {
  if (scope === 'all') {
    return true;
  }
  if (scope === 'project') {
    return scopeId ? row.projectId === scopeId : Boolean(row.projectId);
  }
  if (scope === 'set') {
    return scopeId ? row.setCode === scopeId : row.sourceKind === 'set';
  }
  if (scope === 'deck') {
    return row.sourceKind === 'deck' && (!scopeId || row.sourceId === scopeId);
  }
  if (scope === 'collection') {
    return row.sourceKind === 'collection' && (!scopeId || row.sourceId === scopeId);
  }
  if (scope === 'binder') {
    return row.sourceKind === 'collection' && row.collectionKind !== 'list' && (!scopeId || row.sourceId === scopeId);
  }
  if (scope === 'list') {
    return row.sourceKind === 'collection' && row.collectionKind === 'list' && (!scopeId || row.sourceId === scopeId);
  }
  if (scope === 'official') {
    return row.sourceKind === 'official';
  }
  return true;
}

function buildScopeOptions(scope: BrowserScope, library: LibraryState | null, decks: DeckSummary[], collections: CollectionSummary[]): Array<{ value: string; label: string }> {
  if (scope === 'project') {
    return (library?.universes ?? []).map((universe) => ({ value: universe.id, label: universe.name }));
  }
  if (scope === 'set') {
    return (library?.sets ?? []).map((set) => ({ value: set.setCode, label: `${set.setCode} - ${set.setName}` }));
  }
  if (scope === 'deck') {
    return decks.map((deck) => ({ value: deck.deckId, label: deck.name }));
  }
  if (scope === 'collection') {
    return collections.map((collection) => ({ value: collection.collectionId, label: collection.name }));
  }
  if (scope === 'binder') {
    return collections.filter((collection) => collection.kind !== 'list').map((collection) => ({ value: collection.collectionId, label: collection.name }));
  }
  if (scope === 'list') {
    return collections.filter((collection) => collection.kind === 'list').map((collection) => ({ value: collection.collectionId, label: `${collection.name} - ${listCategoryLabel(collection.listCategory ?? 'general')}` }));
  }
  return [];
}

function sourceLabel(row: BrowserRow): string {
  if (row.sourceKind === 'deck') {
    return row.deckSection === 'maybe' ? 'Maybe' : row.deckSection === 'side' ? 'Side' : 'Deck';
  }
  if (row.sourceKind === 'collection') {
    if (row.collectionKind === 'list') {
      return row.collectionListCategory ? listCategoryLabel(row.collectionListCategory) : 'List';
    }
    return row.reviewStatus === 'needs_review' ? 'Review' : 'Collection';
  }
  if (row.sourceKind === 'official') {
    return row.officialCard?.view === 'oracle' ? 'Oracle' : 'Official';
  }
  return 'Set';
}

function allScopeLabel(scope: BrowserScope): string {
  if (scope === 'project') {
    return 'All projects';
  }
  if (scope === 'set') {
    return 'All sets';
  }
  if (scope === 'deck') {
    return 'All decks';
  }
  if (scope === 'collection') {
    return 'All collections';
  }
  if (scope === 'binder') {
    return 'All binders';
  }
  if (scope === 'list') {
    return 'All lists';
  }
  return 'Everything';
}

function scopeContextLabel(scope: BrowserScope): string {
  if (scope === 'project') {
    return 'Project';
  }
  if (scope === 'set') {
    return 'Set';
  }
  if (scope === 'deck') {
    return 'Deck';
  }
  if (scope === 'binder') {
    return 'Binder';
  }
  if (scope === 'list') {
    return 'List';
  }
  if (scope === 'collection') {
    return 'Collection';
  }
  return 'Context';
}

function ArtworkPreview({ draft, row }: { draft: CardDraft | null; row: BrowserRow | null }) {
  const src = artSrcFromDraft(draft) || row?.imageUrl || '';
  return (
    <div className="card-browser-artwork">
      {src ? (
        <img src={src} alt={draft?.name ?? row?.name ?? 'Card artwork'} />
      ) : (
        <div className="preview-empty compact-empty">
          <strong>No artwork available</strong>
          <span>{row?.name ?? 'Select a card with an artwork source.'}</span>
        </div>
      )}
    </div>
  );
}

function BrowserCardImage({
  draft,
  row,
  preview,
  previewLoading,
  previewUpdating,
  selectedFrame,
  hasUnsavedChanges,
  previewError
}: {
  draft: CardDraft | null;
  row: BrowserRow | null;
  preview: PreviewResponse | null;
  previewLoading: boolean;
  previewUpdating: boolean;
  selectedFrame: FrameOption | null;
  hasUnsavedChanges: boolean;
  previewError?: string;
}) {
  return (
    <div className="card-browser-card-preview">
      <div className="card-browser-preview-meta">
        <span>{selectedFrame ? `${selectedFrame.label} - ${selectedFrame.source}` : row?.imageUrl ? 'Source image' : 'No linked authored render'}</span>
        <span>{hasUnsavedChanges ? 'Unsaved' : previewUpdating ? 'Updating' : previewLoading ? 'Loading' : ''}</span>
      </div>
      {preview?.imageDataUri ? (
        <img src={preview.imageDataUri} alt={draft?.name ?? 'Card preview'} />
      ) : row?.imageUrl ? (
        <img src={row.imageUrl} alt={`${row.name} source image`} />
      ) : (
        <div className="preview-empty compact-empty">
          <strong>{previewLoading ? 'Loading preview' : previewError ? 'Preview failed' : 'No linked rendered card'}</strong>
          <span>{previewError || draft?.name || row?.name || 'Select an authored card from the list.'}</span>
        </div>
      )}
    </div>
  );
}

function OfficialBrowserPreview({ card, loading }: { card: OfficialCardSearchCard | undefined; loading: boolean }) {
  const imageUrl = card ? officialCardImageUrl(card) : '';
  return (
    <div className="card-browser-card-preview official-browser-preview">
      <div className="card-browser-preview-meta">
        <span>{card ? officialCardLine(card) : 'Official catalog'}</span>
        <span>{loading ? 'Loading' : ''}</span>
      </div>
      {imageUrl ? (
        <img src={imageUrl} alt={`${card?.name ?? 'Official card'} image`} />
      ) : (
        <div className="preview-empty compact-empty">
          <strong>{loading ? 'Loading official card' : 'No official image'}</strong>
          <span>{card?.name ?? 'Search the official catalog.'}</span>
        </div>
      )}
    </div>
  );
}

function OfficialBrowserDetails({
  card,
  collections,
  decks,
  sets,
  collectionId,
  collectionName,
  ownerName,
  ownerSuggestions,
  deckId,
  deckSection,
  setCode,
  quantity,
  action,
  onCollectionIdChange,
  onCollectionNameChange,
  onOwnerNameChange,
  onDeckIdChange,
  onDeckSectionChange,
  onSetCodeChange,
  onQuantityChange,
  onAddToCollection,
  onAddToDeck,
  onAddToSet
}: {
  card: OfficialCardSearchCard | undefined;
  collections: CollectionSummary[];
  decks: DeckSummary[];
  sets: LibraryState['sets'];
  collectionId: string;
  collectionName: string;
  ownerName: string;
  ownerSuggestions: string[];
  deckId: string;
  deckSection: 'main' | 'side' | 'maybe';
  setCode: string;
  quantity: number;
  action: OfficialActionTarget;
  onCollectionIdChange: (value: string) => void;
  onCollectionNameChange: (value: string) => void;
  onOwnerNameChange: (value: string) => void;
  onDeckIdChange: (value: string) => void;
  onDeckSectionChange: (value: 'main' | 'side' | 'maybe') => void;
  onSetCodeChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onAddToCollection: () => void;
  onAddToDeck: () => void;
  onAddToSet: () => void;
}) {
  if (!card) {
    return (
      <div className="card-browser-detail-empty">
        <h2>Official Cards</h2>
        <p>Sync and search the official catalog to add exact prints to collections.</p>
      </div>
    );
  }
  return (
    <div className="collection-details-panel card-browser-collection-details official-browser-details">
      <div className="inspector-heading-row">
        <div>
          <h2>{card.name}</h2>
          <p className="workspace-copy">{officialCardLine(card)}</p>
        </div>
      </div>
      <div className="collection-detail-grid">
        <div className="readonly-line">
          <strong>{card.typeLine || 'Official card'}</strong>
          <span>{card.manaCost ? <ManaCostSymbols value={card.manaCost} /> : 'No mana cost'}</span>
        </div>
        <div className="readonly-line">
          <strong>{card.colorIdentity.length ? <ColorIdentitySymbols value={card.colorIdentity.join('')} /> : 'Colorless'}</strong>
          <span>{card.view === 'prints' ? [card.setCode, card.collectorNumber].filter(Boolean).join(' ') : 'Oracle identity'}</span>
        </div>
      </div>
      <p className="official-card-text">{card.oracleText || 'Oracle text is not available in the local cache for this card.'}</p>
      {card.cardFaces?.length ? (
        <div className="official-face-list">
          {card.cardFaces.map((face, index) => (
            <div key={`${face.name ?? card.name}:${index}`} className="official-face-row">
              <strong>{face.name ?? `Face ${index + 1}`}</strong>
              <span>{face.typeLine ?? card.typeLine ?? 'Card face'}</span>
              {face.oracleText ? <p>{face.oracleText}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className="collection-official-panel">
        <strong>Add to Collection</strong>
        {card.view === 'prints' ? (
          <>
            <Field label="Collection">
              <select value={collectionId} onChange={(event) => onCollectionIdChange(event.target.value)}>
                <option value="">New collection</option>
                {collections.map((collection) => (
                  <option key={collection.collectionId} value={collection.collectionId}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </Field>
            {!collectionId ? (
              <Field label="New collection name">
                <input value={collectionName} onChange={(event) => onCollectionNameChange(event.target.value)} />
              </Field>
            ) : null}
            <Field label="Owner">
              <input list="official-collection-owner-options" value={ownerName} onChange={(event) => onOwnerNameChange(event.target.value)} onBlur={(event) => onOwnerNameChange(normalizeCollectionOwnerName(event.target.value))} />
              <datalist id="official-collection-owner-options">
                {ownerSuggestions.map((owner) => (
                  <option key={owner} value={owner} />
                ))}
              </datalist>
            </Field>
            <Field label="Quantity">
              <input type="number" min="1" value={quantity} onChange={(event) => onQuantityChange(Math.max(1, Number(event.target.value) || 1))} />
            </Field>
            <button type="button" className="primary-button" disabled={Boolean(action) || (!collectionId && !collectionName.trim())} onClick={onAddToCollection}>
              {action === 'collection' ? 'Adding...' : 'Add to Collection'}
            </button>
          </>
        ) : (
          <p className="workspace-copy">Switch to Prints before adding an exact official print to a collection.</p>
        )}
      </div>
      <div className="collection-official-panel">
        <strong>Add to Deck</strong>
        {card.view === 'prints' ? (
          <>
            <Field label="Deck">
              <select value={deckId} onChange={(event) => onDeckIdChange(event.target.value)}>
                <option value="">Choose deck</option>
                {decks.map((deck) => (
                  <option key={deck.deckId} value={deck.deckId}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid-2 compact-filter-grid">
              <Field label="Section">
                <select value={deckSection} onChange={(event) => onDeckSectionChange(event.target.value as 'main' | 'side' | 'maybe')}>
                  <option value="main">Main deck</option>
                  <option value="side">Sideboard</option>
                  <option value="maybe">Maybeboard</option>
                </select>
              </Field>
              <Field label="Quantity">
                <input type="number" min="1" value={quantity} onChange={(event) => onQuantityChange(Math.max(1, Number(event.target.value) || 1))} />
              </Field>
            </div>
            <button type="button" className="primary-button" disabled={Boolean(action) || !deckId} onClick={onAddToDeck}>
              {action === 'deck' ? 'Adding...' : 'Add to Deck'}
            </button>
          </>
        ) : (
          <p className="workspace-copy">Switch to Prints before adding an exact official print to a deck.</p>
        )}
      </div>
      <div className="collection-official-panel">
        <strong>Copy to Set</strong>
        {card.view === 'prints' ? (
          <>
            <Field label="Set">
              <select value={setCode} onChange={(event) => onSetCodeChange(event.target.value)}>
                <option value="">Choose set</option>
                {sets.map((set) => (
                  <option key={set.setCode} value={set.setCode}>
                    {set.setCode} - {set.setName}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" className="primary-button" disabled={Boolean(action) || !setCode} onClick={onAddToSet}>
              {action === 'set' ? 'Copying...' : 'Copy to Set'}
            </button>
          </>
        ) : (
          <p className="workspace-copy">Switch to Prints before copying a concrete print into a set.</p>
        )}
      </div>
    </div>
  );
}

function CollectionBrowserDetails({
  collection,
  entry,
  dirty,
  saving,
  ownerSuggestions,
  onUpdate,
  onSave
}: {
  collection: CollectionState | null;
  entry?: CollectionEntry;
  dirty: boolean;
  saving: boolean;
  ownerSuggestions: string[];
  onUpdate: (patch: Partial<CollectionEntry>) => void;
  onSave: () => void;
}) {
  if (!collection || !entry) {
    return (
      <div className="card-browser-detail-empty">
        <h2>Collection Details</h2>
        <p>Select a collection row to edit ownership and review metadata.</p>
      </div>
    );
  }
  return (
    <div className="collection-details-panel card-browser-collection-details">
      <div className="inspector-heading-row">
        <div>
          <h2>{entry.cardName}</h2>
          <p className="workspace-copy">{collection.metadata.name}</p>
        </div>
        <button type="button" className="primary-button" disabled={!dirty || saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="collection-detail-grid">
        <div className="readonly-line">
          <strong>{purposeLabel(collection.metadata.purpose)}</strong>
          <span>{collection.metadata.source}</span>
        </div>
        <div className="readonly-line">
          <strong>{entry.reviewStatus === 'needs_review' ? 'Needs review' : 'Matched'}</strong>
          <span>{collectionPrintLabel(entry)}</span>
        </div>
      </div>
      <div className="collection-entry-edit-grid">
        <div className="grid-2 compact-filter-grid">
          <Field label="Owner">
            <input
              list="card-browser-collection-owner-options"
              value={entry.ownerName}
              onChange={(event) => onUpdate({ ownerName: event.target.value })}
              onBlur={(event) => onUpdate({ ownerName: normalizeCollectionOwnerName(event.target.value) })}
            />
            <datalist id="card-browser-collection-owner-options">
              {ownerSuggestions.map((owner) => (
                <option key={owner} value={owner} />
              ))}
            </datalist>
          </Field>
          <Field label="Quantity">
            <input type="number" min="1" value={entry.quantity} onChange={(event) => onUpdate({ quantity: Number(event.target.value) })} />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Ownership">
            <select value={entry.ownershipStatus ?? 'owned'} onChange={(event) => onUpdate({ ownershipStatus: event.target.value as CollectionOwnershipStatus })}>
              <option value="owned">Owned</option>
              <option value="wanted">Wanted</option>
              <option value="recommended">Recommended</option>
              <option value="reference">Reference only</option>
              <option value="proxy">Proxy</option>
              <option value="homebrew_unprinted">Homebrew unprinted</option>
            </select>
          </Field>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(entry.starred)} onChange={(event) => onUpdate({ starred: event.target.checked })} />
            Starred
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(entry.flagged)} onChange={(event) => onUpdate({ flagged: event.target.checked })} />
            Flagged
          </label>
        </div>
        <div className="grid-3">
          <Field label="Finish">
            <input value={entry.finish ?? ''} onChange={(event) => onUpdate({ finish: event.target.value || undefined })} />
          </Field>
          <Field label="Condition">
            <input value={entry.condition ?? ''} onChange={(event) => onUpdate({ condition: event.target.value || undefined })} />
          </Field>
          <Field label="Language">
            <input value={entry.language ?? ''} onChange={(event) => onUpdate({ language: event.target.value || undefined })} />
          </Field>
        </div>
        <Field label="Location">
          <input value={entry.location ?? ''} onChange={(event) => onUpdate({ location: event.target.value || undefined })} />
        </Field>
        <Field label="Tags">
          <input value={(entry.tags ?? []).join(';')} placeholder="wishlist;upgrade;commander" onChange={(event) => onUpdate({ tags: normalizeCollectionTags(event.target.value) })} />
        </Field>
        <Field label="Review status">
          <select value={entry.reviewStatus} onChange={(event) => onUpdate({ reviewStatus: event.target.value as CollectionEntry['reviewStatus'] })}>
            <option value="matched">Matched</option>
            <option value="needs_review">Needs review</option>
          </select>
        </Field>
        <Field label="Review notes">
          <textarea value={entry.reviewNotes ?? ''} rows={4} onChange={(event) => onUpdate({ reviewNotes: event.target.value || undefined })} />
        </Field>
      </div>
    </div>
  );
}

function artSrcFromDraft(draft: CardDraft | null): string {
  if (!draft) {
    return '';
  }
  if (draft.artDataUri) {
    return draft.artDataUri;
  }
  if (draft.artUrl) {
    return draft.artUrl;
  }
  if (draft.artFilePath) {
    return `/api/asset?path=${encodeURIComponent(draft.artFilePath)}`;
  }
  return '';
}

function collectionPrintLabel(entry: CollectionEntry): string {
  return [entry.setCode, entry.collectorNumber].filter(Boolean).join(' ') || entry.setName || '-';
}

function purposeLabel(purpose: CollectionPurpose | undefined): string {
  if (purpose === 'owned') {
    return 'Owned';
  }
  if (purpose === 'inspiration') {
    return 'Inspiration';
  }
  if (purpose === 'homebrew_print_run') {
    return 'Homebrew print run';
  }
  if (purpose === 'research') {
    return 'Research';
  }
  return 'Mixed';
}

function officialCatalogStatusLabel(status: OfficialCardCatalogStatus | null, view: OfficialCardCatalogView): string {
  const source = officialCatalogSource(status, view);
  if (!source?.available) {
    return 'Sync Catalog';
  }
  return `${formatCount(source.count, view === 'prints' ? 'print' : 'card')} cached`;
}

function officialCatalogSource(status: OfficialCardCatalogStatus | null, view: OfficialCardCatalogView) {
  return view === 'prints'
    ? status?.prints ?? { available: false, count: 0 }
    : status?.oracle ?? { available: false, count: 0 };
}

function officialCardLine(card: OfficialCardSearchCard): string {
  if (card.view === 'prints') {
    return [card.setCode, card.collectorNumber, card.rarity].filter(Boolean).join(' - ') || card.setName || 'Official print';
  }
  return card.typeLine || 'Oracle card';
}

function officialCardImageUrl(card: OfficialCardSearchCard): string {
  const images = card.imageUris ?? card.cardFaces?.find((face) => face.imageUris)?.imageUris;
  return images?.normal ?? images?.large ?? images?.png ?? images?.small ?? images?.artCrop ?? images?.borderCrop ?? '';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
