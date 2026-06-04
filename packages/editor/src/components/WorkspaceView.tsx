import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  exportCollection,
  exportDeck,
  exportSource,
  fetchCollection,
  fetchCollections,
  fetchDeck,
  fetchDecks,
  fetchPreview,
  fetchProject,
  saveDeck,
  updateSet,
  updateUniverse
} from '../api/client.js';
import type {
  CardDraft,
  CollectionEntry,
  CollectionExportTarget,
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
  SetSummary,
  UniverseSummary
} from '../domain/editorTypes.js';
import type { WorkspaceSection } from '../domain/editorUiTypes.js';
import {
  DECK_STATUS_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  SET_STATUS_OPTIONS,
  countActiveFilters,
  includesAnyFilterText,
  includesFilterText,
  joinTags,
  matchesNumberQuery,
  matchesTagFilter,
  splitTagInput
} from '../domain/filterTypes.js';
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
import { Icon, type IconName } from './Icon.js';
import { PanelResizeHandle } from './PanelResizeHandle.js';
import { ReferenceCreateOverlay } from './overlays/ReferenceCreateOverlay.js';
import { ReferenceFilterControls } from './reference/ReferenceFilterControls.js';
import { RulesGuide } from './reference/RulesGuide.js';
import type { ReferenceCatalog, ReferenceCategory, ReferenceRuleEntry, ReferenceRuleKind, ReferenceTerm } from '@homebrew-forge/forge';

interface WorkspaceViewProps {
  section: Exclude<WorkspaceSection, 'cards'>;
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
  onCreateCollection: () => void;
  onCreateSetOverlay: () => void;
  onCreateProject: () => void;
  onCreateLibraryAsset: () => void;
  onLibraryUpdated: (library: LibraryState) => void;
  onProjectLoaded: (project: EditorProject) => void;
  onReferenceCatalogUpdated: (catalog: ReferenceCatalog) => void;
  onUniverseSelect: (universeId: string) => void;
  onLoadSet: (setCode: string) => Promise<void> | void;
  onOpenCard: (setCode: string, cardId: string) => Promise<void> | void;
  onOpenSet: (setCode: string) => Promise<void> | void;
  onStatus: (message: string) => void;
  deckRefreshToken: number;
  activeDeckId: string;
  collectionRefreshToken: number;
  activeCollectionId: string;
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

export function WorkspaceView({
  section,
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
  onStatus,
  deckRefreshToken,
  activeDeckId,
  collectionRefreshToken,
  activeCollectionId,
  showCollectionsRailItem,
  onShowCollectionsRailItemChange
}: WorkspaceViewProps) {
  return (
    <section className={`workspace-view ${showLeftPanel ? '' : 'hide-left-panel'} ${showRightPanel ? '' : 'hide-right-panel'}`}>
      {section === 'projects' ? (
        <ProjectsWorkspace
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
          onCreateProject={onCreateProject}
          onLibraryUpdated={onLibraryUpdated}
          onUniverseSelect={onUniverseSelect}
          onLoadSet={onLoadSet}
          onOpenCard={onOpenCard}
          onOpenSet={onOpenSet}
          onStatus={onStatus}
        />
      ) : section === 'decks' ? (
        <DecksWorkspace
          library={library}
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
          onStatus={onStatus}
          deckRefreshToken={deckRefreshToken}
          activeDeckId={activeDeckId}
        />
      ) : section === 'collections' ? (
        <CollectionsWorkspace
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
          onCreateCollection={onCreateCollection}
          onStatus={onStatus}
          collectionRefreshToken={collectionRefreshToken}
          activeCollectionId={activeCollectionId}
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
          referenceCatalog={referenceCatalog}
          showLeftPanel={showLeftPanel}
          showRightPanel={showRightPanel}
          leftPanelWidth={leftPanelWidth}
          rightPanelWidth={rightPanelWidth}
          onResizeLeftPanel={onResizeLeftPanel}
          onResizeRightPanel={onResizeRightPanel}
          onShowLeftPanelChange={onShowLeftPanelChange}
          onShowRightPanelChange={onShowRightPanelChange}
          onReferenceCatalogUpdated={onReferenceCatalogUpdated}
          onStatus={onStatus}
        />
      ) : (
        <SettingsWorkspace project={project} showCollectionsRailItem={showCollectionsRailItem} onShowCollectionsRailItemChange={onShowCollectionsRailItemChange} />
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

const referenceModes: Array<{ id: 'terms' | 'rules'; label: string }> = [
  { id: 'terms', label: 'Terms' },
  { id: 'rules', label: 'Rules' }
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
  onCreateCollection,
  onStatus,
  collectionRefreshToken,
  activeCollectionId
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
  | 'onCreateCollection'
  | 'onStatus'
  | 'collectionRefreshToken'
  | 'activeCollectionId'
>) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [query, setQuery] = useState('');
  const [entryQuery, setEntryQuery] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needs_review' | 'matched'>('all');
  const [purposeFilter, setPurposeFilter] = useState<CollectionPurpose | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState(selectedUniverseId || 'all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [matchStrategyFilter, setMatchStrategyFilter] = useState('all');
  const [finishFilter, setFinishFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [busyTarget, setBusyTarget] = useState<CollectionExportTarget | ''>('');
  const activeCollectionFilterCount = countActiveFilters([
    { value: projectFilter, defaultValue: 'all' },
    { value: purposeFilter, defaultValue: 'all' },
    { value: sourceFilter, defaultValue: 'all' },
    { value: reviewFilter, defaultValue: 'all' },
    { value: matchStrategyFilter, defaultValue: 'all' },
    { value: finishFilter, defaultValue: '' },
    { value: conditionFilter, defaultValue: '' },
    { value: languageFilter, defaultValue: '' }
  ]);

  useEffect(() => {
    void loadCollections(activeCollectionId || undefined);
  }, [collectionRefreshToken]);

  useEffect(() => {
    setProjectFilter((current) => (current === 'all' ? current : selectedUniverseId || 'all'));
  }, [selectedUniverseId]);

  async function loadCollections(nextCollectionId?: string) {
    try {
      const loaded = await fetchCollections();
      setCollections(loaded);
      const targetId = nextCollectionId ?? collection?.metadata.collectionId ?? loaded[0]?.collectionId;
      if (targetId) {
        const nextCollection = await fetchCollection(targetId);
        setCollection(nextCollection);
        setSelectedEntryId(nextCollection.entries[0]?.entryId ?? '');
      } else {
        setCollection(null);
        setSelectedEntryId('');
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
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleExportCollection(target: CollectionExportTarget) {
    if (!collection) {
      return;
    }
    setBusyTarget(target);
    try {
      const result = await exportCollection(collection.metadata.collectionId, target);
      downloadContent(result.filename, result.mimeType, 'text', result.content);
      onStatus(`Exported ${result.filename}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyTarget('');
    }
  }

  const filteredCollections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return collections.filter((candidate) => {
      const matchesQuery = !needle || `${candidate.name} ${candidate.description ?? ''} ${candidate.source} ${candidate.purpose}`.toLowerCase().includes(needle);
      const matchesPurpose = purposeFilter === 'all' || candidate.purpose === purposeFilter;
      const matchesProject = projectFilter === 'all' || candidate.linkedUniverseId === projectFilter;
      const matchesSource = sourceFilter === 'all' || candidate.source === sourceFilter;
      return matchesQuery && matchesPurpose && matchesProject && matchesSource;
    });
  }, [collections, projectFilter, purposeFilter, query, sourceFilter]);

  const filteredEntries = useMemo(() => {
    const needle = entryQuery.trim().toLowerCase();
    return (collection?.entries ?? []).filter((entry) => {
      const matchesStatus = reviewFilter === 'all' || entry.reviewStatus === reviewFilter;
      const matchesStrategy = matchStrategyFilter === 'all' || entry.matchStrategy === matchStrategyFilter;
      const matchesFinish = includesFilterText(entry.finish, finishFilter);
      const matchesCondition = includesFilterText(entry.condition, conditionFilter);
      const matchesLanguage = includesFilterText(entry.language, languageFilter);
      const matchesQuery = !needle || `${entry.cardName} ${entry.setCode ?? ''} ${entry.collectorNumber ?? ''} ${entry.condition ?? ''} ${entry.reviewNotes ?? ''}`.toLowerCase().includes(needle);
      return matchesStatus && matchesStrategy && matchesFinish && matchesCondition && matchesLanguage && matchesQuery;
    });
  }, [collection?.entries, conditionFilter, entryQuery, finishFilter, languageFilter, matchStrategyFilter, reviewFilter]);
  const selectedEntry = collection?.entries.find((entry) => entry.entryId === selectedEntryId) ?? filteredEntries[0] ?? collection?.entries[0];

  return (
    <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="Collections"
          subtitle={`${filteredCollections.length} of ${collections.length} collections`}
          newLabel="New collection"
          activeFilterCount={activeCollectionFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={onCreateCollection}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder="Search collections..." onChange={(event) => setQuery(event.target.value)} />
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
                <Icon name="collections" />
                <span>
                  <strong>{candidate.name}</strong>
                  <small>
                    {candidate.cardCount} cards - {purposeLabel(candidate.purpose)}
                    {candidate.reviewCount ? ` - ${candidate.reviewCount} review` : ''}
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
                <p>{collection.entries.reduce((total, entry) => total + entry.quantity, 0)} physical cards</p>
              </div>
              <div className="export-actions">
                <button type="button" className="primary-button" disabled={busyTarget !== ''} onClick={() => void handleExportCollection('csv')}>
                  CSV
                </button>
                <button type="button" className="secondary-button" disabled={busyTarget !== ''} onClick={() => void handleExportCollection('text')}>
                  Text
                </button>
                <button type="button" className="secondary-button" disabled={busyTarget !== ''} onClick={() => void handleExportCollection('cockatrice')}>
                  .cod
                </button>
              </div>
            </div>

            <div className="collection-stat-grid">
              <CollectionStat label="Entries" value={collection.entries.length} />
              <CollectionStat label="Cards" value={collection.entries.reduce((total, entry) => total + entry.quantity, 0)} />
              <CollectionStat label="Matched" value={collection.entries.filter((entry) => entry.reviewStatus === 'matched').length} />
              <CollectionStat label="Review" value={collection.entries.filter((entry) => entry.reviewStatus === 'needs_review').length} />
            </div>

            <div className="collection-table-toolbar">
              <label className="search-field">
                <Icon name="search" />
                <input value={entryQuery} placeholder="Search cards..." onChange={(event) => setEntryQuery(event.target.value)} />
              </label>
              <span className="filter-count-note">{activeCollectionFilterCount ? `${activeCollectionFilterCount} active filters` : 'No filters active'}</span>
            </div>

            <div className="collection-table" role="table" aria-label="Collection entries">
              <div className="collection-table-row header" role="row">
                <span>Qty</span>
                <span>Card</span>
                <span>Print</span>
                <span>Finish</span>
                <span>Condition</span>
                <span>Status</span>
              </div>
              {filteredEntries.map((entry) => (
                <button
                  key={entry.entryId}
                  type="button"
                  className={`collection-table-row ${entry.reviewStatus === 'needs_review' ? 'needs-review' : ''} ${entry.entryId === selectedEntry?.entryId ? 'selected' : ''}`}
                  role="row"
                  onClick={() => setSelectedEntryId(entry.entryId)}
                >
                  <span>{entry.quantity}</span>
                  <span>
                    <strong>{entry.cardName}</strong>
                    {entry.reviewNotes ? <small>{entry.reviewNotes}</small> : null}
                  </span>
                  <span>{collectionPrintLabel(entry)}</span>
                  <span>{entry.finish ?? '-'}</span>
                  <span>{entry.condition ?? '-'}</span>
                  <span>
                    <CollectionStatusPill status={entry.reviewStatus} />
                  </span>
                </button>
              ))}
              {filteredEntries.length === 0 ? <p className="workspace-copy">No collection rows match the current filter.</p> : null}
            </div>
          </div>
        ) : (
          <div className="workspace-preview-hero">
            <div className="tile-art-placeholder large collection-empty-mark">
              <Icon name="collections" />
            </div>
            <div>
              <h2>No collection selected</h2>
              <p>Create a collection from the plus button, or adjust the filters if a collection is hidden.</p>
            </div>
          </div>
        )}
      </section>

      {showRightPanel ? <PanelResizeHandle label="Resize collection details panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
        <aside className="workspace-inspector-panel">
          <WorkspacePanelToolbar label="Hide collection details panel" icon="collapseLeft" onClick={() => onShowRightPanelChange(false)} />
          <CollectionDetailsPanel collection={collection} entry={selectedEntry} library={library} busyTarget={busyTarget} onExport={(target) => void handleExportCollection(target)} />
        </aside>
      ) : (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show collection details" aria-label="Show collection details">
          <Icon name="collapseLeft" />
        </button>
      )}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Collections"
          subtitle="Filter collections and rows in the selected collection without hiding search."
          resultsLabel={`${filteredCollections.length} matching collections`}
          activeFilterCount={activeCollectionFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={() => {
            setProjectFilter('all');
            setPurposeFilter('all');
            setSourceFilter('all');
            setReviewFilter('all');
            setMatchStrategyFilter('all');
            setFinishFilter('');
            setConditionFilter('');
            setLanguageFilter('');
          }}
          results={
            <div className="filter-result-list">
              {filteredCollections.length ? (
                filteredCollections.map((candidate) => (
                  <button key={candidate.collectionId} type="button" className={`entity-row clickable ${candidate.collectionId === collection?.metadata.collectionId ? 'selected' : ''}`} onClick={() => { void handleSelectCollection(candidate.collectionId); setFiltersOpen(false); }}>
                    <Icon name="collections" />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{candidate.cardCount} cards - {purposeLabel(candidate.purpose)}</small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState title="No collections match" detail="Reset filters or clear the collection search." showClearSearch={Boolean(query.trim())} showResetFilters={activeCollectionFilterCount > 0} onClearSearch={() => setQuery('')} onResetFilters={() => {
                  setProjectFilter('all');
                  setPurposeFilter('all');
                  setSourceFilter('all');
                  setReviewFilter('all');
                  setMatchStrategyFilter('all');
                  setFinishFilter('');
                  setConditionFilter('');
                  setLanguageFilter('');
                }} />
              )}
            </div>
          }
        >
          <div className="filter-panel">
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
              <span>Finish</span>
              <input value={finishFilter} placeholder="foil, nonfoil..." onChange={(event) => setFinishFilter(event.target.value)} />
            </label>
            <label className="filter-field">
              <span>Condition</span>
              <input value={conditionFilter} placeholder="near mint, played..." onChange={(event) => setConditionFilter(event.target.value)} />
            </label>
            <label className="filter-field">
              <span>Language</span>
              <input value={languageFilter} placeholder="en, jp..." onChange={(event) => setLanguageFilter(event.target.value)} />
            </label>
          </div>
        </BrowseFilterOverlay>
      ) : null}
    </div>
  );
}

function CollectionStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="collection-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function CollectionDetailsPanel({
  collection,
  entry,
  library,
  busyTarget,
  onExport
}: {
  collection: CollectionState | null;
  entry?: CollectionEntry;
  library: LibraryState | null;
  busyTarget: CollectionExportTarget | '';
  onExport: (target: CollectionExportTarget) => void;
}) {
  if (!collection) {
    return (
      <div className="collection-details-panel">
        <h2>Collection Details</h2>
        <div className="preview-empty compact-empty">
          <strong>No collection selected</strong>
          <span>Choose a collection from the left panel.</span>
        </div>
      </div>
    );
  }
  const projectName = library?.universes.find((universe) => universe.id === collection.metadata.linkedUniverseId)?.name ?? 'No project';
  return (
    <div className="collection-details-panel">
      <h2>Collection Details</h2>
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
      <div className="export-actions">
        <button type="button" className="primary-button" disabled={busyTarget !== ''} onClick={() => onExport('csv')}>
          CSV
        </button>
        <button type="button" className="secondary-button" disabled={busyTarget !== ''} onClick={() => onExport('text')}>
          Text
        </button>
        <button type="button" className="secondary-button" disabled={busyTarget !== ''} onClick={() => onExport('cockatrice')}>
          .cod
        </button>
      </div>
      <div className="collection-card-preview">
        <div className="tile-art-placeholder large collection-card-mark">
          <span>{entry?.cardName.slice(0, 2).toUpperCase() ?? 'NA'}</span>
        </div>
        <div>
          <h3>{entry?.cardName ?? 'No card selected'}</h3>
          <p className="workspace-copy">{entry ? `${entry.quantity} copy${entry.quantity === 1 ? '' : 'ies'} - ${collectionPrintLabel(entry)}` : 'Select a collection row to inspect it.'}</p>
          {entry ? <CollectionStatusPill status={entry.reviewStatus} /> : null}
        </div>
      </div>
      {entry ? (
        <div className="collection-entry-metadata">
          <div className="readonly-line">
            <strong>Finish</strong>
            <span>{entry.finish ?? '-'}</span>
          </div>
          <div className="readonly-line">
            <strong>Condition</strong>
            <span>{entry.condition ?? '-'}</span>
          </div>
          <div className="readonly-line">
            <strong>Language</strong>
            <span>{entry.language ?? '-'}</span>
          </div>
          <div className="readonly-line">
            <strong>Review</strong>
            <span>{entry.reviewNotes ?? 'Matched'}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CollectionStatusPill({ status }: { status: CollectionEntry['reviewStatus'] }) {
  return <span className={`collection-status-pill ${status}`}>{status === 'needs_review' ? 'Review' : 'Matched'}</span>;
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
  onStatus,
  deckRefreshToken,
  activeDeckId
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
  | 'onCreateDeck'
  | 'onOpenCard'
  | 'onStatus'
  | 'deckRefreshToken'
  | 'activeDeckId'
>) {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [deck, setDeck] = useState<DeckState | null>(null);
  const [query, setQuery] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [collectionQuery, setCollectionQuery] = useState('');
  const [deckCollections, setDeckCollections] = useState<CollectionSummary[]>([]);
  const [selectedDeckCollectionId, setSelectedDeckCollectionId] = useState('');
  const [deckCollection, setDeckCollection] = useState<CollectionState | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deckFilters, setDeckFilters] = useState({
    status: 'all',
    tag: '',
    format: '',
    linkedUniverseId: 'all',
    linkedSetCode: 'all',
    unresolved: 'all',
    mainCount: '',
    sideCount: '',
    maybeCount: ''
  });
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const activeDeckFilterCount = countActiveFilters([
    { value: deckFilters.status, defaultValue: 'all' },
    { value: deckFilters.tag, defaultValue: '' },
    { value: deckFilters.format, defaultValue: '' },
    { value: deckFilters.linkedUniverseId, defaultValue: 'all' },
    { value: deckFilters.linkedSetCode, defaultValue: 'all' },
    { value: deckFilters.unresolved, defaultValue: 'all' },
    { value: deckFilters.mainCount, defaultValue: '' },
    { value: deckFilters.sideCount, defaultValue: '' },
    { value: deckFilters.maybeCount, defaultValue: '' }
  ]);

  useEffect(() => {
    void loadDecks(activeDeckId || undefined);
  }, [deckRefreshToken]);

  useEffect(() => {
    void loadDeckCollections();
  }, []);

  async function loadDecks(nextDeckId?: string) {
    try {
      const loaded = await fetchDecks();
      setDecks(loaded);
      const targetId = nextDeckId ?? deck?.metadata.deckId ?? loaded[0]?.deckId;
      if (targetId) {
        setDeck(await fetchDeck(targetId));
      } else {
        setDeck(null);
      }
      setDirty(false);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function loadDeckCollections() {
    try {
      const loaded = await fetchCollections();
      setDeckCollections(loaded);
      if (loaded[0]) {
        await handleSelectDeckCollection(loaded[0].collectionId);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectDeckCollection(collectionId: string) {
    setSelectedDeckCollectionId(collectionId);
    if (!collectionId) {
      setDeckCollection(null);
      return;
    }
    try {
      setDeckCollection(await fetchCollection(collectionId));
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleSelectDeck(deckId: string) {
    try {
      setDeck(await fetchDeck(deckId));
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

  async function handleExportDeck(target: 'text' | 'cockatrice') {
    if (!deck) {
      return;
    }
    try {
      const result = await exportDeck(deck.metadata.deckId, target);
      downloadContent(result.filename, result.mimeType, 'text', result.content);
      onStatus(`Exported ${result.filename}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
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

  function addCard(card: DeckCardOption) {
    if (!deck) {
      return;
    }
    const existingIndex = deck.entries.findIndex((entry) => entry.section === 'main' && entry.setCode === card.setCode && entry.cardId === card.cardId);
    const entries =
      existingIndex >= 0
        ? deck.entries.map((entry, index) => (index === existingIndex ? { ...entry, count: entry.count + 1, card, nameSnapshot: card.name } : entry))
        : [
            ...deck.entries,
            {
              deckId: deck.metadata.deckId,
              section: 'main' as const,
              count: 1,
              setCode: card.setCode,
              cardId: card.cardId,
              nameSnapshot: card.name,
              card
            }
          ];
    updateDeck({ ...deck, entries });
  }

  function addCollectionCard(entry: CollectionEntry) {
    if (!deck) {
      return;
    }
    const setCode = (entry.setCode || deckCollection?.metadata.collectionId || 'COLL').toUpperCase();
    const cardId = entry.scryfallId || entry.entryId;
    const existingIndex = deck.entries.findIndex((deckEntry) => deckEntry.section === 'main' && deckEntry.setCode === setCode && deckEntry.cardId === cardId);
    const entries =
      existingIndex >= 0
        ? deck.entries.map((deckEntry, index) => (index === existingIndex ? { ...deckEntry, count: deckEntry.count + 1, nameSnapshot: entry.cardName } : deckEntry))
        : [
            ...deck.entries,
            {
              deckId: deck.metadata.deckId,
              section: 'main' as const,
              count: 1,
              setCode,
              cardId,
              nameSnapshot: entry.cardName
            }
          ];
    updateDeck({ ...deck, entries });
  }

  function updateEntry(index: number, next: Partial<DeckEntry>) {
    if (!deck) {
      return;
    }
    updateDeck({
      ...deck,
      entries: deck.entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...next, count: Math.max(1, Number(next.count ?? entry.count) || 1) } : entry))
    });
  }

  function removeEntry(index: number) {
    if (!deck) {
      return;
    }
    updateDeck({ ...deck, entries: deck.entries.filter((_, entryIndex) => entryIndex !== index) });
  }

  const filteredDecks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return decks.filter((candidate) => {
      const matchesQuery = !needle || `${candidate.name} ${candidate.description ?? ''} ${candidate.status} ${candidate.format ?? ''} ${candidate.tags.join(' ')}`.toLowerCase().includes(needle);
      const matchesStatus = deckFilters.status === 'all' || candidate.status === deckFilters.status;
      const matchesTags = matchesTagFilter(candidate.tags, deckFilters.tag);
      const matchesFormat = includesFilterText(candidate.format, deckFilters.format);
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
        matchesFormat &&
        matchesProject &&
        matchesSet &&
        matchesUnresolved &&
        matchesNumberQuery(candidate.mainCount, deckFilters.mainCount) &&
        matchesNumberQuery(candidate.sideCount, deckFilters.sideCount) &&
        matchesNumberQuery(candidate.maybeCount, deckFilters.maybeCount)
      );
    });
  }, [deckFilters, decks, query]);

  const filteredCards = useMemo(() => {
    const needle = cardQuery.trim().toLowerCase();
    return (deck?.availableCards ?? [])
      .filter((card) => !needle || `${card.name} ${card.typeLine} ${card.setCode} ${card.setName} ${card.oracleText} ${card.flavorText} ${card.status} ${card.tags.join(' ')}`.toLowerCase().includes(needle))
      .slice(0, 120);
  }, [cardQuery, deck?.availableCards]);

  const filteredDeckCollectionEntries = useMemo(() => {
    const needle = collectionQuery.trim().toLowerCase();
    return (deckCollection?.entries ?? [])
      .filter((entry) => !needle || `${entry.cardName} ${entry.setCode ?? ''} ${entry.collectorNumber ?? ''} ${entry.condition ?? ''} ${entry.reviewNotes ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 120);
  }, [collectionQuery, deckCollection?.entries]);

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
          <div className="entity-list">
            {filteredDecks.map((candidate) => (
              <button key={candidate.deckId} type="button" className={`entity-row clickable ${candidate.deckId === deck?.metadata.deckId ? 'selected' : ''}`} onClick={() => void handleSelectDeck(candidate.deckId)}>
                <Icon name="decks" />
                <span>
                  <strong>{candidate.name}</strong>
                  <small>
                    {candidate.cardCount} cards - {candidate.status}
                    {candidate.unresolvedCount ? ` - ${candidate.unresolvedCount} unresolved` : ''}
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
              <div>
                <h2>{deck.metadata.name}</h2>
                <p>{deck.entries.reduce((total, entry) => total + entry.count, 0)} cards across Main, Sideboard, and Maybeboard</p>
              </div>
              <div className="export-actions">
                <button type="button" className="primary-button" disabled={busy || !dirty} onClick={() => void handleSaveDeck()}>
                  Save deck
                </button>
                <button type="button" className="secondary-button" onClick={() => void handleExportDeck('text')}>
                  Export text
                </button>
                <button type="button" className="secondary-button" onClick={() => void handleExportDeck('cockatrice')}>
                  Export .cod
                </button>
              </div>
            </div>

            <div className="deck-meta-grid">
              <Field label="Name">
                <input value={deck.metadata.name} onChange={(event) => updateMetadata({ name: event.target.value })} />
              </Field>
              <Field label="Format">
                <input value={deck.metadata.format ?? ''} placeholder="Kitchen table, Commander, playtest..." onChange={(event) => updateMetadata({ format: event.target.value })} />
              </Field>
              <Field label="Status">
                <select value={deck.metadata.status} onChange={(event) => updateMetadata({ status: event.target.value as DeckMetadata['status'] })}>
                  {DECK_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags">
                <input value={joinTags(deck.metadata.tags)} placeholder="playtest, aggro" onChange={(event) => updateMetadata({ tags: splitTagInput(event.target.value) })} />
              </Field>
              <Field label="Linked project">
                <select value={deck.metadata.linkedUniverseId ?? ''} onChange={(event) => updateMetadata({ linkedUniverseId: event.target.value || undefined })}>
                  <option value="">None</option>
                  {(library?.universes ?? []).map((universe) => (
                    <option key={universe.id} value={universe.id}>
                      {universe.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Linked set">
                <select value={deck.metadata.linkedSetCode ?? ''} onChange={(event) => updateMetadata({ linkedSetCode: event.target.value || undefined })}>
                  <option value="">None</option>
                  {(library?.sets ?? []).map((set) => (
                    <option key={set.setCode} value={set.setCode}>
                      {set.setCode} - {set.setName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Notes">
                <textarea value={deck.metadata.notes ?? ''} rows={3} onChange={(event) => updateMetadata({ notes: event.target.value })} />
              </Field>
            </div>

            {deck.warnings.length > 0 ? (
              <div className="deck-warning-list">
                {deck.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            {(['main', 'side', 'maybe'] as const).map((section) => (
              <DeckSectionList
                key={section}
                section={section}
                entries={deck.entries}
                onOpenCard={onOpenCard}
                onUpdateEntry={updateEntry}
                onRemoveEntry={removeEntry}
              />
            ))}
          </div>
        ) : (
          <div className="workspace-preview-hero">
            <div className="tile-art-placeholder large">Decks</div>
            <div>
              <h2>No deck selected</h2>
              <p>Create a deck from the left panel, then add cards from any set in the right panel.</p>
            </div>
          </div>
        )}
      </section>

      {showRightPanel ? <PanelResizeHandle label="Resize deck card browser panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
        <aside className="workspace-inspector-panel">
          <WorkspacePanelToolbar label="Hide deck card browser" icon="collapseLeft" onClick={() => onShowRightPanelChange(false)} />
          <h2>Card Browser</h2>
          <p className="workspace-copy">Add cards from any set. Cards default into Main and can move sections after they are added.</p>
          <label className="search-field">
            <Icon name="search" />
            <input value={cardQuery} placeholder="Search all cards..." onChange={(event) => setCardQuery(event.target.value)} />
          </label>
          <div className="deck-card-browser">
            {filteredCards.map((card) => (
              <button key={`${card.setCode}-${card.cardId}`} type="button" className="entity-row clickable" disabled={!deck} onClick={() => addCard(card)}>
                <Icon name="cards" />
                <span>
                  <strong>{card.name}</strong>
                  <small>
                    {card.setCode} {card.collectorNumber} - {card.typeLine || card.rarity}
                  </small>
                </span>
              </button>
            ))}
            {!filteredCards.length ? <p className="workspace-copy">No authored cards match the current search.</p> : null}
          </div>
          <h2>Collection Cards</h2>
          <p className="workspace-copy">Add isolated collection rows to this deck. Saving the deck does not copy them into Cards or Sets.</p>
          <Field label="Collection">
            <select value={selectedDeckCollectionId} onChange={(event) => void handleSelectDeckCollection(event.target.value)}>
              <option value="">No collection</option>
              {deckCollections.map((candidate) => (
                <option key={candidate.collectionId} value={candidate.collectionId}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="search-field">
            <Icon name="search" />
            <input value={collectionQuery} placeholder="Search collection cards..." onChange={(event) => setCollectionQuery(event.target.value)} />
          </label>
          <div className="deck-card-browser collection-browser">
            {filteredDeckCollectionEntries.map((entry) => (
              <button key={entry.entryId} type="button" className={`entity-row clickable ${entry.reviewStatus === 'needs_review' ? 'needs-review' : ''}`} disabled={!deck} onClick={() => addCollectionCard(entry)}>
                <Icon name="collections" />
                <span>
                  <strong>{entry.cardName}</strong>
                  <small>
                    {entry.quantity} available - {collectionPrintLabel(entry)} - {entry.reviewStatus === 'needs_review' ? 'review' : 'matched'}
                  </small>
                </span>
              </button>
            ))}
            {!filteredDeckCollectionEntries.length ? <p className="workspace-copy">No collection rows match the current search.</p> : null}
          </div>
        </aside>
      ) : (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show deck card browser" aria-label="Show deck card browser">
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
          onResetFilters={() =>
            setDeckFilters({
              status: 'all',
              tag: '',
              format: '',
              linkedUniverseId: 'all',
              linkedSetCode: 'all',
              unresolved: 'all',
              mainCount: '',
              sideCount: '',
              maybeCount: ''
            })
          }
          results={
            <div className="filter-result-list">
              {filteredDecks.length ? (
                filteredDecks.map((candidate) => (
                  <button key={candidate.deckId} type="button" className={`entity-row clickable ${candidate.deckId === deck?.metadata.deckId ? 'selected' : ''}`} onClick={() => { void handleSelectDeck(candidate.deckId); setFiltersOpen(false); }}>
                    <Icon name="decks" />
                    <span>
                      <strong>{candidate.name}</strong>
                      <small>{candidate.cardCount} cards - {candidate.status}</small>
                    </span>
                  </button>
                ))
              ) : (
                <FilteredEmptyState title="No decks match" detail="Reset filters or clear the deck search." showClearSearch={Boolean(query.trim())} showResetFilters={activeDeckFilterCount > 0} onClearSearch={() => setQuery('')} onResetFilters={() => setDeckFilters({
                  status: 'all',
                  tag: '',
                  format: '',
                  linkedUniverseId: 'all',
                  linkedSetCode: 'all',
                  unresolved: 'all',
                  mainCount: '',
                  sideCount: '',
                  maybeCount: ''
                })} />
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
              <input value={deckFilters.tag} placeholder="playtest, aggro..." onChange={(event) => setDeckFilters((current) => ({ ...current, tag: event.target.value }))} />
            </label>
            <label className="filter-field">
              <span>Format text</span>
              <input value={deckFilters.format} placeholder="Commander, kitchen table..." onChange={(event) => setDeckFilters((current) => ({ ...current, format: event.target.value }))} />
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
    </div>
  );
}

function DeckSectionList({
  section,
  entries,
  onOpenCard,
  onUpdateEntry,
  onRemoveEntry
}: {
  section: DeckEntry['section'];
  entries: DeckState['entries'];
  onOpenCard: (setCode: string, cardId: string) => Promise<void> | void;
  onUpdateEntry: (index: number, next: Partial<DeckEntry>) => void;
  onRemoveEntry: (index: number) => void;
}) {
  const sectionEntries = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.section === section);
  const total = sectionEntries.reduce((sum, { entry }) => sum + entry.count, 0);
  return (
    <section className="deck-section">
      <div className="deck-section-heading">
        <h3>{section === 'main' ? 'Main' : section === 'side' ? 'Sideboard' : 'Maybeboard'}</h3>
        <span>{total} cards</span>
      </div>
      {sectionEntries.length === 0 ? <p className="workspace-copy">No cards in this section.</p> : null}
      <div className="deck-entry-list">
        {sectionEntries.map(({ entry, index }) => (
          <div key={`${entry.setCode}-${entry.cardId}-${index}`} className={`deck-entry-row ${entry.warning ? 'unresolved' : ''}`}>
            <input aria-label="Count" type="number" min="1" value={entry.count} onChange={(event) => onUpdateEntry(index, { count: Number(event.target.value) })} />
            <button type="button" className="deck-entry-name" onClick={() => void onOpenCard(entry.setCode, entry.cardId)}>
              <strong>{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
              <small>{entry.warning ?? `${entry.setCode} - ${entry.card?.typeLine ?? entry.cardId}`}</small>
            </button>
            <select value={entry.section} onChange={(event) => onUpdateEntry(index, { section: event.target.value as DeckEntry['section'] })}>
              <option value="main">Main</option>
              <option value="side">Side</option>
              <option value="maybe">Maybe</option>
            </select>
            <button type="button" className="icon-button" onClick={() => onRemoveEntry(index)} title="Remove card">
              <Icon name="trash" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReferenceWorkspace({
  library,
  project,
  activeCardId,
  referenceCatalog,
  showLeftPanel,
  showRightPanel,
  leftPanelWidth,
  rightPanelWidth,
  onResizeLeftPanel,
  onResizeRightPanel,
  onShowLeftPanelChange,
  onShowRightPanelChange,
  onReferenceCatalogUpdated,
  onStatus
}: Pick<
  WorkspaceViewProps,
  | 'library'
  | 'project'
  | 'activeCardId'
  | 'referenceCatalog'
  | 'showLeftPanel'
  | 'showRightPanel'
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'onResizeLeftPanel'
  | 'onResizeRightPanel'
  | 'onShowLeftPanelChange'
  | 'onShowRightPanelChange'
  | 'onReferenceCatalogUpdated'
  | 'onStatus'
>) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ReferenceCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<'terms' | 'rules'>('terms');
  const [ruleKind, setRuleKind] = useState<ReferenceRuleKind | 'all'>('all');
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [termFilters, setTermFilters] = useState<ReferenceTermFilters>(defaultReferenceTermFilters);
  const [ruleFilters, setRuleFilters] = useState<ReferenceRuleFilters>(defaultReferenceRuleFilters);
  const [createOpen, setCreateOpen] = useState(false);
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
  const activeReferenceFilterCount = mode === 'terms' ? activeReferenceTermFilterCount(category, termFilters) : activeReferenceRuleFilterCount(ruleKind, ruleFilters);
  const activeCardLabel = usageIndex.cardOptions.find((card) => card.value === activeCardId)?.label ?? '';
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
    return filterReferenceTerms({ terms, category, query, filters: termFilters, usageIndex });
  }, [category, query, termFilters, terms, usageIndex]);
  const filteredRules = useMemo(() => {
    return filterReferenceRules({ rules, ruleKind, query, filters: ruleFilters, termById });
  }, [query, ruleFilters, ruleKind, rules, termById]);
  const displayedTerms = filteredTerms.slice(0, 240);
  const displayedRules = filteredRules.slice(0, 240);
  const selected = displayedTerms.find((term) => term.id === selectedId) ?? displayedTerms[0];
  const selectedRule = displayedRules.find((rule) => rule.id === selectedRuleId) ?? displayedRules[0];
  const selectedUsage = selected ? termUsageMatches(selected.id, usageIndex) : [];
  const resetTermFilters = () => {
    setCategory('all');
    setTermFilters(defaultReferenceTermFilters);
  };
  const resetRuleFilters = () => {
    setRuleKind('all');
    setRuleFilters(defaultReferenceRuleFilters);
  };
  const resetCurrentFilters = () => {
    if (mode === 'terms') {
      resetTermFilters();
    } else {
      resetRuleFilters();
    }
  };

  return (
    <>
      <div className="management-workspace" style={{ gridTemplateColumns: buildManagementColumns(showLeftPanel, showRightPanel, leftPanelWidth, rightPanelWidth) }}>
      {showLeftPanel ? (
        <EntityListPanel
          title="References"
          subtitle={mode === 'terms' ? `${terms.length} terms` : `${rules.length} rules`}
          newLabel="New reference"
          activeFilterCount={activeReferenceFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={() => setCreateOpen(true)}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder={mode === 'terms' ? 'Search terms...' : 'Search rules...'} onChange={(event) => setQuery(event.target.value)} />
            </label>
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
            : ruleKinds.map((item) => (
                <button key={item.id} type="button" className={`entity-row clickable ${ruleKind === item.id ? 'selected' : ''}`} onClick={() => setRuleKind(item.id)}>
                  <Icon name="guide" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{ruleCounts.get(item.id) ?? 0} entries</small>
                  </span>
                </button>
              ))}
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
            <h2>{mode === 'terms' ? referenceCategories.find((item) => item.id === category)?.label ?? 'References' : ruleKinds.find((item) => item.id === ruleKind)?.label ?? 'Rules'}</h2>
            <p>
              {mode === 'terms'
                ? referenceCatalog
                  ? `${resultCountLabel(filteredTerms.length, displayedTerms.length, 'terms')} from ${referenceCatalog.sources.length} sources`
                  : 'Reference catalog loading.'
                : referenceCatalog?.rules
                  ? `${resultCountLabel(filteredRules.length, displayedRules.length, 'rules')} from ${referenceCatalog.rules.effectiveDate ?? 'current rules'}`
                  : 'Rules snapshot not synced yet.'}
            </p>
          </div>
          <div className="segmented-control reference-header-mode">
            {referenceModes.map((item) => (
              <button key={item.id} type="button" className={mode === item.id ? 'active' : ''} onClick={() => setMode(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
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
        {mode === 'terms' ? (
          <div className="reference-term-grid">
            {displayedTerms.map((term) => (
              <button key={term.id} type="button" className={`reference-term-card ${selected?.id === term.id ? 'selected' : ''}`} onClick={() => setSelectedId(term.id)}>
                <strong>{term.name}</strong>
                <span>{labelForCategory(term.category)}</span>
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
                <span>{labelForRuleKind(rule.kind)}</span>
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
          {mode === 'terms' ? <ReferenceTermDetail term={selected} catalog={referenceCatalog} usage={selectedUsage} /> : <ReferenceRuleDetail rule={selectedRule} catalog={referenceCatalog} />}
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
          resultsLabel={mode === 'terms' ? resultCountLabel(filteredTerms.length, displayedTerms.length, 'terms') : resultCountLabel(filteredRules.length, displayedRules.length, 'rules')}
          activeFilterCount={activeReferenceFilterCount}
          onClose={() => setFiltersOpen(false)}
          onResetFilters={resetCurrentFilters}
          results={
            <div className="filter-result-list">
              {mode === 'terms' ? (
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
                          {labelForCategory(term.category)} - {term.status}
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
                      <small>{labelForRuleKind(rule.kind)}</small>
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
          <ReferenceFilterControls
            mode={mode}
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
        </BrowseFilterOverlay>
      ) : null}
    </>
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

function labelForCategory(category: ReferenceCategory): string {
  return referenceCategories.find((item) => item.id === category)?.label ?? category;
}

function labelForRuleKind(kind: ReferenceRuleKind): string {
  return ruleKinds.find((item) => item.id === kind)?.label ?? kind;
}

function resultCountLabel(total: number, displayed: number, noun: string): string {
  return displayed < total ? `${displayed} of ${total} matching ${noun}` : `${total} matching ${noun}`;
}

function ProjectsWorkspace({
  library,
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
  onStatus
}: Pick<
  WorkspaceViewProps,
  | 'library'
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
>) {
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectFilters, setProjectFilters] = useState({
    status: 'all',
    tag: '',
    setCount: ''
  });
  const [viewingSetCode, setViewingSetCode] = useState('');
  const projectSetCount = (projectId: string) => library?.sets.filter((set) => set.universeId === projectId).length ?? 0;
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
                  {projectSetCount(projectItem.id)} sets - {projectItem.status ?? 'draft'}
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
            <p>{activeProject ? `${activeProjectSets.length} sets in this project` : 'Choose a project from the left panel.'}</p>
          </div>
        </div>
        <div className="set-cover-grid">
          {activeProjectSets.map((set) => (
            <SetCoverTile
              key={set.setCode}
              set={set}
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
      </section>
      {showRightPanel ? <PanelResizeHandle label="Resize project inspector panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
      <section className="workspace-inspector-panel">
        <WorkspacePanelToolbar label="Hide project inspector panel" icon="collapseRight" onClick={() => onShowRightPanelChange(false)} />
        <ProjectEditorPanel project={activeProject} sets={activeProjectSets} onLibraryUpdated={onLibraryUpdated} onStatus={onStatus} />
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
                        {projectSetCount(projectItem.id)} sets - {projectItem.status ?? 'draft'}
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
  onStatus
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
  const selectedSetDrafts = project?.setCode === selectedSet?.setCode ? project.drafts : [];

  useEffect(() => {
    if (project?.setCode) {
      setSelectedSetCode(project.setCode);
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
          subtitle={`${sets.length} of ${allSets.length} sets`}
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
                <small>{set.cardCount} cards - {set.status}</small>
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
            <p>{selectedSet ? `${selectedSet.setCode} - ${selectedSet.cardCount} cards - ${selectedSet.status}` : 'Choose a set from the left panel.'}</p>
          </div>
          <div className="header-action-row">
            <button type="button" className="secondary-button" disabled={!selectedSet} onClick={() => selectedSet ? void exportSetPackage(selectedSet.setCode, onStatus) : undefined}>
              Export Set
            </button>
          </div>
        </div>
        <CardImageGrid
          drafts={selectedSetDrafts}
          emptyText={selectedSet ? 'Loading card renders for this set...' : 'Choose a set from the left panel.'}
          onEdit={(cardId) => selectedSet ? void onOpenCard(selectedSet.setCode, cardId) : undefined}
          onView={setViewingCardId}
          onDelete={(draftToDelete) => onStatus(`Trash support is staged next; ${draftToDelete.name} was not deleted.`)}
          onStatus={onStatus}
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
                        {set.cardCount} cards - {set.status}
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
  selected,
  onSelect,
  onEdit,
  onView,
  onDelete
}: {
  set: SetSummary;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <button type="button" className={`set-cover-tile ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className="tile-art-placeholder">{set.setCode}</span>
      <span className="tile-copy">
        <strong>{set.setName}</strong>
        <small>
          {set.setCode} - {set.cardCount} cards - {set.status}
        </small>
      </span>
    </button>
  );
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
          key={draft.cardId}
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
  onOpenCard: (setCode: string, cardId: string) => Promise<void> | void;
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
            <p>{loaded ? `${loaded.drafts.length} cards` : 'Loading cards...'}</p>
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
  onNew: () => void;
  onCollapse?: () => void;
}) {
  const visibleSearch = searchControl ?? filterControls;
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
          <FilterButton label={`Filter ${title.toLowerCase()}`} activeCount={activeFilterCount} onClick={onOpenFilters ?? onToggleFilters ?? (() => undefined)} />
          <button type="button" className="icon-button" onClick={onNew} title={newLabel}>
            <Icon name="new" />
          </button>
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
          <strong>{projectSets.length} sets</strong>
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
      <p className="workspace-copy">{sets.length} sets are available in this project. Use the plus button in the Sets panel to create another one.</p>
      {activeSet ? (
        <div className="entity-row">
          <Icon name="sets" />
          <span>
            <strong>{activeSet.setCode} - {activeSet.setName}</strong>
            <small>{activeSet.cardCount} cards - {activeSet.status}</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ProjectEditorPanel({
  project,
  sets,
  onLibraryUpdated,
  onStatus
}: {
  project?: UniverseSummary;
  sets: SetSummary[];
  onLibraryUpdated: (library: LibraryState) => void;
  onStatus: (message: string) => void;
}) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState(project?.status ?? 'draft');
  const [tags, setTags] = useState(joinTags(project?.tags));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setStatus(project?.status ?? 'draft');
    setTags(joinTags(project?.tags));
  }, [project?.description, project?.id, project?.name, project?.status, project?.tags]);

  async function handleSave() {
    if (!project) {
      return;
    }
    setBusy(true);
    try {
      const next = await updateUniverse({
        universeId: project.id,
        name,
        description,
        status,
        tags: splitTagInput(tags)
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
      <h2>Project</h2>
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
          <input value={tags} placeholder="priority, teaching" onChange={(event) => setTags(event.target.value)} />
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
          <strong>{sets.length} sets</strong>
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
  onLibraryUpdated,
  onProjectLoaded,
  onLoadSet,
  onStatus
}: {
  library: LibraryState | null;
  project?: UniverseSummary;
  set?: SetSummary;
  onLibraryUpdated: (library: LibraryState) => void;
  onProjectLoaded: (project: EditorProject) => void;
  onLoadSet: (setCode: string) => Promise<void> | void;
  onStatus: (message: string) => void;
}) {
  const [setName, setSetName] = useState(set?.setName ?? '');
  const [status, setStatus] = useState(set?.status ?? 'draft');
  const [tags, setTags] = useState(joinTags(set?.tags));
  const [universeId, setUniverseId] = useState(set?.universeId ?? project?.id ?? '');
  const [codeEditing, setCodeEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSetName(set?.setName ?? '');
    setStatus(set?.status ?? 'draft');
    setTags(joinTags(set?.tags));
    setUniverseId(set?.universeId ?? project?.id ?? '');
    setCodeEditing(false);
  }, [project?.id, set?.setCode, set?.setName, set?.status, set?.tags, set?.universeId]);

  async function handleSave() {
    if (!set) {
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
        tags: splitTagInput(tags)
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
      <h2>Set</h2>
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
          <input value={tags} placeholder="demo, commander" onChange={(event) => setTags(event.target.value)} />
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
          <strong>{set?.cardCount ?? 0} cards</strong>
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
          title="Library"
          subtitle={`${libraryItems.length} visual items`}
          newLabel="New library item"
          activeFilterCount={activeLibraryFilterCount}
          onOpenFilters={() => setFiltersOpen(true)}
          onNew={onCreateLibraryAsset}
          onCollapse={() => onShowLeftPanelChange(false)}
          searchControl={
            <label className="search-field">
              <Icon name="search" />
              <input value={query} placeholder="Search library..." onChange={(event) => setQuery(event.target.value)} />
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
              title="No library items match"
              detail="Assets may be hidden by search or filters."
              showClearSearch={Boolean(query.trim())}
              showResetFilters={activeLibraryFilterCount > 0}
              onClearSearch={() => setQuery('')}
              onResetFilters={() => setLibraryFilters({ assetType: 'all', sourceType: 'all', permissionStatus: 'all', assigned: 'all' })}
            />
          ) : null}
        </EntityListPanel>
      ) : null}
      {showLeftPanel ? <PanelResizeHandle label="Resize library list panel" onResize={onResizeLeftPanel} /> : null}
      {!showLeftPanel ? (
        <button type="button" className="collapsed-panel-strip left" onClick={() => onShowLeftPanelChange(true)} title="Show library panel" aria-label="Show library panel">
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
              <span>Choose a library item from the left panel.</span>
            </div>
          )}
        </div>
      </section>
      {showRightPanel ? <PanelResizeHandle label="Resize library inspector panel" onResize={onResizeRightPanel} /> : null}
      {showRightPanel ? (
      <section className="workspace-inspector-panel">
        <WorkspacePanelToolbar label="Hide library inspector panel" icon="collapseRight" onClick={() => onShowRightPanelChange(false)} />
        <LibraryAssetEditorPanel item={selectedItem} itemCount={libraryItems.length} />
      </section>
      ) : null}
      {!showRightPanel ? (
        <button type="button" className="collapsed-panel-strip right" onClick={() => onShowRightPanelChange(true)} title="Show library inspector" aria-label="Show library inspector">
          <Icon name="collapseLeft" />
        </button>
      ) : null}
      {filtersOpen ? (
        <BrowseFilterOverlay
          title="Browse Library"
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
                  detail="Reset filters or clear the library search."
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
      <h2>{item?.name ?? 'Library'}</h2>
      <p className="workspace-copy">{item ? `${item.kind} for ${item.detail}.` : 'Choose a library item from the left panel.'}</p>
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

function SettingsWorkspace({ project, showCollectionsRailItem, onShowCollectionsRailItemChange }: Pick<WorkspaceViewProps, 'project' | 'showCollectionsRailItem' | 'onShowCollectionsRailItemChange'>) {
  return (
    <div className="workspace-grid">
      <div className="workspace-card">
        <h2>Settings</h2>
        <p className="workspace-copy">Project-level preferences will live here as the editor becomes a Mac app shell.</p>
        <div className="entity-row">
          <Icon name="settings" />
          <span>
            <strong>{project?.setCode ?? 'No set loaded'}</strong>
            <small>Current set context</small>
          </span>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={showCollectionsRailItem} onChange={(event) => onShowCollectionsRailItemChange(event.target.checked)} />
          Show Collections in the rail
        </label>
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
