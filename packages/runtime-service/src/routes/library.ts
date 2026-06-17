import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCsvRecords, type CsvRow } from '@homebrew-forge/forge';

export interface RuntimeUniverseSummary {
  id: string;
  name: string;
  description?: string;
  status?: string;
  tags?: string[];
  coverImageUrl?: string;
}

export interface RuntimeSetSummary {
  setCode: string;
  setName: string;
  universeId: string;
  status: string;
  tags: string[];
  cardCount: number;
  sortOrder: number;
}

export interface RuntimeLibraryState {
  universes: RuntimeUniverseSummary[];
  sets: RuntimeSetSummary[];
  selectedUniverseId: string;
  selectedSetCode: string;
}

interface LibraryFile {
  universes: RuntimeUniverseSummary[];
  sets: Array<{ setCode: string; universeId: string; sortOrder?: number }>;
}

export async function readRuntimeLibrary(repoRoot: string, selectedSetCode: string): Promise<RuntimeLibraryState> {
  const discoveredSets = await discoverSets(repoRoot);
  const persisted = await readLibraryFile(repoRoot);
  const fallbackUniverse: RuntimeUniverseSummary = {
    id: 'demo',
    name: 'Demo Project',
    description: 'Sample cards and renderer checks'
  };
  const universes = normalizeUniverses(persisted?.universes ?? [fallbackUniverse]);
  const defaultUniverseId = universes[0]?.id ?? fallbackUniverse.id;
  const persistedBySet = new Map((persisted?.sets ?? []).map((set) => [set.setCode.toUpperCase(), set]));

  const sets = discoveredSets
    .map((set, index) => {
      const persistedSet = persistedBySet.get(set.setCode);
      return {
        ...set,
        universeId: persistedSet?.universeId ?? defaultUniverseId,
        sortOrder: persistedSet?.sortOrder ?? index + 1
      };
    })
    .sort((left, right) => left.universeId.localeCompare(right.universeId) || left.sortOrder - right.sortOrder || left.setCode.localeCompare(right.setCode));

  for (const set of sets) {
    if (!universes.some((universe) => universe.id === set.universeId)) {
      universes.push({ id: set.universeId, name: titleFromId(set.universeId) });
    }
  }

  const selected = sets.find((set) => set.setCode === selectedSetCode.toUpperCase()) ?? sets[0];
  return {
    universes,
    sets,
    selectedUniverseId: selected?.universeId ?? universes[0]?.id ?? fallbackUniverse.id,
    selectedSetCode: selected?.setCode ?? selectedSetCode.toUpperCase()
  };
}

async function discoverSets(repoRoot: string): Promise<Array<Omit<RuntimeSetSummary, 'universeId' | 'sortOrder'>>> {
  const setsRoot = join(repoRoot, 'sets');
  const entries = await readdir(setsRoot, { withFileTypes: true });
  const summaries: Array<Omit<RuntimeSetSummary, 'universeId' | 'sortOrder'>> = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) {
      continue;
    }
    const setCode = entry.name.toUpperCase();
    const setRows = await tryReadCsv(join(setsRoot, entry.name, 'sets.csv'));
    const cardRows = await tryReadCsv(join(setsRoot, entry.name, 'cards.csv'));
    const setRow = setRows.find((row) => clean(row.set_code).toUpperCase() === setCode) ?? setRows[0];
    summaries.push({
      setCode,
      setName: clean(setRow?.set_name) || setCode,
      status: clean(setRow?.status) || 'draft',
      tags: cleanTags(setRow?.tags),
      cardCount: cardRows.length
    });
  }
  return summaries.sort((left, right) => left.setCode.localeCompare(right.setCode));
}

async function readLibraryFile(repoRoot: string): Promise<LibraryFile | undefined> {
  try {
    const content = await readFile(join(repoRoot, 'sets', 'library.json'), 'utf8');
    const parsed = JSON.parse(content) as Partial<LibraryFile>;
    return {
      universes: normalizeUniverses(parsed.universes ?? []),
      sets: (parsed.sets ?? [])
        .map((set) => ({
          setCode: clean(set.setCode).toUpperCase(),
          universeId: normalizeUniverseId(set.universeId),
          sortOrder: Number(set.sortOrder ?? 0) || undefined
        }))
        .filter((set) => set.setCode && set.universeId)
    };
  } catch {
    return undefined;
  }
}

async function tryReadCsv(path: string): Promise<CsvRow[]> {
  try {
    return parseCsvRecords(await readFile(path, 'utf8'));
  } catch {
    return [];
  }
}

function normalizeUniverses(universes: RuntimeUniverseSummary[]): RuntimeUniverseSummary[] {
  const seen = new Set<string>();
  return universes
    .map((universe) => ({
      id: normalizeUniverseId(universe.id || universe.name),
      name: clean(universe.name) || titleFromId(universe.id),
      description: clean(universe.description) || undefined,
      status: clean(universe.status) || 'draft',
      tags: cleanTags(universe.tags),
      coverImageUrl: clean(universe.coverImageUrl) || undefined
    }))
    .filter((universe) => {
      if (!universe.id || seen.has(universe.id)) {
        return false;
      }
      seen.add(universe.id);
      return true;
    });
}

function normalizeUniverseId(value: string | undefined): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'custom';
}

function titleFromId(value: string | undefined): string {
  return normalizeUniverseId(value)
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function cleanTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }
  return clean(value)
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}
