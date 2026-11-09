import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createMusicGroundFloorWalls, MUSIC_GROUND_FLOOR_WALLS as C } from '../../src/world/music-ground-floor-walls-v001';

afterEach(() => vi.unstubAllGlobals());

describe('ground-floor murals', () => {
  it('continues the flying mural only below the stair and preserves the upper mural and picking', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    let n = 0;
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1280, height: n++ ? 640 : 960, close })));
    const root = new THREE.Group();
    const walls = createMusicGroundFloorWalls(root, 4096);
    await walls.ready; root.updateMatrixWorld(true);
    expect(walls.inspect().status).toBe('ready');
    const front = root.getObjectByName('music-ground-floor-wall-front') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    const left = root.getObjectByName('music-ground-floor-wall-left') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    const frontBox = new THREE.Box3().setFromObject(front), leftBox = new THREE.Box3().setFromObject(left);
    expect(frontBox.min.x).toBeCloseTo(C.westX, 4);
    expect(frontBox.max.x).toBeCloseTo(C.stairSeamX, 4);
    expect(frontBox.min.y).toBeCloseTo(C.floorY, 4);
    expect(frontBox.max.y).toBeCloseTo(C.ceilingY, 4);
    expect(leftBox.min.z).toBeCloseTo(C.backZ, 4);
    expect(leftBox.max.z).toBeCloseTo(C.frontZ, 4);
    expect(front.material.map!.repeat.y).toBeLessThan(1);
    expect(left.material.map!.repeat.x).toBeLessThan(1);
    const cornice = root.getObjectByName('music-ground-cornice-front')!;
    const baseboard = root.getObjectByName('music-ground-baseboard-front')!;
    const leftBaseboard = root.getObjectByName('music-ground-baseboard-left')!;
    const corniceBounds = new THREE.Box3().setFromObject(cornice);
    const baseboardBounds = new THREE.Box3().setFromObject(baseboard);
    const leftBaseboardBounds = new THREE.Box3().setFromObject(leftBaseboard);
    expect(corniceBounds.max.y).toBeCloseTo(C.ceilingY, 4);
    expect(corniceBounds.max.y - corniceBounds.min.y).toBeCloseTo(C.corniceHeight, 4);
    expect(baseboardBounds.min.y).toBeCloseTo(C.floorY, 4);
    expect(baseboardBounds.max.x).toBeGreaterThan(C.stairSeamX);
    expect(leftBaseboardBounds.max.z).toBeCloseTo(C.frontZ, 4);
    expect(root.getObjectByName('music-ground-contact-shadow-front')).toBeTruthy();
    expect(root.getObjectByName('music-ground-contact-shadow-left')).toBeTruthy();
    expect(root.getObjectByName('music-ground-seam-back-wood')).toBeUndefined();
    expect(walls.inspect().panels.some(name => name.startsWith('music-ground-seam-flying'))).toBe(false);
    const triangle = root.getObjectByName('music-ground-floor-under-stair-mural') as THREE.Mesh<THREE.BufferGeometry>;
    expect(triangle).toBeTruthy();
    const vertices = triangle.geometry.getAttribute('position');
    const slope = (C.stairTopY - C.floorY) / (C.stairBottomX - C.stairTopX);
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i);
      expect(y).toBeGreaterThanOrEqual(C.floorY - .0001);
      expect(y).toBeLessThanOrEqual(C.ceilingY + .0001);
      expect(y).toBeLessThanOrEqual(C.stairTopY - C.stairSoffitDepth - slope * (x - C.stairTopX) + .0001);
    }
    const ray = new THREE.Raycaster(new THREE.Vector3(40, 4, -30), new THREE.Vector3(0, 0, -1));
    expect(ray.intersectObject(walls.group, true)).toHaveLength(0);
    walls.dispose(); walls.dispose();
    expect(close).toHaveBeenCalledTimes(3);
    expect(root.children).toHaveLength(0);
  });

  it('keeps the room usable and reports failed when an image request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const root = new THREE.Group(), walls = createMusicGroundFloorWalls(root, 4096);
    await walls.ready;
    expect(walls.inspect().status).toBe('failed');
    expect(root.children).toHaveLength(0);
    walls.dispose();
  });

  it('downscales textures for devices with a smaller texture limit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    const close = vi.fn();
    const bitmaps = vi.fn(async (_source: unknown, options: ImageBitmapOptions) => ({
      width: options.resizeWidth ?? 1280, height: options.resizeHeight ?? 960, close,
    }));
    vi.stubGlobal('createImageBitmap', bitmaps);
    const root = new THREE.Group(), walls = createMusicGroundFloorWalls(root, 512);
    await walls.ready;
    expect(walls.inspect().status).toBe('ready');
    expect(bitmaps).toHaveBeenCalledTimes(6);
    expect(close).toHaveBeenCalledTimes(3);
    walls.dispose();
    expect(close).toHaveBeenCalledTimes(6);
  });
});
