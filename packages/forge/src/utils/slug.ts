import type { CardRecord } from '../domain/schemas.js';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function renderFilenameTemplate(template: string, card: CardRecord): string {
  const slugName = slugify(card.exportNameOverride ?? card.name);
  return template
    .replaceAll('{{card_id}}', card.cardId)
    .replaceAll('{{set_code}}', card.setCode)
    .replaceAll('{{collector_number}}', card.collectorNumber)
    .replaceAll('{{name}}', card.exportNameOverride ?? card.name)
    .replaceAll('{{slug_name}}', slugName);
}

