import { expect, test, type Page } from '@playwright/test';
import { travelerModelPath } from '../../src/content/world/assets';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';

const selectionKey = 'dunhuang:traveler-selection:v1';
const galleryKey = 'dunhuang:first-gallery:v1';

function watchAssetRequests(page: Page) {
  const models = new Set<string>();
  const previews = new Set<string>();
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith('.glb')) models.add(path);
    if (path.includes('/traveler-selection/') && path.endsWith('.webp')) previews.add(path);
  });
  return { models, previews };
}

const travelerRequests = (models: ReadonlySet<string>) => [...models].filter(path => path.includes('/traveler-tripo/'));
const assetPath = (path: string) => `/assets/world/${path}`;
const pickedTraveler = (page: Page) => page.evaluate(key => localStorage.getItem(key), selectionKey);
const classicRadio = (page: Page) => page.getByRole('radio', { name: '鸣沙' });
const modernRadio = (page: Page) => page.getByRole('radio', { name: '林澈' });
const enterButton = (page: Page) => page.getByRole('button', { name: '开启敦煌之旅' });
const option = (page: Page, travelerId: 'classic' | 'tripo') => page.locator(`.traveler-option[data-traveler="${travelerId}"]`);
const figure = (page: Page, travelerId: 'classic' | 'tripo') => option(page, travelerId).locator('.traveler-figure');
const avatar = (page: Page, travelerId: 'classic' | 'tripo') => option(page, travelerId).locator('.traveler-avatar');
const illustrationPath = (name: string) => assetPath(`traveler-selection/v004/${name}.webp`);

test('开场默认选中鸣沙，切换只改变插画状态，确认后才加载角色', async ({ page, isMobile }) => {
  test.setTimeout(90_000);
  if (!isMobile) await page.setViewportSize({ width: 1440, height: 810 });
  const { models, previews } = watchAssetRequests(page);
  await page.goto('/');
  await expect(page.locator('.traveler-selection')).toBeVisible({ timeout: 30_000 });
  await expect(classicRadio(page)).toBeChecked();
  await expect(modernRadio(page)).not.toBeChecked();
  await expect(page.getByRole('link', { name: '直接体验小游戏' })).toBeVisible();
  const enter = enterButton(page);
  await expect(enter).toBeInViewport({ ratio: 1 });
  await expect(figure(page, 'classic')).toBeInViewport({ ratio: .98 });
  if (isMobile) {
    await expect(figure(page, 'tripo')).toBeHidden();
    await expect(avatar(page, 'classic')).toBeHidden();
    await expect(avatar(page, 'tripo')).toBeInViewport({ ratio: 1 });
    await avatar(page, 'tripo').tap();
    await expect(modernRadio(page)).toBeChecked();
    await expect(figure(page, 'tripo')).toBeInViewport({ ratio: .98 });
    await expect(figure(page, 'classic')).toBeHidden();
    await expect(avatar(page, 'tripo')).toBeHidden();
    await expect(avatar(page, 'classic')).toBeInViewport({ ratio: 1 });
    await avatar(page, 'classic').tap();
  } else {
    await expect(figure(page, 'tripo')).toBeInViewport({ ratio: .98 });
    await expect(avatar(page, 'tripo')).toBeHidden();
    await option(page, 'tripo').locator('.traveler-selection-name').click();
    await expect(modernRadio(page)).toBeChecked();
    await figure(page, 'classic').click();
  }
  await expect(classicRadio(page)).toBeChecked();
  const illustrationNames = isMobile
    ? ['background', 'classic-compact', 'tripo-compact', 'classic-avatar', 'tripo-avatar']
    : ['background', 'classic', 'tripo'];
  await expect.poll(() => [...previews].sort()).toEqual(illustrationNames.map(illustrationPath).sort());
  await page.locator('.traveler-selection img').evaluateAll(async images => {
    await Promise.all(images.map(image => (image as HTMLImageElement).decode()));
  });
  await expect(page.locator('.traveler-selection canvas')).toHaveCount(0);
  expect([...models]).toEqual([]);
  expect(await pickedTraveler(page)).toBeNull();
  if (isMobile) await enter.tap();
  else await enter.click();
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  expect(travelerRequests(models)).toEqual([assetPath(travelerModelPath('classic', isMobile))]);
  expect(await pickedTraveler(page)).toBe('classic');
});

test('设置可更换旅人，重载沿用林澈、馆内位置及任务记录', async ({ page, isMobile }) => {
  test.setTimeout(150_000);
  await page.addInitScript(({ galleryKey, selectionKey }) => {
    if (!localStorage.getItem(selectionKey)) localStorage.setItem(selectionKey, 'classic');
    if (!localStorage.getItem(galleryKey)) localStorage.setItem(galleryKey, JSON.stringify({
      version: 1, muralParts: [], caissonCompleted: true, coloringCompleted: false,
      ceremonySeen: false, artworks: {}, displayedArtworkId: null,
    }));
  }, { galleryKey, selectionKey });
  const { models, previews } = watchAssetRequests(page);
  await page.goto('/?view=mural');
  const world = page.getByTestId('world-host');
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  const position = () => page.getByTestId('world-position').evaluate(el => [el.getAttribute('data-x'), el.getAttribute('data-z')]);
  const originalPosition = await position();
  const originalProgress = await page.evaluate(key => localStorage.getItem(key), galleryKey);
  expect([...previews]).toEqual([]);
  const settings = page.getByRole('navigation', { name: '世界导航' }).getByRole('link', { name: '设置' });
  if (isMobile) await settings.tap();
  else await settings.click();
  models.clear();
  const change = page.getByRole('button', { name: '更换角色' });
  if (isMobile) await change.tap();
  else await change.click();
  await expect(classicRadio(page)).toBeChecked();
  if (isMobile) await avatar(page, 'tripo').tap();
  else await figure(page, 'tripo').click();
  await expect(modernRadio(page)).toBeChecked();
  await expect(figure(page, 'tripo')).toBeInViewport();
  expect([...models]).toEqual([]);
  expect(await pickedTraveler(page)).toBe('classic');
  const enter = enterButton(page);
  if (isMobile) await enter.tap();
  else await enter.click();
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  expect(travelerRequests(models)).toEqual([assetPath(travelerModelPath('tripo', isMobile))]);
  expect(await position()).toEqual(originalPosition);
  models.clear();
  previews.clear();
  await page.reload();
  await expect(world).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  expect(await pickedTraveler(page)).toBe('tripo');
  expect([...previews]).toEqual([]);
  expect(travelerRequests(models)).toEqual([assetPath(travelerModelPath('tripo', isMobile))]);
  expect(await position()).toEqual(originalPosition);
  expect(await page.evaluate(key => localStorage.getItem(key), galleryKey)).toBe(originalProgress);
});

test('减少动效时仍可用键盘切换选中项', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await classicRadio(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(modernRadio(page)).toBeChecked();
  await expect(figure(page, 'tripo').locator('img')).toBeVisible();
  await expect(figure(page, 'tripo')).toHaveCSS('transition-duration', '0s');
  expect(await pickedTraveler(page)).toBeNull();
});

test('2D 直达仍通过原有解锁规则，不打开旅人选择', async ({ page }) => {
  await page.addInitScript(keys => {
    for (const key of keys) localStorage.setItem(`dunhuang:music-gallery:progress:v1:${key}`, 'yes');
  }, [
    ...Array.from({ length: 9 }, (_, index) => `chapter:${index + 1}`),
    ...MUSIC_INSTRUMENTS.map(({ id }) => `instrument:${id}`),
    'outfit',
  ]);
  const { models, previews } = watchAssetRequests(page);
  await page.goto('/#/theme/music/games');
  await expect(page.locator('.game-choice-card h2')).toHaveText(['计时找物', '影子配对']);
  await expect(page.locator('.traveler-selection')).toHaveCount(0);
  expect([...models]).toEqual([]);
  expect([...previews]).toEqual([]);
  expect(await pickedTraveler(page)).toBeNull();
  await page.goto('/');
  await page.getByRole('link', { name: '直接体验小游戏' }).click();
  await expect(page).toHaveURL(/#\/themes$/);
  await expect(page.locator('.traveler-selection')).toHaveCount(0);
  expect([...models]).toEqual([]);
  expect(await pickedTraveler(page)).toBeNull();
});
