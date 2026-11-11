import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
const chapters = JSON.parse(readFileSync('src/content/world/flying-history-art-v001.json', 'utf8')) as unknown[];
const musicKeys = [...chapters.map((_, index) => `chapter:${index + 1}`), ...MUSIC_INSTRUMENTS.map(({ id }) => `instrument:${id}`), 'outfit']
  .map(key => `dunhuang:music-gallery:progress:v1:${key}`);

for (const [id, title] of [['music-apsara-shadow', '配对完成'], ['music-hidden-objects-intro', '寻宝完成']] as const) {
  test(`${title}在手机横屏完整显示`, async ({ browser }, info) => {
    const context = await browser.newContext({ baseURL: String(info.project.use.baseURL), viewport: { width: 874, height: 260 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await page.addInitScript(({ id, keys }) => {
        localStorage.setItem('dunhuang:progress:v1', JSON.stringify({ version: 1, completed: { [id]: '2026-11-09T00:00:00.000Z' }, settings: { reducedMotion: true } }));
        for (const key of keys) localStorage.setItem(key, 'yes');
      }, { id, keys: musicKeys });
      await page.goto(`/#/result/${id}`);
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      const heading = (await page.locator('.result-heading').boundingBox())!;
      const review = (await page.locator('.result-review').boundingBox())!;
      const reference = (await page.locator('.result-reference').boundingBox())!;
      const actions = (await page.locator('.result-actions').boundingBox())!;
      await page.screenshot({ path: `work/qa/screenshots/result-${id}-phone.png` });
      expect(reference.width).toBeGreaterThan(150);
      expect(review.y).toBeGreaterThanOrEqual(heading.y + heading.height - 1);
      expect(review.y + review.height).toBeLessThanOrEqual(actions.y + 1);
      expect(actions.y + actions.height).toBeLessThanOrEqual(260);
      const documentSize = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
      expect(documentSize).toEqual([874, 260]);
      if (id === 'music-apsara-shadow') {
        for (const figure of await page.locator('.shadow-result-images figure').all()) {
          const rect = (await figure.boundingBox())!;
          expect(rect.y).toBeGreaterThanOrEqual(review.y);
          expect(rect.y + rect.height).toBeLessThanOrEqual(review.y + review.height + 1);
          await expect(figure.locator('img')).toBeVisible();
        }
      }
    } finally { await context.close(); }
  });
}
