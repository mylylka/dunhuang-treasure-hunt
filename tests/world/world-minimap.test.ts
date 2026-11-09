import { describe, expect, it } from 'vitest';
import { TERRAIN_ANCHORS, TERRAIN_ROUTES, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import { worldMinimapPosition } from '../../src/world/world-minimap';

describe('illustrated world minimap', () => {
  it('places the three real entrances and both ends of the tower stairs on their depicted landmarks', () => {
    const gate = worldMinimapPosition(TERRAIN_ANCHORS.courtyardGate)!;
    const music = worldMinimapPosition(TERRAIN_ANCHORS.musicGate)!;
    const foot = worldMinimapPosition(TERRAIN_ANCHORS.cliffStairFoot)!;
    const door = worldMinimapPosition(TERRAIN_ANCHORS.cliffDoor)!;
    expect(gate.x).toBeCloseTo(.294, 3); expect(gate.y).toBeCloseTo(.816, 3);
    expect(music.x).toBeCloseTo(.334, 3); expect(music.y).toBeCloseTo(.37, 3);
    expect(foot.x).toBeCloseTo(.735, 3); expect(foot.y).toBeCloseTo(.616, 3);
    expect(door.x).toBeCloseTo(.762, 3); expect(door.y).toBeCloseTo(.542, 3);
  });

  it('progresses continuously over both roads and moves within a courtyard', () => {
    for (const route of TERRAIN_ROUTES) {
      let previous = worldMinimapPosition(route.points[0])!;
      for (const point of route.points.slice(1)) {
        const next = worldMinimapPosition(point)!;
        expect(next).not.toBeNull();
        expect(Math.hypot(next.x - previous.x, next.y - previous.y)).toBeLessThan(.015);
        previous = next;
      }
    }
    const inside = worldMinimapPosition(toTerrainPoint('courtyard', {x:-12,z:-12}))!;
    const moved = worldMinimapPosition(toTerrainPoint('courtyard', {x:-12,z:-8}))!;
    expect(Math.hypot(inside.x - moved.x, inside.y - moved.y)).toBeGreaterThan(.005);
  });

  it('advances up the depicted stairs and does not freeze lateral movement', () => {
    const foot = TERRAIN_ANCHORS.cliffStairFoot, door = TERRAIN_ANCHORS.cliffDoor;
    let previousY = Infinity;
    for (let step = 0; step <= 20; step++) {
      const t = step / 20;
      const point = {x:foot.x + (door.x-foot.x)*t, z:foot.z + (door.z-foot.z)*t};
      const marker = worldMinimapPosition(point)!;
      expect(marker.y).toBeLessThan(previousY);
      previousY = marker.y;
    }
    const midpoint = {x:(foot.x+door.x)/2,z:(foot.z+door.z)/2};
    const center = worldMinimapPosition(midpoint)!;
    const side = worldMinimapPosition({x:midpoint.x+2,z:midpoint.z})!;
    expect(Math.hypot(center.x-side.x,center.y-side.y)).toBeGreaterThan(.0001);
  });

  it('approaches the foot continuously from the road, including the reported position', () => {
    const reported = worldMinimapPosition({x:319.055,z:59.93})!;
    expect(reported.x).toBeGreaterThan(.725); expect(reported.x).toBeLessThan(.735);
    expect(reported.y).toBeGreaterThan(.616); expect(reported.y).toBeLessThan(.63);
    const foot = TERRAIN_ANCHORS.cliffStairFoot;
    const approach = TERRAIN_ROUTES.find(route => route.id === 'lake-to-cliff')!.points
      .filter(point => Math.hypot(point.x-foot.x,point.z-foot.z) <= 10);
    expect(approach.length).toBeGreaterThan(5);
    let lastX = -Infinity, lastY = Infinity;
    for (const point of approach) {
      const marker = worldMinimapPosition(point)!;
      expect(marker.x).toBeGreaterThanOrEqual(lastX);
      expect(marker.y).toBeLessThanOrEqual(lastY);
      lastX = marker.x; lastY = marker.y;
    }
  });
});
