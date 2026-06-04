import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';
import { exportCockatricePackage } from '../src/exporters/cockatriceExporter.js';
import { loadForgeProject } from '../src/data/loadProject.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Cockatrice export', () => {
  it('writes parseable XML, custom-set images, and a ZIP package', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-cockatrice-'));

    const result = await exportCockatricePackage({
      project,
      rootDir: repoRoot,
      setCode: 'DEMO',
      outputRoot,
      zip: true
    });
    const xml = await readFile(result.xmlPath, 'utf8');
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    const zipInfo = await stat(result.zipPath ?? '');

    assert.equal(parsed.cockatrice_carddatabase.sets.set.name, 'DEMO');
    assert.equal(parsed.cockatrice_carddatabase.cards.card.length, 10);
    assert.ok(result.imagePaths.some((path) => path.endsWith('001_example-vanguard.png')));
    assert.ok(result.imagePaths.some((path) => path.endsWith('008_fourfold-mentor.png')));
    assert.ok(result.imagePaths.some((path) => path.endsWith('T02_full-art-soldier.png')));
    assert.ok(zipInfo.size > 1000);
  });
});
