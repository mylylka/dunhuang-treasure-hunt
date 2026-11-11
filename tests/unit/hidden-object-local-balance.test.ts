import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { HiddenObjectLevel } from '../../src/types';
import type { HiddenObjectPool } from '../../src/games/hidden-object/types';
import { createHiddenObjectRound, rotatedItemBounds } from '../../src/games/hidden-object/rules';

const pool = JSON.parse(readFileSync('src/content/hidden-object/pool.json', 'utf8')) as HiddenObjectPool;
const levels = [1, 2, 3].map(number => JSON.parse(readFileSync(`src/content/levels/music-hidden-objects-ch2-0${number}.json`, 'utf8')) as HiddenObjectLevel);
type Box = ReturnType<typeof rotatedItemBounds>;
const area = (boxes: Box[], x: number, y: number, width: number, height: number) => boxes.reduce((sum, box) => sum
  + Math.max(0, Math.min(x + width, box.x + box.width) - Math.max(x, box.x))
  * Math.max(0, Math.min(y + height, box.y + box.height) - Math.max(y, box.y)), 0) / (width * height);

function minimumLocalRatio(boxes: Box[], stepX = 80, stepY = 75): number {
  const global = area(boxes, 0, 0, 960, 1800);
  let minimum = Infinity;
  for (let y = 0; y <= 1500; y += stepY) for (let x = 0; x <= 640; x += stepX) {
    minimum = Math.min(minimum, area(boxes, x, y, 320, 300) / global);
  }
  return minimum;
}

function maximumEmptyDistance(boxes: Box[]): number {
  let maximum = 0;
  for (let y = 10; y <= 1790; y += 20) for (let x = 10; x <= 950; x += 20) {
    maximum = Math.max(maximum, Math.min(...boxes.map(box => Math.hypot(
      Math.max(box.x - x, 0, x - box.x - box.width), Math.max(box.y - y, 0, y - box.y - box.height)))));
  }
  return maximum;
}

describe('找物二维局部空洞回归', () => {
  it.each([
    { chapterLevel: 1, seed: 4 }, { chapterLevel: 1, seed: 48 }, { chapterLevel: 1, seed: 93 },
    { chapterLevel: 2, seed: 15 }, { chapterLevel: 2, seed: 26 }, { chapterLevel: 2, seed: 66 },
    { chapterLevel: 2, seed: 74 }, { chapterLevel: 2, seed: 92 },
    { chapterLevel: 3, seed: 18 }, { chapterLevel: 3, seed: 59 }, { chapterLevel: 3, seed: 67 },
  ])('第二章第$chapterLevel关seed $seed局部不被另一侧密集抵消，完整生成且不越界重叠', ({ chapterLevel, seed }) => {
    const level = levels[chapterLevel - 1];
    const round = createHiddenObjectRound(level, pool, seed), boxes = round.items.map(rotatedItemBounds);
    expect(round.items).toHaveLength(120);
    expect(round.tasks.reduce((sum, task) => sum + task.required, 0)).toBe(7);
    expect(minimumLocalRatio(boxes)).toBeGreaterThanOrEqual(.65 - 1e-8);
    expect(maximumEmptyDistance(boxes)).toBeLessThanOrEqual(65 + 1e-8);
    for (const height of [300, 600]) {
      const densities = Array.from({ length: (1800 - height) / 100 + 1 }, (_, index) => area(boxes, 0, index * 100, 960, height));
      expect(Math.max(...densities) - Math.min(...densities)).toBeLessThan(height === 300 ? .25 : .15);
    }
    for (const [index, box] of boxes.entries()) {
      expect(box.x).toBeGreaterThanOrEqual(10 - 1e-8); expect(box.y).toBeGreaterThanOrEqual(10 - 1e-8);
      expect(box.x + box.width).toBeLessThanOrEqual(950 + 1e-8); expect(box.y + box.height).toBeLessThanOrEqual(1790 + 1e-8);
      for (const next of boxes.slice(index + 1)) {
        expect(box.x < next.x + next.width && box.x + box.width > next.x && box.y < next.y + next.height && box.y + box.height > next.y).toBe(false);
      }
    }
    for (const task of round.tasks) {
      const copies = round.items.filter(item => item.groupId === task.id);
      expect(copies).toHaveLength(task.required);
      expect(copies.every(item => item.spriteId === task.previewSpriteId)).toBe(true);
    }
  });

  it('更细的交错观察位置也没有大片缺口，不仅在评分采样点满足比例', () => {
    for (const seed of [15, 26, 66, 74, 92]) {
      const boxes = createHiddenObjectRound(levels[1], pool, seed).items.map(rotatedItemBounds);
      expect(minimumLocalRatio(boxes, 40, 50), `seed=${seed}`).toBeGreaterThan(.5);
    }
  });

  it('局部移动保持有种子的连续散放、正负角与同局可复现，不修改配置或素材池', () => {
    const level = levels[1], original = JSON.stringify({ level, pool });
    const first = createHiddenObjectRound(level, pool, 74);
    expect(createHiddenObjectRound(level, pool, 74)).toEqual(first);
    expect(new Set(first.items.map(item => (item.x + item.width / 2).toFixed(2))).size).toBeGreaterThan(50);
    expect(new Set(first.items.map(item => (item.y + item.height / 2).toFixed(2))).size).toBeGreaterThan(50);
    expect(first.items.some(item => item.rotation > .1)).toBe(true);
    expect(first.items.some(item => item.rotation < -.1)).toBe(true);
    expect(JSON.stringify({ level, pool })).toBe(original);
  });
});
