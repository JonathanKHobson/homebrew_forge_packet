export type CreateOverlayKind = 'card' | 'deck' | 'collection' | 'set' | 'project' | 'library';

export type CreateFlowStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export const createOverlayTitles: Record<CreateOverlayKind, string> = {
  card: 'New Card',
  deck: 'New Deck',
  collection: 'New Collection',
  set: 'New Set',
  project: 'New Project',
  library: 'New Library Asset'
};
