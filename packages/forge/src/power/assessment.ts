import { parseManaCostTokens } from '../domain/mana.js';
import type { CardFaceRecord, CardRecord } from '../domain/schemas.js';
import { extractReferenceLinks, type ExtractedReferenceLink } from '../reference/catalog.js';
import { loadProjectPowerConfig, resolvePowerTreatment } from './treatments.js';
import type { CardPowerAssessment, PowerAssessmentInput, PowerConfig, PowerContribution, PowerCoverageGap, PowerRecommendation } from './types.js';

const RARITY_HEADROOM: Record<CardRecord['rarity'], number> = {
  common: 1,
  uncommon: 1.05,
  rare: 1.15,
  mythic: 1.25,
  special: 1.15,
  bonus: 1.15,
  token: 1
};

export function assessCardPower(input: PowerAssessmentInput): CardPowerAssessment {
  const config = input.config ?? loadProjectPowerConfig();
  const typeInfo = parseTypeLine(input.face.typeLine);
  const notes: string[] = [];
  const contributions: PowerContribution[] = [];
  const coverageGaps: PowerCoverageGap[] = [];
  const recognizedTerms = new Map<string, CardPowerAssessment['recognizedTerms'][number]>();

  const allowance = manaAllowance(input.card, input.face, notes);
  contributions.push(...allowance.contributions);

  const stats = statsContribution(input.face, typeInfo.cardTypes, notes);
  contributions.push(...stats);

  contributions.push(...staticDrawbackContributions(input.face));
  contributions.push(...patternContributions(input.face, typeInfo.cardTypes, config));

  const links = extractReferenceLinks({
    catalog: input.referenceCatalog,
    textByField: {
      oracleText: input.face.oracleText,
      typeLine: input.face.typeLine,
      manaCost: input.face.manaCost
    },
    categories: ['keyword-ability', 'keyword-action', 'ability-word', 'action-phrase', 'token', 'counter', 'supertype', 'card-type', 'subtype', 'homebrew', 'mana-color', 'frame'],
    limit: 80
  });
  const contributedTermIds = new Set(contributions.map((contribution) => contribution.termId).filter(Boolean));

  for (const link of links) {
    if (link.kind !== 'reference-term') {
      continue;
    }
    const term = input.referenceCatalog.terms.find((candidate) => candidate.id === link.id);
    if (!term) {
      continue;
    }
    const { treatment } = resolvePowerTreatment(term, config);
    if (!treatment) {
      coverageGaps.push({
        termId: term.id,
        label: term.name,
        category: term.category,
        sourceField: link.sourceField,
        treatmentKind: 'needs-review',
        reason: 'No power treatment is configured for this term.'
      });
      continue;
    }
    recognizedTerms.set(term.id, {
      termId: term.id,
      label: term.name,
      category: term.category,
      treatmentKind: treatment.kind
    });
    if (treatment.kind === 'direct' && treatment.value !== undefined && !contributedTermIds.has(term.id) && shouldScoreDirectTerm(link, input.face)) {
      contributions.push({
        id: `term:${term.id}`,
        label: term.name,
        kind: treatment.value < 0 ? 'drawback' : 'effect',
        points: treatment.value,
        confidence: treatment.confidence,
        rationale: treatment.rationale,
        termId: term.id,
        category: term.category,
        source: treatment.source
      });
      contributedTermIds.add(term.id);
    }
    if (treatment.kind === 'needs-review') {
      coverageGaps.push({
        termId: term.id,
        label: term.name,
        category: term.category,
        sourceField: link.sourceField,
        treatmentKind: treatment.kind,
        reason: treatment.rationale
      });
    }
  }

  const effectValue = round(sum(contributions.filter((item) => item.kind !== 'allowance').map((item) => item.points)));
  const allowedBudget = round(allowance.allowedBudget);
  const balanceDelta = round(effectValue - allowedBudget);
  const confidence = confidenceFor(contributions, coverageGaps, notes);
  const score = clamp(Math.round(50 + balanceDelta * 12), 0, 100);
  const label = confidence < 0.55 || notes.some((note) => note.includes('variable')) ? 'Needs Review' : labelFor(score, balanceDelta);
  const recommendations = recommendationsFor({ card: input.card, face: input.face, typeInfo, confidence, balanceDelta, coverageGaps, score });

  return {
    score,
    label,
    confidence,
    allowedBudget,
    effectValue,
    balanceDelta,
    recommendations,
    contributions: contributions.map((contribution) => ({ ...contribution, points: round(contribution.points) })),
    coverageGaps: dedupeGaps(coverageGaps),
    recognizedTerms: [...recognizedTerms.values()].sort((a, b) => a.label.localeCompare(b.label)),
    notes
  };
}

function manaAllowance(card: CardRecord, face: CardFaceRecord, notes: string[]): { allowedBudget: number; contributions: PowerContribution[] } {
  const tokens = parseManaCostTokens(face.manaCost ?? '');
  const manaValue = sum(tokens.map(tokenManaValue));
  const variableTokens = tokens.filter((token) => /X|Y|Z/i.test(token));
  if (variableTokens.length) {
    notes.push('Mana cost contains variable symbols; score needs review.');
  }
  const base = Math.min(manaValue, 4) + Math.max(0, manaValue - 4) * 1.25;
  const coloredPips = tokens.filter((token) => /[WUBRG]/.test(token)).length;
  const distinctColors = new Set(tokens.join('').match(/[WUBRG]/g) ?? []).size;
  const hybridSymbols = tokens.filter((token) => token.includes('/')).length;
  const colorBonus = Math.max(0, coloredPips - 1) * 0.05 + Math.max(0, distinctColors - 1) * 0.05 - hybridSymbols * 0.05;
  const rarityMultiplier = RARITY_HEADROOM[card.rarity] ?? 1;
  const allowedBudget = Math.max(0, base * rarityMultiplier + colorBonus);
  const contributions: PowerContribution[] = [
    {
      id: 'allowance:mana',
      label: 'Mana value budget',
      kind: 'allowance',
      points: base,
      confidence: variableTokens.length ? 0.45 : 0.9,
      rationale: 'Budget uses 1 point per mana through MV 4, then 1.25 per mana above 4.',
      source: 'sheet-seed'
    },
    {
      id: 'allowance:rarity',
      label: `${card.rarity} headroom`,
      kind: 'allowance',
      points: allowedBudget - base,
      confidence: 0.72,
      rationale: 'Rarity changes acceptable headroom for complexity and rate.',
      source: 'sheet-seed'
    },
    {
      id: 'allowance:color-restriction',
      label: 'Color restriction',
      kind: 'allowance',
      points: colorBonus,
      confidence: 0.7,
      rationale: 'Extra colored pips and distinct colors allow slightly stronger effects; hybrid costs reduce that allowance.',
      source: 'sheet-seed'
    }
  ];
  return {
    allowedBudget,
    contributions: contributions.filter((contribution) => contribution.points !== 0 || contribution.id === 'allowance:mana')
  };
}

function statsContribution(face: CardFaceRecord, cardTypes: string[], notes: string[]): PowerContribution[] {
  if (!cardTypes.includes('Creature') && !/\bVehicle\b/i.test(face.typeLine)) {
    return [];
  }
  const power = parseStat(face.power);
  const toughness = parseStat(face.toughness);
  if (power === undefined || toughness === undefined) {
    notes.push('Creature stats are missing or variable; score needs review.');
    return [];
  }
  return [
    {
      id: 'stats:pt',
      label: `${face.power}/${face.toughness} stats`,
      kind: 'effect',
      points: (power + toughness) * 0.5,
      confidence: 0.78,
      rationale: 'Raw stats use the original P+T multiplier.',
      source: 'sheet-seed'
    }
  ];
}

function staticDrawbackContributions(face: CardFaceRecord): PowerContribution[] {
  const text = face.oracleText ?? '';
  const contributions: PowerContribution[] = [];
  if (/\bdefender\b/i.test(text)) {
    contributions.push(drawback('drawback:defender', 'Defender', -0.3, 'Defender reduces attack pressure.'));
  }
  if (/\b(enters|enter) the battlefield tapped\b/i.test(text)) {
    contributions.push(drawback('drawback:etb-tapped', 'Enters tapped', -0.3, 'Entering tapped is a mild tempo drawback.'));
  }
  if (/\bactivate only as a sorcery\b/i.test(text)) {
    contributions.push(drawback('gate:sorcery-speed', 'Sorcery-speed activation', -0.2, 'Sorcery-speed activation limits flexibility.'));
  }
  if (/\bonce each turn\b/i.test(text)) {
    contributions.push(drawback('gate:once-each-turn', 'Once each turn', -0.25, 'Once-each-turn text limits repeatable ability abuse.'));
  }
  if (/\banother target\b/i.test(text)) {
    contributions.push(drawback('gate:another-only', 'Another target only', -0.1, 'Another-only targeting limits self-synergy.'));
  }
  if (/\{T\}|tap an untapped/i.test(text)) {
    contributions.push(drawback('gate:tap-activation', 'Tap-gated ability', -0.3, 'Tap activation creates a one-use-per-turn and summoning-sickness gate.'));
  }
  const activationCosts = [...text.matchAll(/:\s*[^.\n]*\{(\d+)\}/g)];
  for (const [index, match] of activationCosts.entries()) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) {
      contributions.push(drawback(`gate:activation-tax:${index}`, `Activation tax {${value}}`, -0.3 * value, 'Generic activation mana taxes reduce repeatable value.'));
    }
  }
  return contributions;
}

function patternContributions(face: CardFaceRecord, cardTypes: string[], config: PowerConfig): PowerContribution[] {
  const text = face.oracleText ?? '';
  const contributions: PowerContribution[] = [];
  for (const pattern of config.patterns.patterns) {
    const regex = new RegExp(pattern.match, 'gi');
    const matches = [...text.matchAll(regex)];
    for (const [index, match] of matches.entries()) {
      const numeric = Number(match[1] ?? '1');
      const points = pattern.value ?? Math.min(pattern.max ?? Number.POSITIVE_INFINITY, (pattern.base ?? 0) + (Number.isFinite(numeric) ? numeric : 1) * (pattern.perUnit ?? 0));
      contributions.push({
        id: `pattern:${pattern.id}:${index}`,
        label: pattern.label,
        kind: points < 0 ? 'drawback' : 'effect',
        points: cardTypes.includes('Instant') && pattern.id === 'draw-card' ? points + 0.5 : points,
        confidence: 0.65,
        rationale: cardTypes.includes('Instant') && pattern.id === 'draw-card' ? `${pattern.rationale} Instant timing adds 0.5.` : pattern.rationale,
        termId: pattern.termId,
        source: pattern.source
      });
    }
  }
  if (/\bshield counter\b/i.test(text)) {
    contributions.push({
      id: 'context:shield-counter',
      label: 'Shield counter',
      kind: 'effect',
      points: 0.9,
      confidence: 0.62,
      rationale: 'One shield counter is treated as one-shot protection from the seed table.',
      termId: 'counter:shield-counters',
      source: 'sheet-seed'
    });
  }
  if (/\bstart a mission\b/i.test(text)) {
    contributions.push({
      id: 'house:start-mission',
      label: 'Start a Mission',
      kind: 'effect',
      points: 2.5,
      confidence: 0.55,
      rationale: 'Mission setup value from the original house-mechanic seed table.',
      source: 'sheet-seed'
    });
  }
  if (/\bexploration counter\b/i.test(text)) {
    contributions.push({
      id: 'house:exploration-counter',
      label: 'Exploration counter',
      kind: 'effect',
      points: /\beach opponent\b/i.test(text) ? -0.25 : 0.45,
      confidence: 0.52,
      rationale: 'Exploration counter values come from the original house-mechanic seed table.',
      source: 'sheet-seed'
    });
  }
  return contributions;
}

function recommendationsFor(args: {
  card: CardRecord;
  face: CardFaceRecord;
  typeInfo: ReturnType<typeof parseTypeLine>;
  confidence: number;
  balanceDelta: number;
  coverageGaps: PowerCoverageGap[];
  score: number;
}): PowerRecommendation[] {
  const recommendations: PowerRecommendation[] = [];
  const wordCount = String(args.face.oracleText ?? '').split(/\s+/).filter(Boolean).length;
  if (args.confidence < 0.6 || args.coverageGaps.length > 0) {
    recommendations.push({
      action: 'review-terms',
      priority: 'high',
      message: `Review ${args.coverageGaps.length || 'the'} unweighted or variable term${args.coverageGaps.length === 1 ? '' : 's'} before trusting the score.`
    });
  }
  if (args.card.rarity === 'common' && (wordCount > 35 || args.coverageGaps.length > 0)) {
    recommendations.push({
      action: 'simplify-common',
      priority: 'medium',
      message: 'For a common, simplify the rules text or move the card up in rarity.'
    });
  }
  if (args.balanceDelta > 2.2) {
    recommendations.push({
      action: 'raise-mana',
      priority: 'high',
      message: 'Raise the mana value, remove a high-value effect, or add a real drawback.'
    });
    if (args.card.rarity === 'common' || args.card.rarity === 'uncommon') {
      recommendations.push({
        action: 'increase-rarity',
        priority: 'medium',
        message: 'The effect load is above the current rarity headroom; consider rare or mythic.'
      });
    }
  } else if (args.balanceDelta < -2.2 && args.score < 35) {
    recommendations.push({
      action: 'lower-mana',
      priority: 'medium',
      message: 'Lower the mana value or add a meaningful effect/stat boost.'
    });
  } else if (args.balanceDelta > 1.1) {
    recommendations.push({
      action: 'add-drawback',
      priority: 'medium',
      message: 'This is pushed for its cost; add a gate, drawback, or rarity bump.'
    });
  } else if (args.balanceDelta < -1.1) {
    recommendations.push({
      action: 'add-effect',
      priority: 'low',
      message: 'This may be low rate; add a small keyword, stat point, or card-selection rider.'
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      action: 'review-terms',
      priority: 'low',
      message: 'Rate looks in range for the current seed model; playtest interactions and set context next.'
    });
  }
  return recommendations;
}

function shouldScoreDirectTerm(link: ExtractedReferenceLink, face: CardFaceRecord): boolean {
  if (link.sourceField === 'typeLine') {
    return link.category === 'supertype';
  }
  if (link.sourceField !== 'oracleText') {
    return false;
  }
  const line = lineAt(face.oracleText ?? '', link.start);
  const escaped = escapeRegExp(link.matchedText);
  if (new RegExp(`^\\s*(?:${escaped})(?:\\s*(?:,|$|\\n)|\\.)`, 'i').test(line)) {
    return true;
  }
  if (new RegExp(`\\b(has|gain|gains|with)\\s+${escaped}\\b`, 'i').test(line)) {
    return !new RegExp(`\\b(target|destroy|exile|creature|creatures)\\s+with\\s+${escaped}\\b`, 'i').test(line);
  }
  return false;
}

function parseTypeLine(typeLine: string): { cardTypes: string[]; subtypes: string[]; supertypes: string[] } {
  const [left = '', right = ''] = typeLine.split(/\s+-\s+/, 2);
  const words = left.split(/\s+/).filter(Boolean);
  const cardTypes = words.filter((word) => ['Artifact', 'Battle', 'Creature', 'Enchantment', 'Instant', 'Kindred', 'Land', 'Planeswalker', 'Sorcery'].includes(word));
  const supertypes = words.filter((word) => !cardTypes.includes(word));
  return {
    cardTypes,
    supertypes,
    subtypes: right.split(/\s+/).filter(Boolean)
  };
}

function tokenManaValue(token: string): number {
  if (/^\d+$/.test(token)) {
    return Number(token);
  }
  if (/^[XYZ]$/i.test(token)) {
    return 0;
  }
  if (/^\d+\//.test(token)) {
    return Number(token.split('/')[0]);
  }
  return 1;
}

function parseStat(value: string | undefined): number | undefined {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function drawback(id: string, label: string, points: number, rationale: string): PowerContribution {
  return {
    id,
    label,
    kind: 'drawback',
    points,
    confidence: 0.65,
    rationale,
    source: 'sheet-seed'
  };
}

function confidenceFor(contributions: PowerContribution[], coverageGaps: PowerCoverageGap[], notes: string[]): number {
  const contributionConfidence = contributions.length ? sum(contributions.map((item) => item.confidence)) / contributions.length : 0.55;
  const gapPenalty = Math.min(0.45, coverageGaps.length * 0.06);
  const notePenalty = Math.min(0.25, notes.length * 0.08);
  return round(clamp(contributionConfidence - gapPenalty - notePenalty, 0.2, 0.95));
}

function labelFor(score: number, delta: number): CardPowerAssessment['label'] {
  if (delta <= -2.2 || score < 28) {
    return 'Underpowered';
  }
  if (delta <= -1.1 || score < 42) {
    return 'Low Rate';
  }
  if (delta < 1.1 && score <= 63) {
    return 'In Range';
  }
  if (delta < 2.2 && score <= 78) {
    return 'Pushed';
  }
  return 'Likely Overpowered';
}

function dedupeGaps(gaps: PowerCoverageGap[]): PowerCoverageGap[] {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    const key = `${gap.termId}:${gap.sourceField ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index);
  const end = text.indexOf('\n', index);
  return text.slice(start === -1 ? 0 : start + 1, end === -1 ? text.length : end);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
