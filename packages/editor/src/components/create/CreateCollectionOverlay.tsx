import { useRef, useState } from 'react';
import type { CollectionImportSummary, CollectionPurpose, CollectionSourcePreset, CreateCollectionRequest, LibraryState } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { CollapsibleSection } from '../CollapsibleSection.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';
import { CreateFlowStatusMessage } from './CreateFlowStatusMessage.js';

export interface CreateCollectionImportPayload {
  source: CollectionSourcePreset;
  mode: 'append' | 'replace';
  content: string;
  filename: string;
}

interface CreateCollectionOverlayProps {
  library: LibraryState | null;
  selectedUniverseId: string;
  onCreateCollection: (request: CreateCollectionRequest, importPayload?: CreateCollectionImportPayload) => Promise<void>;
  onDryRunImport: (request: CreateCollectionRequest, importPayload: CreateCollectionImportPayload) => Promise<CollectionImportSummary>;
  onStatus: (message: string) => void;
  onClose: () => void;
}

const purposeOptions: Array<{ value: CollectionPurpose; label: string }> = [
  { value: 'owned', label: 'Owned Cards' },
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'homebrew_print_run', label: 'Homebrew Print Run' },
  { value: 'research', label: 'Research' },
  { value: 'mixed', label: 'Mixed' }
];

const sourceOptions: Array<{ value: CollectionSourcePreset; label: string }> = [
  { value: 'manabox', label: 'ManaBox' },
  { value: 'tcgplayer', label: 'TCGplayer' },
  { value: 'dragonshield', label: 'Dragon Shield' },
  { value: 'delver', label: 'Delver Lens' },
  { value: 'generic', label: 'Generic CSV' }
];

export function CreateCollectionOverlay({ library, selectedUniverseId, onCreateCollection, onDryRunImport, onStatus, onClose }: CreateCollectionOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [collectionId, setCollectionId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkedUniverseId, setLinkedUniverseId] = useState(selectedUniverseId);
  const [gameId, setGameId] = useState('mtg');
  const [purpose, setPurpose] = useState<CollectionPurpose>('mixed');
  const [source, setSource] = useState<CollectionSourcePreset>('manabox');
  const [importPayload, setImportPayload] = useState<CreateCollectionImportPayload | undefined>();
  const [summary, setSummary] = useState<CollectionImportSummary | null>(null);
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = Boolean(collectionId || name || description || linkedUniverseId !== selectedUniverseId || gameId !== 'mtg' || purpose !== 'mixed' || importPayload);

  function markDirty() {
    setFlowState('dirty');
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const content = await file.text();
    setImportPayload({
      source,
      mode: 'replace',
      content,
      filename: file.name
    });
    if (!name) {
      setName(titleFromFilename(file.name));
    }
    if (!collectionId) {
      setCollectionId(collectionIdFromFilename(file.name));
    }
    setSummary(null);
    markDirty();
    onStatus(`Attached ${file.name} to import into the new collection.`);
  }

  async function dryRun() {
    if (!importPayload) {
      return;
    }
    setFlowState('saving');
    setError('');
    try {
      const result = await onDryRunImport(buildRequest(), { ...importPayload, source });
      setSummary(result);
      setFlowState('dirty');
      onStatus(`Dry-run analyzed ${result.importedRows} rows. ${result.reviewRows} need review.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setFlowState('error');
      onStatus(message);
    }
  }

  async function submit() {
    setFlowState('saving');
    setError('');
    try {
      await onCreateCollection(buildRequest(), importPayload ? { ...importPayload, source } : undefined);
      setFlowState('saved');
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setFlowState('error');
      onStatus(message);
    }
  }

  function buildRequest(): CreateCollectionRequest {
    return {
      collectionId: collectionId || slugify(name),
      name,
      description,
      linkedUniverseId,
      gameId,
      purpose,
      source
    };
  }

  const footer = (
    <>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
      <button type="button" className="secondary-button icon-label-button" onClick={() => fileInputRef.current?.click()}>
        <Icon name="download" />
        Import CSV
      </button>
      <button type="button" className="secondary-button" disabled={!importPayload || flowState === 'saving'} onClick={() => void dryRun()}>
        Dry Run
      </button>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !name.trim()} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Creating...' : importPayload ? 'Create And Import' : 'Create Collection'}
      </button>
    </>
  );

  return (
    <OverlayShell title="New Collection" eyebrow="Create" subtitle="Create an isolated card list without adding cards to Sets, Cards, or Decks." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
      <CreateFlowStatusMessage state={flowState} error={error} />
      <div className="create-overlay-grid">
        <CollapsibleSection title="Collection Metadata" subtitle="Name, project, game, and purpose">
          <div className="grid-2">
            <Field label="Name">
              <input value={name} placeholder="Owned MTG Binder" onChange={(event) => { setName(event.target.value); markDirty(); }} />
            </Field>
            <Field label="Collection ID">
              <input value={collectionId} placeholder={slugify(name) || 'owned-mtg-binder'} onChange={(event) => { setCollectionId(event.target.value); markDirty(); }} />
            </Field>
          </div>
          <div className="grid-3">
            <Field label="Project">
              <select value={linkedUniverseId} onChange={(event) => { setLinkedUniverseId(event.target.value); markDirty(); }}>
                <option value="">None</option>
                {(library?.universes ?? []).map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Game">
              <select value={gameId} onChange={(event) => { setGameId(event.target.value); markDirty(); }}>
                <option value="mtg">Magic: The Gathering</option>
              </select>
            </Field>
            <Field label="Purpose">
              <select value={purpose} onChange={(event) => { setPurpose(event.target.value as CollectionPurpose); markDirty(); }}>
                {purposeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={description} rows={4} placeholder="Owned cards, inspiration pile, print run, or research context." onChange={(event) => { setDescription(event.target.value); markDirty(); }} />
          </Field>
        </CollapsibleSection>

        <CollapsibleSection title="Starting Import" subtitle="Optional scanner CSV to load after creation">
          <div className="grid-2">
            <Field label="Source">
              <select value={source} onChange={(event) => { setSource(event.target.value as CollectionSourcePreset); markDirty(); }}>
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode">
              <select value={importPayload?.mode ?? 'replace'} disabled={!importPayload} onChange={(event) => setImportPayload((current) => current ? { ...current, mode: event.target.value as CreateCollectionImportPayload['mode'] } : current)}>
                <option value="replace">Replace collection rows</option>
                <option value="append">Append/update collection rows</option>
              </select>
            </Field>
          </div>
          <div className="import-attachment-card">
            <Icon name="collections" />
            <span>
              <strong>{importPayload ? importPayload.filename : 'No CSV attached'}</strong>
              <small>{importPayload ? `${sourceLabel(source)} will import after collection creation.` : 'Attach a scanner CSV or create an empty collection.'}</small>
            </span>
            {importPayload ? (
              <button type="button" className="secondary-button" onClick={() => { setImportPayload(undefined); setSummary(null); markDirty(); }}>
                Remove
              </button>
            ) : null}
          </div>
          {summary ? (
            <div className="import-summary">
              <strong>Dry Run Summary</strong>
              <span>
                {summary.matchedRows} matched / {summary.reviewRows} review
              </span>
              <span>{summary.warnings.length} warnings</span>
            </div>
          ) : null}
        </CollapsibleSection>
      </div>
    </OverlayShell>
  );
}

function sourceLabel(source: CollectionSourcePreset): string {
  return sourceOptions.find((option) => option.value === source)?.label ?? source;
}

function collectionIdFromFilename(value: string): string {
  return slugify(value.replace(/\.[^.]+$/, '')) || 'new-collection';
}

function titleFromFilename(value: string): string {
  return value
    .replace(/\.[^.]+$/, '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
