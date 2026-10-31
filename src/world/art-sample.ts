import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { WORLD_ART_SAMPLE, worldAssetUrl } from '../content/world/assets';
import { createGrayboxScene, type GrayboxScene } from './geometry';
import { RUN_SPEED, WALK_SPEED } from './movement';
import { createPreviewPaving } from './preview-paving';
import { createMusicPavilion } from './music-pavilion';
import { MUSIC_LAYOUT, MUSIC_ROAD } from './music-pavilion-rules';

type TravelerAction = 'Idle' | 'Walk' | 'Run' | 'Greeting' | 'HallLookUp';
export interface ArtSampleSceneOptions {
  /** Explicit isolated-preview override; normal game entry keeps the approved asset. */
  travelerPath?: string;
  /** Clip playback rate at the existing reference movement speeds. */
  animationRates?: { walk: number; run: number };
  presentationClips?: boolean;
  sampleNature?: boolean;
  musicPavilion?: boolean;
  flyingAwakened?: boolean;
}
export interface ArtSampleScene extends GrayboxScene {
  music: ReturnType<typeof createMusicPavilion> | null;
  ready: Promise<void>;
  animationName(): TravelerAction;
  animatePresentation(name: 'Greeting' | 'HallLookUp', time: number): void;
  inspectTraveler(): { animation: string; time: number; joints: { name: string; position: number[] }[] };
  updateCameraVisibility(target: THREE.Vector3, position: THREE.Vector3, dt: number, immediate: boolean): void;
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

export function createArtSampleScene(options: ArtSampleSceneOptions = {}): ArtSampleScene {
  const environment = createGrayboxScene({ artSample: true, musicPreview: options.musicPavilion });
  const music = options.musicPavilion ? createMusicPavilion(environment.scene, !!options.flyingAwakened) : null;
  const traveler = new THREE.Group(); traveler.name = 'traveler';
  environment.scene.add(traveler);
  let disposed = false;
  let mixer: THREE.AnimationMixer | null = null;
  let character: THREE.Object3D | null = null;
  let actionName: TravelerAction = 'Idle';
  let previousElapsed: number | null = null;
  const models: THREE.Object3D[] = [];
  const canopyMaterials = new Set<THREE.Material>();
  const canopies: { bounds: THREE.Box3; materials: THREE.Material[]; opacity: number }[] = [];
  const actions = new Map<TravelerAction, THREE.AnimationAction>();
  const loader = new GLTFLoader();
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function dispose() {
    if (disposed) return;
    disposed = true;
    music?.dispose();
    clearTimeout(timeout); controller.abort();
    if (mixer && character) { mixer.stopAllAction(); mixer.uncacheRoot(character); }
    actions.clear(); mixer = null; character = null;
    for (const model of models) releaseModel(model);
    models.length = 0;
    for (const material of canopyMaterials) material.dispose();
    canopyMaterials.clear(); canopies.length = 0;
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
    loadModel(options.travelerPath ?? WORLD_ART_SAMPLE.traveler),
    ...(options.sampleNature ? ['tree-a', 'shrub-a', 'dunes'].map(name => loadModel(`environment-sample/v002/${name}.glb`)) : []),
  ]);
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('model-loading-timeout')), 30_000);
  });
  // Fail promptly if either model fails; release/abort its sibling immediately.
  const ready = Promise.all([Promise.race([loading, deadline]), music?.ready]).then(([[courtyard, avatar, tree, shrub, dunes]]) => {
    if (disposed) return;
    const required: TravelerAction[] = ['Idle', 'Walk', 'Run'];
    if (options.presentationClips) required.push('Greeting', 'HallLookUp');
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
    if (options.sampleNature) {
      environment.scene.traverse(object => {
        const name = String(object.userData.semanticGroup ?? object.name);
        if (/^(tree-|shrub-|road-grass|dune-|cliff-|boundary-)/.test(name)) object.visible = false;
      });
      for (const model of [tree, shrub, dunes]) {
        model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
        environment.scene.add(model.scene);
      }
      tree.scene.position.set(4.8, 0, 13); shrub.scene.position.set(-2.9, 0, 16.2);
      dunes.scene.position.set(55, 0, 12); dunes.scene.rotation.y = -Math.PI / 2;
      const paving = createPreviewPaving(); models.push(paving); environment.scene.add(paving);
      if (options.musicPavilion) {
        // Geometry and materials stay shared with the approved A assets. The
        // source model remains their one resource owner, clones are scene-only.
        for (const [x,z,scale] of MUSIC_LAYOUT.trees) {
          const instance=tree.scene.clone(true);instance.position.set(x,0,z);instance.scale.setScalar(scale);environment.scene.add(instance);
        }
        for (const [x,z,scale] of MUSIC_LAYOUT.shrubs) {
          const instance=shrub.scene.clone(true);instance.position.set(x,0,z);instance.scale.setScalar(scale);environment.scene.add(instance);
        }
        const northDunes=dunes.scene.clone(true);northDunes.position.set(0,0,-65);northDunes.rotation.y=0;environment.scene.add(northDunes);
        const branch=createPreviewPaving(MUSIC_ROAD.filter(section=>section.center.z> -2.55),true);models.push(branch);environment.scene.add(branch);
      }
    }
    courtyard.scene.updateMatrixWorld(true);
    courtyard.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh) || (object.userData.cameraRole !== 'canopy' && !object.name.includes('-canopy'))) return;
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const materials = originals.map(material => {
        canopyMaterials.add(material);
        const copy = material.clone(); copy.transparent = true;
        return copy;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      canopies.push({ bounds: new THREE.Box3().setFromObject(object, true).expandByScalar(.2), materials, opacity: 1 });
    });
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
    scene: environment.scene, traveler, ready, music,
    animationName: () => actionName,
    animatePresentation(name, time) {
      if (!mixer) return;
      const action = actions.get(name);
      if (!action) throw new Error('Required character presentation clip is missing');
      if (actionName !== name) { mixer.stopAllAction(); action.reset().setLoop(THREE.LoopOnce, 1).play(); action.clampWhenFinished = true; actionName = name; }
      action.setEffectiveWeight(1); action.setEffectiveTimeScale(0); action.time = Math.min(time, action.getClip().duration); mixer.update(0);
    },
    inspectTraveler() {
      const joints: { name: string; position: number[] }[] = [];
      traveler.updateMatrixWorld(true);
      traveler.traverse(object => { if (object instanceof THREE.Bone && /(?:Head|RightHand|RightForeArm|Neck)$/.test(object.name)) joints.push({ name: object.name, position: object.getWorldPosition(new THREE.Vector3()).toArray() }); });
      return { animation: actionName, time: actions.get(actionName)?.time ?? 0, joints };
    },
    updateCameraVisibility(target, position, dt, immediate) {
      const direction = position.clone().sub(target);
      const distance = direction.length();
      const ray = new THREE.Ray(target, direction.normalize());
      const hit = new THREE.Vector3();
      for (const canopy of canopies) {
        const intersects = ray.intersectBox(canopy.bounds, hit);
        const obscures = canopy.bounds.containsPoint(position) || !!intersects && target.distanceTo(hit) < distance + .3;
        const desired = obscures ? .12 : 1;
        canopy.opacity = immediate ? desired : THREE.MathUtils.lerp(canopy.opacity, desired, 1 - Math.exp(-dt * 14));
        for (const material of canopy.materials) { material.opacity = canopy.opacity; material.depthWrite = canopy.opacity > .98; }
      }
    },
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
      const rate = next === 'Walk' ? options.animationRates?.walk ?? 1.5 : options.animationRates?.run ?? 1.25;
      const pace = next === 'Walk' ? rate * speed / WALK_SPEED : next === 'Run' ? rate * speed / RUN_SPEED : 1;
      const maxPace = options.animationRates ? rate * 1.8 : 1.8;
      actions.get(next)!.setEffectiveTimeScale(next === 'Idle' ? 1 : THREE.MathUtils.clamp(pace, .35, maxPace));
      mixer.update(reduced ? 0 : dt);
    },
    dispose,
  };
}
