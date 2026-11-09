import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMusicInteriorReliefCeiling, MUSIC_RELIEF_CEILING } from '../../src/world/music-interior-relief-ceiling-v001';
import { createMusicTransitionCeiling, MUSIC_CONNECTED_CEILING } from '../../src/world/music-transition-ceiling-v001';

describe('music connected plain ceiling', () => {
  it('covers the measured stair and covered balcony while leaving the existing relief untouched', () => {
    const root = new THREE.Group();
    const finish = createMusicTransitionCeiling(root);
    root.updateMatrixWorld(true);
    const mesh = finish.group.children[0] as THREE.Mesh;
    const intersections = (x: number, z: number) => {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 12, z), new THREE.Vector3(0, 1, 0));
      const hits: THREE.Intersection[] = [];
      // Inspect triangles directly: runtime picking deliberately ignores finish meshes.
      THREE.Mesh.prototype.raycast.call(mesh, ray, hits);
      return hits;
    };
    expect(intersections(52, -25).length).toBeGreaterThan(0); // stairwell
    expect(intersections(40, -20).length).toBeGreaterThan(0); // covered balcony
    expect(intersections(40, -27).length).toBeGreaterThan(0); // continuous backing behind relief
    expect(intersections(40, -18)).toHaveLength(0); // beyond the actual ceiling
    expect(intersections(59.7, -25)).toHaveLength(0); // outside the building
    expect(MUSIC_RELIEF_CEILING.undersideY - MUSIC_CONNECTED_CEILING.y).toBeCloseTo(.005, 6);
    const relief = createMusicInteriorReliefCeiling(root);
    root.updateMatrixWorld(true);
    const oldPanel = relief.group.children[0] as THREE.Mesh;
    const seamRay = new THREE.Raycaster(new THREE.Vector3(MUSIC_RELIEF_CEILING.minX + .002, 12, -27), new THREE.Vector3(0, 1, 0));
    const oldHits: THREE.Intersection[] = [], newHits: THREE.Intersection[] = [];
    THREE.Mesh.prototype.raycast.call(oldPanel, seamRay, oldHits);
    THREE.Mesh.prototype.raycast.call(mesh, seamRay, newHits);
    expect(oldHits.length).toBeGreaterThan(0);
    expect(newHits.length).toBeGreaterThan(0);
    expect(oldHits[0].distance - newHits[0].distance).toBeCloseTo(.005, 5);
    // Existing mouldings finish at y=13.452, in front of the continuous plaster.
    expect(MUSIC_CONNECTED_CEILING.y).toBeGreaterThan(13.452);
    expect(finish.group.children).toHaveLength(1);
    expect(mesh.castShadow).toBe(false);
    expect(mesh.receiveShadow).toBe(true);
    const picking = new THREE.Raycaster(new THREE.Vector3(52, 12, -25), new THREE.Vector3(0, 1, 0));
    expect(picking.intersectObject(mesh)).toHaveLength(0);
    relief.dispose(); finish.dispose();
  });

  it('uses the existing relief panel colour and releases its resources', () => {
    const root = new THREE.Group(), finish = createMusicTransitionCeiling(root);
    const relief = createMusicInteriorReliefCeiling(root);
    const plain = (finish.group.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    const original = (relief.group.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    expect(plain.color.getHex()).toBe(original.color.getHex());
    expect(plain.emissive.getHex()).toBe(original.emissive.getHex());
    expect(plain.emissiveIntensity).toBe(original.emissiveIntensity);
    let disposed = false;
    plain.addEventListener('dispose', () => { disposed = true; });
    finish.dispose(); finish.dispose();
    expect(disposed).toBe(true);
    expect(finish.group.parent).toBeNull();
    relief.dispose();
  });
});
