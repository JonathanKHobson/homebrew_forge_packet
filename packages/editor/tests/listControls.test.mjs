import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const requireFromRoot = createRequire(join(repoRoot, 'package.json'));

test('list controls sort stably by selected option and fallback', async () => {
  const controls = await loadListControlsModule();
  const rows = [
    { name: 'Swamp', set: 'B', order: 2 },
    { name: 'Island', set: 'A', order: 1 },
    { name: 'Island', set: 'C', order: 3 }
  ];
  const sorted = controls.sortItemsByState(
    rows,
    { option: 'name', direction: 'asc' },
    { name: (row) => row.name },
    (row) => row.order
  );

  assert.deepEqual(sorted.map((row) => row.set), ['A', 'C', 'B']);
});

test('list controls keep empty sort values after real values', async () => {
  const controls = await loadListControlsModule();
  const rows = [{ name: 'Unknown', value: '' }, { name: 'Two', value: 2 }, { name: 'One', value: 1 }];
  const sorted = controls.sortItemsByState(rows, { option: 'value', direction: 'asc' }, { value: (row) => row.value }, (row) => row.name);

  assert.deepEqual(sorted.map((row) => row.name), ['One', 'Two', 'Unknown']);
});

test('basic land grouping only identifies exact basic land names', async () => {
  const controls = await loadListControlsModule();

  assert.equal(controls.basicLandGroupKey('Forest', 'Basic Land - Forest'), 'basic:forest');
  assert.equal(controls.basicLandGroupKey('Snow-Covered Forest', 'Basic Snow Land - Forest'), '');
  assert.equal(controls.basicLandGroupKey('Forest Bear', 'Creature - Bear'), '');
});

async function loadListControlsModule() {
  const typescript = requireFromRoot('typescript');
  const source = await readFile(join(repoRoot, 'packages/editor/src/domain/listControls.ts'), 'utf8');
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022
    }
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { exports: module.exports, module }, { filename: 'listControls.cjs' });
  return module.exports;
}
