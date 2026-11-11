import { seededRandom } from './rules';

/** A seeded permutation that never starts already solved. IDs correspond to left-to-right slices. */
export function createGalleryOrder(count: number, seed: number): number[] {
  if (!Number.isInteger(count) || count < 2 || count > 48) throw new RangeError('切片数量须为 2 至 48');
  const order = Array.from({ length: count }, (_, id) => id);
  const random = seededRandom(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (isGalleryOrderComplete(order)) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/** Insert at a slot of the array after removal: 0 is the front, length is the end. */
export function moveGalleryItem(order: readonly number[], id: number, insertIndex: number): number[] {
  const index = order.indexOf(id);
  if (index < 0 || !Number.isInteger(insertIndex)) return [...order];
  const next = [...order];
  next.splice(index, 1);
  next.splice(Math.max(0, Math.min(next.length, insertIndex)), 0, id);
  return next;
}

export function isGalleryOrderComplete(order: readonly number[]): boolean {
  return order.length >= 2 && order.every((id, index) => id === index);
}
