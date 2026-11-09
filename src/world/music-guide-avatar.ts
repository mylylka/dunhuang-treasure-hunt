import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { MusicGuideLineId, MusicGuideOutfitId } from '../content/world/music-guide-v001';
import type { CompanionAvatarSnapshot } from './companion-avatar';
import { createMusicGuideGestures } from './music-guide-gestures';

export interface MusicGuideAvatarPresentation {
  line: MusicGuideLineId | null;
}

const required = ['Idle', 'Walk', 'Run', 'Talk'] as const;
type Action = (typeof required)[number] | 'Welcome';
type Rig = ReturnType<typeof makeRig>;

export interface PreparedMusicGuideOutfit {
  model: THREE.Object3D;
  commit(beforeRelease?: () => void): boolean;
  discard(): void;
}

// Natural speeds from the root travel removed in the v001 asset manifest.
const strideSpeed: Record<MusicGuideOutfitId, { Walk: number; Run: number }> = {
  plain: { Walk: .9562, Run: 3.4850 },
  'northern-wei': { Walk: .9434, Run: 3.4380 },
  'western-wei': { Walk: .9682, Run: 3.5287 },
  'late-tang': { Walk: 1.0029, Run: 3.6550 },
  'five-dynasties': { Walk: 1.0383, Run: 3.7841 },
  yuan: { Walk: .8052, Run: 2.9345 },
};

export function isMusicGuideAvatarModel(id: MusicGuideOutfitId, model: GLTF): boolean {
  const hasClip = (name: Action) => model.animations.some(clip => clip.name === name &&
    Number.isFinite(clip.duration) && clip.duration > 0 && clip.tracks.length > 0);
  if (!required.every(hasClip) || (id === 'plain' && !hasClip('Welcome'))) return false;
  let skinned = false;
  model.scene.traverse(object => {
    if (!(object instanceof THREE.SkinnedMesh) || !object.skeleton.bones.length ||
      !object.geometry.getAttribute('position')?.count) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    skinned ||= materials.some(material => material instanceof THREE.MeshStandardMaterial && !!material.map);
  });
  return skinned;
}

function makeRig(id: MusicGuideOutfitId, source: GLTF) {
  const model = source.scene;
  model.name = `music-guide-outfit-${id}`;
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.userData.excludeEnvironmentShadowBake = true;
    object.castShadow = false;
    object.receiveShadow = true;
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<Action, THREE.AnimationAction>();
  for (const clip of source.animations) {
    const action = clip.name as Action;
    if (!required.includes(action as (typeof required)[number]) && action !== 'Welcome') continue;
    const instance = mixer.clipAction(clip);
    if (action === 'Welcome') {
      instance.setLoop(THREE.LoopOnce, 1);
      instance.clampWhenFinished = true;
    }
    actions.set(action, instance);
  }
  actions.get('Idle')!.play();
  mixer.update(0);
  model.updateMatrixWorld(true);
  const height = new THREE.Box3().setFromObject(model, true).max.y;
  const restHeight = Number.isFinite(height) && height > 0 ? height : 1.8;
  return { id, source, model, mixer, actions, restHeight, action: 'Idle' as Action,
    gestures: createMusicGuideGestures(model, id) };
}

function play(rig: Rig, next: Action, snap: boolean) {
  if (rig.action === next) return;
  const previous = rig.actions.get(rig.action)!;
  const action = rig.actions.get(next)!;
  if (snap) rig.mixer.stopAllAction();
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if (!snap) previous.crossFadeTo(action, .18, false);
  rig.action = next;
}

export function createMusicGuideAvatar(initial: GLTF, release: (root: THREE.Object3D) => void) {
  if (!isMusicGuideAvatarModel('plain', initial)) throw new Error('music-guide-avatar-incomplete');
  const root = new THREE.Group();
  root.name = 'music-guide';
  root.visible = false;
  const plain = makeRig('plain', initial);
  let rig = plain;
  root.add(rig.model);
  let disposed = false, posed = false, cameraHidden = false;
  let line: MusicGuideLineId | null = null, lineSeconds = 0;

  function detachRig(value: Rig) {
    value.gestures?.reset();
    value.mixer.stopAllAction();
    value.mixer.uncacheRoot(value.model);
    value.model.removeFromParent();
  }

  function disposeRig(value: Rig) {
    detachRig(value);
    release(value.model);
  }

  function replacement(id: MusicGuideOutfitId, model?: GLTF) {
    if (disposed || (id === 'plain' && model && model !== initial)) return null;
    if (id !== 'plain') {
      if (!model || model === initial || model === rig.source || !isMusicGuideAvatarModel(id, model)) return null;
      return makeRig(id, model);
    }
    plain.gestures?.reset();
    play(plain, 'Idle', true);
    plain.mixer.update(0);
    return plain;
  }

  function install(next: Rig, beforeRelease?: () => void) {
    const previous = rig;
    const parent = previous.model.parent;
    const matrix = previous.model.matrix.clone();
    const position = previous.model.position.clone();
    const quaternion = previous.model.quaternion.clone();
    const scale = previous.model.scale.clone();
    root.add(next.model);
    rig = next;
    previous.model.removeFromParent();
    root.updateMatrixWorld(true);
    try {
      beforeRelease?.();
    } catch (error) {
      next.model.removeFromParent();
      rig = previous;
      parent?.add(previous.model);
      previous.model.position.copy(position);
      previous.model.quaternion.copy(quaternion);
      previous.model.scale.copy(scale);
      previous.model.matrix.copy(matrix);
      root.updateMatrixWorld(true);
      throw error;
    }
    if (previous !== plain) disposeRig(previous);
  }

  return {
    root,
    update(position: THREE.Vector3, heading: number, speed: number, dt: number, reduced: boolean,
      presentation?: MusicGuideAvatarPresentation) {
      if (disposed || ![position.x, position.y, position.z, heading, speed].every(Number.isFinite)) return;
      root.position.copy(position);
      root.rotation.y = heading;
      posed = true;
      const seconds = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, .15) : 0;
      const nextLine = presentation?.line ?? null;
      if (nextLine !== line) { line = nextLine; lineSeconds = 0; }
      root.visible = !cameraHidden;
      let next: Action;
      if (reduced) next = 'Idle';
      else if (line === 'welcome' && rig === plain && lineSeconds < plain.actions.get('Welcome')!.getClip().duration) next = 'Welcome';
      else if (speed >= .05) next = speed > 4 ? 'Run' : 'Walk';
      else if (line) next = 'Talk';
      else next = 'Idle';
      if (line) lineSeconds += seconds;
      // The mixer may skip unchanged tracks, so undo last frame's additive arm pose first.
      rig.gestures?.restore();
      play(rig, next, reduced);
      const pace = next === 'Walk' || next === 'Run'
        ? THREE.MathUtils.clamp(speed / strideSpeed[rig.id][next], .35, 3.7) : 1;
      rig.actions.get(next)!.setEffectiveTimeScale(pace);
      rig.mixer.update(reduced ? 0 : seconds);
      if (reduced || line === 'welcome') rig.gestures?.reset();
      else {
        // Keep most of the authored stride while the guide speaks on the move.
        const gestureWeight = next === 'Talk' ? 1 : next === 'Walk' && line ? .20 : 0;
        rig.gestures?.update(gestureWeight, seconds);
      }
    },
    setCameraPosition(eye: THREE.Vector3) {
      if (disposed || !posed || ![eye.x, eye.y, eye.z].every(Number.isFinite)) return;
      const y = THREE.MathUtils.clamp(eye.y, root.position.y + .3, root.position.y + rig.restHeight);
      const distance = Math.hypot(eye.x - root.position.x, eye.y - y, eye.z - root.position.z);
      if (distance < 1) cameraHidden = true;
      else if (distance > 1.25) cameraHidden = false;
      root.visible = !cameraHidden;
    },
    inspect(): CompanionAvatarSnapshot & {
      outfit: MusicGuideOutfitId; action: Action; line: MusicGuideLineId | null;
    } {
      const { action } = rig;
      const animation = action === 'Walk' || action === 'Run' ? action : 'Idle';
      const active = rig.actions.get(action)!;
      let visible = false;
      if (root.visible && !disposed) rig.model.traverseVisible(object => { visible ||= object instanceof THREE.Mesh; });
      return { visible, animation, time: active.time, position: root.position.toArray(),
        heading: root.rotation.y, restHeight: rig.restHeight, playbackRate: active.getEffectiveTimeScale(),
        outfit: rig.id, action, line };
    },
    prepareOutfit(id: MusicGuideOutfitId, model?: GLTF): PreparedMusicGuideOutfit | null {
      const previous = rig;
      if (id === previous.id) return null;
      const next = replacement(id, model);
      if (!next) return null;
      let committed = false, discarded = false;
      return {
        model: next.model,
        commit(beforeRelease?: () => void) {
          if (disposed || committed || discarded || rig !== previous) return false;
          install(next, beforeRelease);
          committed = true;
          return true;
        },
        discard() {
          if (committed || discarded) return;
          discarded = true;
          if (next !== plain) detachRig(next);
        },
      };
    },
    /** Ownership transfers only after the new rig is installed successfully. */
    replace(id: MusicGuideOutfitId, model?: GLTF, beforeRelease?: () => void): boolean {
      if (disposed) return false;
      if (id === rig.id && (!model || model === rig.source)) return true;
      const next = replacement(id, model);
      if (!next) return false;
      try {
        install(next, beforeRelease);
      } catch (error) {
        if (next !== plain) detachRig(next);
        throw error;
      }
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.visible = false;
      if (rig !== plain) disposeRig(rig);
      disposeRig(plain);
      root.removeFromParent();
      root.clear();
    },
  };
}
