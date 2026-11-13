import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { AssetDefinition, ColoringLevel, Level, SpotDifferenceLevel } from '../../src/types';
import { isMobileProject, mobileLandscapeViewport, mobilePortraitViewport, supportedResizeViewports } from './supported-viewports';
import { dragSpotView, expectSpotSynchronized, readSpotView, setSpotZoom } from './spot-view-controls';

const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);
const coloringLevels = levels.filter((level): level is ColoringLevel => level.gameType === 'coloring');
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const observationLevels = levels.filter((level): level is SpotDifferenceLevel => level.gameType === 'spot-difference');
const squareLevels = observationLevels.filter(level => {
  const image = assets.find(asset => asset.id === level.baseAssetId);
  return image && image.width === image.height;
});
const artworkKey = 'dunhuang:artworks:v2';
const legacyArtworkKey = 'dunhuang:artworks:v1';
const progressKey = 'dunhuang:progress:v1';
const imageLoadTimeout = 45_000;
test.setTimeout(60_000);

interface Rect { x: number; y: number; width: number; height: number }
interface ColoringLayout { width: number; height: number; image: Rect; zoom: number; animating: boolean; reducedMotion: boolean }
const usableRegion = (level: ColoringLevel) => [...level.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0];

async function expectFits(page: Page) {
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) <= innerHeight + 1
    && Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth + 1
    && scrollX === 0 && scrollY === 0)).toBe(true);
  await expect(page.getByTestId('phaser-player').locator('canvas')).toBeInViewport({ ratio: 0.999 });
  for (const name of ['完成作品', '撤销', '清空重涂', '参考配色']) {
    const control = page.getByRole('button', { name, exact: true });
    await expect(control).toBeInViewport({ ratio: 0.999 });
    const bounds = (await control.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByRole('button', { name: '更多', exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: '填色操作', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('coloring-palette')).toBeInViewport({ ratio: 0.999 });
  const reference = page.getByTestId('coloring-inline-reference');
  const referenceImage = reference.locator('img');
  await expect(reference).toBeInViewport({ ratio: 0.999 });
  await expect(referenceImage).toBeInViewport({ ratio: 0.999 });
  await expect.poll(() => referenceImage.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const referenceBounds = (await referenceImage.boundingBox())!;
  const paint = JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!).image as Rect;
  expect(referenceBounds.width).toBeLessThan(paint.width);
  expect(referenceBounds.height).toBeLessThan(paint.height);
  const naturalRatio = await referenceImage.evaluate(image => (image as HTMLImageElement).naturalWidth / (image as HTMLImageElement).naturalHeight);
  expect(referenceBounds.width / referenceBounds.height).toBeCloseTo(naturalRatio, 2);
}

async function startColoring(page: Page, level: ColoringLevel) {
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-game-type', 'coloring');
  const reference = assets.find(asset => asset.id === level.referenceAssetId)!;
  const referenceUrl = new URL(reference.path, page.url()); referenceUrl.searchParams.set('v', reference.version);
  await expect(page.getByTestId('coloring-inline-reference').locator('img')).toHaveAttribute('src', referenceUrl.href);
}

async function chooseColor(page: Page, label: string) {
  const palette = page.getByRole('dialog', { name: '完整色盘', exact: true });
  let choice = await palette.isVisible() ? palette.getByRole('button', { name: `选择${label}`, exact: true })
    : page.getByRole('button', { name: `选择${label}`, exact: true });
  if (!await choice.isVisible()) {
    await page.getByRole('button', { name: '完整色盘', exact: true }).click();
    await expect(palette).toBeVisible();
    choice = palette.getByRole('button', { name: `选择${label}`, exact: true });
  }
  await expect(choice).toBeInViewport({ ratio: .999 });
  const bounds = (await choice.boundingBox())!;
  expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
  await choice.click();
  if (await palette.isVisible()) {
    const close = palette.getByRole('button', { name: '关闭完整色盘', exact: true });
    await expect(close).toBeInViewport({ ratio: .999 });
    const rect = (await close.boundingBox())!;
    expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44);
    await close.click();
    await expect(palette).toBeHidden();
  }
}

async function currentColors(page: Page, level: ColoringLevel): Promise<Record<string, string>> {
  return page.evaluate(({ key, id, version }) => {
    const stored = JSON.parse(localStorage.getItem(key) ?? '{"artworks":{}}');
    return stored.artworks[id]?.[version]?.colors ?? {};
  }, { key: artworkKey, id: level.id, version: level.artworkVersion });
}

async function clickRegion(page: Page, level: ColoringLevel, region = usableRegion(level)) {
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!) as ColoringLayout;
  await host.locator('canvas').click({ position: {
    x: layout.image.x + region.point.x * layout.image.width,
    y: layout.image.y + region.point.y * layout.image.height,
  } });
}

async function assertMaskPoint(page: Page, level: ColoringLevel) {
  const map = assets.find(asset => asset.id === level.regionMapAssetId)!;
  const region = usableRegion(level);
  expect(await page.evaluate(async ({ path, point }) => {
    const image = new Image(); image.src = path; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    const pixel = context.getImageData(Math.floor(point.x * canvas.width), Math.floor(point.y * canvas.height), 1, 1).data;
    return pixel[0] + pixel[1] * 256 + pixel[2] * 65536;
  }, { path: map.path, point: region.point })).toBe(region.id);
}

async function recordAnimation(page: Page) {
  await page.getByTestId('phaser-player').evaluate(element => {
    const values: string[] = [];
    const observer = new MutationObserver(() => values.push((element as HTMLElement).dataset.animating ?? ''));
    observer.observe(element, { attributes: true, attributeFilter: ['data-animating'] });
    (window as unknown as { __coloringAnimationRecord: { values: string[]; observer: MutationObserver } }).__coloringAnimationRecord = { values, observer };
  });
}
async function recordedAnimation(page: Page) {
  return page.evaluate(() => (window as unknown as { __coloringAnimationRecord: { values: string[] } }).__coloringAnimationRecord.values);
}

test('真实目录开放五关找不同、三关拼图和五关填色', async ({ page }) => {
  const expectedColoringOrder = [
    'coloring-floral-scroll', 'coloring-lotus-rosette', 'coloring-deer-medallion',
    'coloring-three-rabbits', 'coloring-feitian-lotus',
  ];
  expect(coloringLevels.map(level => level.id).sort()).toEqual([...expectedColoringOrder].sort());
  expect(observationLevels).toHaveLength(5);
  expect(squareLevels).toHaveLength(3);
  await page.goto('/#/theme/patterns/games');
  await expect(page.getByRole('link', { name: '填色', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '拼图', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '填色', exact: true }).click();
  await expect(page.getByRole('heading', { name: '填色关卡', exact: true })).toBeVisible();
  await expect(page.getByTestId('level-catalog-summary')).toHaveText('共 5 关5 关开放');
  const cards = page.locator('.level-choice-card[data-status=available]');
  expect(await cards.evaluateAll(elements => elements.map(element => element.getAttribute('data-level-id'))))
    .toEqual(expectedColoringOrder);
});

for (const level of coloringLevels) {
  test(`${level.title}按真实mask安全点填色，完整适配且不提前通关`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await startColoring(page, level);
    await expectFits(page);
    await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeDisabled();
    await assertMaskPoint(page, level);
    const swatch = level.palette[0];
    await chooseColor(page, swatch.label);
    await clickRegion(page, level);
    await expect.poll(() => currentColors(page, level)).toEqual({ [usableRegion(level).id]: swatch.color.toLowerCase() });
    await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
    await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeEnabled();
    expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
    expect(errors).toEqual([]);
  });
}

test('填色支持参考查看、换色、撤销、可撤销清空、刷新恢复与作品PNG', async ({ page }) => {
  const level = coloringLevels[0]!;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startColoring(page, level);
  const region = usableRegion(level);
  const first = level.palette[0], second = level.palette[1];
  await expectFits(page);
  await clickRegion(page, level);
  await expect.poll(() => currentColors(page, level)).toEqual({ [region.id]: first.color.toLowerCase() });
  await page.getByRole('button', { name: '参考配色', exact: true }).click();
  const reference = page.getByRole('dialog', { name: '参考配色', exact: true });
  await expect(reference).toBeInViewport({ ratio: 0.999 });
  await expect(reference.locator('img')).toBeInViewport({ ratio: 0.999 });
  await reference.getByRole('button', { name: '继续填色', exact: true }).click();
  await expect(page.getByTestId('coloring-inline-reference')).toBeInViewport({ ratio: 0.999 });
  await expect.poll(() => currentColors(page, level)).toEqual({ [region.id]: first.color.toLowerCase() });
  await chooseColor(page, second.label);
  await clickRegion(page, level);
  await expect.poll(() => currentColors(page, level)).toEqual({ [region.id]: second.color.toLowerCase() });
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => currentColors(page, level)).toEqual({ [region.id]: first.color.toLowerCase() });
  await page.getByRole('button', { name: '清空重涂', exact: true }).click();
  await expect.poll(() => currentColors(page, level)).toEqual({});
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => currentColors(page, level)).toEqual({ [region.id]: first.color.toLowerCase() });
  await page.reload();
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
  await page.getByRole('button', { name: '完成作品', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
  await expect(page.getByRole('heading', { name: '作品完成', exact: true })).toBeVisible();
  const result = page.getByTestId('coloring-result-canvas');
  await expect(result).toBeVisible({ timeout: imageLoadTimeout });
  const line = assets.find(asset => asset.id === level.lineAssetId)!;
  const difference = await result.evaluate(async (canvas, { path, point, color }) => {
    const image = new Image(); image.src = path; await image.decode();
    const source = document.createElement('canvas'); source.width = image.naturalWidth; source.height = image.naturalHeight;
    source.getContext('2d')!.drawImage(image, 0, 0);
    const x = Math.floor(point.x * source.width), y = Math.floor(point.y * source.height);
    const original = source.getContext('2d')!.getImageData(x, y, 1, 1).data;
    const artwork = (canvas as HTMLCanvasElement).getContext('2d')!.getImageData(x, y, 1, 1).data;
    return [0, 1, 2].map(channel => Math.abs(artwork[channel] - Math.round(original[channel] * parseInt(color.slice(1 + channel * 2, 3 + channel * 2), 16) / 255)));
  }, { path: line.path, point: region.point, color: first.color });
  expect(Math.max(...difference)).toBeLessThanOrEqual(2);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出PNG', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('.png');
  const png = readFileSync((await download.path())!);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([line.width, line.height]);
  expect(await page.evaluate(({ key, id }) => Boolean(JSON.parse(localStorage.getItem(key)!).completed[id]), { key: progressKey, id: level.id })).toBe(true);
  await page.reload();
  await expect(page.getByTestId('coloring-result-canvas')).toBeVisible({ timeout: imageLoadTimeout });
});

test('缩放拖动及窗口变化或手机竖屏中断保留作品，拖动不能误填色', async ({ page }, testInfo) => {
  const level = coloringLevels[0]!;
  await startColoring(page, level);
  await clickRegion(page, level);
  const saved = { [usableRegion(level).id]: level.palette[0].color.toLowerCase() };
  await expect.poll(() => currentColors(page, level)).toEqual(saved);
  await page.getByRole('button', { name: '3×', exact: true }).click();
  await expect.poll(async () => JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!).zoom).toBe(3);
  const box = (await page.getByTestId('phaser-player').locator('canvas').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 5 }); await page.mouse.up();
  await expect.poll(() => currentColors(page, level)).toEqual(saved);
  await page.getByRole('button', { name: '1×', exact: true }).click();
  if (isMobileProject(testInfo)) {
    await page.setViewportSize(mobilePortraitViewport);
    await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
    await page.setViewportSize(mobileLandscapeViewport);
    await expect(page.getByTestId('mobile-landscape-gate')).not.toBeVisible();
  }
  for (const viewport of supportedResizeViewports(testInfo)) {
    await page.setViewportSize(viewport);
    await expectFits(page);
    await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
    await expect.poll(() => currentColors(page, level)).toEqual(saved);
  }
});

test('电脑填色滚轮以鼠标位置连续缩放，保留倍率按钮且不改作品或滚动整页', async ({ page }) => {
  const level = coloringLevels.find(level => level.id === 'coloring-three-rabbits')!;
  await page.setViewportSize({ width: 1279, height: 925 });
  await startColoring(page, level);
  await clickRegion(page, level);
  const saved = { [usableRegion(level).id]: level.palette[0].color.toLowerCase() };
  await expect.poll(() => currentColors(page, level)).toEqual(saved);
  const canvas = page.getByTestId('phaser-player').locator('canvas');
  const element = await canvas.elementHandle();
  const read = async () => JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!) as ColoringLayout;
  const bounds = (await canvas.boundingBox())!;
  const mouse = { x: Math.round(bounds.x + bounds.width * .5), y: Math.round(bounds.y + bounds.height * .43) };
  await page.mouse.move(mouse.x, mouse.y);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await read()).zoom).toBeGreaterThan(1);
  expect((await read()).zoom).toBeLessThan(2);
  await page.getByRole('button', { name: '2×', exact: true }).click();
  await expect.poll(async () => (await read()).zoom).toBe(2);
  const before = await read();
  const point = { x: (mouse.x - bounds.x) * before.width / bounds.width, y: (mouse.y - bounds.y) * before.height / bounds.height };
  const source = { x: (point.x - before.image.x) / before.image.width, y: (point.y - before.image.y) / before.image.height };
  await page.mouse.move(mouse.x, mouse.y);
  await page.mouse.wheel(0, -90);
  await expect.poll(async () => (await read()).zoom).toBeGreaterThan(2);
  const after = await read();
  expect(after.zoom).toBeLessThan(3);
  expect((point.x - after.image.x) / after.image.width).toBeCloseTo(source.x, 4);
  expect((point.y - after.image.y) / after.image.height).toBeCloseTo(source.y, 4);
  await page.mouse.wheel(0, -5000);
  await expect.poll(async () => (await read()).zoom).toBe(3);
  await expect(page.getByRole('button', { name: '3×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (let i = 0; i < 3; i++) {
    const previous = (await read()).zoom;
    await page.mouse.wheel(0, 5000);
    await expect.poll(async () => (await read()).zoom).toBeLessThan(previous);
  }
  await expect.poll(async () => (await read()).zoom).toBe(1);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await element!.evaluate(element => element.isConnected)).toBe(true);
  expect(await currentColors(page, level)).toEqual(saved);
  await expectFits(page);
  await page.getByRole('button', { name: '参考配色', exact: true }).click();
  const covered = await read();
  await page.mouse.move(mouse.x, mouse.y);
  await page.mouse.wheel(0, -100);
  await page.getByRole('button', { name: '关闭参考配色', exact: true }).click();
  expect((await read()).zoom).toBe(covered.zoom);
  expect(await currentColors(page, level)).toEqual(saved);
  // Zooming cannot create extra undo steps or submit a painting.
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(() => currentColors(page, level)).toEqual({});
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeDisabled();
  expect(await page.evaluate(({ key, id }) => Boolean(JSON.parse(localStorage.getItem(key) ?? '{"completed":{}}').completed[id]),
    { key: progressKey, id: level.id })).toBe(false);
});

test('200ms填色动效存在，系统或游戏减少动效时立即换色', async ({ page }) => {
  const level = coloringLevels[0]!;
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await startColoring(page, level);
  await recordAnimation(page); await clickRegion(page, level);
  await expect.poll(async () => (await recordedAnimation(page)).includes('true')).toBe(true);
  await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-animating', 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-reduced-motion', 'true');
  await chooseColor(page, level.palette[1].label);
  await recordAnimation(page); await clickRegion(page, level);
  await expect.poll(() => currentColors(page, level)).toEqual({ [usableRegion(level).id]: level.palette[1].color.toLowerCase() });
  expect(await recordedAnimation(page)).not.toContain('true');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#/settings');
  await page.getByRole('checkbox', { name: '减少动效' }).check();
  await startColoring(page, level);
  await expect(page.getByTestId('phaser-player')).toHaveAttribute('data-reduced-motion', 'true');
});

test('作品保存失败如实显示并可重试，不冒充写入旧通关结构', async ({ page }) => {
  const level = coloringLevels[0]!;
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { __artworkStorageSetter: typeof original }).__artworkStorageSetter = original;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Test storage quota', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, artworkKey);
  await startColoring(page, level); await clickRegion(page, level);
  await expect(page.getByTestId('artwork-save-error')).toContainText('尚未保存');
  expect(await page.evaluate(key => localStorage.getItem(key), artworkKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __artworkStorageSetter: typeof Storage.prototype.setItem }).__artworkStorageSetter; });
  await page.getByRole('button', { name: '重试保存作品', exact: true }).click();
  await expect(page.getByTestId('artwork-save-error')).toHaveCount(0);
  await expect.poll(() => currentColors(page, level)).toEqual({ [usableRegion(level).id]: level.palette[0].color.toLowerCase() });
  await expectFits(page);
});

test('完成作品时保存失败，重试成功后才进入结果并记录完成', async ({ page }) => {
  const level = coloringLevels[0]!;
  await startColoring(page, level);
  await page.evaluate(() => localStorage.setItem('dunhuang:first-gallery:v1', '原三馆存档'));
  await clickRegion(page, level);
  await expect.poll(() => currentColors(page, level)).toEqual({ [usableRegion(level).id]: level.palette[0].color.toLowerCase() });
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { __artworkStorageSetter: typeof original }).__artworkStorageSetter = original;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Test storage quota', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, artworkKey);
  await page.getByRole('button', { name: '完成作品', exact: true }).click();
  await expect(page.getByTestId('artwork-save-error')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
  await page.evaluate(() => { Storage.prototype.setItem = (window as unknown as { __artworkStorageSetter: typeof Storage.prototype.setItem }).__artworkStorageSetter; });
  await page.getByRole('button', { name: '重试保存作品', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`#/result/${level.id}$`));
  await expect.poll(() => page.evaluate(({ key, id }) => Boolean(JSON.parse(localStorage.getItem(key) ?? '{}').completed?.[id]), { key: progressKey, id: level.id })).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('dunhuang:first-gallery:v1'))).toBe('原三馆存档');
});

test('区域图加载失败保留错误与重新加载入口', async ({ page }) => {
  const level = coloringLevels[0]!;
  const map = assets.find(asset => asset.id === level.regionMapAssetId)!;
  await page.route(`**${map.path}*`, route => route.abort());
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('alert')).toContainText('加载失败', { timeout: imageLoadTimeout });
  await page.unroute(`**${map.path}*`);
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await clickRegion(page, level);
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
});

test('旧版作品和通关记录保留，新线稿不冒充成品且新旧版本独立保存', async ({ page }) => {
  const level = coloringLevels[0]!;
  const oldVersion = 'v000-previous-test-artwork';
  const oldTimestamp = '2026-10-28T00:00:00.000Z';
  const oldSnapshot = { colors: { [usableRegion(level).id]: '#72408a' }, updatedAt: oldTimestamp, submittedAt: oldTimestamp };
  const oldProgress = { version: 1, completed: { 'patterns-intro': oldTimestamp, [level.id]: oldTimestamp }, settings: { reducedMotion: true } };
  const legacyRaw = JSON.stringify({ version: 1, artworks: { [level.id]: { [oldVersion]: oldSnapshot } } }, null, 2) + '\n';
  await page.addInitScript(({ workKey, gameKey, raw, progress }) => {
    if (localStorage.getItem(workKey) === null) localStorage.setItem(workKey, raw);
    if (localStorage.getItem(gameKey) === null) localStorage.setItem(gameKey, JSON.stringify(progress));
  }, { workKey: legacyArtworkKey, gameKey: progressKey, raw: legacyRaw, progress: oldProgress });
  await page.goto(`/#/result/${level.id}`);
  await expect(page.getByRole('heading', { name: '线稿已更新，旧作品已保留', exact: true })).toBeVisible();
  await expect(page.getByTestId('coloring-result-canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '作品完成', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '导出PNG', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '继续填色', exact: true }).click();
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 0 个区域');
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeDisabled();
  await clickRegion(page, level);
  await expect.poll(() => currentColors(page, level)).toEqual({ [usableRegion(level).id]: level.palette[0].color.toLowerCase() });
  const saved = await page.evaluate(({ key, id, version }) => {
    const data = JSON.parse(localStorage.getItem(key)!);
    return { version: data.version, artwork: data.artworks[id][version] };
  }, { key: artworkKey, id: level.id, version: level.artworkVersion });
  expect(saved.version).toBe(2);
  expect(saved.artwork.colors).toEqual({ [usableRegion(level).id]: level.palette[0].color.toLowerCase() });
  expect(saved.artwork.materials).toEqual({});
  expect(saved.artwork).not.toHaveProperty('submittedAt');
  expect(await page.evaluate(key => localStorage.getItem(key), legacyArtworkKey)).toBe(legacyRaw);
  expect(await page.evaluate(({ key, id, version }) => JSON.parse(localStorage.getItem(key)!).artworks[id][version],
    { key: legacyArtworkKey, id: level.id, version: oldVersion })).toEqual(oldSnapshot);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(oldProgress);
  await page.reload();
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
  expect(await currentColors(page, level)).toEqual(saved.artwork.colors);
  expect(await page.evaluate(key => localStorage.getItem(key), legacyArtworkKey)).toBe(legacyRaw);
  expect(await page.evaluate(({ key, id, version }) => JSON.parse(localStorage.getItem(key)!).artworks[id][version],
    { key: legacyArtworkKey, id: level.id, version: oldVersion })).toEqual(oldSnapshot);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(oldProgress);
});

test('方图主画布三倍观察上侧细节，双图同步且拖动复位不增加发现', async ({ page }) => {
  const level = squareLevels[0]!;
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('button', { name: '给我提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!);
  const region = level.differences[0].region;
  await host.locator('canvas').click({ position: { x: layout.reference.x + (region.x + region.width / 2) * layout.reference.width,
    y: layout.reference.y + (region.y + region.height / 2) * layout.reference.height } });
  const before = `已找到 1 处，共 ${level.differences.length} 处`;
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', before);
  await expect(page.getByRole('button', { name: '放大观察', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('art-inspector')).toHaveCount(0);
  await setSpotZoom(page, 3, true);
  await dragSpotView(page, 'reference', { x: 0, y: .35 });
  await dragSpotView(page, 'edited', { x: 0, y: .35 });
  const upper = await readSpotView(page);
  expect(upper.view.center.y).toBeLessThan(.4);
  expectSpotSynchronized(upper, 1);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', before);
  await setSpotZoom(page, 1);
  const restored = await readSpotView(page);
  expect(restored.view).toEqual({ zoom: 1, center: { x: .5, y: .5 } });
  expectSpotSynchronized(restored, 1);
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', before);
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
});

for (const level of squareLevels) {
  test(`${level.title}保持1254方图原比例，可按配置差异数完成并单独保存`, async ({ page }) => {
    const source = assets.find(asset => asset.id === level.baseAssetId)!;
    expect([source.width, source.height]).toEqual([1254, 1254]);
    await page.goto(`/#/play/${level.id}`);
    await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
    const host = page.getByTestId('phaser-player');
    const layout = JSON.parse((await host.getAttribute('data-layout'))!);
    expect(layout.reference.width / layout.reference.height).toBeCloseTo(1, 6);
    await expect(page.getByRole('button', { name: '放大观察', exact: true })).toHaveCount(0);
    await setSpotZoom(page, 2);
    expectSpotSynchronized(await readSpotView(page), 1);
    await dragSpotView(page, 'edited');
    expectSpotSynchronized(await readSpotView(page), 1);
    await setSpotZoom(page, 1);
    await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', `已找到 0 处，共 ${level.differences.length} 处`);
    for (let index = 0; index < level.differences.length; index++) {
      const current = JSON.parse((await host.getAttribute('data-layout'))!);
      const image = current[index % 2 ? 'edited' : 'reference'], region = level.differences[index].region;
      await host.locator('canvas').click({ position: { x: image.x + (region.x + region.width / 2) * image.width,
        y: image.y + (region.y + region.height / 2) * image.height } });
      if (index < level.differences.length - 1) await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', `已找到 ${index + 1} 处，共 ${level.differences.length} 处`);
    }
    await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
    expect(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey)).toEqual([level.id]);
  });
}
