import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCardsXml } from '../src/data/xml.js';

describe('XML input support', () => {
  it('loads simple card and face records from XML', () => {
    const xml = `
      <homebrewForge>
        <cards>
          <card card_id="XML-001" set_code="XML" collector_number="001" name="XML Adept" layout="normal" mode="custom" rarity="common" status="draft" color_identity="U">
            <face face_index="0" face_name="XML Adept" mana_cost="{1}{U}" type_line="Creature - Wizard" oracle_text="Draw a card." power="1" toughness="3" colors="U" frame_type="normal_creature" />
          </card>
        </cards>
      </homebrewForge>
    `;

    const result = parseCardsXml(xml);

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0]?.card_id, 'XML-001');
    assert.equal(result.cards[0]?.name, 'XML Adept');
    assert.equal(result.cards[0]?.set_code, 'XML');
    assert.equal(result.faces.length, 1);
    assert.equal(result.faces[0]?.card_id, 'XML-001');
    assert.equal(result.faces[0]?.face_name, 'XML Adept');
    assert.equal(result.faces[0]?.mana_cost, '{1}{U}');
  });

  it('maps Cockatrice card XML into forge card and face rows', () => {
    const xml = `
      <cockatrice_carddatabase version="4">
        <cards>
          <card>
            <name>Gate Room Sentinel</name>
            <set picURL="CUSTOM/STG1/gate-room-sentinel.png">STG1</set>
            <color>W</color>
            <manacost>{2}{W}</manacost>
            <type>Creature - Soldier</type>
            <text>Vigilance</text>
            <pt>2/3</pt>
            <prop><layout>normal</layout></prop>
          </card>
        </cards>
      </cockatrice_carddatabase>
    `;

    const result = parseCardsXml(xml);

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0]?.card_id, 'STG1-001');
    assert.equal(result.cards[0]?.set_code, 'STG1');
    assert.equal(result.cards[0]?.name, 'Gate Room Sentinel');
    assert.equal(result.cards[0]?.mode, 'imported');
    assert.equal(result.faces[0]?.mana_cost, '{2}{W}');
    assert.equal(result.faces[0]?.type_line, 'Creature - Soldier');
    assert.equal(result.faces[0]?.power, '2');
    assert.equal(result.faces[0]?.toughness, '3');
    assert.equal(result.cards[0]?.rarity, 'common');
    assert.equal(result.art?.[0]?.source_url, 'CUSTOM/STG1/gate-room-sentinel.png');
  });

  it('preserves MTG.design Cockatrice rarity, picURL, tokens, and mana syntax from the local SGE sample', async () => {
    const xml = await readFile('/Users/kyle/Documents/My Games/Magic The Gathering/Sets/test import/Stargate/SGE/SGE.xml', 'utf8');

    const result = parseCardsXml(xml);

    assert.equal(result.cards.length, 105);
    assert.equal(result.faces.length, 105);
    assert.equal(result.art?.length, 105);
    assert.equal(result.cards.filter((card) => card.rarity === 'rare').length, 43);
    assert.equal(result.cards.filter((card) => card.rarity === 'mythic').length, 12);
    assert.equal(result.cards.filter((card) => card.layout === 'token').length, 8);
    const prometheus = result.faces.find((face) => face.face_name === 'Prometheus');
    assert.equal(prometheus?.mana_cost, '{4}{W}{W}');
    assert.equal(prometheus?.art_id, 'SGE-001-ART');
    const firstArt = result.art?.find((art) => art.art_id === 'SGE-001-ART');
    assert.equal(firstArt?.source_url, 'https://mtg.design/i/qxjs35.jpg');
    assert.match(firstArt?.notes ?? '', /legacy-render-reference/);
  });
});
