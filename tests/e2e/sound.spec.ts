import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { ColoringLevel, SoundCue, SpotDifferenceLevel } from '../../src/types';
import type { PuzzleLayout } from '../../src/games/puzzle/rules';
import { SOUND_SETTINGS_KEY } from '../../src/services/sound-settings';

const observation = JSON.parse(readFileSync('src/content/levels/patterns-intro.json', 'utf8')) as SpotDifferenceLevel;
const coloring = JSON.parse(readFileSync('src/content/levels/coloring-three-rabbits.json', 'utf8')) as ColoringLevel;
const playTitles: Record<string, string> = {
  [observation.id]: observation.title,
  [coloring.id]: coloring.title,
  'puzzle-lotus-ceiling': JSON.parse(readFileSync('src/content/levels/puzzle-lotus-ceiling.json', 'utf8')).title,
  'puzzle-three-rabbits': JSON.parse(readFileSync('src/content/levels/puzzle-three-rabbits.json', 'utf8')).title,
};
const progressKey = 'dunhuang:progress:v1';
const artworkKey = 'dunhuang:artworks:v1';
const learningKey = 'dunhuang:learning:v1';
const imageLoadTimeout = 45_000;
type SoundStart = { cue: SoundCue; time: number; contextState: AudioContextState };
declare global {
  interface Window {
    __soundStarts: SoundStart[];
    __failSoundSave: boolean;
  }
}
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__soundStarts = [];
    const durations: [SoundCue, number][] = [
      ['button', .165], ['rotate', .245], ['success', .445], ['error', .285],
      ['fill', .295], ['hint', .485], ['complete', 1.135],
    ];
    // Spy on the real Web Audio source, preserving actual loading, decoding and start().
    // The selected WAVs have distinct sample durations; no production test hooks are required.
    const original = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args: Parameters<AudioBufferSourceNode['start']>) {
      original.apply(this, args);
      const duration = this.buffer?.duration ?? 0;
      const cue = durations.find(([, expected]) => Math.abs(expected - duration) < .001)?.[0];
      if (cue) window.__soundStarts.push({ cue, time: performance.now(), contextState: this.context.state });
    };
  });
});

const recorded = (page: Page) => page.evaluate(() => window.__soundStarts.map(item => item.cue));
const clearRecorded = (page: Page) => page.evaluate(() => { window.__soundStarts = []; });
async function waitForSound(page: Page, cue: SoundCue) {
  await expect.poll(() => recorded(page)).toContain(cue);
}
async function quietAndClear(page: Page, milliseconds = 550) {
  await page.waitForTimeout(milliseconds);
  await clearRecorded(page);
}
async function openSettingsAndUnlock(page: Page) {
  await page.goto('/#/settings');
  await page.getByTestId('sound-test').click();
  await waitForSound(page, 'button');
  await quietAndClear(page);
}
async function goWithinApp(page: Page, hash: string) {
  await page.evaluate(value => { location.hash = value; }, hash);
  const levelId = hash.split('/').pop()!;
  await expect(page.getByRole('heading', { name: playTitles[levelId], exact: true })).toBeVisible();
}
async function spotPoint(page: Page, x: number, y: number) {
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!);
  await host.locator('canvas').click({ position: {
    x: layout.reference.x + x * layout.reference.width,
    y: layout.reference.y + y * layout.reference.height,
  } });
}
async function clickDifference(page: Page, index: number) {
  const region = observation.differences[index].region;
  await spotPoint(page, region.x + region.width / 2, region.y + region.height / 2);
}

test('默认温润木石无自动播放，主动试听才启动真实音频，静音及音量独立持久化', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByTestId('sound-enabled')).toBeChecked();
  await expect(page.getByTestId('sound-volume')).toHaveValue('40');
  await page.waitForTimeout(350);
  expect(await recorded(page)).toEqual([]);
  await page.getByTestId('sound-test').click();
  await waitForSound(page, 'button');
  expect(await page.evaluate(() => window.__soundStarts.every(item => item.contextState === 'running'))).toBe(true);
  await quietAndClear(page);

  await page.getByTestId('sound-volume').fill('23');
  await page.getByTestId('sound-enabled').uncheck();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SOUND_SETTINGS_KEY))
    .toEqual({ version: 1, enabled: false, volume: .23 });
  await page.reload();
  await expect(page.getByTestId('sound-enabled')).not.toBeChecked();
  await expect(page.getByTestId('sound-volume')).toHaveValue('23');
  await page.getByRole('link', { name: '首页', exact: true }).click();
  await page.getByRole('link', { name: '设置', exact: true }).click();
  await page.waitForTimeout(350);
  expect(await recorded(page)).toEqual([]);
  await page.getByTestId('sound-enabled').check();
  await page.getByTestId('sound-test').click();
  await waitForSound(page, 'button');
});

test('调整音效不重写游戏、教学和填色旧记录', async ({ page }) => {
  const originals: Record<string, string> = {
    [progressKey]: JSON.stringify({ version: 1, completed: { 'patterns-intro': '2026-10-28T00:00:00.000Z' }, settings: { reducedMotion: true } }),
    [artworkKey]: JSON.stringify({ version: 1, artworks: {} }),
    [learningKey]: JSON.stringify({ version: 1, books: {} }),
  };
  await page.addInitScript(values => {
    for (const [key, value] of Object.entries(values)) {
      if (!localStorage.getItem(key)) localStorage.setItem(key, value);
    }
  }, originals);
  await page.goto('/#/settings');
  await page.getByTestId('sound-volume').fill('68');
  await page.getByTestId('sound-enabled').uncheck();
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(originals)))
    .toEqual(originals);
  await page.reload();
  await expect(page.getByTestId('sound-volume')).toHaveValue('68');
  await expect(page.getByTestId('sound-enabled')).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: '减少动效' })).toBeChecked();
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(originals)))
    .toEqual(originals);
});

test('音效设置保存失败如实显示，重试成功后保留当前偏好', async ({ page }) => {
  await page.addInitScript(key => {
    window.__failSoundSave = true;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name: string, value: string) {
      if (name === key && window.__failSoundSave) throw new DOMException('Test quota exceeded', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, SOUND_SETTINGS_KEY);
  await page.goto('/#/settings');
  await page.getByTestId('sound-enabled').uncheck();
  await expect(page.getByTestId('sound-save-error')).toContainText('尚未保存');
  expect(await page.evaluate(key => localStorage.getItem(key), SOUND_SETTINGS_KEY)).toBeNull();
  await page.evaluate(() => { window.__failSoundSave = false; });
  await page.getByTestId('retry-sound-save').click();
  await expect(page.getByTestId('sound-save-error')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).enabled, SOUND_SETTINGS_KEY)).toBe(false);
});

test('找不同仅真实命中、漏点及提示发声，通关只播一次且结果刷新安静', async ({ page }) => {
  await openSettingsAndUnlock(page);
  await goWithinApp(page, `#/play/${observation.id}`);
  await expect(page.getByRole('button', { name: '给我提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  expect(await recorded(page)).toEqual([]);
  await clickDifference(page, 0);
  await waitForSound(page, 'success');
  await quietAndClear(page);
  await clickDifference(page, 0);
  await page.waitForTimeout(300);
  expect(await recorded(page)).toEqual([]);

  const miss = { x: .5, y: .96 };
  expect(observation.differences.every(({ region }) => miss.x < region.x || miss.x > region.x + region.width
    || miss.y < region.y || miss.y > region.y + region.height)).toBe(true);
  await spotPoint(page, miss.x, miss.y);
  await waitForSound(page, 'error');
  await quietAndClear(page);
  await page.getByRole('button', { name: '给我提示', exact: true }).click();
  await waitForSound(page, 'hint');
  expect(await recorded(page)).toEqual(['hint']);
  await quietAndClear(page);
  for (let index = 1; index < observation.differences.length; index++) {
    await clickDifference(page, index);
    if (index === observation.differences.length - 1) {
      await expect(page).toHaveURL(new RegExp(`/#/result/${observation.id}$`));
      await waitForSound(page, 'complete');
      expect(await recorded(page)).toEqual(['complete']);
    } else {
      await waitForSound(page, 'success');
      await quietAndClear(page);
    }
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: '观察完成', exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  expect(await recorded(page)).toEqual([]);
});

test('实际填色和旋转、拼片归位产生对应反馈，无变化重涂和选片不发声', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSettingsAndUnlock(page);
  await goWithinApp(page, `#/play/${coloring.id}`);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  const region = [...coloring.regions].sort((a, b) => b.pixelCount - a.pixelCount)[0];
  const host = page.getByTestId('phaser-player');
  const layout = JSON.parse((await host.getAttribute('data-layout'))!);
  const paintPosition = { x: layout.image.x + region.point.x * layout.image.width,
    y: layout.image.y + region.point.y * layout.image.height };
  await host.locator('canvas').click({ position: paintPosition });
  await waitForSound(page, 'fill');
  await quietAndClear(page);
  await host.locator('canvas').click({ position: paintPosition });
  await page.waitForTimeout(300);
  expect(await recorded(page)).toEqual([]);
  await page.getByRole('button', { name: '完成作品', exact: true }).click();
  await waitForSound(page, 'complete');
  expect(await recorded(page)).toEqual(['complete']);
  await quietAndClear(page, 1250);

  await goWithinApp(page, '#/play/puzzle-lotus-ceiling');
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  const rotating = JSON.parse((await host.getAttribute('data-layout'))!) as PuzzleLayout;
  const target = rotating.pieces[0].targetRect;
  await host.locator('canvas').click({ position: { x: target.x + target.width / 2, y: target.y + target.height / 2 } });
  await waitForSound(page, 'rotate');
  await quietAndClear(page);

  await goWithinApp(page, '#/play/puzzle-three-rabbits');
  await expect(page.getByRole('button', { name: '拼图提示', exact: true })).toBeEnabled({ timeout: imageLoadTimeout });
  const fragments = JSON.parse((await host.getAttribute('data-layout'))!) as PuzzleLayout;
  const piece = fragments.pieces.find(item => item.fullyVisible && !item.placed && item.displayRect)!;
  expect(piece).toBeTruthy();
  const source = piece.displayRect!;
  await host.locator('canvas').click({ position: { x: source.x + source.width / 2, y: source.y + source.height / 2 } });
  await expect.poll(async () => (JSON.parse((await host.getAttribute('data-layout'))!) as PuzzleLayout).selectedPieceId).toBe(piece.id);
  await page.waitForTimeout(300);
  expect(await recorded(page)).toEqual([]);
  await host.locator('canvas').click({ position: { x: piece.targetRect.x + piece.targetRect.width / 2,
    y: piece.targetRect.y + piece.targetRect.height / 2 } });
  await waitForSound(page, 'success');
  await expect(page.getByTestId('puzzle-progress')).toHaveAttribute('aria-label', '已归位 1 块，共 12 块');
});
