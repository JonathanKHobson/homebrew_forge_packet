import { useEffect, useRef, useState } from 'react';
import { fetchDecks, importDeck } from '../api/client.js';
import type { DeckImportResult, DeckSummary, EditorProject, ImportDeckRequest } from '../domain/editorTypes.js';
import { formatCount } from '../domain/uiText.js';
import { Field } from './Field.js';

interface DeckImportPanelProps {
  project: EditorProject | null;
  onStatus: (message: string) => void;
}

export function DeckImportPanel({ project, onStatus }: DeckImportPanelProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [sourceFormat, setSourceFormat] = useState<ImportDeckRequest['sourceFormat']>('text');
  const [mode, setMode] = useState<ImportDeckRequest['mode']>('create');
  const [deckId, setDeckId] = useState('');
  const [name, setName] = useState('');
  const [linkedSetCode, setLinkedSetCode] = useState(project?.setCode ?? '');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState<'dry-run' | 'import' | 'load' | ''>('');
  const [summary, setSummary] = useState<DeckImportResult['summary'] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDecks() {
      setBusy('load');
      try {
        const result = await fetchDecks();
        if (!cancelled) {
          setDecks(result);
          setDeckId((current) => current || result[0]?.deckId || '');
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
    void loadDecks();
    return () => {
      cancelled = true;
    };
  }, [onStatus]);

  useEffect(() => {
    setLinkedSetCode(project?.setCode ?? '');
  }, [project?.setCode]);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const text = await file.text();
    const lowerName = file.name.toLowerCase();
    setContent(text);
    setFileName(file.name);
    setSourceFormat(lowerName.endsWith('.csv') ? 'csv' : lowerName.endsWith('.cod') || lowerName.endsWith('.xml') ? 'cockatrice' : lowerName.endsWith('.md') || lowerName.endsWith('.markdown') ? 'markdown' : 'text');
    if (!name) {
      setName(titleFromFilename(file.name));
    }
    setSummary(null);
    onStatus(`Loaded ${file.name}.`);
  }

  async function runImport(dryRun: boolean) {
    if (!content.trim()) {
      onStatus('Choose or paste a decklist before importing.');
      return;
    }
    if (mode !== 'create' && !deckId) {
      onStatus('Choose a target deck before appending or replacing.');
      return;
    }
    setBusy(dryRun ? 'dry-run' : 'import');
    try {
      const response = await importDeck({
        sourceFormat,
        mode,
        deckId: mode === 'create' ? undefined : deckId,
        name: name || undefined,
        linkedSetCode: linkedSetCode || undefined,
        content,
        dryRun
      });
      setSummary(response.result.summary);
      if (!dryRun) {
        setDecks(response.decks);
        if (response.result.deck) {
          setDeckId(response.result.deck.metadata.deckId);
        }
      }
      onStatus(
        `${dryRun ? 'Dry-run analyzed' : 'Imported'} ${formatCount(response.result.summary.importedEntries, 'deck row')} with ${formatCount(response.result.summary.unresolvedCount, 'unresolved row')}.`
      );
    } catch (error) {
      onStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="deck-import-panel">
      <div className="deck-import-grid">
        <Field label="Source file">
          <div className="inline-file-picker">
            <input ref={fileInput} type="file" accept=".txt,.md,.markdown,.cod,.xml,.csv,text/plain,text/markdown,text/csv,application/xml" onChange={(event) => void handleFile(event.target.files?.[0])} />
            <button type="button" className="secondary-button" disabled={busy !== ''} onClick={() => fileInput.current?.click()}>
              Choose file
            </button>
            <a className="tertiary-link-button" href="/api/asset?path=csv_templates%2Fdeck_entries_template.csv" download>
              Template CSV
            </a>
            {fileName ? <span>{fileName}</span> : null}
          </div>
        </Field>
        <Field label="Format">
          <select value={sourceFormat} onChange={(event) => setSourceFormat(event.target.value as ImportDeckRequest['sourceFormat'])}>
            <option value="text">Plain text decklist</option>
            <option value="markdown">Markdown decklist</option>
            <option value="cockatrice">Cockatrice .cod / XML</option>
            <option value="csv">Deck CSV</option>
          </select>
        </Field>
        <Field label="Import behavior">
          <select value={mode} onChange={(event) => setMode(event.target.value as ImportDeckRequest['mode'])}>
            <option value="create">Create new deck</option>
            <option value="append">Append to existing deck</option>
            <option value="replace">Replace existing deck</option>
          </select>
        </Field>
        {mode === 'create' ? (
          <Field label="Deck name">
            <input value={name} placeholder="Imported Deck" onChange={(event) => setName(event.target.value)} />
          </Field>
        ) : (
          <Field label="Target deck">
            <select value={deckId} disabled={!decks.length || busy === 'load'} onChange={(event) => setDeckId(event.target.value)}>
              {decks.map((deck) => (
                <option key={deck.deckId} value={deck.deckId}>
                  {deck.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Linked set" hint="Optional matching hint">
          <input value={linkedSetCode} placeholder={project?.setCode ?? 'DEMO'} onChange={(event) => setLinkedSetCode(event.target.value.toUpperCase())} />
        </Field>
      </div>

      <Field label="Decklist data">
        <textarea value={content} rows={7} spellCheck={false} placeholder={'Main\n4 Example Vanguard\n\nSideboard\n2 Clockwork Relic'} onChange={(event) => setContent(event.target.value)} />
      </Field>

      <div className="export-actions">
        <button type="button" className="secondary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(true)}>
          {busy === 'dry-run' ? 'Checking...' : 'Dry run'}
        </button>
        <button type="button" className="primary-button" disabled={busy !== '' || !content.trim()} onClick={() => void runImport(false)}>
          {busy === 'import' ? 'Importing...' : 'Import deck'}
        </button>
      </div>

      {summary ? (
        <div className="import-summary">
          <strong>{summary.dryRun ? 'Dry-run audit' : 'Last deck import'}</strong>
          <span>
            {formatCount(summary.importedEntries, 'row')} / {summary.mainCount} main / {summary.sideCount} side / {summary.maybeCount} maybe
          </span>
          <span>{formatCount(summary.unresolvedCount, 'unresolved row')}</span>
          <span>{formatCount(summary.warnings.length, 'warning')}</span>
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
