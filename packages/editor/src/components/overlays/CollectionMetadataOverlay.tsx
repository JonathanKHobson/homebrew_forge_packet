import { useState } from 'react';
import { LIST_CATEGORY_OPTIONS, listCategoryDefaults } from '../../domain/collectionLists.js';
import type { CollectionKind, CollectionListCategory, CollectionMetadata, CollectionOwnershipStatus, CollectionPurpose, CollectionSourcePreset, LibraryState } from '../../domain/editorTypes.js';
import { normalizeCollectionTags } from '../../domain/collectionOwnership.js';
import { Field } from '../Field.js';
import { OverlayShell } from './OverlayShell.js';

interface CollectionMetadataOverlayProps {
  metadata: CollectionMetadata;
  library: LibraryState | null;
  onSave: (metadata: CollectionMetadata) => Promise<void> | void;
  onClose: () => void;
}

const purposeOptions: Array<{ value: CollectionPurpose; label: string }> = [
  { value: 'owned', label: 'Owned' },
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
  { value: 'generic', label: 'Generic' }
];

const kindOptions: Array<{ value: CollectionKind; label: string }> = [
  { value: 'binder', label: 'Binder' },
  { value: 'list', label: 'List' }
];

export function CollectionMetadataOverlay({ metadata, library, onSave, onClose }: CollectionMetadataOverlayProps) {
  const [draft, setDraft] = useState<CollectionMetadata>(metadata);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(metadata);

  async function submit() {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={saving || !draft.name.trim()} onClick={() => void submit()}>
        {saving ? 'Saving...' : 'Apply Metadata'}
      </button>
    </>
  );

  return (
    <OverlayShell title="Edit Collection" eyebrow="Metadata" subtitle="Update collection-level identity without changing selected row details." dirty={dirty && !saving} footer={footer} onClose={onClose}>
      <div className="create-overlay-grid">
        <div className="grid-2">
          <Field label="Name">
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </Field>
          <Field label="Collection ID">
            <input value={draft.collectionId} readOnly />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={draft.description ?? ''} rows={4} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
        </Field>
        <div className="grid-3">
          <Field label="Kind">
            <select value={draft.kind ?? 'list'} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as CollectionKind }))}>
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="List category">
            <select
              value={draft.listCategory ?? 'general'}
              disabled={draft.kind === 'binder'}
              onChange={(event) => {
                const category = event.target.value as CollectionListCategory;
                const defaults = listCategoryDefaults(category);
                setDraft((current) => ({
                  ...current,
                  listCategory: category,
                  defaultOwnershipStatus: defaults.defaultOwnershipStatus,
                  defaultEntryTags: defaults.defaultTags,
                  defaultStarred: Boolean(defaults.defaultStarred),
                  defaultFlagged: Boolean(defaults.defaultFlagged)
                }));
              }}
            >
              {LIST_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select value={draft.linkedUniverseId ?? ''} onChange={(event) => setDraft((current) => ({ ...current, linkedUniverseId: event.target.value || undefined }))}>
              <option value="">None</option>
              {(library?.universes ?? []).map((universe) => (
                <option key={universe.id} value={universe.id}>
                  {universe.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Purpose">
            <select value={draft.purpose} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value as CollectionPurpose }))}>
              {purposeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select value={draft.source} onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value as CollectionSourcePreset }))}>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Game">
            <input value={draft.gameId} onChange={(event) => setDraft((current) => ({ ...current, gameId: event.target.value }))} />
          </Field>
          <Field label="Accent color">
            <input type="color" value={draft.accentColor ?? '#7c3aed'} onChange={(event) => setDraft((current) => ({ ...current, accentColor: event.target.value }))} />
          </Field>
          <Field label="Purchase total">
            <div className="grid-2">
              <input type="number" min="0" step="0.01" value={draft.purchaseTotal ?? ''} onChange={(event) => setDraft((current) => ({ ...current, purchaseTotal: event.target.value === '' ? undefined : Number(event.target.value) }))} />
              <input value={draft.purchaseCurrency ?? 'USD'} onChange={(event) => setDraft((current) => ({ ...current, purchaseCurrency: event.target.value.toUpperCase() || undefined }))} />
            </div>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Tags">
            <input value={(draft.tags ?? []).join(';')} placeholder="commander;trade;blue" onChange={(event) => setDraft((current) => ({ ...current, tags: normalizeCollectionTags(event.target.value) }))} />
          </Field>
          <Field label="Default row tags">
            <input value={(draft.defaultEntryTags ?? []).join(';')} disabled={draft.kind === 'binder'} placeholder="wishlist;upgrade" onChange={(event) => setDraft((current) => ({ ...current, defaultEntryTags: normalizeCollectionTags(event.target.value) }))} />
          </Field>
        </div>
        <div className="grid-3">
          <Field label="Default ownership">
            <select value={draft.defaultOwnershipStatus ?? (draft.kind === 'binder' ? 'owned' : 'reference')} disabled={draft.kind === 'binder'} onChange={(event) => setDraft((current) => ({ ...current, defaultOwnershipStatus: event.target.value as CollectionOwnershipStatus }))}>
              <option value="owned">Owned</option>
              <option value="wanted">Wanted</option>
              <option value="recommended">Recommended</option>
              <option value="reference">Reference only</option>
              <option value="proxy">Proxy</option>
              <option value="homebrew_unprinted">Homebrew unprinted</option>
            </select>
          </Field>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(draft.defaultStarred)} disabled={draft.kind === 'binder'} onChange={(event) => setDraft((current) => ({ ...current, defaultStarred: event.target.checked }))} />
            Star list rows
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={Boolean(draft.defaultFlagged)} disabled={draft.kind === 'binder'} onChange={(event) => setDraft((current) => ({ ...current, defaultFlagged: event.target.checked }))} />
            Flag list rows
          </label>
        </div>
        <div className="grid-2">
          <Field label="Linked sets">
            <input value={(draft.linkedSetCodes ?? []).join(';')} placeholder="DEMO;SQM" onChange={(event) => setDraft((current) => ({ ...current, linkedSetCodes: normalizeCollectionTags(event.target.value).map((setCode) => setCode.toUpperCase()) }))} />
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Cover image reference">
            <input value={draft.coverImageRef ?? ''} placeholder="assets/covers/binder.png" onChange={(event) => setDraft((current) => ({ ...current, coverImageRef: event.target.value || undefined }))} />
          </Field>
          <Field label="Purchase date">
            <input type="date" value={draft.purchaseDate ?? ''} onChange={(event) => setDraft((current) => ({ ...current, purchaseDate: event.target.value || undefined }))} />
          </Field>
        </div>
        <Field label="Acquisition notes">
          <textarea value={draft.acquisitionNotes ?? ''} rows={3} onChange={(event) => setDraft((current) => ({ ...current, acquisitionNotes: event.target.value || undefined }))} />
        </Field>
      </div>
    </OverlayShell>
  );
}
