import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createMusicGroundFloorCeiling,
  createMusicGroundFloorCeilingGeometry,
  MUSIC_GROUND_FLOOR_CEILING as c,
} from '../../src/world/music-ground-floor-ceiling-v001';

afterEach(() => vi.unstubAllGlobals());

describe('music ground floor painted ceiling', () => {
  it('covers both actual underside surfaces while leaving the stairwell open', () => {
    const geometry = createMusicGroundFloorCeilingGeometry();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    mesh.updateMatrixWorld();
    const hit = (x: number, z: number) => new THREE.Raycaster(
      new THREE.Vector3(x, 2, z), new THREE.Vector3(0, 1, 0),
    ).intersectObject(mesh).length;
    expect(hit(40, -27)).toBeGreaterThan(0);
    expect(hit(45, -21.9)).toBeGreaterThan(0); // The small slab return.
    expect(hit(40, -21.9)).toBe(0); // No ceiling beyond the main slab here.
    expect(hit(47, -30)).toBe(0); // The stairwell stays open.
    const uv = geometry.getAttribute('uv');
    expect(uv.getY(2)).toBeCloseTo(uv.getY(4));
    expect(c.paintY).toBeLessThan(c.undersideY);
    geometry.dispose(); mesh.material.dispose();
  });

  it('loads once and releases the decoded texture and geometry', async () => {
    const close = vi.fn();
    const fetchStub = vi.fn(async (_url: string) => ({ ok: true, blob: async () => new Blob() }));
    vi.stubGlobal('fetch', fetchStub);
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1254, height: 1254, close })));
    const root = new THREE.Group();
    const ceiling = createMusicGroundFloorCeiling(root, 2048);
    await ceiling.ready;
    expect(ceiling.inspect().status).toBe('ready');
    expect(String(fetchStub.mock.calls[0][0])).toContain('music-ground-floor-mural/v001/ceiling.webp');
    expect(root.children).toContain(ceiling.group);
    ceiling.dispose();
    expect(ceiling.inspect().status).toBe('disposed');
    expect(root.children).not.toContain(ceiling.group);
    expect(close).toHaveBeenCalledOnce();
  });

  it('downsamples to the device texture limit and closes both bitmaps', async () => {
    const closeOriginal = vi.fn(), closeResized = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    const decode = vi.fn()
      .mockResolvedValueOnce({ width: 1254, height: 1254, close: closeOriginal })
      .mockResolvedValueOnce({ width: 1024, height: 1024, close: closeResized });
    vi.stubGlobal('createImageBitmap', decode);
    const ceiling = createMusicGroundFloorCeiling(new THREE.Group(), 1024);
    await ceiling.ready;
    expect(ceiling.inspect().status).toBe('ready');
    expect(decode.mock.calls[1][1]).toMatchObject({ resizeWidth: 1024, resizeHeight: 1024 });
    expect(closeOriginal).toHaveBeenCalledOnce();
    ceiling.dispose();
    expect(closeResized).toHaveBeenCalledOnce();
  });

  it('does not mount or leak a bitmap when disposed during decoding', async () => {
    const close = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, blob: async () => new Blob() })));
    let finishDecode!: (bitmap: unknown) => void;
    const pending = new Promise(resolve => { finishDecode = resolve; });
    const decode = vi.fn(() => pending);
    vi.stubGlobal('createImageBitmap', decode);
    const root = new THREE.Group();
    const ceiling = createMusicGroundFloorCeiling(root, 2048);
    await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
    ceiling.dispose();
    finishDecode({ width: 1254, height: 1254, close });
    await ceiling.ready;
    expect(ceiling.inspect().status).toBe('disposed');
    expect(root.children).toHaveLength(0);
    expect(close).toHaveBeenCalledOnce();
  });
});
