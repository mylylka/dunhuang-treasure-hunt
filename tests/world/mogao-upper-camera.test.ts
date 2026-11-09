import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import layout from '../../src/content/world/mogao-upper-v002.json';
import { upperFollowPose, settleUpperCamera } from '../../src/world/mogao-upper-camera';
import { isUpperRailing } from '../../src/world/mogao-upper-presentation';
import { MOGAO_UPPER_LAYOUT, upperNavigation, upperToWorld, upperFromWorld, upperSurfaceHeightAt, type UpperWalkState } from '../../src/world/mogao-upper-navigation';

const boxes = layout.cameraSolids.filter(b => !isUpperRailing(b.id)).map(b => ({ id: b.id, bounds: new THREE.Box3(
  new THREE.Vector3(...b.min as [number, number, number]),
  new THREE.Vector3(...b.max as [number, number, number]),
).expandByScalar(.22) }));

function authoredSamples() {
  const points = layout.surfaces.map(s => upperNavigation.safeState(s.id));
  let state: UpperWalkState = {
    position: { x: layout.spawn.position[0], z: layout.spawn.position[2] }, surfaceId: layout.spawn.surfaceId,
  };
  for (const p of layout.route.slice(1)) {
    const from = state.position, steps = Math.ceil(Math.hypot(p.position[0] - from.x, p.position[2] - from.z) / .4);
    const delta = { x: (p.position[0] - from.x) / steps, z: (p.position[2] - from.z) / steps };
    for (let i = 0; i < steps; i++) {
      state = upperNavigation.move(state, delta)!;
      // About one metre apart; every authored surface also contributes its safe point.
      if (i % 3 === 0) points.push(state);
    }
  }
  return points;
}

const samples = authoredSamples();
function localPoint(p: THREE.Vector3) {
  const local = upperFromWorld(p);
  return new THREE.Vector3(local.x, local.y, local.z);
}

function expectClearSightline(target: THREE.Vector3, position: THREE.Vector3, label: string) {
  const a = localPoint(target), b = localPoint(position), distance = a.distanceTo(b);
  expect([b.x, b.y, b.z].every(Number.isFinite), label).toBe(true);
  expect(distance, label).toBeGreaterThan(.01);
  const ray = new THREE.Ray(a, b.clone().sub(a).normalize());
  const obstruction = boxes.find(box => {
    const hit = ray.intersectBox(box.bounds, new THREE.Vector3());
    return !!hit && a.distanceTo(hit) < distance - 1e-5;
  });
  expect(obstruction?.id, label).toBeUndefined();
}

function worldHeading(dx: number, dz: number) {
  const a = upperToWorld({ x: 0, z: 0 }), b = upperToWorld({ x: dx, z: dz });
  return Math.atan2(-(b.x - a.x), -(b.z - a.z));
}

describe('authored upper-room orbit camera', () => {
  it('keeps all authored surface anchors and sampled stair / platform anchors outside expanded real geometry', () => {
    const failures: string[] = [];
    for (const sample of samples) {
      const floor = upperNavigation.floorHeight(sample.position, sample.surfaceId)!;
      const target = new THREE.Vector3(sample.position.x, floor + 1.65, sample.position.z);
      const contained = boxes.find(b => b.bounds.containsPoint(target));
      if (contained) failures.push(`${sample.surfaceId}: ${contained.id}`);
    }
    expect(failures).toEqual([]);
  });

  it('clears eight orbit directions and the eased camera path at every sampled level', () => {
    const failures: string[] = [];
    for (const sample of samples) {
      const floor = upperNavigation.floorHeight(sample.position, sample.surfaceId)!;
      const world = upperToWorld({ ...sample.position, y: floor });
      let previous: THREE.Vector3 | null = null;
      for (let angle = 0; angle < 8; angle++) {
        const pose = upperFollowPose(world.x, world.y, world.z, angle * Math.PI / 4, { surfaceId: sample.surfaceId, assist: false });
        const desired = settleUpperCamera(pose.target, pose.position);
        const easedInput = previous ? previous.clone().lerp(desired, .4) : desired;
        const eased = settleUpperCamera(pose.target, easedInput);
        // An eased previous arm can be longer than a newly wall-retracted goal;
        // each collision pass must only shorten its own actual input ray.
        for (const [position, maxDistance] of [
          [desired, pose.target.distanceTo(pose.position)],
          [eased, pose.target.distanceTo(easedInput)],
        ] as const) {
          const a = localPoint(pose.target), b = localPoint(position), distance = a.distanceTo(b);
          if (![b.x, b.y, b.z].every(Number.isFinite) || distance < .1 || distance > maxDistance + 1e-6) {
            failures.push(`${sample.surfaceId}/${angle}: invalid orbit distance ${distance}`);
            continue;
          }
          const ray = new THREE.Ray(a, b.clone().sub(a).normalize()), intersection = new THREE.Vector3();
          const obstruction = boxes.find(box => {
            const hit = ray.intersectBox(box.bounds, intersection);
            return !!hit && a.distanceTo(hit) < distance - 1e-5;
          });
          if (obstruction) failures.push(`${sample.surfaceId}/${angle}: crossed ${obstruction.id}`);
        }
        previous = desired;
      }
    }
    expect(failures).toEqual([]);
  });

  it('keeps an assisted shoulder view on all four flights and every platform, including the second collision pass', () => {
    const stairs = MOGAO_UPPER_LAYOUT.surfaces.filter(s => /^(flight|landing)-/.test(s.id));
    for (const surface of stairs) {
      // Include both ends of each flight and both shoulders of each landing.
      const points = surface.kind === 'ramp'
        ? [.15, .5, .85].map(t => ({ x: (surface.minX + surface.maxX) / 2, z: surface.minZ + (surface.maxZ - surface.minZ) * t }))
        : [17.1, 18.7, 20.3].map(x => ({ x, z: (surface.minZ + surface.maxZ) / 2 }));
      const axisHeading = surface.kind === 'ramp' ? worldHeading(0, 1) : worldHeading(1, 0);
      for (const point of points) {
        expect(upperNavigation.validOnSurface(point, surface.id)).toBe(true);
        const world = upperToWorld({ ...point, y: upperSurfaceHeightAt(surface, point) });
        let previous: THREE.Vector3 | undefined;
        for (const heading of [axisHeading, axisHeading + Math.PI]) {
          const label = `${surface.id}/${point.x},${point.z}/${heading}`;
          const pose = upperFollowPose(world.x, world.y, world.z, heading + .8, {
            surfaceId: surface.id, travelHeading: heading, assist: true, previousPosition: previous,
          });
          expect(pose.target.y - world.y, label).toBeCloseTo(1.25);
          const desired = settleUpperCamera(pose.target, pose.position);
          // The assisted route must keep the avatar visible at the short-arm threshold.
          expect(desired.distanceTo(pose.target), label).toBeGreaterThan(1.35);
          expectClearSightline(pose.target, desired, label);
          const eased = settleUpperCamera(pose.target, previous ? previous.clone().lerp(desired, .4) : desired);
          expectClearSightline(pose.target, eased, `${label}/eased`);
          previous = desired;
        }
      }
    }
  });

  it('honors manual yaw on every short flight while allowing a wall-facing camera to retract', () => {
    for (const surface of MOGAO_UPPER_LAYOUT.surfaces.filter(s => s.kind === 'ramp')) {
      const point = { x: (surface.minX + surface.maxX) / 2, z: (surface.minZ + surface.maxZ) / 2 };
      const world = upperToWorld({ ...point, y: upperSurfaceHeightAt(surface, point) });
      const travelHeading = worldHeading(0, 1);
      for (let i = 0; i < 8; i++) {
        const yaw = i * Math.PI / 4;
        const pose = upperFollowPose(world.x, world.y, world.z, yaw, {
          surfaceId: surface.id, travelHeading, assist: false,
        });
        expect(pose.target.y - world.y).toBeCloseTo(1.25);
        const settled = settleUpperCamera(pose.target, pose.position);
        const horizontal = new THREE.Vector2(settled.x - world.x, settled.z - world.z).normalize();
        expect(horizontal.dot(new THREE.Vector2(Math.sin(yaw), Math.cos(yaw))), `manual yaw ${yaw}`).toBeCloseTo(1, 6);
        expectClearSightline(pose.target, settled, `${surface.id}/manual/${yaw}`);
      }
      // With assistance active the same travel heading owns the shoulder direction;
      // a stale orbit yaw must not turn the following camera toward the cliff.
      const first = upperFollowPose(world.x, world.y, world.z, 0, { surfaceId: surface.id, travelHeading, assist: true });
      const second = upperFollowPose(world.x, world.y, world.z, Math.PI, { surfaceId: surface.id, travelHeading, assist: true });
      expect(first.position.distanceTo(second.position)).toBeLessThan(1e-8);
    }
  });
});
