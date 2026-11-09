import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMusicInteriorReliefCeiling, MUSIC_RELIEF_CEILING } from '../../src/world/music-interior-relief-ceiling-v001';

describe('music room shallow relief ceiling', () => {
  it('fits above the instrument room without extending into the stair or balcony', () => {
    const root = new THREE.Group();
    const ceiling = createMusicInteriorReliefCeiling(root);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(ceiling.group);
    expect(bounds.min.x).toBeGreaterThanOrEqual(34.76);
    expect(bounds.max.x).toBeLessThanOrEqual(46.27);
    expect(bounds.min.z).toBeGreaterThanOrEqual(-32.175);
    expect(bounds.max.z).toBeLessThanOrEqual(-21.85);
    expect(bounds.max.y).toBeLessThan(13.5305);
    expect(bounds.min.y).toBeGreaterThan(13.25);
    expect(MUSIC_RELIEF_CEILING.centerX).toBeGreaterThan(bounds.min.x);
    const relief = ceiling.group.getObjectByName('music-relief-ceiling-ivory')!;
    const reliefBounds = new THREE.Box3().setFromObject(relief);
    const depth = reliefBounds.getSize(new THREE.Vector3()).y;
    expect(depth).toBeCloseTo(.025, 4);
    const rim = ceiling.group.getObjectByName('music-relief-ceiling-shadow-edge')!;
    expect(new THREE.Box3().setFromObject(rim).min.y).toBeCloseTo(reliefBounds.min.y, 5);
    ceiling.dispose();
  });

  it('renders in three static mesh batches and releases them on disposal', () => {
    const root = new THREE.Group(), ceiling = createMusicInteriorReliefCeiling(root);
    expect(root.children).toContain(ceiling.group);
    expect(ceiling.group.children).toHaveLength(3);
    expect(ceiling.group.children.every(child => child instanceof THREE.Mesh && !child.castShadow)).toBe(true);
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(40.51, 8, -27.015), new THREE.Vector3(0, 1, 0));
    expect(ray.intersectObject(ceiling.group, true)).toHaveLength(0);
    const materials = ceiling.group.children.map(child => (child as THREE.Mesh).material as THREE.Material);
    const released = materials.map(() => false);
    materials.forEach((material, index) => material.addEventListener('dispose', () => { released[index] = true; }));
    ceiling.dispose(); ceiling.dispose();
    expect(ceiling.group.parent).toBeNull();
    expect(released.every(Boolean)).toBe(true);
  });

  it('has an uninterrupted physical surface along all sixteen edges of its large star', () => {
    const root = new THREE.Group(), ceiling = createMusicInteriorReliefCeiling(root);
    root.updateMatrixWorld(true);
    const mesh = ceiling.group.getObjectByName('music-relief-ceiling-ivory') as THREE.Mesh;
    const at = (i: number) => {
      const angle = i * Math.PI / 8, outer = i % 2 ? 3.10 : 3.78, inner = i % 2 ? 2.96 : 3.61;
      return new THREE.Vector2(Math.cos(angle) * (outer + inner) / 2, Math.sin(angle) * (outer + inner) / 2);
    };
    for (let i = 0; i < 16; i++) for (const t of [.1, .5, .9]) {
      const point = at(i).lerp(at((i + 1) % 16), t);
      const ray = new THREE.Raycaster(new THREE.Vector3(40.51 + point.x, 8, -27.015 + point.y), new THREE.Vector3(0, 1, 0));
      const hits: THREE.Intersection[] = [];
      THREE.Mesh.prototype.raycast.call(mesh, ray, hits);
      expect(hits.length, `edge ${i} at ${t}`).toBeGreaterThan(0);
    }
    ceiling.dispose();
  });
});
