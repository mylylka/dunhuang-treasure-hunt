import { describe, expect, it } from 'vitest';
import { calculateLayout } from '../../src/runtime/layout';
import { findDifferenceAtPoint } from '../../src/games/spot-difference/rules';
import { makeLevel } from '../fixtures/catalog';

describe('受宽高共同约束的屏幕式画布', () => {
  it.each([
    { width: 1200, height: 600, stacked: false },
    { width: 390, height: 520, stacked: true },
    { width: 844, height: 190, stacked: false },
    { width: 360, height: 390, stacked: true },
    { width: 400, height: 400, stacked: true },
    { width: 312, height: 300, stacked: true },
    { width: 330, height: 320, stacked: true },
    { width: 1920, height: 250, stacked: false },
  ])('$width×$height 内完整显示两张3:2图片', ({ width, height, stacked }) => {
    const layout = calculateLayout(width, height);
    expect(layout.width).toBe(width);
    expect(layout.height).toBe(height);
    expect(layout.stacked).toBe(stacked);
    for (const rectangle of [layout.reference, layout.edited]) {
      expect(rectangle.width / rectangle.height).toBeCloseTo(1.5, 8);
      expect(rectangle.width).toBeGreaterThan(0);
      expect(rectangle.x).toBeGreaterThanOrEqual(0);
      expect(rectangle.y).toBeGreaterThanOrEqual(0);
      expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(width);
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(height);
    }
    expect(layout.reference.width).toBe(layout.edited.width);
    expect(layout.reference.height).toBe(layout.edited.height);
    expect(layout.referenceLabel.y).toBeGreaterThanOrEqual(0);
    expect(layout.editedLabel.y).toBeGreaterThanOrEqual(0);
    const groupLeft = layout.reference.x;
    const groupRight = layout.edited.x + layout.edited.width;
    expect(groupLeft).toBeCloseTo(width - groupRight, 8);
    if (stacked) expect(layout.reference.y + layout.reference.height).toBeLessThan(layout.editedLabel.y);
    else expect(layout.reference.x + layout.reference.width).toBeLessThan(layout.edited.x);
  });

  it('仅改变可用高度也会缩放图片，比例坐标依然命中同一个目标', () => {
    const differences = makeLevel().differences;
    const roomy = calculateLayout(1200, 600);
    const short = calculateLayout(1200, 200);
    expect(short.reference.width).toBeLessThan(roomy.reference.width);
    for (const layout of [roomy, short, calculateLayout(390, 520)]) {
      for (const image of [layout.reference, layout.edited]) {
        expect(findDifferenceAtPoint(differences, image, {
          x: image.x + image.width * 0.75,
          y: image.y + image.height * 0.75,
        })?.id).toBe('test-two');
      }
    }
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('异常高度%s仍返回有限正尺寸', (height) => {
    const layout = calculateLayout(390, height);
    expect(Number.isFinite(layout.height)).toBe(true);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.reference.width).toBeGreaterThan(0);
    expect(layout.edited.height).toBeGreaterThan(0);
  });
});
