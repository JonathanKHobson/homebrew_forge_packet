import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessCardPower, auditPowerTreatments, loadProjectPowerConfig, type CardPowerAssessment } from '../src/power/index.js';
import type { CardFaceRecord, CardRecord } from '../src/domain/schemas.js';
import { defaultReferenceCatalog } from '../src/reference/catalog.js';

const catalog = defaultReferenceCatalog();

describe('card power assessment', () => {
  it('flags a highly efficient cheap creature as likely overpowered', () => {
    const assessment = assessCardPower({
      card: card({ rarity: 'common' }),
      face: face({ manaCost: '{G}', typeLine: 'Creature - Beast', oracleText: 'Flying', power: '3', toughness: '3' }),
      referenceCatalog: catalog
    });

    assert.equal(assessment.label, 'Likely Overpowered');
    assert.ok(assessment.score >= 75);
    assert.ok(assessment.balanceDelta > 2);
    assert.ok(assessment.contributions.some((contribution) => contribution.termId === 'keyword-ability:flying'));
    assert.ok(assessment.recommendations.some((recommendation) => recommendation.action === 'raise-mana'));
  });

  it('keeps expensive raw stats in relation to their allowed budget', () => {
    const assessment = assessCardPower({
      card: card({ rarity: 'rare' }),
      face: face({ manaCost: '{5}{G}{G}', typeLine: 'Creature - Beast', oracleText: 'Flying', power: '7', toughness: '7' }),
      referenceCatalog: catalog
    });

    assert.ok(['Low Rate', 'In Range'].includes(assessment.label), assessment.label);
    assert.ok(assessment.allowedBudget > assessment.effectValue);
    assert.ok(assessment.score < 55);
  });

  it('applies formula and contextual pattern contributions', () => {
    const assessment = assessCardPower({
      card: card({ rarity: 'uncommon' }),
      face: face({
        manaCost: '{2}{U}',
        typeLine: 'Creature - Human Wizard',
        oracleText: 'Ward {2}\nWhen this creature enters, scry 2, then draw a card.',
        power: '2',
        toughness: '3'
      }),
      referenceCatalog: catalog
    });

    assertContribution(assessment, 'pattern:ward-n:0', 0.45);
    assertContribution(assessment, 'pattern:scry-n:0', 0.5);
    assertContribution(assessment, 'pattern:draw-card:0', 1.5);
  });

  it('shows coverage gaps instead of silently scoring unreviewed keywords', () => {
    const assessment = assessCardPower({
      card: card({ rarity: 'rare' }),
      face: face({
        manaCost: '{2}{R}',
        typeLine: 'Creature - Elemental',
        oracleText: 'Cascade',
        power: '2',
        toughness: '2'
      }),
      referenceCatalog: catalog
    });

    assert.ok(assessment.coverageGaps.some((gap) => gap.termId === 'keyword-ability:cascade'));
    assert.ok(assessment.recognizedTerms.some((term) => term.termId === 'keyword-ability:cascade' && term.treatmentKind === 'needs-review'));
  });
});

describe('power treatment audit', () => {
  it('accounts for every reference term with an explicit treatment path', () => {
    const report = auditPowerTreatments(catalog, loadProjectPowerConfig());

    assert.equal(report.totalTerms, catalog.terms.length);
    assert.equal(report.counts.uncovered, 0);
    assert.ok(report.counts.direct > 0);
    assert.ok(report.counts.contextual > 0);
    assert.ok(report.counts.neutral > 0);
    assert.ok(report.counts['needs-review'] > 0);
  });
});

function card(patch: Partial<CardRecord> = {}): CardRecord {
  return {
    cardId: 'TST-001',
    setCode: 'TST',
    collectorNumber: '001',
    name: 'Test Card',
    layout: 'normal',
    mode: 'custom',
    rarity: 'common',
    colorIdentity: 'G',
    tags: [],
    status: 'draft',
    printCount: 1,
    ...patch
  };
}

function face(patch: Partial<CardFaceRecord> = {}): CardFaceRecord {
  return {
    cardId: 'TST-001',
    faceIndex: 0,
    faceName: 'Test Card',
    manaCost: '{1}{G}',
    typeLine: 'Creature - Human',
    oracleText: '',
    flavorText: '',
    power: '2',
    toughness: '2',
    colors: 'G',
    frameType: 'normal_green',
    artId: '',
    rulesTextSizeHint: 'auto',
    rulesTextReminderMode: 'auto',
    layoutVariant: 'normal',
    ...patch
  };
}

function assertContribution(assessment: CardPowerAssessment, id: string, points: number): void {
  const contribution = assessment.contributions.find((candidate) => candidate.id === id);
  assert.ok(contribution, `Missing contribution ${id}`);
  assert.equal(contribution.points, points);
}
