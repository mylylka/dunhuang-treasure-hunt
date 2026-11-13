import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { AssetDefinition, ColoringLevel, ColoringMaterialId, Level } from '../../src/types';
import { sampleColoringMaterial } from '../../src/games/coloring/materials';

const levels = readdirSync('src/content/levels').filter(path => path.endsWith('.json'))
  .map(path => JSON.parse(readFileSync(`src/content/levels/${path}`, 'utf8')) as Level)
  .filter((level): level is ColoringLevel => level.gameType === 'coloring');
const assets = JSON.parse(readFileSync('src/content/assets.json', 'utf8')) as AssetDefinition[];
const activeKey = 'dunhuang:artworks:v2', legacyKey = 'dunhuang:artworks:v1';
const gold: ColoringMaterialId = 'sparkle-gold-v001', silver: ColoringMaterialId = 'sparkle-silver-v001';
const orderedRegions = (level: ColoringLevel) => [...level.regions].sort((a, b) => b.pixelCount - a.pixelCount);
const host = (page: Page) => page.getByTestId('phaser-player');
test.setTimeout(60000);

async function open(page: Page, level: ColoringLevel) {
  await page.goto(`/#/play/${level.id}`);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45000 });
}
async function entry(page: Page, level: ColoringLevel) {
  return page.evaluate(({ key, id, version }) => JSON.parse(localStorage.getItem(key) ?? '{"artworks":{}}').artworks[id]?.[version],
    { key: activeKey, id: level.id, version: level.artworkVersion });
}
async function choose(page: Page, label: string) {
  const palette = page.getByRole('dialog', { name: '完整色盘', exact: true });
  let button = page.getByRole('button', { name: `选择${label}`, exact: true });
  if (!await button.isVisible()) {
    await page.getByRole('button', { name: '完整色盘', exact: true }).click();
    button = palette.getByRole('button', { name: `选择${label}`, exact: true });
  }
  await button.click();
  if (await palette.isVisible()) await palette.getByRole('button', { name: '关闭完整色盘', exact: true }).click();
}
async function paint(page: Page, region: ColoringLevel['regions'][number]) {
  const layout = JSON.parse((await host(page).getAttribute('data-layout'))!);
  await host(page).locator('canvas').click({ position: { x: layout.image.x + region.point.x * layout.image.width,
    y: layout.image.y + region.point.y * layout.image.height } });
  await expect(host(page)).toHaveAttribute('data-animating', 'false');
}
async function fits(page: Page) {
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY,
    horizontal: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    vertical: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight })))
    .toEqual({ x: 0, y: 0, horizontal: 0, vertical: 0 });
}

test('闪金闪银共同撤销、覆盖、擦除和清空，刷新不复活旧画且v1原文保留', async ({ page }) => {
  const level = levels.find(level => level.id === 'coloring-three-rabbits')!;
  const region = orderedRegions(level)[0];
  const legacy = `\n${JSON.stringify({ version: 1, artworks: { [level.id]: { [level.artworkVersion]: {
    colors: { [region.id]: '#72408a' }, updatedAt: '2026-10-28T00:00:00.000Z',
  } } } }, null, 2)}\n`;
  await page.addInitScript(({ key, raw }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: legacyKey, raw: legacy });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page, level);
  expect(await page.evaluate(key => localStorage.getItem(key), activeKey)).toBeNull();
  await choose(page, '闪金'); await paint(page, region);
  await expect.poll(async () => (await entry(page, level))?.materials).toEqual({ [region.id]: gold });
  await paint(page, region); // Identical material must not add an undo edit.
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(async () => (await entry(page, level))?.materials).toEqual({});
  expect((await entry(page, level)).colors).toEqual({ [region.id]: '#72408a' });
  await choose(page, '闪金'); await paint(page, region);
  await choose(page, '闪银'); await paint(page, region);
  await expect.poll(async () => (await entry(page, level))?.materials).toEqual({ [region.id]: silver });
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(async () => (await entry(page, level))?.materials).toEqual({ [region.id]: gold });
  await choose(page, level.palette[0].label); await paint(page, region);
  await expect.poll(async () => (await entry(page, level))?.materials).toEqual({});
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await page.getByRole('button', { name: '擦除', exact: true }).click(); await paint(page, region);
  await expect.poll(async () => (await entry(page, level))?.colors).toEqual({});
  expect((await entry(page, level)).materials).toEqual({});
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect.poll(async () => (await entry(page, level))?.materials).toEqual({ [region.id]: gold });
  await page.getByRole('button', { name: '清空重涂', exact: true }).click();
  await page.reload(); await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeDisabled();
  expect((await entry(page, level)).colors).toEqual({}); expect((await entry(page, level)).materials).toEqual({});
  await choose(page, '闪银'); await paint(page, region); await page.reload();
  await expect(page.getByRole('button', { name: '完成作品', exact: true })).toBeEnabled();
  expect((await entry(page, level)).materials).toEqual({ [region.id]: silver });
  expect(await page.evaluate(key => localStorage.getItem(key), legacyKey)).toBe(legacy);
  expect(await page.evaluate(() => localStorage.getItem('dunhuang:progress:v1'))).toBeNull();
  await fits(page);
});

test('金银作品预览与原尺寸PNG含真实原图坐标箔纹并保留线条', async ({ page }, testInfo) => {
  const level = levels.find(level => level.id === 'coloring-three-rabbits')!;
  const regions = orderedRegions(level).slice(0, 2);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await open(page, level);
  await choose(page, '闪金'); await paint(page, regions[0]);
  await choose(page, '闪银'); await paint(page, regions[1]);
  expect((await entry(page, level)).materials).toEqual({ [regions[0].id]: gold, [regions[1].id]: silver });
  await page.getByRole('button', { name: '完成作品', exact: true }).click();
  await expect(page.getByTestId('coloring-result-canvas')).toBeVisible();
  const line = assets.find(asset => asset.id === level.lineAssetId)!;
  const map = assets.find(asset => asset.id === level.regionMapAssetId)!;
  const sample = await page.getByTestId('coloring-result-canvas').evaluate(async (element, input) => {
    const images = await Promise.all([input.line, input.map].map(async path => { const image = new Image(); image.src = path; await image.decode(); return image; }));
    const read = (image: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
      const ctx = c.getContext('2d')!; ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data; };
    const canvas = element as HTMLCanvasElement, source = read(images[0]), ids = read(images[1]);
    const output = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const samples: { id: number; x: number; y: number; source: number[]; output: number[] }[] = [];
    const counts: Record<number, number> = {};
    for (let y = 0; y < canvas.height; y += 5) for (let x = 0; x < canvas.width; x += 7) {
      const offset = (y * canvas.width + x) * 4, id = ids[offset] + ids[offset + 1] * 256 + ids[offset + 2] * 65536;
      if (!input.regionIds.includes(id) || (counts[id] ?? 0) >= 40) continue;
      counts[id] = (counts[id] ?? 0) + 1;
      samples.push({ id, x, y, source: Array.from(source.slice(offset, offset + 4)), output: Array.from(output.slice(offset, offset + 4)) });
    }
    let hash = 2166136261; for (const value of output) hash = Math.imul(hash ^ value, 16777619);
    return { samples, hash: hash >>> 0, width: canvas.width, height: canvas.height };
  }, { line: line.path, map: map.path, regionIds: regions.map(region => region.id) });
  expect([sample.width, sample.height]).toEqual([line.width, line.height]);
  for (const region of regions) expect(sample.samples.filter(value => value.id === region.id).length).toBeGreaterThan(20);
  for (const pixel of sample.samples) {
    const tile = sampleColoringMaterial(pixel.id === regions[0].id ? gold : silver, pixel.x, pixel.y);
    for (let channel = 0; channel < 3; channel++) expect(Math.abs(pixel.output[channel] - Math.round(pixel.source[channel] * tile[channel] / 255))).toBeLessThanOrEqual(2);
  }
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出PNG', exact: true }).click();
  const download = await downloadPromise, png = readFileSync((await download.path())!);
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([line.width, line.height]);
  writeFileSync(`work/coloring-metallic-${testInfo.project.name}-export.png`, png);
  const exportedHash = await page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    let hash = 2166136261; for (const value of ctx.getImageData(0, 0, canvas.width, canvas.height).data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  }, png.toString('base64'));
  expect(exportedHash).toBe(sample.hash);
  await page.reload(); await expect(page.getByTestId('coloring-result-canvas')).toBeVisible();
  expect((await entry(page, level)).materials).toEqual({ [regions[0].id]: gold, [regions[1].id]: silver });
});

test('所有填色关都有金银入口，手机六常用格和完整色盘15格不挤占画布', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: String(testInfo.project.use.baseURL ?? 'http://127.0.0.1:5173'),
    viewport: { width: 640, height: 300 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const level of levels) {
      await open(page, level);
      await expect(page.locator('.coloring-common-palette .coloring-swatch')).toHaveCount(6);
      for (const label of ['闪金', '闪银']) {
        const button = page.getByRole('button', { name: `选择${label}`, exact: true });
        await expect(button).toBeInViewport({ ratio: .999 });
        const rect = (await button.boundingBox())!; expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44);
      }
      await choose(page, '闪金'); await paint(page, orderedRegions(level)[0]);
      expect(Object.values((await entry(page, level)).materials)).toEqual([gold]);
      await fits(page);
    }
    const level = levels.at(-1)!;
    await page.getByRole('button', { name: '完整色盘', exact: true }).click();
    const palette = page.getByRole('dialog', { name: '完整色盘', exact: true });
    await expect(palette.getByRole('button', { name: /^选择/ })).toHaveCount(14);
    await expect(palette.getByLabel('自由选色', { exact: true })).toHaveValue(/^#[0-9a-f]{6}$/i);
    const canvasBox = (await host(page).boundingBox())!, panelBox = (await palette.boundingBox())!;
    expect(panelBox.x).toBeGreaterThanOrEqual(canvasBox.x + canvasBox.width - 1);
    await expect(palette).toBeInViewport({ ratio: .999 });
    await palette.getByRole('button', { name: '选择闪银', exact: true }).click();
    await expect(palette.getByLabel('自由选色', { exact: true })).toHaveValue(/^#[0-9a-f]{6}$/i);
    await palette.getByRole('button', { name: '关闭完整色盘', exact: true }).click();
    const saved = JSON.stringify(await entry(page, level));
    await page.setViewportSize({ width: 300, height: 640 });
    await expect(page.getByTestId('mobile-landscape-gate')).toBeVisible();
    await page.setViewportSize({ width: 640, height: 300 });
    await expect(page.getByTestId('mobile-landscape-gate')).not.toBeVisible();
    expect(JSON.stringify(await entry(page, level))).toBe(saved);
    await fits(page);
  } finally { await context.close(); }
});
