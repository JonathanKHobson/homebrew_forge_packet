export type SortDirection = 'asc' | 'desc';

export interface ListSortState<TOption extends string = string> {
  option: TOption;
  direction: SortDirection;
}

export interface ListSortOption<TOption extends string = string> {
  id: TOption;
  label: string;
  defaultDirection?: SortDirection;
}

export type ListSortValue = string | number | boolean | null | undefined;

export function sortStateForOption<TOption extends string>(option: ListSortOption<TOption>): ListSortState<TOption> {
  return { option: option.id, direction: option.defaultDirection ?? 'asc' };
}

export function activeSortOption<TOption extends string>(options: Array<ListSortOption<TOption>>, state: ListSortState<TOption>): ListSortOption<TOption> {
  return options.find((option) => option.id === state.option) ?? options[0]!;
}

export function sortItemsByState<TItem, TOption extends string>(
  items: TItem[],
  state: ListSortState<TOption>,
  selectors: Record<TOption, (item: TItem) => ListSortValue>,
  fallbackSelector?: (item: TItem) => ListSortValue
): TItem[] {
  const selector = selectors[state.option];
  const fallback = fallbackSelector ?? selector;
  return stableSort(items, (left, right) => {
    const primary = compareSortValues(selector(left), selector(right), state.direction);
    if (primary !== 0) {
      return primary;
    }
    return compareSortValues(fallback(left), fallback(right), 'asc');
  });
}

export function stableSort<TItem>(items: TItem[], compare: (left: TItem, right: TItem) => number): TItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => compare(left.item, right.item) || left.index - right.index)
    .map(({ item }) => item);
}

export function compareSortValues(left: ListSortValue, right: ListSortValue, direction: SortDirection = 'asc'): number {
  const order = direction === 'desc' ? -1 : 1;
  const leftEmpty = left === null || left === undefined || left === '';
  const rightEmpty = right === null || right === undefined || right === '';
  if (leftEmpty && rightEmpty) {
    return 0;
  }
  if (leftEmpty) {
    return 1;
  }
  if (rightEmpty) {
    return -1;
  }
  if (typeof left === 'number' || typeof right === 'number') {
    return ((Number(left) || 0) - (Number(right) || 0)) * order;
  }
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return (Number(Boolean(left)) - Number(Boolean(right))) * order;
  }
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }) * order;
}

const BASIC_LAND_NAMES = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);

export function isBasicLandCard(name: string | undefined, typeLine: string | undefined): boolean {
  const normalizedName = String(name ?? '').trim().toLowerCase();
  const normalizedType = String(typeLine ?? '').toLowerCase();
  return BASIC_LAND_NAMES.has(normalizedName) && normalizedType.includes('basic') && normalizedType.includes('land');
}

export function basicLandGroupKey(name: string | undefined, typeLine: string | undefined): string {
  return isBasicLandCard(name, typeLine) ? `basic:${String(name).trim().toLowerCase()}` : '';
}

export function activeFilterSummary(count: number, label = 'filter'): string {
  if (count <= 0) {
    return '';
  }
  return `${count} active ${count === 1 ? label : `${label}s`}`;
}
