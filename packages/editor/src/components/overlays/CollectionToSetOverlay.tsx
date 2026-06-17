import { useMemo, useState } from 'react';
import { importCollectionToSet } from '../../api/client.js';
import type { CollectionEntry, CollectionState, ImportCollectionToSetResult, LibraryState } from '../../domain/editorTypes.js';
import { formatCount } from '../../domain/uiText.js';
import { Field } from '../Field.js';
import { OverlayShell } from './OverlayShell.js';

interface CollectionToSetOverlayProps {
  collection: CollectionState;
  entries: CollectionEntry[];
  library: LibraryState | null;
  defaultSetCode?: string;
  onImported: (result: ImportCollectionToSetResult) => void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CollectionToSetOverlay({ collection, entries, library, defaultSetCode, onImported, onStatus, onClose }: CollectionToSetOverlayProps) {
  const targetRows = entries.length ? entries : collection.entries;
  const [setCode, setSetCode] = useState(defaultSetCode || collection.metadata.linkedSetCodes?.[0] || library?.selectedSetCode || library?.sets[0]?.setCode || '');
  const [status, setStatus] = useState<'idea' | 'draft' | 'review' | 'playtest' | 'final' | 'cut' | 'archived'>('draft');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportCollectionToSetResult['summary'] | null>(null);
  const matchedRows = useMemo(() => targetRows.filter((entry) => entry.scryfallId || (entry.setCode && entry.collectorNumber)), [targetRows]);

  async function submit() {
    if (!setCode.trim()) {
      onStatus('Choose a target set before importing collection rows.');
      return;
    }
    setBusy(true);
    try {
      const result = await importCollectionToSet({
        collectionId: collection.metadata.collectionId,
        setCode,
        entryIds: entries.length ? entries.map((entry) => entry.entryId) : undefined,
        status
      });
      setSummary(result.summary);
      onImported(result);
      onStatus(`Imported ${formatCount(result.summary.importedRows, 'row')} into ${result.summary.setCode}. ${formatCount(result.summary.skippedRows, 'row')} skipped.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <>
      <button type="button" className="secondary-button" onClick={onClose}>
        Close
      </button>
      <button type="button" className="primary-button" disabled={busy || !setCode.trim() || targetRows.length === 0} onClick={() => void submit()}>
        {busy ? 'Importing...' : 'Import to set'}
      </button>
    </>
  );

  return (
    <OverlayShell
      title="Import Collection to Set"
      eyebrow="Collections Manager"
      subtitle={`${collection.metadata.name} - ${entries.length ? 'selected rows' : 'all rows'}`}
      dirty={false}
      footer={footer}
      onClose={onClose}
    >
      <div className="collection-to-set-tools">
        <div className="collection-transfer-summary">
          <div>
            <strong>{formatCount(targetRows.length, 'row')}</strong>
            <span>Requested</span>
          </div>
          <div>
            <strong>{formatCount(matchedRows.length, 'row')}</strong>
            <span>Likely matchable</span>
          </div>
          <div>
            <strong>{formatCount(targetRows.length - matchedRows.length, 'row')}</strong>
            <span>Needs catalog match</span>
          </div>
        </div>

        <div className="collection-import-grid">
          <Field label="Target set">
            <select value={setCode} onChange={(event) => setSetCode(event.target.value)}>
              <option value="">Choose a set</option>
              {(library?.sets ?? []).map((set) => (
                <option key={set.setCode} value={set.setCode}>
                  {set.setCode} - {set.setName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Imported card status">
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="playtest">Playtest</option>
              <option value="final">Final</option>
              <option value="cut">Cut</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        </div>

        <div className="filter-result-list collection-transfer-preview">
          {targetRows.slice(0, 8).map((entry) => (
            <div key={entry.entryId} className="entity-row">
              <span>
                <strong>{entry.cardName}</strong>
                <small>{[entry.setCode, entry.collectorNumber, entry.scryfallId ? 'Scryfall ID' : ''].filter(Boolean).join(' - ') || 'Needs catalog match'}</small>
              </span>
            </div>
          ))}
          {targetRows.length > 8 ? <p className="workspace-copy">{formatCount(targetRows.length - 8, 'row')} not shown.</p> : null}
        </div>

        {summary ? (
          <div className="import-summary">
            <strong>{summary.setCode}</strong>
            <span>{formatCount(summary.importedRows, 'row')} imported</span>
            <span>{formatCount(summary.skippedRows, 'row')} skipped</span>
            <span>{formatCount(summary.warnings.length, 'warning')}</span>
          </div>
        ) : null}
      </div>
    </OverlayShell>
  );
}
