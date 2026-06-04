import { useMemo, useRef, useState } from 'react';
import type { CardDraft, CreateLibraryAssetRequest, EditorProject } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { CollapsibleSection } from '../CollapsibleSection.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';
import { CreateFlowStatusMessage } from './CreateFlowStatusMessage.js';

interface CreateLibraryAssetOverlayProps {
  project: EditorProject | null;
  onCreateAsset: (request: CreateLibraryAssetRequest) => Promise<void>;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CreateLibraryAssetOverlay({ project, onCreateAsset, onStatus, onClose }: CreateLibraryAssetOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceMode, setSourceMode] = useState<CreateLibraryAssetRequest['sourceMode']>('upload');
  const [assetType, setAssetType] = useState('art');
  const [artId, setArtId] = useState('');
  const [filename, setFilename] = useState('');
  const [dataUri, setDataUri] = useState('');
  const [filePath, setFilePath] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [artist, setArtist] = useState('');
  const [license, setLicense] = useState('private reference');
  const [permissionStatus, setPermissionStatus] = useState('needs_review');
  const [notes, setNotes] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [assignedCardIds, setAssignedCardIds] = useState<string[]>([]);
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = Boolean(artId || dataUri || filePath || sourceUrl || artist || notes || assignedCardIds.length);

  const cards = useMemo(() => {
    const needle = cardQuery.trim().toLowerCase();
    return (project?.drafts ?? [])
      .filter((draft) => !needle || `${draft.name} ${draft.typeLine} ${draft.collectorNumber}`.toLowerCase().includes(needle))
      .slice(0, 120);
  }, [cardQuery, project?.drafts]);

  function markDirty() {
    setFlowState('dirty');
  }

  async function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }
    const nextDataUri = await readFileAsDataUri(file);
    setFilename(file.name);
    setDataUri(nextDataUri);
    if (!artId) {
      setArtId(file.name.replace(/\.[^.]+$/, '').toUpperCase().replace(/[^A-Z0-9-]+/g, '-'));
    }
    markDirty();
    onStatus(`Attached ${file.name}.`);
  }

  function toggleAssigned(card: CardDraft) {
    setAssignedCardIds((current) => (current.includes(card.cardId) ? current.filter((cardId) => cardId !== card.cardId) : [...current, card.cardId]));
    markDirty();
  }

  async function submit() {
    if (!project) {
      return;
    }
    setFlowState('saving');
    setError('');
    try {
      await onCreateAsset({
        setCode: project.setCode,
        artId,
        assetType,
        sourceMode,
        dataUri,
        filename,
        filePath,
        sourceUrl,
        artist,
        license,
        permissionStatus,
        notes,
        assignedCardIds
      });
      setFlowState('saved');
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);
      setFlowState('error');
      onStatus(message);
    }
  }

  const footer = (
    <>
      <input ref={fileInputRef} type="file" accept="image/*,.svg" hidden onChange={(event) => void handleUpload(event.target.files?.[0])} />
      <button type="button" className="secondary-button icon-label-button" onClick={() => fileInputRef.current?.click()}>
        <Icon name="download" />
        Upload File
      </button>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !project || !canSubmit(sourceMode, dataUri, filePath, sourceUrl, artId)} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Saving...' : 'Create Draft'}
      </button>
    </>
  );

  return (
    <OverlayShell title="New Library Asset" eyebrow="Create" subtitle="Import an art, icon, symbol, or frame source into the current set library." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
      <CreateFlowStatusMessage state={flowState} error={error} />
      <div className="create-overlay-grid">
        <CollapsibleSection title="Source" subtitle="Upload, URL, or local path">
          <div className="segmented-control create-mode-tabs" role="tablist" aria-label="Asset source">
            {(['upload', 'url', 'local'] as const).map((mode) => (
              <button key={mode} type="button" className={sourceMode === mode ? 'active' : ''} onClick={() => { setSourceMode(mode); markDirty(); }}>
                {mode === 'upload' ? 'Upload' : mode === 'url' ? 'URL' : 'Local Path'}
              </button>
            ))}
          </div>
          {sourceMode === 'upload' ? (
            <div className="upload-drop-zone">
              {dataUri ? <img src={dataUri} alt="" /> : <Icon name="assets" />}
              <span>
                <strong>{filename || 'No file selected'}</strong>
                <small>Use Upload File, then add metadata below.</small>
              </span>
            </div>
          ) : sourceMode === 'url' ? (
            <Field label="Source URL">
              <input value={sourceUrl} placeholder="https://..." onChange={(event) => { setSourceUrl(event.target.value); markDirty(); }} />
            </Field>
          ) : (
            <Field label="Local file path">
              <input value={filePath} placeholder="sets/DEMO/art/example.png" onChange={(event) => { setFilePath(event.target.value); markDirty(); }} />
            </Field>
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Metadata" subtitle="Asset identity and usage">
          <div className="grid-3">
            <Field label="Asset ID">
              <input value={artId} placeholder="DEMO-HERO-ART" onChange={(event) => { setArtId(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '-')); markDirty(); }} />
            </Field>
            <Field label="Asset type">
              <select value={assetType} onChange={(event) => { setAssetType(event.target.value); markDirty(); }}>
                <option value="art">Card art</option>
                <option value="icon">Icon</option>
                <option value="symbol">Set symbol</option>
                <option value="frame">Frame asset</option>
                <option value="reference">Reference image</option>
              </select>
            </Field>
            <Field label="Permission">
              <select value={permissionStatus} onChange={(event) => { setPermissionStatus(event.target.value); markDirty(); }}>
                <option value="owned">owned</option>
                <option value="licensed">licensed</option>
                <option value="needs_review">needs_review</option>
                <option value="placeholder">placeholder</option>
              </select>
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Artist / source note">
              <input value={artist} onChange={(event) => { setArtist(event.target.value); markDirty(); }} />
            </Field>
            <Field label="License">
              <input value={license} onChange={(event) => { setLicense(event.target.value); markDirty(); }} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={notes} rows={4} onChange={(event) => { setNotes(event.target.value); markDirty(); }} />
          </Field>
        </CollapsibleSection>

        <CollapsibleSection title="Assign To Cards" subtitle="Optional auto-assignment to existing cards">
          <label className="search-field overlay-search">
            <Icon name="search" />
            <input value={cardQuery} placeholder="Search cards..." onChange={(event) => setCardQuery(event.target.value)} />
          </label>
          <div className="overlay-card-picker compact">
            {cards.map((card) => (
              <button key={card.cardId} type="button" className={`overlay-select-row ${assignedCardIds.includes(card.cardId) ? 'selected' : ''}`} onClick={() => toggleAssigned(card)}>
                <Icon name="cards" />
                <span>
                  <strong>{card.name}</strong>
                  <small>{card.collectorNumber} - {card.typeLine || card.rarity}</small>
                </span>
              </button>
            ))}
            {!cards.length ? (
              <div className="preview-empty compact-empty">
                <strong>No cards found</strong>
                <span>Create the asset now and assign it later from the card editor.</span>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      </div>
    </OverlayShell>
  );
}

function canSubmit(sourceMode: CreateLibraryAssetRequest['sourceMode'], dataUri: string, filePath: string, sourceUrl: string, artId: string): boolean {
  if (!artId.trim()) {
    return false;
  }
  if (sourceMode === 'upload') {
    return Boolean(dataUri);
  }
  if (sourceMode === 'url') {
    return Boolean(sourceUrl.trim());
  }
  return Boolean(filePath.trim());
}

function readFileAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read upload file.'));
    reader.readAsDataURL(file);
  });
}
