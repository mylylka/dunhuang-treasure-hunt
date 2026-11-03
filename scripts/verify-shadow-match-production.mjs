import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const level = JSON.parse(await readFile(new URL('../src/content/levels/music-apsara-shadow.json', import.meta.url), 'utf8'));
const progressKey = 'dunhuang:progress:v1';

/** Exercise the built game through public controls; candidate order is read from its real comparison windows. */
export async function verifyShadowMatchProduction(page, baseUrl) {
  const errors = [];
  const responseErrors = [];
  const onError = error => errors.push(error.message);
  const onResponse = response => {
    if (response.status() >= 400 && response.url().includes('/assets/')) responseErrors.push(`${response.status()} ${response.url()}`);
  };
  page.on('pageerror', onError);
  page.on('response', onResponse);
  const host = page.getByTestId('phaser-player');
  const screen = page.getByTestId('shadow-match-screen');
  const status = page.getByTestId('shadow-match-status');
  const options = page.getByTestId('shadow-match-option');
  const stored = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), progressKey);
  const noScroll = async () => {
    await expect.poll(() => page.evaluate(() => ({ x: scrollX, y: scrollY,
      width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight,
    }))).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  };
  const inside = async element => {
    await expect(element).toBeVisible();
    await expect(element).toBeInViewport({ ratio: .999 });
    const rect = await element.boundingBox();
    const viewport = page.viewportSize();
    expect(rect.x).toBeGreaterThanOrEqual(-1); expect(rect.y).toBeGreaterThanOrEqual(-1);
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 1);
  };
  const candidatePaths = async () => {
    const paths = [];
    for (const label of ['A', 'B', 'C', 'D']) {
      await page.getByRole('button', { name: `放大影子 ${label} 对照`, exact: true }).click();
      const dialog = page.getByTestId('shadow-match-inspector');
      const image = dialog.locator('img').nth(1);
      await expect(image).toHaveJSProperty('complete', true);
      expect(await image.evaluate(node => node.naturalWidth)).toBe(1254);
      paths.push(new URL(await image.getAttribute('src')).pathname);
      await page.getByRole('button', { name: '返回配对', exact: true }).click();
    }
    return paths;
  };
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}/#/theme/music`);
    await page.getByRole('button', { name: '直接玩游戏', exact: true }).click();
    await page.locator('.game-choice-shadow-match').click();
    await expect(page.getByRole('heading', { name: '影子配对关卡', exact: true })).toBeVisible();
    await expect(page.locator('.level-choice-card')).toHaveCount(1);
    await page.getByRole('link', { name: '开始配对', exact: true }).click();
    await expect(screen).toHaveAttribute('data-shadow-status', 'playing', { timeout: 45_000 });
    await expect(options).toHaveCount(4);
    await expect(host).toHaveAttribute('data-render-pixel-ratio', '2');
    await expect(page.getByTestId('hidden-object-timer')).toHaveCount(0);
    const baseline = await stored();
    const initial = await candidatePaths();
    expect(new Set(initial).size).toBe(4);
    const correct = initial.findIndex(path => path.endsWith('/shadow-intact.png'));
    expect(correct).toBeGreaterThanOrEqual(0);
    const wrong = (correct + 1) % 4;
    await options.nth(wrong).click();
    await expect(options.nth(wrong)).toHaveClass(/is-wrong/);
    await expect(screen).toHaveAttribute('data-shadow-status', 'playing');
    expect(await stored()).toEqual(baseline);
    await page.getByRole('button', { name: '配对提示', exact: true }).click();
    await expect(status).toHaveText(level.hints[0].text);
    expect(await stored()).toEqual(baseline);
    const screenshots = [];
    for (const [viewport, label] of [
      [{ width: 1440, height: 1000 }, '电脑'],
      [{ width: 1279, height: 925 }, '批注视口'],
      [{ width: 360, height: 640 }, '手机'],
      [{ width: 844, height: 390 }, '手机横屏'],
    ]) {
      await page.setViewportSize(viewport);
      await expect.poll(async () => {
        const bounds = await host.boundingBox();
        const layout = JSON.parse(await host.getAttribute('data-layout'));
        return layout.width === Math.floor(bounds.width) && layout.height === Math.floor(bounds.height);
      }).toBe(true);
      await noScroll();
      await inside(host.locator('canvas'));
      const layout = JSON.parse(await host.getAttribute('data-layout'));
      for (const card of [layout.reference, ...layout.options]) {
        expect(card.x).toBeGreaterThanOrEqual(0); expect(card.y).toBeGreaterThanOrEqual(0);
        expect(card.x + card.width).toBeLessThanOrEqual(layout.width + .01);
        expect(card.y + card.height).toBeLessThanOrEqual(layout.height + .01);
        expect(card.image.width).toBeGreaterThan(1);
        expect(Math.abs(card.image.width / card.image.height - 1)).toBeLessThan(.001);
        expect(card.image.x).toBeGreaterThanOrEqual(card.x);
        expect(card.image.y).toBeGreaterThanOrEqual(card.y);
        expect(card.image.x + card.image.width).toBeLessThanOrEqual(card.x + card.width + .01);
        expect(card.image.y + card.image.height).toBeLessThanOrEqual(card.y + card.height + .01);
      }
      for (const button of await screen.locator('button').all()) {
        await inside(button);
        const bounds = await button.boundingBox();
        expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44);
      }
      await expect(options.nth(wrong)).toHaveClass(/is-wrong/);
      expect(await candidatePaths()).toEqual(initial);
      const path = `outputs/飞天寻影-${label}预览.png`;
      await page.screenshot({ path, fullPage: true, animations: 'disabled' }); screenshots.push(path);
    }
    await page.getByRole('button', { name: '放大影子 A 对照', exact: true }).click();
    const dialog = page.getByTestId('shadow-match-inspector');
    await page.getByRole('button', { name: '3×', exact: true }).click();
    const window = dialog.locator('.shadow-match-inspector-window').first();
    const rect = await window.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 30, rect.y + rect.height / 2 + 20); await page.mouse.up();
    const transforms = await dialog.locator('.shadow-match-inspector-picture').evaluateAll(nodes => nodes.map(node => node.style.transform));
    expect(transforms[0]).toBe(transforms[1]); expect(transforms[0]).toContain('scale(3)');
    await noScroll();
    await page.screenshot({ path: 'outputs/飞天寻影-放大对照预览.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: '返回配对', exact: true }).click();
    await options.nth(correct).click();
    await expect(page.getByRole('heading', { name: '配对完成', exact: true })).toBeVisible();
    const saved = await stored();
    expect(Number.isFinite(Date.parse(saved.completed[level.id]))).toBe(true);
    for (const [id, value] of Object.entries(baseline?.completed ?? {})) expect(saved.completed[id]).toBe(value);
    if (baseline?.settings) expect(saved.settings).toEqual(baseline.settings);
    await page.reload();
    await expect(page.getByRole('heading', { name: '配对完成', exact: true })).toBeVisible();
    expect((await stored()).completed[level.id]).toBe(saved.completed[level.id]);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 360, height: 640 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await noScroll();
      for (const image of await page.locator('.shadow-result-images img').all()) { await inside(image); await expect(image).toHaveJSProperty('complete', true); }
      await inside(page.getByRole('link', { name: '返回关卡', exact: true }));
      await inside(page.getByRole('button', { name: '再配一次', exact: true }));
    }
    await page.getByRole('button', { name: '再配一次', exact: true }).click();
    await expect(screen).toHaveAttribute('data-shadow-status', 'playing', { timeout: 45_000 });
    await expect(options).toHaveCount(4);
    expect(errors).toEqual([]); expect(responseErrors).toEqual([]);
    return { levelId: level.id, screenshots, completedAt: saved.completed[level.id] };
  } finally {
    page.off('pageerror', onError); page.off('response', onResponse);
  }
}
