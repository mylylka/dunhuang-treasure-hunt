import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { HiddenObjectLevel, ProgressData } from '../../src/types';
import { createHiddenObjectRound } from '../../src/games/hidden-object/rules';
import type { HiddenObjectPool } from '../../src/games/hidden-object/types';
import { getHiddenObjectRuntimeImagePath } from '../../src/content/hidden-object/runtime-images';
import { compactMobileLandscapeViewport, compactPlayableViewport, isMobileProject, mobileLandscapeViewport, mobilePortraitViewport } from './supported-viewports';

const level = JSON.parse(readFileSync('src/content/levels/music-hidden-objects-intro.json', 'utf8')) as HiddenObjectLevel;
const formalHiddenLevels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')))
  .filter((entry): entry is HiddenObjectLevel => entry.gameType === 'hidden-object');
const pool = JSON.parse(readFileSync('src/content/hidden-object/pool.json', 'utf8')) as HiddenObjectPool;
const sprites = new Map(pool.sprites.map(sprite => [sprite.id, sprite]));
const progressKey = 'dunhuang:progress:v1';
const learningKey = 'dunhuang:learning:v1';
const imageLoadTimeout = 45_000;
const playUrl = `/#/play/${level.id}`;
const runtimeSpritePaths = new Set(pool.sprites.map(sprite => getHiddenObjectRuntimeImagePath(sprite.path)));
const poolRoute = (url: URL) => runtimeSpritePaths.has(url.pathname);
const totalItems = level.categoryQuotas.reduce((sum, quota) => sum + quota.count, 0);
test.setTimeout(60_000);

function clockText(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

interface LayoutItem {
  id: string;
  spriteId: string;
  categoryId: string;
  groupId?: string;
  found: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  displayRect: { x: number; y: number; width: number; height: number };
  hitPoint: { x: number; y: number };
}
interface HiddenLayout {
  type: 'hidden-object';
  seed: number;
  status: 'ready' | 'running' | 'paused' | 'won' | 'timeout';
  width: number;
  height: number;
  zoom: 1 | 2 | 3;
  scale: number;
  renderScale: { x: number; y: number };
  scrollTop: number;
  scrollMax: number;
  items: LayoutItem[];
}

const screen = (page: Page) => page.locator('.hidden-object-screen');
const host = (page: Page) => page.getByTestId('phaser-player');
const timer = (page: Page) => page.getByTestId('hidden-object-timer');
const scrollbar = (page: Page) => page.getByTestId('hidden-object-scrollbar');
const targetCount = (current: HiddenLayout) => current.items.filter(item => item.groupId).length;

async function layout(page: Page): Promise<HiddenLayout> {
  return JSON.parse((await host(page).getAttribute('data-layout'))!);
}
async function waitReady(page: Page) {
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'ready', { timeout: imageLoadTimeout });
  await expect(page.getByRole('button', { name: '开始寻找', exact: true })).toBeEnabled();
  await expect(host(page)).toHaveAttribute('data-game-type', 'hidden-object');
  await expect(host(page)).toHaveAttribute('data-layout', /"type":"hidden-object"/);
  const ready = page.getByTestId('hidden-object-ready');
  await expect(ready).toHaveAccessibleName('本局寻找');
  await expect(ready).not.toContainText('造型');
  await expect(ready.locator('.hidden-object-ready-footer p')).toHaveCount(0);
  for (const selector of ['.hidden-object-controls', '.hidden-object-task-panel', '.hidden-object-heading', '.hidden-object-actions', '.hidden-object-tools']) {
    await expect(page.locator(selector)).toBeHidden();
  }
  await expect(timer(page)).toBeHidden();
  await expect(screen(page).locator('button:visible')).toHaveText(['开始寻找']);
  expect(await page.evaluate(async () => (await document.fonts.load('700 30px "Dunhuang Labels"', '琵琶鼓铃铛×12')).length)).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: '开始寻宝', exact: true })).toHaveCount(0);
  const current = await layout(page);
  const targets = current.items.filter(item => item.groupId);
  await expect(ready.locator('.hidden-object-ready-meta')).toHaveText(`${level.timeLimitSeconds}秒·共${targets.length}件`);
  await expect(page.getByTestId('hidden-object-ready-target')).toHaveCount(level.tasks.groupCount);
  for (const groupId of new Set(targets.map(item => item.groupId!))) {
    const copies = targets.filter(item => item.groupId === groupId);
    const preview = ready.locator(`[data-task-id="${groupId}"]`);
    const expectedUrl = new URL(getHiddenObjectRuntimeImagePath(sprites.get(copies[0].spriteId)!.path).replace(/^\//, ''), page.url()).href;
    await expect(preview.locator('img')).toHaveJSProperty('src', expectedUrl);
    await expect(preview.locator('img')).toHaveJSProperty('complete', true);
    await expect(preview.locator('figcaption strong')).toHaveText(`×${copies.length}`);
  }
  await inside(page, ready.getByRole('button', { name: '开始寻找', exact: true }));
}
async function openRound(page: Page) { await page.goto(playUrl); await waitReady(page); }
async function start(page: Page) {
  await page.getByRole('button', { name: '开始寻找', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
}
async function noCompletion(page: Page) {
  expect(await page.evaluate(({ key, id }) => Boolean(JSON.parse(localStorage.getItem(key) ?? '{"completed":{}}').completed[id]),
    { key: progressKey, id: level.id })).toBe(false);
}
async function inside(page: Page, element: Locator) {
  await expect(element).toBeVisible();
  await expect(element).toBeInViewport({ ratio: 0.999 });
  const bounds = await element.boundingBox();
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}
async function fits(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight,
    x: scrollX, y: scrollY,
  }))).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
  await inside(page, timer(page));
  await inside(page, host(page).locator('canvas'));
  await inside(page, scrollbar(page));
  for (const task of await page.getByTestId('hidden-object-task').all()) await inside(page, task);
  for (const button of await page.locator('.hidden-object-actions :is(button,a):visible, .hidden-object-tools button:visible').all()) {
    await inside(page, button);
    const bounds = (await button.boundingBox())!;
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.width).toBeGreaterThanOrEqual(44);
  }
  if (await page.evaluate(() => matchMedia('(pointer: coarse) and (hover: none) and (orientation: landscape) and (max-height: 600px)').matches)) {
    await expect(page.locator('.hidden-object-tools')).toBeHidden();
    const canvas = (await host(page).locator('canvas').boundingBox())!;
    expect(canvas.height).toBeGreaterThanOrEqual((await page.evaluate(() => innerHeight)) - 14);
  }
}
async function settled(page: Page) {
  await expect.poll(async () => {
    const bounds = await host(page).boundingBox();
    const current = await layout(page);
    return Boolean(bounds && current.width === Math.floor(bounds.width) && current.height === Math.floor(bounds.height));
  }).toBe(true);
}
function contents(current: HiddenLayout) { return current.items.map(item => item.spriteId).sort(); }
function placement(current: HiddenLayout) {
  return current.items.map(({ id, spriteId, x, y, width, height, rotation }) => ({ id, spriteId, x, y, width, height, rotation }));
}

async function exactTargetCopies(page: Page, current: HiddenLayout) {
  expect(current.items).toHaveLength(totalItems);
  expect(new Set(current.items.map(item => item.id)).size).toBe(totalItems);
  const targets = current.items.filter(item => item.groupId);
  const targetSprites = new Set(targets.map(item => item.spriteId));
  const distractors = current.items.filter(item => !item.groupId);
  expect(new Set(distractors.map(item => item.spriteId)).size).toBe(distractors.length);
  expect(distractors.every(item => !targetSprites.has(item.spriteId))).toBe(true);
  const groups = new Set(targets.map(item => item.groupId!));
  expect(targetSprites.size).toBe(groups.size);
  const base = await page.evaluate(() => document.baseURI);
  for (const groupId of groups) {
    const copies = targets.filter(item => item.groupId === groupId);
    expect(new Set(copies.map(item => item.spriteId)).size).toBe(1);
    const sprite = sprites.get(copies[0].spriteId)!;
    expect(sprite.groupIds).toContain(groupId);
    const expectedUrl = new URL(getHiddenObjectRuntimeImagePath(sprite.path).replace(/^\//, ''), base).href;
    const prepared = await screen(page).getAttribute('data-hidden-status') === 'ready';
    const image = prepared
      ? page.locator(`[data-testid="hidden-object-ready-target"][data-task-id="${groupId}"] img`)
      : page.locator(`[data-testid="hidden-object-task"][data-task-id="${groupId}"] img`);
    await expect(image).toHaveJSProperty('src', expectedUrl);
    for (const copy of copies) expect(new URL(getHiddenObjectRuntimeImagePath(sprites.get(copy.spriteId)!.path).replace(/^\//, ''), base).href).toBe(expectedUrl);
  }
}

function sameGroupDifferentImage<T extends Pick<LayoutItem, 'id' | 'spriteId' | 'groupId'>>(current: { items: T[] }) {
  for (const target of current.items.filter(item => item.groupId)) {
    const distractor = current.items.find(item => !item.groupId && item.spriteId !== target.spriteId
      && sprites.get(item.spriteId)!.groupIds.includes(target.groupId!));
    if (distractor) return { groupId: target.groupId!, distractor };
  }
  return undefined;
}

function exactMatchSeed() {
  for (let seed = 1; seed <= 100; seed++) {
    const round = createHiddenObjectRound(level, pool, seed);
    const candidate = sameGroupDifferentImage(round);
    if (round.tasks.some(task => task.required > 1) && candidate) return seed;
  }
  throw new Error('正式抽样规则未生成包含目标副本及同类异图干扰的测试种子。');
}

/** Read geometry to aim a real pointer/touch click; never invoke completion or write game state. */
async function findOne(page: Page, touch: boolean, expectedCount: number, last = false) {
  const before = await layout(page);
  const total = targetCount(before);
  const target = before.items.find(item => item.groupId && !item.found)!;
  expect(target).toBeTruthy();
  const task = page.locator(`[data-testid="hidden-object-task"][data-task-id="${target.groupId}"]`);
  await task.click();
  await expect(task).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '提示', exact: true }).click();
  await expect(page.getByTestId('hidden-object-hint-status')).toContainText('点击红框中的目标物件');
  const current = await layout(page);
  const moved = current.items.find(item => item.id === target.id)!;
  expect(moved.hitPoint.x).toBeGreaterThanOrEqual(0);
  expect(moved.hitPoint.x).toBeLessThan(current.width);
  expect(moved.hitPoint.y).toBeGreaterThanOrEqual(0);
  expect(moved.hitPoint.y).toBeLessThan(current.height);
  const canvas = host(page).locator('canvas');
  if (touch) await canvas.tap({ position: moved.hitPoint });
  else await canvas.click({ position: moved.hitPoint });
  if (last) await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
  else {
    await expect.poll(async () => (await layout(page)).items.filter(item => item.found).length).toBe(expectedCount);
    await expect(page.getByTestId('hidden-object-progress')).toContainText(`已找到 ${expectedCount} / ${total}`);
    await noCompletion(page);
  }
}
async function solve(page: Page, touch: boolean) {
  const total = targetCount(await layout(page));
  for (let found = 1; found <= total; found++) await findOne(page, touch, found, found === total);
}
async function freezeReadyClock(page: Page) {
  // Install before navigation so Phaser keeps the controlled RAF/performance functions.
  await page.clock.install({ time: new Date('2026-11-01T00:00:00.000Z') });
  await openRound(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 1000);
}

async function nativeScrollEdge(page: Page, bottom: boolean, controlledClock = false) {
  if (controlledClock) await page.clock.runFor(50);
  // The Scene publishes zoom geometry before React commits the native scroll track.
  // Aim at the current track, rather than the previous zoom's DOM height.
  await expect.poll(async () => {
    const maximum = await scrollbar(page).evaluate(element => element.scrollHeight - element.clientHeight);
    return Math.abs(maximum - (await layout(page)).scrollMax);
  }).toBeLessThanOrEqual(1);
  await scrollbar(page).evaluate((element, tail) => {
    element.scrollTop = tail ? element.scrollHeight : 0;
  }, bottom);
  if (controlledClock) await page.clock.runFor(50);
  await expect.poll(async () => {
    const current = await layout(page);
    return Math.abs(current.scrollTop - (bottom ? current.scrollMax : 0));
  }).toBeLessThanOrEqual(1);
}

async function dragCanvasUp(page: Page, touch: boolean) {
  const bounds = (await host(page).locator('canvas').boundingBox())!;
  const x = bounds.x + bounds.width * .5;
  const from = bounds.y + bounds.height * .8;
  const to = bounds.y + bounds.height * .2;
  if (touch) {
    const client = await page.context().newCDPSession(page);
    try {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
      for (let step = 1; step <= 6; step++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: from + (to - from) * step / 6 }] });
        await page.clock.runFor(16);
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally { await client.detach(); }
  } else {
    await page.mouse.move(x, from);
    await page.mouse.down();
    for (let step = 1; step <= 6; step++) {
      await page.mouse.move(x, from + (to - from) * step / 6);
      await page.clock.runFor(16);
    }
    await page.mouse.up();
  }
  await page.clock.runFor(50);
}

test('乐舞导览可跳过，首关配额与随机目标数量正确，真实点击成功才保存', async ({ page }, testInfo) => {
  const previous: ProgressData = { version: 1, completed: { 'patterns-intro': '2026-10-28T00:00:00.000Z' }, settings: { reducedMotion: true } };
  const previousLearning = JSON.stringify({ version: 1, books: {} });
  await page.addInitScript(({ progressKey, learningKey, previous, previousLearning }) => {
    if (!localStorage.getItem(progressKey)) localStorage.setItem(progressKey, JSON.stringify(previous));
    if (!localStorage.getItem(learningKey)) localStorage.setItem(learningKey, previousLearning);
  }, { progressKey, learningKey, previous, previousLearning });
  await page.goto('/#/theme/music');
  await expect(page.getByRole('button', { name: '直接玩游戏', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
  await page.locator('a[href="#/theme/music/games/hidden-object"]').click();
  await expect(page.locator('.level-choice-card[data-status="available"]')).toHaveCount(formalHiddenLevels.length);
  await page.locator(`a[href="#/play/${level.id}"]`).first().click();
  await waitReady(page);
  const initial = await layout(page);
  await exactTargetCopies(page, initial);
  expect(targetCount(initial)).toBeGreaterThanOrEqual(level.tasks.groupCount * level.tasks.minCount);
  expect(targetCount(initial)).toBeLessThanOrEqual(level.tasks.groupCount * level.tasks.maxCount);
  for (const quota of level.categoryQuotas) expect(initial.items.filter(item => item.categoryId === quota.categoryId)).toHaveLength(quota.count);
  const activeGroups = new Set(initial.items.flatMap(item => item.groupId ? [item.groupId] : []));
  expect(activeGroups.size).toBe(level.tasks.groupCount);
  for (const group of activeGroups) {
    expect(level.tasks.groupIds).toContain(group);
    const count = initial.items.filter(item => item.groupId === group).length;
    expect(count).toBeGreaterThanOrEqual(level.tasks.minCount);
    expect(count).toBeLessThanOrEqual(level.tasks.maxCount);
  }
  await noCompletion(page);
  await start(page);
  await fits(page);
  await solve(page, Boolean(testInfo.project.use.hasTouch));
  await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey) as ProgressData;
  expect(saved.completed['patterns-intro']).toBe(previous.completed['patterns-intro']);
  expect(saved.completed[level.id]).toMatch(/^\d{4}-\d\d-\d\dT/);
  expect(Object.keys(saved.completed).sort()).toEqual(['patterns-intro', level.id].sort());
  expect(saved.settings).toEqual(previous.settings);
  // Visiting the actual guide can record a visit, but skipping does not invent other chapters.
  const learningBeforeRefresh = await page.evaluate(key => localStorage.getItem(key), learningKey);
  await page.reload();
  await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(saved);
  expect(await page.evaluate(key => localStorage.getItem(key), learningKey)).toBe(learningBeforeRefresh);
});

test('新一局重新抽素材和摆放，同局重试复用种子并清空发现', async ({ page }, testInfo) => {
  await openRound(page);
  const first = await layout(page);
  await exactTargetCopies(page, first);
  await start(page);
  await page.getByRole('button', { name: '新一局', exact: true }).click();
  await waitReady(page);
  const second = await layout(page);
  await exactTargetCopies(page, second);
  expect(second.seed).not.toBe(first.seed);
  expect(contents(second)).not.toEqual(contents(first));
  expect(placement(second)).not.toEqual(placement(first));
  await start(page);
  await page.getByRole('button', { name: '新一局', exact: true }).click();
  await waitReady(page);
  const third = await layout(page);
  await exactTargetCopies(page, third);
  expect(third.seed).not.toBe(second.seed);
  expect(contents(third)).not.toEqual(contents(second));
  expect(placement(third)).not.toEqual(placement(second));
  await start(page);
  await findOne(page, Boolean(testInfo.project.use.hasTouch), 1);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
  await page.getByRole('button', { name: '重试本局', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
  const retried = await layout(page);
  expect(retried.seed).toBe(third.seed);
  expect(placement(retried)).toEqual(placement(third));
  expect(retried.items.filter(item => item.found)).toHaveLength(0);
  await noCompletion(page);
});

test('任务只匹配卡片原图，同类异色异形干扰真实点击不计数', async ({ page }, testInfo) => {
  const seed = exactMatchSeed();
  // Control the initial random seed only; the production generator still creates the whole round.
  await page.addInitScript(value => {
    const original = Crypto.prototype.getRandomValues;
    Crypto.prototype.getRandomValues = function<T extends ArrayBufferView<ArrayBuffer>>(array: T): T {
      if (array instanceof Uint32Array && array.length === 1) { array[0] = value; return array; }
      return original.call(this, array) as T;
    };
  }, seed);
  await openRound(page);
  const prepared = await layout(page);
  expect(prepared.seed).toBe(seed);
  await exactTargetCopies(page, prepared);
  expect(new Set(prepared.items.map(item => item.spriteId)).size).toBeLessThan(totalItems);
  const candidate = sameGroupDifferentImage(prepared)!;
  expect(candidate).toBeTruthy();
  await start(page);
  const card = page.locator(`[data-testid="hidden-object-task"][data-task-id="${candidate.groupId}"]`);
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  const current = await layout(page);
  // Starting changes the observation window width; use the running geometry of the same instance.
  const runtimeDistractor = current.items.find(item => item.id === candidate.distractor.id)!;
  const offset = Math.min(current.scrollMax, Math.max(0,
    runtimeDistractor.hitPoint.y + current.scrollTop - current.height / 2));
  await scrollbar(page).evaluate((element, value) => {
    element.scrollTop = value.fraction * (element.scrollHeight - element.clientHeight);
  }, { fraction: current.scrollMax > 0 ? offset / current.scrollMax : 0 });
  await expect.poll(async () => Math.abs((await layout(page)).scrollTop - offset)).toBeLessThanOrEqual(1);
  const before = await layout(page);
  const distractor = before.items.find(item => item.id === candidate.distractor.id)!;
  expect(distractor.hitPoint.x).toBeGreaterThan(0);
  expect(distractor.hitPoint.x).toBeLessThan(before.width);
  expect(distractor.hitPoint.y).toBeGreaterThan(0);
  expect(distractor.hitPoint.y).toBeLessThan(before.height);
  const progressBefore = await page.getByTestId('hidden-object-progress').textContent();
  const cardBefore = await card.getAttribute('aria-label');
  if (testInfo.project.use.hasTouch) await host(page).locator('canvas').tap({ position: distractor.hitPoint });
  else await host(page).locator('canvas').click({ position: distractor.hitPoint });
  // Let Phaser process the real pointer release before checking the unchanged session.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
  expect((await layout(page)).items.filter(item => item.found)).toHaveLength(0);
  await expect(page.getByTestId('hidden-object-progress')).toHaveText(progressBefore!);
  await expect(card).toHaveAttribute('aria-label', cardBefore!);
  await noCompletion(page);
  await solve(page, Boolean(testInfo.project.use.hasTouch));
  await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
});

test('首次盘面有明显正负旋转，物件中心分散而非对齐成规则行列', async ({ page }) => {
  await openRound(page);
  const initial = await layout(page);
  expect(initial.items).toHaveLength(totalItems);
  expect(initial.items.every(item => Number.isFinite(item.rotation))).toBe(true);
  expect(initial.items.filter(item => item.rotation > 3 * Math.PI / 180).length).toBeGreaterThanOrEqual(5);
  expect(initial.items.filter(item => item.rotation < -3 * Math.PI / 180).length).toBeGreaterThanOrEqual(5);

  // A broad distribution of centres catches visible alignment without repeating the placement algorithm.
  // Fifty equal histogram intervals are deliberately unrelated to the spatial-index grid's dimensions.
  const occupiedX = new Set(initial.items.map(item => Math.floor((item.x + item.width / 2) / level.board.width * 50)));
  const occupiedY = new Set(initial.items.map(item => Math.floor((item.y + item.height / 2) / level.board.height * 50)));
  expect(occupiedX.size).toBeGreaterThan(24);
  expect(occupiedY.size).toBeGreaterThan(20);
  await noCompletion(page);
});

test('加载后未开始不扣时，主动暂停和失焦都停表，恢复需要主动操作', async ({ page }) => {
  await freezeReadyClock(page);
  await page.clock.fastForward(20_000);
  await expect(timer(page)).toContainText(clockText(level.timeLimitSeconds));
  await start(page);
  await page.clock.fastForward(5_000);
  await expect(timer(page)).toContainText(clockText(level.timeLimitSeconds - 5));
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
  const pausedTime = await timer(page).textContent();
  await page.clock.fastForward(30_000);
  expect(await timer(page).textContent()).toBe(pausedTime);
  await expect(host(page).locator('canvas')).not.toBeVisible();
  await expect(scrollbar(page)).not.toBeVisible();
  await page.getByRole('button', { name: '继续寻找', exact: true }).click();
  await page.clock.fastForward(1_000);
  await expect(timer(page)).toContainText(clockText(level.timeLimitSeconds - 6));
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
  const blurredTime = await timer(page).textContent();
  await page.clock.fastForward(15_000);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
  expect(await timer(page).textContent()).toBe(blurredTime);
  await noCompletion(page);
});

test('开始按钮事件后立即失焦，延迟执行的开始命令不得在失焦期间启动计时', async ({ page }) => {
  await freezeReadyClock(page);
  const before = await timer(page).textContent();
  await page.evaluate(() => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('button')]
      .find(element => element.textContent?.trim() === '开始寻找');
    if (!button) throw new Error('没有找到开始寻找按钮');
    // Keep both native events in one JS task, before React's deferred command effect can run.
    button.click();
    window.dispatchEvent(new Event('blur'));
  });
  await page.clock.fastForward(5_000);
  await expect(screen(page)).toHaveAttribute('data-hidden-status', /^(ready|paused)$/);
  expect(await timer(page).textContent()).toBe(before);
  await noCompletion(page);

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.clock.fastForward(2_000);
  await expect(screen(page)).toHaveAttribute('data-hidden-status', /^(ready|paused)$/);
  expect(await timer(page).textContent()).toBe(before);
  const status = await screen(page).getAttribute('data-hidden-status');
  await page.getByRole('button', { name: status === 'ready' ? '开始寻找' : '继续寻找', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
  await page.clock.fastForward(1_000);
  await expect(timer(page)).toContainText(clockText(level.timeLimitSeconds - 1));
  await noCompletion(page);
});

test('配置时限耗尽停止寻找且不保存完成，重试恢复完整时限', async ({ page }) => {
  await freezeReadyClock(page);
  await start(page);
  await page.clock.fastForward(level.timeLimitSeconds * 1000 + 100);
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'timeout');
  await expect(timer(page)).toContainText('0:00');
  await expect(page.getByRole('heading', { name: '时间到了', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '提示', exact: true })).toBeDisabled();
  await expect(host(page).locator('canvas')).not.toBeVisible();
  await noCompletion(page);
  const seed = (await layout(page)).seed;
  await page.getByRole('button', { name: '重试本局', exact: true }).click();
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
  await expect(timer(page)).toContainText(clockText(level.timeLimitSeconds));
  expect((await layout(page)).seed).toBe(seed);
  await noCompletion(page);
});

test('图片加载失败不启动计时，恢复网络后可以原页重试', async ({ page }) => {
  await page.route(poolRoute, route => route.abort());
  await page.goto(playUrl);
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'error', { timeout: imageLoadTimeout });
  await expect(page.getByRole('button', { name: '重新加载', exact: true })).toBeEnabled();
  await expect(timer(page)).toContainText(clockText(level.timeLimitSeconds));
  await expect(page.getByRole('button', { name: '开始寻找', exact: true })).toHaveCount(0);
  await noCompletion(page);
  await page.unroute(poolRoute);
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await waitReady(page);
  await start(page);
  expect((await layout(page)).items).toHaveLength(totalItems);
  await noCompletion(page);
});

test('长卷只显示局部，滚轮、触屏拖动及独立滚动条均能到底，提示会滚到目标', async ({ page }, testInfo) => {
  await page.setViewportSize(compactPlayableViewport(testInfo));
  await freezeReadyClock(page);
  const prepared = await layout(page);
  expect(prepared.scrollMax).toBeGreaterThan(0);
  await expect(scrollbar(page)).not.toBeVisible();
  // A DOM scrollbar event while the start overlay is present must not browse the canvas.
  await scrollbar(page).evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.clock.runFor(50);
  expect((await layout(page)).scrollTop).toBe(prepared.scrollTop);
  await start(page);
  await settled(page);
  const initial = await layout(page);
  const visible = initial.items.filter(item => item.displayRect.y + item.displayRect.height > 0 && item.displayRect.y < initial.height);
  expect(visible.length).toBeGreaterThan(0);
  expect(visible.length).toBeLessThan(totalItems);
  await expect(scrollbar(page)).toBeVisible();
  await expect.poll(() => scrollbar(page).evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);

  // Native scrolling changes the real scrollbar first; the UI forwards its offset to Phaser.
  await nativeScrollEdge(page, true, true);
  expect(placement(await layout(page))).toEqual(placement(initial));
  await nativeScrollEdge(page, false, true);
  const canvas = (await host(page).locator('canvas').boundingBox())!;
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.wheel(0, initial.scrollMax * 4);
  await page.clock.runFor(50);
  await expect.poll(async () => {
    const current = await layout(page);
    return Math.abs(current.scrollMax - current.scrollTop);
  }).toBeLessThanOrEqual(1);

  await nativeScrollEdge(page, false, true);
  // Mobile Chromium uses actual touch input; desktop Chromium/WebKit use the same canvas drag path with a mouse.
  for (let gesture = 0; gesture < 12; gesture++) {
    const current = await layout(page);
    if (current.scrollMax - current.scrollTop <= 1) break;
    await dragCanvasUp(page, Boolean(testInfo.project.use.hasTouch));
  }
  await expect.poll(async () => {
    const current = await layout(page);
    return Math.abs(current.scrollMax - current.scrollTop);
  }).toBeLessThanOrEqual(1);
  expect((await layout(page)).items.filter(item => item.found)).toHaveLength(0);
  expect(placement(await layout(page))).toEqual(placement(initial));

  const firstUnfoundPerGroup = (current: HiddenLayout) => [...new Set(current.items.flatMap(item => item.groupId ? [item.groupId] : []))]
    .map(group => current.items.find(item => item.groupId === group && !item.found)!);
  let beforeHint = await layout(page);
  let offscreen = firstUnfoundPerGroup(beforeHint).find(item => item.hitPoint.y < 0 || item.hitPoint.y >= beforeHint.height);
  if (!offscreen) {
    await nativeScrollEdge(page, false, true);
    beforeHint = await layout(page);
    offscreen = firstUnfoundPerGroup(beforeHint).find(item => item.hitPoint.y < 0 || item.hitPoint.y >= beforeHint.height);
  }
  expect(offscreen).toBeTruthy();
  await page.locator(`[data-testid="hidden-object-task"][data-task-id="${offscreen!.groupId}"]`).click();
  await expect(page.locator(`[data-testid="hidden-object-task"][data-task-id="${offscreen!.groupId}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '提示', exact: true }).click();
  await expect(page.getByTestId('hidden-object-hint-status')).toContainText('点击红框中的目标物件');
  const afterHint = await layout(page);
  const target = afterHint.items.find(item => item.id === offscreen!.id)!;
  expect(Math.abs(afterHint.scrollTop - beforeHint.scrollTop)).toBeGreaterThan(1);
  expect(target.hitPoint.y).toBeGreaterThanOrEqual(0);
  expect(target.hitPoint.y).toBeLessThan(afterHint.height);
  expect(afterHint.items.filter(item => item.found)).toHaveLength(0);
  await expect.poll(async () => {
    const current = await layout(page);
    const fraction = await scrollbar(page).evaluate(element => element.scrollTop / Math.max(1, element.scrollHeight - element.clientHeight));
    return Math.abs(fraction - current.scrollTop / current.scrollMax);
  }).toBeLessThan(.002);
  await page.clock.fastForward(2_000);
  await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
  expect(await timer(page).locator('strong').textContent()).not.toBe(clockText(level.timeLimitSeconds));
  await fits(page);
  await noCompletion(page);
});

test('桌面缩放或手机长卷在竖屏中断后保留抽样与发现，支持视口无页面滚动', async ({ page }, testInfo) => {
  await page.setViewportSize(compactPlayableViewport(testInfo));
  await openRound(page);
  await start(page);
  const expectedZoom = isMobileProject(testInfo) ? 1 : 2;
  if (isMobileProject(testInfo)) {
    await expect(page.getByRole('group', { name: '盘面缩放', exact: true })).toBeHidden();
    await expect.poll(async () => (await layout(page)).scrollMax).toBeGreaterThan(0);
    await nativeScrollEdge(page, true);
  } else {
    await page.getByRole('button', { name: '2×', exact: true }).click();
    await expect.poll(async () => (await layout(page)).zoom).toBe(2);
  }
  await findOne(page, Boolean(testInfo.project.use.hasTouch), 1);
  const initial = await layout(page);
  if (isMobileProject(testInfo)) {
    await page.setViewportSize(mobilePortraitViewport);
    await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
    await page.setViewportSize(compactMobileLandscapeViewport);
    await expect(page.getByTestId('mobile-landscape-gate')).not.toBeVisible();
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'paused');
    await page.getByRole('button', { name: '继续寻找', exact: true }).click();
  }
  let previous = initial;
  for (const viewport of [mobileLandscapeViewport, compactPlayableViewport(testInfo)]) {
    await page.setViewportSize(viewport);
    await settled(page);
    await expect(screen(page)).toHaveAttribute('data-hidden-status', 'running');
    const current = await layout(page);
    expect(current.seed).toBe(initial.seed);
    expect(contents(current)).toEqual(contents(initial));
    expect(current.items.filter(item => item.found).map(item => item.id)).toEqual(initial.items.filter(item => item.found).map(item => item.id));
    expect(current.zoom).toBe(expectedZoom);
    const expectedScroll = Math.min(current.scrollMax, previous.scrollTop / previous.scale * current.scale);
    expect(Math.abs(current.scrollTop - expectedScroll)).toBeLessThanOrEqual(1);
    await fits(page);
    previous = current;
  }
  await noCompletion(page);
});

test('只有找物显示倒计时，已有找不同、拼图和填色保持不限时', async ({ page }) => {
  await openRound(page);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await start(page);
  await expect(page.getByRole('timer')).toHaveCount(1);
  for (const [id, readySelector] of [
    ['patterns-intro', '[data-testid="phaser-player"] canvas'],
    ['puzzle-lotus-ceiling', '[data-testid="phaser-player"] canvas'],
    ['coloring-three-rabbits', '[data-testid="phaser-player"] canvas'],
  ]) {
    await page.goto(`/#/play/${id}`);
    await expect(page.locator(readySelector)).toBeVisible({ timeout: imageLoadTimeout });
    await expect(page.getByRole('timer')).toHaveCount(0);
    await expect(page.getByTestId('hidden-object-timer')).toHaveCount(0);
  }
});

test('找物成功但存档受限时保留结果，恢复后可重试保存', async ({ page }, testInfo) => {
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { __hiddenObjectStorageSetter: typeof original }).__hiddenObjectStorageSetter = original;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('测试模拟不可写', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, progressKey);
  await openRound(page);
  await start(page);
  await solve(page, Boolean(testInfo.project.use.hasTouch));
  await expect(page.getByRole('heading', { name: '寻宝完成', exact: true })).toBeVisible();
  await expect(page.getByTestId('save-error')).toBeVisible();
  await inside(page, page.getByTestId('retry-save'));
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as unknown as { __hiddenObjectStorageSetter: typeof Storage.prototype.setItem }).__hiddenObjectStorageSetter;
  });
  await page.getByTestId('retry-save').click();
  await expect(page.getByTestId('save-error')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey)).toEqual([level.id]);
});

test.describe('高清画布', () => {
  test.use({ deviceScaleFactor: 2 });

  test('双倍像素画布保持真实点击、长卷滚动与支持视口变化后的坐标一致', async ({ page }, testInfo) => {
    await openRound(page);
    const assertDensity = async () => {
      const current = await layout(page);
      const backing = await host(page).locator('canvas').evaluate(element => ({ width: (element as HTMLCanvasElement).width, height: (element as HTMLCanvasElement).height }));
      expect(backing).toEqual({ width: current.width * 2, height: current.height * 2 });
      expect(current.renderScale).toEqual({ x: 2, y: 2 });
    };
    await assertDensity();
    await start(page);
    if (isMobileProject(testInfo)) {
      await expect(page.getByRole('group', { name: '盘面缩放', exact: true })).toBeHidden();
      expect((await layout(page)).zoom).toBe(1);
    } else {
      await page.getByRole('button', { name: '2×', exact: true }).click();
      await expect.poll(async () => (await layout(page)).zoom).toBe(2);
    }
    await nativeScrollEdge(page, true);
    await findOne(page, Boolean(testInfo.project.use.hasTouch), 1);
    const initial = await layout(page);
    await page.setViewportSize(isMobileProject(testInfo) ? compactMobileLandscapeViewport : mobileLandscapeViewport);
    await settled(page);
    await assertDensity();
    const resized = await layout(page);
    expect(resized.seed).toBe(initial.seed);
    expect(resized.items.filter(item => item.found).map(item => item.id)).toEqual(initial.items.filter(item => item.found).map(item => item.id));
    await nativeScrollEdge(page, false);
    await findOne(page, Boolean(testInfo.project.use.hasTouch), 2);
    await fits(page);

    await page.goto('/#/play/patterns-intro');
    await expect(host(page).locator('canvas')).toBeVisible({ timeout: imageLoadTimeout });
    const legacy = await host(page).locator('canvas').evaluate(element => ({ width: (element as HTMLCanvasElement).width, cssWidth: element.getBoundingClientRect().width }));
    // The common host now gives every 2D game the same capped DPR backing density.
    expect(Math.abs(legacy.width - legacy.cssWidth * 2)).toBeLessThanOrEqual(1);
  });
});
