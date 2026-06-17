import { useEffect, useRef, useState } from 'react';
import { createReference, fetchReference } from '../api/client.js';
import {
  REFERENCE_CATEGORIES,
  type CreateReferenceRequest,
  type ReferenceCatalog,
  type ReferenceCategory,
  type ReferenceOrigin,
  type ReferenceStatus,
  type ReferenceSystem,
  type ReferenceWorkflowStatus
} from '@homebrew-forge/forge/reference';
import { formatCount } from '../domain/uiText.js';
import { Field } from './Field.js';

interface ReferenceImportPanelProps {
  onStatus: (message: string) => void;
}

interface ReferenceImportSummary {
  rows: number;
  imported: number;
  skipped: number;
  warnings: string[];
}

export function ReferenceImportPanel({ onStatus }: ReferenceImportPanelProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [catalog, setCatalog] = useState<ReferenceCatalog | null>(null);
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<ReferenceWorkflowStatus>('draft');
  const [busy, setBusy] = useState<'load' | 'dry-run' | 'import' | ''>('');
  const [summary, setSummary] = useState<ReferenceImportSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setBusy('load');
      try {
        const nextCatalog = await fetchReference();
        if (!cancelled) {
          setCatalog(nextCatalog);
        }
      } catch (error) {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setBusy('');
        }
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setContent(await file.text());
    setFileName(file.name);
    setSummary(null);
    onStatus(`Loaded ${file.name}.`);
  }

  async function runImport(dryRun: boolean) {
    if (!content.trim()) {
      onStatus('Choose or paste reference CSV before importing.');
      return;
    }
    setBusy(dryRun ? 'dry-run' : 'import');
    try {
      const rows = parseReferenceCsvRecords(content);
      let imported = 0;
      let skipped = 0;
      const warnings: string[] = [];
      let nextCatalog = catalog;

      for (const [index, row] of rows.entries()) {
        const request = rowToReferenceRequest(row, workflowStatus);
        if (!request.name) {
          skipped += 1;
          warnings.push(`Row ${index + 2} is missing a reference name.`);
          continue;
        }
        const duplicate = nextCatalog?.terms.some((term) => term.category === request.category && term.name.toLowerCase() === request.name?.toLowerCase());
        if (duplicate) {
          skipped += 1;
          warnings.push(`Row ${index + 2}: ${request.name} already exists in ${request.category}.`);
          continue;
        }
        if (!dryRun) {
          const result = await createReference(request);
          nextCatalog = result.catalog;
        }
        imported += 1;
      }

      if (nextCatalog) {
        setCatalog(nextCatalog);
      }
      const nextSummary = { rows: rows.length, imported, skipped, warnings };
      setSummary(nextSummary);
      onStatus(`${dryRun ? 'Dry-run analyzed' : 'Imported'} ${formatCount(imported, 'reference')}. ${formatCount(skipped, 'row')} skipped.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="reference-import-panel">
      <div className="reference-import-grid">
        <Field label="Source file">
          <div className="inline-file-picker">
            <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" className="secondary-button" disabled={busy !== ''} onClick={() => fileInput.current?.click()}>
              Choose file
            </button>
            <a className="tertiary-link-button" href="/api/asset?path=csv_templates%2Freferences_template.csv" download>
              Template CSV
            </a>
            {fileName ? <span>{fileName}</span> : null}
          </div>
        </Field>
        <Field label="Save as">
          <select value={workflowStatus} onChange={(event) => setWorkflowStatus(event.target.value as ReferenceWorkflowStatus)}>
            <option value="draft">Draft references</option>
            <option value="final">Final references</option>
          </select>
        </Field>
      </div>

      <Field label="Reference CSV">
        <textarea value={content} rows={7} spellCheck={false} placeholder="name,category,definition,reminder_text,tags" onChange={(event) => setContent(event.target.value)} />
      </Field>

      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(true)}>
          {busy === 'dry-run' ? 'Checking...' : 'Dry run'}
        </button>
        <button type="button" className="primary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(false)}>
          {busy === 'import' ? 'Importing...' : 'Import references'}
        </button>
      </div>

      {summary ? (
        <div className="import-summary">
          <strong>Reference import audit</strong>
          <span>{summary.imported} importable / {summary.skipped} skipped / {formatCount(summary.rows, 'row')}</span>
          <span>{formatCount(summary.warnings.length, 'warning')}</span>
        </div>
      ) : null}
    </div>
  );
}

function rowToReferenceRequest(row: Record<string, string>, workflowStatus: ReferenceWorkflowStatus): CreateReferenceRequest {
  return {
    name: valueFor(row, ['name', 'term', 'keyword']),
    category: normalizeCategory(valueFor(row, ['category', 'type'])),
    definition: valueFor(row, ['definition', 'rules_text', 'rules']),
    reminderText: valueFor(row, ['reminder_text', 'reminderText', 'reminder']),
    typicalColors: splitList(valueFor(row, ['typical_colors', 'typicalColors', 'colors'])).map((color) => color.toUpperCase()),
    aliases: splitList(valueFor(row, ['aliases', 'alias'])),
    tags: splitList(valueFor(row, ['tags', 'tag'])),
    sourceNotes: valueFor(row, ['source_notes', 'sourceNotes', 'notes']),
    origin: normalizeOrigin(valueFor(row, ['origin'])),
    status: normalizeStatus(valueFor(row, ['status'])),
    system: normalizeSystem(valueFor(row, ['system'])),
    workflowStatus,
    details: {
      ruleNumber: valueFor(row, ['rule_number', 'ruleNumber', 'number']),
      sourceSet: valueFor(row, ['source_set', 'sourceSet', 'set']),
      components: valueFor(row, ['components']),
      designNotes: valueFor(row, ['design_notes', 'designNotes'])
    }
  };
}

function valueFor(row: Record<string, string>, aliases: string[]): string {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) {
      return String(value ?? '').trim();
    }
  }
  return '';
}

function normalizeCategory(value: string): ReferenceCategory {
  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  return REFERENCE_CATEGORIES.includes(normalized as ReferenceCategory) ? (normalized as ReferenceCategory) : 'homebrew';
}

function normalizeOrigin(value: string): ReferenceOrigin {
  return value === 'official' ? 'official' : 'homebrew';
}

function normalizeStatus(value: string): ReferenceStatus {
  const normalized = value.trim().toLowerCase();
  return ['current', 'legacy', 'retired', 'casual', 'homebrew'].includes(normalized) ? (normalized as ReferenceStatus) : 'homebrew';
}

function normalizeSystem(value: string): ReferenceSystem {
  return value === 'magic' ? 'magic' : 'homebrew';
}

function splitList(value: string): string[] {
  return value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseReferenceCsvRecords(value: string): Array<Record<string, string>> {
  const rows = parseCsvRows(value);
  const headers = rows[0] ?? [];
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function parseCsvRows(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(cell);
      cell = '';
      continue;
    }
    if (char === '\n') {
      row.push(cell);
      if (row.some((item) => item.trim())) {
        rows.push(row);
      }
      row = [];
      cell = '';
      continue;
    }
    if (char !== '\r') {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => item.trim())) {
    rows.push(row);
  }
  return rows;
}
