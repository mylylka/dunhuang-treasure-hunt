import { devices, expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ColoringLevel, Level, ShadowMatchLevel } from '../../src/types';

const landscape = { width: 844, height: 390 }, portrait = { width: 390, height: 844 };
const ids = ['patterns-intro', 'puzzle-lotus-ceiling', 'puzzle-three-rabbits', 'coloring-three-rabbits', 'music-hidden-objects-intro', 'music-apsara-shadow'];
const levels = ids.map(id => JSON.parse(readFileSync(`src/content/levels/${id}.json`, 'utf8')) as Level);
const host = (page: Page) => page.getByTestId('phaser-player');
const gate = (page: Page) => page.getByTestId('mobile-landscape-gate');
const layout = async (page: Page) => JSON.parse((await host(page).getAttribute('data-layout'))!);
// Let screen dimensions rotate with the viewport. A fixed screen freezes WebKit's CSS layout viewport.
test.use({ viewport: landscape, isMobile: true, hasTouch: true });
test.setTimeout(60_000);

async function noScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => ({ x: scrollX, y: scrollY,
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight,
  }))).toEqual({ x: 0, y: 0, width: 0, height: 0 });
}
async function start(page: Page, level: Level) {
  await page.goto(`/#/play/${level.id}`);
  const button = level.gameType === 'spot-difference' ? '给我提示' : level.gameType === 'puzzle' ? '拼图提示'
    : level.gameType === 'coloring' ? '1×' : level.gameType === 'hidden-object' ? '开始寻找' : '配对提示';
  await expect(page.getByRole('button', { name: button, exact: true })).toBeEnabled({ timeout: 45_000 });
  await expect(gate(page)).toBeHidden();
  if (level.gameType === 'hidden-object') await page.getByRole('button', { name: '开始寻找', exact: true }).click();
  await expect(host(page).locator('canvas')).toBeInViewport({ ratio: .999 });
}
async function clickRect(page: Page, rect: { x: number; y: number; width: number; height: number }) {
  await host(page).locator('canvas').click({ position: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } });
}
async function shadowOrder(page: Page) {
  const order: string[] = [];
  for (const letter of ['A', 'B', 'C', 'D']) {
    await page.getByRole('button', { name: `放大影子 ${letter} 对照`, exact: true }).click();
    order.push((await page.getByTestId('shadow-match-inspector').locator('img').nth(1).getAttribute('src'))!);
    await page.getByRole('button', { name: '关闭放大对照', exact: true }).click();
  }
  return order;
}
async function colors(page: Page, level: ColoringLevel) {
  return page.evaluate(({ id, version }) => JSON.parse(localStorage.getItem('dunhuang:artworks:v2') ?? '{"artworks":{}}').artworks[id]?.[version]?.colors ?? {},
    { id: level.id, version: level.artworkVersion });
}
async function fingerprint(page: Page, level: Level): Promise<unknown> {
  if (level.gameType === 'spot-difference') return page.getByTestId('game-progress').getAttribute('aria-label');
  if (level.gameType === 'coloring') return colors(page, level);
  if (level.gameType === 'shadow-match') return { order: await shadowOrder(page), wrong: await page.locator('.shadow-match-option.is-wrong').getAttribute('data-option-label') };
  const state = await layout(page);
  if (level.gameType === 'puzzle') return state.pieces.map((piece: { id: number; placed: boolean; turns: number }) => [piece.id, piece.placed, piece.turns]);
  return { seed: state.seed, items: state.items.map((item: { id: string; spriteId: string; found: boolean; x: number; y: number }) => [item.id, item.spriteId, item.found, item.x, item.y]) };
}
async function playOneStep(page: Page, level: Level) {
  if (level.gameType === 'spot-difference') {
    const current = await layout(page), r = level.differences[0].region;
    await host(page).locator('canvas').click({ position: { x: current.reference.x + (r.x + r.width / 2) * current.reference.width,
      y: current.reference.y + (r.y + r.height / 2) * current.reference.height } });
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', `已找到 1 处，共 ${level.differences.length} 处`);
  } else if (level.gameType === 'coloring') {
    const current = await layout(page), region = [...level.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0];
    await host(page).locator('canvas').click({ position: { x: current.image.x + region.point.x * current.image.width, y: current.image.y + region.point.y * current.image.height } });
    await expect.poll(async () => Object.keys(await colors(page, level)).length).toBe(1);
  } else if (level.gameType === 'puzzle') {
    if (level.mode === 'rotation') {
      const before = await layout(page); await clickRect(page, before.pieces[0].targetRect);
      await expect.poll(async () => (await layout(page)).pieces[0].turns).toBe((before.pieces[0].turns + 1) % 4);
    } else {
      await page.getByRole('button', { name: '拼图提示', exact: true }).click();
      const current = await layout(page); await clickRect(page, current.pieces[current.highlightedId].targetRect);
      await expect(page.getByTestId('puzzle-progress')).toHaveAttribute('aria-label', `已归位 1 块，共 ${level.rows * level.columns} 块`);
    }
  } else if (level.gameType === 'hidden-object') {
    await page.getByRole('button', { name: '提示', exact: true }).click();
    await expect.poll(async () => {
      const current = await layout(page);
      return current.items.some((item: { groupId?: string; found: boolean; hitPoint: { x: number; y: number } }) => item.groupId && !item.found && item.hitPoint.y > 0 && item.hitPoint.y < current.height);
    }).toBe(true);
    const current = await layout(page);
    const target = current.items.find((item: { groupId?: string; found: boolean; hitPoint: { x: number; y: number } }) => item.groupId && !item.found && item.hitPoint.y > 0 && item.hitPoint.y < current.height);
    await host(page).locator('canvas').click({ position: target.hitPoint });
    await expect.poll(async () => (await layout(page)).items.filter((item: { found: boolean }) => item.found).length).toBe(1);
  } else {
    const order = await shadowOrder(page), index = order.findIndex(url => !url.includes('/shadow-intact.png'));
    await page.getByTestId('shadow-match-option').nth(index).click();
    await expect(page.locator('.shadow-match-option.is-wrong')).toHaveCount(1);
  }
}

test('手机初始竖屏只显示统一提示，全部2D入口不启动内容，电脑窄窗仍可玩', async ({ page, browser }) => {
  await page.setViewportSize(portrait);
  for (const route of ['/themes', '/theme/patterns', '/theme/patterns/games', '/theme/patterns/games/puzzle', ...ids.map(id => `/play/${id}`), '/result/music-apsara-shadow']) {
    await page.goto(`/#${route}`);
    await expect(gate(page)).toBeVisible();
    await expect(gate(page)).toHaveAccessibleName('请横过手机');
    await expect(host(page)).toHaveCount(0);
    await expect(page.getByTestId('mobile-landscape-surface')).toHaveAttribute('hidden', '');
    await expect(page.getByTestId('mobile-landscape-surface').locator(':scope > *')).toHaveCount(0);
    await page.keyboard.press('Escape'); await expect(gate(page)).toBeVisible();
    await noScroll(page);
  }
  await page.screenshot({ path: 'outputs/2D手机竖屏-横屏提示.png', fullPage: true });
  for (const route of ['/help', '/settings']) {
    await page.goto(`/#${route}`); await expect(gate(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  const desktop = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: { width: 360, height: 640 }, screen: { width: 1440, height: 1000 }, isMobile: false, hasTouch: false, userAgent: devices['Desktop Chrome'].userAgent });
  try {
    const narrow = await desktop.newPage(); await narrow.goto('/#/play/music-apsara-shadow');
    expect(await narrow.evaluate(() => navigator.userAgent)).not.toMatch(/iPhone|iPod|Android.*Mobile/i);
    await expect(narrow.getByRole('button', { name: '配对提示', exact: true })).toBeEnabled({ timeout: 45_000 });
    await expect(gate(narrow)).toBeHidden(); await noScroll(narrow);
  } finally { await desktop.close(); }
});

for (const level of levels) test(`${level.title}：手机竖屏中断保留同一局并停止交互，横屏恢复`, async ({ page }) => {
  await start(page, level); await playOneStep(page, level);
  const before = await fingerprint(page, level), canvas = await host(page).locator('canvas').elementHandle();
  if (level.gameType === 'puzzle' && level.mode === 'jigsaw') {
    const current = await layout(page), piece = current.pieces.find((item: { fullyVisible: boolean; placed: boolean }) => item.fullyVisible && !item.placed);
    const bounds = (await host(page).locator('canvas').boundingBox())!;
    await page.mouse.move(bounds.x + piece.displayRect.x + piece.displayRect.width / 2, bounds.y + piece.displayRect.y + piece.displayRect.height / 2);
    await page.mouse.down(); await page.mouse.move(bounds.x + current.board.x + current.board.width / 2, bounds.y + current.board.y + current.board.height / 2, { steps: 3 });
  }
  await page.setViewportSize(portrait);
  await expect(gate(page)).toBeVisible(); await expect(host(page)).toHaveAttribute('data-mobile-landscape-blocked', 'true');
  await expect(page.getByTestId('mobile-landscape-surface')).toHaveAttribute('inert', '');
  if (level.gameType === 'puzzle') await page.mouse.up();
  const frozenLayout = await host(page).getAttribute('data-layout');
  if (level.gameType === 'hidden-object') {
    const timer = page.getByTestId('hidden-object-timer'); const time = await timer.textContent();
    await page.waitForTimeout(1200); expect(await timer.textContent()).toBe(time);
    await expect(page.locator('.hidden-object-screen')).toHaveAttribute('data-hidden-status', 'paused');
  }
  // Even a dispatched DOM event cannot bypass the synchronous scene command guard.
  const action = page.getByRole('button', { name: level.gameType === 'hidden-object' ? '新一局' : level.gameType === 'coloring' ? '清空重涂' : level.gameType === 'puzzle' ? '重新拼图' : level.gameType === 'shadow-match' ? '重新配对' : '重新开始', exact: true, includeHidden: true });
  await action.dispatchEvent('click');
  await page.waitForTimeout(100); expect(await host(page).getAttribute('data-layout')).toBe(frozenLayout);
  await page.setViewportSize(landscape); await expect(gate(page)).toBeHidden();
  await expect(host(page)).toHaveAttribute('data-mobile-landscape-blocked', 'false');
  expect(await canvas!.evaluate(node => node.isConnected)).toBe(true);
  expect(await fingerprint(page, level)).toEqual(before);
  if (level.gameType === 'hidden-object') {
    const timer = page.getByTestId('hidden-object-timer'), time = await timer.textContent();
    await page.waitForTimeout(1050); expect(await timer.textContent()).toBe(time);
    await page.getByRole('button', { name: '继续寻找', exact: true }).click();
    await expect(page.locator('.hidden-object-screen')).toHaveAttribute('data-hidden-status', 'running');
    await expect.poll(() => timer.textContent()).not.toBe(time);
  } else if (level.gameType === 'shadow-match') {
    await page.getByRole('button', { name: '配对提示', exact: true }).click();
    await expect(page.getByTestId('shadow-match-status')).toContainText((level as ShadowMatchLevel).hints[0].text);
    await page.screenshot({ path: 'outputs/2D手机横屏-恢复游玩.png', fullPage: true });
  }
  await noScroll(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dunhuang:progress:v1') ?? '{"completed":{}}'));
  expect(stored.completed[level.id]).toBeUndefined();
});

test('手机竖屏提示覆盖已开的放大窗，回横屏保留对照图与缩放', async ({ page }) => {
  const level = levels.find(item => item.gameType === 'shadow-match')!;
  await start(page, level);
  await page.getByRole('button', { name: '放大影子 A 对照', exact: true }).click();
  const dialog = page.getByTestId('shadow-match-inspector');
  await dialog.getByRole('button', { name: '3×', exact: true }).click();
  const window = (await dialog.locator('.shadow-match-inspector-window').first().boundingBox())!;
  await page.mouse.move(window.x + window.width / 2, window.y + window.height / 2);
  await page.mouse.down(); await page.mouse.move(window.x + window.width / 2 + 30, window.y + window.height / 2 + 20); await page.mouse.up();
  const transform = await dialog.locator('.shadow-match-inspector-picture').first().getAttribute('style');
  const sources = await dialog.locator('img').evaluateAll(nodes => nodes.map(image => image.getAttribute('src')));
  await page.setViewportSize(portrait); await expect(gate(page)).toBeVisible();
  expect(await page.evaluate(() => {
    const element = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return Boolean(element?.closest('[data-testid="mobile-landscape-gate"]'));
  })).toBe(true);
  await page.keyboard.press('Escape'); await expect(gate(page)).toBeVisible();
  await page.setViewportSize(landscape); await expect(gate(page)).toBeHidden();
  await expect(dialog).toBeVisible(); await expect(dialog.getByRole('button', { name: '3×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await dialog.locator('img').evaluateAll(nodes => nodes.map(image => image.getAttribute('src')))).toEqual(sources);
  await expect(dialog.locator('.shadow-match-inspector-picture').first()).toHaveAttribute('style', transform!);
  await dialog.getByRole('button', { name: '关闭放大对照', exact: true }).click();
  await expect(page.getByRole('button', { name: '放大影子 A 对照', exact: true })).toBeFocused();
});
