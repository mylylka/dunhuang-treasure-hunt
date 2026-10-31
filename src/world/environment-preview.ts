import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import courtyardProps from '../content/world/courtyard-props.json';
import { createArtSampleScene } from './art-sample';
import { createWorldInput } from './input';
import { COURTYARD_ROAD } from './road';
import { movementVector, movePlayer, WORLD_COLLIDERS, type WorldCollider } from './movement';
import { worldAssetUrl } from '../content/world/assets';
import './environment-preview.css';

type Version = 'old' | 'new';
const views = {
  road: '道路旁 · 第三人称', 'road-tree': '道路旁 · A型树', 'shrub-road': '道路旁 · 灌木',
  'tree-front': 'A型树 · 正面', 'tree-side': 'A型树 · 侧面', 'tree-diagonal': 'A型树 · 斜面',
  'tree-near': 'A型树 · 近看', 'tree-far': 'A型树 · 远看', 'shrub-near': '低矮灌木 · 近看',
  dunes: '沙丘 · 第三人称', 'dunes-oblique': '沙丘 · 端部斜看', 'dunes-model': '沙丘 · 全貌', 'dunes-side': '沙丘 · 侧面', 'dunes-diagonal': '沙丘 · 斜面',
};
type View = keyof typeof views;
interface ModelInfo { id: string; path: string; bytes: number; triangles: number; bounds: { min: number[]; max: number[]; size: number[] } }
const root = document.getElementById('preview')!;
root.innerHTML = `<div class="preview-host"></div><header class="preview-toolbar"><h1 class="preview-title">独立自然环境样片 · 待验收</h1><div class="preview-controls"><select aria-label="观察视图" data-testid="environment-view">${Object.entries(views).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select><div class="preview-toggle" role="group" aria-label="版本对照"><button data-version="old" aria-pressed="false">旧版</button><button data-version="new" aria-pressed="true">本次小样</button></div><button data-testid="environment-reset">重置视角</button></div></header><footer class="preview-footer"><p class="preview-help">WASD / 方向键 行走 · Q / E 转镜头<br>同机位、同光照比较；本页不保存游戏进度。</p><div class="preview-touch" aria-label="触屏行走"><button data-move="0,-1" aria-label="前进">↑</button><button data-move="-1,0" aria-label="向左">←</button><button data-move="0,1" aria-label="后退">↓</button><button data-move="1,0" aria-label="向右">→</button></div><p class="preview-view-label" data-testid="environment-label"></p></footer><section class="preview-status" data-testid="environment-loading"><div><h2>正在加载独立样片…</h2><p>正在加载环境模型。</p></div></section><section class="preview-status" data-testid="environment-error" role="alert" hidden><div><h2>样片暂未加载完成</h2><p>请重试加载；已有游戏预览可继续使用。</p><button data-testid="environment-retry">重新加载</button></div></section>`;
const host = root.querySelector<HTMLDivElement>('.preview-host')!;
const select = root.querySelector<HTMLSelectElement>('select')!;
const loadingCover = root.querySelector<HTMLElement>('[data-testid=environment-loading]')!;
const errorCover = root.querySelector<HTMLElement>('[data-testid=environment-error]')!;
const label = root.querySelector<HTMLElement>('[data-testid=environment-label]')!;
let ready = false, error: string | null = null, view: View = 'road', version: Version = 'new';
let setViewImpl: (name: View) => void = () => {}, setVersionImpl: (name: Version) => void = () => {};
let snapshotImpl = () => ({ camera: { position: [0, 0, 0], target: [0, 0, 0], fov: 49 }, player: { x: 0, z: 18, heading: 0 } });
let statsImpl = () => ({ triangles: 0, drawCalls: 0, models: [] as ModelInfo[], frames: { count: 0, medianMs: 0, p95Ms: 0 }, loadMs: 0 });
const api = {
  get ready() { return ready; },
  setView(name: string) { if (!(name in views)) throw new Error('Unknown preview view'); view = name as View; setViewImpl(view); },
  setVersion(name: string) { if (name !== 'old' && name !== 'new') throw new Error('Unknown preview version'); version = name; setVersionImpl(version); },
  snapshot: () => ({ view, version, ready, error, ...snapshotImpl() }),
  stats: () => statsImpl(),
};
Object.assign(window, { __environmentPreview: api });
select.addEventListener('change', () => api.setView(select.value));
root.querySelectorAll<HTMLButtonElement>('[data-version]').forEach(button => button.addEventListener('click', () => api.setVersion(button.dataset.version!)));
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
  const world = createArtSampleScene(); // A separate instance; all old assets remain unchanged on disk.
  const camera = new THREE.PerspectiveCamera(49, 1, .1, 300), target = new THREE.Vector3();
  const oldFog = world.scene.fog, oldBackground = world.scene.background;
  const owned: THREE.Object3D[] = [], modelInfo: ModelInfo[] = [];
  const abort = new AbortController(); let disposed = false, raf = 0, previous = 0, elapsed = 0, loadMs = 0;
  const frameTimes: number[] = [];
  const player = { x: 0, z: 18, heading: 0 }; let yaw = 0;
  const input = createWorldInput(renderer.domElement, () => {}, delta => { yaw = THREE.MathUtils.clamp(yaw + delta, -1.05, 1.05); }); input.setEnabled(false);
  const loader = new GLTFLoader();
  const loadingTimeout = setTimeout(() => abort.abort(), 30_000);
  const cleanup = () => {
    if (disposed) return; disposed = true; ready = false; abort.abort(); clearTimeout(loadingTimeout); cancelAnimationFrame(raf);
    input.dispose(); resize.disconnect(); world.dispose(); releaseModels(owned); renderer.dispose(); renderer.forceContextLoss();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  const resize = new ResizeObserver(() => { renderer.setSize(host.clientWidth, host.clientHeight, false); camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); }); resize.observe(host);
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
    const [, tree, shrub, dunes] = await Promise.all([world.ready,
      model('tree-a', 'environment-sample/v001/tree-a.glb'), model('shrub-a', 'environment-sample/v001/shrub-a.glb'), model('dunes', 'environment-sample/v001/dunes.glb')]);
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
    const oldTrees = matchingRoots(name => name.startsWith('tree-road-east'));
    const oldShrubs = matchingRoots(name => name.startsWith('shrub-road-west-one'));
    const oldDunes = matchingRoots(name => name.startsWith('dune-'));
    const isolate = (objects: THREE.Object3D[], centre: THREE.Vector3) => {
      const group = new THREE.Group();
      for (const source of objects) {
        const clone = source.clone(); source.matrixWorld.decompose(clone.position, clone.quaternion, clone.scale); clone.position.sub(centre); clone.visible = true; group.add(clone);
      }
      world.scene.add(group); return group;
    };
    const oldTreeStudy = isolate(oldTrees, new THREE.Vector3(5, 0, 13));
    const oldShrubPlacement = courtyardProps.props.find(prop => prop.id === 'shrub-road-west-one')!;
    const oldShrubStudy = isolate(oldShrubs, new THREE.Vector3(oldShrubPlacement.x, oldShrubPlacement.y, oldShrubPlacement.z));
    const oldDuneStudy = isolate(oldDunes.filter(node => /^dune-east-[123]$/.test(node.name)), new THREE.Vector3(66.2, 0, -3));
    oldDuneStudy.rotation.y = Math.PI / 2;
    const oldTreeContext = oldTreeStudy.clone(), oldShrubContext = oldShrubStudy.clone();
    oldTreeContext.position.set(4.8, 0, 13); oldShrubContext.position.set(-2.9, 0, 16.2);
    world.scene.add(oldTreeContext, oldShrubContext);
    const newTreeStudy = tree.clone(), newShrubStudy = shrub.clone(), newDuneStudy = dunes.clone();
    const studies = [oldTreeStudy, oldShrubStudy, oldDuneStudy, newTreeStudy, newShrubStudy, newDuneStudy];
    for (const object of [newTreeStudy, newShrubStudy, newDuneStudy]) world.scene.add(object);
    tree.position.set(4.8, 0, 13); shrub.position.set(-2.9, 0, 16.2); dunes.position.set(55, 0, 12); dunes.rotation.y = -Math.PI / 2;
    world.scene.add(tree, shrub, dunes);
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
    referenceInfo('traveler-reference', 'shared/v001/traveler.glb', world.traveler);
    const isWalkingView = () => view === 'road' || view === 'dunes';
    const isStudy = () => !isWalkingView() && view !== 'road-tree' && view !== 'shrub-road' && view !== 'dunes-oblique';
    function visibility() {
      const study = isStudy();
      for (const node of contextNodes) node.visible = !study;
      for (const node of oldNatural) node.visible = !study && version === 'old' && !oldTrees.includes(node) && !oldShrubs.includes(node)
        && (!view.startsWith('dunes') || oldDunes.includes(node));
      oldTreeContext.visible = oldShrubContext.visible = !study && !view.startsWith('dunes') && version === 'old';
      world.traveler.visible = !study; pavingGroup.visible = !study; neutral.visible = study;
      dunes.visible = !study && version === 'new';
      tree.visible = shrub.visible = !study && !view.startsWith('dunes') && version === 'new';
      for (const node of studies) node.visible = false;
      if (study) {
        const which = view.startsWith('tree') ? (version === 'old' ? oldTreeStudy : newTreeStudy)
          : view === 'shrub-near' ? (version === 'old' ? oldShrubStudy : newShrubStudy)
          : version === 'old' ? oldDuneStudy : newDuneStudy;
        which.visible = true;
      }
      world.scene.fog = study ? null : oldFog; world.scene.background = study ? new THREE.Color('#e8e6df') : oldBackground;
      label.textContent = `${views[view]} · ${version === 'old' ? '旧版对照' : '本次小样'}`;
      root.querySelectorAll<HTMLButtonElement>('[data-version]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.version === version)));
      input.setEnabled(isWalkingView() && ready);
      root.querySelector<HTMLElement>('.preview-help')!.innerHTML = isWalkingView()
        ? 'WASD / 方向键 行走 · Q / E 转镜头<br>同机位、同光照比较；本页不保存游戏进度。'
        : '切换视图检查整体轮廓与细节。<br>旧版与小样保持同一机位、同一光照。';
    }
    function pose(position: number[], lookAt: number[]) { camera.position.fromArray(position); target.fromArray(lookAt); camera.lookAt(target); }
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
      else if (name === 'tree-front') pose([0, 3.4, 12], [0, 3, 0]);
      else if (name === 'tree-side') pose([12, 3.4, 0], [0, 3, 0]);
      else if (name === 'tree-diagonal') pose([9, 4.2, 10], [0, 3, 0]);
      else if (name === 'tree-near') pose([5.4, 3.6, 7.2], [0, 3, 0]);
      else if (name === 'tree-far') pose([0, 4.1, 18], [0, 3, 0]);
      else if (name === 'shrub-near') pose([2.2, 1.25, 3], [0, .38, 0]);
      else if (name === 'dunes-side') pose([108, 31, 0], [0, 3, 0]);
      else if (name === 'dunes-diagonal') pose([72, 42, 74], [0, 3, 0]);
      else pose([0, 35, 120], [0, 3, 0]);
      visibility();
    };
    setVersionImpl = name => { version = name; visibility(); renderer.render(world.scene, camera); };
    // Measured trunk/branch envelope below 2.1m is 0.944353m; keep a small clearance.
    const treeCollider: WorldCollider = { minX: 3.83, maxX: 5.77, minZ: 12.03, maxZ: 13.97, height: 2.1, circle: { x: 4.8, z: 13, radius: .97 } };
    const colliders = [...WORLD_COLLIDERS.filter(item => !item.id?.startsWith('tree-')), treeCollider];
    const oldColliders = [...WORLD_COLLIDERS.filter(item => item.id !== 'tree-road-east'), treeCollider];
    root.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(button => {
      const [x, y] = button.dataset.move!.split(',').map(Number);
      button.addEventListener('pointerdown', event => { button.setPointerCapture(event.pointerId); input.setJoystick(x, y); });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => input.setJoystick(0, 0));
    });
    snapshotImpl = () => ({ camera: { position: camera.position.toArray(), target: target.toArray(), fov: camera.fov }, player: { ...player } });
    statsImpl = () => {
      const sorted = [...frameTimes].sort((a, b) => a - b);
      return { triangles: renderer.info.render.triangles, drawCalls: renderer.info.render.calls, models: modelInfo,
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
        const moved = movePlayer(player, { x: direction.x * 3.2 * dt, z: direction.z * 3.2 * dt }, version === 'old' ? oldColliders : colliders);
        const x = THREE.MathUtils.clamp(moved.x, view === 'dunes' ? 12 : -14, view === 'dunes' ? 26 : 11);
        const z = THREE.MathUtils.clamp(moved.z, view === 'dunes' ? -8 : 5, view === 'dunes' ? 8 : 25);
        speed = dt ? Math.hypot(x - player.x, z - player.z) / dt : 0;
        player.x = x; player.z = z;
        if (speed > .02) player.heading = Math.atan2(-direction.x, -direction.z);
        updateFollow();
      }
      world.animateTraveler(speed, elapsed, false);
      renderer.render(world.scene, camera); raf = requestAnimationFrame(frame);
    }
    ready = true; loadMs = performance.now() - started; loadingCover.hidden = true; setViewImpl(view); raf = requestAnimationFrame(frame);
  } catch {
    error = '独立样片资源未加载完成'; cleanup(); loadingCover.hidden = true; errorCover.hidden = false;
  }
}
void start().catch(() => { ready = false; error = '浏览器暂时无法打开3D样片'; loadingCover.hidden = true; errorCover.hidden = false; });
