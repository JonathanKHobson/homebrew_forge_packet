#!/usr/bin/env node
import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { checkAssetPack, loadAssetPack } from './assets/assetPack.js';
import {
  exportCollectionCockatrice,
  exportCollectionCsv,
  exportCollectionPlainText,
  importCollectionCsv
} from './collections/collectionStore.js';
import {
  type CollectionExportTarget,
  type CollectionImportMode,
  type CollectionSourcePreset
} from './collections/collectionModel.js';
import { loadForgeProject } from './data/loadProject.js';
import { exportCockatricePackage } from './exporters/cockatriceExporter.js';
import { exportPrintPdf, type PrintPaper } from './exporters/printPdfExporter.js';
import {
  analyzeMtgDesignImport,
  applyImportedRows,
  readMtgDesignInput,
  writeImportReports,
  type ImportMode,
  type MtgDesignImportFormat
} from './importers/mtgDesign.js';
import {
  OFFICIAL_REPORTS_DIR,
  buildSyncReport,
  renderReferenceSyncMarkdown,
  type ReferenceSyncReport,
  writeOfficialReferenceSnapshot,
  writeOfficialRulesCatalog,
  writeReferenceReportPair
} from './reference/officialStore.js';
import { auditPowerTreatments } from './power/audit.js';
import { loadProjectPowerConfig } from './power/treatments.js';
import { loadProjectReferenceCatalog } from './reference/referenceStore.js';
import { DEFAULT_RULES_TXT_URL, parseComprehensiveRulesText } from './reference/rulesParser.js';
import { buildOfficialReferenceSnapshotFromScryfall, fetchScryfallReferenceInputs } from './reference/scryfallSync.js';
import { checkReferenceUpdates, fetchText } from './reference/updateCheck.js';
import { renderSetImages } from './renderer/renderCard.js';
import { validateForgeProject } from './validation/validateProject.js';

const program = new Command();

program.name('forge').description('Homebrew Forge vertical-slice CLI').version('0.1.0');

program
  .command('validate')
  .requiredOption('--set <setCode>', 'Set code to validate')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--cards-xml <path>', 'Optional simple XML card input to merge')
  .option('--json', 'Print structured JSON output', false)
  .action(async (options: { set: string; root: string; cardsXml?: string; json: boolean }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const project = await loadForgeProject({
        rootDir,
        setCode: options.set,
        cardsXmlPath: options.cardsXml ? resolve(options.cardsXml) : undefined
      });
      const result = validateForgeProject(project);
      if (options.json) {
        console.log(
          JSON.stringify(
            {
              setCode: project.setCode,
              cardCount: project.cards.length,
              faceCount: project.faces.length,
              valid: result.valid,
              errors: result.errors,
              warnings: result.warnings
            },
            null,
            2
          )
        );
        if (!result.valid) {
          process.exitCode = 1;
        }
        return;
      }
      for (const warning of result.warnings) {
        console.warn(`WARN ${warning}`);
      }
      if (!result.valid) {
        for (const error of result.errors) {
          console.error(`ERROR ${error}`);
        }
        process.exitCode = 1;
        return;
      }
      console.log(`Validated ${project.cards.length} cards for ${project.setCode}.`);
    });
  });

program
  .command('render')
  .requiredOption('--set <setCode>', 'Set code to render')
  .option('--profile <profileId>', 'Export profile ID', 'review_png')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--output <path>', 'Output root', 'output')
  .action(async (options: { set: string; profile: string; root: string; output: string }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const project = await loadForgeProject({ rootDir, setCode: options.set });
      const validation = validateForgeProject(project);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }
      const profile = project.exportProfiles.find((candidate) => candidate.profileId === options.profile);
      if (!profile) {
        throw new Error(`Unknown export profile ${options.profile}.`);
      }
      const assetPack = await loadAssetPack({ rootDir, packId: project.set.defaultAssetPack ?? 'debug' });
      const referenceCatalog = loadProjectReferenceCatalog(rootDir);
      const outputRoot = resolve(options.output);
      const outDir =
        profile.target === 'cockatrice'
          ? join(outputRoot, project.setCode, 'cockatrice', 'pics', 'CUSTOM', project.setCode)
          : join(outputRoot, project.setCode, 'images');
      const results = await renderSetImages({
        cards: project.cards,
        faces: project.faces,
        art: project.art,
        assetPack,
        exportProfile: profile,
        outDir,
        referenceCatalog
      });
      for (const result of results) {
        console.log(result.outputPath);
      }
    });
  });

const exportCommand = program.command('export').description('Export set, deck, and collection packages');
const assetsCommand = program.command('assets').description('Inspect local asset packs');
const importCommand = program.command('import').description('Import MTG.design, scanner CSV, and XML data');
const inspectCommand = program.command('inspect').description('Inspect local Homebrew Forge source data');
const referenceCommand = program.command('reference').description('Audit, sync, and inspect official Magic reference data');
const powerCommand = program.command('power').description('Audit and inspect card power scoring treatments');

assetsCommand
  .command('check')
  .requiredOption('--pack <packId>', 'Asset pack ID to check')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--strict', 'Exit non-zero when required files are missing', false)
  .action(async (options: { pack: string; root: string; strict: boolean }) => {
    await runCli(async () => {
      const assetPack = await loadAssetPack({ rootDir: resolveRoot(options.root), packId: options.pack });
      const result = checkAssetPack(assetPack);
      console.log(`Asset pack ${result.packId}: ${result.present.length} present, ${result.missing.length} required missing.`);
      if (result.missing.length > 0) {
        for (const role of result.missing) {
          console.log(`MISSING ${role.role}${role.layout ? ` layout=${role.layout}` : ''}${role.colorVariant ? ` color=${role.colorVariant}` : ''}${role.symbol ? ` symbol=${role.symbol}` : ''} -> ${role.path}`);
        }
        if (options.strict) {
          process.exitCode = 1;
        }
      }
    });
  });

exportCommand
  .command('cockatrice')
  .requiredOption('--set <setCode>', 'Set code to export')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--output <path>', 'Output root', 'output')
  .option('--zip', 'Write Cockatrice ZIP package', false)
  .action(async (options: { set: string; root: string; output: string; zip: boolean }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const project = await loadForgeProject({ rootDir, setCode: options.set });
      const validation = validateForgeProject(project);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }
      const result = await exportCockatricePackage({
        project,
        rootDir,
        setCode: options.set,
        outputRoot: resolve(options.output),
        zip: options.zip
      });
      console.log(result.xmlPath);
      if (result.zipPath) {
        console.log(result.zipPath);
      }
    });
  });

exportCommand
  .command('print')
  .requiredOption('--set <setCode>', 'Set code to export')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--output <path>', 'Output root', 'output')
  .option('--paper <paper>', 'Paper size: letter or a4', 'letter')
  .option('--cards-per-page <count>', 'Cards per page', '9')
  .option('--profile <profileId>', 'Print PDF export profile ID')
  .action(async (options: { set: string; root: string; output: string; paper: string; cardsPerPage: string; profile?: string }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const project = await loadForgeProject({ rootDir, setCode: options.set });
      const validation = validateForgeProject(project);
      if (!validation.valid) {
        throw new Error(validation.errors.join('\n'));
      }
      const result = await exportPrintPdf({
        project,
        rootDir,
        setCode: options.set.toUpperCase(),
        outputRoot: resolve(options.output),
        paper: normalizePrintPaper(options.paper),
        cardsPerPage: normalizeCardsPerPage(options.cardsPerPage),
        profileId: options.profile
      });
      console.log(result.pdfPath);
      for (const warning of result.warnings) {
        console.warn(`WARN ${warning}`);
      }
    });
  });

exportCommand
  .command('collection')
  .requiredOption('--collection <id>', 'Collection id to export')
  .option('--target <target>', 'Export target: csv, text, or cockatrice', 'csv')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--output <path>', 'Optional output file path')
  .action(async (options: { collection: string; target: string; root: string; output?: string }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const target = normalizeCollectionExportTarget(options.target);
      const result =
        target === 'cockatrice'
          ? await exportCollectionCockatrice(rootDir, options.collection)
          : target === 'text'
            ? await exportCollectionPlainText(rootDir, options.collection)
            : await exportCollectionCsv(rootDir, options.collection);
      if (options.output) {
        const outputPath = resolveOutputPath(rootDir, options.output);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, result.content, 'utf8');
        console.log(outputPath);
        return;
      }
      process.stdout.write(result.content);
    });
  });

importCommand
  .command('collection')
  .requiredOption('--from <csv>', 'Scanner CSV file to import')
  .requiredOption('--collection <id>', 'Collection id to import into')
  .option('--source <source>', 'Scanner source: manabox, tcgplayer, dragonshield, delver, or generic', 'manabox')
  .option('--name <name>', 'Collection display name')
  .option('--description <description>', 'Collection description')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--mode <mode>', 'append or replace', 'append')
  .option('--dry-run', 'Analyze and report without writing collection files', false)
  .option('--json', 'Print structured JSON summary', false)
  .action(
    async (options: {
      from: string;
      collection: string;
      source: string;
      name?: string;
      description?: string;
      root: string;
      mode: string;
      dryRun: boolean;
      json: boolean;
    }) => {
      await runCli(async () => {
        const rootDir = resolveRoot(options.root);
        const result = await importCollectionCsv(rootDir, {
          collectionId: options.collection,
          name: options.name,
          description: options.description,
          source: normalizeCollectionSource(options.source),
          mode: normalizeCollectionImportMode(options.mode),
          dryRun: options.dryRun,
          content: await readFile(resolve(options.from), 'utf8')
        });
        if (options.json) {
          console.log(JSON.stringify(result.summary, null, 2));
          return;
        }
        console.log(
          `${options.dryRun ? 'Dry-run analyzed' : 'Imported'} ${result.summary.importedRows} scanner rows into ${result.summary.collectionId}. ` +
            `${result.summary.matchedRows} matched, ${result.summary.reviewRows} need review.`
        );
        if (result.summary.warnings.length > 0) {
          console.log(`Warnings: ${result.summary.warnings.length}`);
        }
      });
    }
  );

importCommand
  .command('mtgdesign')
  .requiredOption('--set <setCode>', 'Set code to import into')
  .requiredOption('--input <path>', 'MTG.design export file, folder, or ZIP')
  .option('--format <format>', 'Import format: cockatrice, planesculptors, xml, or csv', 'cockatrice')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--mode <mode>', 'append or replace', 'append')
  .option('--dry-run', 'Analyze and report without writing CSV files', false)
  .option('--report <path>', 'Write JSON and Markdown import audit reports')
  .option('--json', 'Print structured JSON summary', false)
  .action(
    async (options: {
      set: string;
      input: string;
      format: MtgDesignImportFormat;
      root: string;
      mode: ImportMode;
      dryRun: boolean;
      report?: string;
      json: boolean;
    }) => {
      await runCli(async () => {
        const rootDir = resolveRoot(options.root);
        const format = normalizeImportFormat(options.format);
        const mode = normalizeImportMode(options.mode);
        const input = await readMtgDesignInput(resolve(options.input), format);
        const imported = analyzeMtgDesignImport({
          setCode: options.set.toUpperCase(),
          format,
          content: input.content,
          inputPath: input.inputPath
        });
        const summary = await applyImportedRows({
          repoRoot: rootDir,
          setCode: options.set.toUpperCase(),
          imported,
          mode,
          dryRun: options.dryRun
        });
        if (options.report) {
          const reportPath = resolveOutputPath(rootDir, options.report);
          await writeImportReports(reportPath, { ...summary, reportPath });
          summary.reportPath = reportPath;
        }
        if (options.json) {
          console.log(JSON.stringify(summary, null, 2));
          return;
        }
        console.log(
          `${options.dryRun ? 'Dry-run analyzed' : 'Imported'} ${summary.importedCards} cards, ${summary.importedFaces} faces, ${summary.artReferences} art references for ${summary.setCode}.`
        );
        console.log(`Warnings: ${summary.warnings.length}. Unsupported layouts: ${summary.unsupportedLayouts.map((item) => `${item.layout}=${item.count}`).join(', ') || 'none'}.`);
        if (summary.reportPath) {
          console.log(`Report: ${summary.reportPath}`);
        }
      });
    }
  );

inspectCommand
  .command('set')
  .requiredOption('--set <setCode>', 'Set code to inspect')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--json', 'Print structured JSON output', false)
  .action(async (options: { set: string; root: string; json: boolean }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const project = await loadForgeProject({ rootDir, setCode: options.set.toUpperCase() });
      const validation = validateForgeProject(project);
      const summary = {
        setCode: project.setCode,
        setName: project.set.setName,
        cardCount: project.cards.length,
        faceCount: project.faces.length,
        artCount: Object.keys(project.art).length,
        layouts: countBy(project.cards.map((card) => card.layout)),
        rarities: countBy(project.cards.map((card) => card.rarity)),
        statuses: countBy(project.cards.map((card) => card.status)),
        warnings: validation.warnings,
        errors: validation.errors
      };
      if (options.json) {
        console.log(JSON.stringify(summary, null, 2));
        return;
      }
      console.log(`${summary.setCode} ${summary.setName}: ${summary.cardCount} cards, ${summary.faceCount} faces, ${summary.artCount} art rows.`);
      console.log(`Layouts: ${Object.entries(summary.layouts).map(([key, count]) => `${key}=${count}`).join(', ')}`);
      if (summary.errors.length) {
        console.log(`Errors: ${summary.errors.length}`);
      }
      if (summary.warnings.length) {
        console.log(`Warnings: ${summary.warnings.length}`);
      }
    });
  });

referenceCommand
  .command('audit')
  .option('--source <source>', 'Reference source to audit', 'scryfall')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--json', 'Print structured JSON output', false)
  .action(async (options: { source: string; root: string; json: boolean }) => {
    await runCli(async () => {
      normalizeReferenceSource(options.source);
      const rootDir = resolveRoot(options.root);
      const current = loadProjectReferenceCatalog(rootDir);
      const inputs = await fetchScryfallReferenceInputs({ includeTokenCards: true, includeCounterCards: true });
      const rulesText = await fetchText(fetch, DEFAULT_RULES_TXT_URL);
      const rules = parseComprehensiveRulesText(rulesText, { sourceUrl: DEFAULT_RULES_TXT_URL, relatedTerms: current.terms });
      const snapshot = buildOfficialReferenceSnapshotFromScryfall({ inputs, currentTerms: current.terms, rulesCatalog: rules });
      const report = buildSyncReport({
        source: options.source,
        dryRun: true,
        generatedAt: snapshot.generatedAt,
        currentTerms: current.terms,
        proposedTerms: snapshot.terms,
        sourceSnapshots: snapshot.sourceSnapshots
      });
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      printReferenceSummary(report);
    });
  });

referenceCommand
  .command('sync')
  .option('--source <source>', 'Reference source to sync', 'scryfall')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--dry-run', 'Analyze and report without writing current official snapshot', false)
  .option('--report <path>', 'Write JSON and Markdown sync reports')
  .option('--json', 'Print structured JSON output', false)
  .action(async (options: { source: string; root: string; dryRun: boolean; report?: string; json: boolean }) => {
    await runCli(async () => {
      normalizeReferenceSource(options.source);
      const rootDir = resolveRoot(options.root);
      const current = loadProjectReferenceCatalog(rootDir);
      const inputs = await fetchScryfallReferenceInputs({ includeTokenCards: true, includeCounterCards: true });
      const rulesText = await fetchText(fetch, DEFAULT_RULES_TXT_URL);
      const rules = parseComprehensiveRulesText(rulesText, { sourceUrl: DEFAULT_RULES_TXT_URL, relatedTerms: current.terms });
      const snapshot = buildOfficialReferenceSnapshotFromScryfall({ inputs, currentTerms: current.terms, rulesCatalog: rules });
      const report = buildSyncReport({
        source: options.source,
        dryRun: options.dryRun,
        generatedAt: snapshot.generatedAt,
        currentTerms: current.terms,
        proposedTerms: snapshot.terms,
        sourceSnapshots: snapshot.sourceSnapshots
      });
      const reportPath = options.report ? resolveOutputPath(rootDir, options.report) : resolveOutputPath(rootDir, join(OFFICIAL_REPORTS_DIR, `${safeTimestamp(snapshot.generatedAt)}-reference-sync`));
      const writtenReport = await writeReferenceReportPair(reportPath, report, renderReferenceSyncMarkdown(report));
      let catalogPath: string | undefined;
      if (!options.dryRun) {
        catalogPath = await writeOfficialReferenceSnapshot(rootDir, snapshot, true);
      }
      if (options.json) {
        console.log(JSON.stringify({ report, reportPath: writtenReport, catalogPath }, null, 2));
        return;
      }
      printReferenceSummary(report);
      console.log(`Report: ${writtenReport.markdownPath}`);
      if (catalogPath) {
        console.log(`Current official catalog: ${catalogPath}`);
      }
    });
  });

const referenceRulesCommand = referenceCommand.command('rules').description('Sync and inspect Comprehensive Rules snapshots');

referenceRulesCommand
  .command('sync')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--url <url>', 'Comprehensive Rules TXT URL', DEFAULT_RULES_TXT_URL)
  .option('--dry-run', 'Analyze and report without writing current official rules', false)
  .option('--report <path>', 'Write JSON and Markdown rules reports')
  .option('--json', 'Print structured JSON output', false)
  .action(async (options: { root: string; url: string; dryRun: boolean; report?: string; json: boolean }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const current = loadProjectReferenceCatalog(rootDir);
      const text = await fetchText(fetch, options.url);
      const rules = parseComprehensiveRulesText(text, { sourceUrl: options.url, relatedTerms: current.terms });
      const report = {
        version: 1,
        generatedAt: rules.updatedAt,
        dryRun: options.dryRun,
        effectiveDate: rules.effectiveDate,
        sourceUrl: rules.sourceUrl,
        sourceSnapshot: rules.sourceSnapshot,
        entryCounts: countBy(rules.entries.map((entry) => entry.kind))
      };
      const markdown = renderRulesSyncMarkdown(report);
      const reportPath = options.report ? resolveOutputPath(rootDir, options.report) : resolveOutputPath(rootDir, join(OFFICIAL_REPORTS_DIR, `${safeTimestamp(rules.updatedAt)}-rules-sync`));
      const writtenReport = await writeReferenceReportPair(reportPath, report, markdown);
      let rulesPath: string | undefined;
      if (!options.dryRun) {
        rulesPath = await writeOfficialRulesCatalog(rootDir, rules, true);
      }
      if (options.json) {
        console.log(JSON.stringify({ report, reportPath: writtenReport, rulesPath }, null, 2));
        return;
      }
      console.log(`Rules entries: ${rules.entries.length}. Effective: ${rules.effectiveDate ?? 'unknown'}.`);
      console.log(`Report: ${writtenReport.markdownPath}`);
      if (rulesPath) {
        console.log(`Current official rules: ${rulesPath}`);
      }
    });
  });

referenceCommand
  .command('update')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--check', 'Check upstream reference sources for pending changes', false)
  .option('--json', 'Print structured JSON output', false)
  .action(async (options: { root: string; check: boolean; json: boolean }) => {
    await runCli(async () => {
      if (!options.check) {
        throw new Error('Use --check to inspect upstream reference update status.');
      }
      const rootDir = resolveRoot(options.root);
      const result = await checkReferenceUpdates(rootDir);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      console.log(`Pending updates: ${result.status.hasPendingUpdates ? 'yes' : 'no'}.`);
      for (const source of result.status.sources) {
        console.log(`${source.changed ? 'CHANGED' : 'OK'} ${source.label}`);
      }
      if (result.path) {
        console.log(`Status: ${result.path}`);
      }
    });
  });

powerCommand
  .command('audit')
  .option('--root <path>', 'Repo root', process.cwd())
  .option('--json', 'Print structured JSON output', false)
  .option('--report <path>', 'Write JSON coverage report')
  .action(async (options: { root: string; json: boolean; report?: string }) => {
    await runCli(async () => {
      const rootDir = resolveRoot(options.root);
      const catalog = loadProjectReferenceCatalog(rootDir);
      const config = loadProjectPowerConfig(rootDir);
      const report = auditPowerTreatments(catalog, config);
      if (options.report) {
        const outputPath = resolveOutputPath(rootDir, options.report);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      }
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }
      console.log(`Power treatment audit: ${report.totalTerms} terms.`);
      console.log(`Direct: ${report.counts.direct}. Formula: ${report.counts.formula}. Contextual: ${report.counts.contextual}. Neutral: ${report.counts.neutral}. Needs review: ${report.counts['needs-review']}. Uncovered: ${report.counts.uncovered}.`);
      console.log(`Treatment source: ${report.treatmentSources.term} term-specific, ${report.treatmentSources.category} category-policy, ${report.treatmentSources.uncovered} uncovered.`);
      if (options.report) {
        console.log(`Report: ${resolveOutputPath(rootDir, options.report)}`);
      }
      if (report.counts.uncovered > 0) {
        process.exitCode = 1;
      }
    });
  });

function normalizeReferenceSource(value: string): 'scryfall' {
  if (value.toLowerCase() === 'scryfall') {
    return 'scryfall';
  }
  throw new Error(`Unsupported reference source ${value}.`);
}

function printReferenceSummary(report: ReferenceSyncReport): void {
  console.log(
    `Reference ${report.dryRun ? 'audit' : 'sync'}: ` +
      `${report.diff.added.length} added, ${report.diff.changed.length} changed, ${report.diff.removed.length} removed, ${report.diff.reviewNeeded.length} need review.`
  );
  console.log(`Proposed terms: ${Object.entries(report.proposedCounts).map(([category, count]) => `${category}=${count}`).join(', ')}`);
}

function renderRulesSyncMarkdown(report: {
  generatedAt: string;
  dryRun: boolean;
  effectiveDate?: string;
  sourceUrl: string;
  entryCounts: Record<string, number>;
}): string {
  const lines = [
    '# Rules Sync Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Effective date: ${report.effectiveDate ?? 'unknown'}`,
    `Source: ${report.sourceUrl}`,
    `Dry run: ${report.dryRun ? 'yes' : 'no'}`,
    '',
    '## Entry Counts',
    ''
  ];
  for (const [kind, count] of Object.entries(report.entryCounts).sort()) {
    lines.push(`- ${kind}: ${count}`);
  }
  return lines.join('\n');
}

async function runCli(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function normalizeImportFormat(value: string): MtgDesignImportFormat {
  if (['csv', 'xml', 'cockatrice', 'planesculptors'].includes(value)) {
    return value as MtgDesignImportFormat;
  }
  throw new Error(`Unsupported import format ${value}.`);
}

function normalizeImportMode(value: string): ImportMode {
  if (['append', 'replace'].includes(value)) {
    return value as ImportMode;
  }
  throw new Error(`Unsupported import mode ${value}.`);
}

function normalizeCollectionImportMode(value: string): CollectionImportMode {
  if (['append', 'replace'].includes(value)) {
    return value as CollectionImportMode;
  }
  throw new Error(`Unsupported collection import mode ${value}.`);
}

function normalizeCollectionSource(value: string): CollectionSourcePreset {
  const normalized = value.toLowerCase();
  if (['manabox', 'tcgplayer', 'dragonshield', 'delver', 'generic'].includes(normalized)) {
    return normalized as CollectionSourcePreset;
  }
  throw new Error(`Unsupported collection source ${value}.`);
}

function normalizeCollectionExportTarget(value: string): CollectionExportTarget {
  const normalized = value.toLowerCase();
  if (['csv', 'text', 'cockatrice'].includes(normalized)) {
    return normalized as CollectionExportTarget;
  }
  throw new Error(`Unsupported collection export target ${value}.`);
}

function normalizePrintPaper(value: string): PrintPaper {
  const normalized = value.toLowerCase();
  if (normalized === 'letter' || normalized === 'a4') {
    return normalized;
  }
  throw new Error(`Unsupported paper ${value}.`);
}

function normalizeCardsPerPage(value: string): number {
  const count = Number(value);
  if (Number.isInteger(count) && count > 0) {
    return count;
  }
  throw new Error(`Invalid cards-per-page value ${value}.`);
}

function resolveRoot(value: string): string {
  let current = resolve(value);
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, 'sets')) && existsSync(join(current, 'package.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(value);
}

function resolveOutputPath(rootDir: string, value: string): string {
  return value.startsWith('/') ? resolve(value) : resolve(rootDir, value);
}

function safeTimestamp(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]+/g, '-').replace(/-+/g, '-');
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

program.parse();
