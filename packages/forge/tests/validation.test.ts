import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadForgeProject } from '../src/data/loadProject.js';
import { validateForgeProject } from '../src/validation/validateProject.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('forge project validation', () => {
  it('loads and validates the DEMO set vertical-slice records', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const result = validateForgeProject(project);

    assert.equal(project.cards.length, 10);
    assert.equal(project.faces.length, 10);
    assert.equal(project.faces[0]?.rulesTextReminderMode, 'auto');
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it('reports missing face rows as validation errors', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const broken = {
      ...project,
      faces: project.faces.filter((face) => face.cardId !== 'DEMO-001')
    };

    const result = validateForgeProject(broken);

    assert.equal(result.valid, false);
    assert.ok(result.errors.includes('Card DEMO-001 has no face rows.'));
  });

  it('reports review warnings for unsupported layouts, token frames, mana syntax, and missing art', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const result = validateForgeProject({
      ...project,
      cards: [
        {
          cardId: 'QA-001',
          setCode: 'DEMO',
          collectorNumber: 'QA1',
          name: 'Review Saga',
          layout: 'saga',
          mode: 'imported',
          rarity: 'rare',
          tags: ['needs_review'],
          status: 'draft',
          printCount: 1
        }
      ],
      faces: [
        {
          cardId: 'QA-001',
          faceIndex: 0,
          faceName: 'Review Saga',
          manaCost: '@@@',
          typeLine: 'Token Enchantment - Saga',
          oracleText: 'Transform Review Saga.',
          colors: 'W',
          frameType: 'normal_creature',
          artId: 'MISSING-ART',
          rulesTextSizeHint: 'auto'
        }
      ],
      art: {}
    });

    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((warning) => warning.includes('unsupported layout saga')));
    assert.ok(result.warnings.some((warning) => warning.includes('unrecognized mana cost syntax')));
    assert.ok(result.warnings.some((warning) => warning.includes('token layout should use a token frame')));
    assert.ok(result.warnings.some((warning) => warning.includes('references missing art MISSING-ART')));
    assert.ok(result.warnings.some((warning) => warning.includes('mentions transform but is not marked as a transform layout')));
  });

  it('accepts compact mana costs without requiring braces', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const result = validateForgeProject({
      ...project,
      faces: project.faces.map((face, index) => (index === 0 ? { ...face, manaCost: '2W' } : face))
    });

    assert.equal(result.valid, true);
    assert.equal(result.warnings.some((warning) => warning.includes('mana cost')), false);
  });
});
