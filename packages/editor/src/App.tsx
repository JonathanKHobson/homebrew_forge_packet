import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createCollection, createDeck, createLibraryAsset, createSet, createUniverse as createProject, fetchHealth, fetchLibrary, fetchOfficialCardStatus, fetchPreview, fetchProject, fetchReference, importCards, importCollection, restartApp, saveCard, saveDeck, syncOfficialCardCatalog } from './api/client.js';
import { CardList } from './components/CardList.js';
import { CardBrowserView } from './components/CardBrowserView.js';
import { CardPreview } from './components/CardPreview.js';
import { CardTabs } from './components/CardTabs.js';
import { CreateCardOverlay } from './components/create/CreateCardOverlay.js';
import { CreateCollectionOverlay, type CreateCollectionImportPayload } from './components/create/CreateCollectionOverlay.js';
import { CreateDeckOverlay, type CreateDeckOverlayEntry } from './components/create/CreateDeckOverlay.js';
import { CreateLibraryAssetOverlay } from './components/create/CreateLibraryAssetOverlay.js';
import { CreateProjectOverlay } from './components/create/CreateProjectOverlay.js';
import { CreateSetOverlay, type CreateSetImportPayload } from './components/create/CreateSetOverlay.js';
import { DeleteUnsavedDraftDialog } from './components/DeleteUnsavedDraftDialog.js';
import { EditorToolbar } from './components/EditorToolbar.js';
import { FirstRunOrientation } from './components/FirstRunOrientation.js';
import { DashboardView } from './components/dashboard/DashboardView.js';
import { HelpDialog } from './components/HelpDialog.js';
import { Icon } from './components/Icon.js';
import { Inspector } from './components/Inspector.js';
import { PanelResizeHandle } from './components/PanelResizeHandle.js';
import { SaveAsOverlay, type SaveAsCardRequest, type SaveAsVariantRequest } from './components/SaveAsOverlay.js';
import { AppShell, CommandPalette, RuntimeStatusBanner, SidebarNav, TopCommandBar, WorkspaceFrame, WorkspaceHealthPanel, WorkspaceStatusBar, type CommandPaletteCommand } from './components/shell/index.js';
import { TransferDialog, type TransferDialogMode } from './components/TransferDialog.js';
import { UnsavedTabCloseDialog } from './components/UnsavedTabCloseDialog.js';
import { WorkspaceView } from './components/WorkspaceView.js';
import { PrintDialog } from './components/print/PrintDialog.js';
import type { CardDraft, CardSummary, CollectionImportSummary, CollectionKind, CollectionListCategory, CreateCollectionRequest, CreateLibraryAssetRequest, CreateSetRequest, CreateUniverseRequest, EditorProject, LibraryState, PreviewResponse, RuntimeHealth } from './domain/editorTypes.js';
import type { CreateOverlayKind } from './domain/createFlowTypes.js';
import type { CardListDensity, EditorTheme, InspectorTab, PreviewMode, PreviewToolMode, WorkspaceSection } from './domain/editorUiTypes.js';
import { recoveredDraftsForSet, writeDraftRecovery } from './domain/draftRecovery.js';
import { buildTypeLine, inferColors, inferFrame } from './domain/frameRegistry.js';
import { formatCount } from './domain/uiText.js';
import { readOfficialCardSyncSettings, shouldAutoSyncOfficialCards } from './domain/officialCardSyncSettings.js';
import { getWorkMode, visibleRailSectionsForMode, type WorkModeId } from './domain/workModes.js';
import type { ReferenceCatalog } from '@homebrew-forge/forge';

interface FocusedCardModeState {
  showCommandBar: boolean;
  showSideRail: boolean;
  showLeftPanel: boolean;
  showPreviewPanel: boolean;
  showRightPanel: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
}

interface DraftHistoryEntry {
  undo: CardDraft[];
  redo: CardDraft[];
}

type DraftHistoryState = Record<string, DraftHistoryEntry>;

const DEFAULT_PROJECT_STORAGE_KEY = 'homebrew-forge.defaultProjectId';
const FIRST_RUN_ORIENTATION_STORAGE_KEY = 'homebrew-forge.firstRunOrientationDismissed';
const EDITOR_THEME_STORAGE_KEY = 'homebrew-forge.theme';
const DRAFT_RECOVERY_AUTOSAVE_MS = 1200;
const MAX_DRAFT_HISTORY = 80;
const EDITOR_THEMES: EditorTheme[] = ['light', 'dark', 'parchment'];
const DEMO_SET_CODES = new Set(['DEMO']);
const DEMO_UNIVERSE_IDS = new Set(['demo']);

type NarrowCardPanel = 'list' | 'preview' | 'inspector';

function isEditorTheme(value: string | null): value is EditorTheme {
  return EDITOR_THEMES.includes(value as EditorTheme);
}

function readEditorTheme(): EditorTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  try {
    const stored = window.localStorage.getItem(EDITOR_THEME_STORAGE_KEY);
    return isEditorTheme(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

function saveEditorTheme(theme: EditorTheme): void {
  try {
    window.localStorage.setItem(EDITOR_THEME_STORAGE_KEY, theme);
  } catch {
    // Theme still applies for the current session when storage is unavailable.
  }
}

function readDefaultProjectId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(DEFAULT_PROJECT_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveDefaultProjectId(projectId: string): boolean {
  try {
    window.localStorage.setItem(DEFAULT_PROJECT_STORAGE_KEY, projectId);
    return true;
  } catch {
    return false;
  }
}

function clearDefaultProjectId(): boolean {
  try {
    window.localStorage.removeItem(DEFAULT_PROJECT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function firstRunOrientationDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(FIRST_RUN_ORIENTATION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function dismissFirstRunOrientationStorage(): void {
  try {
    window.localStorage.setItem(FIRST_RUN_ORIENTATION_STORAGE_KEY, 'true');
  } catch {
    // The visible state still updates if localStorage is unavailable.
  }
}

function firstSetForUniverse(library: LibraryState, universeId: string): LibraryState['sets'][number] | undefined {
  return library.sets
    .filter((set) => set.universeId === universeId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.setCode.localeCompare(right.setCode))[0];
}

function isDemoSet(set: LibraryState['sets'][number]): boolean {
  return DEMO_SET_CODES.has(set.setCode.toUpperCase()) || DEMO_UNIVERSE_IDS.has(set.universeId) || set.tags.includes('demo');
}

function nonDemoAuthoredCardCount(library: LibraryState | null): number {
  if (!library) {
    return 0;
  }
  return library.sets.reduce((total, set) => total + (isDemoSet(set) ? 0 : set.cardCount), 0);
}

export function App() {
  const [library, setLibrary] = useState<LibraryState | null>(null);
  const [referenceCatalog, setReferenceCatalog] = useState<ReferenceCatalog | null>(null);
  const [selectedUniverseId, setSelectedUniverseId] = useState('');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [project, setProject] = useState<EditorProject | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeVariantId, setActiveVariantId] = useState<string>('');
  const [draft, setDraft] = useState<CardDraft | null>(null);
  const [sessionDrafts, setSessionDrafts] = useState<Record<string, CardDraft>>({});
  const [draftHistory, setDraftHistory] = useState<DraftHistoryState>({});
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewDraftKey, setPreviewDraftKey] = useState('');
  const [previewPendingKey, setPreviewPendingKey] = useState('');
  const [status, setStatus] = useState('Loading DEMO...');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth | null>(null);
  const [restartState, setRestartState] = useState<'idle' | 'restarting' | 'error'>('idle');
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSection>('maker');
  const [transferDialog, setTransferDialog] = useState<TransferDialogMode | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [workspaceHealthOpen, setWorkspaceHealthOpen] = useState(false);
  const [createOverlay, setCreateOverlay] = useState<CreateOverlayKind | null>(null);
  const [collectionCreateDefaults, setCollectionCreateDefaults] = useState<{ kind: CollectionKind; listCategory: CollectionListCategory }>({ kind: 'binder', listCategory: 'general' });
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [pendingTabCloseCardId, setPendingTabCloseCardId] = useState('');
  const [pendingSaveAsCloseCardId, setPendingSaveAsCloseCardId] = useState('');
  const [pendingDeleteDraftId, setPendingDeleteDraftId] = useState('');
  const [draftRecoveryReady, setDraftRecoveryReady] = useState(false);
  const [editorTheme, setEditorTheme] = useState<EditorTheme>(() => readEditorTheme());
  const [workMode, setWorkMode] = useState<WorkModeId>('full-studio');
  const [deckRefreshToken, setDeckRefreshToken] = useState(0);
  const [createdDeckId, setCreatedDeckId] = useState('');
  const [collectionRefreshToken, setCollectionRefreshToken] = useState(0);
  const [createdCollectionId, setCreatedCollectionId] = useState('');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('card');
  const [openCardIds, setOpenCardIds] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('normal');
  const [previewToolMode, setPreviewToolMode] = useState<PreviewToolMode>('preview');
  const [showGuides, setShowGuides] = useState(false);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [showCardGrid, setShowCardGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cardListDensity, setCardListDensity] = useState<CardListDensity>('comfortable');
  const [showCommandBar, setShowCommandBar] = useState(true);
  const [showSideRail, setShowSideRail] = useState(true);
  const [showCardsRailItem, setShowCardsRailItem] = useState(false);
  const [showCollectionsRailItem, setShowCollectionsRailItem] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showPreviewPanel, setShowPreviewPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const [commandBarHeight, setCommandBarHeight] = useState(72);
  const [isFocusedCardMode, setIsFocusedCardMode] = useState(false);
  const [isCardBrowserMode, setIsCardBrowserMode] = useState(false);
  const [isDashboardMode, setIsDashboardMode] = useState(false);
  const [workspaceSaveShortcutToken, setWorkspaceSaveShortcutToken] = useState(0);
  const [focusedLeftPanelPercent, setFocusedLeftPanelPercent] = useState(54);
  const [focusedPanelsFlipped, setFocusedPanelsFlipped] = useState(false);
  const [focusedCardModeState, setFocusedCardModeState] = useState<FocusedCardModeState | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFirstRunOrientation, setShowFirstRunOrientation] = useState(false);
  const [narrowCardPanel, setNarrowCardPanel] = useState<NarrowCardPanel>('preview');
  const [previewExpandToken, setPreviewExpandToken] = useState(0);
  const previewRequestId = useRef(0);
  const workbenchRef = useRef<HTMLElement | null>(null);
  const recoverySaveErrorRef = useRef('');
  const viewportWidth = useViewportWidth();
  const dirtyDrafts = useMemo(() => Object.values(sessionDrafts), [sessionDrafts]);
  const dirtyCardIds = useMemo(() => new Set(dirtyDrafts.map((candidate) => candidate.cardId)), [dirtyDrafts]);
  const hasUnsavedChanges = dirtyDrafts.length > 0;

  useEffect(() => {
    let mounted = true;
    setShowFirstRunOrientation(!firstRunOrientationDismissed());
    void loadInitial()
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : String(error)))
      .finally(() => {
        if (mounted) {
          setInitialLoadComplete(true);
          setDraftRecoveryReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = editorTheme;
    document.documentElement.style.colorScheme = editorTheme === 'dark' ? 'dark' : 'light';
    saveEditorTheme(editorTheme);
  }, [editorTheme]);

  useEffect(() => {
    if (!initialLoadComplete) {
      return;
    }
    let cancelled = false;
    const maybeSyncOfficialCards = async () => {
      const settings = readOfficialCardSyncSettings();
      try {
        const status = await fetchOfficialCardStatus();
        if (!shouldAutoSyncOfficialCards(status, settings) || cancelled) {
          return;
        }
        setStatus('Official card catalog is stale or missing; syncing in the background.');
        const nextStatus = await syncOfficialCardCatalog('both');
        if (!cancelled) {
          setStatus(`Synced official card catalog. ${formatCount(nextStatus.prints.count + nextStatus.oracle.count, 'card record')} cached.`);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : String(error));
        }
      }
    };
    void maybeSyncOfficialCards();
    return () => {
      cancelled = true;
    };
  }, [initialLoadComplete]);

  useEffect(() => {
    if (isFocusedCardMode || isDashboardMode) {
      return;
    }
    setShowCommandBar(activeWorkspace === 'maker');
  }, [activeWorkspace, isDashboardMode, isFocusedCardMode]);

  useEffect(() => {
    let cancelled = false;
    const checkRuntimeHealth = async () => {
      try {
        const nextHealth = await fetchHealth();
        if (!cancelled) {
          setRuntimeHealth(nextHealth);
        }
      } catch {
        if (!cancelled) {
          setRuntimeHealth(null);
        }
      }
    };
    void checkRuntimeHealth();
    const interval = window.setInterval(() => void checkRuntimeHealth(), 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!draftRecoveryReady) {
      return;
    }
    const draftsToRecover = Object.values(sessionDrafts);
    let cancelled = false;
    const persistRecovery = () => {
      const result = writeDraftRecovery(draftsToRecover);
      if (!result.ok && result.error && !cancelled && recoverySaveErrorRef.current !== result.error) {
        recoverySaveErrorRef.current = result.error;
        setStatus(`Draft recovery could not save: ${result.error}`);
      }
      if (result.ok) {
        recoverySaveErrorRef.current = '';
      }
    };
    const timeout = window.setTimeout(persistRecovery, DRAFT_RECOVERY_AUTOSAVE_MS);
    const flushRecovery = () => persistRecovery();
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        persistRecovery();
      }
    };
    window.addEventListener('pagehide', flushRecovery);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      window.removeEventListener('pagehide', flushRecovery);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [draftRecoveryReady, sessionDrafts]);

  useEffect(() => {
    const saveOnShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        event.stopPropagation();
        handleSaveShortcut();
        return;
      }
      if (key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        setCommandPaletteOpen(true);
        return;
      }
      if (key === 'z' && activeWorkspace === 'maker') {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          handleRedoDraft();
          return;
        }
        handleUndoDraft();
        return;
      }
      if (key === 'y' && activeWorkspace === 'maker') {
        event.preventDefault();
        event.stopPropagation();
        handleRedoDraft();
      }
    };
    window.addEventListener('keydown', saveOnShortcut);
    return () => window.removeEventListener('keydown', saveOnShortcut);
  }, [activeWorkspace, draft, draftHistory, saveState, sessionDrafts, project]);

  useEffect(() => {
    document.title = `${workspaceLabel(activeWorkspace)}${project?.setCode ? ` - ${project.setCode}` : ''} - Homebrew Forge`;
  }, [activeWorkspace, project?.setCode]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    syncFullscreenState();
    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    if (!project || !selectedId) {
      return;
    }
    const savedDrafts = project.drafts.filter((candidate) => candidate.cardId === selectedId);
    const preferredVariantId = activeVariantId || savedDrafts.find((candidate) => candidate.variantIsPrimary)?.variantId || savedDrafts[0]?.variantId || '';
    const selected = sessionDrafts[draftKey(selectedId, preferredVariantId)] ?? savedDrafts.find((candidate) => candidate.variantId === preferredVariantId) ?? savedDrafts.find((candidate) => candidate.variantIsPrimary) ?? savedDrafts[0];
    if (selected) {
      if (activeVariantId !== selected.variantId) {
        setActiveVariantId(selected.variantId);
      }
      setDraft(selected);
      setSaveState('idle');
      setOpenCardIds((ids) => addUnique(ids, selected.cardId).slice(-6));
    } else {
      setDraft(null);
    }
  }, [activeVariantId, project, selectedId, sessionDrafts]);

  useEffect(() => {
    if (!draft) {
      previewRequestId.current += 1;
      setPreview(null);
      setPreviewDraftKey('');
      setPreviewPendingKey('');
      return;
    }
    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    const requestPreviewKey = previewKeyForDraft(draft);
    setPreviewPendingKey(requestPreviewKey);
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
            setPreviewDraftKey(requestPreviewKey);
            setPreviewPendingKey('');
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
          setPreviewDraftKey(requestPreviewKey);
          setPreviewPendingKey('');
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [draft, project?.frames]);

  const selectedFrame = useMemo(() => (draft ? inferFrame(draft, project?.frames) : null), [draft, project?.frames]);
  const activePreviewKey = draft ? previewKeyForDraft(draft) : '';
  const previewForDraft = activePreviewKey && previewDraftKey === activePreviewKey ? preview : null;
  const previewIsLoading = Boolean(draft && !previewForDraft);
  const previewIsUpdating = Boolean(draft && previewForDraft && previewPendingKey === activePreviewKey);
  const activeDraftKey = draft ? draftKey(draft.cardId, draft.variantId) : '';
  const selectedSavedDraft = draft && project ? savedDraftFor(project, draft) : undefined;
  const selectedDraftIsDirty = Boolean(activeDraftKey && sessionDrafts[activeDraftKey]);
  const selectedHasUnsavedChanges = selectedDraftIsDirty;
  const selectedDraftHasSavedState = Boolean(selectedSavedDraft);
  const activeDraftHistory = activeDraftKey ? draftHistory[activeDraftKey] : undefined;
  const canUndoDraft = Boolean(activeDraftHistory?.undo.length);
  const canRedoDraft = Boolean(activeDraftHistory?.redo.length);
  const canRevertDraft = Boolean(draft && selectedDraftIsDirty && selectedDraftHasSavedState);
  const pendingTabCloseDraft = pendingTabCloseCardId ? dirtyDraftForCard(pendingTabCloseCardId, dirtyDrafts, draft) : null;
  const cardsForList = useMemo(() => {
    if (!project) {
      return [];
    }
    const sessionForSet = Object.values(sessionDrafts).filter((candidate) => candidate.setCode === project.setCode);
    const savedIds = new Set(project.cards.map((card) => card.cardId));
    const savedCards = project.cards.map((card) => {
      const sessionDraft = sessionForSet.find((candidate) => candidate.cardId === card.cardId && candidate.variantId === (card.cardId === selectedId ? activeVariantId : card.primaryVariantId));
      return sessionDraft ? summaryFromDraft(sessionDraft, card) : card;
    });
    const unsavedCards = uniqueByCardId(sessionForSet.filter((candidate) => !savedIds.has(candidate.cardId))).map((candidate) => summaryFromDraft(candidate));
    return [...savedCards, ...unsavedCards];
  }, [activeVariantId, project, selectedId, sessionDrafts]);
  const makerWorkspaceActive = activeWorkspace === 'maker' && initialLoadComplete && !isFocusedCardMode && !isCardBrowserMode && !isDashboardMode;
  const authoredCardCount = nonDemoAuthoredCardCount(library);
  const hasNonDemoAuthoredCards = authoredCardCount > 0;
  // First-run guidance is a full-workbench zero-state only. Demo/sample cards do
  // not count as authored user content, but real authored cards always suppress it.
  const showMakerOnboarding = makerWorkspaceActive && showFirstRunOrientation && !hasNonDemoAuthoredCards;
  const effectiveShowLeftPanel = showMakerOnboarding ? false : showLeftPanel;
  const effectiveShowPreviewPanel = showMakerOnboarding ? true : showPreviewPanel;
  const effectiveShowRightPanel = showMakerOnboarding ? false : showRightPanel;
  const effectiveShowSideRail = showMakerOnboarding ? false : showSideRail;
  const clampedFocusedLeftPanelPercent = clamp(focusedLeftPanelPercent, 18, 82);
  const adaptiveMakerWorkbench = useMemo(
    () =>
      makerWorkbenchLayout({
        collapsedLeft: activeWorkspace === 'maker' && !showMakerOnboarding && !effectiveShowLeftPanel,
        collapsedRight: activeWorkspace === 'maker' && !showMakerOnboarding && !effectiveShowRightPanel,
        leftPanelWidth,
        previewVisible: activeWorkspace === 'maker' && effectiveShowPreviewPanel,
        rightPanelWidth,
        showLeftPanel: activeWorkspace === 'maker' && effectiveShowLeftPanel,
        showRightPanel: activeWorkspace === 'maker' && effectiveShowRightPanel,
        showSideRail: effectiveShowSideRail,
        viewportWidth
      }),
    [activeWorkspace, effectiveShowLeftPanel, effectiveShowPreviewPanel, effectiveShowRightPanel, effectiveShowSideRail, leftPanelWidth, rightPanelWidth, showMakerOnboarding, viewportWidth]
  );
  const workbenchColumns = useMemo(() => {
    if (isCardBrowserMode || isDashboardMode) {
      return 'minmax(0, 1fr)';
    }
    if (isFocusedCardMode && activeWorkspace === 'maker') {
      return `${clampedFocusedLeftPanelPercent}% 6px ${100 - clampedFocusedLeftPanelPercent}%`;
    }
    const columns: string[] = [];
    if (effectiveShowSideRail) {
      columns.push('64px');
    }
    if (activeWorkspace === 'maker') {
      if (effectiveShowLeftPanel) {
        columns.push(`${adaptiveMakerWorkbench.leftWidth}px`, '6px');
      } else if (!showMakerOnboarding) {
        columns.push('36px');
      }
    }
    if (activeWorkspace === 'maker') {
      if (effectiveShowPreviewPanel) {
        columns.push(`minmax(${adaptiveMakerWorkbench.previewMinWidth}px, 1fr)`);
      }
    } else {
      columns.push('minmax(0, 1fr)');
    }
    if (activeWorkspace === 'maker') {
      if (effectiveShowRightPanel) {
        columns.push('6px', `${adaptiveMakerWorkbench.rightWidth}px`);
      } else if (!showMakerOnboarding) {
        columns.push('36px');
      }
    }
    return columns.join(' ');
  }, [activeWorkspace, adaptiveMakerWorkbench.leftWidth, adaptiveMakerWorkbench.previewMinWidth, adaptiveMakerWorkbench.rightWidth, clampedFocusedLeftPanelPercent, effectiveShowLeftPanel, effectiveShowPreviewPanel, effectiveShowRightPanel, effectiveShowSideRail, isCardBrowserMode, isDashboardMode, isFocusedCardMode, showMakerOnboarding]);
  const workbenchStyle: CSSProperties = { gridTemplateColumns: workbenchColumns };

  const selectedIsUnsaved = Boolean(draft && selectedDraftIsDirty && !selectedDraftHasSavedState);
  const pendingCardDraft = useMemo(() => (project && createOverlay === 'card' ? createBlankDraft(project, cardsForList) : null), [cardsForList, createOverlay, project]);
  const activeUniverse = useMemo(() => library?.universes.find((universe) => universe.id === selectedUniverseId) ?? null, [library?.universes, selectedUniverseId]);
  const activeWorkMode = useMemo(() => getWorkMode(workMode), [workMode]);
  const visibleRailSections = useMemo(() => visibleRailSectionsForMode(workMode, activeWorkspace, showCollectionsRailItem, showCardsRailItem), [activeWorkspace, showCardsRailItem, showCollectionsRailItem, workMode]);

  async function handleRestartApp() {
    if (hasUnsavedChanges || restartState === 'restarting') {
      return;
    }
    setRestartState('restarting');
    setStatus('Restarting Homebrew Forge...');
    try {
      await restartApp();
      void reloadWhenRuntimeReturns();
    } catch (error) {
      setRestartState('error');
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function handleShowCollectionsRailItemChange(value: boolean) {
    setShowCollectionsRailItem(value);
    if (!value && activeWorkspace === 'collections') {
      setActiveWorkspace('maker');
    }
  }

  function handleShowCardsRailItemChange(value: boolean) {
    setShowCardsRailItem(value);
    if (!value && activeWorkspace === 'cards') {
      setActiveWorkspace('maker');
    }
  }

  function dismissFirstRunOrientation() {
    setShowFirstRunOrientation(false);
    dismissFirstRunOrientationStorage();
  }

  function handleWorkModeChange(nextModeId: WorkModeId) {
    const nextMode = getWorkMode(nextModeId);
    setWorkMode(nextModeId);
    setIsFocusedCardMode(false);
    setIsCardBrowserMode(false);
    setIsDashboardMode(false);
    setFocusedCardModeState(null);
    setFocusedPanelsFlipped(false);
    setActiveWorkspace(nextMode.defaultWorkspace);
    setShowCommandBar(nextMode.panelPreset.showCommandBar);
    setShowSideRail(nextMode.panelPreset.showSideRail);
    setShowLeftPanel(nextMode.panelPreset.showLeftPanel);
    setShowPreviewPanel(nextMode.panelPreset.showPreviewPanel);
    setShowRightPanel(nextMode.panelPreset.showRightPanel);
    if (nextMode.panelPreset.showCardsRailItem !== undefined) {
      setShowCardsRailItem(nextMode.panelPreset.showCardsRailItem);
    }
    if (nextMode.panelPreset.showCollectionsRailItem !== undefined) {
      setShowCollectionsRailItem(nextMode.panelPreset.showCollectionsRailItem);
    }
    if (nextMode.panelPreset.cardListDensity) {
      setCardListDensity(nextMode.panelPreset.cardListDensity);
    }
    setStatus(`Work Mode: ${nextMode.label}. ${nextMode.statusMessage}`);
  }

  function handlePreviewModeChange(nextMode: PreviewMode) {
    if (nextMode === 'expanded') {
      if (previewForDraft?.imageDataUri && activeWorkspace === 'maker' && !isCardBrowserMode) {
        setPreviewExpandToken((value) => value + 1);
        return;
      }
      enterFocusedCardMode();
      setStatus(draft ? 'Opened Card Preview focus. Preview is still rendering.' : 'Opened Card Preview focus. Choose a card to preview.');
      return;
    }
    setPreviewMode(nextMode);
  }

  async function loadInitial() {
    const [loadedLibrary, loadedReference] = await Promise.all([fetchLibrary(), fetchReference()]);
    setReferenceCatalog(loadedReference);
    const storedDefaultProjectId = readDefaultProjectId();
    const validDefaultProjectId = loadedLibrary.universes.some((universe) => universe.id === storedDefaultProjectId) ? storedDefaultProjectId : '';
    if (storedDefaultProjectId && !validDefaultProjectId) {
      clearDefaultProjectId();
    }
    setDefaultProjectId(validDefaultProjectId);
    setLibrary(loadedLibrary);
    if (validDefaultProjectId) {
      const defaultProjectSet = firstSetForUniverse(loadedLibrary, validDefaultProjectId);
      setSelectedUniverseId(validDefaultProjectId);
      if (defaultProjectSet) {
        await loadSet(defaultProjectSet.setCode, loadedLibrary);
        return;
      }
      const defaultProject = loadedLibrary.universes.find((universe) => universe.id === validDefaultProjectId);
      clearLoadedProject();
      setStatus(`Loaded ${defaultProject?.name ?? 'project'}. Create a set to start adding cards.`);
      return;
    }
    const setCode = loadedLibrary.selectedSetCode || 'DEMO';
    setSelectedUniverseId(loadedLibrary.selectedUniverseId);
    await loadSet(setCode, loadedLibrary);
  }

  function applyProject(loaded: EditorProject): { recoveredDraftCount: number; recoveryError?: string } {
    const normalized = normalizeProjectDrafts(loaded);
    const recovery = recoveredDraftsForSet(normalized.setCode);
    const recoveredDrafts = recovery.drafts.map((candidate) => normalizeDraft(candidate, normalized.cards.find((card) => card.cardId === candidate.cardId)));
    setDraftHistory({});
    if (recoveredDrafts.length) {
      setSessionDrafts((drafts) => ({
        ...drafts,
        ...Object.fromEntries(recoveredDrafts.map((candidate) => [draftKey(candidate.cardId, candidate.variantId), candidate]))
      }));
    }
    setProject(normalized);
    const first = recoveredDrafts[0] ?? normalized.drafts[0];
    if (first) {
      setSelectedId(first.cardId);
      setActiveVariantId(first.variantId);
      setDraft(first);
      setOpenCardIds([first.cardId]);
    } else {
      setSelectedId('');
      setActiveVariantId('');
      setDraft(null);
      setPreview(null);
      setOpenCardIds([]);
    }
    return { recoveredDraftCount: recoveredDrafts.length, recoveryError: recovery.error };
  }

  async function loadSet(setCode: string, currentLibrary = library): Promise<EditorProject> {
    setStatus(`Loading ${setCode}...`);
    const loaded = await fetchProject(setCode);
    const recovery = applyProject(loaded);
    const setSummary = currentLibrary?.sets.find((set) => set.setCode === loaded.setCode);
    if (setSummary) {
      setSelectedUniverseId(setSummary.universeId);
    }
    setSaveState('idle');
    const recoveredText = recovery.recoveredDraftCount ? ` Recovered ${recovery.recoveredDraftCount} local draft${recovery.recoveredDraftCount === 1 ? '' : 's'}.` : '';
    const recoveryErrorText = recovery.recoveryError ? ` Draft recovery skipped: ${recovery.recoveryError}` : '';
    setStatus(`Loaded ${formatCount(loaded.cards.length, 'card')} / ${formatCount(loaded.drafts.length, 'variant')} from ${loaded.setCode}.${recoveredText}${recoveryErrorText}`);
    return loaded;
  }

  async function handleSelectUniverse(universeId: string) {
    const currentLibrary = library;
    if (!currentLibrary) {
      return;
    }
    const universe = currentLibrary.universes.find((candidate) => candidate.id === universeId);
    if (!universe) {
      setStatus(`Could not find project ${universeId}.`);
      return;
    }
    setSelectedUniverseId(universeId);
    const nextSet = currentLibrary.sets
      .filter((set) => set.universeId === universeId)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.setCode.localeCompare(right.setCode))[0];
    if (nextSet) {
      await loadSet(nextSet.setCode, currentLibrary);
      setStatus(`Switched to ${universe.name} - ${nextSet.setCode}.`);
      return;
    }
    clearLoadedProject();
    setStatus(`Switched to ${universe.name}. Create a set to start adding cards.`);
  }

  function clearLoadedProject() {
    setProject(null);
    setSelectedId('');
    setActiveVariantId('');
    setDraft(null);
    setPreview(null);
    setOpenCardIds([]);
    setSaveState('idle');
    setDraftHistory({});
  }

  function handleSetDefaultProject(universeId: string) {
    const universe = library?.universes.find((candidate) => candidate.id === universeId);
    if (!universe) {
      setStatus(`Could not find project ${universeId}.`);
      return;
    }
    if (!saveDefaultProjectId(universeId)) {
      setStatus('Could not save startup default in this browser.');
      return;
    }
    setDefaultProjectId(universeId);
    setStatus(`${universe.name} will load first on this browser.`);
  }

  function handleClearDefaultProject() {
    clearDefaultProjectId();
    setDefaultProjectId('');
    setStatus('Startup default cleared. The editor will use the app default on next load.');
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
    const card = cardsForList.find((candidate) => candidate.cardId === cardId);
    setActiveVariantId(card?.primaryVariantId ?? project?.drafts.find((candidate) => candidate.cardId === cardId && candidate.variantIsPrimary)?.variantId ?? '');
    setOpenCardIds((ids) => addUnique(ids, cardId).slice(-6));
  }

  function handleSelectVariant(variantId: string) {
    setActiveVariantId(variantId);
  }

  async function handleOpenCard(setCode: string, cardId: string, variantId?: string) {
    const loaded = project?.setCode === setCode ? project : await loadSet(setCode);
    const target = loaded.drafts.find((candidate) => candidate.cardId === cardId && (!variantId || candidate.variantId === variantId)) ?? loaded.drafts.find((candidate) => candidate.cardId === cardId && candidate.variantIsPrimary) ?? loaded.drafts.find((candidate) => candidate.cardId === cardId);
    if (!target) {
      setStatus(`Could not find ${cardId} in ${setCode}.`);
      return;
    }
    setActiveWorkspace('maker');
    setSelectedId(target.cardId);
    setActiveVariantId(target.variantId);
    setDraft(target);
    setOpenCardIds((ids) => addUnique(ids, target.cardId).slice(-6));
    setStatus(`Selected ${target.collectorNumber} ${target.name}.`);
  }

  async function handleOpenSet(setCode: string) {
    await loadSet(setCode);
    setActiveWorkspace('sets');
  }

  function handleCloseTab(cardId: string) {
    if (dirtyCardIds.has(cardId)) {
      setPendingTabCloseCardId(cardId);
      return;
    }
    closeTab(cardId);
  }

  function closeTab(cardId: string) {
    setOpenCardIds((ids) => {
      const next = ids.filter((id) => id !== cardId);
      if (cardId === selectedId) {
        setSelectedId(next.at(-1) ?? cardsForList.find((card) => card.cardId !== cardId)?.cardId ?? '');
      }
      return next;
    });
  }

  function discardCardDraftsAndClose(cardId: string) {
    setSessionDrafts((drafts) => omitDraftsForCard(drafts, cardId));
    setDraftHistory((history) => omitDraftHistoryForCard(history, cardId));
    setPendingTabCloseCardId('');
    closeTab(cardId);
    setStatus(`Discarded unsaved changes for ${cardId}.`);
  }

  async function saveCardDraftAndClose(cardId: string) {
    const draftToSave = dirtyDraftForCard(cardId, dirtyDrafts, draft);
    if (!draftToSave) {
      setPendingTabCloseCardId('');
      closeTab(cardId);
      return;
    }
    await saveDraftToCsv(draftToSave);
    setPendingTabCloseCardId('');
    closeTab(cardId);
  }

  function saveCardDraftAsVariantFromClose(cardId: string) {
    const draftToSave = dirtyDraftForCard(cardId, dirtyDrafts, draft);
    if (!draftToSave) {
      setPendingTabCloseCardId('');
      return;
    }
    setSelectedId(draftToSave.cardId);
    setActiveVariantId(draftToSave.variantId);
    setDraft(draftToSave);
    setPendingTabCloseCardId('');
    setPendingSaveAsCloseCardId(cardId);
    setSaveAsOpen(true);
  }

  function handleNewCard() {
    setActiveWorkspace('maker');
    setCreateOverlay('card');
  }

  function normalizeVisibleDraft(nextDraft: CardDraft) {
    const summary = project?.cards.find((card) => card.cardId === nextDraft.cardId);
    const normalizedDraft = normalizeDraft(nextDraft, summary);
    return { ...normalizedDraft, colors: inferColors(normalizedDraft.manaCost), typeLine: buildTypeLine(normalizedDraft) };
  }

  function applyDraftEdit(nextDraft: CardDraft) {
    const normalized = normalizeVisibleDraft(nextDraft);
    const key = draftKey(normalized.cardId, normalized.variantId);
    setDraft(normalized);
    setSelectedId(normalized.cardId);
    setActiveVariantId(normalized.variantId);
    setSessionDrafts((drafts) => {
      const saved = project ? savedDraftFor(project, normalized) : undefined;
      if (saved && draftsAreEqual(normalizeVisibleDraft(saved), normalized)) {
        return omitDraft(drafts, key);
      }
      return { ...drafts, [key]: normalized };
    });
    setSaveState('idle');
  }

  function handleDraftChange(nextDraft: CardDraft) {
    const normalized = normalizeVisibleDraft(nextDraft);
    const key = draftKey(normalized.cardId, normalized.variantId);
    const previous = draft && draftKey(draft.cardId, draft.variantId) === key
      ? draft
      : sessionDrafts[key] ?? (project ? savedDraftFor(project, normalized) : undefined);
    if (previous && !draftsAreEqual(normalizeVisibleDraft(previous), normalized)) {
      setDraftHistory((history) => pushDraftUndo(history, key, previous));
    }
    applyDraftEdit(normalized);
  }

  function handleUndoDraft() {
    if (!draft || !activeDraftKey) {
      setStatus('No card edit is selected to undo.');
      return;
    }
    const entry = draftHistory[activeDraftKey];
    const previous = entry?.undo.at(-1);
    if (!previous) {
      setStatus('No earlier edit to undo for this card.');
      return;
    }
    const current = cloneDraft(draft);
    setDraftHistory((history) => moveDraftHistory(history, activeDraftKey, 'undo', current));
    applyDraftEdit(previous);
    setStatus(`Undid edit to ${previous.name}.`);
  }

  function handleRedoDraft() {
    if (!draft || !activeDraftKey) {
      setStatus('No card edit is selected to redo.');
      return;
    }
    const entry = draftHistory[activeDraftKey];
    const next = entry?.redo.at(-1);
    if (!next) {
      setStatus('No undone edit to redo for this card.');
      return;
    }
    const current = cloneDraft(draft);
    setDraftHistory((history) => moveDraftHistory(history, activeDraftKey, 'redo', current));
    applyDraftEdit(next);
    setStatus(`Redid edit to ${next.name}.`);
  }

  function handleRevertDraft() {
    if (!draft || !project) {
      setStatus('No card edit is selected to revert.');
      return;
    }
    const saved = savedDraftFor(project, draft);
    if (!saved) {
      setStatus('This draft has not been saved yet. Use Delete Unsaved Draft to discard it.');
      return;
    }
    if (!selectedDraftIsDirty) {
      setStatus(`${draft.name} already matches the last saved version.`);
      return;
    }
    setDraftHistory((history) => pushDraftUndo(history, activeDraftKey, draft));
    applyDraftEdit(saved);
    setStatus(`Reverted ${draft.name} to the last saved version.`);
  }

  function handleDuplicateAsCard() {
    if (!project || !draft) {
      return;
    }
    const next = createDraftCopy(project, draft, cardsForList);
    setSessionDrafts((drafts) => ({ ...drafts, [draftKey(next.cardId, next.variantId)]: next }));
    setActiveWorkspace('maker');
    setSelectedId(next.cardId);
    setActiveVariantId(next.variantId);
    setDraft(next);
    setOpenCardIds((ids) => addUnique(ids, next.cardId).slice(-6));
    setSaveState('idle');
    setStatus(`Duplicated ${draft.name} as unsaved card ${next.collectorNumber}. Save when you want to keep it.`);
  }

  function handleDuplicateAsVariant() {
    if (!draft) {
      return;
    }
    const next = createVariantCopy(draft, {
      displayName: nextVariantName(draft),
      kind: draft.variantKind,
      status: 'testing',
      exportPolicy: 'optional',
      tags: [...draft.variantTags],
      notes: draft.variantNotes,
      makePrimary: false
    });
    next.variantSummaries = upsertVariantSummary(draft.variantSummaries ?? [], variantSummaryFromDraft(next));
    setSessionDrafts((drafts) => ({ ...drafts, [draftKey(next.cardId, next.variantId)]: next }));
    setActiveWorkspace('maker');
    setSelectedId(next.cardId);
    setActiveVariantId(next.variantId);
    setDraft(next);
    setOpenCardIds((ids) => addUnique(ids, next.cardId).slice(-6));
    setSaveState('idle');
    setStatus(`Duplicated ${draft.name} as unsaved variant ${next.variantDisplayName}. Save when you want to keep it.`);
  }

  async function handleSaveAsNewCard(request: SaveAsCardRequest) {
    if (!project || !draft) {
      return;
    }
    const next = createDraftCopy(project, draft, cardsForList, request);
    setSessionDrafts((drafts) => ({ ...drafts, [draftKey(next.cardId, next.variantId)]: next }));
    setActiveWorkspace('maker');
    setSelectedId(next.cardId);
    setActiveVariantId(next.variantId);
    setDraft(next);
    setOpenCardIds((ids) => addUnique(ids, next.cardId).slice(-6));
    try {
      await saveDraftToCsv(next);
      finishPendingSaveAsClose();
    } catch {
      // saveDraftToCsv already updates the visible status strip.
    }
  }

  async function handleSaveAsVariant(request: SaveAsVariantRequest) {
    if (!project || !draft) {
      return;
    }
    const next = createVariantCopy(draft, request);
    setSessionDrafts((drafts) => ({ ...drafts, [draftKey(next.cardId, next.variantId)]: next }));
    setActiveWorkspace('maker');
    setSelectedId(next.cardId);
    setActiveVariantId(next.variantId);
    setDraft(next);
    setOpenCardIds((ids) => addUnique(ids, next.cardId).slice(-6));
    try {
      await saveDraftToCsv(next);
      finishPendingSaveAsClose();
    } catch {
      // saveDraftToCsv already updates the visible status strip.
    }
  }

  function finishPendingSaveAsClose() {
    if (!pendingSaveAsCloseCardId) {
      return;
    }
    const cardId = pendingSaveAsCloseCardId;
    setSessionDrafts((drafts) => omitDraftsForCard(drafts, cardId));
    setDraftHistory((history) => omitDraftHistoryForCard(history, cardId));
    setPendingSaveAsCloseCardId('');
    closeTab(cardId);
  }

  function handleDeleteDraft() {
    if (!draft || !selectedIsUnsaved) {
      return;
    }
    setPendingDeleteDraftId(draft.cardId);
  }

  function confirmDeleteDraft() {
    if (!draft || !selectedIsUnsaved || pendingDeleteDraftId !== draft.cardId) {
      setPendingDeleteDraftId('');
      return;
    }
    const deleted = draft;
    const deletedKey = draftKey(deleted.cardId, deleted.variantId);
    const fallback = project?.drafts.find((candidate) => candidate.cardId === deleted.cardId && candidate.variantIsPrimary)
      ?? project?.drafts.find((candidate) => candidate.cardId === deleted.cardId)
      ?? project?.drafts.find((candidate) => candidate.cardId !== deleted.cardId)
      ?? null;
    setSessionDrafts((drafts) => omitDraft(drafts, deletedKey));
    setDraftHistory((history) => omitDraftHistory(history, deletedKey));
    if (fallback) {
      setSelectedId(fallback.cardId);
      setActiveVariantId(fallback.variantId);
      setDraft(normalizeVisibleDraft(fallback));
      setOpenCardIds((ids) => addUnique(ids.filter((id) => id !== deleted.cardId || fallback.cardId === deleted.cardId), fallback.cardId).slice(-6));
    } else {
      setOpenCardIds((ids) => ids.filter((id) => id !== deleted.cardId));
      setSelectedId('');
      setDraft(null);
      setActiveVariantId('');
      setPreview(null);
    }
    setStatus(`Deleted unsaved draft ${deleted.name}.`);
    setPendingDeleteDraftId('');
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

  function handleSaveShortcut() {
    if (activeWorkspace === 'maker') {
      if (!draft) {
        setStatus('No card is selected to save.');
        return;
      }
      if (saveState === 'saving') {
        setStatus('Card save is already in progress.');
        return;
      }
      void handleSave();
      return;
    }
    if (activeWorkspace === 'sets' || activeWorkspace === 'projects' || activeWorkspace === 'decks' || activeWorkspace === 'collections' || activeWorkspace === 'binders' || activeWorkspace === 'lists') {
      setWorkspaceSaveShortcutToken((value) => value + 1);
      return;
    }
    setStatus(`No direct save action in ${workspaceLabel(activeWorkspace)}.`);
  }

  async function saveDraftToCsv(nextDraft: CardDraft) {
    const draftToSave = normalizeDraft(nextDraft, project?.cards.find((card) => card.cardId === nextDraft.cardId));
    setSaveState('saving');
    try {
      const saved = await saveCard(draftToSave);
      setSessionDrafts((drafts) => {
        const next = omitDraft(drafts, draftKey(draftToSave.cardId, draftToSave.variantId));
        writeDraftRecovery(Object.values(next));
        return next;
      });
      setProject(normalizeProjectDrafts(saved));
      setSelectedId(draftToSave.cardId);
      setActiveVariantId(draftToSave.variantId);
      setSaveState('saved');
      await refreshLibrary(saved.setCode);
      setStatus(`Saved ${draftToSave.name} / ${draftToSave.variantDisplayName}. Synced ${saved.lastCockatriceSync?.imageCount ?? 0} Cockatrice images.`);
    } catch (error) {
      setSaveState('error');
      setStatus(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async function handleCreateCardDraft(nextDraft: CardDraft) {
    setActiveWorkspace('maker');
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
      kind: request.kind,
      listCategory: request.listCategory,
      defaultOwnershipStatus: request.defaultOwnershipStatus,
      defaultEntryTags: request.defaultEntryTags,
      defaultStarred: request.defaultStarred,
      defaultFlagged: request.defaultFlagged,
      defaultProxy: request.defaultProxy,
      defaultHomebrew: request.defaultHomebrew,
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
          kind: request.kind,
          listCategory: request.listCategory,
          defaultOwnershipStatus: request.defaultOwnershipStatus,
          defaultEntryTags: request.defaultEntryTags,
          defaultStarred: request.defaultStarred,
          defaultFlagged: request.defaultFlagged,
          defaultProxy: request.defaultProxy,
          defaultHomebrew: request.defaultHomebrew,
          source: importPayload.source,
          mode: importPayload.mode,
          content: importPayload.content,
          dryRun: false
        })
      : await createCollection({ ...request, collectionId });
    setCreatedCollectionId(result.collection.metadata.collectionId);
    setCollectionRefreshToken((value) => value + 1);
    setActiveWorkspace(result.collection.metadata.kind === 'list' ? 'lists' : 'binders');
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
      setStatus(`Created ${request.setCode.toUpperCase()} and imported ${formatCount(result.summary.importedCards, 'card')} from ${importPayload.filename}.`);
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
    setStatus(`Creating gallery asset ${request.artId}...`);
    const loaded = await createLibraryAsset(request);
    applyProject(loaded);
    await refreshLibrary(loaded.setCode);
    setActiveWorkspace('library');
    setStatus(`Created gallery asset ${request.artId}.`);
  }

  function resizeLeftPanel(delta: number) {
    setLeftPanelWidth((width) => clamp(width + delta, 170, 460));
  }

  function resizeRightPanel(delta: number) {
    setRightPanelWidth((width) => clamp(width - delta, 220, 620));
  }

  function resizeCommandBar(delta: number) {
    setCommandBarHeight((height) => clamp(height + delta, 54, 118));
  }

  function enterFocusedCardMode() {
    if (isFocusedCardMode) {
      return;
    }
    setIsCardBrowserMode(false);
    setIsDashboardMode(false);
    setFocusedCardModeState({
      showCommandBar,
      showSideRail,
      showLeftPanel,
      showPreviewPanel,
      showRightPanel,
      leftPanelWidth,
      rightPanelWidth
    });
    setActiveWorkspace('maker');
    setFocusedLeftPanelPercent(56);
    setFocusedPanelsFlipped(false);
    setIsFocusedCardMode(true);
    setShowSideRail(false);
    setShowLeftPanel(false);
    setShowPreviewPanel(true);
    setShowRightPanel(true);
    setShowCommandBar(false);
  }

  function exitFocusedCardMode() {
    if (!focusedCardModeState) {
      setIsFocusedCardMode(false);
      return;
    }
    setShowCommandBar(focusedCardModeState.showCommandBar);
    setShowSideRail(focusedCardModeState.showSideRail);
    setShowLeftPanel(focusedCardModeState.showLeftPanel);
    setShowPreviewPanel(focusedCardModeState.showPreviewPanel);
    setShowRightPanel(focusedCardModeState.showRightPanel);
    setLeftPanelWidth(focusedCardModeState.leftPanelWidth);
    setRightPanelWidth(focusedCardModeState.rightPanelWidth);
    setIsFocusedCardMode(false);
    setFocusedCardModeState(null);
    setFocusedPanelsFlipped(false);
  }

  function resizeFocusedSplit(delta: number) {
    const width = workbenchRef.current?.clientWidth;
    if (!width) {
      return;
    }
    const activeWidth = width - 6;
    if (activeWidth <= 0) {
      return;
    }
    setFocusedLeftPanelPercent((value) => clamp(value + ((delta / activeWidth) * 100), 18, 82));
  }

  async function toggleFocusedFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // noop
    }
  }

  function toggleFocusedSplitOrientation() {
    setFocusedPanelsFlipped((value) => !value);
  }

  function enterCardBrowserMode() {
    setIsFocusedCardMode(false);
    setIsDashboardMode(false);
    setFocusedCardModeState(null);
    setFocusedPanelsFlipped(false);
    setActiveWorkspace('maker');
    setIsCardBrowserMode(true);
  }

  function exitCardBrowserMode() {
    setIsCardBrowserMode(false);
  }

  function enterDashboardMode() {
    setIsFocusedCardMode(false);
    setIsCardBrowserMode(false);
    setFocusedCardModeState(null);
    setFocusedPanelsFlipped(false);
    setIsDashboardMode(true);
  }

  function exitDashboardMode() {
    setIsDashboardMode(false);
  }

  function openWorkspace(section: WorkspaceSection) {
    if (isFocusedCardMode) {
      exitFocusedCardMode();
    }
    setIsCardBrowserMode(false);
    setIsDashboardMode(false);
    setFocusedCardModeState(null);
    setFocusedPanelsFlipped(false);
    setActiveWorkspace(section);
  }

  function openCreateCollection(kind: CollectionKind = 'binder', listCategory: CollectionListCategory = 'general') {
    setCollectionCreateDefaults({ kind, listCategory });
    setCreateOverlay('collection');
  }

  const commandPaletteCommands: CommandPaletteCommand[] = [
    {
      id: 'create-card',
      group: 'Create',
      label: 'Create card',
      description: project ? `Create an authored card in ${project.setCode}.` : 'Load or create a set before creating a card.',
      disabled: !project,
      disabledReason: 'Load or create a set before creating a card.',
      run: handleNewCard
    },
    {
      id: 'create-set',
      group: 'Create',
      label: 'Create set',
      description: 'Open the set creation flow.',
      run: () => {
        openWorkspace('sets');
        setCreateOverlay('set');
      }
    },
    {
      id: 'create-project',
      group: 'Create',
      label: 'Create project',
      description: 'Open the project creation flow.',
      run: () => {
        openWorkspace('projects');
        setCreateOverlay('project');
      }
    },
    {
      id: 'create-deck',
      group: 'Create',
      label: 'Create deck',
      description: 'Start a cross-set decklist.',
      run: () => {
        openWorkspace('decks');
        setCreateOverlay('deck');
      }
    },
    {
      id: 'create-collection',
      group: 'Create',
      label: 'Create collection',
      description: 'Start an isolated collection or scanner import.',
      run: () => {
        openWorkspace('collections');
        openCreateCollection('binder');
      }
    },
    {
      id: 'create-gallery-asset',
      group: 'Create',
      label: 'Create gallery asset',
      description: project ? 'Add a local art or reference asset to the active set.' : 'Load a set before creating a gallery asset.',
      disabled: !project,
      disabledReason: 'Load a set before creating a gallery asset.',
      run: () => {
        openWorkspace('library');
        setCreateOverlay('library');
      }
    },
    {
      id: 'open-maker',
      group: 'Navigate',
      label: 'Open Maker',
      description: 'Return to the card authoring workspace.',
      run: () => openWorkspace('maker')
    },
    {
      id: 'open-cards',
      group: 'Navigate',
      label: 'Open Cards',
      description: 'Browse the cards already in this app across authored sets, decks, collections, binders, and lists.',
      run: () => openWorkspace('cards')
    },
    {
      id: 'open-decks',
      group: 'Navigate',
      label: 'Open Decks',
      description: 'Browse and edit decklists.',
      run: () => openWorkspace('decks')
    },
    {
      id: 'open-binders',
      group: 'Navigate',
      label: 'Open Binders',
      description: 'Open binder-style collection groups.',
      run: () => openWorkspace('binders')
    },
    {
      id: 'open-lists',
      group: 'Navigate',
      label: 'Open Lists',
      description: 'Open wish lists, recommendation lists, starred cards, flagged cards, and gift lists.',
      run: () => openWorkspace('lists')
    },
    {
      id: 'open-collections',
      group: 'Navigate',
      label: 'Open Collections',
      description: 'Browse isolated collection rows.',
      run: () => openWorkspace('collections')
    },
    {
      id: 'open-sets',
      group: 'Navigate',
      label: 'Open Sets',
      description: 'Manage set metadata and active set loading.',
      run: () => openWorkspace('sets')
    },
    {
      id: 'open-projects',
      group: 'Navigate',
      label: 'Open Projects',
      description: 'Manage project groupings.',
      run: () => openWorkspace('projects')
    },
    {
      id: 'open-gallery',
      group: 'Navigate',
      label: 'Open Gallery',
      description: 'Manage local gallery assets.',
      run: () => openWorkspace('library')
    },
    {
      id: 'open-references',
      group: 'Navigate',
      label: 'Open References',
      description: 'Review local custom and reference terms.',
      run: () => openWorkspace('reference')
    },
    {
      id: 'open-settings',
      group: 'Navigate',
      label: 'Open Settings',
      description: 'Open editor settings and workspace preferences.',
      run: () => openWorkspace('settings')
    },
    {
      id: 'card-browser',
      group: 'Focused layouts',
      label: 'Open Card Browser',
      description: 'Use the source-aware card browser and compare view.',
      run: enterCardBrowserMode
    },
    {
      id: 'card-dashboard',
      group: 'Focused layouts',
      label: 'Open Card Dashboard',
      description: 'Review card facts and source-aware dashboard views.',
      run: enterDashboardMode
    },
    {
      id: 'focused-card-editor',
      group: 'Focused layouts',
      label: 'Focus Maker',
      description: 'Hide surrounding chrome for a two-pane card editing layout.',
      disabled: activeWorkspace !== 'maker' || !draft,
      disabledReason: 'Select a card in Maker first.',
      run: enterFocusedCardMode
    },
    {
      id: 'save-card',
      group: 'Actions',
      label: 'Save current card',
      description: draft ? `Save ${draft.name} to local CSV.` : 'Select a card before saving.',
      shortcut: '⌘S',
      disabled: !draft || saveState === 'saving',
      disabledReason: saveState === 'saving' ? 'Card save is already in progress.' : 'Select a card before saving.',
      run: () => void handleSave()
    },
    {
      id: 'save-as',
      group: 'Actions',
      label: 'Save as...',
      description: 'Save a card copy, variant, or snapshot.',
      disabled: !draft || saveState === 'saving',
      disabledReason: 'Select a card before using Save as.',
      run: () => setSaveAsOpen(true)
    },
    {
      id: 'undo-card-edit',
      group: 'Actions',
      label: 'Undo card edit',
      description: 'Undo the latest card edit in this session.',
      disabled: !canUndoDraft,
      disabledReason: 'No earlier card edit is available.',
      run: handleUndoDraft
    },
    {
      id: 'redo-card-edit',
      group: 'Actions',
      label: 'Redo card edit',
      description: 'Redo the latest undone card edit in this session.',
      disabled: !canRedoDraft,
      disabledReason: 'No undone card edit is available.',
      run: handleRedoDraft
    },
    {
      id: 'revert-card',
      group: 'Actions',
      label: 'Revert to last saved',
      description: 'Discard unsaved changes on the selected saved card.',
      disabled: !canRevertDraft,
      disabledReason: 'The selected card has no saved-state changes to revert.',
      run: handleRevertDraft
    },
    {
      id: 'import',
      group: 'Transfer',
      label: 'Import...',
      description: 'Open the local import dialog.',
      run: () => setTransferDialog('import')
    },
    {
      id: 'export',
      group: 'Transfer',
      label: 'Export...',
      description: 'Open the local export dialog.',
      run: () => setTransferDialog('export')
    },
    {
      id: 'print',
      group: 'Transfer',
      label: 'Print...',
      description: 'Open print and proof export options.',
      disabled: !draft && !project?.setCode,
      disabledReason: 'Load a card, set, deck, collection, or project before printing.',
      run: () => setPrintDialogOpen(true)
    },
    {
      id: 'expand-preview',
      group: 'Inspect',
      label: 'Open larger preview',
      description: 'Open the active rendered card in the larger preview view.',
      disabled: activeWorkspace !== 'maker' || isCardBrowserMode || !previewForDraft?.imageDataUri,
      disabledReason: 'Renderable card preview is not ready yet.',
      run: () => handlePreviewModeChange('expanded')
    },
    {
      id: 'workspace-health',
      group: 'Inspect',
      label: 'Open Workspace Health',
      description: 'Review source, runtime, renderer, reference, and dirty-work status.',
      run: () => setWorkspaceHealthOpen(true)
    },
    {
      id: 'run-validation',
      group: 'Inspect',
      label: 'Run validation',
      description: 'Validation currently runs through preview, import/export, and CLI flows.',
      disabled: true,
      disabledReason: 'No standalone editor validation command is exposed yet.',
      run: () => undefined
    },
    {
      id: 'help',
      group: 'Help',
      label: 'Editor Help',
      description: 'Open the Homebrew Forge help dialog.',
      run: () => setHelpDialogOpen(true)
    },
    {
      id: 'restart-runtime',
      group: 'Help',
      label: 'Restart local helper',
      description: 'Restart the local launcher when runtime freshness is stale.',
      disabled: !runtimeHealth?.stale || hasUnsavedChanges || restartState === 'restarting',
      disabledReason: hasUnsavedChanges
        ? 'Save or discard unsaved changes before restarting.'
        : runtimeHealth?.stale
          ? 'Restart is already in progress.'
          : 'Runtime is fresh.',
      run: () => void handleRestartApp()
    }
  ];

  return (
    <AppShell>
      <TopCommandBar visible={!isFocusedCardMode && !isDashboardMode}>
        <EditorToolbar
          draft={draft}
          library={library}
          selectedUniverseId={selectedUniverseId}
          defaultProjectId={defaultProjectId}
          activeProjectName={activeUniverse?.name ?? ''}
          activeSetCode={project?.setCode ?? ''}
          theme={editorTheme}
          workMode={workMode}
          previewMode={previewMode}
          previewToolMode={previewToolMode}
          showGuides={showGuides}
          showSafeArea={showSafeArea}
          showCardGrid={showCardGrid}
          zoom={zoom}
          cardListDensity={cardListDensity}
          showCommandBar={showCommandBar}
          showSideRail={showSideRail}
          showCardsRailItem={showCardsRailItem}
          showCollectionsRailItem={showCollectionsRailItem}
          showLeftPanel={showLeftPanel}
          showPreviewPanel={showPreviewPanel}
          showRightPanel={showRightPanel}
          commandBarHeight={commandBarHeight}
          saving={saveState === 'saving'}
          canUndo={canUndoDraft}
          canRedo={canRedoDraft}
          canRevert={canRevertDraft}
          canExpandPreview={activeWorkspace === 'maker' && !isCardBrowserMode && Boolean(previewForDraft?.imageDataUri)}
          canDeleteDraft={selectedIsUnsaved}
          isFocusedCardMode={isFocusedCardMode}
          isCardBrowserMode={isCardBrowserMode}
          isDashboardMode={isDashboardMode}
          onThemeChange={setEditorTheme}
          onWorkModeChange={handleWorkModeChange}
          onEnterFocusedCardMode={enterFocusedCardMode}
          onExitFocusedCardMode={exitFocusedCardMode}
          onEnterCardBrowserMode={enterCardBrowserMode}
          onExitCardBrowserMode={exitCardBrowserMode}
          onEnterDashboardMode={enterDashboardMode}
          onExitDashboardMode={exitDashboardMode}
          onPreviewModeChange={handlePreviewModeChange}
          onPreviewToolModeChange={setPreviewToolMode}
          onShowGuidesChange={setShowGuides}
          onShowSafeAreaChange={setShowSafeArea}
          onShowCardGridChange={setShowCardGrid}
          onZoomChange={setZoom}
          onCardListDensityChange={setCardListDensity}
          onShowCommandBarChange={setShowCommandBar}
          onShowSideRailChange={setShowSideRail}
          onShowCardsRailItemChange={handleShowCardsRailItemChange}
          onShowCollectionsRailItemChange={handleShowCollectionsRailItemChange}
          onShowLeftPanelChange={setShowLeftPanel}
          onShowPreviewPanelChange={setShowPreviewPanel}
          onShowRightPanelChange={setShowRightPanel}
          onCommandBarResize={resizeCommandBar}
          onSave={() => void handleSave()}
          onUndo={handleUndoDraft}
          onRedo={handleRedoDraft}
          onRevert={handleRevertDraft}
          onSaveAsNew={() => setSaveAsOpen(true)}
          onDuplicateAsCard={handleDuplicateAsCard}
          onDuplicateAsVariant={handleDuplicateAsVariant}
          onDeleteDraft={handleDeleteDraft}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenSets={() => openWorkspace('sets')}
          onOpenImport={() => setTransferDialog('import')}
          onOpenExport={() => setTransferDialog('export')}
          onOpenPrint={() => setPrintDialogOpen(true)}
          onOpenHelp={() => setHelpDialogOpen(true)}
          onSelectProject={(universeId) => void handleSelectUniverse(universeId)}
          onSetDefaultProject={handleSetDefaultProject}
          onClearDefaultProject={handleClearDefaultProject}
        />
      </TopCommandBar>
      {!isFocusedCardMode && !isDashboardMode ? (
        <RuntimeStatusBanner health={runtimeHealth} hasUnsavedChanges={hasUnsavedChanges} restartState={restartState} onRestart={() => void handleRestartApp()} />
      ) : null}
      {/* Context strip removed: project/set/mode already live in the toolbar (top-right),
          card count in the Maker list header, and variant/save in the preview header.
          The UI carries this on its own — no need to repeat it in a stacked band. */}
      <WorkspaceFrame
        ref={workbenchRef}
        activeWorkspace={activeWorkspace}
        focused={isFocusedCardMode}
        isCardBrowserMode={isCardBrowserMode}
        isDashboardMode={isDashboardMode}
        showMakerOnboarding={showMakerOnboarding}
        showLeftPanel={effectiveShowLeftPanel}
        showPreviewPanel={effectiveShowPreviewPanel}
        showRightPanel={effectiveShowRightPanel}
        showSideRail={effectiveShowSideRail}
        style={workbenchStyle}
      >
        {effectiveShowSideRail && !isCardBrowserMode && !isDashboardMode ? (
          <SidebarNav
            active={activeWorkspace}
            activeSetCode={project?.setCode}
            cardCount={cardsForList.length}
            showCollections={showCollectionsRailItem}
            visible={effectiveShowSideRail && !isCardBrowserMode && !isDashboardMode}
            visibleSections={visibleRailSections}
            workModeLabel={activeWorkMode.label}
            workModeHint={activeWorkMode.railHint}
            onChange={openWorkspace}
          />
        ) : null}

        {activeWorkspace === 'maker' && !showMakerOnboarding && !isFocusedCardMode && !isCardBrowserMode && !isDashboardMode ? (
          <CardPanelSwitcher active={narrowCardPanel} onChange={setNarrowCardPanel} />
        ) : null}

        {activeWorkspace === 'maker' && effectiveShowLeftPanel && !isFocusedCardMode && !isCardBrowserMode && !isDashboardMode ? (
          <div id="maker-list-panel" className={`context-panel maker-context narrow-card-panel ${narrowCardPanel === 'list' ? 'narrow-active' : 'narrow-inactive'}`}>
            <CardList cards={cardsForList} selectedId={selectedId} dirtyCardIds={dirtyCardIds} density={cardListDensity} onSelect={handleSelectCard} onNew={handleNewCard} onCollapse={() => setShowLeftPanel(false)} />
          </div>
        ) : null}
        {activeWorkspace === 'maker' && effectiveShowLeftPanel && !isFocusedCardMode && !isCardBrowserMode && !isDashboardMode ? <PanelResizeHandle label="Resize maker card list panel" onResize={resizeLeftPanel} /> : null}
        {activeWorkspace === 'maker' && !showMakerOnboarding && !effectiveShowLeftPanel && !isFocusedCardMode && !isCardBrowserMode && !isDashboardMode ? (
          <button type="button" className="collapsed-panel-strip left" onClick={() => setShowLeftPanel(true)} title="Show Maker list panel" aria-label="Show Maker list panel">
            <Icon name="collapseRight" />
          </button>
        ) : null}

        {isDashboardMode ? (
          <DashboardView
            library={library}
            project={project}
            cardsForList={cardsForList}
            onOpenCard={handleOpenCard}
            onExit={exitDashboardMode}
            onStatus={setStatus}
          />
        ) : isCardBrowserMode ? (
          <CardBrowserView
            surface="focused"
            library={library}
            project={project}
            cardsForList={cardsForList}
            draft={draft}
            preview={previewForDraft}
            previewLoading={previewIsLoading}
            previewUpdating={previewIsUpdating}
            hasUnsavedChanges={selectedHasUnsavedChanges}
            selectedFrame={selectedFrame}
            referenceCatalog={referenceCatalog}
            inspectorTab={inspectorTab}
            onOpenCard={handleOpenCard}
            onDraftChange={handleDraftChange}
            onVariantChange={handleSelectVariant}
            onInspectorTabChange={setInspectorTab}
            onSaveVariant={(nextDraft) => void saveDraftToCsv(nextDraft)}
            onExit={exitCardBrowserMode}
            onStatus={setStatus}
          />
        ) : activeWorkspace === 'cards' ? (
          <CardBrowserView
            surface="workspace"
            library={library}
            project={project}
            cardsForList={cardsForList}
            draft={draft}
            preview={previewForDraft}
            previewLoading={previewIsLoading}
            previewUpdating={previewIsUpdating}
            hasUnsavedChanges={selectedHasUnsavedChanges}
            selectedFrame={selectedFrame}
            referenceCatalog={referenceCatalog}
            inspectorTab={inspectorTab}
            onOpenCard={handleOpenCard}
            onDraftChange={handleDraftChange}
            onVariantChange={handleSelectVariant}
            onInspectorTabChange={setInspectorTab}
            onSaveVariant={(nextDraft) => void saveDraftToCsv(nextDraft)}
            onStatus={setStatus}
          />
        ) : activeWorkspace === 'maker' ? (
          isFocusedCardMode ? (
            !draft ? (
              <FocusedCardSelector cards={cardsForList} onSelect={handleSelectCard} onNew={handleNewCard} onExit={exitFocusedCardMode} />
            ) : (
              <>
              <div className="focused-workbench-toolbar">
                <button type="button" className="focused-workbench-control" onClick={toggleFocusedSplitOrientation} title="Swap preview and inspector" aria-label="Swap preview and inspector">
                  Swap
                </button>
                <button type="button" className="focused-workbench-control" onClick={() => void toggleFocusedFullscreen()} title={isFullscreen ? 'Exit full screen' : 'Enter full screen'} aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}>
                  {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>
                <button type="button" className="focused-workbench-control" onClick={exitFocusedCardMode} title="Exit focused editor layout" aria-label="Exit focused editor layout">
                  <Icon name="close" />
                  <span>Exit</span>
                </button>
              </div>
              {focusedPanelsFlipped ? (
                <>
                  <Inspector
                    project={project}
                    draft={draft}
                    preview={previewForDraft}
                    referenceCatalog={referenceCatalog}
                    activeTab={inspectorTab}
                    onTabChange={setInspectorTab}
                    onChange={handleDraftChange}
                    onVariantChange={handleSelectVariant}
                    onSaveVariant={(nextDraft) => void saveDraftToCsv(nextDraft)}
                  />
                  <PanelResizeHandle label="Resize focused Maker layout" onResize={resizeFocusedSplit} />
                  <section className="preview-column focused-preview-column">
                    <CardPreview
                      draft={draft}
                      preview={previewForDraft}
                      previewLoading={previewIsLoading}
                      previewUpdating={previewIsUpdating}
                      hasUnsavedChanges={selectedHasUnsavedChanges}
                      selectedFrame={selectedFrame}
                      showGuides={showGuides || previewMode === 'safe-area'}
                      showSafeArea={showSafeArea}
                      showCardGrid={showCardGrid}
                      zoom={zoom}
                      previewToolMode={previewToolMode}
                      hideHeader
                      expandRequestToken={previewExpandToken}
                      cards={cardsForList}
                      onChange={handleDraftChange}
                      onVariantChange={handleSelectVariant}
                      onCardSelect={handleSelectCard}
                    />
                  </section>
                </>
              ) : (
                <>
                  <section className="preview-column focused-preview-column">
                    <CardPreview
                      draft={draft}
                      preview={previewForDraft}
                      previewLoading={previewIsLoading}
                      previewUpdating={previewIsUpdating}
                      hasUnsavedChanges={selectedHasUnsavedChanges}
                      selectedFrame={selectedFrame}
                      showGuides={showGuides || previewMode === 'safe-area'}
                      showSafeArea={showSafeArea}
                      showCardGrid={showCardGrid}
                      zoom={zoom}
                      previewToolMode={previewToolMode}
                      hideHeader
                      expandRequestToken={previewExpandToken}
                      cards={cardsForList}
                      onChange={handleDraftChange}
                      onVariantChange={handleSelectVariant}
                      onCardSelect={handleSelectCard}
                    />
                  </section>
                  <PanelResizeHandle label="Resize focused Maker layout" onResize={resizeFocusedSplit} />
                  <Inspector
                    project={project}
                    draft={draft}
                    preview={previewForDraft}
                    referenceCatalog={referenceCatalog}
                    activeTab={inspectorTab}
                    onTabChange={setInspectorTab}
                    onChange={handleDraftChange}
                    onVariantChange={handleSelectVariant}
                    onSaveVariant={(nextDraft) => void saveDraftToCsv(nextDraft)}
                  />
                </>
              )}
            </>
            )
          ) : (
            <>
              {effectiveShowPreviewPanel ? (
                <section id="maker-preview-panel" className={`preview-column ${showMakerOnboarding ? 'onboarding-preview-column' : 'no-preview-intro'} narrow-card-panel ${narrowCardPanel === 'preview' ? 'narrow-active' : 'narrow-inactive'}`}>
                  {showMakerOnboarding ? (
                    <div className="maker-onboarding-stage">
                      <FirstRunOrientation
                        activeProjectName={activeUniverse?.name ?? ''}
                        activeSetCode={project?.setCode ?? ''}
                        cardCount={authoredCardCount}
                        showDismiss
                        onDismiss={dismissFirstRunOrientation}
                        onCreateCard={() => {
                          dismissFirstRunOrientation();
                          handleNewCard();
                        }}
                        onCreateSet={() => {
                          dismissFirstRunOrientation();
                          setActiveWorkspace('sets');
                          setCreateOverlay('set');
                        }}
                        onImport={() => {
                          dismissFirstRunOrientation();
                          setTransferDialog('import');
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <CardTabs cards={cardsForList} openCardIds={openCardIds} selectedId={selectedId} dirtyCardIds={dirtyCardIds} onSelect={handleSelectCard} onClose={handleCloseTab} onNew={handleNewCard} />
                      <CardPreview
                        draft={draft}
                        preview={previewForDraft}
                        previewLoading={previewIsLoading}
                        previewUpdating={previewIsUpdating}
                        hasUnsavedChanges={selectedHasUnsavedChanges}
                        selectedFrame={selectedFrame}
                        showGuides={showGuides || previewMode === 'safe-area'}
                        showSafeArea={showSafeArea}
                        showCardGrid={showCardGrid}
                        zoom={zoom}
                        previewToolMode={previewToolMode}
                        expandRequestToken={previewExpandToken}
                        cards={cardsForList}
                        onChange={handleDraftChange}
                        onVariantChange={handleSelectVariant}
                        onCardSelect={handleSelectCard}
                      />
                    </>
                  )}
                </section>
              ) : null}
              {!showMakerOnboarding && effectiveShowRightPanel ? <PanelResizeHandle label="Resize Maker inspector panel" onResize={resizeRightPanel} /> : null}
              {!showMakerOnboarding && effectiveShowRightPanel ? (
                  <Inspector
                    project={project}
                    draft={draft}
                    preview={previewForDraft}
                    referenceCatalog={referenceCatalog}
                    panelId="maker-inspector-panel"
                    panelClassName={`narrow-card-panel ${narrowCardPanel === 'inspector' ? 'narrow-active' : 'narrow-inactive'}`}
                    activeTab={inspectorTab}
                    onTabChange={setInspectorTab}
                    onChange={handleDraftChange}
                  onVariantChange={handleSelectVariant}
                  onSaveVariant={(nextDraft) => void saveDraftToCsv(nextDraft)}
                  onCollapse={() => setShowRightPanel(false)}
                />
              ) : null}
              {!showMakerOnboarding && !effectiveShowRightPanel ? (
                <button type="button" className="collapsed-panel-strip right" onClick={() => setShowRightPanel(true)} title="Show inspector panel" aria-label="Show inspector panel">
                  <Icon name="collapseLeft" />
                </button>
              ) : null}
            </>
          )
        ) : (
          <WorkspaceView
            section={activeWorkspace}
            workMode={workMode}
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
            onCreateCollection={openCreateCollection}
            onCreateSetOverlay={() => setCreateOverlay('set')}
            onCreateProject={() => setCreateOverlay('project')}
            onCreateLibraryAsset={() => setCreateOverlay('library')}
            onLibraryUpdated={setLibrary}
            onProjectLoaded={applyProject}
            onReferenceCatalogUpdated={setReferenceCatalog}
            onUniverseSelect={(universeId) => void handleSelectUniverse(universeId)}
            onLoadSet={(setCode) => void loadSet(setCode)}
            onOpenCard={(setCode, cardId, variantId) => void handleOpenCard(setCode, cardId, variantId)}
            onOpenSet={(setCode) => void handleOpenSet(setCode)}
            onOpenCardBrowser={() => setIsCardBrowserMode(true)}
            onOpenDashboard={() => setIsDashboardMode(true)}
            onStatus={setStatus}
            saveShortcutToken={workspaceSaveShortcutToken}
            deckRefreshToken={deckRefreshToken}
            activeDeckId={createdDeckId}
            collectionRefreshToken={collectionRefreshToken}
            activeCollectionId={createdCollectionId}
            showCardsRailItem={showCardsRailItem}
            onShowCardsRailItemChange={handleShowCardsRailItemChange}
            showCollectionsRailItem={showCollectionsRailItem}
            onShowCollectionsRailItemChange={handleShowCollectionsRailItemChange}
          />
        )}
      </WorkspaceFrame>
      {!isFocusedCardMode && !isDashboardMode ? (
        <WorkspaceStatusBar
          activeWorkspace={activeWorkspace}
          cardCount={cardsForList.length}
          hasUnsavedChanges={hasUnsavedChanges}
          health={runtimeHealth}
          onOpenHealthPanel={() => setWorkspaceHealthOpen(true)}
          previewWarningCount={previewForDraft?.warnings.length ?? 0}
          projectName={activeUniverse?.name ?? ''}
          setCode={project?.setCode ?? ''}
          status={status}
          variantCount={project?.drafts.length ?? 0}
        />
      ) : null}
      <CommandPalette commands={commandPaletteCommands} open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      {workspaceHealthOpen ? (
        <WorkspaceHealthPanel
          activeWorkspace={activeWorkspace}
          dirtyDraftCount={dirtyDrafts.length}
          health={runtimeHealth}
          library={library}
          preview={previewForDraft}
          project={project}
          referenceLoaded={Boolean(referenceCatalog)}
          restartState={restartState}
          status={status}
          onClose={() => setWorkspaceHealthOpen(false)}
        />
      ) : null}
      {transferDialog ? (
        <TransferDialog
          mode={transferDialog}
          project={project}
          activeWorkspace={activeWorkspace}
          draft={draft}
          preview={preview}
          onProjectLoaded={(loaded) => {
            applyProject(loaded);
            void refreshLibrary(loaded.setCode);
          }}
          onStatus={setStatus}
          onOpenPrint={() => {
            setTransferDialog(null);
            setPrintDialogOpen(true);
          }}
          onClose={() => setTransferDialog(null)}
        />
      ) : null}
      {printDialogOpen ? (
        <PrintDialog
          project={project}
          library={library}
          selectedUniverseId={selectedUniverseId}
          draft={draft}
          preview={previewForDraft}
          onStatus={setStatus}
          onClose={() => setPrintDialogOpen(false)}
        />
      ) : null}
      {helpDialogOpen ? <HelpDialog onStatus={setStatus} onClose={() => setHelpDialogOpen(false)} /> : null}
      {saveAsOpen && draft ? (
        <SaveAsOverlay
          draft={draft}
          preview={previewForDraft}
          onSaveAsCard={(request) => void handleSaveAsNewCard(request)}
          onSaveAsVariant={(request) => void handleSaveAsVariant(request)}
          onClose={() => {
            setSaveAsOpen(false);
            setPendingSaveAsCloseCardId('');
          }}
        />
      ) : null}
      {pendingTabCloseDraft ? (
        <UnsavedTabCloseDialog
          draft={pendingTabCloseDraft}
          saving={saveState === 'saving'}
          onSave={() => void saveCardDraftAndClose(pendingTabCloseDraft.cardId)}
          onSaveAsVariant={() => saveCardDraftAsVariantFromClose(pendingTabCloseDraft.cardId)}
          onDiscard={() => discardCardDraftsAndClose(pendingTabCloseDraft.cardId)}
          onCancel={() => setPendingTabCloseCardId('')}
        />
      ) : null}
      {pendingDeleteDraftId && draft && pendingDeleteDraftId === draft.cardId ? (
        <DeleteUnsavedDraftDialog draft={draft} onDelete={confirmDeleteDraft} onCancel={() => setPendingDeleteDraftId('')} />
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
          initialKind={collectionCreateDefaults.kind}
          initialListCategory={collectionCreateDefaults.listCategory}
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
    </AppShell>
  );
}

function CardPanelSwitcher({ active, onChange }: { active: NarrowCardPanel; onChange: (panel: NarrowCardPanel) => void }) {
  const panels: Array<{ id: NarrowCardPanel; label: string; panelId: string }> = [
    { id: 'list', label: 'List', panelId: 'maker-list-panel' },
    { id: 'preview', label: 'Preview', panelId: 'maker-preview-panel' },
    { id: 'inspector', label: 'Inspector', panelId: 'maker-inspector-panel' }
  ];
  return (
    <div className="card-panel-switcher" role="tablist" aria-label="Maker workspace panels">
      {panels.map((panel) => (
        <button
          key={panel.id}
          type="button"
          role="tab"
          aria-selected={active === panel.id}
          aria-controls={panel.panelId}
          tabIndex={active === panel.id ? 0 : -1}
          className={active === panel.id ? 'active' : ''}
          onClick={() => onChange(panel.id)}
        >
          {panel.label}
        </button>
      ))}
    </div>
  );
}

async function reloadWhenRuntimeReturns() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    try {
      const health = await fetchHealth();
      if (!health.stale) {
        window.location.reload();
        return;
      }
    } catch {
      // The helper is expected to be briefly unreachable while launchd swaps processes.
    }
  }
  window.location.reload();
}

function addUnique(values: string[], next: string): string[] {
  return values.includes(next) ? values : [...values, next];
}

function draftKey(cardId: string, variantId: string): string {
  return `${cardId}::${variantId || 'primary'}`;
}

function previewKeyForDraft(draft: CardDraft): string {
  return draftKey(draft.cardId, draft.variantId);
}

function savedDraftFor(project: EditorProject, draft: CardDraft): CardDraft | undefined {
  return project.drafts.find((candidate) => candidate.cardId === draft.cardId && candidate.variantId === draft.variantId);
}

function cloneDraft(draft: CardDraft): CardDraft {
  return JSON.parse(JSON.stringify(draft)) as CardDraft;
}

function draftsAreEqual(left: CardDraft, right: CardDraft): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function omitDraft(drafts: Record<string, CardDraft>, key: string): Record<string, CardDraft> {
  const next = { ...drafts };
  delete next[key];
  return next;
}

function omitDraftsForCard(drafts: Record<string, CardDraft>, cardId: string): Record<string, CardDraft> {
  return Object.fromEntries(Object.entries(drafts).filter(([, draft]) => draft.cardId !== cardId));
}

function pushDraftUndo(history: DraftHistoryState, key: string, previous: CardDraft): DraftHistoryState {
  if (!key) {
    return history;
  }
  const current = history[key] ?? { undo: [], redo: [] };
  return {
    ...history,
    [key]: {
      undo: [...current.undo, cloneDraft(previous)].slice(-MAX_DRAFT_HISTORY),
      redo: []
    }
  };
}

function moveDraftHistory(history: DraftHistoryState, key: string, direction: 'undo' | 'redo', currentDraft: CardDraft): DraftHistoryState {
  const current = history[key];
  if (!current) {
    return history;
  }
  const source = direction === 'undo' ? current.undo : current.redo;
  const target = direction === 'undo' ? current.redo : current.undo;
  if (!source.length) {
    return history;
  }
  const nextSource = source.slice(0, -1);
  const nextTarget = [...target, cloneDraft(currentDraft)].slice(-MAX_DRAFT_HISTORY);
  return {
    ...history,
    [key]: direction === 'undo'
      ? { undo: nextSource, redo: nextTarget }
      : { undo: nextTarget, redo: nextSource }
  };
}

function omitDraftHistory(history: DraftHistoryState, key: string): DraftHistoryState {
  if (!history[key]) {
    return history;
  }
  const next = { ...history };
  delete next[key];
  return next;
}

function omitDraftHistoryForCard(history: DraftHistoryState, cardId: string): DraftHistoryState {
  const prefix = `${cardId}::`;
  return Object.fromEntries(Object.entries(history).filter(([key]) => !key.startsWith(prefix)));
}

function dirtyDraftForCard(cardId: string, dirtyDrafts: CardDraft[], activeDraft: CardDraft | null): CardDraft | null {
  if (activeDraft?.cardId === cardId && dirtyDrafts.some((candidate) => draftKey(candidate.cardId, candidate.variantId) === draftKey(activeDraft.cardId, activeDraft.variantId))) {
    return activeDraft;
  }
  return dirtyDrafts.find((candidate) => candidate.cardId === cardId) ?? null;
}

function uniqueByCardId(drafts: CardDraft[]): CardDraft[] {
  const seen = new Set<string>();
  const result: CardDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.cardId)) {
      continue;
    }
    seen.add(draft.cardId);
    result.push(draft);
  }
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return width;
}

interface MakerWorkbenchLayoutInput {
  collapsedLeft: boolean;
  collapsedRight: boolean;
  leftPanelWidth: number;
  previewVisible: boolean;
  rightPanelWidth: number;
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showSideRail: boolean;
  viewportWidth: number;
}

interface MakerWorkbenchLayout {
  leftWidth: number;
  previewMinWidth: number;
  rightWidth: number;
}

function makerWorkbenchLayout(input: MakerWorkbenchLayoutInput): MakerWorkbenchLayout {
  const compact = input.viewportWidth < 900;
  const laptop = input.viewportWidth < 1180;
  const leftMin = compact ? 150 : laptop ? 190 : 220;
  const rightMin = compact ? 180 : laptop ? 240 : 300;
  let leftWidth = clamp(input.leftPanelWidth, leftMin, laptop ? 320 : 460);
  let rightWidth = clamp(input.rightPanelWidth, rightMin, laptop ? 360 : 620);
  let previewMinWidth = compact ? 170 : laptop ? 260 : 320;

  const railWidth = input.showSideRail ? 64 : 0;
  const leftCollapsedWidth = input.collapsedLeft ? 36 : 0;
  const rightCollapsedWidth = input.collapsedRight ? 36 : 0;
  const handleWidth = (input.showLeftPanel ? 6 : 0) + (input.showRightPanel ? 6 : 0);
  const availableWidth = Math.max(320, input.viewportWidth);

  let requiredWidth =
    railWidth +
    leftCollapsedWidth +
    rightCollapsedWidth +
    handleWidth +
    (input.showLeftPanel ? leftWidth : 0) +
    (input.previewVisible ? previewMinWidth : 0) +
    (input.showRightPanel ? rightWidth : 0);

  let overflow = requiredWidth - availableWidth;
  if (overflow > 0 && input.showRightPanel) {
    const reduction = Math.min(overflow, rightWidth - rightMin);
    rightWidth -= reduction;
    overflow -= reduction;
  }
  if (overflow > 0 && input.showLeftPanel) {
    const reduction = Math.min(overflow, leftWidth - leftMin);
    leftWidth -= reduction;
    overflow -= reduction;
  }
  if (overflow > 0 && input.previewVisible) {
    const previewFloor = compact ? 140 : 220;
    const reduction = Math.min(overflow, previewMinWidth - previewFloor);
    previewMinWidth -= reduction;
    overflow -= reduction;
  }

  if (overflow > 0) {
    requiredWidth -= overflow;
  }

  return { leftWidth, previewMinWidth, rightWidth };
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
    notes: '',
    variantId: `${cardId}-V1`,
    variantDisplayName: 'Variant 1',
    variantKind: 'mechanics_test',
    variantStatus: 'active',
    variantIsPrimary: true,
    variantExportPolicy: 'default',
    variantTags: [],
    variantNotes: '',
    variantCreatedAt: undefined,
    variantUpdatedAt: undefined,
    variantSummaries: []
  };
}

function createDraftCopy(project: EditorProject, source: CardDraft, cards: CardSummary[], request?: SaveAsCardRequest): CardDraft {
  const collectorNumber = nextCollectorNumber(cards);
  const cardId = `${project.setCode}-${collectorNumber}`;
  return {
    ...source,
    cardId,
    collectorNumber,
    setCode: project.setCode,
    setName: project.setName,
    setTotal: String(Math.max(cards.length + 1, 1)),
    name: request?.name.trim() || `${source.name} Copy`,
    artId: source.artId ? `${cardId}-ART` : '',
    variantId: `${cardId}-V1`,
    variantDisplayName: request?.variantDisplayName.trim() || 'Variant 1',
    variantKind: request?.variantKind ?? 'mechanics_test',
    variantStatus: request?.variantStatus ?? 'active',
    variantIsPrimary: true,
    variantExportPolicy: request?.variantExportPolicy ?? 'default',
    variantTags: request?.variantTags ?? [],
    variantNotes: request?.variantNotes ?? '',
    variantCreatedAt: undefined,
    variantUpdatedAt: undefined,
    variantSummaries: [],
    status: request?.status ?? source.status ?? source.sourceCard?.status ?? 'draft',
    tags: request?.tags ?? [...(source.tags ?? source.sourceCard?.tags ?? [])],
    notes: request?.notes ?? source.notes ?? source.sourceCard?.notes ?? '',
    sourceCard: undefined,
    sourceFace: undefined
  };
}

function createVariantCopy(source: CardDraft, request: SaveAsVariantRequest): CardDraft {
  const variantId = nextVariantId(source);
  return {
    ...source,
    variantId,
    variantDisplayName: request.displayName.trim() || nextVariantName(source),
    variantKind: request.kind,
    variantStatus: request.status,
    variantIsPrimary: request.makePrimary,
    variantExportPolicy: request.exportPolicy,
    variantTags: request.tags,
    variantNotes: request.notes,
    variantCreatedAt: undefined,
    variantUpdatedAt: undefined,
    sourceFace: undefined
  };
}

function nextVariantId(source: CardDraft): string {
  const existing = (source.variantSummaries ?? []).map((variant) => variant.variantId);
  let index = existing.length + 1;
  let candidate = `${source.cardId}-V${index}`;
  while (existing.includes(candidate)) {
    index += 1;
    candidate = `${source.cardId}-V${index}`;
  }
  return candidate;
}

function nextVariantName(source: CardDraft): string {
  return `Variant ${(source.variantSummaries ?? []).length + 1}`;
}

function normalizeProjectDrafts(project: EditorProject): EditorProject {
  const variantSummariesByCard = new Map<string, CardSummary['variants']>();
  for (const draft of project.drafts) {
    variantSummariesByCard.set(draft.cardId, [
      ...(variantSummariesByCard.get(draft.cardId) ?? []),
      variantSummaryFromDraft(draft)
    ]);
  }
  const cards = project.cards.map((card) => ({
    ...card,
    variants: card.variants ?? variantSummariesByCard.get(card.cardId) ?? [],
    variantCount: card.variantCount ?? card.variants?.length ?? variantSummariesByCard.get(card.cardId)?.length ?? 0
  }));
  const summaries = new Map(cards.map((card) => [card.cardId, card]));
  return {
    ...project,
    cards,
    drafts: project.drafts.map((draft) => normalizeDraft(draft, summaries.get(draft.cardId)))
  };
}

function normalizeDraft(draft: CardDraft, summary?: CardSummary): CardDraft {
  const tags = draft.tags ?? draft.sourceCard?.tags ?? summary?.tags ?? [];
  const summaryVariants = summary?.variants ?? [];
  const draftVariantSummaries = draft.variantSummaries ?? [];
  const variantSummary = summaryVariants.find((variant) => variant.variantId === draft.variantId);
  return {
    ...draft,
    status: draft.status ?? draft.sourceCard?.status ?? summary?.status ?? 'draft',
    tags: [...tags],
    notes: draft.notes ?? draft.sourceCard?.notes ?? summary?.notes ?? '',
    variantId: draft.variantId || summary?.primaryVariantId || `${draft.cardId}-V1`,
    variantDisplayName: draft.variantDisplayName || variantSummary?.displayName || 'Variant 1',
    variantKind: draft.variantKind || variantSummary?.kind || 'mechanics_test',
    variantStatus: draft.variantStatus || variantSummary?.status || 'active',
    variantIsPrimary: draft.variantIsPrimary ?? variantSummary?.isPrimary ?? true,
    variantExportPolicy: draft.variantExportPolicy || variantSummary?.exportPolicy || 'default',
    variantTags: [...(draft.variantTags ?? variantSummary?.tags ?? [])],
    variantNotes: draft.variantNotes ?? variantSummary?.notes ?? '',
    variantSummaries: draftVariantSummaries.length ? draftVariantSummaries : summaryVariants
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

function FocusedCardSelector({
  cards,
  onSelect,
  onNew,
  onExit
}: {
  cards: CardSummary[];
  onSelect: (cardId: string) => void;
  onNew: () => void;
  onExit: () => void;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches = cards.filter((card) => !needle || `${card.name} ${card.typeLine} ${card.collectorNumber} ${card.tags.join(' ')}`.toLowerCase().includes(needle));
  return (
    <section className="focused-card-selector" aria-label="Choose card for focused layout">
      <div className="focused-card-selector-header">
        <div>
          <h2>Choose a Card</h2>
          <p>Focused layouts can open from any workspace. Select a card to continue in Maker.</p>
        </div>
        <button type="button" className="icon-button" onClick={onExit} title="Exit focused layout" aria-label="Exit focused layout">
          <Icon name="close" />
        </button>
      </div>
      <label className="search-field">
        <Icon name="search" />
        <input value={query} placeholder="Search cards..." onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="focused-card-selector-list" role="listbox" aria-label="Cards">
        {matches.slice(0, 100).map((card) => (
          <button key={card.cardId} type="button" role="option" className="entity-row clickable" onClick={() => onSelect(card.cardId)}>
            <Icon name="cards" />
            <span>
              <strong>{card.name}</strong>
              <small>{card.collectorNumber} - {card.typeLine || 'No type line'}</small>
            </span>
          </button>
        ))}
        {!matches.length ? (
          <div className="preview-empty compact-empty">
            <strong>No cards match</strong>
            <span>Clear search or create a new card.</span>
          </div>
        ) : null}
      </div>
      <div className="focused-card-selector-actions">
        <button type="button" className="primary-button" onClick={onNew}>Create Card</button>
        <button type="button" className="secondary-button" onClick={onExit}>Exit</button>
      </div>
    </section>
  );
}

function summaryFromDraft(draft: CardDraft, existing?: CardSummary): CardSummary {
  const frame = inferFrame(draft);
  const tags = draft.tags ?? draft.sourceCard?.tags ?? [];
  const status = draft.status ?? draft.sourceCard?.status ?? 'draft';
  const currentVariant = variantSummaryFromDraft(draft);
  const variants = upsertVariantSummary(existing?.variants ?? draft.variantSummaries ?? [], currentVariant);
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
    needsReview: status === 'review' || status === 'idea' || tags.some((tag) => tag === 'needs_review' || tag.startsWith('unsupported_layout:')),
    primaryVariantId: variants.find((variant) => variant.isPrimary)?.variantId ?? draft.variantId,
    activeVariantId: draft.variantId,
    variantCount: variants.length,
    variants
  };
}

function variantSummaryFromDraft(draft: CardDraft): CardSummary['variants'][number] {
  return {
    variantId: draft.variantId,
    cardId: draft.cardId,
    displayName: draft.variantDisplayName,
    kind: draft.variantKind,
    status: draft.variantStatus,
    isPrimary: draft.variantIsPrimary,
    exportPolicy: draft.variantExportPolicy,
    tags: draft.variantTags,
    notes: draft.variantNotes,
    searchText: [draft.variantDisplayName, draft.variantKind, draft.variantStatus, draft.variantExportPolicy, draft.variantTags.join(' '), draft.variantNotes, draft.name, draft.typeLine, draft.oracleText, draft.flavorText].join(' ')
  };
}

function upsertVariantSummary(variants: CardSummary['variants'], next: CardSummary['variants'][number]): CardSummary['variants'] {
  const normalized = next.isPrimary ? variants.map((variant) => ({ ...variant, isPrimary: false })) : variants;
  if (normalized.some((variant) => variant.variantId === next.variantId)) {
    return normalized.map((variant) => (variant.variantId === next.variantId ? next : variant));
  }
  return [...normalized, next];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'collection';
}

function workspaceLabel(section: WorkspaceSection): string {
  if (section === 'maker') {
    return 'Maker';
  }
  if (section === 'cards') {
    return 'Cards';
  }
  if (section === 'decks') {
    return 'Decks';
  }
  if (section === 'binders') {
    return 'Binders';
  }
  if (section === 'lists') {
    return 'Lists';
  }
  if (section === 'collections') {
    return 'Collections';
  }
  if (section === 'sets') {
    return 'Sets';
  }
  if (section === 'projects') {
    return 'Projects';
  }
  if (section === 'library') {
    return 'Gallery';
  }
  if (section === 'reference') {
    return 'References';
  }
  return 'Settings';
}
