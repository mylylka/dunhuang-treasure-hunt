import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createCaveLighting, caveSurfaceGain } from '../../src/world/cave-lighting-v008';
import { addMogaoExhibitCaveGuidance, addMogaoExhibitShaftLining, applyMogaoExhibitCaveFinish, fitMogaoExhibitFloorJoints, mogaoCaveStoneRole, MOGAO_EXHIBIT_STONE, type MogaoCavePart } from '../../src/world/mogao-exhibit-cave-finish';
import { settleUpperCamera } from '../../src/world/mogao-upper-camera';
import { MOGAO_EXHIBIT_UPPER_LAYOUT, MOGAO_UPPER_LAYOUT, upperFromWorld, upperToWorld } from '../../src/world/mogao-upper-navigation';
import { isUpperHallAGrayboxMarker, trimMogaoExhibitViewLintel } from '../../src/world/mogao-upper-presentation';

function readGlb(path: string) {
  const glb = readFileSync(new URL(`../../public/assets/world/${path}`, import.meta.url));
  return JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as {
    nodes: { name: string; mesh?: number }[];
    meshes: { primitives: { material?: number }[] }[];
    materials: { name: string; pbrMetallicRoughness?: { baseColorTexture?: unknown } }[];
  };
}

describe('v005 cave finish', () => {
  it('selects only the A hall placeholder and its engineering marks', () => {
    const glb = readGlb('mogao-upper/v002/upper.glb');
    expect(glb.nodes.map(node => node.name.replaceAll('.', '')).filter(isUpperHallAGrayboxMarker)).toEqual([
      'hall-a-bottom-label', 'hall-a-hall-label', 'hall-a-height-dimension',
      'hall-a-mural-panel', 'hall-a-panel-dimension', 'hall-a-panel-dimension001', 'hall-a-placeholder-label',
    ]);
    expect(isUpperHallAGrayboxMarker('hall-a-exit-label')).toBe(false);
  });

  it('selects the actual enclosed stone on the current desktop and mobile GLBs', () => {
    const cases = [
      ['entry', 'mogao/v007/entry.glb', { wall: 2, ceiling: 1, floor: 0 }],
      ['interior', 'mogao-upper/v002/interior.glb', { wall: 17, ceiling: 1, floor: 0 }],
      ['interior', 'mogao-exhibit/v001/interior-mobile.glb', { wall: 17, ceiling: 1, floor: 0 }],
      ['upper', 'mogao-upper/v002/upper.glb', { wall: 32, ceiling: 102, floor: 128 }],
    ] as const;
    for (const [part, path, expected] of cases) {
      const glb = readGlb(path);
      const counts = { wall: 0, ceiling: 0, floor: 0 };
      for (const node of glb.nodes) {
        if (node.mesh === undefined) continue;
        // GLTFLoader strips dots from names such as plain-door-jamb.001.
        const name = node.name.replaceAll('.', '');
        for (const { material } of glb.meshes[node.mesh].primitives) {
          if (material === undefined) continue;
          const source = glb.materials[material];
          const role = mogaoCaveStoneRole(part, name, source.name);
          if (!role) continue;
          expect(source.pbrMetallicRoughness?.baseColorTexture, name).toBeUndefined();
          counts[role]++;
        }
      }
      expect(counts, path).toEqual(expected);
    }
  });

  it('isolates the hall finish from display surfaces, other floors and source geometry', () => {
    const cave = new THREE.Group(), geometry = new THREE.BoxGeometry();
    const make = (part: MogaoCavePart, name: string, materialName: string) => {
      const material = new THREE.MeshStandardMaterial({ color: 0xab7557 });
      material.name = materialName;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      return { mesh, material, role: mogaoCaveStoneRole(part, name, materialName) };
    };
    const wall = make('upper', 'a-view-north-wall', 'graybox-warm-plaster');
    const ceiling = make('upper', 'b-vault-ceiling-west-0', 'graybox-warm-plaster');
    const floor = make('upper', 'b-floor', 'graybox-warm-stone');
    const stair = make('upper', 'flight-1-tread-0', 'graybox-wood-tread');
    const label = make('upper', 'hall-b-height-dimension', 'graybox-edge');
    const protectedFloor = make('interior', 'earth-floor', 'floor');
    cave.add(wall.mesh, ceiling.mesh, floor.mesh, stair.mesh, label.mesh, protectedFloor.mesh);
    const finish = applyMogaoExhibitCaveFinish(cave, 'upper');
    expect(finish.counts).toEqual({ wall: 1, ceiling: 1, floor: 2 });
    const lighting = createCaveLighting(true, () => 1);
    lighting.addCave(cave, { colorsAtFullAdaptation: finish.materials });
    lighting.update(new THREE.Vector3(), 0, true);
    for (const sample of [wall, ceiling, floor, stair, label, protectedFloor]) {
      expect(sample.mesh.geometry).toBe(geometry);
      if (sample.role) {
        expect(sample.mesh.material).not.toBe(sample.material);
        if (sample.role === 'floor') expect(sample.mesh.material.side).toBe(THREE.FrontSide);
        const expected = MOGAO_EXHIBIT_STONE[sample.role];
        sample.mesh.material.color.toArray().forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));
      } else expect(sample.mesh.material).toBe(sample.material);
      sample.mesh.material.dispose();
    }
    geometry.dispose();
  });

  it('covers the ground rock cut and keeps exactly one top face in both portal footprints', () => {
    const cave = new THREE.Group(), material = new THREE.MeshStandardMaterial();
    const entry = MOGAO_EXHIBIT_UPPER_LAYOUT.surfaces.find(surface => surface.id === 'stair-entry')!;
    const buildSlab = ({ id, min, max }: { id: string; min: readonly number[]; max: readonly number[] }) => {
      const lo = new THREE.Vector3(min[0], min[1], min[2]), hi = new THREE.Vector3(max[0], max[1], max[2]);
      const size = hi.clone().sub(lo), center = lo.clone().lerp(hi, .5);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      mesh.name = id;
      mesh.position.copy(center);
      cave.add(mesh);
      return mesh;
    };
    const names = /^(?:[ab]-(?:view-(?:link-)?)?floor|slab-landing-[024])$/;
    const slabs = MOGAO_EXHIBIT_UPPER_LAYOUT.solids.filter(solid => names.test(solid.id));
    for (const slab of slabs) buildSlab(slab);
    buildSlab({
      id: 'stair-entry-floor',
      min: [entry.minX, entry.y - .26, entry.minZ],
      max: [entry.maxX, entry.y, entry.maxZ],
    });
    fitMogaoExhibitFloorJoints(cave, true);
    cave.updateMatrixWorld(true);
    function down(x: number, y: number, z: number) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, y + .05, z), new THREE.Vector3(0, -1, 0), 0, .1);
      return [...new Set(ray.intersectObjects(cave.children).map(hit => hit.object.name))];
    }
    for (const [x, z] of [[13.995, -23], [14.2, -24.205], [14.2, -21.205], [15.5, -24.4], [15.7, -23],
      [17.9, -29.4], [21.93, -23], [16.9, -21.6], [15.5, -21.6]]) {
      expect(down(x, entry.y, z)).toEqual(['slab-landing-0']);
    }
    expect(down(13.8, entry.y, -23)).toEqual(['slab-landing-0']);
    expect(down(13.52, entry.y, -23)).toHaveLength(0);
    expect(down(14.2, entry.y, -24.3)).toHaveLength(0);
    expect(down(14.2, entry.y, -21.18)).toHaveLength(0);
    expect(down(21.827, 8.11, -22.557)).toEqual(['slab-landing-2-east-return']);
    expect(down(21.716, 19.58, -22.893)).toEqual(['slab-landing-4-east-return']);
    for (const hall of ['a', 'b']) {
      const original = slabs.filter(slab => slab.id.startsWith(`${hall}-`));
      const floorY = original[0].max[1];
      for (let x = 9.67; x < 16; x += .07) for (let z = -14.18; z < -10.9; z += .053) {
        if (original.some(({ min, max }) => [min[0], max[0]].some(edge => Math.abs(x - edge) < .0001)
          || [min[2], max[2]].some(edge => Math.abs(z - edge) < .0001))) continue;
        const covered = original.some(({ min, max }) => x > min[0] && x < max[0] && z > min[2] && z < max[2]);
        expect(down(x, floorY, z)).toHaveLength(Number(covered));
      }
    }
    for (const geometry of new Set(cave.children.map(object => (object as THREE.Mesh).geometry))) geometry.dispose();
    material.dispose();
  });

  it('retains the accepted wall-art adaptation and does not dim entrance stairs or screen', () => {
    const cave = new THREE.Group(), entry = new THREE.Group();
    const geometry = new THREE.BoxGeometry(), source = new THREE.Texture();
    const narrative = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, map: source }));
    narrative.name = 'deer-door-head'; narrative.material.name = 'deer';
    const steps = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x886655 }));
    steps.name = 'central-ceremonial-stairs'; steps.material.name = 'stone-steps';
    const entryReturn = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    entryReturn.name = 'passage-return-v007--1'; entryReturn.material.name = 'passage-shadow';
    cave.add(narrative); entry.add(steps, entryReturn);
    const full = new THREE.Vector3(1, 0, 0);
    const lighting = createCaveLighting(true, x => x);
    const originalSteps = steps.material.color.clone();
    const finish = applyMogaoExhibitCaveFinish(entry, 'entry');
    lighting.addCave(cave);
    lighting.addCave(entry, { colorsAtFullAdaptation: finish.materials, finishOnly: true });
    lighting.update(new THREE.Vector3(), 0, true);
    expect(steps.material.color.equals(originalSteps)).toBe(true);
    expect(entryReturn.material.color.r).toBeLessThan(.01);
    lighting.update(full, 0, true);
    expect(entryReturn.material.color.r).toBeCloseTo(.133, 6);
    expect(narrative.material.map).toBe(source);
    expect(narrative.material.color.r).toBeCloseTo(.53 * caveSurfaceGain(1), 6);
    expect(steps.material.color.equals(originalSteps)).toBe(true);
    for (const mesh of [narrative, steps, entryReturn]) mesh.material.dispose();
    geometry.dispose();
    source.dispose();
  });

  it('replaces the upper ambient fixtures without adding to the accepted local light count', () => {
    const root = new THREE.Group();
    addMogaoExhibitCaveGuidance(root);
    expect(root.children).toHaveLength(5);
    expect(root.getObjectByName('mogao-exhibit-guidance-hall-b')).toMatchObject({ intensity: 14, distance: 11, castShadow: false });
    expect(root.getObjectByName('mogao-exhibit-guidance-main-chamber')).toMatchObject({ intensity: 950, distance: 44 });
  });

  it('covers the deferred cut rock while preserving the three open approaches', () => {
    const root = new THREE.Group();
    const lining = addMogaoExhibitShaftLining(root);
    root.updateMatrixWorld(true);
    const hit = (origin: [number, number, number], direction: [number, number, number], far: number) =>
      new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction), 0, far).intersectObject(lining)[0]?.point;
    // The ground aperture stays open all the way to the opposite rock wall.
    expect(hit([13, 1.7, -23], [1, 0, 0], 10)?.x).toBeCloseTo(21.688, 4);
    expect(hit([17.1, 1.7, -23], [0, 0, 1], 3)?.z).toBeCloseTo(-21.462, 4);
    expect(hit([17.1, 9.76, -23], [0, 0, 1], 4)).toBeUndefined();
    expect(hit([17.1, 21.23, -23], [0, 0, 1], 4)).toBeUndefined();
    expect(hit([18.7, 22.74, -20], [0, 0, -1], 3)?.z).toBeCloseTo(-21.812, 4);
    expect(hit([23.1, 1.7, -23], [-1, 0, 0], 2)).toBeUndefined();
    expect(lining.castShadow).toBe(false);
    expect(lining.geometry.index?.count).toBe(96);
    lining.geometry.dispose();
    lining.material.dispose();
  });

  it('lines the lower east face at one depth and closes the west joint beside the A door', () => {
    const lining = addMogaoExhibitShaftLining(new THREE.Group());
    const hit = (x: number, y: number, z: number, direction: 1 | -1) =>
      new THREE.Raycaster(new THREE.Vector3(x, y, z), new THREE.Vector3(direction, 0, 0), 0, 3)
        .intersectObject(lining)[0]?.point.x;
    // Both sides of the visible step at z=-24.2 and the floor contact share a plane.
    for (const z of [-25, -24.21, -24.19, -22]) for (const y of [.024, 1.7, 4]) {
      expect(hit(20, y, z, 1)).toBeCloseTo(21.688, 4);
    }
    // Follow the jamb almost to the floor and to its head. The 5 cm gap
    // between the cut and the pier is behind the same face at every height.
    for (const z of [-24.19, -23, -22.16, -22.12, -22.095]) for (const y of [8.12, 9.76, 14.9]) {
      expect(hit(17, y, z, -1)).toBeCloseTo(15.712, 4);
    }
    expect(hit(17, 9.76, -22.05, -1)).toBeUndefined();
    lining.geometry.dispose();
    lining.material.dispose();
  });

  it('replaces the stepped east wall with one continuous lower face while leaving the upper end in place', () => {
    const cave = new THREE.Group();
    const material = new THREE.MeshStandardMaterial();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(.3, 23, 10.89043), material);
    wall.name = 'stair-east-shell';
    wall.position.set(21.85, 11.2, -29.645215);
    cave.add(wall);
    const lining = addMogaoExhibitShaftLining(cave);
    cave.updateMatrixWorld(true);
    const hit = (y: number, z: number) => new THREE.Raycaster(
      new THREE.Vector3(20, y, z), new THREE.Vector3(1, 0, 0), 0, 3,
    ).intersectObject(wall)[0]?.point.x;
    for (const z of [-25, -24.21, -24.19, -22]) for (const y of [.024, 1.7, 4]) {
      expect(hit(y, z)).toBeCloseTo(21.7, 5);
    }
    expect(hit(9.76, -25)).toBeCloseTo(21.7, 5);
    expect(hit(9.76, -23)).toBeUndefined();
    expect(hit(.1, -21.24)).toBeCloseTo(21.7, 5);
    expect(hit(.1, -21.16)).toBeUndefined();
    expect(wall.material).toBe(material);
    expect(lining.userData.faces).not.toContain('shaft-cut-rock-0-2-0');
    const backing = cave.getObjectByName('mogao-exhibit-stair-east-shadow-backing') as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
    expect(backing.castShadow).toBe(true);
    expect(backing.material).toMatchObject({ colorWrite: false, depthWrite: false });
    const backingBounds = new THREE.Box3().setFromObject(backing);
    expect(backingBounds.min.x).toBeGreaterThan(21.7);
    expect(backingBounds.min.y).toBeLessThan(-.3);
    backing.geometry.dispose();
    backing.material.dispose();
    wall.geometry.dispose();
    material.dispose();
    lining.geometry.dispose();
    lining.material.dispose();
  });

  it('retains the viewing passage ceiling height and trims only the visible B lintel and its camera bounds', () => {
    const group = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, .2, 3.55), new THREE.MeshStandardMaterial());
    roof.name = 'b-view-ceiling';
    roof.position.set(14.85, 22.78, -12.475);
    group.add(roof);
    trimMogaoExhibitViewLintel(group);
    const inside = new THREE.Box3().setFromObject(roof);
    const lip = group.getObjectByName('b-view-ceiling-exhibit-lip') as THREE.Mesh;
    const outside = new THREE.Box3().setFromObject(lip);
    expect(lip.material).toBe(roof.material);
    expect(inside.min.y - 19.58).toBeCloseTo(3.1, 5);
    expect(inside.max.x).toBeCloseTo(14.8, 5);
    expect(outside.max.x - 14.8).toBeCloseTo(.14, 5);
    expect(outside.max.y - outside.min.y).toBeCloseTo(.10, 5);
    const world = (x: number, y: number) => {
      const point = upperToWorld({ x, y, z: -13.4 });
      return new THREE.Vector3(point.x, point.y, point.z);
    };
    const target = world(16.8, 22.63), desired = world(15.27, 22.63);
    expect(upperFromWorld(settleUpperCamera(target, desired)).x).toBeGreaterThan(15.92);
    expect(upperFromWorld(settleUpperCamera(target, desired, false, true)).x).toBeCloseTo(15.27, 5);
    expect(upperFromWorld(settleUpperCamera(world(17, 21.23), world(13, 21.23), true, true)).x).toBeGreaterThan(14.8);
    roof.geometry.dispose();
    roof.material.dispose();
  });
});
