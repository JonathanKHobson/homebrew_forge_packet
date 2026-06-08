import type { OfficialCardCatalogStatus } from './editorTypes.js';

export type OfficialCardSyncCadence = 'off' | 'daily' | 'weekly' | 'monthly';

export interface OfficialCardSyncSettings {
  autoSync: boolean;
  cadence: OfficialCardSyncCadence;
}

const OFFICIAL_CARD_SYNC_SETTINGS_KEY = 'homebrew-forge.officialCards.syncSettings';
const DEFAULT_OFFICIAL_CARD_SYNC_SETTINGS: OfficialCardSyncSettings = {
  autoSync: true,
  cadence: 'weekly'
};

const CADENCE_MS: Record<Exclude<OfficialCardSyncCadence, 'off'>, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000
};

export function readOfficialCardSyncSettings(): OfficialCardSyncSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_OFFICIAL_CARD_SYNC_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(OFFICIAL_CARD_SYNC_SETTINGS_KEY);
    if (!raw) {
      return DEFAULT_OFFICIAL_CARD_SYNC_SETTINGS;
    }
    const parsed = JSON.parse(raw) as Partial<OfficialCardSyncSettings>;
    return normalizeOfficialCardSyncSettings(parsed);
  } catch {
    return DEFAULT_OFFICIAL_CARD_SYNC_SETTINGS;
  }
}

export function writeOfficialCardSyncSettings(settings: OfficialCardSyncSettings): OfficialCardSyncSettings {
  const normalized = normalizeOfficialCardSyncSettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(OFFICIAL_CARD_SYNC_SETTINGS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function shouldAutoSyncOfficialCards(status: OfficialCardCatalogStatus | null, settings: OfficialCardSyncSettings, now = Date.now()): boolean {
  if (!settings.autoSync || settings.cadence === 'off') {
    return false;
  }
  if (!status?.prints.available || !status.oracle.available) {
    return true;
  }
  const syncedAt = [status.prints.syncedAt, status.oracle.syncedAt]
    .map((value) => Date.parse(value ?? ''))
    .filter((value) => Number.isFinite(value));
  if (syncedAt.length < 2) {
    return true;
  }
  return now - Math.min(...syncedAt) >= CADENCE_MS[settings.cadence];
}

export function officialCardSyncCadenceLabel(cadence: OfficialCardSyncCadence): string {
  return cadence === 'off' ? 'Manual only' : cadence === 'daily' ? 'Daily' : cadence === 'weekly' ? 'Weekly' : 'Monthly';
}

function normalizeOfficialCardSyncSettings(settings: Partial<OfficialCardSyncSettings>): OfficialCardSyncSettings {
  const cadence = settings.cadence === 'off' || settings.cadence === 'daily' || settings.cadence === 'monthly' ? settings.cadence : 'weekly';
  return {
    autoSync: typeof settings.autoSync === 'boolean' ? settings.autoSync : DEFAULT_OFFICIAL_CARD_SYNC_SETTINGS.autoSync,
    cadence
  };
}
