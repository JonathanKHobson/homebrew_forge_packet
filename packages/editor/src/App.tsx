import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createCollection, createDeck, createLibraryAsset, createSet, createUniverse as createProject, fetchLibrary, fetchPreview, fetchProject, fetchReference, importCards, importCollection, saveCard, saveDeck } from './api/client.js';
import { CardList } from './components/CardList.js';
import { CardPreview } from './components/CardPreview.js';
import { CardTabs } from './components/CardTabs.js';
import { CreateCardOverlay } from './components/create/CreateCardOverlay.js';
import { CreateCollectionOverlay, type CreateCollectionImportPayload } from './components/create/CreateCollectionOverlay.js';
import { CreateDeckOverlay, type CreateDeckOverlayEntry } from './components/create/CreateDeckOverlay.js';
import { CreateLibraryAssetOverlay } from './components/create/CreateLibraryAssetOverlay.js';
import { CreateProjectOverlay } from './components/create/CreateProjectOverlay.js';
import { CreateSetOverlay, type CreateSetImportPayload } from './components/create/CreateSetOverlay.js';
import { EditorToolbar } from './components/EditorToolbar.js';
import { Icon } from './components/Icon.js';
import { ImportExportPanel } from './components/ImportExportPanel.js';
import { Inspector } from './components/Inspector.js';
import { PanelResizeHandle } from './components/PanelResizeHandle.js';
import { SideRail } from './components/SideRail.js';
import { TransferDialog, type TransferDialogMode } from './components/TransferDialog.js';
import { WorkspaceView } from './components/WorkspaceView.js';
import type { CardDraft, CardSummary, CollectionImportSummary, CreateCollectionRequest, CreateLibraryAssetRequest, CreateSetRequest, CreateUniverseRequest, EditorProject, LibraryState, PreviewResponse } from './domain/editorTypes.js';
import type { CreateOverlayKind } from './domain/createFlowTypes.js';
import type { CardListDensity, InspectorTab, PreviewMode, WorkspaceSection } from './domain/editorUiTypes.js';
import { buildTypeLine, inferColors, inferFrame } from './domain/frameRegistry.js';
import type { ReferenceCatalog } from '@homebrew-forge/forge';

export function App() {
  const [library, setLibrary] = useState<LibraryState | null>(null);
  const [referenceCatalog, setReferenceCatalog] = useState<ReferenceCatalog | null>(null);
  const [selectedUniverseId, setSelectedUniverseId] = useState('');
  const [project, setProject] = useState<EditorProject | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, CardDraft>>({});
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [status, setStatus] = useState('Loading DEMO...');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSection>('cards');
  const [transferDialog, setTransferDialog] = useState<TransferDialogMode | null>(null);
  const [createOverlay, setCreateOverlay] = useState<CreateOverlayKind | null>(null);
  const [deckRefreshToken, setDeckRefreshToken] = useState(0);
  const [createdDeckId, setCreatedDeckId] = useState('');
  const [collectionRefreshToken, setCollectionRefreshToken] = useState(0);
  const [createdCollectionId, setCreatedCollectionId] = useState('');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('card');
  const [openCardIds, setOpenCardIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('normal');
  const [showGuides, setShowGuides] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [cardListDensity, setCardListDensity] = useState<CardListDensity>('comfortable');
  const [showCommandBar, setShowCommandBar] = useState(true);
  const [showSideRail, setShowSideRail] = useState(true);
  const [showCollectionsRailItem, setShowCollectionsRailItem] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [commandBarHeight, setCommandBarHeight] = useState(72);
  const previewRequestId = useRef(0);

  useEffect(() => {
    void loadInitial()
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : String(error)));
  }, []);

  useEffect(() => {
    if (!project || !selectedId) {
      return;
    }
    const selected = sessionDrafts[selectedId] ?? project.drafts.find((candidate) => candidate.cardId === selectedId);
    if (selected) {
      setDraft(selected);
      setSaveState('idle');
      setOpenCardIds((ids) => addUnique(ids, selected.cardId).slice(-6));
    } else {
      setDraft(null);
    }
  }, [project, selectedId, sessionDrafts]);

  useEffect(() => {
    if (!draft) {
      previewRequestId.current += 1;
      setPreview(null);
      return;
    }
    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    const previewDraft = {
      ...draft,
      colors: inferColors(draft.manaCost)
    };
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void fetchPreview(previewDraft)
        .then((nextPreview) => {
          if (!cancelled && requestId === previewRequestId.current) {
            setPreview(nextPreview);
          }
        })
        .catch((error: unknown) => {
          if (cancelled || requestId !== previewRequestId.current) {
            return;
          }
          setPreview({
            warnings: [error instanceof Error ? error.message : String(error)],
            inferredFrame: inferFrame(previewDraft, project?.frames)
          });
        });
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [draft, project?.frames]);

  const selectedFrame = useMemo(() => (draft ? inferFrame(draft, project?.frames) : null), [draft, project?.frames]);
  const workbenchColumns = useMemo(() => {
    const columns: string[] = [];
    if (showSideRail) {
      columns.push('88px');
    }
    if (activeWorkspace === 'cards') {
      if (showLeftPanel) {
        columns.push(`${leftPanelWidth}px`, '6px');
      } else {
        columns.push('36px');
      }
    }
    if (activeWorkspace === 'cards') {
      if (showPreviewPanel) {
        columns.push('minmax(320px, 1fr)');
      }
    } else {
      columns.push('minmax(0, 1fr)');
    }
    if (activeWorkspace === 'cards') {
      if (showRightPanel) {
        columns.push('6px', `${rightPanelWidth}px`);
      } else {
        columns.push('36px');
      }
    }
    return columns.join(' ');
  }, [activeWorkspace, leftPanelWidth, rightPanelWidth, showLeftPanel, showPreviewPanel, showRightPanel, showSideRail]);
  const workbenchStyle: CSSProperties = { gridTemplateColumns: workbenchColumns };
  const cardsForList = useMemo(() => {
    if (!project) {
      return [];
    }
    const sessionForSet = Object.values(sessionDrafts).filter((candidate) => candidate.setCode === project.setCode);
    const sessionById = new Map(sessionForSet.map((candidate) => [candidate.cardId, candidate]));
    const savedIds = new Set(project.cards.map((card) => card.cardId));
    const savedCards = project.cards.map((card) => {
      const sessionDraft = sessionById.get(card.cardId);
      return sessionDraft ? summaryFromDraft(sessionDraft) : card;
    });
    const unsavedCards = sessionForSet.filter((candidate) => !savedIds.has(candidate.cardId)).map(summaryFromDraft);
    return [...savedCards, ...unsavedCards];
  }, [project, sessionDrafts]);

  const selectedIsUnsaved = Boolean(draft && project && !project.cards.some((card) => card.cardId === draft.cardId));
  const pendingCardDraft = useMemo(() => (project && createOverlay === 'card' ? createBlankDraft(project, cardsForList) : null), [cardsForList, createOverlay, project]);

  function handleShowCollectionsRailItemChange(value: boolean) {
    setShowCollectionsRailItem(value);
    if (!value && activeWorkspace === 'collections') {
      setActiveWorkspace('cards');
    }
  }

  async function loadInitial() {
    const [loadedLibrary, loadedReference] = await Promise.all([fetchLibrary(), fetchReference()]);
    setReferenceCatalog(loadedReference);
    const setCode = loadedLibrary.selectedSetCode || 'DEMO';
    setLibrary(loadedLibrary);
    setSelectedUniverseId(loadedLibrary.selectedUniverseId);
    await loadSet(setCode, loadedLibrary);
  }

  function applyProject(loaded: EditorProject) {
    const normalized = normalizeProjectDrafts(loaded);
    setProject(normalized);
    const first = normalized.drafts[0];
    if (first) {
      setSelectedId(first.cardId);
      setDraft(first);
      setOpenCardIds([first.cardId]);
    } else {
      setSelectedId('');
      setDraft(null);
      setPreview(null);
      setOpenCardIds([]);
    }
  }

  async function loadSet(setCode: string, currentLibrary = library): Promise<EditorProject> {
    setStatus(`Loading ${setCode}...`);
    const loaded = await fetchProject(setCode);
    applyProject(loaded);
    const setSummary = currentLibrary?.sets.find((set) => set.setCode === loaded.setCode);
    if (setSummary) {
      setSelectedUniverseId(setSummary.universeId);
    }
    setSaveState('idle');
    setStatus(`Loaded ${loaded.drafts.length} cards from ${loaded.setCode}.`);
    return loaded;
  }

  async function refreshLibrary(selectedSetCode = project?.setCode ?? 'DEMO') {
    const loadedLibrary = await fetchLibrary();
    const setSummary = loadedLibrary.sets.find((set) => set.setCode === selectedSetCode);
    setLibrary(loadedLibrary);
    if (setSummary) {
      setSelectedUniverseId(setSummary.universeId);
    }
  }

  async function handleCreateSet(request: CreateSetRequest) {
    try {
      setStatus(`Creating ${request.setCode.toUpperCase()}...`);
      const result = await createSet(request);
      setLibrary(result.library);
      setSelectedUniverseId(result.library.selectedUniverseId);
      applyProject(result.project);
      setSaveState('idle');
      setStatus(`Created ${result.project.setName}. Use New Card to start the set.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  function handleSelectCard(cardId: string) {
    setSelectedId(cardId);
    setOpenCardIds((ids) => addUnique(ids, cardId).slice(-6));
  }

  async function handleOpenCard(setCode: string, cardId: string) {
    const loaded = project?.setCode === setCode ? project : await loadSet(setCode);
    const target = loaded.drafts.find((candidate) => candidate.cardId === cardId);
    if (!target) {
      setStatus(`Could not find ${cardId} in ${setCode}.`);
      return;
    }
    setActiveWorkspace('cards');
    setSelectedId(target.cardId);
    setDraft(target);
    setOpenCardIds((ids) => addUnique(ids, target.cardId).slice(-6));
    setStatus(`Selected ${target.collectorNumber} ${target.name}.`);
  }

  async function handleOpenSet(setCode: string) {
    await loadSet(setCode);
    setActiveWorkspace('sets');
  }

  function handleCloseTab(cardId: string) {
    setOpenCardIds((ids) => {
      const next = ids.filter((id) => id !== cardId);
      if (cardId === selectedId) {
        setSelectedId(next.at(-1) ?? cardsForList.find((card) => card.cardId !== cardId)?.cardId ?? '');
      }
      return next;
    });
  }

  function handleNewCard() {
    setActiveWorkspace('cards');
    setCreateOverlay('card');
  }

  function handleDraftChange(nextDraft: CardDraft) {
    const summary = project?.cards.find((card) => card.cardId === nextDraft.cardId);
    const normalizedDraft = normalizeDraft(nextDraft, summary);
    const normalized = { ...normalizedDraft, colors: inferColors(normalizedDraft.manaCost), typeLine: buildTypeLine(normalizedDraft) };
    setDraft(normalized);
    setSelectedId(normalized.cardId);
    setSessionDrafts((drafts) => ({ ...drafts, [normalized.cardId]: normalized }));
    setSaveState('idle');
  }

  function handleCloneDraft() {
    if (!project || !draft) {
      return;
    }
    const next = createDraftCopy(project, draft, cardsForList, false);
    setSessionDrafts((drafts) => ({ ...drafts, [next.cardId]: next }));
    setActiveWorkspace('cards');
    setSelectedId(next.cardId);
    setDraft(next);
    setOpenCardIds((ids) => addUnique(ids, next.cardId).slice(-6));
    setStatus(`Cloned ${draft.name} as ${next.collectorNumber}.`);
  }

  async function handleSaveAsNew() {
    if (!project || !draft) {
      return;
    }
    const next = createDraftCopy(project, draft, cardsForList, true);
    setSessionDrafts((drafts) => ({ ...drafts, [next.cardId]: next }));
    setActiveWorkspace('cards');
    setSelectedId(next.cardId);
    setDraft(next);
    setOpenCardIds((ids) => addUnique(ids, next.cardId).slice(-6));
    try {
      await saveDraftToCsv(next);
    } catch {
      // saveDraftToCsv already updates the visible status strip.
    }
  }

  function handleDeleteDraft() {
    if (!draft || !selectedIsUnsaved) {
      return;
    }
    const deletedId = draft.cardId;
    setSessionDrafts((drafts) => omitDraft(drafts, deletedId));
    setOpenCardIds((ids) => ids.filter((id) => id !== deletedId));
    const nextId = cardsForList.find((card) => card.cardId !== deletedId)?.cardId ?? '';
    setSelectedId(nextId);
    if (!nextId) {
      setDraft(null);
      setPreview(null);
    }
    setStatus(`Deleted unsaved draft ${draft.name}.`);
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
    try {
      await saveDraftToCsv(draft);
    } catch {
      // saveDraftToCsv already updates the visible status strip.
    }
  }

  async function saveDraftToCsv(nextDraft: CardDraft) {
    const draftToSave = normalizeDraft(nextDraft, project?.cards.find((card) => card.cardId === nextDraft.cardId));
    setSaveState('saving');
    try {
      const saved = await saveCard(draftToSave);
      setSessionDrafts((drafts) => omitDraft(drafts, draftToSave.cardId));
      setProject(normalizeProjectDrafts(saved));
      setSelectedId(draftToSave.cardId);
      setSaveState('saved');
      await refreshLibrary(saved.setCode);
      setStatus(`Saved ${draftToSave.name}. Synced ${saved.lastCockatriceSync?.imageCount ?? 0} Cockatrice images.`);
    } catch (error) {
      setSaveState('error');
      setStatus(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function handleCreateCardDraft(nextDraft: CardDraft) {
    setActiveWorkspace('cards');
    await saveDraftToCsv(nextDraft);
  }

  async function handleCreateDeckFromOverlay(request: Parameters<typeof createDeck>[0], entries: CreateDeckOverlayEntry[]) {
    setStatus(`Creating deck ${request.name}...`);
    const created = await createDeck(request);
    let saved = created;
    if (entries.length) {
      saved = await saveDeck({
        ...created.deck,
        entries: entries.map((entry) => ({
          ...entry,
          deckId: created.deck.metadata.deckId
        }))
      });
    }
    setCreatedDeckId(saved.deck.metadata.deckId);
    setDeckRefreshToken((value) => value + 1);
    setActiveWorkspace('decks');
    setStatus(`Created deck ${saved.deck.metadata.name}.`);
  }

  async function handleDryRunCollectionImport(request: CreateCollectionRequest, importPayload: CreateCollectionImportPayload): Promise<CollectionImportSummary> {
    const result = await importCollection({
      collectionId: request.collectionId || slugify(request.name),
      name: request.name,
      description: request.description,
      linkedUniverseId: request.linkedUniverseId,
      gameId: request.gameId,
      purpose: request.purpose,
      source: importPayload.source,
      mode: importPayload.mode,
      content: importPayload.content,
      dryRun: true
    });
    return result.summary;
  }

  async function handleCreateCollectionFromOverlay(request: CreateCollectionRequest, importPayload?: CreateCollectionImportPayload) {
    const collectionId = request.collectionId || slugify(request.name);
    setStatus(`Creating collection ${request.name}...`);
    const result = importPayload?.content.trim()
      ? await importCollection({
          collectionId,
          name: request.name,
          description: request.description,
          linkedUniverseId: request.linkedUniverseId,
          gameId: request.gameId,
          purpose: request.purpose,
          source: importPayload.source,
          mode: importPayload.mode,
          content: importPayload.content,
          dryRun: false
        })
      : await createCollection({ ...request, collectionId });
    setCreatedCollectionId(result.collection.metadata.collectionId);
    setCollectionRefreshToken((value) => value + 1);
    setActiveWorkspace('collections');
    setStatus(`Created collection ${result.collection.metadata.name}.`);
  }

  async function handleCreateSetFromOverlay(request: CreateSetRequest, importPayload?: CreateSetImportPayload) {
    await handleCreateSet(request);
    if (importPayload?.content.trim()) {
      const result = await importCards({
        setCode: request.setCode,
        format: importPayload.format,
        mode: 'append',
        content: importPayload.content,
        dryRun: false
      });
      applyProject(result.project);
      await refreshLibrary(result.project.setCode);
      setStatus(`Created ${request.setCode.toUpperCase()} and imported ${result.summary.importedCards} cards from ${importPayload.filename}.`);
    }
    setActiveWorkspace('sets');
  }

  async function handleCreateProjectFromOverlay(request: CreateUniverseRequest) {
    setStatus(`Creating project ${request.name}...`);
    const nextLibrary = await createProject(request);
    const created = nextLibrary.universes.find((universe) => universe.name === request.name) ?? nextLibrary.universes.at(-1);
    setLibrary(nextLibrary);
    if (created) {
      setSelectedUniverseId(created.id);
    }
    setActiveWorkspace('projects');
    setStatus(`Created project ${request.name}.`);
  }

  async function handleCreateLibraryAssetFromOverlay(request: CreateLibraryAssetRequest) {
    setStatus(`Creating library asset ${request.artId}...`);
    const loaded = await createLibraryAsset(request);
    applyProject(loaded);
    await refreshLibrary(loaded.setCode);
    setActiveWorkspace('library');
    setStatus(`Created library asset ${request.artId}.`);
  }

  function resizeLeftPanel(delta: number) {
    setLeftPanelWidth((width) => clamp(width + delta, 220, 460));
  }

  function resizeRightPanel(delta: number) {
    setRightPanelWidth((width) => clamp(width - delta, 300, 620));
  }

  function resizeCommandBar(delta: number) {
    setCommandBarHeight((height) => clamp(height + delta, 54, 118));
  }

  return (
    <main className="editor-shell">
      <EditorToolbar
        draft={draft}
        previewMode={previewMode}
        showGuides={showGuides}
        showSafeArea={showSafeArea}
        zoom={zoom}
        cardListDensity={cardListDensity}
        showCommandBar={showCommandBar}
        showSideRail={showSideRail}
        showLeftPanel={showLeftPanel}
        showPreviewPanel={showPreviewPanel}
        showRightPanel={showRightPanel}
        commandBarHeight={commandBarHeight}
        saving={saveState === 'saving'}
        canDeleteDraft={selectedIsUnsaved}
        onPreviewModeChange={setPreviewMode}
        onShowGuidesChange={setShowGuides}
        onShowSafeAreaChange={setShowSafeArea}
        onZoomChange={setZoom}
        onCardListDensityChange={setCardListDensity}
        onShowCommandBarChange={setShowCommandBar}
        onShowSideRailChange={setShowSideRail}
        onShowLeftPanelChange={setShowLeftPanel}
        onShowPreviewPanelChange={setShowPreviewPanel}
        onShowRightPanelChange={setShowRightPanel}
        onCommandBarResize={resizeCommandBar}
        onSave={() => void handleSave()}
        onSaveAsNew={() => void handleSaveAsNew()}
        onClone={handleCloneDraft}
        onDeleteDraft={handleDeleteDraft}
        onOpenSets={() => setActiveWorkspace('sets')}
        onOpenImport={() => setTransferDialog('import')}
        onOpenExport={() => setTransferDialog('export')}
      />

      <section className={`workbench workspace-${activeWorkspace} ${showSideRail ? '' : 'hide-side-rail'} ${showLeftPanel ? '' : 'hide-left-panel'} ${showPreviewPanel ? '' : 'hide-preview-panel'} ${showRightPanel ? '' : 'hide-right-panel'}`} style={workbenchStyle}>
        {showSideRail ? <SideRail active={activeWorkspace} activeSetCode={project?.setCode} cardCount={cardsForList.length} showCollections={showCollectionsRailItem} onChange={setActiveWorkspace} /> : null}

        {activeWorkspace === 'cards' && showLeftPanel ? (
          <div className="context-panel cards-context">
            <CardList cards={cardsForList} selectedId={selectedId} density={cardListDensity} onSelect={handleSelectCard} onNew={handleNewCard} onCollapse={() => setShowLeftPanel(false)} />
            <div className="status-strip">{status}</div>
          </div>
        ) : null}
        {activeWorkspace === 'cards' && showLeftPanel ? <PanelResizeHandle label="Resize cards list panel" onResize={resizeLeftPanel} /> : null}
        {activeWorkspace === 'cards' && !showLeftPanel ? (
          <button type="button" className="collapsed-panel-strip left" onClick={() => setShowLeftPanel(true)} title="Show cards panel" aria-label="Show cards panel">
            <Icon name="collapseRight" />
          </button>
        ) : null}

        {activeWorkspace === 'cards' ? (
          <>
            {showPreviewPanel ? (
              <section className="preview-column">
                <CardTabs cards={cardsForList} openCardIds={openCardIds} selectedId={selectedId} onSelect={handleSelectCard} onClose={handleCloseTab} onNew={handleNewCard} />
                <CardPreview
                  draft={draft}
                  preview={preview}
                  selectedFrame={selectedFrame}
                  showGuides={showGuides || previewMode === 'safe-area'}
                  showSafeArea={showSafeArea}
                  zoom={zoom}
                  onChange={handleDraftChange}
                />
              </section>
            ) : null}
            {showRightPanel ? <PanelResizeHandle label="Resize card inspector panel" onResize={resizeRightPanel} /> : null}
            {showRightPanel ? (
              <Inspector
                project={project}
                draft={draft}
                preview={preview}
                referenceCatalog={referenceCatalog}
                activeTab={inspectorTab}
                onTabChange={setInspectorTab}
                beforeSections={
                  <ImportExportPanel
                    project={project}
                    onProjectLoaded={(loaded) => {
                      applyProject(loaded);
                      void refreshLibrary(loaded.setCode);
                    }}
                    onStatus={setStatus}
                  />
                }
                onChange={handleDraftChange}
                onCollapse={() => setShowRightPanel(false)}
              />
            ) : null}
            {!showRightPanel ? (
              <button type="button" className="collapsed-panel-strip right" onClick={() => setShowRightPanel(true)} title="Show inspector panel" aria-label="Show inspector panel">
                <Icon name="collapseLeft" />
              </button>
            ) : null}
          </>
        ) : (
          <WorkspaceView
            section={activeWorkspace}
            library={library}
            project={project}
            activeCardId={selectedId}
            referenceCatalog={referenceCatalog}
            selectedUniverseId={selectedUniverseId}
            showLeftPanel={showLeftPanel}
            showRightPanel={showRightPanel}
            leftPanelWidth={leftPanelWidth}
            rightPanelWidth={rightPanelWidth}
            onResizeLeftPanel={resizeLeftPanel}
            onResizeRightPanel={resizeRightPanel}
            onShowLeftPanelChange={setShowLeftPanel}
            onShowRightPanelChange={setShowRightPanel}
            onCreateDeck={() => setCreateOverlay('deck')}
            onCreateCollection={() => setCreateOverlay('collection')}
            onCreateSetOverlay={() => setCreateOverlay('set')}
            onCreateProject={() => setCreateOverlay('project')}
            onCreateLibraryAsset={() => setCreateOverlay('library')}
            onLibraryUpdated={setLibrary}
            onProjectLoaded={applyProject}
            onReferenceCatalogUpdated={setReferenceCatalog}
            onUniverseSelect={setSelectedUniverseId}
            onLoadSet={(setCode) => void loadSet(setCode)}
            onOpenCard={(setCode, cardId) => void handleOpenCard(setCode, cardId)}
            onOpenSet={(setCode) => void handleOpenSet(setCode)}
            onStatus={setStatus}
            deckRefreshToken={deckRefreshToken}
            activeDeckId={createdDeckId}
            collectionRefreshToken={collectionRefreshToken}
            activeCollectionId={createdCollectionId}
            showCollectionsRailItem={showCollectionsRailItem}
            onShowCollectionsRailItemChange={handleShowCollectionsRailItemChange}
          />
        )}
      </section>
      {transferDialog ? (
        <TransferDialog
          mode={transferDialog}
          project={project}
          draft={draft}
          preview={preview}
          onProjectLoaded={(loaded) => {
            applyProject(loaded);
            void refreshLibrary(loaded.setCode);
          }}
          onStatus={setStatus}
          onClose={() => setTransferDialog(null)}
        />
      ) : null}
      {createOverlay === 'card' && pendingCardDraft ? (
        <CreateCardOverlay initialDraft={pendingCardDraft} frames={project?.frames ?? []} onCreateDraft={handleCreateCardDraft} onStatus={setStatus} onClose={() => setCreateOverlay(null)} />
      ) : null}
      {createOverlay === 'deck' ? (
        <CreateDeckOverlay library={library} project={project} onCreateDeck={handleCreateDeckFromOverlay} onStatus={setStatus} onClose={() => setCreateOverlay(null)} />
      ) : null}
      {createOverlay === 'collection' ? (
        <CreateCollectionOverlay
          library={library}
          selectedUniverseId={selectedUniverseId}
          onCreateCollection={handleCreateCollectionFromOverlay}
          onDryRunImport={handleDryRunCollectionImport}
          onStatus={setStatus}
          onClose={() => setCreateOverlay(null)}
        />
      ) : null}
      {createOverlay === 'set' ? (
        <CreateSetOverlay library={library} project={project} selectedUniverseId={selectedUniverseId} onCreateSet={handleCreateSetFromOverlay} onStatus={setStatus} onClose={() => setCreateOverlay(null)} />
      ) : null}
      {createOverlay === 'project' ? (
        <CreateProjectOverlay library={library} onCreateProject={handleCreateProjectFromOverlay} onStatus={setStatus} onClose={() => setCreateOverlay(null)} />
      ) : null}
      {createOverlay === 'library' ? (
        <CreateLibraryAssetOverlay project={project} onCreateAsset={handleCreateLibraryAssetFromOverlay} onStatus={setStatus} onClose={() => setCreateOverlay(null)} />
      ) : null}
    </main>
  );
}

function addUnique(values: string[], next: string): string[] {
  return values.includes(next) ? values : [...values, next];
}

function omitDraft(drafts: Record<string, CardDraft>, cardId: string): Record<string, CardDraft> {
  const next = { ...drafts };
  delete next[cardId];
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createBlankDraft(project: EditorProject, cards: CardSummary[]): CardDraft {
  const collectorNumber = nextCollectorNumber(cards);
  const cardId = `${project.setCode}-${collectorNumber}`;
  return {
    cardId,
    setCode: project.setCode,
    setName: project.setName,
    collectorNumber,
    setTotal: String(Math.max(project.cards.length + 1, 1)),
    language: project.language,
    designer: project.designer,
    name: 'New Card',
    manaCost: '{1}{W}',
    rarity: 'common',
    layout: 'normal',
    mode: 'custom',
    frameType: 'normal_creature',
    frameOverrideId: 'auto',
    supertypes: [],
    cardTypes: ['Creature'],
    subtypes: 'Human',
    typeLine: 'Creature - Human',
    oracleText: '',
    flavorText: '',
    rulesTextSize: '',
    rulesTextPaddingTop: '',
    rulesTextPaddingRight: '',
    rulesTextPaddingBottom: '',
    rulesTextPaddingLeft: '',
    rulesTextReminderMode: 'auto',
    power: '1',
    toughness: '1',
    loyalty: '',
    planeswalkerAbilityCount: '3',
    planeswalkerAbility1Cost: '+1',
    planeswalkerAbility1Text: '',
    planeswalkerAbility2Cost: '-2',
    planeswalkerAbility2Text: '',
    planeswalkerAbility3Cost: '-7',
    planeswalkerAbility3Text: '',
    planeswalkerAbility4Cost: '',
    planeswalkerAbility4Text: '',
    colors: 'W',
    colorIndicator: '',
    borderColor: 'black',
    foilTreatment: 'none',
    artId: `${cardId}-ART`,
    artFilePath: 'sets/DEMO/art/placeholders/example-vanguard.svg',
    artUrl: '',
    artDataUri: undefined,
    artPositionX: '',
    artPositionY: '',
    artScale: '',
    artCropX: '',
    artCropY: '',
    artCropW: '',
    artCropH: '',
    artist: 'Homebrew Forge',
    setSymbolPath: '',
    setSymbolUrl: '',
    watermark: '',
    status: 'draft',
    tags: [],
    notes: ''
  };
}

function createDraftCopy(project: EditorProject, source: CardDraft, cards: CardSummary[], saveAsNew: boolean): CardDraft {
  const collectorNumber = nextCollectorNumber(cards);
  const cardId = `${project.setCode}-${collectorNumber}`;
  return {
    ...source,
    cardId,
    collectorNumber,
    setCode: project.setCode,
    setName: project.setName,
    setTotal: String(Math.max(cards.length + 1, 1)),
    name: saveAsNew ? source.name : `${source.name} Copy`,
    artId: source.artId ? `${cardId}-ART` : '',
    status: source.status ?? source.sourceCard?.status ?? 'draft',
    tags: [...(source.tags ?? source.sourceCard?.tags ?? [])],
    notes: source.notes ?? source.sourceCard?.notes ?? '',
    sourceCard: undefined,
    sourceFace: undefined
  };
}

function normalizeProjectDrafts(project: EditorProject): EditorProject {
  const summaries = new Map(project.cards.map((card) => [card.cardId, card]));
  return {
    ...project,
    drafts: project.drafts.map((draft) => normalizeDraft(draft, summaries.get(draft.cardId)))
  };
}

function normalizeDraft(draft: CardDraft, summary?: CardSummary): CardDraft {
  const tags = draft.tags ?? draft.sourceCard?.tags ?? summary?.tags ?? [];
  return {
    ...draft,
    status: draft.status ?? draft.sourceCard?.status ?? summary?.status ?? 'draft',
    tags: [...tags],
    notes: draft.notes ?? draft.sourceCard?.notes ?? summary?.notes ?? ''
  };
}

function nextCollectorNumber(cards: CardSummary[]): string {
  const next = Math.max(
    0,
    ...cards
      .map((card) => Number.parseInt(card.collectorNumber.replace(/\D/g, ''), 10))
      .filter((value) => Number.isFinite(value))
  ) + 1;
  return String(next).padStart(3, '0');
}

function summaryFromDraft(draft: CardDraft): CardSummary {
  const frame = inferFrame(draft);
  const tags = draft.tags ?? draft.sourceCard?.tags ?? [];
  const status = draft.status ?? draft.sourceCard?.status ?? 'draft';
  return {
    cardId: draft.cardId,
    collectorNumber: draft.collectorNumber,
    name: draft.name,
    typeLine: buildTypeLine(draft),
    rarity: draft.rarity,
    colors: inferColors(draft.manaCost) || draft.colors,
    layout: frame.layout,
    frameType: frame.frameType,
    status,
    tags,
    notes: draft.notes ?? draft.sourceCard?.notes ?? '',
    manaCost: draft.manaCost,
    colorIdentity: draft.colorIndicator || draft.colors,
    oracleText: draft.oracleText,
    flavorText: draft.flavorText,
    power: draft.power,
    toughness: draft.toughness,
    hasArt: Boolean(draft.artId || draft.artFilePath || draft.artUrl || draft.artDataUri),
    needsReview: status === 'review' || status === 'idea' || tags.some((tag) => tag === 'needs_review' || tag.startsWith('unsupported_layout:'))
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'collection';
}
