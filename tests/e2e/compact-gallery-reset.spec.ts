import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import type { ColoringLevel } from '../../src/types';

const level = JSON.parse(readFileSync('src/content/levels/coloring-feitian-lotus.json', 'utf8')) as ColoringLevel;
const compactKey = 'dunhuang:first-gallery-caisson:v1';
const fullKey = 'dunhuang:first-gallery:v1';
const compactWorldKey = 'dunhuang:first-gallery-caisson-world:v1';
const fullWorldKey = 'dunhuang:first-gallery-world:v1';
const compactMarker = 'dunhuang:first-gallery-caisson-mural-marker:v1';
const fullMarker = 'dunhuang:first-gallery-mural-marker:v1';
const draftKey = 'dunhuang:first-gallery-easel:v1';
const progressKey = 'dunhuang:progress:v1';
const artworksKey = 'dunhuang:artworks:v2';
const musicKey = 'dunhuang:music-gallery:progress:v1:chapter:1';
const mogaoKey = 'dunhuang:mogao-exhibit:progress:v1';
const compactResetKey = 'dunhuang:gallery-reset:v1:compact:first';
const compactCaissonResetKey = 'dunhuang:gallery-task-reset:v1:compact:first:caisson';
const artwork = {
  artworkId: 'kept-painting', levelId: level.id, artworkVersion: level.artworkVersion,
  colors: { 36: '#a85030' }, materials: {}, submittedAt: '2026-11-05T00:00:00.000Z',
};
const completeFirstGallery = {
  version: 1, muralParts: ['lotus', 'bird', 'grapes'], caissonCompleted: true,
  coloringCompleted: true, ceremonySeen: true, introductionsSeen: ['mural', 'caisson', 'easel'],
  firstSuccessSeen: true, artworks: { [artwork.artworkId]: artwork }, displayedArtworkId: artwork.artworkId,
};
const checkpoint = {
  version: 1, position: toTerrainPoint('courtyard', { x: -12, z: -14 }),
  heading: 0, cameraYaw: 0, visitedEvents: ['caisson', 'flying'],
};
const ordinaryProgress = { version: 1, completed: { 'coloring-feitian-lotus': '2026-11-05T00:00:00.000Z' }, settings: { reducedMotion: true } };
const ordinaryArtworks = { version: 2, artworks: {} };
const exhibitProgress = { version: 1, viewed: [], introSeen: true, noticeSeen: false };
const draft = JSON.stringify({ checkpoint, draft: { colors: { 36: '#a85030' }, materials: {} } });

test('精简版确认清除第一馆整馆或单项任务，保留作品和完整三馆存档', async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ compactKey, fullKey, compactWorldKey, fullWorldKey, compactMarker, fullMarker,
    draftKey, progressKey, artworksKey, musicKey, mogaoKey, gallery, checkpoint, ordinaryProgress,
    ordinaryArtworks, exhibitProgress, draft }) => {
    if (sessionStorage.getItem('reset-e2e-seeded')) return;
    sessionStorage.setItem('reset-e2e-seeded', 'yes');
    localStorage.setItem(compactKey, JSON.stringify(gallery));
    localStorage.setItem(fullKey, JSON.stringify(gallery));
    localStorage.setItem(progressKey, JSON.stringify(ordinaryProgress));
    localStorage.setItem(artworksKey, JSON.stringify(ordinaryArtworks));
    localStorage.setItem(musicKey, 'yes');
    localStorage.setItem(mogaoKey, JSON.stringify(exhibitProgress));
    sessionStorage.setItem(compactWorldKey, JSON.stringify(checkpoint));
    sessionStorage.setItem(fullWorldKey, JSON.stringify(checkpoint));
    sessionStorage.setItem(compactMarker, '1');
    sessionStorage.setItem(fullMarker, '1');
    sessionStorage.setItem(draftKey, draft);
  }, { compactKey, fullKey, compactWorldKey, fullWorldKey, compactMarker, fullMarker, draftKey,
    progressKey, artworksKey, musicKey, mogaoKey, gallery: completeFirstGallery, checkpoint,
    ordinaryProgress, ordinaryArtworks, exhibitProgress, draft });

  await page.goto('/#/settings');
  const section = page.locator('.gallery-reset-settings');
  await expect(section.getByRole('heading', { name: '一键清除' })).toBeVisible();
  const select = section.getByLabel('选择要清除进度的展馆');
  const scope = section.getByLabel('选择清除范围');
  await expect(select.locator('option')).toHaveText(['请选择展馆', '第一馆 · 纹彩院']);
  await expect(scope).toBeDisabled();
  await expect(section.getByRole('button', { name: '清除所选馆进度' })).toBeDisabled();
  const before = await page.evaluate(({ compactKey, fullKey, progressKey, artworksKey, musicKey, mogaoKey }) =>
    Object.fromEntries([compactKey, fullKey, progressKey, artworksKey, musicKey, mogaoKey].map(key => [key, localStorage.getItem(key)])),
  { compactKey, fullKey, progressKey, artworksKey, musicKey, mogaoKey });

  const fullPage = await context.newPage();
  await fullPage.goto('/first-gallery-v001.html#/settings');
  const fullSelect = fullPage.getByLabel('选择要清除进度的展馆');
  await expect(fullSelect.locator('option')).toHaveText(['请选择展馆', '第一馆 · 纹彩院', '第二馆 · 乐舞坊', '第三馆 · 九层楼']);
  await fullPage.evaluate(({ fullWorldKey, fullMarker, checkpoint }) => {
    sessionStorage.setItem(fullWorldKey, JSON.stringify(checkpoint));
    sessionStorage.setItem(fullMarker, '1');
    Reflect.set(window, '__resetTestSignals', []);
    window.addEventListener('storage', event => {
      if (event.key?.startsWith('dunhuang:gallery-reset:') || event.key?.startsWith('dunhuang:gallery-task-reset:')) {
        Reflect.get(window, '__resetTestSignals').push(event.key);
      }
    });
  }, { fullWorldKey, fullMarker, checkpoint });

  await select.selectOption('first');
  await expect(scope.locator('option')).toHaveText(['整馆进度', '借物补画', '三兔共耳', '画架设色']);
  await scope.selectOption('caisson');
  await section.getByRole('button', { name: '清除所选任务进度' }).click();
  let dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '清除第一馆 · 纹彩院的「三兔共耳」任务进度？' })).toBeVisible();
  await dialog.getByRole('button', { name: '确认清除' }).click();
  await expect(section.getByRole('status')).toHaveText('已清除第一馆 · 纹彩院的「三兔共耳」任务进度。');
  const afterTask = await page.evaluate(({ compactKey, compactWorldKey, compactMarker, compactCaissonResetKey }) => ({
    compact: JSON.parse(localStorage.getItem(compactKey)!),
    world: JSON.parse(sessionStorage.getItem(compactWorldKey)!),
    marker: sessionStorage.getItem(compactMarker),
    signal: localStorage.getItem(compactCaissonResetKey),
  }), { compactKey, compactWorldKey, compactMarker, compactCaissonResetKey });
  expect(afterTask.compact).toEqual({ ...completeFirstGallery, caissonCompleted: false, ceremonySeen: false,
    introductionsSeen: ['mural', 'easel'] });
  expect(afterTask.world.visitedEvents).toEqual(['flying']);
  expect(afterTask.marker).toBe('1');
  expect(afterTask.signal).toBeTruthy();

  await select.selectOption('first');
  await expect(scope).toHaveValue('');
  await section.getByRole('button', { name: '清除所选馆进度' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '清除第一馆 · 纹彩院的进度？' })).toBeVisible();
  await expect(dialog.getByText(/通往乐舞坊/)).toHaveCount(0);
  await dialog.getByRole('button', { name: '取消' }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(before)))
    .toEqual({ ...before, [compactKey]: JSON.stringify(afterTask.compact) });
  expect(await page.evaluate(key => sessionStorage.getItem(key), compactMarker)).toBe('1');

  await section.getByRole('button', { name: '清除所选馆进度' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByText('其他展馆的记录和已保存作品会保留。')).toBeVisible();
  await dialog.getByRole('button', { name: '确认清除' }).click();
  await expect(section.getByRole('status')).toHaveText('已清除第一馆 · 纹彩院的进度。');
  const after = await page.evaluate(({ compactKey, fullKey, progressKey, artworksKey, musicKey, mogaoKey,
    compactWorldKey, fullWorldKey, compactMarker, fullMarker, draftKey }) => ({
    compact: JSON.parse(localStorage.getItem(compactKey)!),
    otherLocal: Object.fromEntries([fullKey, progressKey, artworksKey, musicKey, mogaoKey].map(key => [key, localStorage.getItem(key)])),
    compactWorld: JSON.parse(sessionStorage.getItem(compactWorldKey)!), fullWorld: sessionStorage.getItem(fullWorldKey),
    compactMarker: sessionStorage.getItem(compactMarker), fullMarker: sessionStorage.getItem(fullMarker),
    draft: sessionStorage.getItem(draftKey),
  }), { compactKey, fullKey, progressKey, artworksKey, musicKey, mogaoKey,
    compactWorldKey, fullWorldKey, compactMarker, fullMarker, draftKey });
  expect(after.compact).toMatchObject({ muralParts: [], caissonCompleted: false, coloringCompleted: false,
    ceremonySeen: false, introductionsSeen: [], firstSuccessSeen: false, displayedArtworkId: null,
    artworks: { [artwork.artworkId]: artwork } });
  const { [compactKey]: _compact, ...unchanged } = before;
  expect(after.otherLocal).toEqual(unchanged);
  expect(after.compactWorld.visitedEvents).toEqual(['flying']);
  expect(after.fullWorld).toBe(JSON.stringify(checkpoint));
  expect(after.compactMarker).toBeNull();
  expect(after.fullMarker).toBe('1');
  expect(after.draft).toBe(draft);

  await expect.poll(() => fullPage.evaluate(() => Reflect.get(window, '__resetTestSignals')))
    .toEqual([compactCaissonResetKey, compactResetKey]);
  expect(await fullPage.evaluate(({ fullWorldKey, fullMarker }) => ({ world: sessionStorage.getItem(fullWorldKey),
    marker: sessionStorage.getItem(fullMarker) }), { fullWorldKey, fullMarker }))
    .toEqual({ world: JSON.stringify(checkpoint), marker: '1' });

  await page.reload();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), compactKey)).toMatchObject({
    muralParts: [], caissonCompleted: false, coloringCompleted: false, ceremonySeen: false,
  });
  await page.getByTestId('world-return').click();
  await page.getByRole('button', { name: '开启敦煌之旅' }).click({ timeout: 30_000 });
  await expect(page.getByTestId('world-host')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
  await page.getByTestId('world-task-toggle').click();
  const tasks = page.getByTestId('world-task-panel');
  await expect(tasks.getByText('三兔共耳')).toBeVisible();
  await expect(tasks.getByText('画架设色')).toBeVisible();
  await expect(tasks.getByRole('listitem').filter({ hasText: '借物补画' })).toHaveText(/0\s*\/\s*3/);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).ceremonySeen, compactKey)).toBe(false);
  await page.getByTestId('world-task-toggle').click();
  await page.getByTestId('mogao-reward-guide-button').click();
  const collection = page.getByTestId('mogao-reward-guide');
  await expect(collection.getByRole('heading', { name: '我的图鉴' })).toBeVisible();
  await expect(collection.getByTestId('mogao-reward-card-first-gallery')).toHaveCount(0);
});
