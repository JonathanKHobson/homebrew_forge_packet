import { useEffect, useRef, useState } from 'react';
import { createSet, fetchLibrary, importCards } from '../api/client.js';
import type { CreateSetRequest, EditorProject, ImportCardsRequest, LibraryState } from '../domain/editorTypes.js';
import { SET_STATUS_OPTIONS } from '../domain/filterTypes.js';
import { formatCount } from '../domain/uiText.js';
import { Field } from './Field.js';
import { TagEditor } from './TagEditor.js';

interface SetImportPanelProps {
  project: EditorProject | null;
  onProjectLoaded: (project: EditorProject) => void;
  onStatus: (message: string) => void;
}

export function SetImportPanel({ project, onProjectLoaded, onStatus }: SetImportPanelProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [library, setLibrary] = useState<LibraryState | null>(null);
  const [setCode, setSetCode] = useState('');
  const [setName, setSetName] = useState('');
  const [universeId, setUniverseId] = useState('');
  const [author, setAuthor] = useState(project?.designer ?? 'Jonathan Kyle Hobson');
  const [status, setStatusValue] = useState('draft');
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [format, setFormat] = useState<ImportCardsRequest['format']>('csv');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<'load' | 'dry-run' | 'import' | ''>('');
  const [summary, setSummary] = useState<{ cards: number; variants: number; warnings: number } | null>(null);
  const setCodeError = setCode.trim() ? '' : 'Set code is required.';
  const setNameError = setName.trim() ? '' : 'Set name is required.';
  const projectError = universeId.trim() ? '' : 'Choose a project.';
  const contentError = content.trim() ? '' : 'Choose a file or paste card data.';

  useEffect(() => {
    let cancelled = false;
    async function loadLibrary() {
      setBusy('load');
      try {
        const nextLibrary = await fetchLibrary();
        if (!cancelled) {
          setLibrary(nextLibrary);
          setUniverseId((current) => current || nextLibrary.selectedUniverseId || nextLibrary.universes[0]?.id || '');
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
    void loadLibrary();
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const text = await file.text();
    const lowerName = file.name.toLowerCase();
    setContent(text);
    setFileName(file.name);
    setFormat(lowerName.endsWith('.xml') ? 'cockatrice' : lowerName.endsWith('.txt') ? 'planesculptors' : 'csv');
    if (!setName) {
      setSetName(titleFromFilename(file.name));
    }
    if (!setCode) {
      setSetCode(codeFromFilename(file.name));
    }
    setSummary(null);
    onStatus(`Loaded ${file.name}.`);
  }

  async function dryRun() {
    if (!setCode || !content.trim()) {
      onStatus('Set code and import data are required for a dry run.');
      return;
    }
    setBusy('dry-run');
    try {
      const result = await importCards({
        setCode,
        format,
        mode: 'replace',
        content,
        dryRun: true
      });
      setSummary({ cards: result.summary.importedCards, variants: result.summary.importedVariants, warnings: result.summary.warnings.length });
      onStatus(`Dry-run found ${formatCount(result.summary.importedCards, 'card')} and ${formatCount(result.summary.importedVariants, 'variant')} for ${setCode}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  async function createAndImport() {
    if (!setCode || !setName || !universeId) {
      onStatus('Set code, set name, and project are required.');
      return;
    }
    if (!content.trim()) {
      onStatus('Choose or paste a card import file before creating the set.');
      return;
    }
    setBusy('import');
    try {
      const request: CreateSetRequest = {
        universeId,
        universeName: library?.universes.find((universe) => universe.id === universeId)?.name,
        setCode,
        setName,
        author,
        status,
        tags,
        notes
      };
      await createSet(request);
      const result = await importCards({
        setCode,
        format,
        mode: 'replace',
        content,
        dryRun: false
      });
      onProjectLoaded(result.project);
      setSummary({ cards: result.summary.importedCards, variants: result.summary.importedVariants, warnings: result.summary.warnings.length });
      onStatus(`Created ${setCode} and imported ${formatCount(result.summary.importedCards, 'card')} / ${formatCount(result.summary.importedVariants, 'variant')}.`);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="set-import-panel">
      <div className="set-import-grid">
        <Field label="Set code" error={setCodeError}>
          <input value={setCode} maxLength={12} placeholder="SG1" onChange={(event) => setSetCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
        </Field>
        <Field label="Set name" error={setNameError}>
          <input value={setName} placeholder="Stargate SG-1" onChange={(event) => setSetName(event.target.value)} />
        </Field>
        <Field label="Project" error={projectError}>
          <select value={universeId} disabled={busy === 'load'} onChange={(event) => setUniverseId(event.target.value)}>
            <option value="">Choose project</option>
            {(library?.universes ?? []).map((universe) => (
              <option key={universe.id} value={universe.id}>
                {universe.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(event) => setStatusValue(event.target.value)}>
            {SET_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Author">
          <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </Field>
        <Field label="Format">
          <select value={format} onChange={(event) => setFormat(event.target.value as ImportCardsRequest['format'])}>
            <option value="csv">Homebrew Forge CSV</option>
            <option value="cockatrice">Cockatrice XML</option>
            <option value="planesculptors">Planesculptors text</option>
            <option value="xml">Generic XML</option>
          </select>
        </Field>
      </div>

      <Field label="Tags">
        <TagEditor value={tags} suggestions={library?.sets.flatMap((set) => set.tags ?? []) ?? []} placeholder="draft, commander, playtest" ariaLabel="Set import tags" onChange={setTags} />
      </Field>
      <Field label="Notes">
        <textarea value={notes} rows={3} placeholder="Optional set direction or import notes" onChange={(event) => setNotes(event.target.value)} />
      </Field>

      <div className="bulk-actions">
        <input ref={fileInput} type="file" accept=".csv,.xml,.txt,text/csv,text/xml,application/xml,text/plain" onChange={(event) => void handleFile(event.target.files?.[0])} />
        <button type="button" className="secondary-button" disabled={busy !== ''} onClick={() => fileInput.current?.click()}>
          Choose file
        </button>
        <a className="tertiary-link-button" href="/api/asset?path=csv_templates%2Fcard_import_with_variants_template.csv" download>
          Template CSV
        </a>
        {fileName ? <span className="file-chip">{fileName}</span> : null}
      </div>

      <Field label="Card data" error={contentError}>
        <textarea value={content} rows={7} spellCheck={false} placeholder="card_id,name,variant_id,variant_display_name,face_index,type_line,oracle_text" onChange={(event) => setContent(event.target.value)} />
      </Field>

      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={busy !== '' || !content.trim()} onClick={() => void dryRun()}>
          {busy === 'dry-run' ? 'Checking...' : 'Dry run'}
        </button>
        <button type="button" className="primary-button" disabled={busy !== '' || !setCode || !setName || !universeId || !content.trim()} onClick={() => void createAndImport()}>
          {busy === 'import' ? 'Importing...' : 'Create set and import'}
        </button>
      </div>

      {summary ? (
        <div className="import-summary">
          <strong>Set import audit</strong>
          <span>{formatCount(summary.cards, 'card')} / {formatCount(summary.variants, 'variant')}</span>
          <span>{formatCount(summary.warnings, 'warning')}</span>
        </div>
      ) : null}
    </div>
  );
}

function titleFromFilename(value: string): string {
  return value
    .replace(/\.[^.]+$/, '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function codeFromFilename(value: string): string {
  const stem = value.replace(/\.[^.]+$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return stem.slice(0, 8) || 'NEWSET';
}
