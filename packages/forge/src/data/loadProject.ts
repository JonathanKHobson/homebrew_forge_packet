import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { ZodError, type ZodType } from 'zod';
import { parseCsvRecords, type CsvRow } from './csv.js';
import { parseCardsXml } from './xml.js';
import {
  artManifestRecordSchema,
  cardFaceRecordSchema,
  cardRecordSchema,
  exportProfileSchema,
  type ArtManifestRecord,
  type CardFaceRecord,
  type CardRecord,
  type ExportProfile,
  type ForgeProject,
  setRecordSchema
} from '../domain/schemas.js';

export interface LoadForgeProjectOptions {
  rootDir: string;
  setCode: string;
  cardsXmlPath?: string;
}

export async function loadForgeProject(options: LoadForgeProjectOptions): Promise<ForgeProject> {
  const setDir = join(options.rootDir, 'sets', options.setCode);
  const sets = parseRows(await readCsvFile(join(setDir, 'sets.csv')), setRecordSchema, 'sets.csv');
  const set = sets.find((candidate) => candidate.setCode === options.setCode);
  if (!set) {
    throw new Error(`No set row found for ${options.setCode}.`);
  }

  let rawCards = await readCsvFile(join(setDir, 'cards.csv'));
  let rawFaces = await readCsvFile(join(setDir, 'card_faces.csv'));
  if (options.cardsXmlPath) {
    const parsedXml = parseCardsXml(await readFile(options.cardsXmlPath, 'utf8'));
    rawCards = rawCards.concat(parsedXml.cards);
    rawFaces = rawFaces.concat(parsedXml.faces);
  }

  const cards = parseRows(rawCards, cardRecordSchema, 'cards.csv');
  const faces = parseRows(rawFaces, cardFaceRecordSchema, 'card_faces.csv');
  const artRows = parseRows(await readCsvFile(join(setDir, 'art_manifest.csv')), artManifestRecordSchema, 'art_manifest.csv');
  const exportProfiles = parseRows(
    await readCsvFile(join(setDir, 'export_profiles.csv')),
    exportProfileSchema,
    'export_profiles.csv'
  );
  const art = Object.fromEntries(
    artRows.map((row) => [
      row.artId,
      {
        ...row,
        absolutePath: row.filePath ? (isAbsolute(row.filePath) ? row.filePath : join(options.rootDir, row.filePath)) : undefined
      } satisfies ArtManifestRecord
    ])
  );

  return {
    rootDir: options.rootDir,
    setCode: options.setCode,
    set,
    cards,
    faces,
    art,
    exportProfiles
  };
}

async function readCsvFile(path: string): Promise<CsvRow[]> {
  return parseCsvRecords(await readFile(path, 'utf8'));
}

function parseRows<T>(rows: CsvRow[], schema: ZodType<T>, label: string): T[] {
  return rows.map((row, index) => {
    try {
      return schema.parse(row);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(`${label} row ${index + 2} is invalid: ${error.issues.map((issue) => issue.message).join('; ')}`);
      }
      throw error;
    }
  });
}
