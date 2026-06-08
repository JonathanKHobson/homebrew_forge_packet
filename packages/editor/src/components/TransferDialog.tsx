import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { exportCollection, exportDeck, exportSource, fetchCollection, fetchCollections, fetchDecks, fetchPreview, importCards } from '../api/client.js';
import type { CardDraft, CardVariantExportMode, CollectionEntry, CollectionExportTarget, CollectionState, CollectionSummary, DeckSummary, EditorProject, ExportSourceTarget, ImportCardsSummary, PreviewResponse } from '../domain/editorTypes.js';
import type { WorkspaceSection } from '../domain/editorUiTypes.js';
import type { TransferEntity } from '../domain/transferFlowTypes.js';
import { transferEntityLabels } from '../domain/transferFlowTypes.js';
import { formatCount } from '../domain/uiText.js';
import { CollectionImportPanel } from './CollectionImportPanel.js';
import { DeckImportPanel } from './DeckImportPanel.js';
import { Icon } from './Icon.js';
import { ImportExportPanel } from './ImportExportPanel.js';
import { LibraryImportPanel } from './LibraryImportPanel.js';
import { OverlayShell } from './overlays/OverlayShell.js';
import { ReferenceImportPanel } from './ReferenceImportPanel.js';
import { SetImportPanel } from './SetImportPanel.js';

export type TransferDialogMode = 'import' | 'export';

interface TransferDialogProps {
  mode: TransferDialogMode;
  project: EditorProject | null;
  activeWorkspace: WorkspaceSection;
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  onProjectLoaded: (project: EditorProject) => void;
  onStatus: (message: string) => void;
  onOpenPrint?: () => void;
  onClose: () => void;
}

const transferEntities: TransferEntity[] = ['cards', 'decks', 'sets', 'projects', 'library', 'collections', 'references'];

export function TransferDialog({ mode, project, activeWorkspace, draft, preview, onProjectLoaded, onStatus, onOpenPrint, onClose }: TransferDialogProps) {
  const initialEntity = transferEntityForWorkspace(activeWorkspace);
  const [entity, setEntity] = useState<TransferEntity>(initialEntity);
  const scopeLabelId = `${mode}-transfer-scope-label`;

  useEffect(() => {
    setEntity(initialEntity);
  }, [initialEntity, mode]);

  return (
    <OverlayShell
      title={mode === 'import' ? 'Import' : 'Export'}
      eyebrow="File"
      subtitle={mode === 'import' ? 'Bring cards, decks, sets, projects, gallery assets, collections, or references into the workspace.' : 'Send cards, decks, sets, projects, gallery assets, collections, or references out of the workspace.'}
      dirty={false}
      footer={
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      }
      onClose={onClose}
    >
      <div className="transfer-hub-layout">
        <div className="transfer-scope-panel">
          <div className="transfer-scope-label" id={scopeLabelId}>
            Transfer scope
          </div>
          <nav className="transfer-entity-nav" aria-labelledby={scopeLabelId}>
            {transferEntities.map((item) => (
              <button key={item} type="button" className={entity === item ? 'selected' : ''} aria-current={entity === item ? 'page' : undefined} onClick={() => setEntity(item)}>
                <Icon name={iconForEntity(item)} />
                <span>{transferEntityLabels[item]}</span>
              </button>
            ))}
          </nav>
        </div>
        {mode === 'import' ? (
          <ImportDialogContent entity={entity} project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} />
        ) : (
          <ExportDialogContent entity={entity} project={project} draft={draft} preview={preview} onStatus={onStatus} onOpenPrint={onOpenPrint} />
        )}
      </div>
    </OverlayShell>
  );
}

function transferEntityForWorkspace(section: WorkspaceSection): TransferEntity {
  if (section === 'decks' || section === 'sets' || section === 'projects' || section === 'library') {
    return section;
  }
  if (section === 'reference') {
    return 'references';
  }
  if (section === 'collections' || section === 'binders' || section === 'lists') {
    return 'collections';
  }
  return 'cards';
}

function ImportDialogContent({
  entity,
  project,
  onProjectLoaded,
  onStatus
}: Pick<TransferDialogProps, 'project' | 'onProjectLoaded' | 'onStatus'> & { entity: TransferEntity }) {
  if (entity === 'cards') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>Cards</h3>
        <p className="workspace-copy">
          Import authored card files into the active set. Use Homebrew Forge CSV when the upload includes variants, tags, notes, status, or export policy.
        </p>
        <ImportExportPanel project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} defaultOpen />
        <CollectionToSetImportPanel entity={entity} project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'sets') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>Sets</h3>
        <p className="workspace-copy">
          Create a new set from an uploaded card file. This asks for set identity first, then imports the cards into that new set.
        </p>
        <SetImportPanel project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'decks') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>Decks</h3>
        <p className="workspace-copy">
          Import decklists as new decks or merge them into existing deck storage. Deck CSV can include optional variant_id for deck-specific variant selection.
        </p>
        <DeckImportPanel project={project} onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'collections') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>Collections</h3>
        <p className="workspace-copy">Import scanner CSV, generic CSV, plain text lists, or Cockatrice .cod/XML into an isolated collection. Unresolved rows stay available for review.</p>
        <CollectionImportPanel onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'library') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>Gallery</h3>
        <p className="workspace-copy">
          Import URL, local-path, or data-URI asset rows into a set gallery. CSV rows can assign assets to card IDs, card names, or specific variant IDs.
        </p>
        <LibraryImportPanel project={project} onProjectLoaded={onProjectLoaded} onStatus={onStatus} />
      </div>
    );
  }
  if (entity === 'references') {
    return (
      <div className="workspace-card transfer-hub-card">
        <h3>References</h3>
        <p className="workspace-copy">
          Import local custom or homebrew reference terms from CSV. Official snapshot imports remain separate so reviewed official data is not overwritten by accident.
        </p>
        <ReferenceImportPanel onStatus={onStatus} />
      </div>
    );
  }
  return (
    <StagedTransferCard
      icon="universes"
      title="Project Import"
      body="Project import will package multiple sets, decks, and gallery assets. The data contract is staged so this does not invent a parallel project store."
      actions={['Project package', 'Multi-set import', 'Deck package']}
    />
  );
}

function ExportDialogContent({
  entity,
  project,
  draft,
  preview,
  onStatus,
  onOpenPrint
}: Pick<TransferDialogProps, 'project' | 'draft' | 'preview' | 'onStatus' | 'onOpenPrint'> & { entity: TransferEntity }) {
  if (entity === 'cards') {
    return <CardExportPanel project={project} draft={draft} preview={preview} onStatus={onStatus} onOpenPrint={onOpenPrint} />;
  }
  if (entity === 'sets') {
    return <SetExportPanel project={project} onStatus={onStatus} onOpenPrint={onOpenPrint} />;
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
      body="Project export will collect project sets, decks, cards, gallery assets, and references into one package after the holding-group model is finalized."
      actions={['Project archive', 'All project sets', 'Linked decks']}
    />
  );
}

function CardExportPanel({ project, draft, preview, onStatus, onOpenPrint }: Pick<TransferDialogProps, 'project' | 'draft' | 'preview' | 'onStatus' | 'onOpenPrint'>) {
  const [selectedDraftKey, setSelectedDraftKey] = useState(draft ? draftKey(draft) : '');
  const selectedDraft = useMemo(() => project?.drafts.find((candidate) => draftKey(candidate) === selectedDraftKey) ?? draft ?? null, [draft, project?.drafts, selectedDraftKey]);
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
        <select value={selectedDraftKey} disabled={!project} onChange={(event) => setSelectedDraftKey(event.target.value)}>
          {(project?.drafts ?? []).map((candidate) => (
            <option key={draftKey(candidate)} value={draftKey(candidate)}>
              {candidate.collectorNumber} - {candidate.name} / {candidate.variantDisplayName}
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
        <button type="button" className="secondary-button" disabled={!selectedDraft || !onOpenPrint} onClick={onOpenPrint}>
          Print proof...
        </button>
      </div>
    </div>
  );
}

function SetExportPanel({ project, onStatus, onOpenPrint }: Pick<TransferDialogProps, 'project' | 'onStatus' | 'onOpenPrint'>) {
  const [busyTarget, setBusyTarget] = useState<string>('');
  const [variantMode, setVariantMode] = useState<CardVariantExportMode>('primary');

  async function downloadTarget(target: ExportSourceTarget) {
    if (!project) {
      return;
    }
    setBusyTarget(target);
    try {
      const result = await exportSource({ setCode: project.setCode, target, variantMode });
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
      <FieldLike label="Variants">
        <select value={variantMode} onChange={(event) => setVariantMode(event.target.value as CardVariantExportMode)}>
          <option value="primary">Primary only</option>
          <option value="default">Default export variants</option>
          <option value="all_active">All active variants</option>
          <option value="all">All variants including archived</option>
        </select>
      </FieldLike>
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
        <button type="button" className="secondary-button" disabled={!project || !onOpenPrint} onClick={onOpenPrint}>
          Print proof...
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
              {deck.name} - {formatCount(deck.cardCount, 'card')}
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
              {collection.name} - {formatCount(collection.cardCount, 'card')}
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
  const reviewRowCount = collection?.entries.filter((entry) => entry.reviewStatus === 'needs_review').length ?? 0;

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
      onStatus(dryRun ? `Dry-run prepared ${formatCount(result.summary.importedCards, 'collection draft card')}.` : `Imported ${formatCount(result.summary.importedCards, 'collection draft card')} into ${project.setCode}.`);
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
                {candidate.name} - {formatCount(candidate.cardCount, 'card')}
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
        <span>{formatCount(importRows.length, 'row')} selected</span>
        <span>{formatCount(reviewRowCount, 'row')} {reviewRowCount === 1 ? 'needs' : 'need'} review</span>
      </div>
      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={!project || busy !== '' || importRows.length === 0} onClick={() => void runImport(true)}>
          Dry run
        </button>
        <button type="button" className="secondary-button" disabled={!project || busy !== '' || importRows.length === 0} onClick={() => void runImport(false)}>
          {busy === 'import' ? 'Importing...' : 'Copy to active set'}
        </button>
      </div>
      {summary ? (
        <div className="import-summary">
          <strong>{summary.dryRun ? 'Dry run' : 'Import'} summary</strong>
          <span>{formatCount(summary.importedCards, 'draft card')} copied from collection rows</span>
          <span>{formatCount(summary.warnings.length, 'warning')}</span>
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
      <h3>Gallery</h3>
      <p className="workspace-copy">Export the active set art manifest now. Full binary asset packaging is staged for the gallery asset phase.</p>
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

function draftKey(draft: CardDraft): string {
  return `${draft.cardId}::${draft.variantId}`;
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
