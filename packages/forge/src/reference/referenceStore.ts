import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  createReferenceTermFromRequest,
  defaultReferenceCatalog,
  mergeReferenceTerms,
  referenceTermId,
  type CreateReferenceRequest,
  type CreateReferenceResult,
  type ReferenceCatalog,
  type ReferenceTerm
} from './catalog.js';
import { mergeOfficialCatalog, readOfficialRulesCatalog } from './officialStore.js';

export const CUSTOM_REFERENCE_FILE = join('reference', 'custom', 'references.json');

export interface CustomReferenceFile {
  version: 1;
  updatedAt: string;
  terms: ReferenceTerm[];
}

export function customReferenceFilePath(rootDir: string): string {
  return join(rootDir, CUSTOM_REFERENCE_FILE);
}

export function loadProjectReferenceCatalog(rootDir: string): ReferenceCatalog {
  const custom = readCustomReferenceFile(rootDir);
  const catalog = mergeOfficialCatalog(defaultReferenceCatalog(), rootDir);
  const withCustom = mergeReferenceTerms(catalog, custom.terms, custom.updatedAt);
  return {
    ...withCustom,
    rules: readOfficialRulesCatalog(rootDir) ?? withCustom.rules
  };
}

export async function createProjectReference(rootDir: string, request: CreateReferenceRequest): Promise<CreateReferenceResult> {
  const timestamp = new Date().toISOString();
  const term = createReferenceTermFromRequest(request, timestamp);
  const currentCatalog = loadProjectReferenceCatalog(rootDir);
  if (currentCatalog.terms.some((existing) => existing.id === term.id)) {
    throw new Error(`Reference "${term.name}" already exists in ${labelForCategory(term.category)}.`);
  }

  const currentFile = readCustomReferenceFile(rootDir);
  const nextFile: CustomReferenceFile = {
    version: 1,
    updatedAt: timestamp,
    terms: [...currentFile.terms, term]
  };
  await writeCustomReferenceFile(rootDir, nextFile);
  return {
    term,
    catalog: loadProjectReferenceCatalog(rootDir)
  };
}

export function readCustomReferenceFile(rootDir: string): CustomReferenceFile {
  const path = customReferenceFilePath(rootDir);
  if (!existsSync(path)) {
    return { version: 1, updatedAt: defaultReferenceCatalog().updatedAt, terms: [] };
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<CustomReferenceFile> | ReferenceTerm[];
  const rawTerms = Array.isArray(parsed) ? parsed : parsed.terms ?? [];
  const updatedAt = Array.isArray(parsed) ? new Date().toISOString() : parsed.updatedAt ?? new Date().toISOString();
  return {
    version: 1,
    updatedAt,
    terms: rawTerms.map((term) => normalizeStoredTerm(term, updatedAt))
  };
}

async function writeCustomReferenceFile(rootDir: string, file: CustomReferenceFile): Promise<void> {
  const path = customReferenceFilePath(rootDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

function normalizeStoredTerm(term: ReferenceTerm, updatedAt: string): ReferenceTerm {
  const normalized = createReferenceTermFromRequest(term, term.updatedAt ?? updatedAt);
  return {
    ...normalized,
    id: term.id ?? referenceTermId(normalized.category, normalized.name),
    createdAt: term.createdAt ?? normalized.createdAt,
    updatedAt: term.updatedAt ?? normalized.updatedAt
  };
}

function labelForCategory(category: string): string {
  return category.replace(/-/g, ' ');
}
