import { useRef, useState } from 'react';
import { importCards, syncCockatrice } from '../api/client.js';
import type { EditorProject, ImportCardsRequest, ImportCardsSummary } from '../domain/editorTypes.js';
import { formatCount } from '../domain/uiText.js';
import { CollapsibleSection } from './CollapsibleSection.js';
import { Field } from './Field.js';

interface ImportExportPanelProps {
  project: EditorProject | null;
  onProjectLoaded: (project: EditorProject) => void;
  onStatus: (message: string) => void;
  defaultOpen?: boolean;
}

export function ImportExportPanel({ project, onProjectLoaded, onStatus, defaultOpen = false }: ImportExportPanelProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [format, setFormat] = useState<ImportCardsRequest['format']>('csv');
  const [mode, setMode] = useState<ImportCardsRequest['mode']>('append');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState<ImportCardsSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const importError = !project ? 'Load an active set before importing cards.' : !content.trim() ? 'Choose a file or paste import data.' : '';

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const text = await file.text();
    setContent(text);
    setFormat(file.name.toLowerCase().endsWith('.xml') ? 'cockatrice' : file.name.toLowerCase().endsWith('.txt') ? 'planesculptors' : 'csv');
    setSummary(null);
    onStatus(`Loaded ${file.name}.`);
  }

  async function handleImport(dryRun = false) {
    if (!project || !content.trim()) {
      return;
    }
    setBusy(true);
    try {
      const result = await importCards({
        setCode: project.setCode,
        format,
        mode,
        content,
        dryRun
      });
      setSummary(result.summary);
      if (!dryRun) {
        onProjectLoaded(result.project);
      }
      onStatus(
        dryRun
          ? `Dry-run found ${formatCount(result.summary.importedCards, 'card')}, ${formatCount(result.summary.importedVariants, 'variant')}, ${formatCount(result.summary.warnings.length, 'warning')}, ${formatCount(result.summary.unsupportedLayouts.length, 'unsupported layout family')}.`
          : `Imported ${formatCount(result.summary.importedCards, 'card')}, ${formatCount(result.summary.importedVariants, 'variant')}, and synced ${formatCount(result.project.lastCockatriceSync?.imageCount ?? 0, 'Cockatrice image')}.`
      );
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    if (!project) {
      return;
    }
    setBusy(true);
    try {
      const sync = await syncCockatrice(project.setCode);
      onStatus(`Synced ${sync.imageCount} images to ${sync.xmlPath}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CollapsibleSection title="Import Cards" subtitle="CSV with variants, Cockatrice XML, Planesculptors text, or generic XML" defaultOpen={defaultOpen} className="bulk-flow">
      <p className="sync-note">
        Destination: {project ? `active set ${project.setCode}` : 'no active set loaded'}. Use Sets import when the upload should create a new set.
      </p>
      <div className="grid-2">
        <Field label="Format">
          <select value={format} onChange={(event) => setFormat(event.target.value as ImportCardsRequest['format'])}>
            <option value="csv">Homebrew Forge CSV</option>
            <option value="cockatrice">Cockatrice XML</option>
            <option value="planesculptors">Planesculptors text</option>
            <option value="xml">Generic XML</option>
          </select>
        </Field>
        <Field label="Import behavior">
          <select value={mode} onChange={(event) => setMode(event.target.value as ImportCardsRequest['mode'])}>
            <option value="append">Append or update active set</option>
            <option value="replace">Replace active set</option>
          </select>
        </Field>
      </div>
      <div className="bulk-actions">
        <input ref={fileInput} type="file" accept=".csv,.xml,.txt,text/csv,text/xml,application/xml,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} disabled={busy || !project}>
          Choose file
        </button>
        <a className="tertiary-link-button" href="/api/asset?path=csv_templates%2Fcard_import_with_variants_template.csv" download>
          Template CSV
        </a>
        <a className="tertiary-link-button" href="/api/asset?path=docs%2F03_data_model_and_csv_schema.md" target="_blank" rel="noreferrer">
          CSV guide
        </a>
        <button type="button" className="secondary-button" onClick={() => void handleImport(true)} disabled={busy || !project || !content.trim()}>
          Dry run
        </button>
        <button type="button" className="primary-button" onClick={() => void handleImport(false)} disabled={busy || !project || !content.trim()}>
          Import
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleSync()} disabled={busy || !project}>
          Sync Cockatrice
        </button>
      </div>
      <Field label="Data" error={importError}>
        <textarea
          value={content}
          rows={5}
          spellCheck={false}
          placeholder="card_id,name,variant_id,variant_display_name,variant_kind,variant_status,variant_is_primary,face_index,mana_cost,type_line,oracle_text"
          onChange={(event) => setContent(event.target.value)}
        />
      </Field>
      {summary ? (
        <div className="import-summary">
          <strong>{summary.dryRun ? 'Dry-run audit' : 'Last import audit'}</strong>
          <span>
            {formatCount(summary.importedCards, 'card')} / {formatCount(summary.importedFaces, 'primary face')} / {formatCount(summary.importedVariants, 'variant')} / {formatCount(summary.importedVariantFaces, 'variant face')} / {formatCount(summary.artReferences, 'art ref')}
          </span>
          <span>
            {formatCount(summary.parsedTokens, 'token')}, {formatCount(summary.parsedSagas, 'saga')}, {formatCount(summary.possibleTransformCards, 'possible transform card')}
          </span>
          <span>
            {formatCount(summary.legacyRenderReferences, 'full-card image ref')}, {formatCount(summary.editableArtNeeded, 'card')} need editable/source art
          </span>
          <span>
            {formatCount(summary.warnings.length, 'warning')}
          </span>
          {summary.unsupportedLayouts.length ? <span>Unsupported: {summary.unsupportedLayouts.map((item) => `${item.layout} ${item.count}`).join(', ')}</span> : null}
        </div>
      ) : null}
      {project?.lastCockatriceSync ? <p className="sync-note">Cockatrice XML: {project.lastCockatriceSync.xmlPath}</p> : null}
    </CollapsibleSection>
  );
}
