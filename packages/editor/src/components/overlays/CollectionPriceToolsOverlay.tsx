import { useRef, useState } from 'react';
import { importCollectionPrices, refreshCollectionPrices } from '../../api/client.js';
import type { CollectionPriceRefreshSummary, CollectionState, CollectionSummary } from '../../domain/editorTypes.js';
import { formatCount } from '../../domain/uiText.js';
import { Field } from '../Field.js';
import { OverlayShell } from './OverlayShell.js';

interface CollectionPriceToolsOverlayProps {
  collection: CollectionState;
  onUpdated: (collections: CollectionSummary[], collection: CollectionState) => void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

export function CollectionPriceToolsOverlay({ collection, onUpdated, onStatus, onClose }: CollectionPriceToolsOverlayProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [source, setSource] = useState('tcgplayer');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<'refresh' | 'dry-run' | 'import' | ''>('');
  const [summary, setSummary] = useState<CollectionPriceRefreshSummary | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    setContent(await file.text());
    setFileName(file.name);
    setSummary(null);
    onStatus(`Loaded ${file.name}.`);
  }

  async function handleRefresh() {
    setBusy('refresh');
    try {
      const response = await refreshCollectionPrices({
        collectionId: collection.metadata.collectionId,
        source: 'scryfall',
        onlyMissing
      });
      setSummary(response.result.summary);
      onUpdated(response.collections, response.result.collection);
      onStatus(priceSummaryMessage(response.result.summary, 'Refreshed'));
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function handleImport(dryRun: boolean) {
    if (!content.trim()) {
      onStatus('Choose or paste a price CSV before importing.');
      return;
    }
    setBusy(dryRun ? 'dry-run' : 'import');
    try {
      const response = await importCollectionPrices({
        collectionId: collection.metadata.collectionId,
        source,
        content,
        dryRun
      });
      setSummary(response.result.summary);
      if (!dryRun) {
        onUpdated(response.collections, response.result.collection);
      }
      onStatus(priceSummaryMessage(response.result.summary, dryRun ? 'Checked' : 'Imported'));
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  const footer = (
    <>
      <button type="button" className="secondary-button" onClick={onClose}>
        Close
      </button>
      <button type="button" className="primary-button" disabled={busy !== ''} onClick={() => void handleRefresh()}>
        {busy === 'refresh' ? 'Refreshing...' : 'Refresh from Scryfall cache'}
      </button>
    </>
  );

  return (
    <OverlayShell
      title="Collection Price Tools"
      eyebrow="Collections Manager"
      subtitle={`${collection.metadata.name} - ${formatCount(collection.entries.length, 'row')}`}
      dirty={false}
      footer={footer}
      onClose={onClose}
    >
      <div className="collection-price-tools">
        <section className="price-tool-section">
          <div>
            <h3>Local Source Refresh</h3>
            <p className="workspace-copy">Updates matched collection rows from the local official-card cache. Sync Official Cards first if the cache is missing or stale.</p>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={onlyMissing} onChange={(event) => setOnlyMissing(event.target.checked)} />
            <span>Only fill rows without a market snapshot</span>
          </label>
        </section>

        <section className="price-tool-section">
          <div>
            <h3>Provider Snapshot CSV</h3>
            <p className="workspace-copy">Imports exported price rows by Scryfall ID or exact print keys. Use this for TCGplayer, ManaBox, Card Kingdom, or other licensed/manual snapshots.</p>
          </div>
          <div className="collection-import-grid">
            <Field label="Price source">
              <select value={source} onChange={(event) => setSource(event.target.value)}>
                <option value="tcgplayer">TCGplayer snapshot</option>
                <option value="manabox">ManaBox snapshot</option>
                <option value="cardkingdom">Card Kingdom snapshot</option>
                <option value="cardmarket">Cardmarket snapshot</option>
                <option value="generic_csv">Generic price CSV</option>
              </select>
            </Field>
            <Field label="Source file" hint="CSV with card name, set/collector or Scryfall ID, and price">
              <div className="inline-file-picker">
                <input ref={fileInput} type="file" accept=".csv,text/csv,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} />
                <button type="button" className="secondary-button" disabled={busy !== ''} onClick={() => fileInput.current?.click()}>
                  Choose file
                </button>
                {fileName ? <span>{fileName}</span> : null}
              </div>
            </Field>
          </div>
          <Field label="Price CSV">
            <textarea
              value={content}
              rows={7}
              placeholder="Name,Set Code,Collector Number,Finish,TCG Market Price,Currency"
              onChange={(event) => setContent(event.target.value)}
            />
          </Field>
          <div className="export-actions">
            <button type="button" className="secondary-button" disabled={busy !== '' || !content.trim()} onClick={() => void handleImport(true)}>
              {busy === 'dry-run' ? 'Checking...' : 'Dry run'}
            </button>
            <button type="button" className="primary-button" disabled={busy !== '' || !content.trim()} onClick={() => void handleImport(false)}>
              {busy === 'import' ? 'Importing...' : 'Import price snapshots'}
            </button>
          </div>
        </section>

        {summary ? (
          <div className="import-summary price-summary">
            <strong>{summary.source}</strong>
            <span>{formatCount(summary.checkedRows, 'row')} checked</span>
            <span>{formatCount(summary.updatedRows, 'row')} updated</span>
            <span>{formatCount(summary.missingRows, 'row')} missing</span>
            <span>{formatCount(summary.warnings.length, 'warning')}</span>
          </div>
        ) : null}
      </div>
    </OverlayShell>
  );
}

function priceSummaryMessage(summary: CollectionPriceRefreshSummary, verb: string): string {
  return `${verb} ${summary.collectionId}: ${formatCount(summary.updatedRows, 'row')} updated, ${formatCount(summary.missingRows, 'row')} missing.`;
}
