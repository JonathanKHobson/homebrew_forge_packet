import { useRef, useState } from 'react';
import { LIST_CATEGORY_OPTIONS, listCategoryDefaults, ownershipStatusLabel } from '../../domain/collectionLists.js';
import type { CollectionImportSummary, CollectionKind, CollectionListCategory, CollectionOwnershipStatus, CollectionPurpose, CollectionSourcePreset, CreateCollectionRequest, LibraryState } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { formatCount } from '../../domain/uiText.js';
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
  initialKind?: CollectionKind;
  initialListCategory?: CollectionListCategory;
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
  { value: 'scryfall', label: 'Scryfall' },
  { value: 'generic', label: 'Generic CSV' }
];

export function CreateCollectionOverlay({ library, selectedUniverseId, initialKind = 'binder', initialListCategory = 'general', onCreateCollection, onDryRunImport, onStatus, onClose }: CreateCollectionOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [collectionId, setCollectionId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [linkedUniverseId, setLinkedUniverseId] = useState(selectedUniverseId);
  const [gameId, setGameId] = useState('mtg');
  const [purpose, setPurpose] = useState<CollectionPurpose>('mixed');
  const [kind, setKind] = useState<CollectionKind>(initialKind);
  const [listCategory, setListCategory] = useState<CollectionListCategory>(initialListCategory);
  const [defaultOwnershipStatus, setDefaultOwnershipStatus] = useState<CollectionOwnershipStatus>(() => listCategoryDefaults(initialListCategory).defaultOwnershipStatus);
  const [defaultEntryTags, setDefaultEntryTags] = useState(() => listCategoryDefaults(initialListCategory).defaultTags.join('; '));
  const [defaultStarred, setDefaultStarred] = useState(Boolean(listCategoryDefaults(initialListCategory).defaultStarred));
  const [defaultFlagged, setDefaultFlagged] = useState(Boolean(listCategoryDefaults(initialListCategory).defaultFlagged));
  const [source, setSource] = useState<CollectionSourcePreset>('manabox');
  const [importPayload, setImportPayload] = useState<CreateCollectionImportPayload | undefined>();
  const [summary, setSummary] = useState<CollectionImportSummary | null>(null);
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = Boolean(collectionId || name || description || linkedUniverseId !== selectedUniverseId || gameId !== 'mtg' || purpose !== 'mixed' || kind !== initialKind || listCategory !== initialListCategory || importPayload);

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
      onStatus(`Dry-run analyzed ${formatCount(result.importedRows, 'row')}. ${formatCount(result.reviewRows, 'row')} ${result.reviewRows === 1 ? 'needs' : 'need'} review.`);
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
      kind,
      listCategory: kind === 'list' ? listCategory : 'general',
      defaultOwnershipStatus: kind === 'list' ? defaultOwnershipStatus : 'owned',
      defaultEntryTags: kind === 'list' ? defaultEntryTags.split(';').map((tag) => tag.trim()).filter(Boolean) : [],
      defaultStarred: kind === 'list' ? defaultStarred : false,
      defaultFlagged: kind === 'list' ? defaultFlagged : false,
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
        Dry run
      </button>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !name.trim()} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Creating...' : importPayload ? 'Create and import' : 'Create collection'}
      </button>
    </>
  );

  return (
    <OverlayShell title={kind === 'list' ? 'New List' : 'New Binder'} eyebrow="Create" subtitle="Create a collection organizer without adding cards to Sets, Cards, or Decks." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
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
          <div className="grid-2">
            <Field label="Organizer type">
              <select value={kind} onChange={(event) => { setKind(event.target.value as CollectionKind); markDirty(); }}>
                <option value="binder">Binder</option>
                <option value="list">List</option>
              </select>
            </Field>
            {kind === 'list' ? (
              <Field label="List category">
                <select
                  value={listCategory}
                  onChange={(event) => {
                    const next = event.target.value as CollectionListCategory;
                    const defaults = listCategoryDefaults(next);
                    setListCategory(next);
                    setDefaultOwnershipStatus(defaults.defaultOwnershipStatus);
                    setDefaultEntryTags(defaults.defaultTags.join('; '));
                    setDefaultStarred(Boolean(defaults.defaultStarred));
                    setDefaultFlagged(Boolean(defaults.defaultFlagged));
                    markDirty();
                  }}
                >
                  {LIST_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Ownership default">
                <input value="Owned physical or virtual collection" readOnly />
              </Field>
            )}
          </div>
          {kind === 'list' ? (
            <div className="collection-official-panel">
              <strong>List defaults</strong>
              <p className="workspace-copy">{listCategoryDefaults(listCategory).description}</p>
              <div className="grid-2">
                <Field label="Default ownership">
                  <select value={defaultOwnershipStatus} onChange={(event) => { setDefaultOwnershipStatus(event.target.value as CollectionOwnershipStatus); markDirty(); }}>
                    <option value="wanted">Wanted</option>
                    <option value="recommended">Recommended</option>
                    <option value="reference">Reference only</option>
                    <option value="proxy">Proxy</option>
                    <option value="homebrew_unprinted">Homebrew unprinted</option>
                    <option value="owned">Owned</option>
                  </select>
                </Field>
                <Field label="Default tags">
                  <input value={defaultEntryTags} placeholder="wishlist; combo; upgrade" onChange={(event) => { setDefaultEntryTags(event.target.value); markDirty(); }} />
                </Field>
              </div>
              <div className="grid-2">
                <label className="checkbox-row">
                  <input type="checkbox" checked={defaultStarred} onChange={(event) => { setDefaultStarred(event.target.checked); markDirty(); }} />
                  Star cards added to this list
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={defaultFlagged} onChange={(event) => { setDefaultFlagged(event.target.checked); markDirty(); }} />
                  Flag cards added to this list
                </label>
              </div>
              <p className="workspace-copy">Rows added here default to {ownershipStatusLabel(defaultOwnershipStatus).toLowerCase()} and inherit these tags.</p>
            </div>
          ) : null}
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
              <strong>Dry run summary</strong>
              <span>
                {summary.matchedRows} matched / {summary.reviewRows} review
              </span>
              <span>{formatCount(summary.warnings.length, 'warning')}</span>
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
