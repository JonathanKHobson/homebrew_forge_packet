import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type SyntheticEvent } from 'react';
import type { CardDraft, LibraryState } from '../domain/editorTypes.js';
import type { CardListDensity, EditorTheme, PreviewMode, PreviewToolMode } from '../domain/editorUiTypes.js';
import { getWorkMode, WORK_MODE_DEFINITIONS, type WorkModeId } from '../domain/workModes.js';
import { Icon, type IconName } from './Icon.js';
import { PanelResizeHandle } from './PanelResizeHandle.js';
import { WorkModeChip } from './WorkModeChip.js';

const MENU_CLOSE_DELAY_MS = 650;
const MENU_IDS = ['file', 'edit', 'view', 'tools', 'help'] as const;
const THEME_OPTIONS: Array<{ id: EditorTheme; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'parchment', label: 'Parchment' }
];
const PREVIEW_TOOL_OPTIONS: Array<{ id: PreviewToolMode; label: string; icon: IconName; ariaLabel: string; tooltip: string }> = [
  { id: 'preview', label: 'Zoom', icon: 'zoom', ariaLabel: 'Zoom tool', tooltip: 'Click the card to open a larger preview' },
  { id: 'art', label: 'Artwork', icon: 'assets', ariaLabel: 'Artwork tool', tooltip: 'Move and crop card artwork' },
  { id: 'text', label: 'Text', icon: 'edit', ariaLabel: 'Text tool', tooltip: 'Edit card text directly on the preview' },
  { id: 'layout', label: 'Layout', icon: 'guide', ariaLabel: 'Layout tool', tooltip: 'Select text zones and adjust rules padding' }
];
type MenuId = (typeof MENU_IDS)[number];

interface EditorToolbarProps {
  draft: CardDraft | null;
  library: LibraryState | null;
  selectedUniverseId: string;
  defaultProjectId: string;
  activeProjectName: string;
  activeSetCode: string;
  theme: EditorTheme;
  workMode: WorkModeId;
  previewMode: PreviewMode;
  previewToolMode: PreviewToolMode;
  showGuides: boolean;
  showSafeArea: boolean;
  showCardGrid: boolean;
  zoom: number;
  cardListDensity: CardListDensity;
  showCommandBar: boolean;
  showSideRail: boolean;
  showCardsRailItem: boolean;
  showCollectionsRailItem: boolean;
  showLeftPanel: boolean;
  showPreviewPanel: boolean;
  showRightPanel: boolean;
  commandBarHeight: number;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canRevert: boolean;
  canExpandPreview: boolean;
  canDeleteDraft: boolean;
  isFocusedCardMode: boolean;
  isCardBrowserMode: boolean;
  isDashboardMode: boolean;
  canEnterFocusedCardMode: boolean;
  onThemeChange: (theme: EditorTheme) => void;
  onWorkModeChange: (mode: WorkModeId) => void;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onPreviewToolModeChange: (mode: PreviewToolMode) => void;
  onShowGuidesChange: (value: boolean) => void;
  onShowSafeAreaChange: (value: boolean) => void;
  onShowCardGridChange: (value: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onCardListDensityChange: (density: CardListDensity) => void;
  onShowCommandBarChange: (value: boolean) => void;
  onShowSideRailChange: (value: boolean) => void;
  onShowCardsRailItemChange: (value: boolean) => void;
  onShowCollectionsRailItemChange: (value: boolean) => void;
  onShowLeftPanelChange: (value: boolean) => void;
  onShowPreviewPanelChange: (value: boolean) => void;
  onShowRightPanelChange: (value: boolean) => void;
  onCommandBarResize: (delta: number) => void;
  onEnterFocusedCardMode: () => void;
  onExitFocusedCardMode: () => void;
  onEnterCardBrowserMode: () => void;
  onExitCardBrowserMode: () => void;
  onEnterDashboardMode: () => void;
  onExitDashboardMode: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRevert: () => void;
  onSaveAsNew: () => void;
  onDuplicateAsCard: () => void;
  onDuplicateAsVariant: () => void;
  onDeleteDraft: () => void;
  onOpenCommandPalette: () => void;
  onOpenSets: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenPrint: () => void;
  onOpenHelp: () => void;
  onSelectProject: (universeId: string) => void;
  onSetDefaultProject: (universeId: string) => void;
  onClearDefaultProject: () => void;
}

export function EditorToolbar({
  draft,
  library,
  selectedUniverseId,
  defaultProjectId,
  activeProjectName,
  activeSetCode,
  theme,
  workMode,
  previewMode,
  previewToolMode,
  showGuides,
  showSafeArea,
  showCardGrid,
  zoom,
  cardListDensity,
  showCommandBar,
  showSideRail,
  showCardsRailItem,
  showCollectionsRailItem,
  showLeftPanel,
  showPreviewPanel,
  showRightPanel,
  commandBarHeight,
  saving,
  canUndo,
  canRedo,
  canRevert,
  canExpandPreview,
  canDeleteDraft,
  isFocusedCardMode,
  isCardBrowserMode,
  isDashboardMode,
  canEnterFocusedCardMode,
  onThemeChange,
  onWorkModeChange,
  onPreviewModeChange,
  onPreviewToolModeChange,
  onShowGuidesChange,
  onShowSafeAreaChange,
  onShowCardGridChange,
  onZoomChange,
  onCardListDensityChange,
  onShowCommandBarChange,
  onShowSideRailChange,
  onShowCardsRailItemChange,
  onShowCollectionsRailItemChange,
  onShowLeftPanelChange,
  onShowPreviewPanelChange,
  onShowRightPanelChange,
  onCommandBarResize,
  onEnterFocusedCardMode,
  onExitFocusedCardMode,
  onEnterCardBrowserMode,
  onExitCardBrowserMode,
  onEnterDashboardMode,
  onExitDashboardMode,
  onSave,
  onUndo,
  onRedo,
  onRevert,
  onSaveAsNew,
  onDuplicateAsCard,
  onDuplicateAsVariant,
  onDeleteDraft,
  onOpenCommandPalette,
  onOpenSets,
  onOpenImport,
  onOpenExport,
  onOpenPrint,
  onOpenHelp,
  onSelectProject,
  onSetDefaultProject,
  onClearDefaultProject
}: EditorToolbarProps) {
  const [openMenu, setOpenMenu] = useState<string>('');
  const menuRef = useRef<HTMLElement | null>(null);
  const menuButtonRefs = useRef<Record<string, HTMLElement | null>>({});
  const closeTimerRef = useRef<number | null>(null);
  const activeWorkMode = getWorkMode(workMode);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (id: string) => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenMenu((current) => (current === id ? '' : current));
    }, MENU_CLOSE_DELAY_MS);
  };

  const runMenuAction = (action: () => void) => {
    clearCloseTimer();
    setOpenMenu('');
    action();
  };
  const focusMenuButton = (id: MenuId) => {
    window.setTimeout(() => menuButtonRefs.current[id]?.focus(), 0);
  };
  const focusFirstMenuAction = (id: MenuId) => {
    window.setTimeout(() => {
      const firstAction = menuRef.current?.querySelector<HTMLButtonElement>(`[data-menu-panel="${id}"] button:not(:disabled)`);
      firstAction?.focus();
    }, 0);
  };
  const moveMenuFocus = (id: MenuId, direction: 1 | -1) => {
    const currentIndex = MENU_IDS.indexOf(id);
    const nextId = MENU_IDS[(currentIndex + direction + MENU_IDS.length) % MENU_IDS.length];
    setOpenMenu(nextId);
    focusMenuButton(nextId);
  };
  const handleMenuButtonKeyDown = (event: ReactKeyboardEvent<HTMLElement>, id: MenuId) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveMenuFocus(id, 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveMenuFocus(id, -1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpenMenu(id);
      focusFirstMenuAction(id);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpenMenu('');
      focusMenuButton(id);
    }
  };

  const menuProps = (id: string) => ({
    open: openMenu === id,
    onToggle: (event: SyntheticEvent<HTMLDetailsElement>) => {
      setOpenMenu(event.currentTarget.open ? id : '');
    },
    onMouseEnter: () => {
      clearCloseTimer();
      if (openMenu) {
        setOpenMenu(id);
      }
    },
    onMouseLeave: () => scheduleClose(id)
  });

  useEffect(() => {
    if (!openMenu) {
      return;
    }
    const closeIfOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        clearCloseTimer();
        setOpenMenu('');
      }
    };
    const scheduleCloseIfOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        scheduleClose(openMenu);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        clearCloseTimer();
        setOpenMenu('');
      }
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('pointermove', scheduleCloseIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('pointermove', scheduleCloseIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu]);

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <header className="app-chrome">
      <div className="menu-row">
        <nav ref={menuRef} className="app-menu" role="menubar" aria-label="Application menu">
          <details className="menu-root" {...menuProps('file')}>
            <summary ref={(node) => { menuButtonRefs.current.file = node; }} className="menu-button" role="menuitem" aria-haspopup="menu" aria-expanded={openMenu === 'file'} onKeyDown={(event) => handleMenuButtonKeyDown(event, 'file')}>File</summary>
            <div className="menu-popover" role="menu" data-menu-panel="file">
              <button type="button" role="menuitem" onClick={() => runMenuAction(onSave)} disabled={!draft || saving}>Save</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onSaveAsNew)} disabled={!draft || saving}>Save as...</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenSets)}>Open Set...</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenImport)}>Import...</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenExport)}>Export...</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenPrint)} disabled={!draft && !activeSetCode}>Print...</button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('edit')}>
            <summary ref={(node) => { menuButtonRefs.current.edit = node; }} className="menu-button" role="menuitem" aria-haspopup="menu" aria-expanded={openMenu === 'edit'} onKeyDown={(event) => handleMenuButtonKeyDown(event, 'edit')}>Edit</summary>
            <div className="menu-popover menu-popover-with-submenus" role="menu" data-menu-panel="edit">
              <button type="button" role="menuitem" onClick={() => runMenuAction(onUndo)} disabled={!canUndo}>Undo</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onRedo)} disabled={!canRedo}>Redo</button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onRevert)} disabled={!canRevert}>Revert to Last Saved</button>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" disabled={!draft} aria-haspopup="menu">
                  <span>Duplicate Card</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Duplicate card">
                  <button type="button" role="menuitem" onClick={() => runMenuAction(onDuplicateAsCard)} disabled={!draft}>As New Card</button>
                  <button type="button" role="menuitem" onClick={() => runMenuAction(onDuplicateAsVariant)} disabled={!draft}>As New Variant</button>
                </div>
              </div>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onDeleteDraft)} disabled={!canDeleteDraft}>Delete Unsaved Draft</button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('view')}>
            <summary ref={(node) => { menuButtonRefs.current.view = node; }} className="menu-button" role="menuitem" aria-haspopup="menu" aria-expanded={openMenu === 'view'} onKeyDown={(event) => handleMenuButtonKeyDown(event, 'view')}>View</summary>
            <div className="menu-popover menu-popover-with-submenus" role="menu" data-menu-panel="view">
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu">
                  <span>Theme</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Theme">
                  {THEME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={theme === option.id}
                      className={theme === option.id ? 'active' : ''}
                      onClick={() => runMenuAction(() => onThemeChange(option.id))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu" disabled={!library?.universes.length}>
                  <span>Project</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Project">
                  {(library?.universes ?? []).map((universe) => (
                    <button
                      key={universe.id}
                      type="button"
                      role="menuitem"
                      className={universe.id === selectedUniverseId ? 'active' : ''}
                      onClick={() => runMenuAction(() => onSelectProject(universe.id))}
                    >
                      {universe.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu">
                  <span>Work Modes</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover work-mode-menu" role="menu" aria-label="Work modes">
                  {WORK_MODE_DEFINITIONS.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={workMode === mode.id}
                      className={workMode === mode.id ? 'active' : ''}
                      title={mode.description}
                      onClick={() => runMenuAction(() => onWorkModeChange(mode.id))}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu">
                  <span>Preview Mode</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Preview mode">
                  <button type="button" role="menuitem" className={previewMode === 'normal' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('normal'))}>
                    Normal Preview
                  </button>
                  <button type="button" role="menuitem" className={previewMode === 'print' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('print'))}>
                    Print Review
                  </button>
                  <button type="button" role="menuitem" className={previewMode === 'cockatrice' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('cockatrice'))}>
                    Cockatrice Preview
                  </button>
                  <button type="button" role="menuitem" className={previewMode === 'safe-area' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('safe-area'))}>
                    Safe Area Preview
                  </button>
                  <button type="button" role="menuitem" className={previewMode === 'expanded' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('expanded'))} disabled={!canExpandPreview}>
                    Expanded Preview
                  </button>
                </div>
              </div>
              <div className="menu-submenu">
                <button
                  type="button"
                  className="menu-submenu-trigger"
                  aria-haspopup="menu"
                >
                  <span>Panels</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Panels">
                  <button type="button" role="menuitem" className={showCommandBar ? 'active' : ''} onClick={() => runMenuAction(() => onShowCommandBarChange(!showCommandBar))}>
                    Show Tools
                  </button>
                  <button type="button" role="menuitem" className={showSideRail ? 'active' : ''} onClick={() => runMenuAction(() => onShowSideRailChange(!showSideRail))}>
                    Show Side Menu
                  </button>
                  <button type="button" role="menuitem" className={showCardsRailItem ? 'active' : ''} onClick={() => runMenuAction(() => onShowCardsRailItemChange(!showCardsRailItem))}>
                    Show Cards
                  </button>
                  <button type="button" role="menuitem" className={showCollectionsRailItem ? 'active' : ''} onClick={() => runMenuAction(() => onShowCollectionsRailItemChange(!showCollectionsRailItem))}>
                    Show Collections
                  </button>
                  <button type="button" role="menuitem" className={showLeftPanel ? 'active' : ''} onClick={() => runMenuAction(() => onShowLeftPanelChange(!showLeftPanel))}>
                    Show Left Panel
                  </button>
                  <button type="button" role="menuitem" className={showPreviewPanel ? 'active' : ''} onClick={() => runMenuAction(() => onShowPreviewPanelChange(!showPreviewPanel))}>
                    Show Center Preview
                  </button>
                  <button type="button" role="menuitem" className={showRightPanel ? 'active' : ''} onClick={() => runMenuAction(() => onShowRightPanelChange(!showRightPanel))}>
                    Show Right Panel
                  </button>
                </div>
              </div>
              <div className="menu-submenu">
                <button
                  type="button"
                  className="menu-submenu-trigger"
                  aria-haspopup="menu"
                >
                  <span>Focused Layouts</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Focused layouts">
                  {isFocusedCardMode ? (
                    <button type="button" role="menuitem" className="active" onClick={() => runMenuAction(onExitFocusedCardMode)}>
                      Exit Focused Maker
                    </button>
                  ) : (
                    <button type="button" role="menuitem" onClick={() => runMenuAction(onEnterFocusedCardMode)} disabled={!canEnterFocusedCardMode}>
                      Focus Maker
                    </button>
                  )}
                  {isCardBrowserMode ? (
                    <button type="button" role="menuitem" className="active" onClick={() => runMenuAction(onExitCardBrowserMode)}>
                      Exit Card List Browser
                    </button>
                  ) : (
                    <button type="button" role="menuitem" onClick={() => runMenuAction(onEnterCardBrowserMode)}>
                      Card List Browser
                    </button>
                  )}
                  {isDashboardMode ? (
                    <button type="button" role="menuitem" className="active" onClick={() => runMenuAction(onExitDashboardMode)}>
                      Exit Card Dashboard
                    </button>
                  ) : (
                    <button type="button" role="menuitem" onClick={() => runMenuAction(onEnterDashboardMode)}>
                      Card Dashboard
                    </button>
                  )}
                  <button type="button" role="menuitem" className={previewMode === 'expanded' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('expanded'))} disabled={!canExpandPreview}>
                    Card Only Preview
                  </button>
                </div>
              </div>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu">
                  <span>Card List</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Card list">
                  <button type="button" role="menuitem" className={cardListDensity === 'comfortable' ? 'active' : ''} onClick={() => runMenuAction(() => onCardListDensityChange('comfortable'))}>
                    Detailed Card List
                  </button>
                  <button type="button" role="menuitem" className={cardListDensity === 'compact' ? 'active' : ''} onClick={() => runMenuAction(() => onCardListDensityChange('compact'))}>
                    Compact Card List
                  </button>
                </div>
              </div>
            </div>
          </details>
          <details className="menu-root" {...menuProps('tools')}>
            <summary ref={(node) => { menuButtonRefs.current.tools = node; }} className="menu-button" role="menuitem" aria-haspopup="menu" aria-expanded={openMenu === 'tools'} onKeyDown={(event) => handleMenuButtonKeyDown(event, 'tools')}>Tools</summary>
            <div className="menu-popover menu-popover-with-submenus" role="menu" data-menu-panel="tools">
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenCommandPalette)}>
                Command Palette...
              </button>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu">
                  <span>Card Tools</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Card surface tools">
                  {PREVIEW_TOOL_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={previewToolMode === option.id}
                      className={previewToolMode === option.id ? 'active' : ''}
                      onClick={() => runMenuAction(() => onPreviewToolModeChange(option.id))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" role="menuitem" className={showGuides ? 'active' : ''} onClick={() => runMenuAction(() => onShowGuidesChange(!showGuides))}>
                Guides
              </button>
              <button type="button" role="menuitem" className={showSafeArea ? 'active' : ''} onClick={() => runMenuAction(() => onShowSafeAreaChange(!showSafeArea))}>
                Safe area
              </button>
              <button type="button" role="menuitem" className={showCardGrid ? 'active' : ''} onClick={() => runMenuAction(() => onShowCardGridChange(!showCardGrid))}>
                Card grid
              </button>
              <div className="menu-submenu">
                <button type="button" className="menu-submenu-trigger" aria-haspopup="menu">
                  <span>Zoom</span>
                  <span aria-hidden="true">›</span>
                </button>
                <div className="menu-submenu-popover" role="menu" aria-label="Zoom">
                  <button type="button" role="menuitem" className={zoom === 0.75 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(0.75))}>
                    75%
                  </button>
                  <button type="button" role="menuitem" className={zoom === 1 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(1))}>
                    100%
                  </button>
                  <button type="button" role="menuitem" className={zoom === 1.25 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(1.25))}>
                    125%
                  </button>
                  <button type="button" role="menuitem" className={zoom === 1.5 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(1.5))}>
                    150%
                  </button>
                </div>
              </div>
              <div className="menu-section-label" role="presentation">Gallery Tools</div>
              <button type="button" role="menuitem" disabled>Asset Gallery</button>
              <button type="button" role="menuitem" disabled>Sync Cockatrice</button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('help')}>
            <summary ref={(node) => { menuButtonRefs.current.help = node; }} className="menu-button" role="menuitem" aria-haspopup="menu" aria-expanded={openMenu === 'help'} onKeyDown={(event) => handleMenuButtonKeyDown(event, 'help')}>Help</summary>
            <div className="menu-popover" role="menu" data-menu-panel="help">
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenHelp)}>Editor Help</button>
            </div>
          </details>
        </nav>
        <WorkModeChip mode={activeWorkMode} onChange={onWorkModeChange} />
      </div>
      {showCommandBar ? (
        <>
          <div className="command-row" style={{ height: commandBarHeight }}>
            <div className="tool-group">
              <button type="button" className="tool-button" aria-label="Open command palette" aria-keyshortcuts="Meta+K Control+K" data-tooltip="Command palette (Command-K / Ctrl-K)" onClick={onOpenCommandPalette}>
                <Icon name="search" />
              </button>
            </div>
            <div className="tool-group">
              <button type="button" className="tool-button" aria-label="Open sets" data-tooltip="Open sets" onClick={onOpenSets}>
                <Icon name="folder" />
              </button>
              <button type="button" className="tool-button" aria-label="Save" aria-keyshortcuts="Meta+S Control+S" data-tooltip="Save (Command-S / Ctrl-S)" onClick={onSave} disabled={!draft || saving}>
                <Icon name="save" />
              </button>
            </div>
            <div className="tool-group">
              <button type="button" className="tool-button" aria-label="Undo" aria-keyshortcuts="Meta+Z Control+Z" data-tooltip={canUndo ? 'Undo card edit' : 'No card edit to undo'} onClick={onUndo} disabled={!canUndo}>
                <Icon name="undo" />
              </button>
              <button type="button" className="tool-button" aria-label="Redo" aria-keyshortcuts="Meta+Shift+Z Control+Shift+Z Control+Y" data-tooltip={canRedo ? 'Redo card edit' : 'No card edit to redo'} onClick={onRedo} disabled={!canRedo}>
                <Icon name="redo" />
              </button>
              <button type="button" className="tool-button" aria-label="Revert to last saved" data-tooltip={canRevert ? 'Revert to last saved' : 'No saved-card changes to revert'} onClick={onRevert} disabled={!canRevert}>
                <Icon name="revert" />
              </button>
            </div>
            <div className="tool-group preview-tool-mode-group" role="radiogroup" aria-label="Card tools">
              {PREVIEW_TOOL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="tool-button preview-tool-button"
                  aria-label={option.ariaLabel}
                  aria-pressed={previewToolMode === option.id}
                  data-tooltip={`${option.ariaLabel}: ${option.tooltip}`}
                  onClick={() => onPreviewToolModeChange(option.id)}
                >
                  <Icon name={option.icon} />
                </button>
              ))}
            </div>
            <label className="toolbar-field">
              <span>Preview mode</span>
              <select value={previewMode} onChange={(event) => onPreviewModeChange(event.target.value as PreviewMode)}>
                <option value="normal">Normal</option>
                <option value="print">Print review</option>
                <option value="cockatrice">Cockatrice</option>
                <option value="safe-area">Safe area</option>
                <option value="expanded" disabled={!canExpandPreview}>Expanded preview</option>
              </select>
            </label>
            <label className="check-tool">
              <input type="checkbox" checked={showGuides} onChange={(event) => onShowGuidesChange(event.target.checked)} />
              Guides
            </label>
            <label className="check-tool">
              <input type="checkbox" checked={showSafeArea} onChange={(event) => onShowSafeAreaChange(event.target.checked)} />
              Safe area
            </label>
            <label className="check-tool">
              <input type="checkbox" checked={showCardGrid} onChange={(event) => onShowCardGridChange(event.target.checked)} />
              Card grid
            </label>
            <label className="toolbar-field small">
              <span>Zoom</span>
              <select value={String(zoom)} onChange={(event) => onZoomChange(Number(event.target.value))}>
                <option value="0.75">75%</option>
                <option value="1">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
              </select>
            </label>
            <ProjectQuickSwitch
              library={library}
              selectedUniverseId={selectedUniverseId}
              defaultProjectId={defaultProjectId}
              activeProjectName={activeProjectName}
              activeSetCode={activeSetCode}
              onSelectProject={onSelectProject}
              onSetDefaultProject={onSetDefaultProject}
              onClearDefaultProject={onClearDefaultProject}
            />
            <div className="toolbar-spacer" />
          </div>
          <PanelResizeHandle label="Resize top toolbar" orientation="horizontal" onResize={onCommandBarResize} />
        </>
      ) : null}
    </header>
  );
}

interface ProjectQuickSwitchProps {
  library: LibraryState | null;
  selectedUniverseId: string;
  defaultProjectId: string;
  activeProjectName: string;
  activeSetCode: string;
  onSelectProject: (universeId: string) => void;
  onSetDefaultProject: (universeId: string) => void;
  onClearDefaultProject: () => void;
}

function ProjectQuickSwitch({
  library,
  selectedUniverseId,
  defaultProjectId,
  activeProjectName,
  activeSetCode,
  onSelectProject,
  onSetDefaultProject,
  onClearDefaultProject
}: ProjectQuickSwitchProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const universes = library?.universes ?? [];
  const defaultProject = universes.find((universe) => universe.id === defaultProjectId);
  const activeProjectSets = library?.sets.filter((set) => set.universeId === selectedUniverseId) ?? [];
  const activeSetLabel = activeSetCode || activeProjectSets[0]?.setCode || '';
  const projectLabel = activeProjectName || 'No project';

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeIfOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleSelectProject = (universeId: string) => {
    setOpen(false);
    onSelectProject(universeId);
  };

  const handleSetDefaultProject = (universeId: string) => {
    setOpen(false);
    onSetDefaultProject(universeId);
  };

  const handleClearDefaultProject = () => {
    setOpen(false);
    onClearDefaultProject();
  };

  return (
    <div className="toolbar-project-switcher" ref={rootRef}>
      <button
        type="button"
        className={`toolbar-project-context ${open ? 'open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? 'toolbar-project-switcher-menu' : undefined}
        disabled={!universes.length}
        onClick={() => setOpen((value) => !value)}
      >
        <span>Project</span>
        <strong title={projectLabel}>{projectLabel}</strong>
        {activeSetLabel ? <em>{activeSetLabel}</em> : null}
        <b className="toolbar-project-caret" aria-hidden="true">v</b>
      </button>
      {open ? (
        <div id="toolbar-project-switcher-menu" className="project-switcher-menu" role="menu" aria-label="Switch project">
          <div className="project-switcher-summary">
            <span>Startup default</span>
            <strong>{defaultProject?.name ?? 'App default'}</strong>
          </div>
          <div className="project-switcher-list">
            {universes.map((universe) => {
              const setCount = library?.sets.filter((set) => set.universeId === universe.id).length ?? 0;
              const isActive = universe.id === selectedUniverseId;
              const isDefault = universe.id === defaultProjectId;
              const meta = [formatProjectSetCount(setCount), isDefault ? 'Startup default' : universe.status].filter(Boolean).join(' / ');
              return (
                <div key={universe.id} className={`project-switcher-row ${isActive ? 'active' : ''} ${isDefault ? 'default' : ''}`}>
                  <button
                    type="button"
                    className="project-switcher-main"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => handleSelectProject(universe.id)}
                  >
                    <span className="project-switcher-name">{universe.name}</span>
                    <span className="project-switcher-meta">{meta}</span>
                  </button>
                  <button
                    type="button"
                    className="project-switcher-default"
                    role="menuitem"
                    disabled={isDefault}
                    title={isDefault ? `${universe.name} is the startup default` : `Make ${universe.name} the startup default`}
                    onClick={() => handleSetDefaultProject(universe.id)}
                  >
                    {isDefault ? 'Default' : 'Make default'}
                  </button>
                </div>
              );
            })}
          </div>
          <button type="button" className="project-switcher-clear" role="menuitem" disabled={!defaultProjectId} onClick={handleClearDefaultProject}>
            Clear startup default
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatProjectSetCount(count: number): string {
  if (count === 0) {
    return 'No sets';
  }
  if (count === 1) {
    return '1 set';
  }
  return `${count} sets`;
}
