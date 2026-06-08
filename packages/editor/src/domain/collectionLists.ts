import type { CollectionKind, CollectionListCategory, CollectionOwnershipStatus } from './editorTypes.js';

export type CollectionSurfaceKind = 'collections' | 'binders' | 'lists';

export const LIST_CATEGORY_OPTIONS: Array<{ value: CollectionListCategory; label: string; description: string; defaultOwnershipStatus: CollectionOwnershipStatus; defaultTags: string[]; defaultStarred?: boolean; defaultFlagged?: boolean }> = [
  { value: 'general', label: 'General List', description: 'A flexible list for project or collection planning.', defaultOwnershipStatus: 'reference', defaultTags: ['list'] },
  { value: 'wishlist', label: 'Wish List', description: 'Cards wanted but not owned yet.', defaultOwnershipStatus: 'wanted', defaultTags: ['wishlist'] },
  { value: 'recommendation', label: 'Recommendations', description: 'Cards recommended for future decisions.', defaultOwnershipStatus: 'recommended', defaultTags: ['recommended'] },
  { value: 'starred', label: 'Starred', description: 'Favorite cards gathered as a list.', defaultOwnershipStatus: 'reference', defaultTags: ['starred'], defaultStarred: true },
  { value: 'flagged', label: 'Flagged', description: 'Cards needing review or follow-up.', defaultOwnershipStatus: 'reference', defaultTags: ['flagged'], defaultFlagged: true },
  { value: 'gift', label: 'Gift List', description: 'Cards to buy, gift, or request.', defaultOwnershipStatus: 'wanted', defaultTags: ['gift'] }
];

export function surfaceLabel(surface: CollectionSurfaceKind): string {
  if (surface === 'binders') {
    return 'Binders';
  }
  if (surface === 'lists') {
    return 'Lists';
  }
  return 'Collections';
}

export function surfaceSingularLabel(surface: CollectionSurfaceKind): string {
  if (surface === 'binders') {
    return 'Binder';
  }
  if (surface === 'lists') {
    return 'List';
  }
  return 'Collection';
}

export function collectionKindForSurface(surface: CollectionSurfaceKind): CollectionKind | 'all' {
  if (surface === 'binders') {
    return 'binder';
  }
  if (surface === 'lists') {
    return 'list';
  }
  return 'all';
}

export function listCategoryLabel(category: CollectionListCategory | undefined): string {
  return LIST_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? 'General List';
}

export function listCategoryDefaults(category: CollectionListCategory) {
  return LIST_CATEGORY_OPTIONS.find((option) => option.value === category) ?? LIST_CATEGORY_OPTIONS[0]!;
}

export function ownershipStatusLabel(status: CollectionOwnershipStatus | undefined): string {
  if (status === 'wanted') {
    return 'Wanted';
  }
  if (status === 'recommended') {
    return 'Recommended';
  }
  if (status === 'reference') {
    return 'Reference';
  }
  if (status === 'proxy') {
    return 'Proxy';
  }
  if (status === 'homebrew_unprinted') {
    return 'Homebrew unprinted';
  }
  return 'Owned';
}

export function isOwnedStatus(status: CollectionOwnershipStatus | undefined): boolean {
  return !status || status === 'owned';
}
