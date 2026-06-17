import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const editorRoot = resolve(repoRoot, 'packages/editor');
const requireFromEditor = createRequire(resolve(editorRoot, 'package.json'));
const requireFromForge = createRequire(resolve(repoRoot, 'packages/forge/package.json'));

const phase = readArg('--phase') ?? 'manual';
const outDir = resolve(repoRoot, `output/playwright/forge-ui-phase-${phase}`);
const playwright = optionalRequire(requireFromForge, 'playwright');

if (!playwright) {
  console.error('Playwright is not installed; install workspace dependencies before running Forge UI visual QA.');
  process.exit(1);
}

const vite = await import(requireFromEditor.resolve('vite'));
const createServer = vite.createServer ?? vite.default?.createServer;

const server = await createServer({
  root: editorRoot,
  configFile: resolve(editorRoot, 'vite.config.ts'),
  server: { host: '127.0.0.1', port: 0 },
  clearScreen: false,
  logLevel: 'silent'
});

await mkdir(outDir, { recursive: true });
await server.listen();

const baseUrl = (server.resolvedUrls?.local ?? []).find((url) => url.startsWith('http://127.0.0.1:')) ?? server.resolvedUrls?.local?.[0];
if (!baseUrl) {
  await server.close();
  throw new Error('Vite did not expose a local URL.');
}
const results = [];
let browser = null;
let currentPage = null;
console.log(`[visual-qa] server ready ${baseUrl}`);

try {
  await captureWorkspace('light', { width: 1440, height: 900 }, [
    ['cards', null],
    ['decks', () => openDecksWithDeckSelected()]
  ]);
  await captureWorkspace('parchment', { width: 1440, height: 900 }, [
    ['decks', () => openDecksWithDeckSelected()]
  ]);
  await captureWorkspace('parchment-laptop', { width: 1280, height: 900 }, [
    ['decks', () => openDecksWithDeckSelected()]
  ]);
  await captureWorkspace('dark', { width: 1440, height: 900 }, [
    ['cards', null],
    ['decks', () => openDecksWithDeckSelected()],
    ['collections', () => clickRail('Collections')],
    ['dashboard', () => chooseFocusedLayout(/Card Dashboard/)],
    ['card-browser', () => chooseFocusedLayout(/Card Browser/)]
  ]);
  await captureWorkspace('dark-laptop', { width: 1024, height: 768 }, [
    ['cards', null],
    ['decks', () => openDecksWithDeckSelected()]
  ]);
  await captureWorkspace('dark-compact', { width: 900, height: 720 }, [
    ['cards', null]
  ]);
  await captureWorkspace('dark-mobile', { width: 390, height: 844 }, [
    ['cards', null],
    ['decks', () => openDecksWithDeckSelected()]
  ]);
  await captureOverlayStates('dark-overlays', { width: 1440, height: 900 });
  await captureShellOverlayStates('dark-shell', { width: 1440, height: 900 });
} finally {
  if (browser?.isConnected()) {
    await browser.close();
  }
  await server.close();
}

await writeFile(resolve(outDir, 'qa-results.json'), `${JSON.stringify(results, null, 2)}\n`);

const failures = results.filter((result) => result.error || result.textFailureCount || result.lightSurfaceCount || result.horizontalOverflow || result.clippedElementCount || result.deckLayoutFailureCount);
console.log(JSON.stringify(results.map(({ name, textFailureCount, lightSurfaceCount, horizontalOverflow, clippedElementCount, deckLayoutFailureCount, error }) => ({ name, textFailureCount, lightSurfaceCount, horizontalOverflow, clippedElementCount, deckLayoutFailureCount, error })), null, 2));
if (failures.length) process.exit(1);

async function captureWorkspace(theme, viewport, states) {
  const activeBrowser = await ensureBrowser();
  const context = await activeBrowser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript((selectedTheme) => {
    localStorage.setItem('homebrew-forge.theme', selectedTheme.startsWith('dark') ? 'dark' : selectedTheme);
    localStorage.setItem('homebrew-forge.orientation.dismissed', 'true');
    localStorage.setItem('homebrew-forge.firstRunOrientationDismissed', 'true');
  }, theme);
  const page = await context.newPage();
  await waitForApp(page);

  for (const [stateName, setup] of states) {
    try {
      await waitForApp(page);
      currentPage = page;
      if (setup) await setup();
      await page.waitForTimeout(450);
      console.log(`[visual-qa] capturing ${theme}-${stateName}`);
      await capture(page, `${theme}-${stateName}`, theme.startsWith('dark'));
    } catch (error) {
      results.push({ name: `${theme}-${stateName}`, error: String(error.message ?? error) });
    }
  }

  await context.close().catch(() => {});
}

async function ensureBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await playwright.chromium.launch({ headless: true });
    console.log('[visual-qa] browser ready');
  }
  return browser;
}

async function waitForApp(page) {
  console.log('[visual-qa] loading app');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => {
    const text = document.body?.innerText ?? '';
    return text.includes('Loaded 10 cards') || text.includes('10 cards') || text.includes('Demo Project');
  }, { timeout: 25000 });
  console.log('[visual-qa] app ready');
}

async function clickRail(label) {
  await currentPage.locator('.rail-button').filter({ hasText: label }).first().click({ timeout: 10000 });
}

async function openDecksWithDeckSelected() {
  await clickRail('Decks');
  const deckRows = currentPage.locator('.entity-list .entity-row.clickable');
  await deckRows.first().waitFor({ timeout: 15000 });
  const preferredDeck = deckRows.filter({ hasText: /Signs of Assassins|Squirrel Away|Demo Showcase Deck/ }).first();
  await preferredDeck.click({ timeout: 10000 });
  await currentPage.locator('.deck-workspace').waitFor({ timeout: 15000 });
  await currentPage.waitForFunction(() => {
    const text = (document.body?.innerText ?? '').toLowerCase();
    return text.includes('main board') && text.includes('save deck') && text.includes('deck summary');
  }, { timeout: 15000 });
}

async function chooseFocusedLayout(labelPattern) {
  await currentPage.locator('summary[role="menuitem"]').filter({ hasText: /^View$/ }).first().click({ timeout: 10000 });
  await currentPage.waitForTimeout(150);
  await currentPage.locator('.menu-popover button').filter({ hasText: /Focused Layouts/ }).first().hover({ timeout: 10000 });
  await currentPage.waitForTimeout(150);
  await currentPage.locator('.menu-submenu-popover button, .menu-popover button').filter({ hasText: labelPattern }).first().click({ timeout: 10000 });
}

async function captureOverlayStates(theme, viewport) {
  const activeBrowser = await ensureBrowser();
  const context = await activeBrowser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript((selectedTheme) => {
    localStorage.setItem('homebrew-forge.theme', selectedTheme.startsWith('dark') ? 'dark' : selectedTheme);
    localStorage.setItem('homebrew-forge.orientation.dismissed', 'true');
    localStorage.setItem('homebrew-forge.firstRunOrientationDismissed', 'true');
  }, theme);
  const page = await context.newPage();
  currentPage = page;

  try {
    await waitForApp(page);
    await page.locator('button[title="New card"], button[aria-label="New card"]').first().click({ timeout: 10000 });
    await page.getByRole('dialog', { name: /New Card/ }).waitFor({ timeout: 10000 });
    console.log(`[visual-qa] capturing ${theme}-create-card`);
    await capture(page, `${theme}-create-card`, true);
    await closeActiveDialog(page);

    await openFileMenuItem(/Import/);
    await page.getByRole('dialog', { name: /Import/ }).waitFor({ timeout: 10000 });
    console.log(`[visual-qa] capturing ${theme}-import`);
    await capture(page, `${theme}-import`, true);
    await closeActiveDialog(page);

    await openFileMenuItem(/Export/);
    await page.getByRole('dialog', { name: /Export/ }).waitFor({ timeout: 10000 });
    console.log(`[visual-qa] capturing ${theme}-export`);
    await capture(page, `${theme}-export`, true);
    await closeActiveDialog(page);
  } catch (error) {
    results.push({ name: `${theme}-overlays`, error: String(error.message ?? error) });
  } finally {
    await context.close().catch(() => {});
    currentPage = null;
  }
}

async function captureShellOverlayStates(theme, viewport) {
  const activeBrowser = await ensureBrowser();
  const context = await activeBrowser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript((selectedTheme) => {
    localStorage.setItem('homebrew-forge.theme', selectedTheme.startsWith('dark') ? 'dark' : selectedTheme);
    localStorage.setItem('homebrew-forge.orientation.dismissed', 'true');
    localStorage.setItem('homebrew-forge.firstRunOrientationDismissed', 'true');
  }, theme);
  const page = await context.newPage();
  currentPage = page;

  try {
    await waitForApp(page);
    await page.getByRole('button', { name: /Open command palette/ }).first().click({ timeout: 10000 });
    await page.getByRole('dialog', { name: /Command Palette/ }).waitFor({ timeout: 10000 });
    console.log(`[visual-qa] capturing ${theme}-command-palette`);
    await capture(page, `${theme}-command-palette`, true);
    await closeActiveDialog(page);

    await page.getByRole('button', { name: /^Health$/ }).first().click({ timeout: 10000 });
    await page.getByRole('dialog', { name: /Workspace Health/ }).waitFor({ timeout: 10000 });
    console.log(`[visual-qa] capturing ${theme}-workspace-health`);
    await capture(page, `${theme}-workspace-health`, true);
    await closeActiveDialog(page);
  } catch (error) {
    results.push({ name: `${theme}-shell-overlays`, error: String(error.message ?? error) });
  } finally {
    await context.close().catch(() => {});
    currentPage = null;
  }
}

async function openFileMenuItem(labelPattern) {
  await currentPage.locator('summary[role="menuitem"]').filter({ hasText: /^File$/ }).first().click({ timeout: 10000 });
  await currentPage.waitForTimeout(150);
  await currentPage.locator('.menu-popover button').filter({ hasText: labelPattern }).first().click({ timeout: 10000 });
}

async function closeActiveDialog(page) {
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
  await page.waitForTimeout(200);
}

async function capture(page, name, isDark) {
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, timeout: 90000 });
  const scan = await page.evaluate(scanVisibleContrast, isDark);
  results.push({ name, file, ...scan });
}

function scanVisibleContrast(isDark) {
  function parseRgb(value) {
    if (!value || value === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return { r: 0, g: 0, b: 0, a: 0 };
    const parts = match[1].split(',').map((part) => part.trim());
    return { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]), a: parts.length > 3 ? Number(parts[3]) : 1 };
  }
  function blend(top, bottom) {
    const a = top.a + bottom.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (top.r * top.a + bottom.r * bottom.a * (1 - top.a)) / a,
      g: (top.g * top.a + bottom.g * bottom.a * (1 - top.a)) / a,
      b: (top.b * top.a + bottom.b * bottom.a * (1 - top.a)) / a,
      a
    };
  }
  function rel(channel) {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }
  function luminance(color) {
    return 0.2126 * rel(color.r) + 0.7152 * rel(color.g) + 0.0722 * rel(color.b);
  }
  function contrast(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function visible(element) {
    if (element.closest('.sr-only')) return false;
    if (element.matches('.linked-textarea-input')) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    if (style.clip === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  }
  function effectiveBackground(element) {
    let background = isDark ? { r: 16, g: 20, b: 28, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
    const chain = [];
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) chain.push(node);
    for (const node of chain.reverse()) {
      const color = parseRgb(getComputedStyle(node).backgroundColor);
      if (color.a > 0) background = blend(color, background);
    }
    return background;
  }

  const textFailures = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      const element = node.parentElement;
      if (!element || !visible(element)) return NodeFilter.FILTER_REJECT;
      if (element.closest('svg, canvas, img, .render-frame, .card-browser-compare-image')) return NodeFilter.FILTER_REJECT;
      if (Number.parseFloat(getComputedStyle(element).fontSize) < 9) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const seen = new Set();
  while (walker.nextNode()) {
    const element = walker.currentNode.parentElement;
    if (!element || seen.has(element)) continue;
    seen.add(element);
    const style = getComputedStyle(element);
    const ratio = contrast(parseRgb(style.color), effectiveBackground(element));
    const fontSize = Number.parseFloat(style.fontSize);
    const weight = Number.parseFloat(style.fontWeight) || 400;
    const threshold = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700) ? 3 : 4.5;
    if (ratio + 0.01 < threshold) {
      textFailures.push({
        text: (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
        ratio: Number(ratio.toFixed(2)),
        threshold,
        selector: element.className ? `.${String(element.className).split(/\s+/).filter(Boolean).join('.')}` : element.tagName.toLowerCase()
      });
    }
  }

  const lightSurfaces = [];
  if (isDark) {
    for (const element of document.querySelectorAll('body *')) {
      if (!visible(element) || element.closest('.render-frame')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width * rect.height < 1800) continue;
      const background = parseRgb(getComputedStyle(element).backgroundColor);
      if (background.a < 0.85) continue;
      const surfaceLuminance = luminance(background);
      if (surfaceLuminance > 0.82) {
        lightSurfaces.push({
          selector: element.className ? `.${String(element.className).split(/\s+/).filter(Boolean).join('.')}` : element.tagName.toLowerCase(),
          luminance: Number(surfaceLuminance.toFixed(2))
        });
      }
    }
  }

  const clippedElements = [];
  for (const selector of ['.work-mode-switcher', '.toolbar-project-switcher', '.preview-column', '.context-panel', '.inspector', '.workspace-inspector-panel']) {
    for (const element of document.querySelectorAll(selector)) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < -1 || rect.right > window.innerWidth + 1) {
        clippedElements.push({
          selector,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        });
      }
    }
  }

  const deckLayoutFailures = [];
  const deckWorkspace = document.querySelector('.deck-workspace');
  if (deckWorkspace && visible(deckWorkspace)) {
    for (const selector of ['.deck-live-stats-panel', '.deck-view-toolbar', '.deck-workspace .list-controls-bar', '.deck-view-mode']) {
      for (const element of document.querySelectorAll(selector)) {
        if (!visible(element)) continue;
        if (element.scrollWidth > element.clientWidth + 2) {
          deckLayoutFailures.push({
            selector,
            issue: 'internal horizontal overflow',
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth
          });
        }
      }
    }

    const toolbar = document.querySelector('.deck-view-toolbar');
    const viewMode = document.querySelector('.deck-view-toolbar .list-controls-view');
    if (toolbar && viewMode && visible(toolbar) && visible(viewMode) && window.innerWidth > 760) {
      const toolbarRect = toolbar.getBoundingClientRect();
      const viewRect = viewMode.getBoundingClientRect();
      if (toolbarRect.right - viewRect.right > 24) {
        deckLayoutFailures.push({
          selector: '.deck-view-toolbar .list-controls-view',
          issue: 'view selector is not anchored to the right edge',
          toolbarRight: Math.round(toolbarRect.right),
          viewRight: Math.round(viewRect.right)
        });
      }
      if (viewRect.height > 58) {
        deckLayoutFailures.push({
          selector: '.deck-view-mode',
          issue: 'view selector wrapped into multiple rows',
          height: Math.round(viewRect.height)
        });
      }
    }
  }

  return {
    textFailureCount: textFailures.length,
    textFailures: textFailures.slice(0, 30),
    lightSurfaceCount: lightSurfaces.length,
    lightSurfaces: lightSurfaces.slice(0, 20),
    clippedElementCount: clippedElements.length,
    clippedElements: clippedElements.slice(0, 20),
    deckLayoutFailureCount: deckLayoutFailures.length,
    deckLayoutFailures: deckLayoutFailures.slice(0, 20),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  };
}

function optionalRequire(requireFrom, id) {
  try {
    return requireFrom(id);
  } catch {
    return null;
  }
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}
