import type { DeckState } from '../../domain/editorTypes.js';
import { isOwnedStatus, ownershipStatusLabel } from '../../domain/collectionLists.js';
import { imageUrlForMetadata, metadataFromDeckCard, printLabelForMetadata } from '../../domain/officialCardMetadata.js';
import { Icon } from '../Icon.js';
import { ManaCostSymbols } from '../ManaSymbols.js';

export type DeckViewMode = 'board' | 'grid' | 'list' | 'single' | 'candidates' | 'roles' | 'mana';

interface DeckEntryViewsProps {
  mode: Exclude<DeckViewMode, 'board'>;
  entries: Array<{ entry: DeckState['entries'][number]; index: number }>;
  selectedIndex: number | null;
  onSelectEntry: (index: number) => void;
  onPreviewEntry: (index: number) => void;
}

export function DeckEntryViews({ mode, entries, selectedIndex, onSelectEntry, onPreviewEntry }: DeckEntryViewsProps) {
  if (!entries.length) {
    return <p className="workspace-copy">No cards in this section.</p>;
  }
  if (mode === 'candidates') {
    return (
      <div className="deck-compact-list deck-candidate-list">
        {entries.map(({ entry, index }) => (
          <button key={`${entry.entryId ?? ''}-${entry.setCode}-${entry.cardId}-${index}`} type="button" className={deckEntryClass('deck-compact-row', entry, selectedIndex === index)} onClick={() => onSelectEntry(index)}>
            <span className={`deck-entry-count status-${entry.candidateStatus ?? 'active'}`}>{entry.count}</span>
            <span>
              <strong>{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
              <small>{deckEntrySupportingText(entry, `${candidateStatusLabel(entry.candidateStatus)} - ${entry.entryNotes || entry.card?.typeLine || entry.setCode}`)}</small>
            </span>
            {entry.starred ? <Icon name="star" /> : <Icon name="view" />}
          </button>
        ))}
      </div>
    );
  }
  if (mode === 'roles') {
    const groups = groupEntries(entries, ({ entry }) => roleLabels(entry).join(', ') || 'Unassigned');
    return (
      <div className="deck-role-view">
        {groups.map((group) => (
          <section key={group.label} className="deck-role-column">
            <div className="deck-section-heading">
              <h3>{group.label}</h3>
              <span>{group.total}</span>
            </div>
            <div className="deck-compact-list">
              {group.items.map(({ entry, index }) => (
                <button key={`${entry.entryId ?? ''}-${entry.setCode}-${entry.cardId}-${index}`} type="button" className={deckEntryClass('deck-compact-row', entry, selectedIndex === index)} onClick={() => onSelectEntry(index)}>
                  <span className="deck-entry-count">{entry.count}</span>
                  <span>
                    <strong>{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
                    <small>{deckEntrySupportingText(entry, `${entry.roleSource ?? 'none'}${entry.roleConfidence ? ` - ${Math.round(entry.roleConfidence * 100)}%` : ''}`)}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
  if (mode === 'mana') {
    const groups = groupEntries(entries, ({ entry }) => manaBucket(entry));
    return (
      <div className="deck-role-view">
        {groups.map((group) => (
          <section key={group.label} className="deck-role-column">
            <div className="deck-section-heading">
              <h3>{group.label}</h3>
              <span>{group.total}</span>
            </div>
            <div className="deck-compact-list">
              {group.items.map(({ entry, index }) => (
                <button key={`${entry.entryId ?? ''}-${entry.setCode}-${entry.cardId}-${index}`} type="button" className={deckEntryClass('deck-compact-row', entry, selectedIndex === index)} onClick={() => onSelectEntry(index)}>
                  <span className="deck-entry-count">{entry.count}</span>
                  <span>
                    <strong>{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
                    <small>{deckOwnershipLabel(entry) ? `${deckOwnershipLabel(entry)} - ` : ''}<ManaCostSymbols value={entry.card?.manaCost} /> {entry.card?.typeLine ?? entry.setCode}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }
  if (mode === 'single') {
    const selected = entries.find(({ index }) => index === selectedIndex) ?? entries[0];
    const metadata = metadataFromDeckCard(selected?.entry.card);
    const imageSrc = imageUrlForMetadata(metadata, 'normal');
    return (
        <div className="deck-single-view">
          <div className="deck-single-list" role="listbox" aria-label="Deck section cards">
            {entries.map(({ entry, index }) => (
              <button key={`${entry.setCode}-${entry.cardId}-${index}`} type="button" className={deckEntryClass('', entry, selected?.index === index)} onClick={() => onSelectEntry(index)}>
                <strong>{entry.count} {entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
                <span>{deckEntrySupportingText(entry, entry.warning ?? entry.setCode)}</span>
              </button>
            ))}
          </div>
        <article className={selected?.entry ? deckEntryClass('deck-single-card', selected.entry) : 'deck-single-card'}>
          {imageSrc ? <img src={imageSrc} alt="" /> : <span className="tile-art-placeholder large">{selected?.entry.count ?? 0}</span>}
          <div>
            <h3>{selected?.entry.card?.name ?? selected?.entry.nameSnapshot ?? selected?.entry.cardId}</h3>
            <p className="workspace-copy">{metadata?.typeLine ?? selected?.entry.warning ?? 'Unresolved deck row'}</p>
            <div className="collection-detail-grid">
              <div className="readonly-line">
                <strong>Mana</strong>
                <ManaCostSymbols value={metadata?.manaCost} />
              </div>
              <div className="readonly-line">
                <strong>Print</strong>
                <span>{printLabelForMetadata(metadata) || selected?.entry.setCode}</span>
              </div>
            </div>
            {selected ? (
              <button type="button" className="secondary-button" onClick={() => onPreviewEntry(selected.index)}>
                Preview
              </button>
            ) : null}
          </div>
        </article>
      </div>
    );
  }
  if (mode === 'grid') {
    return (
      <div className="deck-entry-grid">
        {entries.map(({ entry, index }) => (
          <button key={`${entry.setCode}-${entry.cardId}-${index}`} type="button" className={deckEntryClass('deck-entry-card', entry, selectedIndex === index)} onClick={() => onSelectEntry(index)}>
            <DeckEntryImage entry={entry} />
            <span>
              <strong>{entry.count} {entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
              <small>{deckEntrySupportingText(entry, entry.warning ?? entry.card?.typeLine ?? entry.setCode)}</small>
            </span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="deck-compact-list">
      {entries.map(({ entry, index }) => (
        <button key={`${entry.setCode}-${entry.cardId}-${index}`} type="button" className={deckEntryClass('deck-compact-row', entry, selectedIndex === index)} onClick={() => onSelectEntry(index)}>
          <span className="deck-entry-count">{entry.count}</span>
          <span>
            <strong>{entry.card?.name ?? entry.nameSnapshot ?? entry.cardId}</strong>
            <small>{deckEntrySupportingText(entry, entry.warning ?? `${entry.setCode} - ${entry.card?.typeLine ?? entry.cardId}`)}</small>
          </span>
          <Icon name="view" />
        </button>
      ))}
    </div>
  );
}

function DeckEntryImage({ entry }: { entry: DeckState['entries'][number] }) {
  const metadata = metadataFromDeckCard(entry.card);
  const imageSrc = imageUrlForMetadata(metadata, 'small');
  return imageSrc ? <img src={imageSrc} alt="" /> : <span className="tile-art-placeholder">{entry.count}</span>;
}

function deckEntryClass(baseClass: string, entry: DeckState['entries'][number], selected = false): string {
  return [
    baseClass,
    selected ? 'selected' : '',
    deckOwnershipLabel(entry) ? 'not-owned' : ''
  ].filter(Boolean).join(' ');
}

function deckEntrySupportingText(entry: DeckState['entries'][number], fallback: string): string {
  const label = deckOwnershipLabel(entry);
  return label ? `${label} - ${fallback}` : fallback;
}

function deckOwnershipLabel(entry: DeckState['entries'][number]): string {
  return entry.card && !isOwnedStatus(entry.card.ownershipStatus) ? ownershipStatusLabel(entry.card.ownershipStatus) : '';
}

function candidateStatusLabel(value: DeckState['entries'][number]['candidateStatus']): string {
  if (value === 'candidate') {
    return 'Candidate';
  }
  if (value === 'testing') {
    return 'Testing';
  }
  if (value === 'locked') {
    return 'Locked';
  }
  if (value === 'cut') {
    return 'Cut';
  }
  return 'Active';
}

function groupEntries(
  entries: Array<{ entry: DeckState['entries'][number]; index: number }>,
  labelForEntry: (item: { entry: DeckState['entries'][number]; index: number }) => string
): Array<{ label: string; total: number; items: Array<{ entry: DeckState['entries'][number]; index: number }> }> {
  const groups = new Map<string, Array<{ entry: DeckState['entries'][number]; index: number }>>();
  for (const item of entries) {
    const label = labelForEntry(item);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  return [...groups.entries()]
    .map(([label, items]) => ({ label, total: items.reduce((sum, item) => sum + item.entry.count, 0), items }))
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}

function roleLabels(entry: DeckState['entries'][number]): string[] {
  return (entry.roles ?? []).map(roleLabel);
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ramp: 'Ramp',
    mana_source: 'Mana source',
    fixing: 'Fixing',
    draw: 'Draw',
    targeted_removal: 'Removal',
    board_wipe: 'Board wipe',
    stack_interaction: 'Stack interaction',
    protection: 'Protection',
    recursion: 'Recursion',
    tutor: 'Tutor',
    finisher: 'Finisher',
    enabler: 'Enabler',
    payoff: 'Payoff',
    synergy_piece: 'Synergy',
    utility: 'Utility',
    threat: 'Threat',
    land: 'Land',
    commander: 'Commander',
    sideboard_tech: 'Sideboard tech'
  };
  const normalized = role.toLowerCase().replace(/[\s-]+/g, '_');
  return labels[normalized] ?? normalized.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function manaBucket(entry: DeckState['entries'][number]): string {
  const typeLine = entry.card?.typeLine.toLowerCase() ?? '';
  if (typeLine.includes('land')) {
    return 'Lands';
  }
  const value = entry.card?.manaValue ?? parseManaValue(entry.card?.manaCost ?? '');
  if (value === undefined) {
    return 'No mana value';
  }
  return value >= 7 ? 'MV 7+' : `MV ${value}`;
}

function parseManaValue(manaCost: string): number | undefined {
  if (!manaCost.trim()) {
    return undefined;
  }
  const symbols = manaCost.match(/\{[^}]+\}/g);
  if (symbols?.length) {
    return symbols.reduce((total, symbol) => total + manaSymbolValue(symbol.replace(/[{}]/g, '')), 0);
  }
  return manaCost.split('').filter((character) => /[WUBRGC]/i.test(character)).length || undefined;
}

function manaSymbolValue(symbol: string): number {
  if (/^\d+$/.test(symbol)) {
    return Number(symbol);
  }
  return /^[XYZ]$/i.test(symbol) ? 0 : 1;
}
