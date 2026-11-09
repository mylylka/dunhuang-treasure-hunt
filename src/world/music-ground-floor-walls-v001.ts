import * as THREE from 'three';
import { worldAssetUrl } from '../content/world/assets';

/** Pavilion-local metres: only the hall-facing surfaces below the upper floor. */
export const MUSIC_GROUND_FLOOR_WALLS = {
  floorY: 1.8, ceilingY: 7.426,
  westX: 34.7625, backZ: -32.175, frontZ: -21.85,
  stairSeamX: 46.27,
  stairTopX: 46.27, stairBottomX: 55.69, stairTopY: 7.915375,
  stairSoffitDepth: .32,
  paintOffset: .024,
  // Restrained interior finishes; all dimensions are pavilion-local metres.
  corniceHeight: .065, corniceDepth: .035,
  baseboardHeight: .11, baseboardDepth: .036, contactShadowWidth: .16,
} as const;

/** Decoration only: existing collision and interactive flying wall remain intact. */
export function createMusicGroundFloorWalls(root: THREE.Object3D, textureLimit: number,
  loadAsset?: (name: string, signal: AbortSignal) => Promise<Blob>) {
  const c = MUSIC_GROUND_FLOOR_WALLS;
  const group = new THREE.Group();
  group.name = 'music-ground-floor-walls-v001';
  const controller = new AbortController();
  const assets: { bitmap: ImageBitmap; mesh?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> }[] = [];
  const trimResources: { geometry: THREE.BufferGeometry; material: THREE.Material }[] = [];
  const extraTextures: THREE.Texture[] = [];
  let contactShadowTexture: THREE.DataTexture | undefined;
  let status: 'loading' | 'ready' | 'failed' | 'disposed' = 'loading';
  const timeout = setTimeout(() => controller.abort(), 20_000);

  function release() {
    for (const { bitmap, mesh } of assets) {
      mesh?.geometry.dispose(); mesh?.material.map?.dispose(); mesh?.material.dispose(); bitmap.close();
    }
    assets.length = 0;
    for (const resource of trimResources) { resource.geometry.dispose(); resource.material.dispose(); }
    trimResources.length = 0;
    for (const texture of extraTextures) texture.dispose();
    extraTextures.length = 0;
    contactShadowTexture?.dispose(); contactShadowTexture = undefined;
    group.removeFromParent(); group.clear();
  }
  function addTrim(name: string, center: [number, number, number], size: [number, number, number], color: string) {
    const geometry = new THREE.BoxGeometry(...size);
    const material = new THREE.MeshStandardMaterial({ color, roughness: .9 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.position.set(...center); mesh.receiveShadow = true; mesh.raycast = () => {};
    group.add(mesh); trimResources.push({ geometry, material });
  }
  function addUnderStair(front: typeof assets[number], atmosphere: typeof assets[number]) {
    const slope = (c.stairTopY - c.floorY) / (c.stairBottomX - c.stairTopX);
    const stairY = c.stairTopY - c.stairSoffitDepth;
    const startX = c.stairSeamX - .003;
    const upperX = c.stairTopX + (stairY - c.ceilingY) / slope;
    const endX = c.stairTopX + (stairY - c.floorY) / slope;
    const z = c.backZ + c.paintOffset + .003;
    const width = endX - startX;
    const geometry = new THREE.BufferGeometry();
    // Clip at both the ceiling and the real sloping underside of the stair.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      startX, c.floorY, z, endX, c.floorY, z,
      upperX, c.ceilingY, z, startX, c.ceilingY, z,
    ], 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      0, 0, 1, 0, (upperX - startX) / width, 1, 0, 1,
    ], 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();

    // Continue the rightmost edge of the actual flying mural into the join,
    // then gently blend in a different crop of the supplied ceiling's clouds.
    // No figure or lotus is repeated and no image is stretched across a seam.
    const map = new THREE.Texture(front.bitmap); map.flipY = false; map.colorSpace = THREE.SRGBColorSpace;
    const wallHeight = c.ceilingY - c.floorY, aspect = (c.stairSeamX - c.westX) / wallHeight;
    const yScale = Math.min(1, (front.bitmap.width / front.bitmap.height) / aspect);
    // Mirror a narrow real strip of the flying mural instead of stretching a
    // single edge column: this keeps the paper grain and clouds continuous.
    map.repeat.set(-.20, yScale); map.offset.set(1, (1 - yScale) / 2);
    map.anisotropy = 8; map.needsUpdate = true;
    const cloud = new THREE.Texture(atmosphere.bitmap); cloud.flipY = false; cloud.colorSpace = THREE.SRGBColorSpace;
    cloud.anisotropy = 8; cloud.needsUpdate = true;
    extraTextures.push(map, cloud);
    const material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    material.onBeforeCompile = shader => {
      shader.uniforms.underStairCloud = { value: cloud };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vUnderStairUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvUnderStairUv = uv;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vUnderStairUv;\nuniform sampler2D underStairCloud;')
        .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 muralEdge = texture2D(map, vMapUv);
          vec2 cloudUv = vec2(.09 + .44 * vUnderStairUv.x, .65 + .23 * vUnderStairUv.y);
          vec4 cloudColor = texture2D(underStairCloud, cloudUv);
          float amount = smoothstep(.015, .30, vUnderStairUv.x);
          diffuseColor *= mix(muralEdge, cloudColor, amount);
        #endif`);
    };
    material.customProgramCacheKey = () => 'music-under-stair-mural-v001';
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'music-ground-floor-under-stair-mural'; mesh.receiveShadow = true; mesh.raycast = () => {};
    group.add(mesh); trimResources.push({ geometry, material });
    return endX;
  }

  function addHallEdges(endX: number) {
    const wallZ = c.backZ + c.paintOffset, wallX = c.westX + c.paintOffset;
    // The cornice stops at the stair soffit; the baseboard and its shadow
    // continue to the triangle's toe. The west strip stops at the entrance.
    const slope = (c.stairTopY - c.floorY) / (c.stairBottomX - c.stairTopX);
    const baseEnd = endX - c.baseboardHeight / slope;
    const frontLength = c.stairSeamX - c.westX, baseLength = baseEnd - c.westX;
    const westLength = c.frontZ - c.backZ;
    const topY = c.ceilingY - c.corniceHeight / 2;
    const baseY = c.floorY + c.baseboardHeight / 2;
    const ochre = '#c8aa8b', base = '#c9b79e';
    addTrim('music-ground-cornice-front', [(c.westX + c.stairSeamX) / 2, topY, wallZ + c.corniceDepth / 2],
      [frontLength, c.corniceHeight, c.corniceDepth], ochre);
    addTrim('music-ground-cornice-left', [wallX + c.corniceDepth / 2, topY, (c.backZ + c.frontZ) / 2],
      [c.corniceDepth, c.corniceHeight, westLength], ochre);
    addTrim('music-ground-baseboard-front', [(c.westX + baseEnd) / 2, baseY, wallZ + c.baseboardDepth / 2],
      [baseLength, c.baseboardHeight, c.baseboardDepth], base);
    addTrim('music-ground-baseboard-left', [wallX + c.baseboardDepth / 2, baseY, (c.backZ + c.frontZ) / 2],
      [c.baseboardDepth, c.baseboardHeight, westLength], base);

    // A tiny feathered contact shadow, drawn on the floor, keeps the base
    // grounded without depending on the mobile shadow-map resolution.
    const count = 32, pixels = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      const strength = (1 - i / (count - 1)) ** 2;
      pixels.set([255, 255, 255, Math.round(strength * 255)], i * 4);
    }
    const texture = new THREE.DataTexture(pixels, 1, count, THREE.RGBAFormat);
    texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true; contactShadowTexture = texture;
    function shadow(name: string, points: [number, number][]) {
      const geometry = new THREE.BufferGeometry();
      // The stone floor is raised very slightly above the original slab.
      const y = c.floorY + .006;
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(([x, z]) => [x, y, z]), 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
      geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({ color: '#66513f', map: texture, transparent: true,
        opacity: .18, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.raycast = () => {};
      mesh.renderOrder = 2; group.add(mesh); trimResources.push({ geometry, material });
    }
    const z0 = wallZ + c.baseboardDepth, z1 = z0 + c.contactShadowWidth;
    shadow('music-ground-contact-shadow-front', [[c.westX, z0], [c.westX, z1], [endX, z1], [endX, z0]]);
    const x0 = wallX + c.baseboardDepth, x1 = x0 + c.contactShadowWidth;
    shadow('music-ground-contact-shadow-left', [[x0, c.backZ], [x1, c.backZ], [x1, c.frontZ], [x0, c.frontZ]]);
  }

  const ready = Promise.all(['wall-front.webp', 'wall-left.webp', 'ceiling.webp'].map(async name => {
    const blob = loadAsset ? await loadAsset(name, controller.signal) : await (async () => {
      const response = await fetch(worldAssetUrl(`music-ground-floor-mural/v001/${name}`), { signal: controller.signal });
      if (!response.ok) throw new Error(`music-ground-floor-wall-request-failed: ${name}`);
      return response.blob();
    })();
    if (controller.signal.aborted) throw new Error('music-ground-floor-wall-load-cancelled');
    let bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none' });
    if (controller.signal.aborted) { bitmap.close(); throw new Error('music-ground-floor-wall-load-cancelled'); }
    if (Math.max(bitmap.width, bitmap.height) > textureLimit) {
      const original = bitmap, scale = textureLimit / Math.max(bitmap.width, bitmap.height);
      try {
        bitmap = await createImageBitmap(original, { imageOrientation: 'none', resizeWidth: Math.max(1, Math.floor(original.width * scale)),
          resizeHeight: Math.max(1, Math.floor(original.height * scale)), resizeQuality: 'high' });
      } finally { original.close(); }
      if (controller.signal.aborted) { bitmap.close(); throw new Error('music-ground-floor-wall-load-cancelled'); }
    }
    const asset: typeof assets[number] = { bitmap }; assets.push(asset);
    return asset;
  })).then(([front, left, atmosphere]) => {
    if (controller.signal.aborted) throw new Error('music-ground-floor-wall-load-cancelled');
    const height = c.ceilingY - c.floorY;
    for (const [name, asset, width, x, z, rotation] of [
      ['front', front, c.stairSeamX - c.westX, (c.westX + c.stairSeamX) / 2, c.backZ + c.paintOffset, 0],
      ['left', left, c.frontZ - c.backZ, c.westX + c.paintOffset, (c.backZ + c.frontZ) / 2, Math.PI / 2],
    ] as const) {
      const map = new THREE.Texture(asset.bitmap); map.flipY = false; map.colorSpace = THREE.SRGBColorSpace;
      // Cover the whole physical wall without stretching the artwork. Crop
      // equally around the center; the original files remain unchanged.
      const imageAspect = asset.bitmap.width / asset.bitmap.height, wallAspect = width / height;
      if (imageAspect > wallAspect) {
        map.repeat.x = wallAspect / imageAspect; map.offset.x = (1 - map.repeat.x) / 2;
      } else {
        map.repeat.y = imageAspect / wallAspect; map.offset.y = (1 - map.repeat.y) / 2;
      }
      map.anisotropy = 8; map.needsUpdate = true;
      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshStandardMaterial({ map, roughness: 1 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `music-ground-floor-wall-${name}`; mesh.position.set(x, (c.floorY + c.ceilingY) / 2, z);
      mesh.rotation.y = rotation; mesh.receiveShadow = true; mesh.raycast = () => {};
      group.add(mesh); asset.mesh = mesh;
    }
    const endX = addUnderStair(front, atmosphere); addHallEdges(endX); root.add(group); status = 'ready';
  }).catch(() => {
    if (status === 'disposed') return;
    status = 'failed'; controller.abort(); release();
  }).finally(() => clearTimeout(timeout));

  return {
    group, ready,
    inspect: () => ({ status, panels: group.children.map(child => child.name) }),
    dispose() {
      if (status === 'disposed') return;
      status = 'disposed'; clearTimeout(timeout); controller.abort(); release();
    },
  };
}
