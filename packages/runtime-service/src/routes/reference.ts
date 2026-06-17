import { loadReferenceCatalog } from '@homebrew-forge/forge';

export function readRuntimeReferenceCatalog(repoRoot: string) {
  return loadReferenceCatalog(repoRoot);
}
