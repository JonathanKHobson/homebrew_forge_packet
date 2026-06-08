import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const editorRoot = resolve(repoRoot, 'packages/editor');
const requireFromEditor = createRequire(resolve(editorRoot, 'package.json'));
const requireFromForge = createRequire(resolve(repoRoot, 'packages/forge/package.json'));

test('UX quality gate smoke covers Maker orientation, responsive layout, tabs, and transfer dialogs', async (t) => {
  const playwright = optionalRequire(requireFromForge, 'playwright');
  if (!playwright) {
    t.skip('Playwright is not installed; install workspace dependencies to run the UX quality gate smoke.');
    return;
  }

  const vite = await import(requireFromEditor.resolve('vite'));
  const createServer = vite.createServer ?? vite.default?.createServer;
  assert.equal(typeof createServer, 'function', 'Vite createServer must be available');

  const server = await createServer({
    root: editorRoot,
    configFile: resolve(editorRoot, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port: 0
    },
    clearScreen: false,
    logLevel: 'silent'
  });

  await server.listen();
  const urls = server.resolvedUrls?.local ?? [];
  const baseUrl = urls.find((url) => url.startsWith('http://127.0.0.1:')) ?? urls[0];
  assert.ok(baseUrl, 'Vite must expose a local URL');

  const browser = await playwright.chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await server.close();
  });

  await verifyFirstRunMakerOnboarding(browser, baseUrl);
  await verifyDemoOnlyMakerOnboarding(browser, baseUrl);
  await verifyZeroCardOnboarding(browser, baseUrl);
  await verifyNarrowMakerLayout(browser, baseUrl);
  await verifyInspectorTabs(browser, baseUrl);
  await verifyLinkedTextAreaThemeContrast(browser, baseUrl);
  await verifyCollectionFamilyAndDeckThemeSurfaces(browser, baseUrl);
  await verifyTransferDialogHierarchy(browser, baseUrl);
  await verifyPreviewAndToolsMenus(browser, baseUrl);
});

async function verifyFirstRunMakerOnboarding(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
  await context.addInitScript((key) => localStorage.removeItem(key), 'homebrew-forge.firstRunOrientationDismissed');
  const page = await context.newPage();
  await loadDemo(page, baseUrl);

  const state = await readUxState(page);
  assert.equal(state.onboardingWorkbench, false, 'first run with real authored cards should keep the Maker editor visible');
  assert.equal(state.onboardingStage, false, 'first run with real authored cards should not show onboarding');
  assert.equal(state.firstRunStrip, false, 'first run with cards should never show a compact onboarding strip');
  assert.equal(state.leftPanel, true, 'Maker list should stay visible');
  assert.equal(state.rightPanel, true, 'Card inspector should stay visible');
  assert.equal(state.cardTabs, true, 'Card tabs should stay visible');
  assert.equal(state.orientationCount, 0, 'populated editor should not render orientation DOM');
  assert.equal(state.documentOverflowX, false, 'populated Maker editor should not create horizontal overflow');

  await context.close();
}

async function verifyZeroCardOnboarding(browser, baseUrl) {
  const library = await fetchJson(`${baseUrl}api/library`);
  const project = await fetchJson(`${baseUrl}api/project?set=DEMO`);
  const emptyLibrary = {
    ...library,
    selectedUniverseId: 'demo',
    selectedSetCode: 'DEMO',
    sets: library.sets.map((set) => ({ ...set, cardCount: 0 }))
  };
  const emptyProject = { ...project, cards: [], drafts: [] };
  const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
  await context.addInitScript((key) => localStorage.removeItem(key), 'homebrew-forge.firstRunOrientationDismissed');
  await context.route('**/api/library', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyLibrary)
    });
  });
  await context.route('**/api/project?set=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyProject)
    });
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.maker-onboarding-stage').waitFor({ state: 'visible', timeout: 15000 });

  const state = await readUxState(page);
  assert.equal(state.onboardingWorkbench, true, 'first-run zero-card state should show onboarding');
  assert.equal(state.leftPanel, false, 'zero-card onboarding should hide the Maker list');
  assert.equal(state.rightPanel, false, 'zero-card onboarding should hide the Card inspector');
  assert.equal(state.railVisible, false, 'zero-card onboarding should hide the side rail');
  assert.equal(state.cardCountContext, 'Cards 0 cards', 'zero-card onboarding should show zero authored cards');
  assert.deepEqual(state.visibleButtons, ['Create Card', 'Import', 'Dismiss']);
  assert.equal(state.documentOverflowX, false, 'zero-card onboarding should not create horizontal overflow');

  await context.close();
}

async function verifyDemoOnlyMakerOnboarding(browser, baseUrl) {
  const library = await fetchJson(`${baseUrl}api/library`);
  const project = await fetchJson(`${baseUrl}api/project?set=DEMO`);
  const demoOnlyLibrary = {
    ...library,
    selectedUniverseId: 'demo',
    selectedSetCode: 'DEMO',
    sets: library.sets.map((set) => ({
      ...set,
      cardCount: set.setCode === 'DEMO' ? project.cards.length : 0
    }))
  };
  const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
  await context.addInitScript((key) => localStorage.removeItem(key), 'homebrew-forge.firstRunOrientationDismissed');
  await context.route('**/api/library', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoOnlyLibrary)
    });
  });
  await context.route('**/api/project?set=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(project)
    });
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('.maker-onboarding-stage').waitFor({ state: 'visible', timeout: 15000 });

  const state = await readUxState(page);
  assert.equal(state.onboardingWorkbench, true, 'first-run demo-only content should still show onboarding');
  assert.equal(state.firstRunStrip, false, 'demo-only onboarding should never use the compact strip');
  assert.equal(state.leftPanel, false, 'demo-only onboarding should hide the Maker list');
  assert.equal(state.rightPanel, false, 'demo-only onboarding should hide the Card inspector');
  assert.equal(state.railVisible, false, 'demo-only onboarding should hide the side rail');
  assert.equal(state.cardCountContext, 'Cards 0 cards', 'demo-only onboarding should not count sample cards as authored cards');
  assert.equal(state.documentOverflowX, false, 'demo-only onboarding should not create horizontal overflow');

  await context.close();
}

async function verifyNarrowMakerLayout(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((key) => localStorage.setItem(key, 'true'), 'homebrew-forge.firstRunOrientationDismissed');
  const page = await context.newPage();
  await loadDemo(page, baseUrl);

  const state = await readUxState(page);
  assert.equal(state.onboardingWorkbench, false, 'dismissed first-run state should show normal Maker editor at narrow width');
  assert.equal(state.documentOverflowX, false, 'narrow Maker layout should not overflow horizontally');
  assert.equal(state.cardSwitcher, true, 'narrow Maker layout should show panel switcher');
  assert.equal(state.activeNarrowPanels, 1, 'narrow Maker layout should show one active panel at a time');
  assert.equal(state.railVisible, true, 'narrow Maker layout should keep rail destinations reachable');
  assert.ok(state.railLabels.includes('Gallery'), 'narrow rail should include Gallery');
  assert.ok(state.railLabels.includes('References'), 'narrow rail should include References');

  await context.close();
}

async function verifyInspectorTabs(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
  await context.addInitScript((key) => localStorage.setItem(key, 'true'), 'homebrew-forge.firstRunOrientationDismissed');
  const page = await context.newPage();
  await loadDemo(page, baseUrl);
  await page.locator('.card-tabs button').first().click();

  const panelSwitcher = page.getByRole('tablist', { name: 'Maker workspace panels' });
  if (await panelSwitcher.isVisible()) {
    await page.getByRole('tab', { name: 'Inspector' }).click();
  }
  const showInspectorPanel = page.getByRole('button', { name: 'Show inspector panel' });
  if (await showInspectorPanel.isVisible()) {
    await showInspectorPanel.click();
  }
  await page.locator('#maker-inspector-panel').waitFor({ state: 'attached', timeout: 15000 });

  const tabs = page.locator('.inspector-tabs [role="tab"]');
  await expectCount(tabs, 4, 'inspector should expose four tab roles');
  await page.getByRole('tab', { name: 'card' }).focus();
  await page.keyboard.press('ArrowRight');
  await expectSelectedTab(page, 'frame');
  await page.keyboard.press('End');
  await expectSelectedTab(page, 'preview');
  await page.keyboard.press('Home');
  await expectSelectedTab(page, 'card');

  await context.close();
}

async function verifyLinkedTextAreaThemeContrast(browser, baseUrl) {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
    await context.addInitScript(
      ([themeKey, themeValue, firstRunKey]) => {
        localStorage.setItem(themeKey, themeValue);
        localStorage.setItem(firstRunKey, 'true');
      },
      ['homebrew-forge.theme', theme, 'homebrew-forge.firstRunOrientationDismissed']
    );
    const page = await context.newPage();
    await loadDemo(page, baseUrl);

    for (const label of ['Rules text', 'Flavor text']) {
      const field = page.locator(`textarea[aria-label="${label}"]`);
      await field.waitFor({ state: 'attached', timeout: 15000 });
      await field.click();
      const state = await readLinkedTextAreaState(page, label);
      assert.ok(state.value.length > 0, `${theme} ${label} should keep its text value after focus`);
      assert.equal(state.linkedFocus, true, `${theme} ${label} should report focus on the linked textarea`);
      assert.equal(alphaForCssColor(state.inputColor), 0, `${theme} ${label} native textarea text should stay transparent`);
      assert.equal(alphaForCssColor(state.inputTextFillColor), 0, `${theme} ${label} native textarea fill should stay transparent`);
      assert.equal(alphaForCssColor(state.inputBackground), 0, `${theme} ${label} native textarea background should not cover the mirror text`);
      assert.ok(contrastRatio(state.mirrorColor, state.mirrorBackground) >= 4.5, `${theme} ${label} mirror text should meet contrast`);
    }

    await context.close();
  }
}

async function verifyTransferDialogHierarchy(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
  await context.addInitScript((key) => localStorage.setItem(key, 'true'), 'homebrew-forge.firstRunOrientationDismissed');
  const page = await context.newPage();
  await loadDemo(page, baseUrl);

  await openMenuAction(page, 'File', 'Import');
  await verifyTransferDialog(page, 'Import');
  await page.locator('.create-overlay-actions .secondary-button').click();

  await openMenuAction(page, 'File', 'Export');
  await verifyTransferDialog(page, 'Export');
  await page.locator('.create-overlay-actions .secondary-button').click();

  await context.close();
}

async function verifyCollectionFamilyAndDeckThemeSurfaces(browser, baseUrl) {
  for (const theme of ['light', 'dark', 'parchment']) {
    const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
    await context.addInitScript(
      ([themeKey, themeValue, firstRunKey]) => {
        localStorage.setItem(themeKey, themeValue);
        localStorage.setItem(firstRunKey, 'true');
      },
      ['homebrew-forge.theme', theme, 'homebrew-forge.firstRunOrientationDismissed']
    );
    const page = await context.newPage();
    await loadDemo(page, baseUrl);

    for (const sectionName of ['Collections', 'Binders', 'Lists']) {
      await openRailSection(page, sectionName);
      const workspace = page.locator('.collection-workspace');
      await workspace.waitFor({ state: 'visible', timeout: 15000 });
      assert.equal(await page.locator('.collection-workspace .visual-management-header').getByRole('button', { name: /Add to set|CSV|Text|\.cod/ }).count(), 0, `${sectionName} should not duplicate import/export actions in the workspace header`);
      await expectCount(page.locator('.collection-workspace .segmented-icon-control button'), 4, `${sectionName} should expose four compact view buttons`);
      const metricTexts = await page.locator('.collection-workspace .workspace-metric').evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
      assert.equal(metricTexts.some((text) => /No source/i.test(text)), false, `${sectionName} metrics should hide no-source cards`);
      assert.equal(metricTexts.some((text) => /^0\s*(Starred|Flagged|Delete Queue)/i.test(text.trim())), false, `${sectionName} metrics should hide zero marker cards`);

      await assertThemeSurfaceContrast(page, theme, `${sectionName} table`, [
        '.collection-workspace .collection-table-toolbar',
        '.collection-workspace .collection-selection-toolbar',
        '.collection-workspace .collection-stat.workspace-metric',
        '.collection-workspace .segmented-icon-control',
        '.collection-workspace .collection-table-row.header',
        '.collection-workspace .collection-table-row:not(.header)'
      ]);

      await page.getByRole('button', { name: 'Grid view' }).click();
      await assertThemeSurfaceContrast(page, theme, `${sectionName} grid`, ['.collection-workspace .collection-grid-card']);
      await page.getByRole('button', { name: 'List view' }).click();
      await assertThemeSurfaceContrast(page, theme, `${sectionName} list`, ['.collection-workspace .collection-compact-row']);
      await page.getByRole('button', { name: 'Single card view' }).click();
      await assertThemeSurfaceContrast(page, theme, `${sectionName} single`, ['.collection-workspace .collection-single-card', '.collection-workspace .collection-single-metadata div']);
      assert.equal(await hasHorizontalOverflow(page), false, `${sectionName} should not create horizontal overflow in ${theme}`);
    }

    await openRailSection(page, 'Decks');
    await page.locator('.deck-workspace').waitFor({ state: 'visible', timeout: 15000 });
    assert.equal(await page.locator('.deck-workspace .visual-management-header').getByRole('button', { name: /Export text|Export \.cod/ }).count(), 0, 'Decks should not duplicate export actions in the workspace header');
    await expectCount(page.locator('.deck-workspace .segmented-icon-control button'), 7, 'Decks should expose seven compact view buttons');
    await assertThemeSurfaceContrast(page, theme, 'Decks summary', [
      '.deck-workspace .collection-stat.workspace-metric',
      '.deck-workspace .deck-role-summary span',
      '.deck-workspace .deck-role-summary strong',
      '.deck-workspace .deck-board-tab',
      '.deck-workspace .deck-board-tab strong',
      '.deck-workspace .segmented-icon-control'
    ]);
    assert.equal(await hasHorizontalOverflow(page), false, `Decks should not create horizontal overflow in ${theme}`);

    await context.close();
  }
}

async function openRailSection(page, sectionName) {
  await page.getByRole('button', { name: sectionName, exact: true }).click();
}

async function verifyPreviewAndToolsMenus(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1292, height: 768 } });
  await context.addInitScript((key) => localStorage.setItem(key, 'true'), 'homebrew-forge.firstRunOrientationDismissed');
  const page = await context.newPage();
  await loadDemo(page, baseUrl);
  await waitForExpandedPreviewReady(page);

  await expectCount(page.getByRole('button', { name: 'Zoom tool' }), 1, 'toolbar should expose the zoom tool');
  await expectCount(page.getByRole('button', { name: 'Artwork tool' }), 1, 'toolbar should expose the artwork tool');
  await expectCount(page.getByRole('button', { name: 'Text tool' }), 1, 'toolbar should expose the text tool');
  await expectCount(page.getByRole('button', { name: 'Layout tool' }), 1, 'toolbar should expose the layout tool');
  await page.getByRole('button', { name: 'Text tool' }).click();
  await page.getByLabel('Edit card name on preview').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Layout tool' }).click();
  await expectCount(page.getByRole('button', { name: 'Adjust rules top padding' }), 1, 'layout tool should expose rules padding handles');
  await page.getByRole('button', { name: 'Artwork tool' }).click();
  await page.locator('.art-edit-hotspot').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: 'Zoom tool' }).click();
  await page.locator('.render-frame > img').first().click();
  await page.getByRole('dialog', { name: /expanded preview/i }).waitFor({ state: 'visible', timeout: 15000 });
  await expectCount(page.getByRole('button', { name: 'Next card preview' }), 1, 'expanded preview should expose next-card navigation');
  await expectCount(page.getByRole('button', { name: 'Previous card preview' }), 1, 'expanded preview should expose previous-card navigation');
  const clickPicker = page.locator('.image-lightbox-card-picker select');
  const firstCardId = await clickPicker.inputValue();
  await page.getByRole('button', { name: 'Next card preview' }).click();
  await page.waitForFunction((cardId) => document.querySelector('.image-lightbox-card-picker select')?.value !== cardId, firstCardId);
  await page.getByRole('button', { name: 'Close image preview' }).click();

  let menuPanel = await openMenu(page, 'View');
  await menuPanel.getByRole('button', { name: /Preview Mode/ }).hover();
  await expectCount(page.getByRole('menuitem', { name: 'Expanded Preview' }), 1, 'View > Preview Mode should include Expanded Preview');
  await page.getByRole('menuitem', { name: 'Expanded Preview' }).click();
  await page.getByRole('dialog', { name: /expanded preview/i }).waitFor({ state: 'visible', timeout: 15000 });

  const picker = page.locator('.image-lightbox-card-picker select');
  await expectCount(picker, 1, 'expanded preview should include a card picker');
  const optionCount = await picker.locator('option').count();
  assert.ok(optionCount > 1, 'expanded preview picker should list available cards');
  const secondCardId = await picker.locator('option').nth(1).getAttribute('value');
  assert.ok(secondCardId, 'expanded preview picker option should expose a card id');
  await picker.selectOption(secondCardId);
  await page.waitForFunction((cardId) => document.querySelector('.image-lightbox-card-picker select')?.value === cardId, secondCardId);
  await page.getByRole('button', { name: 'Close image preview' }).click();

  menuPanel = await openMenu(page, 'View');
  await menuPanel.getByRole('button', { name: /Focused Layouts/ }).hover();
  await expectCount(page.getByRole('menuitem', { name: 'Card Only Preview' }), 1, 'View > Focused Layouts should include Card Only Preview');

  menuPanel = await openMenu(page, 'Tools');
  await menuPanel.getByRole('button', { name: /Card Tools/ }).hover();
  await expectCount(page.getByRole('menuitemradio', { name: 'Text' }), 1, 'Tools > Card Tools should expose text mode');
  await expectCount(page.getByRole('menuitemradio', { name: 'Layout' }), 1, 'Tools > Card Tools should expose layout mode');
  await expectCount(menuPanel.getByRole('menuitem', { name: 'Guides' }), 1, 'Tools should expose guides');
  await expectCount(menuPanel.getByRole('menuitem', { name: 'Safe area' }), 1, 'Tools should expose safe area');
  await menuPanel.getByRole('menuitem', { name: 'Guides' }).click();
  await page.waitForFunction(() => document.querySelector('.card-canvas.show-guides') !== null);

  menuPanel = await openMenu(page, 'Tools');
  await expectCount(menuPanel.getByRole('menuitem', { name: 'Card grid' }), 1, 'Tools should expose the card grid');
  await menuPanel.getByRole('button', { name: /Zoom/ }).hover();
  await expectCount(page.getByRole('menuitem', { name: '125%' }), 1, 'Tools > Zoom should expose zoom presets');

  await context.close();
}

async function verifyTransferDialog(page, title) {
  await page.getByRole('heading', { name: title, exact: true }).waitFor({ state: 'visible', timeout: 15000 });
  await expectCount(page.locator('.transfer-scope-label'), 1, `${title} dialog should label transfer scope`);
  await expectCount(page.locator('.transfer-entity-nav button'), 7, `${title} dialog should show transfer-scope choices`);
  await expectCount(page.locator('.create-overlay-footer .primary-button'), 0, `${title} dialog footer should not add competing primary actions`);
  await expectCount(page.locator('.create-overlay-footer .secondary-button'), 1, `${title} dialog should have one footer Close action`);
}

async function openMenuAction(page, menuName, actionName) {
  const menuPanel = await openMenu(page, menuName);
  const menuItem = menuPanel.getByRole('menuitem', { name: actionName });
  await expectCount(menuItem, 1, `${actionName} menu item should be unique`);
  await menuItem.click();
}

async function openMenu(page, menuName) {
  await page.keyboard.press('Escape');
  const menuButton = page.getByRole('menuitem', { name: menuName });
  await expectCount(menuButton, 1, `${menuName} menu button should be unique`);
  await menuButton.hover();
  await menuButton.click();
  const menuPanel = page.locator(`[data-menu-panel="${menuName.toLowerCase()}"]`);
  await menuPanel.waitFor({ state: 'visible', timeout: 5000 });
  await menuPanel.hover();
  return menuPanel;
}

async function waitForExpandedPreviewReady(page) {
  await page.waitForFunction(() => Array.from(document.querySelectorAll('button[aria-label="Open larger preview"]')).some((button) => !button.disabled));
}

async function loadDemo(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('.card-tabs') && document.querySelector('.card-tab:not(.new-tab)'), undefined, { timeout: 15000 });
}

async function readUxState(page) {
  return page.evaluate(() => {
    const isVisible = (node) => Boolean(node && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden');
    const cardCountNode = document.querySelector('.maker-orientation-context span:nth-child(3)');
    const cardCountLabel = cardCountNode?.querySelector('strong')?.textContent?.trim() ?? '';
    const cardCountValue = Array.from(cardCountNode?.childNodes ?? [])
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    return {
      onboardingWorkbench: document.querySelector('.maker-onboarding-workbench') !== null,
      onboardingStage: document.querySelector('.maker-onboarding-stage') !== null,
      firstRunStrip: document.querySelector('.maker-firstrun-strip') !== null,
      leftPanel: document.querySelector('#maker-list-panel') !== null,
      rightPanel: document.querySelector('#maker-inspector-panel') !== null,
      collapsedLeft: document.querySelector('.collapsed-panel-strip.left') !== null,
      collapsedRight: document.querySelector('.collapsed-panel-strip.right') !== null,
      cardSwitcher: isVisible(document.querySelector('.card-panel-switcher')),
      cardTabs: document.querySelector('.card-tabs') !== null,
      railVisible: document.querySelector('.side-rail') !== null,
      railLabels: Array.from(document.querySelectorAll('.side-rail span')).map((node) => node.textContent?.trim()).filter(Boolean),
      activeNarrowPanels: document.querySelectorAll('.narrow-card-panel.narrow-active').length,
      orientationCount: document.querySelectorAll('.maker-orientation').length,
      cardCountContext: [cardCountLabel, cardCountValue].filter(Boolean).join(' '),
      visibleButtons: Array.from(document.querySelectorAll('.maker-orientation button')).map((button) => button.textContent?.trim()),
      documentOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
}

async function readLinkedTextAreaState(page, label) {
  return page.evaluate((labelText) => {
    const area = document.querySelector(`textarea[aria-label="${labelText}"]`);
    const linked = area?.closest('.linked-textarea');
    const mirror = linked?.querySelector('.linked-textarea-highlight');
    const inputStyle = area ? getComputedStyle(area) : null;
    const mirrorStyle = mirror ? getComputedStyle(mirror) : null;
    return {
      value: area?.value ?? '',
      linkedFocus: linked?.matches(':focus-within') ?? false,
      inputColor: inputStyle?.color ?? '',
      inputTextFillColor: inputStyle?.webkitTextFillColor ?? '',
      inputBackground: inputStyle?.backgroundColor ?? '',
      mirrorColor: mirrorStyle?.color ?? '',
      mirrorBackground: mirrorStyle?.backgroundColor ?? ''
    };
  }, label);
}

async function expectSelectedTab(page, name) {
  const selected = await page.getByRole('tab', { name }).getAttribute('aria-selected');
  assert.equal(selected, 'true', `${name} tab should be selected`);
}

async function expectCount(locator, expected, message) {
  assert.equal(await locator.count(), expected, message);
}

async function assertThemeSurfaceContrast(page, theme, label, selectors) {
  const samples = await page.evaluate((targetSelectors) => {
    function alphaFor(value) {
      const match = value.match(/^rgba?\(([^)]+)\)$/);
      if (!match) {
        return 1;
      }
      const parts = match[1].split(',').map((part) => part.trim());
      return parts[3] === undefined ? 1 : Number(parts[3]);
    }

    function effectiveBackground(element) {
      let node = element;
      while (node) {
        const background = getComputedStyle(node).backgroundColor;
        if (background && alphaFor(background) > 0) {
          return background;
        }
        node = node.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    }

    return targetSelectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).slice(0, 3).map((element, index) => {
        const textElement = element.matches('strong, span, button, input, select, textarea')
          ? element
          : element.querySelector('strong, span, button, input, select, textarea') ?? element;
        const textStyle = getComputedStyle(textElement);
        return {
          selector,
          index,
          color: textStyle.color,
          background: effectiveBackground(element),
          text: textElement.textContent?.trim() ?? ''
        };
      })
    );
  }, selectors);

  assert.ok(samples.length > 0, `${label} should expose visible surfaces to inspect`);
  for (const sample of samples) {
    const ratio = contrastRatio(sample.color, sample.background);
    assert.ok(ratio >= 4.5, `${theme} ${label} ${sample.selector}[${sample.index}] contrast should be >= 4.5, got ${ratio.toFixed(2)} (${sample.color} on ${sample.background})`);
    if (theme === 'dark') {
      assert.ok(relativeLuminance(parseCssColor(sample.background)) < 0.4, `dark ${label} ${sample.selector}[${sample.index}] should not render as a light surface (${sample.background})`);
    }
  }
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
}

function alphaForCssColor(value) {
  return parseCssColor(value).alpha;
}

function contrastRatio(foreground, background) {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue);
}

function parseCssColor(value) {
  const match = value.match(/^rgba?\(([^)]+)\)$/);
  if (match) {
    const [red, green, blue, alpha = '1'] = match[1].split(',').map((part) => part.trim());
    return {
      red: Number(red),
      green: Number(green),
      blue: Number(blue),
      alpha: Number(alpha)
    };
  }
  const srgbMatch = value.match(/^color\(srgb\s+([^)]+)\)$/);
  assert.ok(srgbMatch, `Expected rgb/rgba/color(srgb) color, got "${value}"`);
  const srgbParts = srgbMatch[1].split('/').map((part) => part.trim());
  const [red, green, blue] = srgbParts[0].split(/\s+/).map((part) => Number(part) * 255);
  const alpha = srgbParts[1] === undefined ? 1 : Number(srgbParts[1]);
  return {
    red,
    green,
    blue,
    alpha
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true, `Fetch failed: ${url}`);
  return response.json();
}

function optionalRequire(requireFrom, specifier) {
  try {
    return requireFrom(specifier);
  } catch {
    return null;
  }
}
