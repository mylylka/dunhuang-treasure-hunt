import { afterAll, describe, expect, it } from 'vitest';
import { Box3, Ray, Vector3 } from 'three';
import { createGrayboxScene } from '../../src/world/geometry';
import { followCameraPose } from '../../src/world/camera';
import { CAMERA_YAW_LIMIT, isWalkable, PLAYER_RADIUS, WORLD_BOUNDS, WORLD_COLLIDERS } from '../../src/world/movement';
import { DUNE_CAMERA_CLEARANCE, WORLD_BOUNDARY_STONES, WORLD_CLIFFS, WORLD_DUNES } from '../../src/world/scenery';

const world = createGrayboxScene();
world.scene.updateMatrixWorld(true);
afterAll(() => world.dispose());

function renderedBounds(id: string): Box3 {
  const object = world.scene.getObjectByName(id);
  expect(object, `rendered mesh ${id}`).toBeDefined();
  return new Box3().setFromObject(object!, true);
}
function protectedArea(margin = 0): Box3 {
  return new Box3(new Vector3(WORLD_BOUNDS.minX - margin, -100, WORLD_BOUNDS.minZ - margin),
    new Vector3(WORLD_BOUNDS.maxX + margin, 100, WORLD_BOUNDS.maxZ + margin));
}

describe('scenery and walkable-ground agreement', () => {
  it('keeps complete rendered dune meshes outside the walking and follow-camera envelope', () => {
    expect(WORLD_DUNES).toHaveLength(18);
    for (const dune of WORLD_DUNES) {
      expect(renderedBounds(dune.id).intersectsBox(protectedArea(DUNE_CAMERA_CLEARANCE - .001)), dune.id).toBe(false);
    }
  });

  it('does not allow boundary rocks to cover the inside walking surface', () => {
    expect(WORLD_BOUNDARY_STONES.length).toBeGreaterThan(40);
    for (const rock of WORLD_BOUNDARY_STONES) {
      expect(renderedBounds(rock.id).intersectsBox(protectedArea()), rock.id).toBe(false);
    }
  });

  it('covers the real cliff mesh sides, rear and height with collision proxies', () => {
    for (const cliff of WORLD_CLIFFS) {
      const bounds = renderedBounds(cliff.id);
      expect(WORLD_COLLIDERS.some(box => box.minX <= bounds.min.x && box.maxX >= bounds.max.x
        && box.minZ <= bounds.min.z && box.maxZ >= bounds.max.z && box.height >= bounds.max.y), cliff.id).toBe(true);
    }
    expect(isWalkable({ x: -10, z: -35 })).toBe(false);
    expect(isWalkable({ x: 30, z: -35 })).toBe(false);
  });

  it('keeps follow-camera rays clear of dunes and boundary stones at the playable edges', () => {
    const obstacles = [...WORLD_DUNES, ...WORLD_BOUNDARY_STONES].map(item => renderedBounds(item.id).expandByScalar(.1));
    const points = [-30, -15, 0, 15, 30].flatMap(x => [
      { x, z: WORLD_BOUNDS.minZ + PLAYER_RADIUS }, { x, z: WORLD_BOUNDS.maxZ - PLAYER_RADIUS },
    ]).concat([-30, -15, 0, 15, 25].flatMap(z => [
      { x: WORLD_BOUNDS.minX + PLAYER_RADIUS, z }, { x: WORLD_BOUNDS.maxX - PLAYER_RADIUS, z },
    ]));
    for (const point of points.filter(point => isWalkable(point))) {
      for (const yaw of [-CAMERA_YAW_LIMIT, 0, CAMERA_YAW_LIMIT]) {
        const pose = followCameraPose(point.x, 0, point.z, yaw);
        const direction = pose.position.clone().sub(pose.target);
        const distance = direction.length();
        const ray = new Ray(pose.target, direction.normalize());
        for (const box of obstacles) {
          const hit = ray.intersectBox(box, new Vector3());
          expect(!hit || hit.distanceTo(pose.target) > distance, `camera at ${point.x},${point.z}, yaw=${yaw}`).toBe(true);
        }
      }
    }
  });
});
