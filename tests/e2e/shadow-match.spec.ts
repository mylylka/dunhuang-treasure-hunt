import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ProgressData, ShadowMatchLevel } from '../../src/types';
import type { ShadowMatchLayout } from '../../src/games/shadow-match/types';
import { compactPlayableViewport, isMobileProject, mobileLandscapeViewport, mobilePortraitViewport } from './supported-viewports';

const level = JSON.parse(readFileSync('src/content/levels/music-apsara-shadow.json', 'utf8')) as ShadowMatchLevel;
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as { id: string; path: string; width: number; height: number }[];
const progressKey = 'dunhuang:progress:v1';
const playUrl = `/#/play/${level.id}`;
const imageLoadTimeout = 45_000;
const letters = ['A', 'B', 'C', 'D'];
test.setTimeout(60_000);

const screen = (page: Page) => page.getByTestId('shadow-match-screen');
const host = (page: Page) => page.getByTestId('phaser-player');
const option = (page: Page, label: string) => page.locator(`[data-testid="shadow-match-option"][data-option-label="${label}"]`);
const compareButton = (page: Page) => page.getByRole('button', { name: '放大对照', exact: true });
const inspector = (page: Page) => page.getByTestId('shadow-match-inspector');
const status = (page: Page) => page.getByTestId('shadow-match-status');
const assetPath = (assetId: string) => assets.find(asset => asset.id === assetId)!.path;
const correctPath = assetPath(level.options.find(candidate => candidate.id === level.correctOptionId)!.assetId);

async function readProgress(page: Page): Promise<ProgressData | null> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), progressKey);
}
async function noCompletion(page: Page) {
  expect((await readProgress(page))?.completed?.[level.id]).toBeUndefined();
}
async function layout(page: Page): Promise<ShadowMatchLayout> {
  return JSON.parse((await host(page).getAttribute('data-layout'))!);
}
async function ready(page: Page) {
  await expect(screen(page)).toHaveAttribute('data-shadow-status', 'playing', { timeout: imageLoadTimeout });
  await expect(host(page)).toHaveAttribute('data-game-type', 'shadow-match');
  await expect(page.getByTestId('shadow-match-option')).toHaveCount(4);
  for (const label of letters) await expect(option(page, label)).toBeEnabled();
  await expect.poll(async () => {
    const bounds = await host(page).boundingBox();
    const current = await layout(page);
    return Boolean(bounds && current.width === Math.floor(bounds.width) && current.height === Math.floor(bounds.height));
  }).toBe(true);
}
async function openRound(page: Page) { await page.goto(playUrl); await ready(page); }
async function noPageScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
    x: scrollX, y: scrollY,
  }))).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
}
async function inside(page: Page, element: Locator, touchTarget = false) {
  await expect(element).toBeVisible();
  await expect(element).toBeInViewport({ ratio: .999 });
  const rect = (await element.boundingBox())!;
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(rect.x).toBeGreaterThanOrEqual(-1);
  expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
  if (touchTarget) {
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
}
async function playingFits(page: Page) {
  await noPageScroll(page);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await inside(page, host(page).locator('canvas'));
  await inside(page, page.getByRole('button', { name: '返回影子配对关卡', exact: true }), true);
  for (const button of await screen(page).locator('.shadow-match-actions button:visible, .shadow-match-option, .shadow-match-reference').all()) {
    await inside(page, button, true);
  }
  await expect(screen(page).locator('.shadow-match-expand')).toHaveCount(0);
  for (const id of ['level-previous', 'level-advance']) {
    await inside(page, page.getByTestId(id), true); await expect(page.getByTestId(id)).toBeDisabled();
  }
  // The live pictures belong to Phaser; HTML supplies labels and accessible controls only.
  await expect(screen(page).locator('.shadow-match-controls img')).toHaveCount(0);
  const current = await layout(page);
  const ratio = assets.find(asset => asset.id === level.referenceAssetId)!;
  for (const card of [current.reference, ...current.options]) {
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(current.width + .1);
    expect(card.y + card.height).toBeLessThanOrEqual(current.height + .1);
    expect(card.image.width).toBeGreaterThan(0);
    expect(card.image.height).toBeGreaterThan(0);
    expect(card.image.width / card.image.height).toBeCloseTo(ratio.width / ratio.height, 5);
    expect(card.image.x).toBeGreaterThanOrEqual(card.x);
    expect(card.image.y).toBeGreaterThanOrEqual(card.y);
    expect(card.image.x + card.image.width).toBeLessThanOrEqual(card.x + card.width + .1);
    expect(card.image.y + card.image.height).toBeLessThanOrEqual(card.y + card.height + .1);
  }
  const mobileStudio = await page.evaluate(() => matchMedia('(pointer: coarse) and (hover: none) and (orientation: landscape) and (max-height: 600px)').matches);
  if (mobileStudio) {
    const canvas = (await host(page).boundingBox())!;
    expect(canvas.height, '手机主画布应占据完整可用高度').toBeGreaterThanOrEqual((page.viewportSize()!.height) - 18);
    expect(current.reference.image.height, '彩色参照不能继续缩成小卡片').toBeGreaterThanOrEqual(240);
    for (const card of current.options) expect(card.image.height).toBeGreaterThanOrEqual(110);
  }
}
async function inspectorFits(page: Page) {
  const dialog = inspector(page);
  await inside(page, dialog);
  const bounds = (await dialog.boundingBox())!;
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(bounds.x).toBeGreaterThanOrEqual(7);
  expect(bounds.y).toBeGreaterThanOrEqual(7);
  expect(viewport.width - bounds.x - bounds.width).toBeGreaterThanOrEqual(7);
  expect(viewport.height - bounds.y - bounds.height).toBeGreaterThanOrEqual(7);
  const buttons = await dialog.getByRole('button').all();
  for (const button of buttons) await inside(page, button, true);
  const choice = dialog.getByRole('combobox', { name: '选择对照影子', exact: true });
  await inside(page, choice, true); await expect(choice.locator('option')).toHaveCount(4);
  for (const element of [...buttons, choice, ...await dialog.locator('.shadow-match-inspector-window').all()]) {
    const rect = (await element.boundingBox())!;
    expect(rect.x, '观察窗控件应在左侧装饰以内').toBeGreaterThanOrEqual(bounds.x + 24);
    expect(rect.y, '观察窗控件应在顶部装饰以内').toBeGreaterThanOrEqual(bounds.y + 24);
    expect(rect.x + rect.width, '观察窗控件应在右侧装饰以内').toBeLessThanOrEqual(bounds.x + bounds.width - 24);
    expect(rect.y + rect.height, '观察窗控件应在底部装饰以内').toBeLessThanOrEqual(bounds.y + bounds.height - 24);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  }
  const images = dialog.locator('.shadow-match-inspector-picture img');
  await expect(images).toHaveCount(2);
  for (const image of await images.all()) {
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await expect.poll(() => dialog.locator('.shadow-match-inspector-picture').first()
    .evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(44);
  const pictures = await dialog.locator('.shadow-match-inspector-picture').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, transform: getComputedStyle(element).transform };
  }));
  expect(pictures[0]).toEqual(pictures[1]);
  await noPageScroll(page);
}

async function openComparison(page: Page, label: string) {
  await compareButton(page).click();
  await inspector(page).getByRole('combobox', { name: '选择对照影子', exact: true }).selectOption({ label: `影子 ${label}` });
  await expect(inspector(page)).toHaveAccessibleName(`放大对照 · 影子 ${label}`);
}

/** Build A–D -> image through the player's real read-only comparison UI, without exposing answer IDs in DOM. */
async function pictureOrder(page: Page) {
  const result: Record<string, string> = {};
  for (const label of letters) {
    await openComparison(page, label);
    await expect(inspector(page)).toHaveAccessibleName(`放大对照 · 影子 ${label}`);
    const image = inspector(page).locator('.shadow-match-inspector-picture img').nth(1);
    await expect(image).toHaveJSProperty('complete', true);
    result[label] = new URL((await image.getAttribute('src'))!, page.url()).pathname;
    await page.getByRole('button', { name: '关闭放大对照', exact: true }).click();
    await expect(inspector(page)).toHaveCount(0);
  }
  expect(Object.values(result).sort()).toEqual(level.options.map(candidate => assetPath(candidate.assetId)).sort());
  return result;
}
function correctLabel(order: Record<string, string>) { return letters.find(label => order[label] === correctPath)!; }
function wrongLabel(order: Record<string, string>) { return letters.find(label => order[label] !== correctPath)!; }
async function choose(page: Page, label: string, touch: boolean) {
  if (touch) await option(page, label).tap();
  else await option(page, label).click();
}

test('真实入口可跳过导览，错选不保存，正确选择才完成且刷新重玩保留旧记录', async ({ page }, testInfo) => {
  const previous: ProgressData = { version: 1, completed: { 'patterns-intro': '2026-10-28T00:00:00.000Z' }, settings: { reducedMotion: true } };
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, { key: progressKey, value: previous });
  await page.goto('/#/theme/music');
  await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
  await page.locator('a[href="#/theme/music/games/shadow-match"]').click();
  await expect(page.locator('.level-choice-card[data-status="available"]')).toHaveCount(1);
  await page.getByRole('link', { name: '开始配对', exact: true }).click();
  await ready(page);
  await playingFits(page);
  const order = await pictureOrder(page);
  await choose(page, wrongLabel(order), Boolean(testInfo.project.use.hasTouch));
  await expect(status(page)).toContainText('再比较');
  await expect(option(page, wrongLabel(order))).toHaveAttribute('aria-pressed', 'true');
  expect(await readProgress(page)).toEqual(previous);
  await noCompletion(page);
  await choose(page, correctLabel(order), Boolean(testInfo.project.use.hasTouch));
  await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
  await expect(page.getByRole('heading', { name: '配对完成', exact: true })).toBeVisible();
  const saved = (await readProgress(page))!;
  expect(saved.completed['patterns-intro']).toBe(previous.completed['patterns-intro']);
  expect(saved.completed[level.id]).toMatch(/^\d{4}-\d\d-\d\dT/);
  expect(Object.keys(saved.completed).sort()).toEqual(['patterns-intro', level.id].sort());
  expect(saved.settings).toEqual(previous.settings);
  await noPageScroll(page);
  for (const image of await page.locator('.shadow-result-images img').all()) {
    await inside(page, image);
    expect(await image.evaluate(element => getComputedStyle(element).objectFit)).toBe('contain');
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: '配对完成', exact: true })).toBeVisible();
  expect(await readProgress(page)).toEqual(saved);
  await page.getByRole('button', { name: '再配一次', exact: true }).click();
  await ready(page);
  await expect(page.locator('.shadow-match-option.is-wrong')).toHaveCount(0);
  expect(await readProgress(page)).toEqual(saved);
});

test('放大对照保持同尺度和同步拖动，关窗后选项顺序与本局不变', async ({ page }, testInfo) => {
  await openRound(page);
  const order = await pictureOrder(page);
  const label = wrongLabel(order);
  await choose(page, label, Boolean(testInfo.project.use.hasTouch));
  await expect(status(page)).toContainText('再比较');
  const message = await status(page).textContent();
  await openComparison(page, label);
  await inspectorFits(page);
  await inspector(page).getByRole('button', { name: '2×', exact: true }).click();
  await inspectorFits(page);
  const pictures = inspector(page).locator('.shadow-match-inspector-picture');
  const before = await pictures.first().evaluate(element => getComputedStyle(element).transform);
  const window = (await inspector(page).locator('.shadow-match-inspector-window').first().boundingBox())!;
  await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
  await page.mouse.down();
  await page.mouse.move(window.x + window.width / 2 + 35, window.y + window.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => pictures.first().evaluate(element => getComputedStyle(element).transform)).not.toBe(before);
  await inspectorFits(page);
  const transformed = await pictures.first().evaluate(element => getComputedStyle(element).transform);
  const originalWindows = await inspector(page).locator('.shadow-match-inspector-window').elementHandles();
  await inspector(page).getByRole('combobox', { name: '选择对照影子', exact: true }).selectOption({ label: `影子 ${correctLabel(order)}` });
  await expect(inspector(page)).toHaveAccessibleName(`放大对照 · 影子 ${correctLabel(order)}`);
  await expect(page).toHaveURL(new RegExp(`/#/play/${level.id}$`));
  await expect(pictures.first()).toHaveCSS('transform', transformed);
  for (const window of originalWindows) expect(await window.evaluate(element => element.isConnected), '切换候选不得更换ResizeObserver观察窗口').toBe(true);
  await noCompletion(page);
  // Inspecting even the correct outline is not a selection or submission.
  await inspector(page).getByRole('combobox', { name: '选择对照影子', exact: true }).selectOption({ label: `影子 ${label}` });
  await inspector(page).getByRole('button', { name: '3×', exact: true }).click();
  await inspectorFits(page);
  await inspector(page).getByRole('button', { name: '复位', exact: true }).click();
  await expect(inspector(page).getByRole('button', { name: '1×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await inspectorFits(page);
  await page.getByRole('button', { name: '关闭放大对照', exact: true }).click();
  await expect(compareButton(page)).toBeFocused();
  await expect(status(page)).toHaveText(message!);
  await expect(option(page, label)).toHaveClass(/is-wrong/);
  expect(await pictureOrder(page)).toEqual(order);
  await noCompletion(page);
});

test('桌面窄窗或手机竖屏中断后保留错误和顺序，支持视口的选项与放大窗完整同屏', async ({ page }, testInfo) => {
  await page.setViewportSize(compactPlayableViewport(testInfo));
  await openRound(page);
  const order = await pictureOrder(page);
  const label = wrongLabel(order);
  await choose(page, label, Boolean(testInfo.project.use.hasTouch));
  await expect(option(page, label)).toHaveClass(/is-wrong/);
  if (isMobileProject(testInfo)) {
    await page.setViewportSize(mobilePortraitViewport);
    await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
    await page.setViewportSize(mobileLandscapeViewport);
    await expect(page.getByTestId('mobile-landscape-gate')).not.toBeVisible();
  }
  for (const viewport of [compactPlayableViewport(testInfo), mobileLandscapeViewport, compactPlayableViewport(testInfo)]) {
    await page.setViewportSize(viewport);
    await ready(page);
    await playingFits(page);
    await expect(option(page, label)).toHaveClass(/is-wrong/);
    await expect(option(page, label)).toHaveAttribute('aria-pressed', 'true');
    expect(await pictureOrder(page)).toEqual(order);
    await openComparison(page, label);
    await inspectorFits(page);
    // In full view, both actual images are complete within their individual observation windows.
    for (const image of await inspector(page).locator('.shadow-match-inspector-picture img').all()) await inside(page, image);
    await page.keyboard.press('Escape');
    await expect(inspector(page)).toHaveCount(0);
    await expect(option(page, label)).toHaveClass(/is-wrong/);
  }
  await noCompletion(page);
});

test('提示可无限循环且不完成，重试清空错误并重新排列，键盘可完成配对', async ({ page }, testInfo) => {
  await openRound(page);
  const first = await pictureOrder(page);
  await choose(page, wrongLabel(first), Boolean(testInfo.project.use.hasTouch));
  await expect(page.locator('.shadow-match-option.is-wrong')).toHaveCount(1);
  await page.getByRole('button', { name: '重新配对', exact: true }).click();
  await expect(page.locator('.shadow-match-option.is-wrong')).toHaveCount(0);
  await expect(status(page)).toHaveText('');
  const next = await pictureOrder(page);
  expect(next).not.toEqual(first);
  for (let index = 0; index < level.hints.length * 2 + 1; index++) {
    await page.getByRole('button', { name: '配对提示', exact: true }).click();
    await expect(status(page)).toHaveText(level.hints[index % level.hints.length].text);
    await noCompletion(page);
  }
  expect(await pictureOrder(page)).toEqual(next);
  const correct = option(page, correctLabel(next));
  await correct.focus();
  await correct.press('Enter');
  await expect(page.getByRole('heading', { name: '配对完成', exact: true })).toBeVisible();
});

test('任一选项图片失败保留重试，恢复资源后可重新加载游玩', async ({ page }) => {
  const failedAsset = assetPath(level.options[0].assetId);
  const routePattern = `**${failedAsset}*`;
  await page.route(routePattern, route => route.abort());
  await page.goto(playUrl);
  await expect(screen(page)).toHaveAttribute('data-shadow-status', 'error', { timeout: imageLoadTimeout });
  await expect(page.getByRole('button', { name: '重新加载', exact: true })).toBeEnabled();
  await expect(page.getByTestId('shadow-match-option')).toHaveCount(0);
  await noCompletion(page);
  await page.unroute(routePattern);
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await ready(page);
  await playingFits(page);
  const order = await pictureOrder(page);
  await option(page, correctLabel(order)).click();
  await expect(page.getByRole('heading', { name: '配对完成', exact: true })).toBeVisible();
});
