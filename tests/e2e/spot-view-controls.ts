import { expect, type Page } from '@playwright/test';
import type { GameLayout } from '../../src/runtime/layout';
import type { ImageView } from '../../src/runtime/image-view';
import type { Rectangle } from '../../src/runtime/geometry';

export type SpotViewLayout = GameLayout & { view: ImageView; renderedReference: Rectangle; renderedEdited: Rectangle };

export async function readSpotView(page: Page): Promise<SpotViewLayout> {
  return JSON.parse((await page.getByTestId('phaser-player').getAttribute('data-layout'))!);
}

/** Use the actual desktop controls or the phone's cycle control, never a game-state shortcut. */
export async function setSpotZoom(page: Page, zoom: 1 | 2 | 3, keyboard = false) {
  for (let step = 0; step < 4; step++) {
    const before = (await readSpotView(page)).view.zoom;
    if (Math.abs(before - zoom) < .001) return;
    const cycle = page.getByRole('button', { name: /^同步缩放两图/ });
    const control = await cycle.isVisible() ? cycle : zoom === 1
      ? page.getByRole('button', { name: '复位', exact: true })
      : page.getByRole('button', { name: before < zoom ? '放大两图' : '缩小两图', exact: true });
    await expect(control).toBeEnabled();
    if (keyboard) { await control.focus(); await control.press('Enter'); }
    else await control.click();
    await expect.poll(async () => (await readSpotView(page)).view.zoom).not.toBe(before);
  }
  await expect.poll(async () => (await readSpotView(page)).view.zoom).toBe(zoom);
}

export function expectSpotSynchronized(layout: SpotViewLayout, aspectRatio: number) {
  expect(layout.view.zoom).toBeGreaterThanOrEqual(1);
  expect(layout.view.zoom).toBeLessThanOrEqual(3);
  for (const [pane, rendered] of [[layout.reference, layout.renderedReference], [layout.edited, layout.renderedEdited]]) {
    expect(rendered.width / rendered.height).toBeCloseTo(aspectRatio, 5);
    expect(rendered.width / pane.width).toBeCloseTo(layout.view.zoom, 5);
    expect(rendered.height / pane.height).toBeCloseTo(layout.view.zoom, 5);
    expect((pane.x + pane.width / 2 - rendered.x) / rendered.width).toBeCloseTo(layout.view.center.x, 5);
    expect((pane.y + pane.height / 2 - rendered.y) / rendered.height).toBeCloseTo(layout.view.center.y, 5);
  }
}

export async function dragSpotView(page: Page, side: 'reference' | 'edited', fraction = { x: .15, y: .12 }) {
  const before = await readSpotView(page);
  const pane = before[side];
  const canvas = (await page.getByTestId('phaser-player').locator('canvas').boundingBox())!;
  const start = { x: canvas.x + pane.x + pane.width / 2, y: canvas.y + pane.y + pane.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + pane.width * fraction.x, start.y + pane.height * fraction.y, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await readSpotView(page)).view.center).not.toEqual(before.view.center);
}
