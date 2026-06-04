import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReferenceCategory, ReferenceTerm } from '../reference/catalog.js';
import type { PowerConfig, PowerPatternsFile, PowerTermTreatment, PowerWeightsFile } from './types.js';

export const POWER_WEIGHTS_FILE = join('reference', 'power', 'weights.json');
export const POWER_PATTERNS_FILE = join('reference', 'power', 'patterns.json');

export const DEFAULT_POWER_WEIGHTS: PowerWeightsFile = {
  version: 1,
  updatedAt: '2026-06-04T00:00:00.000Z',
  model: 'effect-minus-allowance',
  seedSources: [
    'Jonathan Kyle Hobson Preview__Weights_table.csv',
    'Homebrew Forge reference catalog',
    'Wizards keyword and comprehensive-rules references'
  ],
  categoryTreatments: {
    'keyword-ability': {
      kind: 'needs-review',
      confidence: 0.35,
      source: 'category-policy',
      rationale: 'Keyword abilities need direct weights or formulas before they can safely affect the score.'
    },
    'keyword-action': {
      kind: 'needs-review',
      confidence: 0.35,
      source: 'category-policy',
      rationale: 'Keyword actions need effect-specific parsing before they can safely affect the score.'
    },
    'ability-word': {
      kind: 'contextual',
      confidence: 0.55,
      source: 'category-policy',
      rationale: 'Ability words have no rules meaning; score the actual rules text that follows them.'
    },
    token: {
      kind: 'contextual',
      confidence: 0.55,
      source: 'category-policy',
      rationale: 'Token terms score when a card creates or modifies the token, not by name alone.'
    },
    counter: {
      kind: 'contextual',
      confidence: 0.55,
      source: 'category-policy',
      rationale: 'Counter terms score when a card places, uses, or removes the counter.'
    },
    subtype: {
      kind: 'neutral',
      confidence: 0.8,
      source: 'category-policy',
      rationale: 'Most subtypes do not change standalone card strength unless the rules text uses them.'
    },
    supertype: {
      kind: 'neutral',
      confidence: 0.8,
      source: 'category-policy',
      rationale: 'Most supertypes are identity or deck-building signals unless a term-specific treatment overrides them.'
    },
    'card-type': {
      kind: 'contextual',
      confidence: 0.65,
      source: 'category-policy',
      rationale: 'Card types affect timing, stats, and frame expectations through card-level scoring rules.'
    },
    homebrew: {
      kind: 'needs-review',
      confidence: 0.3,
      source: 'category-policy',
      rationale: 'Homebrew mechanics should be reviewed before they affect the score.'
    },
    'action-phrase': {
      kind: 'needs-review',
      confidence: 0.35,
      source: 'category-policy',
      rationale: 'Action phrases need effect-specific parsing before they can safely affect the score.'
    },
    'mana-color': {
      kind: 'neutral',
      confidence: 0.75,
      source: 'category-policy',
      rationale: 'Mana colors are handled by mana-cost and color-restriction scoring.'
    },
    frame: {
      kind: 'neutral',
      confidence: 0.7,
      source: 'category-policy',
      rationale: 'Frame terms do not change standalone card strength.'
    }
  },
  termTreatments: {
    'keyword-ability:flying': direct(0.7, 'Strong evergreen evasion from the original weight table.'),
    'keyword-ability:vigilance': direct(0.3, 'Evergreen combat flexibility from the original weight table.'),
    'keyword-ability:reach': direct(0.3, 'Defensive anti-evasion value from the original weight table.'),
    'keyword-ability:menace': direct(0.5, 'Moderate evergreen evasion from the original weight table.'),
    'keyword-ability:deathtouch': direct(0.7, 'Combat and blocking pressure from the original weight table.'),
    'keyword-ability:haste': direct(0.5, 'Tempo value from attacking or tapping immediately.'),
    'keyword-ability:lifelink': direct(0.6, 'Race-swinging evergreen value from the original weight table.'),
    'keyword-ability:flanking': direct(0.4, 'Classic evasion-adjacent blocker penalty from the original weight table.'),
    'keyword-ability:training': direct(0.3, 'Conditional growth from the original weight table.'),
    'keyword-ability:mentor': direct(0.4, 'Attacking-team growth from the original weight table.'),
    'keyword-ability:trample': direct(0.5, 'Combat damage carryover is a moderate evergreen upside.'),
    'keyword-ability:first-strike': direct(0.45, 'Combat survivability and attack pressure.'),
    'keyword-ability:double-strike': direct(1.0, 'Large combat multiplier that often doubles damage output.'),
    'keyword-ability:flash': direct(0.35, 'Timing flexibility, especially on creatures and interaction.'),
    'keyword-ability:hexproof': direct(0.9, 'Strong protection from targeted interaction.'),
    'keyword-ability:indestructible': direct(1.1, 'Strong resilience against destroy effects and damage.'),
    'keyword-ability:ward': {
      kind: 'formula',
      confidence: 0.72,
      source: 'seed-pattern',
      rationale: 'Ward scales with its cost; the pattern table converts the numeric value.'
    },
    'keyword-ability:toxic': {
      kind: 'formula',
      confidence: 0.58,
      source: 'seed-pattern',
      rationale: 'Toxic scales by the poison amount and needs combat context.'
    },
    'keyword-action:scry': {
      kind: 'formula',
      confidence: 0.7,
      source: 'seed-pattern',
      rationale: 'Scry scales by N using the original weight table.'
    },
    'keyword-action:surveil': {
      kind: 'formula',
      confidence: 0.68,
      source: 'seed-pattern',
      rationale: 'Surveil scales like card selection with graveyard upside.'
    },
    'keyword-action:investigate': {
      kind: 'direct',
      value: 0.8,
      confidence: 0.72,
      source: 'sheet-seed',
      rationale: 'Investigate creates a Clue, valued as delayed card draw in the original weight table.'
    },
    'keyword-action:goad': {
      kind: 'direct',
      value: 0.6,
      confidence: 0.65,
      source: 'sheet-seed',
      rationale: 'One-shot goad value from the original weight table.'
    },
    'keyword-action:amass': {
      kind: 'formula',
      confidence: 0.58,
      source: 'seed-pattern',
      rationale: 'Amass scales by the created or grown Army size.'
    },
    'supertype:legendary': {
      kind: 'direct',
      value: 0.1,
      confidence: 0.5,
      source: 'sheet-seed',
      rationale: 'Minor commander/tutoring identity upside from the original weight table.'
    }
  }
};

export const DEFAULT_POWER_PATTERNS: PowerPatternsFile = {
  version: 1,
  updatedAt: '2026-06-04T00:00:00.000Z',
  patterns: [
    {
      id: 'ward-n',
      termId: 'keyword-ability:ward',
      label: 'Ward',
      kind: 'formula',
      match: '\\bward\\s+\\{?(\\d+)\\}?',
      base: 0.05,
      perUnit: 0.2,
      max: 1.25,
      rationale: 'Ward {1}/{2}/{3} maps to 0.25/0.45/0.65 from the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'scry-n',
      termId: 'keyword-action:scry',
      label: 'Scry',
      kind: 'formula',
      match: '\\bscry\\s+(\\d+)',
      perUnit: 0.25,
      max: 1.5,
      rationale: 'Scry 1 is valued at 0.25 in the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'surveil-n',
      termId: 'keyword-action:surveil',
      label: 'Surveil',
      kind: 'formula',
      match: '\\bsurveil\\s+(\\d+)',
      perUnit: 0.3,
      max: 1.8,
      rationale: 'Surveil is card selection with graveyard setup.',
      source: 'model-seed'
    },
    {
      id: 'toxic-n',
      termId: 'keyword-ability:toxic',
      label: 'Toxic',
      kind: 'formula',
      match: '\\btoxic\\s+(\\d+)',
      perUnit: 0.22,
      max: 1.4,
      rationale: 'Poison pressure scales with the toxic value but still needs combat to matter.',
      source: 'model-seed'
    },
    {
      id: 'amass-n',
      termId: 'keyword-action:amass',
      label: 'Amass',
      kind: 'formula',
      match: '\\bamass(?:\\s+\\w+)?\\s+(\\d+)',
      perUnit: 0.45,
      max: 2.5,
      rationale: 'Amass creates or grows board stats and scales by N.',
      source: 'model-seed'
    },
    {
      id: 'draw-card',
      label: 'Draw a card',
      kind: 'contextual',
      match: '\\bdraw\\s+(?:a|one|1)\\s+cards?\\b',
      value: 1.5,
      rationale: 'One sorcery-speed/ETB draw is valued at 1.5 in the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'create-clue',
      label: 'Create a Clue',
      kind: 'contextual',
      match: '\\bcreate\\s+(?:a|one|1)\\s+clue\\b',
      value: 0.8,
      rationale: 'Clue creation is delayed card draw from the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'create-treasure',
      label: 'Create a Treasure',
      kind: 'contextual',
      match: '\\bcreate\\s+(?:a|one|1)\\s+treasure\\b',
      value: 1,
      rationale: 'Treasure creation is valued at 1.0 in the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'create-powerstone',
      label: 'Create a Powerstone',
      kind: 'contextual',
      match: '\\bcreate\\s+(?:a|one|1)\\s+powerstone\\b',
      value: 0.6,
      rationale: 'Powerstone creation is restricted colorless ramp from the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'bounce-nonland',
      label: 'Bounce nonland permanent',
      kind: 'contextual',
      match: '\\breturn\\s+target\\s+nonland\\s+permanent\\b[^.]*\\bto\\s+its\\s+owner',
      value: 1.2,
      rationale: 'Sorcery-speed bounce target nonland permanent is valued at 1.2 in the seed table.',
      source: 'sheet-seed'
    },
    {
      id: 'destroy-tapped',
      label: 'Destroy tapped creature',
      kind: 'contextual',
      match: '\\bdestroy\\s+target\\s+tapped\\s+creature\\b',
      value: 1.8,
      rationale: 'Destroy target tapped creature is valued at 1.8 in the seed table.',
      source: 'sheet-seed'
    }
  ]
};

export function loadProjectPowerConfig(rootDir?: string): PowerConfig {
  return {
    weights: readJsonIfPresent<PowerWeightsFile>(rootDir, POWER_WEIGHTS_FILE) ?? DEFAULT_POWER_WEIGHTS,
    patterns: readJsonIfPresent<PowerPatternsFile>(rootDir, POWER_PATTERNS_FILE) ?? DEFAULT_POWER_PATTERNS
  };
}

export function resolvePowerTreatment(term: ReferenceTerm, config: PowerConfig): { treatment?: PowerTermTreatment; source: 'term' | 'category' | 'uncovered' } {
  const termTreatment = config.weights.termTreatments[term.id];
  if (termTreatment) {
    return { treatment: termTreatment, source: 'term' };
  }
  const categoryTreatment = config.weights.categoryTreatments[term.category as ReferenceCategory];
  if (categoryTreatment) {
    return { treatment: categoryTreatment, source: 'category' };
  }
  return { source: 'uncovered' };
}

function direct(value: number, rationale: string): PowerTermTreatment {
  return {
    kind: 'direct',
    value,
    confidence: 0.7,
    source: 'sheet-seed',
    rationale
  };
}

function readJsonIfPresent<T>(rootDir: string | undefined, relativePath: string): T | undefined {
  if (!rootDir) {
    return undefined;
  }
  const path = join(rootDir, relativePath);
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
