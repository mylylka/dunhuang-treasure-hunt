import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyMusicBalconyRail, MUSIC_BALCONY_FRONT_RAIL } from '../../src/world/music-balcony-rail-v001';

/** Load the actual glTF mesh geometry without decoding images or launching WebGL. */
function originalBalconyMeshes() {
  const glb = readFileSync('public/assets/world/music-interior/v007/music-pavilion.glb');
  const jsonLength = glb.readUInt32LE(12), jsonStart = 20;
  const gltf = JSON.parse(glb.subarray(jsonStart, jsonStart + jsonLength).toString());
  const binaryStart = jsonStart + jsonLength + 8;
  function accessor(id: number) {
    const a = gltf.accessors[id], view = gltf.bufferViews[a.bufferView];
    const componentSize = a.componentType === 5123 ? 2 : 4;
    const dims = a.type === 'VEC3' ? 3 : 1;
    const start = binaryStart + (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const result: number[] = [];
    for (let i = 0; i < a.count * dims; i++) {
      const offset = start + i * componentSize;
      result.push(a.componentType === 5126 ? glb.readFloatLE(offset)
        : a.componentType === 5123 ? glb.readUInt16LE(offset) : glb.readUInt32LE(offset));
    }
    return result;
  }
  const root = new THREE.Group(), pavilion = new THREE.Group();
  pavilion.position.set(46, 0, -9); root.add(pavilion);
  for (const originalName of ['porch--wood-light.001', 'music-interior-guardrail--music-decor-cinnabar', 'music-interior-guardrail--music-decor-wood']) {
    const node = gltf.nodes.find((entry: { name?: string }) => entry.name === originalName);
    expect(node).toBeDefined();
    const primitive = gltf.meshes[node.mesh].primitives[0], geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(accessor(primitive.attributes.POSITION), 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(accessor(primitive.attributes.NORMAL), 3));
    geometry.setIndex(accessor(primitive.indices));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = originalName.replace('.', '');
    if (node.translation) mesh.position.fromArray(node.translation);
    pavilion.add(mesh);
  }
  return root;
}

describe('music balcony front and east railing', () => {
  it('keeps a shortened top rail, removes the lower rail and lattice, and restores original geometry on dispose', () => {
    const root = originalBalconyMeshes();
    const names = ['porch--wood-light001', 'music-interior-guardrail--music-decor-cinnabar', 'music-interior-guardrail--music-decor-wood'];
    const meshes = names.map(name => root.getObjectByName(name) as THREE.Mesh);
    const original = meshes.map(mesh => mesh.geometry);
    const counts = original.map(geometry => geometry.index!.count);
    const rail = applyMusicBalconyRail(root);
    expect(rail.inspect()).toMatchObject({ posts: 18, removedLowerRails: 1, retainedUpperRails: 2, sidePosts: 10, heightScale: .5 });
    expect(rail.inspect().postHeight).toBeCloseTo((9.253 - MUSIC_BALCONY_FRONT_RAIL.floorY) / 2);
    expect(meshes[0].geometry.index!.count).toBe(counts[0] - 44 * 3);
    // Only the measured gallery side is removed from each shared mesh; the
    // remaining stair-landing guardrails stay in the same index buffers.
    expect(meshes[1].geometry.index!.count).toBe(counts[1] - 114 * 3);
    expect(meshes[2].geometry.index!.count).toBe(counts[2] - 432 * 3);
    expect(rail.group.children).toHaveLength(3);
    root.updateMatrixWorld(true);
    const sideBeam = rail.group.getObjectByName('music-balcony-side-upper-rail')!;
    const connector = rail.group.getObjectByName('music-balcony-front-upper-rail-corner')!;
    const sideBounds = new THREE.Box3().setFromObject(sideBeam);
    const connectorBounds = new THREE.Box3().setFromObject(connector);
    const expectedTop = MUSIC_BALCONY_FRONT_RAIL.floorY + (9.2965 - MUSIC_BALCONY_FRONT_RAIL.floorY) / 2;
    expect(sideBounds.max.y).toBeCloseTo(expectedTop, 4);
    expect(connectorBounds.max.y).toBeCloseTo(sideBounds.max.y, 5);
    expect(connectorBounds.max.x).toBeGreaterThan(sideBounds.min.x);
    rail.dispose(); rail.dispose();
    for (let i = 0; i < meshes.length; i++) expect(meshes[i].geometry).toBe(original[i]);
    expect(rail.group.parent).toBeNull();
  });
});
