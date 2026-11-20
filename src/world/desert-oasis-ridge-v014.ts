import * as THREE from 'three';
import { DESERT_OASIS_PLACEMENTS as placements, type OasisPlacement } from '../content/world/desert-oasis-layout-v013';
import { ENVIRONMENT_STATIC_SHADOW_LAYER } from './terrain-environment-lighting-v001';
import { TERRAIN_ROUTES } from '../content/world/terrain-layout-v001';
import { installOasisMaterial, oasisToneIndex } from './desert-oasis-material-v013';

interface Point { x: number; z: number }
type SourceMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
interface Prototype { mesh: SourceMesh; normalize: THREE.Matrix4 }
interface RidgeWorld {
  scene: THREE.Scene;
  load(path: string, signal: AbortSignal, priority?: RequestPriority): Promise<THREE.Object3D>;
  receiveShadows(root: THREE.Object3D): void;
  forgetMeshes(root: THREE.Object3D): void;
  release(root: THREE.Object3D): void;

}
const road = TERRAIN_ROUTES[0].points;
function alongApproach(p: OasisPlacement) {
  // Follow the actual switchback all the way to the threshold. Include the
  // planted pockets on the valley-facing side even where they leave the verge.
  if (p.x <= 211 && p.z >= -37) return true;
  return road.some((b,i) => {
    if (i === 0) return false;
    const a = road[i-1], dx = b.x-a.x, dz = b.z-a.z;
    const t = THREE.MathUtils.clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz || 1),0,1);
    return (p.x-a.x-t*dx)**2 + (p.z-a.z-t*dz)**2 <= 18**2;
  });
}
const zone = placements.map(p => {
  if (p.id === '大树9' || (p.area === 'entrance' && p.x < 117)) return null;
  if (alongApproach(p)) return 'road';
  return p.area === 'cliff' ? null : 'shore';
});
const target = {road: zone.filter(z => z === 'road').length, shore: zone.filter(z => z === 'shore').length};
const species = [...new Set(placements.filter((_,i) => zone[i]).map(p => p.id))];
const volumePath = 'desert-decoration/v014/route-volume.glb';

interface Cohort {
  id: string;
  indices: number[];
  high: Uint8Array;
  original?: Batch;
  volume?: Batch;
  caster?: THREE.InstancedMesh;
}
interface Batch {
  mesh: THREE.InstancedMesh;
  transforms: Float32Array;
  tones: THREE.InstancedBufferAttribute;
  selected: number[];
}
export function createOasisRidgeV014(world: RidgeWorld, bases: readonly number[], bounds: readonly THREE.Sphere[],
  original: (id: string) => Prototype | undefined, loadOriginal: (id: string) => Promise<void>) {
  const group = new THREE.Group();
  group.name = 'oasis-ridge-v014';
  group.matrixAutoUpdate = false;
  group.visible = false;
  world.scene.add(group);
  const indices = new Map<string,number[]>();
  const idsByZone = new Set<string>();
  placements.forEach((p,i) => {
    if (!zone[i]) return;
    let same = indices.get(p.id);
    if (!same) indices.set(p.id,same=[]);
    same.push(i);
    if (zone[i] === 'road') idsByZone.add(p.id);
  });
  const cohorts: Cohort[] = [...indices].map(([id,list])=>({id,indices:list,high:new Uint8Array(list.length)}));
  const owned = new Uint8Array(placements.length);
  // Fetch each original once, giving the whole road priority over shore-only originals.
  const modelIds = [...idsByZone,...species.filter(id => !idsByZone.has(id))];
  const volumes = new Map<string,Prototype>();
  let volumeSource: THREE.Object3D | undefined, request: AbortController | undefined;
  let preparation: Promise<void> | undefined, retryAfter = 0, disposed = false;
  const ridgeMaterials: THREE.MeshStandardMaterial[] = [];
  const matrix = new THREE.Matrix4(), transform = new THREE.Object3D();
  const projection = new THREE.Matrix4(), previousProjection = new THREE.Matrix4(), frustum = new THREE.Frustum();
  let viewDirty=true;
  let active = false, changed = false, suspended = false, roadOriginal = 0, shoreReal = 0;
  let draws = 0, triangles = 0;
  async function loadVolume() {
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(),18_000);
    try {
      const source = await world.load(volumePath,controller.signal,'high');
      if (disposed || controller.signal.aborted) { world.release(source); return; }
      const identity = new THREE.Matrix4();
      const shared = new Map<boolean,THREE.MeshStandardMaterial>();
      source.traverse(mesh => {
        if (!(mesh instanceof THREE.Mesh) || !(mesh.material instanceof THREE.MeshStandardMaterial)) return;
        const id = mesh.userData.oasisModel;
        if (typeof id !== 'string' || !mesh.geometry.hasAttribute('color') || !mesh.geometry.hasAttribute('normal')) return;
        const grass = id === 'g02' || id === 'w01b' || id.startsWith('W01');
        let material = shared.get(grass);
        if (!material) {
          material = mesh.material.clone();
          installOasisMaterial(material,id,true);
          material.userData.oasisRidgeFoliage=true;
          shared.set(grass,material); ridgeMaterials.push(material);
        }
        volumes.set(id,{mesh:new THREE.Mesh(mesh.geometry,material),normalize:identity});
      });
      volumeSource = source;
    } catch { /* Keep the existing atlas while an interrupted file is retried. */ }
    finally { clearTimeout(timeout); request=undefined; }
  }
  function prepare() {
    if (disposed || suspended || preparation || performance.now()<retryAfter) return preparation;
    const missing = modelIds.filter(id => !original(id));
    if (volumeSource && !missing.length) return;
    const pool = async () => {
      while (!disposed && !suspended && missing.length) await loadOriginal(missing.shift()!);
    };
    preparation = Promise.all([volumeSource ? undefined : loadVolume(),pool(),pool(),pool()]).then(() => {
      retryAfter = performance.now()+2400;
    }).finally(() => { preparation=undefined; });
    return preparation;
  }
  function instantiate(set: Cohort, proto: Prototype, tier: 'original'|'volume'|'shadow') {
    const source = proto.mesh.geometry;
    const geo = new THREE.BufferGeometry();
    for (const [key,attr] of Object.entries(source.attributes)) if (key !== 'oasisTone') geo.setAttribute(key,attr);
    geo.setIndex(source.index);
    if (!source.boundingSphere) source.computeBoundingSphere();
    geo.boundingSphere=source.boundingSphere!.clone();
    const tones = new THREE.InstancedBufferAttribute(Float32Array.from(set.indices,i=>oasisToneIndex[placements[i].tone]),1);
    geo.setAttribute('oasisTone',tones);
    let material=proto.mesh.material;
    if (tier==='original') {
      // Streamed near models can be reused at the cliff; only the fixed valley
      // receives the outdoor shadow sampling variant.
      material=material.clone();
      installOasisMaterial(material,set.id);
      material.userData.oasisRidgeFoliage=true;
      ridgeMaterials.push(material);
    }
    const mesh = new THREE.InstancedMesh(geo,material,set.indices.length);
    mesh.name='oasis-ridge-'+tier+':'+set.id;
    mesh.matrixAutoUpdate=false; mesh.raycast=()=>{};
    const caster=tier==='shadow';
    mesh.castShadow=caster; mesh.receiveShadow=!caster;
    for (let n=0;n<set.indices.length;n++) {
      const i=set.indices[n], p=placements[i], w=p.height*(p.id==='w01b'?1.18:1);
      transform.position.set(p.x,bases[i],p.z); transform.rotation.set(0,p.yaw,0);
      transform.scale.set(w,p.height,w); transform.updateMatrix();
      mesh.setMatrixAt(n,matrix.multiplyMatrices(transform.matrix,proto.normalize));
    }
    group.add(mesh);
    if (caster) {
      // Static self/ground shadows come from a fixed, three-dimensional canopy.
      // Rotating the main camera never changes that caster or invalidates the bake.
      mesh.layers.set(ENVIRONMENT_STATIC_SHADOW_LAYER);
      mesh.computeBoundingSphere(); set.caster=mesh;
      changed=true;
      return;
    }
    const batch: Batch={mesh,transforms:Float32Array.from(mesh.instanceMatrix.array),tones,selected:[]};
    mesh.frustumCulled=false; mesh.count=0; mesh.visible=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); tones.setUsage(THREE.DynamicDrawUsage);
    world.receiveShadows(mesh);
    set[tier]=batch;
  }
  function update(on: boolean, position: Point, camera: THREE.PerspectiveCamera) {
    if (!on && !active) return false;
    active=true; group.visible=true;
    let swap=false;
    roadOriginal=0; shoreReal=0;
    for (const set of cohorts) {
      const native=original(set.id), volume=volumes.get(set.id);
      if (volume && !set.volume) instantiate(set,volume,'volume');
      if (native && !set.original) instantiate(set,native,'original');
      if (volume && !set.caster) instantiate(set,volume,'shadow');
      for (let n=0;n<set.indices.length;n++) {
        const i=set.indices[n], p=placements[i];
        const road=zone[i]==='road', range=set.high[n]===2 ? 23 : 15;
        const close=(p.x-position.x)**2+(p.z-position.z)**2<range*range;
        const tier=set.original && (road || close || !set.volume) ? 2 : set.volume ? 1 : 0;
        if (tier!==set.high[n]) {
          set.high[n]=tier; owned[i]=Number(tier>0); swap=true;
        }
        if (road && tier===2) roadOriginal++;
        if (!road && tier) shoreReal++;
      }
    }
    viewDirty ||= swap;
    cull(camera);
    return swap;
  }
  function present(set:Cohort, batch:Batch | undefined, visible:number[]) {
    if (!batch) return;
    const {mesh,tones,transforms,selected}=batch;
    mesh.visible=visible.length>0; mesh.count=visible.length;
    // Most GPU buffers stay identical as a traveler takes a step. Only
    // rewrite the suffix whose membership actually changed at the frustum.
    let first=0;
    while (first<visible.length && selected[first]===visible[first]) first++;
    if (first<visible.length) {
      for (let k=first;k<visible.length;k++) {
        const n=visible[k];
        (mesh.instanceMatrix.array as Float32Array).set(transforms.subarray(n*16,n*16+16),k*16);
        tones.setX(k,oasisToneIndex[placements[set.indices[n]].tone]);
      }
      mesh.instanceMatrix.addUpdateRange(first*16,(visible.length-first)*16);
      tones.addUpdateRange(first,visible.length-first);
      mesh.instanceMatrix.needsUpdate=true; tones.needsUpdate=true;
    }
    if (selected.length!==visible.length || first<visible.length) batch.selected=visible;
    if (mesh.visible) {
      draws++; triangles+=mesh.count*(mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count)/3;
    }
  }
  function cull(camera:THREE.PerspectiveCamera) {
    if (!active) return;
    camera.updateMatrixWorld();
    projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    if (!viewDirty && previousProjection.equals(projection)) return;
    previousProjection.copy(projection); viewDirty=false; draws=0; triangles=0;
    frustum.setFromProjectionMatrix(projection,camera.coordinateSystem,camera.reversedDepth);
    for (const set of cohorts) {
      const native:number[]=[], volume:number[]=[];
      for (let n=0;n<set.indices.length;n++) {
        if (set.high[n] && frustum.intersectsSphere(bounds[set.indices[n]]))
          (set.high[n]===2 ? native : volume).push(n);
      }
      present(set,set.original,native); present(set,set.volume,volume);
    }
  }
  // Build fixed batches while the initial gallery is loading. All later
  // updates can reuse the same transforms and baked world shadows.
  async function prepareAt(position: Point, camera: THREE.PerspectiveCamera) {
    await prepare();
    if (!disposed && !suspended) update(true,position,camera);
  }
  return { prepare, prepareAt, update, cull,
    suspend() { suspended=true; request?.abort(); },
    resume() { suspended=false; },
    owns(i:number) {return !!owned[i];},
    pinned(key:string) {return key.endsWith(':near') && species.includes(key.slice(0,-5));},
    takeShadowChange() {const value=changed;changed=false;return value;},
    inspect() {
      return {corridorPlacements:target.road,corridorOriginalInstances:roadOriginal,corridorReady:roadOriginal===target.road,
        shorePlacements:target.shore,shoreVolumeInstances:shoreReal,shoreReady:shoreReal===target.shore,
        ridgeOriginalModels:modelIds.length,ridgeResidentModels:modelIds.filter(id=>original(id)).length,
        ridgeDraws:draws,ridgeTriangles:triangles};
    },
    dispose() {
      disposed=true; request?.abort();
      for (const set of cohorts) for (const mesh of [set.volume?.mesh,set.original?.mesh,set.caster]) {
        if (mesh) {world.forgetMeshes(mesh); mesh.dispose(); mesh.geometry.dispose();}
      }
      group.removeFromParent();
      for (const material of ridgeMaterials) material.dispose();
      if (volumeSource) world.release(volumeSource);
    },
  };
}
