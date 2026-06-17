import type { CardDraft } from './editorTypes.js';

const DRAFT_RECOVERY_STORAGE_KEY = 'homebrew-forge.recoveryDrafts.v1';
const DRAFT_RECOVERY_VERSION = 1;

interface DraftRecoverySnapshot {
  version: number;
  savedAt: string;
  drafts: CardDraft[];
}

interface DraftRecoveryReadResult {
  drafts: CardDraft[];
  error?: string;
}

interface DraftRecoveryWriteResult {
  ok: boolean;
  error?: string;
}

export function draftRecoveryKey(draft: Pick<CardDraft, 'cardId' | 'variantId'>): string {
  return `${draft.cardId}::${draft.variantId || 'primary'}`;
}

export function recoveredDraftsForSet(setCode: string): DraftRecoveryReadResult {
  const result = readDraftRecovery();
  return {
    drafts: result.drafts.filter((draft) => draft.setCode === setCode),
    error: result.error
  };
}

export function readRecoveredDrafts(): CardDraft[] {
  return readDraftRecovery().drafts;
}

export function writeDraftRecovery(drafts: CardDraft[]): DraftRecoveryWriteResult {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Browser storage is unavailable.' };
  }
  try {
    const unique = uniqueDrafts(drafts);
    if (!unique.length) {
      window.localStorage.removeItem(DRAFT_RECOVERY_STORAGE_KEY);
      return { ok: true };
    }
    const snapshot: DraftRecoverySnapshot = {
      version: DRAFT_RECOVERY_VERSION,
      savedAt: new Date().toISOString(),
      drafts: unique
    };
    window.localStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function writeRecoveredDrafts(drafts: CardDraft[]): boolean {
  return writeDraftRecovery(drafts).ok;
}

export function removeRecoveredDraft(cardId: string, variantId: string): boolean {
  const drafts = readRecoveredDrafts().filter((draft) => draftRecoveryKey(draft) !== draftRecoveryKey({ cardId, variantId }));
  return writeRecoveredDrafts(drafts);
}

function readDraftRecovery(): DraftRecoveryReadResult {
  if (typeof window === 'undefined') {
    return { drafts: [] };
  }
  try {
    const raw = window.localStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY);
    if (!raw) {
      return { drafts: [] };
    }
    const parsed = JSON.parse(raw) as Partial<DraftRecoverySnapshot>;
    if (parsed.version !== DRAFT_RECOVERY_VERSION || !Array.isArray(parsed.drafts)) {
      return { drafts: [] };
    }
    return { drafts: uniqueDrafts(parsed.drafts.filter(isRecoveredDraft)) };
  } catch (error) {
    return { drafts: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function uniqueDrafts(drafts: CardDraft[]): CardDraft[] {
  const byKey = new Map<string, CardDraft>();
  for (const draft of drafts) {
    byKey.set(draftRecoveryKey(draft), draft);
  }
  return [...byKey.values()];
}

function isRecoveredDraft(value: unknown): value is CardDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const draft = value as Partial<CardDraft>;
  return typeof draft.cardId === 'string' && draft.cardId.length > 0 && typeof draft.variantId === 'string' && typeof draft.setCode === 'string' && draft.setCode.length > 0;
}
