import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createDesertDecorationStreaming } from '../../src/world/desert-decoration-streaming';

vi.mock('../../src/world/desert-decoration-placement', () => ({
  resolveDesertDecorations: () => [
    { id: 'a1', region: 'a', assetId: 'shrub-2', x: 0, y: 0, z: 0, yaw: 0, scale: 1, distance: 30, castShadow: false },
    { id: 'a2', region: 'a', assetId: 'shrub-2', x: 1, y: 0, z: 0, yaw: 0, scale: 1, distance: 30, castShadow: false },
    { id: 'c1', region: 'c', assetId: 'rock-shrub-3', x: 3, y: 0, z: 2, yaw: 0, scale: 1, distance: 30, castShadow: false, requiresMusicCourtyard: true, venue: 'music' },
    { id: 'd1', region: 'd', assetId: 'r02', x: 100, y: 0, z: 0, yaw: 0, scale: 4, distance: 30, castShadow: true, venue: 'cliff' },
  ],
}));

function model() {
  const source = new THREE.Group();
  source.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  return source;
}

function setup(load: (path: string, signal: AbortSignal) => Promise<THREE.Object3D>) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 4, 12);
  camera.lookAt(0, 0, 0);
  const release = vi.fn();
  const forgetMeshes = vi.fn();
  const setObstacles = vi.fn();
  const streaming = createDesertDecorationStreaming({
    scene, load, release, forgetMeshes, setObstacles, mobile: true, receiveShadows() {}, refreshShadows() {},
  });
  const update = (now: number, x = 0, busy = false) => {
    streaming.update({ position: { x, z: 0 }, busy, now });
    streaming.present(camera);
  };
  return { streaming, scene, update, release, forgetMeshes, setObstacles };
}

describe('desert decoration streaming', () => {
  it('shares an instanced batch and releases the asset only after leaving its range', async () => {
    const load = vi.fn(async () => model());
    const { streaming, update, release, forgetMeshes } = setup(load);
    update(0, 0, true);
    expect(load).not.toHaveBeenCalled();
    update(200);
    update(400);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(streaming.inspect().pending).toBeNull());
    update(600);
    const first = streaming.inspect();
    expect(first).toMatchObject({ mounted: 1, detailDraws: 1, resident: ['shrub-2-lod'] });
    expect(first.visibleTriangles - first.overviewTriangles - first.groundShadowTriangles).toBe(24);
    update(800, 200);
    expect(forgetMeshes).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    update(13_000, 200);
    expect(release).toHaveBeenCalledTimes(1);
    streaming.dispose();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('shows the landscape at once and switches venue batches without downloading detail', () => {
    const load = vi.fn(async () => model());
    const { streaming, scene, update } = setup(load);
    const landscape = scene.getObjectByName('desert-overlook-landscape')!;
    const music = scene.getObjectByName('desert-overlook-music')!;
    const cliff = scene.getObjectByName('desert-overlook-cliff')!;
    update(0, 0, true);
    expect(load).not.toHaveBeenCalled();
    expect([landscape.visible, music.visible, cliff.visible]).toEqual([true, false, false]);
    streaming.setVenueVisibility({ music: true, cliff: true });
    expect([landscape.visible, music.visible, cliff.visible]).toEqual([true, true, true]);
    streaming.setVenueVisibility({ music: false, cliff: true });
    expect([landscape.visible, music.visible, cliff.visible]).toEqual([true, false, true]);
    expect(load).not.toHaveBeenCalled();
    streaming.dispose();
  });

  it('casts one stable static shadow for a primary rock without letting it into the color pass', async () => {
    const { streaming, scene, update } = setup(async () => model());
    const caster = scene.getObjectByName('desert-decoration-sun-casters-outdoor');
    expect(caster).toBeInstanceOf(THREE.Mesh);
    expect(caster?.castShadow).toBe(true);
    expect(caster?.layers.isEnabled(0)).toBe(false);
    update(0);
    await vi.waitFor(() => expect(streaming.inspect().pending).toBeNull());
    update(200);
    expect(scene.getObjectByName('desert-decoration-sun-casters-outdoor')).toBe(caster);
    streaming.dispose();
  });

  it('aborts low-priority work when busy and releases a decode delivered after disposal', async () => {
    let complete!: (asset: THREE.Object3D) => void;
    const load = vi.fn((_path: string, _signal: AbortSignal) => new Promise<THREE.Object3D>(resolve => { complete = resolve; }));
    const { streaming, update, release, scene } = setup(load);
    update(0);
    update(10, 0, true);
    expect(load.mock.calls[0]?.[1].aborted).toBe(true);
    streaming.dispose();
    const late = model();
    complete(late);
    await vi.waitFor(() => expect(release).toHaveBeenCalledExactlyOnceWith(late));
    expect(scene.children).toHaveLength(0);
  });

  it('stops retrying a missing model after two attempts', async () => {
    const load = vi.fn(async () => { throw new Error('not found'); });
    const { streaming, update } = setup(load);
    const now = performance.now();
    update(now);
    await vi.waitFor(() => expect(streaming.inspect().pending).toBeNull());
    update(now + 5000);
    await vi.waitFor(() => expect(streaming.inspect().failed).toEqual(['shrub-2-lod']));
    update(now + 10_000);
    expect(load).toHaveBeenCalledTimes(2);
    streaming.dispose();
  });

  it('registers the visible overview rock obstruction after the player clears its footprint', async () => {
    const { streaming, update, setObstacles } = setup(async () => model());
    streaming.setVenueVisibility({ music: false, cliff: true });
    update(0, 100);
    await vi.waitFor(() => expect(streaming.inspect().pending).toBeNull());
    update(200, 100);
    expect(streaming.inspect().mounted).toBe(0);
    expect(setObstacles).not.toHaveBeenCalled();
    update(400, 91);
    expect(streaming.inspect().mounted).toBe(1);
    expect(setObstacles).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'd1', x: 100 })]);
    update(600, 200);
    expect(setObstacles).toHaveBeenLastCalledWith([]);
    streaming.dispose();
  });
});
