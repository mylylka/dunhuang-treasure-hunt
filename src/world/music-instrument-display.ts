import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { worldAssetUrl } from '../content/world/assets';
import { fromTerrainPoint } from '../content/world/terrain-layout-v001';
import {
  isMusicInstrumentDisplayApproach, MUSIC_INSTRUMENT_DISPLAY_GROUPS, musicInstrumentAtPoint,
  type MusicInstrumentDisplayGroup,
} from '../content/world/music-instrument-display-layout-v001';
import type { MusicInstrumentId } from '../content/world/music-instruments-v001';
import type { WorldPoint } from './types';

type DisplayStatus = 'idle' | 'loading' | 'ready' | 'failed';
type GroupEntry = { spec: MusicInstrumentDisplayGroup; root: THREE.Group; status: DisplayStatus };
type ModelLoader = (path: string, signal: AbortSignal) => Promise<THREE.Object3D>;
const FOLDER = 'music-instrument-display/v001';

async function loadModel(path: string, signal: AbortSignal) {
  const url = new URL(worldAssetUrl(path), document.baseURI);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('music-instrument-model-request-failed');
  const bytes = await response.arrayBuffer();
  if (signal.aborted) throw new Error('music-instrument-model-cancelled');
  return (await new GLTFLoader().parseAsync(bytes, new URL('.', url).href)).scene;
}

function releaseModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const item of geometries) item.dispose();
  for (const item of materials) item.dispose();
  for (const item of textures) {
    if (typeof ImageBitmap !== 'undefined' && item.source.data instanceof ImageBitmap) item.source.data.close();
    item.dispose();
  }
  root.removeFromParent();
}

function isVisibleHit(hit: THREE.Intersection, ignored?: THREE.Object3D) {
  if (!(hit.object instanceof THREE.Mesh)) return false;
  for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
    if (!object.visible || object === ignored || object.name === 'mural-awakening-mist') return false;
  }
  const material = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
  return !!material?.visible && material.opacity > .02;
}

/** Parent coordinates are the music pavilion's source metres. */
export function createMusicInstrumentDisplay(parent: THREE.Object3D, options: {
  mobile?: boolean;
  onChange?: () => void;
  onModelReady?: (model: THREE.Object3D) => void;
  load?: ModelLoader;
} = {}) {
  const root = new THREE.Group();
  root.name = 'music-instrument-display-v001';
  parent.add(root);
  const load = options.load ?? loadModel;
  const groups = MUSIC_INSTRUMENT_DISPLAY_GROUPS.map((spec): GroupEntry => {
    const group = new THREE.Group();
    group.name = `music-instruments-${spec.id}`;
    group.position.set(...spec.position);
    group.rotation.y = spec.yaw;
    group.scale.setScalar(spec.scale);
    root.add(group);
    return { spec, root: group, status: 'idle' };
  });
  const roots = new Map(groups.map(group => [group.root as THREE.Object3D, group]));
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let controller: AbortController | null = null;
  let near = false, disposed = false, current: WorldPoint | null = null;

  function startNext() {
    if (disposed || !near || controller || !current) return;
    const { x, z } = current;
    const remaining = groups.filter(item => item.status === 'idle');
    const distance = (item: GroupEntry) => Math.hypot(item.spec.position[0] - x, item.spec.position[2] - z);
    const next = remaining.sort((a, b) => distance(a) - distance(b))[0];
    if (!next) return;
    const request = new AbortController();
    controller = request;
    const deadline = setTimeout(() => request.abort(), 35_000);
    next.status = 'loading';
    const path = `${FOLDER}/${next.spec.id}${options.mobile ? '-mobile' : ''}.glb`;
    void load(path, request.signal).then(model => {
      if (disposed || request.signal.aborted) {
        releaseModel(model);
        if (!disposed) next.status = 'failed';
        return;
      }
      let hasMesh = false;
      model.traverse(object => {
        if (object instanceof THREE.Mesh && object.geometry.getAttribute('position')?.count) {
          hasMesh = true;
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      if (!hasMesh) {
        releaseModel(model);
        next.status = 'failed';
        return;
      }
      try {
        options.onModelReady?.(model);
      } catch (error) {
        releaseModel(model);
        throw error;
      }
      next.root.add(model);
      next.status = 'ready';
    }).catch(() => {
      if (!disposed) next.status = 'failed';
    }).finally(() => {
      clearTimeout(deadline);
      controller = null;
      if (!disposed) { options.onChange?.(); startNext(); }
    });
  }

  function retry() {
    if (disposed || !near) return;
    for (const group of groups) if (group.status === 'failed') group.status = 'idle';
    startNext();
  }

  return {
    update(position: WorldPoint, surfaceId?: string | null) {
      const approaching = isMusicInstrumentDisplayApproach(surfaceId);
      if (disposed || (!approaching && !near)) return;
      current = approaching ? fromTerrainPoint('music', position) : null;
      const entered = approaching && !near;
      near = approaching;
      if (entered) retry();
    },
    retry,
    isReady: () => !disposed && groups.every(group => group.status === 'ready'),
    hasFailure: () => near && !disposed && groups.some(group => group.status === 'failed'),
    pick(scene: THREE.Object3D, camera: THREE.Camera, point: { x: number; y: number }, surfaceId?: string | null,
      ignored?: THREE.Object3D): MusicInstrumentId | null {
      if (disposed || surfaceId !== 'music-floor-2' || !groups.some(group => group.status === 'ready') ||
          !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1 || Math.abs(point.y) > 1) return null;
      scene.updateMatrixWorld(true);
      camera.updateWorldMatrix(true, false);
      ray.layers.mask = camera.layers.mask;
      ray.setFromCamera(ndc.set(point.x, point.y), camera);
      const hit = ray.intersectObject(scene, true).find(item => isVisibleHit(item, ignored));
      if (!hit) return null;
      for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
        const group = roots.get(object);
        if (group?.status === 'ready') return musicInstrumentAtPoint(group.spec, group.root.worldToLocal(hit.point));
      }
      return null;
    },
    inspect() {
      root.updateWorldMatrix(true, true);
      return {
        tier: options.mobile ? 'mobile' : 'desktop',
        groups: groups.map(group => ({
          id: group.spec.id, status: group.status, position: group.root.getWorldPosition(new THREE.Vector3()).toArray(),
          front: group.root.getWorldDirection(new THREE.Vector3()).toArray(),
          targets: group.spec.targets.map(target => ({
            id: target.id, center: group.root.localToWorld(new THREE.Vector3(...target.aim)).toArray(),
          })),
        })),
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller?.abort();
      releaseModel(root);
      root.clear();
    },
  };
}

export type MusicInstrumentDisplay = ReturnType<typeof createMusicInstrumentDisplay>;
