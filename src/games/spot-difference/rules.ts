import type { DifferenceDefinition, NormalizedRegion } from '../../types';

export interface Point { x: number; y: number }
export interface Rectangle extends Point { width: number; height: number }
export interface SpotDifferenceState { foundIds: string[]; completed: boolean }
export interface DiscoveryResult {
  state: SpotDifferenceState;
  newlyFound: boolean;
  justCompleted: boolean;
}

export function createInitialState(): SpotDifferenceState {
  return { foundIds: [], completed: false };
}

export function containsPoint(rectangle: Rectangle, point: Point): boolean {
  return point.x >= rectangle.x && point.y >= rectangle.y
    && point.x <= rectangle.x + rectangle.width
    && point.y <= rectangle.y + rectangle.height;
}

export function regionToRectangle(region: NormalizedRegion, image: Rectangle): Rectangle {
  return {
    x: image.x + region.x * image.width,
    y: image.y + region.y * image.height,
    width: region.width * image.width,
    height: region.height * image.height,
  };
}

/** One semantic difference may span several separate parts of the image. */
export function getDifferenceRegions(difference: DifferenceDefinition): NormalizedRegion[] {
  return [difference.region, ...(difference.additionalRegions ?? [])];
}

/** The image's CSS dimensions are the input space, regardless of source resolution. */
export function findDifferenceAtPoint(
  differences: readonly DifferenceDefinition[],
  image: Rectangle,
  point: Point,
  minimumTargetSize = 44,
): DifferenceDefinition | undefined {
  if (!containsPoint(image, point) || image.width <= 0 || image.height <= 0) return undefined;
  const targets = differences.flatMap((difference) => getDifferenceRegions(difference).map(region => ({
    difference,
    rectangle: regionToRectangle(region, image),
  })));
  // Real regions always take precedence, so a neighbouring enlarged target cannot steal a hit.
  const exact = targets.find(({ rectangle }) => containsPoint(rectangle, point));
  if (exact) return exact.difference;

  const nearestByDifference = new Map<string, { difference: DifferenceDefinition; distance: number }>();
  for (const { difference, rectangle } of targets) {
    const width = Math.max(minimumTargetSize, rectangle.width);
    const height = Math.max(minimumTargetSize, rectangle.height);
    const center = { x: rectangle.x + rectangle.width / 2, y: rectangle.y + rectangle.height / 2 };
    if (!containsPoint({ x: center.x - width / 2, y: center.y - height / 2, width, height }, point)) continue;
    const distance = (point.x - center.x) ** 2 + (point.y - center.y) ** 2;
    const nearest = nearestByDifference.get(difference.id);
    if (!nearest || distance < nearest.distance) nearestByDifference.set(difference.id, { difference, distance });
  }
  const expanded = [...nearestByDifference.values()].sort((a, b) => a.distance - b.distance);
  // Equidistant overlap is deliberately ignored rather than choosing an arbitrary target.
  if (expanded.length > 1 && Math.abs(expanded[0].distance - expanded[1].distance) < 0.001) return undefined;
  return expanded[0]?.difference;
}

export function discoverDifference(
  state: SpotDifferenceState,
  differenceId: string,
  differences: readonly DifferenceDefinition[],
): DiscoveryResult {
  if (state.completed || state.foundIds.includes(differenceId)
    || !differences.some(({ id }) => id === differenceId)) {
    return { state, newlyFound: false, justCompleted: false };
  }
  const foundIds = [...state.foundIds, differenceId];
  const completed = differences.length > 0 && differences.every(({ id }) => foundIds.includes(id));
  return { state: { foundIds, completed }, newlyFound: true, justCompleted: completed };
}

export function getNextHint(
  differences: readonly DifferenceDefinition[],
  foundIds: readonly string[],
  hintCounts: Readonly<Record<string, number>>,
): { difference: DifferenceDefinition; message: string; detailed: boolean } | null {
  const difference = differences.find(({ id }) => !foundIds.includes(id));
  if (!difference) return null;
  const detailed = (hintCounts[difference.id] ?? 0) >= 1;
  return { difference, message: detailed ? difference.detailHint : difference.hint, detailed };
}
