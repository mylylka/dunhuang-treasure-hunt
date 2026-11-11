import { describe, expect, it } from 'vitest';
import { createGalleryOrder, isGalleryOrderComplete, moveGalleryItem } from '../../src/games/puzzle/gallery-order';

describe('画廊壁画排序', () => {
  it('生成完整、可复现、未排好的切片顺序', () => {
    for (let seed = 0; seed < 200; seed++) {
      const order = createGalleryOrder(12, seed);
      expect(order).toEqual(createGalleryOrder(12, seed));
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i));
      expect(isGalleryOrderComplete(order)).toBe(false);
    }
    expect(() => createGalleryOrder(1, 1)).toThrow();
    expect(() => createGalleryOrder(49, 1)).toThrow();
  });
  it('移动到中间、首尾时插入而不是交换，并保留其他画面顺序', () => {
    const original = [0, 1, 2, 3, 4];
    expect(moveGalleryItem(original, 1, 3)).toEqual([0, 2, 3, 1, 4]);
    expect(moveGalleryItem(original, 3, 1)).toEqual([0, 3, 1, 2, 4]);
    expect(moveGalleryItem(original, 4, 0)).toEqual([4, 0, 1, 2, 3]);
    expect(moveGalleryItem(original, 0, 4)).toEqual([1, 2, 3, 4, 0]);
    expect(moveGalleryItem(original, 99, 2)).toEqual(original);
    expect(original).toEqual([0, 1, 2, 3, 4]);
  });
  it('仅原图从左到右全部排列正确时完成', () => {
    expect(isGalleryOrderComplete([0, 1, 2, 3])).toBe(true);
    expect(isGalleryOrderComplete([0, 2, 1, 3])).toBe(false);
    expect(isGalleryOrderComplete([0, 1, 1, 3])).toBe(false);
    expect(isGalleryOrderComplete([])).toBe(false);
  });
});
