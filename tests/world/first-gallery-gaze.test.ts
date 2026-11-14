import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createFirstGalleryGaze } from '../../src/world/first-gallery-gaze';

function character(bindPoseForwardZ: -1 | 1 = -1) {
  const traveler = new THREE.Group(), model = new THREE.Group();
  const hips = new THREE.Bone();
  hips.rotation.y = Math.PI / 2; // The official joint's bind frame also faces +X.
  const neck = new THREE.Bone(); neck.name = 'mixamorigNeck'; neck.position.y = 1.3;
  const head = new THREE.Bone(); head.name = 'mixamorigHead'; head.position.y = .2;
  const end = new THREE.Bone(); end.name = 'mixamorigHeadTop_End'; end.position.y = .1;
  head.add(end); neck.add(head); hips.add(neck);
  const mesh = new THREE.SkinnedMesh();
  traveler.add(model);
  model.add(hips, mesh);
  traveler.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([hips, neck, head, end]));
  if (bindPoseForwardZ === 1) model.rotation.y = Math.PI;
  const mixer = new THREE.AnimationMixer(traveler);
  const gaze = createFirstGalleryGaze(traveler, bindPoseForwardZ);
  function frame(dt = 1 / 60, heading = 0) {
    gaze.beforeAnimation();
    traveler.rotation.y = heading;
    mixer.update(dt);
    gaze.update(dt, heading);
  }
  return { traveler, head, neck, end, mixer, gaze, frame };
}

function expectAimed(fixture: ReturnType<typeof character>, target: THREE.Vector3) {
  const forward = new THREE.Vector3().fromArray(fixture.gaze.inspect().forward!);
  const direction = target.clone().sub(fixture.head.getWorldPosition(new THREE.Vector3())).normalize();
  expect(forward.dot(direction)).toBeGreaterThan(.995);
}

describe('first gallery traveler gaze', () => {
  it('aims at nearby objects without moving the body, and turns the body for a wider angle', () => {
    const f = character(), target = new THREE.Vector3(.9, 1, -4);
    f.gaze.start(target);
    for (let i = 0; i < 75; i++) f.frame();
    expect(f.traveler.rotation.y).toBe(0);
    expect(f.gaze.inspect().headPitch).toBeLessThan(0);
    expectAimed(f, target);

    target.set(4, 1.6, 0);
    f.gaze.start(target);
    f.frame();
    expect(f.traveler.rotation.y).toBeLessThan(0);
    expect(Math.abs(f.traveler.rotation.y)).toBeLessThan(.06);
    for (let i = 0; i < 90; i++) f.frame();
    expect(f.traveler.rotation.y).toBeLessThan(-1);
    expect(f.traveler.position.toArray()).toEqual([0, 0, 0]);
    expectAimed(f, target);
  });

  it('aims the second traveler after its opposite bind-pose heading is corrected', () => {
    const f = character(1), target = new THREE.Vector3(.9, 1, -4);
    f.gaze.start(target);
    for (let i = 0; i < 75; i++) f.frame();
    expect(f.traveler.rotation.y).toBe(0);
    expectAimed(f, target);
  });

  it('looks upward with bounded pitch and ignores tiny changes of bearing directly overhead', () => {
    const f = character();
    for (let i = 0; i < 90; i++) {
      f.gaze.start(new THREE.Vector3(i % 2 ? -.002 : .002, 8, .001), 'up');
      f.frame(1 / 60, .8);
      expect(f.traveler.rotation.y).toBeCloseTo(.8);
    }
    const forward = new THREE.Vector3().fromArray(f.gaze.inspect().forward!);
    expect(Math.asin(forward.y)).toBeCloseTo(Math.PI / 6);
    expect(f.gaze.inspect().headYaw).toBeCloseTo(0);
    expect(f.end.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  });

  it('restores the animated joints before mixing again and releases the render turn on cancel', () => {
    const f = character();
    const original = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .12);
    const track = new THREE.QuaternionKeyframeTrack(
      'mixamorigHead.quaternion', [0, 1], [...original.toArray(), ...original.toArray()],
    );
    f.mixer.clipAction(new THREE.AnimationClip('Idle', 1, [track])).play();
    f.gaze.start(new THREE.Vector3(4, .4, 1));
    for (let i = 0; i < 90; i++) f.frame();
    const aimed = f.head.quaternion.clone();
    for (let i = 0; i < 90; i++) f.frame(0);
    expect(f.head.quaternion.angleTo(aimed)).toBeLessThan(.0001);
    f.gaze.beforeAnimation();
    expect(f.head.quaternion.clone().normalize().angleTo(original)).toBeLessThan(.0001);
    expect(f.neck.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(.0001);
    expect(f.traveler.rotation.y).toBe(0);

    f.frame();
    f.gaze.cancel();
    f.frame(1 / 60, .25);
    expect(f.traveler.rotation.y).not.toBe(.25);
    for (let i = 0; i < 90; i++) f.frame(1 / 60, .25);
    expect(f.gaze.inspect()).toMatchObject({ target: null, bodyTurn: 0, headYaw: 0, headPitch: 0 });
    expect(f.traveler.rotation.y).toBe(.25);
    expect(f.head.quaternion.clone().normalize().angleTo(original)).toBeLessThan(.0001);
  });

  it('immediately restores the base pose when reduced motion disables an active gaze', () => {
    const f = character();
    f.gaze.start(new THREE.Vector3(-5, 1.5, 0));
    for (let i = 0; i < 30; i++) f.frame();
    expect(f.traveler.rotation.y).toBeGreaterThan(.5);
    f.gaze.update(0, 0, true);
    expect(f.gaze.inspect()).toMatchObject({ target: null, bodyTurn: 0, headYaw: 0, headPitch: 0 });
    expect(f.traveler.rotation.y).toBe(0);
  });
});
