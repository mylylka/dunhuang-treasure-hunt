import { describe, expect, it } from 'vitest';
import { calculateColoringLayout, clearColoring, colorsEqual, createColoringState, decodeRegionId,
  imagePoint, interpolateColor, paintRegion, undoColoring } from '../../src/games/coloring/rules';
import { calculateLayout } from '../../src/runtime/layout';

describe('独立填色状态与可撤销编辑', () => {
  it('滤除未知区域及坏颜色，白色不伪记为实际着色', () => {
    expect(createColoringState({ 1: '#AABBCC', 2: '#ffffff', 3: 'red', 4: '#112233', 0: '#123456' }, new Set([1, 2, 3]))
      .colors).toEqual({ 1: '#aabbcc' });
    const empty = createColoringState();
    expect(paintRegion(empty, 1, '#ffffff')).toBe(empty);
    expect(paintRegion(empty, 0, '#123456')).toBe(empty);
  });

  it('重复同色不生成编辑，撤销返回原颜色且原状态不被改变', () => {
    const initial = createColoringState({ 1: '#aabbcc' });
    const changed = paintRegion(initial, 1, '#345678');
    expect(paintRegion(changed, 1, '#345678')).toBe(changed);
    expect(undoColoring(changed).colors).toEqual({ 1: '#aabbcc' });
    expect(initial.colors).toEqual({ 1: '#aabbcc' });
    expect(initial.history).toEqual([]);
  });

  it('擦除和清空均可撤销，连续撤销不丢失其他区域', () => {
    const initial = createColoringState({ 1: '#123456', 2: '#abcdef' });
    const erased = paintRegion(initial, 1, null);
    const cleared = clearColoring(erased);
    expect(cleared.colors).toEqual({});
    expect(undoColoring(cleared).colors).toEqual({ 2: '#abcdef' });
    expect(undoColoring(undoColoring(cleared)).colors).toEqual(initial.colors);
    expect(clearColoring(createColoringState()).history).toHaveLength(0);
  });

  it('ID按低位R、高位B解码，柔和插值两端与中点正确', () => {
    expect(decodeRegionId(1, 2, 3)).toBe(197121);
    expect(decodeRegionId(0, 0, 0)).toBe(0);
    expect(interpolateColor('#ffffff', '#000000', 0)).toBe('#ffffff');
    expect(interpolateColor('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(interpolateColor('#ffffff', '#000000', 1)).toBe('#000000');
    expect(colorsEqual({ 1: '#aabbcc' }, { 1: '#aabbcc' })).toBe(true);
    expect(colorsEqual({ 1: '#aabbcc' }, { 2: '#aabbcc' })).toBe(false);
  });
});

describe('真实图幅与放大拖动坐标', () => {
  it.each([1, 1.5, 0.75])('两图ratio=%s保持原比例并完整放入画布', ratio => {
    for (const [width, height] of [[1200, 500], [360, 440], [844, 200]]) {
      const layout = calculateLayout(width, height, ratio);
      for (const rectangle of [layout.reference, layout.edited]) {
        expect(rectangle.width / rectangle.height).toBeCloseTo(ratio, 8);
        expect(rectangle.x).toBeGreaterThanOrEqual(0);
        expect(rectangle.y).toBeGreaterThanOrEqual(0);
        expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(width + 0.001);
        expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(height + 0.001);
      }
    }
  });

  it('填色1倍完整显示，3倍拖动限于图像边缘，坐标仍映射原像素', () => {
    const fitted = calculateColoringLayout(360, 440, 1);
    expect(fitted.image.width / fitted.image.height).toBe(1);
    expect(fitted.image.x).toBeGreaterThanOrEqual(0);
    expect(fitted.image.y).toBeGreaterThanOrEqual(0);
    const zoomed = calculateColoringLayout(360, 440, 1, 3, { x: 99999, y: -99999 });
    expect(zoomed.image.x).toBe(0);
    expect(zoomed.image.y + zoomed.image.height).toBe(440);
    const point = imagePoint({ x: zoomed.image.x + zoomed.image.width * 0.5, y: zoomed.image.y + zoomed.image.height * 0.5 }, zoomed.image, 1254, 1254);
    expect(point).toEqual({ x: 627, y: 627 });
    expect(imagePoint({ x: 0, y: 0 }, fitted.image, 1254, 1254)).toBeNull();
  });
});
