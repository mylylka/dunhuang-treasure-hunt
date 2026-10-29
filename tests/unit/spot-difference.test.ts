import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  discoverDifference,
  findDifferenceAtPoint,
  getNextHint,
  regionToRectangle,
  type Rectangle,
} from '../../src/games/spot-difference/rules';
import { calculateLayout } from '../../src/runtime/layout';
import type { DifferenceDefinition, NormalizedRegion } from '../../src/types';
import { makeLevel } from '../fixtures/catalog';

function target(id: string, region: NormalizedRegion): DifferenceDefinition {
  return { id, region, hint: `${id}的观察线索`, detailHint: `${id}的具体位置`, explanation: `${id}的变化` };
}

function pointInImage(image: Rectangle, x: number, y: number) {
  return { x: image.x + image.width * x, y: image.y + image.height * y };
}

describe('找不同的发现与提示规则', () => {
  it('两目标关卡在第二项完成，只结算一次，重新开始得到独立状态', () => {
    const differences = makeLevel().differences;
    const initial = createInitialState();
    const first = discoverDifference(initial, 'test-one', differences);
    const second = discoverDifference(first.state, 'test-two', differences);
    const repeated = discoverDifference(second.state, 'test-two', differences);
    const anotherClick = discoverDifference(repeated.state, 'test-one', differences);

    expect(first).toMatchObject({ newlyFound: true, justCompleted: false, state: { completed: false } });
    expect(second).toMatchObject({ newlyFound: true, justCompleted: true, state: { completed: true, foundIds: ['test-one', 'test-two'] } });
    expect([first, second, repeated, anotherClick].filter(result => result.justCompleted)).toHaveLength(1);
    expect(repeated.newlyFound).toBe(false);
    expect(anotherClick.state.foundIds).toEqual(['test-one', 'test-two']);
    expect(initial).toEqual({ foundIds: [], completed: false });
    expect(createInitialState()).toEqual({ foundIds: [], completed: false });
  });

  it('左右两图同一目标共用一个编号，换图点击不会重复发现', () => {
    const differences = makeLevel().differences;
    const layout = calculateLayout(1120);
    const leftTarget = findDifferenceAtPoint(differences, layout.reference, pointInImage(layout.reference, 0.2, 0.2));
    const rightSameTarget = findDifferenceAtPoint(differences, layout.edited, pointInImage(layout.edited, 0.2, 0.2));
    const rightNextTarget = findDifferenceAtPoint(differences, layout.edited, pointInImage(layout.edited, 0.75, 0.75));

    expect(leftTarget?.id).toBe('test-one');
    expect(rightSameTarget?.id).toBe('test-one');
    expect(rightNextTarget?.id).toBe('test-two');
    const first = discoverDifference(createInitialState(), leftTarget!.id, differences);
    const repeatFromOtherImage = discoverDifference(first.state, rightSameTarget!.id, differences);
    const finishFromOtherImage = discoverDifference(repeatFromOtherImage.state, rightNextTarget!.id, differences);
    expect(repeatFromOtherImage).toMatchObject({ newlyFound: false, justCompleted: false, state: { foundIds: ['test-one'] } });
    expect(finishFromOtherImage.state).toEqual({ foundIds: ['test-one', 'test-two'], completed: true });
  });

  it('未知编号和重复编号都不能增加发现数或提前通关', () => {
    const differences = makeLevel().differences;
    const initial = createInitialState();
    const unknown = discoverDifference(initial, 'not-in-this-level', differences);
    expect(unknown).toEqual({ state: initial, newlyFound: false, justCompleted: false });

    const first = discoverDifference(initial, 'test-one', differences);
    const repeated = discoverDifference(first.state, 'test-one', differences);
    const unknownAfterDiscovery = discoverDifference(repeated.state, 'not-in-this-level', differences);
    expect(repeated.state.foundIds).toEqual(['test-one']);
    expect(unknownAfterDiscovery.state).toEqual({ foundIds: ['test-one'], completed: false });
    expect(repeated.justCompleted).toBe(false);
    expect(unknownAfterDiscovery.justCompleted).toBe(false);
  });

  it('提示从观察线索升级到具体位置，反复提示不计为发现', () => {
    const differences = makeLevel().differences;
    const state = createInitialState();
    Object.freeze(state.foundIds);
    Object.freeze(state);
    const broad = getNextHint(differences, state.foundIds, {});
    const detailed = getNextHint(differences, state.foundIds, { 'test-one': 1 });
    const repeated = getNextHint(differences, state.foundIds, { 'test-one': 20 });

    expect(broad).toMatchObject({ message: '观察左上', detailed: false, difference: { id: 'test-one' } });
    expect(detailed).toMatchObject({ message: '看左上大形', detailed: true, difference: { id: 'test-one' } });
    expect(repeated).toMatchObject({ message: '看左上大形', detailed: true });
    expect(state).toEqual({ foundIds: [], completed: false });
  });

  it('提示跳过已找到目标，全部找到后不再提示', () => {
    const differences = makeLevel().differences;
    const firstFound = discoverDifference(createInitialState(), 'test-one', differences).state;
    const next = getNextHint(differences, firstFound.foundIds, { 'test-one': 99 });
    expect(next).toMatchObject({ difference: { id: 'test-two' }, message: '观察右下', detailed: false });
    const completed = discoverDifference(firstFound, 'test-two', differences).state;
    expect(getNextHint(differences, completed.foundIds, { 'test-one': 99, 'test-two': 99 })).toBeNull();
  });
});

describe('点击容错与图像坐标', () => {
  const image: Rectangle = { x: 0, y: 0, width: 100, height: 100 };

  it('小目标提供44个CSS像素的点击范围，范围外不自动命中', () => {
    const small = target('small', { x: 0.5, y: 0.5, width: 0.06, height: 0.06 });
    // 实际区域为50–56；扩展后中心53，左右边界31与75。
    expect(findDifferenceAtPoint([small], image, { x: 31.1, y: 53 })?.id).toBe('small');
    expect(findDifferenceAtPoint([small], image, { x: 74.9, y: 53 })?.id).toBe('small');
    expect(findDifferenceAtPoint([small], image, { x: 30.9, y: 53 })).toBeUndefined();
    expect(findDifferenceAtPoint([small], image, { x: 75.1, y: 53 })).toBeUndefined();
  });

  it('真实目标优先于相邻目标的扩大区域，即使相邻目标中心更近', () => {
    const small = target('small', { x: 0.4, y: 0.45, width: 0.02, height: 0.1 });
    const actual = target('actual', { x: 0.45, y: 0.45, width: 0.2, height: 0.1 });
    // x=46属于actual的真实区域，但离small中心41更近。
    expect(findDifferenceAtPoint([small, actual], image, { x: 46, y: 50 })?.id).toBe('actual');
    expect(findDifferenceAtPoint([actual, small], image, { x: 46, y: 50 })?.id).toBe('actual');
  });

  const neighbours = [
    target('left', { x: 0.4, y: 0.45, width: 0.1, height: 0.1 }),
    target('right', { x: 0.7, y: 0.45, width: 0.1, height: 0.1 }),
  ];

  it('两处扩大的点击区重叠时，选择更近目标而非数组第一项', () => {
    expect(findDifferenceAtPoint(neighbours, image, { x: 56, y: 50 })?.id).toBe('left');
    expect(findDifferenceAtPoint(neighbours, image, { x: 64, y: 50 })?.id).toBe('right');
    expect(findDifferenceAtPoint([...neighbours].reverse(), image, { x: 56, y: 50 })?.id).toBe('left');
    expect(findDifferenceAtPoint([...neighbours].reverse(), image, { x: 64, y: 50 })?.id).toBe('right');
  });

  it('扩大区域重叠且距离相等时忽略点击，不任意选中一项', () => {
    expect(findDifferenceAtPoint(neighbours, image, { x: 60, y: 50 })).toBeUndefined();
    expect(findDifferenceAtPoint([...neighbours].reverse(), image, { x: 60, y: 50 })).toBeUndefined();
  });

  it('靠边目标的容错不能延伸到图片外的留白', () => {
    const edge = target('edge', { x: 0, y: 0.45, width: 0.02, height: 0.1 });
    expect(findDifferenceAtPoint([edge], image, { x: -1, y: 50 })).toBeUndefined();
    expect(findDifferenceAtPoint([edge], image, { x: 0, y: 50 })?.id).toBe('edge');
  });

  it('标签、两图间隙和没有目标的画面均不计为发现', () => {
    const differences = makeLevel().differences;
    const layout = calculateLayout(1120);
    const gapPoint = { x: (layout.reference.x + layout.reference.width + layout.edited.x) / 2, y: layout.reference.y + 50 };
    for (const point of [{ x: 100, y: 5 }, gapPoint]) {
      expect(findDifferenceAtPoint(differences, layout.reference, point)).toBeUndefined();
      expect(findDifferenceAtPoint(differences, layout.edited, point)).toBeUndefined();
    }
    expect(findDifferenceAtPoint(differences, layout.reference, pointInImage(layout.reference, 0.5, 0.5))).toBeUndefined();
  });

  it('比例坐标同时包含图像的平移和缩放', () => {
    expect(regionToRectangle(
      { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      { x: 18, y: 37, width: 300, height: 200 },
    )).toEqual({ x: 48, y: 77, width: 90, height: 80 });
  });
});

describe('电脑与手机的完整画幅布局', () => {
  it.each([
    { width: 320, stacked: true },
    { width: 390, stacked: true },
    { width: 759, stacked: true },
    { width: 760, stacked: false },
    { width: 1120, stacked: false },
    { width: 1920, stacked: false },
  ])('宽度$width时，两图完整保持3:2且不互相覆盖', ({ width, stacked }) => {
    const layout = calculateLayout(width);
    expect(layout.stacked).toBe(stacked);
    for (const rectangle of [layout.reference, layout.edited]) {
      expect(rectangle.width / rectangle.height).toBeCloseTo(1.5, 8);
      expect(rectangle.width).toBeGreaterThan(0);
      expect(rectangle.height).toBeGreaterThan(0);
      expect(rectangle.x).toBeGreaterThanOrEqual(0);
      expect(rectangle.y).toBeGreaterThanOrEqual(0);
      expect(rectangle.x + rectangle.width).toBeLessThanOrEqual(layout.width);
      expect(rectangle.y + rectangle.height).toBeLessThanOrEqual(layout.height);
    }
    expect(layout.reference.width).toBe(layout.edited.width);
    expect(layout.reference.height).toBe(layout.edited.height);
    if (stacked) {
      expect(layout.edited.y).toBeGreaterThan(layout.reference.y + layout.reference.height);
      expect(layout.edited.x).toBe(layout.reference.x);
    } else {
      expect(layout.edited.x).toBeGreaterThan(layout.reference.x + layout.reference.width);
      expect(layout.edited.y).toBe(layout.reference.y);
    }
  });

  it('窗口从电脑变成手机后，同一图像位置仍命中同一目标', () => {
    const differences = makeLevel().differences;
    const desktop = calculateLayout(1120);
    const phone = calculateLayout(390);
    for (const layout of [desktop, phone]) {
      for (const rectangle of [layout.reference, layout.edited]) {
        const point = pointInImage(rectangle, 0.75, 0.75);
        expect(findDifferenceAtPoint(differences, rectangle, point)?.id).toBe('test-two');
        const hitbox = regionToRectangle(differences[1].region, rectangle);
        expect(point.x).toBeGreaterThan(hitbox.x);
        expect(point.x).toBeLessThan(hitbox.x + hitbox.width);
        expect(point.y).toBeGreaterThan(hitbox.y);
        expect(point.y).toBeLessThan(hitbox.y + hitbox.height);
      }
    }
    const staleDesktopPoint = pointInImage(desktop.reference, 0.75, 0.75);
    expect(findDifferenceAtPoint(differences, phone.reference, staleDesktopPoint)).toBeUndefined();
  });

  it.each([0, -20, Number.NaN, Number.POSITIVE_INFINITY])('容器宽度异常(%s)时仍有有限的正尺寸', width => {
    const layout = calculateLayout(width);
    expect(Number.isFinite(layout.width)).toBe(true);
    expect(Number.isFinite(layout.height)).toBe(true);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.reference.width).toBeGreaterThan(0);
    expect(layout.edited.height).toBeGreaterThan(0);
  });
});
