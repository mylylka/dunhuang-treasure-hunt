import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD_ART_SAMPLE, worldAssetUrl } from '../content/world/assets';
import { createGrayboxScene, type GrayboxScene } from './geometry';
import { RUN_SPEED, WALK_SPEED } from './movement';

type TravelerAction = 'Idle' | 'Walk' | 'Run';
export interface ArtSampleScene extends GrayboxScene {
  ready: Promise<void>;
  animationName(): TravelerAction;
}

/** One scene owns every loaded model, including results delivered after unmount. */
function releaseModel(model: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  const images = new Set<ImageBitmap>();
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) images.add(texture.source.data);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
  model.removeFromParent(); model.clear();
}

export function createArtSampleScene(): ArtSampleScene {
  const environment = createGrayboxScene({ artSample: true });
  const traveler = new THREE.Group(); traveler.name = 'traveler';
  environment.scene.add(traveler);
  let disposed = false;
  let mixer: THREE.AnimationMixer | null = null;
  let character: THREE.Object3D | null = null;
  let actionName: TravelerAction = 'Idle';
  let previousElapsed: number | null = null;
  const models: THREE.Object3D[] = [];
  const actions = new Map<TravelerAction, THREE.AnimationAction>();
  const loader = new GLTFLoader();
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(timeout); controller.abort();
    if (mixer && character) { mixer.stopAllAction(); mixer.uncacheRoot(character); }
    actions.clear(); mixer = null; character = null;
    for (const model of models) releaseModel(model);
    models.length = 0;
    environment.dispose();
  }
  async function loadModel(path: string): Promise<GLTF> {
    const url = new URL(worldAssetUrl(path), document.baseURI);
    const response = await fetch(url, { signal: controller.signal });
    // Never include server response text in a player-visible error.
    if (!response.ok) throw new Error('model-request-failed');
    const bytes = await response.arrayBuffer();
    if (disposed || controller.signal.aborted) throw new Error('model-request-cancelled');
    const model = await loader.parseAsync(bytes, new URL('.', url).href);
    // Image decoding may finish after abort. Each result has its own owner check.
    if (disposed || controller.signal.aborted) {
      releaseModel(model.scene);
      throw new Error('model-decode-cancelled');
    }
    models.push(model.scene);
    return model;
  }
  const loading = Promise.all([
    loadModel(WORLD_ART_SAMPLE.courtyard),
    loadModel(WORLD_ART_SAMPLE.traveler),
  ]);
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('model-loading-timeout')), 30_000);
  });
  // Fail promptly if either model fails; release/abort its sibling immediately.
  const ready = Promise.race([loading, deadline]).then(([courtyard, avatar]) => {
    if (disposed) return;
    const required: TravelerAction[] = ['Idle', 'Walk', 'Run'];
    if (required.some(name => !avatar.animations.some(clip => clip.name === name))) {
      throw new Error('model-animation-incomplete');
    }
    for (const model of [courtyard, avatar]) {
      model.scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true; object.receiveShadow = true;
      });
    }
    courtyard.scene.position.set(-12, 0, 2);
    environment.scene.add(courtyard.scene);
    character = avatar.scene; traveler.add(character);
    mixer = new THREE.AnimationMixer(character);
    for (const name of required) actions.set(name, mixer.clipAction(avatar.animations.find(clip => clip.name === name)!));
    actions.get('Idle')!.play();
    mixer.update(0);
    clearTimeout(timeout);
  }).catch(() => {
    dispose();
    throw new Error('美术模型加载失败。请重新加载，或直接选择文化主题。');
  });
  return {
    scene: environment.scene, traveler, ready,
    animationName: () => actionName,
    animateTraveler(speed, elapsed, reduced) {
      const dt = previousElapsed === null ? 0 : Math.min(.05, Math.max(0, elapsed - previousElapsed));
      previousElapsed = elapsed;
      if (!mixer) return;
      const next: TravelerAction = reduced || speed < .05 ? 'Idle' : speed > 4 ? 'Run' : 'Walk';
      if (next !== actionName) {
        const old = actions.get(actionName)!;
        const action = actions.get(next)!;
        action.reset().play();
        if (reduced) { old.stop(); action.setEffectiveWeight(1); }
        else old.crossFadeTo(action, .18, false);
        actionName = next;
      }
      const pace = next === 'Walk' ? 1.5 * speed / WALK_SPEED : next === 'Run' ? 1.25 * speed / RUN_SPEED : 1;
      actions.get(next)!.setEffectiveTimeScale(next === 'Idle' ? 1 : THREE.MathUtils.clamp(pace, .35, 1.8));
      mixer.update(reduced ? 0 : dt);
    },
    dispose,
  };
}
