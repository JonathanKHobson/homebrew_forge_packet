import { useState } from 'react';
import type { CreateUniverseRequest, LibraryState } from '../../domain/editorTypes.js';
import type { CreateFlowStatus } from '../../domain/createFlowTypes.js';
import { CollapsibleSection } from '../CollapsibleSection.js';
import { Field } from '../Field.js';
import { Icon } from '../Icon.js';
import { OverlayShell } from '../overlays/OverlayShell.js';
import { CreateFlowStatusMessage } from './CreateFlowStatusMessage.js';
import { PROJECT_STATUS_OPTIONS, splitTagInput } from '../../domain/filterTypes.js';

interface CreateProjectOverlayProps {
  library: LibraryState | null;
  onCreateProject: (request: CreateUniverseRequest) => Promise<void>;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CreateProjectOverlay({ library, onCreateProject, onStatus, onClose }: CreateProjectOverlayProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [tags, setTags] = useState('');
  const [flowState, setFlowState] = useState<CreateFlowStatus>('idle');
  const [error, setError] = useState('');
  const dirty = Boolean(name || description || tags || status !== 'draft');

  function markDirty() {
    setFlowState('dirty');
  }

  async function submit() {
    setFlowState('saving');
    setError('');
    try {
      await onCreateProject({ name, description, status, tags: splitTagInput(tags) });
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
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="secondary-button" disabled>
        Import Project
      </button>
      <button type="button" className="primary-button" disabled={flowState === 'saving' || !name.trim()} onClick={() => void submit()}>
        {flowState === 'saving' ? 'Creating...' : 'Create Draft'}
      </button>
    </>
  );

  return (
    <OverlayShell title="New Project" eyebrow="Create" subtitle="Create an organizing project for related sets, decks, and future ungrouped holding areas." dirty={dirty && flowState !== 'saving'} footer={footer} onClose={onClose}>
      <CreateFlowStatusMessage state={flowState} error={error} />
      <div className="create-overlay-grid">
        <CollapsibleSection title="Project Metadata" subtitle="Name, status, tags, and organizing note">
          <Field label="Project name">
            <input value={name} placeholder="Stargate" onChange={(event) => { setName(event.target.value); markDirty(); }} />
          </Field>
          <div className="grid-2">
            <Field label="Status">
              <select value={status} onChange={(event) => { setStatus(event.target.value); markDirty(); }}>
                {PROJECT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags">
              <input value={tags} placeholder="stargate, priority" onChange={(event) => { setTags(event.target.value); markDirty(); }} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={description} rows={5} placeholder="Sets, deck goals, source material, or production notes" onChange={(event) => { setDescription(event.target.value); markDirty(); }} />
          </Field>
        </CollapsibleSection>

        <CollapsibleSection title="Grouping Hooks" subtitle="Prepared for sets, cards, decks, and ungrouped content">
          <div className="overlay-staged-grid">
            <div className="staged-flow-card active">
              <Icon name="sets" />
              <span>
                <strong>Sets</strong>
                <small>{library?.sets.length ?? 0} current sets can move into this project after creation.</small>
              </span>
            </div>
            <div className="staged-flow-card">
              <Icon name="cards" />
              <span>
                <strong>Ungrouped cards</strong>
                <small>Cards will use the shared holding set model instead of a separate global card store.</small>
              </span>
            </div>
            <div className="staged-flow-card">
              <Icon name="decks" />
              <span>
                <strong>Decks</strong>
                <small>Deck project assignment is available after the deck exists.</small>
              </span>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </OverlayShell>
  );
}
