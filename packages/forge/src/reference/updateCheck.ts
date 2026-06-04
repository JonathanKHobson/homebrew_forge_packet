import { readOfficialReferenceSnapshot, readOfficialRulesCatalog, writeReferenceUpdateStatus, type ReferenceUpdateStatus } from './officialStore.js';
import { parseComprehensiveRulesText, DEFAULT_RULES_TXT_URL } from './rulesParser.js';
import { fetchScryfallBulkData, fetchScryfallReferenceInputs } from './scryfallSync.js';

export interface ReferenceUpdateCheckOptions {
  fetchImpl?: typeof fetch;
  rulesUrl?: string;
  checkedAt?: string;
  write?: boolean;
}

export async function checkReferenceUpdates(rootDir: string, options: ReferenceUpdateCheckOptions = {}): Promise<{ status: ReferenceUpdateStatus; path?: string }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const currentCatalog = readOfficialReferenceSnapshot(rootDir);
  const currentRules = readOfficialRulesCatalog(rootDir);
  const sources: ReferenceUpdateStatus['sources'] = [];

  const bulk = await fetchScryfallBulkData(fetchImpl);
  const oracleBulk = bulk.data.find((item) => item.type === 'oracle_cards');
  sources.push({
    id: 'scryfall-oracle-cards',
    label: 'Scryfall Oracle Cards bulk data',
    current: currentCatalog?.sourceSnapshots.find((snapshot) => snapshot.kind === 'oracle-cards')?.upstreamUpdatedAt,
    upstream: oracleBulk?.updated_at,
    changed: Boolean(oracleBulk?.updated_at && currentCatalog?.sourceSnapshots.every((snapshot) => snapshot.upstreamUpdatedAt !== oracleBulk.updated_at))
  });

  const catalogInputs = await fetchScryfallReferenceInputs({
    fetchImpl,
    fetchedAt: checkedAt,
    includeTokenCards: false,
    includeCounterCards: false
  });
  for (const upstream of catalogInputs.sourceSnapshots) {
    if (upstream.kind === 'oracle-cards') {
      continue;
    }
    const current = currentCatalog?.sourceSnapshots.find((snapshot) => snapshot.kind === upstream.kind);
    sources.push({
      id: upstream.kind,
      label: `Scryfall ${upstream.kind}`,
      current: current?.contentHash,
      upstream: upstream.contentHash,
      changed: current?.contentHash !== upstream.contentHash
    });
  }

  const rulesUrl = options.rulesUrl ?? DEFAULT_RULES_TXT_URL;
  const rulesText = await fetchText(fetchImpl, rulesUrl);
  const parsedRules = parseComprehensiveRulesText(rulesText, { sourceUrl: rulesUrl, fetchedAt: checkedAt });
  sources.push({
    id: 'wizards-comprehensive-rules',
    label: 'Wizards Comprehensive Rules',
    current: currentRules?.sourceSnapshot?.contentHash ?? currentRules?.effectiveDate,
    upstream: parsedRules.sourceSnapshot?.contentHash ?? parsedRules.effectiveDate,
    changed: (currentRules?.sourceSnapshot?.contentHash ?? currentRules?.effectiveDate) !== (parsedRules.sourceSnapshot?.contentHash ?? parsedRules.effectiveDate)
  });

  const status: ReferenceUpdateStatus = {
    version: 1,
    checkedAt,
    hasPendingUpdates: sources.some((source) => source.changed),
    sources
  };
  const path = options.write === false ? undefined : await writeReferenceUpdateStatus(rootDir, status);
  return { status, path };
}

export async function fetchText(fetchImpl: typeof fetch, url: string): Promise<string> {
  const response = await fetchImpl(url, {
    headers: {
      Accept: 'text/plain,*/*',
      'User-Agent': 'HomebrewForge/0.1 reference-sync'
    }
  });
  if (!response.ok) {
    throw new Error(`Rules request failed ${response.status}: ${url}`);
  }
  return response.text();
}
