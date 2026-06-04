import { useRef, useState } from 'react';
import { importCards, syncCockatrice } from '../api/client.js';
import type { EditorProject, ImportCardsRequest, ImportCardsSummary } from '../domain/editorTypes.js';
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
          ? `Dry-run found ${result.summary.importedCards} cards, ${result.summary.warnings.length} warnings, ${result.summary.unsupportedLayouts.length} unsupported layout families.`
          : `Imported ${result.summary.importedCards} cards and synced ${result.project.lastCockatriceSync?.imageCount ?? 0} Cockatrice images.`
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
    <CollapsibleSection title="Bulk Set Flow" subtitle="CSV / XML import and Cockatrice sync" defaultOpen={defaultOpen} className="bulk-flow">
      <div className="grid-2">
        <Field label="Format">
          <select value={format} onChange={(event) => setFormat(event.target.value as ImportCardsRequest['format'])}>
            <option value="csv">CSV</option>
            <option value="cockatrice">MTG.design Cockatrice XML</option>
            <option value="planesculptors">MTG.design Planesculptors TXT</option>
            <option value="xml">Generic XML</option>
          </select>
        </Field>
        <Field label="Mode">
          <select value={mode} onChange={(event) => setMode(event.target.value as ImportCardsRequest['mode'])}>
            <option value="append">append / update</option>
            <option value="replace">replace set</option>
          </select>
        </Field>
      </div>
      <div className="bulk-actions">
        <input ref={fileInput} type="file" accept=".csv,.xml,.txt,text/csv,text/xml,application/xml,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} disabled={busy || !project}>
          Load File
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleImport(true)} disabled={busy || !project || !content.trim()}>
          Dry Run
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleImport(false)} disabled={busy || !project || !content.trim()}>
          Import
        </button>
        <button type="button" className="secondary-button" onClick={() => void handleSync()} disabled={busy || !project}>
          Sync Cockatrice
        </button>
      </div>
      <Field label="Data">
        <textarea
          value={content}
          rows={5}
          spellCheck={false}
          placeholder="name,mana_cost,type_line,oracle_text,flavor_text,power,toughness,rarity"
          onChange={(event) => setContent(event.target.value)}
        />
      </Field>
      {summary ? (
        <div className="import-summary">
          <strong>{summary.dryRun ? 'Dry-run audit' : 'Last import audit'}</strong>
          <span>
            {summary.importedCards} cards / {summary.importedFaces} faces / {summary.artReferences} art refs
          </span>
          <span>
            {summary.parsedTokens} tokens, {summary.parsedSagas} sagas, {summary.possibleTransformCards} possible transform cards
          </span>
          <span>
            {summary.legacyRenderReferences} full-card image refs, {summary.editableArtNeeded} need editable/source art
          </span>
          <span>
            {summary.warnings.length} warnings
          </span>
          {summary.unsupportedLayouts.length ? <span>Unsupported: {summary.unsupportedLayouts.map((item) => `${item.layout} ${item.count}`).join(', ')}</span> : null}
        </div>
      ) : null}
      {project?.lastCockatriceSync ? <p className="sync-note">Cockatrice XML: {project.lastCockatriceSync.xmlPath}</p> : null}
    </CollapsibleSection>
  );
}
