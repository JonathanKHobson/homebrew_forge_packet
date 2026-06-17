import type { CardSummary } from '../domain/editorTypes.js';

interface CardTabsProps {
  cards: CardSummary[];
  openCardIds: string[];
  selectedId: string;
  dirtyCardIds: Set<string>;
  onSelect: (cardId: string) => void;
  onClose: (cardId: string) => void;
  onNew: () => void;
}

export function CardTabs({ cards, openCardIds, selectedId, dirtyCardIds, onSelect, onClose, onNew }: CardTabsProps) {
  const cardsById = new Map(cards.map((card) => [card.cardId, card]));
  const openCards = openCardIds.map((cardId) => cardsById.get(cardId)).filter(Boolean) as CardSummary[];
  return (
    <div className="card-tabs" aria-label="Open cards">
      {openCards.map((card) => {
        const dirty = dirtyCardIds.has(card.cardId);
        return (
          <div key={card.cardId} className={`card-tab ${card.cardId === selectedId ? 'active' : ''} ${dirty ? 'dirty' : ''}`}>
            <button type="button" aria-current={card.cardId === selectedId ? 'page' : undefined} onClick={() => onSelect(card.cardId)}>
              <span>{card.collectorNumber} {card.name}</span>
              {dirty ? <span className="unsaved-dot" title="Unsaved changes" aria-label="Unsaved changes" /> : null}
            </button>
            <button type="button" className="tab-close" title={`Close ${card.name}`} onClick={() => onClose(card.cardId)}>
              x
            </button>
          </div>
        );
      })}
      <button type="button" className="card-tab new-tab" title="New card" onClick={onNew}>
        +
      </button>
    </div>
  );
}
