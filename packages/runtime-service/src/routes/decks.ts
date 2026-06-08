import {
  createDeck,
  exportDeckCockatrice,
  exportDeckPlainText,
  importDeck,
  listDecks,
  saveDeck,
  type CreateDeckRequest,
  type ImportDeckRequest,
  type SaveDeckRequest
} from '@homebrew-forge/forge';
import { RuntimeRouteError } from './errors.js';

export async function createRuntimeDeck(repoRoot: string, request: CreateDeckRequest) {
  const deck = await createDeck(repoRoot, request);
  return { decks: await listDecks(repoRoot), deck };
}

export async function saveRuntimeDeck(repoRoot: string, request: SaveDeckRequest) {
  const deck = await saveDeck(repoRoot, request);
  return { decks: await listDecks(repoRoot), deck };
}

export async function exportRuntimeDeck(repoRoot: string, request: { deckId?: string; target?: 'text' | 'cockatrice' }) {
  if (!request.deckId) {
    throw new RuntimeRouteError(400, 'Missing deck id.');
  }
  return request.target === 'cockatrice' ? exportDeckCockatrice(repoRoot, request.deckId) : exportDeckPlainText(repoRoot, request.deckId);
}

export async function importRuntimeDeck(repoRoot: string, request: ImportDeckRequest) {
  const result = await importDeck(repoRoot, request);
  return { decks: await listDecks(repoRoot), result };
}
