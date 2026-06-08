import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CollectionEntry } from '../../domain/editorTypes.js';
import type { BulkTagMode, BulkTextMode, CollectionBulkEditPatch } from '../../domain/collectionOwnership.js';
import { normalizeCollectionOwnerName, normalizeCollectionTags } from '../../domain/collectionOwnership.js';
import { CONDITION_OPTIONS, FINISH_OPTIONS, LANGUAGE_OPTIONS } from '../../domain/officialCardMetadata.js';
import { Field } from '../Field.js';
import { OverlayShell } from './OverlayShell.js';

interface CollectionBulkEditOverlayProps {
  entries: CollectionEntry[];
  ownerSuggestions: string[];
  onApply: (patch: CollectionBulkEditPatch) => void;
  onClose: () => void;
}

type BooleanMode = 'ignore' | 'true' | 'false';

export function CollectionBulkEditOverlay({ entries, ownerSuggestions, onApply, onClose }: CollectionBulkEditOverlayProps) {
  const [applyOwnerName, setApplyOwnerName] = useState(false);
  const [ownerName, setOwnerName] = useState(ownerSuggestions[0] ?? 'Kyle');
  const [applyFinish, setApplyFinish] = useState(false);
  const [finish, setFinish] = useState('');
  const [applyCondition, setApplyCondition] = useState(false);
  const [condition, setCondition] = useState('');
  const [applyLanguage, setApplyLanguage] = useState(false);
  const [language, setLanguage] = useState('');
  const [applyLocation, setApplyLocation] = useState(false);
  const [location, setLocation] = useState('');
  const [applyPurchasePrice, setApplyPurchasePrice] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState('USD');
  const [applyMarketPrice, setApplyMarketPrice] = useState(false);
  const [marketPrice, setMarketPrice] = useState('');
  const [marketCurrency, setMarketCurrency] = useState('USD');
  const [marketSource, setMarketSource] = useState('local snapshot');
  const [tagMode, setTagMode] = useState<BulkTagMode>('ignore');
  const [tags, setTags] = useState('');
  const [noteMode, setNoteMode] = useState<BulkTextMode>('ignore');
  const [notes, setNotes] = useState('');
  const [starred, setStarred] = useState<BooleanMode>('ignore');
  const [flagged, setFlagged] = useState<BooleanMode>('ignore');
  const [altered, setAltered] = useState<BooleanMode>('ignore');
  const [misprint, setMisprint] = useState<BooleanMode>('ignore');
  const [proxy, setProxy] = useState<BooleanMode>('ignore');
  const [homebrew, setHomebrew] = useState<BooleanMode>('ignore');
  const [markedForDeletion, setMarkedForDeletion] = useState<BooleanMode>('ignore');
  const parsedTags = useMemo(() => normalizeCollectionTags(tags), [tags]);
  const changed =
    applyFinish ||
    applyOwnerName ||
    applyCondition ||
    applyLanguage ||
    applyLocation ||
    applyPurchasePrice ||
    applyMarketPrice ||
    tagMode !== 'ignore' ||
    noteMode !== 'ignore' ||
    [starred, flagged, altered, misprint, proxy, homebrew, markedForDeletion].some((value) => value !== 'ignore');

  function submit() {
    const fields: Partial<CollectionEntry> = {};
    if (applyOwnerName) {
      fields.ownerName = normalizeCollectionOwnerName(ownerName);
    }
    if (applyFinish) {
      fields.finish = finish || undefined;
    }
    if (applyCondition) {
      fields.condition = condition || undefined;
    }
    if (applyLanguage) {
      fields.language = language || undefined;
    }
    if (applyLocation) {
      fields.location = location.trim() || undefined;
    }
    if (applyPurchasePrice) {
      fields.purchasePrice = optionalNumber(purchasePrice);
      fields.purchaseCurrency = purchaseCurrency.trim().toUpperCase() || undefined;
    }
    if (applyMarketPrice) {
      fields.estimatedMarketPrice = optionalNumber(marketPrice);
      fields.estimatedMarketCurrency = marketCurrency.trim().toUpperCase() || undefined;
      fields.marketPriceSource = marketSource.trim() || undefined;
      fields.marketPriceUpdatedAt = new Date().toISOString();
    }
    applyBoolean(fields, 'starred', starred);
    applyBoolean(fields, 'flagged', flagged);
    applyBoolean(fields, 'altered', altered);
    applyBoolean(fields, 'misprint', misprint);
    applyBoolean(fields, 'proxy', proxy);
    applyBoolean(fields, 'homebrew', homebrew);
    applyBoolean(fields, 'markedForDeletion', markedForDeletion);
    onApply({
      fields,
      tagMode,
      tags: parsedTags,
      noteMode,
      notes
    });
  }

  const footer = (
    <>
      <button type="button" className="secondary-button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="primary-button" disabled={!changed || entries.length === 0} onClick={submit}>
        Apply to {entries.length} {entries.length === 1 ? 'row' : 'rows'}
      </button>
    </>
  );

  return (
    <OverlayShell title="Bulk Edit Collection Rows" eyebrow="Collections Manager" subtitle={`${entries.length} selected ${entries.length === 1 ? 'row' : 'rows'}`} dirty={changed} footer={footer} onClose={onClose}>
      <div className="create-overlay-grid collection-bulk-edit-grid">
        <BulkField enabled={applyOwnerName} label="Owner" onEnabledChange={setApplyOwnerName}>
          <input list="collection-bulk-owner-options" value={ownerName} disabled={!applyOwnerName} placeholder="Kyle" onChange={(event) => setOwnerName(event.target.value)} />
          <datalist id="collection-bulk-owner-options">
            {ownerSuggestions.map((owner) => (
              <option key={owner} value={owner} />
            ))}
          </datalist>
        </BulkField>
        <div className="grid-3">
          <BulkField enabled={applyFinish} label="Finish" onEnabledChange={setApplyFinish}>
            <select value={finish} disabled={!applyFinish} onChange={(event) => setFinish(event.target.value)}>
              {FINISH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </BulkField>
          <BulkField enabled={applyCondition} label="Condition" onEnabledChange={setApplyCondition}>
            <select value={condition} disabled={!applyCondition} onChange={(event) => setCondition(event.target.value)}>
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </BulkField>
          <BulkField enabled={applyLanguage} label="Language" onEnabledChange={setApplyLanguage}>
            <select value={language} disabled={!applyLanguage} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </BulkField>
        </div>

        <BulkField enabled={applyLocation} label="Location" onEnabledChange={setApplyLocation}>
          <input value={location} disabled={!applyLocation} placeholder="Binder, box, shelf..." onChange={(event) => setLocation(event.target.value)} />
        </BulkField>

        <div className="grid-2">
          <BulkField enabled={applyPurchasePrice} label="Purchase Price" onEnabledChange={setApplyPurchasePrice}>
            <div className="grid-2">
              <input type="number" min="0" step="0.01" value={purchasePrice} disabled={!applyPurchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} />
              <input value={purchaseCurrency} disabled={!applyPurchasePrice} onChange={(event) => setPurchaseCurrency(event.target.value)} />
            </div>
          </BulkField>
          <BulkField enabled={applyMarketPrice} label="Market Snapshot" onEnabledChange={setApplyMarketPrice}>
            <div className="grid-3">
              <input type="number" min="0" step="0.01" value={marketPrice} disabled={!applyMarketPrice} onChange={(event) => setMarketPrice(event.target.value)} />
              <input value={marketCurrency} disabled={!applyMarketPrice} onChange={(event) => setMarketCurrency(event.target.value)} />
              <input value={marketSource} disabled={!applyMarketPrice} onChange={(event) => setMarketSource(event.target.value)} />
            </div>
          </BulkField>
        </div>

        <div className="grid-2">
          <Field label="Tags">
            <div className="bulk-inline-field">
              <select value={tagMode} onChange={(event) => setTagMode(event.target.value as BulkTagMode)}>
                <option value="ignore">Leave tags unchanged</option>
                <option value="add">Add tags</option>
                <option value="replace">Replace tags</option>
              </select>
              <input value={tags} disabled={tagMode === 'ignore'} placeholder="commander;trade" onChange={(event) => setTags(event.target.value)} />
            </div>
          </Field>
          <Field label="Notes">
            <div className="bulk-inline-field">
              <select value={noteMode} onChange={(event) => setNoteMode(event.target.value as BulkTextMode)}>
                <option value="ignore">Leave notes unchanged</option>
                <option value="append">Append note</option>
                <option value="replace">Replace note</option>
              </select>
              <textarea value={notes} disabled={noteMode === 'ignore'} rows={3} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </Field>
        </div>

        <div className="collection-bulk-boolean-grid">
          <BulkBoolean label="Starred" value={starred} onChange={setStarred} />
          <BulkBoolean label="Flagged" value={flagged} onChange={setFlagged} />
          <BulkBoolean label="Altered" value={altered} onChange={setAltered} />
          <BulkBoolean label="Misprint" value={misprint} onChange={setMisprint} />
          <BulkBoolean label="Proxy" value={proxy} onChange={setProxy} />
          <BulkBoolean label="Homebrew" value={homebrew} onChange={setHomebrew} />
          <BulkBoolean label="Marked for deletion" value={markedForDeletion} onChange={setMarkedForDeletion} />
        </div>
      </div>
    </OverlayShell>
  );
}

function BulkField({ enabled, label, children, onEnabledChange }: { enabled: boolean; label: string; children: ReactNode; onEnabledChange: (value: boolean) => void }) {
  return (
    <Field label={label}>
      <label className="checkbox-row bulk-apply-row">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
        <span>Apply {label.toLowerCase()}</span>
      </label>
      {children}
    </Field>
  );
}

function BulkBoolean({ label, value, onChange }: { label: string; value: BooleanMode; onChange: (value: BooleanMode) => void }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value as BooleanMode)}>
        <option value="ignore">Leave unchanged</option>
        <option value="true">Set yes</option>
        <option value="false">Set no</option>
      </select>
    </Field>
  );
}

function applyBoolean(fields: Partial<CollectionEntry>, key: keyof Pick<CollectionEntry, 'starred' | 'flagged' | 'altered' | 'misprint' | 'proxy' | 'homebrew' | 'markedForDeletion'>, mode: BooleanMode) {
  if (mode !== 'ignore') {
    fields[key] = mode === 'true';
  }
}

function optionalNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
