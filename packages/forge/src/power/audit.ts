import type { ReferenceCatalog } from '../reference/catalog.js';
import { loadProjectPowerConfig, resolvePowerTreatment } from './treatments.js';
import type { PowerConfig, PowerCoverageReport, PowerTreatmentKind } from './types.js';

export function auditPowerTreatments(catalog: ReferenceCatalog, config: PowerConfig = loadProjectPowerConfig()): PowerCoverageReport {
  const counts = zeroCounts();
  const treatmentSources = { term: 0, category: 0, uncovered: 0 };
  const byCategory: PowerCoverageReport['byCategory'] = {};
  const gaps: PowerCoverageReport['gaps'] = [];

  for (const term of catalog.terms) {
    const { treatment, source } = resolvePowerTreatment(term, config);
    const kind = treatment?.kind ?? 'uncovered';
    counts[kind] += 1;
    treatmentSources[source] += 1;
    byCategory[term.category] ??= zeroCounts();
    byCategory[term.category][kind] += 1;
    if (kind === 'needs-review' || kind === 'uncovered') {
      gaps.push({
        termId: term.id,
        name: term.name,
        category: term.category,
        status: term.status,
        treatmentKind: kind,
        source,
        rationale: treatment?.rationale ?? 'No power treatment is configured for this term.'
      });
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    totalTerms: catalog.terms.length,
    counts,
    treatmentSources,
    byCategory,
    gaps
  };
}

function zeroCounts(): Record<PowerTreatmentKind | 'uncovered', number> {
  return {
    direct: 0,
    formula: 0,
    contextual: 0,
    neutral: 0,
    'needs-review': 0,
    uncovered: 0
  };
}
