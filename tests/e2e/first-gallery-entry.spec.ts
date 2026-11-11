import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import type { ColoringLevel } from '../../src/types';

const rawLevel = JSON.parse(readFileSync('src/content/levels/coloring-feitian-lotus.json', 'utf8')) as ColoringLevel;
const galleryPath = '/first-gallery-v001.html';
const galleryKey = 'dunhuang:first-gallery:v1';
const worldKey = 'dunhuang:first-gallery-world:v1';
const oldArtworksKey = 'dunhuang:artworks:v2';

async function denySaveTo(page: Page, key: string) {
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, name: string, value: string) {
      if (this === localStorage && name === key) throw new DOMException('test quota', 'QuotaExceededError');
      return original.call(this, name, value);
    };
    window.addEventListener('test-restore-gallery-save', () => { Storage.prototype.setItem = original; }, { once: true });
  }, key);
}
async function restoreSave(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('test-restore-gallery-save')));
}

test('剧情入口拒绝 2D 直链和伪造画架查询参数', async ({ page }) => {
  for (const hash of [
    '#/themes',
    '#/theme/patterns',
    '#/theme/patterns/games/coloring',
    '#/play/coloring-feitian-lotus',
    '#/result/coloring-feitian-lotus',
  ]) {
    await page.goto(`${galleryPath}?source=easel&token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa${hash}`);
    await expect(page.getByRole('heading', { name: '这个入口尚未开放' })).toBeVisible();
    await expect(page.getByRole('button', { name: '兼容游玩' })).toHaveCount(0);
    await expect(page.getByTestId('phaser-player')).toHaveCount(0);
  }
  expect(await page.evaluate(key => localStorage.getItem(key), galleryKey)).toBeNull();
});

test('3D仍在加载时可直接进入游戏世界，飞天只显示可玩的两种玩法', async ({ page, isMobile }) => {
  const chapters = JSON.parse(readFileSync('src/content/world/flying-history-art-v001.json', 'utf8')) as unknown[];
  const unlockedMusic = [
    ...chapters.map((_, index) => `chapter:${index + 1}`),
    ...MUSIC_INSTRUMENTS.map(({ id }) => `instrument:${id}`),
    'outfit',
  ];
  await page.addInitScript(keys => {
    for (const key of keys) localStorage.setItem(`dunhuang:music-gallery:progress:v1:${key}`, 'yes');
  }, unlockedMusic);
  let unblockModel!: () => void;
  const blockedModel = new Promise<void>(resolve => { unblockModel = resolve; });
  await page.route('**/traveler-tripo/v002/traveler.glb', async route => {
    await blockedModel;
    await route.abort();
  });
  try {
    await page.goto(galleryPath, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'false');
    // The button should commit the menu without waiting for the browser's hash event.
    await page.evaluate(() => window.addEventListener('hashchange', event => {
      if (event.newURL.endsWith('#/themes')) event.stopImmediatePropagation();
    }, true));
    const enter = page.getByRole('link', { name: '直接进入游戏世界' });
    if (isMobile) await enter.tap();
    else await enter.click();
    await expect(page).toHaveURL(/#\/themes$/);
    const music = page.getByRole('link', { name: '飞天、乐舞与服饰' });
    await expect(music).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId('world-host')).toHaveCount(0);
    if (isMobile) await music.tap();
    else await music.click();
    await expect(page.locator('.game-choice-card h2')).toHaveText(['计时找物', '影子配对']);
  } finally {
    unblockModel();
  }
});

test('普通填色两次保存都成功才进结果，新收藏不会改动画架展品', async ({ page }) => {
  const exhibit = {
    artworkId: 'exhibit',
    levelId: rawLevel.id,
    artworkVersion: rawLevel.artworkVersion,
    colors: { 36: '#a85030' },
    materials: {},
    submittedAt: '2026-11-05T00:00:00.000Z',
  };
  await page.addInitScript(({ key, exhibit, legacyKey, version, id }) => {
    if (localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, JSON.stringify({
      version: 1, muralParts: [], caissonCompleted: false, coloringCompleted: true, ceremonySeen: false,
      artworks: { exhibit }, displayedArtworkId: exhibit.artworkId,
    }));
    localStorage.setItem(legacyKey, JSON.stringify({ version: 2, artworks: { [id]: { [version]: {
      colors: { 36: '#a9a9a9' }, materials: { 36: 'sparkle-silver-v001' }, updatedAt: '2026-11-05T00:01:00.000Z',
    } } } }));
  }, { key: galleryKey, exhibit, legacyKey: oldArtworksKey, version: rawLevel.artworkVersion, id: rawLevel.id });
  await page.goto('/#/play/coloring-feitian-lotus');
  const finish = page.getByRole('button', { name: '完成作品', exact: true });
  await expect(finish).toBeEnabled({ timeout: 45000 });
  await denySaveTo(page, oldArtworksKey);
  await finish.click();
  const retry = page.getByRole('button', { name: '重试收藏作品' });
  await expect(retry).toBeVisible();
  await expect(page).toHaveURL(/#\/play\/coloring-feitian-lotus$/);
  expect(await page.evaluate(key => Object.keys(JSON.parse(localStorage.getItem(key)!).artworks), galleryKey)).toEqual(['exhibit']);
  await restoreSave(page);
  await denySaveTo(page, galleryKey);
  await retry.click();
  await expect(retry).toBeVisible();
  await expect(page).toHaveURL(/#\/play\/coloring-feitian-lotus$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('dunhuang:progress:v1') ?? '{}').completed?.['coloring-feitian-lotus'])).toBeUndefined();
  await restoreSave(page);
  await retry.click();
  await expect(page).toHaveURL(/#\/result\/coloring-feitian-lotus$/);
  await expect(page.getByTestId('coloring-result-canvas')).toBeVisible();
  await expect(page.getByText('可以到 3D 世界的画架，从作品库选择这幅画来展示。')).toBeVisible();
  await expect(page.getByTestId('world-host')).toHaveCount(0);
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), galleryKey);
  expect(data.displayedArtworkId).toBe(exhibit.artworkId);
  expect(data.artworks.exhibit).toEqual(exhibit);
  expect(Object.values(data.artworks)).toHaveLength(2);
  expect(Object.values(data.artworks)).toContainEqual(expect.objectContaining({ materials: { 36: 'sparkle-silver-v001' } }));
});

test('现场画架正常完成后自动回到同一站位并挂画', async ({ page, isMobile }) => {
  test.setTimeout(120000);
  await page.goto(`${galleryPath}?view=easel`);
  const interact = page.getByTestId('gallery-interact');
  const world = page.getByTestId('world-host');
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
  const worldCanvas = await world.locator('canvas').elementHandle();
  const source = await page.evaluate(() => {
    const terrain = Reflect.get(window, '__terrain');
    return terrain.inspect().checkpoint;
  });
  if (isMobile) await interact.tap();
  else await interact.click();
  const open = page.getByRole('button', { name: '开始设色', exact: true });
  if (isMobile) await open.tap();
  else await open.click();
  await expect(page).toHaveURL(/#\/play\/coloring-feitian-lotus$/);
  await expect(world).toBeHidden();
  expect(await worldCanvas!.evaluate(canvas => canvas.isConnected)).toBe(true);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45000 });
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!);
  const point = rawLevel.regions.find(item => item.id === 36)!.point;
  const position = { x: layout.image.x + point.x * layout.image.width, y: layout.image.y + point.y * layout.image.height };
  if (isMobile) await host.locator('canvas').tap({ position });
  else await host.locator('canvas').click({ position });
  const finish = page.getByRole('button', { name: '完成作品', exact: true });
  await expect(finish).toBeEnabled();
  const savingFeedback = await finish.evaluateHandle(button => {
    const observed = { disabled: false, observer: new MutationObserver(() => {
      if (button.textContent?.includes('正在保存')) observed.disabled = (button as HTMLButtonElement).disabled;
    }) };
    observed.observer.observe(button, { subtree: true, childList: true, characterData: true, attributes: true });
    return observed;
  });
  if (isMobile) await finish.tap();
  else await finish.click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 45000 });
  await expect(world).toBeVisible();
  expect(await worldCanvas!.evaluate(canvas => document.querySelector('[data-testid="world-host"] canvas') === canvas)).toBe(true);
  expect(await savingFeedback.evaluate(observed => { observed.observer.disconnect(); return observed.disabled; })).toBe(true);
  await page.waitForFunction(() => Reflect.get(window, '__terrain')?.inspect().galleryDisplay?.easelVisible);
  const result = await page.evaluate(key => ({
    checkpoint: Reflect.get(window, '__terrain').inspect().checkpoint,
    progress: JSON.parse(localStorage.getItem(key)!),
    claim: history.state?.dunhuangFirstGalleryEasel,
  }), galleryKey);
  expect(result.checkpoint).toEqual(source);
  expect(result.progress.coloringCompleted).toBe(true);
  expect(Object.keys(result.progress.artworks)).toEqual([result.progress.displayedArtworkId]);
  expect(Object.keys(result.progress.artworks[result.progress.displayedArtworkId].colors)).toEqual(['36']);
  expect(result.claim).toBeUndefined();
});

test('3D 素材确实加载失败才提供兼容游玩，回世界重新遵守门禁', async ({ page }) => {
  test.setTimeout(90000);
  await page.route('**/*.glb', route => route.abort());
  await page.goto(galleryPath);
  const failure = page.getByTestId('world-error');
  await expect(failure).toBeVisible({ timeout: 45000 });
  await failure.getByRole('button', { name: '兼容游玩 · 纹样小游戏' }).click();
  await expect(page).toHaveURL(/#\/theme\/patterns$/);
  await page.evaluate(() => { location.hash = '/play/coloring-feitian-lotus'; });
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45000 });
  await page.evaluate(() => { location.hash = '/'; });
  await expect(failure).toBeVisible({ timeout: 45000 });
  await page.evaluate(() => { location.hash = '/play/coloring-feitian-lotus'; });
  await expect(page.getByRole('heading', { name: '这个入口尚未开放' })).toBeVisible();
});

test('画架限制相邻关，刷新、后退和保存失败都保护来源与现场', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${galleryPath}?view=easel`);
  const interact = page.getByTestId('gallery-interact');
  const enter = async () => {
    await expect(interact).toBeVisible({ timeout: 45000 });
    await interact.click();
    await page.getByRole('button', { name: '开始设色', exact: true }).click();
    await expect(page).toHaveURL(/#\/play\/coloring-feitian-lotus$/);
  };
  await enter();
  const original = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!).position, worldKey);
  await expect(page.getByTestId('level-previous')).toBeDisabled();
  await expect(page.getByTestId('level-advance')).toBeDisabled();
  await page.goBack();
  await expect(page.getByTestId('first-gallery-overlay')).toBeVisible({ timeout: 45000 });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').coloringCompleted, galleryKey)).not.toBe(true);
  await enter();
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 45000 });
  const region = rawLevel.regions.find(item => item.id === 36)!;
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!);
  await host.locator('canvas').click({ position: {
    x: layout.image.x + region.point.x * layout.image.width, y: layout.image.y + region.point.y * layout.image.height,
  } });
  const finish = page.getByRole('button', { name: '完成作品', exact: true });
  await expect(finish).toBeEnabled();
  await page.reload();
  await expect(finish).toBeEnabled({ timeout: 45000 });
  await expect(page.getByRole('button', { name: '返回院内画架' })).toBeVisible();
  await denySaveTo(page, galleryKey);
  await finish.click();
  await expect(page.getByTestId('gallery-save-error')).toBeVisible();
  await expect(page).toHaveURL(/#\/play\/coloring-feitian-lotus$/);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').displayedArtworkId, galleryKey)).toBeFalsy();
  await restoreSave(page);
  await page.getByRole('button', { name: '重试收藏作品' }).click();
  await expect(page.getByTestId('first-gallery-overlay')).toBeVisible({ timeout: 45000 });
  const final = await page.evaluate(({ galleryKey, worldKey }) => ({
    gallery: JSON.parse(localStorage.getItem(galleryKey)!),
    checkpoint: JSON.parse(sessionStorage.getItem(worldKey)!),
  }), { galleryKey, worldKey });
  expect(final.checkpoint.position).toEqual(original);
  expect(final.gallery.coloringCompleted).toBe(true);
  expect(Object.keys(final.gallery.artworks)).toEqual([final.gallery.displayedArtworkId]);
});
