import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCollection, fetchCollections, fetchDeck, fetchDecks, fetchProject } from '../../api/client.js';
import {
  buildDashboardFacts,
  buildDashboardScopeOptions,
  computeDashboardStats,
  filterDashboardFacts,
  type DashboardCardFact,
  type DashboardScope,
  type DashboardScopeKind
} from '../../domain/dashboardFacts.js';
import {
  createDashboardPreset,
  getDashboardSourceKey,
  loadDashboardSettingsStore,
  saveDashboardSettingsStore,
  type DashboardSettingsSnapshot,
  type SavedDashboardPreset
} from '../../domain/dashboardSettings.js';
import type { CardSummary, CollectionState, CollectionSummary, DeckState, DeckSummary, EditorProject, LibraryState } from '../../domain/editorTypes.js';
import {
  CARD_STATUS_OPTIONS,
  includesAnyFilterText,
  includesFilterText,
  matchesNumberQuery,
  matchesTagFilter
} from '../../domain/filterTypes.js';
import { isOwnedStatus, listCategoryLabel, ownershipStatusLabel } from '../../domain/collectionLists.js';
import { collectionOwnerSuggestions } from '../../domain/collectionOwnership.js';
import { formatCount } from '../../domain/uiText.js';
import { BrowseFilterOverlay } from '../filters/BrowseFilterOverlay.js';
import { FilteredEmptyState } from '../filters/FilteredEmptyState.js';
import { StatusPill, type StatusPillTone } from '../forge-ui/index.js';
import { Icon } from '../Icon.js';
import { ColorIdentitySymbols, ManaCostSymbols } from '../ManaSymbols.js';
import { PanelResizeHandle } from '../PanelResizeHandle.js';
import { DASHBOARD_WIDGETS, DashboardWidgetCard, type DashboardVisualization, type DashboardWidgetDefinition, type DashboardWidgetId } from './DashboardWidgetCard.js';

interface DashboardViewProps {
  library: LibraryState | null;
  project: EditorProject | null;
  cardsForList: CardSummary[];
  scopeRequest?: DashboardScopeRequest | null;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onExit: () => void;
  onStatus: (status: string) => void;
}

interface DashboardScopeRequest {
  scope: DashboardScope;
  token: number;
}

const DEFAULT_WIDGET_ORDER = DASHBOARD_WIDGETS.map((widget) => widget.id);
const DEFAULT_HIDDEN_WIDGETS: DashboardWidgetId[] = ['sources', 'keywords', 'roles', 'probability', 'collection', 'matrix'];

type DashboardSourceFilter = 'all' | 'authored_card' | 'deck_entry' | 'collection_row';

interface DashboardAdvancedFilters {
  sourceKind: DashboardSourceFilter;
  projectId: string;
  setCode: string;
  deckId: string;
  collectionId: string;
  collectionKind: string;
  listCategory: string;
  ownershipStatus: string;
  ownerName: string;
  collectionMarker: string;
  purchaseValue: string;
  marketValue: string;
  deckSection: string;
  deckVariantId: string;
  collectionReview: string;
  matchStrategy: string;
  name: string;
  rarity: string;
  status: string;
  tag: string;
  color: string;
  manaCost: string;
  manaValue: string;
  cardType: string;
  supertype: string;
  subtype: string;
  keyword: string;
  oracleText: string;
  flavorText: string;
  power: string;
  toughness: string;
  metadata: string;
}

const DEFAULT_DASHBOARD_FILTERS: DashboardAdvancedFilters = {
  sourceKind: 'all',
  projectId: '',
  setCode: '',
  deckId: '',
  collectionId: '',
  collectionKind: 'all',
  listCategory: 'all',
  ownershipStatus: 'all',
  ownerName: '',
  collectionMarker: 'all',
  purchaseValue: 'all',
  marketValue: 'all',
  deckSection: 'all',
  deckVariantId: 'active',
  collectionReview: 'all',
  matchStrategy: 'all',
  name: '',
  rarity: 'all',
  status: 'all',
  tag: '',
  color: 'all',
  manaCost: '',
  manaValue: '',
  cardType: 'all',
  supertype: 'all',
  subtype: '',
  keyword: '',
  oracleText: '',
  flavorText: '',
  power: '',
  toughness: '',
  metadata: 'all'
};

const DASHBOARD_RARITY_OPTIONS = [
  { value: 'all', label: 'Any rarity' },
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'mythic', label: 'Mythic rare' },
  { value: 'special', label: 'Special' }
];

const DASHBOARD_CARD_TYPE_OPTIONS = [
  { value: 'all', label: 'Any card type' },
  { value: 'creature', label: 'Creature' },
  { value: 'planeswalker', label: 'Planeswalker' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'land', label: 'Land' },
  { value: 'sorcery', label: 'Sorcery' },
  { value: 'enchantment', label: 'Enchantment' },
  { value: 'instant', label: 'Instant' },
  { value: 'battle', label: 'Battle' }
];

const DASHBOARD_SUPERTYPE_OPTIONS = [
  { value: 'all', label: 'Any supertype' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'basic', label: 'Basic' },
  { value: 'snow', label: 'Snow' },
  { value: 'world', label: 'World' },
  { value: 'ongoing', label: 'Ongoing' }
];

const DASHBOARD_COLOR_OPTIONS = [
  { value: 'all', label: 'Any color identity' },
  { value: 'white', label: 'White' },
  { value: 'blue', label: 'Blue' },
  { value: 'black', label: 'Black' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'multicolor', label: 'Multicolor' },
  { value: 'colorless', label: 'Colorless' }
];

const DASHBOARD_SOURCE_FILTER_OPTIONS: Array<{ value: DashboardSourceFilter; label: string }> = [
  { value: 'all', label: 'All row sources' },
  { value: 'authored_card', label: 'Authored cards' },
  { value: 'deck_entry', label: 'Deck entries' },
  { value: 'collection_row', label: 'Collection rows' }
];

type DashboardSnapshot = DashboardSettingsSnapshot<DashboardAdvancedFilters, DashboardWidgetId, DashboardVisualization>;
type DashboardPreset = SavedDashboardPreset<DashboardAdvancedFilters, DashboardWidgetId, DashboardVisualization>;

function createDefaultDashboardSnapshot(): DashboardSnapshot {
  return {
    scopeKind: 'all',
    scopeId: '',
    query: '',
    advancedFilters: DEFAULT_DASHBOARD_FILTERS,
    selectedCustomKeys: [],
    widgetOrder: DEFAULT_WIDGET_ORDER,
    hiddenWidgetIds: DEFAULT_HIDDEN_WIDGETS,
    widgetVisualizations: {}
  };
}

function normalizeDashboardSnapshot(settings: Partial<DashboardSnapshot>): DashboardSnapshot {
  const defaults = createDefaultDashboardSnapshot();
  return {
    scopeKind: normalizeDashboardScopeKind(settings.scopeKind),
    scopeId: typeof settings.scopeId === 'string' ? settings.scopeId : defaults.scopeId,
    query: typeof settings.query === 'string' ? settings.query : defaults.query,
    advancedFilters: normalizeDashboardAdvancedFilters(settings.advancedFilters),
    selectedCustomKeys: Array.isArray(settings.selectedCustomKeys) ? settings.selectedCustomKeys.filter((key): key is string => typeof key === 'string') : defaults.selectedCustomKeys,
    widgetOrder: normalizeWidgetOrder(settings.widgetOrder),
    hiddenWidgetIds: normalizeHiddenWidgetIds(settings.hiddenWidgetIds),
    widgetVisualizations: normalizeWidgetVisualizations(settings.widgetVisualizations)
  };
}

function normalizeDashboardScopeKind(value: unknown): DashboardScopeKind {
  return value === 'project' || value === 'set' || value === 'deck' || value === 'collection' || value === 'binder' || value === 'list' || value === 'custom' ? value : 'all';
}

function normalizeDashboardAdvancedFilters(value: unknown): DashboardAdvancedFilters {
  if (!isRecord(value)) {
    return DEFAULT_DASHBOARD_FILTERS;
  }
  return (Object.keys(DEFAULT_DASHBOARD_FILTERS) as Array<keyof DashboardAdvancedFilters>).reduce((filters, key) => {
    const nextValue = value[key];
    return {
      ...filters,
      [key]: typeof nextValue === 'string' ? nextValue : DEFAULT_DASHBOARD_FILTERS[key]
    };
  }, DEFAULT_DASHBOARD_FILTERS);
}

function normalizeWidgetOrder(value: unknown): DashboardWidgetId[] {
  const validIds = new Set<DashboardWidgetId>(DEFAULT_WIDGET_ORDER);
  const restored = Array.isArray(value) ? value.filter((id): id is DashboardWidgetId => typeof id === 'string' && validIds.has(id as DashboardWidgetId)) : [];
  return [...restored, ...DEFAULT_WIDGET_ORDER.filter((id) => !restored.includes(id))];
}

function normalizeHiddenWidgetIds(value: unknown): DashboardWidgetId[] {
  const validIds = new Set<DashboardWidgetId>(DEFAULT_WIDGET_ORDER);
  return Array.isArray(value) ? value.filter((id): id is DashboardWidgetId => typeof id === 'string' && validIds.has(id as DashboardWidgetId)) : DEFAULT_HIDDEN_WIDGETS;
}

function normalizeWidgetVisualizations(value: unknown): Record<string, DashboardVisualization> {
  if (!isRecord(value)) {
    return {};
  }
  const validIds = new Set<DashboardWidgetId>(DEFAULT_WIDGET_ORDER);
  return Object.fromEntries(
    Object.entries(value).filter(([id, visualization]) => validIds.has(id as DashboardWidgetId) && typeof visualization === 'string')
  ) as Record<string, DashboardVisualization>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function DashboardView({ library, project, cardsForList, scopeRequest, onOpenCard, onExit, onStatus }: DashboardViewProps) {
  const [initialDashboardStore] = useState(() => loadDashboardSettingsStore<DashboardAdvancedFilters, DashboardWidgetId, DashboardVisualization>(createDefaultDashboardSnapshot(), normalizeDashboardSnapshot));
  const initialDashboardSettings = initialDashboardStore.lastSettings;
  const [scopeKind, setScopeKind] = useState<DashboardScopeKind>(initialDashboardSettings.scopeKind);
  const [scopeId, setScopeId] = useState(initialDashboardSettings.scopeId);
  const [query, setQuery] = useState(initialDashboardSettings.query);
  const [leftCollapsed, setLeftCollapsed] = useState(true);
  const [leftWidth, setLeftWidth] = useState(340);
  const [editMode, setEditMode] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<DashboardAdvancedFilters>(initialDashboardSettings.advancedFilters);
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);
  const [selectedCustomKeys, setSelectedCustomKeys] = useState<Set<string>>(() => new Set(initialDashboardSettings.selectedCustomKeys));
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(initialDashboardSettings.widgetOrder);
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<Set<DashboardWidgetId>>(() => new Set(initialDashboardSettings.hiddenWidgetIds));
  const [widgetVisualizations, setWidgetVisualizations] = useState<Record<string, DashboardVisualization>>(initialDashboardSettings.widgetVisualizations);
  const [savedDashboardPresets, setSavedDashboardPresets] = useState<DashboardPreset[]>(initialDashboardStore.presets);
  const [selectedDashboardPresetId, setSelectedDashboardPresetId] = useState('');
  const [projectsBySet, setProjectsBySet] = useState<Record<string, EditorProject>>({});
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [deckStates, setDeckStates] = useState<Record<string, DeckState>>({});
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionStates, setCollectionStates] = useState<Record<string, CollectionState>>({});
  const [loading, setLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState('Dashboard waiting for data.');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboardData() {
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
        const loadedDecks = await fetchDecks().catch((error: unknown) => {
          warnings.push(error instanceof Error ? error.message : String(error));
          return [] as DeckSummary[];
        });
        const deckPairs = await Promise.all(
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
        const collectionPairs = await Promise.all(
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
        setProjectsBySet(Object.fromEntries(projectPairs.filter((pair): pair is readonly [string, EditorProject] => Boolean(pair))));
        setDecks(loadedDecks);
        setDeckStates(Object.fromEntries(deckPairs.filter((pair): pair is readonly [string, DeckState] => Boolean(pair))));
        setCollections(loadedCollections);
        setCollectionStates(Object.fromEntries(collectionPairs.filter((pair): pair is readonly [string, CollectionState] => Boolean(pair))));
        const nextStatus = warnings.length ? `Loaded dashboard with ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.` : 'Loaded card dashboard.';
        setLoadStatus(nextStatus);
        onStatus(nextStatus);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [library, onStatus, project]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!scopeRequest) {
      return;
    }
    const { scope } = scopeRequest;
    const nextFilters = {
      ...DEFAULT_DASHBOARD_FILTERS,
      deckVariantId: scope.kind === 'deck' ? scope.deckVariantId ?? 'active' : DEFAULT_DASHBOARD_FILTERS.deckVariantId
    };
    setScopeKind(scope.kind);
    setScopeId(scope.id);
    setQuery('');
    setAdvancedFilters(nextFilters);
    setSelectedCustomKeys(new Set(scope.customKeys ?? []));
    setSelectedDashboardPresetId('');
    onStatus(`Dashboard scoped to ${scope.label}.`);
  }, [onStatus, scopeRequest]);

  const allFacts = useMemo(
    () => buildDashboardFacts({ library, projectsBySet, currentProject: project, currentCards: cardsForList, decks, deckStates, collections, collectionStates }),
    [cardsForList, collectionStates, collections, deckStates, decks, library, project, projectsBySet]
  );
  const scopeOptions = useMemo(() => buildDashboardScopeOptions(scopeKind, library, decks, collections), [collections, decks, library, scopeKind]);
  const projectOptions = useMemo(() => buildDashboardScopeOptions('project', library, decks, collections), [collections, decks, library]);
  const setOptions = useMemo(() => buildDashboardScopeOptions('set', library, decks, collections), [collections, decks, library]);
  const deckOptions = useMemo(() => buildDashboardScopeOptions('deck', library, decks, collections), [collections, decks, library]);
  const collectionOptions = useMemo(() => buildDashboardScopeOptions('collection', library, decks, collections), [collections, decks, library]);
  const selectedDeckState = scopeKind === 'deck' && scopeId ? deckStates[scopeId] : null;
  const selectedDeckActiveVariant = selectedDeckState?.metadata.variants.find((variant) => variant.variantId === selectedDeckState.activeVariantId) ?? selectedDeckState?.activeVariant ?? null;
  const deckVariantOptions = useMemo(
    () => selectedDeckState?.metadata.variants.map((variant) => ({ value: variant.variantId, label: variant.name })) ?? [],
    [selectedDeckState]
  );
  const dashboardVariantLabel = selectedDeckState
    ? advancedFilters.deckVariantId === 'all'
      ? 'All variants'
      : advancedFilters.deckVariantId === 'active' || !advancedFilters.deckVariantId
        ? selectedDeckActiveVariant?.name ?? 'Active variant'
        : selectedDeckState.metadata.variants.find((variant) => variant.variantId === advancedFilters.deckVariantId)?.name ?? 'Selected variant'
    : '';

  useEffect(() => {
    if (!selectedDeckState) {
      return;
    }
    const validVariantIds = new Set(['active', 'all', ...selectedDeckState.metadata.variants.map((variant) => variant.variantId)]);
    if (!validVariantIds.has(advancedFilters.deckVariantId || 'active')) {
      setAdvancedFilters((current) => ({ ...current, deckVariantId: 'active' }));
    }
  }, [advancedFilters.deckVariantId, selectedDeckState]);

  const ownerOptions = useMemo(
    () => collectionOwnerSuggestions(collections.flatMap((collection) => collection.ownerNames ?? []), allFacts.map((fact) => fact.ownerName)),
    [allFacts, collections]
  );
  const requestedScopeLabel = scopeRequest?.scope.kind === scopeKind && scopeRequest.scope.id === scopeId ? scopeRequest.scope.label : '';
  const visibleScopeOptions = useMemo(() => {
    if (!scopeId || !requestedScopeLabel || scopeKind === 'all' || scopeKind === 'custom' || scopeOptions.some((option) => option.value === scopeId)) {
      return scopeOptions;
    }
    return [{ value: scopeId, label: requestedScopeLabel, detail: 'Selected scope' }, ...scopeOptions];
  }, [requestedScopeLabel, scopeId, scopeKind, scopeOptions]);
  const scopeLabel = useMemo(() => {
    if (scopeKind === 'all') {
      return 'All cards, decks, and collections';
    }
    if (scopeKind === 'custom') {
      return selectedCustomKeys.size ? `${selectedCustomKeys.size} selected dashboard rows` : 'Custom selection';
    }
    return visibleScopeOptions.find((option) => option.value === scopeId)?.label ?? (requestedScopeLabel || allScopeEntityLabel(scopeKind));
  }, [requestedScopeLabel, scopeId, scopeKind, selectedCustomKeys.size, visibleScopeOptions]);
  const sourceScopedFacts = useMemo(
    () => filterDashboardFacts(allFacts, { kind: scopeKind, id: scopeId, label: scopeLabel, customKeys: selectedCustomKeys }, query),
    [allFacts, query, scopeId, scopeKind, scopeLabel, selectedCustomKeys]
  );
  const scopedFacts = useMemo(
    () => sourceScopedFacts.filter((fact) => dashboardFactMatches(fact, advancedFilters)),
    [advancedFilters, sourceScopedFacts]
  );
  const stats = useMemo(() => computeDashboardStats(scopedFacts, { kind: scopeKind, id: scopeId, label: scopeLabel, customKeys: selectedCustomKeys }), [scopeId, scopeKind, scopeLabel, scopedFacts, selectedCustomKeys]);
  const visibleWidgets = widgetOrder
    .map((id) => DASHBOARD_WIDGETS.find((widget) => widget.id === id))
    .filter((widget): widget is DashboardWidgetDefinition => widget !== undefined && (editMode || !hiddenWidgetIds.has(widget.id)));
  const sidebarFacts = scopedFacts.slice(0, 240);
  const activeFilterCount = useMemo(
    () => countDashboardActiveFilters(advancedFilters),
    [advancedFilters]
  );
  const dashboardSettingsSnapshot = useMemo<DashboardSnapshot>(() => ({
    scopeKind,
    scopeId,
    query,
    advancedFilters,
    selectedCustomKeys: Array.from(selectedCustomKeys),
    widgetOrder,
    hiddenWidgetIds: Array.from(hiddenWidgetIds),
    widgetVisualizations
  }), [advancedFilters, hiddenWidgetIds, query, scopeId, scopeKind, selectedCustomKeys, widgetOrder, widgetVisualizations]);
  const currentDashboardSourceKey = useMemo(() => getDashboardSourceKey(dashboardSettingsSnapshot), [dashboardSettingsSnapshot]);
  const selectedDashboardPreset = useMemo(
    () => savedDashboardPresets.find((preset) => preset.id === selectedDashboardPresetId) ?? null,
    [savedDashboardPresets, selectedDashboardPresetId]
  );
  const sortedDashboardPresets = useMemo(
    () => [...savedDashboardPresets].sort((left, right) => {
      const leftSameSource = left.sourceKey === currentDashboardSourceKey ? 1 : 0;
      const rightSameSource = right.sourceKey === currentDashboardSourceKey ? 1 : 0;
      if (leftSameSource !== rightSameSource) {
        return rightSameSource - leftSameSource;
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    }),
    [currentDashboardSourceKey, savedDashboardPresets]
  );

  useEffect(() => {
    saveDashboardSettingsStore({
      version: 1,
      lastSettings: dashboardSettingsSnapshot,
      presets: savedDashboardPresets
    });
  }, [dashboardSettingsSnapshot, savedDashboardPresets]);

  function handleScopeKindChange(nextScopeKind: DashboardScopeKind) {
    setScopeKind(nextScopeKind);
    setScopeId('');
    setSelectedDashboardPresetId('');
  }

  function applyDashboardSnapshot(settings: Partial<DashboardSnapshot>) {
    const next = normalizeDashboardSnapshot(settings);
    setScopeKind(next.scopeKind);
    setScopeId(next.scopeId);
    setQuery(next.query);
    setAdvancedFilters(next.advancedFilters);
    setSelectedCustomKeys(new Set(next.selectedCustomKeys));
    setWidgetOrder(next.widgetOrder);
    setHiddenWidgetIds(new Set(next.hiddenWidgetIds));
    setWidgetVisualizations(next.widgetVisualizations);
  }

  function loadSavedDashboardPreset(presetId: string) {
    setSelectedDashboardPresetId(presetId);
    if (!presetId) {
      return;
    }
    const preset = savedDashboardPresets.find((candidate) => candidate.id === presetId);
    if (!preset) {
      setSelectedDashboardPresetId('');
      return;
    }
    applyDashboardSnapshot(preset.settings);
    onStatus(`Loaded dashboard "${preset.name}".`);
  }

  function saveCurrentDashboardPreset() {
    const fallbackName = selectedDashboardPreset?.name ?? suggestDashboardPresetName(scopeLabel, savedDashboardPresets);
    const name = window.prompt('Name this dashboard view', fallbackName)?.trim();
    if (!name) {
      return;
    }
    if (selectedDashboardPreset) {
      const shouldUpdate = window.confirm(`Update "${selectedDashboardPreset.name}" with the current dashboard settings? Press Cancel to save a new copy.`);
      if (shouldUpdate) {
        const updatedPreset: DashboardPreset = {
          ...selectedDashboardPreset,
          name,
          sourceKey: currentDashboardSourceKey,
          sourceLabel: scopeLabel,
          updatedAt: new Date().toISOString(),
          settings: dashboardSettingsSnapshot
        };
        setSavedDashboardPresets((current) => current.map((preset) => (preset.id === updatedPreset.id ? updatedPreset : preset)));
        setSelectedDashboardPresetId(updatedPreset.id);
        onStatus(`Updated dashboard "${updatedPreset.name}".`);
        return;
      }
    }
    const nextPreset = createDashboardPreset(name, dashboardSettingsSnapshot, scopeLabel);
    setSavedDashboardPresets((current) => [nextPreset, ...current]);
    setSelectedDashboardPresetId(nextPreset.id);
    onStatus(`Saved dashboard "${nextPreset.name}".`);
  }

  function deleteSelectedDashboardPreset() {
    if (!selectedDashboardPreset) {
      return;
    }
    if (!window.confirm(`Delete saved dashboard "${selectedDashboardPreset.name}"?`)) {
      return;
    }
    setSavedDashboardPresets((current) => current.filter((preset) => preset.id !== selectedDashboardPreset.id));
    setSelectedDashboardPresetId('');
    onStatus(`Deleted dashboard "${selectedDashboardPreset.name}".`);
  }

  function resetDashboardView() {
    applyDashboardSnapshot(createDefaultDashboardSnapshot());
    setSelectedDashboardPresetId('');
    onStatus('Dashboard reset to the default autosaved view.');
  }

  function resizeLeft(delta: number) {
    setLeftWidth((width) => clamp(width + delta, 260, 520));
  }

  function toggleCustomFact(key: string) {
    setSelectedCustomKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function moveWidget(id: DashboardWidgetId, direction: -1 | 1) {
    setWidgetOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function hideWidget(id: DashboardWidgetId) {
    setHiddenWidgetIds((current) => new Set(current).add(id));
  }

  function showWidget(id: DashboardWidgetId) {
    setHiddenWidgetIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function toggleWidget(id: DashboardWidgetId) {
    if (hiddenWidgetIds.has(id)) {
      showWidget(id);
    } else {
      hideWidget(id);
    }
  }

  function dropWidget(targetId: DashboardWidgetId) {
    if (!draggedWidgetId || draggedWidgetId === targetId || hiddenWidgetIds.has(targetId)) {
      setDraggedWidgetId(null);
      return;
    }
    setWidgetOrder((current) => {
      const fromIndex = current.indexOf(draggedWidgetId);
      const toIndex = current.indexOf(targetId);
      if (fromIndex < 0 || toIndex < 0) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setDraggedWidgetId(null);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browser fullscreen can fail when the host app denies it. The dashboard still works inline.
    }
  }

  async function openFact(fact: DashboardCardFact) {
    if (fact.setCode && fact.cardId) {
      await onOpenCard(fact.setCode, fact.cardId, fact.variantId);
    }
  }

  function resetAdvancedFilters() {
    setAdvancedFilters(DEFAULT_DASHBOARD_FILTERS);
  }

  return (
    <div ref={viewRef} className={`dashboard-view ${leftCollapsed ? 'left-collapsed' : ''}`} style={{ gridTemplateColumns: leftCollapsed ? 'minmax(0, 1fr)' : `${leftWidth}px 6px minmax(0, 1fr)` }}>
      {!leftCollapsed ? (
        <>
          <aside className="dashboard-rail">
            <header className="dashboard-rail-header">
              <div>
                <strong>Card Dashboard</strong>
                <span>{loading ? 'Loading...' : formatCount(scopedFacts.length, 'row')}</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setLeftCollapsed(true)} title="Collapse filters" aria-label="Collapse filters">
                <Icon name="collapseLeft" />
              </button>
            </header>
            <div className="dashboard-controls">
              <label className="search-field">
                <Icon name="search" />
                <input value={query} placeholder="Filter dashboard cards..." onChange={(event) => setQuery(event.target.value)} />
              </label>
              <div className="grid-2 compact-filter-grid">
                <label className="filter-field">
                  <span>Scope</span>
                  <select value={scopeKind} onChange={(event) => handleScopeKindChange(event.target.value as DashboardScopeKind)}>
                    <option value="all">All sources</option>
                    <option value="project">Project</option>
                    <option value="set">Set</option>
                    <option value="deck">Deck</option>
                    <option value="collection">Collection</option>
                    <option value="binder">Binder</option>
                    <option value="list">List</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="filter-field">
                  <span>Filter</span>
                  <select value={scopeId} disabled={scopeKind === 'all' || scopeKind === 'custom'} onChange={(event) => setScopeId(event.target.value)}>
                    <option value="">{scopeKind === 'all' ? 'Everything' : allScopeEntityLabel(scopeKind)}</option>
                    {visibleScopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="dashboard-custom-actions">
                <button type="button" className="secondary-button compact" onClick={() => setScopeKind('custom')} disabled={!selectedCustomKeys.size}>
                  Use selected
                </button>
                <button type="button" className="secondary-button compact" onClick={() => setSelectedCustomKeys(new Set())} disabled={!selectedCustomKeys.size}>
                  Clear
                </button>
              </div>
            </div>
            <div className="dashboard-fact-list" role="listbox" aria-label="Dashboard card rows">
              {sidebarFacts.map((fact) => (
                <div key={fact.key} className={`dashboard-fact-row ${selectedCustomKeys.has(fact.key) ? 'selected' : ''} ${fact.ownershipStatus && !isOwnedStatus(fact.ownershipStatus) ? 'not-owned' : ''}`}>
                  <label>
                    <input type="checkbox" checked={selectedCustomKeys.has(fact.key)} onChange={() => toggleCustomFact(fact.key)} />
                    <span>
                      <strong>{fact.name}</strong>
                      <small className="dashboard-row-source-line">
                        <StatusPill tone={toneForDashboardSource(fact.sourceKind)} className="dashboard-source-pill">
                          {sourceKindLabel(fact)}
                        </StatusPill>
                        <span>{sourceLabel(fact)} - {fact.typeLine || fact.sourceName}</span>
                      </small>
                    </span>
                  </label>
                  {fact.setCode && fact.cardId ? (
                    <button type="button" className="dashboard-open-card" onClick={() => void openFact(fact)}>Open</button>
                  ) : null}
                </div>
              ))}
              {!sidebarFacts.length ? (
                <div className="dashboard-empty-list">
                  <strong>No rows in scope</strong>
                  <span>Clear filters or choose another source.</span>
                </div>
              ) : null}
            </div>
            <footer className="status-strip">{loading ? 'Loading dashboard data...' : loadStatus}</footer>
          </aside>
          <PanelResizeHandle label="Resize dashboard filters" onResize={resizeLeft} />
        </>
      ) : null}
      <section className="dashboard-canvas">
        <header className="dashboard-topbar">
          <div className="dashboard-title-block">
            <span>Analysis view</span>
            <h2>{scopeLabel}</h2>
            <p>{dashboardVariantLabel ? `Deck variant: ${dashboardVariantLabel}. ` : ''}Source-aware stats across authored cards, decks, and collections.</p>
          </div>
          <div className="dashboard-topbar-controls">
            <label>
              <span>Scope</span>
              <select value={scopeKind} onChange={(event) => handleScopeKindChange(event.target.value as DashboardScopeKind)}>
                <option value="all">All sources</option>
                <option value="project">Project</option>
                <option value="set">Set</option>
                <option value="deck">Deck</option>
                <option value="collection">Collection</option>
                <option value="binder">Binder</option>
                <option value="list">List</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {scopeKind !== 'all' && scopeKind !== 'custom' ? (
              <label className="dashboard-source-filter">
                <span>{scopeEntityLabel(scopeKind)}</span>
                <select value={scopeId} onChange={(event) => setScopeId(event.target.value)}>
                  <option value="">{allScopeEntityLabel(scopeKind)}</option>
                  {visibleScopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedDeckState && deckVariantOptions.length > 1 ? (
              <label className="dashboard-source-filter">
                <span>Variant</span>
                <select value={advancedFilters.deckVariantId || 'active'} onChange={(event) => setAdvancedFilters((current) => ({ ...current, deckVariantId: event.target.value }))}>
                  <option value="active">Active - {selectedDeckActiveVariant?.name ?? 'Default'}</option>
                  <option value="all">All variants</option>
                  {deckVariantOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="dashboard-topbar-search">
              <span>Search</span>
              <input value={query} placeholder="Name, type, keyword..." onChange={(event) => setQuery(event.target.value)} />
            </label>
            <button type="button" className={`dashboard-filter-button ${activeFilterCount ? 'has-active-filters' : ''}`} onClick={() => setFiltersOpen(true)}>
              Advanced filters
              {activeFilterCount ? <span>{activeFilterCount}</span> : null}
            </button>
          </div>
          <div className="dashboard-topbar-actions">
            <button type="button" className="secondary-button" onClick={() => setLeftCollapsed(false)}>
              Rows
            </button>
            <button type="button" className={`secondary-button ${editMode ? 'active' : ''}`} onClick={() => setEditMode((value) => !value)}>
              {editMode ? 'Done Editing' : 'Edit Dashboard'}
            </button>
            <button type="button" className="secondary-button" onClick={() => void toggleFullscreen()}>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            <button type="button" className="icon-button" onClick={onExit} title="Exit dashboard view" aria-label="Exit dashboard view">
              <Icon name="close" />
            </button>
          </div>
          <div className="dashboard-memory-bar" aria-label="Saved dashboard settings">
            <div className="dashboard-memory-copy">
              <strong>Autosaves while you work</strong>
              <span>Current source, filters, custom row selection, widgets, and chart choices stay loaded until reset.</span>
            </div>
            <label className="dashboard-preset-picker">
              <span>Saved dashboard</span>
              <select value={selectedDashboardPresetId} onChange={(event) => loadSavedDashboardPreset(event.target.value)}>
                <option value="">Current autosaved dashboard</option>
                {sortedDashboardPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.sourceKey === currentDashboardSourceKey ? preset.name : `${preset.name} - ${preset.sourceLabel}`}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="secondary-button compact" onClick={saveCurrentDashboardPreset}>
              {selectedDashboardPreset ? 'Save / Update' : 'Save View'}
            </button>
            {selectedDashboardPreset ? (
              <button type="button" className="secondary-button compact danger" onClick={deleteSelectedDashboardPreset}>
                Delete
              </button>
            ) : null}
            <button type="button" className="secondary-button compact" onClick={resetDashboardView}>
              Reset Current
            </button>
          </div>
        </header>
        {filtersOpen ? (
          <BrowseFilterOverlay
            title="Browse Dashboard"
            subtitle="Use the same rich filtering pattern as Maker, then let the dashboard summarize only those rows."
            resultsLabel={`${scopedFacts.length} matching dashboard rows`}
            activeFilterCount={activeFilterCount}
            onClose={() => setFiltersOpen(false)}
            onResetFilters={resetAdvancedFilters}
            results={
              <div className="dashboard-overlay-results">
                <div className="dashboard-overlay-result-summary">
                  <strong>{scopeLabel}</strong>
                  <span>{formatCount(sourceScopedFacts.length, 'row')} before advanced filters; {formatCount(scopedFacts.length, 'row')} after.</span>
                </div>
                {scopedFacts.slice(0, 180).map((fact) => (
                  <DashboardFactResultRow
                    key={fact.key}
                    fact={fact}
                    selected={selectedCustomKeys.has(fact.key)}
                    onToggle={() => toggleCustomFact(fact.key)}
                    onOpen={() => void openFact(fact)}
                  />
                ))}
                {!scopedFacts.length ? (
                  <FilteredEmptyState
                    title="No dashboard rows match"
                    detail="Reset advanced filters, clear search, or choose a broader source."
                    showClearSearch={Boolean(query.trim())}
                    showResetFilters={activeFilterCount > 0}
                    onClearSearch={() => setQuery('')}
                    onResetFilters={resetAdvancedFilters}
                  />
                ) : null}
                {scopedFacts.length > 180 ? (
                  <div className="dashboard-overlay-overflow-note">Showing the first 180 rows. Narrow the filters to inspect a smaller slice.</div>
                ) : null}
              </div>
            }
          >
            <DashboardFilterControls
              filters={advancedFilters}
              onChange={(patch) => setAdvancedFilters((current) => ({ ...current, ...patch }))}
              projectOptions={projectOptions}
              setOptions={setOptions}
              deckOptions={deckOptions}
              deckVariantOptions={deckVariantOptions}
              collectionOptions={collectionOptions}
              ownerOptions={ownerOptions}
            />
          </BrowseFilterOverlay>
        ) : null}
        {editMode ? (
          <div className="dashboard-edit-tray">
            <strong>Edit dashboard</strong>
            <span>Active cards gently wiggle and can be dragged. Ghost cards are available dashboards; press + to add them.</span>
          </div>
        ) : null}
        <div className="dashboard-grid">
          {visibleWidgets.map((widget) => (
            <DashboardWidgetCard
              key={widget.id}
              definition={widget}
              stats={stats}
              visualization={widgetVisualizations[widget.id] ?? widget.defaultVisualization}
              editMode={editMode}
              isActive={!hiddenWidgetIds.has(widget.id)}
              isDragging={draggedWidgetId === widget.id}
              onVisualizationChange={(visualization) => setWidgetVisualizations((current) => ({ ...current, [widget.id]: visualization }))}
              onMove={(direction) => moveWidget(widget.id, direction)}
              onToggle={() => toggleWidget(widget.id)}
              onDragStart={() => setDraggedWidgetId(widget.id)}
              onDragOver={(event) => {
                if (editMode && !hiddenWidgetIds.has(widget.id)) {
                  event.preventDefault();
                }
              }}
              onDrop={() => dropWidget(widget.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface DashboardFilterControlsProps {
  filters: DashboardAdvancedFilters;
  onChange: (patch: Partial<DashboardAdvancedFilters>) => void;
  projectOptions: Array<{ value: string; label: string }>;
  setOptions: Array<{ value: string; label: string }>;
  deckOptions: Array<{ value: string; label: string }>;
  deckVariantOptions: Array<{ value: string; label: string }>;
  collectionOptions: Array<{ value: string; label: string }>;
  ownerOptions: string[];
}

function DashboardFilterControls({ filters, onChange, projectOptions, setOptions, deckOptions, deckVariantOptions, collectionOptions, ownerOptions }: DashboardFilterControlsProps) {
  const statusOptions = [
    { value: 'all', label: 'Any status' },
    ...normalizeFilterOptions(CARD_STATUS_OPTIONS).filter((option) => option.value !== 'all'),
    { value: 'matched', label: 'Matched collection row' },
    { value: 'needs_review', label: 'Needs review' }
  ];

  function update<K extends keyof DashboardAdvancedFilters>(key: K, value: DashboardAdvancedFilters[K]) {
    onChange({ [key]: value });
  }

  return (
    <div className="dashboard-advanced-filter-controls">
      <section className="filter-panel">
        <div className="browse-filter-heading">
          <strong>Source and ownership</strong>
          <span>Choose whether stats come from authored cards, decks, collections, or a precise entity.</span>
        </div>
        <div className="grid-2 compact-filter-grid">
          <label className="filter-field">
            <span>Row source</span>
            <select value={filters.sourceKind} onChange={(event) => update('sourceKind', event.target.value as DashboardSourceFilter)}>
              {DASHBOARD_SOURCE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Project</span>
            <select value={filters.projectId} onChange={(event) => update('projectId', event.target.value)}>
              <option value="">Any project</option>
              {projectOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Set</span>
            <select value={filters.setCode} onChange={(event) => update('setCode', event.target.value)}>
              <option value="">Any set</option>
              {setOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Deck</span>
            <select value={filters.deckId} onChange={(event) => update('deckId', event.target.value)}>
              <option value="">Any deck</option>
              {deckOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Collection</span>
            <select value={filters.collectionId} onChange={(event) => update('collectionId', event.target.value)}>
              <option value="">Any collection</option>
              {collectionOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Collection kind</span>
            <select value={filters.collectionKind} onChange={(event) => update('collectionKind', event.target.value)}>
              <option value="all">Any kind</option>
              <option value="binder">Binders</option>
              <option value="list">Lists</option>
            </select>
          </label>
          <label className="filter-field">
            <span>List category</span>
            <select value={filters.listCategory} onChange={(event) => update('listCategory', event.target.value)}>
              <option value="all">Any list category</option>
              <option value="general">General</option>
              <option value="wishlist">Wish list</option>
              <option value="recommendation">Recommendations</option>
              <option value="starred">Starred</option>
              <option value="flagged">Flagged</option>
              <option value="gift">Gift list</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Owner</span>
            <input list="dashboard-owner-filter-options" value={filters.ownerName} placeholder="Any owner" onChange={(event) => update('ownerName', event.target.value)} />
            <datalist id="dashboard-owner-filter-options">
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner} />
              ))}
            </datalist>
          </label>
          <label className="filter-field">
            <span>Ownership</span>
            <select value={filters.ownershipStatus} onChange={(event) => update('ownershipStatus', event.target.value)}>
              <option value="all">Any ownership state</option>
              <option value="owned">Owned</option>
              <option value="wanted">Wanted</option>
              <option value="recommended">Recommended</option>
              <option value="reference">Reference only</option>
              <option value="proxy">Proxy</option>
              <option value="homebrew_unprinted">Homebrew unprinted</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Collection marker</span>
            <select value={filters.collectionMarker} onChange={(event) => update('collectionMarker', event.target.value)}>
              <option value="all">Any marker</option>
              <option value="flagged">Flagged</option>
              <option value="marked_for_deletion">Marked for deletion</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Purchase data</span>
            <select value={filters.purchaseValue} onChange={(event) => update('purchaseValue', event.target.value)}>
              <option value="all">Any purchase data</option>
              <option value="has">Has purchase value</option>
              <option value="missing">Missing purchase value</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Market value</span>
            <select value={filters.marketValue} onChange={(event) => update('marketValue', event.target.value)}>
              <option value="all">Any market value</option>
              <option value="has">Has market value</option>
              <option value="missing">Missing market value</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Deck section</span>
            <select value={filters.deckSection} onChange={(event) => update('deckSection', event.target.value)}>
              <option value="all">Any section</option>
              <option value="commander">Commander</option>
              <option value="main">Main</option>
              <option value="side">Sideboard</option>
              <option value="maybe">Maybe</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Deck variant</span>
            <select value={filters.deckVariantId} onChange={(event) => update('deckVariantId', event.target.value)}>
              <option value="active">Active variant</option>
              <option value="all">All variants</option>
              {deckVariantOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Collection review</span>
            <select value={filters.collectionReview} onChange={(event) => update('collectionReview', event.target.value)}>
              <option value="all">Any review state</option>
              <option value="matched">Matched</option>
              <option value="needs_review">Needs review</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Match strategy</span>
            <select value={filters.matchStrategy} onChange={(event) => update('matchStrategy', event.target.value)}>
              <option value="all">Any match</option>
              <option value="scryfall_id">Scryfall ID</option>
              <option value="set_number">Set number</option>
              <option value="set_name">Set and name</option>
              <option value="unresolved">Unresolved</option>
            </select>
          </label>
        </div>
      </section>

      <section className="filter-panel">
        <div className="browse-filter-heading">
          <strong>Card identity</strong>
          <span>These mirror the Maker workspace style: name, type line, rarity, colors, tags, and status.</span>
        </div>
        <div className="grid-2 compact-filter-grid">
          <label className="filter-field">
            <span>Card name</span>
            <input value={filters.name} placeholder="e.g. Goblin, Ascendant" onChange={(event) => update('name', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Rarity</span>
            <select value={filters.rarity} onChange={(event) => update('rarity', event.target.value)}>
              {DASHBOARD_RARITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => update('status', event.target.value)}>
              {statusOptions.map((option, index) => (
                <option key={`${option.value}-${index}`} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Tags</span>
            <input value={filters.tag} placeholder="tag or comma-separated tags" onChange={(event) => update('tag', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Color identity</span>
            <select value={filters.color} onChange={(event) => update('color', event.target.value)}>
              {DASHBOARD_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Mana cost</span>
            <input value={filters.manaCost} placeholder="e.g. {2}{G}, WU" onChange={(event) => update('manaCost', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Mana value</span>
            <input value={filters.manaValue} placeholder="=3, >=4, 2-5" onChange={(event) => update('manaValue', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Metadata state</span>
            <select value={filters.metadata} onChange={(event) => update('metadata', event.target.value)}>
              <option value="all">Any metadata state</option>
              <option value="resolved">Resolved card data</option>
              <option value="unresolved">Unresolved rows</option>
              <option value="needs_review">Needs review</option>
              <option value="missing_art">Missing art</option>
            </select>
          </label>
        </div>
      </section>

      <section className="filter-panel">
        <div className="browse-filter-heading">
          <strong>Rules text and type line</strong>
          <span>Use this when you want the dashboard to answer questions about mechanics or design patterns.</span>
        </div>
        <div className="grid-2 compact-filter-grid">
          <label className="filter-field">
            <span>Card type</span>
            <select value={filters.cardType} onChange={(event) => update('cardType', event.target.value)}>
              {DASHBOARD_CARD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Supertype</span>
            <select value={filters.supertype} onChange={(event) => update('supertype', event.target.value)}>
              {DASHBOARD_SUPERTYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Subtype</span>
            <input value={filters.subtype} placeholder="Wizard, Equipment, Aura..." onChange={(event) => update('subtype', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Keyword / mechanic</span>
            <input value={filters.keyword} placeholder="Flying, Scry, counter..." onChange={(event) => update('keyword', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Power</span>
            <input value={filters.power} placeholder="=2, >=4, *" onChange={(event) => update('power', event.target.value)} />
          </label>
          <label className="filter-field">
            <span>Toughness</span>
            <input value={filters.toughness} placeholder="=2, <=3, *" onChange={(event) => update('toughness', event.target.value)} />
          </label>
          <label className="filter-field span-2">
            <span>Rules / oracle text</span>
            <textarea value={filters.oracleText} placeholder="Search rules text, reminder text, and imported oracle text." onChange={(event) => update('oracleText', event.target.value)} />
          </label>
          <label className="filter-field span-2">
            <span>Flavor text</span>
            <textarea value={filters.flavorText} placeholder="Search flavor text." onChange={(event) => update('flavorText', event.target.value)} />
          </label>
        </div>
      </section>
    </div>
  );
}

function DashboardFactResultRow({ fact, selected, onToggle, onOpen }: { fact: DashboardCardFact; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  const canOpen = Boolean(fact.setCode && fact.cardId);
  const identity = fact.colorIdentity.length ? fact.colorIdentity.join('') : fact.colors.length ? fact.colors.join('') : '';
  return (
    <article className={`dashboard-overlay-result-row ${selected ? 'selected' : ''} ${fact.ownershipStatus && !isOwnedStatus(fact.ownershipStatus) ? 'not-owned' : ''}`}>
      <div className="dashboard-overlay-result-main">
        <label className="dashboard-overlay-result-check" title={`Include ${fact.name} in custom dashboard selection`}>
          <input type="checkbox" checked={selected} onChange={onToggle} />
        </label>
        <div className="dashboard-overlay-result-copy">
          <strong>{fact.name}</strong>
          <small className="dashboard-row-source-line">
            <StatusPill tone={toneForDashboardSource(fact.sourceKind)} className="dashboard-source-pill">
              {sourceKindLabel(fact)}
            </StatusPill>
            <span>{sourceLabel(fact)}</span>
          </small>
        </div>
      </div>
      <div className="dashboard-overlay-result-meta">
        {fact.manaCost ? <ManaCostSymbols value={fact.manaCost} className="compact" /> : null}
        {identity ? <ColorIdentitySymbols value={identity} className="compact" /> : null}
        {fact.typeLine ? <span>{fact.typeLine}</span> : null}
        {fact.rarity ? <span>{formatFilterLabel(fact.rarity)}</span> : null}
        {fact.setCode ? <span>{fact.setCode}</span> : null}
        {fact.ownerName ? <span>{fact.ownerName}</span> : null}
      </div>
      {canOpen ? (
        <button type="button" className="dashboard-overlay-open-card" onClick={onOpen}>Open</button>
      ) : null}
    </article>
  );
}

function dashboardFactMatches(fact: DashboardCardFact, filters: DashboardAdvancedFilters): boolean {
  if (filters.sourceKind !== 'all' && fact.sourceKind !== filters.sourceKind) {
    return false;
  }
  if (filters.projectId && fact.projectId !== filters.projectId) {
    return false;
  }
  if (filters.setCode && fact.setCode !== filters.setCode) {
    return false;
  }
  if (filters.deckId && fact.deckId !== filters.deckId) {
    return false;
  }
  if (filters.collectionId && fact.collectionId !== filters.collectionId) {
    return false;
  }
  if (filters.collectionKind !== 'all') {
    if (fact.sourceKind !== 'collection_row') {
      return false;
    }
    if (filters.collectionKind === 'binder' && fact.collectionKind === 'list') {
      return false;
    }
    if (filters.collectionKind === 'list' && fact.collectionKind !== 'list') {
      return false;
    }
  }
  if (filters.listCategory !== 'all' && fact.collectionListCategory !== filters.listCategory) {
    return false;
  }
  if (filters.ownershipStatus !== 'all' && fact.ownershipStatus !== filters.ownershipStatus) {
    return false;
  }
  if (filters.ownerName && (fact.sourceKind !== 'collection_row' || !includesFilterText(fact.ownerName ?? '', filters.ownerName))) {
    return false;
  }
  if (filters.collectionMarker !== 'all') {
    if (fact.sourceKind !== 'collection_row') {
      return false;
    }
    if (filters.collectionMarker === 'flagged' && !fact.flagged) {
      return false;
    }
    if (filters.collectionMarker === 'marked_for_deletion' && !fact.markedForDeletion) {
      return false;
    }
  }
  if (!dashboardFactMatchesValueState(fact.purchaseValue, filters.purchaseValue, fact.sourceKind)) {
    return false;
  }
  if (!dashboardFactMatchesValueState(fact.marketValue, filters.marketValue, fact.sourceKind)) {
    return false;
  }
  if (filters.deckSection !== 'all' && fact.section !== filters.deckSection) {
    return false;
  }
  if (filters.deckVariantId !== 'all' && fact.sourceKind === 'deck_entry') {
    if (filters.deckVariantId === 'active') {
      if (fact.activeDeckVariant === false) {
        return false;
      }
    } else if (fact.deckVariantId !== filters.deckVariantId) {
      return false;
    }
  }
  if (filters.collectionReview !== 'all' && fact.reviewStatus !== filters.collectionReview) {
    return false;
  }
  if (filters.matchStrategy !== 'all' && fact.matchStrategy !== filters.matchStrategy) {
    return false;
  }
  if (filters.name && !includesFilterText(fact.name, filters.name)) {
    return false;
  }
  if (filters.rarity !== 'all' && (fact.rarity ?? '').toLowerCase() !== filters.rarity) {
    return false;
  }
  const statusText = (fact.status ?? fact.reviewStatus ?? '').toLowerCase();
  if (filters.status !== 'all' && statusText !== filters.status) {
    return false;
  }
  if (!matchesTagFilter(fact.tags, filters.tag)) {
    return false;
  }
  if (!dashboardFactMatchesColor(fact, filters.color)) {
    return false;
  }
  if (filters.manaCost && !includesFilterText(fact.manaCost ?? '', filters.manaCost)) {
    return false;
  }
  if (filters.manaValue && !matchesNumberQuery(fact.manaValue, filters.manaValue)) {
    return false;
  }
  if (filters.cardType !== 'all' && !fact.cardTypes.some((type) => type.toLowerCase() === filters.cardType)) {
    return false;
  }
  if (filters.supertype !== 'all' && !fact.supertypes.some((supertype) => supertype.toLowerCase() === filters.supertype)) {
    return false;
  }
  if (filters.subtype && !includesAnyFilterText(fact.subtypes, filters.subtype)) {
    return false;
  }
  if (filters.keyword && !includesAnyFilterText([...fact.keywords, fact.oracleText ?? '', fact.typeLine ?? ''], filters.keyword)) {
    return false;
  }
  if (filters.oracleText && !includesFilterText(fact.oracleText ?? '', filters.oracleText)) {
    return false;
  }
  if (filters.flavorText && !includesFilterText(fact.flavorText ?? '', filters.flavorText)) {
    return false;
  }
  if (filters.power && !matchesStatText(fact.power, filters.power)) {
    return false;
  }
  if (filters.toughness && !matchesStatText(fact.toughness, filters.toughness)) {
    return false;
  }
  if (!dashboardFactMatchesMetadata(fact, filters.metadata)) {
    return false;
  }
  return true;
}

function countDashboardActiveFilters(filters: DashboardAdvancedFilters): number {
  return (Object.keys(filters) as Array<keyof DashboardAdvancedFilters>).reduce((count, key) => {
    return filters[key] === DEFAULT_DASHBOARD_FILTERS[key] ? count : count + 1;
  }, 0);
}

function dashboardFactMatchesColor(fact: DashboardCardFact, colorFilter: string): boolean {
  if (colorFilter === 'all') {
    return true;
  }
  const colorTokens = (fact.colorIdentity.length ? fact.colorIdentity : fact.colors)
    .map(normalizeDashboardColor)
    .filter((color): color is string => Boolean(color));
  const uniqueColors = Array.from(new Set(colorTokens));
  if (colorFilter === 'colorless') {
    return uniqueColors.length === 0;
  }
  if (colorFilter === 'multicolor') {
    return uniqueColors.length > 1;
  }
  return uniqueColors.includes(colorFilter);
}

function dashboardFactMatchesValueState(value: number | undefined, filter: string, sourceKind: DashboardCardFact['sourceKind']): boolean {
  if (filter === 'all') {
    return true;
  }
  if (sourceKind !== 'collection_row') {
    return false;
  }
  return filter === 'has' ? value !== undefined : value === undefined;
}

function dashboardFactMatchesMetadata(fact: DashboardCardFact, metadataFilter: string): boolean {
  if (metadataFilter === 'all') {
    return true;
  }
  if (metadataFilter === 'resolved') {
    return Boolean(fact.typeLine || fact.cardTypes.length);
  }
  if (metadataFilter === 'unresolved') {
    return !fact.typeLine && !fact.cardTypes.length;
  }
  if (metadataFilter === 'needs_review') {
    return fact.needsReview || fact.reviewStatus === 'needs_review';
  }
  if (metadataFilter === 'missing_art') {
    return fact.hasArt === false;
  }
  return true;
}

function matchesStatText(value: string | undefined, query: string): boolean {
  const normalizedValue = (value ?? '').trim();
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return true;
  }
  const numericValue = Number(normalizedValue);
  if (Number.isFinite(numericValue) && matchesNumberQuery(numericValue, normalizedQuery)) {
    return true;
  }
  return includesFilterText(normalizedValue, normalizedQuery);
}

function normalizeDashboardColor(color: string): string | null {
  const normalized = color.trim().toLowerCase();
  if (!normalized || normalized === 'c' || normalized === 'colorless') {
    return null;
  }
  if (normalized === 'w' || normalized === 'white') {
    return 'white';
  }
  if (normalized === 'u' || normalized === 'blue') {
    return 'blue';
  }
  if (normalized === 'b' || normalized === 'black') {
    return 'black';
  }
  if (normalized === 'r' || normalized === 'red') {
    return 'red';
  }
  if (normalized === 'g' || normalized === 'green') {
    return 'green';
  }
  return normalized;
}

function normalizeFilterOptions(options: ReadonlyArray<string | { value: string; label: string }>): Array<{ value: string; label: string }> {
  return options.map((option) => {
    if (typeof option === 'string') {
      return { value: option, label: formatFilterLabel(option) };
    }
    return option;
  });
}

function scopeEntityLabel(scopeKind: DashboardScopeKind): string {
  if (scopeKind === 'project') {
    return 'Project';
  }
  if (scopeKind === 'set') {
    return 'Set';
  }
  if (scopeKind === 'deck') {
    return 'Deck';
  }
  if (scopeKind === 'collection') {
    return 'Collection';
  }
  if (scopeKind === 'binder') {
    return 'Binder';
  }
  if (scopeKind === 'list') {
    return 'List';
  }
  return 'Source';
}

function allScopeEntityLabel(scopeKind: DashboardScopeKind): string {
  if (scopeKind === 'project') {
    return 'All projects';
  }
  if (scopeKind === 'set') {
    return 'All sets';
  }
  if (scopeKind === 'deck') {
    return 'All decks';
  }
  if (scopeKind === 'collection') {
    return 'All collections';
  }
  if (scopeKind === 'binder') {
    return 'All binders';
  }
  if (scopeKind === 'list') {
    return 'All lists';
  }
  if (scopeKind === 'custom') {
    return 'Custom selection';
  }
  return 'Everything';
}

function suggestDashboardPresetName(scopeLabel: string, presets: DashboardPreset[]): string {
  const baseName = `${scopeLabel} Dashboard`.replace(/\s+/g, ' ').trim();
  if (!presets.some((preset) => preset.name === baseName)) {
    return baseName;
  }
  let index = 2;
  while (presets.some((preset) => preset.name === `${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
}

function formatFilterLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sourceLabel(fact: DashboardCardFact): string {
  if (fact.sourceKind === 'authored_card') {
    return fact.setCode ? `Set ${fact.setCode}` : 'Authored';
  }
  if (fact.sourceKind === 'deck_entry') {
    return `${fact.sourceName}${fact.deckVariantName ? ` / ${fact.deckVariantName}` : ''}${fact.section ? ` / ${fact.section}` : ''}${fact.quantity > 1 ? ` x${fact.quantity}` : ''}`;
  }
  if (fact.collectionKind === 'list') {
    return `${fact.sourceName} / ${listCategoryLabel(fact.collectionListCategory ?? 'general')}${fact.ownershipStatus && !isOwnedStatus(fact.ownershipStatus) ? ` / ${ownershipStatusLabel(fact.ownershipStatus)}` : ''}${fact.quantity > 1 ? ` x${fact.quantity}` : ''}`;
  }
  return `${fact.sourceName}${fact.reviewStatus ? ` / ${fact.reviewStatus}` : ''}${fact.quantity > 1 ? ` x${fact.quantity}` : ''}`;
}

function sourceKindLabel(fact: DashboardCardFact): string {
  if (fact.sourceKind === 'authored_card') {
    return 'Set';
  }
  if (fact.sourceKind === 'deck_entry') {
    return fact.section === 'commander' ? 'Commander' : fact.section === 'side' ? 'Side' : fact.section === 'maybe' ? 'Maybe' : 'Deck';
  }
  if (fact.collectionKind === 'list') {
    return fact.collectionListCategory ? listCategoryLabel(fact.collectionListCategory) : 'List';
  }
  if (fact.collectionKind === 'binder') {
    return 'Binder';
  }
  return fact.reviewStatus === 'needs_review' ? 'Review' : 'Collection';
}

function toneForDashboardSource(sourceKind: DashboardCardFact['sourceKind']): StatusPillTone {
  if (sourceKind === 'deck_entry') {
    return 'success';
  }
  if (sourceKind === 'collection_row') {
    return 'warning';
  }
  return 'neutral';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
