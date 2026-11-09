import type { TerrainRoute } from '../content/world/terrain-layout-v001';

type Point = { x: number; z: number };

/** Stable variation so the same road keeps its stones between play sessions. */
function seededRandom(seed: number) {
  return () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
}

function routeSampler(points: TerrainRoute['points']) {
  const stations = points.map((point, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(index + 1, points.length - 1)];
    const dx = after.x - before.x, dz = after.z - before.z;
    const magnitude = Math.hypot(dx, dz) || 1;
    return { point, nx: dz / magnitude, nz: -dx / magnitude, distance: 0 };
  });
  for (let index = 1; index < stations.length; index++) {
    const previous = stations[index - 1], current = stations[index];
    current.distance = previous.distance + Math.hypot(current.point.x - previous.point.x, current.point.z - previous.point.z);
  }
  const length = stations[stations.length - 1].distance;
  function sample(distance: number, offset: number): Point {
    let low = 0, high = stations.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (stations[middle].distance > distance) high = middle;
      else low = middle;
    }
    const a = stations[low], b = stations[high];
    const t = (distance - a.distance) / (b.distance - a.distance || 1);
    const normalBlend = Math.max(0, Math.min(1, t));
    return {
      x: a.point.x + (b.point.x - a.point.x) * t + (a.nx + (b.nx - a.nx) * normalBlend) * offset,
      z: a.point.z + (b.point.z - a.point.z) * t + (a.nz + (b.nz - a.nz) * normalBlend) * offset,
    };
  }
  return { length, sample };
}

function withinRoad(point: Point, route: TerrainRoute, roundEnds = true) {
  const halfWidth2 = (route.width / 2 + .12) ** 2;
  for (let index = 1; index < route.points.length; index++) {
    const a = route.points[index - 1], b = route.points[index];
    const dx = b.x - a.x, dz = b.z - a.z;
    const projected = ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1);
    if (!roundEnds && (projected < 0 || projected > 1)) continue;
    const t = Math.max(0, Math.min(1, projected));
    if ((point.x - a.x - dx * t) ** 2 + (point.z - a.z - dz * t) ** 2 < halfWidth2) return true;
  }
  return false;
}

function clipCell(polygon: Point[], dx: number, dz: number, limit: number): Point[] {
  const result: Point[] = [];
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length];
    const from = a.x * dx + a.z * dz - limit;
    const to = b.x * dx + b.z * dz - limit;
    if (from <= 0) result.push(a);
    if ((from <= 0) !== (to <= 0)) {
      const t = from / (from - to);
      result.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return result;
}

/** Lay out the connected road as a single mosaic. Nearby seeds create small
 * filler stones while wider-spaced seeds make broad flags. Invisible boundary
 * seeds stop the mosaic at the shoulders and leave the shared junction open.
 */
export function terrainRoadStones(routes: readonly TerrainRoute[]) {
  const random = seededRandom(0x4e27b819);
  const stones: Point[] = [], edges: Point[] = [];
  function addStone(point: Point) {
    if (stones.every(stone => (point.x - stone.x) ** 2 + (point.z - stone.z) ** 2 >= .27 ** 2)) stones.push(point);
  }
  for (const route of routes) {
    const { length, sample } = routeSampler(route.points);
    for (const across of [-.35, 0, .35]) {
      for (let distance = random() * .55; distance < length; distance += .8 + random() * .85) {
        const offset = (across + (random() - .5) * .23) * route.width;
        addStone(sample(distance, offset));
        if (random() < .38) {
          const angle = random() * Math.PI * 2;
          const separation = .28 + random() * .23;
          const nearDistance = Math.max(0, Math.min(length, distance + Math.cos(angle) * separation));
          const nearOffset = Math.max(-route.width * .47, Math.min(route.width * .47, offset + Math.sin(angle) * separation));
          addStone(sample(nearDistance, nearOffset));
        }
      }
    }
    for (const side of [-1, 1]) {
      for (let distance = 0; distance < length; distance += .52 + random() * .25) {
        const point = sample(distance, side * (route.width / 2 + .48 + random() * .19));
        if (!routes.some(other => withinRoad(point, other))) edges.push(point);
      }
    }
    for (const distance of [-.55, length + .55]) {
      for (let offset = -route.width / 2; offset <= route.width / 2; offset += .55) {
        const point = sample(distance, offset);
        if (!routes.some(other => other !== route && withinRoad(point, other, false))) edges.push(point);
      }
    }
  }

  const seeds = [...stones, ...edges];
  const halfGap = .027;
  return stones.flatMap(center => {
    let polygon = [{x:-4,z:-4}, {x:4,z:-4}, {x:4,z:4}, {x:-4,z:4}];
    for (const other of seeds) {
      if (other === center) continue;
      const dx = other.x - center.x, dz = other.z - center.z;
      const distance2 = dx * dx + dz * dz;
      if (distance2 > 132) continue; // Cannot cut the initial 8 m square.
      polygon = clipCell(polygon, dx, dz, distance2 / 2 - Math.sqrt(distance2) * halfGap);
      if (polygon.length < 3) return [];
    }
    const corners = polygon.map(point => ({ x: center.x + point.x, z: center.z + point.z }));
    return [{ center, corners, shade: random() }];
  });
}
