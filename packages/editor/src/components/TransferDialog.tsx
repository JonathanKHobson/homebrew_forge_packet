import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { exportCollection, exportDeck, exportSource, fetchCollection, fetchCollections, fetchDecks, fetchPreview, importCards } from '../api/client.js';
import type { CardDraft, CollectionEntry, CollectionExportTarget, CollectionState, CollectionSummary, DeckSummary, EditorProject, ExportSourceTarget, ImportCardsSummary, PreviewResponse } from '../domain/editorTypes.js';
import type { TransferEntity } from '../domain/transferFlowTypes.js';
import { transferEntityLabels } from '../domain/transferFlowTypes.js';
import { CollectionImportPanel } from './CollectionImportPanel.js';
import { Icon } from './Icon.js';
import { ImportExportPanel } from './ImportExportPanel.js';
import { OverlayShell } from './overlays/OverlayShell.js';

export type TransferDialogMode = 'import' | 'export';

interface TransferDialogProps {
  mode: TransferDialogMode;
  project: EditorProject | null;
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  onProjectLoaded: (project: EditorProject) => void;
  onStatus: (message: string) => void;
  onClose: () => void;
}

const transferEntities: TransferEntity[] = ['cards', 'decks', 'collections', 'sets', 'projects', 'library', 'references'];

export function TransferDialog({ mode, project, draft, preview, onProjectLoaded, onStatus, onClose }: TransferDialogProps) {
  const [entity, setEntity] = useState<TransferEntity>(mode === 'import' ? 'cards' : 'sets');
  return (
    <OverlayShell
      title={mode === 'import' ? 'Import' : 'Export'}
      eyebrow="File"
      subtitle={mode === 'import' ? 'Bring cards, decks, collections, sets, projects, assets, or references into the workspace.' : 'Send cards, decks, collections, sets, projects, assets, or references out of the workspace.'}
      dirty={false}
      footer={
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      }
      onClose={onClose}
    >
      <div className="transfer-hub-layout">
        <nav className="transfer-entity-nav" aria-label={`${mode} entity`}>
          {transferEntities.map((item) => (
            <button key={item} type="button" className={entity === item ? 'selected' : ''} onClick={() => setEntity(item)}>
              <Icon name={iconForEntity(item)} />
              <span>{transferEntityLabels[item]}</span>
            </button>
          ))}
        </nav>
        {mode === 'import' ? (
          <ImportDialogContent entity={entity} project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} />
        ) : (
          <ExportDialogContent entity={entity} project={project} draft={draft} preview={preview} onStatus={onStatus} />
        )}
      </div>
    </OverlayShell>
  );
}

function ImportDialogContent({
  entity,
  project,
  onProjectLoaded,
  onStatus
}: Pick<TransferDialogProps, 'project' | 'onProjectLoaded' | 'onStatus'> & { entity: TransferEntity }) {
  if (entity === 'cards' || entity === 'sets') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>{entity === 'cards' ? 'Cards' : 'Sets'}</h3>
        <p className="workspace-copy">
          {entity === 'cards'
            ? 'Import card CSV/XML into the active set or use the Cards plus button for a single-card creation import.'
            : 'Import set-shaped CSV/XML into the active set. Creating a brand-new set with an attached import file lives in the Sets plus overlay.'}
        </p>
        <ImportExportPanel project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} defaultOpen />
        <CollectionToSetImportPanel entity={entity} project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'decks') {
    return (
      <StagedTransferCard
        icon="decks"
        title="Deck Import"
        body="Deck text, Cockatrice .cod, and markdown deck imports are staged for the deck importer. Existing deck export is already wired in Export > Decks."
        actions={['Text decklists', 'Cockatrice .cod', 'Markdown decklists']}
      />
    );
  }
  if (entity === 'collections') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>Collections</h3>
        <p className="workspace-copy">Import scanner CSV from ManaBox, TCGplayer, Dragon Shield, Delver, or a generic card list.</p>
        <CollectionImportPanel onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'library') {
    return (
      <StagedTransferCard
        icon="assets"
        title="Library Import"
        body="Use the Library plus overlay for single asset upload, URL, local path, metadata, and optional card assignment. Bulk CSV-backed asset import is staged here."
        actions={['Bulk image selection', 'CSV metadata', 'URL manifest']}
      />
    );
  }
  if (entity === 'references') {
    return (
      <StagedTransferCard
        icon="guide"
        title="Reference Import"
        body="Reference import will align after the active Reference implementation lands. The current Reference plus overlay remains owned by that separate branch."
        actions={['Terms CSV', 'Rules glossary', 'Project notes']}
      />
    );
  }
  return (
    <StagedTransferCard
      icon="universes"
      title="Project Import"
      body="Project import will package multiple sets, decks, and library assets. The data contract is staged so this does not invent a parallel project store."
      actions={['Project package', 'Multi-set import', 'Deck bundle']}
    />
  );
}

function ExportDialogContent({
  entity,
  project,
  draft,
  preview,
  onStatus
}: Pick<TransferDialogProps, 'project' | 'draft' | 'preview' | 'onStatus'> & { entity: TransferEntity }) {
  if (entity === 'cards') {
    return <CardExportPanel project={project} draft={draft} preview={preview} onStatus={onStatus} />;
  }
  if (entity === 'sets') {
    return <SetExportPanel project={project} onStatus={onStatus} />;
  }
  if (entity === 'decks') {
    return <DeckExportPanel onStatus={onStatus} />;
  }
  if (entity === 'collections') {
    return <CollectionExportPanel onStatus={onStatus} />;
  }
  if (entity === 'library') {
    return <LibraryExportPanel project={project} onStatus={onStatus} />;
  }
  if (entity === 'references') {
    return (
      <StagedTransferCard
        icon="guide"
        title="Reference Export"
        body="Reference export is staged until the Reference thread settles its final storage and authoring contract."
        actions={['Reference CSV', 'Glossary markdown', 'Rules appendix']}
      />
    );
  }
  return (
    <StagedTransferCard
      icon="universes"
      title="Project Export"
      body="Project export will collect project sets, decks, cards, library assets, and references into one package after the holding-group model is finalized."
      actions={['Project archive', 'All project sets', 'Linked decks']}
    />
  );
}

function CardExportPanel({ project, draft, preview, onStatus }: Pick<TransferDialogProps, 'project' | 'draft' | 'preview' | 'onStatus'>) {
  const [selectedCardId, setSelectedCardId] = useState(draft?.cardId ?? '');
  const selectedDraft = useMemo(() => project?.drafts.find((candidate) => candidate.cardId === selectedCardId) ?? draft ?? null, [draft, project?.drafts, selectedCardId]);
  const [selectedPreview, setSelectedPreview] = useState<PreviewResponse | null>(selectedDraft?.cardId === draft?.cardId ? preview : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedDraft) {
      setSelectedPreview(null);
      return;
    }
    if (selectedDraft.cardId === draft?.cardId) {
      setSelectedPreview(preview);
      return;
    }
    let cancelled = false;
    setBusy(true);
    void fetchPreview(selectedDraft)
      .then((result) => {
        if (!cancelled) {
          setSelectedPreview(result);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft?.cardId, onStatus, preview, selectedDraft]);

  function downloadSelectedCardPng() {
    if (!selectedPreview?.imageDataUri || !selectedDraft) {
      onStatus('Render the selected card before downloading PNG.');
      return;
    }
    downloadDataUri(`${selectedDraft.cardId}.png`, selectedPreview.imageDataUri);
    onStatus(`Exported ${selectedDraft.name} PNG.`);
  }

  return (
    <div className="workspace-card transfer-hub-card">
      <h3>Cards</h3>
      <p className="workspace-copy">Export the current card or choose another card from the active set.</p>
      <FieldLike label="Card">
        <select value={selectedCardId} disabled={!project} onChange={(event) => setSelectedCardId(event.target.value)}>
          {(project?.drafts ?? []).map((candidate) => (
            <option key={candidate.cardId} value={candidate.cardId}>
              {candidate.collectorNumber} - {candidate.name}
            </option>
          ))}
        </select>
      </FieldLike>
      <div className="export-actions">
        <button type="button" className="primary-button" disabled={!selectedPreview?.imageDataUri || busy} onClick={downloadSelectedCardPng}>
          {busy ? 'Rendering...' : 'PNG'}
        </button>
        <button type="button" className="secondary-button" disabled>
          SVG
        </button>
      </div>
    </div>
  );
}

function SetExportPanel({ project, onStatus }: Pick<TransferDialogProps, 'project' | 'onStatus'>) {
  const [busyTarget, setBusyTarget] = useState<string>('');

  async function downloadTarget(target: ExportSourceTarget) {
    if (!project) {
      return;
    }
    setBusyTarget(target);
    try {
      const result = await exportSource({ setCode: project.setCode, target });
      downloadContent(result.filename, result.mimeType, result.encoding, result.content);
      onStatus(result.sync ? `Exported ${result.filename}. Synced ${result.sync.imageCount} Cockatrice images.` : `Exported ${result.filename}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyTarget('');
    }
  }

  return (
    <div className="workspace-card transfer-hub-card">
      <h3>Sets</h3>
      <p className="workspace-copy">Generate files for Cockatrice or pull the active set source CSVs for AI/table editing.</p>
      <div className="export-actions">
        <button type="button" className="primary-button" disabled={!project || busyTarget === 'cockatrice_zip'} onClick={() => void downloadTarget('cockatrice_zip')}>
          {busyTarget === 'cockatrice_zip' ? 'Exporting...' : 'Cockatrice ZIP'}
        </button>
        <button type="button" className="secondary-button" disabled={!project || busyTarget === 'cockatrice_xml'} onClick={() => void downloadTarget('cockatrice_xml')}>
          Cockatrice XML
        </button>
        <button type="button" className="secondary-button" disabled={!project || busyTarget === 'cards_csv'} onClick={() => void downloadTarget('cards_csv')}>
          Cards CSV
        </button>
        <button type="button" className="secondary-button" disabled={!project || busyTarget === 'faces_csv'} onClick={() => void downloadTarget('faces_csv')}>
          Card Faces CSV
        </button>
        <button type="button" className="secondary-button" disabled={!project || busyTarget === 'art_csv'} onClick={() => void downloadTarget('art_csv')}>
          Art Manifest CSV
        </button>
      </div>
    </div>
  );
}

function DeckExportPanel({ onStatus }: Pick<TransferDialogProps, 'onStatus'>) {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchDecks()
      .then((loaded) => {
        if (!cancelled) {
          setDecks(loaded);
          setSelectedDeckId((current) => current || loaded[0]?.deckId || '');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  async function downloadDeck(target: 'text' | 'cockatrice') {
    if (!selectedDeckId) {
      return;
    }
    setBusy(true);
    try {
      const result = await exportDeck(selectedDeckId, target);
      downloadContent(result.filename, result.mimeType, 'text', result.content);
      onStatus(`Exported ${result.filename}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-card transfer-hub-card">
      <h3>Decks</h3>
      <p className="workspace-copy">Export existing decks as table text or Cockatrice .cod.</p>
      <FieldLike label="Deck">
        <select value={selectedDeckId} disabled={!decks.length} onChange={(event) => setSelectedDeckId(event.target.value)}>
          {decks.map((deck) => (
            <option key={deck.deckId} value={deck.deckId}>
              {deck.name} - {deck.cardCount} cards
            </option>
          ))}
        </select>
      </FieldLike>
      <div className="export-actions">
        <button type="button" className="primary-button" disabled={busy || !selectedDeckId} onClick={() => void downloadDeck('text')}>
          Text
        </button>
        <button type="button" className="secondary-button" disabled={busy || !selectedDeckId} onClick={() => void downloadDeck('cockatrice')}>
          .cod
        </button>
      </div>
    </div>
  );
}

function CollectionExportPanel({ onStatus }: Pick<TransferDialogProps, 'onStatus'>) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [busyTarget, setBusyTarget] = useState<CollectionExportTarget | ''>('');

  useEffect(() => {
    let cancelled = false;
    void fetchCollections()
      .then((loaded) => {
        if (!cancelled) {
          setCollections(loaded);
          setSelectedCollectionId((current) => current || loaded[0]?.collectionId || '');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  async function downloadCollection(target: CollectionExportTarget) {
    if (!selectedCollectionId) {
      return;
    }
    setBusyTarget(target);
    try {
      const result = await exportCollection(selectedCollectionId, target);
      downloadContent(result.filename, result.mimeType, 'text', result.content);
      onStatus(`Exported ${result.filename}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyTarget('');
    }
  }

  return (
    <div className="workspace-card transfer-hub-card">
      <h3>Collections</h3>
      <p className="workspace-copy">Export scanned physical-card collections for table review or Cockatrice.</p>
      <FieldLike label="Collection">
        <select value={selectedCollectionId} disabled={!collections.length} onChange={(event) => setSelectedCollectionId(event.target.value)}>
          {collections.map((collection) => (
            <option key={collection.collectionId} value={collection.collectionId}>
              {collection.name} - {collection.cardCount} cards
            </option>
          ))}
        </select>
      </FieldLike>
      <div className="export-actions">
        <button type="button" className="primary-button" disabled={busyTarget !== '' || !selectedCollectionId} onClick={() => void downloadCollection('csv')}>
          CSV
        </button>
        <button type="button" className="secondary-button" disabled={busyTarget !== '' || !selectedCollectionId} onClick={() => void downloadCollection('text')}>
          Text
        </button>
        <button type="button" className="secondary-button" disabled={busyTarget !== '' || !selectedCollectionId} onClick={() => void downloadCollection('cockatrice')}>
          .cod
        </button>
      </div>
    </div>
  );
}

function CollectionToSetImportPanel({
  entity,
  project,
  onProjectLoaded,
  onStatus
}: Pick<TransferDialogProps, 'project' | 'onProjectLoaded' | 'onStatus'> & { entity: 'cards' | 'sets' }) {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collection, setCollection] = useState<CollectionState | null>(null);
  const [query, setQuery] = useState('');
  const [includeReviewRows, setIncludeReviewRows] = useState(false);
  const [summary, setSummary] = useState<ImportCardsSummary | null>(null);
  const [busy, setBusy] = useState<'load' | 'dry-run' | 'import' | ''>('');

  useEffect(() => {
    let cancelled = false;
    async function loadCollections() {
      setBusy('load');
      try {
        const loaded = await fetchCollections();
        if (cancelled) {
          return;
        }
        setCollections(loaded);
        const firstId = loaded[0]?.collectionId ?? '';
        setSelectedCollectionId(firstId);
        if (firstId) {
          const loadedCollection = await fetchCollection(firstId);
          if (!cancelled) {
            setCollection(loadedCollection);
          }
        }
      } catch (error) {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setBusy('');
        }
      }
    }
    void loadCollections();
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  async function selectCollection(collectionId: string) {
    setSelectedCollectionId(collectionId);
    setSummary(null);
    if (!collectionId) {
      setCollection(null);
      return;
    }
    setBusy('load');
    try {
      setCollection(await fetchCollection(collectionId));
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  const importRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (collection?.entries ?? [])
      .filter((entry) => includeReviewRows || entry.reviewStatus === 'matched')
      .filter((entry) => !needle || `${entry.cardName} ${entry.setCode ?? ''} ${entry.collectorNumber ?? ''} ${entry.reviewNotes ?? ''}`.toLowerCase().includes(needle));
  }, [collection?.entries, includeReviewRows, query]);

  async function runImport(dryRun: boolean) {
    if (!project || !collection || importRows.length === 0) {
      return;
    }
    setBusy(dryRun ? 'dry-run' : 'import');
    try {
      const result = await importCards({
        setCode: project.setCode,
        format: 'csv',
        mode: 'append',
        content: buildCollectionDraftCsv(collection, importRows),
        dryRun
      });
      setSummary(result.summary);
      if (!dryRun) {
        onProjectLoaded(result.project);
      }
      onStatus(dryRun ? `Dry-run prepared ${result.summary.importedCards} collection draft cards.` : `Imported ${result.summary.importedCards} collection draft cards into ${project.setCode}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="collection-copy-import">
      <h3>Import from Collection</h3>
      <p className="workspace-copy">
        Copy collection rows into the active {entity === 'cards' ? 'card list' : 'set'} as editable draft templates. The original collection stays isolated.
      </p>
      <div className="grid-2">
        <FieldLike label="Collection">
          <select value={selectedCollectionId} disabled={busy === 'load' || !collections.length} onChange={(event) => void selectCollection(event.target.value)}>
            {collections.map((candidate) => (
              <option key={candidate.collectionId} value={candidate.collectionId}>
                {candidate.name} - {candidate.cardCount} cards
              </option>
            ))}
          </select>
        </FieldLike>
        <label className="search-field">
          <Icon name="search" />
          <input value={query} placeholder="Search collection rows..." onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={includeReviewRows} onChange={(event) => setIncludeReviewRows(event.target.checked)} />
        Include needs-review rows
      </label>
      <div className="staged-action-list">
        <span>{importRows.length} rows selected</span>
        <span>{collection?.entries.filter((entry) => entry.reviewStatus === 'needs_review').length ?? 0} need review</span>
      </div>
      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={!project || busy !== '' || importRows.length === 0} onClick={() => void runImport(true)}>
          Dry Run
        </button>
        <button type="button" className="primary-button" disabled={!project || busy !== '' || importRows.length === 0} onClick={() => void runImport(false)}>
          {busy === 'import' ? 'Importing...' : 'Copy To Active Set'}
        </button>
      </div>
      {summary ? (
        <div className="import-summary">
          <strong>{summary.dryRun ? 'Dry Run' : 'Import'} Summary</strong>
          <span>{summary.importedCards} draft cards copied from collection rows</span>
          <span>{summary.warnings.length} warnings</span>
        </div>
      ) : null}
    </div>
  );
}

function LibraryExportPanel({ project, onStatus }: Pick<TransferDialogProps, 'project' | 'onStatus'>) {
  const [busy, setBusy] = useState(false);

  async function downloadLibraryManifest() {
    if (!project) {
      return;
    }
    setBusy(true);
    try {
      const result = await exportSource({ setCode: project.setCode, target: 'art_csv' });
      downloadContent(result.filename, result.mimeType, result.encoding, result.content);
      onStatus(`Exported ${result.filename}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-card transfer-hub-card">
      <h3>Library</h3>
      <p className="workspace-copy">Export the active set art manifest now. Full binary asset packaging is staged for the library asset phase.</p>
      <div className="export-actions">
        <button type="button" className="primary-button" disabled={busy || !project} onClick={() => void downloadLibraryManifest()}>
          Art Manifest CSV
        </button>
        <button type="button" className="secondary-button" disabled>
          Asset Package
        </button>
      </div>
    </div>
  );
}

function StagedTransferCard({ icon, title, body, actions }: { icon: ReturnType<typeof iconForEntity>; title: string; body: string; actions: string[] }) {
  return (
    <div className="workspace-card transfer-hub-card staged-flow-card-large">
      <Icon name={icon} />
      <h3>{title}</h3>
      <p className="workspace-copy">{body}</p>
      <div className="staged-action-list">
        {actions.map((action) => (
          <span key={action}>{action}</span>
        ))}
      </div>
    </div>
  );
}

function FieldLike({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function iconForEntity(entity: TransferEntity): 'cards' | 'decks' | 'collections' | 'sets' | 'universes' | 'assets' | 'guide' {
  if (entity === 'cards') {
    return 'cards';
  }
  if (entity === 'decks') {
    return 'decks';
  }
  if (entity === 'collections') {
    return 'collections';
  }
  if (entity === 'sets') {
    return 'sets';
  }
  if (entity === 'projects') {
    return 'universes';
  }
  if (entity === 'library') {
    return 'assets';
  }
  return 'guide';
}

function downloadContent(filename: string, mimeType: string, encoding: 'text' | 'base64', content: string): void {
  const bytes = encoding === 'base64' ? Uint8Array.from(window.atob(content), (char) => char.charCodeAt(0)) : content;
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDataUri(filename: string, dataUri: string): void {
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = filename;
  link.click();
}

function buildCollectionDraftCsv(collection: CollectionState, rows: CollectionEntry[]): string {
  const headers = [
    'card_id',
    'collector_number',
    'name',
    'layout',
    'mode',
    'source_card_name',
    'source_set_code',
    'rarity',
    'tags',
    'status',
    'print_count',
    'type_line',
    'oracle_text',
    'frame_type',
    'notes'
  ];
  const csvRows = rows.map((entry, index) => {
    const tags = ['collection-copy', `collection:${collection.metadata.collectionId}`, entry.reviewStatus === 'needs_review' ? 'needs-review' : 'matched-reference'];
    return {
      card_id: safeCsvId(`collection-${collection.metadata.collectionId}-${entry.entryId}`),
      collector_number: `COL${String(index + 1).padStart(3, '0')}`,
      name: entry.cardName,
      layout: 'normal',
      mode: 'placeholder',
      source_card_name: entry.cardName,
      source_set_code: entry.setCode ?? '',
      rarity: 'common',
      tags: tags.join(';'),
      status: entry.reviewStatus === 'needs_review' ? 'review' : 'draft',
      print_count: String(entry.quantity),
      type_line: 'Card',
      oracle_text: 'Collection-derived draft template. Verify official text, type line, mana cost, and print identity before using as an authored card.',
      frame_type: 'normal_artifact',
      notes: [
        `Copied from collection "${collection.metadata.name}".`,
        entry.setCode ? `source_set=${entry.setCode}` : '',
        entry.collectorNumber ? `collector_number=${entry.collectorNumber}` : '',
        entry.scryfallId ? `scryfall_id=${entry.scryfallId}` : '',
        entry.reviewNotes ? `review_notes=${entry.reviewNotes}` : ''
      ]
        .filter(Boolean)
        .join(' ')
    };
  });
  return [headers.join(','), ...csvRows.map((row) => headers.map((header) => escapeCsvCell(String(row[header as keyof typeof row] ?? ''))).join(','))].join('\n');
}

function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function safeCsvId(value: string): string {
  return slugify(value).replace(/[^A-Za-z0-9_-]/g, '_') || 'collection-card';
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
