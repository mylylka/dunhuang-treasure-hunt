import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';
import { DESERT_OASIS_PLACEMENTS as placements, type OasisPlacement } from '../content/world/desert-oasis-layout-v013';
import { oasisModelV013 } from '../content/world/desert-oasis-assets-v013';
import { createOasisGroundShadowsV013, routeAtlasPanel, routeAtlasColumns, routeAtlasRows, routeAtlasTile } from './desert-oasis-ground-shadows-v013';
import { environmentSurfaceHeight } from '../content/world/environment-layout-v001';
import { terrainSurfaceHeight } from './terrain-rules-v001';
import { installOasisMaterial, oasisToneIndex } from './desert-oasis-material-v013';
import type { WorldPoint } from './types';

const routeAsset = 'desert-decoration/v013/route-ground-light-v013.webp';
type Stage = 0 | 1 | 2 | 3;
const stageNames = ['entrance', 'ridge-to-lake', 'lake-to-cliff-landmarks', 'lake-to-cliff-complete'] as const;

function initialStage(p: WorldPoint, inSecondCourt: boolean): Stage {
  if (inSecondCourt || (p.x >= 239 && p.z >= 4)) return 3;
  if (p.x >= 163) return 2;
  if (p.x >= 117) return 1;
  return 0;
}

function placementStage(p: OasisPlacement): Stage | 4 {
  if (p.id === '大树9' || (p.area === 'entrance' && p.x < 117)) return 4;
  if (p.area !== 'cliff') return 1;
  if (p.height >= 4 || (['r02','r04','r01'].includes(p.id) && p.height >= .5)) return 2;
  return 3;
}

const stages = placements.map(placementStage);
const counts = [0, 1, 2, 3].map(phase => stages.filter(s => s <= phase).length);
const cliffBackground = [...new Set(placements.filter(p => p.area === 'cliff' && p.height < 4).map(p => p.id))]
  .sort((a,b) => oasisModelV013(a).lodTriangles - oasisModelV013(b).lodTriangles)
  .map(id => id + ':lod');
const faceIndices = [0,1,2,0,2,3,4,5,6,4,6,7];

// One static batch. Changing a stage or handing individual roots to detailed
// models updates the index buffer, without rebuilding vertices or refetching art.
function createRouteGeometry() {
  const positions = new Float32Array(placements.length * 24);
  const normals = new Float32Array(positions.length);
  const uvs = new Float32Array(placements.length * 16);
  const tones = new Float32Array(placements.length * 8);
  const grasses = new Uint8Array(tones.length);
  const sun = new Int8Array(placements.length * 16);
  placements.forEach((p,i) => {
    if (stages[i] > 3) return;
    const model = oasisModelV013(p.id);
    const base = p.baseY ?? ((p.x > 420 ? environmentSurfaceHeight(p.x,p.z) : terrainSurfaceHeight(p)) - p.burial);
    const width = p.height / model.height * (p.id === 'w01b' ? 1.18 : 1);
    const cos = Math.cos(p.yaw), sin = Math.sin(p.yaw);
    for (let axis=0; axis<2; axis++) {
      const half = width * (axis === 0 ? model.width : model.depth) / 2;
      const dx = (axis === 0 ? cos : sin) * half;
      const dz = (axis === 0 ? -sin : cos) * half;
      const panel = routeAtlasPanel(p, axis);
      for (let corner=0; corner<4; corner++) {
        const right = corner === 1 || corner === 2, high = corner >= 2;
        const v = i*8 + axis*4 + corner;
        positions.set([p.x + (right ? dx : -dx), base + (high ? p.height : 0), p.z + (right ? dz : -dz)],v*3);
        normals[v*3+1] = 1;
        uvs[v*2] = ((panel % routeAtlasColumns) + (right ? 1-.5/routeAtlasTile : .5/routeAtlasTile)) / routeAtlasColumns;
        uvs[v*2+1] = 1 - (Math.floor(panel/routeAtlasColumns) + (high ? .5/routeAtlasTile : 1-.5/routeAtlasTile)) / (routeAtlasRows * 2);
        sun[v*2] = Math.round(127 * cos);
        sun[v*2+1] = Math.round(127 * sin);
        tones[v] = oasisToneIndex[p.tone];
        grasses[v] = Number(p.id === 'g02' || p.id === 'w01b' || p.id.startsWith('W01'));
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals,3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs,2));
  geometry.setAttribute('oasisTone', new THREE.BufferAttribute(tones,1));
  geometry.setAttribute('routeGrass', new THREE.BufferAttribute(grasses,1));
  geometry.setAttribute('routeSun', new THREE.BufferAttribute(sun,2,true));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(placements.length*12),1).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0,0);
  return geometry;
}

export function createOasisRouteView(scene: THREE.Scene, firstGalleryVista = false) {
  let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
  let texture: THREE.Texture | undefined;
  let treeShadows: ReturnType<typeof createOasisGroundShadowsV013> | undefined;
  let ridgeOwned = 0;
  // A courtyard-only traveler can see beyond the walking boundary from the start.
  let stage: Stage = firstGalleryVista ? 1 : 0, builtStage = -1;
  let disposed = false, loading: Promise<void> | undefined, retryAt = 0, attempts = 0;
  let changed = false, lastDetailed = new Set<number>();
  let request: AbortController | undefined;
  const point = {x:0,z:0};

  function start() {
    if (disposed || mesh || loading || typeof Image === 'undefined' || performance.now() < retryAt) return;
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(),8000);
    attempts++;
    loading = (async () => {
      const response = await fetch(worldAssetUrl(routeAsset),{signal:controller.signal, priority:'low'});
      if (!response.ok) throw new Error('Unable to load route vegetation');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const image = new Image();
      try { image.src = url; await image.decode(); }
      finally { URL.revokeObjectURL(url); }
      if (disposed || controller.signal.aborted) return;
      texture = new THREE.Texture(image);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      const material = new THREE.MeshStandardMaterial({map:texture,alphaTest:.27,side:THREE.DoubleSide,roughness:.93});
      installOasisMaterial(material,'g02');
      const before = material.onBeforeCompile;
      material.onBeforeCompile = function(shader,renderer) {
        before.call(this,shader,renderer);
        // Retain the separate fresh-grass and fresh-woody tints when sharing this draw.
        shader.vertexShader = 'attribute vec2 routeSun; varying vec2 vRouteSun;\nattribute float routeGrass;\nvarying float vRouteGrass;\n' +
          shader.vertexShader.replace('vOasisTone = oasisTone;', 'vOasisTone = oasisTone; vRouteGrass = routeGrass; vRouteSun = routeSun;');
        shader.fragmentShader = 'varying vec2 vRouteSun; varying float vRouteGrass;\n' +
          shader.fragmentShader.replace('vec3(.33,.84,.53)', 'mix(vec3(.45,.88,.63),vec3(.33,.84,.53),vRouteGrass)');
        // The lower half stores the mean and two directional terms from four
        // solar depth passes. Use the actual placement yaw to restore its light.
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          vec3 lightField = texture2D(map,vMapUv - vec2(0.,.5)).rgb;
          diffuseColor.rgb *= clamp(1.6*lightField.r + dot(2.*lightField.gb-1.,vRouteSun),.20,1.58);`);
        // Both faces of the original crossed meshes use the same upward normal.
        shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\nif (!gl_FrontFacing) normal = -normal;');
      };
      material.customProgramCacheKey = () => 'oasis-route-directional-v013';
      mesh = new THREE.Mesh(createRouteGeometry(),material);
      mesh.name = 'desert-oasis-route-v013';
      mesh.matrixAutoUpdate = false;
      mesh.raycast = () => {};
      mesh.receiveShadow = true;
      mesh.visible = false;
      scene.add(mesh);
      changed = true;
    })().catch(() => { changed = true; retryAt = performance.now()+4000; }).finally(() => {
      clearTimeout(timeout); request = undefined; loading = undefined;
    });
    return loading;
  }
  start();

  function update(position: WorldPoint, inSecondCourt: boolean, _musicVisible?: boolean) {
    point.x = position.x; point.z = position.z;
    const next = firstGalleryVista ? stage : Math.max(stage,initialStage(position,inSecondCourt)) as Stage;
    const refresh = changed || stage !== next;
    changed = false; stage = next;
    start();
    return refresh;
  }

  function present(detailed: ReadonlySet<number>, owns: (i:number) => boolean, ridgeChanged: boolean) {
    if (!mesh) return;
    if (!ridgeChanged && builtStage === stage && detailed.size === lastDetailed.size && [...detailed].every(i => lastDetailed.has(i))) return;
    const attr = mesh.geometry.index!;
    const indices = attr.array as Uint16Array;
    let count = 0, shadowNeeded = false;
    ridgeOwned = 0;
    if (stage) for (let i=0; i<stages.length; i++) {
      if (stages[i] > stage) continue;
      if (owns(i)) { ridgeOwned++; continue; }
      if (detailed.has(i)) continue;
      if (placements[i].height >= 4) shadowNeeded=true;
      for (const offset of faceIndices) indices[count++] = i*8 + offset;
    }
    if (shadowNeeded && texture) treeShadows ??= createOasisGroundShadowsV013(scene,texture);
    treeShadows?.present(i=>stages[i]<=stage && !owns(i) && !detailed.has(i));
    mesh.visible = count > 0;
    mesh.geometry.setDrawRange(0,count);
    attr.needsUpdate = true;
    lastDetailed = new Set(detailed);
    builtStage = stage;
  }

  return {
    update, present, ridgeActive: () => stage >= 1,
    async prepare(position: WorldPoint) {
      update(position,false);
      if (stage) await loading;
    },
    backgroundModels(): readonly string[] { return stage === 3 ? cliffBackground : []; },
    covers(index: number) { return !!mesh && stages[index] <= stage; },
    allowsDetail(index: number) {
      // Venue-owned trees retain their own visibility and high-detail material.
      const part = stages[index], p = placements[index];
      if (part === 4) return true;
      if (part > stage && p.area === 'cliff') return false;
      // While the layer is decoding, distant plants arrive together. Nearby
      // ground can still use its normal models, including if the atlas failed.
      if (part > stage || (!mesh && (!loading || retryAt > 0))) return true;
      const range = Math.max(14, Math.min(65,p.height*6));
      const exitMargin = lastDetailed.has(index) ? Math.max(3,range*.18) : 0;
      return Math.hypot(point.x-p.x,point.z-p.z) <= range + exitMargin;
    },
    cost() { return {draws: Number(!!stage && !!mesh) + (treeShadows?.cost().draws ?? 0),triangles:mesh ? (counts[stage]-ridgeOwned)*4 + (treeShadows?.cost().triangles ?? 0) : 0}; },
    inspect() {
      const drawn = mesh ? mesh.geometry.drawRange.count/12 : 0;
      return {stage:stageNames[stage],ready:!!mesh,attempts,covered:mesh ? counts[stage] : 0,
        visibleInstances:drawn,detailedInstances:lastDetailed.size+ridgeOwned,visibleDraws:drawn ? 1 : 0,visibleTriangles:drawn*4};
    },
    dispose() {
      disposed = true; request?.abort();
      if (mesh) { mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose(); }
      treeShadows?.dispose(); texture?.dispose();
    },
  };
}
