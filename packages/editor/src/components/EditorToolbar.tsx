import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { CardDraft } from '../domain/editorTypes.js';
import type { CardListDensity, PreviewMode } from '../domain/editorUiTypes.js';
import { Icon } from './Icon.js';
import { PanelResizeHandle } from './PanelResizeHandle.js';

interface EditorToolbarProps {
  draft: CardDraft | null;
  previewMode: PreviewMode;
  showGuides: boolean;
  showSafeArea: boolean;
  zoom: number;
  cardListDensity: CardListDensity;
  showCommandBar: boolean;
  showSideRail: boolean;
  showLeftPanel: boolean;
  showPreviewPanel: boolean;
  showRightPanel: boolean;
  commandBarHeight: number;
  saving: boolean;
  canDeleteDraft: boolean;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onShowGuidesChange: (value: boolean) => void;
  onShowSafeAreaChange: (value: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onCardListDensityChange: (density: CardListDensity) => void;
  onShowCommandBarChange: (value: boolean) => void;
  onShowSideRailChange: (value: boolean) => void;
  onShowLeftPanelChange: (value: boolean) => void;
  onShowPreviewPanelChange: (value: boolean) => void;
  onShowRightPanelChange: (value: boolean) => void;
  onCommandBarResize: (delta: number) => void;
  onSave: () => void;
  onSaveAsNew: () => void;
  onClone: () => void;
  onDeleteDraft: () => void;
  onOpenSets: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
}

export function EditorToolbar({
  draft,
  previewMode,
  showGuides,
  showSafeArea,
  zoom,
  cardListDensity,
  showCommandBar,
  showSideRail,
  showLeftPanel,
  showPreviewPanel,
  showRightPanel,
  commandBarHeight,
  saving,
  canDeleteDraft,
  onPreviewModeChange,
  onShowGuidesChange,
  onShowSafeAreaChange,
  onZoomChange,
  onCardListDensityChange,
  onShowCommandBarChange,
  onShowSideRailChange,
  onShowLeftPanelChange,
  onShowPreviewPanelChange,
  onShowRightPanelChange,
  onCommandBarResize,
  onSave,
  onSaveAsNew,
  onClone,
  onDeleteDraft,
  onOpenSets,
  onOpenImport,
  onOpenExport
}: EditorToolbarProps) {
  const [openMenu, setOpenMenu] = useState<string>('');
  const menuRef = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);

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
    }, 220);
  };

  const runMenuAction = (action: () => void) => {
    clearCloseTimer();
    setOpenMenu('');
    action();
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
        <nav ref={menuRef} className="app-menu" aria-label="Application menu">
          <details className="menu-root" {...menuProps('file')}>
            <summary className="menu-button">File</summary>
            <div className="menu-popover">
              <button type="button" onClick={() => runMenuAction(onSave)} disabled={!draft || saving}>Save</button>
              <button type="button" onClick={() => runMenuAction(onSaveAsNew)} disabled={!draft || saving}>Save as New</button>
              <button type="button" onClick={() => runMenuAction(onOpenSets)}>Open Set...</button>
              <button type="button" onClick={() => runMenuAction(onOpenImport)}>Import...</button>
              <button type="button" onClick={() => runMenuAction(onOpenExport)}>Export...</button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('edit')}>
            <summary className="menu-button">Edit</summary>
            <div className="menu-popover">
              <button type="button" disabled>Undo</button>
              <button type="button" disabled>Redo</button>
              <button type="button" onClick={() => runMenuAction(onClone)} disabled={!draft}>Duplicate Card</button>
              <button type="button" onClick={() => runMenuAction(onDeleteDraft)} disabled={!canDeleteDraft}>Delete Unsaved Draft</button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('view')}>
            <summary className="menu-button">View</summary>
            <div className="menu-popover">
              <span className="menu-section-label">Preview Mode</span>
              <button type="button" className={previewMode === 'normal' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('normal'))}>
                Normal Preview
              </button>
              <button type="button" className={previewMode === 'print' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('print'))}>
                Print Review
              </button>
              <button type="button" className={previewMode === 'cockatrice' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('cockatrice'))}>
                Cockatrice Preview
              </button>
              <button type="button" className={previewMode === 'safe-area' ? 'active' : ''} onClick={() => runMenuAction(() => onPreviewModeChange('safe-area'))}>
                Safe Area Preview
              </button>
              <span className="menu-section-label">Zoom</span>
              <button type="button" className={zoom === 0.75 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(0.75))}>
                75%
              </button>
              <button type="button" className={zoom === 1 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(1))}>
                100%
              </button>
              <button type="button" className={zoom === 1.25 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(1.25))}>
                125%
              </button>
              <button type="button" className={zoom === 1.5 ? 'active' : ''} onClick={() => runMenuAction(() => onZoomChange(1.5))}>
                150%
              </button>
              <span className="menu-section-label">Panels</span>
              <button type="button" className={showCommandBar ? 'active' : ''} onClick={() => runMenuAction(() => onShowCommandBarChange(!showCommandBar))}>
                Show Tools
              </button>
              <button type="button" className={showSideRail ? 'active' : ''} onClick={() => runMenuAction(() => onShowSideRailChange(!showSideRail))}>
                Show Side Menu
              </button>
              <button type="button" className={showLeftPanel ? 'active' : ''} onClick={() => runMenuAction(() => onShowLeftPanelChange(!showLeftPanel))}>
                Show Left Panel
              </button>
              <button type="button" className={showPreviewPanel ? 'active' : ''} onClick={() => runMenuAction(() => onShowPreviewPanelChange(!showPreviewPanel))}>
                Show Center Preview
              </button>
              <button type="button" className={showRightPanel ? 'active' : ''} onClick={() => runMenuAction(() => onShowRightPanelChange(!showRightPanel))}>
                Show Right Panel
              </button>
              <span className="menu-section-label">Guides</span>
              <button type="button" className={showGuides ? 'active' : ''} onClick={() => runMenuAction(() => onShowGuidesChange(!showGuides))}>
                Show Guides
              </button>
              <button type="button" className={showSafeArea ? 'active' : ''} onClick={() => runMenuAction(() => onShowSafeAreaChange(!showSafeArea))}>
                Show Safe Area
              </button>
              <span className="menu-section-label">Card List</span>
              <button type="button" className={cardListDensity === 'comfortable' ? 'active' : ''} onClick={() => runMenuAction(() => onCardListDensityChange('comfortable'))}>
                Detailed Card List
              </button>
              <button type="button" className={cardListDensity === 'compact' ? 'active' : ''} onClick={() => runMenuAction(() => onCardListDensityChange('compact'))}>
                Compact Card List
              </button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('tools')}>
            <summary className="menu-button">Tools</summary>
            <div className="menu-popover">
              <button type="button" disabled>Asset Library</button>
              <button type="button" disabled>Sync Cockatrice</button>
            </div>
          </details>
          <details className="menu-root" {...menuProps('help')}>
            <summary className="menu-button">Help</summary>
            <div className="menu-popover">
              <button type="button" disabled>Editor Help</button>
            </div>
          </details>
        </nav>
      </div>
      {showCommandBar ? (
        <>
          <div className="command-row" style={{ height: commandBarHeight }}>
            <div className="tool-group">
              <button type="button" className="tool-button" title="Open sets" onClick={onOpenSets}>
                <Icon name="folder" />
              </button>
              <button type="button" className="tool-button" title="Save card" onClick={onSave} disabled={!draft || saving}>
                <Icon name="save" />
              </button>
            </div>
            <div className="tool-group">
              <button type="button" className="tool-button" title="Undo" disabled>
                <Icon name="undo" />
              </button>
              <button type="button" className="tool-button" title="Redo" disabled>
                <Icon name="redo" />
              </button>
            </div>
            <label className="toolbar-field">
              <span>Preview</span>
              <select value={previewMode} onChange={(event) => onPreviewModeChange(event.target.value as PreviewMode)}>
                <option value="normal">Normal</option>
                <option value="print">Print review</option>
                <option value="cockatrice">Cockatrice</option>
                <option value="safe-area">Safe area</option>
              </select>
            </label>
            <label className="check-tool">
              <input type="checkbox" checked={showGuides} onChange={(event) => onShowGuidesChange(event.target.checked)} />
              Show Guides
            </label>
            <label className="check-tool">
              <input type="checkbox" checked={showSafeArea} onChange={(event) => onShowSafeAreaChange(event.target.checked)} />
              Show Safe Area
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
            <div className="toolbar-spacer" />
          </div>
          <PanelResizeHandle label="Resize top toolbar" orientation="horizontal" onResize={onCommandBarResize} />
        </>
      ) : null}
    </header>
  );
}
