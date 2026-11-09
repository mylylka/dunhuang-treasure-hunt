import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';
import {
  isMogaoHallAApproach,
  type MogaoHallARect, type MogaoHallAStoryId, type MogaoHallAWallId,
} from '../content/world/mogao-hall-a-layout-v001';
import { MOGAO_HALL_A_LAYOUT as layout } from '../content/world/mogao-hall-a-layout-v002';
import storyData from '../content/world/mogao-hall-a-v001.json';
import upperLayout from '../content/world/mogao-upper-v002.json';
import type { WorldPoint } from './types';

export type { MogaoHallAStoryId } from '../content/world/mogao-hall-a-layout-v001';
type TextureTier = 'mobile' | 'desktop';
type AssetStatus = 'idle' | 'loading' | 'ready' | 'failed';
type AssetId = MogaoHallAStoryId | `${MogaoHallAStoryId}-title` | 'plaque';
type Face = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

const folder = 'mogao-hall-a/v001/';
const ceiling = upperLayout.solids.find(solid => solid.id === 'a-vault-ceiling')!;
const lift = { A: 5.89, B: 6.07, C: 5.77, D: 5.73 } as const;

function defaultTextureTier(): TextureTier {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
}

async function decodeFetchedImage(blob: Blob, signal: AbortSignal) {
  const image = new Image();
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      function cleanup() {
        image.onload = image.onerror = null;
        signal.removeEventListener('abort', cancel);
      }
      function cancel() {
        cleanup();
        image.removeAttribute('src');
        reject(new Error('hall-a-image-decode-cancelled'));
      }
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error('hall-a-image-decode-failed')); };
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
      else image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function visibleHit(hit: THREE.Intersection, ignored: THREE.Object3D | undefined) {
  if (!(hit.object instanceof THREE.Mesh)) return false;
  for (let object: THREE.Object3D | null = hit.object; object; object = object.parent) {
    if (!object.visible || object === ignored) return false;
  }
  const material = Array.isArray(hit.object.material)
    ? hit.object.material[hit.face?.materialIndex ?? 0] : hit.object.material;
  return !!material?.visible && material.opacity > .02;
}

/** Vertex lighting keeps the installed spotlight look local to the art and
 * avoids adding many point/spot uniforms to the mobile renderer. */
function applyArtLight(geometry: THREE.PlaneGeometry, crop: readonly [number, number], lamps: number) {
  const uv = geometry.getAttribute('uv'), color: number[] = [];
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const side = Math.min(1, Math.min(u, 1 - u) * 13);
    const column = Math.abs(u * lamps - Math.floor(u * lamps) - .5);
    const glow = Math.exp(-2.4 * ((v - .62) ** 2 + .27 * column ** 2));
    const brightness = .63 + .43 * glow * (.90 + .10 * side);
    color.push(brightness, brightness * .977, brightness * .944);
    uv.setX(i, THREE.MathUtils.lerp(crop[0], crop[1], u));
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(color, 3));
}

function washTexture() {
  const size = 48;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = 4 * (y * size + x);
    const radius = Math.hypot((x / (size - 1) - .5) * 2, (y / (size - 1) - .5) * 2);
    data[index] = data[index + 1] = data[index + 2] = 255;
    data[index + 3] = Math.round(255 * Math.max(0, 1 - radius * radius) ** 2);
  }
  const map = new THREE.DataTexture(data, size, size);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return map;
}

export function createMogaoHallAScene(root: THREE.Object3D, options: { onChange?: () => void; textureTier?: TextureTier } = {}) {
  const tier = options.textureTier ?? defaultTextureTier();
  const full = (id: MogaoHallAStoryId) => storyData.stories.find(story => story.id === id)!.full[tier];
  const assetPaths: Record<AssetId, string> = {
    bandits: full('bandits'),
    'burning-house': full('burning-house'),
    'bandits-title': layout.titles[0].path,
    'burning-house-title': layout.titles[1].path,
    plaque: folder + 'plaque.webp',
  };
  const assets = new Map<AssetId, { path: string; status: AssetStatus; faces: Face[] }>();
  for (const id of Object.keys(assetPaths) as AssetId[]) {
    assets.set(id, { path: assetPaths[id], status: 'idle', faces: [] });
  }
  const group = new THREE.Group();
  group.name = 'mogao-hall-a-v001';
  const geometry = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const batches: THREE.InstancedMesh[] = [];
  const targets = new Map<Face, {
    id: MogaoHallAStoryId; key: string; wall: MogaoHallAWallId;
    rect: MogaoHallARect; kind: 'art' | 'title'; asset: AssetId;
  }>();
  const controller = new AbortController();
  let disposed = false, near = false;

  const walls = new Map<MogaoHallAWallId, THREE.Group>();
  for (const [id, wall] of Object.entries(layout.walls)) {
    const surface = new THREE.Group();
    surface.name = `mogao-hall-a-wall-${id}`;
    surface.position.set(wall.x, layout.floorY, wall.z);
    surface.rotation.y = wall.yaw;
    surface.updateMatrix();
    group.add(surface);
    walls.set(id as MogaoHallAWallId, surface);
  }

  function mountFace(wall: MogaoHallAWallId, name: string, rect: MogaoHallARect, inset: number,
    material: THREE.MeshBasicMaterial, widthSegments = 1, heightSegments = 1) {
    const plane = new THREE.PlaneGeometry(rect.w, rect.h, widthSegments, heightSegments);
    const face = new THREE.Mesh(plane, material);
    face.name = `mogao-hall-a-${name}`;
    face.position.set(rect.x + rect.w / 2, rect.y + rect.h / 2, inset);
    walls.get(wall)!.add(face);
    geometry.add(plane);
    materials.add(material);
    return face;
  }

  const softMap = washTexture();
  textures.add(softMap);
  const wash = new THREE.MeshBasicMaterial({
    map: softMap, color: '#dbc4a7', transparent: true, opacity: .13, toneMapped: false,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });

  function mountWash(wall: MogaoHallAWallId, rect: MogaoHallARect, minX = 0, minY = 0) {
    const x = Math.max(rect.x, minX), y = Math.max(rect.y, minY);
    const maxX = Math.min(layout.walls[wall].width, rect.x + rect.w);
    const maxY = Math.min(layout.height, rect.y + rect.h);
    const face = mountFace(wall, `light-wash-${wall}`, { x, y, w: maxX - x, h: maxY - y }, .009, wash);
    face.raycast = () => {};
    const uv = face.geometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (x + uv.getX(i) * (maxX - x) - rect.x) / rect.w,
        (y + uv.getY(i) * (maxY - y) - rect.y) / rect.h);
    }
  }

  const fixtures = { rail: [] as THREE.Matrix4[], barrel: [] as THREE.Matrix4[], lens: [] as THREE.Matrix4[] };
  const up = new THREE.Vector3(0, 1, 0);
  const rotation = new THREE.Quaternion();
  function fixture(kind: keyof typeof fixtures, wall: MogaoHallAWallId, position: THREE.Vector3,
    scale: THREE.Vector3, direction?: THREE.Vector3) {
    if (direction) rotation.setFromUnitVectors(up, direction);
    else rotation.identity();
    fixtures[kind].push(new THREE.Matrix4().compose(position, rotation, scale).premultiply(walls.get(wall)!.matrix));
  }

  function mountTrack(wall: MogaoHallAWallId, rect: MogaoHallARect, lamps: number) {
    const inset = wall === 'B' ? 1.82 : 2.10, railY = lift[wall];
    const left = rect.x + .13, right = rect.x + rect.w - .13;
    fixture('rail', wall, new THREE.Vector3((left + right) / 2, railY, inset),
      new THREE.Vector3(right - left, .052, .062));
    for (const x of [left + .22, right - .22]) {
      const anchor = new THREE.Vector3(x, 0, inset).applyMatrix4(walls.get(wall)!.matrix);
      const edge = Math.min(anchor.x - ceiling.min[0], ceiling.max[0] - anchor.x,
        anchor.z - ceiling.min[2], ceiling.max[2] - anchor.z);
      const top = ceiling.min[1] - layout.floorY + ceiling.vaultRise!
        * THREE.MathUtils.clamp(edge / ceiling.vaultInset!, 0, 1) + .012;
      fixture('rail', wall, new THREE.Vector3(x, (railY + top) / 2, inset), new THREE.Vector3(.027, top - railY, .027));
    }
    for (let i = 0; i < lamps; i++) {
      const x = rect.x + (i + .5) * rect.w / lamps;
      const mount = new THREE.Vector3(x, railY - .15, inset);
      const aim = new THREE.Vector3(0, rect.y + rect.h * .56 - mount.y, -inset).normalize();
      fixture('rail', wall, new THREE.Vector3(x, railY - .067, inset), new THREE.Vector3(.036, .12, .036));
      fixture('barrel', wall, mount.clone().addScaledVector(aim, .09), new THREE.Vector3(.071, .247, .071), aim);
      fixture('lens', wall, mount.clone().addScaledVector(aim, .217), new THREE.Vector3(.050, .012, .050), aim);
    }
  }

  for (const panel of layout.artwork) {
    const { wall, id, rect, crop, lamps } = panel;
    mountWash(wall, { x: rect.x - 1.26, y: rect.y - .77, w: rect.w + 2.52, h: rect.h + 1.84 },
      wall === 'C' ? 2.25 : wall === 'D' ? 6.90 : 0);
    mountTrack(wall, rect, lamps);
    const material = new THREE.MeshBasicMaterial({ color: '#504237', toneMapped: false, vertexColors: true });
    const key = `${id}-${wall.toLowerCase()}`;
    const face = mountFace(wall, key, rect, .021, material, lamps * 6, 16);
    applyArtLight(face.geometry, crop, lamps);
    assets.get(id)!.faces.push(face);
    targets.set(face, { id, key, wall, rect, kind: 'art', asset: id });
  }

  for (const title of layout.titles) {
    const { id, wall, rect } = title;
    const key = `${id}-title` as const;
    mountWash(wall, { x: rect.x - 1.40, y: rect.y - .81, w: rect.w + 2.80, h: rect.h + 1.84 },
      0, wall === 'C' ? 3.30 : 3.20);
    const material = new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, alphaTest: .03, depthWrite: false });
    const face = mountFace(wall, key, rect, .026, material);
    face.visible = false;
    assets.get(key)!.faces.push(face);
    targets.set(face, { id, key, wall, rect, kind: 'title', asset: key });
  }

  const plaque = layout.plaque;
  mountWash('D', { x: .04, y: 3.39, w: 3.36, h: 2.53 }, 0, 3.20);
  const edges = new THREE.BoxGeometry(plaque.w, plaque.h, .116);
  const metal = new THREE.MeshBasicMaterial({ color: '#b9a383', toneMapped: false });
  const body = new THREE.Mesh(edges, metal);
  body.name = 'mogao-hall-a-plaque-body';
  body.position.set(plaque.x + plaque.w / 2, plaque.y + plaque.h / 2, .067);
  walls.get('D')!.add(body);
  geometry.add(edges);
  materials.add(metal);
  const plaqueFace = mountFace('D', 'plaque-face', plaque, .126,
    new THREE.MeshBasicMaterial({ color: '#ded0b5', toneMapped: false }));
  assets.get('plaque')!.faces.push(plaqueFace);

  for (const [kind, matrices] of Object.entries(fixtures)) {
    const model = kind === 'rail' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.CylinderGeometry(1, 1, 1, 10);
    const material = new THREE.MeshBasicMaterial({ color: kind === 'lens' ? '#f5dbad' : '#2c251f', toneMapped: false });
    const batch = new THREE.InstancedMesh(model, material, matrices.length);
    batch.name = `mogao-hall-a-light-${kind}`;
    for (const [i, matrix] of matrices.entries()) batch.setMatrixAt(i, matrix);
    batch.instanceMatrix.needsUpdate = true;
    group.add(batch);
    batches.push(batch);
    geometry.add(model);
    materials.add(material);
  }

  // The GLB placeholder arrow would sit across the Fire House mural.
  const oldSign = root.getObjectByName('hall-a-exit-label');
  const oldSignVisible = oldSign?.visible;
  if (oldSign) oldSign.visible = false;
  root.add(group);

  async function load(asset: { path: string; status: AssetStatus; faces: Face[] }) {
    asset.status = 'loading';
    const request = new AbortController();
    const cancel = () => request.abort();
    const timeout = setTimeout(cancel, 12_000);
    controller.signal.addEventListener('abort', cancel, { once: true });
    try {
      const response = await fetch(worldAssetUrl(asset.path), { signal: request.signal });
      if (!response.ok) throw new Error('hall-a-image-request-failed');
      const blob = await response.blob();
      if (disposed) return;
      let bitmap: ImageBitmap | null = null;
      if (typeof createImageBitmap === 'function') {
        try {
          bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
        } catch {
          // Older WebKit can reject the bitmap options or particular WebP
          // decodes. Try the same bytes through the native image element.
        }
      }
      if (disposed || request.signal.aborted) {
        bitmap?.close();
        if (disposed) return;
        throw new Error('hall-a-image-request-timed-out');
      }
      const image = bitmap ?? await decodeFetchedImage(blob, request.signal);
      if (disposed) return;
      if (request.signal.aborted) throw new Error('hall-a-image-request-timed-out');
      const texture = new THREE.Texture(image);
      // Three can flip HTMLImageElement at upload, but ImageBitmap is already flipped.
      texture.flipY = !bitmap;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      textures.add(texture);
      if (bitmap) bitmaps.add(bitmap);
      for (const face of asset.faces) {
        face.material.map = texture;
        face.material.color.set('#fff');
        face.material.needsUpdate = true;
        face.visible = true;
      }
      asset.status = 'ready';
    } catch {
      if (!disposed) asset.status = 'failed';
    } finally {
      clearTimeout(timeout);
      controller.signal.removeEventListener('abort', cancel);
      if (!disposed) options.onChange?.();
    }
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const targetFaces = [...targets.keys()];
  let lastPick: { sequence: number; x: number; y: number; target: string | null; blocker: string | null } | null = null;
  return {
    update(_position: WorldPoint, surfaceId?: string | null) {
      if (disposed) return;
      const approaching = isMogaoHallAApproach(surfaceId);
      if (approaching && !near) {
        for (const asset of assets.values()) {
          if (asset.status === 'idle' || asset.status === 'failed') void load(asset);
        }
      }
      near = approaching;
    },
    pick(scene: THREE.Object3D, camera: THREE.Camera, point: { x: number; y: number },
      surfaceId: string | null | undefined, ignored?: THREE.Object3D): MogaoHallAStoryId | null {
      if (disposed || surfaceId !== 'hall-a' || !Number.isFinite(point.x) || !Number.isFinite(point.y)
        || Math.abs(point.x) > 1 || Math.abs(point.y) > 1) return null;
      const sequence = (lastPick?.sequence ?? 0) + 1;
      scene.updateMatrixWorld(true);
      camera.updateWorldMatrix(true, false);
      ray.layers.mask = camera.layers.mask;
      ray.setFromCamera(ndc.set(point.x, point.y), camera);
      const hit = ray.intersectObjects(targetFaces, false).find(hit => visibleHit(hit, ignored));
      if (!hit) {
        lastPick = { sequence, x: point.x, y: point.y, target: null, blocker: null };
        return null;
      }
      ray.far = hit.distance - .002;
      const blocker = ray.intersectObject(scene, true).find(hit => visibleHit(hit, ignored));
      ray.far = Infinity;
      const target = targets.get(hit.object as Face)!;
      lastPick = { sequence, x: point.x, y: point.y, target: target.key,
        blocker: blocker ? blocker.object.name || blocker.object.type : null };
      return blocker ? null : target.id;
    },
    inspect() {
      return {
        tier,
        images: Object.fromEntries([...assets].map(([id, { path, status }]) => [id, { path, status }])),
        targets: [...targets].map(([face, target]) => ({
          ...target, center: face.getWorldPosition(new THREE.Vector3()).toArray(),
          normal: face.getWorldDirection(new THREE.Vector3()).toArray(), visible: face.visible,
          status: assets.get(target.asset)!.status,
        })),
        plaque: { rect: layout.plaque, center: plaqueFace.getWorldPosition(new THREE.Vector3()).toArray() },
        lights: { fixtures: fixtures.barrel.length, drawBatches: batches.length },
        lastPick,
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      group.removeFromParent();
      if (oldSign && oldSignVisible !== undefined) oldSign.visible = oldSignVisible;
      for (const batch of batches) batch.dispose();
      for (const model of geometry) model.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      for (const bitmap of bitmaps) bitmap.close();
    },
  };
}

export type MogaoHallAScene = ReturnType<typeof createMogaoHallAScene>;
