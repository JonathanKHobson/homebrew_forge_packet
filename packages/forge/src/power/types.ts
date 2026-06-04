import type { CardFaceRecord, CardRecord } from '../domain/schemas.js';
import type { ReferenceCategory, ReferenceCatalog, ReferenceTerm } from '../reference/catalog.js';

export type PowerTreatmentKind = 'direct' | 'formula' | 'contextual' | 'neutral' | 'needs-review';
export type PowerContributionKind = 'allowance' | 'effect' | 'drawback' | 'modifier' | 'coverage';
export type PowerAssessmentLabel = 'Underpowered' | 'Low Rate' | 'In Range' | 'Pushed' | 'Likely Overpowered' | 'Needs Review';
export type PowerRecommendationAction = 'raise-mana' | 'lower-mana' | 'increase-rarity' | 'add-drawback' | 'remove-effect' | 'add-effect' | 'review-terms' | 'simplify-common';

export interface PowerTermTreatment {
  kind: PowerTreatmentKind;
  value?: number;
  confidence: number;
  rationale: string;
  source: string;
}

export interface PowerCategoryTreatment extends PowerTermTreatment {
  category: ReferenceCategory;
}

export interface PowerPatternTreatment {
  id: string;
  termId?: string;
  label: string;
  kind: 'formula' | 'contextual';
  match: string;
  value?: number;
  base?: number;
  perUnit?: number;
  max?: number;
  rationale: string;
  source: string;
}

export interface PowerWeightsFile {
  version: 1;
  updatedAt: string;
  model: 'effect-minus-allowance';
  seedSources: string[];
  categoryTreatments: Partial<Record<ReferenceCategory, PowerTermTreatment>>;
  termTreatments: Record<string, PowerTermTreatment>;
}

export interface PowerPatternsFile {
  version: 1;
  updatedAt: string;
  patterns: PowerPatternTreatment[];
}

export interface PowerConfig {
  weights: PowerWeightsFile;
  patterns: PowerPatternsFile;
}

export interface PowerContribution {
  id: string;
  label: string;
  kind: PowerContributionKind;
  points: number;
  confidence: number;
  rationale: string;
  termId?: string;
  category?: ReferenceCategory;
  source?: string;
}

export interface PowerCoverageGap {
  termId: string;
  label: string;
  category: ReferenceCategory;
  sourceField?: string;
  treatmentKind: PowerTreatmentKind;
  reason: string;
}

export interface PowerRecommendation {
  action: PowerRecommendationAction;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CardPowerAssessment {
  score: number;
  label: PowerAssessmentLabel;
  confidence: number;
  allowedBudget: number;
  effectValue: number;
  balanceDelta: number;
  recommendations: PowerRecommendation[];
  contributions: PowerContribution[];
  coverageGaps: PowerCoverageGap[];
  recognizedTerms: Array<{
    termId: string;
    label: string;
    category: ReferenceCategory;
    treatmentKind: PowerTreatmentKind;
  }>;
  notes: string[];
}

export interface PowerAssessmentInput {
  card: CardRecord;
  face: CardFaceRecord;
  referenceCatalog: ReferenceCatalog;
  config?: PowerConfig;
}

export interface PowerCoverageReport {
  version: 1;
  generatedAt: string;
  totalTerms: number;
  counts: Record<PowerTreatmentKind | 'uncovered', number>;
  treatmentSources: Record<'term' | 'category' | 'uncovered', number>;
  byCategory: Record<string, Record<PowerTreatmentKind | 'uncovered', number>>;
  gaps: Array<{
    termId: string;
    name: string;
    category: ReferenceCategory;
    status: ReferenceTerm['status'];
    treatmentKind: PowerTreatmentKind | 'uncovered';
    source: 'term' | 'category' | 'uncovered';
    rationale: string;
  }>;
}
