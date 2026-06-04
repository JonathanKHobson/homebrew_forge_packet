import type { ReactNode } from 'react';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';

interface BrowseFilterOverlayProps {
  title: string;
  subtitle: string;
  resultsLabel: string;
  activeFilterCount: number;
  children: ReactNode;
  results: ReactNode;
  onClose: () => void;
  onResetFilters: () => void;
}

export function BrowseFilterOverlay({
  title,
  subtitle,
  resultsLabel,
  activeFilterCount,
  children,
  results,
  onClose,
  onResetFilters
}: BrowseFilterOverlayProps) {
  const footer = (
    <>
      <button type="button" className="secondary-button" disabled={activeFilterCount === 0} onClick={onResetFilters}>
        Reset Filters
      </button>
      <button type="button" className="primary-button" onClick={onClose}>
        Done
      </button>
    </>
  );

  return (
    <OverlayShell title={title} eyebrow="Browse" subtitle={subtitle} dirty={false} footer={footer} onClose={onClose}>
      <div className="browse-filter-layout">
        <section className="browse-filter-results" aria-label={resultsLabel}>
          <div className="browse-filter-heading">
            <Icon name="search" />
            <strong>{resultsLabel}</strong>
          </div>
          {results}
        </section>
        <aside className="browse-filter-controls">
          <div className="browse-filter-heading">
            <Icon name="filter" />
            <strong>{activeFilterCount ? `${activeFilterCount} active filters` : 'No filters active'}</strong>
          </div>
          {children}
          <button type="button" className="secondary-button" disabled={activeFilterCount === 0} onClick={onResetFilters}>
            Reset Filters
          </button>
        </aside>
      </div>
    </OverlayShell>
  );
}
