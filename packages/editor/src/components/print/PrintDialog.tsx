import { useEffect, useMemo, useState } from 'react';
import { exportPrint, fetchCollections, fetchDecks } from '../../api/client.js';
import type {
  CardDraft,
  CardVariantExportMode,
  CollectionSummary,
  DeckSummary,
  EditorProject,
  LibraryState,
  PreviewResponse,
  PrintExportRequest,
  PrintExportResult,
  PrintInkMode,
  PrintLayout,
  PrintOutputFormat,
  PrintPaper,
  PrintSourceKind
} from '../../domain/editorTypes.js';
import { formatCount } from '../../domain/uiText.js';
import { OverlayShell } from '../overlays/OverlayShell.js';

interface PrintDialogProps {
  project: EditorProject | null;
  library: LibraryState | null;
  selectedUniverseId: string;
  draft: CardDraft | null;
  preview: PreviewResponse | null;
  onStatus: (message: string) => void;
  onClose: () => void;
}

const sourceOptions: Array<{ value: PrintSourceKind; label: string }> = [
  { value: 'current_card', label: 'Current Card' },
  { value: 'active_set', label: 'Active Set' },
  { value: 'deck', label: 'Deck' },
  { value: 'collection', label: 'Collection' },
  { value: 'project', label: 'Project' }
];

const inkModes: Array<{ value: PrintInkMode; label: string }> = [
  { value: 'full_color', label: 'Full color' },
  { value: 'low_ink', label: 'Low ink' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'text_only', label: 'Text only' }
];

const layouts: Array<{ value: PrintLayout; label: string }> = [
  { value: 'single_card', label: '1-up card' },
  { value: 'nine_up', label: '9-up sheet' }
];

const papers: Array<{ value: PrintPaper; label: string }> = [
  { value: 'letter', label: 'Letter' },
  { value: 'a4', label: 'A4' },
  { value: 'photo_4x6', label: '4x6 glossy photo' }
];

export function PrintDialog({ project, library, selectedUniverseId, draft, preview: _preview, onStatus, onClose }: PrintDialogProps) {
  const [sourceKind, setSourceKind] = useState<PrintSourceKind>(draft ? 'current_card' : 'active_set');
  const [outputFormat, setOutputFormat] = useState<PrintOutputFormat>('pdf');
  const [paper, setPaper] = useState<PrintPaper>('letter');
  const [layout, setLayout] = useState<PrintLayout>('single_card');
  const [inkMode, setInkMode] = useState<PrintInkMode>('full_color');
  const [copies, setCopies] = useState(1);
  const [scalePercent, setScalePercent] = useState(100);
  const [includeCropMarks, setIncludeCropMarks] = useState(true);
  const [includeCutLines, setIncludeCutLines] = useState(false);
  const [variantMode, setVariantMode] = useState<CardVariantExportMode>('primary');
  const [selectedDraftKey, setSelectedDraftKey] = useState(draftKey(draft));
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [selectedPrintUniverseId, setSelectedPrintUniverseId] = useState(selectedUniverseId);
  const [busyAction, setBusyAction] = useState<'download' | 'print' | ''>('');
  const [proofResult, setProofResult] = useState<PrintExportResult | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofRetryCount, setProofRetryCount] = useState(0);

  useEffect(() => {
    setSelectedDraftKey(draftKey(draft));
  }, [draft?.cardId, draft?.variantId]);

  useEffect(() => {
    setSelectedPrintUniverseId((current) => current || selectedUniverseId);
  }, [selectedUniverseId]);

  useEffect(() => {
    if (paper === 'photo_4x6' && layout !== 'single_card') {
      setLayout('single_card');
    }
  }, [layout, paper]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchDecks(), fetchCollections()])
      .then(([loadedDecks, loadedCollections]) => {
        if (cancelled) {
          return;
        }
        setDecks(loadedDecks);
        setCollections(loadedCollections);
        setSelectedCollectionId((current) => current || loadedCollections[0]?.collectionId || '');
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

  const currentCardDrafts = useMemo(() => {
    if (!project || !draft) {
      return draft ? [draft] : [];
    }
    const variants = project.drafts.filter((candidate) => candidate.cardId === draft.cardId);
    return variants.length ? variants : [draft];
  }, [draft, project]);
  const projectDecks = useMemo(
    () => (selectedUniverseId ? decks.filter((deck) => deck.linkedUniverseId === selectedUniverseId) : decks),
    [decks, selectedUniverseId]
  );
  useEffect(() => {
    setSelectedDeckId((current) => (projectDecks.some((deck) => deck.deckId === current) ? current : projectDecks[0]?.deckId ?? ''));
  }, [projectDecks]);

  const selectedPrintDraft = currentCardDrafts.find((candidate) => draftKey(candidate) === selectedDraftKey) ?? draft;
  const activeUniverse = library?.universes.find((universe) => universe.id === selectedPrintUniverseId) ?? null;
  const selectedDeck = projectDecks.find((deck) => deck.deckId === selectedDeckId) ?? null;
  const selectedCollection = collections.find((collection) => collection.collectionId === selectedCollectionId) ?? null;
  const printRequest = useMemo(() => buildPrintRequest(), [sourceKind, selectedPrintDraft, project?.setCode, outputFormat, paper, layout, inkMode, copies, scalePercent, includeCropMarks, includeCutLines, variantMode, selectedDeckId, selectedCollectionId, selectedPrintUniverseId]);
  const proofRequest = useMemo(() => (printRequest ? { ...printRequest, outputFormat: 'png' as const } : null), [printRequest]);
  const requestKey = printRequest ? JSON.stringify(printRequest) : '';
  const proofRequestKey = printRequest ? requestKey : '';
  const canPrint = Boolean(printRequest);
  const actionLabel = outputFormat === 'pdf' ? 'Download Proof PDF' : 'Download Proof PNG';
  const selectedSummary = sourceSummary(sourceKind, {
    draft: selectedPrintDraft,
    project,
    deck: selectedDeck,
    collection: selectedCollection,
    universe: activeUniverse
  });

  useEffect(() => {
    if (!proofRequest || !proofRequestKey) {
      setProofResult(null);
      setProofError('');
      setProofLoading(false);
      return;
    }
    let cancelled = false;
    setProofLoading(true);
    setProofError('');
    const timeout = window.setTimeout(() => {
      void exportPrintProof(proofRequest)
        .then((result) => {
          if (cancelled) {
            return;
          }
          setProofResult(result);
        })
        .catch((error: unknown) => {
          if (cancelled) {
            return;
          }
          setProofResult(null);
          setProofError(proofErrorMessage(error));
        })
        .finally(() => {
          if (!cancelled) {
            setProofLoading(false);
          }
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [proofRequest, proofRequestKey, proofRetryCount]);

  useEffect(() => {
    if (!proofResult) {
      setProofUrl('');
      return;
    }
    const url = URL.createObjectURL(resultBlob(proofResult));
    setProofUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proofResult]);

  function updateSource(nextSource: PrintSourceKind) {
    setSourceKind(nextSource);
    if (nextSource === 'current_card' && layout === 'nine_up') {
      setLayout('single_card');
    }
    if (nextSource !== 'current_card' && layout === 'single_card' && paper !== 'photo_4x6') {
      setLayout('nine_up');
    }
  }

  async function generate(openPrinter: boolean) {
    if (!printRequest) {
      onStatus('Choose a printable source before exporting.');
      return;
    }
    setBusyAction(openPrinter ? 'print' : 'download');
    try {
      const result = await exportPrint(openPrinter ? { ...printRequest, outputFormat: 'pdf' } : printRequest);
      if (openPrinter) {
        openPrintWindow(result);
        onStatus(`Opened ${result.filename} for printing.`);
      } else {
        downloadPrintResult(result);
        onStatus(`Exported ${result.filename}.`);
      }
      if (result.warnings.length) {
        onStatus(`${result.filename}: ${result.warnings[0]}`);
      }
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction('');
    }
  }

  return (
    <OverlayShell
      title="Print"
      eyebrow="File"
      subtitle={selectedSummary}
      dirty={false}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="secondary-button" disabled={!canPrint || busyAction !== '' || proofLoading} onClick={() => void generate(true)}>
            {busyAction === 'print' ? 'Preparing...' : 'Open Print Dialog...'}
          </button>
          <button type="button" className="primary-button" disabled={!canPrint || busyAction !== '' || proofLoading} onClick={() => void generate(false)}>
            {busyAction === 'download' ? 'Preparing...' : actionLabel}
          </button>
        </>
      }
      onClose={onClose}
    >
      <div className="print-dialog-layout">
        <section className="print-preview-pane print-proof-pane">
          <div className="print-proof-stage">
            {proofLoading ? <div className="print-preview-placeholder">Building print proof...</div> : null}
            {!proofLoading && proofError ? (
              <div className="print-preview-placeholder error">
                <strong>{proofError}</strong>
                <button type="button" className="secondary-button" onClick={() => setProofRetryCount((current) => current + 1)}>
                  Retry preview
                </button>
              </div>
            ) : null}
            {!proofLoading && !proofError && proofUrl ? (
              <img className="print-proof-image" src={proofUrl} alt="Print proof" />
            ) : null}
            {!proofLoading && !proofError && !proofUrl ? <div className="print-preview-placeholder">Choose a printable source</div> : null}
          </div>
          <div className="print-output-summary">
            <strong>
              Print proof: {layout === 'single_card' ? '1-up' : '9-up'} {paperLabel(paper)} {outputFormat.toUpperCase()}
            </strong>
            <span>{inkLabel(inkMode)} / {copies} cop{copies === 1 ? 'y' : 'ies'}</span>
            <span>Target trim 63 x 88 mm / 2.48 x 3.46 in</span>
            {scalePercent !== 100 ? <span>Output scale {scalePercent}% - {scaledCardSizeLabel(scalePercent)}</span> : null}
            {proofResult ? <span>{formatCount(proofResult.summary.cardCount, 'card')} across {formatCount(proofResult.summary.pageCount, 'page')}</span> : null}
          </div>
        </section>
        <section className="print-settings-pane">
          <div className="print-source-grid" role="group" aria-label="Print source">
            {sourceOptions.map((option) => (
              <button key={option.value} type="button" className={sourceKind === option.value ? 'selected' : ''} disabled={sourceDisabled(option.value)} onClick={() => updateSource(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <div className="print-source-detail-grid">
            {sourceKind === 'deck' ? (
              <label className="field">
                <span>Deck</span>
                <select value={selectedDeckId} onChange={(event) => setSelectedDeckId(event.target.value)}>
                  {projectDecks.map((deck) => (
                    <option key={deck.deckId} value={deck.deckId}>
                      {deck.name} - {formatCount(deck.cardCount, 'card')}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {sourceKind === 'collection' ? (
              <label className="field">
                <span>Collection</span>
                <select value={selectedCollectionId} onChange={(event) => setSelectedCollectionId(event.target.value)}>
                  {collections.map((collection) => (
                    <option key={collection.collectionId} value={collection.collectionId}>
                      {collection.name} - {formatCount(collection.cardCount, 'card')}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {sourceKind === 'project' ? (
              <label className="field">
                <span>Project</span>
                <select value={selectedPrintUniverseId} onChange={(event) => setSelectedPrintUniverseId(event.target.value)}>
                  {(library?.universes ?? []).map((universe) => (
                    <option key={universe.id} value={universe.id}>
                      {universe.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="print-settings-grid">
            <label className="field">
              <span>Output</span>
              <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value as PrintOutputFormat)}>
                <option value="pdf">PDF</option>
                <option value="png">PNG</option>
              </select>
            </label>
            <label className="field">
              <span>Paper</span>
              <select value={paper} onChange={(event) => setPaper(event.target.value as PrintPaper)}>
                {papers.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Layout</span>
              <select value={layout} onChange={(event) => setLayout(event.target.value as PrintLayout)}>
                {layouts.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ink</span>
              <select value={inkMode} onChange={(event) => setInkMode(event.target.value as PrintInkMode)}>
                {inkModes.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Copies</span>
              <input type="number" min={1} max={99} value={copies} onChange={(event) => setCopies(clampCopies(event.target.value))} />
            </label>
            <label className="field">
              <span>Scale correction</span>
              <input type="number" min={90} max={125} value={scalePercent} onChange={(event) => setScalePercent(clampScalePercent(event.target.value))} />
            </label>
            <label className="field">
              <span>Variants</span>
              {sourceKind === 'current_card' ? (
                <select value={selectedDraftKey} disabled={!currentCardDrafts.length} onChange={(event) => setSelectedDraftKey(event.target.value)}>
                  {currentCardDrafts.map((candidate) => (
                    <option key={draftKey(candidate)} value={draftKey(candidate)}>
                      {candidate.variantDisplayName}
                    </option>
                  ))}
                </select>
              ) : sourceKind === 'active_set' || sourceKind === 'project' ? (
                <select value={variantMode} onChange={(event) => setVariantMode(event.target.value as CardVariantExportMode)}>
                  <option value="primary">Primary only</option>
                  <option value="default">Default export</option>
                  <option value="all_active">All active</option>
                  <option value="all">All variants</option>
                </select>
              ) : (
                <select disabled value="stored">
                  <option value="stored">Stored selection</option>
                </select>
              )}
            </label>
          </div>
          <div className="print-toggle-row">
            <label>
              <input type="checkbox" checked={includeCropMarks} onChange={(event) => setIncludeCropMarks(event.target.checked)} />
              <span>Crop marks</span>
            </label>
            <label>
              <input type="checkbox" checked={includeCutLines} onChange={(event) => setIncludeCutLines(event.target.checked)} />
              <span>Cut line</span>
            </label>
          </div>
          <div className="print-quick-presets" role="group" aria-label="Print presets">
            <button type="button" onClick={() => applyPreset({ sourceKind: 'current_card', layout: 'single_card', inkMode: 'full_color', outputFormat: 'pdf' })} disabled={!draft}>
              Cardstock Color
            </button>
            <button type="button" onClick={() => applyPreset({ sourceKind: 'current_card', layout: 'single_card', inkMode: 'full_color', outputFormat: 'pdf', paper: 'photo_4x6', includeCutLines: true })} disabled={!draft}>
              4x6 Glossy
            </button>
            <button type="button" onClick={() => applyPreset({ sourceKind: 'current_card', layout: 'single_card', inkMode: 'wireframe', outputFormat: 'pdf' })} disabled={!draft}>
              Wireframe
            </button>
            <button type="button" onClick={() => applyPreset({ sourceKind: 'current_card', layout: 'single_card', inkMode: 'text_only', outputFormat: 'pdf' })} disabled={!draft}>
              Text Only
            </button>
            <button type="button" onClick={() => applyPreset({ sourceKind: 'active_set', layout: 'nine_up', inkMode: 'low_ink', outputFormat: 'pdf' })} disabled={!project}>
              Set Low Ink
            </button>
          </div>
        </section>
      </div>
    </OverlayShell>
  );

  function buildPrintRequest(): PrintExportRequest | null {
    const base = { outputFormat, paper, layout, inkMode, copies, scalePercent, includeCropMarks, includeCutLines, variantMode };
    if (sourceKind === 'current_card') {
      return selectedPrintDraft ? { ...base, sourceKind, draft: selectedPrintDraft, setCode: selectedPrintDraft.setCode } : null;
    }
    if (sourceKind === 'active_set') {
      return project ? { ...base, sourceKind, setCode: project.setCode } : null;
    }
    if (sourceKind === 'deck') {
      return selectedDeckId ? { ...base, sourceKind, deckId: selectedDeckId, setCode: project?.setCode } : null;
    }
    if (sourceKind === 'collection') {
      return selectedCollectionId ? { ...base, sourceKind, collectionId: selectedCollectionId, setCode: project?.setCode } : null;
    }
    if (sourceKind === 'project') {
      return selectedPrintUniverseId ? { ...base, sourceKind, universeId: selectedPrintUniverseId, setCode: project?.setCode } : null;
    }
    return null;
  }

  function sourceDisabled(source: PrintSourceKind): boolean {
    if (source === 'current_card') {
      return !draft;
    }
    if (source === 'active_set') {
      return !project;
    }
    if (source === 'deck') {
      return !projectDecks.length;
    }
    if (source === 'collection') {
      return !collections.length;
    }
    if (source === 'project') {
      return !(library?.universes.length);
    }
    return false;
  }

  function applyPreset(preset: { sourceKind: PrintSourceKind; layout: PrintLayout; inkMode: PrintInkMode; outputFormat: PrintOutputFormat; paper?: PrintPaper; includeCutLines?: boolean }) {
    setSourceKind(preset.sourceKind);
    setLayout(preset.layout);
    setInkMode(preset.inkMode);
    setOutputFormat(preset.outputFormat);
    setPaper(preset.paper ?? 'letter');
    setCopies(1);
    setScalePercent(100);
    setIncludeCropMarks(true);
    setIncludeCutLines(preset.includeCutLines ?? preset.inkMode !== 'full_color');
  }
}

function sourceSummary(
  sourceKind: PrintSourceKind,
  values: { draft: CardDraft | null; project: EditorProject | null; deck: DeckSummary | null; collection: CollectionSummary | null; universe: { name: string } | null }
): string {
  if (sourceKind === 'current_card') {
    return values.draft ? `${values.draft.collectorNumber} ${values.draft.name} / ${values.draft.variantDisplayName}` : 'No selected card';
  }
  if (sourceKind === 'active_set') {
    return values.project ? `${values.project.setCode} - ${formatCount(values.project.cards.length, 'card')}` : 'No active set';
  }
  if (sourceKind === 'deck') {
    return values.deck ? `${values.deck.name} - ${formatCount(values.deck.cardCount, 'card')}` : 'No deck selected';
  }
  if (sourceKind === 'collection') {
    return values.collection ? `${values.collection.name} - ${formatCount(values.collection.cardCount, 'card')}` : 'No collection selected';
  }
  return values.universe ? `${values.universe.name} project` : 'No project selected';
}

function draftKey(draft: CardDraft | null | undefined): string {
  return draft ? `${draft.cardId}::${draft.variantId || 'primary'}` : '';
}

function inkLabel(value: PrintInkMode): string {
  return inkModes.find((mode) => mode.value === value)?.label ?? value;
}

function paperLabel(value: PrintPaper): string {
  return papers.find((paper) => paper.value === value)?.label ?? value;
}

async function exportPrintProof(request: PrintExportRequest): Promise<PrintExportResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await exportPrint(request);
    } catch (error) {
      lastError = error;
      if (!isNetworkFetchError(error) || attempt === 2) {
        throw error;
      }
      await waitForPreviewRetry((attempt + 1) * 600);
    }
  }
  throw lastError;
}

function isNetworkFetchError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && error.message.toLowerCase().includes('failed to fetch'));
}

function proofErrorMessage(error: unknown): string {
  if (isNetworkFetchError(error)) {
    return 'Preview could not reach the print service.';
  }
  return error instanceof Error ? error.message : String(error);
}

function waitForPreviewRetry(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clampCopies(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.min(99, Math.max(1, Math.round(parsed)));
}

function clampScalePercent(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 100;
  }
  return Math.min(125, Math.max(90, Math.round(parsed)));
}

function scaledCardSizeLabel(scalePercent: number): string {
  const scale = scalePercent / 100;
  const widthMm = 63 * scale;
  const heightMm = 88 * scale;
  const widthIn = widthMm / 25.4;
  const heightIn = heightMm / 25.4;
  return `${widthMm.toFixed(1)} x ${heightMm.toFixed(1)} mm / ${widthIn.toFixed(2)} x ${heightIn.toFixed(2)} in`;
}

function downloadPrintResult(result: PrintExportResult) {
  const blob = resultBlob(result);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = result.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openPrintWindow(result: PrintExportResult) {
  const blob = resultBlob(result);
  const url = URL.createObjectURL(blob);
  if (result.mimeType === 'application/pdf') {
    const printWindow = window.open(url, '_blank');
    if (!printWindow) {
      downloadPrintResult(result);
      return;
    }
    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // Some PDF viewers block script-triggered print; the opened PDF is still printable.
      }
    }, 900);
    window.setTimeout(() => URL.revokeObjectURL(url), 300000);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    downloadPrintResult(result);
    return;
  }
  const paperSize = paperCssSize(result.summary.paper);
  printWindow.document.write([
    '<!doctype html>',
    '<html>',
    '<head><title>Print</title><style>',
    `@page{size:${paperSize};margin:0;}`,
    'html,body{margin:0;padding:0;background:#fff;}',
    '.sheet{width:100vw;min-height:100vh;display:grid;place-items:center;page-break-after:always;}',
    'img{display:block;width:100%;height:auto;border:0;}',
    '</style></head>',
    '<body>',
    `<main class="sheet"><img src="${url}" alt="Print sheet"></main>`,
    '<script>setTimeout(function(){window.focus();window.print();},700);<\/script>',
    '</body>',
    '</html>'
  ].join(''));
  printWindow.document.close();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function resultBlob(result: PrintExportResult): Blob {
  const binary = atob(result.content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: result.mimeType });
}

function paperCssSize(paper: PrintPaper): string {
  if (paper === 'photo_4x6') {
    return '4in 6in';
  }
  if (paper === 'a4') {
    return 'A4';
  }
  return 'letter';
}
