import { describe, expect, it } from 'vitest';
import { COURTYARD_ROAD, ROAD_HALF_WIDTH } from '../../src/world/road';
import { isWalkable, movePlayer } from '../../src/world/movement';

describe('road connects to the actual courtyard gate', () => {
  it('keeps the full road width clear of walls, including its curved approach', () => {
    for (const { center, left, right } of COURTYARD_ROAD) {
      expect(Math.hypot(left.x - right.x, left.z - right.z)).toBeCloseTo(2 * ROAD_HALF_WIDTH);
      for (let t = 0; t <= 1; t += .1) {
        expect(isWalkable({ x: left.x * t + right.x * (1 - t), z: left.z * t + right.z * (1 - t) }), `road near ${center.x},${center.z}`).toBe(true);
      }
    }
  });
  it('crosses the front wall only between the gate piers, never through a side wall', () => {
    const nearGate = COURTYARD_ROAD.filter(({ center }) => center.z <= 4 && center.z >= 0);
    expect(nearGate.length).toBeGreaterThan(3);
    for (const { center, left, right } of nearGate) {
      expect(center.x).toBeCloseTo(-12);
      expect(Math.min(left.x, right.x)).toBeGreaterThan(-14.55);
      expect(Math.max(left.x, right.x)).toBeLessThan(-9.45);
    }
    expect(COURTYARD_ROAD.at(-1)?.center).toEqual({ x: -12, z: -13 });
  });
  it('can walk the rendered road continuously into the hall without collision redirects', () => {
    let position = COURTYARD_ROAD[0].center;
    for (const { center } of COURTYARD_ROAD.slice(1)) {
      position = movePlayer(position, { x: center.x - position.x, z: center.z - position.z });
      expect(position.x).toBeCloseTo(center.x, 5);
      expect(position.z).toBeCloseTo(center.z, 5);
    }
  });
});
