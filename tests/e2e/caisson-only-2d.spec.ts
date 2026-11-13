import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { Level, ThemeDefinition } from '../../src/types';

const themes = JSON.parse(readFileSync('src/content/themes.json', 'utf8')) as ThemeDefinition[];
const levels = readdirSync('src/content/levels').filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(`src/content/levels/${name}`, 'utf8')) as Level);

test('精简版无需馆内解锁即可选择所有已有 2D 主题、游戏和关卡', async ({ page }) => {
  await page.goto('/#/themes');
  const themeCards = page.getByTestId('theme-choice-grid').locator('a');
  await expect(themeCards).toHaveCount(themes.length);
  for (const theme of themes) {
    await page.goto(`/#/theme/${theme.id}/games`);
    for (const gameType of theme.allowedGameTypes) {
      const existingLevels = levels.filter(level => level.themeId === theme.id && level.gameType === gameType);
      if (!existingLevels.length) continue;
      await expect(page.locator(`a.game-choice-${gameType}`)).toBeVisible();
      await page.goto(`/#/theme/${theme.id}/games/${gameType}`);
      for (const level of existingLevels) {
        await expect(page.locator(`[data-level-id="${level.id}"][data-status="available"]`)).toHaveCount(1);
      }
      await page.goto(`/#/theme/${theme.id}/games`);
    }
  }
});

test('每个已制作的 2D 关卡都可从直接链接进入', async ({ page }) => {
  test.setTimeout(120_000);
  for (const level of levels) {
    await page.goto(`/#/play/${level.id}`);
    await expect(page.locator('.page-play'), level.id).toBeVisible();
    await expect(page.getByRole('heading', { name: /尚未解锁|入口尚未开放/ }), level.id).toHaveCount(0);
  }
});

test('五种现有 2D 玩法能完成素材加载并显示操作', async ({ page }) => {
  test.setTimeout(120_000);
  const levelFor = (gameType: Level['gameType']) => levels.find(level => level.gameType === gameType)!;
  await page.goto(`/#/play/${levelFor('spot-difference').id}`);
  await expect(page.getByRole('button', { name: '放大两图' })).toBeEnabled({ timeout: 30_000 });
  await page.goto(`/#/play/${levelFor('puzzle').id}`);
  await expect(page.getByRole('button', { name: '拼图提示' })).toBeEnabled({ timeout: 30_000 });
  await page.goto(`/#/play/${levelFor('coloring').id}`);
  await expect(page.getByRole('button', { name: '1×', exact: true })).toBeEnabled({ timeout: 30_000 });
  await page.goto(`/#/play/${levelFor('hidden-object').id}`);
  await expect(page.getByTestId('hidden-object-ready')).toBeVisible({ timeout: 30_000 });
  await page.goto(`/#/play/${levelFor('shadow-match').id}`);
  await expect(page.getByTestId('shadow-match-option')).toHaveCount(4, { timeout: 30_000 });
});
