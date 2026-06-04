import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  createReferenceTermFromRequest,
  mergeReferenceCatalogs,
  referenceTermId,
  type ReferenceCatalog,
  type ReferenceRuleEntry,
  type ReferenceRulesCatalog,
  type ReferenceSource,
  type ReferenceSourceSnapshot,
  type ReferenceTerm
} from './catalog.js';

export const OFFICIAL_REFERENCE_ROOT = join('reference', 'official');
export const OFFICIAL_CURRENT_DIR = join(OFFICIAL_REFERENCE_ROOT, 'current');
export const OFFICIAL_HISTORY_DIR = join(OFFICIAL_REFERENCE_ROOT, 'history');
export const OFFICIAL_REPORTS_DIR = join(OFFICIAL_REFERENCE_ROOT, 'reports');
export const OFFICIAL_CATALOG_FILE = join(OFFICIAL_CURRENT_DIR, 'catalog.json');
export const OFFICIAL_RULES_FILE = join(OFFICIAL_CURRENT_DIR, 'rules.json');
export const OFFICIAL_UPDATE_STATUS_FILE = join(OFFICIAL_CURRENT_DIR, 'update-status.json');

export interface OfficialReferenceSnapshot {
  version: 1;
  updatedAt: string;
  generatedAt: string;
  terms: ReferenceTerm[];
  sourceSnapshots: ReferenceSourceSnapshot[];
}

export interface ReferenceTermChange {
  id: string;
  before?: ReferenceTerm;
  after?: ReferenceTerm;
  fields: string[];
}

export interface ReferenceSyncDiff {
  added: ReferenceTerm[];
  removed: ReferenceTerm[];
  changed: ReferenceTermChange[];
  unchanged: number;
  reviewNeeded: ReferenceTerm[];
}

export interface ReferenceSyncReport {
  version: 1;
  generatedAt: string;
  source: string;
  dryRun: boolean;
  currentCounts: Record<string, number>;
  proposedCounts: Record<string, number>;
  diff: ReferenceSyncDiff;
  sourceSnapshots: ReferenceSourceSnapshot[];
}

export interface ReferenceUpdateStatus {
  version: 1;
  checkedAt: string;
  hasPendingUpdates: boolean;
  sources: Array<{
    id: string;
    label: string;
    current?: string;
    upstream?: string;
    changed: boolean;
  }>;
}

export function readOfficialReferenceSnapshot(rootDir: string): OfficialReferenceSnapshot | undefined {
  const path = join(rootDir, OFFICIAL_CATALOG_FILE);
  if (!existsSync(path)) {
    return undefined;
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as OfficialReferenceSnapshot;
  return {
    version: 1,
    updatedAt: parsed.updatedAt,
    generatedAt: parsed.generatedAt ?? parsed.updatedAt,
    sourceSnapshots: parsed.sourceSnapshots ?? [],
    terms: (parsed.terms ?? []).map((term) => createReferenceTermFromRequest(term, term.updatedAt ?? parsed.updatedAt))
  };
}

export function readOfficialRulesCatalog(rootDir: string): ReferenceRulesCatalog | undefined {
  const path = join(rootDir, OFFICIAL_RULES_FILE);
  if (!existsSync(path)) {
    return undefined;
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as ReferenceRulesCatalog;
  return {
    version: 1,
    updatedAt: parsed.updatedAt,
    effectiveDate: parsed.effectiveDate,
    sourceUrl: parsed.sourceUrl,
    sourceSnapshot: parsed.sourceSnapshot,
    entries: (parsed.entries ?? []).map(normalizeRuleEntry)
  };
}

export function loadOfficialReferenceCatalog(rootDir: string): ReferenceCatalog | undefined {
  const snapshot = readOfficialReferenceSnapshot(rootDir);
  if (!snapshot) {
    return undefined;
  }
  return {
    terms: snapshot.terms,
    updatedAt: snapshot.updatedAt,
    sourceSnapshots: snapshot.sourceSnapshots,
    rules: readOfficialRulesCatalog(rootDir),
    sources: [
      { id: 'official-snapshot', label: 'Reviewed official Homebrew Forge snapshot' },
      { id: 'scryfall-catalog', label: 'Official Magic catalog', url: 'https://scryfall.com/docs/api/catalogs' },
      { id: 'scryfall-token', label: 'Official token catalog', url: 'https://scryfall.com/search?q=layout%3Atoken' },
      { id: 'scryfall-oracle', label: 'Oracle text index', url: 'https://scryfall.com/docs/api/cards/search' },
      { id: 'wizards-rules', label: 'Wizards Comprehensive Rules', url: 'https://magic.wizards.com/rules' },
      { id: 'mtgjson', label: 'MTGJSON data files', url: 'https://mtgjson.com' }
    ]
  };
}

export function mergeOfficialCatalog(base: ReferenceCatalog, rootDir: string): ReferenceCatalog {
  const official = loadOfficialReferenceCatalog(rootDir);
  return official ? mergeReferenceCatalogs(base, official, official.updatedAt) : base;
}

export async function writeOfficialReferenceSnapshot(rootDir: string, snapshot: OfficialReferenceSnapshot, archiveCurrent = true): Promise<string> {
  if (archiveCurrent) {
    await archiveCurrentOfficialFiles(rootDir, snapshot.generatedAt);
  }
  const path = join(rootDir, OFFICIAL_CATALOG_FILE);
  await writeJson(path, snapshot);
  return path;
}

export async function writeOfficialRulesCatalog(rootDir: string, catalog: ReferenceRulesCatalog, archiveCurrent = true): Promise<string> {
  if (archiveCurrent) {
    await archiveCurrentOfficialFiles(rootDir, catalog.updatedAt);
  }
  const path = join(rootDir, OFFICIAL_RULES_FILE);
  await writeJson(path, catalog);
  return path;
}

export async function writeReferenceUpdateStatus(rootDir: string, status: ReferenceUpdateStatus): Promise<string> {
  const path = join(rootDir, OFFICIAL_UPDATE_STATUS_FILE);
  await writeJson(path, status);
  return path;
}

export async function writeReferenceReportPair(reportPath: string, report: ReferenceSyncReport | Record<string, unknown>, markdown: string): Promise<{ jsonPath: string; markdownPath: string }> {
  const base = reportPath.replace(/\.(json|md)$/i, '');
  const jsonPath = `${base}.json`;
  const markdownPath = `${base}.md`;
  await writeJson(jsonPath, report);
  await writeFileWithDir(markdownPath, `${markdown.trim()}\n`);
  return { jsonPath, markdownPath };
}

export async function archiveCurrentOfficialFiles(rootDir: string, timestamp: string): Promise<string | undefined> {
  const currentFiles = [OFFICIAL_CATALOG_FILE, OFFICIAL_RULES_FILE, OFFICIAL_UPDATE_STATUS_FILE];
  if (!currentFiles.some((relativePath) => existsSync(join(rootDir, relativePath)))) {
    return undefined;
  }
  const archiveDir = join(rootDir, OFFICIAL_HISTORY_DIR, safeTimestamp(timestamp));
  await mkdir(archiveDir, { recursive: true });
  for (const relativePath of currentFiles) {
    const sourcePath = join(rootDir, relativePath);
    if (existsSync(sourcePath)) {
      await copyFile(sourcePath, join(archiveDir, relativePath.split('/').at(-1) ?? 'snapshot.json'));
    }
  }
  return archiveDir;
}

export function buildReferenceDiff(currentTerms: ReferenceTerm[], proposedTerms: ReferenceTerm[]): ReferenceSyncDiff {
  const current = new Map(currentTerms.map((term) => [term.id, term]));
  const proposed = new Map(proposedTerms.map((term) => [term.id, term]));
  const added: ReferenceTerm[] = [];
  const removed: ReferenceTerm[] = [];
  const changed: ReferenceTermChange[] = [];
  let unchanged = 0;

  for (const term of proposedTerms) {
    const existing = current.get(term.id);
    if (!existing) {
      added.push(term);
      continue;
    }
    const fields = changedFields(existing, term);
    if (fields.length) {
      changed.push({ id: term.id, before: existing, after: term, fields });
    } else {
      unchanged += 1;
    }
  }

  for (const term of currentTerms) {
    if (!proposed.has(term.id) && term.origin === 'official') {
      removed.push(term);
    }
  }

  return {
    added,
    removed,
    changed,
    unchanged,
    reviewNeeded: proposedTerms.filter((term) => term.workflowStatus === 'draft' || term.tags.includes('review-needed'))
  };
}

export function addVersionHistory(currentTerms: ReferenceTerm[], proposedTerms: ReferenceTerm[], changedAt: string, sourceSnapshotId?: string): ReferenceTerm[] {
  const current = new Map(currentTerms.map((term) => [term.id, term]));
  return proposedTerms.map((term) => {
    const existing = current.get(term.id);
    if (!existing || !changedFields(existing, term).length) {
      return term;
    }
    return {
      ...term,
      versions: [
        ...(term.versions ?? []),
        ...(existing.versions ?? []),
        {
          changedAt,
          source: existing.source,
          sourceSnapshotId,
          status: existing.status,
          definition: existing.definition,
          reminderText: existing.reminderText,
          details: existing.details
        }
      ]
    };
  });
}

export function buildSyncReport(args: {
  source: string;
  dryRun: boolean;
  generatedAt: string;
  currentTerms: ReferenceTerm[];
  proposedTerms: ReferenceTerm[];
  sourceSnapshots: ReferenceSourceSnapshot[];
}): ReferenceSyncReport {
  return {
    version: 1,
    generatedAt: args.generatedAt,
    source: args.source,
    dryRun: args.dryRun,
    currentCounts: countByCategory(args.currentTerms),
    proposedCounts: countByCategory(args.proposedTerms),
    diff: buildReferenceDiff(args.currentTerms, args.proposedTerms),
    sourceSnapshots: args.sourceSnapshots
  };
}

export function renderReferenceSyncMarkdown(report: ReferenceSyncReport): string {
  const lines = [
    '# Reference Sync Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Source: ${report.source}`,
    `Dry run: ${report.dryRun ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    `- Added: ${report.diff.added.length}`,
    `- Changed: ${report.diff.changed.length}`,
    `- Removed: ${report.diff.removed.length}`,
    `- Review needed: ${report.diff.reviewNeeded.length}`,
    '',
    '## Proposed Counts',
    ''
  ];
  for (const [category, count] of Object.entries(report.proposedCounts).sort()) {
    lines.push(`- ${category}: ${count}`);
  }
  if (report.diff.added.length) {
    lines.push('', '## Added', '');
    for (const term of report.diff.added.slice(0, 80)) {
      lines.push(`- ${term.category}: ${term.name}`);
    }
  }
  if (report.diff.changed.length) {
    lines.push('', '## Changed', '');
    for (const change of report.diff.changed.slice(0, 80)) {
      lines.push(`- ${change.after?.category ?? change.before?.category}: ${change.after?.name ?? change.before?.name} (${change.fields.join(', ')})`);
    }
  }
  if (report.diff.reviewNeeded.length) {
    lines.push('', '## Review Needed', '');
    for (const term of report.diff.reviewNeeded.slice(0, 80)) {
      lines.push(`- ${term.category}: ${term.name}`);
    }
  }
  return lines.join('\n');
}

export function hashContent(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function sourceSnapshotId(source: ReferenceSource | string, kind: string, value: string): string {
  return `${source}:${kind}:${hashContent(value).slice(0, 12)}`;
}

function normalizeRuleEntry(entry: ReferenceRuleEntry): ReferenceRuleEntry {
  return {
    id: entry.id,
    kind: entry.kind,
    number: entry.number,
    title: entry.title,
    text: entry.text,
    sourceUrl: entry.sourceUrl,
    effectiveDate: entry.effectiveDate,
    relatedTermIds: entry.relatedTermIds ?? []
  };
}

function changedFields(before: ReferenceTerm, after: ReferenceTerm): string[] {
  const fields: Array<keyof ReferenceTerm> = ['name', 'category', 'status', 'source', 'definition', 'reminderText', 'typicalColors', 'sourceNotes', 'details', 'aliases', 'tags'];
  return fields.filter((field) => stableStringify(before[field]) !== stableStringify(after[field]));
}

function countByCategory(terms: ReferenceTerm[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const term of terms) {
    counts[term.category] = (counts[term.category] ?? 0) + 1;
  }
  return counts;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify([...value].sort());
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .filter(([, entryValue]) => entryValue !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
      )
    );
  }
  return JSON.stringify(value ?? null);
}

async function writeJson(path: string, payload: unknown): Promise<void> {
  await writeFileWithDir(path, `${JSON.stringify(payload, null, 2)}\n`);
}

async function writeFileWithDir(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

function safeTimestamp(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]+/g, '-').replace(/-+/g, '-');
}
