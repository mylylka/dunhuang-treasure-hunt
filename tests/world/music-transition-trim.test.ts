import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMusicTransitionTrim, MUSIC_TRANSITION_TRIM } from '../../src/world/music-transition-trim-v001';

describe('music room transition trim', () => {
  it('hugs the hall side of the back-wall seam and stays outside the stair passage', () => {
    const root = new THREE.Group();
    const trim = createMusicTransitionTrim(root);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(trim.group);
    expect(bounds.max.x).toBeCloseTo(MUSIC_TRANSITION_TRIM.seamX, 4);
    expect(bounds.min.z).toBeCloseTo(MUSIC_TRANSITION_TRIM.wallZ, 4);
    expect(bounds.max.z).toBeLessThan(-32.025);
    expect(bounds.min.y).toBeCloseTo(7.915375, 4);
    expect(bounds.max.y).toBeCloseTo(13.475, 4);
    trim.dispose();
  });

  it('does not intercept picking rays and releases its resources', () => {
    const root = new THREE.Group(), trim = createMusicTransitionTrim(root);
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(46.18, 10, -31), new THREE.Vector3(0, 0, -1));
    expect(ray.intersectObject(trim.group, true)).toHaveLength(0);
    const meshes = trim.group.children as THREE.Mesh[];
    expect(meshes).toHaveLength(2);
    expect(meshes.every(mesh => mesh.receiveShadow && !mesh.castShadow)).toBe(true);
    let disposed = 0;
    for (const mesh of meshes) mesh.geometry.addEventListener('dispose', () => { disposed++; });
    trim.dispose(); trim.dispose();
    expect(disposed).toBe(2);
    expect(trim.group.parent).toBeNull();
  });
});
