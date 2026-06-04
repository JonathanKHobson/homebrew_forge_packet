import { useRef, useState } from 'react';
import type { CreateSetRequest, EditorProject, ImportCardsRequest, LibraryState } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { CollapsibleSection } from '../CollapsibleSection.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';
import { CreateFlowStatusMessage } from './CreateFlowStatusMessage.js';
import { SET_STATUS_OPTIONS, splitTagInput } from '../../domain/filterTypes.js';

export interface CreateSetImportPayload {
  format: ImportCardsRequest['format'];
  content: string;
  filename: string;
}

interface CreateSetOverlayProps {
  library: LibraryState | null;
  project: EditorProject | null;
  selectedUniverseId: string;
  onCreateSet: (request: CreateSetRequest, importPayload?: CreateSetImportPayload) => Promise<void>;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CreateSetOverlay({ library, project, selectedUniverseId, onCreateSet, onStatus, onClose }: CreateSetOverlayProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedUniverse = library?.universes.find((universe) => universe.id === selectedUniverseId);
  const [universeId, setUniverseId] = useState(selectedUniverseId);
  const [setCode, setSetCode] = useState('');
  const [setName, setSetName] = useState('');
  const [author, setAuthor] = useState(project?.designer ?? 'Jonathan Kyle Hobson');
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [importPayload, setImportPayload] = useState<CreateSetImportPayload | undefined>();
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = Boolean(universeId !== selectedUniverseId || setCode || setName || notes || tags || importPayload || status !== 'draft');

  function markDirty() {
    setFlowState('dirty');
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const filename = file.name;
    const content = await file.text();
    const lower = filename.toLowerCase();
    setImportPayload({
      filename,
      content,
      format: lower.endsWith('.xml') ? 'cockatrice' : lower.endsWith('.txt') ? 'planesculptors' : 'csv'
    });
    markDirty();
    onStatus(`Attached ${filename} to import after the set is created.`);
  }

  async function submit() {
    setFlowState('saving');
    setError('');
    try {
      await onCreateSet(
        {
          universeId,
          universeName: library?.universes.find((universe) => universe.id === universeId)?.name ?? selectedUniverse?.name,
          setCode,
          setName,
          author,
          status,
          tags: splitTagInput(tags),
          notes
        },
        importPayload
      );
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
      <input ref={fileInputRef} type="file" accept=".csv,.xml,.txt,text/csv,text/xml,application/xml,text/plain" hidden onChange={(event) => void handleFile(event.target.files?.[0])} />
      <button type="button" className="secondary-button icon-label-button" onClick={() => fileInputRef.current?.click()}>
        <Icon name="download" />
        Import Set File
      </button>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !setCode.trim() || !setName.trim() || !universeId} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Creating...' : 'Create Draft'}
      </button>
    </>
  );

  return (
    <OverlayShell title="New Set" eyebrow="Create" subtitle="Create the set shell first, with optional CSV/XML import into that new set." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
      <CreateFlowStatusMessage state={flowState} error={error} />
      <div className="create-overlay-grid">
        <CollapsibleSection title="Set Metadata" subtitle="Code, name, project, status, and author">
          <div className="grid-2">
            <Field label="Set code">
              <input value={setCode} maxLength={12} placeholder="SG1" onChange={(event) => { setSetCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); markDirty(); }} />
            </Field>
            <Field label="Set name">
              <input value={setName} placeholder="Stargate SG-1" onChange={(event) => { setSetName(event.target.value); markDirty(); }} />
            </Field>
          </div>
          <div className="grid-3">
            <Field label="Project">
              <select value={universeId} onChange={(event) => { setUniverseId(event.target.value); markDirty(); }}>
                <option value="">Choose project</option>
                {(library?.universes ?? []).map((universe) => (
                  <option key={universe.id} value={universe.id}>
                    {universe.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(event) => { setStatus(event.target.value); markDirty(); }}>
                {SET_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Author">
              <input value={author} onChange={(event) => { setAuthor(event.target.value); markDirty(); }} />
            </Field>
          </div>
          <Field label="Tags">
            <input value={tags} placeholder="draft, cube, commander" onChange={(event) => { setTags(event.target.value); markDirty(); }} />
          </Field>
          <Field label="Notes">
            <textarea value={notes} rows={4} placeholder="Optional set direction, import notes, or design constraints" onChange={(event) => { setNotes(event.target.value); markDirty(); }} />
          </Field>
        </CollapsibleSection>

        <CollapsibleSection title="Starting Import" subtitle="Optional bulk data to apply after creation">
          <div className="import-attachment-card">
            <Icon name="sets" />
            <span>
              <strong>{importPayload ? importPayload.filename : 'No import file attached'}</strong>
              <small>{importPayload ? `${importPayload.format.toUpperCase()} will import in append/update mode after creation.` : 'Use Import Set File when the cards are already in CSV, XML, or Planesculptors text.'}</small>
            </span>
            {importPayload ? (
              <button type="button" className="secondary-button" onClick={() => { setImportPayload(undefined); markDirty(); }}>
                Remove
              </button>
            ) : null}
          </div>
        </CollapsibleSection>
      </div>
    </OverlayShell>
  );
}
