import type { ListSortOption, ListSortState, SortDirection } from '../../domain/listControls.js';
import { activeSortOption } from '../../domain/listControls.js';

interface SortMenuProps<TOption extends string> {
  label?: string;
  options: Array<ListSortOption<TOption>>;
  state: ListSortState<TOption>;
  onChange: (state: ListSortState<TOption>) => void;
}

export function SortMenu<TOption extends string>({ label = 'Sort', options, state, onChange }: SortMenuProps<TOption>) {
  const active = activeSortOption(options, state);
  const directionLabel = state.direction === 'asc' ? 'ascending' : 'descending';
  return (
    <label className="sort-menu-control" title={`${label}: ${active.label}, ${directionLabel}`}>
      <span>{label}</span>
      <select
        value={`${state.option}:${state.direction}`}
        aria-label={`${label} order`}
        onChange={(event) => {
          const [option, direction] = event.target.value.split(':') as [TOption, SortDirection];
          onChange({ option, direction });
        }}
      >
        {options.map((option) => (
          <option key={`${option.id}:asc`} value={`${option.id}:asc`}>
            {option.label} ↑
          </option>
        ))}
        {options.map((option) => (
          <option key={`${option.id}:desc`} value={`${option.id}:desc`}>
            {option.label} ↓
          </option>
        ))}
      </select>
    </label>
  );
}
