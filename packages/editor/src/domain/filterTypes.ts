export interface FilterOption {
  value: string;
  label: string;
}

export interface ActiveFilterDefinition<T> {
  value: T;
  defaultValue: T;
  isActive?: (value: T, defaultValue: T) => boolean;
}

export const CARD_STATUS_OPTIONS: FilterOption[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'playtest', label: 'Playtest' },
  { value: 'final', label: 'Final' },
  { value: 'cut', label: 'Cut' },
  { value: 'archived', label: 'Archived' }
];

export const DECK_STATUS_OPTIONS: FilterOption[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'draft', label: 'Draft' },
  { value: 'playtest', label: 'Playtest' },
  { value: 'final', label: 'Final' },
  { value: 'archived', label: 'Archived' }
];

export const PROJECT_STATUS_OPTIONS: FilterOption[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' }
];

export const SET_STATUS_OPTIONS: FilterOption[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'archived', label: 'Archived' }
];

export function countActiveFilters(definitions: ActiveFilterDefinition<unknown>[]): number {
  return definitions.filter((definition) => {
    if (definition.isActive) {
      return definition.isActive(definition.value, definition.defaultValue);
    }
    return Array.isArray(definition.value) || Array.isArray(definition.defaultValue)
      ? JSON.stringify(definition.value) !== JSON.stringify(definition.defaultValue)
      : definition.value !== definition.defaultValue;
  }).length;
}

export function normalizeFilterText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function includesFilterText(value: unknown, query: string): boolean {
  const needle = normalizeFilterText(query);
  return !needle || normalizeFilterText(value).includes(needle);
}

export function includesAnyFilterText(values: unknown[], query: string): boolean {
  const needle = normalizeFilterText(query);
  return !needle || values.some((value) => normalizeFilterText(value).includes(needle));
}

export function splitTagInput(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value);
  }
  return uniqueStrings(String(value ?? '').split(/[,;\n]+/));
}

export function joinTags(tags: string[] | undefined): string {
  return uniqueStrings(tags ?? []).join(', ');
}

export function matchesTagFilter(tags: string[] | undefined, query: string): boolean {
  const needles = splitTagInput(query).map(normalizeFilterText).filter(Boolean);
  if (!needles.length) {
    return true;
  }
  const haystack = (tags ?? []).map(normalizeFilterText);
  return needles.every((needle) => haystack.some((tag) => tag.includes(needle)));
}

export function matchesNumberQuery(value: string | number | undefined, query: string): boolean {
  const rawQuery = String(query ?? '').trim();
  if (!rawQuery) {
    return true;
  }

  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return false;
  }

  const valueNumber = Number(rawValue);
  const comparison = rawQuery.match(/^(<=|>=|<|>|=)?\s*(-?\d+(?:\.\d+)?)$/);
  if (!Number.isFinite(valueNumber) || !comparison) {
    return rawValue.toLowerCase().includes(rawQuery.toLowerCase());
  }

  const operator = comparison[1] ?? '=';
  const target = Number(comparison[2]);
  if (!Number.isFinite(target)) {
    return false;
  }

  if (operator === '<=') {
    return valueNumber <= target;
  }
  if (operator === '>=') {
    return valueNumber >= target;
  }
  if (operator === '<') {
    return valueNumber < target;
  }
  if (operator === '>') {
    return valueNumber > target;
  }
  return valueNumber === target;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = value.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(clean);
  }
  return result;
}
