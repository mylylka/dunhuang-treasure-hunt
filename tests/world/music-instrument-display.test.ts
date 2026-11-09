import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import {
  MUSIC_INSTRUMENT_DISPLAY_GROUPS, MUSIC_INSTRUMENT_DISPLAY_SOLIDS, musicInstrumentAtPoint,
  type MusicInstrumentDisplayGroup,
} from '../../src/content/world/music-instrument-display-layout-v001';
import { MUSIC_INSTRUMENTS } from '../../src/content/world/music-instruments-v001';
import { createMusicInstrumentDisplay } from '../../src/world/music-instrument-display';

type Accessor = { bufferView: number; byteOffset?: number; count: number; componentType: number };
type Primitive = { attributes: { POSITION: number }; indices: number };
type GeometryDocument = { meshes: { primitives: Primitive[] }[]; accessors: Accessor[];
  bufferViews: { byteOffset?: number; byteStride?: number }[] };
const directory = '../../public/assets/world/music-instrument-display/v001/';

function glbGeometry(file: string) {
  const data = readFileSync(new URL(directory + file, import.meta.url));
  const jsonSize = data.readUInt32LE(12), binStart = 28 + jsonSize;
  const gltf: GeometryDocument = JSON.parse(data.toString('utf8', 20, 20 + jsonSize));
  const primitive = gltf.meshes[0].primitives[0];
  const positions = gltf.accessors[primitive.attributes.POSITION];
  const indices = gltf.accessors[primitive.indices];
  const positionView = gltf.bufferViews[positions.bufferView];
  const indexView = gltf.bufferViews[indices.bufferView];
  const positionStart = binStart + (positionView.byteOffset ?? 0) + (positions.byteOffset ?? 0);
  const indexStart = binStart + (indexView.byteOffset ?? 0) + (indices.byteOffset ?? 0);
  const indexSize = indices.componentType === 5123 ? 2 : 4;
  const xyz = new Float32Array(positions.count * 3);
  const triangles = new Uint32Array(indices.count);
  for (let i = 0; i < positions.count; i++) for (let axis = 0; axis < 3; axis++) {
    xyz[3 * i + axis] = data.readFloatLE(positionStart + i * (positionView.byteStride ?? 12) + axis * 4);
  }
  for (let i = 0; i < indices.count; i++) {
    triangles[i] = indexSize === 2 ? data.readUInt16LE(indexStart + i * indexSize) : data.readUInt32LE(indexStart + i * indexSize);
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(xyz, 3))
    .setIndex(new THREE.BufferAttribute(triangles, 1));
}

function realMesh(group: MusicInstrumentDisplayGroup, mobile = false) {
  return new THREE.Mesh(glbGeometry(`${group.id}${mobile ? '-mobile' : ''}.glb`), new THREE.MeshBasicMaterial());
}

const stands = {
  strings: [0, .142], winds: [.012, .21], percussion: [-.07, .19],
} as const;

describe('second-floor instrument display', () => {
  it('matches all twelve instrument IDs on real front triangles and excludes each stand on both GLB tiers', () => {
    expect(MUSIC_INSTRUMENT_DISPLAY_GROUPS.flatMap(group => group.targets.map(target => target.id))).toEqual(MUSIC_INSTRUMENTS.map(item => item.id));
    for (const group of MUSIC_INSTRUMENT_DISPLAY_GROUPS) for (const mobile of [false, true]) {
      const model = realMesh(group, mobile);
      function frontHit(x: number, y: number) {
        const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1));
        return ray.intersectObject(model)[0]?.point;
      }
      for (const { id, aim: [x, y, z] } of group.targets) {
        const hit = frontHit(x, y);
        expect(hit, id).toBeDefined();
        expect(hit!.z, id).toBeCloseTo(z, 4);
        expect(musicInstrumentAtPoint(group, hit!), id).toBe(id);
      }
      const [x, y] = stands[group.id];
      const stand = frontHit(x, y);
      expect(stand, `${group.id} front stand`).toBeDefined();
      expect(musicInstrumentAtPoint(group, stand!)).toBeNull();
      model.geometry.dispose(); model.material.dispose();
    }
  });

  it('keeps posed mesh vertices within the shared player and camera collision footprints', () => {
    const angleAxis = new THREE.Vector3(0, 1, 0), point = new THREE.Vector3();
    for (const group of MUSIC_INSTRUMENT_DISPLAY_GROUPS) {
      const geometry = glbGeometry(`${group.id}.glb`);
      const positions = geometry.getAttribute('position');
      const boxes = MUSIC_INSTRUMENT_DISPLAY_SOLIDS.filter(solid => solid.id.startsWith(`music-instruments-${group.id}`))
        .map(solid => new THREE.Box3(new THREE.Vector3().fromArray(solid.min), new THREE.Vector3().fromArray(solid.max)).expandByScalar(.00002));
      let outside = 0;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).multiplyScalar(group.scale).applyAxisAngle(angleAxis, group.yaw)
          .add(new THREE.Vector3(...group.position));
        if (!boxes.some(box => box.containsPoint(point))) outside++;
      }
      expect(outside, group.id).toBe(0);
      geometry.dispose();
    }
  });

  it('streams serially when the stairs begin and retries one failed model without hiding the others', async () => {
    const paths: string[] = [];
    const scene = new THREE.Scene();
    const display = createMusicInstrumentDisplay(scene, { mobile: true, load: async (path) => {
      paths.push(path);
      if (paths.length === 1) throw new Error('simulated model outage');
      return new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    } });
    const station = toTerrainPoint('music', { x: 55.69, z: -30.225 });
    display.update(station, 'music-floor-1');
    expect(paths).toEqual([]);
    display.update(station, 'music-stair');
    await expect.poll(() => display.inspect().groups.map(group => group.status)).toEqual(['ready', 'failed', 'ready']);
    expect(paths.map(path => path.split('/').at(-1))).toEqual(['winds-mobile.glb', 'percussion-mobile.glb', 'strings-mobile.glb']);
    expect(display.hasFailure()).toBe(true);
    display.retry();
    await expect.poll(() => display.inspect().groups.every(group => group.status === 'ready')).toBe(true);
    expect(paths.at(-1)).toMatch(/winds-mobile\.glb$/);
    display.dispose();
    expect(scene.children).toEqual([]);
  });

  it('rejects an opaque foreground, another storey and out-of-frame input', async () => {
    const scene = new THREE.Scene();
    const display = createMusicInstrumentDisplay(scene, { load: async path =>
      realMesh(MUSIC_INSTRUMENT_DISPLAY_GROUPS.find(group => path.endsWith(`/${group.id}.glb`))!) });
    display.update(toTerrainPoint('music', { x: 40.46, z: -28.3 }), 'music-floor-2');
    await expect.poll(() => display.inspect().groups.find(group => group.id === 'winds')!.status).toBe('ready');
    const center = display.inspect().groups.find(group => group.id === 'winds')!.targets.find(target => target.id === 'dizi')!.center;
    const camera = new THREE.PerspectiveCamera(49, 1.8, .1, 100);
    const target = new THREE.Vector3().fromArray(center);
    camera.position.copy(target).add(new THREE.Vector3(0, 0, 2)); camera.lookAt(target);
    const screenCenter = { x: 0, y: 0 };
    expect(display.pick(scene, camera, screenCenter, 'music-floor-2')).toBe('dizi');
    expect(display.pick(scene, camera, screenCenter, 'music-floor-1')).toBeNull();
    expect(display.pick(scene, camera, { x: 2, y: 0 }, 'music-floor-2')).toBeNull();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), new THREE.MeshBasicMaterial());
    wall.position.copy(target).add(new THREE.Vector3(0, 0, .5)); scene.add(wall);
    expect(display.pick(scene, camera, screenCenter, 'music-floor-2')).toBeNull();
    wall.visible = false;
    expect(display.pick(scene, camera, screenCenter, 'music-floor-2')).toBe('dizi');
    wall.geometry.dispose(); wall.material.dispose(); display.dispose();
  });
});
