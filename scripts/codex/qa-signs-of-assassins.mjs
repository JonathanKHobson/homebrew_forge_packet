import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const requireFromForge = createRequire(resolve(repoRoot, 'packages/forge/package.json'));
const playwright = requireFromForge('playwright');
const baseUrl = process.env.FORGE_QA_URL ?? 'http://127.0.0.1:5177/';
const outDir = resolve(repoRoot, 'output/playwright/signs-of-assassins');

await mkdir(outDir, { recursive: true });

const browser = await playwright.chromium.launch({ headless: true });
const results = [];

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 930 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    localStorage.setItem('homebrew-forge.theme', 'dark');
    localStorage.setItem('homebrew-forge.defaultProjectId', 'assassin-deck-candidates');
    localStorage.setItem('homebrew-forge.orientation.dismissed', 'true');
    localStorage.setItem('homebrew-forge.firstRunOrientationDismissed', 'true');
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      results.push({ kind: 'console', type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    results.push({ kind: 'pageerror', text: error.message });
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => document.body.innerText.includes('Assassin Deck Candidates') || document.body.innerText.includes('Signs of Assassins'), { timeout: 25000 });

  await clickRail(page, 'Projects');
  await page.getByRole('heading', { name: 'Signs of Assassins' }).first().waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.body.innerText.includes('linked cards') && document.body.innerText.includes("Assassin's Ledger"), { timeout: 15000 });
  await capture(page, '00-project-linked-content');

  await clickRail(page, 'Decks');
  await clickDeckItem(page, /Signs of Assassins/).catch(() => {});
  await page.locator('.deck-workspace').waitFor({ timeout: 15000 });
  await page.getByRole('heading', { name: 'Signs of Assassins' }).waitFor({ timeout: 15000 });
  const variantOptions = await page.locator('.deck-variant-toolbar select option').evaluateAll((options) => options.map((option) => option.textContent?.trim()));
  assert(variantOptions.length === 6, `Expected 6 deck variants, found ${variantOptions.length}.`);

  await selectVariant(page, 'hidden-blade-core');
  await clickDeckViewMode(page, 'List');
  await page.waitForTimeout(500);
  const hiddenBladeGhostRows = await page.locator('.deck-compact-row.not-owned').count();
  assert(hiddenBladeGhostRows === 0, `Hidden Blade Core should have 0 ghost rows, found ${hiddenBladeGhostRows}.`);
  await capture(page, '01-hidden-blade-core-owned-only');

  await selectVariant(page, 'memory-corridor');
  await clickDeckViewMode(page, 'List');
  await page.waitForTimeout(500);
  const memoryGhostRows = await page.locator('.deck-compact-row.not-owned').count();
  const memoryRecommendedLabels = await page.locator('.deck-compact-row.not-owned small').evaluateAll((nodes) => nodes.map((node) => node.textContent ?? '').filter((text) => /recommended/i.test(text)));
  assert(memoryGhostRows > 0, 'Memory Corridor should show ghost/not-owned rows.');
  assert(memoryRecommendedLabels.length > 0, 'Memory Corridor ghost rows should include a Recommended label.');
	  await capture(page, '02-memory-corridor-ghost-rows');

	  await clickDeckSection(page, 'Maybeboard');
	  await page.waitForFunction(() => {
	    const activeTab = document.querySelector('.deck-board-tab.active');
	    return activeTab?.textContent?.includes('Maybeboard') && document.querySelectorAll('.deck-compact-row').length > 0;
	  }, { timeout: 10000 });
	  const memoryMaybeRows = await page.locator('.deck-compact-row').count();
	  const memoryMaybeText = await page.textContent('body');
  assert(memoryMaybeRows > 0, 'Memory Corridor should render Maybeboard replacement candidates.');
  assert(/Apple of Eden|Hemlock Vial|Distract the Guards|Mjölnir|Mortify/.test(memoryMaybeText ?? ''), 'Memory Corridor Maybeboard should include incoming batch-002 options.');
  await capture(page, '03-memory-corridor-maybeboard');

  await clickRail(page, 'Binders');
  await clickManagementItem(page, "Assassin's Ledger");
  await capture(page, '04-assassin-binder');
  const binderRows = await page.locator('.collection-table-row, .collection-grid-card, .collection-compact-row').count();
  assert(binderRows > 0, "Assassin's Ledger should render collection rows.");

  await clickRail(page, 'Lists');
  await clickManagementItem(page, 'Flagged');
  await capture(page, '05-flagged-review-list');
  const flaggedRows = await page.locator('.collection-table-row.needs-review, .collection-grid-card.needs-review, .collection-compact-row.needs-review').count();
  assert(flaggedRows > 0, 'Flagged list should render duplicate/off-color review rows.');

  await clickManagementItem(page, 'Recommendations');
  await capture(page, '06-recommendations-list-not-owned');
  const recommendationGhostRows = await page.locator('.collection-table-row.not-owned, .collection-grid-card.not-owned, .collection-compact-row.not-owned').count();
  assert(recommendationGhostRows > 0, 'Recommendations list should render not-owned rows.');

	  await openDecksWorkspace(page);
	  await openDashboard(page);
  await page.waitForFunction(() => document.body.innerText.includes('Analysis view') && document.body.innerText.includes('Advanced filters'), { timeout: 15000 });
  await page.getByRole('button', { name: /Advanced filters/ }).click({ timeout: 10000 });
  await page.waitForFunction(() => document.body.innerText.includes('Browse Dashboard'), { timeout: 10000 });
  await page.waitForFunction(() => {
    const match = document.body.innerText.match(/([0-9][0-9,]*) matching dashboard rows/);
    return Boolean(match && Number(match[1].replace(/,/g, '')) > 0);
  }, { timeout: 25000 });
  const dashboardText = await page.textContent('body');
  assert(dashboardText?.includes('Recommendations'), 'Dashboard advanced filters should include Recommendations.');
  assert(dashboardText?.includes('Ownership'), 'Dashboard advanced filters should include Ownership.');
  await capture(page, '07-dashboard-filters');

  await context.close();
} finally {
  await browser.close();
}

await writeFile(resolve(outDir, 'qa-results.json'), `${JSON.stringify(results, null, 2)}\n`, 'utf8');
const blocking = results.filter((result) => result.kind === 'pageerror');
	console.log(JSON.stringify({
	  screenshots: [
    '00-project-linked-content.png',
	    '01-hidden-blade-core-owned-only.png',
	    '02-memory-corridor-ghost-rows.png',
	    '03-memory-corridor-maybeboard.png',
	    '04-assassin-binder.png',
    '05-flagged-review-list.png',
	    '06-recommendations-list-not-owned.png',
    '07-dashboard-filters.png'
  ].map((file) => resolve(outDir, file)),
  events: results,
  blockingErrors: blocking
}, null, 2));
if (blocking.length) {
  process.exit(1);
}

async function clickRail(page, label) {
  await page.locator('.rail-button').filter({ hasText: label }).first().click({ timeout: 10000 });
  await page.locator('.entity-list-panel').filter({ hasText: label }).first().waitFor({ timeout: 10000 }).catch(() => {});
}

async function clickEntityRow(page, label) {
  await page.locator('.entity-row').filter({ hasText: label }).first().click({ timeout: 10000 });
}

async function clickDeckItem(page, label) {
  const row = page.locator('.management-workspace .entity-list .entity-row.clickable').filter({ hasText: label }).first();
  await row.scrollIntoViewIfNeeded({ timeout: 10000 });
  await row.click({ timeout: 10000 });
}

async function openDecksWorkspace(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clickRail(page, 'Decks');
    await page.locator('.management-workspace .entity-list').filter({ hasText: /Signs of Assassins/ }).first().waitFor({ timeout: 8000 }).catch(() => {});
    try {
      await clickDeckItem(page, /Signs of Assassins/);
      await page.locator('.deck-workspace').waitFor({ timeout: 10000 });
      return;
    } catch {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(500);
    }
  }
  await capture(page, 'debug-decks-navigation-failed');
  throw new Error('Could not return to the Signs of Assassins deck workspace.');
}

async function clickManagementItem(page, label) {
  const row = page.locator('.management-workspace .entity-list .entity-row.clickable').filter({ hasText: label }).first();
  await row.scrollIntoViewIfNeeded({ timeout: 10000 });
  await row.click({ timeout: 10000 });
  await page.locator('.collection-workspace h2').filter({ hasText: new RegExp(`^${escapeRegExp(label)}$`) }).first().waitFor({ timeout: 15000 });
}

async function selectVariant(page, value) {
  await page.locator('.deck-variant-toolbar select').selectOption(value);
  await page.waitForFunction((variantId) => {
    const select = document.querySelector('.deck-variant-toolbar select');
    return select?.value === variantId;
  }, value);
}

async function clickDeckViewMode(page, label) {
  await page.locator(`.deck-view-mode button[aria-label="${label} view"]`).first().click({ timeout: 10000 });
}

async function clickDeckSection(page, label) {
  await page.locator('.deck-board-tab').filter({ hasText: label }).first().click({ timeout: 10000 });
}

async function openDashboard(page) {
  await page.locator('.deck-workspace').waitFor({ timeout: 10000 });
  await page.locator('.deck-workspace .export-actions button').filter({ hasText: /^Dashboard$/ }).first().click({ timeout: 10000 });
  await page.waitForFunction(() => document.body.innerText.includes('Analysis view'), { timeout: 10000 }).catch(async () => {
    await capture(page, '05-dashboard-open-failed');
    throw new Error('Deck Dashboard action did not open Card Dashboard.');
  });
}

async function capture(page, name) {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: false });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
