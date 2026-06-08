import type { ReactNode } from 'react';
import type { IconName } from '../Icon.js';
import { Icon } from '../Icon.js';
import { Button } from './Button.js';
import { cx } from './utils.js';

interface ListControlsBarProps {
  searchLabel: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  sortControl?: ReactNode;
  filterControl?: ReactNode;
  resetControl?: ReactNode;
  results?: ReactNode;
  viewControl?: ReactNode;
  extraControls?: ReactNode;
  className?: string;
}

export function ListControlsBar({
  searchLabel,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  sortControl,
  filterControl,
  resetControl,
  results,
  viewControl,
  extraControls,
  className
}: ListControlsBarProps) {
  return (
    <div className={cx('list-controls-bar', className)}>
      <label className="search-field list-controls-search">
        <span className="sr-only">{searchLabel}</span>
        <Icon name="search" />
        <input value={searchValue} placeholder={searchPlaceholder} onChange={(event) => onSearchChange(event.target.value)} />
      </label>
      <div className="list-controls-actions">
        {sortControl}
        {filterControl}
        {resetControl}
        {extraControls}
      </div>
      {results ? <div className="list-controls-results" aria-live="polite">{results}</div> : null}
      {viewControl ? <div className="list-controls-view">{viewControl}</div> : null}
    </div>
  );
}

export function ListResultsSummary({ shown, total, label = 'row' }: { shown: number; total: number; label?: string }) {
  const plural = (count: number) => `${count.toLocaleString()} ${label}${count === 1 ? '' : 's'}`;
  return <span>{shown === total ? plural(total) : `${plural(shown)} of ${plural(total)}`}</span>;
}

interface GroupedBasicLandToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function GroupedBasicLandToggle({ checked, onChange }: GroupedBasicLandToggleProps) {
  return (
    <label className="list-toggle-pill" title="Group identical basic lands in the displayed deck rows">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>Group basics</span>
    </label>
  );
}

interface AdvancedFiltersButtonProps {
  activeCount: number;
  onClick: () => void;
  label?: string;
  icon?: IconName;
}

export function AdvancedFiltersButton({ activeCount, onClick, label = 'Filters', icon = 'filter' }: AdvancedFiltersButtonProps) {
  return (
    <Button compact variant="secondary" icon={<Icon name={icon} />} className={activeCount ? 'active' : ''} onClick={onClick} aria-label={activeCount ? `${label}, ${activeCount} active` : label}>
      {label}
      {activeCount ? <span className="list-control-badge">{activeCount}</span> : null}
    </Button>
  );
}
