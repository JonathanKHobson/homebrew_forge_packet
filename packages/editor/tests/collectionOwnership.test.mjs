import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const requireFromRoot = createRequire(join(repoRoot, 'package.json'));

test('collection owner suggestions include Kyle and saved owners once', async () => {
  const ownership = await loadCollectionOwnershipModule();
  assert.deepEqual(Array.from(ownership.collectionOwnerSuggestions(['Eleni', 'Kyle'], [' eleni ', 'Alex'])), ['Kyle', 'Eleni', 'Alex']);
});

test('collection bulk edit applies owner only when enabled', async () => {
  const ownership = await loadCollectionOwnershipModule();
  const baseEntry = {
    collectionId: 'binder',
    entryId: 'entry-1',
    quantity: 1,
    ownerName: 'Kyle',
    cardName: 'Sol Ring',
    source: 'generic',
    matchStrategy: 'unresolved',
    reviewStatus: 'needs_review',
    tags: ['artifact']
  };

  const untouched = ownership.applyCollectionBulkEdit(baseEntry, {
    fields: {},
    tagMode: 'ignore',
    tags: [],
    noteMode: 'ignore'
  });
  const changed = ownership.applyCollectionBulkEdit(baseEntry, {
    fields: { ownerName: 'Eleni' },
    tagMode: 'ignore',
    tags: [],
    noteMode: 'ignore'
  });

  assert.equal(untouched.ownerName, 'Kyle');
  assert.equal(changed.ownerName, 'Eleni');
});

async function loadCollectionOwnershipModule() {
  const typescript = requireFromRoot('typescript');
  const source = await readFile(join(repoRoot, 'packages/editor/src/domain/collectionOwnership.ts'), 'utf8');
  const { outputText } = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022
    }
  });
  const module = { exports: {} };
  const require = (id) => {
    if (id === './officialCardMetadata.js') {
      return { collectionValueEstimateFromEntry: () => null };
    }
    return requireFromRoot(id);
  };
  vm.runInNewContext(outputText, { exports: module.exports, module, require }, { filename: 'collectionOwnership.cjs' });
  return module.exports;
}
