import { describe, expect, it } from 'vitest';
import {
  createUpperNavigation, MOGAO_UPPER_LAYOUT, moveUpperPlayer, sanitizeUpperCheckpoint,
  upperFloorHeight, upperFromWorld, upperNavigation, upperSurfaceHeightAt, upperToWorld,
  UPPER_HEAD_CLEARANCE, UPPER_MAX_SLOPE,
  type UpperNavigationLayout, type UpperWalkState,
} from '../../src/world/mogao-upper-navigation';
import { PLAYER_RADIUS } from '../../src/world/movement';
import authoredLayout from '../../src/content/world/mogao-upper-v002.json';

const fixture: UpperNavigationLayout = {
  origin: [0, 0, 0], spawn: { surfaceId: 'ground', position: [0, 0, 0] },
  gateways: [{ surfaceId: 'ground', minX: -2, maxX: 2, minZ: -4.5, maxZ: -2.5 }],
  surfaces: [
    { id: 'ground', label: 'Ground', kind: 'floor', minX: -3, maxX: 3, minZ: -3, maxZ: 3, y: 0, neighbors: ['ramp-a'] },
    { id: 'ramp-a', label: 'First flight', kind: 'ramp', minX: 3, maxX: 7, minZ: -1.5, maxZ: 1.5, y: 0, endY: 2, axis: 'x', neighbors: ['ground', 'landing-a'] },
    { id: 'landing-a', label: 'First landing', kind: 'floor', minX: 7, maxX: 10, minZ: -1.5, maxZ: 4.5, y: 2, neighbors: ['ramp-a', 'ramp-b'] },
    { id: 'ramp-b', label: 'Second flight', kind: 'ramp', minX: 7, maxX: 10, minZ: 4.5, maxZ: 8.5, y: 2, endY: 4, axis: 'z', neighbors: ['landing-a', 'landing-b'] },
    { id: 'landing-b', label: 'Second landing', kind: 'floor', minX: -3, maxX: 10, minZ: 8.5, maxZ: 11.5, y: 4, neighbors: ['ramp-b', 'ramp-c'] },
    { id: 'ramp-c', label: 'Third flight', kind: 'ramp', minX: -3, maxX: 0, minZ: 3, maxZ: 8.5, y: 6, endY: 4, axis: 'z', neighbors: ['landing-b', 'upper'] },
    { id: 'upper', label: 'Stacked upper floor', kind: 'floor', minX: -3, maxX: 3, minZ: -3, maxZ: 3, y: 6, neighbors: ['ramp-c'] },
  ],
  solids: [{ id: 'low-beam', min: [0, 1.8, 1], max: [1, 2.2, 2] }],
};

const route = [{ x: 0, z: 0 }, { x: 8.5, z: 0 }, { x: 8.5, z: 10 }, { x: -1.5, z: 10 }, { x: -1.5, z: 0 }];
function walkRoute(nav: ReturnType<typeof createUpperNavigation>, state: UpperWalkState, points: { x: number; z: number }[]) {
  const samples = [state];
  for (const point of points) {
    const from = state.position, distance = Math.hypot(point.x - from.x, point.z - from.z), steps = Math.ceil(distance / .17);
    const delta = { x: (point.x - from.x) / steps, z: (point.z - from.z) / steps };
    for (let i = 0; i < steps; i++) {
      const next = nav.move(state, delta);
      expect(next).not.toBeNull();
      expect(next?.surfaceId).not.toBeNull();
      state = next!;
      samples.push(state);
    }
    expect(state.position.x).toBeCloseTo(point.x, 4);
    expect(state.position.z).toBeCloseTo(point.z, 4);
  }
  return { state, samples };
}

describe('upper gallery level-aware movement', () => {
  it('walks up and back down joined flights without gaps or automatic floor switching', () => {
    const nav = createUpperNavigation(fixture);
    const ascent = walkRoute(nav, { position: route[0], surfaceId: 'ground' }, route.slice(1));
    expect(ascent.state.surfaceId).toBe('upper');
    expect(nav.floorHeight(ascent.state.position, ascent.state.surfaceId)).toBe(6);
    for (let i = 1; i < ascent.samples.length; i++) {
      const before = ascent.samples[i - 1], after = ascent.samples[i];
      expect(Math.abs(nav.floorHeight(after.position, after.surfaceId)! - nav.floorHeight(before.position, before.surfaceId)!))
        .toBeLessThanOrEqual(.17 * UPPER_MAX_SLOPE + .045);
    }
    const descent = walkRoute(nav, ascent.state, [...route].reverse().slice(1));
    expect(descent.state.surfaceId).toBe('ground');
    expect(nav.floorHeight(descent.state.position, descent.state.surfaceId)).toBe(0);
  });

  it('keeps overlapping floors distinct and rejects upper edge falls / long-step tunnelling', () => {
    const nav = createUpperNavigation(fixture);
    expect(nav.floorHeight({ x: 0, z: 0 }, 'ground')).toBe(0);
    expect(nav.floorHeight({ x: 0, z: 0 }, 'upper')).toBe(6);
    const upper = nav.move({ position: { x: 0, z: 0 }, surfaceId: 'upper' }, { x: 1000, z: 0 })!;
    expect(upper.surfaceId).toBe('upper');
    expect(upper.position.x).toBeLessThanOrEqual(3 - PLAYER_RADIUS + 1e-6);
    expect(upper.position.x).toBeGreaterThan(2);
    expect(nav.move(upper, { x: 2, z: -1 })?.position.z).toBeLessThan(-.9);
    expect(nav.move({ position: { x: 0, z: 0 }, surfaceId: null }, { x: 0, z: 0 })?.surfaceId).toBe('ground');
  });

  it('honours body headroom, restoring malformed upper checkpoints on their saved level', () => {
    const nav = createUpperNavigation(fixture);
    expect(UPPER_HEAD_CLEARANCE).toBe(1.85);
    expect(nav.validOnSurface({ x: .5, z: 1.5 }, 'ground')).toBe(false);
    expect(nav.validOnSurface({ x: .5, z: 1.5 }, 'upper')).toBe(true);
    const restored = nav.sanitize({ position: { x: 999, z: -999 }, surfaceId: 'upper' });
    expect(restored.surfaceId).toBe('upper');
    expect(nav.validOnSurface(restored.position, 'upper')).toBe(true);
    expect(nav.sanitize({ position: { x: NaN, z: 0 }, surfaceId: 'missing' }).surfaceId).toBe('ground');
  });

  it('hands off only at the real ground portal and reacquires on entering', () => {
    const nav = createUpperNavigation(fixture);
    expect(nav.move({ position: { x: 40, z: 40 }, surfaceId: null }, { x: 1, z: 0 })).toBeNull();
    const exit = nav.move({ position: { x: 0, z: -2.7 }, surfaceId: 'ground' }, { x: 0, z: -.6 })!;
    expect(exit.surfaceId).toBeNull();
    const reentry = nav.move(exit, { x: 0, z: .3 })!;
    expect(reentry.surfaceId).toBe('ground');
    const upper = nav.move({ position: { x: 0, z: -2 }, surfaceId: 'upper' }, { x: 0, z: -3 })!;
    expect(upper.surfaceId).toBe('upper');
  });

  it('rejects a linked ramp steeper than 36 degrees', () => {
    const steep = { ...fixture, surfaces: fixture.surfaces.map(s => s.id === 'ramp-a' ? { ...s, endY: 10 } : s) };
    const nav = createUpperNavigation(steep);
    const result = nav.move({ position: { x: 0, z: 0 }, surfaceId: 'ground' }, { x: 10, z: 0 })!;
    expect(result.surfaceId).toBe('ground');
    expect(result.position.x).toBeLessThanOrEqual(3 - PLAYER_RADIUS + 1e-6);
  });
});

describe('authored tower navigation in terrain coordinates', () => {
  it('crosses the widened exhibition stair throat on the center and both sides', () => {
    for (const z of [-23.45, -22.7, -22]) {
      const a = upperToWorld({ x: 12.8, z }), b = upperToWorld({ x: 17.1, z });
      const delta = { x: b.x - a.x, z: b.z - a.z };
      const entered = moveUpperPlayer({ position: a, surfaceId: 'ground' }, delta, false, false, true)!;
      expect(entered.surfaceId).toBe('landing-0');
      expect(upperFromWorld(entered.position).x).toBeCloseTo(17.1);
      const returned = moveUpperPlayer(entered, { x: -delta.x, z: -delta.z }, false, false, true)!;
      expect(returned.surfaceId).toBe('ground');
      expect(upperFromWorld(returned.position).x).toBeCloseTo(12.8);
    }
  });

  it('slides along both unrailed sides of each short flight without allowing an edge fall', () => {
    for (const surface of MOGAO_UPPER_LAYOUT.surfaces.filter(s => s.kind === 'ramp')) {
      for (const x of [surface.minX + PLAYER_RADIUS + .001, (surface.minX + surface.maxX) / 2, surface.maxX - PLAYER_RADIUS - .001]) {
        for (const t of [.15, .5, .85]) {
          const z = surface.minZ + (surface.maxZ - surface.minZ) * t;
          for (const side of [-1, 1]) {
            const from = upperToWorld({ x, z }), to = upperToWorld({ x: x + side * .12, z: z + .14 });
            const moved = moveUpperPlayer({ position: from, surfaceId: surface.id }, { x: to.x - from.x, z: to.z - from.z })!;
            const local = upperFromWorld(moved.position);
            expect(local.z - z).toBeGreaterThan(.13);
            expect(moved.surfaceId).toBe(surface.id);
            expect(local.x).toBeGreaterThanOrEqual(surface.minX + PLAYER_RADIUS - 1e-5);
            expect(local.x).toBeLessThanOrEqual(surface.maxX - PLAYER_RADIUS + 1e-5);
            expect(upperNavigation.validOnSurface(local, moved.surfaceId!)).toBe(true);
          }
        }
      }
    }
  });

  it('enters through the original tunnel, passes beside the same Buddha and hands back only through the entrance', () => {
    const entering = upperNavigation.move({ position: { x: 0, z: -1.98 }, surfaceId: null }, { x: 0, z: -.17 })!;
    expect(entering.surfaceId).toBe('entry-tunnel');
    expect(entering.position.z).toBeCloseTo(-2.15, 8);
    const entranceRoute = [{ x: 0, z: -10.5 }, { x: 12.85, z: -10.5 }, { x: 12.85, z: -23 }];
    const arrived = walkRoute(upperNavigation, entering, entranceRoute);
    expect(arrived.state.surfaceId).toBe('ground');
    const blocked = upperNavigation.move({ position: entranceRoute[0], surfaceId: 'ground' }, { x: 0, z: -10 })!;
    expect(blocked.surfaceId).toBe('ground');
    expect(blocked.position.z).toBeGreaterThan(-13.0551 + PLAYER_RADIUS - 1e-4);
    const returning = walkRoute(upperNavigation, arrived.state, [...entranceRoute].reverse().slice(1).concat([{ x: 0, z: -2.15 }]));
    const exit = upperNavigation.move(returning.state, { x: 0, z: .3 })!;
    expect(exit.surfaceId).toBeNull();
    expect(exit.position.z).toBeGreaterThan(-2);
    expect(upperNavigation.move({ position: { x: 30, z: 10 }, surfaceId: null }, { x: 0, z: -.17 })).toBeNull();
  });

  it('walks exactly four real flights, both galleries and Buddha platforms, then returns by the same stairs', () => {
    const route = authoredLayout.route.map(p => ({ x: p.position[0], z: p.position[2] }));
    const start = { position: route[0], surfaceId: authoredLayout.spawn.surfaceId };
    const ascent = walkRoute(upperNavigation, start, route.slice(1));
    expect(ascent.state.surfaceId).toBe('view-b');
    expect(upperNavigation.floorHeight(ascent.state.position, ascent.state.surfaceId)).toBeCloseTo(19.58);
    const visited = new Set(ascent.samples.map(s => s.surfaceId));
    for (const id of ['hall-a', 'view-a', 'hall-b', 'view-b']) expect(visited).toContain(id);
    const flightIds = Array.from({ length: 4 }, (_, i) => `flight-${i + 1}`);
    expect([...visited].filter(id => id?.startsWith('flight-')).sort()).toEqual(flightIds);
    expect(MOGAO_UPPER_LAYOUT.surfaces.filter(s => s.kind === 'ramp').map(s => s.id)).toEqual(flightIds);
    const descent = walkRoute(upperNavigation, ascent.state, [...route].reverse().slice(1));
    expect(descent.state.surfaceId).toBe('ground');
    for (const samples of [ascent.samples, descent.samples]) for (let i = 1; i < samples.length; i++) {
      const before = samples[i - 1], after = samples[i];
      expect(upperNavigation.validOnSurface(after.position, after.surfaceId!)).toBe(true);
      expect(Math.abs(upperNavigation.floorHeight(after.position, after.surfaceId)! - upperNavigation.floorHeight(before.position, before.surfaceId)!))
        .toBeLessThanOrEqual(.17 * UPPER_MAX_SLOPE + .045);
    }
  });

  it('keeps valid checkpoints on every authored floor and ramp through world-coordinate round trips', () => {
    for (const surface of MOGAO_UPPER_LAYOUT.surfaces) {
      const safe = upperNavigation.safeState(surface.id);
      expect(safe.surfaceId, `${surface.id} needs a body-clear position`).toBe(surface.id);
      const position = upperToWorld(safe.position);
      const saved = { position, walkSurface: surface.id, heading: 1.7 };
      const restored = sanitizeUpperCheckpoint(saved);
      expect(restored.walkSurface).toBe(surface.id);
      expect(restored.heading).toBe(saved.heading);
      expect(restored.position.x).toBeCloseTo(position.x, 8);
      expect(restored.position.z).toBeCloseTo(position.z, 8);
    }
  });

  it('retains distinct authored hall and platform levels at identical horizontal coordinates', () => {
    for (const [low, high, p] of [
      ['hall-a', 'hall-b', { x: 23, z: -17 }],
      ['view-a', 'view-b', { x: 11.2, z: -12.2 }],
    ] as const) {
      for (const [id, y] of [[low, 8.11], [high, 19.58]] as const) {
        expect(upperNavigation.validOnSurface(p, id)).toBe(true);
        expect(upperNavigation.floorHeight(p, id)).toBeCloseTo(y);
        const result = upperNavigation.move({ position: p, surfaceId: id }, { x: .1, z: 0 })!;
        expect(result.surfaceId).toBe(id);
        expect(upperNavigation.floorHeight(result.position, result.surfaceId)).toBeCloseTo(y);
      }
    }
  });

  it('round-trips actual local/world positions and preserves the upper checkpoint', () => {
    const p = { x: 21, y: 19.58, z: -22 }, world = upperToWorld(p), roundTrip = upperFromWorld(world);
    expect(roundTrip.x).toBeCloseTo(p.x, 8);
    expect(roundTrip.y).toBeCloseTo(p.y, 8);
    expect(roundTrip.z).toBeCloseTo(p.z, 8);
    const upper = MOGAO_UPPER_LAYOUT.surfaces.find(s => s.kind === 'floor' && Math.abs(s.y - 19.58) < .1)!;
    const safe = upperNavigation.safeState(upper.id), position = upperToWorld(safe.position);
    const checkpoint = { position: { x: position.x, z: position.z }, walkSurface: upper.id, heading: 1.2 };
    const result = sanitizeUpperCheckpoint(checkpoint);
    expect(result.walkSurface).toBe(upper.id);
    expect(result.heading).toBe(1.2);
    expect(result.position.x).toBeCloseTo(position.x, 7);
    expect(upperFloorHeight(result.position, result.walkSurface)).toBeCloseTo(upperToWorld({ x: 0, y: upper.y, z: 0 }).y);
    expect(moveUpperPlayer({ position: checkpoint.position, surfaceId: checkpoint.walkSurface }, { x: 0, z: 0 })?.surfaceId).toBe(upper.id);
  });

  it('has reciprocal links and physically continuous joins within the ramp limit', () => {
    const surfaces = new Map(MOGAO_UPPER_LAYOUT.surfaces.map(s => [s.id, s]));
    for (const s of surfaces.values()) {
      if (s.kind === 'ramp') expect(Math.abs(s.endY! - s.y) / (s.axis === 'x' ? s.maxX - s.minX : s.maxZ - s.minZ)).toBeLessThanOrEqual(UPPER_MAX_SLOPE);
      for (const id of s.neighbors) {
        const other = surfaces.get(id)!;
        expect(other, `${s.id} references ${id}`).toBeDefined();
        expect(other.neighbors, `${s.id}/${id} reciprocal`).toContain(s.id);
        const minX = Math.max(s.minX, other.minX), maxX = Math.min(s.maxX, other.maxX);
        const minZ = Math.max(s.minZ, other.minZ), maxZ = Math.min(s.maxZ, other.maxZ);
        expect(maxX - minX, `${s.id}/${id} x join`).toBeGreaterThanOrEqual(-1e-6);
        expect(maxZ - minZ, `${s.id}/${id} z join`).toBeGreaterThanOrEqual(-1e-6);
        const p = { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
        expect(Math.abs(upperSurfaceHeightAt(s, p) - upperSurfaceHeightAt(other, p)), `${s.id}/${id} height`).toBeLessThan(.05);
      }
    }
  });
});
