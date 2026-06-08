export type TransferEntity = 'cards' | 'decks' | 'collections' | 'sets' | 'projects' | 'library' | 'references';

export const transferEntityLabels: Record<TransferEntity, string> = {
  cards: 'Cards',
  decks: 'Decks',
  collections: 'Collections',
  sets: 'Sets',
  projects: 'Projects',
  library: 'Gallery',
  references: 'References'
};
