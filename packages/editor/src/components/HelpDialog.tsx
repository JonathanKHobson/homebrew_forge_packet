import { OverlayShell } from './overlays/OverlayShell.js';

interface HelpDialogProps {
  onStatus: (message: string) => void;
  onClose: () => void;
}

const bugReportTemplate = `# Homebrew Forge Bug Report

## Summary

## Location

## Steps To Reproduce
1.
2.
3.

## Expected Behavior

## Actual Behavior

## Evidence
- Screenshot or video:

## Device
- OS:
- Browser:
- Browser version:
- Viewport:

## Additional Context

## Developer Notes
`;

export function HelpDialog({ onStatus, onClose }: HelpDialogProps) {
  async function copyBugReportTemplate() {
    try {
      await navigator.clipboard.writeText(bugReportTemplate);
      onStatus('Copied bug report template.');
    } catch {
      downloadBugReportTemplate();
      onStatus('Downloaded bug report template.');
    }
  }

  return (
    <OverlayShell
      title="Help"
      eyebrow="Reference"
      subtitle="Core Homebrew Forge concepts and support-ready issue capture."
      dirty={false}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={() => void copyBugReportTemplate()}>
            Copy Bug Report Template
          </button>
          <button type="button" className="primary-button" onClick={onClose}>
            Done
          </button>
        </>
      }
      onClose={onClose}
    >
      <div className="help-dialog-grid">
        <section className="help-section">
          <h3>Concepts</h3>
          <div className="help-concept-grid">
            <ConceptTerm term="Maker" definition="The authoring workspace for creating and editing saved card records." />
            <ConceptTerm term="Project" definition="A universe or product line that can group related sets, decks, binders, and lists." />
            <ConceptTerm term="Set" definition="A card release with authored cards, variants, art, and export state." />
            <ConceptTerm term="Card" definition="The authored game object. Frame and layout settings change presentation, not card identity." />
            <ConceptTerm term="Variant" definition="A saved treatment of a card, such as alternate art, print metadata, or an export version." />
            <ConceptTerm term="Deck" definition="A playable list that can reference cards across projects and sets." />
            <ConceptTerm term="Build" definition="The active deck variant you are tuning, usually a draft, testing, locked, or final list." />
            <ConceptTerm term="Bracket" definition="A Commander power-level label used for deck expectation setting." />
            <ConceptTerm term="Collection" definition="A card inventory or planning space kept separate from authored sets and decks." />
            <ConceptTerm term="Binder" definition="A collection-style space for owned physical or proxy cards." />
            <ConceptTerm term="List" definition="A lightweight collection-style space for wishlists, recommendations, flags, and references." />
            <ConceptTerm term="Gallery" definition="Shared local project assets and artwork records." />
            <ConceptTerm term="References" definition="Rules terms, glossary entries, and official-card lookup support." />
          </div>
        </section>
        <section className="help-section">
          <h3>Support</h3>
          <div className="support-template-card">
            <strong>Issue capture</strong>
            <p>Use the template when recording a usability issue, visual defect, accessibility gap, import/export problem, or app bug.</p>
            <button type="button" className="secondary-button" onClick={() => void copyBugReportTemplate()}>
              Copy Template
            </button>
          </div>
        </section>
      </div>
    </OverlayShell>
  );
}

function ConceptTerm({ term, definition }: { term: string; definition: string }) {
  return (
    <div className="help-concept-card">
      <strong>{term}</strong>
      <span>{definition}</span>
    </div>
  );
}

function downloadBugReportTemplate(): void {
  const blob = new Blob([bugReportTemplate], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'homebrew-forge-bug-report-template.md';
  link.click();
  URL.revokeObjectURL(url);
}
