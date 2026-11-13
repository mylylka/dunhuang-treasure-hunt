import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { AssetDefinition, HiddenObjectLevel, Level } from '../../src/types';
import type { HiddenObjectPool } from '../../src/games/hidden-object/types';
import { getHiddenObjectRuntimeImagePath } from '../../src/content/hidden-object/runtime-images';

const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level)
  .filter((level): level is HiddenObjectLevel => level.gameType === 'hidden-object')
  .sort((a, b) => (a.chapter?.order ?? 99) - (b.chapter?.order ?? 99) || (a.chapter?.level ?? 99) - (b.chapter?.level ?? 99));
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const pool = JSON.parse(readFileSync('src/content/hidden-object/pool.json', 'utf8')) as HiddenObjectPool;
const spritesByPath = new Map(pool.sprites.map(sprite => [getHiddenObjectRuntimeImagePath(sprite.path), sprite]));
const spritesById = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
const labels = new Map(pool.groups.map(group => [group.id, group.label]));
const imageLoadTimeout = 45_000;
const screen = (page: Page) => page.locator('.hidden-object-screen');
const host = (page: Page) => page.getByTestId('phaser-player');
const startButton = (page: Page) => page.getByRole('button', { name: '开始寻找', exact: true });
const timer = (page: Page) => page.getByTestId('hidden-object-timer');
const backgroundPath = (level: HiddenObjectLevel) => getHiddenObjectRuntimeImagePath(
  assets.find(asset => asset.id === level.chapter!.backgroundAssetId)!.path);
test.setTimeout(60_000);

interface TargetPreview { groupId: string; spriteId: string; path: string; label: string; required: number }
interface HiddenLayout {
  type: 'hidden-object'; seed: number; status: string;
  background?: { assetId: string };
  items: { id: string; spriteId: string; groupId?: string; found: boolean }[];
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

/** Hold the actual local runtime bytes; no catalog, seed, scene or completion state is replaced. */
async function holdBackground(page: Page, level: HiddenObjectLevel) {
  const path = backgroundPath(level), matcher = `**${path}*`;
  const body = readFileSync(`public${path}`);
  const release = deferred(), finished = deferred();
  let requests = 0;
  await page.route(matcher, async route => {
    requests++;
    try {
      await release.promise;
      await route.fulfill({ status: 200, contentType: path.endsWith('.webp') ? 'image/webp' : 'image/png', body });
    } finally { finished.resolve(); }
  });
  return { matcher, release: release.resolve, finished: finished.promise, count: () => requests };
}

async function preview(page: Page, level: HiddenObjectLevel): Promise<TargetPreview[]> {
  const cards = page.getByTestId('hidden-object-ready-target');
  await expect(cards).toHaveCount(level.tasks.groupCount, { timeout: imageLoadTimeout });
  for (const card of await cards.all()) {
    await expect(card).toBeInViewport({ ratio: .999 });
    const image = card.locator('img');
    await expect(image).toBeVisible();
    await image.evaluate(async (element: HTMLImageElement) => { await element.decode(); });
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  const entries = await cards.evaluateAll(elements => elements.map(element => {
    const image = element.querySelector('img')!;
    return { groupId: (element as HTMLElement).dataset.taskId!, path: new URL(image.currentSrc || image.src).pathname,
      label: element.querySelector('figcaption span')!.textContent!.trim(),
      required: Number(element.querySelector('figcaption strong')!.textContent!.replace('×', '').trim()) };
  }));
  const result = entries.map(entry => {
    const sprite = spritesByPath.get(entry.path);
    expect(sprite, `任务图片应来自正式池的运行派生：${entry.path}`).toBeDefined();
    expect(sprite!.groupIds).toContain(entry.groupId);
    expect(entry.label).toBe(labels.get(entry.groupId));
    expect(entry.required).toBeGreaterThanOrEqual(level.tasks.minCount);
    expect(entry.required).toBeLessThanOrEqual(level.tasks.maxCount);
    return { ...entry, spriteId: sprite!.id };
  }).sort((a, b) => a.groupId.localeCompare(b.groupId));
  const total = result.reduce((sum, entry) => sum + entry.required, 0);
  if (level.tasks.totalCount !== undefined) expect(total).toBe(level.tasks.totalCount);
  await expect(page.getByTestId('hidden-object-ready').locator('.hidden-object-ready-meta'))
    .toHaveText(`${level.timeLimitSeconds}秒·共${total}件`);
  await expect(timer(page)).toHaveAttribute('aria-label', `剩余 ${level.timeLimitSeconds} 秒`);
  return result;
}

async function ready(page: Page, level: HiddenObjectLevel) {
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'ready', { timeout: imageLoadTimeout });
  await expect(startButton(page)).toBeEnabled();
  await expect(startButton(page)).toHaveAttribute('aria-busy', 'false');
  await expect(host(page)).toHaveAttribute('data-layout', /"type":"hidden-object"/);
  const current = JSON.parse((await host(page).getAttribute('data-layout'))!) as HiddenLayout;
  expect(current.items).toHaveLength(level.categoryQuotas.reduce((sum, quota) => sum + quota.count, 0));
  expect(current.background?.assetId).toBe(level.chapter!.backgroundAssetId);
  await expect(screen(page)).toHaveAttribute('data-chapter-id', level.chapter!.id);
  await expect(screen(page)).toHaveAttribute('data-chapter-level', String(level.chapter!.level));
  const actual = await preview(page, level);
  for (const task of actual) {
    const copies = current.items.filter(item => item.groupId === task.groupId);
    expect(copies).toHaveLength(task.required);
    expect(copies.every(item => item.spriteId === task.spriteId)).toBe(true);
    expect(spritesById.get(task.spriteId)).toBeDefined();
  }
  return { layout: current, preview: actual };
}

async function noCompletion(page: Page, ...ids: string[]) {
  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('dunhuang:progress:v1') ?? '{"completed":{}}').completed);
  for (const id of ids) expect(completed[id]).toBeUndefined();
}

test('章节底图延迟至少两秒时先显示真实可解码目标，未加载完不能开始且不扣时', async ({ page }) => {
  const level = levels.find(entry => entry.chapter?.order === 2)!;
  const held = await holdBackground(page, level), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`/#/play/${level.id}`);
    await expect.poll(held.count, { timeout: imageLoadTimeout }).toBe(1);
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'loading');
    const before = await preview(page, level);
    const originalHost = await host(page).elementHandle();
    await expect(startButton(page)).toBeDisabled();
    await expect(startButton(page)).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(2000);
    expect(await preview(page, level)).toEqual(before);
    await expect(startButton(page)).toBeDisabled();
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'loading');
    await noCompletion(page, level.id);
    held.release(); await held.finished;
    const prepared = await ready(page, level);
    expect(prepared.preview).toEqual(before);
    expect(await originalHost!.evaluate(element => element.isConnected)).toBe(true);
    await startButton(page).click();
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
    expect((JSON.parse((await host(page).getAttribute('data-layout'))!) as HiddenLayout).seed).toBe(prepared.layout.seed);
    await noCompletion(page, level.id); expect(errors).toEqual([]);
  } finally { held.release(); await page.unroute(held.matcher); }
});

test('加载中真实返回目录并进入下一章，旧关延迟返回不改变新关目标、背景和本局', async ({ page }) => {
  const oldLevel = levels.filter(entry => entry.chapter?.order === 2).at(-1)!;
  const next = levels[levels.findIndex(entry => entry.id === oldLevel.id) + 1];
  expect(next.chapter!.order).toBe(3);
  expect(backgroundPath(next)).not.toBe(backgroundPath(oldLevel));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/theme/music/games/hidden-object');
  const oldCard = page.locator(`[data-level-id="${oldLevel.id}"]`);
  // Finish the directory cover before intercepting this same asset for the game loader.
  await oldCard.locator('.selected-level-picture > img').first().evaluate(async (image: HTMLImageElement) => { await image.decode(); });
  const held = await holdBackground(page, oldLevel);
  try {
    const enterOld = oldCard.locator('.selected-level-start');
    await enterOld.scrollIntoViewIfNeeded(); await enterOld.click();
    await expect.poll(held.count, { timeout: imageLoadTimeout }).toBe(1);
    await preview(page, oldLevel); await expect(startButton(page)).toBeDisabled();
    const oldHost = await host(page).elementHandle();
    await page.goBack();
    await expect(page).toHaveURL(/\/#\/theme\/music\/games\/hidden-object$/);
    await expect(page.getByTestId('hidden-object-chapter')).toHaveCount(3);
    expect(await oldHost!.evaluate(element => element.isConnected)).toBe(false);
    const enterNext = page.locator(`[data-level-id="${next.id}"] .selected-level-start`);
    await enterNext.scrollIntoViewIfNeeded(); await enterNext.click();
    const before = await ready(page, next);
    held.release(); await held.finished;
    // Let the delayed image's native load callbacks and Phaser's following frames finish.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const after = await ready(page, next);
    expect(after.layout.seed).toBe(before.layout.seed);
    expect(after.layout.items).toEqual(before.layout.items);
    expect(after.preview).toEqual(before.preview);
    await expect(page.getByRole('heading', { name: oldLevel.title, exact: true })).toHaveCount(0);
    await noCompletion(page, oldLevel.id, next.id);
    await startButton(page).click();
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
    expect(errors).toEqual([]);
  } finally { held.release(); await page.unroute(held.matcher); }
});
