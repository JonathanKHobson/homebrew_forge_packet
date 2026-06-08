import type { WorkspaceSection } from '../../domain/editorUiTypes.js';
import { SideRail } from '../SideRail.js';

interface SidebarNavProps {
  active: WorkspaceSection;
  activeSetCode?: string;
  cardCount?: number;
  showCollections: boolean;
  visible: boolean;
  visibleSections: WorkspaceSection[];
  workModeHint: string;
  workModeLabel: string;
  onChange: (section: WorkspaceSection) => void;
}

export function SidebarNav({ visible, ...sideRailProps }: SidebarNavProps) {
  if (!visible) {
    return null;
  }
  return <SideRail {...sideRailProps} />;
}
