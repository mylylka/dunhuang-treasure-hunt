import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { ColoringLevel, HiddenObjectLevel, Level, ProgressData } from '../../src/types';

const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json')).sort()
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);
const byId = (id: string) => levels.find(level => level.id === id)!;
const hiddenLevels = levels.filter((level): level is HiddenObjectLevel => level.gameType === 'hidden-object')
  .sort((a, b) => (a.chapter?.order ?? 99) - (b.chapter?.order ?? 99) || (a.chapter?.level ?? 99) - (b.chapter?.level ?? 99));
const progressKey = 'dunhuang:progress:v1';
const artworkKey = 'dunhuang:artworks:v2';
const legacyArtworkKey = 'dunhuang:artworks:v1';
const timestamp = '2026-11-03T00:00:00.000Z';
const paint = byId('coloring-grape-lotus') as ColoringLevel;
const paintRegion = [...paint.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0];
const existingProgress: ProgressData = {
  version: 1, completed: { 'patterns-scrolls': timestamp }, settings: { reducedMotion: true },
};
const resultCases = [
  { id: 'patterns-intro', next: 'patterns-lotus' },
  { id: 'patterns-scrolls', next: null },
  { id: 'puzzle-lotus-ceiling', next: 'puzzle-three-rabbits' },
  { id: 'puzzle-twin-dragons', next: null },
  { id: 'coloring-grape-lotus', next: 'coloring-grape-pomegranate' },
  { id: 'coloring-three-rabbits', next: null },
  { id: hiddenLevels[0].id, next: hiddenLevels[1]?.id ?? null },
  { id: hiddenLevels[hiddenLevels.length - 1].id, next: null },
  { id: 'music-apsara-shadow', next: null },
];
test.setTimeout(90_000);

const directory = (level: Level) => `#/theme/${level.themeId}/games/${level.gameType}`;
const progress = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), progressKey);
const artwork = (page: Page, level: ColoringLevel) => page.evaluate(({ key, id, version }) =>
  JSON.parse(localStorage.getItem(key) ?? '{"artworks":{}}').artworks[id]?.[version] ?? null,
{ key: artworkKey, id: level.id, version: level.artworkVersion });

async function seedExistingProgress(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: progressKey, value: existingProgress });
}

/** Test-context records only. No fixture is added to the production catalog or storage code. */
async function seedCompletedResultFixtures(page: Page) {
  const completed = Object.fromEntries(levels.map(level => [level.id, timestamp]));
  const artworks = Object.fromEntries(levels.filter((level): level is ColoringLevel => level.gameType === 'coloring')
    .map(level => [level.id, { [level.artworkVersion]: {
      colors: { [[...level.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0].id]: level.palette[0].color.toLowerCase() },
      updatedAt: timestamp, submittedAt: timestamp,
    } }]));
  await page.addInitScript(({ progressKey, legacyArtworkKey, completed, artworks }) => {
    localStorage.setItem(progressKey, JSON.stringify({ version: 1, completed, settings: { reducedMotion: true } }));
    localStorage.setItem(legacyArtworkKey, JSON.stringify({ version: 1, artworks }));
  }, { progressKey, legacyArtworkKey, completed, artworks });
  // A hash-only route change does not rerun init scripts or reload App's cached records.
  if (page.url().startsWith('http')) await page.reload();
}

async function expectFits(page: Page) {
  await expect.poll(() => page.evaluate(() => ({
    horizontal: Math.max(0, Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth - 1),
    vertical: Math.max(0, Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight - 1),
    x: Math.abs(scrollX), y: Math.abs(scrollY),
  }))).toEqual({ horizontal: 0, vertical: 0, x: 0, y: 0 });
}

async function expectTouchTarget(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeInViewport({ ratio: .999 });
  const bounds = (await locator.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
}

async function expectPlayNavigation(page: Page, previous: string | null, next: string | null) {
  const backward = page.getByTestId('level-previous'), forward = page.getByTestId('level-advance');
  for (const { control, label, id, attribute } of [
    { control: backward, label: '上一关', id: previous, attribute: 'data-previous-level-id' },
    { control: forward, label: '下一关', id: next, attribute: 'data-next-level-id' },
  ]) {
    await expectTouchTarget(control);
    await expect(control).toHaveText(label);
    if (id) {
      await expect(control).toHaveAttribute('href', `#/play/${id}`);
      await expect(control).toHaveAttribute(attribute, id);
      await expect(control).toBeEnabled();
    } else {
      await expect(control).toBeDisabled();
      expect(await control.getAttribute('href')).toBeNull();
      expect(await control.getAttribute(attribute)).toBeNull();
    }
  }
  const typography = (control: Locator) => control.evaluate(element => {
    const style = getComputedStyle(element);
    return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color };
  });
  expect(await typography(backward)).toEqual(await typography(forward));
}

async function openPlay(page: Page, id: string) {
  const level = byId(id);
  await page.goto(`/#/play/${id}`);
  const button = level.gameType === 'spot-difference' ? '给我提示'
    : level.gameType === 'puzzle' ? '拼图提示'
      : level.gameType === 'coloring' ? '1×'
        : level.gameType === 'hidden-object' ? '开始寻找' : '配对提示';
  await expect(page.getByRole('button', { name: button, exact: true })).toBeEnabled({ timeout: 45_000 });
  await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-game-type', level.gameType);
  if (level.gameType === 'hidden-object') {
    // The target preview is intentionally free of the in-play action rail.
    await expect(page.getByTestId('level-previous')).toBeHidden();
    await expect(page.getByTestId('level-advance')).toBeHidden();
    await page.getByRole('button', { name: '开始寻找', exact: true }).click();
    await expect(page.locator('[data-hidden-status]')).toHaveAttribute('data-hidden-status', 'running');
  }
}

async function expectResultAction(page: Page, id: string, next: string | null) {
  const level = byId(id);
  await page.goto(`/#/result/${id}`);
  const primary = page.getByTestId('result-primary-action');
  await expectTouchTarget(primary);
  await expect(primary).toHaveText(next ? '下一关' : '返回关卡');
  await expect(primary).toHaveAttribute('href', next ? `#/play/${next}` : directory(level));
  await expect(page.locator('.result-actions > :first-child')).toHaveAttribute('data-testid', 'result-primary-action');
  await expect(page.locator('.result-actions > .button-primary')).toHaveCount(1);
  if (next) await expect(primary).toHaveAttribute('data-next-level-id', next);
  else {
    expect(await primary.getAttribute('data-next-level-id')).toBeNull();
    await expect(page.getByRole('link', { name: '下一关', exact: true })).toHaveCount(0);
  }
  await expectFits(page);
}

test('找不同与拼图常驻上一关下一关，真实前后切换不写通关', async ({ page }) => {
  await seedExistingProgress(page);
  for (const [id, next] of [['patterns-intro', 'patterns-lotus'], ['puzzle-lotus-ceiling', 'puzzle-three-rabbits']]) {
    await openPlay(page, id);
    const skip = page.getByTestId('level-advance');
    await expectPlayNavigation(page, null, next);
    if (id === 'patterns-intro') {
      await expect(page.getByRole('button', { name: '放大观察', exact: true })).toHaveCount(0);
      await expect(page.locator('.art-inspector')).toHaveCount(0);
      await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-layout', /"view":\{"zoom":1/);
    }
    expect(await progress(page)).toEqual(existingProgress);
    await skip.click();
    await expect(page).toHaveURL(new RegExp(`/#/play/${next}$`));
    await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-game-type', byId(next).gameType);
    expect(await progress(page)).toEqual(existingProgress);
    const afterNext = id === 'patterns-intro' ? 'patterns-scrolls' : 'puzzle-twin-dragons';
    await expectPlayNavigation(page, id, afterNext);
    const previous = page.getByTestId('level-previous');
    await previous.focus(); await previous.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/#/play/${id}$`));
    await expectPlayNavigation(page, null, next);
    expect(await progress(page)).toEqual(existingProgress);
  }
});

test('真实填色后跳关保留自动保存作品，不提交也不新增通关', async ({ page }) => {
  await seedExistingProgress(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPlay(page, paint.id);
  await expectPlayNavigation(page, null, 'coloring-grape-pomegranate');
  const host = page.getByTestId('phaser-player');
  await expect.poll(async () => {
    const raw = await host.getAttribute('data-layout'), box = await host.boundingBox();
    if (!raw || !box) return false;
    const layout = JSON.parse(raw);
    return layout.width === Math.floor(box.width) && layout.height === Math.floor(box.height);
  }).toBe(true);
  const layout = JSON.parse((await host.getAttribute('data-layout'))!);
  await host.locator('canvas').click({ position: {
    x: layout.image.x + layout.image.width * paintRegion.point.x,
    y: layout.image.y + layout.image.height * paintRegion.point.y,
  } });
  await expect.poll(async () => (await artwork(page, paint))?.colors).toEqual({ [paintRegion.id]: paint.palette[0].color.toLowerCase() });
  const saved = await artwork(page, paint);
  expect(saved).not.toHaveProperty('submittedAt');
  expect(await progress(page)).toEqual(existingProgress);
  await page.getByTestId('level-advance').click();
  await expect(page).toHaveURL(/\/#\/play\/coloring-grape-pomegranate$/);
  expect(await artwork(page, paint)).toEqual(saved);
  expect(await artwork(page, paint)).not.toHaveProperty('submittedAt');
  expect(await progress(page)).toEqual(existingProgress);
});

test('五种玩法完成页统一优先下一关，末关与单关返回目录而不循环', async ({ page }) => {
  await seedCompletedResultFixtures(page);
  for (const { id, next } of resultCases) await expectResultAction(page, id, next);
});

for (const viewport of [{ width: 640, height: 300 }, { width: 852, height: 330 }]) {
  test(`手机${viewport.width}×${viewport.height}前后关边界和结果主按钮完整，双龙标题保持双字词组`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport,
      hasTouch: true, isMobile: true, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const playCases = [
        { id: 'patterns-intro', previous: null, next: 'patterns-lotus' },
        { id: 'patterns-scrolls', previous: 'patterns-lotus', next: null },
        { id: 'puzzle-twin-dragons', previous: 'puzzle-three-rabbits', next: null },
        { id: paint.id, previous: null, next: 'coloring-grape-pomegranate' },
        { id: 'coloring-three-rabbits', previous: 'coloring-lotus-camellia', next: null },
        { id: hiddenLevels[0].id, previous: null, next: hiddenLevels[1]?.id ?? null },
        { id: hiddenLevels[hiddenLevels.length - 1].id, previous: hiddenLevels[hiddenLevels.length - 2]?.id ?? null, next: null },
        { id: 'music-apsara-shadow', previous: null, next: null },
      ];
      for (const { id, previous, next } of playCases) {
        await openPlay(page, id);
        await expectPlayNavigation(page, previous, next);
        if (id === 'puzzle-twin-dragons') {
          const words = page.getByRole('heading', { name: '双龙藻井', exact: true }).locator('.level-title-word');
          await expect(words).toHaveText(['双龙', '藻井']);
          for (const word of await words.all()) {
            await expect(word).toBeInViewport({ ratio: .999 });
            await expect(word).toHaveCSS('white-space', 'nowrap');
          }
          await expect(page.getByRole('button', { name: '更多操作', exact: true })).toHaveCount(0);
          await expect(page.getByRole('dialog', { name: '更多操作', exact: true })).toHaveCount(0);
          await expectTouchTarget(page.getByRole('button', { name: '查看原图', exact: true }));
          await expectTouchTarget(page.getByRole('button', { name: '重新拼图', exact: true }));
        }
        await expectFits(page);
      }
      await seedCompletedResultFixtures(page);
      for (const { id, next } of resultCases) await expectResultAction(page, id, next);
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
