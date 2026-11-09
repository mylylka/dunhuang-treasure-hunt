import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createMusicGuideAvatar } from '../../src/world/music-guide-avatar';
import { createMusicGuideSurfaceReveal } from '../../src/world/music-guide-surface-reveal';

function model() {
  const scene = new THREE.Group();
  const hip = new THREE.Bone();
  hip.name = 'Hip';
  const geometry = new THREE.BoxGeometry(.4, 1.8, .3);
  geometry.translate(0, .9, 0);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const material = new THREE.MeshStandardMaterial({ map: new THREE.Texture() });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  scene.add(hip, mesh);
  scene.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([hip]));
  const animations = ['Idle', 'Walk', 'Run', 'Talk', 'Welcome'].map(name =>
    new THREE.AnimationClip(name, 1, [new THREE.NumberKeyframeTrack('Hip.rotation[z]', [0, 1], [0, .02])]));
  const gltf = { scene, animations } as unknown as GLTF;
  return { gltf, scene, geometry, hip };
}

describe('guide outfit adoption', () => {
  it('places the reveal at ground level when a previously worn rig is staged again', () => {
    const { scene } = model();
    const root = new THREE.Group();
    root.position.set(12, 3, 16);
    root.add(scene);
    root.updateMatrixWorld(true);
    scene.removeFromParent();
    const reveal = createMusicGuideSurfaceReveal(scene, root, false);
    try {
      reveal.apply();
      const orbit = scene.getObjectByName('music-guide-reveal')!;
      const position = new THREE.Vector3().setFromMatrixPosition(orbit.matrix);
      expect(position.length()).toBeLessThan(.001);
    } finally { reveal.dispose(); }
  });

  it('prepares idle before committing and switches the visible outfit without moving the guide', () => {
    const plain = model(), crowned = model();
    const release = vi.fn();
    const avatar = createMusicGuideAvatar(plain.gltf, release);
    const feet = new THREE.Vector3(3, 2, 4);
    try {
      avatar.update(feet, .7, 0, 0, false);
      crowned.hip.rotation.z = .4;
      const prepared = avatar.prepareOutfit('five-dynasties', crowned.gltf)!;
      expect(crowned.hip.rotation.z).toBeCloseTo(0);
      expect(crowned.scene.parent).toBeNull();
      expect(avatar.inspect()).toMatchObject({ outfit: 'plain', visible: true });
      expect(plain.scene.parent).toBe(avatar.root);
      expect(prepared.commit(() => {
        expect(plain.scene.parent).toBeNull();
        expect(crowned.scene.parent).toBe(avatar.root);
        expect(avatar.inspect()).toMatchObject({
          outfit: 'five-dynasties', action: 'Idle', visible: true, position: feet.toArray(), heading: .7,
        });
      })).toBe(true);
      prepared.discard();
      expect(release).not.toHaveBeenCalled();
    } finally {
      avatar.dispose();
    }
  });

  it('rolls back a failed lighting hook and leaves the attempted outfit with its caller', () => {
    const plain = model(), previous = model(), attempted = model();
    const release = vi.fn((root: THREE.Object3D) => {
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
      });
    });
    const avatar = createMusicGuideAvatar(plain.gltf, release);
    const stop = vi.spyOn(THREE.AnimationMixer.prototype, 'stopAllAction');
    const uncache = vi.spyOn(THREE.AnimationMixer.prototype, 'uncacheRoot');
    const oldDispose = vi.spyOn(previous.geometry, 'dispose');
    const attemptedDispose = vi.spyOn(attempted.geometry, 'dispose');
    try {
      expect(avatar.replace('northern-wei', previous.gltf)).toBe(true);
      const position = new THREE.Vector3(3, 2, 4);
      avatar.update(position, .7, 2.6, .1, false);
      avatar.root.updateWorldMatrix(true, true);
      const parent = previous.scene.parent;
      const localMatrix = previous.scene.matrix.clone(), worldMatrix = previous.scene.matrixWorld.clone();
      const before = avatar.inspect();
      expect(() => avatar.replace('late-tang', attempted.gltf, () => {
        expect(attempted.scene.parent).toBe(parent);
        expect(previous.scene.parent).toBeNull();
        previous.scene.position.set(99, 99, 99);
        previous.scene.updateMatrix();
        throw new Error('injected lighting failure');
      })).toThrow('injected lighting failure');
      expect(avatar.inspect()).toEqual(before);
      expect(previous.scene.parent).toBe(parent);
      expect(previous.scene.matrix.elements).toEqual(localMatrix.elements);
      expect(previous.scene.matrixWorld.elements).toEqual(worldMatrix.elements);
      expect(attempted.scene.parent).toBeNull();
      expect(release).not.toHaveBeenCalled();
      expect(oldDispose).not.toHaveBeenCalled();
      expect(attemptedDispose).not.toHaveBeenCalled();
      expect(stop).toHaveBeenCalledTimes(1);
      expect(uncache).toHaveBeenCalledExactlyOnceWith(attempted.scene);
      // The async loader still owns a rejected model and releases it itself.
      release(attempted.scene);
      expect(attemptedDispose).toHaveBeenCalledTimes(1);
      avatar.update(position, .7, 2.6, .1, false);
      expect(avatar.inspect().visible).toBe(true);
      expect(avatar.inspect().outfit).toBe('northern-wei');
      expect(avatar.inspect().time).toBeGreaterThan(before.time);
      expect(avatar.replace('plain')).toBe(true);
      expect(oldDispose).toHaveBeenCalledTimes(1);
      expect(release.mock.calls.map(([root]) => root)).toEqual([attempted.scene, previous.scene]);
      avatar.dispose();
      expect(release.mock.calls.map(([root]) => root)).toEqual([attempted.scene, previous.scene, plain.scene]);
    } finally {
      avatar.dispose();
      stop.mockRestore();
      uncache.mockRestore();
    }
  });
});
