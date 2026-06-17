import type { WorkspaceSection } from '../domain/editorUiTypes.js';
import { Icon, type IconName } from './Icon.js';

export interface SideRailProps {
  active: WorkspaceSection;
  /** Accepted for API compatibility; no longer rendered (context lives in the toolbar + status bar). */
  activeSetCode?: string;
  cardCount?: number;
  showCollections?: boolean;
  visibleSections?: WorkspaceSection[];
  workModeLabel?: string;
  workModeHint?: string;
  onChange: (section: WorkspaceSection) => void;
}

const items: Array<{ id: WorkspaceSection; label: string; icon: IconName; utility?: boolean }> = [
  { id: 'maker', label: 'Maker', icon: 'edit' },
  { id: 'sets', label: 'Sets', icon: 'sets' },
  { id: 'decks', label: 'Decks', icon: 'decks' },
  { id: 'collections', label: 'Collections', icon: 'collections' },
  { id: 'binders', label: 'Binders', icon: 'binders' },
  { id: 'lists', label: 'Lists', icon: 'lists' },
  { id: 'projects', label: 'Projects', icon: 'universes' },
  { id: 'cards', label: 'Cards', icon: 'cards' },
  { id: 'library', label: 'Gallery', icon: 'assets' },
  { id: 'reference', label: 'References', icon: 'guide' },
  { id: 'settings', label: 'Settings', icon: 'settings', utility: true }
];

export function SideRail({ active, showCollections = true, visibleSections, onChange }: SideRailProps) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const requestedSections = visibleSections ?? items.map((item) => item.id);
  const visibleItems = requestedSections
    .map((section) => itemById.get(section))
    .filter((item): item is (typeof items)[number] => Boolean(item))
    .filter((item) => showCollections || item.id !== 'collections' || active === 'collections');
  const activeItem = itemById.get(active);
  const railItems = activeItem && !visibleItems.some((item) => item.id === activeItem.id) ? [...visibleItems, activeItem] : visibleItems;
  const mainItems = railItems.filter((item) => !item.utility);
  const utilityItems = railItems.filter((item) => item.utility);
  return (
    <aside className="side-rail" aria-label="Workspace sections">
      <div className="rail-items">
        {mainItems.map((item) => (
          <button key={item.id} type="button" className={`rail-button ${active === item.id ? 'active' : ''}`} onClick={() => onChange(item.id)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      {utilityItems.length ? (
        <div className="rail-items rail-utility">
          {utilityItems.map((item) => (
            <button key={item.id} type="button" className={`rail-button ${active === item.id ? 'active' : ''}`} title={item.label} aria-label={item.label} onClick={() => onChange(item.id)}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
