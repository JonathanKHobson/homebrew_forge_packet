import { Button, EmptyState } from '../forge-ui/index.js';

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
    <EmptyState
      className="filtered-empty"
      title={title}
      detail={detail}
      actions={
        showClearSearch || showResetFilters ? (
          <>
          {showClearSearch ? (
            <Button onClick={onClearSearch}>
              Clear Search
            </Button>
          ) : null}
          {showResetFilters ? (
            <Button onClick={onResetFilters}>
              Reset Filters
            </Button>
          ) : null}
          </>
        ) : null
      }
    />
  );
}
