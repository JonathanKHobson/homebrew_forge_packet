import type { DashboardScopeKind } from './dashboardFacts.js';

export interface DashboardSettingsSnapshot<
  Filters extends object = Record<string, unknown>,
  WidgetId extends string = string,
  Visualization extends string = string
> {
  scopeKind: DashboardScopeKind;
  scopeId: string;
  query: string;
  advancedFilters: Filters;
  selectedCustomKeys: string[];
  widgetOrder: WidgetId[];
  hiddenWidgetIds: WidgetId[];
  widgetVisualizations: Record<string, Visualization>;
}

export interface SavedDashboardPreset<
  Filters extends object = Record<string, unknown>,
  WidgetId extends string = string,
  Visualization extends string = string
> {
  id: string;
  name: string;
  sourceKey: string;
  sourceLabel: string;
  createdAt: string;
  updatedAt: string;
  settings: DashboardSettingsSnapshot<Filters, WidgetId, Visualization>;
}

export interface DashboardSettingsStore<
  Filters extends object = Record<string, unknown>,
  WidgetId extends string = string,
  Visualization extends string = string
> {
  version: 1;
  lastSettings: DashboardSettingsSnapshot<Filters, WidgetId, Visualization>;
  presets: Array<SavedDashboardPreset<Filters, WidgetId, Visualization>>;
}

const DASHBOARD_SETTINGS_STORAGE_KEY = 'homebrew-forge.card-dashboard.settings.v1';

export function loadDashboardSettingsStore<
  Filters extends object,
  WidgetId extends string,
  Visualization extends string
>(
  defaultSettings: DashboardSettingsSnapshot<Filters, WidgetId, Visualization>,
  normalizeSettings: (settings: Partial<DashboardSettingsSnapshot<Filters, WidgetId, Visualization>>) => DashboardSettingsSnapshot<Filters, WidgetId, Visualization>
): DashboardSettingsStore<Filters, WidgetId, Visualization> {
  const fallback: DashboardSettingsStore<Filters, WidgetId, Visualization> = {
    version: 1,
    lastSettings: defaultSettings,
    presets: []
  };
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(DASHBOARD_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Partial<DashboardSettingsStore<Filters, WidgetId, Visualization>>;
    const presets = Array.isArray(parsed.presets)
      ? parsed.presets
          .filter((preset): preset is SavedDashboardPreset<Filters, WidgetId, Visualization> => Boolean(preset && typeof preset.id === 'string' && typeof preset.name === 'string'))
          .map((preset) => ({
            ...preset,
            sourceKey: preset.sourceKey || getDashboardSourceKey(preset.settings ?? defaultSettings),
            sourceLabel: preset.sourceLabel || getDashboardSourceLabel(preset.settings ?? defaultSettings),
            createdAt: preset.createdAt || new Date().toISOString(),
            updatedAt: preset.updatedAt || preset.createdAt || new Date().toISOString(),
            settings: normalizeSettings(preset.settings ?? defaultSettings)
          }))
      : [];
    return {
      version: 1,
      lastSettings: normalizeSettings(parsed.lastSettings ?? defaultSettings),
      presets
    };
  } catch {
    return fallback;
  }
}

export function saveDashboardSettingsStore<
  Filters extends object,
  WidgetId extends string,
  Visualization extends string
>(store: DashboardSettingsStore<Filters, WidgetId, Visualization>): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(DASHBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage can fail in private windows or constrained webviews. The live dashboard still works.
  }
}

export function createDashboardPreset<
  Filters extends object,
  WidgetId extends string,
  Visualization extends string
>(
  name: string,
  settings: DashboardSettingsSnapshot<Filters, WidgetId, Visualization>,
  sourceLabel: string
): SavedDashboardPreset<Filters, WidgetId, Visualization> {
  const now = new Date().toISOString();
  return {
    id: `dashboard-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    sourceKey: getDashboardSourceKey(settings),
    sourceLabel,
    createdAt: now,
    updatedAt: now,
    settings
  };
}

export function getDashboardSourceKey(settings: Pick<DashboardSettingsSnapshot, 'scopeKind' | 'scopeId' | 'selectedCustomKeys'>): string {
  if (settings.scopeKind === 'custom') {
    return `custom:${settings.selectedCustomKeys.slice().sort().join('|')}`;
  }
  return `${settings.scopeKind}:${settings.scopeId || 'all'}`;
}

function getDashboardSourceLabel(settings: Pick<DashboardSettingsSnapshot, 'scopeKind' | 'scopeId'>): string {
  if (settings.scopeKind === 'all') {
    return 'All sources';
  }
  if (settings.scopeKind === 'custom') {
    return 'Custom selection';
  }
  return settings.scopeId ? `${settings.scopeKind} ${settings.scopeId}` : `All ${settings.scopeKind}s`;
}
