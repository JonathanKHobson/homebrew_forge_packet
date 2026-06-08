import type { EditorProject, LibraryState, PreviewResponse, RuntimeHealth } from '../../domain/editorTypes.js';
import type { WorkspaceSection } from '../../domain/editorUiTypes.js';
import { formatCount } from '../../domain/uiText.js';
import { Button, StatusPill, type StatusPillTone } from '../forge-ui/index.js';
import { OverlayShell } from '../overlays/OverlayShell.js';

interface RuntimeStatusBannerProps {
  hasUnsavedChanges: boolean;
  health: RuntimeHealth | null;
  restartState: 'idle' | 'restarting' | 'error';
  onRestart: () => void;
}

interface WorkspaceStatusBarProps {
  activeWorkspace: WorkspaceSection;
  cardCount: number;
  hasUnsavedChanges: boolean;
  health: RuntimeHealth | null;
  onOpenHealthPanel: () => void;
  previewWarningCount: number;
  projectName: string;
  setCode: string;
  status: string;
  variantCount: number;
}

interface WorkspaceHealthPanelProps {
  activeWorkspace: WorkspaceSection;
  dirtyDraftCount: number;
  health: RuntimeHealth | null;
  library: LibraryState | null;
  preview: PreviewResponse | null;
  project: EditorProject | null;
  referenceLoaded: boolean;
  restartState: 'idle' | 'restarting' | 'error';
  status: string;
  onClose: () => void;
}

interface HealthItem {
  label: string;
  value: string;
  detail: string;
  tone: StatusPillTone;
}

export function RuntimeStatusBanner({ health, hasUnsavedChanges, restartState, onRestart }: RuntimeStatusBannerProps) {
  if (!health?.stale) {
    return <div className="runtime-status-region" aria-hidden="true" />;
  }
  const detail = hasUnsavedChanges
    ? 'Save or discard unsaved changes before restarting.'
    : health.forgeDist.stale
      ? 'The local renderer build is behind the source files.'
      : 'The running helper is older than the current source files.';
  return (
    <div className="runtime-status-region visible">
      <section className="runtime-status-banner" role="status" aria-live="polite">
        <div className="runtime-status-copy">
          <strong>Homebrew Forge has updated. Restart to use the latest renderer.</strong>
          <span>{detail}</span>
        </div>
        <button type="button" className="secondary-button compact" onClick={onRestart} disabled={hasUnsavedChanges || restartState === 'restarting'}>
          {restartState === 'restarting' ? 'Restarting...' : 'Restart App'}
        </button>
      </section>
    </div>
  );
}

export function WorkspaceStatusBar({
  activeWorkspace,
  cardCount,
  hasUnsavedChanges,
  health,
  onOpenHealthPanel,
  previewWarningCount,
  projectName,
  setCode,
  status,
  variantCount
}: WorkspaceStatusBarProps) {
  const runtimeLabel = health ? (health.stale ? 'Runtime stale' : 'Runtime fresh') : 'Runtime checking';
  const runtimeTone = health ? (health.stale ? 'warning' : 'ok') : 'pending';
  const workspaceLabel = workspaceStatusLabel(activeWorkspace);
  const projectLabel = projectName && setCode ? `${projectName} / ${setCode}` : projectName || setCode || (/^Loading /i.test(status) ? 'Project loading' : 'No project loaded');
  const showAuthoredSetCounts = activeWorkspace === 'maker' || activeWorkspace === 'sets' || activeWorkspace === 'cards';
  const statusMessage = !showAuthoredSetCounts && /^Loaded \d+ cards? \/ \d+ variants? from /i.test(status)
    ? `${workspaceLabel} workspace ready.`
    : status;

  return (
    <footer className="app-status-bar app-status-bar-with-health" role="status" aria-live="polite">
      <span className="app-status-bar-message">{statusMessage}</span>
      <span className="workspace-health-strip" aria-label="Workspace health">
        <span className="app-status-bar-meta">{workspaceLabel}</span>
        <span className="app-status-bar-meta">{projectLabel}</span>
        <span className={`app-status-bar-meta ${runtimeTone}`}>{runtimeLabel}</span>
        {showAuthoredSetCounts ? <span className="app-status-bar-meta">{formatCount(cardCount, 'card')}</span> : null}
        {showAuthoredSetCounts ? <span className="app-status-bar-meta">{formatCount(variantCount, 'variant')}</span> : null}
        {previewWarningCount ? <span className="app-status-bar-meta warning">{formatCount(previewWarningCount, 'preview warning')}</span> : null}
        {hasUnsavedChanges ? <span className="app-status-bar-meta dirty">Unsaved changes</span> : null}
        <button type="button" className="workspace-health-button" onClick={onOpenHealthPanel}>
          Health
        </button>
      </span>
    </footer>
  );
}

export function WorkspaceHealthPanel({
  activeWorkspace,
  dirtyDraftCount,
  health,
  library,
  preview,
  project,
  referenceLoaded,
  restartState,
  status,
  onClose
}: WorkspaceHealthPanelProps) {
  const items = workspaceHealthItems({
    activeWorkspace,
    dirtyDraftCount,
    health,
    library,
    preview,
    project,
    referenceLoaded,
    restartState
  });

  return (
    <OverlayShell
      eyebrow="Workspace"
      title="Workspace Health"
      subtitle="Local-first status for source files, renderer freshness, preview output, references, and unsaved work."
      dirty={false}
      onClose={onClose}
      footer={(requestClose) => (
        <Button variant="secondary" compact onClick={requestClose}>
          Close
        </Button>
      )}
    >
      <section className="workspace-health-panel" aria-label="Workspace health details">
        <div className="workspace-health-current">
          <span>Current status</span>
          <strong>{status}</strong>
        </div>
        <div className="workspace-health-grid">
          {items.map((item) => (
            <article key={item.label} className={`workspace-health-card tone-${item.tone}`}>
              <header>
                <span>{item.label}</span>
                <StatusPill tone={item.tone}>{healthToneLabel(item.tone)}</StatusPill>
              </header>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
        {health?.staleReasons.length ? (
          <section className="workspace-health-reasons" aria-label="Runtime stale reasons">
            <h3>Runtime reasons</h3>
            <ul>
              {health.staleReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </section>
        ) : null}
      </section>
    </OverlayShell>
  );
}

function workspaceHealthItems({
  activeWorkspace,
  dirtyDraftCount,
  health,
  library,
  preview,
  project,
  referenceLoaded,
  restartState
}: Omit<WorkspaceHealthPanelProps, 'onClose' | 'status'>): HealthItem[] {
  const cardCount = project?.cards.length ?? 0;
  const variantCount = project?.drafts.length ?? 0;
  const warningCount = preview?.warnings.length ?? 0;
  return [
    {
      label: 'Workspace',
      value: workspaceStatusLabel(activeWorkspace),
      detail: project ? `${project.setName} (${project.setCode}) is loaded.` : 'No active set is loaded yet.',
      tone: project ? 'success' : 'warning'
    },
    {
      label: 'Source index',
      value: library ? `${formatCount(library.universes.length, 'project')} / ${formatCount(library.sets.length, 'set')}` : 'Checking',
      detail: library ? 'Project and set index is available from local files.' : 'The editor is still loading the local project index.',
      tone: library ? 'success' : 'warning'
    },
    {
      label: 'Authored cards',
      value: `${formatCount(cardCount, 'card')} / ${formatCount(variantCount, 'variant')}`,
      detail: cardCount ? 'Saved authored card records are available for preview and export.' : 'Create or import a card to populate this set.',
      tone: cardCount ? 'success' : 'info'
    },
    {
      label: 'Unsaved work',
      value: dirtyDraftCount ? formatCount(dirtyDraftCount, 'dirty draft') : 'Clean',
      detail: dirtyDraftCount ? 'Local draft recovery is keeping unsaved card edits available.' : 'No unsaved card edits are currently tracked.',
      tone: dirtyDraftCount ? 'dirty' : 'success'
    },
    {
      label: 'Runtime freshness',
      value: health ? (health.stale ? 'Stale' : 'Fresh') : 'Checking',
      detail: health
        ? health.stale
          ? 'Restart the local helper when it is safe to pick up the latest source.'
          : `Local helper is serving on port ${health.port}.`
        : 'The editor has not received a health response yet.',
      tone: health ? (health.stale ? 'warning' : 'success') : 'info'
    },
    {
      label: 'Restart state',
      value: restartState === 'restarting' ? 'Restarting' : restartState === 'error' ? 'Restart error' : 'Idle',
      detail: restartState === 'error' ? 'The last restart request did not complete.' : 'Restart is controlled by the local launcher.',
      tone: restartState === 'error' ? 'danger' : restartState === 'restarting' ? 'warning' : 'neutral'
    },
    {
      label: 'Preview renderer',
      value: warningCount ? formatCount(warningCount, 'warning') : preview?.imageDataUri ? 'Ready' : 'No active render',
      detail: warningCount ? 'Preview warnings are available on the active card.' : preview?.imageDataUri ? 'The active card has a rendered preview.' : 'Select or create a renderable card to preview output.',
      tone: warningCount ? 'warning' : preview?.imageDataUri ? 'success' : 'info'
    },
    {
      label: 'References',
      value: referenceLoaded ? 'Loaded' : 'Checking',
      detail: referenceLoaded ? 'The local reference catalog is available for editor guidance.' : 'Reference terms are still loading or unavailable.',
      tone: referenceLoaded ? 'success' : 'info'
    }
  ];
}

function workspaceStatusLabel(section: WorkspaceSection): string {
  if (section === 'maker') {
    return 'Maker';
  }
  if (section === 'cards') {
    return 'Cards';
  }
  if (section === 'library') {
    return 'Gallery';
  }
  if (section === 'reference') {
    return 'References';
  }
  return section.charAt(0).toUpperCase() + section.slice(1);
}

function healthToneLabel(tone: StatusPillTone): string {
  if (tone === 'success') {
    return 'OK';
  }
  if (tone === 'dirty') {
    return 'Dirty';
  }
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}
