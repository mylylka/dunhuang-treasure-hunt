import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Ray, Vector3 } from 'three';
import courtyardProps from '../../src/content/world/courtyard-props.json';
import { CAMERA_YAW_LIMIT, isWalkable, movePlayer, PLAYER_RADIUS, surfaceHeight, WORLD_PROP_COLLIDERS } from '../../src/world/movement';
import { CAMERA_CLEARANCE, COURTYARD_CAMERA_BOXES, followCameraPose, intersectCameraCylinder, settleFollowCamera, WORLD_CAMERA_CYLINDERS, WORLD_CAMERA_OBSTACLES } from '../../src/world/camera';

function expectUnobstructed(target: Vector3, camera: Vector3, label: string) {
  const direction = camera.clone().sub(target);
  const distance = direction.length();
  const ray = new Ray(target, direction.normalize());
  for (const obstacle of WORLD_CAMERA_OBSTACLES) {
    expect(obstacle.clone().expandByScalar(CAMERA_CLEARANCE - .005).containsPoint(camera), label).toBe(false);
    const hit = ray.intersectBox(obstacle, new Vector3());
    expect(!hit || hit.distanceTo(target) > distance, label).toBe(true);
  }
  for (const cylinder of WORLD_CAMERA_CYLINDERS) {
    const hit = intersectCameraCylinder(ray, cylinder, CAMERA_CLEARANCE - .005);
    expect(hit === null || hit > distance, `${label}: ${cylinder.id}`).toBe(true);
  }
}

describe('formal courtyard geometry, props and camera agreement', () => {
  it('includes the real low caisson and gate roof, not just the graybox upper slab', () => {
    expect(COURTYARD_CAMERA_BOXES.some(box => box.id.includes('caisson') && box.min[1] < 4.8 && box.max[1] > 4.7 && box.min[2] < -14)).toBe(true);
    expect(COURTYARD_CAMERA_BOXES.some(box => box.id.includes('gate-lintel') && box.min[2] < 2 && box.max[2] > 2 && box.min[1] > 3.5)).toBe(true);
  });

  it.each([-CAMERA_YAW_LIMIT, 0, CAMERA_YAW_LIMIT])('keeps the full gate-to-hall journey clear at yaw %s, including eased poses', yaw => {
    let position = followCameraPose(-12, 0, 9, yaw).position;
    for (let z = 9; z >= -22; z -= .08) {
      const point = { x: -12, z };
      expect(isWalkable(point)).toBe(true);
      const pose = followCameraPose(point.x, surfaceHeight(point), z, yaw);
      position.lerp(pose.position, .16);
      position.copy(settleFollowCamera(pose.target, position, pose.position));
      const label = `z=${z.toFixed(2)} yaw=${yaw}`;
      expectUnobstructed(pose.target, position, label);
      expect(position.distanceTo(pose.target), label).toBeGreaterThan(2.4);
      const camera = new PerspectiveCamera(49, 844 / 390, .1, 150);
      camera.position.copy(position); camera.lookAt(pose.target); camera.updateMatrixWorld();
      for (const height of [.12, 2.02]) {
        const ndc = new Vector3(point.x, surfaceHeight(point) + height, point.z).project(camera);
        expect(Math.abs(ndc.x), label).toBeLessThan(.98);
        expect(Math.abs(ndc.y), label).toBeLessThan(.98);
      }
    }
  });

  it('keeps a moving camera clear around both pillar rows while yaw is changing', () => {
    for (const x of [-16.85, -7.15]) {
      let position = followCameraPose(x, .28, -12, 0).position;
      for (let frame = 0; frame <= 180; frame++) {
        const point = { x, z: -12 - frame / 20 };
        expect(isWalkable(point), JSON.stringify(point)).toBe(true);
        const yaw = Math.sin(frame / 25) * CAMERA_YAW_LIMIT;
        const pose = followCameraPose(x, surfaceHeight(point), point.z, yaw);
        position.lerp(pose.position, .16);
        position.copy(settleFollowCamera(pose.target, position, pose.position));
        expectUnobstructed(pose.target, position, `column approach ${x},${point.z},yaw=${yaw}`);
      }
    }
  });

  it('intersects finite cylinder sides and caps while allowing a ray above a rock', () => {
    const cylinder = { id: 'fixture', x: 0, z: 0, radius: 1.5, minY: 0, maxY: 2.3 };
    expect(intersectCameraCylinder(new Ray(new Vector3(4, 1.8, 0), new Vector3(-1, 0, 0)), cylinder)).toBeCloseTo(2.5);
    expect(intersectCameraCylinder(new Ray(new Vector3(0, 5, 0), new Vector3(0, -1, 0)), cylinder)).toBeCloseTo(2.7);
    expect(intersectCameraCylinder(new Ray(new Vector3(4, 3, 0), new Vector3(-1, 0, 0)), cylinder)).toBeNull();
    // This valid diagonal point is inside the old expanded AABB, outside the real cylinder.
    const target = new Vector3(1.55, 1.8, 1.55);
    expect(intersectCameraCylinder(new Ray(target, new Vector3(1, 0, 1).normalize()), cylinder, CAMERA_CLEARANCE)).toBeNull();
  });

  it('preserves a clear nonzero camera around all eight sides of rocks and tree trunks', () => {
    let validSamples = 0;
    const isolatedTreeAngles = new Set<number>();
    for (const prop of courtyardProps.props.filter(prop => prop.kind === 'rock' || prop.kind === 'tree')) {
      for (let angle = 0; angle < 8; angle++) {
        const radians = angle * Math.PI / 4;
        const radius = prop.radius + PLAYER_RADIUS + .01;
        const point = { x: prop.x + Math.cos(radians) * radius, z: prop.z + Math.sin(radians) * radius };
        if (!isWalkable(point)) continue; // A neighboring rock/wall may legitimately exclude a side.
        validSamples++;
        if (prop.id === 'tree-court-outer-west') isolatedTreeAngles.add(angle);
        for (const yaw of [-CAMERA_YAW_LIMIT, -CAMERA_YAW_LIMIT / 2, 0, CAMERA_YAW_LIMIT / 2, CAMERA_YAW_LIMIT]) {
          const pose = followCameraPose(point.x, surfaceHeight(point), point.z, yaw);
          const label = `${prop.id} angle=${angle} yaw=${yaw}`;
          expect(pose.position.distanceTo(pose.target), label).toBeGreaterThan(3);
          expectUnobstructed(pose.target, pose.position, label);
        }
      }
    }
    expect(validSamples).toBeGreaterThan(80);
    expect(isolatedTreeAngles.size).toBe(8);
  });

  it('blocks every solid prop for a full crossing while leaving a just-clear circular route', () => {
    expect(WORLD_PROP_COLLIDERS.length).toBeGreaterThan(10);
    for (const collider of WORLD_PROP_COLLIDERS) {
      const circle = collider.circle!;
      expect(isWalkable({ x: circle.x, z: circle.z }, [collider]), collider.id).toBe(false);
      const gap = circle.radius + PLAYER_RADIUS + .08;
      const start = { x: circle.x - gap, z: circle.z };
      const finish = movePlayer(start, { x: gap * 2, z: 0 }, [collider]);
      expect(finish.x, collider.id).toBeLessThanOrEqual(circle.x - circle.radius - PLAYER_RADIUS + .0001);
      expect(isWalkable({ x: circle.x, z: circle.z + gap }, [collider]), collider.id).toBe(true);
    }
    for (const shrub of courtyardProps.props.filter(prop => prop.collidable === false)) {
      expect(WORLD_PROP_COLLIDERS.some(collider => collider.id === shrub.id)).toBe(false);
    }
  });
});
