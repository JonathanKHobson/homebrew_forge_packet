import { XMLParser } from 'fast-xml-parser';
import { normalizeManaCost } from '../domain/mana.js';
import type { CsvRow } from './csv.js';

export interface ParsedCardsXml {
  cards: CsvRow[];
  faces: CsvRow[];
  art?: CsvRow[];
}

export function parseCardsXml(content: string): ParsedCardsXml {
  const parser = new XMLParser({
    attributeNamePrefix: '',
    ignoreAttributes: false,
    trimValues: false
  });
  const parsed = parser.parse(content) as Record<string, unknown>;
  if (parsed.cockatrice_carddatabase) {
    return parseCockatriceXml(parsed.cockatrice_carddatabase as Record<string, unknown>);
  }
  const root = (parsed.homebrewForge ?? parsed.homebrew_forge ?? parsed.cards ?? parsed) as Record<string, unknown>;
  const cardsContainer = (root.cards ?? root) as Record<string, unknown>;
  const cardNodes = toArray(cardsContainer.card);
  const cards: CsvRow[] = [];
  const faces: CsvRow[] = [];
  const art: CsvRow[] = [];

  for (const node of cardNodes) {
    const cardNode = node as Record<string, unknown>;
    const card = coerceRow(cardNode);
    const cardId = card.card_id;
    delete card.face;
    delete card.faces;
    cards.push({
      print_count: '1',
      ...card
    });

    const faceContainer = cardNode.faces as Record<string, unknown> | undefined;
    const faceNodes = toArray(cardNode.face ?? faceContainer?.face);
    for (const faceNode of faceNodes) {
      faces.push({
        card_id: cardId,
        ...coerceRow(faceNode as Record<string, unknown>)
      });
    }
  }

  return { cards, faces, art };
}

function parseCockatriceXml(root: Record<string, unknown>): ParsedCardsXml {
  const cardsContainer = root.cards as Record<string, unknown> | undefined;
  const cardNodes = toArray(cardsContainer?.card);
  const cards: CsvRow[] = [];
  const faces: CsvRow[] = [];
  const art: CsvRow[] = [];

  for (const [index, node] of cardNodes.entries()) {
    const cardNode = node as Record<string, unknown>;
    const name = textValue(cardNode.name) || `Imported Card ${index + 1}`;
    const setNode = firstValue(cardNode.set);
    const setRecord = typeof setNode === 'object' && setNode !== null ? (setNode as Record<string, unknown>) : {};
    const setCode = textValue(setNode) || 'IMP';
    const collectorNumber = textValue(cardNode.collector_number ?? cardNode.number) || String(index + 1).padStart(3, '0');
    const colors = toArray(cardNode.color).map(textValue).join('');
    const typeLine = textValue(cardNode.type) || 'Creature';
    const [power = '', toughness = ''] = textValue(cardNode.pt).split('/');
    const tokenFlag = textValue(cardNode.token);
    const layout = textValue((cardNode.prop as Record<string, unknown> | undefined)?.layout) || inferLayout(typeLine, tokenFlag);
    const cardId = safeCardId(`${setCode}-${collectorNumber || index + 1}`);
    const picUrl = textValue(setRecord.picURL);
    const artId = picUrl ? `${cardId}-ART` : '';
    const rarity = normalizeRarity(textValue(setRecord.rarity));
    const colorIdentity = normalizeColors(colors);
    const notes = [
      'Imported from MTG.design/Cockatrice XML.',
      picUrl ? `legacy_image_url=${picUrl}` : '',
      tokenFlag ? 'token=1' : ''
    ]
      .filter(Boolean)
      .join(' ');

    cards.push({
      card_id: cardId,
      set_code: setCode,
      collector_number: collectorNumber,
      name,
      layout,
      mode: layout === 'token' ? 'token' : 'imported',
      rarity,
      color_identity: colorIdentity,
      tags: cardTags(typeLine, layout),
      status: 'draft',
      print_count: '1',
      notes
    });

    faces.push({
      card_id: cardId,
      face_index: '0',
      face_name: name,
      mana_cost: normalizeManaCost(textValue(cardNode.manacost)),
      type_line: typeLine,
      oracle_text: textValue(cardNode.text),
      flavor_text: '',
      power: power.trim(),
      toughness: toughness.trim(),
      colors: colorIdentity,
      frame_type: frameTypeFor(typeLine, layout),
      art_id: artId,
      artist_display: '',
      rules_text_size_hint: 'auto',
      rules_text_reminder_mode: 'auto',
      layout_variant: 'normal'
    });

    if (picUrl) {
      art.push({
        art_id: artId,
        file_path: '',
        source_url: picUrl,
        source_type: 'mtgdesign_reference',
        artist: '',
        license: 'private reference',
        permission_status: 'user_supplied_private_use',
        checksum_sha256: '',
        notes: 'legacy-render-reference; needs-editable-art-source'
      });
    }
  }

  return { cards, faces, art };
}

function coerceRow(node: Record<string, unknown>): CsvRow {
  const row: CsvRow = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined || value === null || typeof value === 'object') {
      continue;
    }
    row[key] = String(value);
  }
  return row;
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function firstValue(value: unknown): unknown {
  return toArray(value)[0];
}

function textValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record['#text'] ?? record.text ?? record.value);
  }
  return '';
}

export function safeCardId(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'IMP-001';
}

export function normalizeColors(value: string): string {
  const colors = value.toUpperCase().replace(/[^WUBRGC]/g, '').split('').filter(Boolean);
  return [...new Set(colors)].join('');
}

export function normalizeRarity(value: string): string {
  const normalized = value.toLowerCase().trim().replace(/[\s_-]+/g, '_');
  if (normalized === 'mythic_rare' || normalized === 'mythicrare') {
    return 'mythic';
  }
  if (['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus', 'token'].includes(normalized)) {
    return normalized;
  }
  return 'common';
}

export function inferLayout(typeLine: string, tokenFlag = ''): string {
  if (/\btoken\b/i.test(typeLine) || cleanTokenFlag(tokenFlag)) {
    return 'token';
  }
  if (/\bsaga\b/i.test(typeLine)) {
    return 'saga';
  }
  if (/\bbattle\b/i.test(typeLine)) {
    return 'battle';
  }
  return 'normal';
}

export function frameTypeFor(typeLine: string, layout: string): string {
  if (layout === 'token') {
    return 'token_creature';
  }
  if (layout === 'saga') {
    return 'saga';
  }
  if (layout === 'battle') {
    return 'battle';
  }
  if (/\bplaneswalker\b/i.test(typeLine)) {
    return 'normal_planeswalker';
  }
  if (/\bland\b/i.test(typeLine)) {
    return 'normal_land';
  }
  if (/\bartifact\b/i.test(typeLine) && !/\bcreature\b/i.test(typeLine)) {
    return 'normal_artifact';
  }
  return 'normal_creature';
}

function cleanTokenFlag(value: string): boolean {
  return ['1', 'true', 'yes', 'token'].includes(value.trim().toLowerCase());
}

function cardTags(typeLine: string, layout: string): string {
  const tags = ['imported:mtgdesign'];
  if (layout === 'token') {
    tags.push('token');
  }
  if (layout === 'saga') {
    tags.push('needs_review', 'unsupported_layout:saga');
  }
  if (/\btransform\b/i.test(typeLine)) {
    tags.push('possible_transform');
  }
  return tags.join(';');
}
