import * as THREE from 'three';
import originalBounds from '../content/world/desert-decoration-bounds-v001.json';
import oasisBounds from '../content/world/desert-decoration-bounds-v002.json';
import compositionBounds from '../content/world/desert-decoration-bounds-v004.json';
import shrubBounds from '../content/world/desert-decoration-bounds-v006.json';
import { isDesertVegetationAsset } from '../content/world/desert-vegetation';
import type { CameraCylinder } from './camera';
import { createDesertGroundShadows } from './desert-decoration-ground-shadows';
import { createDesertDecorationOverlook, desertOverlookTowerTreeIds, visibleAtVenue, type DesertVenueVisibility } from './desert-decoration-overlook';
import { resolveDesertDecorations } from './desert-decoration-placement';
import { isDesertImpostorTree } from './desert-tree-impostors';
import { PLAYER_RADIUS } from './movement';
import type { WorldPoint } from './types';

type Placement = ReturnType<typeof resolveDesertDecorations>[number];

interface DecorationChunk {
  assetId: string;
  assetPath: string;
  region: Placement['region'];
  venue: Placement['venue'];
  shoreFront: boolean;
  placements: Placement[];
  distance: number;
  group?: THREE.Group;
  draws?: number;
  triangles?: number;
  mainVisible?: boolean;
  obstacles: CameraCylinder[];
}

interface DecorationAsset {
  source: THREE.Object3D;
  meshes: THREE.Mesh[];
  textureBytes: number;
  unusedSince: number | null;
}

interface DecorationWorld {
  scene: THREE.Scene;
  load(assetPath: string, signal: AbortSignal): Promise<THREE.Object3D>;
  receiveShadows(model: THREE.Object3D): void;
  forgetMeshes(model: THREE.Object3D): void;
  release(model: THREE.Object3D): void;
  refreshShadows(): void;
  setObstacles(obstacles: readonly CameraCylinder[]): void;
  mobile: boolean;
  version?: 'v004';
  vegetation?: boolean;
}

interface DecorationUpdate {
  position: WorldPoint;
  companionPosition?: WorldPoint;
  busy: boolean;
  now: number;
}

const ASSET_PATH = 'desert-decoration/v001';
const CHUNK_SIZE = 32;
const PREFETCH_DISTANCE = 18;
const MAX_PREFETCH_DISTANCE = 75;
const RETAIN_DISTANCE = 30;
const RETAIN_MS = 12_000;
const RETRY_MS = 4_000;
const REQUEST_TIMEOUT_MS = 15_000;
const assetBounds = { ...originalBounds, ...oasisBounds, ...compositionBounds, ...shrubBounds };
const mobileLods = new Set(['t01', 't02', 't03', 's02', 'w01b']);
const FIRST_WAVE_PREVIOUS = {
  a: new Set(['r01', 'g02', 'c04', 't03', 'shrub-2']),
  b: new Set(['t01', 't03', 'w01b', 'shrub-2']),
  c: new Set(['rock-shrub-3']),
  d: new Set(['r02', 'r03', 'r04', 'c02', 'shrub-2']),
};

const FIRST_WAVE = {
  a: new Set(['rock-shrub-3', 'shrub-2', 'small-tree-2']),
  b: new Set(['w01b', 'shrub-2']),
  c: new Set(['rock-shrub-3', 'shrub-2']),
  d: new Set(['rock-shrub-3', 'r02']),
};

function pathFor(placement: Placement, mobile: boolean, composition: boolean) {
  const { assetId, shoreBand } = placement;
  if (assetId === 'shrub-1' || (composition && assetId === 'r02')) return `desert-decoration/v006/${assetId}.glb`;
  if (assetId === 'small-tree-2') return 'desert-decoration/v004/small-tree-2.glb';
  const shoreLod = shoreBand && (assetId === 'w01b' || assetId === 'shrub-2');
  const mobileLod = mobile && (mobileLods.has(assetId) || (assetId === 'shrub-2' && (composition || !placement.requiresMusicCourtyard)));
  if (shoreLod || mobileLod) {
    return `desert-decoration/v002/${assetId}-lod.glb`;
  }
  return `${assetId === 't03' ? 'desert-decoration/v002' : ASSET_PATH}/${assetId}.glb`;
}

const fileStem = (path: string) => path.slice(path.lastIndexOf('/') + 1, -4);

function estimateTextureBytes(meshes: THREE.Mesh[]) {
  const textures = new Set<THREE.Texture>();
  for (const mesh of meshes) {
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  }
  let bytes = 0;
  for (const texture of textures) {
    const image = texture.source.data as { width?: number; height?: number } | null;
    bytes += Math.ceil((image?.width ?? 0) * (image?.height ?? 0) * 4 * (texture.generateMipmaps ? 4 / 3 : 1));
  }
  return bytes;
}

function obstacleFor(placement: Placement, composition: boolean): CameraCylinder[] {
  const { id, assetId, x, y, z, scale, yaw } = placement;
  const bounds = assetBounds[assetId];
  const trunk = assetId === 't01' ? { x: .00933, z: .06094, radius: .116 }
    : assetId === 't02' ? { x: -.04292, z: .01266, radius: .151 }
    : assetId === 't03' ? { x: -.321104, z: -.052637, radius: .18 }
      : assetId === 'small-tree-2' ? { x: .02246, z: .09131, radius: .284 } : null;
  const rock = assetId === 'r02' || assetId === 'r03' || assetId === 'r04' || assetId === 'c02'
    || (composition && assetId === 'rock-shrub-3');
  const height = bounds.height * scale;
  const tiltHeight = (bounds.width * Math.abs(Math.sin(placement.roll ?? 0))
    + bounds.depth * Math.abs(Math.sin(placement.pitch ?? 0))) * scale;
  if (!trunk && !(rock && (height + tiltHeight > .95 || Math.min(bounds.width, bounds.depth) * scale > 1.9))) return [];
  const cosine = Math.cos(yaw), sine = Math.sin(yaw);
  const lx = trunk ? trunk.x * scale : 0, lz = trunk ? trunk.z * scale : 0;
  return [{
    id, x: x + cosine * lx + sine * lz, z: z - sine * lx + cosine * lz,
    radius: scale * (trunk?.radius ?? Math.min(bounds.width, bounds.depth) * .46),
    minY: y - tiltHeight / 2, maxY: y + (trunk ? height * .68 : height + tiltHeight / 2),
  }];
}

export function createDesertDecorationStreaming(world: DecorationWorld) {
  const root = new THREE.Group();
  root.name = 'connected-desert-decoration';
  root.matrixAutoUpdate = false;
  world.scene.add(root);
  const chunksByKey = new Map<string, DecorationChunk>();
  const vegetation = world.vegetation !== false;
  const placements = resolveDesertDecorations({ version: world.version })
    .filter(placement => vegetation || !isDesertVegetationAsset(placement.assetId));
  const composition = world.version !== 'v004';
  const firstWave = composition ? FIRST_WAVE : FIRST_WAVE_PREVIOUS;
  for (const placement of placements) {
    const { region, assetId, x, z, venue } = placement;
    const assetPath = pathFor(placement, world.mobile, composition);
    const isDenseStrip = placement.shoreBand || placement.roadVerge;
    let cellSize = isDenseStrip ? CHUNK_SIZE / 2 : CHUNK_SIZE;
    if (world.mobile && placement.shoreBand) cellSize = CHUNK_SIZE / 4;
    const key = `${region}/${venue ?? 'landscape'}/${cellSize}/${Math.floor(x / cellSize)}/${Math.floor(z / cellSize)}/${assetPath}`;
    let chunk = chunksByKey.get(key);
    if (!chunk) {
      chunk = { assetId, assetPath, region, venue, shoreFront: false, placements: [], distance: 0, obstacles: [] };
      chunksByKey.set(key, chunk);
    }
    chunk.placements.push(placement);
    if (placement.shoreBand === 'front') chunk.shoreFront = true;
    chunk.obstacles.push(...obstacleFor(placement, composition));
    chunk.distance = Math.max(chunk.distance, Math.min(placement.distance, 64));
  }
  const chunks = [...chunksByKey.values()];
  const overlook = createDesertDecorationOverlook(placements, composition, vegetation);
  const groundShadows = createDesertGroundShadows(placements, composition);
  let venues: DesertVenueVisibility = { music: false, cliff: false };
  overlook.setVenueVisibility(venues);
  groundShadows.setVenueVisibility(venues);
  root.add(overlook.root, groundShadows.root);
  const assets = new Map<string, DecorationAsset>();
  const failures = new Map<string, { count: number; retryAt: number }>();
  const firstWaveCompleted = new Map<Placement['region'], number>();
  const frustum = new THREE.Frustum();
  const projection = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const transform = new THREE.Matrix4();
  let pending: { id: string; controller: AbortController } | null = null;
  let disposed = false;
  let shadowDirty = false;
  let lastUpdate = -Infinity;
  let nearby: { chunk: DecorationChunk; distance: number }[] = [];
  let visibleDraws = 0;
  let visibleTriangles = 0;
  let overviewTriangles = 0;
  let detailDraws = 0;
  let groundShadowTriangles = 0;
  const activeObstacles = new Map<string, CameraCylinder>();
  world.receiveShadows(overlook.root);

  function distanceTo(chunk: DecorationChunk, point: WorldPoint) {
    return Math.min(...chunk.placements.map(item => Math.hypot(item.x - point.x, item.z - point.z)));
  }

  function castsDetailShadow(item: Placement) {
    // The composed world uses a stable sun caster shared by both detail levels.
    return !composition && item.castShadow && !item.wallRoot;
  }

  function mount(chunk: DecorationChunk, asset: DecorationAsset) {
    const group = new THREE.Group();
    group.name = `desert-${chunk.region}-${chunk.assetId}`;
    group.matrixAutoUpdate = false;
    group.visible = false;
    chunk.draws = 0;
    chunk.triangles = 0;
    for (const mesh of asset.meshes) {
      // A batch owns its instance buffer. Its model retains geometry and materials.
      for (const castShadow of [false, true]) {
        const items = chunk.placements.filter(item => castsDetailShadow(item) === castShadow);
        if (!items.length) continue;
        const instance = new THREE.InstancedMesh(mesh.geometry, mesh.material, items.length);
        instance.matrixAutoUpdate = false;
        instance.castShadow = castShadow;
        instance.receiveShadow = true;
        instance.raycast = () => {};
        for (const [index, item] of items.entries()) {
          rotation.setFromEuler(euler.set(item.pitch ?? 0, item.yaw, item.roll ?? 0));
          transform.compose(position.set(item.x, item.y, item.z), rotation, scale.setScalar(item.scale));
          instance.setMatrixAt(index, transform.multiply(mesh.matrixWorld));
        }
        instance.instanceMatrix.needsUpdate = true;
        instance.computeBoundingSphere();
        group.add(instance);
        chunk.draws += Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1;
        chunk.triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3 * items.length;
      }
    }
    chunk.group = group;
    root.add(group);
  }

  function unmount(chunk: DecorationChunk) {
    const { group } = chunk;
    if (!group) return;
    world.forgetMeshes(group);
    group.traverse(object => {
      if (!(object instanceof THREE.InstancedMesh)) return;
      if (object.castShadow && group.visible) shadowDirty = true;
      object.dispose();
    });
    group.removeFromParent();
    chunk.group = undefined;
    chunk.mainVisible = undefined;
  }

  function start(path: string) {
    const controller = new AbortController();
    pending = { id: path, controller };
    const timeout = setTimeout(() => controller.abort('desert-decoration-timeout'), REQUEST_TIMEOUT_MS);
    void world.load(path, controller.signal).then(source => {
      if (disposed || controller.signal.aborted) {
        world.release(source);
        return;
      }
      source.updateMatrixWorld(true);
      const meshes: THREE.Mesh[] = [];
      source.traverseVisible(object => {
        if (object instanceof THREE.Mesh && !(object instanceof THREE.SkinnedMesh)) meshes.push(object);
      });
      if (!meshes.length) {
        world.release(source);
        throw new Error('desert-decoration-empty');
      }
      world.receiveShadows(source);
      failures.delete(path);
      assets.set(path, { source, meshes, textureBytes: estimateTextureBytes(meshes), unusedSince: null });
    }).catch(() => {
      if (disposed || (controller.signal.aborted && controller.signal.reason !== 'desert-decoration-timeout')) return;
      const count = (failures.get(path)?.count ?? 0) + 1;
      failures.set(path, { count, retryAt: performance.now() + RETRY_MS });
    }).finally(() => {
      clearTimeout(timeout);
      if (pending?.controller === controller) pending = null;
    });
  }

  function pause() {
    pending?.controller.abort();
  }

  function stream({ position, companionPosition, busy, now }: DecorationUpdate) {
    lastUpdate = now;
    function priority({ chunk, distance }: typeof nearby[number]) {
      // The low-resolution tree captures should give way to 3D before
      // travelers can walk under their canopies.
      if (distance < 20 && (chunk.assetId === 'small-tree-2' || isDesertImpostorTree(chunk.assetId))) return distance * .4;
      return distance * (chunk.shoreFront ? .75 : 1);
    }
    nearby = chunks.map(chunk => ({
      chunk,
      distance: visibleAtVenue(chunk.venue, venues) ? distanceTo(chunk, position) : Infinity,
    })).sort((a, b) => priority(a) - priority(b));
    const retained = new Set<string>();
    const nextObstacles = new Map<string, CameraCylinder>();
    for (const { chunk, distance } of nearby) {
      if (distance > chunk.distance + PREFETCH_DISTANCE) continue;
      for (const obstacle of chunk.obstacles) {
        const minClearance = obstacle.radius + PLAYER_RADIUS + .15;
        if (activeObstacles.has(obstacle.id)
          || (Math.hypot(obstacle.x - position.x, obstacle.z - position.z) >= minClearance
            && (!companionPosition || Math.hypot(obstacle.x - companionPosition.x, obstacle.z - companionPosition.z) >= minClearance))) {
          nextObstacles.set(obstacle.id, obstacle);
        }
      }
    }
    if (nextObstacles.size !== activeObstacles.size || [...nextObstacles.keys()].some(id => !activeObstacles.has(id))) {
      activeObstacles.clear();
      for (const [id, obstacle] of nextObstacles) activeObstacles.set(id, obstacle);
      world.setObstacles([...activeObstacles.values()]);
    }
    for (const { chunk, distance } of nearby) {
      if (distance <= chunk.distance + RETAIN_DISTANCE) retained.add(chunk.assetPath);
      else unmount(chunk);
    }
    for (const [id, asset] of assets) {
      if (retained.has(id)) asset.unusedSince = null;
      else if (asset.unusedSince === null) asset.unusedSince = now;
      else if (now - asset.unusedSince >= RETAIN_MS) {
        world.release(asset.source);
        assets.delete(id);
      }
    }
    if (pending && !retained.has(pending.id)) pause();

    if (busy) return;
    // One chunk per update keeps instance-buffer uploads apart on mobile.
    const nextMount = nearby.find(({ chunk, distance }) => !chunk.group && assets.has(chunk.assetPath)
      && distance <= chunk.distance + PREFETCH_DISTANCE
      && chunk.obstacles.every(obstacle => activeObstacles.has(obstacle.id)));
    if (nextMount) mount(nextMount.chunk, assets.get(nextMount.chunk.assetPath)!);

    if (pending) return;
    const candidates = nearby.filter(({ chunk, distance }) =>
      distance <= Math.min(chunk.distance + PREFETCH_DISTANCE, MAX_PREFETCH_DISTANCE) && !assets.has(chunk.assetPath)
      && (failures.get(chunk.assetPath)?.count ?? 0) < 2);
    const firstWaveRegions = new Set(candidates.filter(({ chunk }) => firstWave[chunk.region].has(chunk.assetId))
      .map(({ chunk }) => chunk.region));
    const nextAsset = candidates.find(({ chunk }) => {
      if (firstWave[chunk.region].has(chunk.assetId)) {
        firstWaveCompleted.delete(chunk.region);
      } else {
        if (firstWaveRegions.has(chunk.region)) return false;
        // Give the first wave time to paint before requesting optional fills.
        if (!firstWaveCompleted.has(chunk.region)) firstWaveCompleted.set(chunk.region, now);
        if (now - firstWaveCompleted.get(chunk.region)! < 1500) return false;
      }
      return now >= (failures.get(chunk.assetPath)?.retryAt ?? 0);
    });
    if (nextAsset) start(nextAsset.chunk.assetPath);
  }

  function setVenueVisibility(visibility: DesertVenueVisibility) {
    const gatesChanged = visibility.music !== venues.music || visibility.cliff !== venues.cliff;
    venues = visibility;
    if (!gatesChanged) return;
    lastUpdate = -Infinity;
    overlook.setVenueVisibility(visibility);
    groundShadows.setVenueVisibility(visibility);
    world.refreshShadows();
    for (const chunk of chunks) {
      if (!visibleAtVenue(chunk.venue, venues)) unmount(chunk);
    }
    const hidden = new Set(chunks.filter(chunk => !visibleAtVenue(chunk.venue, venues))
      .flatMap(chunk => chunk.obstacles.map(obstacle => obstacle.id)));
    const priorCount = activeObstacles.size;
    for (const id of hidden) activeObstacles.delete(id);
    if (priorCount !== activeObstacles.size) world.setObstacles([...activeObstacles.values()]);
  }

  function present(camera: THREE.PerspectiveCamera) {
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
      camera.coordinateSystem, camera.reversedDepth);
    const skyline = overlook.cost(frustum);
    const shadow = groundShadows.cost(frustum);
    const towerDetails = venues.cliffTreesDetailed && venues.cliff ? desertOverlookTowerTreeIds : [];
    overviewTriangles = skyline.triangles;
    if (towerDetails.length && skyline.venueInView.cliff) {
      for (const id of towerDetails) overviewTriangles -= overlook.triangleCount(id);
    }
    groundShadowTriangles = shadow.triangles;
    visibleDraws = skyline.draws + shadow.draws;
    visibleTriangles = overviewTriangles + groundShadowTriangles;
    detailDraws = 0;
    const detailed = new Set<string>(towerDetails);
    for (const { chunk, distance } of nearby) {
      const { group } = chunk;
      if (!group) continue;
      const inRange = visibleAtVenue(chunk.venue, venues) && distance <= chunk.distance + (group.visible ? 5 : 0);
      const intersects = inRange && group.children.some(mesh => frustum.intersectsObject(mesh));
      const draws = chunk.draws ?? 0;
      const triangles = chunk.triangles ?? 0;
      const replaced = intersects ? chunk.placements.reduce((sum, item) => sum + overlook.triangleCount(item.id), 0) : 0;
      const allowed = !world.mobile || (visibleDraws + draws <= 20 && visibleTriangles + triangles - replaced <= 30_000);
      if (inRange !== group.visible && chunk.placements.some(castsDetailShadow)) shadowDirty = true;
      group.visible = inRange;
      const mainVisible = !intersects || allowed;
      if (mainVisible !== chunk.mainVisible) {
        // Main-pass budget changes with the camera. Static casters stay registered.
        for (const mesh of group.children) {
          if (mainVisible) mesh.layers.enable(0);
          else mesh.layers.disable(0);
        }
        chunk.mainVisible = mainVisible;
      }
      if (intersects && mainVisible) {
        for (const item of chunk.placements) detailed.add(item.id);
        visibleDraws += draws;
        detailDraws += draws;
        visibleTriangles += triangles - replaced;
        overviewTriangles -= replaced;
      }
    }
    overlook.showDetail(detailed, camera);
  }

  function update(state: DecorationUpdate) {
    if (disposed) return;
    const { busy, now } = state;
    if (busy) pause();
    if (now - lastUpdate >= 150) stream(state);
    if (shadowDirty && !busy) {
      shadowDirty = false;
      world.refreshShadows();
    }
  }

  return {
    prepare: overlook.prepare,
    update,
    present,
    setVenueVisibility,
    pause,
    inspect: () => ({
      resident: [...assets.keys()].map(fileStem),
      mounted: chunks.filter(chunk => chunk.group).length,
      visibleDraws,
      visibleTriangles,
      overviewTriangles,
      detailDraws,
      groundShadowTriangles,
      venues,
      treeImpostors: overlook.inspectTrees(),
      textureBytes: [...assets.values()].reduce((total, asset) => total + asset.textureBytes, overlook.inspectTrees().textureBytes),
      pending: pending ? fileStem(pending.id) : null,
      failed: [...failures].filter(([, failure]) => failure.count >= 2).map(([path]) => fileStem(path)),
      placements,
      obstacles: [...activeObstacles.values()],
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      pause();
      for (const chunk of chunks) unmount(chunk);
      for (const asset of assets.values()) world.release(asset.source);
      assets.clear();
      world.forgetMeshes(overlook.root);
      world.forgetMeshes(groundShadows.root);
      overlook.dispose();
      groundShadows.dispose();
      activeObstacles.clear();
      world.setObstacles([]);
      root.removeFromParent();
    },
  };
}
