import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { AssetDefinition, HiddenObjectLevel, Level, ProgressData } from '../../src/types';
import type { HiddenObjectPool } from '../../src/games/hidden-object/types';
import { getHiddenObjectRuntimeImagePath } from '../../src/content/hidden-object/runtime-images';

const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level)
  .filter((level): level is HiddenObjectLevel => level.gameType === 'hidden-object')
  .sort((a, b) => (a.chapter?.order ?? 99) - (b.chapter?.order ?? 99) || (a.chapter?.level ?? 99) - (b.chapter?.level ?? 99));
const pool = JSON.parse(readFileSync('src/content/hidden-object/pool.json', 'utf8')) as HiddenObjectPool;
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const sprites = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
const labels = new Map(pool.groups.map(group => [group.id, group.label]));
const progressKey = 'dunhuang:progress:v1';
const imageLoadTimeout = 45_000;
const chapter = (order: number) => levels.filter(level => level.chapter?.order === order);
const backgroundPath = (level: HiddenObjectLevel) => getHiddenObjectRuntimeImagePath(assets.find(asset => asset.id === level.chapter!.backgroundAssetId)!.path);
test.setTimeout(60_000);

interface LayoutItem {
  id: string; spriteId: string; categoryId: string; groupId?: string; found: boolean;
  x: number; y: number; width: number; height: number; rotation: number;
  hitPoint: { x: number; y: number };
}
interface HiddenLayout {
  type: 'hidden-object'; seed: number; status: string; width: number; height: number;
  scale: number; zoom: number; scrollTop: number; scrollMax: number;
  origin: { x: number; y: number };
  background?: { assetId: string; bounds: { x: number; y: number; width: number; height: number } };
  items: LayoutItem[];
}
const screen = (page: Page) => page.locator('.hidden-object-screen');
const host = (page: Page) => page.getByTestId('phaser-player');
const timer = (page: Page) => page.getByTestId('hidden-object-timer');
const scrollbar = (page: Page) => page.getByTestId('hidden-object-scrollbar');
const targets = (current: HiddenLayout) => current.items.filter(item => item.groupId);
const foundCount = (current: HiddenLayout) => current.items.filter(item => item.found).length;
const roundIdentity = (current: HiddenLayout) => ({ seed: current.seed,
  items: current.items.map(({ id, spriteId, groupId, found }) => ({ id, spriteId, groupId, found })) });
const progress = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null') as ProgressData | null, progressKey);

async function layout(page: Page): Promise<HiddenLayout> {
  return JSON.parse((await host(page).getAttribute('data-layout'))!);
}
async function settled(page: Page) {
  await expect.poll(async () => {
    const raw = await host(page).getAttribute('data-layout'), bounds = await host(page).boundingBox();
    if (!raw || !bounds) return false;
    const current = JSON.parse(raw) as HiddenLayout;
    return current.width === Math.floor(bounds.width) && current.height === Math.floor(bounds.height);
  }).toBe(true);
}
async function inside(element: Locator, touchTarget = false) {
  await expect(element).toBeVisible();
  await expect(element).toBeInViewport({ ratio: .999 });
  if (touchTarget) {
    const bounds = (await element.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
}
async function noPageScroll(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
    x: scrollX, y: scrollY,
  }))).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
}
async function noCompletion(page: Page, level: HiddenObjectLevel) {
  expect((await progress(page))?.completed[level.id]).toBeUndefined();
}
function checkBackground(current: HiddenLayout, level: HiddenObjectLevel) {
  expect(current.background?.assetId).toBe(level.chapter!.backgroundAssetId);
  const bounds = current.background!.bounds;
  expect(bounds.x).toBeCloseTo(current.origin.x, 6);
  expect(bounds.y).toBeCloseTo(current.origin.y, 6);
  expect(bounds.width).toBeCloseTo(level.board.width * current.scale, 6);
  expect(bounds.height).toBeCloseTo(level.board.height * current.scale, 6);
  expect(bounds.height).toBeGreaterThan(current.height);
}
async function ready(page: Page, level: HiddenObjectLevel) {
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'ready', { timeout: imageLoadTimeout });
  await expect(host(page)).toHaveAttribute('data-layout', /"type":"hidden-object"/);
  await settled(page);
  await expect(screen(page)).toHaveAttribute('data-chapter-id', level.chapter!.id);
  await expect(screen(page)).toHaveAttribute('data-chapter-order', String(level.chapter!.order));
  await expect(screen(page)).toHaveAttribute('data-chapter-level', String(level.chapter!.level));
  await expect(screen(page)).toHaveAttribute('data-task-groups', String(level.tasks.groupCount));
  await expect(screen(page)).toHaveAttribute('data-background-asset-id', level.chapter!.backgroundAssetId);
  const current = await layout(page), answers = targets(current);
  expect(current.items).toHaveLength(120);
  expect(new Set(current.items.map(item => item.id)).size).toBe(120);
  if (level.tasks.totalCount !== undefined) expect(answers).toHaveLength(level.tasks.totalCount);
  else { expect(answers.length).toBeGreaterThanOrEqual(3); expect(answers.length).toBeLessThanOrEqual(6); }
  const categories = level.categoryQuotas.map(quota => quota.categoryId);
  expect(current.items.every(item => categories.includes(item.categoryId))).toBe(true);
  checkBackground(current, level);
  const overlay = page.getByTestId('hidden-object-ready');
  await inside(overlay);
  await expect(overlay.locator('.hidden-object-ready-meta')).toHaveText(`${level.timeLimitSeconds}秒·共${answers.length}件`);
  await expect(page.getByTestId('hidden-object-ready-target')).toHaveCount(level.tasks.groupCount);
  for (const id of new Set(answers.map(item => item.groupId!))) {
    const copies = answers.filter(item => item.groupId === id);
    expect(new Set(copies.map(item => item.spriteId)).size).toBe(1);
    const preview = overlay.locator(`[data-task-id="${id}"]`), image = preview.locator('img');
    await inside(preview); await inside(image);
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    expect(new URL((await image.getAttribute('src'))!, page.url()).pathname).toBe(getHiddenObjectRuntimeImagePath(sprites.get(copies[0].spriteId)!.path));
    await expect(preview.locator('figcaption span')).toHaveText(labels.get(id)!);
    await expect(preview.locator('figcaption strong')).toHaveText(`×${copies.length}`);
  }
  await expect(screen(page).locator('button:visible')).toHaveText(['开始寻找']);
  await inside(page.getByRole('button', { name: '开始寻找', exact: true }), true);
  await expect(timer(page)).toHaveAttribute('aria-label', `剩余 ${level.timeLimitSeconds} 秒`);
  await noCompletion(page, level); await noPageScroll(page);
  return current;
}
async function openReady(page: Page, level: HiddenObjectLevel) {
  await page.goto(`/#/play/${level.id}`);
  return ready(page, level);
}
async function start(page: Page, level: HiddenObjectLevel) {
  await page.getByRole('button', { name: '开始寻找', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
  await settled(page);
  const current = await layout(page);
  await expect(page.getByTestId('hidden-object-progress')).toContainText(`已找到 0 / ${targets(current).length}`);
  if (level.tasks.totalCount !== undefined) expect(targets(current)).toHaveLength(level.tasks.totalCount);
  return current;
}
async function runningFits(page: Page, groups: number) {
  await noPageScroll(page);
  await inside(host(page).locator('canvas')); await inside(scrollbar(page)); await inside(timer(page));
  const tasks = page.getByTestId('hidden-object-task');
  await expect(tasks).toHaveCount(groups);
  for (const task of await tasks.all()) {
    await inside(task, true); await inside(task.locator('img')); await inside(task.locator('strong'));
  }
  for (const control of await page.locator('.hidden-object-actions :is(button,a):visible').all()) await inside(control, true);
  await inside(page.getByTestId('level-previous'), true); await inside(page.getByTestId('level-advance'), true);
}

/** Public rendered geometry only aims genuine input; it never changes a session or writes completion. */
async function findOne(page: Page, level: HiddenObjectLevel, touch: boolean) {
  const before = await layout(page), expected = foundCount(before) + 1;
  const target = before.items.find(item => item.groupId && !item.found)!;
  const task = page.locator(`[data-testid="hidden-object-task"][data-task-id="${target.groupId}"]`);
  await task.click(); await expect(task).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '提示', exact: true }).click();
  await expect(page.getByTestId('hidden-object-hint-status')).toContainText('点击红框中的目标物件');
  const current = await layout(page), point = current.items.find(item => item.id === target.id)!.hitPoint;
  expect(point.x).toBeGreaterThanOrEqual(0); expect(point.x).toBeLessThan(current.width);
  expect(point.y).toBeGreaterThanOrEqual(0); expect(point.y).toBeLessThan(current.height);
  expect(foundCount(current)).toBe(foundCount(before));
  const canvas = host(page).locator('canvas');
  if (touch) await canvas.tap({ position: point }); else await canvas.click({ position: point });
  if (expected === targets(before).length) await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
  else {
    await expect.poll(async () => foundCount(await layout(page))).toBe(expected);
    await expect(page.getByTestId('hidden-object-progress')).toContainText(`已找到 ${expected} / ${targets(before).length}`);
    await noCompletion(page, level);
  }
}
async function solve(page: Page, level: HiddenObjectLevel, touch: boolean) {
  const total = targets(await layout(page)).length;
  for (let found = foundCount(await layout(page)); found < total; found++) await findOne(page, level, touch);
}
async function scrollBoundary(page: Page, bottom: boolean) {
  await scrollbar(page).focus(); await scrollbar(page).press(bottom ? 'End' : 'Home');
  await expect.poll(async () => {
    const current = await layout(page);
    return Math.abs(current.scrollTop - (bottom ? current.scrollMax : 0));
  }).toBeLessThanOrEqual(1);
}
async function clickDifferentImage(page: Page, level: HiddenObjectLevel, touch: boolean) {
  const before = await layout(page), active = new Set(targets(before).map(item => item.groupId!));
  const candidate = before.items.find(item => !item.groupId && sprites.get(item.spriteId)!.groupIds.some(id => active.has(id)));
  expect(candidate, '本局应包含目标类别的异图干扰，不能以同类名称直接判对').toBeDefined();
  await scrollBoundary(page, false);
  let visible = false;
  for (let step = 0; step < 20; step++) {
    const current = await layout(page), point = current.items.find(item => item.id === candidate!.id)!.hitPoint;
    if (point.y >= 4 && point.y < current.height - 4) { visible = true; break; }
    const previous = current.scrollTop;
    await scrollbar(page).press('PageDown');
    await expect.poll(async () => (await layout(page)).scrollTop).toBeGreaterThan(previous);
  }
  expect(visible).toBe(true);
  const current = await layout(page), point = current.items.find(item => item.id === candidate!.id)!.hitPoint;
  const canvas = host(page).locator('canvas');
  if (touch) await canvas.tap({ position: point }); else await canvas.click({ position: point });
  // Phaser consumes native input on its next frame; zero must remain zero after that work runs.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(async () => foundCount(await layout(page))).toBe(foundCount(before));
  await expect(page.getByTestId('hidden-object-progress')).toContainText(`已找到 0 / ${level.tasks.totalCount}`);
  await noCompletion(page, level);
}

test('找物目录按章展示九关，真实滚动至末关且封面链接进入对应准备页', async ({ page }) => {
  await page.goto('/#/theme/music/games/hidden-object');
  const sections = page.getByTestId('hidden-object-chapter');
  await expect(sections).toHaveCount(3);
  await expect(page.locator('.level-choice-card[data-status="available"]')).toHaveCount(9);
  for (const [index, section] of (await sections.all()).entries()) {
    const entries = chapter(index + 1);
    await expect(section).toHaveAttribute('data-chapter-id', entries[0].chapter!.id);
    await expect(section).toHaveAttribute('data-chapter-order', String(index + 1));
    const cards = section.locator('.level-choice-card'); await expect(cards).toHaveCount(3);
    for (const [offset, card] of (await cards.all()).entries()) {
      await expect(card).toHaveAttribute('data-level-id', entries[offset].id);
      await expect(card).toHaveAttribute('data-chapter-level', String(offset + 1));
      const image = card.locator('.selected-level-picture img').first();
      expect(new URL((await image.getAttribute('src'))!, page.url()).pathname).toBe(backgroundPath(entries[offset]));
      await expect(card.locator('.selected-level-cover-link')).toHaveAttribute('href', `#/play/${entries[offset].id}`);
    }
  }
  const scroll = page.getByTestId('level-choice-scroll');
  await scroll.focus(); await scroll.press('End');
  const last = levels[levels.length - 1], lastCard = page.locator(`[data-level-id="${last.id}"]`);
  await inside(lastCard.locator('.selected-level-start'), true); await noPageScroll(page);
  const cover = lastCard.locator('.selected-level-cover-link');
  await inside(cover); await cover.focus(); await cover.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/#/play/${last.id}$`));
  await ready(page, last); await noCompletion(page, last);
});

for (const order of [1, 2, 3]) {
  test(`第${order}章三关准备图与数量准确，主动开始前不扣时且只加载本章底图`, async ({ page }) => {
    expect(levels).toHaveLength(9); expect(chapter(order)).toHaveLength(3);
    const requested = new Set<string>(), errors: string[] = [];
    page.on('request', request => { if (request.url().includes('/hidden-object-backgrounds/')) requested.add(new URL(request.url()).pathname); });
    page.on('pageerror', error => errors.push(error.message));
    for (const level of chapter(order)) {
      const prepared = await openReady(page, level);
      await page.waitForTimeout(1100);
      await expect(timer(page)).toHaveAttribute('aria-label', `剩余 ${level.timeLimitSeconds} 秒`);
      expect(roundIdentity(await layout(page))).toEqual(roundIdentity(prepared));
      const running = await start(page, level);
      expect(roundIdentity(running)).toEqual(roundIdentity(prepared));
      await expect(page.getByTestId('hidden-object-task')).toHaveCount(level.tasks.groupCount);
      await page.getByRole('button', { name: '暂停', exact: true }).click();
      await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
      await noCompletion(page, level);
    }
    expect([...requested]).toEqual([backgroundPath(chapter(order)[0])]);
    expect(errors).toEqual([]);
  });
}

test('第二章异图点击不计数，真实找齐七件才保存，并顺畅进入第三章八件', async ({ page }, testInfo) => {
  const level = chapter(2)[2], next = chapter(3)[0];
  const touch = Boolean(testInfo.project.use.hasTouch);
  await openReady(page, level); const before = await progress(page);
  await start(page, level); await clickDifferentImage(page, level, touch);
  await solve(page, level, touch);
  await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
  const saved = (await progress(page))!;
  expect(saved.completed[level.id]).toMatch(/^\d{4}-\d\d-\d\dT/);
  expect(Object.keys(saved.completed).sort()).toEqual([...Object.keys(before?.completed ?? {}), level.id].sort());
  const completedAt = saved.completed[level.id];
  await page.reload();
  await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
  expect(await progress(page)).toEqual(saved);
  const advance = page.getByTestId('result-primary-action');
  await inside(advance, true); await expect(advance).toHaveText('下一关');
  await expect(advance).toHaveAttribute('href', `#/play/${next.id}`);
  await advance.click(); await ready(page, next); await start(page, next);
  await expect(page.getByTestId('hidden-object-progress')).toContainText('已找到 0 / 8');
  expect((await progress(page))!.completed[level.id]).toBe(completedAt);
  await noCompletion(page, next);
});

for (const viewport of [{ width: 640, height: 300 }, { width: 852, height: 330 }]) {
  test(`手机${viewport.width}×${viewport.height}四目标和44触点同屏，竖屏保留八件本局及底图`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport,
      hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage(), errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const level of [chapter(2)[0], chapter(3)[0]]) {
        await openReady(page, level); await start(page, level); await runningFits(page, 4);
      }
      const level = chapter(3)[0];
      await findOne(page, level, true);
      const before = await layout(page), identity = roundIdentity(before);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
      await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
      const stoppedTime = await timer(page).getAttribute('aria-label');
      await page.waitForTimeout(1100);
      await expect(timer(page)).toHaveAttribute('aria-label', stoppedTime!);
      expect(roundIdentity(await layout(page))).toEqual(identity);
      await page.setViewportSize(viewport);
      await expect(page.getByTestId('mobile-landscape-gate')).toBeHidden();
      await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
      await page.getByRole('button', { name: '继续寻找', exact: true }).click();
      await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
      await settled(page); await runningFits(page, 4);
      const restored = await layout(page);
      expect(roundIdentity(restored)).toEqual(identity); checkBackground(restored, level);
      await expect(page.getByTestId('hidden-object-progress')).toContainText('已找到 1 / 8');
      await noCompletion(page, level); expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('第三章背景覆盖整个长卷，随真实滚动及2倍缩放而非固定观察窗', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const level = chapter(3)[0]; await openReady(page, level); await start(page, level);
  const top = await layout(page); checkBackground(top, level);
  await scrollBoundary(page, true);
  const bottom = await layout(page); checkBackground(bottom, level);
  expect(bottom.background!.bounds.y).toBeLessThan(top.background!.bounds.y);
  expect(bottom.background!.bounds.height).toBeCloseTo(top.background!.bounds.height, 6);
  expect(bottom.origin.y - top.origin.y).toBeCloseTo(-bottom.scrollTop, 1);
  await page.getByRole('button', { name: '2×', exact: true }).click();
  await expect.poll(async () => (await layout(page)).zoom).toBe(2);
  const zoomed = await layout(page); checkBackground(zoomed, level);
  expect(zoomed.background!.bounds.width).toBeCloseTo(bottom.background!.bounds.width * 2, 6);
  expect(zoomed.background!.bounds.height).toBeCloseTo(bottom.background!.bounds.height * 2, 6);
  expect(roundIdentity(zoomed)).toEqual(roundIdentity(top));
  await noCompletion(page, level); await noPageScroll(page);
});

test('章节背景加载失败不启动时钟，重新加载恢复本章七件准备页', async ({ page }) => {
  const level = chapter(2)[0], route = `**${backgroundPath(level)}*`;
  await page.route(route, request => request.abort());
  await page.goto(`/#/play/${level.id}`);
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'error', { timeout: imageLoadTimeout });
  await expect(page.getByRole('button', { name: '开始寻找', exact: true })).toHaveCount(0);
  await expect(timer(page)).toHaveAttribute('aria-label', '剩余 50 秒');
  await page.waitForTimeout(1100);
  await expect(timer(page)).toHaveAttribute('aria-label', '剩余 50 秒');
  await noCompletion(page, level);
  await page.unroute(route);
  const reload = page.getByRole('button', { name: '重新加载', exact: true });
  await inside(reload, true); await reload.click();
  await ready(page, level); await start(page, level);
  await expect(page.getByTestId('hidden-object-progress')).toContainText('已找到 0 / 7');
  await noCompletion(page, level);
});
