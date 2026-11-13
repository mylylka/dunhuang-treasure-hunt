import { describe, expect, it } from 'vitest';
import geometry from '../../src/content/levels/patterns-geometry.json';
import type { DifferenceDefinition, SpotDifferenceLevel } from '../../src/types';
import {
  createInitialState, discoverDifference, findDifferenceAtPoint, getDifferenceRegions,
  getNextHint, type Rectangle,
} from '../../src/games/spot-difference/rules';

const level = geometry as SpotDifferenceLevel;
const image: Rectangle = { x: 0, y: 0, width: 1254, height: 1254 };
const repeatedMotifs = [
  { id: 'diamond-inlay', point: { x: 426, y: 992 }, another: { x: 992, y: 620 } },
  { id: 'orange-pearl', point: { x: 552, y: 1045 }, another: { x: 1047, y: 483 } },
  { id: 'pale-leaf-border', point: { x: 851, y: 570 }, another: { x: 624, y: 851 } },
  { id: 'red-ground-flower', point: { x: 901, y: 617 }, another: { x: 625, y: 899 } },
] as const;

describe('联珠与几何正式关：四类重复纹样差异', () => {
  it('只登记用户确认的四类变化，正式关卡编号和差异编号保持稳定', () => {
    expect(level).toMatchObject({ id: 'patterns-geometry', themeId: 'patterns', gameType: 'spot-difference' });
    expect(level.differences.map(difference => difference.id)).toEqual(repeatedMotifs.map(motif => motif.id));
    expect(level.differences).toHaveLength(4);
  });

  it.each(repeatedMotifs)('$id 的下方或侧方重复单元也能命中本类，而不是另算一处', ({ id, point, another }) => {
    expect(findDifferenceAtPoint(level.differences, image, point, 0)?.id).toBe(id);
    expect(findDifferenceAtPoint(level.differences, image, another, 0)?.id).toBe(id);
  });

  it('四条边均登记可点击区域，所有附加区域归属于各自的同一类差异', () => {
    for (const difference of level.differences) {
      const regions = getDifferenceRegions(difference);
      expect(regions.length, difference.id).toBeGreaterThanOrEqual(4);
      const centers = regions.map(region => ({ x: region.x + region.width / 2, y: region.y + region.height / 2 }));
      const inMiddle = (value: number) => value > 0.35 && value < 0.65;
      expect(centers.some(point => point.y < 0.35 && inMiddle(point.x)), `${difference.id} 上边`).toBe(true);
      expect(centers.some(point => point.y > 0.65 && inMiddle(point.x)), `${difference.id} 下边`).toBe(true);
      expect(centers.some(point => point.x < 0.35 && inMiddle(point.y)), `${difference.id} 左边`).toBe(true);
      expect(centers.some(point => point.x > 0.65 && inMiddle(point.y)), `${difference.id} 右边`).toBe(true);
      for (const point of centers) {
        expect(findDifferenceAtPoint(level.differences, image,
          { x: point.x * image.width, y: point.y * image.height }, 0)?.id, difference.id).toBe(difference.id);
      }
    }
  });

  it('同类重复点击不增数，找到四个不同类别才完成，并且提示跳过已发现类别', () => {
    let state = createInitialState();
    for (const [index, motif] of repeatedMotifs.entries()) {
      const next = getNextHint(level.differences, state.foundIds, {});
      expect(next?.difference.id).toBe(motif.id);
      const found = findDifferenceAtPoint(level.differences, image, motif.point, 0) as DifferenceDefinition;
      const result = discoverDifference(state, found.id, level.differences);
      expect(result.newlyFound).toBe(true);
      expect(result.state.foundIds).toHaveLength(index + 1);
      expect(result.justCompleted).toBe(index === 3);
      expect(result.state.completed).toBe(index === 3);
      const repeated = findDifferenceAtPoint(level.differences, image, motif.another, 0) as DifferenceDefinition;
      const duplicate = discoverDifference(result.state, repeated.id, level.differences);
      expect(duplicate.newlyFound).toBe(false);
      expect(duplicate.state).toBe(result.state);
      state = duplicate.state;
    }
    expect(getNextHint(level.differences, state.foundIds, {})).toBeNull();
  });

  it('中央主体和外侧留白不属于这四类边框差异', () => {
    expect(findDifferenceAtPoint(level.differences, image, { x: 627, y: 627 })).toBeUndefined();
    expect(findDifferenceAtPoint(level.differences, image, { x: 75, y: 75 })).toBeUndefined();
  });
});
