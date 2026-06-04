import type { WorkspaceSection } from '../domain/editorUiTypes.js';
import { Icon, type IconName } from './Icon.js';

interface SideRailProps {
  active: WorkspaceSection;
  activeSetCode?: string;
  cardCount: number;
  showCollections?: boolean;
  onChange: (section: WorkspaceSection) => void;
}

const items: Array<{ id: WorkspaceSection; label: string; icon: IconName }> = [
  { id: 'cards', label: 'Cards', icon: 'cards' },
  { id: 'decks', label: 'Decks', icon: 'decks' },
  { id: 'sets', label: 'Sets', icon: 'sets' },
  { id: 'projects', label: 'Projects', icon: 'universes' },
  { id: 'library', label: 'Library', icon: 'assets' },
  { id: 'collections', label: 'Collections', icon: 'collections' },
  { id: 'reference', label: 'References', icon: 'guide' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

export function SideRail({ active, activeSetCode, cardCount, showCollections = true, onChange }: SideRailProps) {
  const visibleItems = showCollections ? items : items.filter((item) => item.id !== 'collections');
  return (
    <aside className="side-rail" aria-label="Workspace sections">
      <div className="rail-items">
        {visibleItems.map((item) => (
          <button key={item.id} type="button" className={`rail-button ${active === item.id ? 'active' : ''}`} onClick={() => onChange(item.id)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="rail-status">
        <span>Active Set</span>
        <strong>{activeSetCode ?? '-'}</strong>
        <small>{cardCount} cards</small>
      </div>
    </aside>
  );
}
