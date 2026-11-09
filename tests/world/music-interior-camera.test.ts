import { readFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { musicInteriorFollowPose, settleMusicInteriorCamera } from '../../src/world/music-interior-camera';
import { MUSIC_INTERIOR_LAYOUT, musicInteriorFromWorld, musicInteriorToWorld, musicInteriorValid } from '../../src/world/music-interior-navigation';
import { MUSIC_COURTYARD_TREE } from '../../src/content/world/music-courtyard-tree-v001';
import { TERRAIN_REGIONS } from '../../src/content/world/terrain-layout-v001';
import { zoomFollowPose } from '../../src/world/follow-camera-zoom';

const world = (x: number, y: number, z: number) => {
  const p = musicInteriorToWorld({ x, y, z });
  return new THREE.Vector3(p.x, p.y, p.z);
};
const local = (p: THREE.Vector3) => {
  const q = musicInteriorFromWorld(p);
  return new THREE.Vector3(q.x, q.y, q.z);
};
const yaw = TERRAIN_REGIONS.music.yaw;
const flight = MUSIC_INTERIOR_LAYOUT.surfaces.find(surface => surface.id === 'music-stair')!;
const stairHeight = (x: number) => flight.y + (flight.endY! - flight.y) * (x - flight.minX) / (flight.maxX - flight.minX);

// Read the delivered GLB triangles independently of navigation/camera boxes.
// Texture loading and WebGL are unnecessary for checking real wall apertures.
function deliveredBuilding() {
  const bytes = readFileSync(new URL(`../../public/assets/world/${MUSIC_INTERIOR_LAYOUT.assets.building}`, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binary = bytes.subarray(28 + jsonLength);
  function values(index: number) {
    const accessor = gltf.accessors[index], view = gltf.bufferViews[accessor.bufferView];
    const dimensions = accessor.type === 'VEC3' ? 3 : 1;
    const size = accessor.componentType === 5123 ? 2 : 4;
    const stride = view.byteStride ?? dimensions * size;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const result: number[] = [];
    for (let i = 0; i < accessor.count; i++) for (let j = 0; j < dimensions; j++) {
      const offset = start + i * stride + j * size;
      result.push(accessor.componentType === 5126 ? binary.readFloatLE(offset)
        : accessor.componentType === 5123 ? binary.readUInt16LE(offset) : binary.readUInt32LE(offset));
    }
    return result;
  }
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const nodes: THREE.Object3D[] = gltf.nodes.map((definition: any) => {
    const node = new THREE.Group();
    if (definition.matrix) node.applyMatrix4(new THREE.Matrix4().fromArray(definition.matrix));
    else {
      if (definition.translation) node.position.fromArray(definition.translation);
      if (definition.rotation) node.quaternion.fromArray(definition.rotation);
      if (definition.scale) node.scale.fromArray(definition.scale);
    }
    if (definition.mesh !== undefined) for (const primitive of gltf.meshes[definition.mesh].primitives) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(values(primitive.attributes.POSITION), 3));
      if (primitive.indices !== undefined) geometry.setIndex(values(primitive.indices));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = definition.name;
      node.add(mesh);
    }
    return node;
  });
  gltf.nodes.forEach((definition: any, index: number) => {
    for (const child of definition.children ?? []) nodes[index].add(nodes[child]);
  });
  const root = new THREE.Group();
  root.position.set(46, 0, -9);
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) root.add(nodes[index]);
  root.updateMatrixWorld(true);
  return { root, dispose() {
    root.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    material.dispose();
  } };
}
const building = deliveredBuilding();
afterAll(() => building.dispose());

function expectClear(target: THREE.Vector3, eye: THREE.Vector3, label: string) {
  const a = local(target), b = local(eye), length = a.distanceTo(b);
  expect(b.toArray().every(Number.isFinite), label).toBe(true);
  expect(length, label).toBeGreaterThan(.05);
  const ray = new THREE.Raycaster(a, b.clone().sub(a).normalize(), .001, length - 1e-4);
  const hit = ray.intersectObject(building.root, true)[0];
  expect(hit?.object.name, label).toBeUndefined();
}

describe('music interior camera against delivered architecture', () => {
  it('delivers vertical open slats in the front fixed panel and opened door instead of opaque front walls', () => {
    for (const sample of [
      { label: 'fixed vertical rod', origin: new THREE.Vector3(34.9585, 4.2, -21.4), direction: new THREE.Vector3(0, 0, -1), hit: true },
      { label: 'fixed open slot', origin: new THREE.Vector3(35.04, 4.2, -21.4), direction: new THREE.Vector3(0, 0, -1), hit: false },
      { label: 'door vertical rod', origin: new THREE.Vector3(36.2, 4.2, -21.535), direction: new THREE.Vector3(1, 0, 0), hit: true },
      { label: 'door open slot', origin: new THREE.Vector3(36.2, 4.2, -21.4525), direction: new THREE.Vector3(1, 0, 0), hit: false },
    ]) {
      const hits = new THREE.Raycaster(sample.origin, sample.direction, .001, .7).intersectObject(building.root, true);
      expect(hits.length > 0, sample.label).toBe(sample.hit);
    }
  });

  it('delivers the solid side return and does not move the camera through the opened bar doors', () => {
    for (const z of [-21.5, -20.8, -19.3]) for (const y of [2.3, 3.35, 6.7]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(43.6, y, z), new THREE.Vector3(1, 0, 0), .001, 2);
      expect(ray.intersectObject(building.root, true).some(hit => hit.point.x >= 44.3 && hit.point.x <= 45.1), `closed return ${z},${y}`).toBe(true);
    }
    for (const sample of [
      { target: world(35.6, 3.35, -20), desired: world(38, 3.35, -20), maximum: 36.255 },
      { target: world(44, 3.35, -20), desired: world(41, 3.35, -20), minimum: 42.985 },
    ]) {
      const eye = settleMusicInteriorCamera(sample.target, sample.desired), p = local(eye);
      if (sample.minimum !== undefined) expect(p.x).toBeGreaterThanOrEqual(sample.minimum - 1e-4);
      if (sample.maximum !== undefined) expect(p.x).toBeLessThanOrEqual(sample.maximum + 1e-4);
      expectClear(sample.target, eye, 'opened bar door');
    }
  });

  it('rests all eighteen original front-gallery rods on the real floor finish with no support gap', () => {
    const railing: THREE.Object3D[] = [], support: THREE.Object3D[] = [];
    building.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      (object.name.includes('porch--wood-light') ? railing : support).push(object);
    });
    expect(railing.length).toBeGreaterThan(0);
    for (let index = 0; index < 18; index++) {
      const x = 35.125 + .52925 * index, z = -17.69;
      // Origin lies below the former floating rod bottoms (8.325). A floor-only
      // hit cannot satisfy this ray, which is restricted to actual railing mesh.
      const rod = new THREE.Raycaster(new THREE.Vector3(x, 8.20, z), new THREE.Vector3(0, -1, 0), .001, .4).intersectObjects(railing)[0];
      expect(rod, `front rod ${index}`).toBeDefined(); expect(Math.abs(rod.point.y - 7.915375)).toBeLessThan(.001);
      const floor = new THREE.Raycaster(new THREE.Vector3(x, 7.925375, z), new THREE.Vector3(0, -1, 0), .001, .05).intersectObjects(support)[0];
      expect(floor, `front support ${index}`).toBeDefined(); expect(Math.abs(floor.point.y - 7.915375)).toBeLessThan(.001);
    }
  });

  it('stops a low camera at platform and original gallery rails while allowing a view above the platform rails', () => {
    for (const sample of [
      { target: world(44.8, 8.5, -25), desired: world(49, 8.5, -25), axis: 'x' as const, limit: 45.96 },
      { target: world(45.3, 8.5, -24), desired: world(45.3, 8.5, -19), axis: 'z' as const, limit: -22.16 },
      { target: world(43.4, 8.5, -20.6), desired: world(46, 8.5, -20.6), axis: 'x' as const, limit: 44.4701 },
      { target: world(38.5, 8.8, -20.5), desired: world(38.5, 8.8, -16.5), axis: 'z' as const, limit: -17.97 },
    ]) {
      const eye = settleMusicInteriorCamera(sample.target, sample.desired);
      expect(local(eye)[sample.axis]).toBeLessThanOrEqual(sample.limit + 1e-5);
      expect(eye.distanceTo(sample.desired)).toBeGreaterThan(1);
      expectClear(sample.target, eye, `new platform rail ${sample.axis}`);
    }
    const target = world(44.8, 9.5, -25), desired = world(49, 9.5, -25);
    expect(settleMusicInteriorCamera(target, desired).distanceTo(desired)).toBeLessThan(1e-6);
    expectClear(target, desired, 'above the platform rail');
  });

  it('delivers a continuous handrail and floor-mounted posts along the gallery step in the platform outline', () => {
    const guardrails: THREE.Object3D[] = [], floor: THREE.Object3D[] = [];
    building.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      if (object.name.startsWith('music-interior-guardrail--')) guardrails.push(object);
      if (object.name.startsWith('music-interior-floor--')) floor.push(object);
    });
    const rail = MUSIC_INTERIOR_LAYOUT.guardrails.find(item => item.id === 'music-gallery-east-guardrail')!;
    const [left, y, start] = rail.min, [right, top, end] = rail.max;
    const x = (left + right) / 2;
    const hit = (origin: THREE.Vector3, direction: THREE.Vector3, objects: THREE.Object3D[]) =>
      new THREE.Raycaster(origin, direction, .001, .2).intersectObjects(objects)[0]?.point;

    for (let z = start + .01; z < end; z += .08) {
      expect(hit(new THREE.Vector3(left - .05, top - .03, z), new THREE.Vector3(1, 0, 0), guardrails)?.x).toBeCloseTo(left, 4);
    }
    for (let index = 0; index <= 6; index++) {
      const z = start + .045 + index * (end - start - .09) / 6;
      const down = new THREE.Vector3(0, -1, 0);
      expect(hit(new THREE.Vector3(x, y + .06, z), down, guardrails)?.y).toBeCloseTo(y, 4);
      expect(hit(new THREE.Vector3(x, y + .015, z), down, floor)?.y).toBeCloseTo(y, 4);
    }
  });

  it('keeps the delivered upper floor seam continuous without a raised slab edge', () => {
    let maximumHeightError = 0;
    for (const x of [35.7, 38.5, 40.8, 43.4]) for (const z of [-22.1, -21.95, -21.875, -21.8, -21.7]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 8.5, z), new THREE.Vector3(0, -1, 0), .001, 1);
      const hit = ray.intersectObject(building.root, true)[0];
      expect(hit, `floor seam ${x},${z}`).toBeDefined();
      const error = Math.abs(hit.point.y - 7.915375);
      maximumHeightError = Math.max(maximumHeightError, error);
      expect(error, `floor seam ${x},${z}`).toBeLessThan(.001);
    }
    console.info('Delivered floor seam: 20 samples, maximum height error (m):', maximumHeightError);
  });

  it('looks through the full-height entry and still stops at its fixed vertical panels and vertical-bar doors', () => {
    for (const door of [
      { x: 37.7, y: 3.35, startZ: -23, endZ: -19.4, wallX: 35.7 },
      { x: 39.5, y: 6.7, startZ: -23, endZ: -19.4, wallX: 43.7 },
      { x: 41.7, y: 3.35, startZ: -23, endZ: -19.4, wallX: 43.7 },
    ]) {
      const target = world(door.x, door.y, door.startZ), desired = world(door.x, door.y, door.endZ);
      const eye = settleMusicInteriorCamera(target, desired);
      expect(eye.distanceTo(desired)).toBeLessThan(1e-6);
      expectClear(target, eye, `open doorway ${door.x}`);
      const wallTarget = world(door.wallX, door.y, door.startZ), wallDesired = world(door.wallX, door.y, door.endZ);
      const wallEye = settleMusicInteriorCamera(wallTarget, wallDesired);
      expect(wallEye.distanceTo(wallDesired)).toBeGreaterThan(1);
      expectClear(wallTarget, wallEye, `solid jamb ${door.wallX}`);
    }
  });

  it('removes the former upper wall and windows across the open gallery connection', () => {
    for (const x of [35.7, 38.5, 40.8, 43.4]) {
      const target = world(x, 9.5, -23.3), desired = world(x, 9.5, -20.8);
      const eye = settleMusicInteriorCamera(target, desired);
      expect(eye.distanceTo(desired), `former upper wall x=${x}`).toBeLessThan(1e-6);
      expectClear(target, eye, `full-width upper connection x=${x}`);
    }
  });

  it('keeps the marked middle opening clear on both floors and retains the end pillars', () => {
    const center = world(39.6925, 1.8, -17.8);
    expect(musicInteriorValid({ position: center, surfaceId: 'music-floor-1' })).toBe(true);
    const near = world(39.6925, 3.35, -19.4), far = world(39.6925, 3.35, -16.5);
    const eye = settleMusicInteriorCamera(near, far);
    expect(eye.distanceTo(far)).toBeLessThan(1e-6);
    expectClear(near, eye, 'removed lower column');
    const upperNear = world(39.6925, 10.65, -19.4), upperFar = world(39.6925, 10.65, -16.5);
    const upperEye = settleMusicInteriorCamera(upperNear, upperFar);
    expect(upperEye.distanceTo(upperFar)).toBeLessThan(1e-6);
    expectClear(upperNear, upperEye, 'removed upper column');
    const rayHits = (a: THREE.Vector3, b: THREE.Vector3) => {
      const from = local(a), to = local(b);
      return new THREE.Raycaster(from, to.clone().sub(from).normalize(), .001, from.distanceTo(to)-.001).intersectObject(building.root,true);
    };
    const rayAt = (a: THREE.Vector3, b: THREE.Vector3) => rayHits(a,b)[0];
    const sideNear = world(44.3325, 3.35, -19.4), sideFar = world(44.3325, 3.35, -16.5);
    expect(settleMusicInteriorCamera(sideNear, sideFar).distanceTo(sideFar)).toBeGreaterThan(1);
    expect(rayAt(sideNear, sideFar)?.object.name).toContain('porch--wood');
    const otherNear = world(34.98, 3.35, -19.4), otherFar = world(34.98, 3.35, -16.5);
    expect(rayHits(otherNear, otherFar).some(hit => hit.object.name.includes('porch--wood'))).toBe(true);
    for (const x of [35.15, 44.3325]) {
      const start = world(x, 10.65, -19.4), end = world(x, 10.65, -16.5);
      expect(rayHits(start, end).some(hit => hit.object.name.includes('porch--wood'))).toBe(true);
      expect(settleMusicInteriorCamera(start, end).distanceTo(end)).toBeGreaterThan(1);
    }
    const player = world(39.5, 1.8, -19.4);
    const pose = musicInteriorFollowPose(player.x, player.y, player.z, yaw, 'music-floor-1');
    expect(pose.position.distanceTo(pose.target)).toBeGreaterThan(2.5);
    expectClear(pose.target, pose.position, 'spawn camera after column removal');
  });

  it('prevents maximum courtyard zoom from entering the tall tree trunk above its low root proxy', () => {
    const player = world(46, 0, -8);
    expect(musicInteriorValid({ position: player, surfaceId: 'music-courtyard' })).toBe(true);
    const pose = zoomFollowPose(musicInteriorFollowPose(player.x, player.y, player.z, yaw - Math.PI / 2, 'music-courtyard'), 10);
    const trunk = new THREE.Box3(new THREE.Vector3(...MUSIC_COURTYARD_TREE.trunkBounds.min), new THREE.Vector3(...MUSIC_COURTYARD_TREE.trunkBounds.max));
    expect(trunk.containsPoint(local(pose.position)), 'regression fixture reaches the real trunk').toBe(true);
    const eye = settleMusicInteriorCamera(pose.target, pose.position);
    expect(trunk.containsPoint(local(eye))).toBe(false);
    const a = local(pose.target), b = local(eye);
    const hit = new THREE.Ray(a, b.clone().sub(a).normalize()).intersectBox(trunk, new THREE.Vector3());
    expect(hit === null || hit.distanceTo(a) > b.distanceTo(a)).toBe(true);
    expectClear(pose.target, eye, 'courtyard tree retraction');
  });

  it('keeps ascending and descending stair cameras above the actual treads, including the collision pass after easing', () => {
    for (const direction of [-1, 1]) {
      let previous: THREE.Vector3 | undefined;
      for (const fraction of direction === 1 ? [.1, .25, .5, .75, .9] : [.9, .75, .5, .25, .1]) {
        const x = flight.maxX - (flight.maxX - flight.minX) * fraction;
        const player = world(x, stairHeight(x), -30.225);
        expect(musicInteriorValid({ position: player, surfaceId: 'music-stair' })).toBe(true);
        const pose = musicInteriorFollowPose(player.x, player.y, player.z, yaw + direction * Math.PI / 2, 'music-stair', previous);
        expect(pose.target.y - player.y).toBeCloseTo(1.3);
        const desired = settleMusicInteriorCamera(pose.target, pose.position);
        expect(desired.distanceTo(pose.target)).toBeGreaterThan(1.35);
        expectClear(pose.target, desired, `stair ${direction}/${fraction}`);
        const eye = local(desired);
        if (eye.x >= flight.minX && eye.x <= flight.maxX) expect(eye.y - stairHeight(eye.x), `stair shoulder height ${direction}/${fraction}`).toBeGreaterThan(1.1);
        const easedInput = previous ? previous.clone().lerp(desired, .4) : desired;
        const eased = settleMusicInteriorCamera(pose.target, easedInput);
        expect(eased.distanceTo(pose.target)).toBeLessThanOrEqual(easedInput.distanceTo(pose.target) + 1e-6);
        expectClear(pose.target, eased, `eased stair ${direction}/${fraction}`);
        previous = desired;
      }
    }
  });

  it('does not drop the requested camera when its uphill shoulder crosses onto the top platform', () => {
    const poses = [flight.minX + 2.81, flight.minX + 2.79].map(x => {
      const player = world(x, stairHeight(x), -30.225);
      expect(musicInteriorValid({ position: player, surfaceId: 'music-stair' })).toBe(true);
      const pose = musicInteriorFollowPose(player.x, player.y, player.z, yaw - Math.PI / 2, 'music-stair');
      return { ...pose, position: settleMusicInteriorCamera(pose.target, pose.position) };
    });
    expect(poses[0].target.distanceTo(poses[1].target)).toBeLessThan(.03);
    expect(poses[0].position.distanceTo(poses[1].position), 'a 2 cm player step must not request a metre-scale camera drop').toBeLessThan(.25);
    for (const pose of poses) expectClear(pose.target, pose.position, 'top landing shoulder');
  });

  it('keeps cameras on their side of the new slab and below the actual timber ceiling', () => {
    const cases = [
      { label: 'under the new slab', target: world(40, 3.35, -24.8), desired: world(40, 10, -24.8), limit: 7.426, below: true },
      { label: 'above the new slab', target: world(40, 9.465375, -24.8), desired: world(40, 5, -24.8), limit: 7.915375, below: false },
      { label: 'below timber ceiling', target: world(40, 9.465375, -24.8), desired: world(40, 16, -24.8), limit: 13.5305, below: true },
    ];
    for (const sample of cases) {
      const eye = settleMusicInteriorCamera(sample.target, sample.desired);
      if (sample.below) expect(local(eye).y, sample.label).toBeLessThan(sample.limit - .22);
      else expect(local(eye).y, sample.label).toBeGreaterThan(sample.limit + .22);
      expectClear(sample.target, eye, sample.label);
    }
  });
});
