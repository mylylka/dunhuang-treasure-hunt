import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createArtSampleScene } from './art-sample';
import { createWorldInput } from './input';
import { COURTYARD_ROAD } from './road';
import { movementVector, movePlayer, PLAYER_RADIUS, WORLD_COLLIDERS, type WorldCollider } from './movement';
import { worldAssetUrl } from '../content/world/assets';
import './environment-preview.css';
import './environment-preview-v003.css';

const root = document.getElementById('preview')!;
const travelerPreview = root.dataset.travelerPreview === 'tripo';
const query = new URLSearchParams(location.search);
const travelerVariant = travelerPreview && query.get('traveler') !== 'original' ? 'tripo' : 'original';
const travelerPath = travelerVariant === 'tripo' ? 'traveler-tripo/v001/traveler.glb' : 'shared/v001/traveler.glb';
// At the exported 2.017 m height the source strides measure 1.20591 / 4.39490 m/s.
// Only this isolated character preview uses 1.8 / 4.4 m/s (also for the old model
// comparison). The approved environment preview retains its 3.2 m/s movement.
const previewWalkSpeed = travelerPreview ? 1.8 : 3.2;
const previewRunSpeed = 4.4;
// The supplied Run clip reaches 0.8764 m from its root. Keep the shared mover
// unchanged and expand this preview's obstacles by the extra clearance only.
const playerCollisionRadius = travelerPreview ? .9 : PLAYER_RADIUS;
type Variant = 'a' | 'b' | 'c';
const variants: Variant[] = ['a', 'b', 'c'];
const treePaths: Record<Variant, string> = { a: 'environment-sample/v002/tree-a.glb', b: 'environment-sample/v003/tree-b.glb', c: 'environment-sample/v003/tree-c.glb' };
const shrubPaths: Record<Variant, string> = { a: 'environment-sample/v002/shrub-a.glb', b: 'environment-sample/v003/shrub-b.glb', c: 'environment-sample/v003/shrub-c.glb' };
const dunePath = 'environment-sample/v002/dunes.glb';
const environmentViews = {
  road: '道路旁 · 第三人称', 'road-tree': '道路旁 · 树', 'shrub-road': '道路旁 · 灌木',
  'tree-front': '树 · 正面', 'tree-side': '树 · 侧面', 'tree-diagonal': '树 · 斜面',
  'tree-near': '树 · 近看', 'tree-far': '树 · 远看', 'tree-lineup': '三种树 · 同尺度并排',
  'shrub-near': '灌木 · 近看', 'shrub-front': '灌木 · 正面', 'shrub-side': '灌木 · 侧面',
  'shrub-diagonal': '灌木 · 斜面', 'shrub-lineup': '三种灌木 · 同尺度并排',
  dunes: '沙丘 · 第三人称', 'dunes-oblique': '沙丘 · 端部斜看', 'dunes-model': '沙丘 · 全貌', 'dunes-side': '沙丘 · 侧面', 'dunes-diagonal': '沙丘 · 斜面',
};
const travelerViews = {
  'traveler-front': '人物 · 正面', 'traveler-back': '人物 · 背面', 'traveler-side': '人物 · 侧面',
  'traveler-diagonal': '人物 · 斜面', 'traveler-walk': '人物 · 行走动作', 'traveler-run': '人物 · 跑步动作',
};
type View = keyof typeof environmentViews | keyof typeof travelerViews;
const views: Partial<Record<View, string>> = travelerPreview
  ? { road: environmentViews.road, ...travelerViews, dunes: environmentViews.dunes, 'dunes-oblique': environmentViews['dunes-oblique'] }
  : environmentViews;
interface ModelInfo { id: string; path: string; bytes: number; triangles: number; bounds: { min: number[]; max: number[]; size: number[] } }
interface ModelInstance { id: string; path: string; role: 'road' | 'study' | 'lineup'; object: THREE.Object3D }
const variantLabel = (family: 'tree' | 'shrub', variant: Variant) => `${variant.toUpperCase()} · ${family === 'shrub' || variant === 'a' ? '已确认' : '待验收'}`;
const variantOptions = (family: 'tree' | 'shrub') => variants.map(variant => `<option value="${variant}">${variantLabel(family, variant)}</option>`).join('');
root.classList.add('preview-v003');
root.innerHTML = `<div class="preview-host"></div><header class="preview-toolbar"><h1 class="preview-title">独立植被样片 v003</h1><div class="preview-controls"><select aria-label="观察视图" data-testid="environment-view">${Object.entries(views).map(([id, text]) => `<option value="${id}">${text}</option>`).join('')}</select><label class="preview-variant">树<select aria-label="树形选择" data-testid="environment-tree">${variantOptions('tree')}</select></label><label class="preview-variant">灌木<select aria-label="灌木选择" data-testid="environment-shrub">${variantOptions('shrub')}</select></label><button data-testid="environment-reset">重置视角</button></div></header><footer class="preview-footer"><p class="preview-help">WASD / 方向键 行走 · Q / E 转镜头<br>切换树形与灌木，保持同机位、同光照。</p><div class="preview-touch" aria-label="触屏行走"><button data-move="0,-1" aria-label="前进">↑</button><button data-move="-1,0" aria-label="向左">←</button><button data-move="0,1" aria-label="后退">↓</button><button data-move="1,0" aria-label="向右">→</button></div><p class="preview-view-label" data-testid="environment-label"></p></footer><section class="preview-status" data-testid="environment-loading"><div><h2>正在加载独立样片…</h2><p>正在加载环境模型。</p></div></section><section class="preview-status" data-testid="environment-error" role="alert" hidden><div><h2>样片暂未加载完成</h2><p>请重试加载；已有游戏预览可继续使用。</p><button data-testid="environment-retry">重新加载</button></div></section>`;
const host = root.querySelector<HTMLDivElement>('.preview-host')!;
const select = root.querySelector<HTMLSelectElement>('[data-testid=environment-view]')!;
const treeSelect = root.querySelector<HTMLSelectElement>('[data-testid=environment-tree]')!;
const shrubSelect = root.querySelector<HTMLSelectElement>('[data-testid=environment-shrub]')!;
const loadingCover = root.querySelector<HTMLElement>('[data-testid=environment-loading]')!;
const errorCover = root.querySelector<HTMLElement>('[data-testid=environment-error]')!;
const label = root.querySelector<HTMLElement>('[data-testid=environment-label]')!;
if (travelerPreview) {
  root.querySelector<HTMLElement>('.preview-title')!.textContent = '人物模型预览 · 待确认';
  treeSelect.closest<HTMLElement>('.preview-variant')!.style.display = 'none';
  shrubSelect.closest<HTMLElement>('.preview-variant')!.style.display = 'none';
  const travelerControl = document.createElement('label');
  travelerControl.className = 'preview-variant';
  travelerControl.innerHTML = '人物<select aria-label="人物模型选择" data-testid="traveler-select"><option value="tripo">用户模型</option><option value="original">原人物</option></select>';
  root.querySelector<HTMLElement>('.preview-controls')!.insertBefore(travelerControl, root.querySelector('[data-testid=environment-reset]'));
  travelerControl.querySelector('select')!.value = travelerVariant;
  loadingCover.querySelector('p')!.textContent = '正在加载人物与环境模型。';
}
let ready = false, error: string | null = null, view: View = 'road', treeVariant: Variant = 'a', shrubVariant: Variant = 'a';
const initialView = query.get('view');
if (initialView && Object.hasOwn(views, initialView)) view = initialView as View;
const isVariant = (name: string | null): name is Variant => name === 'a' || name === 'b' || name === 'c';
if (isVariant(query.get('tree'))) treeVariant = query.get('tree') as Variant;
if (isVariant(query.get('shrub'))) shrubVariant = query.get('shrub') as Variant;
let setViewImpl: (name: View) => void = () => {}, setSelectionImpl: () => void = () => {};
let snapshotImpl = () => ({ camera: { position: [0, 0, 0], target: [0, 0, 0], fov: 49 }, player: { x: 0, z: 18, heading: 0 } });
let statsImpl = () => ({ triangles: 0, drawCalls: 0, assets: [] as ModelInfo[], models: [] as ModelInfo[], frames: { count: 0, medianMs: 0, p95Ms: 0 }, loadMs: 0 });
const api = {
  get ready() { return ready; },
  setView(name: string) { if (!Object.hasOwn(views, name)) throw new Error('Unknown preview view'); view = name as View; setViewImpl(view); },
  setTreeVariant(name: string) { if (!isVariant(name)) throw new Error('Unknown tree variant'); treeVariant = name; setSelectionImpl(); },
  setShrubVariant(name: string) { if (!isVariant(name)) throw new Error('Unknown shrub variant'); shrubVariant = name; setSelectionImpl(); },
  setTravelerVariant(name: string) {
    if (!travelerPreview || (name !== 'original' && name !== 'tripo')) throw new Error('Unknown traveler preview variant');
    if (name === travelerVariant) return;
    const url = new URL(location.href); url.searchParams.set('traveler', name); url.searchParams.set('view', view);
    location.assign(url.href);
  },
  snapshot: () => ({ view, selection: { tree: treeVariant, shrub: shrubVariant }, ready, error, ...snapshotImpl() }),
  stats: () => statsImpl(),
};
Object.assign(window, { __environmentPreview: api });
select.addEventListener('change', () => api.setView(select.value));
treeSelect.addEventListener('change', () => api.setTreeVariant(treeSelect.value));
shrubSelect.addEventListener('change', () => api.setShrubVariant(shrubSelect.value));
root.querySelector<HTMLSelectElement>('[data-testid=traveler-select]')?.addEventListener('change', event => api.setTravelerVariant((event.target as HTMLSelectElement).value));
root.querySelector('[data-testid=environment-reset]')!.addEventListener('click', () => api.setView(view));
root.querySelector('[data-testid=environment-retry]')!.addEventListener('click', () => location.reload());

function triangleCount(object: THREE.Object3D) {
  let count = 0;
  object.traverse(item => { if (item instanceof THREE.Mesh) count += (item.geometry.index?.count ?? item.geometry.getAttribute('position').count) / 3; });
  return count;
}
function releaseModels(objects: THREE.Object3D[]) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  for (const object of objects) object.traverse(item => {
    if (!(item instanceof THREE.Mesh)) return; geometries.add(item.geometry);
    for (const material of Array.isArray(item.material) ? item.material : [item.material]) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  const images = new Set<ImageBitmap>();
  for (const texture of textures) { if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) images.add(texture.source.data); texture.dispose(); }
  for (const image of images) image.close();
}

/** Exported normals/materials remain intact; only visibility changes between variants. */
function lightingSnapshot(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const lights: Record<string, unknown>[] = [];
  scene.traverse(object => {
    if (!(object instanceof THREE.Light)) return;
    const light: Record<string, unknown> = { type: object.type, color: object.color.getHexString(), intensity: object.intensity, position: object.position.toArray() };
    if (object instanceof THREE.HemisphereLight) light.groundColor = object.groundColor.getHexString();
    if (object instanceof THREE.DirectionalLight) {
      const shadow = object.shadow;
      light.target = object.target.position.toArray();
      light.shadow = { mapSize: shadow.mapSize.toArray(), bias: shadow.bias, normalBias: shadow.normalBias,
        near: shadow.camera.near, far: shadow.camera.far, left: shadow.camera.left, right: shadow.camera.right, top: shadow.camera.top, bottom: shadow.camera.bottom };
    }
    lights.push(light);
  });
  return { exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, colorSpace: renderer.outputColorSpace, shadowMapType: renderer.shadowMap.type, lights };
}

/** Include low cloud foliage as well as branches, clipped at avatar height. */
function treeBodyEnvelope(model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  let radius = 0, matches = 0;
  const bounds = new THREE.Box3();
  const measure = (point: THREE.Vector3) => { radius = Math.max(radius, Math.hypot(point.x, point.z)); bounds.expandByPoint(point); };
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    matches++;
    const positions = object.geometry.getAttribute('position'), indices = object.geometry.index;
    const count = indices?.count ?? positions.count;
    const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    for (let i = 0; i < count; i += 3) {
      for (let k = 0; k < 3; k++) {
        vertices[k].fromBufferAttribute(positions, indices ? indices.getX(i + k) : i + k).applyMatrix4(object.matrixWorld);
        if (vertices[k].y <= 2.1) measure(vertices[k]);
      }
      for (let k = 0; k < 3; k++) {
        const a = vertices[k], b = vertices[(k + 1) % 3];
        if ((a.y <= 2.1) === (b.y <= 2.1)) continue;
        const t = (2.1 - a.y) / (b.y - a.y);
        measure(new THREE.Vector3(a.x + (b.x - a.x) * t, 2.1, a.z + (b.z - a.z) * t));
      }
    }
  });
  if (!matches || !Number.isFinite(radius) || radius <= 0) throw new Error('Missing low tree collision geometry');
  return { radius: Math.ceil((radius + .03) * 100) / 100,
    minX: bounds.min.x - .03, maxX: bounds.max.x + .03, minZ: bounds.min.z - .03, maxZ: bounds.max.z + .03 };
}

/** Paving follows the accepted road ribbon; large irregular slabs, not gravel. */
function paving() {
  const group = new THREE.Group(); group.name = 'preview-only-stone-paving';
  const materials = ['#c6b498', '#d1bea0', '#bcaa8d', '#d8c7a9'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  let distance = 0, stone = 0;
  for (let index = 1; index < COURTYARD_ROAD.length; index++) {
    const a = COURTYARD_ROAD[index - 1], b = COURTYARD_ROAD[index];
    distance += Math.hypot(b.center.x - a.center.x, b.center.z - a.center.z);
    if (distance < .95 || b.center.z < 3) continue;
    distance = 0;
    const angle = Math.atan2(b.center.x - a.center.x, b.center.z - a.center.z);
    for (let column = 0; column < 3; column++) {
      const seed = stone++;
      const shape = new THREE.Shape();
      const points = [[-.43, -.39], [.26, -.44], [.43, -.24], [.39, .34], [-.24, .43], [-.45, .18]];
      for (let p = 0; p < points.length; p++) {
        const [x, z] = points[p], jitter = Math.sin(seed * 13.37 + p * 7.9) * .045;
        if (!p) shape.moveTo(x + jitter, z); else shape.lineTo(x + jitter, z);
      }
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: .055, bevelEnabled: true, bevelSegments: 1, bevelSize: .025, bevelThickness: .015, steps: 1 });
      geometry.rotateX(-Math.PI / 2);
      const slab = new THREE.Mesh(geometry, materials[seed % materials.length]);
      const offset = (column - 1) * .98;
      slab.position.set(b.center.x + Math.cos(angle) * offset, .012, b.center.z - Math.sin(angle) * offset);
      slab.rotation.y = angle + Math.sin(seed * 5.2) * .045; slab.castShadow = true; slab.receiveShadow = true; group.add(slab);
    }
  }
  // Bake the small slabs into four static material batches rather than drawing each slab.
  group.updateMatrixWorld(true);
  const batches = materials.map(material => ({ material, geometries: [] as THREE.BufferGeometry[] }));
  for (const object of group.children) {
    const slab = object as THREE.Mesh;
    slab.geometry.applyMatrix4(slab.matrixWorld);
    batches[materials.indexOf(slab.material as THREE.MeshStandardMaterial)].geometries.push(slab.geometry);
  }
  group.clear();
  for (const { material, geometries } of batches) {
    const geometry = mergeGeometries(geometries);
    for (const source of geometries) source.dispose();
    if (geometry) { const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
  }
  return group;
}

async function start() {
  const started = performance.now();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', '独立自然环境样片画面'); host.appendChild(renderer.domElement);
  const world = createArtSampleScene(travelerVariant === 'tripo'
    ? { travelerPath, animationRates: { walk: 3.2 / 1.20591, run: 5.7 / 4.39490 } }
    : undefined); // The ordinary environment entry retains the loader's old defaults.
  const camera = new THREE.PerspectiveCamera(49, 1, .1, 300), target = new THREE.Vector3();
  const oldFog = world.scene.fog, oldBackground = world.scene.background;
  const owned: THREE.Object3D[] = [], modelInfo: ModelInfo[] = [];
  const abort = new AbortController(); let disposed = false, raf = 0, previous = 0, elapsed = 0, loadMs = 0;
  const frameTimes: number[] = [];
  const player = { x: 0, z: 18, heading: 0 }; let yaw = 0;
  const input = createWorldInput(renderer.domElement, () => {}, delta => { yaw = THREE.MathUtils.clamp(yaw + delta, -1.05, 1.05); }); input.setEnabled(false);
  const loader = new GLTFLoader();
  let resizeStudy = () => {};
  const loadingTimeout = setTimeout(() => abort.abort(), 30_000);
  const cleanup = () => {
    if (disposed) return; disposed = true; ready = false; abort.abort(); clearTimeout(loadingTimeout); cancelAnimationFrame(raf);
    input.dispose(); resize.disconnect(); world.dispose(); releaseModels(owned); renderer.dispose(); renderer.forceContextLoss();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  const resize = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight, false); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); resizeStudy(); }); resize.observe(host);
  async function model(id: string, path: string) {
    const response = await fetch(worldAssetUrl(path), { signal: abort.signal }); if (!response.ok) throw new Error('Asset unavailable');
    const bytes = await response.arrayBuffer(); const gltf = await loader.parseAsync(bytes, new URL('.', new URL(worldAssetUrl(path), document.baseURI)).href);
    if (disposed || abort.signal.aborted) { releaseModels([gltf.scene]); throw new Error('Loading cancelled'); }
    owned.push(gltf.scene); gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    gltf.scene.updateMatrixWorld(true); const bounds = new THREE.Box3().setFromObject(gltf.scene, true);
    modelInfo.push({ id, path, bytes: bytes.byteLength, triangles: triangleCount(gltf.scene), bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() } });
    return gltf.scene;
  }
  try {
    const [, treeA, shrubA, dunes, treeB, treeC, shrubB, shrubC] = await Promise.all([world.ready,
      model('tree-a', treePaths.a), model('shrub-a', shrubPaths.a), model('dunes', dunePath),
      model('tree-b', treePaths.b), model('tree-c', treePaths.c), model('shrub-b', shrubPaths.b), model('shrub-c', shrubPaths.c)]);
    if (disposed) return; clearTimeout(loadingTimeout);
    world.scene.updateMatrixWorld(true);
    const contextNodes = [...world.scene.children].filter(node => !(node instanceof THREE.Light) && node !== world.traveler && node.type !== 'Object3D');
    // glTF turns a multi-material mesh into a Group. Select semantic roots across
    // every Object3D type, so hiding a tree includes all of its leaf primitives.
    const semanticName = (object: THREE.Object3D) => String(object.userData.semanticGroup ?? object.name);
    const matchingRoots = (match: (name: string) => boolean) => {
      const candidates = new Set<THREE.Object3D>();
      world.scene.traverse(object => { if (match(semanticName(object)) || match(object.name)) candidates.add(object); });
      return [...candidates].filter(object => {
        for (let parent = object.parent; parent; parent = parent.parent) if (candidates.has(parent)) return false;
        return true;
      });
    };
    const oldNatural = matchingRoots(name => /^(tree-|shrub-|road-grass|dune-|cliff-|boundary-)/.test(name));
    const trees: Record<Variant, THREE.Object3D> = { a: treeA, b: treeB, c: treeC };
    const shrubs: Record<Variant, THREE.Object3D> = { a: shrubA, b: shrubB, c: shrubC };
    // Clone at the exported origin before any road placement. All clones share
    // the owned source materials/geometries, which are released exactly once.
    const treeStudies = { a: treeA.clone(), b: treeB.clone(), c: treeC.clone() };
    const shrubStudies = { a: shrubA.clone(), b: shrubB.clone(), c: shrubC.clone() };
    const treeLineup = { a: treeA.clone(), b: treeB.clone(), c: treeC.clone() };
    const shrubLineup = { a: shrubA.clone(), b: shrubB.clone(), c: shrubC.clone() };
    const duneStudy = dunes.clone();
    const instances: ModelInstance[] = [];
    const register = (id: string, path: string, role: ModelInstance['role'], object: THREE.Object3D) => {
      instances.push({ id, path, role, object }); world.scene.add(object);
    };
    for (const [index, variant] of variants.entries()) {
      trees[variant].position.set(4.8, 0, 13);
      shrubs[variant].position.set(-2.9, 0, 16.2);
      treeLineup[variant].position.set((index - 1) * 6, 0, 0);
      shrubLineup[variant].position.set((index - 1) * 2.6, 0, 0);
      register(`tree-${variant}`, treePaths[variant], 'road', trees[variant]);
      register(`shrub-${variant}`, shrubPaths[variant], 'road', shrubs[variant]);
      register(`tree-${variant}`, treePaths[variant], 'study', treeStudies[variant]);
      register(`shrub-${variant}`, shrubPaths[variant], 'study', shrubStudies[variant]);
      register(`tree-${variant}`, treePaths[variant], 'lineup', treeLineup[variant]);
      register(`shrub-${variant}`, shrubPaths[variant], 'lineup', shrubLineup[variant]);
    }
    dunes.position.set(55, 0, 12); dunes.rotation.y = -Math.PI / 2;
    register('dunes', dunePath, 'road', dunes); register('dunes', dunePath, 'study', duneStudy);
    const pavingGroup = paving(); owned.push(pavingGroup); world.scene.add(pavingGroup);
    const neutral = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#d8d4c9', roughness: 1 }));
    neutral.rotation.x = -Math.PI / 2; neutral.position.y = -.025; neutral.receiveShadow = true; owned.push(neutral); world.scene.add(neutral);
    const referenceInfo = (id: string, path: string, object: THREE.Object3D) => {
      const bounds = new THREE.Box3().setFromObject(object, true);
      const resource = performance.getEntriesByName(new URL(worldAssetUrl(path), document.baseURI).href).at(-1) as PerformanceResourceTiming | undefined;
      modelInfo.push({ id, path, bytes: resource?.encodedBodySize ?? 0, triangles: triangleCount(object),
        bounds: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new THREE.Vector3()).toArray() } });
    };
    const oldRoot = contextNodes.find(node => node.type === 'Group' && node !== world.traveler);
    if (oldRoot) referenceInfo('courtyard-reference', 'courtyard/v002/courtyard.glb', oldRoot);
    referenceInfo('traveler-reference', travelerPath, world.traveler);
    const isWalkingView = () => view === 'road' || view === 'dunes';
    const isTravelerStudy = () => travelerPreview && view.startsWith('traveler-');
    const isStudy = () => !isWalkingView() && view !== 'road-tree' && view !== 'shrub-road' && view !== 'dunes-oblique';
    function visibility() {
      const study = isStudy();
      for (const node of contextNodes) node.visible = !study;
      // Original map vegetation/mountains never participate in the variant comparison.
      for (const node of oldNatural) node.visible = false;
      world.traveler.visible = !study || isTravelerStudy(); pavingGroup.visible = !study; neutral.visible = study;
      for (const instance of instances) instance.object.visible = false;
      if (study && !isTravelerStudy()) {
        if (view === 'tree-lineup') for (const variant of variants) treeLineup[variant].visible = true;
        else if (view === 'shrub-lineup') for (const variant of variants) shrubLineup[variant].visible = true;
        else if (view.startsWith('tree')) treeStudies[treeVariant].visible = true;
        else if (view.startsWith('shrub')) shrubStudies[shrubVariant].visible = true;
        else duneStudy.visible = true;
      } else if (!study) {
        dunes.visible = true;
        if (!view.startsWith('dunes')) { trees[treeVariant].visible = true; shrubs[shrubVariant].visible = true; }
      }
      world.scene.fog = study ? null : oldFog; world.scene.background = study ? new THREE.Color('#e8e6df') : oldBackground;
      label.textContent = view.endsWith('lineup') ? `${views[view]} · 左 A / 中 B / 右 C`
        : view.startsWith('dunes') ? `${views[view]} · 已确认`
        : view.startsWith('shrub') ? `${views[view]} · ${variantLabel('shrub', shrubVariant)}`
        : view === 'road' ? `树 ${variantLabel('tree', treeVariant)} · 灌木 ${variantLabel('shrub', shrubVariant)}`
        : `${views[view]} · ${variantLabel('tree', treeVariant)}`;
      if (travelerPreview) label.textContent = `${views[view]} · ${travelerVariant === 'tripo' ? '用户模型' : '原人物'}`;
      treeSelect.value = treeVariant; shrubSelect.value = shrubVariant;
      input.setEnabled(isWalkingView() && ready);
      root.querySelector<HTMLElement>('.preview-touch')!.hidden = !isWalkingView();
      root.querySelector<HTMLElement>('.preview-help')!.innerHTML = isWalkingView()
        ? 'WASD / 方向键 行走 · Q / E 转镜头<br>切换树形与灌木，保持同机位、同光照。'
        : view === 'tree-lineup' ? '从左到右 A / B / C，均为原尺寸。<br>A 已确认；B / C 待验收。'
        : view === 'shrub-lineup' ? '从左到右 A / B / C，均为原尺寸。<br>三种灌木均已确认。'
        : '切换树形与灌木，保持同机位、同光照。';
      if (travelerPreview) root.querySelector<HTMLElement>('.preview-help')!.innerHTML = isWalkingView()
        ? 'WASD / 方向键 行走 · Shift 跑步 · Q / E 转镜头<br>原人物与用户模型保持同机位、同光照。'
        : '切换角度与动作查看。<br>原人物与用户模型保持同机位、同光照。';
    }
    function pose(position: number[], lookAt: number[]) { camera.position.fromArray(position); target.fromArray(lookAt); camera.lookAt(target); }
    // Only the two new lineup views fit the shared, unscaled group envelope.
    // Existing fourteen cameras retain their accepted v002 positions verbatim.
    function poseLineup(objects: THREE.Object3D[]) {
      const bounds = new THREE.Box3();
      for (const object of objects) bounds.union(new THREE.Box3().setFromObject(object, true));
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const verticalHalfAngle = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = Math.max(size.y * .5, size.x / camera.aspect * .5) / Math.tan(verticalHalfAngle) * 1.35 + size.z / 2;
      const position = center.clone().add(new THREE.Vector3(0, distance * .08, distance));
      pose(position.toArray(), center.toArray());
    }
    resizeStudy = () => {
      if (view === 'tree-lineup') poseLineup(Object.values(treeLineup));
      else if (view === 'shrub-lineup') poseLineup(Object.values(shrubLineup));
    };
    const worldYaw = () => yaw + (view === 'dunes' ? -Math.PI / 2 - .35 : view === 'dunes-oblique' ? -Math.PI / 2 + .4 : 0);
    function updateFollow() {
      target.set(player.x, 1.8, player.z);
      camera.position.copy(target).add(new THREE.Vector3(Math.sin(worldYaw()) * 9.2, 2.7, Math.cos(worldYaw()) * 9.2)); camera.lookAt(target);
      world.traveler.position.set(player.x, 0, player.z); world.traveler.rotation.y = player.heading;
    }
    setViewImpl = name => {
      view = name; select.value = name; yaw = 0; input.clear();
      if (name === 'road') { Object.assign(player, { x: 0, z: 18, heading: 0 }); updateFollow(); }
      else if (name === 'dunes') { Object.assign(player, { x: 20, z: -4, heading: -Math.PI / 2 - .35 }); updateFollow(); }
      else if (name === 'dunes-oblique') { Object.assign(player, { x: 24, z: 25, heading: -Math.PI / 2 + .4 }); updateFollow(); }
      else if (name === 'road-tree') { Object.assign(player, { x: 0, z: 18, heading: 0 }); updateFollow(); pose([13, 4.5, 22], [4.8, 2.7, 13]); }
      else if (name === 'shrub-road') { Object.assign(player, { x: 0, z: 18, heading: 0 }); updateFollow(); pose([-5.9, 1.3, 19.7], [-2.9, .4, 16.2]); }
      else if (name.startsWith('traveler-')) {
        Object.assign(player, { x: 0, z: 0, heading: 0 }); updateFollow();
        // Both models face -Z. Studio comparisons share camera and physical scale.
        if (name === 'traveler-front') pose([0, 1.35, -5], [0, 1.05, 0]);
        else if (name === 'traveler-back') pose([0, 1.35, 5], [0, 1.05, 0]);
        else if (name === 'traveler-side') pose([5, 1.35, 0], [0, 1.05, 0]);
        else pose([-3.8, 1.5, -4.4], [0, 1.05, 0]);
      }
      else if (name === 'tree-front') pose([0, 3.4, 12], [0, 3, 0]);
      else if (name === 'tree-side') pose([12, 3.4, 0], [0, 3, 0]);
      else if (name === 'tree-diagonal') pose([9, 4.2, 10], [0, 3, 0]);
      else if (name === 'tree-near') pose([5.4, 3.6, 7.2], [0, 3, 0]);
      else if (name === 'tree-far') pose([0, 4.1, 18], [0, 3, 0]);
      else if (name === 'shrub-near') pose([2.2, 1.25, 3], [0, .38, 0]);
      else if (name === 'shrub-front') pose([0, 1.1, 4], [0, .38, 0]);
      else if (name === 'shrub-side') pose([4, 1.1, 0], [0, .38, 0]);
      else if (name === 'shrub-diagonal') pose([2.8, 1.3, 3.2], [0, .38, 0]);
      else if (name === 'tree-lineup') poseLineup(Object.values(treeLineup));
      else if (name === 'shrub-lineup') poseLineup(Object.values(shrubLineup));
      else if (name === 'dunes-side') pose([108, 31, 0], [0, 3, 0]);
      else if (name === 'dunes-diagonal') pose([72, 42, 74], [0, 3, 0]);
      else pose([0, 35, 120], [0, 3, 0]);
      visibility();
    };
    setSelectionImpl = () => { visibility(); renderer.render(world.scene, camera); };
    // Derive collision from each unscaled model's actual low wood and closed foliage.
    const envelopes = { a: treeBodyEnvelope(treeStudies.a), b: treeBodyEnvelope(treeStudies.b), c: treeBodyEnvelope(treeStudies.c) };
    const collisionRadii = { a: envelopes.a.radius, b: envelopes.b.radius, c: envelopes.c.radius };
    // A shared low-geometry envelope keeps variant changes safe without moving
    // the camera. Its asymmetric bounds preserve the full road beside leaning C.
    const walkingCollisionRadius = Math.max(...Object.values(collisionRadii));
    const walkingCollider: WorldCollider = {
      id: 'preview-low-tree-envelope', height: 2.1,
      minX: 4.8 + Math.min(...Object.values(envelopes).map(item => item.minX)),
      maxX: 4.8 + Math.max(...Object.values(envelopes).map(item => item.maxX)),
      minZ: 13 + Math.min(...Object.values(envelopes).map(item => item.minZ)),
      maxZ: 13 + Math.max(...Object.values(envelopes).map(item => item.maxZ)),
    };
    const staticColliders = WORLD_COLLIDERS.filter(item => !item.id?.startsWith('tree-'));
    const collisionPadding = playerCollisionRadius - PLAYER_RADIUS;
    const colliders = [...staticColliders, walkingCollider].map(collider => collisionPadding > 0 ? {
      ...collider,
      minX: collider.minX - collisionPadding, maxX: collider.maxX + collisionPadding,
      minZ: collider.minZ - collisionPadding, maxZ: collider.maxZ + collisionPadding,
      ...(collider.circle ? { circle: { ...collider.circle, radius: collider.circle.radius + collisionPadding } } : {}),
    } : collider);
    root.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => {
      const [x, y] = button.dataset.move!.split(',').map(Number);
      button.addEventListener('pointerdown', event => { button.setPointerCapture(event.pointerId); input.setJoystick(x, y); });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => input.setJoystick(0, 0));
    });
    const instanceSnapshot = ({ id, path, role, object }: ModelInstance) => ({ id, path, role,
      position: object.position.toArray(), rotation: object.rotation.toArray().slice(0, 3), scale: object.scale.toArray() });
    const boneSnapshot = () => {
      const bones: { name: string; position: number[]; quaternion: number[] }[] = [];
      world.traveler.traverse(object => {
        if (object instanceof THREE.Bone) bones.push({ name: object.name, position: object.position.toArray(), quaternion: object.quaternion.toArray() });
      });
      return bones;
    };
    snapshotImpl = () => ({ camera: { position: camera.position.toArray(), target: target.toArray(), fov: camera.fov }, player: { ...player },
      actualAnimation: world.animationName(), travelerPath, travelerVariant, bones: boneSnapshot(),
      lighting: lightingSnapshot(world.scene, renderer),
      fog: world.scene.fog instanceof THREE.Fog ? { color: world.scene.fog.color.getHexString(), near: world.scene.fog.near, far: world.scene.fog.far } : null,
      collisionRadii, walkingCollisionRadius, walkingCollider, playerCollisionRadius,
      placements: instances.map(instanceSnapshot),
      activeModels: instances.filter(instance => instance.object.visible).map(instanceSnapshot),
    });
    statsImpl = () => {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      return { triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, assets: modelInfo, models: modelInfo,
        referenceNatureVisible: oldNatural.filter(node => node.visible).length,
        frames: { count: sorted.length, medianMs: sorted[Math.floor(sorted.length / 2)] ?? 0, p95Ms: sorted[Math.floor(sorted.length * .95)] ?? 0 }, loadMs };
    };
    function frame(time: number) {
      if (disposed) return;
      if (document.hidden) { input.clear(); previous = 0; raf = requestAnimationFrame(frame); return; }
      const rawDt = previous ? (time - previous) / 1000 : 0; previous = time;
      const dt = Math.min(.05, rawDt); elapsed += dt;
      if (rawDt > 0 && !document.hidden) { frameTimes.push(rawDt * 1000); if (frameTimes.length > 600) frameTimes.shift(); }
      let speed = 0;
      if (isWalkingView() && !document.hidden) {
        const control = input.read(); yaw = THREE.MathUtils.clamp(yaw + control.camera * dt * .65, -1.05, 1.05);
        const direction = movementVector(control.x, control.y, worldYaw());
        const movementSpeed = travelerPreview && control.run ? previewRunSpeed : previewWalkSpeed;
        const moved = movePlayer(player, { x: direction.x * movementSpeed * dt, z: direction.z * movementSpeed * dt }, colliders);
        const x = THREE.MathUtils.clamp(moved.x, view === 'dunes' ? 12 : -14, view === 'dunes' ? 26 : 11);
        const z = THREE.MathUtils.clamp(moved.z, view === 'dunes' ? -8 : 5, view === 'dunes' ? 8 : 25);
        speed = dt ? Math.hypot(x - player.x, z - player.z) / dt : 0;
        player.x = x; player.z = z;
        if (speed > .02) player.heading = Math.atan2(-direction.x, -direction.z);
        updateFollow();
      }
      if (travelerPreview && view === 'traveler-walk') speed = previewWalkSpeed;
      else if (travelerPreview && view === 'traveler-run') speed = previewRunSpeed;
      world.animateTraveler(speed, elapsed, false);
      renderer.render(world.scene, camera); raf = requestAnimationFrame(frame);
    }
    ready = true; loadMs = performance.now() - started; loadingCover.hidden = true; setViewImpl(view); raf = requestAnimationFrame(frame);
  } catch {
    error = '独立样片资源未加载完成'; cleanup(); loadingCover.hidden = true; errorCover.hidden = false;
  }
}
void start().catch(() => { ready = false; error = '浏览器暂时无法打开3D样片'; loadingCover.hidden = true; errorCover.hidden = false; });
