import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { musicGuideBlockedByTraveler, musicGuideShowcasePose } from '../../src/world/music-guide-visibility';

function model(width: number, depth = .4) {
  const geometry = new THREE.BoxGeometry(width, 1.8, depth).translate(0, .9, 0);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
}

function actor(x: number, z: number, width = .6, depth = .4) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.add(model(width, depth));
  return root;
}

function view(near = .1) {
  const camera = new THREE.PerspectiveCamera(49, 16 / 9, near, 20);
  camera.position.y = .9;
  return camera;
}

describe('foreground visibility during the guide reveal', () => {
  it('detects centered and partial foreground overlap while keeping nearby actors and background travelers visible', () => {
    const camera = view(), guide = actor(0, -5), traveler = actor(0, -3);
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(true);
    traveler.position.x = .44;
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(true);
    traveler.position.x = 1.2;
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
    traveler.position.set(0, 0, -6);
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
  });

  it('clips a foreground model against the near plane without treating the entire viewport as blocked', () => {
    const camera = view(.5), guide = actor(0, -3), traveler = actor(0, -.45, .8, .6);
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(true);
    traveler.position.x = 1.5;
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
    traveler.position.set(0, 0, .5);
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
    traveler.position.set(10, 0, -3);
    guide.position.set(15, 0, -5);
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
  });

  it('measures a different costume loaded into the same guide root', () => {
    const camera = view(), traveler = actor(0, -3), guide = actor(1, -4, .2);
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
    guide.clear();
    guide.add(model(1.8));
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(true);
    guide.visible = false;
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
  });

  it('measures a posed mesh in its model space instead of the rest geometry', () => {
    const camera = view(), guide = actor(0, -5), traveler = new THREE.Group();
    const rig = new THREE.Group(), joint = new THREE.Bone();
    const base = model(.6);
    const vertices = base.geometry.getAttribute('position').count;
    base.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(vertices * 4), 4));
    const weights = new Float32Array(vertices * 4);
    for (let i = 0; i < vertices; i++) weights[i * 4] = 1;
    base.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const skinned = new THREE.SkinnedMesh(base.geometry, base.material);
    rig.add(joint, skinned);
    traveler.add(rig);
    traveler.position.z = -3;
    traveler.updateMatrixWorld(true);
    skinned.bind(new THREE.Skeleton([joint]));
    joint.position.x = 1.2;
    expect(musicGuideBlockedByTraveler(camera, traveler, guide)).toBe(false);
  });

  it('frames the whole costume and tries a side angle if the frontal view is blocked', () => {
    const camera = view(), guide = actor(0, -5, 1.4, .65);
    const sparkle = model(8);
    sparkle.userData.musicGuideReveal = true;
    guide.children[0].add(sparkle);
    const pose = musicGuideShowcasePose(guide, camera, (target, desired) =>
      Math.abs(desired.x) < .2 ? target : desired);
    expect(pose).not.toBeNull();
    camera.position.copy(pose!.position);
    camera.lookAt(pose!.target);
    camera.updateMatrixWorld(true);
    for (const x of [-.7, .7]) for (const y of [0, 1.8]) for (const z of [-5.325, -4.675]) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      expect(Math.max(Math.abs(point.x), Math.abs(point.y))).toBeLessThan(.87);
    }
    expect(camera.position.distanceTo(pose!.target)).toBeLessThan(3);
  });
});
