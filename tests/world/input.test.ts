import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorldInput } from '../../src/world/input';

class Canvas extends EventTarget {
  style = { touchAction: 'manipulation' };
  captured = new Set<number>();
  heldButtons = 0;
  focus = vi.fn();
  getBoundingClientRect() { return { left: 20, top: 10, width: 800, height: 400 }; }
  setPointerCapture(id: number) { this.captured.add(id); }
  hasPointerCapture(id: number) { return this.captured.has(id); }
  releasePointerCapture(id: number) { this.captured.delete(id); }
  pointer(type: string, x: number, y: number, pointerType = 'mouse', pointerId = 1, button = 0, buttons?: number) {
    if (type === 'pointerdown') this.heldButtons = button === 2 ? 2 : 1;
    if (type === 'pointerup') this.heldButtons = 0;
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId, clientX: x, clientY: y, pointerType, button, buttons: buttons ?? this.heldButtons });
    this.dispatchEvent(event);
  }
  wheel(deltaY: number, deltaMode = 0) {
    const event = new Event('wheel', { cancelable: true });
    Object.assign(event, { deltaY, deltaMode });
    this.dispatchEvent(event); return event;
  }
}

beforeEach(() => {
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false }));
  vi.stubGlobal('Element', class extends EventTarget { closest() { return null; } });
});
afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const canvas = new Canvas(), interact = vi.fn(), yaw = vi.fn(), tilt = vi.fn(), zoom = vi.fn(), intent = vi.fn();
  const input = createWorldInput(canvas as unknown as HTMLCanvasElement, interact, yaw, intent, { onTilt: tilt, onZoom: zoom });
  return { canvas, interact, yaw, tilt, zoom, intent, input };
}
function key(code: string, target?: EventTarget) {
  const event = new Event('keydown', { cancelable: true });
  Object.assign(event, { code, repeat: false });
  if (target) Object.defineProperty(event, 'target', { value: target });
  window.dispatchEvent(event);
}

describe('world mouse and touch input', () => {
  it('looks with either mouse button while preserving clicks and ignoring hovering', () => {
    const { canvas, yaw, tilt, intent, interact, input } = fixture();
    canvas.pointer('pointermove', 200, 150); canvas.pointer('pointermove', 250, 125);
    expect(yaw).not.toHaveBeenCalled(); expect(tilt).not.toHaveBeenCalled(); expect(intent).not.toHaveBeenCalled();
    canvas.pointer('pointerdown', 200, 150, 'mouse', 1, 2);
    expect(canvas.captured.has(1)).toBe(true);
    canvas.pointer('pointermove', 250, 125);
    expect(yaw).toHaveBeenLastCalledWith(-.2); expect(tilt).toHaveBeenLastCalledWith(.1);
    canvas.pointer('pointerup', 250, 125, 'mouse', 1, 2);
    canvas.pointer('pointermove', 700, 300); expect(yaw).toHaveBeenCalledTimes(1);
    canvas.pointer('pointerdown', 700, 300); canvas.pointer('pointermove', 740, 320); canvas.pointer('pointerup', 740, 320);
    expect(yaw).toHaveBeenCalledTimes(2); expect(yaw).toHaveBeenLastCalledWith(-.16);
    expect(tilt).toHaveBeenCalledTimes(2); expect(tilt).toHaveBeenLastCalledWith(-.08); expect(interact).not.toHaveBeenCalled();
    // Even a stationary right click is never an object interaction.
    canvas.pointer('pointerdown', 700, 300, 'mouse', 1, 2); canvas.pointer('pointerup', 700, 300, 'mouse', 1, 2);
    expect(interact).not.toHaveBeenCalled(); expect(canvas.captured.size).toBe(0);
    input.dispose();
  });

  it('stops right-button look on cancellation, lost capture, blur, disabling, or a released-button bitmask', () => {
    const { canvas, yaw, tilt, interact, input } = fixture();
    for (const end of ['pointercancel', 'lostpointercapture', 'blur', 'disabled', 'buttons']) {
      canvas.pointer('pointerdown', 500, 200, 'mouse', 1, 2);
      if (end === 'blur') window.dispatchEvent(new Event('blur'));
      else if (end === 'disabled') { input.setEnabled(false); input.setEnabled(true); }
      else if (end === 'buttons') canvas.pointer('pointermove', 520, 220, 'mouse', 1, 0, 0);
      else canvas.pointer(end, 500, 200);
      canvas.pointer('pointermove', 540, 240, 'mouse', 1, 0, 2);
      canvas.pointer('pointerup', 540, 240, 'mouse', 1, 2);
    }
    expect(yaw).not.toHaveBeenCalled(); expect(tilt).not.toHaveBeenCalled(); expect(interact).not.toHaveBeenCalled();
    expect(canvas.captured.size).toBe(0); input.dispose();
  });

  it('separates taps from dragging and accepts Enter only on the focused canvas', () => {
    const { canvas, interact, yaw, tilt, input, intent } = fixture();
    canvas.pointer('pointerdown', 400, 200); expect(interact).not.toHaveBeenCalled();
    canvas.pointer('pointermove', 402, 201); expect(yaw).not.toHaveBeenCalled(); expect(tilt).not.toHaveBeenCalled();
    canvas.pointer('pointerup', 402, 201); expect(interact).toHaveBeenCalledWith({ clientX: 402, clientY: 201 });
    canvas.pointer('pointerdown', 400, 200); canvas.pointer('pointermove', 430, 200); canvas.pointer('pointerup', 430, 200);
    expect(interact).toHaveBeenCalledTimes(1);
    intent.mockClear();
    key('KeyF'); key('Enter');
    expect(interact).toHaveBeenCalledTimes(1); expect(intent).not.toHaveBeenCalled();
    key('Enter', canvas); expect(interact.mock.calls[1]).toEqual([]);
    expect(canvas.captured.size).toBe(0); input.dispose();
  });

  it('stops left-drag look if the browser interrupts the pressed button', () => {
    const { canvas, yaw, interact, input } = fixture();
    canvas.pointer('pointerdown', 400, 200);
    canvas.pointer('pointermove', 430, 200, 'mouse', 1, 0, 0);
    canvas.pointer('pointermove', 460, 200, 'mouse', 1, 0, 1);
    canvas.pointer('pointerup', 460, 200);
    expect(yaw).not.toHaveBeenCalled(); expect(interact).not.toHaveBeenCalled();
    input.dispose();
  });

  it('turns a right-side touch drag, leaves left-side drags to movement, and permits taps on either side', () => {
    const { canvas, yaw, tilt, interact, input } = fixture();
    // React owns the other finger on its separate joystick, outside canvas.
    input.setJoystick(.4, -.9);
    canvas.pointer('pointerdown', 600, 200, 'touch');
    canvas.pointer('pointermove', 602, 202, 'touch'); expect(yaw).not.toHaveBeenCalled();
    canvas.pointer('pointermove', 632, 182, 'touch');
    expect(yaw).toHaveBeenLastCalledWith(-.12); expect(tilt).toHaveBeenLastCalledWith(.08);
    expect(input.read()).toMatchObject({ x: .4, y: -.9, run: true });
    canvas.pointer('pointerup', 632, 182, 'touch'); expect(interact).not.toHaveBeenCalled();
    expect(input.read()).toMatchObject({ x: .4, y: -.9 });
    input.setJoystick(0, 0); expect(input.read()).toMatchObject({ x: 0, y: 0 });
    canvas.pointer('pointerdown', 200, 200, 'touch'); canvas.pointer('pointermove', 250, 180, 'touch'); canvas.pointer('pointerup', 250, 180, 'touch');
    expect(yaw).toHaveBeenCalledTimes(1); expect(interact).not.toHaveBeenCalled();
    canvas.pointer('pointerdown', 200, 200, 'touch'); canvas.pointer('pointerup', 200, 200, 'touch');
    expect(interact).toHaveBeenCalledWith({ clientX: 200, clientY: 200 }); input.dispose();
  });

  it('never interprets a multi-finger gesture, cancelled pointer or off-canvas release as a tap', () => {
    const { canvas, interact, yaw, input } = fixture();
    canvas.pointer('pointerdown', 600, 200, 'touch', 1); canvas.pointer('pointerdown', 700, 200, 'touch', 2);
    canvas.pointer('pointermove', 740, 200, 'touch', 2); canvas.pointer('pointerup', 740, 200, 'touch', 2);
    canvas.pointer('pointermove', 620, 200, 'touch', 1); canvas.pointer('pointerup', 620, 200, 'touch', 1);
    expect(yaw).not.toHaveBeenCalled(); expect(interact).not.toHaveBeenCalled();
    for (const type of ['pointercancel', 'lostpointercapture']) {
      canvas.pointer('pointerdown', 600, 200, 'touch'); canvas.pointer(type, 600, 200, 'touch'); canvas.pointer('pointerup', 600, 200, 'touch');
    }
    canvas.pointer('pointerdown', 819, 200, 'touch'); canvas.pointer('pointerup', 825, 200, 'touch');
    expect(interact).not.toHaveBeenCalled(); expect(canvas.captured.size).toBe(0); input.dispose();
  });

  it('zooms as two fingers spread or pinch without turning or tapping after release', () => {
    const { canvas, interact, yaw, tilt, zoom, input } = fixture();
    canvas.pointer('pointerdown', 500, 200, 'touch', 1);
    canvas.pointer('pointerdown', 600, 200, 'touch', 2);
    expect(zoom).not.toHaveBeenCalled();
    canvas.pointer('pointermove', 650, 200, 'touch', 2);
    const inward = zoom.mock.calls[0][0];
    expect(inward).toBeLessThan(0);
    canvas.pointer('pointermove', 600, 200, 'touch', 2);
    expect(zoom.mock.calls[1][0]).toBeCloseTo(-inward);
    canvas.pointer('pointercancel', 600, 200, 'touch', 2);
    canvas.pointer('pointermove', 480, 200, 'touch', 1);
    canvas.pointer('pointerup', 480, 200, 'touch', 1);
    expect(zoom).toHaveBeenCalledTimes(2);
    expect(yaw).not.toHaveBeenCalled();
    expect(tilt).not.toHaveBeenCalled();
    expect(interact).not.toHaveBeenCalled();
    input.dispose();
  });

  it('normalizes and bounds wheel zoom, and blocks input plus unfinished taps while disabled', () => {
    const { canvas, zoom, interact, yaw, input } = fixture();
    expect(canvas.wheel(100).defaultPrevented).toBe(true); expect(zoom).toHaveBeenLastCalledWith(1);
    canvas.wheel(-3, 1); expect(zoom).toHaveBeenLastCalledWith(-.48);
    canvas.wheel(1, 2); expect(zoom).toHaveBeenLastCalledWith(2);
    canvas.pointer('pointerdown', 600, 200, 'touch'); input.setEnabled(false);
    canvas.pointer('pointerup', 600, 200, 'touch'); key('KeyW');
    expect(canvas.wheel(100).defaultPrevented).toBe(false);
    canvas.pointer('pointermove', 100, 100); canvas.pointer('pointermove', 300, 300);
    expect(yaw).not.toHaveBeenCalled(); expect(interact).not.toHaveBeenCalled(); expect(input.read().y).toBe(0);
    input.setEnabled(true); canvas.pointer('pointermove', 700, 200); expect(yaw).not.toHaveBeenCalled(); input.dispose();
  });

  it('does not turn a left press into an object click after wheel zoom', () => {
    const { canvas, interact, input } = fixture();
    canvas.pointer('pointerdown', 400, 200);
    canvas.wheel(100);
    canvas.pointer('pointerup', 400, 200);
    expect(interact).not.toHaveBeenCalled();
    input.dispose();
  });

  it('clears held controls at blur, background and teardown without synthesizing resumed movement', () => {
    const { canvas, input, interact, zoom, yaw } = fixture();
    key('KeyW'); key('ShiftLeft'); expect(input.read()).toMatchObject({ y: -1, run: true });
    window.dispatchEvent(new Event('blur')); expect(input.read()).toMatchObject({ x: 0, y: 0, run: false });
    input.setJoystick(.4, .9); canvas.pointer('pointerdown', 600, 200, 'touch');
    Object.assign(document, { hidden: true }); document.dispatchEvent(new Event('visibilitychange'));
    canvas.pointer('pointerup', 600, 200, 'touch'); expect(interact).not.toHaveBeenCalled();
    expect(input.read()).toMatchObject({ x: 0, y: 0 }); expect(canvas.captured.size).toBe(0);
    input.dispose(); expect(canvas.style.touchAction).toBe('manipulation');
    key('Enter', canvas); canvas.wheel(100); canvas.pointer('pointermove', 200, 100); canvas.pointer('pointermove', 300, 100);
    expect(interact).not.toHaveBeenCalled(); expect(zoom).not.toHaveBeenCalled(); expect(yaw).not.toHaveBeenCalled();
  });
});
