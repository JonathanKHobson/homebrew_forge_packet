import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { WorkspaceSection } from '../../domain/editorUiTypes.js';

interface WorkspaceFrameProps {
  activeWorkspace: WorkspaceSection;
  children: ReactNode;
  focused: boolean;
  isCardBrowserMode: boolean;
  isDashboardMode: boolean;
  showMakerOnboarding: boolean;
  showLeftPanel: boolean;
  showPreviewPanel: boolean;
  showRightPanel: boolean;
  showSideRail: boolean;
  style: CSSProperties;
}

export const WorkspaceFrame = forwardRef<HTMLElement, WorkspaceFrameProps>(function WorkspaceFrame(
  {
    activeWorkspace,
    children,
    focused,
    isCardBrowserMode,
    isDashboardMode,
    showMakerOnboarding,
    showLeftPanel,
    showPreviewPanel,
    showRightPanel,
    showSideRail,
    style
  },
  ref
) {
  const workspaceClass =
    activeWorkspace === 'maker'
      ? 'workspace-maker'
      : activeWorkspace === 'cards'
        ? 'workspace-card-catalog'
        : `workspace-${activeWorkspace}`;
  const className = [
    'workbench',
    workspaceClass,
    showSideRail ? '' : 'hide-side-rail',
    showLeftPanel ? '' : 'hide-left-panel',
    showPreviewPanel ? '' : 'hide-preview-panel',
    showRightPanel ? '' : 'hide-right-panel',
    showMakerOnboarding ? 'maker-onboarding-workbench' : '',
    focused ? 'focused-editor-mode' : '',
    isCardBrowserMode ? 'card-browser-workbench' : '',
    isDashboardMode ? 'dashboard-workbench' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section ref={ref} className={className} style={style}>
      {children}
    </section>
  );
});
