import type { CollectionEntry } from '../../domain/editorTypes.js';
import { isOwnedStatus, ownershipStatusLabel } from '../../domain/collectionLists.js';
import type { CollectionViewMode } from '../../domain/collectionOwnership.js';
import { collectionValueEstimateFromEntry, imageUrlForMetadata, metadataFromCollectionEntry } from '../../domain/officialCardMetadata.js';
import { StatusPill } from '../forge-ui/index.js';
import { Icon } from '../Icon.js';

interface CollectionEntryViewsProps {
  mode: Exclude<CollectionViewMode, 'table'>;
  entries: CollectionEntry[];
  selectedEntry?: CollectionEntry;
  selectedEntryIds: Set<string>;
  ownerSuggestions?: string[];
  onSelect: (entryId: string) => void;
  onToggleSelection: (entryId: string) => void;
  onPreview: (entryId: string) => void;
}

export function CollectionEntryViews({ mode, entries, selectedEntry, selectedEntryIds, onSelect, onToggleSelection, onPreview }: CollectionEntryViewsProps) {
  if (mode === 'grid') {
    return (
      <div className="collection-grid-view" role="list" aria-label="Collection entry grid">
        {entries.map((entry) => (
          <CollectionGridCard key={entry.entryId} entry={entry} selected={selectedEntryIds.has(entry.entryId)} active={entry.entryId === selectedEntry?.entryId} onSelect={onSelect} onToggleSelection={onToggleSelection} onPreview={onPreview} />
        ))}
      </div>
    );
  }
  if (mode === 'list') {
    return (
      <div className="collection-compact-list" role="list" aria-label="Compact collection entries">
        {entries.map((entry) => (
          <CollectionCompactRow key={entry.entryId} entry={entry} selected={selectedEntryIds.has(entry.entryId)} active={entry.entryId === selectedEntry?.entryId} onSelect={onSelect} onToggleSelection={onToggleSelection} onPreview={onPreview} />
        ))}
      </div>
    );
  }
  const activeEntry = selectedEntry ?? entries[0];
  if (!activeEntry) {
    return <p className="workspace-copy">No collection rows match the current filter.</p>;
  }
  const activeIndex = Math.max(0, entries.findIndex((entry) => entry.entryId === activeEntry.entryId));
  const previousEntry = entries[(activeIndex - 1 + entries.length) % entries.length];
  const nextEntry = entries[(activeIndex + 1) % entries.length];
  const metadata = metadataFromCollectionEntry(activeEntry);
  const imageSrc = imageUrlForMetadata(metadata, 'large');
  const estimate = collectionValueEstimateFromEntry(activeEntry);
  return (
    <div className="collection-single-view">
      <section className="collection-single-card">
        <div className={`collection-single-art ${imageSrc ? 'has-art' : ''}`}>
          {imageSrc ? <img src={imageSrc} alt={`${activeEntry.cardName} card image`} /> : <span>{activeEntry.cardName.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div className="collection-single-details">
          <div className="collection-single-heading">
            <div>
              <h3>{activeEntry.cardName}</h3>
              <p>{collectionPrintLabel(activeEntry)} - {activeEntry.quantity} {activeEntry.quantity === 1 ? 'copy' : 'copies'}</p>
            </div>
            <StatusPill tone={activeEntry.reviewStatus === 'needs_review' ? 'warning' : 'success'}>{activeEntry.reviewStatus === 'needs_review' ? 'Review' : 'Matched'}</StatusPill>
          </div>
          <dl className="collection-single-metadata">
            <div><dt>Owner</dt><dd>{activeEntry.ownerName}</dd></div>
            <div><dt>Ownership</dt><dd>{ownershipStatusLabel(activeEntry.ownershipStatus)}</dd></div>
            <div><dt>Finish</dt><dd>{activeEntry.finish ?? '-'}</dd></div>
            <div><dt>Condition</dt><dd>{activeEntry.condition ?? '-'}</dd></div>
            <div><dt>Language</dt><dd>{activeEntry.language ?? '-'}</dd></div>
            <div><dt>Location</dt><dd>{activeEntry.location ?? '-'}</dd></div>
            <div><dt>Value</dt><dd>{estimate ? formatMoney(estimate.amount * activeEntry.quantity, estimate.currency) : 'No source'}</dd></div>
            <div><dt>Markers</dt><dd>{markerLabel(activeEntry)}</dd></div>
          </dl>
          <div className="collection-single-actions">
            <button type="button" className="secondary-button" disabled={!previousEntry || previousEntry.entryId === activeEntry.entryId} onClick={() => previousEntry && onSelect(previousEntry.entryId)}>
              Previous
            </button>
            <button type="button" className="secondary-button" disabled={!nextEntry || nextEntry.entryId === activeEntry.entryId} onClick={() => nextEntry && onSelect(nextEntry.entryId)}>
              Next
            </button>
            <button type="button" className="primary-button icon-label-button" onClick={() => onPreview(activeEntry.entryId)}>
              <Icon name="view" />
              Preview
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CollectionGridCard({ entry, selected, active, onSelect, onToggleSelection, onPreview }: CollectionEntryViewItemProps) {
  const metadata = metadataFromCollectionEntry(entry);
  const imageSrc = imageUrlForMetadata(metadata, 'normal');
  return (
    <article className={`collection-grid-card ${active ? 'active' : ''} ${entry.markedForDeletion ? 'marked-delete' : ''} ${!isOwnedStatus(entry.ownershipStatus) ? 'not-owned' : ''}`} role="listitem">
      <label className="collection-entry-check" title={`Select ${entry.cardName}`}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelection(entry.entryId)} />
      </label>
      <button type="button" className="collection-grid-card-button" onClick={() => onSelect(entry.entryId)} onDoubleClick={() => onPreview(entry.entryId)}>
        <div className={`collection-grid-art ${imageSrc ? 'has-art' : ''}`}>
          {imageSrc ? <img src={imageSrc} alt="" loading="lazy" /> : <span>{entry.cardName.slice(0, 2).toUpperCase()}</span>}
        </div>
        <strong>{entry.cardName}</strong>
        <span>{collectionPrintLabel(entry)}</span>
        <small>{[entry.ownerName, !isOwnedStatus(entry.ownershipStatus) ? ownershipStatusLabel(entry.ownershipStatus) : [entry.finish, entry.condition].filter(Boolean).join(' - ') || 'No ownership fields'].filter(Boolean).join(' - ')}</small>
      </button>
    </article>
  );
}

function CollectionCompactRow({ entry, selected, active, onSelect, onToggleSelection, onPreview }: CollectionEntryViewItemProps) {
  const estimate = collectionValueEstimateFromEntry(entry);
  return (
    <article className={`collection-compact-row ${active ? 'active' : ''} ${entry.markedForDeletion ? 'marked-delete' : ''} ${!isOwnedStatus(entry.ownershipStatus) ? 'not-owned' : ''}`} role="listitem">
      <label className="collection-entry-check" title={`Select ${entry.cardName}`}>
        <input type="checkbox" checked={selected} onChange={() => onToggleSelection(entry.entryId)} />
      </label>
      <button type="button" className="collection-compact-main" onClick={() => onSelect(entry.entryId)} onDoubleClick={() => onPreview(entry.entryId)}>
        <strong>{entry.quantity}x {entry.cardName}</strong>
        <span>{collectionPrintLabel(entry)} - {[entry.ownerName, !isOwnedStatus(entry.ownershipStatus) ? ownershipStatusLabel(entry.ownershipStatus) : [entry.finish, entry.condition, entry.language].filter(Boolean).join(' - ') || 'No ownership fields'].filter(Boolean).join(' - ')}</span>
      </button>
      <span className="collection-compact-value">{estimate ? formatMoney(estimate.amount * entry.quantity, estimate.currency) : 'No source'}</span>
      <button type="button" className="icon-button" title={`Preview ${entry.cardName}`} aria-label={`Preview ${entry.cardName}`} onClick={() => onPreview(entry.entryId)}>
        <Icon name="view" />
      </button>
    </article>
  );
}

interface CollectionEntryViewItemProps {
  entry: CollectionEntry;
  selected: boolean;
  active: boolean;
  onSelect: (entryId: string) => void;
  onToggleSelection: (entryId: string) => void;
  onPreview: (entryId: string) => void;
}

function collectionPrintLabel(entry: CollectionEntry): string {
  return [entry.setCode, entry.collectorNumber].filter(Boolean).join(' ') || entry.setName || '-';
}

function markerLabel(entry: CollectionEntry): string {
  const markers = [
    entry.starred ? 'Starred' : '',
    entry.flagged ? 'Flagged' : '',
    entry.markedForDeletion ? 'Delete review' : '',
    entry.altered ? 'Altered' : '',
    entry.misprint ? 'Misprint' : '',
    entry.proxy ? 'Proxy' : '',
    entry.homebrew ? 'Homebrew' : ''
  ].filter(Boolean);
  return markers.length ? markers.join(', ') : 'None';
}

function formatMoney(amount: number, currency: string): string {
  if (currency === 'TIX') {
    return `${amount.toFixed(2)} tix`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}
