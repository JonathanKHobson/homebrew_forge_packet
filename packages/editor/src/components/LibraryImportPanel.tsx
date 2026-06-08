import { useRef, useState } from 'react';
import { createLibraryAsset } from '../api/client.js';
import type { CreateLibraryAssetRequest, EditorProject } from '../domain/editorTypes.js';
import { formatCount } from '../domain/uiText.js';
import { Field } from './Field.js';

interface LibraryImportPanelProps {
  project: EditorProject | null;
  onProjectLoaded: (project: EditorProject) => void;
  onStatus: (message: string) => void;
}

interface LibraryImportSummary {
  rows: number;
  importable: number;
  imported: number;
  skipped: number;
  warnings: string[];
}

export function LibraryImportPanel({ project, onProjectLoaded, onStatus }: LibraryImportPanelProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<'dry-run' | 'import' | ''>('');
  const [summary, setSummary] = useState<LibraryImportSummary | null>(null);

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
      onStatus('Choose or paste a gallery asset CSV before importing.');
      return;
    }
    setBusy(dryRun ? 'dry-run' : 'import');
    try {
      const rows = parseCsvRecords(content);
      const warnings: string[] = [];
      let imported = 0;
      let skipped = 0;
      let latestActiveProject: EditorProject | null = null;
      const requests = rows.map((row, index) => requestFromRow(row, index + 2, project, warnings));
      for (const request of requests) {
        if (!request) {
          skipped += 1;
          continue;
        }
        if (!dryRun) {
          const result = await createLibraryAsset(request);
          if (!project || result.setCode === project.setCode) {
            latestActiveProject = result;
          }
        }
        imported += 1;
      }
      if (latestActiveProject) {
        onProjectLoaded(latestActiveProject);
      }
      const nextSummary = {
        rows: rows.length,
        importable: requests.filter(Boolean).length,
        imported,
        skipped,
        warnings
      };
      setSummary(nextSummary);
      onStatus(`${dryRun ? 'Dry-run analyzed' : 'Imported'} ${formatCount(imported, 'gallery asset')}. ${formatCount(skipped, 'row')} skipped.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="library-import-panel">
      <div className="library-import-grid">
        <Field label="Source file">
          <div className="inline-file-picker">
            <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" className="secondary-button" disabled={busy !== ''} onClick={() => fileInput.current?.click()}>
              Choose file
            </button>
            <a className="tertiary-link-button" href="/api/asset?path=csv_templates%2Flibrary_assets_template.csv" download>
              Template CSV
            </a>
            {fileName ? <span>{fileName}</span> : null}
          </div>
        </Field>
        <Field label="Default target">
          <input value={project ? `${project.setCode} - ${project.setName}` : 'No active set loaded'} readOnly />
        </Field>
      </div>

      <Field label="Gallery asset CSV">
        <textarea
          value={content}
          rows={7}
          spellCheck={false}
          placeholder="set_code,art_id,asset_type,source_mode,source_url,file_path,artist,license,permission_status,assigned_card_ids,assigned_variant_ids,notes"
          onChange={(event) => setContent(event.target.value)}
        />
      </Field>

      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(true)}>
          {busy === 'dry-run' ? 'Checking...' : 'Dry run'}
        </button>
        <button type="button" className="primary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(false)}>
          {busy === 'import' ? 'Importing...' : 'Import gallery assets'}
        </button>
      </div>

      {summary ? (
        <div className="import-summary">
          <strong>Gallery import audit</strong>
          <span>{summary.importable} importable / {summary.skipped} skipped / {formatCount(summary.rows, 'row')}</span>
          <span>{formatCount(summary.warnings.length, 'warning')}</span>
          {summary.warnings.slice(0, 3).map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function requestFromRow(row: Record<string, string>, rowNumber: number, project: EditorProject | null, warnings: string[]): CreateLibraryAssetRequest | null {
  const setCode = valueFor(row, ['set_code', 'setCode', 'set']) || project?.setCode || '';
  const sourceMode = normalizeSourceMode(valueFor(row, ['source_mode', 'sourceMode', 'mode']), row);
  const sourceUrl = valueFor(row, ['source_url', 'sourceUrl', 'url']);
  const filePath = valueFor(row, ['file_path', 'filePath', 'path', 'local_path', 'localPath']);
  const dataUri = valueFor(row, ['data_uri', 'dataUri']);
  const artId = valueFor(row, ['art_id', 'artId', 'asset_id', 'assetId', 'id']);
  if (!setCode) {
    warnings.push(`Row ${rowNumber}: no target set_code and no active set is loaded.`);
    return null;
  }
  if (sourceMode === 'url' && !sourceUrl) {
    warnings.push(`Row ${rowNumber}: URL asset is missing source_url.`);
    return null;
  }
  if (sourceMode === 'local' && !filePath) {
    warnings.push(`Row ${rowNumber}: local asset is missing file_path.`);
    return null;
  }
  if (sourceMode === 'upload' && !dataUri) {
    warnings.push(`Row ${rowNumber}: upload asset is missing data_uri.`);
    return null;
  }
  return {
    setCode,
    artId,
    assetType: valueFor(row, ['asset_type', 'assetType', 'type']) || 'art',
    sourceMode,
    dataUri: dataUri || undefined,
    filename: valueFor(row, ['filename', 'file_name', 'fileName']) || undefined,
    filePath: filePath || undefined,
    sourceUrl: sourceUrl || undefined,
    artist: valueFor(row, ['artist', 'source_artist', 'sourceArtist']),
    license: valueFor(row, ['license']),
    permissionStatus: valueFor(row, ['permission_status', 'permissionStatus', 'permission']) || 'needs_review',
    notes: valueFor(row, ['notes', 'note']),
    assignedCardIds: resolveCardAssignments(row, project, rowNumber, warnings),
    assignedVariantIds: resolveVariantAssignments(row, project, rowNumber, warnings)
  };
}

function normalizeSourceMode(value: string, row: Record<string, string>): CreateLibraryAssetRequest['sourceMode'] {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'upload' || normalized === 'url' || normalized === 'local') {
    return normalized;
  }
  if (valueFor(row, ['data_uri', 'dataUri'])) {
    return 'upload';
  }
  if (valueFor(row, ['source_url', 'sourceUrl', 'url'])) {
    return 'url';
  }
  return 'local';
}

function resolveCardAssignments(row: Record<string, string>, project: EditorProject | null, rowNumber: number, warnings: string[]): string[] {
  const tokens = splitList(valueFor(row, ['assigned_card_ids', 'assignedCardIds', 'assigned_cards', 'assignedCards', 'cards', 'card_ids', 'cardIds']));
  if (!tokens.length) {
    return [];
  }
  const resolved: string[] = [];
  for (const token of tokens) {
    const card = project?.cards.find((candidate) => normalizeLookup(candidate.cardId) === normalizeLookup(token) || normalizeLookup(candidate.name) === normalizeLookup(token));
    if (card) {
      resolved.push(card.cardId);
    } else if (/^[A-Z0-9-]+$/i.test(token)) {
      resolved.push(token);
    } else {
      warnings.push(`Row ${rowNumber}: could not resolve assigned card "${token}".`);
    }
  }
  return unique(resolved);
}

function resolveVariantAssignments(row: Record<string, string>, project: EditorProject | null, rowNumber: number, warnings: string[]): string[] {
  const tokens = splitList(valueFor(row, ['assigned_variant_ids', 'assignedVariantIds', 'assigned_variants', 'assignedVariants', 'variant_ids', 'variantIds']));
  if (!tokens.length) {
    return [];
  }
  const variants =
    project?.cards.flatMap((card) =>
      card.variants.map((variant) => ({
        card,
        variant,
        keys: [
          variant.variantId,
          `${card.name}/${variant.displayName}`,
          `${card.name} (${variant.displayName})`,
          `${card.cardId}/${variant.displayName}`,
          `${card.cardId} (${variant.displayName})`
        ].map(normalizeLookup)
      }))
    ) ?? [];
  const resolved: string[] = [];
  for (const token of tokens) {
    const normalized = normalizeLookup(token);
    const exact = variants.find((candidate) => candidate.keys.includes(normalized));
    if (exact) {
      resolved.push(exact.variant.variantId);
      continue;
    }
    const displayMatches = variants.filter((candidate) => normalizeLookup(candidate.variant.displayName) === normalized);
    if (displayMatches.length === 1) {
      resolved.push(displayMatches[0].variant.variantId);
    } else if (/^[A-Z0-9-]+$/i.test(token)) {
      resolved.push(token);
    } else {
      warnings.push(`Row ${rowNumber}: could not resolve assigned variant "${token}".`);
    }
  }
  return unique(resolved);
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

function splitList(value: string): string[] {
  return value.split(/[;,|\n]+/).map((item) => item.trim()).filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeLookup(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseCsvRecords(value: string): Array<Record<string, string>> {
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
