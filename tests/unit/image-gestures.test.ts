import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindImageGestures } from '../../src/runtime/image-gestures';
import { imageViewRect, initialImageView, panImageView, pinchImageView } from '../../src/runtime/image-view';
import { logicalPointer } from '../../src/runtime/render-coordinates';

class Canvas extends EventTarget {
  style = { touchAction: 'manipulation' };
  captured = new Set<number>();
  getBoundingClientRect() { return { left: 20, top: 10, width: 600, height: 300 }; }
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  pointer(type: string, id: number, x: number, y: number) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, clientX: x + 20, clientY: y + 10, pointerType: 'touch', button: 0 });
    this.dispatchEvent(event);
  }
  wheel(deltaY: number, deltaMode = 0) {
    const event = new Event('wheel', { cancelable: true });
    Object.assign(event, { clientX: 320, clientY: 160, deltaY, deltaMode });
    this.dispatchEvent(event);
    return event;
  }
}
beforeEach(() => vi.stubGlobal('window', new EventTarget()));
afterEach(() => vi.unstubAllGlobals());

function fixture(wheelZoom = false) {
  const canvas = new Canvas(), tap = vi.fn(), pan = vi.fn(), pinch = vi.fn();
  let enabled = true;
  const gestures = bindImageGestures(canvas as unknown as HTMLCanvasElement, {
    viewport: () => ({ width: 600, height: 300 }), enabled: () => enabled,
    canStart: p => p.x < 550, onTap: tap, onPan: pan, onPinch: pinch, wheelZoom,
  });
  return { canvas, tap, pan, pinch, gestures, disable: () => { enabled = false; } };
}

describe('native image gestures', () => {
  it('waits until release before a real tap, independent from backing DPR', () => {
    const { canvas, tap, gestures } = fixture();
    canvas.pointer('pointerdown', 1, 100, 120); expect(tap).not.toHaveBeenCalled();
    canvas.pointer('pointerup', 1, 102, 121); expect(tap).toHaveBeenCalledWith({ x: 102, y: 121 });
    expect(canvas.captured.size).toBe(0); gestures.dispose();
  });
  it('does not turn a drag or release outside the accepted picture into a tap', () => {
    const { canvas, tap, pan, gestures } = fixture();
    canvas.pointer('pointerdown', 1, 100, 120); canvas.pointer('pointermove', 1, 125, 128);
    canvas.pointer('pointerup', 1, 125, 128); expect(pan).toHaveBeenCalledWith({ x: 25, y: 8 }, { x: 125, y: 128 });
    canvas.pointer('pointerdown', 2, 100, 120); canvas.pointer('pointerup', 2, 580, 120);
    expect(tap).not.toHaveBeenCalled(); gestures.dispose();
  });
  it('pinches continuously and suppresses both finger releases, including a remaining finger drag', () => {
    const { canvas, tap, pinch, gestures } = fixture();
    canvas.pointer('pointerdown', 1, 100, 120); canvas.pointer('pointerdown', 2, 200, 120);
    canvas.pointer('pointermove', 2, 300, 120);
    expect(pinch).toHaveBeenCalledWith({ from: { x: 150, y: 120 }, to: { x: 200, y: 120 }, scale: 2 });
    canvas.pointer('pointerup', 2, 300, 120); canvas.pointer('pointermove', 1, 120, 120);
    canvas.pointer('pointerup', 1, 120, 120); expect(tap).not.toHaveBeenCalled(); gestures.dispose();
  });
  it.each(['pointercancel', 'lostpointercapture'])('%s cancels the whole gesture without tapping', type => {
    const { canvas, tap, gestures } = fixture();
    canvas.pointer('pointerdown', 1, 100, 120); canvas.pointer(type, 1, 100, 120);
    canvas.pointer('pointerup', 1, 100, 120); expect(tap).not.toHaveBeenCalled();
    expect(canvas.captured.size).toBe(0); gestures.dispose();
  });
  it('blocks an unfinished tap and removes all listeners on teardown', () => {
    const { canvas, tap, gestures, disable } = fixture();
    canvas.pointer('pointerdown', 1, 100, 120); disable(); canvas.pointer('pointerup', 1, 100, 120);
    gestures.dispose(); canvas.pointer('pointerdown', 2, 100, 120); canvas.pointer('pointerup', 2, 100, 120);
    expect(tap).not.toHaveBeenCalled(); expect(canvas.style.touchAction).toBe('manipulation');
  });
  it('does not commit an already captured pointer when a modal opens above the canvas', () => {
    const { canvas, tap, gestures } = fixture();
    canvas.pointer('pointerdown', 1, 100, 120);
    vi.stubGlobal('document', { hidden: false, querySelector: () => ({ open: true }) });
    canvas.pointer('pointerup', 1, 100, 120);
    expect(tap).not.toHaveBeenCalled(); expect(canvas.captured.size).toBe(0); gestures.dispose();
  });
  it('opts into anchored wheel zoom, normalizes delta units and suppresses the held-pointer tap', () => {
    const { canvas, pinch, tap, gestures } = fixture(true);
    canvas.pointer('pointerdown', 1, 300, 150);
    expect(canvas.wheel(-48).defaultPrevented).toBe(true);
    const first = pinch.mock.calls[0][0];
    expect(first.from).toEqual({ x: 300, y: 150 }); expect(first.to).toEqual(first.from);
    expect(first.scale).toBeGreaterThan(1);
    canvas.pointer('pointerup', 1, 300, 150); expect(tap).not.toHaveBeenCalled();
    canvas.wheel(-3, 1); expect(pinch.mock.calls[1][0]).toEqual(first);
    canvas.wheel(48); expect(pinch.mock.calls[2][0].scale).toBeCloseTo(1 / first.scale);
    gestures.dispose(); canvas.wheel(-48); expect(pinch).toHaveBeenCalledTimes(3);
  });
  it('leaves wheel input untouched for other games and while blocked or covered by a modal', () => {
    const original = fixture();
    expect(original.canvas.wheel(-48).defaultPrevented).toBe(false);
    expect(original.pinch).not.toHaveBeenCalled(); original.gestures.dispose();
    const disabled = fixture(true); disabled.disable();
    expect(disabled.canvas.wheel(-48).defaultPrevented).toBe(false);
    expect(disabled.pinch).not.toHaveBeenCalled(); disabled.gestures.dispose();
    const modal = fixture(true);
    vi.stubGlobal('document', { hidden: false, querySelector: () => ({ open: true }) });
    expect(modal.canvas.wheel(-48).defaultPrevented).toBe(false);
    expect(modal.pinch).not.toHaveBeenCalled(); modal.gestures.dispose();
  });
});

describe('shared normalized image view', () => {
  const left = { x: 10, y: 20, width: 300, height: 300 }, right = { ...left, x: 340 };
  it('preserves the same original-image point under an off-center pinch on either picture', () => {
    const from = { x: 190, y: 140 }, to = { x: 200, y: 150 };
    const a = pinchImageView(initialImageView(), left, from, to, 2);
    const b = pinchImageView(initialImageView(), right, { x: from.x + 330, y: from.y }, { x: to.x + 330, y: to.y }, 2);
    expect(a).toEqual(b);
    const rect = imageViewRect(left, a);
    expect((to.x - rect.x) / rect.width).toBeCloseTo((from.x - left.x) / left.width);
    expect((to.y - rect.y) / rect.height).toBeCloseTo((from.y - left.y) / left.height);
  });
  it('clamps zoom and pan without exposing blank edges, and 1× returns the complete picture', () => {
    const zoomed = pinchImageView(initialImageView(), left, { x: 160, y: 170 }, { x: 160, y: 170 }, 10);
    expect(zoomed.zoom).toBe(3);
    const panned = panImageView(zoomed, left, { x: 99999, y: -99999 });
    const rect = imageViewRect(left, panned);
    expect(rect.x).toBeLessThanOrEqual(left.x); expect(rect.y + rect.height).toBeGreaterThanOrEqual(left.y + left.height);
    expect(pinchImageView(panned, left, { x: 160, y: 170 }, { x: 160, y: 170 }, .01)).toEqual(initialImageView());
  });
  it('maps Phaser pointer backing pixels to the same CSS logical point on a high density canvas', () => {
    const scene = { game: { scale: { gameSize: { width: 1200, height: 600 } } } };
    expect(logicalPointer(scene as never, { x: 240, y: 160 } as never, { width: 600, height: 300 })).toEqual({ x: 120, y: 80 });
  });
});
