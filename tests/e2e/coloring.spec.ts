import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { AssetDefinition, ColoringLevel, Level, SpotDifferenceLevel } from '../../src/types';

const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);
const coloringLevels = levels.filter((level): level is ColoringLevel => level.gameType === 'coloring');
const squareLevels = levels.filter((level): level is SpotDifferenceLevel => level.gameType === 'spot-difference' && level.id !== 'patterns-intro');
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const artworkKey = 'dunhuang:artworks:v1';
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
    await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 0.999 });
  }
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

test('真实目录开放三关找不同、三关拼图和四关填色', async ({ page }) => {
  expect(coloringLevels).toHaveLength(4);
  expect(squareLevels).toHaveLength(2);
  await page.goto('/#/theme/patterns/games');
  await expect(page.getByRole('link', { name: '填色', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '拼图', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '填色', exact: true }).click();
  await expect(page.getByRole('heading', { name: '填色关卡', exact: true })).toBeVisible();
  await expect(page.getByTestId('level-catalog-summary')).toHaveText('共 4 关4 关开放');
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
    await page.getByRole('button', { name: `选择${swatch.label}`, exact: true }).click();
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
  await page.getByRole('button', { name: `选择${second.label}`, exact: true }).click();
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

test('缩放拖动和旋转保留作品，拖动不能误填色', async ({ page }) => {
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
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expectFits(page);
    await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
    await expect.poll(() => currentColors(page, level)).toEqual(saved);
  }
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
  await page.getByRole('button', { name: `选择${level.palette[1].label}`, exact: true }).click();
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
  await page.addInitScript(({ workKey, gameKey, id, version, snapshot, progress }) => {
    if (localStorage.getItem(workKey) === null) localStorage.setItem(workKey, JSON.stringify({ version: 1, artworks: { [id]: { [version]: snapshot } } }));
    if (localStorage.getItem(gameKey) === null) localStorage.setItem(gameKey, JSON.stringify(progress));
  }, { workKey: artworkKey, gameKey: progressKey, id: level.id, version: oldVersion, snapshot: oldSnapshot, progress: oldProgress });
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
  const retained = await page.evaluate(({ key, id }) => JSON.parse(localStorage.getItem(key)!).artworks[id], { key: artworkKey, id: level.id });
  expect(Object.keys(retained).sort()).toEqual([oldVersion, level.artworkVersion].sort());
  expect(retained[oldVersion]).toEqual(oldSnapshot);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), progressKey)).toEqual(oldProgress);
  await page.reload();
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  await expect(page.getByTestId('coloring-status')).toContainText('已着色 1 个区域');
  expect(await page.evaluate(({ key, id, version }) => JSON.parse(localStorage.getItem(key)!).artworks[id][version],
    { key: artworkKey, id: level.id, version: oldVersion })).toEqual(oldSnapshot);
});

test('方图上侧4倍观察保持原生比例，返回游戏不增加发现', async ({ page }) => {
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
  const opener = page.getByRole('button', { name: '放大观察', exact: true });
  await opener.focus(); await opener.press('Enter');
  const inspector = page.getByTestId('art-inspector');
  const upper = inspector.getByRole('button', { name: '上侧 4×', exact: true });
  await upper.click();
  await expect(upper).toHaveAttribute('aria-pressed', 'true');
  const picture = page.getByTestId('art-inspector-image');
  await expect(picture).toHaveAttribute('data-view', 'upper-detail');
  await expect(picture).toHaveCSS('background-size', '400% 400%');
  await expect(picture).toHaveCSS('background-position', '50% 29%');
  const choices = await inspector.locator('.art-inspector-views button').allTextContents();
  expect(choices.indexOf('上侧 4×')).toBe(choices.indexOf('中央 2×') + 1);
  await expect.poll(async () => (await picture.boundingBox())?.width ?? 0).toBeGreaterThan(40);
  const bounds = (await picture.boundingBox())!;
  expect(bounds.width / bounds.height).toBeCloseTo(1, 2);
  await inspector.getByRole('button', { name: '变化图 B', exact: true }).click();
  await picture.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await inspector.getByRole('button', { name: '返回游戏', exact: true }).click();
  await expect(inspector).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', before);
  expect(await page.evaluate(key => localStorage.getItem(key), progressKey)).toBeNull();
});

for (const level of squareLevels) {
  test(`${level.title}保持1254方图原比例，可发现五处并单独保存`, async ({ page }) => {
    const source = assets.find(asset => asset.id === level.baseAssetId)!;
    expect([source.width, source.height]).toEqual([1254, 1254]);
    await page.goto(`/#/play/${level.id}`);
    await expect(page.getByRole('button', { name: '给我提示' })).toBeEnabled({ timeout: imageLoadTimeout });
    const host = page.getByTestId('phaser-player');
    const layout = JSON.parse((await host.getAttribute('data-layout'))!);
    expect(layout.reference.width / layout.reference.height).toBeCloseTo(1, 6);
    await page.getByRole('button', { name: '放大观察', exact: true }).click();
    const modalImage = page.getByTestId('art-inspector-image');
    const imageBox = (await modalImage.boundingBox())!;
    expect(imageBox.width / imageBox.height).toBeCloseTo(1, 2);
    await page.getByRole('button', { name: '关闭放大观察', exact: true }).click();
    for (let index = 0; index < level.differences.length; index++) {
      const current = JSON.parse((await host.getAttribute('data-layout'))!);
      const image = current[index % 2 ? 'edited' : 'reference'], region = level.differences[index].region;
      await host.locator('canvas').click({ position: { x: image.x + (region.x + region.width / 2) * image.width,
        y: image.y + (region.y + region.height / 2) * image.height } });
      if (index < level.differences.length - 1) await expect(page.getByTestId('game-progress')).toHaveAttribute('aria-label', `已找到 ${index + 1} 处，共 5 处`);
    }
    await expect(page).toHaveURL(new RegExp(`/#/result/${level.id}$`));
    expect(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).completed), progressKey)).toEqual([level.id]);
  });
}
