import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { RUN_SPEED, WALK_SPEED } from './movement';

export interface CompanionAvatarSnapshot {
  visible: boolean;
  animation: 'Idle' | 'Walk' | 'Run';
  time: number;
  position: number[];
  heading: number;
  restHeight: number | null;
  playbackRate: number;
}

interface CompanionAvatarOptions {
  /** Existing player's Walk playback rate at WALK_SPEED. */
  walkRate?: number;
  /** Existing player's Run playback rate at RUN_SPEED. */
  runRate?: number;
  restHeight?: number | null;
}

/** A scene instance owns bones and a mixer; the loaded player owns shared GPU assets. */
export function createCompanionAvatar(source: THREE.Object3D, clips: readonly THREE.AnimationClip[], options: CompanionAvatarOptions = {}) {
  const idle = clips.find(clip => clip.name === 'Idle');
  const walk = clips.find(clip => clip.name === 'Walk');
  const run = clips.find(clip => clip.name === 'Run');
  if (!idle || !walk || !run) throw new Error('companion-animation-incomplete');

  const root = new THREE.Group();
  root.name = 'temporary-companion';
  root.visible = false;
  const model = cloneSkeleton(source);
  root.add(model);
  const skeletons = new Set<THREE.Skeleton>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    // The accepted world bakes non-player casters. Do not bake a moving clone.
    object.castShadow = false;
    object.receiveShadow = true;
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  root.updateMatrixWorld(true);
  const height = new THREE.Box3().setFromObject(model, true).getSize(new THREE.Vector3()).y;
  const restHeight = options.restHeight ?? (Number.isFinite(height) && height > 0 ? height : null);
  const mixer = new THREE.AnimationMixer(model);
  const actions = { Idle: mixer.clipAction(idle), Walk: mixer.clipAction(walk), Run: mixer.clipAction(run) };
  let animation: CompanionAvatarSnapshot['animation'] = 'Idle';
  let disposed = false;
  let posed = false, cameraHidden = false;
  actions.Idle.play();
  mixer.update(0);
  const walkRate = options.walkRate ?? 1.5;
  const runRate = options.runRate ?? 1.25;

  return {
    root,
    update(position: THREE.Vector3, heading: number, speed: number, dt: number, reduced: boolean) {
      if (disposed || ![position.x, position.y, position.z, heading, speed].every(Number.isFinite)) return;
      root.position.copy(position);
      root.rotation.y = heading;
      posed = true;
      root.visible = !cameraHidden;
      const next = reduced || speed < .05 ? 'Idle' : speed > 4 ? 'Run' : 'Walk';
      if (next !== animation) {
        const old = actions[animation], action = actions[next];
        action.reset().play();
        if (reduced) { old.stop(); action.setEffectiveWeight(1); }
        else old.crossFadeTo(action, .18, false);
        animation = next;
      }
      const rate = next === 'Run' ? runRate : walkRate;
      const baseSpeed = next === 'Run' ? RUN_SPEED : WALK_SPEED;
      const pace = next === 'Idle' ? 1 : THREE.MathUtils.clamp(rate * speed / baseSpeed, .35, rate * 1.8);
      actions[next].setEffectiveTimeScale(pace);
      const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(.15, dt)) : 0;
      mixer.update(reduced ? 0 : seconds);
    },
    setCameraPosition(eye: THREE.Vector3) {
      if (disposed || !posed || ![eye.x, eye.y, eye.z].every(Number.isFinite)) return;
      const low = root.position.y + .3;
      const high = root.position.y + Math.max(.3, restHeight ?? 1.8);
      const nearestY = THREE.MathUtils.clamp(eye.y, low, high);
      const distance = Math.hypot(eye.x-root.position.x, eye.y-nearestY, eye.z-root.position.z);
      if (distance < 1) cameraHidden = true;
      else if (distance > 1.25) cameraHidden = false;
      root.visible = !cameraHidden;
    },
    inspect(): CompanionAvatarSnapshot {
      return { visible: root.visible && !disposed, animation, time: actions[animation].time,
        position: root.position.toArray(), heading: root.rotation.y, restHeight,
        playbackRate: actions[animation].getEffectiveTimeScale() };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.visible = false;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      for (const skeleton of skeletons) skeleton.dispose();
      skeletons.clear();
      root.removeFromParent();
      root.clear();
      model.clear();
    },
  };
}
