import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createCompanionAvatar } from '../../src/world/companion-avatar';
import { RUN_SPEED, WALK_SPEED } from '../../src/world/movement';

function fixture() {
  const source = new THREE.Group();
  source.name = 'source-traveler';
  const hip = new THREE.Bone(); hip.name = 'Hip';
  const head = new THREE.Bone(); head.name = 'Head'; head.position.y = .8;
  hip.add(head);
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const count = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ map: texture });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'traveler-body'; mesh.castShadow = true;
  source.add(hip, mesh);
  source.position.y = 1;
  source.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([hip, head]));
  const clips = [
    new THREE.AnimationClip('Idle', 1, [new THREE.NumberKeyframeTrack('Head.rotation[z]', [0, 1], [0, 0])]),
    new THREE.AnimationClip('Walk', 1, [new THREE.NumberKeyframeTrack('Head.rotation[z]', [0, .5, 1], [0, .6, 0])]),
    new THREE.AnimationClip('Run', 1, [new THREE.NumberKeyframeTrack('Head.rotation[z]', [0, .5, 1], [0, -.8, 0])]),
  ];
  return { source, mesh, head, geometry, material, texture, clips };
}

describe('isolated companion avatar', () => {
  it('animates cloned bones independently while reusing the loaded model assets', () => {
    const f = fixture(), scene = new THREE.Scene(), player = new THREE.Group();
    scene.add(player); player.add(f.source);
    const playerMixer = new THREE.AnimationMixer(f.source);
    playerMixer.clipAction(f.clips[1]).play(); playerMixer.update(.125);
    const playerHead = f.head.rotation.z;
    const companion = createCompanionAvatar(f.source, f.clips);
    scene.add(companion.root);
    const cloneMesh = companion.root.getObjectByName('traveler-body') as THREE.SkinnedMesh;
    const cloneHead = companion.root.getObjectByName('Head') as THREE.Bone;
    expect(companion.inspect().visible).toBe(false);
    expect(cloneMesh.skeleton).not.toBe(f.mesh.skeleton);
    expect(cloneMesh.skeleton.bones[1]).toBe(cloneHead);
    expect(cloneHead).not.toBe(f.head);
    expect(cloneMesh.geometry).toBe(f.geometry);
    expect(cloneMesh.material).toBe(f.material);
    expect(cloneMesh.castShadow).toBe(false);
    expect(f.mesh.castShadow).toBe(true);
    player.visible = false;
    companion.update(new THREE.Vector3(3, 0, 4), Math.PI / 2, 3.2, .1, false);
    expect(companion.inspect().visible).toBe(true);
    expect(companion.root.parent).toBe(scene);
    expect(companion.inspect().position).toEqual([3, 0, 4]);
    expect(companion.inspect().heading).toBeCloseTo(Math.PI / 2);
    expect(cloneHead.rotation.z).not.toBeCloseTo(playerHead);
    expect(f.head.rotation.z).toBe(playerHead);
    for (let i = 0; i < 3; i++) companion.update(new THREE.Vector3(3, 0, 4), Math.PI / 2, RUN_SPEED, .1, false);
    expect(companion.inspect().animation).toBe('Run');
    expect(cloneHead.rotation.z).toBeLessThan(0);
    expect(f.head.rotation.z).toBe(playerHead);
    playerMixer.update(.1);
    expect(f.head.rotation.z).not.toBe(playerHead);
    companion.dispose(); playerMixer.stopAllAction(); playerMixer.uncacheRoot(f.source);
  });

  it('switches Walk to Run to Walk to Idle with calibrated playback and no advance while paused', () => {
    const f = fixture();
    const walkRate = WALK_SPEED / 1.20591, runRate = RUN_SPEED / 4.39490;
    const companion = createCompanionAvatar(f.source, f.clips, { walkRate, runRate });
    const position = new THREE.Vector3(1, 0, 2);
    companion.update(position, 0, 3.2, .1, false);
    const walking = companion.inspect();
    expect(walking.animation).toBe('Walk');
    expect(walking.time).toBeGreaterThan(0);
    expect(walking.playbackRate).toBeCloseTo(walkRate);
    companion.update(position, 0, 4, .1, false);
    expect(companion.inspect().animation).toBe('Walk');
    companion.update(position, 0, 4.01, .1, false);
    expect(companion.inspect().animation).toBe('Run');
    companion.update(position, 0, RUN_SPEED, .1, false);
    expect(companion.inspect().playbackRate).toBeCloseTo(runRate);
    companion.update(position, 0, 7.6, .1, false);
    expect(companion.inspect().animation).toBe('Run');
    expect(companion.inspect().playbackRate).toBeCloseTo(runRate * 7.6 / RUN_SPEED);
    companion.update(position, 0, WALK_SPEED, .1, false);
    expect(companion.inspect().animation).toBe('Walk');
    expect(companion.inspect().playbackRate).toBeCloseTo(walkRate);
    companion.update(position, 0, 0, 0, false);
    const paused = companion.inspect();
    expect(paused.animation).toBe('Idle');
    companion.update(position, 0, 0, 0, false);
    expect(companion.inspect().time).toBe(paused.time);
    for (let i = 0; i < 3; i++) companion.update(position, 0, 0, .1, false);
    expect((companion.root.getObjectByName('Head') as THREE.Bone).rotation.z).toBeCloseTo(0);
    companion.update(position, 0, RUN_SPEED, .1, true);
    expect(companion.inspect().animation).toBe('Idle');
    companion.dispose();
  });

  it('hides only the companion near the camera, keeps animating, and restores with distance hysteresis', () => {
    const f = fixture();
    const originalVertices = new Float32Array(f.geometry.attributes.position.array);
    const companion = createCompanionAvatar(f.source, f.clips, { restHeight: 1.8 });
    const position = new THREE.Vector3(10, 6, 20);
    companion.setCameraPosition(new THREE.Vector3(100, 100, 100));
    expect(companion.inspect().visible).toBe(false);
    companion.update(position, 0, WALK_SPEED, .1, false);
    companion.setCameraPosition(new THREE.Vector3(10.3, 7.7, 20));
    expect(companion.inspect().visible).toBe(false);
    const before = companion.inspect().time;
    const head = companion.root.getObjectByName('Head') as THREE.Bone;
    const headBefore = head.rotation.z;
    companion.update(position, 0, WALK_SPEED, .1, false);
    expect(companion.inspect().visible).toBe(false);
    expect(companion.inspect().time).toBeGreaterThan(before);
    expect(head.rotation.z).not.toBeCloseTo(headBefore);
    expect(companion.inspect().animation).toBe('Walk');
    companion.setCameraPosition(new THREE.Vector3(11.1, 7.7, 20));
    expect(companion.inspect().visible).toBe(false);
    companion.setCameraPosition(new THREE.Vector3(11.26, 7.7, 20));
    expect(companion.inspect().visible).toBe(true);
    companion.setCameraPosition(new THREE.Vector3(11.1, 7.7, 20));
    expect(companion.inspect().visible).toBe(true);
    companion.setCameraPosition(new THREE.Vector3(10.99, 7.7, 20));
    expect(companion.inspect().visible).toBe(false);
    // Equal X/Z on a different floor must not count as a near-head camera.
    companion.setCameraPosition(new THREE.Vector3(10, 9.2, 20));
    expect(companion.inspect().visible).toBe(true);
    companion.setCameraPosition(new THREE.Vector3(10, 6.1, 20));
    expect(companion.inspect().visible).toBe(false);
    companion.setCameraPosition(new THREE.Vector3(10, 5, 20));
    expect(companion.inspect().visible).toBe(true);
    expect(f.source.visible).toBe(true);
    expect(f.mesh.visible).toBe(true);
    expect(f.head.rotation.z).toBe(0);
    expect(f.material.opacity).toBe(1);
    expect(f.material.transparent).toBe(false);
    expect(f.geometry.attributes.position.array).toEqual(originalVertices);
    expect((companion.root.getObjectByName('traveler-body') as THREE.Mesh).material).toBe(f.material);
    companion.dispose();
  });

  it('releases only its own skeletons and mixer without disposing the player assets', () => {
    const f = fixture(), scene = new THREE.Scene();
    const geometryDispose = vi.spyOn(f.geometry, 'dispose');
    const materialDispose = vi.spyOn(f.material, 'dispose');
    const textureDispose = vi.spyOn(f.texture, 'dispose');
    const sourceSkeletonDispose = vi.spyOn(f.mesh.skeleton, 'dispose');
    const companion = createCompanionAvatar(f.source, f.clips);
    scene.add(companion.root);
    const mesh = companion.root.getObjectByName('traveler-body') as THREE.SkinnedMesh;
    const cloneSkeletonDispose = vi.spyOn(mesh.skeleton, 'dispose');
    companion.update(new THREE.Vector3(1, 0, 2), 0, 2, .1, false);
    companion.dispose(); companion.dispose();
    expect(cloneSkeletonDispose).toHaveBeenCalledTimes(1);
    expect(sourceSkeletonDispose).not.toHaveBeenCalled();
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(textureDispose).not.toHaveBeenCalled();
    expect(companion.root.parent).toBeNull();
    companion.update(new THREE.Vector3(9, 0, 9), 0, 3, .1, false);
    companion.setCameraPosition(new THREE.Vector3(100, 100, 100));
    expect(companion.inspect().visible).toBe(false);
  });
});
