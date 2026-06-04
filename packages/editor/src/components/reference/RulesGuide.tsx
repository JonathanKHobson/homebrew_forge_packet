import type { ReferenceRuleKind } from '@homebrew-forge/forge';

interface RulesGuideProps {
  onSelect: (ruleKind: ReferenceRuleKind | 'all', number: string, query?: string) => void;
}

const guideItems: Array<{ label: string; kind: ReferenceRuleKind | 'all'; number: string; query?: string }> = [
  { label: 'Start Here', kind: 'section', number: '100' },
  { label: 'Turn Structure', kind: 'section', number: '500' },
  { label: 'Casting', kind: 'section', number: '601' },
  { label: 'Keyword Actions', kind: 'keyword-action', number: '701' },
  { label: 'Keyword Abilities', kind: 'keyword-ability', number: '702' },
  { label: 'Tokens', kind: 'predefined-token', number: '111.10' },
  { label: 'Counters', kind: 'counter-rule', number: '122' },
  { label: 'Glossary', kind: 'glossary', number: '', query: '' }
];

export function RulesGuide({ onSelect }: RulesGuideProps) {
  return (
    <div className="rules-guide-strip" aria-label="Rules guide">
      <strong>Rules Guide</strong>
      <div>
        {guideItems.map((item) => (
          <button key={`${item.kind}-${item.label}`} type="button" className="secondary-button" onClick={() => onSelect(item.kind, item.number, item.query)}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
