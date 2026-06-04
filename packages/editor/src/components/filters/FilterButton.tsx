import { Icon } from '../Icon.js';

interface FilterButtonProps {
  label: string;
  activeCount: number;
  onClick: () => void;
}

export function FilterButton({ label, activeCount, onClick }: FilterButtonProps) {
  const title = activeCount > 0 ? `${label} - ${activeCount} active` : label;
  return (
    <button type="button" className={`icon-button filter-trigger ${activeCount > 0 ? 'has-active-filters' : ''}`} onClick={onClick} title={title} aria-label={title}>
      <Icon name="filter" />
      {activeCount > 0 ? <span className="filter-badge">{activeCount}</span> : null}
    </button>
  );
}
