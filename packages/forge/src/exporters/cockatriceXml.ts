import type { CardFaceRecord, CardRecord, ForgeProject } from '../domain/schemas.js';

export function buildCockatriceXml(project: ForgeProject, imagePathsByCardId: Map<string, string>): string {
  const cardsXml = project.cards.map((card) => buildCardXml(card, getPrimaryFace(project, card), imagePathsByCardId.get(card.cardId))).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<cockatrice_carddatabase version="4">',
    '  <sets>',
    '    <set>',
    `      <name>${escapeXml(project.set.setCode)}</name>`,
    `      <longname>${escapeXml(project.set.setName)}</longname>`,
    `      <settype>${escapeXml(project.set.setType ?? 'custom')}</settype>`,
    '    </set>',
    '  </sets>',
    '  <cards>',
    cardsXml,
    '  </cards>',
    '</cockatrice_carddatabase>',
    ''
  ].join('\n');
}

function buildCardXml(card: CardRecord, face: CardFaceRecord, imagePath?: string): string {
  const colors = splitColors(face.colors ?? card.colorIdentity);
  const pt = face.power && face.toughness ? `${face.power}/${face.toughness}` : undefined;
  const imageFile = imagePath ? imagePath.split('/').pop() : undefined;

  return [
    '    <card>',
    `      <name>${escapeXml(card.name)}</name>`,
    `      <set${imageFile ? ` picURL="CUSTOM/${escapeXml(card.setCode)}/${escapeXml(imageFile)}"` : ''}>${escapeXml(card.setCode)}</set>`,
    ...colors.map((color) => `      <color>${escapeXml(color)}</color>`),
    face.manaCost ? `      <manacost>${escapeXml(face.manaCost)}</manacost>` : undefined,
    `      <type>${escapeXml(face.typeLine)}</type>`,
    face.oracleText ? `      <text>${escapeXml(face.oracleText)}</text>` : undefined,
    pt ? `      <pt>${escapeXml(pt)}</pt>` : undefined,
    `      <tablerow>${card.layout === 'token' ? '2' : '1'}</tablerow>`,
    `      <prop><layout>${escapeXml(card.layout)}</layout><side>front</side></prop>`,
    '    </card>'
  ]
    .filter(Boolean)
    .join('\n');
}

function getPrimaryFace(project: ForgeProject, card: CardRecord): CardFaceRecord {
  const face = [...project.faces.filter((candidate) => candidate.cardId === card.cardId)].sort((a, b) => a.faceIndex - b.faceIndex)[0];
  if (!face) {
    throw new Error(`Card ${card.cardId} has no face rows.`);
  }
  return face;
}

function splitColors(colors?: string): string[] {
  if (!colors || colors === 'C') {
    return [];
  }
  return colors.replace(/[^WUBRG]/g, '').split('');
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
