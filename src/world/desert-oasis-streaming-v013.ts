import * as THREE from 'three';
import { DESERT_OASIS_PLACEMENTS, type OasisPlacement } from '../content/world/desert-oasis-layout-v013';
import { oasisModelV013 } from '../content/world/desert-oasis-assets-v013';
import { LAKE_BOUNDS } from '../content/world/terrain-layout-v001';
import { environmentSurfaceHeight } from '../content/world/environment-layout-v001';
import { terrainSurfaceHeight } from './terrain-rules-v001';
import { createOasisRidgeV014 } from './desert-oasis-ridge-v014';
import { createOasisRouteView } from './desert-oasis-route-v013';
import { installOasisMaterial, oasisBareBranches, oasisToneIndex } from './desert-oasis-material-v013';

interface OasisWorld {
  scene: THREE.Scene;
  mobile: boolean;
  firstGalleryVista?: boolean;
  load(path: string, signal: AbortSignal, priority?: RequestPriority): Promise<THREE.Object3D>;
  receiveShadows(root: THREE.Object3D): void;
  forgetMeshes(root: THREE.Object3D): void;
  release(root: THREE.Object3D): void;
  refreshShadows(): void;
}
type Detail = 'near' | 'mid' | 'lod';
interface Plant {
  index: number;
  item: OasisPlacement;
  bounds: THREE.Sphere;
  base: number;
  distance: number;
  priority: number;
  nearRange: number;
  midRange: number;
}
interface Draw {
  mesh: THREE.InstancedMesh;
  tones: THREE.InstancedBufferAttribute;
  triangles: number;
  indices: number[];
}
interface Model {
  source: THREE.Object3D;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  normalize: THREE.Matrix4;
  draws: Map<boolean, Draw>;
  lastSeen: number;
}
interface Selection { plant: Plant; level: Detail; }
type Point = { x: number; z: number };
interface ModelRequest {
  controller: AbortController;
  done: Promise<void>;
  lastWanted: number;
  speculative: boolean;
}

const assetKey = (id: string, level: Detail) => id + ':' + level;
const drawKey = (s: Selection) => assetKey(s.plant.item.id, s.level) + (s.plant.item.tone === 'bare' ? ':bare' : '');

// Keep capacity for the connected world's existing standalone rocks.
const MOBILE_DRAWS = 18;
const MOBILE_TRIANGLES = 28_000;
const MOBILE_BASE_DRAWS = 17;
const MOBILE_TREE_DETAIL_RESERVE = 9_000;
const KEEP_MODEL_MS = 12_000;
const SHADOW_INTERVAL_MS = 900;
const SMALL_ROCKS = new Set(['r02', 'r04', 'R05_碎石小群', 'r01', 'valley-fractured-slab']);

export function inOasisRidgeApproach(position: Point) {
  const nearLake = position.x >= LAKE_BOUNDS.minX-40 && position.x <= LAKE_BOUNDS.maxX+40
    && position.z >= LAKE_BOUNDS.minZ-40 && position.z <= LAKE_BOUNDS.maxZ+40;
  return nearLake || (position.x <= 278 && position.z >= -135 && position.z <= 100);
}

export function createDesertOasisStreaming(world: OasisWorld) {
  const root = new THREE.Group();
  root.name = 'desert-oasis-v013';
  root.matrixAutoUpdate = false;
  world.scene.add(root);
  const route = createOasisRouteView(world.scene, world.firstGalleryVista);
  const capacity = new Map<string, number>();
  const plants: Plant[] = DESERT_OASIS_PLACEMENTS.map((item, index) => {
    const model = oasisModelV013(item.id);
    const widthScale = item.id === 'w01b' ? 1.18 : 1;
    const radius = .5 * item.height * Math.hypot(widthScale * model.width / model.height, 1, widthScale * model.depth / model.height);
    const base = item.baseY ?? ((item.x > 420 ? environmentSurfaceHeight(item.x, item.z) : terrainSurfaceHeight(item)) - item.burial);
    capacity.set(item.id, (capacity.get(item.id) ?? 0) + 1);
    return {
      index, item, base, distance: 0, priority: 0,
      bounds: new THREE.Sphere(new THREE.Vector3(item.x, base + item.height / 2, item.z), radius),
      nearRange: model.url === model.lodUrl ? 0 : world.mobile ? Math.max(8, item.height * 2.6) : Math.max(32, item.height * 8),
      midRange: model.midUrl ? Math.max(35, item.height * (world.mobile ? 7 : 17)) : 0,
    };
  });
  const models = new Map<string, Model>();
  const ridge = createOasisRidgeV014(world, plants.map(p => p.base), plants.map(p=>p.bounds),
    id => models.get(assetKey(id,'near')),
    id => load(assetKey(id,'near'),performance.now(),false,'auto'));
  let ridgeChanged = false, ridgeRequested = false;
  // Returning directly to the tower should reserve the opening bandwidth for
  // that gallery. Prime the valley when a traveler approaches the lake again.
  function needsRidge(position: Point) {
    ridgeRequested ||= inOasisRidgeApproach(position);
    return ridgeRequested;
  }
  const retryAt = new Map<string, number>();
  const active = new Map<string, number[]>();
  const frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), lastProjection = new THREE.Matrix4();
  const sphere = new THREE.Sphere(), transform = new THREE.Object3D(), instanceMatrix = new THREE.Matrix4();
  let courtVisible = false, dirty = true, disposed = false, shadowDirty = false;
  let lastUpdate = -Infinity, lastShadow = -Infinity, shadowChangedAt = -Infinity, lastX = Infinity, lastZ = Infinity;
  const requests = new Map<string, ModelRequest>();
  let forwardModels: string[] = [];
  let courtWarmup: readonly string[] = [];
  let motionSample: (Point & { time: number }) | null = null;
  let forwardPoint: Point | undefined;
  let admission: 'idle' | 'priority' | 'scenery' | 'opening' | 'paused' = 'paused';
  let selections: Selection[] = [];
  let wanted: string[] = [];
  let coarseWanted: string[] = [];
  let firstGroundModels: string[] = [];

  // Only these two compact, visible models can load alongside distant scenery.
  // A single shrub prototype can establish a whole stand before the trees arrive.
  function chooseFirstGroundModels() {
    const close = selections.filter(({plant}) => plant.distance < 55 && frustum.intersectsSphere(plant.bounds));
    const stones = close.find(({plant}) => ['r02','r04','R05_碎石小群'].includes(plant.item.id))
      ?? close.find(({plant}) => SMALL_ROCKS.has(plant.item.id));
    const leaves = close.find(({plant}) => plant.item.id === 'shrub-2')
      ?? close.find(({plant}) => plant.item.height < 1.3 && oasisModelV013(plant.item.id).lodTriangles <= 8);
    return [stones, leaves].flatMap(s => s ? [assetKey(s.plant.item.id, 'lod')] : []);
  }

  function triangleCost(s: Selection) {
    const { id, tone } = s.plant.item;
    const known = models.get(assetKey(id, s.level))?.draws.get(tone === 'bare');
    if (known) return known.triangles;
    const asset = oasisModelV013(id);
    if (s.level === 'near') return asset.triangles;
    return s.level === 'mid' ? asset.midTriangles! : asset.lodTriangles;
  }

  function sampleForwardPoint(position: Point, now: number): Point | undefined {
    const previous = motionSample;
    motionSample = { ...position, time: now };
    if (!previous) return;
    const seconds = (now - previous.time) / 1000;
    if (seconds <= 0 || seconds > 1) return;
    const dx = position.x - previous.x, dz = position.z - previous.z;
    const speed = Math.hypot(dx, dz) / seconds;
    // Ignore suspended frames and position restores. The terrain sprint is 7 m/s.
    if (speed < .4 || speed > 9) return;
    return { x: position.x + 4 * dx / seconds, z: position.z + 4 * dz / seconds };
  }

  function select(camera: THREE.PerspectiveCamera, x: number, z: number, ahead?: Point) {
    const upcoming = new Map<string, number>();
    const candidates: Plant[] = [];
    frustum.setFromProjectionMatrix(viewProjection, camera.coordinateSystem, camera.reversedDepth);
    for (const plant of plants) {
      const { item, bounds } = plant;
      if (item.id === '大树9' && !courtVisible) continue;
      if (ahead && item.id !== '大树9') {
        const dx = item.x - ahead.x, dz = item.z - ahead.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 14 * 14) {
          const key = assetKey(item.id, 'lod');
          if (d2 < (upcoming.get(key) ?? Infinity)) upcoming.set(key, d2);
        }
      }
      if (ridge.owns(plant.index) || !route.allowsDetail(plant.index)) continue;
      const distance = Math.hypot(item.x - x, item.z - z);
      const horizon = item.height > 2 ? 310 : world.mobile ? 92 : 158;
      if (distance > horizon + bounds.radius) continue;
      // Include nearby/offscreen casters whose shadow extends into the picture.
      sphere.copy(bounds);
      sphere.radius += 1.74 * item.height + 1;
      if (!frustum.intersectsSphere(sphere)) continue;
      plant.distance = distance;
      // These exposed rock faces and the two tall landmark trunks establish
      // the approved composition even when more minor species exceed the phone budget.
      const featureRock = (item.id === 'r02' || item.id === 'r04' || item.id === 'valley-fractured-slab') && item.height >= .58;
      const landmark = item.height >= 12.5;
      const visible = frustum.intersectsSphere(bounds);
      const emphasis = world.mobile && (featureRock || landmark) ? .23 : 1;
      // Ordinary poplars keep quite detailed branches even in their far mesh.
      // On a phone, close low plants take precedence over those distant trees.
      const distantPoplar = world.mobile && distance > 22 && !landmark && (item.id === 't02' || item.id === 't03');
      plant.priority = distance * emphasis * (visible ? 1 : 2.7) * (distantPoplar ? 2.5 : 1) / Math.max(.85, Math.sqrt(item.height));
      candidates.push(plant);
    }
    forwardModels = [...upcoming].sort((a, b) => a[1] - b[1]).slice(0, 2).map(([key]) => key);
    candidates.sort((a,b) => a.priority - b.priority || a.index - b.index);
    if (!world.mobile) {
      return candidates.map(plant => {
        const level: Detail = plant.nearRange > 0 && plant.distance <= plant.nearRange ? 'near'
          : plant.midRange > 0 && plant.distance <= plant.midRange ? 'mid' : 'lod';
        return { plant, level };
      });
    }
    // Establish the overall composition cheaply; upgrade the closest silhouettes
    // using the remaining budget. A single model/material can carry many positions.
    const routeCost = route.cost();
    const triangleLimit = Math.max(0, MOBILE_TRIANGLES - routeCost.triangles);
    const drawLimit = Math.max(0, MOBILE_DRAWS - routeCost.draws);
    const baseDrawLimit = Math.max(0, MOBILE_BASE_DRAWS - routeCost.draws);
    const result: Selection[] = [], deferred: Selection[] = [], counts = new Map<string, number>();
    const closeTrees = candidates.filter(p => p.midRange > 0 && p.distance <= p.midRange && frustum.intersectsSphere(p.bounds))
      .sort((a,b) => a.distance - b.distance).slice(0, 2);
    const treeCost = closeTrees.reduce((sum,p) => sum + (oasisModelV013(p.item.id).midTriangles ?? 0), 0);
    const coarseBudget = triangleLimit - Math.min(MOBILE_TREE_DETAIL_RESERVE, treeCost);
    let cost = 0;
    for (const plant of candidates) {
      const s: Selection = { plant, level: 'lod' };
      const key = drawKey(s), n = counts.get(key) ?? 0, tris = triangleCost(s);
      if ((!n && counts.size >= baseDrawLimit) || cost + tris > coarseBudget) {
        deferred.push(s);
        continue;
      }
      counts.set(key, n + 1); cost += tris; result.push(s);
    }
    function upgrade(s: Selection, level: Detail) {
      const coarseKey = drawKey(s), n = counts.get(coarseKey)!;
      const detail: Selection = { plant: s.plant, level };
      const fineKey = drawKey(detail), increase = triangleCost(detail) - triangleCost(s);
      if (cost + increase > triangleLimit || (n > 1 && !counts.has(fineKey) && counts.size >= drawLimit)) return;
      if (n === 1) counts.delete(coarseKey); else counts.set(coarseKey, n-1);
      counts.set(fineKey, (counts.get(fineKey) ?? 0) + 1);
      cost += increase;
      s.level = level;
    }
    for (const p of closeTrees) {
      const selection = result.find(s => s.plant === p);
      if (selection) upgrade(selection, 'mid');
    }
    for (const s of result) {
      const p = s.plant;
      if (p.nearRange > 0 && p.distance <= p.nearRange) upgrade(s, 'near');
    }
    // Spend any unused upgrade budget on the remaining tufts and stones. This
    // preserves more of the valley floor even when only one tree needs a mid mesh.
    for (const s of deferred) {
      const key = drawKey(s), n = counts.get(key) ?? 0, tris = triangleCost(s);
      if ((!n && counts.size >= drawLimit) || cost + tris > triangleLimit) continue;
      counts.set(key, n + 1);
      cost += tris;
      result.push(s);
    }
    return result;
  }

  function newDraw(model: Model, id: string, level: Detail, bare: boolean) {
    const geometry = bare ? oasisBareBranches(model.mesh.geometry) : model.mesh.geometry;
    const max = capacity.get(id)!;
    const tones = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    geometry.setAttribute('oasisTone', tones);
    const mesh = new THREE.InstancedMesh(geometry, model.mesh.material, max);
    mesh.name = 'oasis-v013:' + assetKey(id,level) + (bare ? ':bare' : '');
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.raycast = () => {};
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    tones.setUsage(THREE.DynamicDrawUsage);
    root.add(mesh);
    const draw: Draw = { mesh, tones, triangles: (geometry.index?.count ?? geometry.attributes.position.count) / 3, indices: [] };
    model.draws.set(bare, draw);
    return draw;
  }

  function publish(now: number) {
    const next = new Map<string, number[]>();
    const detailedRoutePlants = new Set<number>();
    for (const s of selections) {
      const { item } = s.plant;
      let level = s.level;
      if (!models.has(assetKey(item.id,level))) {
        // Keep available lower detail on screen while its replacement loads. Phones
        // must not use a costlier fallback that exceeds their triangle budget.
        if (level === 'near' && models.has(assetKey(item.id,'mid'))) level = 'mid';
        else if (level !== 'lod') level = 'lod';
        else if (!world.mobile) level = models.has(assetKey(item.id,'mid')) ? 'mid' : 'near';
      }
      const model = models.get(assetKey(item.id,level));
      if (!model) continue;
      model.lastSeen = now;
      const key = drawKey({plant:s.plant,level});
      let indices = next.get(key);
      if (!indices) { indices = []; next.set(key, indices); }
      indices.push(s.plant.index);
      if (route.covers(s.plant.index)) detailedRoutePlants.add(s.plant.index);
    }
    for (const [key, indices] of next) {
      const [id, tier, bareSuffix] = key.split(':');
      const level = tier as Detail;
      const model = models.get(assetKey(id,level))!;
      const bare = bareSuffix === 'bare';
      const draw = model.draws.get(bare) ?? newDraw(model,id,level,bare);
      indices.sort((a,b) => a-b);
      if (indices.length === draw.indices.length && indices.every((v,i) => v === draw.indices[i])) continue;
      for (let n=0;n<indices.length;n++) {
        const { item, base } = plants[indices[n]];
        const widthScale = id === 'w01b' ? 1.18 : 1;
        transform.position.set(item.x, base, item.z);
        transform.rotation.set(0,item.yaw,0);
        transform.scale.set(item.height * widthScale, item.height, item.height * widthScale);
        transform.updateMatrix();
        draw.mesh.setMatrixAt(n, instanceMatrix.multiplyMatrices(transform.matrix,model.normalize));
        draw.tones.setX(n, oasisToneIndex[item.tone]);
      }
      draw.mesh.count = indices.length;
      draw.mesh.visible = true;
      draw.mesh.instanceMatrix.needsUpdate = true;
      draw.tones.needsUpdate = true;
      draw.mesh.boundingBox = null;
      draw.mesh.computeBoundingSphere();
      draw.indices = indices;
      shadowDirty = true; shadowChangedAt = now;
    }
    for (const key of active.keys()) {
      if (next.has(key)) continue;
      const [id,tier,bare] = key.split(':');
      const draw = models.get(assetKey(id,tier as Detail))?.draws.get(bare === 'bare');
      if (draw) { draw.indices = []; draw.mesh.count = 0; draw.mesh.visible = false; shadowDirty = true; shadowChangedAt = now; }
    }
    active.clear();
    for (const [key, indices] of next) active.set(key,indices);
    route.present(detailedRoutePlants,ridge.owns,ridgeChanged);
    ridgeChanged = false;
  }

  function release(model: Model) {
    for (const [bare,draw] of model.draws) {
      world.forgetMeshes(draw.mesh);
      draw.mesh.removeFromParent(); draw.mesh.dispose();
      if (bare) draw.mesh.geometry.dispose();
    }
    world.release(model.source);
  }

  function load(key: string, now: number, speculative = false, priority: RequestPriority = 'low'): Promise<void> {
    const previous = requests.get(key);
    if (previous) return previous.done;
    const controller = new AbortController();
    const done = Promise.resolve().then(() => fetchModel(key, controller, priority));
    requests.set(key, { controller, done, lastWanted: now, speculative });
    return done;
  }

  async function fetchModel(key: string, controller: AbortController, priority: RequestPriority) {
    const [id,level] = key.split(':');
    const info = oasisModelV013(id);
    const url = level === 'near' ? info.url : level === 'mid' ? info.midUrl! : info.lodUrl;
    const path = url.replace(/^assets\/world\//,'');
    const timeout = setTimeout(() => controller.abort('oasis-timeout'),20_000);
    try {
      if (controller.signal.aborted) return;
      const source = await world.load(path, controller.signal, priority);
      if (disposed || controller.signal.aborted) { world.release(source); return; }
      try {
        source.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        source.traverseVisible(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
        if (meshes.length !== 1 || !(meshes[0].material instanceof THREE.MeshStandardMaterial))
          throw new Error('Unexpected oasis mesh: '+id);
        const mesh = meshes[0] as Model['mesh'];
        const bounds = new THREE.Box3().setFromObject(source,true), size = bounds.getSize(new THREE.Vector3());
        if (!(size.y>0)) throw new Error('Empty oasis mesh: '+id);
        const center = bounds.getCenter(new THREE.Vector3());
        const normalize = new THREE.Matrix4().makeScale(1/size.y,1/size.y,1/size.y)
          .multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z)).multiply(mesh.matrixWorld);
        if (id==='大树9') {
          const attr = mesh.geometry.getAttribute('_treeexposure');
          if (!attr || attr.count !== mesh.geometry.attributes.position.count) throw new Error('Missing courtyard exposure');
          mesh.geometry.setAttribute('treeExposure',attr);
        }
        installOasisMaterial(mesh.material,id);
        world.receiveShadows(source);
        models.set(key,{source,mesh,normalize,draws:new Map(),lastSeen:performance.now()});
        retryAt.delete(key); dirty=true;
      } catch (error) {
        world.release(source); throw error;
      }
    } catch {
      if (!disposed && (!controller.signal.aborted || controller.signal.reason === 'oasis-timeout')) {
        retryAt.set(key,performance.now()+4000);
      }
    } finally {
      clearTimeout(timeout);
      if (requests.get(key)?.controller === controller) requests.delete(key);
    }
  }

  function setCourtVisibility(visible: boolean) {
    visible &&= !world.firstGalleryVista;
    if (disposed || courtVisible === visible) return;
    dirty = true;
    courtVisible = visible;
    if (visible) return;
    for (const [key, request] of requests) if (key.startsWith('大树9:')) request.controller.abort();
    let removedCaster = false;
    for (const level of ['near','lod'] as const) {
      const key = assetKey('大树9',level);
      const draw = models.get(key)?.draws.get(false);
      if (!draw?.mesh.visible) continue;
      draw.mesh.visible = false; draw.mesh.count = 0; draw.indices = [];
      active.delete(key); removedCaster = true;
    }
    if (removedCaster) world.refreshShadows();
  }

  function readProjection(camera: THREE.PerspectiveCamera) {
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  }

  function refreshSelection(camera: THREE.PerspectiveCamera, position: Point, now: number) {
    selections = select(camera, position.x, position.z, forwardPoint);
    wanted = [...new Set(selections.map(s => assetKey(s.plant.item.id, s.level)))];
    coarseWanted = [...new Set(selections.map(s => assetKey(s.plant.item.id, 'lod')))];
    firstGroundModels = chooseFirstGroundModels();
    publish(now);
    lastX = position.x; lastZ = position.z; lastProjection.copy(viewProjection); dirty = false;
  }

  async function prepareOpening(camera: THREE.PerspectiveCamera, position: Point, musicVisible: boolean) {
    if (disposed) return;
    admission = 'opening';
    setCourtVisibility(musicVisible);
    const now = performance.now();
    readProjection(camera);
    refreshSelection(camera, position, now);
    // Inside the courtyard the exit can be behind the camera. Warm the same
    // two nearby prototypes there, but publish only the current normal selection.
    const keys = [...firstGroundModels];
    const hasRock = keys.some(key => SMALL_ROCKS.has(key.split(':')[0]));
    const hasPlant = keys.some(key => !SMALL_ROCKS.has(key.split(':')[0]));
    const fallback = [!hasRock && 'R05_碎石小群', !hasPlant && 'shrub-2'];
    for (const id of fallback) {
      if (id && plants.some(({item}) => item.id === id && Math.hypot(position.x - item.x, position.z - item.z) < 55)) {
        keys.push(assetKey(id, 'lod'));
      }
    }
    await Promise.all(keys.map(async key => {
      if (models.has(key) || now < (retryAt.get(key) ?? 0)) return;
      await load(key, now, false, 'high');
      if (!disposed && admission !== 'paused' && models.has(key)) publish(performance.now());
    }));
    if (!disposed && admission === 'opening' && shadowDirty) {
      shadowDirty = false; lastShadow = performance.now(); world.refreshShadows();
    }
  }

  function pause() {
    ridge.suspend();
    admission = 'paused'; motionSample = null; forwardPoint = undefined; forwardModels = [];
    for (const request of requests.values()) request.controller.abort();
  }

  function update(camera: THREE.PerspectiveCamera, position: Point, busy: boolean, now: number, musicVisible: boolean, sceneryLoading = false, inSecondCourt = false) {
    if (disposed) return;
    admission = busy ? 'priority' : sceneryLoading ? 'scenery' : 'idle';
    if (busy) for (const [key,request] of requests) if (!ridge.pinned(key)) request.controller.abort();
    setCourtVisibility(musicVisible);
    if (now-lastUpdate < 110) return;
    lastUpdate=now;
    if (route.update(position, inSecondCourt, musicVisible)) dirty = true;
    // Keep these few shared far meshes on the way out as well: walking from
    // the music court to the tower takes longer than the normal cache lifetime.
    courtWarmup = route.backgroundModels();
    const wasMoving = !!forwardPoint;
    forwardPoint = sampleForwardPoint(position, now);
    readProjection(camera);
    ridge.resume();
    if (needsRidge(position)) {
      void ridge.prepare();
      if (ridge.update(route.ridgeActive(),position,camera)) { ridgeChanged=true; dirty=true; }
    }
    if (ridge.takeShadowChange()) { ridgeChanged=true; dirty=true; shadowDirty=true; shadowChangedAt=now; }
    if (dirty || forwardPoint || wasMoving || Math.hypot(position.x-lastX,position.z-lastZ)>.45 || !viewProjection.equals(lastProjection))
      refreshSelection(camera, position, now);
    for (const key of [...wanted, ...coarseWanted, ...forwardModels, ...courtWarmup]) { const model=models.get(key); if (model) model.lastSeen=now; }
    for (const [key,model] of models) {
      if (!ridge.pinned(key) && now-model.lastSeen >= KEEP_MODEL_MS && ![...model.draws.values()].some(draw=>draw.indices.length)) {
        release(model); models.delete(key);
      }
    }
    // Venue, interaction and voice requests have absolute priority. A distant
    // landscape download permits just a small rock cluster and one low plant.
    const available = (key: string) => !models.has(key) && !requests.has(key) && now >= (retryAt.get(key) ?? 0);
    const firstMissing = firstGroundModels.find(available);
    // Fill empty silhouettes before upgrading already visible instances.
    const missingCoarse = coarseWanted.find(key => {
      if (!available(key)) return false;
      const id = key.split(':')[0];
      return !models.has(assetKey(id, 'mid')) && !models.has(assetKey(id, 'near'));
    });
    for (const [key, request] of requests) {
      if (ridge.pinned(key)) continue;
      if (firstGroundModels.includes(key)) { request.lastWanted = now; continue; }
      const visible = wanted.includes(key) || coarseWanted.includes(key);
      if (sceneryLoading || (request.speculative && !visible && (firstMissing || missingCoarse))) {
        request.controller.abort();
      } else if (visible || forwardModels.includes(key) || courtWarmup.includes(key)) {
        request.lastWanted = now;
      } else if (now - request.lastWanted > 1100) {
        request.controller.abort();
      }
    }
    if (!busy && !requests.size) {
      const ahead = forwardModels.find(available);
      const background = courtWarmup.find(available);
      const key = firstMissing ?? (!sceneryLoading ? missingCoarse ?? ahead ?? background ?? wanted.find(available) : undefined);
      if (key) void load(key, now, key !== firstMissing && key !== missingCoarse && (key === ahead || key === background));
    }
    if (!busy && shadowDirty && (now-lastShadow>=SHADOW_INTERVAL_MS || now-shadowChangedAt>=300 && !requests.size)) {
      shadowDirty=false; lastShadow=now; world.refreshShadows();
    }
  }

  return {
    update, cullRidge: ridge.cull, prepareOpening, prepareRoute: (position: Point, camera: THREE.PerspectiveCamera) => {
      readProjection(camera);
      return Promise.all([route.prepare(position),needsRidge(position) ? ridge.prepareAt(position,camera) : undefined]);
    }, setCourtVisibility, pause,
    inspect() {
      const batches=[...active].map(([key,indices])=>{
        const [id,lod,bare]=key.split(':');
        const draw=models.get(assetKey(id,lod as Detail))!.draws.get(bare==='bare')!;
        return {id,lod,bare:!!bare,count:indices.length,triangles:draw.triangles*indices.length};
      });
      const landmarks = [...active].flatMap(([key,indices]) => {
        const [id,level] = key.split(':');
        if (!['大树9','T02_弯曲胡杨树','T03_展冠胡杨树'].includes(id)) return [];
        const model = models.get(assetKey(id,level as Detail))!;
        return indices.map(index => {
          const { item,base } = plants[index];
          return {id,level,x:item.x,z:item.z,baseY:base,height:item.height,topY:base+item.height,
            gradeVertices:model.mesh.geometry.getAttribute('treeExposure')?.count ?? 0,
            castShadow:model.draws.get(false)?.mesh.castShadow ?? false};
        });
      });
      const routeView = route.inspect();
      const courtModels = route.backgroundModels();
      const ridgeView = ridge.inspect();
      return {version:'v013',admission,firstGroundModels,forwardModels,
        route:{...routeView,...ridgeView, courtWarmup, backgroundModels:courtModels, backgroundReady:courtModels.filter(key => models.has(key))},
        placements:plants.length,landmarks,visibleDraws:batches.length + routeView.visibleDraws + ridgeView.ridgeDraws,
        visibleTriangles:batches.reduce((n,b)=>n+b.triangles,routeView.visibleTriangles + ridgeView.ridgeTriangles),
        visibleInstances:batches.reduce((n,b)=>n+b.count,routeView.visibleInstances + ridgeView.corridorOriginalInstances + ridgeView.corridorVolumeInstances + ridgeView.shoreVolumeInstances),
        models:batches,resident:[...models.keys()],pending:requests.keys().next().value??null,failed:[...retryAt.keys()],wanted};
    },
    dispose() {
      if (disposed) return;
      disposed=true; pause(); ridge.dispose();
      for (const model of models.values()) release(model);
      models.clear(); active.clear(); route.dispose(); root.removeFromParent();
    },
  };
}
