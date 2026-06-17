import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseCsvRecords } from '../data/csv.js';
import type { DeckCardOption, DeckEntry, ResolvedDeckEntry } from './deckModel.js';

export const DECK_ROLE_IDS = [
  'ramp',
  'mana_source',
  'fixing',
  'draw',
  'targeted_removal',
  'board_wipe',
  'stack_interaction',
  'protection',
  'recursion',
  'tutor',
  'finisher',
  'enabler',
  'payoff',
  'synergy_piece',
  'utility',
  'threat',
  'land',
  'commander',
  'sideboard_tech'
] as const;

export type DeckRoleId = (typeof DECK_ROLE_IDS)[number];

export interface DeckRoleDatasetRow {
  cardName?: string;
  cardId?: string;
  oracleId?: string;
  scryfallId?: string;
  roles: string[];
  source: string;
  confidence: number;
  notes?: string;
}

const ROLE_SEED_ROWS: DeckRoleDatasetRow[] = [
  { cardName: 'Sol Ring', roles: ['ramp'], source: 'seed', confidence: 0.98 },
  { cardName: 'Arcane Signet', roles: ['ramp', 'fixing'], source: 'seed', confidence: 0.98 },
  { cardName: 'Command Tower', roles: ['mana_source', 'fixing'], source: 'seed', confidence: 0.95 },
  { cardName: 'Farseek', roles: ['ramp', 'fixing'], source: 'seed', confidence: 0.94 },
  { cardName: 'Cultivate', roles: ['ramp', 'fixing'], source: 'seed', confidence: 0.94 },
  { cardName: "Kodama's Reach", roles: ['ramp', 'fixing'], source: 'seed', confidence: 0.94 },
  { cardName: 'Swords to Plowshares', roles: ['targeted_removal'], source: 'seed', confidence: 0.96 },
  { cardName: 'Path to Exile', roles: ['targeted_removal'], source: 'seed', confidence: 0.96 },
  { cardName: 'Counterspell', roles: ['stack_interaction'], source: 'seed', confidence: 0.96 },
  { cardName: 'Wrath of God', roles: ['board_wipe'], source: 'seed', confidence: 0.96 },
  { cardName: 'Damnation', roles: ['board_wipe'], source: 'seed', confidence: 0.96 },
  { cardName: 'Demonic Tutor', roles: ['tutor'], source: 'seed', confidence: 0.96 },
  { cardName: 'Heroic Intervention', roles: ['protection'], source: 'seed', confidence: 0.96 },
  { cardName: 'Eternal Witness', roles: ['recursion', 'utility'], source: 'seed', confidence: 0.9 }
];

export async function readDeckRoleDataset(rootDir: string): Promise<DeckRoleDatasetRow[]> {
  try {
    const rows = parseCsvRecords(await readFile(join(rootDir, 'reference', 'deck_roles.csv'), 'utf8'));
    return [...ROLE_SEED_ROWS, ...rows.flatMap(rowToDeckRoleDatasetRow)];
  } catch {
    return ROLE_SEED_ROWS;
  }
}

export function applyDeckRoleInference(entry: ResolvedDeckEntry, dataset: DeckRoleDatasetRow[]): ResolvedDeckEntry {
  const manualRoles = normalizeRoles(entry.roles);
  if (manualRoles.length && entry.roleSource === 'manual') {
    return { ...entry, roles: manualRoles, roleSource: 'manual', roleConfidence: entry.roleConfidence ?? 1 };
  }

  const datasetMatch = findDatasetMatch(entry, dataset);
  if (datasetMatch?.roles.length) {
    return {
      ...entry,
      roles: normalizeRoles(datasetMatch.roles),
      roleSource: 'external_dataset',
      roleConfidence: datasetMatch.confidence
    };
  }

  const inferredRoles = inferRolesFromCard(entry.card);
  if (inferredRoles.length) {
    return { ...entry, roles: inferredRoles, roleSource: 'heuristic', roleConfidence: 0.58 };
  }

  return { ...entry, roles: manualRoles, roleSource: entry.roleSource ?? 'none' };
}

function rowToDeckRoleDatasetRow(row: Record<string, string>): DeckRoleDatasetRow[] {
  const roles = normalizeRoles(row.roles || row.role || row.deck_roles);
  if (!roles.length) {
    return [];
  }
  const confidence = Number(row.confidence);
  return [
    {
      cardName: clean(row.card_name || row.name),
      cardId: clean(row.card_id),
      oracleId: clean(row.oracle_id),
      scryfallId: clean(row.scryfall_id),
      roles,
      source: clean(row.source) || 'reference/deck_roles.csv',
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.85,
      notes: clean(row.notes)
    }
  ];
}

function findDatasetMatch(entry: DeckEntry, dataset: DeckRoleDatasetRow[]): DeckRoleDatasetRow | undefined {
  const normalizedName = normalizeName(entry.nameSnapshot);
  const normalizedCardId = normalizeName(entry.cardId);
  return dataset.find((row) => {
    const names = [row.cardName, row.cardId, row.oracleId, row.scryfallId].map(normalizeName).filter(Boolean);
    return names.includes(normalizedName) || names.includes(normalizedCardId);
  });
}

function inferRolesFromCard(card: DeckCardOption | undefined): string[] {
  if (!card) {
    return [];
  }
  const roles = new Set<string>();
  const name = normalizeName(card.name);
  const typeLine = card.typeLine.toLowerCase();
  const text = `${card.name} ${card.typeLine} ${card.oracleText} ${card.tags.join(' ')}`.toLowerCase();

  if (typeLine.includes('land')) {
    roles.add('land');
    roles.add('mana_source');
    if (/add .*mana|any color|chosen color|commander/.test(text)) {
      roles.add('fixing');
    }
  }
  if (/sol ring|arcane signet|fellwar stone|mind stone|talisman of|signet/.test(name) || /add \{?[wubrgc]\}?|add .*mana|treasure|search your library for.*land|put .*land.*battlefield/.test(text)) {
    roles.add('ramp');
  }
  if (/command tower|exotic orchard|path of ancestry|city of brass|mana confluence/.test(name)) {
    roles.add('mana_source');
    roles.add('fixing');
  }
  if (/draw (a|two|three|x|that many|cards?)|draw cards|card advantage|investigate/.test(text)) {
    roles.add('draw');
  }
  if (/destroy target|exile target|damage to any target|fight target|deals .* damage to target|return target .* to its owner's hand/.test(text)) {
    roles.add('targeted_removal');
  }
  if (/counter target|counterspell|can't be countered/.test(text)) {
    roles.add('stack_interaction');
  }
  if (/destroy all|exile all|each creature|all creatures|board wipe|wrath/.test(text)) {
    roles.add('board_wipe');
  }
  if (/hexproof|indestructible|protection from|phase out|prevent all|ward|cannot be the target/.test(text)) {
    roles.add('protection');
  }
  if (/return .* from your graveyard|return target .* graveyard|reanimate|escape|flashback|recursion/.test(text)) {
    roles.add('recursion');
  }
  if (/search your library for .* card|search your library for a card|tutor/.test(text)) {
    roles.add('tutor');
  }
  if (/win the game|each opponent loses|double strike|trample|cannot be blocked|finisher|wincon/.test(text)) {
    roles.add('finisher');
  }
  if (/whenever|if you do|as long as|the first time|trigger/.test(text)) {
    roles.add('enabler');
  }
  if (/gets \\+|create .* token|copy target|double|payoff/.test(text)) {
    roles.add('payoff');
  }
  if (typeLine.includes('creature') && !roles.has('finisher')) {
    roles.add('threat');
  }
  if (!roles.size && text.trim()) {
    roles.add('utility');
  }
  return normalizeRoles([...roles]);
}

function normalizeRoles(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(/[,;|\n]+/);
  const seen = new Set<string>();
  const roles: string[] = [];
  for (const role of raw) {
    const normalized = clean(role).toLowerCase().replace(/[\s-]+/g, '_');
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    roles.push(normalized);
  }
  return roles;
}

function normalizeName(value: unknown): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}
