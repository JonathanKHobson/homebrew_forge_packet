import { useEffect, useRef, useState } from 'react';
import { importCollection } from '../api/client.js';
import type { CollectionImportContentFormat, CollectionImportMode, CollectionImportSummary, CollectionSourcePreset } from '../domain/editorTypes.js';
import { formatCount } from '../domain/uiText.js';
import { Field } from './Field.js';

interface CollectionImportPanelProps {
  defaultCollectionId?: string;
  onImported?: (collectionId: string) => void;
  onStatus: (message: string) => void;
}

const sourceOptions: Array<{ value: CollectionSourcePreset; label: string }> = [
  { value: 'manabox', label: 'ManaBox' },
  { value: 'tcgplayer', label: 'TCGplayer' },
  { value: 'dragonshield', label: 'Dragon Shield' },
  { value: 'delver', label: 'Delver Lens' },
  { value: 'generic', label: 'Generic list' }
];

export function CollectionImportPanel({ defaultCollectionId = 'current-cards', onImported, onStatus }: CollectionImportPanelProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [collectionId, setCollectionId] = useState(defaultCollectionId);
  const [name, setName] = useState('');
  const [source, setSource] = useState<CollectionSourcePreset>('manabox');
  const [contentFormat, setContentFormat] = useState<CollectionImportContentFormat>('csv');
  const [mode, setMode] = useState<CollectionImportMode>('append');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<'dry-run' | 'import' | ''>('');
  const [summary, setSummary] = useState<CollectionImportSummary | null>(null);
  const collectionIdError = collectionId.trim() ? '' : 'Collection ID is required.';
  const contentError = content.trim() ? '' : 'Choose a file or paste import data.';

  useEffect(() => {
    setCollectionId(defaultCollectionId);
  }, [defaultCollectionId]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const text = await file.text();
    const lowerName = file.name.toLowerCase();
    setContent(text);
    setFileName(file.name);
    setContentFormat(lowerName.endsWith('.cod') || lowerName.endsWith('.xml') ? 'cockatrice' : lowerName.endsWith('.txt') ? 'text' : 'csv');
    if (collectionId === 'current-cards') {
      setCollectionId(collectionIdFromFilename(file.name));
    }
    if (!name) {
      setName(titleFromFilename(file.name));
    }
    setSummary(null);
    onStatus(`Loaded ${file.name}.`);
  }

  async function runImport(dryRun: boolean) {
    if (!content.trim()) {
      onStatus('Choose or paste a scanner CSV before importing.');
      return;
    }
    if (!collectionId.trim()) {
      onStatus('Collection id is required.');
      return;
    }
    setBusy(dryRun ? 'dry-run' : 'import');
    try {
      const result = await importCollection({
        collectionId,
        name: name || undefined,
        source,
        contentFormat,
        mode,
        content,
        dryRun
      });
      setSummary(result.summary);
      onStatus(`${dryRun ? 'Dry-run analyzed' : 'Imported'} ${formatCount(result.summary.importedRows, 'row')}. ${formatCount(result.summary.reviewRows, 'row')} ${result.summary.reviewRows === 1 ? 'needs' : 'need'} review.`);
      if (!dryRun) {
        onImported?.(result.collection.metadata.collectionId);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="collection-import-panel">
      <div className="collection-import-grid">
        <Field label="Source file" hint="CSV, text, or Cockatrice XML">
          <div className="inline-file-picker">
            <input ref={fileInput} type="file" accept=".csv,.txt,.cod,.xml,text/csv,text/plain,text/xml,application/xml" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" className="secondary-button" disabled={busy !== ''} onClick={() => fileInput.current?.click()}>
              Choose file
            </button>
            {fileName ? <span>{fileName}</span> : null}
          </div>
        </Field>
        <Field label="Source">
          <select value={source} onChange={(event) => setSource(event.target.value as CollectionSourcePreset)}>
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Format">
          <select value={contentFormat} onChange={(event) => setContentFormat(event.target.value as CollectionImportContentFormat)}>
            <option value="csv">Scanner/generic CSV</option>
            <option value="text">Plain text list</option>
            <option value="cockatrice">Cockatrice .cod / XML</option>
          </select>
        </Field>
        <Field label="Collection ID" error={collectionIdError}>
          <input value={collectionId} onChange={(event) => setCollectionId(event.target.value)} />
        </Field>
        <Field label="Name">
          <input value={name} placeholder="Current cards" onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Mode">
          <select value={mode} onChange={(event) => setMode(event.target.value as CollectionImportMode)}>
            <option value="append">Append or update rows</option>
            <option value="replace">Replace collection</option>
          </select>
        </Field>
      </div>

      <Field label="Import data" error={contentError}>
        <textarea value={content} rows={6} placeholder="Paste scanner CSV, plain text list, or Cockatrice XML here." onChange={(event) => setContent(event.target.value)} />
      </Field>

      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(true)}>
          {busy === 'dry-run' ? 'Checking...' : 'Dry run'}
        </button>
        <button type="button" className="primary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(false)}>
          {busy === 'import' ? 'Importing...' : 'Import collection'}
        </button>
      </div>

      {summary ? (
        <div className="import-summary">
          <strong>{summary.dryRun ? 'Dry run' : 'Import'} summary</strong>
          <span>{fileName || summary.source}</span>
          <span>
            {summary.matchedRows} matched / {summary.reviewRows} review
          </span>
          <span>{formatCount(summary.warnings.length, 'warning')}</span>
        </div>
      ) : null}
    </div>
  );
}

function collectionIdFromFilename(value: string): string {
  return value
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'current-cards';
}

function titleFromFilename(value: string): string {
  return value
    .replace(/\.[^.]+$/, '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
