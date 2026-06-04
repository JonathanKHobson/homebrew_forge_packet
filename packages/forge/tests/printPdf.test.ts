import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadForgeProject } from '../src/data/loadProject.js';
import { exportPrintPdf } from '../src/exporters/printPdfExporter.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('Print PDF export', () => {
  it('writes a front-side 9-up playtest PDF for a set', async () => {
    const project = await loadForgeProject({ rootDir: repoRoot, setCode: 'DEMO' });
    const outputRoot = await mkdtemp(join(tmpdir(), 'homebrew-forge-print-'));

    const result = await exportPrintPdf({
      project,
      rootDir: repoRoot,
      setCode: 'DEMO',
      outputRoot,
      paper: 'letter',
      cardsPerPage: 9
    });
    const pdf = await readFile(result.pdfPath);
    const pdfInfo = await stat(result.pdfPath);

    assert.equal(result.cardCount, 16);
    assert.equal(result.pageCount, 2);
    assert.equal(result.profileId, 'print_letter_9up');
    assert.ok(result.imagePaths.some((path) => path.endsWith('001_example-vanguard.png')));
    assert.ok(pdfInfo.size > 1000);
    assert.equal(pdf.subarray(0, 4).toString('utf8'), '%PDF');
    assert.match(pdf.subarray(-2048).toString('latin1'), /%%EOF/);
  });
});
