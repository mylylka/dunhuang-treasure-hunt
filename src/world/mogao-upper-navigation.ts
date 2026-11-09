import layoutData from '../content/world/mogao-upper-v002.json';
import exhibitLayout from '../content/world/mogao-upper-v003.json';
import { fromTerrainPoint, toTerrainPoint, type TerrainPlanPoint } from '../content/world/terrain-layout-v001';
import { PLAYER_RADIUS } from './movement';
import type { WorldPoint } from './types';

/** Metres, Y up. Authored positions are relative to the existing Buddha-room floor. */
export interface UpperWalkSurface {
  id: string; kind: 'floor' | 'ramp'; label: string;
  minX: number; maxX: number; minZ: number; maxZ: number;
  y: number; axis?: 'x' | 'z'; endY?: number; neighbors: readonly string[];
  safePoint?: readonly number[];
}
export interface UpperSolid { id: string; min: readonly number[]; max: readonly number[]; navigation?: boolean; walkSurface?: string }
export interface UpperGateway { surfaceId: string; minX: number; maxX: number; minZ: number; maxZ: number }
export interface UpperNavigationLayout {
  origin: readonly number[];
  surfaces: readonly UpperWalkSurface[];
  solids: readonly UpperSolid[];
  gateways: readonly UpperGateway[];
  spawn: { surfaceId: string; position: readonly number[] };
}
export interface UpperWalkState { position: WorldPoint; surfaceId: string | null }
export const UPPER_HEAD_CLEARANCE = 1.85;
export const UPPER_MAX_SLOPE = Math.tan(36 * Math.PI / 180);
const EPSILON = 1e-6;
const SEAM_TOLERANCE = .045;
const STEP_LENGTH = PLAYER_RADIUS * .3;
const MAX_SUBSTEPS = 256;
const finitePoint = (p: WorldPoint) => Number.isFinite(p.x) && Number.isFinite(p.z);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const contains = (s: UpperGateway | UpperWalkSurface, p: WorldPoint) =>
  p.x >= s.minX - EPSILON && p.x <= s.maxX + EPSILON && p.z >= s.minZ - EPSILON && p.z <= s.maxZ + EPSILON;

/** Height is interpolated along the ramp, never selected from the highest overlapping floor. */
export function upperSurfaceHeightAt(surface: UpperWalkSurface, point: WorldPoint) {
  if (surface.kind !== 'ramp' || !surface.axis || surface.endY === undefined) return surface.y;
  const min = surface.axis === 'x' ? surface.minX : surface.minZ;
  const max = surface.axis === 'x' ? surface.maxX : surface.maxZ;
  return surface.y + (surface.endY - surface.y) * clamp((point[surface.axis] - min) / (max - min), 0, 1);
}

const surfaceSlope = (s: UpperWalkSurface) => s.kind === 'ramp'
  ? Math.abs((s.endY ?? s.y) - s.y) / (s.axis === 'x' ? s.maxX - s.minX : s.maxZ - s.minZ) : 0;

/** Pure local-coordinate resolver. Keeping it independent makes stacked floors testable. */
export function createUpperNavigation(layout: UpperNavigationLayout) {
  const surfaces = new Map(layout.surfaces.map(s => [s.id, s]));
  const groundIds = new Set(layout.gateways.map(g => g.surfaceId));
  const groundAcquisitionIds = new Set(groundIds);
  for (const id of groundAcquisitionIds) {
    const surface = surfaces.get(id);
    if (!surface) continue;
    for (const neighbor of surface.neighbors) {
      const next = surfaces.get(neighbor);
      if (next?.kind === 'floor' && Math.abs(next.y - surface.y) < SEAM_TOLERANCE) groundAcquisitionIds.add(next.id);
    }
  }
  const externalFaces = layout.gateways.map((g, i): UpperWalkSurface => ({
    ...g, id: `external-gateway-${i}`, label: 'Existing ground connection', kind: 'floor',
    y: surfaces.get(g.surfaceId)?.y ?? 0, neighbors: [g.surfaceId],
  }));
  const localSpawn = { position: { x: layout.spawn.position[0], z: layout.spawn.position[2] }, surfaceId: layout.spawn.surfaceId };

  function neighborSurfaces(s: UpperWalkSurface) {
    return s.neighbors.map(id => surfaces.get(id)).filter((n): n is UpperWalkSurface => !!n);
  }

  function supportSurfaces(active: UpperWalkSurface, p: WorldPoint) {
    // At corners the disk can cover a landing and both connected flights. Two graph
    // edges are enough; unrelated surfaces above/below are deliberately excluded.
    const near = new Map<string, UpperWalkSurface>([[active.id, active]]);
    for (const n of neighborSurfaces(active)) {
      near.set(n.id, n);
      for (const nn of neighborSurfaces(n)) near.set(nn.id, nn);
    }
    if (groundIds.has(active.id)) for (const face of externalFaces) {
      if (face.neighbors.includes(active.id)) near.set(face.id, face);
    }
    const y = upperSurfaceHeightAt(active, p);
    return [...near.values()].filter(s => {
      if (surfaceSlope(s) > UPPER_MAX_SLOPE + EPSILON) return false;
      const q = { x: clamp(p.x, s.minX, s.maxX), z: clamp(p.z, s.minZ, s.maxZ) };
      const distance = Math.hypot(q.x - p.x, q.z - p.z);
      return distance <= PLAYER_RADIUS + EPSILON && Math.abs(upperSurfaceHeightAt(s, q) - y) <= UPPER_MAX_SLOPE * distance + SEAM_TOLERANCE;
    });
  }

  function supported(active: UpperWalkSurface, p: WorldPoint) {
    const support = supportSurfaces(active, p);
    const xs = [...new Set([p.x - PLAYER_RADIUS, p.x + PLAYER_RADIUS,
      ...support.flatMap(s => [s.minX, s.maxX]).filter(x => x > p.x - PLAYER_RADIUS && x < p.x + PLAYER_RADIUS)])].sort((a, b) => a - b);
    const zs = [...new Set([p.z - PLAYER_RADIUS, p.z + PLAYER_RADIUS,
      ...support.flatMap(s => [s.minZ, s.maxZ]).filter(z => z > p.z - PLAYER_RADIUS && z < p.z + PLAYER_RADIUS)])].sort((a, b) => a - b);
    // Exact rectangle-union coverage of a circular footprint. This retains safety
    // at open edges without shrinking every joined rectangle and creating gaps.
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      const sample = { x: (xs[i] + xs[i + 1]) / 2, z: (zs[j] + zs[j + 1]) / 2 };
      if (support.some(s => contains(s, sample))) continue;
      const distance = Math.hypot(clamp(p.x, xs[i], xs[i + 1]) - p.x, clamp(p.z, zs[j], zs[j + 1]) - p.z);
      if (distance < PLAYER_RADIUS - EPSILON) return false;
    }
    return true;
  }

  function clearBody(p: WorldPoint, height: number, active?: UpperWalkSurface) {
    return !layout.solids.some(s => {
      if (s.navigation === false || s.max[1] <= height + SEAM_TOLERANCE || s.min[1] >= height + UPPER_HEAD_CLEARANCE - EPSILON) return false;
      // A landing's slab is not a wall at the end of its connected ramp. Keep
      // higher, unrelated slabs solid, including real low ceilings above a flight.
      if (s.walkSurface && active && (s.walkSurface === active.id || active.neighbors.includes(s.walkSurface)) &&
        Math.abs(s.max[1] - height) <= UPPER_MAX_SLOPE * PLAYER_RADIUS + SEAM_TOLERANCE) return false;
      return Math.hypot(clamp(p.x, s.min[0], s.max[0]) - p.x, clamp(p.z, s.min[2], s.max[2]) - p.z) < PLAYER_RADIUS - EPSILON;
    });
  }

  function validOnSurface(p: WorldPoint, surface: UpperWalkSurface) {
    return finitePoint(p) && contains(surface, p) && surfaceSlope(surface) <= UPPER_MAX_SLOPE + EPSILON &&
      supported(surface, p) && clearBody(p, upperSurfaceHeightAt(surface, p), surface);
  }

  function floorHeight(p: WorldPoint, surfaceId: string | null | undefined) {
    const surface = surfaceId ? surfaces.get(surfaceId) : undefined;
    return surface && contains(surface, p) && finitePoint(p) ? upperSurfaceHeightAt(surface, p) : null;
  }

  function resolveStep(state: UpperWalkState, p: WorldPoint): UpperWalkState | null {
    const previous = state.surfaceId ? surfaces.get(state.surfaceId) : undefined;
    if (!previous) return null;
    const distance = Math.hypot(p.x - state.position.x, p.z - state.position.z);
    const previousY = upperSurfaceHeightAt(previous, state.position);
    for (const candidate of [previous, ...neighborSurfaces(previous)]) {
      if (Math.abs(upperSurfaceHeightAt(candidate, p) - previousY) > UPPER_MAX_SLOPE * distance + SEAM_TOLERANCE) continue;
      if (validOnSurface(p, candidate)) return { position: p, surfaceId: candidate.id };
    }
    // Only the authored ground portal can release ownership to terrain movement.
    // Upper edges always return the last safe state, never null / a lower floor.
    if (groundIds.has(previous.id) && layout.gateways.some(g => g.surfaceId === previous.id && contains(g, p)) &&
      !contains(previous, p) && clearBody(p, previousY, previous)) return { position: p, surfaceId: null };
    return null;
  }

  function acquireGround(p: WorldPoint) {
    for (const id of groundAcquisitionIds) {
      const s = surfaces.get(id);
      if (s && validOnSurface(p, s)) return { position: p, surfaceId: id };
    }
    return null;
  }

  function move(state: UpperWalkState, delta: WorldPoint): UpperWalkState | null {
    if (!finitePoint(state.position)) return { position: { ...localSpawn.position }, surfaceId: localSpawn.surfaceId };
    const length = Math.hypot(delta.x, delta.z);
    if (!Number.isFinite(length)) return state.surfaceId ? { ...state, position: { ...state.position } } : null;
    const savedSurface = state.surfaceId ? surfaces.get(state.surfaceId) : undefined;
    let current = state.surfaceId
      ? savedSurface && validOnSurface(state.position, savedSurface) ? { ...state, position: { ...state.position } } : safeState(state.surfaceId)
      : acquireGround(state.position);
    const count = Math.max(1, Math.ceil(length / STEP_LENGTH));
    const steps = Math.min(count, MAX_SUBSTEPS);
    const step = { x: delta.x / count, z: delta.z / count };
    let completedSteps = 0;
    if (!current) {
      // Acquire only in the real tunnel portal. Ordinary exterior movement remains
      // owned by terrain, including collisions before reaching this boundary.
      if (!layout.gateways.some(g => contains(g, state.position))) return null;
      const next = { x: state.position.x + step.x, z: state.position.z + step.z };
      current = acquireGround(next);
      if (!current) return null;
      completedSteps = 1;
    }
    for (let i = completedSteps; i < steps; i++) {
      const next: WorldPoint = { x: current.position.x + step.x, z: current.position.z + step.z };
      let resolved = resolveStep(current, next);
      if (!resolved && step.x !== 0 && step.z !== 0) {
        resolved = resolveStep(current, { x: next.x, z: current.position.z });
        if (resolved?.surfaceId) resolved = resolveStep(resolved, { x: resolved.position.x, z: next.z }) ?? resolved;
        else if (!resolved) resolved = resolveStep(current, { x: current.position.x, z: next.z });
      }
      if (resolved) current = resolved;
      if (!current.surfaceId) return current;
    }
    return current;
  }

  function safeState(surfaceId: string | null | undefined): UpperWalkState {
    const surface = surfaceId ? surfaces.get(surfaceId) : undefined;
    if (surface) {
      const seeds = surface.safePoint ? [{ x: surface.safePoint[0], z: surface.safePoint[2] }] : [];
      seeds.push({ x: (surface.minX + surface.maxX) / 2, z: (surface.minZ + surface.maxZ) / 2 });
      // Preserve the saved level even when its previous coordinate is now in a
      // wall. Only if that whole surface has no safe point use the ground spawn.
      for (let ix = 1; ix <= 5; ix++) for (let iz = 1; iz <= 5; iz++) seeds.push({
        x: surface.minX + (surface.maxX - surface.minX) * ix / 6,
        z: surface.minZ + (surface.maxZ - surface.minZ) * iz / 6,
      });
      for (const p of seeds) if (validOnSurface(p, surface)) return { position: p, surfaceId: surface.id };
    }
    return { position: { ...localSpawn.position }, surfaceId: localSpawn.surfaceId };
  }

  function sanitize(state: UpperWalkState): UpperWalkState {
    if (state.surfaceId) {
      const surface = surfaces.get(state.surfaceId);
      return surface && validOnSurface(state.position, surface) ? state : safeState(state.surfaceId);
    }
    if (!finitePoint(state.position)) return safeState(null);
    return acquireGround(state.position) ?? state;
  }
  return { move, floorHeight, validOnSurface: (p: WorldPoint, id: string) => { const s = surfaces.get(id); return !!s && validOnSurface(p, s); }, sanitize, safeState };
}

export const MOGAO_UPPER_LAYOUT = layoutData as unknown as UpperNavigationLayout;
export const MOGAO_EXHIBIT_UPPER_LAYOUT = exhibitLayout as unknown as UpperNavigationLayout;
export const upperNavigation = createUpperNavigation(MOGAO_UPPER_LAYOUT);
export const exhibitUpperNavigation = createUpperNavigation(MOGAO_EXHIBIT_UPPER_LAYOUT);

// The two room-side openings have the same footprint and independent heights.
// The old upper gallery continues to use the open layout.
export const MOGAO_BUDDHA_GATE = {
  id: 'mogao-exhibit-buddha-gate',
  ...exhibitLayout.viewGates.b,
} as const satisfies UpperSolid;
export const MOGAO_HALL_A_BUDDHA_GATE = {
  id: 'mogao-hall-a-buddha-gate',
  ...exhibitLayout.viewGates.a,
} as const satisfies UpperSolid;
export const upperBuddhaGateSolids = [
  [],
  [MOGAO_BUDDHA_GATE],
  [MOGAO_HALL_A_BUDDHA_GATE],
  [MOGAO_BUDDHA_GATE, MOGAO_HALL_A_BUDDHA_GATE],
] as const;
export const upperBuddhaGateIndex = (bLocked = false, aLocked = false) => Number(bLocked) + 2 * Number(aLocked);
const navigationByGate = [MOGAO_UPPER_LAYOUT, MOGAO_EXHIBIT_UPPER_LAYOUT].map((layout, index) =>
  upperBuddhaGateSolids.map(gates => gates.length ? createUpperNavigation({
    ...layout, solids: [...layout.solids, ...gates],
  }) : index ? exhibitUpperNavigation : upperNavigation));

export function upperToWorld(point: TerrainPlanPoint) {
  const [x, y, z] = MOGAO_UPPER_LAYOUT.origin;
  return toTerrainPoint('cliff', { x: x + point.x, y: y + (point.y ?? 0), z: z + point.z });
}
export function upperFromWorld(point: TerrainPlanPoint) {
  const p = fromTerrainPoint('cliff', point), [x, y, z] = MOGAO_UPPER_LAYOUT.origin;
  return { x: p.x - x, y: point.y === undefined ? 0 : p.y - y, z: p.z - z };
}
export function upperFloorHeight(position: WorldPoint, surfaceId: string | null | undefined, exhibit = false): number | null {
  const navigation = exhibit ? exhibitUpperNavigation : upperNavigation;
  const height = navigation.floorHeight(upperFromWorld(position), surfaceId);
  return height === null ? null : upperToWorld({ x: 0, y: height, z: 0 }).y;
}
export function moveUpperPlayer(state: UpperWalkState, delta: WorldPoint,
  buddhaGateLocked = false, hallAGateLocked = false, exhibit = false): UpperWalkState | null {
  const from = upperFromWorld(state.position), to = upperFromWorld({ x: state.position.x + delta.x, z: state.position.z + delta.z });
  const navigation = navigationByGate[Number(exhibit)][upperBuddhaGateIndex(buddhaGateLocked, hallAGateLocked)];
  const moved = navigation.move({ position: from, surfaceId: state.surfaceId }, { x: to.x - from.x, z: to.z - from.z });
  if (!moved) return null;
  const p = upperToWorld(moved.position);
  return { position: { x: p.x, z: p.z }, surfaceId: moved.surfaceId };
}
export function sanitizeUpperCheckpoint<T extends { position: WorldPoint; walkSurface?: string }>(checkpoint: T, exhibit = false): T {
  const navigation = exhibit ? exhibitUpperNavigation : upperNavigation;
  const position = upperFromWorld(checkpoint.position);
  const state = navigation.sanitize({ position, surfaceId: checkpoint.walkSurface ?? null });
  if (!state.surfaceId) return { ...checkpoint, walkSurface: undefined };
  if (state.position === position && state.surfaceId === checkpoint.walkSurface) return checkpoint;
  const p = upperToWorld(state.position);
  return { ...checkpoint, position: { x: p.x, z: p.z }, walkSurface: state.surfaceId };
}
