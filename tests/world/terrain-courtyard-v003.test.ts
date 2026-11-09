import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyTerrainCourtyardExpansion } from '../../src/world/terrain-courtyard-v003';
import { TERRAIN_COURTYARD_CAMERA_BOXES } from '../../src/world/terrain-camera-v001';
import { COURTYARD_CAMERA_BOXES } from '../../src/world/camera';
import { TERRAIN_PLAYER_COLLIDERS, isTerrainWalkable, moveTerrainPlayer, terrainHeight, terrainSurfaceHeight, toTerrainPoint } from '../../src/world/terrain-rules-v001';

/** Load the real GLB's positions, node transforms and semantic groups without
 * a browser/image decoder. Materials are placeholders; geometry is not a mock.
 */
function courtyardGeometry(version = 'v002') {
  const bytes = readFileSync(new URL(`../../public/assets/world/courtyard/${version}/courtyard.glb`, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12), json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const binary = bytes.subarray(28 + jsonLength);
  const root = new THREE.Group(), materials = json.materials.map(() => new THREE.MeshBasicMaterial());
  const nodes: THREE.Object3D[] = json.nodes.map((node: any) => {
    const object = new THREE.Group(); object.name = node.name; object.userData = { ...node.extras };
    if (node.matrix) object.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
    else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
      const accessor = json.accessors[primitive.attributes.POSITION], view = json.bufferViews[accessor.bufferView];
      const data = new Float32Array(accessor.count * 3), start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      for (let i = 0; i < accessor.count; i++) for (let axis = 0; axis < 3; axis++) data[i * 3 + axis] = binary.readFloatLE(start + i * (view.byteStride ?? 12) + axis * 4);
      const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(data, 3));
      object.add(new THREE.Mesh(geometry, materials[primitive.material]));
    }
    return object;
  });
  json.nodes.forEach((node: any, index: number) => node.children?.forEach((child: number) => nodes[index].add(nodes[child])));
  for (const index of json.scenes[json.scene ?? 0].nodes) root.add(nodes[index]);
  root.position.set(-12, 0, 2); root.updateMatrixWorld(true);
  return root;
}
function box(root: THREE.Object3D, name: string) { return new THREE.Box3().setFromObject(root.getObjectByName(name)!, true); }
function release(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
  materials.forEach(material => material.dispose());
}

describe('terrain-only courtyard expansion v003', () => {
  it('joins the real v007 corner trims without overlapping their coplanar faces', () => {
    const root = courtyardGeometry('v007');
    const before = new Map<string, THREE.Box3>();
    for (const kind of ['coping', 'plinth']) for (const side of ['east', 'west']) {
      const name = `courtyard-v005-side-${kind}-${side}`;
      before.set(name, box(root, name));
    }
    applyTerrainCourtyardExpansion(root);
    for (const kind of ['coping', 'plinth']) for (const side of ['east', 'west']) {
      const name = `courtyard-v005-side-${kind}-${side}`, after = box(root, name);
      const wing = box(root, `courtyard-v005-wing-${kind}-${side}`), original = before.get(name)!;
      expect(after.max.z, name).toBeCloseTo(wing.min.z, 5);
      expect(after.min.z, name).toBeCloseTo(original.min.z, 5);
      expect(after.min.x, name).toBeCloseTo(original.min.x, 5);
      expect(after.max.x, name).toBeCloseTo(original.max.x, 5);
      expect(after.min.y, name).toBeCloseTo(original.min.y, 5);
      expect(after.max.y, name).toBeCloseTo(original.max.y, 5);
    }
    release(root);
  });
  it('extends the actual outer walls exactly two metres, keeps the hall/gate and preserves square art', () => {
    const root = courtyardGeometry(), original = new Map<string, THREE.Box3>();
    root.traverse(object => { if (object.userData.semanticGroup) original.set(object.name, box(root, object.name)); });
    const report = applyTerrainCourtyardExpansion(root);
    expect(report.addedWidth).toBe(4); expect(report.pavingMeshes).toBeGreaterThan(0);
    for (const [name, before] of original) {
      const after = box(root, name);
      if (/^(hall-|gate-|upper-|caisson-|entrance-roof|workshop-|pot-hall-west)/.test(name)) {
        expect(after.min.toArray(), name).toEqual(before.min.toArray());
        expect(after.max.toArray(), name).toEqual(before.max.toArray());
      }
      if (/^courtyard-(side-wall|side-art|wall-)/.test(name)) {
        const delta = before.getCenter(new THREE.Vector3()).x < -12 ? -2 : 2;
        expect(after.min.x - before.min.x, name).toBeCloseTo(delta, 5);
        expect(after.max.x - before.max.x, name).toBeCloseTo(delta, 5);
      }
      if (/^entrance-(inner|outer)-art/.test(name)) expect(after.max.x - after.min.x, name).toBeCloseTo(before.max.x - before.min.x, 5);
    }
    expect(box(root, 'courtyard-rear-wall').min.x).toBeCloseTo(-24, 5);
    expect(box(root, 'courtyard-rear-wall').max.x).toBeCloseTo(0, 5);
    expect(box(root, 'entrance-wing').min.x).toBeCloseTo(-24, 5);
    expect(box(root, 'entrance-wing').max.x).toBeCloseTo(-15, 5);
    expect(box(root, 'entrance-wing-001').min.x).toBeCloseTo(-9, 5);
    expect(box(root, 'entrance-wing-001').max.x).toBeCloseTo(0, 5);
    const ground = box(root, 'courtyard-ground');
    expect(ground.min.x).toBeCloseTo(-23.85, 5); expect(ground.max.x).toBeCloseTo(-.15, 5);
    expect(ground.max.y).toBe(0);
    for (const [id, delta] of [['pot-west-front', -2], ['pot-west-workshop', -2], ['pot-east-hall', 2]] as const) {
      expect(box(root, id).min.x - original.get(id)!.min.x).toBeCloseTo(delta, 6);
    }
    const count = root.children.length;
    expect(applyTerrainCourtyardExpansion(root)).toBe(report); expect(root.children.length).toBe(count);
    release(root);
  });

  it('opens both former side walls, supports the new floor, and blocks the new perimeter', () => {
    for (const x of [-22, -2]) for (const z of [-6, -16, -21]) {
      const p = toTerrainPoint('courtyard', { x, z });
      expect(isTerrainWalkable(p), `${x},${z}`).toBe(true);
      expect(terrainHeight(p.x, p.z)).toBeCloseTo(11.975, 5);
      expect(terrainSurfaceHeight(p)).toBe(12);
    }
    for (const [startX, deltaX] of [[-21.8, -8], [-2.2, 8]]) {
      const start = toTerrainPoint('courtyard', { x: startX, z: -6 }), target = toTerrainPoint('courtyard', { x: startX + deltaX, z: -6 });
      const result = moveTerrainPlayer(start, { x: target.x - start.x, z: target.z - start.z });
      expect(Math.hypot(result.x - start.x, result.z - start.z)).toBeGreaterThan(.6);
      expect(Math.hypot(result.x - start.x, result.z - start.z)).toBeLessThan(1.1);
    }
    for (const [x, z] of [[-24,-6], [0,-6], [-22.5,2], [-1.5,2], [-12,-24]]) expect(isTerrainWalkable(toTerrainPoint('courtyard', {x,z}))).toBe(false);
    for (const z of [6, 3, 1, -2]) expect(isTerrainWalkable(toTerrainPoint('courtyard', { x: -12, z }))).toBe(true);
    for (const [id, x, z] of [['pot-west-front',-23.35,-3],['pot-west-workshop',-23.35,-10],['pot-east-hall',-.65,-10.8]] as const) {
      const collider = TERRAIN_PLAYER_COLLIDERS.find(s => s.id === `terrain-courtyard-${id}`)!, p = toTerrainPoint('courtyard',{x,z});
      expect(collider.circle!.x).toBeCloseTo(p.x, 8); expect(collider.circle!.z).toBeCloseTo(p.z, 8);
    }
  });

  it('uses expanded bounds in both camera passes and retains untouched gate proxies', () => {
    for (const id of ['courtyard-side-wall', 'courtyard-side-wall-001']) {
      const source = COURTYARD_CAMERA_BOXES.find(b => b.id === id)!, target = TERRAIN_COURTYARD_CAMERA_BOXES.find(b => b.id === id)!;
      const delta = id.endsWith('001') ? 2 : -2;
      expect(target.min[0] - source.min[0]).toBeCloseTo(delta);
      expect(target.max[0] - source.max[0]).toBeCloseTo(delta);
    }
    for (const source of COURTYARD_CAMERA_BOXES.filter(b => /^(gate-|entrance-roof)/.test(b.id))) expect(TERRAIN_COURTYARD_CAMERA_BOXES.find(b => b.id === source.id)).toEqual(source);
  });
});
