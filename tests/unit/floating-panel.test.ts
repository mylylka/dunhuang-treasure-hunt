import { describe, expect, it } from 'vitest';
import { clampFloatingPanel, fitFloatingPanel } from '../../src/runtime/floating-panel';

const viewport = { x: 0, y: 0, width: 844, height: 330 };
const tools = { x: 608, y: 6, width: 230, height: 318 };
const preferred = { width: 210, height: 250 };

describe('非模态色盘的初始工具区与拖动边界', () => {
  it('即使允许拖动覆盖画布，首次打开仍完整位于右两栏', () => {
    const layout = fitFloatingPanel(viewport, tools, preferred, true)!;
    expect(layout.position.x).toBeGreaterThanOrEqual(tools.x);
    expect(layout.position.x + layout.size.width).toBeLessThanOrEqual(tools.x + tools.width);
    expect(layout.position.y).toBeGreaterThanOrEqual(tools.y);
    expect(layout.position.y + layout.size.height).toBeLessThanOrEqual(tools.y + tools.height);
  });

  it('默认不盖画布，明确允许后可以移到画布且整个窗体始终在viewport内', () => {
    const confined = fitFloatingPanel(viewport, tools, preferred)!;
    expect(clampFloatingPanel({ x: -100, y: 1000 }, preferred, confined.bounds)).toEqual({ x: 608, y: 74 });
    const movable = fitFloatingPanel(viewport, tools, preferred, true)!;
    expect(clampFloatingPanel({ x: -100, y: 1000 }, preferred, movable.bounds)).toEqual({ x: 0, y: 80 });
    expect(clampFloatingPanel({ x: 1000, y: -100 }, preferred, movable.bounds)).toEqual({ x: 634, y: 0 });
  });

  it('窗口缩小夹取旧位置，重新打开不沿用遮住画布的位置', () => {
    const resized = fitFloatingPanel({ x: 0, y: 0, width: 640, height: 300 }, { x: 414, y: 6, width: 220, height: 288 }, preferred,
      true, { x: 620, y: 80 })!;
    expect(resized.position).toEqual({ x: 430, y: 50 });
    const reopened = fitFloatingPanel(viewport, tools, preferred, true)!;
    expect(reopened.position).toEqual(reopened.initialPosition);
    expect(reopened.position.x).toBeGreaterThanOrEqual(tools.x);
  });

  it('极小可用区缩小窗体；隐藏或完全越界的工具区不生成错误位置', () => {
    const small = fitFloatingPanel({ x: 0, y: 0, width: 180, height: 190 }, { x: 0, y: 0, width: 180, height: 190 }, preferred)!;
    expect(small.size).toEqual({ width: 180, height: 190 });
    expect(small.position).toEqual({ x: 0, y: 0 });
    expect(fitFloatingPanel(viewport, { ...tools, width: 0 }, preferred)).toBeNull();
    expect(fitFloatingPanel(viewport, { ...tools, x: 900 }, preferred)).toBeNull();
    expect(clampFloatingPanel({ x: NaN, y: Infinity }, preferred, tools)).toEqual({ x: tools.x, y: tools.y });
  });
});
