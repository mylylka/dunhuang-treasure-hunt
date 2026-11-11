import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameEvent } from '../../src/types';
import type { ImageGestureOptions } from '../../src/runtime/image-gestures';
import { calculateLayout, type GameLayout } from '../../src/runtime/layout';
import { imageViewRect } from '../../src/runtime/image-view';
import { createSpotDifferenceScene, intersectImageRectangles } from '../../src/games/spot-difference/scene';
import { makeLevel } from '../fixtures/catalog';

const gestures = vi.hoisted(() => ({ options: null as ImageGestureOptions | null, cancel: vi.fn(), dispose: vi.fn() }));
vi.mock('../../src/runtime/image-gestures', () => ({ bindImageGestures: (_canvas: unknown, options: ImageGestureOptions) => {
  gestures.options = options;
  return { cancel: gestures.cancel, dispose: gestures.dispose };
} }));

function setup() {
  const images: { key: string; x: number; y: number; width?: number; height?: number; crop?: number[] }[] = [];
  const graphics = () => {
    const g: Record<string, (...args: unknown[]) => unknown> = {};
    for (const key of ['clear', 'lineStyle', 'strokeRect', 'fillStyle', 'fillRoundedRect', 'strokeRoundedRect']) g[key] = () => g;
    return g;
  };
  class Scene {
    input = { enabled: true };
    textures = { exists: () => true, getFrame: () => ({ realWidth: 1200, realHeight: 800 }) };
    tweens = { killAll: vi.fn(), add: vi.fn() };
    children = { removeAll: () => { images.length = 0; } };
    events = { once: vi.fn() };
    load = { off: vi.fn() };
    game = { canvas: {}, scale: { gameSize: { width: 1600 } } };
    cameras = { main: { setOrigin: () => this.cameras.main, setScroll: () => this.cameras.main, setZoom: vi.fn() } };
    add = { graphics,
      image(x: number, y: number, key: string) {
        const image = { x, y, key, width: 0, height: 0, crop: [] as number[] };
        images.push(image);
        const chain = { setOrigin: () => chain,
          setDisplaySize(width: number, height: number) { image.width = width; image.height = height; return chain; },
          setCrop(...crop: number[]) { image.crop = crop; return chain; } };
        return chain;
      },
      circle: () => ({ setStrokeStyle: () => ({ destroy: vi.fn() }) }),
    };
  }
  const events: GameEvent[] = [];
  let layout = calculateLayout(800, 350);
  const instance = createSpotDifferenceScene({ Scene, Scenes: { Events: { SHUTDOWN: 'shutdown', DESTROY: 'destroy' } } } as never, {
    level: makeLevel(), baseImageUrl: 'a', editedImageUrl: 'b', layout,
    publishLayout(next) { layout = next; }, emit(event) { events.push(event); },
  });
  (instance.scene as unknown as { create(): void }).create();
  return { ...instance, events, images, layout: () => layout, native: () => gestures.options! };
}

beforeEach(() => { gestures.options = null; gestures.cancel.mockClear(); gestures.dispose.mockClear(); });

describe('找不同同步观察窗', () => {
  it('连续双指缩放和任意侧平移不发现差异，两侧共享归一化视图', () => {
    const game = setup();
    const pane = game.layout().reference;
    const center = { x: pane.x + pane.width / 2, y: pane.y + pane.height / 2 };
    game.native().onStart?.(center);
    game.native().onPinch({ from: center, to: center, scale: 1.65 });
    expect(game.layout().view?.zoom).toBeCloseTo(1.65);
    expect(game.events.filter(event => event.type === 'progress')).toEqual([{ type: 'progress', foundIds: [], total: 2 }]);
    const other = game.layout().edited;
    game.native().onStart?.({ x: other.x + other.width / 2, y: other.y + other.height / 2 });
    game.native().onPan({ x: 25, y: -15 }, center);
    const layout = game.layout();
    expect(layout.view!.center.x).toBeLessThan(.5);
    expect(layout.view!.center.y).toBeGreaterThan(.5);
    expect(layout.renderedReference).toEqual(imageViewRect(layout.reference, layout.view!));
    expect(layout.renderedEdited).toEqual(imageViewRect(layout.edited, layout.view!));
    const local = (image: NonNullable<GameLayout['renderedReference']>, base: typeof pane) => ({
      x: (image.x - base.x) / base.width, y: (image.y - base.y) / base.height,
    });
    expect(local(layout.renderedEdited!, layout.edited)).toEqual(local(layout.renderedReference!, layout.reference));
  });

  it('放大命中映射到原图，A底和所有B补片均裁在观察窗内，保留原配置区域', () => {
    const game = setup();
    game.controller.execute({ type: 'set-zoom', zoom: 2, sequence: 1 });
    const layout = game.layout(), view = layout.view!;
    const visible = { x: view.center.x - .5 / view.zoom, y: view.center.y - .5 / view.zoom, width: 1 / view.zoom, height: 1 / view.zoom };
    const base = game.images.filter(image => image.key === 'reference');
    expect(base).toHaveLength(2);
    for (const image of base) expect(image.crop).toEqual([300, 200, 600, 400]);
    const patches = game.images.filter(image => image.key === 'edited');
    expect(patches).toHaveLength(2);
    patches.forEach((patch, index) => {
      const intersection = intersectImageRectangles(makeLevel().differences[index].region, visible)!;
      expect(patch.crop).toEqual([intersection.x * 1200, intersection.y * 800, intersection.width * 1200, intersection.height * 800]);
    });
    // The first target's visible lower-right corner is still the same exact target after zoom.
    const image = layout.renderedEdited!;
    game.native().onTap({ x: image.x + image.width * .28, y: image.y + image.height * .28 });
    expect(game.events).toContainEqual({ type: 'progress', foundIds: ['test-one'], total: 2 });
    game.controller.resize({ width: 720, height: 300 });
    expect(game.layout().view).toEqual(view);
    expect(game.events.filter(event => event.type === 'progress')).toHaveLength(2);
  });

  it('方向中断取消原手势，阻止隐藏点击和命令，恢复保留倍率和发现状态', () => {
    const game = setup();
    game.controller.execute({ type: 'set-zoom', zoom: 2, sequence: 1 });
    const view = game.layout().view;
    game.controller.setBlocked(true);
    expect(gestures.cancel).toHaveBeenCalled();
    expect(game.native().enabled()).toBe(false);
    game.controller.execute({ type: 'restart', sequence: 2 });
    game.native().onTap({ x: 40, y: 50 });
    expect(game.layout().view).toEqual(view);
    expect(game.events.filter(event => event.type === 'progress')).toHaveLength(1);
    game.controller.setBlocked(false);
    game.controller.resize({ width: 900, height: 300 });
    expect(game.layout().view).toEqual(view);
    game.controller.dispose();
    expect(gestures.dispose).toHaveBeenCalledOnce();
  });

  it('放大中的详细提示把两图移到同一个真实区域，重来才复位视图', () => {
    const game = setup();
    game.controller.execute({ type: 'set-zoom', zoom: 3, sequence: 1 });
    game.controller.execute({ type: 'hint', sequence: 2 });
    game.controller.execute({ type: 'hint', sequence: 3 });
    expect(game.layout().view).toEqual({ zoom: 3, center: { x: .2, y: .2 } });
    expect(game.events).toContainEqual({ type: 'hint', message: '看左上大形' });
    expect(game.events.filter(event => event.type === 'progress')).toHaveLength(1);
    game.controller.execute({ type: 'restart', sequence: 4 });
    expect(game.layout().view).toEqual({ zoom: 1, center: { x: .5, y: .5 } });
    expect(game.events.at(-2)).toEqual({ type: 'progress', foundIds: [], total: 2 });
  });
});
