interface FilteredEmptyStateProps {
  title: string;
  detail: string;
  showClearSearch?: boolean;
  showResetFilters?: boolean;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
}

export function FilteredEmptyState({ title, detail, showClearSearch, showResetFilters, onClearSearch, onResetFilters }: FilteredEmptyStateProps) {
  return (
    <div className="empty-list filtered-empty">
      <strong>{title}</strong>
      <span>{detail}</span>
      {showClearSearch || showResetFilters ? (
        <div className="empty-actions">
          {showClearSearch ? (
            <button type="button" className="secondary-button" onClick={onClearSearch}>
              Clear Search
            </button>
          ) : null}
          {showResetFilters ? (
            <button type="button" className="secondary-button" onClick={onResetFilters}>
              Reset Filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
