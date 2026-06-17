import { useEffect, useMemo, useState } from 'react';
import { fetchPreview } from '../api/client.js';
import type { CardDraft, PreviewResponse } from '../domain/editorTypes.js';
import { joinTags } from '../domain/filterTypes.js';
import { Field } from './Field.js';
import { OverlayShell } from './overlays/OverlayShell.js';
import { TagEditor } from './TagEditor.js';

export interface SaveAsCardRequest {
  name: string;
  status: CardDraft['status'];
  tags: string[];
  notes: string;
  variantDisplayName: string;
  variantKind: CardDraft['variantKind'];
  variantStatus: CardDraft['variantStatus'];
  variantExportPolicy: CardDraft['variantExportPolicy'];
  variantTags: string[];
  variantNotes: string;
}

export interface SaveAsVariantRequest {
  displayName: string;
  kind: CardDraft['variantKind'];
  status: CardDraft['variantStatus'];
  exportPolicy: CardDraft['variantExportPolicy'];
  tags: string[];
  notes: string;
  makePrimary: boolean;
}

interface SaveAsOverlayProps {
  draft: CardDraft;
  preview: PreviewResponse | null;
  onSaveAsCard: (request: SaveAsCardRequest) => void;
  onSaveAsVariant: (request: SaveAsVariantRequest) => void;
  onClose: () => void;
}

export function SaveAsOverlay({ draft, preview, onSaveAsCard, onSaveAsVariant, onClose }: SaveAsOverlayProps) {
  const defaultVariantName = `Variant ${draft.variantSummaries.length + 1}`;
  const [mode, setMode] = useState<'card' | 'variant'>('variant');
  const [renderedPreview, setRenderedPreview] = useState(preview);
  const [cardName, setCardName] = useState(draft.name);
  const [cardStatus, setCardStatus] = useState<CardDraft['status']>(draft.status);
  const [cardTags, setCardTags] = useState(draft.tags);
  const [cardNotes, setCardNotes] = useState(draft.notes);
  const [cardVariantName, setCardVariantName] = useState('Variant 1');
  const [cardVariantKind, setCardVariantKind] = useState<CardDraft['variantKind']>(draft.variantKind);
  const [cardVariantStatus, setCardVariantStatus] = useState<CardDraft['variantStatus']>('active');
  const [cardVariantExportPolicy, setCardVariantExportPolicy] = useState<CardDraft['variantExportPolicy']>('default');
  const [cardVariantTags, setCardVariantTags] = useState(draft.variantTags);
  const [cardVariantNotes, setCardVariantNotes] = useState(draft.variantNotes);
  const [displayName, setDisplayName] = useState(defaultVariantName);
  const [kind, setKind] = useState<CardDraft['variantKind']>('mechanics_test');
  const [status, setStatus] = useState<CardDraft['variantStatus']>('testing');
  const [exportPolicy, setExportPolicy] = useState<CardDraft['variantExportPolicy']>('optional');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [makePrimary, setMakePrimary] = useState(false);
  const tagSuggestions = useMemo(() => [...draft.tags, ...draft.variantTags, ...draft.variantSummaries.flatMap((variant) => variant.tags)], [draft.tags, draft.variantSummaries, draft.variantTags]);
  const previewName = mode === 'card' ? cardName.trim() || draft.name : draft.name;
  const previewVariantName = mode === 'card' ? cardVariantName.trim() || 'Variant 1' : displayName.trim() || defaultVariantName;
  const dirty = useMemo(
    () =>
      cardName !== draft.name ||
      cardStatus !== draft.status ||
      joinTags(cardTags) !== joinTags(draft.tags) ||
      cardNotes !== draft.notes ||
      cardVariantName !== 'Variant 1' ||
      cardVariantKind !== draft.variantKind ||
      cardVariantStatus !== 'active' ||
      cardVariantExportPolicy !== 'default' ||
      joinTags(cardVariantTags) !== joinTags(draft.variantTags) ||
      cardVariantNotes !== draft.variantNotes ||
      displayName !== defaultVariantName ||
      kind !== 'mechanics_test' ||
      status !== 'testing' ||
      exportPolicy !== 'optional' ||
      tags.length ||
      notes.trim() ||
      makePrimary,
    [
      cardName,
      cardNotes,
      cardStatus,
      cardTags,
      cardVariantExportPolicy,
      cardVariantKind,
      cardVariantName,
      cardVariantNotes,
      cardVariantStatus,
      cardVariantTags,
      defaultVariantName,
      displayName,
      draft.name,
      draft.notes,
      draft.status,
      draft.tags,
      draft.variantKind,
      draft.variantNotes,
      draft.variantTags,
      exportPolicy,
      kind,
      makePrimary,
      notes,
      status,
      tags
    ]
  );

  useEffect(() => {
    setRenderedPreview(preview);
  }, [preview]);

  useEffect(() => {
    let cancelled = false;
    const previewDraft: CardDraft =
      mode === 'card'
        ? {
            ...draft,
            name: cardName.trim() || draft.name,
            status: cardStatus,
            tags: cardTags,
            notes: cardNotes,
            variantDisplayName: cardVariantName.trim() || 'Variant 1',
            variantKind: cardVariantKind,
            variantStatus: cardVariantStatus,
            variantExportPolicy: cardVariantExportPolicy,
            variantTags: cardVariantTags,
            variantNotes: cardVariantNotes
          }
        : {
            ...draft,
            variantDisplayName: displayName.trim() || defaultVariantName,
            variantKind: kind,
            variantStatus: status,
            variantExportPolicy: exportPolicy,
            variantTags: tags,
            variantNotes: notes
          };
    const timer = window.setTimeout(() => {
      void fetchPreview(previewDraft)
        .then((nextPreview) => {
          if (!cancelled) {
            setRenderedPreview(nextPreview);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRenderedPreview(preview);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    cardName,
    cardNotes,
    cardStatus,
    cardTags,
    cardVariantExportPolicy,
    cardVariantKind,
    cardVariantName,
    cardVariantNotes,
    cardVariantStatus,
    cardVariantTags,
    defaultVariantName,
    displayName,
    draft,
    exportPolicy,
    kind,
    mode,
    notes,
    preview,
    status,
    tags
  ]);

  function submit() {
    if (mode === 'card') {
      onSaveAsCard({
        name: cardName,
        status: cardStatus,
        tags: cardTags,
        notes: cardNotes,
        variantDisplayName: cardVariantName,
        variantKind: cardVariantKind,
        variantStatus: cardVariantStatus,
        variantExportPolicy: cardVariantExportPolicy,
        variantTags: cardVariantTags,
        variantNotes: cardVariantNotes
      });
      onClose();
      return;
    }
    onSaveAsVariant({
      displayName,
      kind,
      status,
      exportPolicy,
      tags,
      notes,
      makePrimary
    });
    onClose();
  }

  return (
    <OverlayShell
      title="Save as..."
      eyebrow="File"
      subtitle={`${draft.name} / ${draft.variantDisplayName}`}
      dirty={Boolean(dirty)}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={submit}>
            {mode === 'card' ? 'Save New Card' : 'Save New Variant'}
          </button>
        </>
      }
      onClose={onClose}
    >
      <div className="create-overlay-grid">
        <section className="workspace-card save-as-form-card">
          <div className="segmented-control" role="group" aria-label="Save as mode">
            <button type="button" className={mode === 'variant' ? 'active' : ''} onClick={() => setMode('variant')}>
              New Variant
            </button>
            <button type="button" className={mode === 'card' ? 'active' : ''} onClick={() => setMode('card')}>
              New Card
            </button>
          </div>
          {mode === 'card' ? (
            <div className="variant-save-grid">
              <Field label="Card name">
                <input value={cardName} onChange={(event) => setCardName(event.target.value)} />
              </Field>
              <div className="grid-2">
                <Field label="Card status">
                  <select value={cardStatus} onChange={(event) => setCardStatus(event.target.value as CardDraft['status'])}>
                    <option value="idea">Idea</option>
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="playtest">Playtest</option>
                    <option value="final">Final</option>
                    <option value="cut">Cut</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Primary variant">
                  <input value={cardVariantName} onChange={(event) => setCardVariantName(event.target.value)} />
                </Field>
              </div>
              <div className="grid-2">
                <Field label="Variant kind">
                  <select value={cardVariantKind} onChange={(event) => setCardVariantKind(event.target.value as CardDraft['variantKind'])}>
                    <option value="mechanics_test">Mechanics test</option>
                    <option value="wording_test">Wording test</option>
                    <option value="visual_alternate">Visual alternate</option>
                    <option value="finish_alternate">Finish alternate</option>
                    <option value="print_alternate">Print alternate</option>
                    <option value="history_snapshot">History snapshot</option>
                  </select>
                </Field>
                <Field label="Variant status">
                  <select value={cardVariantStatus} onChange={(event) => setCardVariantStatus(event.target.value as CardDraft['variantStatus'])}>
                    <option value="active">Active</option>
                    <option value="testing">Testing</option>
                    <option value="final">Final</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
              </div>
              <Field label="Variant export">
                <select value={cardVariantExportPolicy} onChange={(event) => setCardVariantExportPolicy(event.target.value as CardDraft['variantExportPolicy'])}>
                  <option value="default">Default export</option>
                  <option value="optional">Optional</option>
                  <option value="excluded">Excluded</option>
                </select>
              </Field>
              <Field label="Card tags">
                <TagEditor value={cardTags} suggestions={tagSuggestions} placeholder="needs_review, playtest..." ariaLabel="Card tags" onChange={setCardTags} />
              </Field>
              <Field label="Card notes">
                <textarea value={cardNotes} rows={3} onChange={(event) => setCardNotes(event.target.value)} />
              </Field>
              <Field label="Variant tags">
                <TagEditor value={cardVariantTags} suggestions={tagSuggestions} placeholder="alt-art, wording..." ariaLabel="Primary variant tags" onChange={setCardVariantTags} />
              </Field>
              <Field label="Variant notes">
                <textarea value={cardVariantNotes} rows={3} onChange={(event) => setCardVariantNotes(event.target.value)} />
              </Field>
            </div>
          ) : (
            <div className="variant-save-grid">
              <div className="grid-2">
                <Field label="Variant name">
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                </Field>
                <Field label="Kind">
                  <select value={kind} onChange={(event) => setKind(event.target.value as CardDraft['variantKind'])}>
                    <option value="mechanics_test">Mechanics test</option>
                    <option value="wording_test">Wording test</option>
                    <option value="visual_alternate">Visual alternate</option>
                    <option value="finish_alternate">Finish alternate</option>
                    <option value="print_alternate">Print alternate</option>
                    <option value="history_snapshot">History snapshot</option>
                  </select>
                </Field>
              </div>
              <div className="grid-2">
                <Field label="Status">
                  <select value={status} onChange={(event) => setStatus(event.target.value as CardDraft['variantStatus'])}>
                    <option value="active">Active</option>
                    <option value="testing">Testing</option>
                    <option value="final">Final</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Export">
                  <select value={exportPolicy} onChange={(event) => setExportPolicy(event.target.value as CardDraft['variantExportPolicy'])}>
                    <option value="default">Default export</option>
                    <option value="optional">Optional</option>
                    <option value="excluded">Excluded</option>
                  </select>
                </Field>
              </div>
              <Field label="Tags">
                <TagEditor value={tags} suggestions={tagSuggestions} placeholder={joinTags(draft.variantTags)} ariaLabel="New variant tags" onChange={setTags} />
              </Field>
              <Field label="Notes">
                <textarea value={notes} rows={4} onChange={(event) => setNotes(event.target.value)} />
              </Field>
              <label className="checkbox-row">
                <input type="checkbox" checked={makePrimary} onChange={(event) => setMakePrimary(event.target.checked)} />
                Make this the primary variant after saving
              </label>
            </div>
          )}
        </section>
        <section className="workspace-card save-as-preview-card" aria-label="Current card preview">
          <div className="save-as-preview-heading">
            <span className="dialog-eyebrow">Preview</span>
            <strong>{previewName}</strong>
            <small>{previewVariantName}</small>
          </div>
          <div className="save-as-preview-frame">
            {renderedPreview?.imageDataUri ? <img src={renderedPreview.imageDataUri} alt={`${previewName} preview`} /> : <span>Preview unavailable</span>}
          </div>
        </section>
      </div>
    </OverlayShell>
  );
}
