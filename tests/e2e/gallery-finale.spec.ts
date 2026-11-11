import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const viewed = (JSON.parse(readFileSync('src/content/world/mogao-exhibit-v001.json', 'utf8')) as { items: { id: string }[] }).items.map(item => item.id);
test('手机横屏完成后长卷完整展示，玩家可重玩且末关禁用下一关', async ({ browser }, info) => {
  const context = await browser.newContext({ baseURL: String(info.project.use.baseURL), viewport: { width: 874, height: 260 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  try {
    await page.addInitScript(viewed => {
      for (const id of ['bandits', 'burning-house', 'story-demo', 'novice-story']) localStorage.setItem(`dunhuang:mogao-hall-a:progress:v2:${id}`, 'complete');
      localStorage.setItem('dunhuang:mogao-hall-a:progress:v2:award', 'received');
      localStorage.setItem('dunhuang:mogao-exhibit:progress:v1', JSON.stringify({ version: 1, viewed, introSeen: true, noticeSeen: true }));
      localStorage.setItem('dunhuang:progress:v1', JSON.stringify({ version: 1, completed: { 'puzzle-nine-colored-deer': '2026-11-09T00:00:00.000Z' }, settings: { reducedMotion: false } }));
    }, viewed);
    await page.goto('/#/result/puzzle-nine-colored-deer');
    await expect(page.getByTestId('gallery-result-mural')).toBeVisible();
    const result = page.getByTestId('gallery-puzzle-result');
    const timing = await result.evaluate(node => {
      const art = node.querySelector('.gallery-result-mural')!, text = node.querySelector('.gallery-result-congratulations')!, actions = node.querySelector('.gallery-result-actions')!;
      return [getComputedStyle(art).animationDuration, getComputedStyle(text).animationDelay, getComputedStyle(actions).animationDelay];
    });
    expect(timing).toEqual(['1.5s', '3s', '3.5s']);
    await expect(page.getByRole('heading', { name: '恭喜完成！' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '重玩' })).toBeVisible();
    await expect(page.getByTestId('gallery-result-next')).toBeDisabled();
    await page.waitForTimeout(500);
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
    expect(size).toEqual([874, 260]);
    await expect(page.getByTestId('gallery-result-mural')).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: 'work/qa/screenshots/mural-finale-phone.png' });
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('gallery-puzzle-result')).toBeVisible();
    await page.getByRole('button', { name: '重玩' }).click();
    await expect(page.locator('.gallery-screen')).toBeVisible();
  } finally { await context.close(); }
});
