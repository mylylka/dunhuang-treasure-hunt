import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MOGAO_EXHIBIT_ENTRANCES } from '../../src/content/world/mogao-exhibit-entrance-v001';
import { advanceMogaoHallArrival, createMogaoHallArrival, findMogaoHallArrival, HALL_TITLE_HOLD_SECONDS, mogaoHallArrivalDelta, mogaoHallTitleCamera } from '../../src/world/mogao-exhibit-arrival';
import { moveUpperPlayer, upperFromWorld, upperNavigation, upperToWorld, type UpperWalkState } from '../../src/world/mogao-upper-navigation';

const localWalk = (x: number, z: number, surfaceId: string): UpperWalkState => ({ position: upperToWorld({ x, z }), surfaceId });

describe('current exhibit first arrival', () => {
  it('starts on upward assistance or a deliberate entrance approach, not a lateral pass, exit, or resumed hall', () => {
    expect(findMogaoHallArrival(localWalk(17.1, -24.24, 'flight-3'), localWalk(17.1, -23.95, 'landing-2'))).toBeNull();
    for (const [hall, landing] of [['hall-a', 'landing-2'], ['hall-b', 'landing-4']] as const) {
      const stop = localWalk(20.3, -23, landing);
      expect(findMogaoHallArrival(stop, stop, true)).toBe(hall);
      expect(findMogaoHallArrival(stop, stop)).toBeNull();
      const approaching = localWalk(20.3, -22.9, landing);
      expect(findMogaoHallArrival(stop, approaching)).toBe(hall);
      expect(findMogaoHallArrival(localWalk(20.3, -21.91, landing), localWalk(20.3, -21.73, hall))).toBe(hall);
      expect(findMogaoHallArrival(approaching, localWalk(20, -22.87, landing))).toBeNull();
      expect(findMogaoHallArrival(localWalk(20.3, -21.7, hall), approaching)).toBeNull();
      expect(findMogaoHallArrival(localWalk(20.3, -21.2, hall), localWalk(20.3, -20.9, hall))).toBeNull();
    }
  });

  it('holds the title for 2.5 seconds after the turn and walks both doors through the real surfaces', () => {
    for (const [hall, landing, x] of [['hall-a', 'landing-2', 20.3], ['hall-b', 'landing-4', 17.1]] as const) {
      let walk = localWalk(x, -22.9, landing);
      const arrival = createMogaoHallArrival(hall, walk.position);
      advanceMogaoHallArrival(arrival, walk.position, walk, .55);
      expect(mogaoHallTitleCamera(arrival, false, true, true)?.weight).toBe(1);
      advanceMogaoHallArrival(arrival, walk.position, walk, HALL_TITLE_HOLD_SECONDS - .001);
      expect(arrival.phase).toBe('title');
      expect(mogaoHallArrivalDelta(arrival, walk.position, .05)).toEqual({ x: 0, z: 0 });
      advanceMogaoHallArrival(arrival, walk.position, walk, .002);
      expect(arrival.phase).toBe('entering');
      let outcome = null;
      for (let frame = 0; frame < 80 && !outcome; frame++) {
        const before = walk.position;
        walk = moveUpperPlayer(walk, mogaoHallArrivalDelta(arrival, before, .05), true, true)!;
        expect(upperNavigation.validOnSurface(upperFromWorld(walk.position), walk.surfaceId!)).toBe(true);
        outcome = advanceMogaoHallArrival(arrival, before, walk, .05);
      }
      expect(outcome).toBe('ready');
      expect(walk.surfaceId).toBe(hall);
      const local = upperFromWorld(walk.position);
      expect(local.x).toBeCloseTo(18.7, 2);
      expect(local.z).toBeCloseTo(-18.8, 2);
      expect(arrival.phase).toBe('intro');
      expect(mogaoHallArrivalDelta(arrival, walk.position, .05)).toEqual({ x: 0, z: 0 });
    }
  });

  it('reports a stalled walk without snapping the saved position into the hall', () => {
    const walk = localWalk(20.3, -23, 'landing-2');
    const arrival = createMogaoHallArrival('hall-a', walk.position);
    advanceMogaoHallArrival(arrival, walk.position, walk, 3.1);
    expect(advanceMogaoHallArrival(arrival, walk.position, walk, .4)).toBeNull();
    expect(advanceMogaoHallArrival(arrival, walk.position, walk, .4)).toBe('blocked');
    expect(arrival.phase).toBe('entering');
    expect(upperFromWorld(walk.position).z).toBeCloseTo(-23);
  });

  it('fits the traveller from above the knees and the entire installed title after the turn', () => {
    for (const [hall, landing, floor] of [['hall-a', 'landing-2', 8.11], ['hall-b', 'landing-4', 19.58]] as const) {
      const sign = MOGAO_EXHIBIT_ENTRANCES.find(entrance => entrance.id === hall)!;
      const [titleX, titleY, titleZ] = sign.center;
      for (const [x, z] of [[20.3, -23], [17.1, -22.9], [16.05, -22.9], [21.35, -22.9], [20.3, -21.95]]) {
        const walk = localWalk(x, z, landing);
        const arrival = createMogaoHallArrival(hall, walk.position);
        advanceMogaoHallArrival(arrival, walk.position, walk, .8);
        const pose = mogaoHallTitleCamera(arrival, false, true, true)!;
        expect(pose.weight).toBe(1);
        for (const aspect of [16 / 9, 754 / 294]) {
          const camera = new THREE.PerspectiveCamera(pose.fov, aspect, .1, 100);
          camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld(true);
          const project = (px: number, py: number, pz: number) => {
            const world = upperToWorld({ x: px, y: py, z: pz });
            return new THREE.Vector3(world.x, world.y, world.z).project(camera);
          };
          for (const point of [project(x, floor + .55, z), project(x, floor + 1.72, z), ...[-1, 1].flatMap(side => [-1, 1].map(end => project(
            titleX + side * sign.width / 2,
            titleY + (sign.underRoof ? 0 : end * sign.height / 2),
            titleZ + (sign.underRoof ? end * sign.height / 2 : 0),
          )))]) {
            expect(point.z).toBeGreaterThan(0);
            expect(Math.abs(point.x)).toBeLessThan(.97);
            expect(Math.abs(point.y)).toBeLessThan(.97);
          }
        }
      }
    }
  });
});
