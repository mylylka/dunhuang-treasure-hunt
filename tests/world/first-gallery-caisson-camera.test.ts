import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TERRAIN_REGIONS, toTerrainPoint } from '../../src/content/world/terrain-layout-v001';
import { firstGalleryCaissonCameraPose, galleryCaissonCoreVisible, projectGalleryCaissonQuad } from '../../src/world/first-gallery-caisson-camera';
import { terrainCameraSpace, settleTerrainCamera, terrainVector } from '../../src/world/terrain-camera-v001';
import { prepareTerrainCaisson, TERRAIN_CAISSON_CONFIG } from '../../src/world/terrain-caisson-v001';

afterEach(() => vi.unstubAllGlobals());

async function caissonScene() {
  const bytes = await readFile(new URL(`../../public/assets/world/${TERRAIN_CAISSON_CONFIG.asset}`, import.meta.url));
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
  json.buffers[0].uri = `data:application/octet-stream;base64,${bytes.subarray(28 + length).toString('base64')}`;
  json.materials = json.materials.map((material: { name: string }) => ({ name: material.name }));
  vi.stubGlobal('ProgressEvent', class ProgressEvent {});
  const root = (await new GLTFLoader().parseAsync(JSON.stringify(json), '')).scene;
  prepareTerrainCaisson(root, new THREE.Texture({ width: 767, height: 766 }));
  const region = new THREE.Group();
  region.position.copy(toTerrainPoint('courtyard', { x: 0, y: 0, z: 0 }));
  region.rotation.y = TERRAIN_REGIONS.courtyard.yaw;
  region.add(root);
  region.updateMatrixWorld(true);
  return region;
}

describe('first gallery caisson view', () => {
  it('projects the actual fitted art in texture order and keeps all corners unobstructed', async () => {
    const scene = await caissonScene();
    const viewport = { left: 36, top: 23, width: 667, height: 375 };
    const aspect = viewport.width / viewport.height;
    const pose = firstGalleryCaissonCameraPose(aspect);
    const camera = new THREE.PerspectiveCamera(pose.fov, aspect, .1, 1400);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    const quad = projectGalleryCaissonQuad(scene, camera, viewport);
    expect(quad).not.toBeNull();
    const [tl, tr, br, bl] = quad!;
    expect(tl.x).toBeLessThan(tr.x);
    expect(bl.x).toBeLessThan(br.x);
    expect(tl.y).toBeCloseTo(tr.y, 6);
    expect(bl.y).toBeCloseTo(br.y, 6);
    expect(tl.y).toBeLessThan(bl.y);
    expect(tr.x - tl.x).toBeGreaterThan(br.x - bl.x);
    // Inset from the exact edges, where an adjacent mesh can share a seam.
    const center = new THREE.Vector2(viewport.left + viewport.width / 2, viewport.top + viewport.height / 2);
    const ray = new THREE.Raycaster();
    for (const corner of quad!) {
      const p = new THREE.Vector2(corner.x, corner.y).lerp(center, .04);
      ray.setFromCamera(new THREE.Vector2((p.x - viewport.left) / viewport.width * 2 - 1, 1 - (p.y - viewport.top) / viewport.height * 2), camera);
      expect(ray.intersectObject(scene, true)[0]?.object.name).toBe(TERRAIN_CAISSON_CONFIG.centerPanel.nodeId);
    }
    camera.lookAt(pose.position.clone().multiplyScalar(2).sub(pose.target));
    expect(projectGalleryCaissonQuad(scene, camera, viewport)).toBeNull();
  });

  it('waits for the actual art center and ignores hidden geometry when checking occlusion', async () => {
    const scene = await caissonScene();
    const aspect = 1.8;
    const pose = firstGalleryCaissonCameraPose(aspect);
    const camera = new THREE.PerspectiveCamera(pose.fov, aspect, .1, 1400);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    expect(galleryCaissonCoreVisible(scene, camera)).toBe(true);

    const obstruction = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    box.position.copy(pose.position).lerp(pose.target, .5);
    obstruction.add(box);
    const world = new THREE.Scene();
    world.add(scene, obstruction);
    world.updateMatrixWorld(true);
    expect(galleryCaissonCoreVisible(world, camera)).toBe(false);
    obstruction.visible = false;
    expect(galleryCaissonCoreVisible(world, camera)).toBe(true);

    camera.rotateY(Math.atan(Math.tan(THREE.MathUtils.degToRad(pose.fov) / 2) * aspect * .7));
    expect(galleryCaissonCoreVisible(world, camera)).toBe(false);
  });

  it('leaves the held camera eye unchanged across the entire invitation radius', () => {
    const space = terrainCameraSpace(true);
    const { position } = firstGalleryCaissonCameraPose(1.6);
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const anchor = terrainVector('courtyard', new THREE.Vector3(-12 + 3.9 * Math.cos(angle), 1.68, -15 + 3.9 * Math.sin(angle)));
      expect(settleTerrainCamera(anchor, position, position, space, anchor).distanceTo(position)).toBeLessThan(1e-5);
    }
  });
});
