import placements from '../content/world/pattern-interactives-v001.json';
import type { WorldCollider } from './movement';

/** Measured GLB bounds, in the same courtyard frame as the hall and gate. */
export const PATTERN_STATIONS = placements.map(({ yawDegrees, bounds, scale, ...station }) => ({
  ...station,
  scale,
  yaw: yawDegrees * Math.PI / 180,
  halfWidth: bounds.halfWidth * scale,
  height: bounds.height * scale,
  halfDepth: bounds.halfDepth * scale,
}));

export const PATTERN_STATION_SOLIDS: WorldCollider[] = PATTERN_STATIONS.map(station => {
  const { id, position, yaw, halfWidth, halfDepth, height } = station;
  const cos = Math.cos(yaw), sin = Math.sin(yaw);
  const polygon = [[-halfWidth, -halfDepth], [halfWidth, -halfDepth],
    [halfWidth, halfDepth], [-halfWidth, halfDepth]].map(([x, z]) => [
    position.x + x * cos + z * sin,
    position.z - x * sin + z * cos,
  ]);
  return {
    id,
    minX: Math.min(...polygon.map(p => p[0])),
    maxX: Math.max(...polygon.map(p => p[0])),
    minZ: Math.min(...polygon.map(p => p[1])),
    maxZ: Math.max(...polygon.map(p => p[1])),
    height: position.y + height,
    polygon,
  };
});
