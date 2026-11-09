import { describe, expect, it } from 'vitest';
import {
  LAKE_SHORELINE, LAKE_WATER_LEVEL, TERRAIN_ANCHORS, TERRAIN_BOUNDS, TERRAIN_PLAYER_COLLIDERS,
  TERRAIN_REGIONS, TERRAIN_ROUTES, TERRAIN_SESSION_OPTIONS, TERRAIN_SPAWN, TERRAIN_SPAWN_YAW,
  fromTerrainPoint, isTerrainWalkable, lakeSignedDistance, moveTerrainPlayer, relocateOasisPoint,
  sanitizeTerrainPosition, terrainHeight, terrainRegionAt, terrainSurfaceHeight, toTerrainPoint,
  type TerrainRegion,
} from '../../src/world/terrain-rules-v001';
import { isWalkable, movementVector } from '../../src/world/movement';
import { TERRAIN_TOWER_TREES } from '../../src/content/world/terrain-trees-v001';

const formerDeepWater = { x: 233, z: 15 };
const deepWater = relocateOasisPoint(formerDeepWater);

describe('continuous terrain v001', () => {
  it('moves all region coordinates together and preserves the accepted cliff assembly', () => {
    for (const region of Object.keys(TERRAIN_REGIONS) as TerrainRegion[]) {
      const source = { x: 52.35, y: 7.275, z: -17.745 };
      const roundTrip = fromTerrainPoint(region, toTerrainPoint(region, source));
      expect(roundTrip.x).toBeCloseTo(source.x, 10);
      expect(roundTrip.y).toBeCloseTo(source.y, 10);
      expect(roundTrip.z).toBeCloseTo(source.z, 10);
      expect(toTerrainPoint(region, TERRAIN_REGIONS[region].source)).toEqual(TERRAIN_REGIONS[region].target);
    }
    expect(toTerrainPoint('cliff', { x: 122, y: 6.85546875, z: -68 })).toEqual({ x: 330, y: 16.85546875, z: 90 });
    expect(TERRAIN_ANCHORS.cliffStairFoot.x).toBeCloseTo(320.0814158436);
    expect(TERRAIN_ANCHORS.cliffStairFoot.z).toBeCloseTo(62.7489139972);
    // The v012 relocation rotated the pavilion 40 degrees around its old pad.
    expect(TERRAIN_ANCHORS.musicGate.x).toBeCloseTo(210.5125627148);
    expect(TERRAIN_ANCHORS.musicGate.z).toBeCloseTo(-29.6816938215);
    expect((TERRAIN_REGIONS.courtyard.yaw - TERRAIN_REGIONS.music.yaw) * 180 / Math.PI).toBeCloseTo(-4);
  });

  it('has a continuous high shoulder, natural crest and low valley while retaining building floors', () => {
    const court = toTerrainPoint('courtyard', { x: -12, z: -3 });
    expect(terrainHeight(court.x, court.z)).toBeCloseTo(11.975, 3);
    expect(terrainHeight(136.5, 22)).toBeGreaterThan(19);
    expect(terrainHeight(136.5, 22)).toBeLessThan(20.5);
    expect(terrainHeight(66, 20)).toBeLessThan(18);
    const musicPad = TERRAIN_REGIONS.music.target;
    expect(terrainHeight(musicPad.x, musicPad.z)).toBeCloseTo(2.475, 3);
    expect(terrainSurfaceHeight(toTerrainPoint('courtyard', { x: -12, z: -18 }))).toBeCloseTo(12.28);
    expect(terrainSurfaceHeight(toTerrainPoint('music', { x: 52, z: -20 }))).toBeCloseTo(4.3);
    expect(terrainSurfaceHeight(toTerrainPoint('cliff', { x: 122, z: -77 }))).toBeCloseTo(16.87946875);
    // The actual hill, rather than a visibility switch, covers the low roof.
    for (const observer of [TERRAIN_ANCHORS.courtyardGate, TERRAIN_SPAWN, TERRAIN_ANCHORS.courtyardSafe])
      for (const x of [32.81, 61.72]) for (const z of [-29.11, -16.89]) {
        const roof = toTerrainPoint('music', { x, y: 17.83, z }), eyeY = terrainSurfaceHeight(observer) + 4.5;
        let cover = -Infinity;
        for (let i = 1; i < 200; i++) {
          const t = i / 200, px = observer.x + (roof.x - observer.x) * t, pz = observer.z + (roof.z - observer.z) * t;
          cover = Math.max(cover, terrainHeight(px, pz) - (eyeY + (roof.y - eyeY) * t));
        }
        expect(cover).toBeGreaterThan(0);
      }
  });

  it('keeps the v012 road lengths and grades while joining the real doors without folded curves', () => {
    const [first, second] = TERRAIN_ROUTES;
    for (const [point, expected] of [[first.points[0], TERRAIN_ANCHORS.courtyardGate], [first.points.at(-1)!, TERRAIN_ANCHORS.musicGate],
      [second.points[0], TERRAIN_ANCHORS.musicGate], [second.points.at(-1)!, TERRAIN_ANCHORS.cliffStairFoot]]) {
      expect(point.x).toBeCloseTo(expected.x, 8); expect(point.z).toBeCloseTo(expected.z, 8);
    }
    // The relocation acceptance recorded 138.57 m at 27.40° and 150.63 m at 5.56°.
    for (const [route, minimumLength, maximumLength, maximumGrade] of [[first, 137, 140, 28], [second, 149, 152, 6]] as const) {
      let length = 0;
      for (let i = 1; i < route.points.length; i++) {
        const a = route.points[i - 1], b = route.points[i], distance = Math.hypot(b.x - a.x, b.z - a.z);
        length += distance;
        expect(distance).toBeLessThan(1.5);
        expect(distance).toBeGreaterThan(.05);
        expect(Math.abs(b.y - a.y) / distance).toBeLessThanOrEqual(Math.tan(maximumGrade * Math.PI / 180));
        expect(b.y).toBeCloseTo(terrainHeight(b.x, b.z), 9);
        const atCliffFoot = Math.hypot(b.x - TERRAIN_ANCHORS.cliffStairFoot.x, b.z - TERRAIN_ANCHORS.cliffStairFoot.z) < 1e-8;
        if (atCliffFoot) {
          expect(terrainSurfaceHeight(b)).toBeCloseTo(TERRAIN_REGIONS.cliff.target.y + .024, 8);
          expect(b.y).toBeCloseTo(TERRAIN_REGIONS.cliff.target.y - .025, 2);
        } else expect(Math.abs(terrainSurfaceHeight(b) - b.y)).toBeLessThan(.03);
      }
      expect(length).toBeGreaterThanOrEqual(minimumLength);
      expect(length).toBeLessThanOrEqual(maximumLength);
    }
  });

  it('keeps the entire road ribbon walkable beside existing walls and props', () => {
    for (const route of TERRAIN_ROUTES) for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z, distance = Math.hypot(dx, dz);
      for (const side of [-1, 0, 1]) {
        const p = { x: b.x - side * dz / distance * route.width / 2, z: b.z + side * dx / distance * route.width / 2 };
        expect(isTerrainWalkable(p), `${route.id} at ${p.x}, ${p.z}`).toBe(true);
        expect(lakeSignedDistance(p.x, p.z)).toBeGreaterThan(1.04);
      }
    }
  });

  it('walks each complete route and the original cliff stairs without jumping or wall tunnelling', () => {
    for (const route of TERRAIN_ROUTES) {
      let p = { x: route.points[0].x, z: route.points[0].z };
      for (const target of route.points.slice(1)) {
        const previousHeight = terrainSurfaceHeight(p);
        p = moveTerrainPlayer(p, { x: target.x - p.x, z: target.z - p.z });
        expect(Math.hypot(target.x - p.x, target.z - p.z)).toBeLessThan(.005);
        expect(Math.abs(terrainSurfaceHeight(p) - previousHeight)).toBeLessThan(.4);
      }
    }
    let p = { x: TERRAIN_ANCHORS.cliffStairFoot.x, z: TERRAIN_ANCHORS.cliffStairFoot.z };
    for (let z = -39.2; z >= -79; z -= .2) {
      const target = toTerrainPoint('cliff', { x: 122, z });
      p = moveTerrainPlayer(p, { x: target.x - p.x, z: target.z - p.z });
      expect(p.x).toBeCloseTo(target.x, 5); expect(p.z).toBeCloseTo(target.z, 5);
    }
    expect(terrainSurfaceHeight(p)).toBeCloseTo(16.87946875);
  });

  it('shares the exact crescent shoreline between the lake bed, water and collision', () => {
    expect(LAKE_SHORELINE.length).toBeGreaterThan(100);
    for (const p of LAKE_SHORELINE) {
      expect(Math.abs(lakeSignedDistance(p.x, p.z))).toBeLessThan(1e-9);
      expect(terrainHeight(p.x, p.z)).toBeCloseTo(LAKE_WATER_LEVEL, 8);
    }
    expect(lakeSignedDistance(deepWater.x, deepWater.z)).toBeLessThan(-8);
    expect(terrainHeight(deepWater.x, deepWater.z)).toBeLessThan(-3);
    expect(isTerrainWalkable(deepWater)).toBe(false);
    const start = relocateOasisPoint({ x: 260, z: 15 }), target = relocateOasisPoint({ x: 222, z: 15 });
    const approach = moveTerrainPlayer(start, { x: target.x - start.x, z: target.z - start.z });
    const travelled = Math.hypot(approach.x - start.x, approach.z - start.z);
    expect(travelled).toBeGreaterThan(4);
    expect(travelled).toBeLessThan(6);
    expect(lakeSignedDistance(approach.x, approach.z)).toBeGreaterThanOrEqual(1.04 - 1e-5);
    expect(isTerrainWalkable(approach)).toBe(true);
    expect(TERRAIN_PLAYER_COLLIDERS.find(collider => collider.id === 'terrain-lake')?.polygon).toEqual(LAKE_SHORELINE.map(p => [p.x, p.z]));
  });

  it('keeps slopes continuous between paths, pads and shores', () => {
    for (let x = -15; x <= 340; x += 3) for (let z = -35; z <= 110; z += 3) {
      const h = terrainHeight(x, z);
      expect(Number.isFinite(h)).toBe(true);
      expect(Math.abs(terrainHeight(x + .02, z) - h)).toBeLessThan(.12);
      expect(Math.abs(terrainHeight(x, z + .02) - h)).toBeLessThan(.12);
    }
  });

  it('sanitizes water, walls and invalid sessions to a dry safe spawn in the new version', () => {
    expect(isTerrainWalkable(TERRAIN_SPAWN)).toBe(true);
    for (const p of [deepWater, { x: NaN, z: 0 }, { x: TERRAIN_BOUNDS.maxX + 1, z: 0 }, toTerrainPoint('courtyard', { x: -24, z: -11 })])
      expect(sanitizeTerrainPosition(p)).toEqual(TERRAIN_SPAWN);
    expect(sanitizeTerrainPosition(formerDeepWater)).toEqual(formerDeepWater);
    expect(sanitizeTerrainPosition({ x: 136.5, z: 22 })).toEqual({ x: 136.5, z: 22 });
    expect(TERRAIN_SESSION_OPTIONS.spawn).toEqual(TERRAIN_SPAWN);
    expect(TERRAIN_SESSION_OPTIONS.sanitizePosition(deepWater)).toEqual(TERRAIN_SPAWN);
    expect(TERRAIN_SESSION_OPTIONS.key).toBe('dunhuang:terrain-preview:v3');
    expect(terrainRegionAt(TERRAIN_SPAWN)).toBe('courtyard');
    expect(terrainRegionAt(TERRAIN_ANCHORS.musicGate)).toBe('music');
    expect(terrainRegionAt(TERRAIN_ANCHORS.cliffStairFoot)).toBe('cliff');
    expect(terrainRegionAt({ x: 66, z: 70 })).toBeNull();
    const frontWall = TERRAIN_PLAYER_COLLIDERS.find(collider => collider.id === 'terrain-music-music-court-front-west')!;
    expect(frontWall.height).toBeCloseTo(7.21);
  });

  it('spawns on the path outside the courtyard facing its real gate', () => {
    const gate = TERRAIN_ANCHORS.courtyardGate, distance = Math.hypot(TERRAIN_SPAWN.x - gate.x, TERRAIN_SPAWN.z - gate.z);
    expect(distance).toBeGreaterThanOrEqual(4); expect(distance).toBeLessThanOrEqual(7);
    const forward = movementVector(0, -1, TERRAIN_SPAWN_YAW);
    expect((gate.x - TERRAIN_SPAWN.x) * forward.x + (gate.z - TERRAIN_SPAWN.z) * forward.z).toBeCloseTo(distance);
    let p = { ...TERRAIN_SPAWN };
    for (let i = 0; i < 48; i++) p = moveTerrainPlayer(p, { x: forward.x * .1, z: forward.z * .1 });
    expect(p.x).toBeCloseTo(gate.x, 5); expect(p.z).toBeCloseTo(gate.z, 5);
  });

  it('moves diagonally along road shoulders and through the former invisible slope barrier', () => {
    let checks = 0;
    for (const route of TERRAIN_ROUTES) for (let i = 1; i < route.points.length; i += 8) {
      const a = route.points[i - 1], b = route.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      for (const side of [-4, -3, -2.7, -1.65, 0, 1.65, 2.7, 3, 4]) {
        const p = { x: b.x - dz / length * side, z: b.z + dx / length * side };
        if (!isWalkable(p, TERRAIN_PLAYER_COLLIDERS, TERRAIN_BOUNDS)) continue;
        if (Math.abs(side) > 2.7 && !isTerrainWalkable(p)) continue; // Visible steep side-slopes remain steep.
        expect(isTerrainWalkable(p), `walkable shoulder ${p.x},${p.z}`).toBe(true);
        for (let direction = 0; direction < 8; direction++) for (const step of [.09, .22, .35]) {
          const angle = Math.atan2(dz, dx) + direction * Math.PI / 4;
          const delta = { x: Math.cos(angle) * step, z: Math.sin(angle) * step }, q = { x: p.x + delta.x, z: p.z + delta.z };
          if (![.25, .5, .75, 1].every(t => isTerrainWalkable({ x: p.x + delta.x * t, z: p.z + delta.z * t }))) continue;
          const moved = moveTerrainPlayer(p, delta);
          expect(Math.hypot(moved.x - q.x, moved.z - q.z), `diagonal ${p.x},${p.z}`).toBeLessThan(.002); checks++;
        }
      }
    }
    expect(checks).toBeGreaterThan(5000);
    for (const p of [{ x: 306.51097, z: 48.5652 }, { x: 307, z: 47.95 }]) {
      expect(isTerrainWalkable(p)).toBe(true);
      for (let i = 0; i < 8; i++) {
        const angle = i * Math.PI / 4, moved = moveTerrainPlayer(p, { x: Math.cos(angle) * .22, z: Math.sin(angle) * .22 });
        expect(Math.hypot(moved.x - p.x, moved.z - p.z)).toBeCloseTo(.22, 5);
      }
    }
    // Regression: the two road shoulders overlap outside the music gate. An
    // inverse-square singularity used to drop 10.6 cm over one 9 cm move here.
    const seam = relocateOasisPoint({ x: 173.292447483457, z: 35.14358595036031 });
    for (let i = 0; i < 32; i++) {
      const angle = i * Math.PI / 16, delta = { x: Math.cos(angle) * .09, z: Math.sin(angle) * .09 };
      const moved = moveTerrainPlayer(seam, delta);
      expect(moved.x).toBeCloseTo(seam.x + delta.x, 6); expect(moved.z).toBeCloseTo(seam.z + delta.z, 6);
      expect(Math.abs(terrainHeight(moved.x, moved.z) - terrainHeight(seam.x, seam.z))).toBeLessThan(.06);
    }
  });

  it('keeps the complete stair-foot seam traversable and the two real tree trunks solid', () => {
    for (const x of [118, 120, 122, 124, 126]) for (const direction of [-1, 1]) {
      const startZ = direction < 0 ? -37 : -41;
      let p = toTerrainPoint('cliff', { x, z: startZ });
      for (let i = 1; i <= 40; i++) {
        const q = toTerrainPoint('cliff', { x, z: startZ + direction * i * .1 });
        const moved = moveTerrainPlayer(p, { x: q.x - p.x, z: q.z - p.z });
        expect(moved.x).toBeCloseTo(q.x, 5); expect(moved.z).toBeCloseTo(q.z, 5); p = { ...p, ...moved };
      }
    }
    for (const tree of TERRAIN_TOWER_TREES) {
      const center = toTerrainPoint('cliff', tree.placement), collider = TERRAIN_PLAYER_COLLIDERS.find(c => c.id === tree.id)!;
      expect(collider.circle?.radius).toBe(tree.collisionRadii.player);
      expect(isTerrainWalkable(center)).toBe(false);
      expect(collider.height - terrainHeight(center.x, center.z)).toBeCloseTo(25);
      for (const route of TERRAIN_ROUTES) for (const p of route.points)
        expect(Math.hypot(p.x - center.x, p.z - center.z)).toBeGreaterThan(tree.collisionRadii.player + route.width / 2 + .69);
    }
  });

  it('keeps rotated pads, entrances and wall proxies in the same local frame', () => {
    for (const collider of TERRAIN_PLAYER_COLLIDERS.filter(c => !c.circle)) expect(collider.polygon?.length).toBeGreaterThanOrEqual(4);
    for (const [region, points] of [
      ['courtyard', [{ x: -12, z: 2 }, { x: -12, z: -13 }, { x: -12, z: -22 }]],
      ['music', [{ x: 40.2, z: 3 }, { x: 40.2, z: -7 }, { x: 51.075, z: -11.9 }, { x: 52.35, z: -11.9 }]],
    ] as const) {
      let p = toTerrainPoint(region, points[0]);
      for (const destination of points.slice(1)) {
        const target = toTerrainPoint(region, destination), dx = target.x - p.x, dz = target.z - p.z;
        const steps = Math.ceil(Math.hypot(dx, dz) / .2);
        for (let i = 0; i < steps; i++) {
          const moved = moveTerrainPlayer(p, { x: dx / steps, z: dz / steps });
          p = { ...p, ...moved };
        }
        expect(p.x).toBeCloseTo(target.x, 5); expect(p.z).toBeCloseTo(target.z, 5);
      }
    }
    for (const source of [{ x: 23.51, z: -29.29 }, { x: 70.49, z: -29.29 }, { x: 70.49, z: 3.49 }, { x: 23.51, z: 3.49 }]) {
      const p = toTerrainPoint('music', source);
      expect(lakeSignedDistance(p.x, p.z)).toBeGreaterThan(7.5);
      expect(terrainHeight(p.x, p.z)).toBeGreaterThan(2.45);
      expect(terrainHeight(p.x, p.z)).toBeLessThan(2.51);
    }
    for (const x of [57, 187]) for (const z of [-117, -42]) {
      const p = toTerrainPoint('cliff', { x, z });
      expect(p.x).toBeGreaterThan(TERRAIN_BOUNDS.minX); expect(p.x).toBeLessThan(TERRAIN_BOUNDS.maxX);
      expect(p.z).toBeGreaterThan(TERRAIN_BOUNDS.minZ); expect(p.z).toBeLessThan(TERRAIN_BOUNDS.maxZ);
    }
  });
});
