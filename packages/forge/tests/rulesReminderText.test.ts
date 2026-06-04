import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReferenceCatalog } from '../src/reference/catalog.js';
import { addReferenceReminderText } from '../src/renderer/rulesReminderText.js';

const reminderTerms = [
  { name: 'Flying', category: 'keyword-ability' as const, status: 'current' as const, reminderText: 'Can be blocked only by creatures with flying or reach.' },
  { name: 'Scry N', category: 'keyword-action' as const, status: 'current' as const, reminderText: 'Look at the top N cards of your library.' },
  { name: 'Treasure', category: 'token' as const, status: 'current' as const, reminderText: 'Colorless artifact token with "{T}, Sacrifice: Add one mana of any color."' }
];

describe('rules reminder text', () => {
  it('adds printable reference reminders after linked keywords and keyword-action counts', () => {
    const catalog = buildReferenceCatalog({ homebrewTerms: reminderTerms });
    const result = addReferenceReminderText('Flying\nScry 2, then draw a card.', catalog, { maxReminders: 2 });

    assert.match(result.text, /Flying \(Can be blocked only by creatures with flying or reach\.\)/);
    assert.match(result.text, /Scry 2 \(Look at the top N cards of your library\.\), then draw a card\./);
    assert.deepEqual(
      result.insertions.map((insertion) => insertion.label),
      ['Flying', 'Scry N']
    );
  });

  it('keeps token reminders after the token phrase instead of inside it', () => {
    const catalog = buildReferenceCatalog({ homebrewTerms: reminderTerms });
    const result = addReferenceReminderText('Create a Treasure token.', catalog);

    assert.match(result.text, /Treasure token \(Colorless artifact token/);
  });

  it('does not duplicate explicit reminder text already written by the designer', () => {
    const catalog = buildReferenceCatalog({ homebrewTerms: reminderTerms });
    const result = addReferenceReminderText('Flying (This reminder is already explicit.)', catalog);

    assert.equal(result.text, 'Flying (This reminder is already explicit.)');
    assert.equal(result.insertions.length, 0);
  });

  it('skips long definitions that are not authored as concise reminder text', () => {
    const catalog = buildReferenceCatalog({
      homebrewTerms: [
        {
          name: 'Overexplain',
          category: 'homebrew',
          status: 'homebrew',
          definition: 'This mechanic deliberately has a long rules definition that should stay in the reference catalog instead of being printed on every card because it would quickly overwhelm the rules box and force the renderer into unreadable typography.'
        }
      ]
    });
    const result = addReferenceReminderText('Overexplain', catalog);

    assert.equal(result.text, 'Overexplain');
    assert.equal(result.insertions.length, 0);
  });

  it('does not print official rules definitions when card reminder text is missing', () => {
    const catalog = buildReferenceCatalog({
      homebrewTerms: [
        {
          name: 'Deathtouch',
          category: 'keyword-ability',
          status: 'current',
          source: 'wizards-rules',
          origin: 'official',
          definition: 'A keyword ability that causes damage dealt by an object to be especially effective. See rule 702.2, "Deathtouch."'
        }
      ]
    });
    const result = addReferenceReminderText('Deathtouch', catalog);

    assert.equal(result.text, 'Deathtouch');
    assert.equal(result.insertions.length, 0);
  });

  it('prints official card reminder text when it is available', () => {
    const catalog = buildReferenceCatalog({
      homebrewTerms: [
        {
          name: 'Deathtouch',
          category: 'keyword-ability',
          status: 'current',
          source: 'wizards-rules',
          origin: 'official',
          definition: 'A keyword ability that causes damage dealt by an object to be especially effective. See rule 702.2, "Deathtouch."',
          reminderText: 'Any amount of damage this deals to a creature is enough to destroy it.'
        }
      ]
    });
    const result = addReferenceReminderText('Deathtouch', catalog);

    assert.match(result.text, /Deathtouch \(Any amount of damage this deals to a creature is enough to destroy it\.\)/);
    assert.equal(result.insertions.length, 1);
  });
});
