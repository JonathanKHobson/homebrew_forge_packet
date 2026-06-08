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
            <ConceptTerm term="Project" definition="A universe or product line that can hold multiple sets." />
            <ConceptTerm term="Set" definition="A card release with cards, variants, art, and export state." />
            <ConceptTerm term="Card" definition="The authored game object shared by its variants." />
            <ConceptTerm term="Variant" definition="A print, art, treatment, or export version of a card." />
            <ConceptTerm term="Deck" definition="A playtest list that references cards across sets." />
            <ConceptTerm term="Collection" definition="A physical-card inventory kept separate from authored sets." />
            <ConceptTerm term="Gallery" definition="Shared project assets, art, and set/project records." />
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
