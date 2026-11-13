import { fromTerrainPoint } from './terrain-rules-v001';
import type { WorldPoint } from './types';

/** Retain the courtyard and its doorstep, including the ordinary spawn. */
export function isCaissonOnlyWalkable(point: WorldPoint): boolean {
  const local = fromTerrainPoint('courtyard', point);
  return local.x >= -25 && local.x <= 1 && local.z >= -25 && local.z <= 8;
}
