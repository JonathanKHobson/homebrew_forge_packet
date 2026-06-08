import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addOfficialCardToCollection,
  addOfficialCardToDeck,
  addOfficialCardToSet,
  exportSource,
  fetchCollection,
  fetchCollections,
  fetchDeck,
  fetchDecks,
  fetchOfficialCardVariants,
  fetchOfficialCardStatus,
  fetchPreview,
  fetchProject,
  searchOfficialCardCatalog,
  saveCollection,
  saveDeck,
  syncOfficialCardCatalog,
  updateSet,
  updateUniverse
} from '../api/client.js';
import type {
  CardDraft,
  CollectionEntry,
  CollectionKind,
  CollectionListCategory,
  CollectionOwnershipStatus,
  CollectionPurpose,
  CollectionState,
  CollectionSummary,
  DeckCardOption,
  DeckEntry,
  DeckMetadata,
  DeckState,
  DeckSummary,
  EditorProject,
  LibraryState,
  OfficialCardCatalogStatus,
  OfficialCardCatalogView,
  OfficialCardPrintVariantsResult,
  OfficialCardSearchCard,
  OfficialCardSearchResult,
  SetSummary,
  UniverseSummary
} from '../domain/editorTypes.js';
import type { WorkspaceSection } from '../domain/editorUiTypes.js';
import { collectionKindForSurface, isOwnedStatus, listCategoryLabel, ownershipStatusLabel, surfaceLabel, surfaceSingularLabel, type CollectionSurfaceKind } from '../domain/collectionLists.js';
import { applyCollectionBulkEdit, collectionOwnerSuggestions, normalizeCollectionOwnerName, normalizeCollectionTags, summarizeCollectionOwnership, type CollectionBulkEditPatch, type CollectionViewMode } from '../domain/collectionOwnership.js';
import { getWorkMode, type WorkModeId } from '../domain/workModes.js';
import { formatCount } from '../domain/uiText.js';
import { assessDeckLegality } from '../domain/deckLegality.js';
import type { DashboardScope } from '../domain/dashboardFacts.js';
import {
  DECK_STATUS_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  SET_STATUS_OPTIONS,
  countActiveFilters,
  includesAnyFilterText,
  includesFilterText,
  matchesNumberQuery,
  matchesTagFilter
} from '../domain/filterTypes.js';
import { COMMANDER_BRACKET_OPTIONS, DECK_FORMAT_OPTIONS, DECK_PLAY_STYLE_SUGGESTIONS } from '../domain/deckTaxonomy.js';
import { COLOR_IDENTITY_OPTIONS } from '../domain/magicTerms.js';
import { basicLandGroupKey, sortItemsByState, type ListSortOption, type ListSortState } from '../domain/listControls.js';
import {
  CONDITION_OPTIONS,
  FINISH_OPTIONS,
  LANGUAGE_OPTIONS,
  collectionValueEstimateFromEntry,
  imageUrlForMetadata,
  metadataFromCollectionEntry,
  metadataFromDeckCard,
  printLabelForMetadata
} from '../domain/officialCardMetadata.js';
import {
  DEFAULT_OFFICIAL_CARD_FILTERS,
  OFFICIAL_CARD_DETAIL_MODE_OPTIONS,
  OFFICIAL_CARD_SORT_OPTIONS,
  OFFICIAL_CARD_VIEW_MODE_OPTIONS,
  officialCardActiveFilterCount,
  officialCardSearchFiltersFromBrowser,
  officialCardSortOption,
  type OfficialCardActionTarget,
  type OfficialCardBrowserFilters,
  type OfficialCardBrowserViewMode,
  type OfficialCardDetailMode,
  type OfficialCardSortOptionId
} from '../domain/officialCardBrowser.js';
import {
  officialCardSyncCadenceLabel,
  readOfficialCardSyncSettings,
  shouldAutoSyncOfficialCards,
  writeOfficialCardSyncSettings,
  type OfficialCardSyncCadence,
  type OfficialCardSyncSettings
} from '../domain/officialCardSyncSettings.js';
import {
  activeReferenceRuleFilterCount,
  activeReferenceTermFilterCount,
  buildReferenceRuleFilterOptions,
  buildReferenceTermFilterOptions,
  buildReferenceUsageIndex,
  defaultReferenceRuleFilters,
  defaultReferenceTermFilters,
  filterReferenceRules,
  filterReferenceTerms,
  termUsageMatches,
  type ReferenceRuleFilters,
  type ReferenceTermFilters,
  type ReferenceUsageMatch
} from '../domain/referenceFilters.js';
import { Field } from './Field.js';
import { BrowseFilterOverlay } from './filters/BrowseFilterOverlay.js';
import { FilterButton } from './filters/FilterButton.js';
import { FilteredEmptyState } from './filters/FilteredEmptyState.js';
import { AdvancedFiltersButton, GroupedBasicLandToggle, ListControlsBar, ListResultsSummary, SortMenu, StatusPill, type StatusPillTone } from './forge-ui/index.js';
import { Icon, type IconName } from './Icon.js';
import { ImageLightbox } from './ImageLightbox.js';
import { ColorIdentitySymbols, ManaCostSymbols } from './ManaSymbols.js';
import { PanelResizeHandle } from './PanelResizeHandle.js';
import { CollectionEntryViews } from './collections/CollectionEntryViews.js';
import { DeckCoverBadge } from './decks/DeckCoverBadge.js';
import { DeckEntryViews, type DeckViewMode } from './decks/DeckEntryViews.js';
import { SetCardViews, type SetViewMode } from './sets/SetCardViews.js';
import { CollectionBulkEditOverlay } from './overlays/CollectionBulkEditOverlay.js';
import { CollectionCardPreviewOverlay } from './overlays/CollectionCardPreviewOverlay.js';
import { CollectionMetadataOverlay } from './overlays/CollectionMetadataOverlay.js';
import { CollectionPriceToolsOverlay } from './overlays/CollectionPriceToolsOverlay.js';
import { DeckAddCardsOverlay } from './overlays/DeckAddCardsOverlay.js';
import { DeckCardPreviewOverlay } from './overlays/DeckCardPreviewOverlay.js';
import { OverlayShell } from './overlays/OverlayShell.js';
import { ReferenceCreateOverlay } from './overlays/ReferenceCreateOverlay.js';
import { OfficialCardFilterControls } from './reference/OfficialCardFilterControls.js';
import { ReferenceFilterControls } from './reference/ReferenceFilterControls.js';
import { RulesGuide } from './reference/RulesGuide.js';
import { TagEditor } from './TagEditor.js';
import type { ReferenceCatalog, ReferenceCategory, ReferenceRuleEntry, ReferenceRuleKind, ReferenceTerm } from '@homebrew-forge/forge';

interface WorkspaceViewProps {
  section: Exclude<WorkspaceSection, 'maker' | 'cards'>;
  workMode: WorkModeId;
  library: LibraryState | null;
  project: EditorProject | null;
  activeCardId: string;
  referenceCatalog: ReferenceCatalog | null;
  selectedUniverseId: string;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  onResizeLeftPanel: (delta: number) => void;
  onResizeRightPanel: (delta: number) => void;
  onShowLeftPanelChange: (value: boolean) => void;
  onShowRightPanelChange: (value: boolean) => void;
  onCreateDeck: () => void;
  onCreateCollection: (kind?: CollectionKind, listCategory?: CollectionListCategory) => void;
  onCreateSetOverlay: () => void;
  onCreateProject: () => void;
  onCreateLibraryAsset: () => void;
  onLibraryUpdated: (library: LibraryState) => void;
  onProjectLoaded: (project: EditorProject) => void;
  onReferenceCatalogUpdated: (catalog: ReferenceCatalog) => void;
  onUniverseSelect: (universeId: string) => void;
  onLoadSet: (setCode: string) => Promise<void> | void;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onOpenSet: (setCode: string) => Promise<void> | void;
  onOpenCardBrowser: () => void;
  onOpenDashboard: (scope?: DashboardScope) => void;
  onStatus: (message: string) => void;
  saveShortcutToken: number;
  deckRefreshToken: number;
  activeDeckId: string;
  collectionRefreshToken: number;
  activeCollectionId: string;
  showCardsRailItem: boolean;
  onShowCardsRailItemChange: (value: boolean) => void;
  showCollectionsRailItem: boolean;
  onShowCollectionsRailItemChange: (value: boolean) => void;
}

interface LibraryItem {
  id: string;
  name: string;
  detail: string;
  kind: string;
  assetType: string;
  sourceType: string;
  permissionStatus: string;
  assignedCount: number;
  filePath: string;
  sourceUrl: string;
  dataUri?: string;
  cropX: string;
  cropY: string;
  cropW: string;
  cropH: string;
}

const DEFAULT_DECK_FILTERS = {
  status: 'all',
  tag: '',
  playStyle: '',
  format: '',
  colorIdentity: 'all',
  commanderBracket: 'all',
  commander: '',
  linkedUniverseId: 'all',
  linkedSetCode: 'all',
  unresolved: 'all',
  mainCount: '',
  sideCount: '',
  maybeCount: ''
};

const DECK_ROLE_SUGGESTIONS = [
  'Ramp',
  'Mana source',
  'Fixing',
  'Draw',
  'Removal',
  'Board wipe',
  'Stack interaction',
  'Protection',
  'Recursion',
  'Tutor',
  'Finisher',
  'Enabler',
  'Payoff',
  'Synergy',
  'Utility',
  'Threat',
  'Land',
  'Commander',
  'Sideboard tech'
];

const COLLECTION_VIEW_MODE_OPTIONS: Array<{ mode: CollectionViewMode; label: string; icon: IconName }> = [
  { mode: 'table', label: 'Table', icon: 'collections' },
  { mode: 'grid', label: 'Grid', icon: 'grid' },
  { mode: 'list', label: 'List', icon: 'list' },
  { mode: 'single', label: 'Single card', icon: 'single' }
];

type CollectionEntrySortOptionId = 'default' | 'name' | 'set' | 'quantity' | 'owner' | 'condition' | 'finish' | 'language' | 'value' | 'review' | 'source';

const COLLECTION_ENTRY_SORT_OPTIONS: Array<ListSortOption<CollectionEntrySortOptionId>> = [
  { id: 'default', label: 'Import order' },
  { id: 'name', label: 'Name' },
  { id: 'set', label: 'Set / #' },
  { id: 'quantity', label: 'Quantity', defaultDirection: 'desc' },
  { id: 'owner', label: 'Owner' },
  { id: 'condition', label: 'Condition' },
  { id: 'finish', label: 'Finish' },
  { id: 'language', label: 'Language' },
  { id: 'value', label: 'Value', defaultDirection: 'desc' },
  { id: 'review', label: 'Review' },
  { id: 'source', label: 'Source' }
];

const DECK_VIEW_MODE_OPTIONS: Array<{ mode: DeckViewMode; label: string; icon: IconName }> = [
  { mode: 'board', label: 'Board', icon: 'decks' },
  { mode: 'grid', label: 'Grid', icon: 'grid' },
  { mode: 'list', label: 'List', icon: 'list' },
  { mode: 'single', label: 'Single card', icon: 'single' },
  { mode: 'candidates', label: 'Candidates', icon: 'star' },
  { mode: 'roles', label: 'Roles', icon: 'flag' },
  { mode: 'mana', label: 'Mana', icon: 'settings' }
];

type DeckEntrySortOptionId = 'default' | 'name' | 'quantity' | 'mana' | 'color' | 'type' | 'role' | 'status' | 'section' | 'unresolved';

interface DeckEntryFilters {
  section: DeckEntry['section'] | 'all';
  candidateStatus: NonNullable<DeckEntry['candidateStatus']> | 'active' | 'all';
  role: string;
  color: string;
  manaValue: string;
  cardType: string;
  tag: string;
  unresolved: 'all' | 'has' | 'none';
}

const DEFAULT_DECK_ENTRY_FILTERS: DeckEntryFilters = {
  section: 'all',
  candidateStatus: 'all',
  role: '',
  color: 'all',
  manaValue: '',
  cardType: 'all',
  tag: '',
  unresolved: 'all'
};

const DECK_ENTRY_SORT_OPTIONS: Array<ListSortOption<DeckEntrySortOptionId>> = [
  { id: 'default', label: 'Board order' },
  { id: 'name', label: 'Name' },
  { id: 'quantity', label: 'Quantity', defaultDirection: 'desc' },
  { id: 'mana', label: 'Mana value' },
  { id: 'color', label: 'Color' },
  { id: 'type', label: 'Type' },
  { id: 'role', label: 'Role' },
  { id: 'status', label: 'Status' },
  { id: 'section', label: 'Board' },
  { id: 'unresolved', label: 'Unresolved' }
];

const DECK_GROUP_BASICS_STORAGE_KEY = 'homebrew-forge.deck.groupBasics';

function defaultDeckFilters() {
  return {
    ...DEFAULT_DECK_FILTERS,
    linkedUniverseId: 'all'
  };
}

function readDeckGroupBasicsPreference(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.localStorage.getItem(DECK_GROUP_BASICS_STORAGE_KEY) !== 'false';
}

function writeDeckGroupBasicsPreference(value: boolean) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DECK_GROUP_BASICS_STORAGE_KEY, value ? 'true' : 'false');
}

export function WorkspaceView({
  section,
  workMode,
  library,
  project,
  activeCardId,
  referenceCatalog,
  selectedUniverseId,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onCreateDeck,
  onCreateCollection,
  onCreateSetOverlay,
  onCreateProject,
  onCreateLibraryAsset,
  onLibraryUpdated,
  onProjectLoaded,
  onReferenceCatalogUpdated,
  onUniverseSelect,
  onLoadSet,
  onOpenCard,
  onOpenSet,
  onOpenCardBrowser,
  onOpenDashboard,
  onStatus,
  saveShortcutToken,
  deckRefreshToken,
  activeDeckId,
  collectionRefreshToken,
  activeCollectionId,
  showCardsRailItem,
  onShowCardsRailItemChange,
  showCollectionsRailItem,
  onShowCollectionsRailItemChange
}: WorkspaceViewProps) {
  return (
    <section className={`workspace-view ${showLeftPanel ? '' : 'hide-left-panel'} ${showRightPanel ? '' : 'hide-right-panel'}`}>
      {section === 'projects' ? (
        <ProjectsWorkspace
          library={library}
          project={project}
          selectedUniverseId={selectedUniverseId}
          deckRefreshToken={deckRefreshToken}
          collectionRefreshToken={collectionRefreshToken}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onCreateProject={onCreateProject}
          onLibraryUpdated={onLibraryUpdated}
          onUniverseSelect={onUniverseSelect}
          onLoadSet={onLoadSet}
          onOpenCard={onOpenCard}
          onOpenSet={onOpenSet}
          onStatus={onStatus}
          saveShortcutToken={saveShortcutToken}
        />
      ) : section === 'decks' ? (
        <DecksWorkspace
          library={library}
          selectedUniverseId={selectedUniverseId}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onCreateDeck={onCreateDeck}
          onOpenCard={onOpenCard}
          onOpenCardBrowser={onOpenCardBrowser}
          onOpenDashboard={onOpenDashboard}
          onStatus={onStatus}
          saveShortcutToken={saveShortcutToken}
          deckRefreshToken={deckRefreshToken}
          activeDeckId={activeDeckId}
          workMode={workMode}
        />
      ) : section === 'collections' || section === 'binders' || section === 'lists' ? (
        <CollectionsWorkspace
          surface={section === 'binders' ? 'binders' : section === 'lists' ? 'lists' : 'collections'}
          library={library}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onCreateCollection={onCreateCollection}
          onOpenCard={onOpenCard}
          onStatus={onStatus}
          saveShortcutToken={saveShortcutToken}
          collectionRefreshToken={collectionRefreshToken}
          activeCollectionId={activeCollectionId}
          workMode={workMode}
        />
      ) : section === 'sets' ? (
        <SetsWorkspace
          library={library}
          selectedUniverseId={selectedUniverseId}
          project={project}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onCreateSetOverlay={onCreateSetOverlay}
          onLibraryUpdated={onLibraryUpdated}
          onProjectLoaded={onProjectLoaded}
          onLoadSet={onLoadSet}
          onOpenCard={onOpenCard}
          onStatus={onStatus}
          saveShortcutToken={saveShortcutToken}
        />
      ) : section === 'library' ? (
        <LibraryWorkspace
          project={project}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onCreateLibraryAsset={onCreateLibraryAsset}
        />
      ) : section === 'reference' ? (
        <ReferenceWorkspace
          library={library}
          project={project}
          activeCardId={activeCardId}
          selectedUniverseId={selectedUniverseId}
          referenceCatalog={referenceCatalog}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onProjectLoaded={onProjectLoaded}
          onReferenceCatalogUpdated={onReferenceCatalogUpdated}
          onOpenCard={onOpenCard}
          onOpenCardBrowser={onOpenCardBrowser}
          onStatus={onStatus}
        />
      ) : (
        <SettingsWorkspace
          project={project}
          showCardsRailItem={showCardsRailItem}
          onShowCardsRailItemChange={onShowCardsRailItemChange}
          showCollectionsRailItem={showCollectionsRailItem}
          onShowCollectionsRailItemChange={onShowCollectionsRailItemChange}
          onStatus={onStatus}
        />
      )}
    </section>
  );
}

const referenceCategories: Array<{ id: ReferenceCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Terms' },
  { id: 'keyword-ability', label: 'Keyword Abilities' },
  { id: 'ability-word', label: 'Ability Words' },
  { id: 'keyword-action', label: 'Keyword Actions' },
  { id: 'card-type', label: 'Card Types' },
  { id: 'supertype', label: 'Supertypes' },
  { id: 'subtype', label: 'Subtypes' },
  { id: 'token', label: 'Tokens' },
  { id: 'counter', label: 'Counters' },
  { id: 'mana-color', label: 'Mana Colors' },
  { id: 'homebrew', label: 'Homebrew' }
];

type ReferenceMode = 'terms' | 'rules' | 'official-cards';
const REFERENCE_OFFICIAL_PAGE_SIZE = 120;
const REFERENCE_OFFICIAL_VARIANT_PAGE_SIZE = 120;

const referenceModes: Array<{ id: ReferenceMode; label: string }> = [
  { id: 'terms', label: 'Terms' },
  { id: 'rules', label: 'Rules' },
  { id: 'official-cards', label: 'Cards' }
];

type ReferenceTermSort = 'auto' | 'name-asc' | 'name-desc' | 'category-asc' | 'source-asc' | 'status-asc' | 'workflow-asc';
type ReferenceRuleSort = 'auto' | 'number-asc' | 'number-desc' | 'title-asc' | 'kind-asc' | 'effective-desc' | 'effective-asc';

const referenceTermSortOptions: Array<{ id: ReferenceTermSort; label: string }> = [
  { id: 'auto', label: 'Best match' },
  { id: 'name-asc', label: 'Name A-Z' },
  { id: 'name-desc', label: 'Name Z-A' },
  { id: 'category-asc', label: 'Category' },
  { id: 'source-asc', label: 'Source' },
  { id: 'status-asc', label: 'Status' },
  { id: 'workflow-asc', label: 'Workflow' }
];

const referenceRuleSortOptions: Array<{ id: ReferenceRuleSort; label: string }> = [
  { id: 'auto', label: 'Best match' },
  { id: 'number-asc', label: 'Rule number' },
  { id: 'number-desc', label: 'Rule number desc' },
  { id: 'title-asc', label: 'Title A-Z' },
  { id: 'kind-asc', label: 'Kind' },
  { id: 'effective-desc', label: 'Effective newest' },
  { id: 'effective-asc', label: 'Effective oldest' }
];

const ruleKinds: Array<{ id: ReferenceRuleKind | 'all'; label: string }> = [
  { id: 'all', label: 'All Rules' },
  { id: 'section', label: 'Rule Sections' },
  { id: 'keyword-action', label: 'Keyword Actions' },
  { id: 'keyword-ability', label: 'Keyword Abilities' },
  { id: 'predefined-token', label: 'Predefined Tokens' },
  { id: 'counter-rule', label: 'Counter Rules' },
  { id: 'glossary', label: 'Glossary' }
];

function CollectionsWorkspace({
  surface,
  library,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onCreateCollection,
  onOpenCard,
  onStatus,
  saveShortcutToken,
  collectionRefreshToken,
  activeCollectionId,
  workMode
}: Pick<
  WorkspaceViewProps,
  | 'library'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onCreateCollection'
  | 'onOpenCard'
  | 'onStatus'
  | 'saveShortcutToken'
  | 'collectionRefreshToken'
  | 'activeCollectionId'
  | 'workMode'
> & {
  surface: CollectionSurfaceKind;
}) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [query, setQuery] = useState('');
  const [entryQuery, setEntryQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs_review' | 'matched'>('all');
  const [purposeFilter, setPurposeFilter] = useState<CollectionPurpose | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState<CollectionKind | 'all'>(() => collectionKindForSurface(surface));
  const [listCategoryFilter, setListCategoryFilter] = useState<CollectionListCategory | 'all'>('all');
  const [matchStrategyFilter, setMatchStrategyFilter] = useState('all');
  const [ownershipStatusFilter, setOwnershipStatusFilter] = useState<CollectionOwnershipStatus | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [markerFilter, setMarkerFilter] = useState('all');
  const [purchaseValueFilter, setPurchaseValueFilter] = useState('all');
  const [marketValueFilter, setMarketValueFilter] = useState('all');
  const [finishFilter, setFinishFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(() => new Set());
  const [collectionViewMode, setCollectionViewMode] = useState<CollectionViewMode>('table');
  const [collectionEntrySortState, setCollectionEntrySortState] = useState<ListSortState<CollectionEntrySortOptionId>>({ option: 'default', direction: 'asc' });
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [previewEntryId, setPreviewEntryId] = useState('');
  const [expandedImageEntryId, setExpandedImageEntryId] = useState('');
  const [metadataOverlayOpen, setMetadataOverlayOpen] = useState(false);
  const [priceToolsOpen, setPriceToolsOpen] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [collectionDirty, setCollectionDirty] = useState(false);
  const activeCollectionFilterCount = countActiveFilters([
    { value: projectFilter, defaultValue: 'all' },
    { value: purposeFilter, defaultValue: 'all' },
    { value: kindFilter, defaultValue: collectionKindForSurface(surface) },
    { value: listCategoryFilter, defaultValue: 'all' },
    { value: sourceFilter, defaultValue: 'all' },
    { value: reviewFilter, defaultValue: 'all' },
    { value: matchStrategyFilter, defaultValue: 'all' },
    { value: ownershipStatusFilter, defaultValue: 'all' },
    { value: ownerFilter, defaultValue: '' },
    { value: tagFilter, defaultValue: '' },
    { value: markerFilter, defaultValue: 'all' },
    { value: purchaseValueFilter, defaultValue: 'all' },
    { value: marketValueFilter, defaultValue: 'all' },
    { value: finishFilter, defaultValue: '' },
    { value: conditionFilter, defaultValue: '' },
    { value: languageFilter, defaultValue: '' }
  ]);
  const ownerSuggestions = useMemo(
    () => collectionOwnerSuggestions(collections.flatMap((candidate) => candidate.ownerNames ?? []), collection?.entries.map((entry) => entry.ownerName)),
    [collection?.entries, collections]
  );

  useEffect(() => {
    void loadCollections(activeCollectionId || undefined);
  }, [collectionRefreshToken, surface]);

  useEffect(() => {
    setKindFilter(collectionKindForSurface(surface));
  }, [surface]);

  useEffect(() => {
    if (!saveShortcutToken) {
      return;
    }
    if (!collection) {
      onStatus('No collection is selected to save.');
      return;
    }
    if (savingCollection) {
      onStatus('Collection save is already in progress.');
      return;
    }
    if (!collectionDirty) {
      onStatus('No collection changes to save.');
      return;
    }
    void handleSaveCollection();
  }, [saveShortcutToken]);

  async function loadCollections(nextCollectionId?: string) {
    try {
      const loaded = await fetchCollections();
      setCollections(loaded);
      const visibleLoaded = loaded.filter((candidate) => matchesCollectionSurface(candidate, surface));
      const requested = nextCollectionId ? loaded.find((candidate) => candidate.collectionId === nextCollectionId && matchesCollectionSurface(candidate, surface)) : undefined;
      const current = collection ? loaded.find((candidate) => candidate.collectionId === collection.metadata.collectionId && matchesCollectionSurface(candidate, surface)) : undefined;
      const targetId = requested?.collectionId ?? current?.collectionId ?? visibleLoaded[0]?.collectionId;
      if (targetId) {
        const nextCollection = await fetchCollection(targetId);
        setCollection(nextCollection);
        setSelectedEntryId(nextCollection.entries[0]?.entryId ?? '');
        setSelectedEntryIds(new Set());
        setPreviewEntryId('');
        setExpandedImageEntryId('');
        setCollectionDirty(false);
      } else {
        setCollection(null);
        setSelectedEntryId('');
        setSelectedEntryIds(new Set());
        setPreviewEntryId('');
        setExpandedImageEntryId('');
        setCollectionDirty(false);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectCollection(collectionId: string) {
    try {
      const nextCollection = await fetchCollection(collectionId);
      setCollection(nextCollection);
      setSelectedEntryId(nextCollection.entries[0]?.entryId ?? '');
      setSelectedEntryIds(new Set());
      setPreviewEntryId('');
      setExpandedImageEntryId('');
      setCollectionDirty(false);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveCollection() {
    if (!collection) {
      return;
    }
    setSavingCollection(true);
    try {
      const result = await saveCollection(collection);
      setCollections(result.collections);
      setCollection(result.collection);
      setSelectedEntryId((current) => result.collection.entries.find((entry) => entry.entryId === current)?.entryId ?? result.collection.entries[0]?.entryId ?? '');
      setCollectionDirty(false);
      onStatus(`Saved collection ${result.collection.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setSavingCollection(false);
    }
  }

  function updateCollection(next: CollectionState) {
    setCollection(next);
    setCollectionDirty(true);
  }

  function updateCollectionMetadata(next: CollectionState['metadata']) {
    if (!collection) {
      return;
    }
    updateCollection({ ...collection, metadata: next });
  }

  function replaceCollectionFromServer(nextCollections: CollectionSummary[], nextCollection: CollectionState) {
    setCollections(nextCollections);
    setCollection(nextCollection);
    setSelectedEntryId((current) => nextCollection.entries.find((entry) => entry.entryId === current)?.entryId ?? nextCollection.entries[0]?.entryId ?? '');
    setSelectedEntryIds((current) => new Set([...current].filter((entryId) => nextCollection.entries.some((entry) => entry.entryId === entryId))));
    setCollectionDirty(false);
  }

  function updateCollectionEntry(entryId: string, patch: Partial<CollectionEntry>) {
    if (!collection) {
      return;
    }
    updateCollection({
      ...collection,
      entries: collection.entries.map((entry) =>
        entry.entryId === entryId
          ? {
              ...entry,
              ...patch,
              quantity: Math.max(1, Number(patch.quantity ?? entry.quantity) || 1)
            }
          : entry
      )
    });
  }

  function toggleEntrySelection(entryId: string) {
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }

  function selectFilteredEntries() {
    setSelectedEntryIds(new Set(sortedEntries.map((entry) => entry.entryId)));
  }

  function selectAllEntries() {
    setSelectedEntryIds(new Set((collection?.entries ?? []).map((entry) => entry.entryId)));
  }

  function clearSelectedEntries() {
    setSelectedEntryIds(new Set());
  }

  function applyBulkEdit(patch: CollectionBulkEditPatch) {
    if (!collection || selectedEntryIds.size === 0) {
      return;
    }
    const selectedIds = new Set(selectedEntryIds);
    updateCollection({
      ...collection,
      entries: collection.entries.map((entry) => (selectedIds.has(entry.entryId) ? applyCollectionBulkEdit(entry, patch) : entry))
    });
    setBulkEditOpen(false);
    onStatus(`Updated ${selectedIds.size} selected collection ${selectedIds.size === 1 ? 'row' : 'rows'}.`);
  }

  function markSelectedForDeletion() {
    if (!collection || selectedEntryIds.size === 0) {
      return;
    }
    const selectedIds = new Set(selectedEntryIds);
    updateCollection({
      ...collection,
      entries: collection.entries.map((entry) => (selectedIds.has(entry.entryId) ? { ...entry, markedForDeletion: true } : entry))
    });
    onStatus(`Marked ${selectedIds.size} selected ${selectedIds.size === 1 ? 'row' : 'rows'} for deletion.`);
  }

  function deleteSelectedEntries() {
    if (!collection || selectedEntryIds.size === 0) {
      return;
    }
    const selectedIds = new Set(selectedEntryIds);
    if (!window.confirm(`Permanently delete ${selectedIds.size} selected collection ${selectedIds.size === 1 ? 'row' : 'rows'}?`)) {
      return;
    }
    const nextEntries = collection.entries.filter((entry) => !selectedIds.has(entry.entryId));
    updateCollection({ ...collection, entries: nextEntries });
    setSelectedEntryIds(new Set());
    setSelectedEntryId((current) => nextEntries.find((entry) => entry.entryId === current)?.entryId ?? nextEntries[0]?.entryId ?? '');
    onStatus(`Deleted ${selectedIds.size} collection ${selectedIds.size === 1 ? 'row' : 'rows'}. Save the collection to persist this change.`);
  }

  function deleteCollectionEntry(entryId: string) {
    if (!collection) {
      return;
    }
    const entry = collection.entries.find((candidate) => candidate.entryId === entryId);
    if (!entry || !window.confirm(`Permanently delete ${entry.cardName} from this collection?`)) {
      return;
    }
    const nextEntries = collection.entries.filter((candidate) => candidate.entryId !== entryId);
    updateCollection({ ...collection, entries: nextEntries });
    setSelectedEntryIds((current) => {
      const next = new Set(current);
      next.delete(entryId);
      return next;
    });
    setSelectedEntryId((current) => current === entryId ? nextEntries[0]?.entryId ?? '' : current);
    onStatus(`Deleted ${entry.cardName}. Save the collection to persist this change.`);
  }

  function resetCollectionFilters() {
    setProjectFilter('all');
    setPurposeFilter('all');
    setKindFilter(collectionKindForSurface(surface));
    setListCategoryFilter('all');
    setSourceFilter('all');
    setReviewFilter('all');
    setMatchStrategyFilter('all');
    setOwnershipStatusFilter('all');
    setOwnerFilter('');
    setTagFilter('');
    setMarkerFilter('all');
    setPurchaseValueFilter('all');
    setMarketValueFilter('all');
    setFinishFilter('');
    setConditionFilter('');
    setLanguageFilter('');
  }

  const filteredCollections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return collections.filter((candidate) => {
      const matchesQuery = !needle || `${candidate.name} ${candidate.description ?? ''} ${candidate.source} ${candidate.purpose} ${(candidate.ownerNames ?? []).join(' ')}`.toLowerCase().includes(needle);
      const matchesOwner = includesAnyFilterText(candidate.ownerNames ?? [], ownerFilter);
      const matchesSurface = matchesCollectionSurface(candidate, surface);
      const matchesKind = kindFilter === 'all' || candidate.kind === kindFilter;
      const matchesListCategory = listCategoryFilter === 'all' || candidate.listCategory === listCategoryFilter;
      const matchesPurpose = purposeFilter === 'all' || candidate.purpose === purposeFilter;
      const matchesProject = projectFilter === 'all' || candidate.linkedUniverseId === projectFilter;
      const matchesSource = sourceFilter === 'all' || candidate.source === sourceFilter;
      return matchesSurface && matchesKind && matchesListCategory && matchesQuery && matchesOwner && matchesPurpose && matchesProject && matchesSource;
    });
  }, [collections, kindFilter, listCategoryFilter, ownerFilter, projectFilter, purposeFilter, query, sourceFilter, surface]);

  const filteredEntries = useMemo(() => {
    const needle = entryQuery.trim().toLowerCase();
    return (collection?.entries ?? []).filter((entry) => {
      const matchesStatus = reviewFilter === 'all' || entry.reviewStatus === reviewFilter;
      const matchesStrategy = matchStrategyFilter === 'all' || entry.matchStrategy === matchStrategyFilter;
      const matchesOwnershipStatus = ownershipStatusFilter === 'all' || entry.ownershipStatus === ownershipStatusFilter;
      const matchesOwner = includesFilterText(entry.ownerName, ownerFilter);
      const matchesTags = matchesTagFilter(entry.tags, tagFilter);
      const matchesMarker = collectionEntryMatchesMarker(entry, markerFilter);
      const matchesPurchaseValue = collectionEntryMatchesValueState(entry.purchasePrice, purchaseValueFilter);
      const matchesMarketValue = collectionEntryMatchesValueState(collectionValueEstimateFromEntry(entry)?.amount, marketValueFilter);
      const matchesFinish = includesFilterText(entry.finish, finishFilter);
      const matchesCondition = includesFilterText(entry.condition, conditionFilter);
      const matchesLanguage = includesFilterText(entry.language, languageFilter);
      const matchesQuery = !needle || `${entry.cardName} ${entry.ownerName} ${entry.ownershipStatus} ${entry.setCode ?? ''} ${entry.collectorNumber ?? ''} ${entry.finish ?? ''} ${entry.condition ?? ''} ${entry.language ?? ''} ${entry.location ?? ''} ${entry.source} ${(entry.tags ?? []).join(' ')} ${entry.reviewNotes ?? ''} ${entry.notes ?? ''}`.toLowerCase().includes(needle);
      return matchesStatus && matchesStrategy && matchesOwnershipStatus && matchesOwner && matchesTags && matchesMarker && matchesPurchaseValue && matchesMarketValue && matchesFinish && matchesCondition && matchesLanguage && matchesQuery;
    });
  }, [collection?.entries, conditionFilter, entryQuery, finishFilter, languageFilter, markerFilter, marketValueFilter, matchStrategyFilter, ownerFilter, ownershipStatusFilter, purchaseValueFilter, reviewFilter, tagFilter]);
  const sortedEntries = useMemo(
    () =>
      sortItemsByState(
        filteredEntries,
        collectionEntrySortState,
        {
          default: (entry) => collection?.entries.findIndex((candidate) => candidate.entryId === entry.entryId) ?? 0,
          name: (entry) => entry.cardName,
          set: (entry) => `${entry.setCode ?? ''}:${entry.collectorNumber ?? ''}`,
          quantity: (entry) => entry.quantity,
          owner: (entry) => entry.ownerName,
          condition: (entry) => entry.condition,
          finish: (entry) => entry.finish,
          language: (entry) => entry.language,
          value: (entry) => collectionValueEstimateFromEntry(entry)?.amount,
          review: (entry) => entry.reviewStatus,
          source: (entry) => entry.source
        },
        (entry) => entry.cardName
      ),
    [collection?.entries, collectionEntrySortState, filteredEntries]
  );
  const filteredEntryIds = sortedEntries.map((entry) => entry.entryId);
  const allFilteredSelected = filteredEntryIds.length > 0 && filteredEntryIds.every((entryId) => selectedEntryIds.has(entryId));
  const selectedEntries = (collection?.entries ?? []).filter((entry) => selectedEntryIds.has(entry.entryId));
  const selectedEntry = collection?.entries.find((entry) => entry.entryId === selectedEntryId) ?? sortedEntries[0] ?? collection?.entries[0];
  const previewEntry = collection?.entries.find((entry) => entry.entryId === previewEntryId);
  const expandedImageEntry = collection?.entries.find((entry) => entry.entryId === expandedImageEntryId);
  const expandedImageSrc = expandedImageEntry ? imageUrlForMetadata(metadataFromCollectionEntry(expandedImageEntry), 'large') : '';
  const collectionMetrics = useMemo(() => summarizeCollectionOwnership(collection), [collection]);
  const collectionStatItems = useMemo(() => {
    const items: Array<{ label: string; value: ReactNode; note?: string; icon?: IconName }> = [
      { label: 'Entries', value: collection?.entries.length ?? 0, icon: 'collections' },
      { label: collection?.metadata.kind === 'list' ? 'References' : 'Cards', value: collectionMetrics.totalCards, icon: collection?.metadata.kind === 'list' ? 'lists' : 'cards' }
    ];
    if (collectionMetrics.reviewCopies > 0) {
      items.push({ label: 'Review', value: collectionMetrics.reviewCopies, icon: 'flag' });
    }
    const signalCopies = collectionMetrics.starredCopies + collectionMetrics.flaggedCopies + collectionMetrics.deletionCopies;
    if (signalCopies > 0) {
      items.push({
        label: 'Signals',
        value: signalCopies,
        note: [
          collectionMetrics.starredCopies ? `${collectionMetrics.starredCopies} starred` : '',
          collectionMetrics.flaggedCopies ? `${collectionMetrics.flaggedCopies} flagged` : '',
          collectionMetrics.deletionCopies ? `${collectionMetrics.deletionCopies} delete` : ''
        ].filter(Boolean).join(' / '),
        icon: 'star'
      });
    }
    const printSignals = collectionMetrics.duplicateCopies + collectionMetrics.premiumCopies + collectionMetrics.knownConditionCopies;
    if (printSignals > 0) {
      items.push({
        label: 'Print data',
        value: printSignals,
        note: [
          collectionMetrics.duplicateCopies ? `${collectionMetrics.duplicateCopies} duplicate` : '',
          collectionMetrics.premiumCopies ? `${collectionMetrics.premiumCopies} premium` : '',
          collectionMetrics.knownConditionCopies ? `${collectionMetrics.knownConditionCopies} condition` : ''
        ].filter(Boolean).join(' / '),
        icon: 'grid'
      });
    }
    if (collectionMetrics.valueSourceRows > 0 || collectionMetrics.purchaseRows > 0 || collectionMetrics.gainLoss !== null) {
      items.push({
        label: 'Value',
        value: collectionMetrics.valueSourceRows > 0 ? formatMoney(collectionMetrics.estimatedValue, collectionMetrics.valueCurrency) : formatMoney(collectionMetrics.purchaseTotal, collectionMetrics.purchaseCurrency),
        note: [
          collectionMetrics.valueSourceRows > 0 ? `${formatCount(collectionMetrics.valueSourceRows, 'priced row')}` : '',
          collectionMetrics.purchaseRows > 0 ? `${formatMoney(collectionMetrics.purchaseTotal, collectionMetrics.purchaseCurrency)} paid` : '',
          collectionMetrics.gainLoss !== null ? `${formatMoney(collectionMetrics.gainLoss, collectionMetrics.valueCurrency)} gain/loss` : ''
        ].filter(Boolean).join(' / '),
        icon: 'view'
      });
    }
    return items;
  }, [collection?.entries.length, collection?.metadata.kind, collectionMetrics]);
  const surfaceTitle = surfaceLabel(surface);
  const surfaceSingular = surfaceSingularLabel(surface);
  const newKind = surface === 'lists' ? 'list' : 'binder';

  return (
    <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title={surfaceTitle}
          subtitle={`${filteredCollections.length} of ${collections.filter((candidate) => matchesCollectionSurface(candidate, surface)).length} ${surfaceTitle.toLowerCase()}`}
          newLabel={`New ${surfaceSingular.toLowerCase()}`}
          activeFilterCount={activeCollectionFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={() => onCreateCollection(newKind, surface === 'lists' ? 'general' : 'general')}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder={`Search ${surfaceTitle.toLowerCase()}...`} onChange={(event) => setQuery(event.target.value)} />
            </label>
          }
        >
          <div className="entity-list">
            {filteredCollections.map((candidate) => (
              <button
                key={candidate.collectionId}
                type="button"
                className={`entity-row clickable ${candidate.collectionId === collection?.metadata.collectionId ? 'selected' : ''}`}
                onClick={() => void handleSelectCollection(candidate.collectionId)}
              >
                <Icon name={candidate.kind === 'list' ? 'lists' : 'binders'} />
                <span>
                  <strong>{candidate.name}</strong>
                  <small className="entity-row-source-line">
                    <StatusPill tone={candidate.reviewCount ? 'warning' : 'info'} className="workspace-source-pill">
                      {candidate.reviewCount ? 'Review' : candidate.kind === 'list' ? listCategoryLabel(candidate.listCategory) : 'Binder'}
                    </StatusPill>
                    <span>
                      {formatCount(candidate.cardCount, 'card')} - {candidate.kind === 'list' ? listCategoryLabel(candidate.listCategory) : purposeLabel(candidate.purpose)}
                      {candidate.reviewCount ? ` - ${formatCount(candidate.reviewCount, 'review')}` : ''}
                    </span>
                  </small>
                </span>
              </button>
            ))}
          </div>
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize collections list panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show collections panel" aria-label="Show collections panel">
          <Icon name="collapseRight" />
        </button>
      ) : null}

      <section className="workspace-canvas">
        {collection ? (
          <div className="collection-workspace">
            <div className="visual-management-header">
              <div>
                <h2>{collection.metadata.name}</h2>
                <p>{formatCount(collection.entries.reduce((total, entry) => total + entry.quantity, 0), collection.metadata.kind === 'list' ? 'card reference' : 'physical card')}</p>
              </div>
              <div className="export-actions">
                <button type="button" className="primary-button" disabled={savingCollection || !collectionDirty} onClick={() => void handleSaveCollection()}>
                  {savingCollection ? 'Saving...' : `Save ${surfaceSingular.toLowerCase()}`}
                </button>
                <button type="button" className="secondary-button" onClick={() => setMetadataOverlayOpen(true)}>
                  Edit {surfaceSingular.toLowerCase()}
                </button>
                <button type="button" className="secondary-button" disabled={collectionDirty || savingCollection} title={collectionDirty ? 'Save collection changes before refreshing prices.' : 'Refresh or import collection price snapshots'} onClick={() => setPriceToolsOpen(true)}>
                  Prices
                </button>
              </div>
            </div>

            <WorkModeNote mode={workMode} section={surface === 'collections' ? 'collections' : surface} />

            <div className="collection-stat-grid">
              {collectionStatItems.map((item) => (
                <CollectionStat key={item.label} label={item.label} value={item.value} note={item.note} icon={item.icon} />
              ))}
            </div>

            <div className="collection-table-toolbar">
              <ListControlsBar
                searchLabel={`Search ${surfaceTitle} rows`}
                searchValue={entryQuery}
                searchPlaceholder="Search cards..."
                onSearchChange={setEntryQuery}
                sortControl={<SortMenu options={COLLECTION_ENTRY_SORT_OPTIONS} state={collectionEntrySortState} onChange={setCollectionEntrySortState} />}
                filterControl={<AdvancedFiltersButton activeCount={activeCollectionFilterCount} onClick={() => setFiltersOpen(true)} />}
                resetControl={entryQuery.trim() || activeCollectionFilterCount ? <button type="button" className="secondary-button compact" onClick={() => { setEntryQuery(''); resetCollectionFilters(); }}>Reset</button> : null}
                results={<ListResultsSummary shown={sortedEntries.length} total={collection.entries.length} label="row" />}
                viewControl={
                  <div className="segmented-control collection-view-mode segmented-icon-control" role="group" aria-label={`${surfaceTitle} view mode`}>
                    {COLLECTION_VIEW_MODE_OPTIONS.map(({ mode, label, icon }) => (
                      <button key={mode} type="button" className={collectionViewMode === mode ? 'active' : ''} title={`${label} view`} aria-label={`${label} view`} onClick={() => setCollectionViewMode(mode)}>
                        <Icon name={icon} />
                      </button>
                    ))}
                  </div>
                }
              />
            </div>

            <div className={`collection-selection-toolbar ${selectedEntryIds.size ? 'has-selection' : 'is-idle'}`}>
              <label className="checkbox-row">
                <input type="checkbox" checked={allFilteredSelected} disabled={!sortedEntries.length} onChange={(event) => event.target.checked ? selectFilteredEntries() : clearSelectedEntries()} />
                <span>{selectedEntryIds.size ? `${formatCount(selectedEntryIds.size, 'row')} selected` : 'No rows selected'}</span>
              </label>
              <button type="button" className="secondary-button" disabled={!sortedEntries.length} onClick={selectFilteredEntries}>Select shown</button>
              <button type="button" className="secondary-button" disabled={!collection.entries.length} onClick={selectAllEntries}>Select all</button>
              {selectedEntryIds.size ? (
                <>
                  <button type="button" className="secondary-button compact" onClick={clearSelectedEntries}>Clear</button>
                  <button type="button" className="primary-button compact" onClick={() => setBulkEditOpen(true)}>Bulk edit</button>
                  <button type="button" className="secondary-button compact" onClick={markSelectedForDeletion}>
                    <Icon name="trash" />
                    <span>Mark</span>
                  </button>
                  <button type="button" className="danger-button compact" onClick={deleteSelectedEntries} title="Delete selected rows" aria-label="Delete selected rows">
                    <Icon name="trash" />
                  </button>
                </>
              ) : null}
            </div>

            <div className="collection-entry-surface">
              {collectionViewMode === 'table' ? (
                <div className="collection-table" role="table" aria-label="Collection entries">
                  <div className="collection-table-row header" role="row">
                    <span className="collection-select-cell">Select</span>
                    <span className="collection-qty-cell">Qty</span>
                    <span className="collection-card-cell">Card</span>
                    <span className="collection-print-cell">Print</span>
                    <span className="collection-state-cell">State</span>
                    <span className="collection-value-cell">Value</span>
                    <span className="collection-status-cell">Status</span>
                    <span className="collection-view-cell">View</span>
                  </div>
                  {sortedEntries.map((entry) => {
                    const cardMetadata = metadataFromCollectionEntry(entry);
                    return (
                      <div
                        key={entry.entryId}
                        className={`collection-table-row ${entry.reviewStatus === 'needs_review' ? 'needs-review' : ''} ${entry.markedForDeletion ? 'marked-delete' : ''} ${!isOwnedStatus(entry.ownershipStatus) ? 'not-owned' : ''} ${entry.entryId === selectedEntry?.entryId ? 'selected' : ''}`}
                        role="row"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedEntryId(entry.entryId);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedEntryId(entry.entryId);
                          }
                        }}
                      >
                        <span className="collection-select-cell">
                          <input
                            type="checkbox"
                            checked={selectedEntryIds.has(entry.entryId)}
                            aria-label={`Select ${entry.cardName}`}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleEntrySelection(entry.entryId)}
                          />
                        </span>
                        <span className="collection-qty-cell">{entry.quantity}</span>
                        <span className="collection-card-cell">
                          <CollectionArtThumb metadata={cardMetadata} fallback={entry.cardName} />
                          <span>
                            <strong>{entry.cardName}</strong>
                            <small>{cardMetadata.typeLine || entry.reviewNotes || 'No official type line recorded'}</small>
                          </span>
                        </span>
                        <span className="collection-print-cell">{collectionPrintLabel(entry)}</span>
                        <span className="collection-state-cell">
                          <strong>{entry.ownerName}</strong>
                          <small>{[!isOwnedStatus(entry.ownershipStatus) ? ownershipStatusLabel(entry.ownershipStatus) : entry.finish, isOwnedStatus(entry.ownershipStatus) ? entry.condition : entry.finish, entry.starred ? 'Starred' : '', entry.flagged ? 'Flagged' : '', entry.markedForDeletion ? 'Delete review' : ''].filter(Boolean).join(' - ') || '-'}</small>
                        </span>
                        <span className="collection-value-cell">{formatCollectionEntryValue(entry)}</span>
                        <span className="collection-status-cell">
                          <CollectionStatusPill status={entry.reviewStatus} />
                        </span>
                        <span className="collection-view-cell row-action-cell">
                          <button
                            type="button"
                            className="icon-button"
                            title={`Preview and link ${entry.cardName}`}
                            aria-label={`Preview and link ${entry.cardName}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedEntryId(entry.entryId);
                              setPreviewEntryId(entry.entryId);
                            }}
                          >
                            <Icon name="view" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                  {sortedEntries.length === 0 ? <p className="workspace-copy">No collection rows match the current filter.</p> : null}
                </div>
              ) : (
                <CollectionEntryViews
                  mode={collectionViewMode}
                  entries={sortedEntries}
                  selectedEntry={selectedEntry}
                  selectedEntryIds={selectedEntryIds}
                  onSelect={setSelectedEntryId}
                  onToggleSelection={toggleEntrySelection}
                  onPreview={(entryId) => {
                    setSelectedEntryId(entryId);
                    setPreviewEntryId(entryId);
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="workspace-preview-hero">
            <div className="tile-art-placeholder large collection-empty-mark">
              <Icon name={surface === 'lists' ? 'lists' : surface === 'binders' ? 'binders' : 'collections'} />
            </div>
            <div>
              <h2>No {surfaceSingular.toLowerCase()} selected</h2>
              <p>Create a {surfaceSingular.toLowerCase()} from the plus button, or adjust the filters if one is hidden.</p>
            </div>
          </div>
        )}
      </section>

      {showRightPanel ? <PanelResizeHandle label="Resize collection details panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
        <aside className="workspace-inspector-panel">
          <WorkspacePanelToolbar label="Hide collection details panel" icon="collapseLeft" onClick={() => onShowRightPanelChange(false)} />
          <CollectionDetailsPanel
            collection={collection}
            entry={selectedEntry}
            library={library}
            ownerSuggestions={ownerSuggestions}
            dirty={collectionDirty}
            saving={savingCollection}
            onUpdateEntry={(patch) => selectedEntry ? updateCollectionEntry(selectedEntry.entryId, patch) : undefined}
            onExpandImage={selectedEntry ? () => setExpandedImageEntryId(selectedEntry.entryId) : undefined}
            onDeleteEntry={selectedEntry ? () => deleteCollectionEntry(selectedEntry.entryId) : undefined}
            onSave={() => void handleSaveCollection()}
          />
        </aside>
      ) : (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show collection details" aria-label="Show collection details">
          <Icon name="collapseLeft" />
        </button>
      )}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title={`Browse ${surfaceTitle}`}
          subtitle={`Filter ${surfaceTitle.toLowerCase()} and rows in the selected ${surfaceSingular.toLowerCase()} without hiding search.`}
          resultsLabel={`${filteredCollections.length} matching ${surfaceTitle.toLowerCase()}`}
          activeFilterCount={activeCollectionFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={resetCollectionFilters}
          results={
            <div className="filter-result-list">
              {filteredCollections.length ? (
                filteredCollections.map((candidate) => (
                  <button key={candidate.collectionId} type="button" className={`entity-row clickable ${candidate.collectionId === collection?.metadata.collectionId ? 'selected' : ''}`} onClick={() => { void handleSelectCollection(candidate.collectionId); setFiltersOpen(false); }}>
                    <Icon name={candidate.kind === 'list' ? 'lists' : 'binders'} />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{formatCount(candidate.cardCount, 'card')} - {candidate.kind === 'list' ? listCategoryLabel(candidate.listCategory) : purposeLabel(candidate.purpose)}</small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState title="No collections match" detail="Reset filters or clear the collection search." showClearSearch={Boolean(query.trim())} showResetFilters={activeCollectionFilterCount > 0} onClearSearch={() => setQuery('')} onResetFilters={resetCollectionFilters} />
              )}
            </div>
          }
        >
          <div className="filter-panel">
            <label className="filter-field">
              <span>Kind</span>
              <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as CollectionKind | 'all')}>
                <option value="all">All kinds</option>
                <option value="binder">Binders</option>
                <option value="list">Lists</option>
              </select>
            </label>
            <label className="filter-field">
              <span>List category</span>
              <select value={listCategoryFilter} disabled={kindFilter === 'binder'} onChange={(event) => setListCategoryFilter(event.target.value as CollectionListCategory | 'all')}>
                <option value="all">All list categories</option>
                <option value="general">General</option>
                <option value="wishlist">Wish list</option>
                <option value="recommendation">Recommendations</option>
                <option value="starred">Starred</option>
                <option value="flagged">Flagged</option>
                <option value="gift">Gift list</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Project</span>
              <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
                <option value="all">All projects</option>
                {(library?.universes ?? []).map((universe) => (
                  <option key={universe.id} value={universe.id}>{universe.name}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Purpose</span>
              <select value={purposeFilter} onChange={(event) => setPurposeFilter(event.target.value as CollectionPurpose | 'all')}>
                <option value="all">All purposes</option>
                <option value="owned">Owned</option>
                <option value="inspiration">Inspiration</option>
                <option value="homebrew_print_run">Homebrew print run</option>
                <option value="research">Research</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Source</span>
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                <option value="all">All sources</option>
                <option value="manabox">ManaBox</option>
                <option value="tcgplayer">TCGplayer</option>
                <option value="dragonshield">Dragon Shield</option>
                <option value="delver">Delver Lens</option>
                <option value="scryfall">Scryfall</option>
                <option value="generic">Generic</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Row status</span>
              <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as 'all' | 'needs_review' | 'matched')}>
                <option value="all">All rows</option>
                <option value="needs_review">Needs review</option>
                <option value="matched">Matched</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Match strategy</span>
              <select value={matchStrategyFilter} onChange={(event) => setMatchStrategyFilter(event.target.value)}>
                <option value="all">All strategies</option>
                <option value="scryfall_id">Scryfall ID</option>
                <option value="set_number">Set and number</option>
                <option value="set_name">Set and name</option>
                <option value="unresolved">Unresolved</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Owner</span>
              <input list="collection-owner-filter-options" value={ownerFilter} placeholder="Kyle, Eleni..." onChange={(event) => setOwnerFilter(event.target.value)} />
              <datalist id="collection-owner-filter-options">
                {ownerSuggestions.map((owner) => (
                  <option key={owner} value={owner} />
                ))}
              </datalist>
            </label>
            <label className="filter-field">
              <span>Ownership status</span>
              <select value={ownershipStatusFilter} onChange={(event) => setOwnershipStatusFilter(event.target.value as CollectionOwnershipStatus | 'all')}>
                <option value="all">Any ownership status</option>
                <option value="owned">Owned</option>
                <option value="wanted">Wanted</option>
                <option value="recommended">Recommended</option>
                <option value="reference">Reference</option>
                <option value="proxy">Proxy</option>
                <option value="homebrew_unprinted">Homebrew unprinted</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Tags</span>
              <input value={tagFilter} placeholder="trade, commander..." onChange={(event) => setTagFilter(event.target.value)} />
            </label>
            <label className="filter-field">
              <span>Markers</span>
              <select value={markerFilter} onChange={(event) => setMarkerFilter(event.target.value)}>
                <option value="all">Any marker</option>
                <option value="starred">Starred</option>
                <option value="flagged">Flagged</option>
                <option value="altered">Altered</option>
                <option value="misprint">Misprint</option>
                <option value="proxy">Proxy</option>
                <option value="homebrew">Homebrew</option>
                <option value="marked_for_deletion">Marked for deletion</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Purchase data</span>
              <select value={purchaseValueFilter} onChange={(event) => setPurchaseValueFilter(event.target.value)}>
                <option value="all">Any purchase data</option>
                <option value="has">Has purchase price</option>
                <option value="missing">Missing purchase price</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Market value</span>
              <select value={marketValueFilter} onChange={(event) => setMarketValueFilter(event.target.value)}>
                <option value="all">Any value state</option>
                <option value="has">Has market snapshot</option>
                <option value="missing">Missing market snapshot</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Finish</span>
              <select value={finishFilter} onChange={(event) => setFinishFilter(event.target.value)}>
                <option value="">Any finish</option>
                {FINISH_OPTIONS.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Condition</span>
              <select value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
                <option value="">Any condition</option>
                {CONDITION_OPTIONS.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Language</span>
              <input value={languageFilter} placeholder="en, jp..." onChange={(event) => setLanguageFilter(event.target.value)} />
            </label>
          </div>
        </BrowseFilterOverlay>
      ) : null}
      {metadataOverlayOpen && collection ? (
        <CollectionMetadataOverlay
          metadata={collection.metadata}
          library={library}
          onSave={(metadata) => updateCollectionMetadata(metadata)}
          onClose={() => setMetadataOverlayOpen(false)}
        />
      ) : null}
      {bulkEditOpen ? (
        <CollectionBulkEditOverlay
          entries={selectedEntries}
          ownerSuggestions={ownerSuggestions}
          onApply={applyBulkEdit}
          onClose={() => setBulkEditOpen(false)}
        />
      ) : null}
      {priceToolsOpen && collection ? (
        <CollectionPriceToolsOverlay
          collection={collection}
          onUpdated={replaceCollectionFromServer}
          onStatus={onStatus}
          onClose={() => setPriceToolsOpen(false)}
        />
      ) : null}
      {collection && previewEntry ? (
        <CollectionCardPreviewOverlay
          collection={collection}
          entry={previewEntry}
          library={library}
          ownerSuggestions={ownerSuggestions}
          onChangeEntry={(patch) => updateCollectionEntry(previewEntry.entryId, patch)}
          onOpenCard={onOpenCard}
          onStatus={onStatus}
          onClose={() => setPreviewEntryId('')}
        />
      ) : null}
      {expandedImageEntry && expandedImageSrc ? (
        <ImageLightbox src={expandedImageSrc} alt={`${expandedImageEntry.cardName} card image`} label={`${expandedImageEntry.cardName} expanded image`} onClose={() => setExpandedImageEntryId('')} />
      ) : null}
    </div>
  );
}

function CollectionStat({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: IconName }) {
  return <WorkspaceMetric label={label} value={value} note={note} icon={icon} />;
}

function matchesCollectionSurface(collection: Pick<CollectionSummary, 'kind'>, surface: CollectionSurfaceKind): boolean {
  if (surface === 'binders') {
    return collection.kind === 'binder';
  }
  if (surface === 'lists') {
    return collection.kind === 'list';
  }
  return true;
}

function WorkModeNote({ mode, section }: { mode: WorkModeId; section: WorkspaceSection }) {
  const activeMode = getWorkMode(mode);
  const note = activeMode.workspaceNotes[section];
  if (!note) {
    return null;
  }
  return (
    <div className="work-mode-note">
      <strong>{activeMode.label}</strong>
      <span>{note}</span>
    </div>
  );
}

function WorkspaceMetric({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: IconName }) {
  return (
    <div className="collection-stat workspace-metric">
      <strong>{value}</strong>
      <span className="workspace-metric-label">{icon ? <Icon name={icon} /> : null}{label}</span>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function summarizeDeck(deck: DeckState | null) {
  const entries = activeVariantEntries(deck);
  const countSection = (section: DeckEntry['section']) => entries.filter((entry) => entry.section === section).reduce((total, entry) => total + entry.count, 0);
  const unresolvedCards = entries.filter((entry) => entry.warning || !entry.card).reduce((total, entry) => total + entry.count, 0);
  const totalCards = entries.reduce((total, entry) => total + entry.count, 0);
  return {
    totalCards,
    mainCards: countSection('main'),
    sideCards: countSection('side'),
    maybeCards: countSection('maybe'),
    resolvedCards: Math.max(0, totalCards - unresolvedCards),
    unresolvedCards
  };
}

interface DeckLiveStats {
  totalCards: number;
  curve: Array<{ label: string; value: number }>;
  colors: Array<{ label: string; value: number }>;
  types: Array<{ label: string; value: number }>;
  sections: Array<{ label: string; value: number }>;
  unresolvedCards: number;
  duplicateWarnings: number;
  collectionOwnedCards: number;
  collectionNeededCards: number;
  collectionMissingNames: number;
  collectionSourceCount: number;
}

function buildDeckLiveStats(deck: DeckState | null, entries: DeckState['entries'], collectionStates: CollectionState[]): DeckLiveStats {
  const curveTotals = new Map<string, number>();
  const colorTotals = new Map<string, number>();
  const typeTotals = new Map<string, number>();
  const sectionTotals = new Map<string, number>();
  const requiredByName = new Map<string, number>();
  const ownedByName = new Map<string, number>();
  const unresolvedCards = entries.filter((entry) => entry.warning || !entry.card).reduce((total, entry) => total + entry.count, 0);
  const totalCards = entries.reduce((total, entry) => total + entry.count, 0);
  const singletonFormat = /commander|brawl|singleton/i.test(deck?.metadata.format ?? '');

  for (const entry of entries) {
    const quantity = Math.max(1, Number(entry.count) || 1);
    const manaValue = Math.max(0, Math.floor(deckEntryManaValue(entry)));
    const curveKey = manaValue >= 7 ? '7+' : String(manaValue);
    curveTotals.set(curveKey, (curveTotals.get(curveKey) ?? 0) + quantity);
    const colorKey = deckColorBucket(entry.card?.colorIdentity ?? entry.card?.colors ?? '');
    colorTotals.set(colorKey, (colorTotals.get(colorKey) ?? 0) + quantity);
    const typeKey = deckPrimaryType(entry.card?.typeLine ?? '');
    typeTotals.set(typeKey, (typeTotals.get(typeKey) ?? 0) + quantity);
    const sectionKey = deckSectionLabel(entry.section);
    sectionTotals.set(sectionKey, (sectionTotals.get(sectionKey) ?? 0) + quantity);
    const name = normalizedCardName(entry.card?.name ?? entry.nameSnapshot);
    if (name) {
      requiredByName.set(name, (requiredByName.get(name) ?? 0) + quantity);
    }
  }

  for (const collection of collectionStates) {
    if (collection.metadata.kind === 'list') {
      continue;
    }
    for (const entry of collection.entries) {
      if (!isOwnedStatus(entry.ownershipStatus)) {
        continue;
      }
      const name = normalizedCardName(entry.cardName);
      if (!name) {
        continue;
      }
      ownedByName.set(name, (ownedByName.get(name) ?? 0) + Math.max(0, Number(entry.quantity) || 0));
    }
  }

  let duplicateWarnings = 0;
  let collectionOwnedCards = 0;
  let collectionMissingNames = 0;
  for (const [name, requiredCount] of requiredByName) {
    const representative = entries.find((entry) => normalizedCardName(entry.card?.name ?? entry.nameSnapshot) === name);
    const isBasicLand = Boolean(basicLandGroupKey(representative?.card?.name ?? representative?.nameSnapshot, representative?.card?.typeLine));
    const duplicateLimit = singletonFormat ? 1 : 4;
    if (!isBasicLand && requiredCount > duplicateLimit) {
      duplicateWarnings += 1;
    }
    const owned = ownedByName.get(name) ?? 0;
    collectionOwnedCards += Math.min(requiredCount, owned);
    if (owned < requiredCount) {
      collectionMissingNames += 1;
    }
  }

  return {
    totalCards,
    curve: orderedStatRows(curveTotals, ['0', '1', '2', '3', '4', '5', '6', '7+']),
    colors: orderedStatRows(colorTotals, ['W', 'U', 'B', 'R', 'G', 'Multi', 'C']),
    types: orderedStatRows(typeTotals, ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Land', 'Other']),
    sections: orderedStatRows(sectionTotals, ['Main board', 'Sideboard', 'Maybeboard']),
    unresolvedCards,
    duplicateWarnings,
    collectionOwnedCards,
    collectionNeededCards: totalCards,
    collectionMissingNames,
    collectionSourceCount: collectionStates.filter((collection) => collection.metadata.kind !== 'list').length
  };
}

function deckDashboardScope(deck: DeckState | DeckSummary): DashboardScope {
  const deckId = 'metadata' in deck ? deck.metadata.deckId : deck.deckId;
  const label = 'metadata' in deck ? deck.metadata.name : deck.name;
  return { kind: 'deck', id: deckId, label };
}

function orderedStatRows(values: Map<string, number>, order: string[]): Array<{ label: string; value: number }> {
  const ordered = order.map((label) => ({ label, value: values.get(label) ?? 0 })).filter((row) => row.value > 0);
  const known = new Set(order);
  for (const [label, value] of values) {
    if (!known.has(label) && value > 0) {
      ordered.push({ label, value });
    }
  }
  return ordered;
}

function deckColorBucket(colors: string): string {
  const normalized = String(colors ?? '').toUpperCase().replace(/[^WUBRGC]/g, '');
  const uniqueColors = [...new Set(normalized.split('').filter((color) => 'WUBRG'.includes(color)))];
  if (uniqueColors.length > 1) {
    return 'Multi';
  }
  if (uniqueColors.length === 1) {
    return uniqueColors[0]!;
  }
  return 'C';
}

function deckPrimaryType(typeLine: string): string {
  const normalized = typeLine.toLowerCase();
  for (const type of ['Creature', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Planeswalker', 'Land']) {
    if (normalized.includes(type.toLowerCase())) {
      return type;
    }
  }
  return 'Other';
}

function normalizedCardName(name?: string): string {
  return String(name ?? '').trim().toLowerCase();
}

function DeckLiveStatsPanel({ stats, onOpenDashboard }: { stats: DeckLiveStats; onOpenDashboard: () => void }) {
  return (
    <section className="deck-live-stats-panel" aria-label="Deck summary">
      <div className="deck-live-stats-heading">
        <span>Deck summary</span>
        <strong>{formatCount(stats.totalCards, 'card')}</strong>
      </div>
      <div className="deck-live-stat-pills" aria-label="Deck board and collection checks">
        {stats.sections.map((row) => (
          <span key={row.label}>
            <strong>{row.value}</strong>
            {row.label}
          </span>
        ))}
        {stats.unresolvedCards > 0 ? (
          <span className="warning">
            <strong>{stats.unresolvedCards}</strong>
            unresolved
          </span>
        ) : null}
        {stats.duplicateWarnings > 0 ? (
          <span className="warning">
            <strong>{stats.duplicateWarnings}</strong>
            duplicate checks
          </span>
        ) : null}
        {stats.collectionSourceCount > 0 ? (
          <span>
            <strong>{stats.collectionOwnedCards}/{stats.collectionNeededCards}</strong>
            locally owned
          </span>
        ) : (
          <span>
            <strong>-</strong>
            no binder data
          </span>
        )}
        {stats.collectionMissingNames > 0 ? (
          <span className="warning">
            <strong>{stats.collectionMissingNames}</strong>
            missing names
          </span>
        ) : null}
      </div>
      <button type="button" className="secondary-button compact deck-live-dashboard-button" onClick={onOpenDashboard}>
        Dashboard
      </button>
    </section>
  );
}

function activeVariantEntries(deck: DeckState | null): DeckState['entries'] {
  if (!deck) {
    return [];
  }
  const activeVariantId = activeDeckVariantId(deck);
  return deck.entries.filter((entry) => (!entry.deckVariantId || entry.deckVariantId === activeVariantId) && !entry.markedForDeletion);
}

function exportableDeckEntries(deck: DeckState | null): DeckState['entries'] {
  return activeVariantEntries(deck).filter((entry) => entry.candidateStatus !== 'candidate' && entry.candidateStatus !== 'cut');
}

function activeDeckVariantId(deck: DeckState): string {
  return deck.activeVariantId || deck.metadata.activeVariantId || deck.metadata.variants[0]?.variantId || 'default';
}

function nextDeckEntryId(deck: DeckState): string {
  const existing = new Set(deck.entries.map((entry) => entry.entryId).filter(Boolean));
  let index = deck.entries.length + 1;
  let candidate = `entry-${String(index).padStart(3, '0')}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `entry-${String(index).padStart(3, '0')}`;
  }
  return candidate;
}

function nextDeckVariantId(deck: DeckState, name: string): string {
  const base = slugForUiId(name) || 'variant';
  const existing = new Set(deck.metadata.variants.map((variant) => variant.variantId));
  let candidate = base;
  let index = 2;
  while (existing.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function slugForUiId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

function buildDeckRoleSummary(entries: DeckState['entries']): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.markedForDeletion || entry.candidateStatus === 'cut') {
      continue;
    }
    for (const role of entry.roles ?? []) {
      const label = deckRoleLabel(role);
      counts.set(label, (counts.get(label) ?? 0) + entry.count);
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 10);
}

function formatCollectionEntryValue(entry: CollectionEntry): string {
  const estimate = collectionValueEstimateFromEntry(entry);
  return estimate ? formatMoney(estimate.amount * entry.quantity, estimate.currency) : 'No source';
}

function collectionEntryMatchesMarker(entry: CollectionEntry, marker: string): boolean {
  if (marker === 'all') {
    return true;
  }
  if (marker === 'marked_for_deletion') {
    return Boolean(entry.markedForDeletion);
  }
  return Boolean(entry[marker as keyof Pick<CollectionEntry, 'starred' | 'flagged' | 'altered' | 'misprint' | 'proxy' | 'homebrew'>]);
}

function collectionEntryMatchesValueState(value: number | undefined, filter: string): boolean {
  if (filter === 'has') {
    return value !== undefined;
  }
  if (filter === 'missing') {
    return value === undefined;
  }
  return true;
}

function formatMoney(amount: number, currency: string): string {
  if (currency === 'TIX') {
    return `${amount.toFixed(2)} tix`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function CollectionArtThumb({ metadata, fallback }: { metadata: ReturnType<typeof metadataFromCollectionEntry>; fallback: string }) {
  const imageSrc = imageUrlForMetadata(metadata, 'small');
  return (
    <span className={`collection-art-thumb ${imageSrc ? 'has-art' : ''}`} aria-hidden="true">
      {imageSrc ? <img src={imageSrc} alt="" loading="lazy" /> : <span>{fallback.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

function CollectionDetailsPanel({
  collection,
  entry,
  library,
  ownerSuggestions,
  dirty,
  saving,
  onUpdateEntry,
  onExpandImage,
  onDeleteEntry,
  onSave
}: {
  collection: CollectionState | null;
  entry?: CollectionEntry;
  library: LibraryState | null;
  ownerSuggestions: string[];
  dirty: boolean;
  saving: boolean;
  onUpdateEntry: (patch: Partial<CollectionEntry>) => void;
  onExpandImage?: () => void;
  onDeleteEntry?: () => void;
  onSave: () => void;
}) {
  if (!collection) {
    return (
      <div className="collection-details-panel">
        <h2>Collection Inspector</h2>
        <div className="preview-empty compact-empty">
          <strong>No collection selected</strong>
          <span>Choose a collection from the left panel.</span>
        </div>
      </div>
    );
  }
  const projectName = library?.universes.find((universe) => universe.id === collection.metadata.linkedUniverseId)?.name ?? 'No project';
  const cardMetadata = entry ? metadataFromCollectionEntry(entry) : null;
  const imageSrc = imageUrlForMetadata(cardMetadata, 'normal');
  return (
    <div className="collection-details-panel">
      <div className="inspector-heading-row">
        <div>
          <h2>{entry ? 'Collection Entry Inspector' : 'Collection Inspector'}</h2>
          <p className="workspace-copy">{entry ? 'Edit collection ownership and review details.' : 'Choose a card from the center table.'}</p>
        </div>
        <button type="button" className="primary-button" disabled={!dirty || saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        {entry ? (
          <button type="button" className="danger-button" onClick={onDeleteEntry}>
            Delete
          </button>
        ) : null}
      </div>
      <div className="collection-detail-grid">
        <div className="readonly-line">
          <strong>{purposeLabel(collection.metadata.purpose)}</strong>
          <span>{projectName}</span>
        </div>
        <div className="readonly-line">
          <strong>{gameLabel(collection.metadata.gameId)}</strong>
          <span>{collection.metadata.source}</span>
        </div>
      </div>
      <div className="collection-card-preview">
        {imageSrc ? (
          <button type="button" className="collection-card-image-button" onClick={onExpandImage} onDoubleClick={onExpandImage} title="Expand card image" aria-label={`Expand ${entry?.cardName ?? 'selected card'} image`}>
            <img className="collection-card-image" src={imageSrc} alt={`${entry?.cardName ?? 'Selected card'} preview`} />
          </button>
        ) : (
          <div className="tile-art-placeholder large collection-card-mark">
            <span>{entry?.cardName.slice(0, 2).toUpperCase() ?? 'NA'}</span>
          </div>
        )}
        <div>
          <h3>{entry?.cardName ?? 'No card selected'}</h3>
          <p className="workspace-copy">{entry ? `${entry.quantity} copy${entry.quantity === 1 ? '' : 'ies'} - ${collectionPrintLabel(entry)}` : 'Select a collection card to edit its ownership fields.'}</p>
          {entry ? <CollectionStatusPill status={entry.reviewStatus} /> : null}
        </div>
      </div>
      {entry ? (
        <div className="collection-official-panel">
          <div className="collection-detail-grid">
            <div className="readonly-line">
              <strong>Mana</strong>
              <ManaCostSymbols value={cardMetadata?.manaCost} />
            </div>
            <div className="readonly-line">
              <strong>Mana value</strong>
              <span>{cardMetadata?.manaValue ?? '-'}</span>
            </div>
            <div className="readonly-line">
              <strong>Identity</strong>
              <ColorIdentitySymbols value={cardMetadata?.colorIdentity} />
            </div>
            <div className="readonly-line">
              <strong>Type</strong>
              <span>{cardMetadata?.typeLine || '-'}</span>
            </div>
          </div>
          {cardMetadata?.oracleText ? <p className="official-card-text">{cardMetadata.oracleText}</p> : null}
          {cardMetadata?.flavorText ? <p className="official-card-text flavor">{cardMetadata.flavorText}</p> : null}
        </div>
      ) : null}
      {entry ? (
        <div className="collection-entry-edit-grid">
          <Field label="Quantity">
            <input type="number" min="1" value={entry.quantity} onChange={(event) => onUpdateEntry({ quantity: Number(event.target.value) })} />
          </Field>
          <Field label="Owner">
            <input list="collection-entry-owner-options" value={entry.ownerName} placeholder="Kyle" onChange={(event) => onUpdateEntry({ ownerName: event.target.value })} onBlur={(event) => onUpdateEntry({ ownerName: normalizeCollectionOwnerName(event.target.value) })} />
            <datalist id="collection-entry-owner-options">
              {ownerSuggestions.map((owner) => (
                <option key={owner} value={owner} />
              ))}
            </datalist>
          </Field>
          <div className="grid-3">
            <Field label="Finish">
              <select value={entry.finish ?? ''} onChange={(event) => onUpdateEntry({ finish: event.target.value || undefined })}>
                {FINISH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Condition">
              <select value={entry.condition ?? ''} onChange={(event) => onUpdateEntry({ condition: event.target.value || undefined })}>
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Language">
              <select value={entry.language ?? ''} onChange={(event) => onUpdateEntry({ language: event.target.value || undefined })}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Location">
            <input value={entry.location ?? ''} placeholder="Binder, box, shelf..." onChange={(event) => onUpdateEntry({ location: event.target.value || undefined })} />
          </Field>
          <div className="grid-2">
            <Field label="Review status">
              <select value={entry.reviewStatus} onChange={(event) => onUpdateEntry({ reviewStatus: event.target.value as CollectionEntry['reviewStatus'] })}>
                <option value="matched">Matched</option>
                <option value="needs_review">Needs review</option>
              </select>
            </Field>
            <Field label="Purchase price">
              <div className="grid-2">
                <input type="number" min="0" step="0.01" value={entry.purchasePrice ?? ''} onChange={(event) => onUpdateEntry({ purchasePrice: event.target.value === '' ? undefined : Number(event.target.value) })} />
                <input value={entry.purchaseCurrency ?? 'USD'} onChange={(event) => onUpdateEntry({ purchaseCurrency: event.target.value.toUpperCase() || undefined })} />
              </div>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Market snapshot">
              <div className="grid-3">
                <input type="number" min="0" step="0.01" value={entry.estimatedMarketPrice ?? ''} onChange={(event) => onUpdateEntry({ estimatedMarketPrice: event.target.value === '' ? undefined : Number(event.target.value), marketPriceUpdatedAt: event.target.value === '' ? undefined : new Date().toISOString() })} />
                <input value={entry.estimatedMarketCurrency ?? 'USD'} onChange={(event) => onUpdateEntry({ estimatedMarketCurrency: event.target.value.toUpperCase() || undefined })} />
                <input value={entry.marketPriceSource ?? ''} placeholder="scryfall, csv..." onChange={(event) => onUpdateEntry({ marketPriceSource: event.target.value || undefined })} />
              </div>
            </Field>
            <Field label="Tags">
              <input value={(entry.tags ?? []).join(';')} placeholder="commander;trade" onChange={(event) => onUpdateEntry({ tags: normalizeCollectionTags(event.target.value) })} />
            </Field>
          </div>
          <div className="collection-marker-row" role="group" aria-label="Collection row markers">
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.starred)} onChange={(event) => onUpdateEntry({ starred: event.target.checked })} />
              <span>Starred</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.flagged)} onChange={(event) => onUpdateEntry({ flagged: event.target.checked })} />
              <span>Flagged</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.markedForDeletion)} onChange={(event) => onUpdateEntry({ markedForDeletion: event.target.checked })} />
              <span>Marked for deletion</span>
            </label>
          </div>
          <div className="collection-marker-row" role="group" aria-label="Collection row attributes">
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.altered)} onChange={(event) => onUpdateEntry({ altered: event.target.checked })} />
              <span>Altered</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.misprint)} onChange={(event) => onUpdateEntry({ misprint: event.target.checked })} />
              <span>Misprint</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.proxy)} onChange={(event) => onUpdateEntry({ proxy: event.target.checked })} />
              <span>Proxy</span>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={Boolean(entry.homebrew)} onChange={(event) => onUpdateEntry({ homebrew: event.target.checked })} />
              <span>Homebrew</span>
            </label>
          </div>
          <Field label="Review notes">
            <textarea value={entry.reviewNotes ?? ''} rows={4} onChange={(event) => onUpdateEntry({ reviewNotes: event.target.value || undefined })} />
          </Field>
          <Field label="Collection notes">
            <textarea value={entry.notes ?? ''} rows={3} onChange={(event) => onUpdateEntry({ notes: event.target.value || undefined })} />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

function CollectionStatusPill({ status }: { status: CollectionEntry['reviewStatus'] }) {
  return <StatusPill tone={status === 'needs_review' ? 'warning' : 'success'} className={`collection-status-pill ${status}`}>{status === 'needs_review' ? 'Review' : 'Matched'}</StatusPill>;
}

function toneForDeckStatus(status: string | undefined): StatusPillTone {
  if (status === 'active' || status === 'ready' || status === 'complete') {
    return 'success';
  }
  if (status === 'review' || status === 'needs_review') {
    return 'warning';
  }
  if (status === 'archived') {
    return 'neutral';
  }
  return 'info';
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
    return 'Homebrew Print Run';
  }
  if (purpose === 'research') {
    return 'Research';
  }
  return 'Mixed';
}

function gameLabel(gameId: string | undefined): string {
  return gameId === 'mtg' || !gameId ? 'Magic: The Gathering' : gameId;
}

function DecksWorkspace({
  library,
  selectedUniverseId,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onCreateDeck,
  onOpenCard,
  onOpenCardBrowser,
  onOpenDashboard,
  onStatus,
  saveShortcutToken,
  deckRefreshToken,
  activeDeckId,
  workMode
}: Pick<
  WorkspaceViewProps,
  | 'library'
  | 'selectedUniverseId'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onCreateDeck'
  | 'onOpenCard'
  | 'onOpenCardBrowser'
  | 'onOpenDashboard'
  | 'onStatus'
  | 'saveShortcutToken'
  | 'deckRefreshToken'
  | 'activeDeckId'
  | 'workMode'
>) {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [query, setQuery] = useState('');
  const [addCardsOpen, setAddCardsOpen] = useState(false);
  const [selectedDeckEntryIndex, setSelectedDeckEntryIndex] = useState<number | null>(null);
  const [previewDeckEntryIndex, setPreviewDeckEntryIndex] = useState<number | null>(null);
  const [activeDeckSection, setActiveDeckSection] = useState<DeckEntry['section']>('main');
  const [deckViewMode, setDeckViewMode] = useState<DeckViewMode>('board');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deckFilters, setDeckFilters] = useState(() => defaultDeckFilters());
  const [deckEntryQuery, setDeckEntryQuery] = useState('');
  const [deckEntryFiltersOpen, setDeckEntryFiltersOpen] = useState(false);
  const [deckEntryFilters, setDeckEntryFilters] = useState<DeckEntryFilters>(DEFAULT_DECK_ENTRY_FILTERS);
  const [deckEntrySortState, setDeckEntrySortState] = useState<ListSortState<DeckEntrySortOptionId>>({ option: 'default', direction: 'asc' });
  const [groupBasicLands, setGroupBasicLands] = useState(() => readDeckGroupBasicsPreference());
  const [deckCollectionStates, setDeckCollectionStates] = useState<CollectionState[]>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const activeDeckFilterCount = countActiveFilters([
    { value: deckFilters.status, defaultValue: 'all' },
    { value: deckFilters.tag, defaultValue: '' },
    { value: deckFilters.playStyle, defaultValue: '' },
    { value: deckFilters.format, defaultValue: '' },
    { value: deckFilters.colorIdentity, defaultValue: 'all' },
    { value: deckFilters.commanderBracket, defaultValue: 'all' },
    { value: deckFilters.commander, defaultValue: '' },
    { value: deckFilters.linkedUniverseId, defaultValue: 'all' },
    { value: deckFilters.linkedSetCode, defaultValue: 'all' },
    { value: deckFilters.unresolved, defaultValue: 'all' },
    { value: deckFilters.mainCount, defaultValue: '' },
    { value: deckFilters.sideCount, defaultValue: '' },
    { value: deckFilters.maybeCount, defaultValue: '' }
  ]);
  const activeDeckEntryFilterCount = countActiveFilters([
    { value: deckEntryFilters.section, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.section },
    { value: deckEntryFilters.candidateStatus, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.candidateStatus },
    { value: deckEntryFilters.role, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.role },
    { value: deckEntryFilters.color, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.color },
    { value: deckEntryFilters.manaValue, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.manaValue },
    { value: deckEntryFilters.cardType, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.cardType },
    { value: deckEntryFilters.tag, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.tag },
    { value: deckEntryFilters.unresolved, defaultValue: DEFAULT_DECK_ENTRY_FILTERS.unresolved }
  ]);

  useEffect(() => {
    void loadDecks(activeDeckId || undefined);
  }, [deckRefreshToken, activeDeckId]);

  useEffect(() => {
    if (!saveShortcutToken) {
      return;
    }
    if (!deck) {
      onStatus('No deck is selected to save.');
      return;
    }
    if (busy) {
      onStatus('Deck save is already in progress.');
      return;
    }
    if (!dirty) {
      onStatus('No deck changes to save.');
      return;
    }
    void handleSaveDeck();
  }, [saveShortcutToken]);

  useEffect(() => {
    writeDeckGroupBasicsPreference(groupBasicLands);
  }, [groupBasicLands]);

  useEffect(() => {
    let cancelled = false;
    void fetchCollections()
      .then((summaries) => Promise.all(summaries.map((summary) => fetchCollection(summary.collectionId).catch(() => null))))
      .then((states) => {
        if (!cancelled) {
          setDeckCollectionStates(states.filter((state): state is CollectionState => Boolean(state)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeckCollectionStates([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadDecks(nextDeckId?: string) {
    try {
      const loaded = await fetchDecks();
      setDecks(loaded);
      const currentDeckStillAvailable = deck && loaded.some((candidate) => candidate.deckId === deck.metadata.deckId);
      const targetId = nextDeckId ?? (currentDeckStillAvailable ? deck.metadata.deckId : undefined) ?? loaded[0]?.deckId;
      if (targetId) {
        setDeck(await fetchDeck(targetId));
      } else {
        setDeck(null);
      }
      setSelectedDeckEntryIndex(null);
      setPreviewDeckEntryIndex(null);
      setActiveDeckSection('main');
      setDirty(false);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectDeck(deckId: string) {
    try {
      setDeck(await fetchDeck(deckId));
      setSelectedDeckEntryIndex(null);
      setPreviewDeckEntryIndex(null);
      setActiveDeckSection('main');
      setDirty(false);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSaveDeck() {
    if (!deck) {
      return;
    }
    setBusy(true);
    try {
      const result = await saveDeck(deck);
      setDecks(result.decks);
      setDeck(result.deck);
      setDirty(false);
      onStatus(`Saved deck ${result.deck.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function updateDeck(next: DeckState) {
    setDeck(next);
    setDirty(true);
  }

  function updateMetadata(next: Partial<DeckMetadata>) {
    if (!deck) {
      return;
    }
    updateDeck({ ...deck, metadata: { ...deck.metadata, ...next } });
  }

  function addCard(card: DeckCardOption, section: DeckEntry['section'] = 'main', count = 1, candidateStatus: DeckEntry['candidateStatus'] = 'active') {
    if (!deck) {
      return;
    }
    const deckVariantId = activeDeckVariantId(deck);
    const primaryVariantId = card.variants.find((variant) => variant.isPrimary)?.variantId;
    const existingIndex = deck.entries.findIndex((entry) => (entry.deckVariantId ?? deckVariantId) === deckVariantId && entry.section === section && entry.setCode === card.setCode && entry.cardId === card.cardId && entry.variantId === primaryVariantId);
    const entries =
      existingIndex >= 0
        ? deck.entries.map((entry, index) => (index === existingIndex ? { ...entry, count: entry.count + count, card, nameSnapshot: card.name } : entry))
        : [
            ...deck.entries,
            {
              deckId: deck.metadata.deckId,
              entryId: nextDeckEntryId(deck),
              deckVariantId,
              section,
              count,
              setCode: card.setCode,
              cardId: card.cardId,
              variantId: primaryVariantId,
              nameSnapshot: card.name,
              candidateStatus: candidateStatus ?? 'active',
              roles: [],
              roleSource: 'none' as const,
              entryTags: [],
              flags: [],
              starred: false,
              markedForDeletion: false,
              card
            }
          ];
    updateDeck({ ...deck, entries });
    setActiveDeckSection(section);
  }

  function addCollectionCard(entry: CollectionEntry, collectionSource: CollectionState | null, section: DeckEntry['section'] = 'main', count = 1, candidateStatus: DeckEntry['candidateStatus'] = 'active') {
    if (!deck) {
      return;
    }
    const setCode = (entry.linkedSetCode || entry.setCode || collectionSource?.metadata.collectionId || 'COLL').toUpperCase();
    const cardId = entry.linkedCardId || entry.scryfallId || entry.entryId;
    const variantId = entry.linkedVariantId;
    const deckVariantId = activeDeckVariantId(deck);
    const existingIndex = deck.entries.findIndex((deckEntry) => (deckEntry.deckVariantId ?? deckVariantId) === deckVariantId && deckEntry.section === section && deckEntry.setCode === setCode && deckEntry.cardId === cardId && deckEntry.variantId === variantId);
    const entries =
      existingIndex >= 0
        ? deck.entries.map((deckEntry, index) => (index === existingIndex ? { ...deckEntry, count: deckEntry.count + count, nameSnapshot: entry.cardName } : deckEntry))
        : [
            ...deck.entries,
            {
              deckId: deck.metadata.deckId,
              entryId: nextDeckEntryId(deck),
              deckVariantId,
              section,
              count,
              setCode,
              cardId,
              variantId,
              nameSnapshot: entry.cardName,
              candidateStatus: candidateStatus ?? 'active',
              roles: [],
              roleSource: 'none' as const,
              entryTags: [],
              flags: [],
              starred: false,
              markedForDeletion: false
            }
          ];
    updateDeck({ ...deck, entries });
    setActiveDeckSection(section);
  }

  function updateEntry(index: number, next: Partial<DeckEntry>) {
    if (!deck) {
      return;
    }
    updateDeck({
      ...deck,
      entries: deck.entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...next, count: Math.max(1, Number(next.count ?? entry.count) || 1) } : entry))
    });
    if (next.section) {
      setActiveDeckSection(next.section);
    }
  }

  function removeEntry(index: number) {
    if (!deck) {
      return;
    }
    updateDeck({ ...deck, entries: deck.entries.filter((_, entryIndex) => entryIndex !== index) });
    setSelectedDeckEntryIndex((current) => (current === index ? null : current !== null && current > index ? current - 1 : current));
  }

  function setActiveVariant(variantId: string) {
    if (!deck || !variantId) {
      return;
    }
    updateDeck({
      ...deck,
      activeVariantId: variantId,
      activeVariant: deck.metadata.variants.find((variant) => variant.variantId === variantId) ?? deck.activeVariant,
      variants: deck.metadata.variants,
      metadata: { ...deck.metadata, activeVariantId: variantId }
    });
    setSelectedDeckEntryIndex(null);
    setPreviewDeckEntryIndex(null);
    setActiveDeckSection('main');
  }

  function duplicateActiveVariant() {
    if (!deck) {
      return;
    }
    const sourceVariantId = activeDeckVariantId(deck);
    const sourceVariant = deck.metadata.variants.find((variant) => variant.variantId === sourceVariantId) ?? deck.activeVariant;
    const now = new Date().toISOString();
    const variantId = nextDeckVariantId(deck, `${sourceVariant?.name ?? 'Variant'} Copy`);
    const nextVariant = {
      ...(sourceVariant ?? deck.activeVariant),
      deckId: deck.metadata.deckId,
      variantId,
      name: `${sourceVariant?.name ?? 'Variant'} Copy`,
      status: 'testing' as const,
      createdAt: now,
      updatedAt: now
    };
    const copiedEntries = deck.entries
      .filter((entry) => (!entry.deckVariantId || entry.deckVariantId === sourceVariantId) && !entry.markedForDeletion)
      .map((entry, index) => ({
        ...entry,
        entryId: `${variantId}-entry-${String(index + 1).padStart(3, '0')}`,
        deckVariantId: variantId,
        candidateStatus: entry.candidateStatus === 'cut' ? 'candidate' : entry.candidateStatus ?? 'active'
      }));
    const variants = [...deck.metadata.variants, nextVariant];
    updateDeck({
      ...deck,
      activeVariantId: variantId,
      activeVariant: nextVariant,
      variants,
      metadata: { ...deck.metadata, activeVariantId: variantId, variants },
      entries: [...deck.entries, ...copiedEntries]
    });
    setSelectedDeckEntryIndex(null);
    setActiveDeckSection('main');
  }

  function createBlankVariant() {
    if (!deck) {
      return;
    }
    const now = new Date().toISOString();
    const variantId = nextDeckVariantId(deck, 'New Variant');
    const nextVariant = {
      deckId: deck.metadata.deckId,
      variantId,
      name: `Variant ${deck.metadata.variants.length + 1}`,
      description: '',
      status: 'draft' as const,
      colorIdentity: deck.metadata.colorIdentity,
      commander: deck.metadata.commander,
      partnerCommanders: deck.metadata.partnerCommanders,
      tags: [],
      notes: '',
      createdAt: now,
      updatedAt: now
    };
    const variants = [...deck.metadata.variants, nextVariant];
    updateDeck({
      ...deck,
      activeVariantId: variantId,
      activeVariant: nextVariant,
      variants,
      metadata: { ...deck.metadata, activeVariantId: variantId, variants }
    });
    setSelectedDeckEntryIndex(null);
    setActiveDeckSection('main');
  }

  function updateActiveVariant(patch: Partial<DeckState['variants'][number]>) {
    if (!deck) {
      return;
    }
    const variantId = activeDeckVariantId(deck);
    const variants = deck.metadata.variants.map((variant) => (variant.variantId === variantId ? { ...variant, ...patch, updatedAt: new Date().toISOString() } : variant));
    const activeVariant = variants.find((variant) => variant.variantId === variantId) ?? deck.activeVariant;
    updateDeck({ ...deck, variants, activeVariant, metadata: { ...deck.metadata, variants } });
  }

  function archiveActiveVariant() {
    updateActiveVariant({ status: 'archived' });
  }

  const filteredDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return decks.map((candidate, index) => ({ candidate, index })).filter(({ candidate }) => {
      const searchableMetadata = [
        candidate.name,
        candidate.description,
        candidate.status,
        candidate.format,
        candidate.colorIdentity,
        candidate.commander?.nameSnapshot,
        candidate.commanderBracket,
        candidate.activeVariantName,
        candidate.variants?.map((variant) => `${variant.name} ${variant.status} ${variant.tags.join(' ')}`).join(' '),
        candidate.tags.join(' '),
        candidate.playStyleTags.join(' ')
      ].join(' ');
      const matchesQuery = !needle || searchableMetadata.toLowerCase().includes(needle);
      const matchesStatus = deckFilters.status === 'all' || candidate.status === deckFilters.status;
      const matchesTags = matchesTagFilter(candidate.tags, deckFilters.tag);
      const matchesPlayStyle = matchesTagFilter(candidate.playStyleTags, deckFilters.playStyle);
      const matchesFormat = includesFilterText(candidate.format, deckFilters.format);
      const matchesColorIdentity = deckFilters.colorIdentity === 'all' || candidate.colorIdentity === deckFilters.colorIdentity;
      const commanderText = [candidate.commander?.nameSnapshot, ...(candidate.partnerCommanders ?? []).map((commander) => commander.nameSnapshot)].filter(Boolean).join(' ');
      const matchesCommander = includesFilterText(commanderText, deckFilters.commander);
      const matchesCommanderBracket = deckFilters.commanderBracket === 'all' || candidate.commanderBracket === deckFilters.commanderBracket;
      const matchesProject = deckFilters.linkedUniverseId === 'all' || candidate.linkedUniverseId === deckFilters.linkedUniverseId;
      const matchesSet = deckFilters.linkedSetCode === 'all' || candidate.linkedSetCode === deckFilters.linkedSetCode;
      const matchesUnresolved =
        deckFilters.unresolved === 'all' ||
        (deckFilters.unresolved === 'has' && candidate.unresolvedCount > 0) ||
        (deckFilters.unresolved === 'none' && candidate.unresolvedCount === 0);
      return (
        matchesQuery &&
        matchesStatus &&
        matchesTags &&
        matchesPlayStyle &&
        matchesFormat &&
        matchesColorIdentity &&
        matchesCommander &&
        matchesCommanderBracket &&
        matchesProject &&
        matchesSet &&
        matchesUnresolved &&
        matchesNumberQuery(candidate.mainCount, deckFilters.mainCount) &&
        matchesNumberQuery(candidate.sideCount, deckFilters.sideCount) &&
        matchesNumberQuery(candidate.maybeCount, deckFilters.maybeCount)
      );
    }).sort((left, right) => {
      const leftCurrent = selectedUniverseId && left.candidate.linkedUniverseId === selectedUniverseId ? 1 : 0;
      const rightCurrent = selectedUniverseId && right.candidate.linkedUniverseId === selectedUniverseId ? 1 : 0;
      if (leftCurrent !== rightCurrent) {
        return rightCurrent - leftCurrent;
      }
      return left.index - right.index;
    }).map(({ candidate }) => candidate);
  }, [deckFilters, decks, query, selectedUniverseId]);

  const selectedDeckEntry = selectedDeckEntryIndex === null ? undefined : deck?.entries[selectedDeckEntryIndex];
  const previewDeckEntry = previewDeckEntryIndex === null ? undefined : deck?.entries[previewDeckEntryIndex];
  const activeVariantId = deck ? activeDeckVariantId(deck) : 'default';
  const activeVariant = deck?.metadata.variants.find((variant) => variant.variantId === activeVariantId) ?? deck?.activeVariant;
  const activeDeckEntries = useMemo(() => activeVariantEntries(deck), [deck]);
  const exportableEntries = useMemo(() => exportableDeckEntries(deck), [deck]);
  const candidatePoolEntries = useMemo(
    () =>
      (deck?.entries ?? [])
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.candidateStatus === 'candidate' || entry.candidateStatus === 'testing' || entry.candidateStatus === 'cut' || entry.markedForDeletion),
    [deck?.entries]
  );
  const deckSectionCounts = useMemo(
    () => ({
      main: activeDeckEntries.filter((entry) => entry.section === 'main').reduce((sum, entry) => sum + entry.count, 0),
      side: activeDeckEntries.filter((entry) => entry.section === 'side').reduce((sum, entry) => sum + entry.count, 0),
      maybe: activeDeckEntries.filter((entry) => entry.section === 'maybe').reduce((sum, entry) => sum + entry.count, 0)
    }),
    [activeDeckEntries]
  );
  const deckLegalityIssues = useMemo(() => (deck ? assessDeckLegality(deck) : []), [deck]);
  const deckMetrics = useMemo(() => summarizeDeck(deck), [deck]);
  const activeDeckSectionEntries = useMemo(
    () => (deck?.entries ?? []).map((entry, index) => ({ entry, index })).filter(({ entry }) => (!entry.deckVariantId || entry.deckVariantId === activeVariantId) && !entry.markedForDeletion && entry.section === activeDeckSection),
    [activeDeckSection, activeVariantId, deck?.entries]
  );
  const activeVariantRows = useMemo(
    () => (deck?.entries ?? []).map((entry, index) => ({ entry, index })).filter(({ entry }) => (!entry.deckVariantId || entry.deckVariantId === activeVariantId) && !entry.markedForDeletion),
    [activeVariantId, deck?.entries]
  );
  const baseVisibleDeckRows = useMemo(
    () => (deckViewMode === 'candidates' ? candidatePoolEntries : deckViewMode === 'roles' || deckViewMode === 'mana' ? activeVariantRows : activeDeckSectionEntries),
    [activeDeckSectionEntries, activeVariantRows, candidatePoolEntries, deckViewMode]
  );
  const filteredDeckRows = useMemo(
    () => filterDeckEntryRows(baseVisibleDeckRows, deckEntryQuery, deckEntryFilters),
    [baseVisibleDeckRows, deckEntryFilters, deckEntryQuery]
  );
  const sortedDeckRows = useMemo(
    () =>
      sortItemsByState(
        filteredDeckRows,
        deckEntrySortState,
        {
          default: (row) => row.index,
          name: (row) => row.entry.card?.name ?? row.entry.nameSnapshot ?? row.entry.cardId,
          quantity: (row) => row.entry.count,
          mana: (row) => deckEntryManaValue(row.entry),
          color: (row) => row.entry.card?.colorIdentity ?? row.entry.card?.colors ?? '',
          type: (row) => row.entry.card?.typeLine ?? '',
          role: (row) => (row.entry.roles ?? [])[0] ?? '',
          status: (row) => row.entry.candidateStatus ?? 'active',
          section: (row) => row.entry.section,
          unresolved: (row) => Boolean(row.entry.warning || !row.entry.card)
        },
        (row) => row.entry.card?.name ?? row.entry.nameSnapshot ?? row.entry.cardId
      ),
    [deckEntrySortState, filteredDeckRows]
  );
  const visibleDeckRows = useMemo(
    () => (groupBasicLands ? groupBasicLandDeckRows(sortedDeckRows) : sortedDeckRows),
    [groupBasicLands, sortedDeckRows]
  );
  const deckRoleSummary = useMemo(() => buildDeckRoleSummary(activeDeckEntries), [activeDeckEntries]);
  const deckLiveStats = useMemo(() => buildDeckLiveStats(deck, activeDeckEntries, deckCollectionStates), [activeDeckEntries, deck, deckCollectionStates]);
  const scopedProject = deckFilters.linkedUniverseId === 'all' ? null : library?.universes.find((universe) => universe.id === deckFilters.linkedUniverseId) ?? null;
  const hiddenByProjectScope =
    deckFilters.linkedUniverseId === 'all'
      ? 0
      : decks.filter((candidate) => candidate.linkedUniverseId !== deckFilters.linkedUniverseId).length;
  const deckMetricItems = useMemo(() => {
    const items: Array<{ label: string; value: ReactNode; note?: string; icon?: IconName }> = [
      { label: 'Total', value: deckMetrics.totalCards, icon: 'cards' },
      { label: 'Main', value: deckMetrics.mainCards, icon: 'decks' }
    ];
    if (deckMetrics.sideCards > 0) {
      items.push({ label: 'Sideboard', value: deckMetrics.sideCards, icon: 'list' });
    }
    if (deckMetrics.maybeCards > 0) {
      items.push({ label: 'Maybe', value: deckMetrics.maybeCards, icon: 'flag' });
    }
    if ((deck?.metadata.variants.length ?? 0) > 1) {
      items.push({ label: 'Variants', value: deck?.metadata.variants.length ?? 0, icon: 'grid' });
    }
    if (candidatePoolEntries.length > 0) {
      items.push({ label: 'Candidates', value: candidatePoolEntries.length, icon: 'star' });
    }
    items.push({ label: 'Ready', value: deckMetrics.resolvedCards, icon: 'save' });
    if (deckMetrics.unresolvedCards > 0) {
      items.push({ label: 'Unresolved', value: deckMetrics.unresolvedCards, note: 'Needs review before export confidence', icon: 'flag' });
    }
    return items;
  }, [candidatePoolEntries.length, deck?.metadata.variants.length, deckMetrics]);

  return (
    <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="Decks"
          subtitle={`${filteredDecks.length} of ${decks.length} decks`}
          newLabel="New deck"
          activeFilterCount={activeDeckFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={onCreateDeck}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder="Search decks..." onChange={(event) => setQuery(event.target.value)} />
            </label>
          }
        >
          {scopedProject ? (
            <div className="scope-chip-row" role="status" aria-live="polite">
              <span className="scope-chip">
                Project: {scopedProject.name}
                {hiddenByProjectScope > 0 ? ` hides ${formatCount(hiddenByProjectScope, 'deck')}` : ''}
              </span>
              <button type="button" className="text-button compact" onClick={() => setDeckFilters((current) => ({ ...current, linkedUniverseId: 'all' }))}>
                Show all
              </button>
            </div>
          ) : null}
          <div className="entity-list">
            {filteredDecks.map((candidate) => (
              <button key={candidate.deckId} type="button" className={`entity-row clickable ${candidate.deckId === deck?.metadata.deckId ? 'selected' : ''}`} onClick={() => void handleSelectDeck(candidate.deckId)}>
                <DeckCoverBadge metadata={candidate} />
                <span>
                  <strong>{candidate.name}</strong>
                  <small className="entity-row-source-line">
                    {selectedUniverseId && candidate.linkedUniverseId === selectedUniverseId ? (
                      <StatusPill tone="info" className="workspace-source-pill">
                        Current project
                      </StatusPill>
                    ) : null}
                    <StatusPill tone={candidate.unresolvedCount ? 'warning' : toneForDeckStatus(candidate.status)} className="workspace-source-pill">
                      {candidate.unresolvedCount ? 'Review' : candidate.status || 'draft'}
                    </StatusPill>
                    <span>
                      {formatCount(candidate.cardCount, 'card')} - {candidate.activeVariantName || 'Default Build'} - {[candidate.format, candidate.status].filter(Boolean).join(' - ')}
                      {candidate.candidateCount ? ` - ${candidate.candidateCount} candidates` : ''}
                      {candidate.unresolvedCount ? ` - ${candidate.unresolvedCount} unresolved` : ''}
                    </span>
                  </small>
                </span>
              </button>
            ))}
          </div>
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize decks list panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show decks panel" aria-label="Show decks panel">
          <Icon name="collapseRight" />
        </button>
      ) : null}

      <section className="workspace-canvas">
        {deck ? (
          <div className="deck-workspace">
            <div className="visual-management-header">
              <div className="deck-header-identity">
                <DeckCoverBadge metadata={deck.metadata} cards={deck.availableCards} size="large" />
                <div>
                  <h2>{deck.metadata.name}</h2>
                  <p>{formatCount(exportableEntries.reduce((total, entry) => total + entry.count, 0), 'card')} in {activeVariant?.name ?? 'Default Build'}; {formatCount(candidatePoolEntries.length, 'candidate')}</p>
                </div>
              </div>
              <div className="deck-variant-toolbar" aria-label="Deck variants">
                <label className="filter-field compact">
                  <span>Variant</span>
                  <select value={activeVariantId} onChange={(event) => setActiveVariant(event.target.value)}>
                    {deck.metadata.variants.map((variant) => (
                      <option key={variant.variantId} value={variant.variantId}>
                        {variant.name} - {variant.status}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="secondary-button compact" onClick={duplicateActiveVariant}>
                  Duplicate
                </button>
                <button type="button" className="secondary-button compact" onClick={createBlankVariant}>
                  Blank
                </button>
              </div>
              <div className="export-actions">
                <button type="button" className="secondary-button" onClick={() => setAddCardsOpen(true)}>
                  Add cards
                </button>
                <button type="button" className="secondary-button" onClick={onOpenCardBrowser}>
                  Compare
                </button>
                <button type="button" className="secondary-button" onClick={() => onOpenDashboard(deckDashboardScope(deck))}>
                  Dashboard
                </button>
                <button type="button" className="primary-button" disabled={busy || !dirty} onClick={() => void handleSaveDeck()}>
                  Save deck
                </button>
              </div>
            </div>

            <WorkModeNote mode={workMode} section="decks" />

            {deck.warnings.length > 0 ? (
              <div className="deck-warning-list">
                {deck.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {deckLegalityIssues.length > 0 ? (
              <div className="deck-legality-list">
                {deckLegalityIssues.map((issue) => (
                  <p key={`${issue.title}-${issue.detail}`} className={issue.severity}>
                    <strong>{issue.title}</strong>
                    <span>{issue.detail}</span>
                  </p>
                ))}
              </div>
            ) : null}

            <DeckLiveStatsPanel stats={deckLiveStats} onOpenDashboard={() => onOpenDashboard(deckDashboardScope(deck))} />

            <div className="deck-stat-grid compact">
              {deckMetricItems.map((item) => (
                <WorkspaceMetric key={item.label} label={item.label} value={item.value} note={item.note} icon={item.icon} />
              ))}
            </div>

            {deckRoleSummary.length ? (
              <div className="deck-role-summary" aria-label="Deck role distribution">
                {deckRoleSummary.map((row) => (
                  <span key={row.label}>
                    <strong>{row.count}</strong>
                    {row.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="deck-board-tabs" role="group" aria-label="Deck boards">
              {(['main', 'side', 'maybe'] as const).map((section) => (
                <button
                  key={section}
                  type="button"
                  aria-pressed={activeDeckSection === section}
                  className={`deck-board-tab ${activeDeckSection === section ? 'active' : ''}`}
                  onClick={() => {
                    setActiveDeckSection(section);
                    setSelectedDeckEntryIndex(null);
                  }}
                >
                  <span>{deckSectionLabel(section)}</span>
                  <strong>{deckSectionCounts[section]}</strong>
                </button>
              ))}
            </div>

            <div className="collection-table-toolbar deck-view-toolbar">
              <ListControlsBar
                searchLabel="Search deck cards"
                searchValue={deckEntryQuery}
                searchPlaceholder="Search deck cards..."
                onSearchChange={setDeckEntryQuery}
                sortControl={<SortMenu options={DECK_ENTRY_SORT_OPTIONS} state={deckEntrySortState} onChange={setDeckEntrySortState} />}
                filterControl={<AdvancedFiltersButton activeCount={activeDeckEntryFilterCount} onClick={() => setDeckEntryFiltersOpen(true)} />}
                resetControl={deckEntryQuery.trim() || activeDeckEntryFilterCount ? <button type="button" className="secondary-button compact" onClick={() => { setDeckEntryQuery(''); setDeckEntryFilters(DEFAULT_DECK_ENTRY_FILTERS); }}>Reset</button> : null}
                extraControls={<GroupedBasicLandToggle checked={groupBasicLands} onChange={setGroupBasicLands} />}
                results={<ListResultsSummary shown={visibleDeckRows.length} total={baseVisibleDeckRows.length} label="card row" />}
                viewControl={
                  <div className="segmented-control collection-view-mode segmented-icon-control deck-view-mode" role="group" aria-label="Deck view mode">
                    {DECK_VIEW_MODE_OPTIONS.map(({ mode, label, icon }) => (
                      <button key={mode} type="button" className={deckViewMode === mode ? 'active' : ''} title={`${label} view`} aria-label={`${label} view`} onClick={() => setDeckViewMode(mode)}>
                        <Icon name={icon} />
                      </button>
                    ))}
                  </div>
                }
              />
            </div>

            {deckViewMode === 'board' ? (
              <DeckSectionList
                section={activeDeckSection}
                rows={visibleDeckRows}
                selectedIndex={selectedDeckEntryIndex}
                onSelectEntry={setSelectedDeckEntryIndex}
                onPreviewEntry={setPreviewDeckEntryIndex}
              />
            ) : (
              <DeckEntryViews
                mode={deckViewMode}
                entries={visibleDeckRows}
                selectedIndex={selectedDeckEntryIndex}
                onSelectEntry={setSelectedDeckEntryIndex}
                onPreviewEntry={setPreviewDeckEntryIndex}
              />
            )}
          </div>
        ) : (
          <div className="workspace-preview-hero">
            <div className="tile-art-placeholder large">Decks</div>
            <div>
              <h2>No deck selected</h2>
              <p>Create a deck from the left panel, then add cards from the deck workspace.</p>
            </div>
          </div>
        )}
      </section>

      {showRightPanel ? <PanelResizeHandle label="Resize deck inspector panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
        <aside className="workspace-inspector-panel">
          <WorkspacePanelToolbar label="Hide deck inspector panel" icon="collapseLeft" onClick={() => onShowRightPanelChange(false)} />
          <DeckInspectorPanel
            deck={deck}
            entry={selectedDeckEntry}
            entryIndex={selectedDeckEntryIndex}
            library={library}
            deckTagSuggestions={decks.flatMap((candidate) => candidate.tags)}
            onUpdateMetadata={updateMetadata}
            onUpdateActiveVariant={updateActiveVariant}
            onUpdateEntry={updateEntry}
            onRemoveEntry={removeEntry}
            onArchiveActiveVariant={archiveActiveVariant}
            onClearEntry={() => setSelectedDeckEntryIndex(null)}
            onOpenCard={onOpenCard}
            onOpenCardBrowser={onOpenCardBrowser}
            onOpenDashboard={deck ? () => onOpenDashboard(deckDashboardScope(deck)) : () => onOpenDashboard()}
          />
        </aside>
      ) : (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show deck inspector" aria-label="Show deck inspector">
          <Icon name="collapseLeft" />
        </button>
      )}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Decks"
          subtitle="Filter deck metadata without hiding the always-visible deck search."
          resultsLabel={`${filteredDecks.length} matching decks`}
          activeFilterCount={activeDeckFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={() => setDeckFilters(defaultDeckFilters())}
          results={
            <div className="filter-result-list">
              {filteredDecks.length ? (
                filteredDecks.map((candidate) => (
                  <button key={candidate.deckId} type="button" className={`entity-row clickable ${candidate.deckId === deck?.metadata.deckId ? 'selected' : ''}`} onClick={() => { void handleSelectDeck(candidate.deckId); setFiltersOpen(false); }}>
                    <Icon name="decks" />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{formatCount(candidate.cardCount, 'card')} - {candidate.status}</small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState title="No decks match" detail="Reset filters or clear the deck search." showClearSearch={Boolean(query.trim())} showResetFilters={activeDeckFilterCount > 0} onClearSearch={() => setQuery('')} onResetFilters={() => setDeckFilters(defaultDeckFilters())} />
              )}
            </div>
          }
        >
          <div className="filter-panel">
            <label className="filter-field">
              <span>Status</span>
              <select value={deckFilters.status} onChange={(event) => setDeckFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All statuses</option>
                {DECK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Tags</span>
              <input value={deckFilters.tag} placeholder="playtest, testing labels..." onChange={(event) => setDeckFilters((current) => ({ ...current, tag: event.target.value }))} />
            </label>
            <label className="filter-field">
              <span>Play style</span>
              <input value={deckFilters.playStyle} placeholder="Aggro, Tokens, Voltron..." onChange={(event) => setDeckFilters((current) => ({ ...current, playStyle: event.target.value }))} />
            </label>
            <label className="filter-field">
              <span>Format text</span>
              <input list="deck-filter-format-options" value={deckFilters.format} placeholder="Commander, kitchen table..." onChange={(event) => setDeckFilters((current) => ({ ...current, format: event.target.value }))} />
              <datalist id="deck-filter-format-options">
                {DECK_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="filter-field">
              <span>Color identity</span>
              <select value={deckFilters.colorIdentity} onChange={(event) => setDeckFilters((current) => ({ ...current, colorIdentity: event.target.value }))}>
                <option value="all">All identities</option>
                {COLOR_IDENTITY_OPTIONS.map((identity) => (
                  <option key={identity} value={identity}>
                    {colorIdentityLabel(identity)}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Commander bracket</span>
              <select value={deckFilters.commanderBracket} onChange={(event) => setDeckFilters((current) => ({ ...current, commanderBracket: event.target.value }))}>
                <option value="all">All brackets</option>
                {COMMANDER_BRACKET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Commander</span>
              <input value={deckFilters.commander} placeholder="Atraxa, Mira..." onChange={(event) => setDeckFilters((current) => ({ ...current, commander: event.target.value }))} />
            </label>
            <label className="filter-field">
              <span>Project</span>
              <select value={deckFilters.linkedUniverseId} onChange={(event) => setDeckFilters((current) => ({ ...current, linkedUniverseId: event.target.value }))}>
                <option value="all">All projects</option>
                {(library?.universes ?? []).map((universe) => (
                  <option key={universe.id} value={universe.id}>{universe.name}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Linked set</span>
              <select value={deckFilters.linkedSetCode} onChange={(event) => setDeckFilters((current) => ({ ...current, linkedSetCode: event.target.value }))}>
                <option value="all">All sets</option>
                {(library?.sets ?? []).map((set) => (
                  <option key={set.setCode} value={set.setCode}>{set.setCode} - {set.setName}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Unresolved</span>
              <select value={deckFilters.unresolved} onChange={(event) => setDeckFilters((current) => ({ ...current, unresolved: event.target.value }))}>
                <option value="all">Any unresolved state</option>
                <option value="has">Has unresolved cards</option>
                <option value="none">No unresolved cards</option>
              </select>
            </label>
            <div className="grid-3 compact-filter-grid">
              <label className="filter-field">
                <span>Main</span>
                <input value={deckFilters.mainCount} placeholder=">=60" onChange={(event) => setDeckFilters((current) => ({ ...current, mainCount: event.target.value }))} />
              </label>
              <label className="filter-field">
                <span>Side</span>
                <input value={deckFilters.sideCount} placeholder="0" onChange={(event) => setDeckFilters((current) => ({ ...current, sideCount: event.target.value }))} />
              </label>
              <label className="filter-field">
                <span>Maybe</span>
                <input value={deckFilters.maybeCount} placeholder=">0" onChange={(event) => setDeckFilters((current) => ({ ...current, maybeCount: event.target.value }))} />
              </label>
            </div>
          </div>
        </BrowseFilterOverlay>
      ) : null}
      {deckEntryFiltersOpen ? (
        <BrowseFilterOverlay
          title="Browse Deck Cards"
          subtitle="Filter cards in the selected deck without changing deck metadata filters."
          resultsLabel={`${visibleDeckRows.length} matching deck rows`}
          activeFilterCount={activeDeckEntryFilterCount}
          onClose={() => setDeckEntryFiltersOpen(false)}
          onResetFilters={() => setDeckEntryFilters(DEFAULT_DECK_ENTRY_FILTERS)}
          results={
            <div className="filter-result-list">
              {visibleDeckRows.length ? (
                visibleDeckRows.slice(0, 80).map(({ entry, index }) => (
                  <button key={`${entry.entryId ?? ''}-${entry.setCode}-${entry.cardId}-${index}`} type="button" className={`entity-row clickable ${index === selectedDeckEntryIndex ? 'selected' : ''}`} onClick={() => { setSelectedDeckEntryIndex(index); setDeckEntryFiltersOpen(false); }}>
                    <Icon name={entry.warning || !entry.card ? 'flag' : 'cards'} />
                    <span>
                      <strong>{entry.count} {entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
                      <small>{deckSectionLabel(entry.section)} - {entry.card?.typeLine ?? entry.warning ?? entry.setCode}</small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState title="No deck cards match" detail="Reset filters or clear the deck-card search." showClearSearch={Boolean(deckEntryQuery.trim())} showResetFilters={activeDeckEntryFilterCount > 0} onClearSearch={() => setDeckEntryQuery('')} onResetFilters={() => setDeckEntryFilters(DEFAULT_DECK_ENTRY_FILTERS)} />
              )}
            </div>
          }
        >
          <DeckEntryFilterControls filters={deckEntryFilters} onChange={(patch) => setDeckEntryFilters((current) => ({ ...current, ...patch }))} />
        </BrowseFilterOverlay>
      ) : null}
      {addCardsOpen && deck ? (
        <DeckAddCardsOverlay
          deck={deck}
          onAddCard={addCard}
          onAddCollectionEntry={addCollectionCard}
          onStatus={onStatus}
          onClose={() => setAddCardsOpen(false)}
        />
      ) : null}
      {deck && previewDeckEntry ? (
        <DeckCardPreviewOverlay
          deck={deck}
          entry={previewDeckEntry}
          entryIndex={previewDeckEntryIndex ?? -1}
          onUpdateEntry={updateEntry}
          onRemoveEntry={removeEntry}
          onOpenCard={onOpenCard}
          onStatus={onStatus}
          onClose={() => setPreviewDeckEntryIndex(null)}
        />
      ) : null}
    </div>
  );
}

function DeckSectionList({
  section,
  rows,
  selectedIndex,
  onSelectEntry,
  onPreviewEntry
}: {
  section: DeckEntry['section'];
  rows: Array<{ entry: DeckState['entries'][number]; index: number }>;
  selectedIndex: number | null;
  onSelectEntry: (index: number) => void;
  onPreviewEntry: (index: number) => void;
}) {
  const sectionEntries = rows.filter(({ entry }) => entry.section === section);
  const total = sectionEntries.reduce((sum, { entry }) => sum + entry.count, 0);
  return (
    <section className="deck-section">
      <div className="deck-section-heading">
        <h3>{deckSectionLabel(section)}</h3>
        <span>{formatCount(total, 'card')}</span>
      </div>
      {sectionEntries.length === 0 ? <p className="workspace-copy">No cards in this section.</p> : null}
      <div className="deck-entry-list">
        {sectionEntries.map(({ entry, index }) => (
          <div key={`${entry.setCode}-${entry.cardId}-${index}`} className="deck-entry-row-shell">
            <button type="button" className={`deck-entry-row compact ${entry.warning ? 'unresolved' : ''} ${selectedIndex === index ? 'selected' : ''}`} onClick={() => onSelectEntry(index)}>
              <span className="deck-entry-count">{entry.count}</span>
              <DeckEntryThumb entry={entry} />
              <span className="deck-entry-name">
                <strong>{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
                <small>{entry.warning ?? `${entry.setCode} - ${entry.card?.typeLine ?? entry.cardId}${entry.variantId ? ` / ${entry.variantId}` : ''}${entry.candidateStatus && entry.candidateStatus !== 'active' ? ` - ${candidateStatusLabel(entry.candidateStatus)}` : ''}${entry.roles?.length ? ` - ${entry.roles.map(deckRoleLabel).join(', ')}` : ''}`}</small>
              </span>
            </button>
            <button type="button" className="icon-button deck-entry-view-button" title={`Preview ${entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}`} aria-label={`Preview ${entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}`} onClick={() => onPreviewEntry(index)}>
              <Icon name="view" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeckEntryThumb({ entry }: { entry: DeckState['entries'][number] }) {
  const metadata = metadataFromDeckCard(entry.card);
  const imageSrc = imageUrlForMetadata(metadata, 'small');
  const fallback = entry.card?.name ?? entry.nameSnapshot ?? entry.cardId;
  return (
    <span className={`deck-entry-thumb ${imageSrc ? 'has-art' : ''}`} aria-hidden="true">
      {imageSrc ? <img src={imageSrc} alt="" loading="lazy" /> : <span>{fallback.slice(0, 2).toUpperCase()}</span>}
    </span>
  );
}

function DeckEntryFilterControls({ filters, onChange }: { filters: DeckEntryFilters; onChange: (patch: Partial<DeckEntryFilters>) => void }) {
  return (
    <div className="filter-panel">
      <label className="filter-field">
        <span>Board</span>
        <select value={filters.section} onChange={(event) => onChange({ section: event.target.value as DeckEntryFilters['section'] })}>
          <option value="all">All boards</option>
          <option value="main">Main board</option>
          <option value="side">Sideboard</option>
          <option value="maybe">Maybeboard</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Status</span>
        <select value={filters.candidateStatus} onChange={(event) => onChange({ candidateStatus: event.target.value as DeckEntryFilters['candidateStatus'] })}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="candidate">Candidate</option>
          <option value="testing">Testing</option>
          <option value="locked">Locked</option>
          <option value="cut">Cut</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Role</span>
        <input value={filters.role} placeholder="Ramp, Draw, Removal..." onChange={(event) => onChange({ role: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Color</span>
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
        <span>Mana value</span>
        <input value={filters.manaValue} placeholder="2, >=4, <3..." onChange={(event) => onChange({ manaValue: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Card type</span>
        <select value={filters.cardType} onChange={(event) => onChange({ cardType: event.target.value })}>
          <option value="all">All card types</option>
          <option value="Artifact">Artifact</option>
          <option value="Creature">Creature</option>
          <option value="Enchantment">Enchantment</option>
          <option value="Instant">Instant</option>
          <option value="Land">Land</option>
          <option value="Planeswalker">Planeswalker</option>
          <option value="Sorcery">Sorcery</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Tags / flags</span>
        <input value={filters.tag} placeholder="combo, meta call..." onChange={(event) => onChange({ tag: event.target.value })} />
      </label>
      <label className="filter-field">
        <span>Unresolved</span>
        <select value={filters.unresolved} onChange={(event) => onChange({ unresolved: event.target.value as DeckEntryFilters['unresolved'] })}>
          <option value="all">Any state</option>
          <option value="has">Unresolved only</option>
          <option value="none">Resolved only</option>
        </select>
      </label>
    </div>
  );
}

function filterDeckEntryRows(rows: Array<{ entry: DeckState['entries'][number]; index: number }>, query: string, filters: DeckEntryFilters): Array<{ entry: DeckState['entries'][number]; index: number }> {
  const needle = query.trim().toLowerCase();
  return rows.filter(({ entry }) => {
    const searchable = [
      entry.card?.name,
      entry.nameSnapshot,
      entry.cardId,
      entry.setCode,
      entry.card?.typeLine,
      entry.card?.oracleText,
      entry.entryNotes,
      ...(entry.roles ?? []),
      ...(entry.entryTags ?? []),
      ...(entry.flags ?? []),
      ...(entry.card?.tags ?? [])
    ].filter(Boolean).join(' ').toLowerCase();
    const status = entry.candidateStatus ?? 'active';
    const unresolved = Boolean(entry.warning || !entry.card);
    const color = entry.card?.colorIdentity ?? entry.card?.colors ?? '';
    const typeLine = entry.card?.typeLine ?? '';
    return (
      (!needle || searchable.includes(needle)) &&
      (filters.section === 'all' || entry.section === filters.section) &&
      (filters.candidateStatus === 'all' || status === filters.candidateStatus) &&
      matchesTagFilter(entry.roles, filters.role) &&
      (filters.color === 'all' || deckColorMatches(color, filters.color)) &&
      matchesNumberQuery(deckEntryManaValue(entry), filters.manaValue) &&
      (filters.cardType === 'all' || typeLine.toLowerCase().includes(filters.cardType.toLowerCase())) &&
      matchesTagFilter([...(entry.entryTags ?? []), ...(entry.flags ?? []), ...(entry.card?.tags ?? [])], filters.tag) &&
      (filters.unresolved === 'all' || (filters.unresolved === 'has' ? unresolved : !unresolved))
    );
  });
}

function groupBasicLandDeckRows(rows: Array<{ entry: DeckState['entries'][number]; index: number }>): Array<{ entry: DeckState['entries'][number]; index: number }> {
  const grouped = new Map<string, { entry: DeckState['entries'][number]; index: number }>();
  const output: Array<{ entry: DeckState['entries'][number]; index: number }> = [];
  for (const row of rows) {
    const name = row.entry.card?.name ?? row.entry.nameSnapshot;
    const typeLine = row.entry.card?.typeLine;
    const key = basicLandGroupKey(name, typeLine);
    if (!key) {
      output.push(row);
      continue;
    }
    const existing = grouped.get(key);
    if (existing) {
      existing.entry = { ...existing.entry, count: existing.entry.count + row.entry.count };
      continue;
    }
    const copy = { entry: { ...row.entry }, index: row.index };
    grouped.set(key, copy);
    output.push(copy);
  }
  return output;
}

function deckEntryManaValue(entry: DeckState['entries'][number]): number {
  return entry.card?.manaValue ?? parseManaValue(entry.card?.manaCost ?? '') ?? 0;
}

function deckColorMatches(colors: string, filter: string): boolean {
  const normalized = String(colors ?? '').toUpperCase();
  if (filter === 'colorless') {
    return !normalized || normalized === 'C';
  }
  if (filter === 'multicolor') {
    return normalized.replace(/[^WUBRG]/g, '').length > 1;
  }
  return normalized.includes(filter.toUpperCase());
}

function parseManaValue(manaCost: string): number | undefined {
  if (!manaCost.trim()) {
    return undefined;
  }
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
  return symbol.trim().toUpperCase() === 'X' ? 0 : 1;
}

function deckSectionLabel(section: DeckEntry['section']): string {
  if (section === 'side') {
    return 'Sideboard';
  }
  if (section === 'maybe') {
    return 'Maybeboard';
  }
  return 'Main board';
}

function candidateStatusLabel(value: DeckEntry['candidateStatus']): string {
  if (value === 'candidate') {
    return 'Candidate';
  }
  if (value === 'testing') {
    return 'Testing';
  }
  if (value === 'locked') {
    return 'Locked';
  }
  if (value === 'cut') {
    return 'Cut';
  }
  return 'Active';
}

function deckRoleLabel(role: string): string {
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
  const normalized = role.toLowerCase().replace(/[\s-]+/g, '_');
  return labels[normalized] ?? normalized.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function deckCardReferenceValue(reference?: DeckMetadata['commander']): string {
  if (!reference) {
    return '';
  }
  return `${reference.setCode}::${reference.cardId}::${reference.variantId ?? ''}`;
}

function deckCardReferenceFromValue(deck: DeckState, value: string): DeckMetadata['commander'] | undefined {
  if (!value) {
    return undefined;
  }
  const [setCode = '', cardId = '', variantId = ''] = value.split('::');
  const card = deck.availableCards.find((candidate) => candidate.setCode === setCode && candidate.cardId === cardId);
  if (!card) {
    return undefined;
  }
  return {
    setCode: card.setCode,
    cardId: card.cardId,
    variantId: variantId || card.variants.find((variant) => variant.isPrimary)?.variantId,
    nameSnapshot: card.name
  };
}

function deckCardOptionValue(card: DeckCardOption): string {
  return `${card.setCode}::${card.cardId}::${card.variants.find((variant) => variant.isPrimary)?.variantId ?? ''}`;
}

function deckCardOptionLabel(card: DeckCardOption): string {
  return `${card.name} - ${card.setCode} ${card.collectorNumber}`;
}

function colorIdentityLabel(identity: string): string {
  if (identity === 'C') {
    return 'C - Colorless';
  }
  if (identity === 'WUBRG') {
    return 'WUBRG - Five color';
  }
  return identity;
}

function DeckCommanderSlots({ deck }: { deck: DeckState }) {
  const commander = deck.metadata.commander;
  const partner = deck.metadata.partnerCommanders[0];
  const cover = deck.metadata.coverCard ?? commander;
  const slots = [{ label: 'Commander', value: commander?.nameSnapshot ?? 'Set in inspector' }];
  if (partner?.nameSnapshot) {
    slots.push({ label: 'Partner', value: partner.nameSnapshot });
  }
  if (cover?.nameSnapshot && cover.nameSnapshot !== commander?.nameSnapshot) {
    slots.push({ label: 'Cover', value: cover.nameSnapshot });
  }
  return (
    <div className="deck-commander-slots" aria-label="Commander and cover slots">
      {slots.map((slot) => (
        <div key={slot.label} className={!slot.value || slot.value === 'Set in inspector' ? 'empty' : ''}>
          <span>{slot.label}</span>
          <strong>{slot.value}</strong>
        </div>
      ))}
    </div>
  );
}

function DeckInspectorPanel({
  deck,
  entry,
  entryIndex,
  library,
  deckTagSuggestions,
  onUpdateMetadata,
  onUpdateActiveVariant,
  onUpdateEntry,
  onRemoveEntry,
  onArchiveActiveVariant,
  onClearEntry,
  onOpenCard,
  onOpenCardBrowser,
  onOpenDashboard
}: {
  deck: DeckState | null;
  entry?: DeckState['entries'][number];
  entryIndex: number | null;
  library: LibraryState | null;
  deckTagSuggestions: string[];
  onUpdateMetadata: (next: Partial<DeckMetadata>) => void;
  onUpdateActiveVariant: (next: Partial<DeckState['variants'][number]>) => void;
  onUpdateEntry: (index: number, next: Partial<DeckEntry>) => void;
  onRemoveEntry: (index: number) => void;
  onArchiveActiveVariant: () => void;
  onClearEntry: () => void;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onOpenCardBrowser: () => void;
  onOpenDashboard: () => void;
}) {
  if (!deck) {
    return (
      <div className="workspace-card">
        <h2>Deck Inspector</h2>
        <p className="workspace-copy">Choose a deck from the left panel.</p>
      </div>
    );
  }

  if (entry && entryIndex !== null) {
    return (
      <div className="workspace-card deck-inspector-panel">
        <div className="inspector-heading-row">
          <div>
            <h2>Deck Entry Inspector</h2>
            <p className="workspace-copy">{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClearEntry}>
            Deck Inspector
          </button>
        </div>
        <Field label="Count">
          <input type="number" min="1" value={entry.count} onChange={(event) => onUpdateEntry(entryIndex, { count: Number(event.target.value) })} />
        </Field>
        <Field label="Board">
          <select value={entry.section} onChange={(event) => onUpdateEntry(entryIndex, { section: event.target.value as DeckEntry['section'] })}>
            <option value="main">Main</option>
            <option value="side">Sideboard</option>
            <option value="maybe">Maybeboard</option>
          </select>
        </Field>
        <Field label="Candidate status">
          <select value={entry.candidateStatus ?? 'active'} onChange={(event) => onUpdateEntry(entryIndex, { candidateStatus: event.target.value as DeckEntry['candidateStatus'] })}>
            <option value="active">Active</option>
            <option value="candidate">Candidate</option>
            <option value="testing">Testing</option>
            <option value="locked">Locked</option>
            <option value="cut">Cut</option>
          </select>
        </Field>
        {entry.card?.variants.length ? (
          <Field label="Variant">
            <select value={entry.variantId ?? entry.card.variants.find((variant) => variant.isPrimary)?.variantId ?? ''} onChange={(event) => onUpdateEntry(entryIndex, { variantId: event.target.value || undefined })}>
              {entry.card.variants.map((variant) => (
                <option key={variant.variantId} value={variant.variantId}>
                  {variant.isPrimary ? '* ' : ''}{variant.displayName}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Role in deck">
          <TagEditor
            value={entry.roles ?? []}
            suggestions={DECK_ROLE_SUGGESTIONS}
            placeholder="Ramp, Draw, Removal..."
            ariaLabel="Deck entry roles"
            onChange={(roles) => onUpdateEntry(entryIndex, { roles, roleSource: 'manual', roleConfidence: 1 })}
          />
        </Field>
        <div className="grid-3 compact-filter-grid">
          <Field label="Impact">
            <input type="number" min="0" max="5" value={entry.impactRating ?? 0} onChange={(event) => onUpdateEntry(entryIndex, { impactRating: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} />
          </Field>
          <Field label="Synergy">
            <input type="number" min="0" max="5" value={entry.synergyRating ?? 0} onChange={(event) => onUpdateEntry(entryIndex, { synergyRating: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} />
          </Field>
          <Field label="Quality">
            <input type="number" min="0" max="5" value={entry.qualityRating ?? 0} onChange={(event) => onUpdateEntry(entryIndex, { qualityRating: Math.max(0, Math.min(5, Number(event.target.value) || 0)) })} />
          </Field>
        </div>
        <Field label="Entry tags">
          <TagEditor value={entry.entryTags ?? []} suggestions={deckTagSuggestions} placeholder="combo, meta call..." ariaLabel="Deck entry tags" onChange={(entryTags) => onUpdateEntry(entryIndex, { entryTags })} />
        </Field>
        <Field label="Flags">
          <TagEditor value={entry.flags ?? []} suggestions={['off-plan', 'needs testing', 'too slow', 'budget cut', 'upgrade target']} placeholder="off-plan, needs testing..." ariaLabel="Deck entry flags" onChange={(flags) => onUpdateEntry(entryIndex, { flags })} />
        </Field>
        <Field label="Synergy notes">
          <textarea value={entry.entryNotes ?? ''} rows={4} onChange={(event) => onUpdateEntry(entryIndex, { entryNotes: event.target.value || undefined })} />
        </Field>
        <Field label="Name snapshot">
          <input value={entry.nameSnapshot ?? entry.card?.name ?? ''} onChange={(event) => onUpdateEntry(entryIndex, { nameSnapshot: event.target.value || undefined })} />
        </Field>
        <div className="collection-detail-grid">
          <div className="readonly-line">
            <strong>Set</strong>
            <span>{entry.setCode}</span>
          </div>
          <div className="readonly-line">
            <strong>Card ID</strong>
            <span>{entry.cardId}</span>
          </div>
          <div className="readonly-line">
            <strong>Role source</strong>
            <span>{entry.roleSource ?? 'none'}{entry.roleConfidence ? ` - ${Math.round(entry.roleConfidence * 100)}%` : ''}</span>
          </div>
        </div>
        <div className="export-actions">
          <button
            type="button"
            className={`icon-button deck-entry-star-button ${entry.starred ? 'active' : ''}`}
            aria-label={entry.starred ? 'Unstar deck entry' : 'Star deck entry'}
            aria-pressed={Boolean(entry.starred)}
            title={entry.starred ? 'Unstar' : 'Star'}
            onClick={() => onUpdateEntry(entryIndex, { starred: !entry.starred })}
          >
            <Icon name="star" />
          </button>
          <button type="button" className="secondary-button" onClick={() => onUpdateEntry(entryIndex, { markedForDeletion: !entry.markedForDeletion, candidateStatus: entry.markedForDeletion ? entry.candidateStatus : 'cut' })}>
            {entry.markedForDeletion ? 'Keep' : 'Mark delete'}
          </button>
          {entry.card ? (
            <button type="button" className="secondary-button" onClick={() => void onOpenCard(entry.setCode, entry.cardId, entry.variantId)}>
              Open in Maker
            </button>
          ) : null}
          <button type="button" className="secondary-button danger" onClick={() => onRemoveEntry(entryIndex)}>
            Remove
          </button>
        </div>
      </div>
    );
  }

  const deckCardOptions = deck.availableCards;
  const commanderValue = deckCardReferenceValue(deck.metadata.commander);
  const partnerValue = deckCardReferenceValue(deck.metadata.partnerCommanders[0]);
  const coverValue = deckCardReferenceValue(deck.metadata.coverCard ?? deck.metadata.commander);
  const playStyleSuggestions = [...DECK_PLAY_STYLE_SUGGESTIONS, ...deckTagSuggestions, ...deck.availableCards.flatMap((card) => card.tags)];
  const currentVariant = deck.metadata.variants.find((variant) => variant.variantId === activeDeckVariantId(deck)) ?? deck.activeVariant;

  return (
    <div className="workspace-card deck-inspector-panel">
      <h2>Deck Inspector</h2>
      <p className="workspace-copy">Edit deck metadata, or select a card row in the center to edit that entry.</p>
      <div className="inspector-heading-row">
        <div>
          <strong>{currentVariant?.name ?? 'Default Build'}</strong>
          <p className="workspace-copy">{currentVariant?.status ?? 'draft'} variant</p>
        </div>
        <div className="export-actions">
          <button type="button" className="secondary-button compact" onClick={onOpenCardBrowser}>
            Compare
          </button>
          <button type="button" className="secondary-button compact" onClick={onOpenDashboard}>
            Dashboard
          </button>
        </div>
      </div>
      <DeckCommanderSlots deck={deck} />
      <Field label="Variant name">
        <input value={currentVariant?.name ?? ''} onChange={(event) => onUpdateActiveVariant({ name: event.target.value || 'Untitled Variant' })} />
      </Field>
      <div className="grid-2">
        <Field label="Variant status">
          <select value={currentVariant?.status ?? 'draft'} onChange={(event) => onUpdateActiveVariant({ status: event.target.value as DeckState['variants'][number]['status'] })}>
            <option value="draft">Draft</option>
            <option value="testing">Testing</option>
            <option value="locked">Locked</option>
            <option value="final">Final</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Variant identity">
          <select value={currentVariant?.colorIdentity ?? ''} onChange={(event) => onUpdateActiveVariant({ colorIdentity: event.target.value || undefined })}>
            <option value="">Use deck identity</option>
            {COLOR_IDENTITY_OPTIONS.map((identity) => (
              <option key={identity} value={identity}>
                {colorIdentityLabel(identity)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid-2">
        <Field label="Variant commander">
          <select value={deckCardReferenceValue(currentVariant?.commander)} onChange={(event) => onUpdateActiveVariant({ commander: deckCardReferenceFromValue(deck, event.target.value) })}>
            <option value="">Use deck commander</option>
            {deckCardOptions.map((card) => (
              <option key={`variant-commander-${deckCardOptionValue(card)}`} value={deckCardOptionValue(card)}>
                {deckCardOptionLabel(card)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Variant partner">
          <select
            value={deckCardReferenceValue(currentVariant?.partnerCommanders?.[0])}
            onChange={(event) => {
              const partner = deckCardReferenceFromValue(deck, event.target.value);
              onUpdateActiveVariant({ partnerCommanders: partner ? [partner] : [] });
            }}
          >
            <option value="">Use deck partner</option>
            {deckCardOptions.map((card) => (
              <option key={`variant-partner-${deckCardOptionValue(card)}`} value={deckCardOptionValue(card)}>
                {deckCardOptionLabel(card)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Variant tags">
        <TagEditor value={currentVariant?.tags ?? []} suggestions={[...DECK_PLAY_STYLE_SUGGESTIONS, ...deckTagSuggestions]} placeholder="budget, testing, cEDH..." ariaLabel="Deck variant tags" onChange={(tags) => onUpdateActiveVariant({ tags })} />
      </Field>
      <Field label="Variant notes">
        <textarea value={currentVariant?.notes ?? ''} rows={3} onChange={(event) => onUpdateActiveVariant({ notes: event.target.value || undefined })} />
      </Field>
      <button type="button" className="secondary-button danger" disabled={deck.metadata.variants.length <= 1} onClick={onArchiveActiveVariant}>
        Archive variant
      </button>
      <Field label="Name">
        <input value={deck.metadata.name} onChange={(event) => onUpdateMetadata({ name: event.target.value })} />
      </Field>
      <Field label="Format">
        <input list="deck-format-options" value={deck.metadata.format ?? ''} placeholder="Commander, Modern, Kitchen Table..." onChange={(event) => onUpdateMetadata({ format: event.target.value })} />
        <datalist id="deck-format-options">
          {DECK_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label="Play style">
        <TagEditor value={deck.metadata.playStyleTags} suggestions={playStyleSuggestions} placeholder="Aggro, Control, Tokens..." ariaLabel="Deck play style tags" onChange={(playStyleTags) => onUpdateMetadata({ playStyleTags })} />
      </Field>
      <div className="grid-2">
        <Field label="Color identity">
          <select value={deck.metadata.colorIdentity ?? ''} onChange={(event) => onUpdateMetadata({ colorIdentity: event.target.value || undefined })}>
            <option value="">Unset</option>
            {COLOR_IDENTITY_OPTIONS.map((identity) => (
              <option key={identity} value={identity}>
                {colorIdentityLabel(identity)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Commander bracket">
          <select value={deck.metadata.commanderBracket ?? ''} onChange={(event) => onUpdateMetadata({ commanderBracket: event.target.value || undefined })}>
            <option value="">None</option>
            {COMMANDER_BRACKET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Commander">
        <select
          value={commanderValue}
          onChange={(event) => {
            const previousCommanderValue = deckCardReferenceValue(deck.metadata.commander);
            const nextCommander = deckCardReferenceFromValue(deck, event.target.value);
            const currentCoverValue = deckCardReferenceValue(deck.metadata.coverCard);
            const shouldUseCommanderCover = !currentCoverValue || currentCoverValue === previousCommanderValue;
            onUpdateMetadata({ commander: nextCommander, coverCard: shouldUseCommanderCover ? nextCommander : deck.metadata.coverCard });
          }}
        >
          <option value="">No commander</option>
          {deckCardOptions.map((card) => (
            <option key={deckCardOptionValue(card)} value={deckCardOptionValue(card)}>
              {deckCardOptionLabel(card)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid-2">
        <Field label="Partner / second commander">
          <select
            value={partnerValue}
            onChange={(event) => {
              const partner = deckCardReferenceFromValue(deck, event.target.value);
              onUpdateMetadata({ partnerCommanders: partner ? [partner] : [] });
            }}
          >
            <option value="">None</option>
            {deckCardOptions.map((card) => (
              <option key={deckCardOptionValue(card)} value={deckCardOptionValue(card)}>
                {deckCardOptionLabel(card)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cover card">
          <select value={coverValue} onChange={(event) => onUpdateMetadata({ coverCard: deckCardReferenceFromValue(deck, event.target.value) })}>
            <option value="">{deck.metadata.commander ? 'Use commander' : 'No cover card'}</option>
            {deckCardOptions.map((card) => (
              <option key={deckCardOptionValue(card)} value={deckCardOptionValue(card)}>
                {deckCardOptionLabel(card)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea value={deck.metadata.description ?? ''} rows={3} onChange={(event) => onUpdateMetadata({ description: event.target.value || undefined })} />
      </Field>
      <Field label="Status">
        <select value={deck.metadata.status} onChange={(event) => onUpdateMetadata({ status: event.target.value as DeckMetadata['status'] })}>
          {DECK_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tags">
        <TagEditor value={deck.metadata.tags} suggestions={deckTagSuggestions} placeholder="project notes, testing labels..." ariaLabel="Deck tags" onChange={(tags) => onUpdateMetadata({ tags })} />
      </Field>
      <Field label="Linked project">
        <select value={deck.metadata.linkedUniverseId ?? ''} onChange={(event) => onUpdateMetadata({ linkedUniverseId: event.target.value || undefined })}>
          <option value="">None</option>
          {(library?.universes ?? []).map((universe) => (
            <option key={universe.id} value={universe.id}>
              {universe.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Linked set">
        <select value={deck.metadata.linkedSetCode ?? ''} onChange={(event) => onUpdateMetadata({ linkedSetCode: event.target.value || undefined })}>
          <option value="">None</option>
          {(library?.sets ?? []).map((set) => (
            <option key={set.setCode} value={set.setCode}>
              {set.setCode} - {set.setName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea value={deck.metadata.notes ?? ''} rows={6} onChange={(event) => onUpdateMetadata({ notes: event.target.value })} />
      </Field>
    </div>
  );
}

function ReferenceWorkspace({
  library,
  project,
  activeCardId,
  selectedUniverseId,
  referenceCatalog,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onProjectLoaded,
  onReferenceCatalogUpdated,
  onOpenCard,
  onOpenCardBrowser,
  onStatus
}: Pick<
  WorkspaceViewProps,
  | 'library'
  | 'project'
  | 'activeCardId'
  | 'selectedUniverseId'
  | 'referenceCatalog'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onProjectLoaded'
  | 'onReferenceCatalogUpdated'
  | 'onOpenCard'
  | 'onOpenCardBrowser'
  | 'onStatus'
>) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ReferenceCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<ReferenceMode>('terms');
  const [ruleKind, setRuleKind] = useState<ReferenceRuleKind | 'all'>('all');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [termFilters, setTermFilters] = useState<ReferenceTermFilters>(defaultReferenceTermFilters);
  const [ruleFilters, setRuleFilters] = useState<ReferenceRuleFilters>(defaultReferenceRuleFilters);
  const [termSort, setTermSort] = useState<ReferenceTermSort>('auto');
  const [ruleSort, setRuleSort] = useState<ReferenceRuleSort>('auto');
  const [createOpen, setCreateOpen] = useState(false);
  const [officialView, setOfficialView] = useState<OfficialCardCatalogView>('prints');
  const [officialBrowserView, setOfficialBrowserView] = useState<OfficialCardBrowserViewMode>('single');
  const [officialDetailMode, setOfficialDetailMode] = useState<OfficialCardDetailMode>('full');
  const [officialFilters, setOfficialFilters] = useState<OfficialCardBrowserFilters>(DEFAULT_OFFICIAL_CARD_FILTERS);
  const [officialSort, setOfficialSort] = useState<OfficialCardSortOptionId>('auto');
  const [officialStatus, setOfficialStatus] = useState<OfficialCardCatalogStatus | null>(null);
  const [officialResult, setOfficialResult] = useState<OfficialCardSearchResult | null>(null);
  const [officialVariants, setOfficialVariants] = useState<OfficialCardPrintVariantsResult | null>(null);
  const [officialVariantsOpen, setOfficialVariantsOpen] = useState(false);
  const [officialVariantsLoading, setOfficialVariantsLoading] = useState(false);
  const [officialVariantQuery, setOfficialVariantQuery] = useState('');
  const [officialVariantOffset, setOfficialVariantOffset] = useState(0);
  const [officialOffset, setOfficialOffset] = useState(0);
  const [selectedOfficialId, setSelectedOfficialId] = useState('');
  const [selectedOfficialVariant, setSelectedOfficialVariant] = useState<OfficialCardSearchCard | null>(null);
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialSyncing, setOfficialSyncing] = useState(false);
  const [officialAutoSyncStarted, setOfficialAutoSyncStarted] = useState(false);
  const [officialAction, setOfficialAction] = useState<OfficialCardActionTarget>('');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [officialCollectionId, setOfficialCollectionId] = useState('');
  const [officialCollectionName, setOfficialCollectionName] = useState('Official Cards');
  const [officialOwnerName, setOfficialOwnerName] = useState('Kyle');
  const [officialDeckId, setOfficialDeckId] = useState('');
  const [officialDeckSection, setOfficialDeckSection] = useState<'main' | 'side' | 'maybe'>('main');
  const [officialSetCode, setOfficialSetCode] = useState(project?.setCode ?? library?.sets[0]?.setCode ?? '');
  const [officialQuantity, setOfficialQuantity] = useState(1);
  const officialSyncSettings = useMemo(() => readOfficialCardSyncSettings(), []);
  const terms = referenceCatalog?.terms ?? [];
  const rules = referenceCatalog?.rules?.entries ?? [];
  const termById = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);
  const usageIndex = useMemo(() => buildReferenceUsageIndex({ terms, project, library, activeCardId }), [activeCardId, library, project, terms]);
  const sourceLabelById = useMemo(() => new Map<string, string>((referenceCatalog?.sources ?? []).map((source) => [source.id, source.label])), [referenceCatalog?.sources]);
  const termFilterOptions = useMemo(() => {
    const options = buildReferenceTermFilterOptions(terms, usageIndex);
    return {
      ...options,
      sources: options.sources.map((source) => ({ ...source, label: sourceLabelById.get(source.value) ?? source.label }))
    };
  }, [sourceLabelById, terms, usageIndex]);
  const ruleFilterOptions = useMemo(() => buildReferenceRuleFilterOptions(rules), [rules]);
  const activeOfficialFilterCount = officialCardActiveFilterCount(officialFilters);
  const activeReferenceFilterCount = mode === 'terms' ? activeReferenceTermFilterCount(category, termFilters) : mode === 'rules' ? activeReferenceRuleFilterCount(ruleKind, ruleFilters) : activeOfficialFilterCount;
  const activeCardLabel = usageIndex.cardOptions.find((card) => card.value === activeCardId)?.label ?? '';
  const officialSortOption = officialCardSortOption(officialSort);
  const officialSearchFilters = useMemo(
    () =>
      officialCardSearchFiltersFromBrowser({
        view: officialView,
        query,
        filters: officialFilters,
        sortOptionId: officialSort,
        limit: REFERENCE_OFFICIAL_PAGE_SIZE,
        offset: officialOffset
      }),
    [officialFilters, officialOffset, officialSort, officialView, query]
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<ReferenceCategory | 'all', number>([['all', terms.length]]);
    for (const term of terms) {
      counts.set(term.category, (counts.get(term.category) ?? 0) + 1);
    }
    return counts;
  }, [terms]);
  const ruleCounts = useMemo(() => {
    const counts = new Map<ReferenceRuleKind | 'all', number>([['all', rules.length]]);
    for (const rule of rules) {
      counts.set(rule.kind, (counts.get(rule.kind) ?? 0) + 1);
    }
    return counts;
  }, [rules]);
  const filteredTerms = useMemo(() => {
    return sortReferenceTerms(filterReferenceTerms({ terms, category, query, filters: termFilters, usageIndex }), termSort, query);
  }, [category, query, termFilters, termSort, terms, usageIndex]);
  const filteredRules = useMemo(() => {
    return sortReferenceRules(filterReferenceRules({ rules, ruleKind, query, filters: ruleFilters, termById }), ruleSort, query);
  }, [query, ruleFilters, ruleKind, ruleSort, rules, termById]);
  const displayedTerms = filteredTerms.slice(0, 240);
  const displayedRules = filteredRules.slice(0, 240);
  const officialCards = officialResult?.cards ?? [];
  const selected = displayedTerms.find((term) => term.id === selectedId) ?? displayedTerms[0];
  const selectedRule = displayedRules.find((rule) => rule.id === selectedRuleId) ?? displayedRules[0];
  const selectedOfficialBase = officialCards.find((card) => card.id === selectedOfficialId) ?? officialCards[0];
  const selectedOfficial = selectedOfficialVariant ?? selectedOfficialBase;
  const selectedUsage = selected ? termUsageMatches(selected.id, usageIndex) : [];
  const ownerSuggestions = useMemo(() => collectionOwnerSuggestions(collections.flatMap((collection) => collection.ownerNames ?? [])), [collections]);
  const officialShowingStart = officialResult?.total ? officialResult.offset + 1 : 0;
  const officialShowingEnd = officialResult ? Math.min(officialResult.offset + officialResult.cards.length, officialResult.total) : 0;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchOfficialCardStatus().catch((error: unknown) => {
        onStatus(error instanceof Error ? error.message : String(error));
        return null;
      }),
      fetchCollections().catch((error: unknown) => {
        onStatus(error instanceof Error ? error.message : String(error));
        return [] as CollectionSummary[];
      }),
      fetchDecks().catch((error: unknown) => {
        onStatus(error instanceof Error ? error.message : String(error));
        return [] as DeckSummary[];
      })
    ]).then(([status, loadedCollections, loadedDecks]) => {
      if (!cancelled) {
        setOfficialStatus(status);
        setCollections(loadedCollections);
        setDecks(loadedDecks);
        setOfficialCollectionId(loadedCollections[0]?.collectionId ?? '');
        setOfficialDeckId(loadedDecks[0]?.deckId ?? '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  useEffect(() => {
    setOfficialOffset(0);
  }, [officialFilters, officialSort, officialView, query]);

  useEffect(() => {
    setOfficialVariantOffset(0);
  }, [officialVariantQuery, selectedOfficial?.id]);

  useEffect(() => {
    if (!officialVariantsOpen || !selectedOfficial) {
      return;
    }
    let cancelled = false;
    setOfficialVariantsLoading(true);
    void fetchOfficialCardVariants({
      cardId: selectedOfficial.view === 'prints' ? selectedOfficial.id : undefined,
      oracleId: selectedOfficial.oracleId,
      variantKey: selectedOfficial.variantKey,
      name: selectedOfficial.name,
      query: officialVariantQuery,
      limit: REFERENCE_OFFICIAL_VARIANT_PAGE_SIZE,
      offset: officialVariantOffset
    })
      .then((result) => {
        if (!cancelled) {
          setOfficialVariants(result);
          setOfficialStatus(result.status);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOfficialVariants(null);
          onStatus(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOfficialVariantsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [officialVariantOffset, officialVariantQuery, officialVariantsOpen, onStatus, selectedOfficial]);

  useEffect(() => {
    if (!officialSetCode) {
      setOfficialSetCode(project?.setCode ?? library?.sets[0]?.setCode ?? '');
    }
  }, [library?.sets, officialSetCode, project?.setCode]);

  useEffect(() => {
    if (mode !== 'official-cards') {
      return;
    }
    let cancelled = false;
    setOfficialLoading(true);
    void searchOfficialCardCatalog(officialSearchFilters)
      .then((result) => {
        if (!cancelled) {
          setOfficialResult(result);
          setOfficialStatus(result.status);
          setSelectedOfficialVariant(null);
          setSelectedOfficialId((current) => current && result.cards.some((card) => card.id === current) ? current : result.cards[0]?.id ?? '');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
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
  }, [mode, officialSearchFilters, onStatus]);

  useEffect(() => {
    if (mode !== 'official-cards' || officialAutoSyncStarted || officialSyncing || !officialStatus) {
      return;
    }
    if (!shouldAutoSyncOfficialCards(officialStatus, officialSyncSettings)) {
      return;
    }
    setOfficialAutoSyncStarted(true);
    onStatus('Official card catalog is missing; syncing live in the background. This can take a few minutes the first time.');
    void syncOfficialCards();
  }, [mode, officialAutoSyncStarted, officialStatus, officialSyncSettings, officialSyncing, onStatus]);

  const resetTermFilters = () => {
    setCategory('all');
    setTermFilters(defaultReferenceTermFilters);
  };
  const resetRuleFilters = () => {
    setRuleKind('all');
    setRuleFilters(defaultReferenceRuleFilters);
  };
  const resetOfficialFilters = () => {
    setOfficialFilters(DEFAULT_OFFICIAL_CARD_FILTERS);
    setOfficialSort('auto');
    setQuery('');
  };
  const selectOfficialCard = (id: string) => {
    setSelectedOfficialId(id);
    setSelectedOfficialVariant(null);
  };
  const resetCurrentFilters = () => {
    if (mode === 'terms') {
      resetTermFilters();
    } else if (mode === 'rules') {
      resetRuleFilters();
    } else {
      resetOfficialFilters();
    }
  };

  async function syncOfficialCards() {
    if (officialSyncing) {
      return;
    }
    setOfficialSyncing(true);
    try {
      const status = await syncOfficialCardCatalog('both');
      setOfficialStatus(status);
      const result = await searchOfficialCardCatalog(officialSearchFilters);
      setOfficialResult(result);
      onStatus(`Synced official card catalog. ${formatCount(status.prints.count + status.oracle.count, 'card record')} cached.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialSyncing(false);
    }
  }

  async function addSelectedOfficialToCollection(card = selectedOfficial) {
    if (!card || card.view !== 'prints') {
      onStatus('Switch to Prints before adding an official card to a collection.');
      return;
    }
    setOfficialAction('collection');
    try {
      const result = await addOfficialCardToCollection({
        cardId: card.id,
        collectionId: officialCollectionId || undefined,
        collectionName: officialCollectionId ? undefined : officialCollectionName,
        linkedUniverseId: selectedUniverseId,
        quantity: officialQuantity,
        ownerName: normalizeCollectionOwnerName(officialOwnerName)
      });
      setCollections(result.collections);
      setOfficialCollectionId(result.collection.metadata.collectionId);
      onStatus(`Added ${card.name} to ${result.collection.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialAction('');
    }
  }

  async function addSelectedOfficialToDeck(card = selectedOfficial) {
    if (!card || card.view !== 'prints') {
      onStatus('Switch to Prints before adding an official card to a deck.');
      return;
    }
    if (!officialDeckId) {
      onStatus('Choose or create a deck before adding an official card.');
      return;
    }
    setOfficialAction('deck');
    try {
      const result = await addOfficialCardToDeck({
        cardId: card.id,
        deckId: officialDeckId,
        section: officialDeckSection,
        quantity: officialQuantity,
        collectionId: officialCollectionId || 'official-cards',
        collectionName: officialCollectionId ? undefined : officialCollectionName || 'Official Cards',
        linkedUniverseId: selectedUniverseId
      });
      setDecks(result.decks);
      const loadedCollections = await fetchCollections();
      setCollections(loadedCollections);
      onStatus(`Added ${card.name} to ${result.deck.metadata.name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialAction('');
    }
  }

  async function addSelectedOfficialToSet(card = selectedOfficial) {
    if (!card || card.view !== 'prints') {
      onStatus('Switch to Prints before copying an official card into a set.');
      return;
    }
    if (!officialSetCode) {
      onStatus('Choose a set before copying an official card.');
      return;
    }
    setOfficialAction('set');
    try {
      const result = await addOfficialCardToSet({
        cardId: card.id,
        setCode: officialSetCode
      });
      onProjectLoaded(result.project);
      await onOpenCard(result.summary.setCode, result.summary.cardId);
      onStatus(`Copied ${result.summary.name} to ${result.project.setName}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialAction('');
    }
  }

  function openOfficialCompareBrowser() {
    onOpenCardBrowser();
    onStatus('Opened Card Browser. Select two rows in compare mode to inspect cards side by side.');
  }

  function openOfficialVariants(card = selectedOfficial) {
    if (!card) {
      onStatus('Choose an official card before browsing variants.');
      return;
    }
    if (officialCards.some((candidate) => candidate.id === card.id)) {
      selectOfficialCard(card.id);
    } else {
      setSelectedOfficialVariant(card);
    }
    setOfficialVariantQuery('');
    setOfficialVariantOffset(0);
    setOfficialVariantsOpen(true);
  }

  return (
    <>
      <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="References"
          subtitle={mode === 'terms' ? `${terms.length} terms` : mode === 'rules' ? `${rules.length} rules` : officialResult ? officialPageSubtitle(officialResult, officialView) : officialCatalogSubtitle(officialStatus, officialView)}
          newLabel="New reference"
          activeFilterCount={activeReferenceFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={mode === 'official-cards' ? undefined : () => setCreateOpen(true)}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <>
              <label className="search-field">
                <Icon name="search" />
                <input value={query} placeholder={mode === 'terms' ? 'Search terms...' : mode === 'rules' ? 'Search rules...' : 'Search official cards or use name:, t:, set:, mv&gt;=...'} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <ReferenceSortControl
                mode={mode}
                termSort={termSort}
                ruleSort={ruleSort}
                officialSort={officialSort}
                onTermSortChange={setTermSort}
                onRuleSortChange={setRuleSort}
                onOfficialSortChange={setOfficialSort}
              />
            </>
          }
        >
          <div className="reference-mode-switch">
            {referenceModes.map((item) => (
              <button key={item.id} type="button" className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          {mode === 'terms'
            ? referenceCategories.map((item) => (
                <button key={item.id} type="button" className={`entity-row clickable ${category === item.id ? 'selected' : ''}`} onClick={() => setCategory(item.id)}>
                  <Icon name="guide" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{categoryCounts.get(item.id) ?? 0} terms</small>
                  </span>
                </button>
              ))
            : mode === 'rules'
              ? ruleKinds.map((item) => (
                <button key={item.id} type="button" className={`entity-row clickable ${ruleKind === item.id ? 'selected' : ''}`} onClick={() => setRuleKind(item.id)}>
                  <Icon name="guide" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{ruleCounts.get(item.id) ?? 0} entries</small>
                  </span>
                </button>
	              ))
              : (
                <OfficialCardReferenceList
                  cards={officialCards}
                  selectedId={selectedOfficialBase?.id ?? ''}
                  view={officialView}
                  browserView={officialBrowserView}
                  sortLabel={officialSortOption.label}
                  status={officialStatus}
                  result={officialResult}
                  loading={officialLoading}
                  syncing={officialSyncing}
                  showingStart={officialShowingStart}
                  showingEnd={officialShowingEnd}
                  query={query}
                  onViewChange={setOfficialView}
                  onBrowserViewChange={setOfficialBrowserView}
                  onSelect={selectOfficialCard}
                  onPreviousPage={() => setOfficialOffset((offset) => Math.max(0, offset - REFERENCE_OFFICIAL_PAGE_SIZE))}
                  onNextPage={() => setOfficialOffset((offset) => offset + REFERENCE_OFFICIAL_PAGE_SIZE)}
                  onClearSearch={() => setQuery('')}
                  onResetFilters={resetOfficialFilters}
                />
              )}
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize reference categories panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show reference categories" aria-label="Show reference categories">
          <Icon name="collapseRight" />
        </button>
      ) : null}
      <section className="workspace-canvas reference-canvas">
        <div className="visual-management-header">
          <div>
            <h2>{mode === 'terms' ? referenceCategories.find((item) => item.id === category)?.label ?? 'References' : mode === 'rules' ? ruleKinds.find((item) => item.id === ruleKind)?.label ?? 'Rules' : 'Official Cards'}</h2>
            <p>
              {mode === 'terms'
                ? referenceCatalog
                  ? `${resultCountLabel(filteredTerms.length, displayedTerms.length, 'terms')} from ${referenceCatalog.sources.length} sources`
                  : 'Reference catalog loading.'
                : mode === 'rules'
                  ? referenceCatalog?.rules
                  ? `${resultCountLabel(filteredRules.length, displayedRules.length, 'rules')} from ${referenceCatalog.rules.effectiveDate ?? 'current rules'}`
                  : 'Rules snapshot not synced yet.'
                  : officialResult
                    ? `${resultCountLabel(officialResult.total, officialCards.length, officialCatalogResultNoun(officialView))} from Scryfall`
                    : officialCatalogSubtitle(officialStatus, officialView)}
            </p>
          </div>
          {!showLeftPanel ? (
            <div className="reference-header-compact-controls">
              <div className="segmented-control reference-header-mode" aria-label="Reference mode">
                {referenceModes.map((item) => (
                  <button key={item.id} type="button" className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}>
                    {item.label}
                  </button>
                ))}
              </div>
              <ReferenceSortControl
                mode={mode}
                termSort={termSort}
                ruleSort={ruleSort}
                officialSort={officialSort}
                onTermSortChange={setTermSort}
                onRuleSortChange={setRuleSort}
                onOfficialSortChange={setOfficialSort}
              />
              <FilterButton label="Filter references" activeCount={activeReferenceFilterCount} onClick={() => setFiltersOpen(true)} />
            </div>
          ) : null}
        </div>
        {mode === 'rules' ? (
          <RulesGuide
            onSelect={(nextRuleKind, number, nextQuery) => {
              setMode('rules');
              setRuleKind(nextRuleKind);
              setRuleFilters((current) => ({ ...current, number }));
              if (typeof nextQuery === 'string') {
                setQuery(nextQuery);
              }
            }}
          />
        ) : null}
        {mode === 'official-cards' ? (
          <OfficialCardReferenceCanvas
            cards={officialCards}
            selectedId={selectedOfficialBase?.id ?? ''}
            selectedCard={selectedOfficial}
            browserView={officialBrowserView}
            catalogView={officialView}
            status={officialStatus}
            loading={officialLoading}
            syncing={officialSyncing}
            query={query}
            result={officialResult}
            action={officialAction}
            onSelect={selectOfficialCard}
            onBrowserViewChange={setOfficialBrowserView}
            onPreviousCard={() => selectAdjacentOfficialCard(officialCards, selectedOfficialBase?.id ?? '', -1, selectOfficialCard)}
            onNextCard={() => selectAdjacentOfficialCard(officialCards, selectedOfficialBase?.id ?? '', 1, selectOfficialCard)}
            onAddToCollection={(card) => void addSelectedOfficialToCollection(card)}
            onAddToDeck={(card) => void addSelectedOfficialToDeck(card)}
            onAddToSet={(card) => void addSelectedOfficialToSet(card)}
            onOpenCompare={openOfficialCompareBrowser}
            onOpenVariants={openOfficialVariants}
            onClearSearch={() => setQuery('')}
            onResetFilters={resetOfficialFilters}
          />
        ) : mode === 'terms' ? (
          <div className="reference-term-grid">
            {displayedTerms.map((term) => (
              <button key={term.id} type="button" className={`reference-term-card ${selected?.id === term.id ? 'selected' : ''}`} onClick={() => setSelectedId(term.id)}>
                <strong>{term.name}</strong>
                {category === 'all' ? <span>{labelForCategory(term.category)}</span> : null}
                <small>{term.reminderText ?? term.definition ?? 'Metadata pending review.'}</small>
              </button>
            ))}
            {!filteredTerms.length ? (
              <FilteredEmptyState
                title="No reference matches"
                detail="Terms may be hidden by search or filters."
                showClearSearch={Boolean(query.trim())}
                showResetFilters={activeReferenceFilterCount > 0}
                onClearSearch={() => setQuery('')}
                onResetFilters={resetTermFilters}
              />
            ) : null}
          </div>
        ) : (
          <div className="reference-term-grid">
            {displayedRules.map((rule) => (
              <button key={rule.id} type="button" className={`reference-term-card rule-card ${selectedRule?.id === rule.id ? 'selected' : ''}`} onClick={() => setSelectedRuleId(rule.id)}>
                <strong>{rule.number ? `${rule.number}. ${rule.title}` : rule.title}</strong>
                {ruleKind === 'all' ? <span>{labelForRuleKind(rule.kind)}</span> : null}
                <small>{rule.text}</small>
              </button>
            ))}
            {!filteredRules.length ? (
              <FilteredEmptyState
                title="No rule matches"
                detail="Rules may be hidden by search or filters."
                showClearSearch={Boolean(query.trim())}
                showResetFilters={activeReferenceFilterCount > 0}
                onClearSearch={() => setQuery('')}
                onResetFilters={resetRuleFilters}
              />
            ) : null}
          </div>
        )}
      </section>
      {showRightPanel ? <PanelResizeHandle label="Resize reference detail panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
        <section className="workspace-inspector-panel">
          <WorkspacePanelToolbar label="Hide reference detail panel" icon="collapseRight" onClick={() => onShowRightPanelChange(false)} />
          {mode === 'official-cards' ? (
            <OfficialCardDetail
              card={selectedOfficial}
              mode={officialDetailMode}
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
              onModeChange={setOfficialDetailMode}
              onCollectionIdChange={setOfficialCollectionId}
              onCollectionNameChange={setOfficialCollectionName}
              onOwnerNameChange={setOfficialOwnerName}
              onDeckIdChange={setOfficialDeckId}
              onDeckSectionChange={setOfficialDeckSection}
              onSetCodeChange={setOfficialSetCode}
              onQuantityChange={setOfficialQuantity}
              onAddToCollection={() => void addSelectedOfficialToCollection()}
              onAddToDeck={() => void addSelectedOfficialToDeck()}
              onAddToSet={() => void addSelectedOfficialToSet()}
              onOpenCompare={openOfficialCompareBrowser}
              onOpenVariants={() => openOfficialVariants()}
            />
          ) : mode === 'terms' ? (
            <ReferenceTermDetail term={selected} catalog={referenceCatalog} usage={selectedUsage} />
          ) : (
            <ReferenceRuleDetail rule={selectedRule} catalog={referenceCatalog} />
          )}
        </section>
      ) : null}
      {!showRightPanel ? (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show reference detail" aria-label="Show reference detail">
          <Icon name="collapseLeft" />
        </button>
      ) : null}
      </div>
      {createOpen ? (
        <ReferenceCreateOverlay
          catalog={referenceCatalog}
          onCreated={(term, catalog) => {
            onReferenceCatalogUpdated(catalog);
            setSelectedId(term.id);
            setCategory(term.category);
            setQuery('');
            setCreateOpen(false);
          }}
          onStatus={onStatus}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse References"
          subtitle="Filter the current reference mode without hiding the reference search."
          resultsLabel={
            mode === 'terms'
              ? resultCountLabel(filteredTerms.length, displayedTerms.length, 'terms')
              : mode === 'rules'
                ? resultCountLabel(filteredRules.length, displayedRules.length, 'rules')
                : officialResult
                  ? officialPageSubtitle(officialResult, officialView)
                  : officialCatalogSubtitle(officialStatus, officialView)
          }
          activeFilterCount={activeReferenceFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={resetCurrentFilters}
          results={
            <div className="filter-result-list">
              {mode === 'official-cards' ? (
                officialCards.length ? (
                  officialCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`entity-row clickable ${card.id === selectedOfficial?.id ? 'selected' : ''}`}
                      onClick={() => {
                        selectOfficialCard(card.id);
                        setFiltersOpen(false);
                      }}
                    >
                      <Icon name={card.view === 'prints' ? 'collections' : 'guide'} />
                      <span>
                        <strong>{card.name}</strong>
                        <small>{officialCardListLine(card)}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <FilteredEmptyState
                    title="No official cards match"
                    detail="Reset filters, clear search, or switch between Prints, Unique, and Oracle."
                    showClearSearch={Boolean(query.trim())}
                    showResetFilters={activeReferenceFilterCount > 0}
                    onClearSearch={() => setQuery('')}
                    onResetFilters={resetOfficialFilters}
                  />
                )
              ) : mode === 'terms' ? (
                displayedTerms.length ? (
                  displayedTerms.map((term) => (
                    <button
                      key={term.id}
                      type="button"
                      className={`entity-row clickable ${term.id === selected?.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedId(term.id);
                        setFiltersOpen(false);
                      }}
                    >
                      <Icon name="guide" />
                      <span>
                        <strong>{term.name}</strong>
                        <small>
                          {[category === 'all' ? labelForCategory(term.category) : '', term.status].filter(Boolean).join(' - ')}
                          {termUsageMatches(term.id, usageIndex).length ? ` - ${termUsageMatches(term.id, usageIndex).length} active-set uses` : ''}
                        </small>
                      </span>
                    </button>
                  ))
                ) : (
                  <FilteredEmptyState
                    title="No terms match"
                    detail="Reset filters or clear the reference search."
                    showClearSearch={Boolean(query.trim())}
                    showResetFilters={activeReferenceFilterCount > 0}
                    onClearSearch={() => setQuery('')}
                    onResetFilters={resetTermFilters}
                  />
                )
              ) : displayedRules.length ? (
                displayedRules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    className={`entity-row clickable ${rule.id === selectedRule?.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedRuleId(rule.id);
                      setFiltersOpen(false);
                    }}
                  >
                    <Icon name="guide" />
                    <span>
                      <strong>{rule.number ? `${rule.number}. ${rule.title}` : rule.title}</strong>
                      {ruleKind === 'all' ? <small>{labelForRuleKind(rule.kind)}</small> : null}
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState
                  title="No rules match"
                  detail="Reset filters or clear the reference search."
                  showClearSearch={Boolean(query.trim())}
                  showResetFilters={activeReferenceFilterCount > 0}
                  onClearSearch={() => setQuery('')}
                  onResetFilters={resetRuleFilters}
                />
              )}
            </div>
          }
        >
          {mode === 'official-cards' ? (
            <OfficialCardFilterControls filters={officialFilters} onFiltersChange={(patch) => setOfficialFilters((current) => ({ ...current, ...patch }))} />
          ) : (
            <ReferenceFilterControls
              mode={mode === 'terms' ? 'terms' : 'rules'}
              category={category}
              ruleKind={ruleKind}
              categories={referenceCategories}
              ruleKinds={ruleKinds}
              termFilters={termFilters}
              ruleFilters={ruleFilters}
              termOptions={termFilterOptions}
              ruleOptions={ruleFilterOptions}
              activeCardLabel={activeCardLabel}
              onCategoryChange={setCategory}
              onRuleKindChange={setRuleKind}
              onTermFiltersChange={(patch) => setTermFilters((current) => ({ ...current, ...patch }))}
              onRuleFiltersChange={(patch) => setRuleFilters((current) => ({ ...current, ...patch }))}
            />
          )}
        </BrowseFilterOverlay>
      ) : null}
      {officialVariantsOpen ? (
        <OfficialCardVariantsOverlay
          result={officialVariants}
          loading={officialVariantsLoading}
          query={officialVariantQuery}
          action={officialAction}
          selectedCardId={selectedOfficialVariant?.id ?? selectedOfficial?.id ?? ''}
          onQueryChange={setOfficialVariantQuery}
          onPreviousPage={() => setOfficialVariantOffset((offset) => Math.max(0, offset - REFERENCE_OFFICIAL_VARIANT_PAGE_SIZE))}
          onNextPage={() => setOfficialVariantOffset((offset) => offset + REFERENCE_OFFICIAL_VARIANT_PAGE_SIZE)}
          onSelect={(card) => {
            setSelectedOfficialVariant(card);
            setOfficialVariantsOpen(false);
            onStatus(`Selected ${card.name} ${[card.setCode, card.collectorNumber].filter(Boolean).join(' ')} as the active official print.`);
          }}
          onAddToCollection={(card) => void addSelectedOfficialToCollection(card)}
          onAddToDeck={(card) => void addSelectedOfficialToDeck(card)}
          onAddToSet={(card) => void addSelectedOfficialToSet(card)}
          onClose={() => setOfficialVariantsOpen(false)}
        />
      ) : null}
    </>
  );
}

function ReferenceSortControl({
  mode,
  termSort,
  ruleSort,
  officialSort,
  onTermSortChange,
  onRuleSortChange,
  onOfficialSortChange
}: {
  mode: ReferenceMode;
  termSort: ReferenceTermSort;
  ruleSort: ReferenceRuleSort;
  officialSort: OfficialCardSortOptionId;
  onTermSortChange: (value: ReferenceTermSort) => void;
  onRuleSortChange: (value: ReferenceRuleSort) => void;
  onOfficialSortChange: (value: OfficialCardSortOptionId) => void;
}) {
  if (mode === 'rules') {
    return (
      <label className="reference-sort-control">
        <span>Sort</span>
        <select value={ruleSort} onChange={(event) => onRuleSortChange(event.target.value as ReferenceRuleSort)}>
          {referenceRuleSortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (mode === 'official-cards') {
    return (
      <label className="reference-sort-control">
        <span>Sort</span>
        <select value={officialSort} onChange={(event) => onOfficialSortChange(event.target.value as OfficialCardSortOptionId)}>
          {OFFICIAL_CARD_SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className="reference-sort-control">
      <span>Sort</span>
      <select value={termSort} onChange={(event) => onTermSortChange(event.target.value as ReferenceTermSort)}>
        {referenceTermSortOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OfficialCardReferenceList({
  cards,
  selectedId,
  view,
  browserView,
  sortLabel,
  status,
  result,
  loading,
  syncing,
  showingStart,
  showingEnd,
  query,
  onViewChange,
  onBrowserViewChange,
  onSelect,
  onPreviousPage,
  onNextPage,
  onClearSearch,
  onResetFilters
}: {
  cards: OfficialCardSearchCard[];
  selectedId: string;
  view: OfficialCardCatalogView;
  browserView: OfficialCardBrowserViewMode;
  sortLabel: string;
  status: OfficialCardCatalogStatus | null;
  result: OfficialCardSearchResult | null;
  loading: boolean;
  syncing: boolean;
  showingStart: number;
  showingEnd: number;
  query: string;
  onViewChange: (view: OfficialCardCatalogView) => void;
  onBrowserViewChange: (view: OfficialCardBrowserViewMode) => void;
  onSelect: (id: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}) {
  const source = officialStatusForView(status, view);
  const noun = officialCatalogResultNoun(view);
  const pageLabel = result && result.total ? `${showingStart.toLocaleString()}-${showingEnd.toLocaleString()} of ${formatCount(result.total, noun)}` : source.available ? `0 of ${formatCount(0, noun)}` : 'Catalog not synced';
  const hasPrevious = Boolean(result && result.offset > 0);
  const hasNext = Boolean(result && result.offset + result.cards.length < result.total);
  return (
    <>
      <div className="reference-official-browser-tools">
        <div className="segmented-actions" role="group" aria-label="Official card catalog view">
          <button type="button" className={`secondary-button compact ${view === 'prints' ? 'active' : ''}`} onClick={() => onViewChange('prints')}>
            Prints
          </button>
          <button type="button" className={`secondary-button compact ${view === 'unique' ? 'active' : ''}`} onClick={() => onViewChange('unique')}>
            Unique
          </button>
          <button type="button" className={`secondary-button compact ${view === 'oracle' ? 'active' : ''}`} onClick={() => onViewChange('oracle')}>
            Oracle
          </button>
        </div>
        <div className="segmented-actions official-view-mode-actions" role="group" aria-label="Official card result view">
          {OFFICIAL_CARD_VIEW_MODE_OPTIONS.map((option) => (
            <button key={option.id} type="button" className={`secondary-button compact ${browserView === option.id ? 'active' : ''}`} title={`${option.label} view`} onClick={() => onBrowserViewChange(option.id)}>
              <Icon name={option.icon} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <div className="official-sort-summary">
          <span>Sort</span>
          <strong>{sortLabel}</strong>
        </div>
        <div className="official-pagination reference-official-pagination" aria-live="polite">
          <span>{loading ? 'Loading...' : pageLabel}</span>
          <button type="button" className="secondary-button compact" disabled={loading || !hasPrevious} onClick={onPreviousPage}>
            Prev
          </button>
          <button type="button" className="secondary-button compact" disabled={loading || !hasNext} onClick={onNextPage}>
            Next
          </button>
        </div>
      </div>
      {result?.unsupportedQueryTerms.length ? (
        <div className="official-query-warning" role="status">
          Unsupported query: {result.unsupportedQueryTerms.join(', ')}
        </div>
      ) : null}
      {browserView === 'single' ? (
        <div className="reference-official-card-list" aria-label="Official Magic cards">
          {cards.map((card) => (
            <button key={card.id} type="button" className={`entity-row clickable official-card-entity ${selectedId === card.id ? 'selected' : ''}`} onClick={() => onSelect(card.id)}>
              <Icon name={card.view === 'prints' ? 'collections' : 'guide'} />
              <span>
                <strong>{card.name}</strong>
                <small>{officialCardListLine(card)}</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="preview-empty compact-empty official-left-hint">
          <strong>{browserViewLabel(browserView)} view in center</strong>
          <span>Use filters, sort, and pagination here; choose cards in the main pane.</span>
        </div>
      )}
      {loading && !cards.length ? (
        <div className="preview-empty compact-empty">
          <strong>Loading official cards</strong>
          <span>Searching the local Scryfall cache.</span>
        </div>
      ) : null}
      {!loading && !cards.length ? (
        <FilteredEmptyState
          title={syncing && !source.available ? 'Syncing official cards' : source.available ? 'No official cards match' : 'Official cards not synced'}
          detail={syncing && !source.available ? 'Downloading the local Scryfall cache in the background.' : source.available ? 'Clear search, reset filters, or switch catalog view.' : 'Open Settings to sync official Magic cards into the local cache.'}
          showClearSearch={Boolean(query.trim())}
          showResetFilters={source.available}
          onClearSearch={onClearSearch}
          onResetFilters={onResetFilters}
        />
      ) : null}
    </>
  );
}

function OfficialCardReferenceCanvas({
  cards,
  selectedId,
  selectedCard,
  browserView,
  catalogView,
  status,
  loading,
  syncing,
  query,
  result,
  action,
  onSelect,
  onBrowserViewChange,
  onPreviousCard,
  onNextCard,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenCompare,
  onOpenVariants,
  onClearSearch,
  onResetFilters
}: {
  cards: OfficialCardSearchCard[];
  selectedId: string;
  selectedCard: OfficialCardSearchCard | undefined;
  browserView: OfficialCardBrowserViewMode;
  catalogView: OfficialCardCatalogView;
  status: OfficialCardCatalogStatus | null;
  loading: boolean;
  syncing: boolean;
  query: string;
  result: OfficialCardSearchResult | null;
  action: OfficialCardActionTarget;
  onSelect: (id: string) => void;
  onBrowserViewChange: (view: OfficialCardBrowserViewMode) => void;
  onPreviousCard: () => void;
  onNextCard: () => void;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onOpenCompare: () => void;
  onOpenVariants: (card?: OfficialCardSearchCard) => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}) {
  useEffect(() => {
    if (browserView !== 'single') {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPreviousCard();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNextCard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [browserView, onNextCard, onPreviousCard]);

  const source = officialStatusForView(status, catalogView);
  if (!selectedCard && !cards.length) {
    return (
      <div className="preview-empty official-reference-empty">
        <strong>{syncing && !source.available ? 'Syncing official cards' : loading ? 'Loading official cards' : source.available ? 'No official card selected' : 'Official catalog not synced'}</strong>
        <span>{syncing && !source.available ? 'Downloading the local Scryfall cache in the background.' : source.available ? 'Use search, filters, and sort to browse cached Magic cards.' : 'Open Settings to sync the official catalog into the local cache.'}</span>
        <div className="preview-empty-actions">
          {query.trim() ? (
            <button type="button" className="secondary-button compact" onClick={onClearSearch}>
              Clear Search
            </button>
          ) : null}
          {source.available ? (
            <button type="button" className="secondary-button compact" onClick={onResetFilters}>
              Reset Filters
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (browserView === 'list') {
    return (
      <div className="official-reference-results official-reference-results-list">
        {cards.map((card) => (
          <OfficialCardResultRow key={card.id} card={card} selected={selectedId === card.id} action={action} onSelect={onSelect} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />
        ))}
      </div>
    );
  }

  if (browserView === 'grid') {
    return (
      <div className="official-reference-results official-reference-results-grid">
        {cards.map((card) => (
          <OfficialCardGridTile key={card.id} card={card} selected={selectedId === card.id} action={action} onSelect={onSelect} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />
        ))}
      </div>
    );
  }

  if (browserView === 'table') {
    return <OfficialCardTable cards={cards} selectedId={selectedId} action={action} onSelect={onSelect} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />;
  }

  const card = selectedCard ?? cards[0];
  const imageUrl = card ? officialCardImageUrl(card) : '';
  return (
    <div className="workspace-card official-reference-card-view">
      <div className="reference-detail-heading">
        <span>{card?.view === 'prints' ? 'Official print' : 'Oracle card'}</span>
        <strong>{result ? `${(result.offset + cards.findIndex((item) => item.id === card?.id) + 1).toLocaleString()} of ${formatCount(result.total, card?.view === 'prints' ? 'print' : 'card')}` : card ? officialCardLine(card) : 'Official Cards'}</strong>
      </div>
      <div className="official-reference-heading">
        <div>
          <h2>{card?.name ?? 'Official Cards'}</h2>
          <p className="workspace-copy">{card?.typeLine || 'Official Magic card'}</p>
        </div>
        <div className="official-reference-symbols">
          {card?.manaCost ? <ManaCostSymbols value={card.manaCost} /> : null}
          {card?.colorIdentity.length ? <ColorIdentitySymbols value={card.colorIdentity.join('')} /> : <span>Colorless</span>}
        </div>
      </div>
      <div className="official-reference-nav">
        <button type="button" className="secondary-button compact" disabled={cards.length < 2} onClick={onPreviousCard}>
          Previous
        </button>
        <div className="segmented-actions official-view-mode-actions" role="group" aria-label="Official card view mode">
          {OFFICIAL_CARD_VIEW_MODE_OPTIONS.map((option) => (
            <button key={option.id} type="button" className={`secondary-button compact ${browserView === option.id ? 'active' : ''}`} onClick={() => onBrowserViewChange(option.id)}>
              <Icon name={option.icon} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        <button type="button" className="secondary-button compact" disabled={cards.length < 2} onClick={onNextCard}>
          Next
        </button>
      </div>
      <div className="official-reference-body">
        <div className="official-reference-image-frame">
          {imageUrl ? (
            <img src={imageUrl} alt={`${card?.name ?? 'Official card'} official card image`} />
          ) : (
            <div className="preview-empty compact-empty">
              <strong>No image cached</strong>
              <span>{card?.name ?? 'Official Cards'}</span>
            </div>
          )}
        </div>
        {card ? <OfficialCardRulesAndMeta card={card} /> : null}
      </div>
      {card ? (
        <OfficialCardQuickActions
          card={card}
          action={action}
          onAddToCollection={onAddToCollection}
          onAddToDeck={onAddToDeck}
          onAddToSet={onAddToSet}
          onOpenCompare={onOpenCompare}
          onOpenVariants={onOpenVariants}
        />
      ) : null}
    </div>
  );
}

function OfficialCardResultRow({
  card,
  selected,
  action,
  onSelect,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenVariants
}: {
  card: OfficialCardSearchCard;
  selected: boolean;
  action: OfficialCardActionTarget;
  onSelect: (id: string) => void;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onOpenVariants: (card?: OfficialCardSearchCard) => void;
}) {
  return (
    <article className={`official-reference-result-row ${selected ? 'selected' : ''}`}>
      <button type="button" className="official-reference-result-main" onClick={() => onSelect(card.id)}>
        <OfficialCardThumb card={card} />
        <span>
          <strong>{card.name}</strong>
          <small>{officialCardListLine(card)}</small>
        </span>
      </button>
      <OfficialCardInlineActions card={card} action={action} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />
    </article>
  );
}

function OfficialCardGridTile({
  card,
  selected,
  action,
  onSelect,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenVariants
}: {
  card: OfficialCardSearchCard;
  selected: boolean;
  action: OfficialCardActionTarget;
  onSelect: (id: string) => void;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onOpenVariants: (card?: OfficialCardSearchCard) => void;
}) {
  const imageUrl = officialCardImageUrl(card);
  return (
    <article className={`official-reference-grid-tile ${selected ? 'selected' : ''}`}>
      <button type="button" className="official-reference-grid-image" onClick={() => onSelect(card.id)}>
        {imageUrl ? <img src={imageUrl} alt={`${card.name} official card image`} /> : <OfficialCardThumb card={card} />}
      </button>
      <button type="button" className="official-reference-grid-copy" onClick={() => onSelect(card.id)}>
        <strong>{card.name}</strong>
        <span>{officialCardListLine(card)}</span>
        <small>{[officialCardPriceLabel(card), officialVariantCountLabel(card)].filter((item) => item && item !== '-').join(' - ') || '-'}</small>
      </button>
      <OfficialCardInlineActions card={card} action={action} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />
    </article>
  );
}

function OfficialCardTable({
  cards,
  selectedId,
  action,
  onSelect,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenVariants
}: {
  cards: OfficialCardSearchCard[];
  selectedId: string;
  action: OfficialCardActionTarget;
  onSelect: (id: string) => void;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onOpenVariants: (card?: OfficialCardSearchCard) => void;
}) {
  return (
    <div className="official-reference-table-wrap">
      <table className="official-reference-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Mana</th>
            <th>Type</th>
            <th>Set</th>
            <th>Rarity</th>
            <th>Price</th>
            <th>Released</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id} className={selectedId === card.id ? 'selected' : ''}>
              <td>
                <button type="button" className="table-link-button" onClick={() => onSelect(card.id)}>
                  {card.name}
                </button>
              </td>
              <td>{card.manaCost ? <ManaCostSymbols value={card.manaCost} /> : '-'}</td>
              <td>{card.typeLine || '-'}</td>
              <td>{card.view === 'prints' ? [card.setCode, card.collectorNumber].filter(Boolean).join(' ') || '-' : 'Oracle'}</td>
              <td>{card.view === 'prints' ? card.rarity || '-' : '-'}</td>
              <td>{officialCardPriceLabel(card)}</td>
              <td>{card.view === 'prints' ? card.releasedAt || '-' : '-'}</td>
              <td>
                <OfficialCardInlineActions card={card} action={action} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OfficialCardInlineActions({
  card,
  action,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenVariants
}: {
  card: OfficialCardSearchCard;
  action: OfficialCardActionTarget;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onOpenVariants?: (card?: OfficialCardSearchCard) => void;
}) {
  const disabled = card.view !== 'prints' || Boolean(action);
  return (
    <div className="official-inline-actions" aria-label={`Quick actions for ${card.name}`}>
      <button type="button" className="secondary-button compact" disabled={disabled} onClick={() => onAddToCollection(card)}>
        {action === 'collection' ? 'Adding...' : 'Collect'}
      </button>
      <button type="button" className="secondary-button compact" disabled={disabled} onClick={() => onAddToDeck(card)}>
        {action === 'deck' ? 'Adding...' : 'Deck'}
      </button>
      <button type="button" className="secondary-button compact" disabled={disabled} onClick={() => onAddToSet(card)}>
        {action === 'set' ? 'Copying...' : 'Set'}
      </button>
      {onOpenVariants && card.oracleId ? (
        <button type="button" className="secondary-button compact" onClick={() => onOpenVariants(card)}>
          Variants{card.variantCount && card.variantCount > 1 ? ` (${card.variantCount.toLocaleString()})` : ''}
        </button>
      ) : null}
    </div>
  );
}

function OfficialCardQuickActions({
  card,
  action,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenCompare,
  onOpenVariants
}: {
  card: OfficialCardSearchCard;
  action: OfficialCardActionTarget;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onOpenCompare: () => void;
  onOpenVariants: (card?: OfficialCardSearchCard) => void;
}) {
  return (
    <div className="official-reference-quick-actions">
      <OfficialCardInlineActions card={card} action={action} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} onOpenVariants={onOpenVariants} />
      <button type="button" className="secondary-button compact" onClick={onOpenCompare}>
        Compare
      </button>
    </div>
  );
}

function OfficialCardVariantsOverlay({
  result,
  loading,
  query,
  action,
  selectedCardId,
  onQueryChange,
  onPreviousPage,
  onNextPage,
  onSelect,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onClose
}: {
  result: OfficialCardPrintVariantsResult | null;
  loading: boolean;
  query: string;
  action: OfficialCardActionTarget;
  selectedCardId: string;
  onQueryChange: (value: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onSelect: (card: OfficialCardPrintVariantsResult['cards'][number]) => void;
  onAddToCollection: (card: OfficialCardSearchCard) => void;
  onAddToDeck: (card: OfficialCardSearchCard) => void;
  onAddToSet: (card: OfficialCardSearchCard) => void;
  onClose: () => void;
}) {
  const cards = result?.cards ?? [];
  const showingStart = result?.total ? result.offset + 1 : 0;
  const showingEnd = result ? Math.min(result.offset + cards.length, result.total) : 0;
  const hasPrevious = Boolean(result && result.offset > 0);
  const hasNext = Boolean(result && result.offset + cards.length < result.total);
  const title = result?.name ? `${result.name} Variants` : 'Official Card Variants';
  const subtitle = result?.total
    ? `${showingStart.toLocaleString()}-${showingEnd.toLocaleString()} of ${formatCount(result.total, 'print')} behind this card. Choose the exact print to import.`
    : loading
      ? 'Loading exact print variants from the local catalog.'
      : 'No variants are available for this card yet.';
  const footer = (
    <>
      <button type="button" className="secondary-button" disabled={loading || !hasPrevious} onClick={onPreviousPage}>
        Previous
      </button>
      <button type="button" className="secondary-button" disabled={loading || !hasNext} onClick={onNextPage}>
        Next
      </button>
      <button type="button" className="primary-button" onClick={onClose}>
        Done
      </button>
    </>
  );

  return (
    <OverlayShell title={title} eyebrow="Variants" subtitle={subtitle} dirty={false} footer={footer} onClose={onClose}>
      <div className="official-variants-panel">
        <div className="official-variants-toolbar">
          <label className="search-field official-variants-search">
            <Icon name="search" />
            <input value={query} placeholder="Filter variants by set, language, collector number..." onChange={(event) => onQueryChange(event.target.value)} />
          </label>
          <div className="official-pagination" aria-live="polite">
            <span>{loading ? 'Loading variants...' : result?.total ? `${showingStart.toLocaleString()}-${showingEnd.toLocaleString()} of ${formatCount(result.total, 'print')}` : '0 prints'}</span>
            <button type="button" className="secondary-button compact" disabled={loading || !hasPrevious} onClick={onPreviousPage}>
              Prev
            </button>
            <button type="button" className="secondary-button compact" disabled={loading || !hasNext} onClick={onNextPage}>
              Next
            </button>
          </div>
        </div>
        {cards.length ? (
          <div className="official-variant-grid">
            {cards.map((card) => (
              <article key={card.id} className={`official-variant-tile ${selectedCardId === card.id ? 'selected' : ''}`}>
                <button type="button" className="official-reference-grid-image" onClick={() => onSelect(card)}>
                  {officialCardImageUrl(card) ? <img src={officialCardImageUrl(card)} alt={`${card.name} ${officialCardLine(card)} official card image`} /> : <OfficialCardThumb card={card} />}
                </button>
                <div className="official-variant-copy">
                  <strong>{card.name}</strong>
                  <span>{officialCardListLine(card)}</span>
                  <small>{[officialCardPriceLabel(card), card.lang ? card.lang.toUpperCase() : ''].filter((item) => item && item !== '-').join(' - ') || '-'}</small>
                </div>
                <div className="official-variant-actions">
                  <button type="button" className="secondary-button compact" onClick={() => onSelect(card)}>
                    Select
                  </button>
                  <OfficialCardInlineActions card={card} action={action} onAddToCollection={onAddToCollection} onAddToDeck={onAddToDeck} onAddToSet={onAddToSet} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="preview-empty official-reference-empty">
            <strong>{loading ? 'Loading variants' : 'No variants match'}</strong>
            <span>{query.trim() ? 'Clear the variant filter to see every print behind this card.' : 'The local print cache does not have variants for this card.'}</span>
          </div>
        )}
      </div>
    </OverlayShell>
  );
}

function OfficialCardThumb({ card }: { card: OfficialCardSearchCard }) {
  const imageUrl = officialCardImageUrl(card);
  return imageUrl ? (
    <img className="official-card-thumb" src={imageUrl} alt="" />
  ) : (
    <span className="official-card-thumb placeholder" aria-hidden="true">
      {card.name.slice(0, 1)}
    </span>
  );
}

function OfficialCardRulesAndMeta({ card }: { card: OfficialCardSearchCard }) {
  return (
    <div className="official-reference-rules">
      <p className="official-card-text">{card.oracleText || 'Oracle text is not available in the local cache for this card.'}</p>
      {card.flavorText ? <p className="official-card-text flavor">{card.flavorText}</p> : null}
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
      <OfficialCardMetadata card={card} />
    </div>
  );
}

function OfficialCardMetadata({ card }: { card: OfficialCardSearchCard }) {
  return (
    <dl className="reference-meta official-reference-meta">
      <dt>Mana value</dt>
      <dd>{typeof card.manaValue === 'number' ? card.manaValue : '-'}</dd>
      <dt>Layout</dt>
      <dd>{card.layout || '-'}</dd>
      {card.view === 'prints' ? (
        <>
          <dt>Print</dt>
          <dd>{[card.setCode, card.collectorNumber].filter(Boolean).join(' ') || '-'}</dd>
          <dt>Set</dt>
          <dd>{card.setName || '-'}</dd>
          <dt>Rarity</dt>
          <dd>{card.rarity || '-'}</dd>
          <dt>Released</dt>
          <dd>{card.releasedAt || '-'}</dd>
          <dt>Finishes</dt>
          <dd>{card.finishes.length ? card.finishes.join(', ') : '-'}</dd>
          <dt>Price</dt>
          <dd>{officialCardPriceLabel(card)}</dd>
        </>
      ) : null}
      <dt>Source</dt>
      <dd>{card.scryfallUri ? <a href={card.scryfallUri} target="_blank" rel="noreferrer">Scryfall</a> : 'Scryfall cache'}</dd>
    </dl>
  );
}

function ReferenceTermDetail({ term, catalog, usage }: { term: ReferenceTerm | undefined; catalog: ReferenceCatalog | null; usage: ReferenceUsageMatch[] }) {
  const source = catalog?.sources.find((item) => item.id === term?.source);
  if (!term) {
    return (
      <div className="workspace-card">
        <h2>Reference</h2>
        <p className="inventory-note">Choose a term to inspect its definition, source, status, and tags.</p>
      </div>
    );
  }
  return (
    <div className="workspace-card reference-detail">
      <div className="reference-detail-heading">
        <span>{labelForCategory(term.category)}</span>
        <strong>{term.workflowStatus === 'draft' ? 'draft' : term.status}</strong>
      </div>
      <h2>{term.name}</h2>
      <p>{term.reminderText ?? term.definition ?? 'Definition pending review. Source metadata is available below.'}</p>
      <dl className="reference-meta">
        <dt>Definition</dt>
        <dd>{term.definition || '-'}</dd>
        <dt>Reminder text</dt>
        <dd>{term.reminderText || '-'}</dd>
        <dt>Source</dt>
        <dd>{source?.label ?? term.source}</dd>
        <dt>System</dt>
        <dd>{term.system === 'magic' ? 'Magic: The Gathering' : term.system}</dd>
        <dt>Origin</dt>
        <dd>{term.origin}</dd>
        <dt>Workflow</dt>
        <dd>{term.workflowStatus}</dd>
        <dt>Typical colors</dt>
        <dd>{term.typicalColors?.join(', ') || '-'}</dd>
        <dt>Rule</dt>
        <dd>{term.details?.ruleNumber || '-'}</dd>
        <dt>Parent</dt>
        <dd>{term.details?.parentType || '-'}</dd>
        <dt>Tags</dt>
        <dd>{term.tags.length ? term.tags.join(', ') : '-'}</dd>
        <dt>Aliases</dt>
        <dd>{term.aliases.length ? term.aliases.join(', ') : '-'}</dd>
        <dt>Active set usage</dt>
        <dd>{usage.length ? usage.slice(0, 10).map((item) => item.cardName).join(', ') : '-'}</dd>
        <dt>Notes</dt>
        <dd>{term.sourceNotes || term.details?.designNotes || '-'}</dd>
      </dl>
    </div>
  );
}

function ReferenceRuleDetail({ rule, catalog }: { rule: ReferenceRuleEntry | undefined; catalog: ReferenceCatalog | null }) {
  if (!rule) {
    return (
      <div className="workspace-card">
        <h2>Rules</h2>
        <p className="inventory-note">Sync a rules snapshot, then choose a rule section or glossary entry.</p>
      </div>
    );
  }
  const relatedTerms = rule.relatedTermIds
    .map((id) => catalog?.terms.find((term) => term.id === id))
    .filter((term): term is ReferenceTerm => Boolean(term))
    .slice(0, 12);
  return (
    <div className="workspace-card reference-detail">
      <div className="reference-detail-heading">
        <span>{labelForRuleKind(rule.kind)}</span>
        <strong>{rule.effectiveDate ?? catalog?.rules?.effectiveDate ?? 'rules'}</strong>
      </div>
      <h2>{rule.number ? `${rule.number}. ${rule.title}` : rule.title}</h2>
      <p className="reference-rule-text">{rule.text}</p>
      <dl className="reference-meta">
        <dt>Kind</dt>
        <dd>{labelForRuleKind(rule.kind)}</dd>
        <dt>Rule</dt>
        <dd>{rule.number ?? '-'}</dd>
        <dt>Effective</dt>
        <dd>{rule.effectiveDate ?? catalog?.rules?.effectiveDate ?? '-'}</dd>
        <dt>Source</dt>
        <dd>{rule.sourceUrl}</dd>
        <dt>Related terms</dt>
        <dd>{relatedTerms.length ? relatedTerms.map((term) => term.name).join(', ') : '-'}</dd>
      </dl>
    </div>
  );
}

function OfficialCardDetail({
  card,
  mode,
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
  onModeChange,
  onCollectionIdChange,
  onCollectionNameChange,
  onOwnerNameChange,
  onDeckIdChange,
  onDeckSectionChange,
  onSetCodeChange,
  onQuantityChange,
  onAddToCollection,
  onAddToDeck,
  onAddToSet,
  onOpenCompare,
  onOpenVariants
}: {
  card: OfficialCardSearchCard | undefined;
  mode: OfficialCardDetailMode;
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
  action: OfficialCardActionTarget;
  onModeChange: (mode: OfficialCardDetailMode) => void;
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
  onOpenCompare: () => void;
  onOpenVariants: () => void;
}) {
  if (!card) {
    return (
      <div className="workspace-card">
        <h2>Official Cards</h2>
        <p className="inventory-note">Sync the catalog, then search for an official Magic card.</p>
      </div>
    );
  }
  const imageUrl = officialCardImageUrl(card);
  const canAddToCollection = card.view === 'prints';
  return (
    <div className="workspace-card reference-detail official-card-detail">
      <div className="reference-detail-heading">
        <span>{card.view === 'prints' ? 'Official print' : 'Oracle card'}</span>
        <strong>{officialCardLine(card)}</strong>
      </div>
      <div className="official-detail-title-row">
        <h2>{card.name}</h2>
        <div className="segmented-actions" role="group" aria-label="Official card detail mode">
          {OFFICIAL_CARD_DETAIL_MODE_OPTIONS.map((option) => (
            <button key={option.id} type="button" className={`secondary-button compact ${mode === option.id ? 'active' : ''}`} onClick={() => onModeChange(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {mode === 'full' || mode === 'image' ? (
        imageUrl ? (
          <img className={`official-card-detail-image ${mode === 'image' ? 'image-only' : ''}`} src={imageUrl} alt={`${card.name} official card image`} />
        ) : (
          <div className="preview-empty compact-empty">
            <strong>No image cached</strong>
            <span>{card.name}</span>
          </div>
        )
      ) : null}
      {mode === 'full' || mode === 'rules' ? (
        <>
          <p className="official-card-text">{card.oracleText || 'Oracle text is not available in the local cache for this card.'}</p>
          {card.flavorText ? <p className="official-card-text flavor">{card.flavorText}</p> : null}
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
        </>
      ) : null}
      {mode === 'full' || mode === 'metadata' ? (
        <>
          <dl className="reference-meta">
            <dt>Type</dt>
            <dd>{card.typeLine || '-'}</dd>
            <dt>Mana cost</dt>
            <dd>{card.manaCost ? <ManaCostSymbols value={card.manaCost} /> : '-'}</dd>
            <dt>Colors</dt>
            <dd>{card.colorIdentity.length ? <ColorIdentitySymbols value={card.colorIdentity.join('')} /> : 'Colorless'}</dd>
          </dl>
          <OfficialCardMetadata card={card} />
        </>
      ) : null}
      <div className="collection-official-panel">
        <strong>Add to Collection</strong>
        {canAddToCollection ? (
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
              <input list="official-reference-owner-options" value={ownerName} onChange={(event) => onOwnerNameChange(event.target.value)} onBlur={(event) => onOwnerNameChange(normalizeCollectionOwnerName(event.target.value))} />
              <datalist id="official-reference-owner-options">
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
          <p className="workspace-copy">Switch to Prints to add an exact set and collector-number identity to a collection.</p>
        )}
      </div>
      <div className="collection-official-panel">
        <strong>Add to Deck</strong>
        {canAddToCollection ? (
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
        {canAddToCollection ? (
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
      <button type="button" className="secondary-button compact" onClick={onOpenCompare}>
        Compare in Card Browser
      </button>
      {card.oracleId ? (
        <button type="button" className="secondary-button compact" onClick={onOpenVariants}>
          Browse Variants{card.variantCount && card.variantCount > 1 ? ` (${card.variantCount.toLocaleString()})` : ''}
        </button>
      ) : null}
    </div>
  );
}

function labelForCategory(category: ReferenceCategory): string {
  return referenceCategories.find((item) => item.id === category)?.label ?? category;
}

function labelForRuleKind(kind: ReferenceRuleKind): string {
  return ruleKinds.find((item) => item.id === kind)?.label ?? kind;
}

function resultCountLabel(total: number, displayed: number, noun: string): string {
  return displayed < total ? `${displayed} of ${total} matching ${noun}` : `${total} matching ${noun}`;
}

function officialPageSubtitle(result: OfficialCardSearchResult, view: OfficialCardCatalogView): string {
  if (!result.total) {
    return `0 ${officialCatalogResultNoun(view)}s`;
  }
  const start = result.offset + 1;
  const end = Math.min(result.offset + result.cards.length, result.total);
  return `${start.toLocaleString()}-${end.toLocaleString()} of ${formatCount(result.total, officialCatalogResultNoun(view))}`;
}

function officialCatalogSubtitle(status: OfficialCardCatalogStatus | null, view: OfficialCardCatalogView): string {
  const source = officialStatusForView(status, view);
  const noun = view === 'oracle' ? 'Oracle card' : 'print';
  return source.available ? `${formatCount(source.count, noun)} cached` : 'Official catalog not synced';
}

function officialStatusForView(status: OfficialCardCatalogStatus | null, view: OfficialCardCatalogView) {
  return view === 'oracle'
    ? status?.oracle ?? { available: false, count: 0 }
    : status?.prints ?? { available: false, count: 0 };
}

function officialCatalogResultNoun(view: OfficialCardCatalogView): string {
  return view === 'prints' ? 'print' : view === 'unique' ? 'unique card' : 'Oracle card';
}

function officialCardLine(card: OfficialCardSearchCard): string {
  if (card.view === 'prints') {
    return [[card.setCode, card.collectorNumber, card.rarity].filter(Boolean).join(' - ') || card.setName || 'Print', officialVariantCountLabel(card)].filter(Boolean).join(' - ');
  }
  return [card.typeLine || 'Oracle', officialVariantCountLabel(card)].filter(Boolean).join(' - ');
}

function officialCardListLine(card: OfficialCardSearchCard): string {
  if (card.view === 'prints') {
    return [[card.setCode, card.collectorNumber, card.typeLine || card.setName].filter(Boolean).join(' - '), officialVariantCountLabel(card)].filter(Boolean).join(' - ');
  }
  return [card.typeLine || card.oracleText || 'Oracle card', officialVariantCountLabel(card)].filter(Boolean).join(' - ');
}

function officialVariantCountLabel(card: OfficialCardSearchCard): string {
  return card.variantCount && card.variantCount > 1 ? `${card.variantCount.toLocaleString()} variants` : '';
}

function officialCardImageUrl(card: OfficialCardSearchCard): string {
  const images = card.imageUris ?? card.cardFaces?.find((face) => face.imageUris)?.imageUris;
  return images?.normal ?? images?.large ?? images?.png ?? images?.small ?? images?.artCrop ?? images?.borderCrop ?? '';
}

function officialCardPriceLabel(card: OfficialCardSearchCard): string {
  if (card.view !== 'prints' || !card.prices) {
    return '-';
  }
  const price = card.prices.usd ?? card.prices.usdFoil ?? card.prices.eur ?? card.prices.tix;
  if (!price) {
    return '-';
  }
  if (card.prices.usd === price || card.prices.usdFoil === price) {
    return `$${price}`;
  }
  if (card.prices.eur === price || card.prices.eurFoil === price) {
    return `EUR ${price}`;
  }
  return `${price} tix`;
}

function browserViewLabel(view: OfficialCardBrowserViewMode): string {
  return OFFICIAL_CARD_VIEW_MODE_OPTIONS.find((option) => option.id === view)?.label ?? 'Results';
}

function selectAdjacentOfficialCard(cards: OfficialCardSearchCard[], selectedId: string, direction: -1 | 1, onSelect: (id: string) => void): void {
  if (!cards.length) {
    return;
  }
  const currentIndex = Math.max(0, cards.findIndex((card) => card.id === selectedId));
  const nextIndex = (currentIndex + direction + cards.length) % cards.length;
  onSelect(cards[nextIndex]?.id ?? cards[0]!.id);
}

function sortReferenceTerms(terms: ReferenceTerm[], sort: ReferenceTermSort, query: string): ReferenceTerm[] {
  const next = [...terms];
  const activeSort = sort === 'auto' ? (query.trim() ? 'auto' : 'name-asc') : sort;
  return next.sort((left, right) => {
    if (activeSort === 'auto') {
      return referenceTermRank(left, query) - referenceTermRank(right, query) || left.name.localeCompare(right.name);
    }
    if (activeSort === 'name-desc') {
      return right.name.localeCompare(left.name);
    }
    if (activeSort === 'category-asc') {
      return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
    }
    if (activeSort === 'source-asc') {
      return left.source.localeCompare(right.source) || left.name.localeCompare(right.name);
    }
    if (activeSort === 'status-asc') {
      return left.status.localeCompare(right.status) || left.name.localeCompare(right.name);
    }
    if (activeSort === 'workflow-asc') {
      return left.workflowStatus.localeCompare(right.workflowStatus) || left.name.localeCompare(right.name);
    }
    return left.name.localeCompare(right.name);
  });
}

function sortReferenceRules(rules: ReferenceRuleEntry[], sort: ReferenceRuleSort, query: string): ReferenceRuleEntry[] {
  const next = [...rules];
  const activeSort = sort === 'auto' ? (query.trim() ? 'auto' : 'number-asc') : sort;
  return next.sort((left, right) => {
    if (activeSort === 'auto') {
      return referenceRuleRank(left, query) - referenceRuleRank(right, query) || compareRuleNumber(left.number, right.number) || left.title.localeCompare(right.title);
    }
    if (activeSort === 'number-desc') {
      return -compareRuleNumber(left.number, right.number) || left.title.localeCompare(right.title);
    }
    if (activeSort === 'title-asc') {
      return left.title.localeCompare(right.title);
    }
    if (activeSort === 'kind-asc') {
      return left.kind.localeCompare(right.kind) || compareRuleNumber(left.number, right.number) || left.title.localeCompare(right.title);
    }
    if (activeSort === 'effective-desc') {
      return (right.effectiveDate ?? '').localeCompare(left.effectiveDate ?? '') || compareRuleNumber(left.number, right.number);
    }
    if (activeSort === 'effective-asc') {
      return (left.effectiveDate ?? '').localeCompare(right.effectiveDate ?? '') || compareRuleNumber(left.number, right.number);
    }
    return compareRuleNumber(left.number, right.number) || left.title.localeCompare(right.title);
  });
}

function referenceTermRank(term: ReferenceTerm, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return 0;
  }
  const name = term.name.toLowerCase();
  if (name === needle) {
    return 0;
  }
  if (name.startsWith(needle)) {
    return 1;
  }
  if (name.includes(needle)) {
    return 2;
  }
  return 10;
}

function referenceRuleRank(rule: ReferenceRuleEntry, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return 0;
  }
  const ruleNumber = rule.number?.toLowerCase() ?? '';
  const title = rule.title.toLowerCase();
  if (ruleNumber === needle || title === needle) {
    return 0;
  }
  if (ruleNumber.startsWith(needle) || title.startsWith(needle)) {
    return 1;
  }
  if (rule.text.toLowerCase().includes(needle)) {
    return 3;
  }
  return 10;
}

function compareRuleNumber(left: string | undefined, right: string | undefined): number {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

interface ProjectRelatedSummary {
  sets: SetSummary[];
  decks: DeckSummary[];
  collections: CollectionSummary[];
  authoredCardCount: number;
  sourceCardCount: number;
  ownedCardCount: number;
  recommendedCardCount: number;
  flaggedCardCount: number;
  variantCount: number;
  coverImageUrl?: string;
}

function summarizeProjectRelatedContent(projectId: string, sets: SetSummary[], decks: DeckSummary[], collections: CollectionSummary[]): ProjectRelatedSummary {
  const setCodes = new Set(sets.map((set) => set.setCode));
  const linkedDecks = decks.filter((deck) => deck.linkedUniverseId === projectId || (deck.linkedSetCode ? setCodes.has(deck.linkedSetCode) : false));
  const linkedCollections = collections.filter((collection) =>
    collection.linkedUniverseId === projectId || (collection.linkedSetCodes ?? []).some((setCode) => setCodes.has(setCode))
  );
  const sourceCollections = linkedCollections.filter((collection) => collection.listCategory !== 'flagged' && collection.listCategory !== 'wishlist');
  const ownedCollections = linkedCollections.filter((collection) => collection.defaultOwnershipStatus === 'owned' || collection.purpose === 'owned');
  const recommendationCollections = linkedCollections.filter((collection) => collection.listCategory === 'recommendation' || collection.defaultOwnershipStatus === 'recommended');
  const flaggedCollections = linkedCollections.filter((collection) => collection.listCategory === 'flagged');
  return {
    sets,
    decks: linkedDecks,
    collections: linkedCollections,
    authoredCardCount: sets.reduce((total, set) => total + set.cardCount, 0),
    sourceCardCount: sourceCollections.reduce((total, collection) => total + collection.cardCount, 0),
    ownedCardCount: ownedCollections.reduce((total, collection) => total + collection.cardCount, 0),
    recommendedCardCount: recommendationCollections.reduce((total, collection) => total + collection.cardCount, 0),
    flaggedCardCount: flaggedCollections.reduce((total, collection) => total + collection.cardCount, 0),
    variantCount: linkedDecks.reduce((total, deck) => total + deck.variantCount, 0),
    coverImageUrl: linkedDecks.find((deck) => deck.coverImageUrl)?.coverImageUrl
  };
}

function projectListSummaryLine(setCount: number, summary: ProjectRelatedSummary, status: string): string {
  const parts = [formatCount(setCount, 'set')];
  if (summary.decks.length) {
    parts.push(formatCount(summary.decks.length, 'deck'));
  }
  if (summary.sourceCardCount) {
    parts.push(`${formatCount(summary.sourceCardCount, 'linked card')}`);
  }
  parts.push(status);
  return parts.join(' - ');
}

function projectHeaderSummaryLine(summary: ProjectRelatedSummary, relatedStatus: 'loading' | 'ready' | 'error'): string {
  if (relatedStatus === 'loading' && !summary.decks.length && !summary.collections.length) {
    return 'Loading linked decks, binders, and lists...';
  }
  if (relatedStatus === 'error') {
    return `${formatCount(summary.sets.length, 'set')} in this project. Linked content could not be refreshed.`;
  }
  return [
    formatCount(summary.sets.length, 'set'),
    formatCount(summary.decks.length, 'deck'),
    `${formatCount(summary.sourceCardCount, 'linked card')} in binders/lists`,
    formatCount(summary.variantCount, 'variant')
  ].join(' - ');
}

function projectLinkedStatusLabel(summary: ProjectRelatedSummary, relatedStatus: 'loading' | 'ready' | 'error'): string {
  if (relatedStatus === 'loading') {
    return 'Loading...';
  }
  if (relatedStatus === 'error') {
    return 'Refresh failed';
  }
  return `${formatCount(summary.decks.length, 'deck')} - ${formatCount(summary.collections.length, 'binder/list')}`;
}

function ProjectStat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <strong>{value.toLocaleString()}</strong>
      <small>{label}</small>
    </span>
  );
}

function ProjectsWorkspace({
  library,
  project,
  selectedUniverseId,
  onCreateProject,
  onLibraryUpdated,
  onUniverseSelect,
  onLoadSet,
  onOpenCard,
  onOpenSet,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onStatus,
  saveShortcutToken,
  deckRefreshToken,
  collectionRefreshToken
}: Pick<
  WorkspaceViewProps,
  | 'library'
  | 'project'
  | 'selectedUniverseId'
  | 'onCreateProject'
  | 'onLibraryUpdated'
  | 'onUniverseSelect'
  | 'onLoadSet'
  | 'onOpenCard'
  | 'onOpenSet'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onStatus'
  | 'saveShortcutToken'
  | 'deckRefreshToken'
  | 'collectionRefreshToken'
>) {
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectFilters, setProjectFilters] = useState({
    status: 'all',
    tag: '',
    setCount: ''
  });
  const [viewingSetCode, setViewingSetCode] = useState('');
  const [deckSummaries, setDeckSummaries] = useState<DeckSummary[]>([]);
  const [collectionSummaries, setCollectionSummaries] = useState<CollectionSummary[]>([]);
  const [relatedStatus, setRelatedStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const projectSetCount = (projectId: string) => library?.sets.filter((set) => set.universeId === projectId).length ?? 0;
  const projectSummaryFor = (projectId: string) => summarizeProjectRelatedContent(
    projectId,
    library?.sets.filter((set) => set.universeId === projectId) ?? [],
    deckSummaries,
    collectionSummaries
  );
  const activeProjectFilterCount = countActiveFilters([
    { value: projectFilters.status, defaultValue: 'all' },
    { value: projectFilters.tag, defaultValue: '' },
    { value: projectFilters.setCount, defaultValue: '' }
  ]);
  const projects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (library?.universes ?? []).filter((projectItem) => {
      const setCount = library?.sets.filter((set) => set.universeId === projectItem.id).length ?? 0;
      const matchesQuery = !needle || `${projectItem.name} ${projectItem.description ?? ''} ${projectItem.status ?? ''} ${(projectItem.tags ?? []).join(' ')}`.toLowerCase().includes(needle);
      const matchesStatus = projectFilters.status === 'all' || (projectItem.status ?? 'draft') === projectFilters.status;
      const matchesTags = matchesTagFilter(projectItem.tags, projectFilters.tag);
      return matchesQuery && matchesStatus && matchesTags && matchesNumberQuery(setCount, projectFilters.setCount);
    });
  }, [library?.sets, library?.universes, projectFilters, query]);
  const activeProject = projects.find((projectItem) => projectItem.id === selectedUniverseId) ?? projects[0];
  const activeProjectSets = library?.sets.filter((set) => set.universeId === activeProject?.id) ?? [];
  const activeProjectSummary = summarizeProjectRelatedContent(activeProject?.id ?? '', activeProjectSets, deckSummaries, collectionSummaries);
  const activeProjectCoverUrl = activeProject?.coverImageUrl || activeProjectSummary.coverImageUrl;

  useEffect(() => {
    let cancelled = false;
    setRelatedStatus('loading');
    Promise.all([fetchDecks(), fetchCollections()])
      .then(([nextDecks, nextCollections]) => {
        if (cancelled) {
          return;
        }
        setDeckSummaries(nextDecks);
        setCollectionSummaries(nextCollections);
        setRelatedStatus('ready');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setRelatedStatus('error');
        onStatus(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [collectionRefreshToken, deckRefreshToken, onStatus]);

  return (
    <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="Projects"
          subtitle={`${projects.length} of ${library?.universes.length ?? 0} projects`}
          newLabel="New project"
          activeFilterCount={activeProjectFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={onCreateProject}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder="Search projects..." onChange={(event) => setQuery(event.target.value)} />
            </label>
          }
        >
          {projects.map((projectItem) => (
            <button key={projectItem.id} type="button" className={`entity-row clickable ${projectItem.id === selectedUniverseId ? 'selected' : ''}`} onClick={() => onUniverseSelect(projectItem.id)}>
              <Icon name="universes" />
              <span>
                <strong>{projectItem.name}</strong>
                <small>
                  {projectListSummaryLine(projectSetCount(projectItem.id), projectSummaryFor(projectItem.id), projectItem.status ?? 'draft')}
                </small>
              </span>
            </button>
          ))}
          {!projects.length ? (
            <FilteredEmptyState
              title="No projects match"
              detail="Projects may be hidden by search or filters."
              showClearSearch={Boolean(query.trim())}
              showResetFilters={activeProjectFilterCount > 0}
              onClearSearch={() => setQuery('')}
              onResetFilters={() => setProjectFilters({ status: 'all', tag: '', setCount: '' })}
            />
          ) : null}
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize projects list panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show projects panel" aria-label="Show projects panel">
          <Icon name="collapseRight" />
        </button>
      ) : null}
      <section className="workspace-canvas">
        <div className="visual-management-header">
          <div>
            <h2>{activeProject?.name ?? 'Projects'}</h2>
            <p>{activeProject ? projectHeaderSummaryLine(activeProjectSummary, relatedStatus) : 'Choose a project from the left panel.'}</p>
          </div>
          {activeProject ? (
            <button type="button" className="primary-button" disabled={activeProject.id === selectedUniverseId} onClick={() => onUniverseSelect(activeProject.id)}>
              {activeProject.id === selectedUniverseId ? 'Current project' : 'Switch to project'}
            </button>
          ) : null}
        </div>
        {activeProject ? (
          <section className="project-overview-band" aria-label="Project content summary">
            {activeProjectCoverUrl ? (
              <img className="project-cover-art" src={activeProjectCoverUrl} alt="" />
            ) : (
              <span className="tile-art-placeholder large">{activeProject.name.slice(0, 3).toUpperCase()}</span>
            )}
            <div className="project-overview-copy">
              <h3>{activeProject.name}</h3>
              <p>{activeProject.description ?? 'Project workspace for linked sets, decks, binders, and lists.'}</p>
              <div className="project-stat-strip" aria-label="Project linked content counts">
                <ProjectStat label="Authored" value={activeProjectSummary.authoredCardCount} />
                <ProjectStat label="Owned" value={activeProjectSummary.ownedCardCount} />
                <ProjectStat label="Recommended" value={activeProjectSummary.recommendedCardCount} />
                <ProjectStat label="Flagged" value={activeProjectSummary.flaggedCardCount} />
                <ProjectStat label="Variants" value={activeProjectSummary.variantCount} />
              </div>
            </div>
          </section>
        ) : null}
        <div className="set-cover-grid">
          {activeProjectSets.map((set) => (
            <SetCoverTile
              key={set.setCode}
              set={set}
              coverDraft={project && project.setCode === set.setCode ? project.drafts[0] : undefined}
              fallbackCoverUrl={activeProjectCoverUrl}
              detailOverride={set.cardCount
                ? undefined
                : `${set.setCode} - authored shell - ${formatCount(activeProjectSummary.sourceCardCount, 'linked card')}`}
              selected={set.setCode === library?.selectedSetCode}
              onSelect={() => {
                void onLoadSet(set.setCode);
                onStatus(`Selected ${set.setCode}.`);
              }}
              onEdit={() => void onOpenSet(set.setCode)}
              onView={() => setViewingSetCode(set.setCode)}
              onDelete={() => onStatus('Trash support is staged next; no set was deleted.')}
            />
          ))}
          {!activeProjectSets.length ? (
            <div className="preview-empty">
              <strong>No sets in this project</strong>
              <span>Use the plus button in the left panel to create one.</span>
            </div>
          ) : null}
        </div>
        {activeProject ? (
          <section className="project-linked-section" aria-label="Linked project content">
            <div className="section-heading-row">
              <h3>Linked Content</h3>
              <span>{projectLinkedStatusLabel(activeProjectSummary, relatedStatus)}</span>
            </div>
            <div className="project-linked-grid">
              {activeProjectSummary.decks.map((deckItem) => (
                <div key={deckItem.deckId} className="entity-row">
                  <DeckCoverBadge metadata={deckItem} />
                  <span>
                    <strong>{deckItem.name}</strong>
                    <small>{formatCount(deckItem.cardCount, 'card')} - {formatCount(deckItem.variantCount, 'variant')} - {deckItem.format}</small>
                  </span>
                </div>
              ))}
              {activeProjectSummary.collections.map((collectionItem) => (
                <div key={collectionItem.collectionId} className="entity-row">
                  <Icon name={collectionItem.kind === 'list' ? 'lists' : 'binders'} />
                  <span>
                    <strong>{collectionItem.name}</strong>
                    <small>{formatCount(collectionItem.cardCount, 'card')} - {collectionItem.kind === 'list' ? listCategoryLabel(collectionItem.listCategory) : purposeLabel(collectionItem.purpose)}</small>
                  </span>
                </div>
              ))}
              {!activeProjectSummary.decks.length && !activeProjectSummary.collections.length ? (
                <div className="preview-empty">
                  <strong>No linked content yet</strong>
                  <span>Linked decks, binders, and lists will appear here.</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>
      {showRightPanel ? <PanelResizeHandle label="Resize project inspector panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
      <section className="workspace-inspector-panel">
        <WorkspacePanelToolbar label="Hide project inspector panel" icon="collapseRight" onClick={() => onShowRightPanelChange(false)} />
        <ProjectEditorPanel project={activeProject} sets={activeProjectSets} saveShortcutToken={saveShortcutToken} onLibraryUpdated={onLibraryUpdated} onStatus={onStatus} />
      </section>
      ) : null}
      {!showRightPanel ? (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show project inspector" aria-label="Show project inspector">
          <Icon name="collapseLeft" />
        </button>
      ) : null}
      {viewingSetCode ? (
        <SetBrowserModal setCode={viewingSetCode} onClose={() => setViewingSetCode('')} onOpenCard={onOpenCard} onStatus={onStatus} />
      ) : null}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Projects"
          subtitle="Filter projects by workflow state, tags, and set volume."
          resultsLabel={`${projects.length} matching projects`}
          activeFilterCount={activeProjectFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={() => setProjectFilters({ status: 'all', tag: '', setCount: '' })}
          results={
            <div className="filter-result-list">
              {projects.length ? (
                projects.map((projectItem) => (
                  <button
                    key={projectItem.id}
                    type="button"
                    className={`entity-row clickable ${projectItem.id === selectedUniverseId ? 'selected' : ''}`}
                    onClick={() => {
                      onUniverseSelect(projectItem.id);
                      setFiltersOpen(false);
                    }}
                  >
                    <Icon name="universes" />
                    <span>
                      <strong>{projectItem.name}</strong>
                      <small>
                        {formatCount(projectSetCount(projectItem.id), 'set')} - {projectItem.status ?? 'draft'}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState
                  title="No projects match"
                  detail="Reset filters or clear the project search."
                  showClearSearch={Boolean(query.trim())}
                  showResetFilters={activeProjectFilterCount > 0}
                  onClearSearch={() => setQuery('')}
                  onResetFilters={() => setProjectFilters({ status: 'all', tag: '', setCount: '' })}
                />
              )}
            </div>
          }
        >
          <div className="filter-panel">
            <label className="filter-field">
              <span>Status</span>
              <select value={projectFilters.status} onChange={(event) => setProjectFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All statuses</option>
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Tags</span>
              <input value={projectFilters.tag} placeholder="priority, stargate..." onChange={(event) => setProjectFilters((current) => ({ ...current, tag: event.target.value }))} />
            </label>
            <label className="filter-field">
              <span>Set count</span>
              <input value={projectFilters.setCount} placeholder=">=2" onChange={(event) => setProjectFilters((current) => ({ ...current, setCount: event.target.value }))} />
            </label>
          </div>
        </BrowseFilterOverlay>
      ) : null}
    </div>
  );
}

function SetsWorkspace({
  library,
  selectedUniverseId,
  project,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onCreateSetOverlay,
  onLibraryUpdated,
  onProjectLoaded,
  onLoadSet,
  onOpenCard,
  onStatus,
  saveShortcutToken
}: Pick<
  WorkspaceViewProps,
  | 'library'
  | 'selectedUniverseId'
  | 'project'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onCreateSetOverlay'
  | 'onLibraryUpdated'
  | 'onProjectLoaded'
  | 'onLoadSet'
  | 'onOpenCard'
  | 'onStatus'
  | 'saveShortcutToken'
>) {
  const [query, setQuery] = useState('');
  const defaultSetProjectFilter = selectedUniverseId || 'all';
  const [setFilters, setSetFilters] = useState({
    status: 'all',
    tag: '',
    projectId: defaultSetProjectFilter,
    cardCount: ''
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedSetCode, setSelectedSetCode] = useState(project?.setCode ?? '');
  const [viewingCardId, setViewingCardId] = useState('');
  const [setViewMode, setSetViewMode] = useState<SetViewMode>('grid');
  const [selectedSetCardId, setSelectedSetCardId] = useState(activeCardIdForProject(project));
  const currentProject = library?.universes.find((universe) => universe.id === selectedUniverseId);
  const allSets = useMemo(() => library?.sets ?? [], [library]);
  const activeSetFilterCount = countActiveFilters([
    { value: setFilters.status, defaultValue: 'all' },
    { value: setFilters.tag, defaultValue: '' },
    { value: setFilters.projectId, defaultValue: defaultSetProjectFilter },
    { value: setFilters.cardCount, defaultValue: '' }
  ]);
  const sets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allSets.filter((set) => {
      const projectName = library?.universes.find((universe) => universe.id === set.universeId)?.name ?? '';
      const matchesQuery = !needle || `${set.setCode} ${set.setName} ${set.status} ${set.tags.join(' ')} ${projectName}`.toLowerCase().includes(needle);
      const matchesStatus = setFilters.status === 'all' || set.status === setFilters.status;
      const matchesTags = matchesTagFilter(set.tags, setFilters.tag);
      const matchesProject = setFilters.projectId === 'all' || set.universeId === setFilters.projectId;
      return matchesQuery && matchesStatus && matchesTags && matchesProject && matchesNumberQuery(set.cardCount, setFilters.cardCount);
    });
  }, [allSets, library?.universes, query, setFilters]);
  const selectedSet = sets.find((set) => set.setCode === selectedSetCode) ?? sets[0] ?? allSets.find((set) => set.setCode === selectedSetCode) ?? allSets[0];
  const selectedSetDrafts = project && selectedSet && project.setCode === selectedSet.setCode ? project.drafts : [];

  useEffect(() => {
    if (project?.setCode) {
      setSelectedSetCode(project.setCode);
      setSelectedSetCardId(activeCardIdForProject(project));
    }
  }, [project?.setCode]);

  useEffect(() => {
    setSetFilters((current) => (current.projectId === 'all' ? current : { ...current, projectId: selectedUniverseId || 'all' }));
  }, [selectedUniverseId]);

  return (
    <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="Sets"
          subtitle={`${formatCount(sets.length, 'set')} of ${formatCount(allSets.length, 'set')}`}
          newLabel="New set"
          activeFilterCount={activeSetFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={onCreateSetOverlay}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder="Search sets..." onChange={(event) => setQuery(event.target.value)} />
            </label>
          }
        >
          {sets.map((set) => (
            <button
              key={set.setCode}
              type="button"
              className={`entity-row clickable ${set.setCode === selectedSet?.setCode ? 'selected' : ''}`}
              onClick={() => {
                setSelectedSetCode(set.setCode);
                onLoadSet(set.setCode);
              }}
            >
              <Icon name="sets" />
              <span>
                <strong>{set.setCode} - {set.setName}</strong>
                <small>{formatCount(set.cardCount, 'card')} - {set.status}</small>
              </span>
            </button>
          ))}
          {!sets.length ? (
            <FilteredEmptyState
              title="No sets match"
              detail="Sets may be hidden by search or filters."
              showClearSearch={Boolean(query.trim())}
              showResetFilters={activeSetFilterCount > 0}
              onClearSearch={() => setQuery('')}
              onResetFilters={() => setSetFilters({ status: 'all', tag: '', projectId: defaultSetProjectFilter, cardCount: '' })}
            />
          ) : null}
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize sets list panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show sets panel" aria-label="Show sets panel">
          <Icon name="collapseRight" />
        </button>
      ) : null}
      <section className="workspace-canvas">
        <div className="visual-management-header">
          <div>
            <h2>{selectedSet?.setName ?? 'Sets'}</h2>
            <p>{selectedSet ? `${selectedSet.setCode} - ${formatCount(selectedSet.cardCount, 'card')} - ${selectedSet.status}` : 'Choose a set from the left panel.'}</p>
          </div>
          <div className="header-action-row">
            <div className="segmented-control collection-view-mode" role="group" aria-label="Set view mode">
              {(['grid', 'list', 'single'] as SetViewMode[]).map((mode) => (
                <button key={mode} type="button" className={setViewMode === mode ? 'active' : ''} onClick={() => setSetViewMode(mode)}>
                  {mode === 'grid' ? 'Grid' : mode === 'list' ? 'List' : 'Single'}
                </button>
              ))}
            </div>
            <button type="button" className="secondary-button" disabled={!selectedSet} onClick={() => selectedSet ? void exportSetPackage(selectedSet.setCode, onStatus) : undefined}>
              Export Set
            </button>
          </div>
        </div>
        <SetCardViews
          mode={setViewMode}
          drafts={selectedSetDrafts}
          selectedCardId={selectedSetCardId}
          emptyText={selectedSet ? 'Loading card renders for this set...' : 'Choose a set from the left panel.'}
          onSelectCard={setSelectedSetCardId}
          onEdit={(cardId) => selectedSet ? void onOpenCard(selectedSet.setCode, cardId) : undefined}
          onView={(cardId) => {
            setSelectedSetCardId(cardId);
            setViewingCardId(cardId);
          }}
        />
      </section>
      {showRightPanel ? <PanelResizeHandle label="Resize set inspector panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
      <section className="workspace-inspector-panel">
        <WorkspacePanelToolbar label="Hide set inspector panel" icon="collapseRight" onClick={() => onShowRightPanelChange(false)} />
        <SetEditorPanel
          library={library}
          project={currentProject}
          set={selectedSet}
          saveShortcutToken={saveShortcutToken}
          onLibraryUpdated={onLibraryUpdated}
          onProjectLoaded={onProjectLoaded}
          onLoadSet={onLoadSet}
          onStatus={onStatus}
        />
      </section>
      ) : null}
      {!showRightPanel ? (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show set inspector" aria-label="Show set inspector">
          <Icon name="collapseLeft" />
        </button>
      ) : null}
      {viewingCardId && selectedSet ? (
        <CardBrowserLightbox
          drafts={selectedSetDrafts}
          initialCardId={viewingCardId}
          title={selectedSet.setName}
          onClose={() => setViewingCardId('')}
          onEdit={(cardId) => void onOpenCard(selectedSet.setCode, cardId)}
          onDelete={(draftToDelete) => onStatus(`Trash support is staged next; ${draftToDelete.name} was not deleted.`)}
          onStatus={onStatus}
        />
      ) : null}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Sets"
          subtitle="Filter set metadata across projects while keeping set search visible."
          resultsLabel={`${sets.length} matching sets`}
          activeFilterCount={activeSetFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={() => setSetFilters({ status: 'all', tag: '', projectId: defaultSetProjectFilter, cardCount: '' })}
          results={
            <div className="filter-result-list">
              {sets.length ? (
                sets.map((set) => (
                  <button
                    key={set.setCode}
                    type="button"
                    className={`entity-row clickable ${set.setCode === selectedSet?.setCode ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedSetCode(set.setCode);
                      void onLoadSet(set.setCode);
                      setFiltersOpen(false);
                    }}
                  >
                    <Icon name="sets" />
                    <span>
                      <strong>{set.setCode} - {set.setName}</strong>
                      <small>
                        {formatCount(set.cardCount, 'card')} - {set.status}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState
                  title="No sets match"
                  detail="Reset filters or clear the set search."
                  showClearSearch={Boolean(query.trim())}
                  showResetFilters={activeSetFilterCount > 0}
                  onClearSearch={() => setQuery('')}
                  onResetFilters={() => setSetFilters({ status: 'all', tag: '', projectId: defaultSetProjectFilter, cardCount: '' })}
                />
              )}
            </div>
          }
        >
          <div className="filter-panel">
            <label className="filter-field">
              <span>Status</span>
              <select value={setFilters.status} onChange={(event) => setSetFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All statuses</option>
                {SET_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Tags</span>
              <input value={setFilters.tag} placeholder="demo, commander..." onChange={(event) => setSetFilters((current) => ({ ...current, tag: event.target.value }))} />
            </label>
            <label className="filter-field">
              <span>Project</span>
              <select value={setFilters.projectId} onChange={(event) => setSetFilters((current) => ({ ...current, projectId: event.target.value }))}>
                <option value="all">All projects</option>
                {(library?.universes ?? []).map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Card count</span>
              <input value={setFilters.cardCount} placeholder=">20" onChange={(event) => setSetFilters((current) => ({ ...current, cardCount: event.target.value }))} />
            </label>
          </div>
        </BrowseFilterOverlay>
      ) : null}
    </div>
  );
}

function SetCoverTile({
  set,
  coverDraft,
  fallbackCoverUrl,
  detailOverride,
  selected,
  onSelect,
  onEdit,
  onView,
  onDelete
}: {
  set: SetSummary;
  coverDraft?: CardDraft;
  fallbackCoverUrl?: string;
  detailOverride?: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  const coverUrl = coverDraft && draftArtSrc(coverDraft) ? draftArtSrc(coverDraft) : fallbackCoverUrl;
  return (
    <button type="button" className={`set-cover-tile ${selected ? 'selected' : ''}`} onClick={onSelect}>
      {coverUrl ? <img className="set-cover-art" src={coverUrl} alt="" /> : <span className="tile-art-placeholder">{set.setCode}</span>}
      <span className="tile-copy">
        <strong>{set.setName}</strong>
        <small>
          {detailOverride ?? `${set.setCode} - ${formatCount(set.cardCount, 'card')} - ${set.status}`}
        </small>
      </span>
    </button>
  );
}

function activeCardIdForProject(project: EditorProject | null | undefined): string {
  return project?.drafts[0]?.cardId ?? '';
}

function CardImageGrid({
  drafts,
  emptyText,
  onEdit,
  onView,
  onDelete,
  onStatus
}: {
  drafts: CardDraft[];
  emptyText: string;
  onEdit: (cardId: string) => void;
  onView: (cardId: string) => void;
  onDelete: (draft: CardDraft) => void;
  onStatus: (message: string) => void;
}) {
  if (!drafts.length) {
    return (
      <div className="preview-empty">
        <strong>No cards shown</strong>
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="card-image-grid">
      {drafts.map((draft) => (
        <button
          key={`${draft.cardId}-${draft.variantId}`}
          type="button"
          className="card-image-tile"
          onClick={() => onEdit(draft.cardId)}
          onDoubleClick={(event) => {
            event.preventDefault();
            onView(draft.cardId);
          }}
        >
          {draftArtSrc(draft) ? <img src={draftArtSrc(draft)} alt="" /> : <span className="tile-art-placeholder">{draft.collectorNumber}</span>}
          <span className="tile-copy">
            <strong>{draft.collectorNumber} {draft.name}</strong>
            <small>{draft.typeLine || 'Untyped card'}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function CardBrowserLightbox({
  drafts,
  initialCardId,
  title,
  onClose,
  onEdit,
  onDelete,
  onStatus
}: {
  drafts: CardDraft[];
  initialCardId: string;
  title: string;
  onClose: () => void;
  onEdit: (cardId: string) => void;
  onDelete: (draft: CardDraft) => void;
  onStatus: (message: string) => void;
}) {
  const [selectedCardId, setSelectedCardId] = useState(initialCardId);
  const selectedDraft = drafts.find((draft) => draft.cardId === selectedCardId) ?? drafts[0];

  useEffect(() => {
    setSelectedCardId(initialCardId);
  }, [initialCardId]);

  return (
    <div className="workspace-lightbox" role="dialog" aria-modal="true" aria-label={title}>
      <div className="workspace-lightbox-panel">
        <div className="visual-management-header">
          <div>
            <h2>{title}</h2>
            <p>{selectedDraft ? `${selectedDraft.collectorNumber} ${selectedDraft.name}` : 'No card selected'}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            x
          </button>
        </div>
        <div className="lightbox-card-layout">
          <CardImageGrid
            drafts={drafts}
            emptyText="No cards in this set yet."
            onEdit={(cardId) => setSelectedCardId(cardId)}
            onView={(cardId) => setSelectedCardId(cardId)}
            onDelete={onDelete}
            onStatus={onStatus}
          />
          <div className="workspace-card">
            {selectedDraft ? (
              <>
                {draftArtSrc(selectedDraft) ? <img className="lightbox-art" src={draftArtSrc(selectedDraft)} alt="" /> : <span className="tile-art-placeholder large">{selectedDraft.collectorNumber}</span>}
                <h2>{selectedDraft.name}</h2>
                <p className="workspace-copy">{selectedDraft.typeLine}</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    onEdit(selectedDraft.cardId);
                    onClose();
                  }}
                >
                  Edit Card
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SetBrowserModal({
  setCode,
  onClose,
  onOpenCard,
  onStatus
}: {
  setCode: string;
  onClose: () => void;
  onOpenCard: (setCode: string, cardId: string, variantId?: string) => Promise<void> | void;
  onStatus: (message: string) => void;
}) {
  const [loaded, setLoaded] = useState<EditorProject | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchProject(setCode)
      .then((project) => {
        if (!cancelled) {
          setLoaded(project);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onStatus, setCode]);

  return (
    <div className="workspace-lightbox" role="dialog" aria-modal="true" aria-label={`${setCode} cards`}>
      <div className="workspace-lightbox-panel">
        <div className="visual-management-header">
          <div>
            <h2>{loaded?.setName ?? setCode}</h2>
            <p>{loaded ? formatCount(loaded.drafts.length, 'card') : 'Loading cards...'}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Close">
            x
          </button>
        </div>
        <CardImageGrid
          drafts={loaded?.drafts ?? []}
          emptyText={loaded ? 'No cards in this set yet.' : 'Loading card renders for this set...'}
          onEdit={(cardId) => {
            void onOpenCard(setCode, cardId);
            onClose();
          }}
          onView={() => undefined}
          onDelete={(draft) => onStatus(`Trash support is staged next; ${draft.name} was not deleted.`)}
          onStatus={onStatus}
        />
      </div>
    </div>
  );
}

async function exportSetPackage(setCode: string, onStatus: (message: string) => void): Promise<void> {
  try {
    const result = await exportSource({ setCode, target: 'cockatrice_zip' });
    downloadContent(result.filename, result.mimeType, result.encoding, result.content);
    onStatus(result.sync ? `Exported ${result.filename}. Synced ${result.sync.imageCount} Cockatrice images.` : `Exported ${result.filename}.`);
  } catch (error) {
    onStatus(error instanceof Error ? error.message : String(error));
  }
}

function EntityListPanel({
  title,
  subtitle,
  newLabel,
  filtersOpen,
  filterControls,
  searchControl,
  activeFilterCount = 0,
  children,
  onToggleFilters,
  onOpenFilters,
  onNew,
  onCollapse
}: {
  title: string;
  subtitle: string;
  newLabel: string;
  filtersOpen?: boolean;
  filterControls?: ReactNode;
  searchControl?: ReactNode;
  activeFilterCount?: number;
  children: ReactNode;
  onToggleFilters?: () => void;
  onOpenFilters?: () => void;
  onNew?: () => void;
  onCollapse?: () => void;
}) {
  const visibleSearch = searchControl ?? filterControls;
  const canFilter = Boolean(onOpenFilters || onToggleFilters || activeFilterCount > 0);
  return (
    <aside className="entity-list-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="panel-heading-actions">
          {onCollapse ? (
            <button type="button" className="panel-control-button" onClick={onCollapse} title={`Hide ${title.toLowerCase()} panel`} aria-label={`Hide ${title.toLowerCase()} panel`}>
              <Icon name="collapseLeft" />
            </button>
          ) : null}
          {canFilter ? <FilterButton label={`Filter ${title.toLowerCase()}`} activeCount={activeFilterCount} onClick={onOpenFilters ?? onToggleFilters ?? (() => undefined)} /> : null}
          {onNew ? (
            <button type="button" className="icon-button" onClick={onNew} title={newLabel}>
              <Icon name="new" />
            </button>
          ) : null}
        </div>
      </div>
      {visibleSearch ? <div className="card-list-tools">{visibleSearch}</div> : null}
      {filtersOpen && searchControl && filterControls ? <div className="card-list-tools inline-filter-controls">{filterControls}</div> : null}
      <div className="entity-list-scroll">{children}</div>
    </aside>
  );
}

function WorkspacePanelToolbar({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
  return (
    <div className="workspace-panel-toolbar">
      <button type="button" className="panel-control-button" onClick={onClick} title={label} aria-label={label}>
        <Icon name={icon} />
      </button>
    </div>
  );
}

function ProjectSummaryCard({ project, sets }: { project?: UniverseSummary; sets: SetSummary[] }) {
  const projectSets = sets.filter((set) => set.universeId === project?.id);
  return (
    <div className="workspace-card">
      <h2>{project?.name ?? 'No Project Selected'}</h2>
      <p className="workspace-copy">{project?.description ?? 'Select or create a project to organize related sets.'}</p>
      <div className="entity-row">
        <Icon name="sets" />
        <span>
          <strong>{formatCount(projectSets.length, 'set')}</strong>
          <small>Project library and export grouping</small>
        </span>
      </div>
    </div>
  );
}

function SetSummaryCard({ project, sets, activeSetCode }: { project?: UniverseSummary; sets: SetSummary[]; activeSetCode?: string }) {
  const activeSet = sets.find((set) => set.setCode === activeSetCode) ?? sets[0];
  return (
    <div className="workspace-card">
      <h2>{project?.name ?? 'Current Project'}</h2>
      <p className="workspace-copy">{formatCount(sets.length, 'set')} {sets.length === 1 ? 'is' : 'are'} available in this project. Use the plus button in the Sets panel to create another one.</p>
      {activeSet ? (
        <div className="entity-row">
          <Icon name="sets" />
          <span>
            <strong>{activeSet.setCode} - {activeSet.setName}</strong>
            <small>{formatCount(activeSet.cardCount, 'card')} - {activeSet.status}</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ProjectEditorPanel({
  project,
  sets,
  saveShortcutToken,
  onLibraryUpdated,
  onStatus
}: {
  project?: UniverseSummary;
  sets: SetSummary[];
  saveShortcutToken: number;
  onLibraryUpdated: (library: LibraryState) => void;
  onStatus: (message: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState(project?.status ?? 'draft');
  const [tags, setTags] = useState<string[]>(project?.tags ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setStatus(project?.status ?? 'draft');
    setTags(project?.tags ?? []);
  }, [project?.description, project?.id, project?.name, project?.status, project?.tags]);

  useEffect(() => {
    if (!saveShortcutToken) {
      return;
    }
    void handleSave();
  }, [saveShortcutToken]);

  async function handleSave() {
    if (!project) {
      onStatus('No project is selected to save.');
      return;
    }
    if (busy) {
      onStatus('Project save is already in progress.');
      return;
    }
    if (!name.trim()) {
      onStatus('Project name is required before saving.');
      return;
    }
    setBusy(true);
    try {
      const next = await updateUniverse({
        universeId: project.id,
        name,
        description,
        status,
        tags
      });
      onLibraryUpdated(next);
      onStatus(`Saved project ${name}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-card">
      <h2>Project Inspector</h2>
      <Field label="Project name">
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Notes">
        <textarea value={description} rows={4} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="grid-2">
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags">
          <TagEditor value={tags} suggestions={[...(project?.tags ?? []), ...sets.flatMap((set) => set.tags)]} placeholder="priority, teaching" ariaLabel="Project tags" onChange={setTags} />
        </Field>
      </div>
      <div className="form-actions">
        <button type="button" className="primary-button" disabled={!project || busy || !name.trim()} onClick={() => void handleSave()}>
          {busy ? 'Saving...' : 'Save Project'}
        </button>
      </div>
      <div className="entity-row">
        <Icon name="sets" />
        <span>
          <strong>{formatCount(sets.length, 'set')}</strong>
          <small>Selected project contents</small>
        </span>
      </div>
    </div>
  );
}

function SetEditorPanel({
  library,
  project,
  set,
  saveShortcutToken,
  onLibraryUpdated,
  onProjectLoaded,
  onLoadSet,
  onStatus
}: {
  library: LibraryState | null;
  project?: UniverseSummary;
  set?: SetSummary;
  saveShortcutToken: number;
  onLibraryUpdated: (library: LibraryState) => void;
  onProjectLoaded: (project: EditorProject) => void;
  onLoadSet: (setCode: string) => Promise<void> | void;
  onStatus: (message: string) => void;
}) {
  const [setName, setSetName] = useState(set?.setName ?? '');
  const [status, setStatus] = useState(set?.status ?? 'draft');
  const [tags, setTags] = useState<string[]>(set?.tags ?? []);
  const [universeId, setUniverseId] = useState(set?.universeId ?? project?.id ?? '');
  const [codeEditing, setCodeEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSetName(set?.setName ?? '');
    setStatus(set?.status ?? 'draft');
    setTags(set?.tags ?? []);
    setUniverseId(set?.universeId ?? project?.id ?? '');
    setCodeEditing(false);
  }, [project?.id, set?.setCode, set?.setName, set?.status, set?.tags, set?.universeId]);

  useEffect(() => {
    if (!saveShortcutToken) {
      return;
    }
    void handleSave();
  }, [saveShortcutToken]);

  async function handleSave() {
    if (!set) {
      onStatus('No set is selected to save.');
      return;
    }
    if (busy) {
      onStatus('Set save is already in progress.');
      return;
    }
    if (!setName.trim() || !universeId) {
      onStatus('Set name and project are required before saving.');
      return;
    }
    const nextUniverse = universeId || set.universeId;
    if (nextUniverse !== set.universeId) {
      const confirmed = window.confirm(`Move ${set.setCode} from ${project?.name ?? 'this project'} to ${library?.universes.find((universe) => universe.id === nextUniverse)?.name ?? nextUniverse}?`);
      if (!confirmed) {
        setUniverseId(set.universeId);
        return;
      }
    }
    setBusy(true);
    try {
      const result = await updateSet({
        setCode: set.setCode,
        setName,
        status,
        universeId: nextUniverse,
        tags
      });
      onLibraryUpdated(result.library);
      onProjectLoaded(result.project);
      onStatus(`Saved ${set.setCode}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-card">
      <h2>Set Inspector</h2>
      <Field label="Set code">
        <div className="inline-edit-row">
          <input value={set?.setCode ?? ''} readOnly />
          <button type="button" className="icon-button" title="Change set code" onClick={() => setCodeEditing((value) => !value)}>
            <Icon name="edit" />
          </button>
        </div>
      </Field>
      {codeEditing ? (
        <div className="inline-warning">
          Set-code rename and bulk card moves need the trash/undo layer first. Ordinary set metadata can be saved below.
          <Field label="Available sets">
            <select value={set?.setCode ?? ''} onChange={(event) => void onLoadSet(event.target.value)}>
              {(library?.sets ?? []).map((setOption) => (
                <option key={setOption.setCode} value={setOption.setCode}>
                  {setOption.setCode} - {setOption.setName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}
      <div className="grid-2">
        <Field label="Status">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {SET_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tags">
          <TagEditor value={tags} suggestions={library?.sets.flatMap((setOption) => setOption.tags) ?? []} placeholder="demo, commander" ariaLabel="Set tags" onChange={setTags} />
        </Field>
      </div>
      <Field label="Set name">
        <input value={setName} onChange={(event) => setSetName(event.target.value)} />
      </Field>
      <Field label="Project">
        <select value={universeId} onChange={(event) => setUniverseId(event.target.value)}>
          {(library?.universes ?? []).map((universe) => (
            <option key={universe.id} value={universe.id}>
              {universe.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="form-actions">
        <button type="button" className="primary-button" disabled={!set || busy || !setName.trim() || !universeId} onClick={() => void handleSave()}>
          {busy ? 'Saving...' : 'Save Set'}
        </button>
      </div>
      <div className="entity-row">
        <Icon name="cards" />
        <span>
          <strong>{formatCount(set?.cardCount ?? 0, 'card')}</strong>
          <small>Selected set contents</small>
        </span>
      </div>
    </div>
  );
}

function LibraryWorkspace({
  project,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onCreateLibraryAsset
}: Pick<
  WorkspaceViewProps,
  | 'project'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onCreateLibraryAsset'
>) {
  const [query, setQuery] = useState('');
  const [libraryFilters, setLibraryFilters] = useState({
    assetType: 'all',
    sourceType: 'all',
    permissionStatus: 'all',
    assigned: 'all'
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const activeLibraryFilterCount = countActiveFilters([
    { value: libraryFilters.assetType, defaultValue: 'all' },
    { value: libraryFilters.sourceType, defaultValue: 'all' },
    { value: libraryFilters.permissionStatus, defaultValue: 'all' },
    { value: libraryFilters.assigned, defaultValue: 'all' }
  ]);
  const libraryItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = (project?.libraryAssets ?? []).map((asset): LibraryItem => ({
      id: asset.artId,
      name: asset.name,
      detail: asset.artist || asset.assignedCards.map((card) => card.name).join(', ') || asset.permissionStatus,
      kind: `${asset.assetType} - ${asset.sourceType}`,
      assetType: asset.assetType,
      sourceType: asset.sourceType,
      permissionStatus: asset.permissionStatus,
      assignedCount: asset.assignedCards.length,
      filePath: asset.filePath,
      sourceUrl: asset.sourceUrl,
      cropX: '',
      cropY: '',
      cropW: '',
      cropH: ''
    }));
    return items.filter((item) => {
      const matchesQuery = !needle || `${item.name} ${item.detail} ${item.kind} ${item.permissionStatus}`.toLowerCase().includes(needle);
      const matchesAssetType = libraryFilters.assetType === 'all' || item.assetType === libraryFilters.assetType;
      const matchesSourceType = libraryFilters.sourceType === 'all' || item.sourceType === libraryFilters.sourceType;
      const matchesPermission = libraryFilters.permissionStatus === 'all' || item.permissionStatus === libraryFilters.permissionStatus;
      const matchesAssignment =
        libraryFilters.assigned === 'all' ||
        (libraryFilters.assigned === 'assigned' && item.assignedCount > 0) ||
        (libraryFilters.assigned === 'unassigned' && item.assignedCount === 0);
      return matchesQuery && matchesAssetType && matchesSourceType && matchesPermission && matchesAssignment;
    });
  }, [libraryFilters, project?.libraryAssets, query]);
  const selectedItem = libraryItems.find((item) => item.id === selectedItemId) ?? libraryItems[0];

  return (
    <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="Gallery"
          subtitle={`${libraryItems.length} visual items`}
          newLabel="New gallery item"
          activeFilterCount={activeLibraryFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={onCreateLibraryAsset}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder="Search gallery..." onChange={(event) => setQuery(event.target.value)} />
            </label>
          }
        >
          {libraryItems.map((item) => (
            <button key={item.id} type="button" className={`entity-row clickable ${item.id === selectedItem?.id ? 'selected' : ''}`} onClick={() => setSelectedItemId(item.id)}>
              <Icon name="assets" />
              <span>
                <strong>{item.name}</strong>
                <small>{item.kind} - {item.detail}</small>
              </span>
            </button>
          ))}
          {!libraryItems.length ? (
            <FilteredEmptyState
              title="No gallery items match"
              detail="Assets may be hidden by search or filters."
              showClearSearch={Boolean(query.trim())}
              showResetFilters={activeLibraryFilterCount > 0}
              onClearSearch={() => setQuery('')}
              onResetFilters={() => setLibraryFilters({ assetType: 'all', sourceType: 'all', permissionStatus: 'all', assigned: 'all' })}
            />
          ) : null}
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize gallery list panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show gallery panel" aria-label="Show gallery panel">
          <Icon name="collapseRight" />
        </button>
      ) : null}
      <section className="workspace-canvas">
        <div className="asset-preview-stage">
          {selectedItem ? (
            <>
              {assetImageSrc(selectedItem) ? <img src={assetImageSrc(selectedItem)} alt={selectedItem.name} /> : <span className="tile-art-placeholder large">{selectedItem.name.slice(0, 2).toUpperCase()}</span>}
              <div className="asset-preview-caption">
                <strong>{selectedItem.name}</strong>
                <span>{selectedItem.kind} - {selectedItem.detail}</span>
              </div>
            </>
          ) : (
            <div className="preview-empty">
              <strong>No asset selected</strong>
              <span>Choose a gallery item from the left panel.</span>
            </div>
          )}
        </div>
      </section>
      {showRightPanel ? <PanelResizeHandle label="Resize gallery inspector panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
      <section className="workspace-inspector-panel">
        <WorkspacePanelToolbar label="Hide gallery inspector panel" icon="collapseRight" onClick={() => onShowRightPanelChange(false)} />
        <LibraryAssetEditorPanel item={selectedItem} itemCount={libraryItems.length} />
      </section>
      ) : null}
      {!showRightPanel ? (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show gallery inspector" aria-label="Show gallery inspector">
          <Icon name="collapseLeft" />
        </button>
      ) : null}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Gallery"
          subtitle="Filter visual inputs by asset source, permissions, and assignment."
          resultsLabel={`${libraryItems.length} matching assets`}
          activeFilterCount={activeLibraryFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={() => setLibraryFilters({ assetType: 'all', sourceType: 'all', permissionStatus: 'all', assigned: 'all' })}
          results={
            <div className="filter-result-list">
              {libraryItems.length ? (
                libraryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`entity-row clickable ${item.id === selectedItem?.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setFiltersOpen(false);
                    }}
                  >
                    <Icon name="assets" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.kind} - {item.permissionStatus}</small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState
                  title="No assets match"
                  detail="Reset filters or clear the gallery search."
                  showClearSearch={Boolean(query.trim())}
                  showResetFilters={activeLibraryFilterCount > 0}
                  onClearSearch={() => setQuery('')}
                  onResetFilters={() => setLibraryFilters({ assetType: 'all', sourceType: 'all', permissionStatus: 'all', assigned: 'all' })}
                />
              )}
            </div>
          }
        >
          <div className="filter-panel">
            <label className="filter-field">
              <span>Asset type</span>
              <select value={libraryFilters.assetType} onChange={(event) => setLibraryFilters((current) => ({ ...current, assetType: event.target.value }))}>
                <option value="all">All asset types</option>
                <option value="art">Art</option>
                <option value="icon">Icon</option>
                <option value="symbol">Set symbol</option>
                <option value="frame">Frame</option>
                <option value="reference">Reference</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Source type</span>
              <select value={libraryFilters.sourceType} onChange={(event) => setLibraryFilters((current) => ({ ...current, sourceType: event.target.value }))}>
                <option value="all">All source types</option>
                <option value="upload">Upload</option>
                <option value="url">URL</option>
                <option value="local">Local file</option>
                <option value="mtgdesign_reference">MTG.design reference</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Permission</span>
              <select value={libraryFilters.permissionStatus} onChange={(event) => setLibraryFilters((current) => ({ ...current, permissionStatus: event.target.value }))}>
                <option value="all">All permissions</option>
                <option value="owned">Owned</option>
                <option value="licensed">Licensed</option>
                <option value="needs_review">Needs review</option>
                <option value="placeholder">Placeholder</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Assignment</span>
              <select value={libraryFilters.assigned} onChange={(event) => setLibraryFilters((current) => ({ ...current, assigned: event.target.value }))}>
                <option value="all">Assigned or unassigned</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
          </div>
        </BrowseFilterOverlay>
      ) : null}
    </div>
  );
}

function LibraryAssetEditorPanel({ item, itemCount }: { item?: LibraryItem; itemCount: number }) {
  return (
    <div className="workspace-card">
      <h2>{item ? 'Gallery Asset Inspector' : 'Gallery Inspector'}</h2>
      <p className="workspace-copy">{item ? `${item.kind} for ${item.detail}.` : 'Choose a gallery item from the left panel.'}</p>
      <Field label="Asset name">
        <input value={item?.name ?? ''} readOnly />
      </Field>
      <Field label="Artist / source note">
        <input value={item?.detail ?? ''} readOnly />
      </Field>
      <div className="grid-2">
        <Field label="Crop X">
          <input value={item?.cropX ?? ''} readOnly />
        </Field>
        <Field label="Crop Y">
          <input value={item?.cropY ?? ''} readOnly />
        </Field>
        <Field label="Crop W">
          <input value={item?.cropW ?? ''} readOnly />
        </Field>
        <Field label="Crop H">
          <input value={item?.cropH ?? ''} readOnly />
        </Field>
      </div>
      <div className="entity-row">
        <Icon name="assets" />
        <span>
          <strong>{itemCount} items</strong>
          <small>Visual inputs available to the current set</small>
        </span>
      </div>
    </div>
  );
}

function assetImageSrc(item: LibraryItem): string {
  if (item.dataUri) {
    return item.dataUri;
  }
  if (item.sourceUrl) {
    return item.sourceUrl;
  }
  if (item.filePath) {
    return `/api/asset?path=${encodeURIComponent(item.filePath)}`;
  }
  return '';
}

function draftArtSrc(draft: CardDraft): string {
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

function buildManagementColumns(showLeftPanel: boolean, showRightPanel: boolean, leftPanelWidth: number, rightPanelWidth: number): string {
  const columns: string[] = [];
  if (showLeftPanel) {
    columns.push(`${leftPanelWidth}px`, '6px');
  } else {
    columns.push('36px');
  }
  columns.push('minmax(0, 1fr)');
  if (showRightPanel) {
    columns.push('6px', `${rightPanelWidth}px`);
  } else {
    columns.push('36px');
  }
  return columns.join(' ');
}

function SettingsWorkspace({
  project,
  showCardsRailItem,
  onShowCardsRailItemChange,
  showCollectionsRailItem,
  onShowCollectionsRailItemChange,
  onStatus
}: Pick<WorkspaceViewProps, 'project' | 'showCardsRailItem' | 'onShowCardsRailItemChange' | 'showCollectionsRailItem' | 'onShowCollectionsRailItemChange' | 'onStatus'>) {
  const [officialSettings, setOfficialSettings] = useState<OfficialCardSyncSettings>(() => readOfficialCardSyncSettings());
  const [officialStatus, setOfficialStatus] = useState<OfficialCardCatalogStatus | null>(null);
  const [officialSyncing, setOfficialSyncing] = useState(false);
  const stale = shouldAutoSyncOfficialCards(officialStatus, officialSettings);

  useEffect(() => {
    let cancelled = false;
    void fetchOfficialCardStatus()
      .then((status) => {
        if (!cancelled) {
          setOfficialStatus(status);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  const updateOfficialSettings = (patch: Partial<OfficialCardSyncSettings>) => {
    setOfficialSettings((current) => writeOfficialCardSyncSettings({ ...current, ...patch }));
  };

  async function syncOfficialCardsNow() {
    if (officialSyncing) {
      return;
    }
    setOfficialSyncing(true);
    try {
      const status = await syncOfficialCardCatalog('both');
      setOfficialStatus(status);
      onStatus(`Synced official card catalog. ${formatCount(status.prints.count + status.oracle.count, 'card record')} cached.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setOfficialSyncing(false);
    }
  }

  return (
    <div className="workspace-grid">
      <div className="workspace-card">
        <h2>Settings</h2>
        <p className="workspace-copy">Adjust local editor preferences for the active workspace. These settings are local to this browser session.</p>
        <div className="entity-row">
          <Icon name="settings" />
          <span>
            <strong>{project?.setCode ?? 'No set loaded'}</strong>
            <small>Current set context</small>
          </span>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={showCardsRailItem} onChange={(event) => onShowCardsRailItemChange(event.target.checked)} />
          Show Cards in the side rail
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={showCollectionsRailItem} onChange={(event) => onShowCollectionsRailItemChange(event.target.checked)} />
          Show Collections in the side rail
        </label>
        <p className="workspace-copy">You can also change these from View &gt; Panels.</p>
      </div>
      <div className="workspace-card official-settings-card">
        <div className="inspector-heading-row">
          <div>
            <h2>Official Card Catalog</h2>
            <p className="workspace-copy">Local Scryfall-backed cache used by References, Collections, Sets, and Decks.</p>
          </div>
          <StatusPill tone={stale ? 'warning' : officialStatus?.lastError ? 'danger' : 'success'}>{stale ? 'Stale' : officialStatus?.lastError ? 'Error' : 'Ready'}</StatusPill>
        </div>
        <div className="collection-detail-grid">
          <div className="readonly-line">
            <strong>{formatCount(officialStatus?.prints.count ?? 0, 'print')}</strong>
            <span>Print cache</span>
          </div>
          <div className="readonly-line">
            <strong>{formatCount(officialStatus?.oracle.count ?? 0, 'Oracle card')}</strong>
            <span>Oracle cache</span>
          </div>
          <div className="readonly-line">
            <strong>{officialStatus?.prints.syncedAt ? new Date(officialStatus.prints.syncedAt).toLocaleString() : 'Never'}</strong>
            <span>Prints synced</span>
          </div>
          <div className="readonly-line">
            <strong>{officialStatus?.oracle.syncedAt ? new Date(officialStatus.oracle.syncedAt).toLocaleString() : 'Never'}</strong>
            <span>Oracle synced</span>
          </div>
        </div>
        {officialStatus?.lastError ? (
          <p className="workspace-copy warning-copy">Last sync error: {officialStatus.lastError}</p>
        ) : null}
        <label className="checkbox-row">
          <input type="checkbox" checked={officialSettings.autoSync} onChange={(event) => updateOfficialSettings({ autoSync: event.target.checked })} />
          Auto-sync official card catalog in the background
        </label>
        <Field label="Auto-sync cadence">
          <select value={officialSettings.cadence} onChange={(event) => updateOfficialSettings({ cadence: event.target.value as OfficialCardSyncCadence })}>
            <option value="off">Manual only</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </Field>
        <div className="settings-action-row">
          <button type="button" className="primary-button" disabled={officialSyncing} onClick={() => void syncOfficialCardsNow()}>
            {officialSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <span>{officialSettings.autoSync ? `Auto-sync: ${officialCardSyncCadenceLabel(officialSettings.cadence)}` : 'Auto-sync disabled'}</span>
        </div>
      </div>
    </div>
  );
}

function downloadContent(filename: string, mimeType: string, encoding: 'text' | 'base64', content: string): void {
  const bytes = encoding === 'base64' ? Uint8Array.from(window.atob(content), (char) => char.charCodeAt(0)) : content;
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
