import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import config from '../content/world/music-interior-decoration-v004.json';
import { worldAssetUrl } from '../content/world/assets';

export interface MusicInteriorDecorationTexture {
  texture: THREE.Texture;
  /** Releases CPU image storage owned by this load, after the texture is disposed. */
  close?: () => void;
}
export interface MusicInteriorDecorationOptions {
  /** Testable load boundary; the default uses abortable fetch and ImageBitmap. */
  loadFloralTexture?: (url: string, signal: AbortSignal) => Promise<MusicInteriorDecorationTexture>;
  omitUpperLantern?: boolean;
  /** Leave the existing room lighting in place while clearing the mural sightlines. */
  hideLanternFixtures?: boolean;
  /** Shift the visible ground-floor pendant away from the new mural's face. */
  avoidGroundMural?: boolean;
}
export interface MusicInteriorDecorationSnapshot {
  version: string;
  status: 'loading' | 'ready' | 'disposed';
  materials: string[];
  textures: number;
  textureBytes: number;
  objects: number;
  shadowLights: number;
  fixtureDrawCalls: number;
  fixtureTriangles: number;
  fixtures: { id: string; position: number[]; mount: number[]; bounds: { min: number[]; max: number[] } }[];
  lights: { id: string; type: 'PointLight'; position: number[]; intensity: number;
    distance: number; decay: number; sourceRadius: number; castShadow: boolean }[];
}

type TextureKind = 'plaster' | 'stone' | 'wood';
type FixtureKind = 'wood' | 'copper' | 'cloth';
const textureSettings = config.technicalTextures;

/** Configured lanterns are baked into three material batches. Brackets and suspension
 * rods terminate on the same measured planes as the building model. The opaque
 * cloth is softly emissive; it does not introduce a texture or an extra light.
 */
function createLanternFixtures(group: THREE.Group, definitions: typeof config.lights) {
  const batches: Record<FixtureKind, THREE.BufferGeometry[]> = { wood: [], copper: [], cloth: [] };
  const settings = config.fixture;
  const materials: Record<FixtureKind, THREE.MeshStandardMaterial> = {
    wood: new THREE.MeshStandardMaterial({ color: settings.woodColor, roughness: .88 }),
    copper: new THREE.MeshStandardMaterial({ color: settings.copperColor, roughness: .7, metalness: .45 }),
    cloth: new THREE.MeshStandardMaterial({ color: settings.clothColor, roughness: 1,
      emissive: settings.emissiveColor, emissiveIntensity: settings.emissiveIntensity }),
  };
  const fixtures: MusicInteriorDecorationSnapshot['fixtures'] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const definition of definitions) {
    const position = new THREE.Vector3(...definition.position as [number, number, number]);
    const mount = new THREE.Vector3(...definition.mount as [number, number, number]);
    const frame = new THREE.Matrix4().compose(position, new THREE.Quaternion(), new THREE.Vector3(1, 1, definition.depthScale));
    const bounds = new THREE.Box3();
    const add = (kind: FixtureKind, geometry: THREE.BufferGeometry, transform = new THREE.Matrix4(), local = true) => {
      geometry.applyMatrix4(transform);
      if (local) geometry.applyMatrix4(frame);
      geometry.computeBoundingBox(); bounds.union(geometry.boundingBox!);
      batches[kind].push(geometry);
    };
    const rod = (kind: FixtureKind, a: THREE.Vector3, b: THREE.Vector3, thickness: number, local = true) => {
      const direction = b.clone().sub(a), length = direction.length();
      if (length < 1e-6) return;
      const transform = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),
        new THREE.Quaternion().setFromUnitVectors(up, direction.divideScalar(length)), new THREE.Vector3(thickness, length, thickness));
      add(kind, new THREE.BoxGeometry(1, 1, 1), transform, local);
    };
    const point = (angle: number, y: number) => new THREE.Vector3(Math.cos(angle) * settings.frameRadius, y, Math.sin(angle) * settings.frameRadius);
    const halfHeight = settings.bodyHeight / 2;
    add('cloth', new THREE.CylinderGeometry(settings.bodyRadius, settings.bodyRadius, settings.bodyHeight, 6));
    for (let i = 0; i < 6; i++) {
      // CylinderGeometry starts its hexagon at +Z; posts share those vertices.
      const angle = Math.PI / 2 + i * Math.PI / 3, next = angle + Math.PI / 3;
      rod('wood', point(angle, -halfHeight), point(angle, halfHeight), settings.postThickness);
      for (const y of [-halfHeight, halfHeight]) rod('wood', point(angle, y), point(next, y), settings.postThickness);
    }
    add('copper', new THREE.CylinderGeometry(.065, settings.capRadius, .13, 6), new THREE.Matrix4().makeTranslation(0, .295, 0));
    add('copper', new THREE.CylinderGeometry(.195, .135, .08, 6), new THREE.Matrix4().makeTranslation(0, -.28, 0));
    add('copper', new THREE.SphereGeometry(.03, 6, 4), new THREE.Matrix4().makeTranslation(0, .385, 0));
    add('copper', new THREE.SphereGeometry(.025, 6, 4), new THREE.Matrix4().makeTranslation(0, -.345, 0));
    const crown = position.clone().add(new THREE.Vector3(0, .41, 0));
    if (definition.mountKind === 'ceiling') {
      rod('copper', crown, mount, .025, false);
      add('copper', new THREE.CylinderGeometry(.09, .09, .025, 8),
        new THREE.Matrix4().makeTranslation(mount.x, mount.y - .0125, mount.z), false);
    } else {
      const elbow = new THREE.Vector3(position.x, mount.y, position.z);
      rod('copper', mount, elbow, .035, false);
      rod('copper', elbow, crown, .025, false);
      // A diagonal brace supports the projecting arm, visibly attached to the wall.
      rod('copper', mount.clone().add(new THREE.Vector3(0, -.20, 0)), elbow, .025, false);
      const sideWall = definition.mountKind === 'side-wall';
      const screen = definition.mountKind === 'screen';
      const size = sideWall ? new THREE.Vector3(.025, .30, .12) : new THREE.Vector3(.12, .30, .025);
      // The mounting plate ends exactly at the interior face, without floating.
      const plate = mount.clone().add(sideWall ? new THREE.Vector3(-.0125, -.08, 0) : new THREE.Vector3(0, -.08, screen ? -.0125 : .0125));
      add('copper', new THREE.BoxGeometry(size.x, size.y, size.z), new THREE.Matrix4().makeTranslation(plate.x, plate.y, plate.z), false);
    }
    fixtures.push({ id: definition.id, position: position.toArray(), mount: mount.toArray(), bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() } });
  }
  const geometries: THREE.BufferGeometry[] = [];
  let triangles = 0;
  for (const kind of ['wood', 'copper', 'cloth'] as const) {
    const geometry = mergeGeometries(batches[kind], false)!;
    for (const part of batches[kind]) part.dispose();
    geometry.name = `music-lantern-${kind}-geometry-v002`;
    geometry.computeBoundingSphere(); geometries.push(geometry);
    materials[kind].name = `music-lantern-${kind}-v002`;
    const mesh = new THREE.Mesh(geometry, materials[kind]); mesh.name = `music-lantern-${kind}-batch-v002`;
    mesh.userData.musicDecorationFixture = true;
    mesh.castShadow = false; mesh.receiveShadow = false; group.add(mesh);
    triangles += (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
  }
  return { fixtures, triangles, drawCalls: geometries.length, dispose() {
    for (const geometry of geometries) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
  } };
}

/** Quiet technical grain only; no cultural artwork is generated here. UVs are
 * authored in metres in the decoration models, so terrain rotation does not change
 * grain density or the dimensions of the stone slabs and wood planks.
 */
export function createMusicInteriorTechnicalTexture(kind: TextureKind) {
  const size = textureSettings.size, bytes = new Uint8Array(size * size * 4);
  let seed = (textureSettings.seed + (kind === 'wood' ? 173 : kind === 'stone' ? 311 : 0)) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = (y * size + x) * 4;
    let value = 252 + Math.floor((random() - .5) * 4);
    if (kind === 'stone') {
      // One 1.8 x 1.3 m slab per tile. Flat colour joints add no geometry.
      const joint = x === 0 || y === 0;
      value = joint ? 225 : value;
    } else if (kind === 'wood') {
      const u = x / size, v = y / size;
      const column = x < size / 2 ? 0 : 1;
      const cross = column === 0 ? .24 : .74;
      const joint = x === 0 || x === size / 2 || Math.abs(v - cross) < .002;
      const grain = Math.sin(u * 170 + Math.sin(v * Math.PI * 2) * 1.8) * 1.2;
      value = joint ? 226 : Math.round(value - 1 + grain);
    }
    bytes[index] = bytes[index + 1] = bytes[index + 2] = Math.max(0, Math.min(255, value));
    bytes[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = `music-interior-technical-${kind}-v001`;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...textureSettings[kind].repeat as [number, number]);
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

async function loadFloralTexture(url: string, signal: AbortSignal): Promise<MusicInteriorDecorationTexture> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('music-decoration-floral-request-failed');
  const blob = await response.blob();
  if (signal.aborted) throw new Error('music-decoration-load-cancelled');
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'none', premultiplyAlpha: 'none' });
  if (signal.aborted) { bitmap.close(); throw new Error('music-decoration-load-cancelled'); }
  const texture = new THREE.Texture(bitmap);
  texture.name = 'music-interior-existing-floral-v001';
  // Blender's glTF UVs already use the glTF top-left convention.
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(...config.floral.repeat as [number, number]);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { texture, close: () => bitmap.close() };
}

/** Call after the decorated music model has loaded and before its root is transformed
 * into terrain coordinates or environment static lighting is prepared. This
 * module owns only its lights and new textures, never loaded GLB materials.
 */
export function createMusicInteriorDecoration(root: THREE.Object3D, options: MusicInteriorDecorationOptions = {}) {
  const controller = new AbortController();
  const materials = new Set<THREE.MeshStandardMaterial>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && material.name.startsWith(config.materialPrefix)) materials.add(material);
    }
  });
  if (!materials.size) throw new Error('music-decoration-materials-missing');
  const group = new THREE.Group(); group.name = 'music-interior-local-fill-v004'; root.add(group);
  const definitions = config.lights.filter(definition => !options.omitUpperLantern || definition.id !== 'upper-rear');
  // Keep the existing illumination in place; shift only the visible pendant
  // and its ceiling mount in the renovated ground-floor hall.
  const fixtureDefinitions = options.avoidGroundMural ? definitions.map(definition => definition.id === 'under-upper-floor'
    ? { ...definition,
      position: [definition.position[0] + 2, definition.position[1], definition.position[2]],
      mount: [definition.mount[0] + 2, definition.mount[1], definition.mount[2]] }
    : definition) : definitions;
  const fixtures = options.hideLanternFixtures ? null : createLanternFixtures(group, fixtureDefinitions);
  const lights = definitions.map(definition => {
    const lamp = new THREE.PointLight(definition.color, definition.intensity, definition.distance, definition.decay);
    lamp.name = `music-interior-fill-${definition.id}`;
    lamp.position.set(...definition.position as [number, number, number]);
    lamp.userData.musicInteriorLantern = true;
    lamp.userData.musicInteriorLanternId = definition.id;
    lamp.castShadow = false; group.add(lamp);
    return { definition, lamp };
  });
  const technical = new Map<TextureKind, THREE.DataTexture>();
  const maps: { material: THREE.MeshStandardMaterial; old: THREE.Texture | null; installed: THREE.Texture }[] = [];
  let status: MusicInteriorDecorationSnapshot['status'] = 'loading';
  let floral: MusicInteriorDecorationTexture | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let rejectCancellation: ((error: Error) => void) | undefined;
  const assign = (material: THREE.MeshStandardMaterial, texture: THREE.Texture) => {
    maps.push({ material, old: material.map, installed: texture });
    material.map = texture; material.needsUpdate = true;
  };
  for (const material of materials) {
    const suffix = material.name.slice(config.materialPrefix.length).replace(/\.\d+$/, '');
    for (const kind of ['plaster', 'stone', 'wood'] as const) {
      if (!(textureSettings[kind].materials as string[]).includes(suffix)) continue;
      let texture = technical.get(kind);
      if (!texture) { texture = createMusicInteriorTechnicalTexture(kind); technical.set(kind, texture); }
      assign(material, texture); break;
    }
  }
  const disposeTexture = (loaded: MusicInteriorDecorationTexture) => { loaded.texture.dispose(); loaded.close?.(); };
  function dispose() {
    if (status === 'disposed') return;
    status = 'disposed'; clearTimeout(timeout); controller.abort();
    rejectCancellation?.(new Error('music-decoration-load-cancelled'));
    for (const record of maps) if (record.material.map === record.installed) {
      record.material.map = record.old; record.material.needsUpdate = true;
    }
    maps.length = 0;
    for (const texture of technical.values()) texture.dispose();
    technical.clear();
    if (floral) { disposeTexture(floral); floral = null; }
    for (const { lamp } of lights) { lamp.removeFromParent(); lamp.dispose(); }
    fixtures?.dispose();
    group.removeFromParent(); group.clear();
  }
  const loader = options.loadFloralTexture ?? loadFloralTexture;
  const loaded = Promise.resolve().then(() => loader(worldAssetUrl(config.floral.asset), controller.signal)).then(result => {
    if (status === 'disposed') { disposeTexture(result); throw new Error('music-decoration-load-cancelled'); }
    floral = result;
    for (const material of materials) if (material.name.replace(/\.\d+$/, '') === config.floral.material) assign(material, result.texture);
  });
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new Error('music-decoration-loading-timeout')); }, config.floral.loadTimeoutMs);
  });
  const cancelled = new Promise<never>((_, reject) => { rejectCancellation = reject; });
  const ready = Promise.race([loaded, deadline, cancelled]).then(() => {
    if (status === 'disposed') throw new Error('music-decoration-load-cancelled');
    status = 'ready'; clearTimeout(timeout);
  }).catch(error => { dispose(); throw error; });
  return {
    ready,
    inspect(): MusicInteriorDecorationSnapshot {
      return { version: config.version, status, materials: [...materials].map(m => m.name).sort(),
        textures: technical.size + (floral ? 1 : 0),
        textureBytes: technical.size * textureSettings.size ** 2 * 4 + (floral ? config.floral.sourceSize[0] * config.floral.sourceSize[1] * 4 : 0),
        objects: status === 'disposed' ? 0 : group.children.length,
        shadowLights: lights.filter(({ lamp }) => lamp.castShadow).length,
        fixtureDrawCalls: status === 'disposed' ? 0 : (fixtures?.drawCalls ?? 0),
        fixtureTriangles: fixtures?.triangles ?? 0,
        fixtures: fixtures?.fixtures ?? [],
        lights: lights.map(({ definition, lamp }) => ({ id: definition.id, type: 'PointLight', position: lamp.position.toArray(),
          intensity: lamp.intensity, distance: lamp.distance, decay: lamp.decay,
          sourceRadius: definition.sourceRadius, castShadow: lamp.castShadow })) };
    },
    dispose,
  };
}
