import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import config from '../../src/content/world/music-interior-decoration-v004.json';
import { createMusicInteriorDecoration, createMusicInteriorTechnicalTexture, type MusicInteriorDecorationTexture } from '../../src/world/music-interior-decoration';

function fixture() {
  const root = new THREE.Group(), source = new THREE.MeshStandardMaterial({ color: '#755b40' }); source.name = 'plaster';
  const materials = ['plaster', 'stone', 'wood', 'floral', 'stone-landing'].map(suffix => {
    const m = new THREE.MeshStandardMaterial({ color: '#e7d8b7' }); m.name = `music-decor-${suffix}`; return m;
  });
  for (const m of [...materials, source]) root.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
  return { root, materials, source };
}

function loadedTexture() {
  const texture = new THREE.Texture(), close = vi.fn();
  return { texture, close };
}

describe('music interior decoration ownership and limits', () => {
  it('moves only the hall pendant fixture off the new mural and preserves every light', async () => {
    const standardRoot = fixture(), muralRoot = fixture();
    const standard = createMusicInteriorDecoration(standardRoot.root, { loadFloralTexture: async () => loadedTexture() });
    const mural = createMusicInteriorDecoration(muralRoot.root, { loadFloralTexture: async () => loadedTexture(), avoidGroundMural: true });
    await Promise.all([standard.ready, mural.ready]);
    const before = standard.inspect(), after = mural.inspect();
    expect(after.lights).toEqual(before.lights);
    for (const fixture of before.fixtures) {
      const changed = after.fixtures.find(item => item.id === fixture.id)!;
      if (fixture.id === 'under-upper-floor') {
        expect(changed.position).toEqual([fixture.position[0] + 2, fixture.position[1], fixture.position[2]]);
        expect(changed.mount).toEqual([fixture.mount[0] + 2, fixture.mount[1], fixture.mount[2]]);
      } else expect(changed).toEqual(fixture);
    }
    standard.dispose(); mural.dispose();
  });
  it('clears the renovated hall and stair murals of lantern meshes while keeping their local lighting', async () => {
    const f = fixture();
    const decoration = createMusicInteriorDecoration(f.root, {
      loadFloralTexture: async () => loadedTexture(), omitUpperLantern: true, hideLanternFixtures: true,
    });
    await decoration.ready;
    const state = decoration.inspect();
    expect(state.fixtures).toEqual([]);
    expect(state.fixtureDrawCalls).toBe(0);
    expect(state.lights.map(light => light.id)).toEqual(['under-upper-floor', 'right-room', 'stair-high-space']);
    expect(f.root.getObjectByName('music-interior-local-fill-v004')?.children.every(object => object instanceof THREE.PointLight)).toBe(true);
    decoration.dispose();
  });
  it('only maps new decoration materials and reuses four textures with four broad non-shadow points and three fixture batches', async () => {
    const f = fixture(), originalMap = new THREE.Texture(), originalColor = f.source.color.clone(); f.source.map = originalMap;
    const authoredColors = f.materials.map(material => material.color.clone());
    const loaded = loadedTexture(), loader = vi.fn(async (_url: string, _signal: AbortSignal) => loaded);
    const decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: loader });
    await decoration.ready;
    const state = decoration.inspect();
    expect(loader).toHaveBeenCalledOnce(); expect(loader.mock.calls[0][0]).toContain(config.floral.asset);
    expect(state.version).toBe('music-interior-decoration-v004');
    expect(state.status).toBe('ready'); expect(state.objects).toBe(7); expect(state.shadowLights).toBe(0);
    expect(state.fixtureDrawCalls).toBe(3); expect(state.fixtureTriangles).toBeLessThan(3000);
    expect(state.fixtures).toHaveLength(4); expect(state.lights).toHaveLength(4);
    expect(state.textures).toBe(4); expect(state.textureBytes).toBeLessThan(1_200_000);
    expect(state.lights.every(l => l.type === 'PointLight' && l.distance >= 10 && l.intensity > 0
      && l.decay > 0 && l.sourceRadius > 0 && !l.castShadow)).toBe(true);
    expect(f.materials[4].map).toBe(f.materials[1].map);
    expect(f.source.map).toBe(originalMap); expect(f.source.color.equals(originalColor)).toBe(true);
    expect(f.materials.every((material, i) => material.color.equals(authoredColors[i]))).toBe(true);
    expect(f.materials[0].map?.name).toBe('music-interior-technical-plaster-v001');
    expect(f.materials[3].map).toBe(loaded.texture);
    decoration.dispose();
  });

  it('attaches wall brackets and suspension caps to measured building faces, with clear door and stair envelopes', async () => {
    const f = fixture(), decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: async () => loadedTexture() });
    await decoration.ready; f.root.updateMatrixWorld(true);
    const batches = f.root.getObjectByName('music-interior-local-fill-v004')!.children.filter(o => o instanceof THREE.Mesh);
    expect(batches).toHaveLength(3);
    for (const definition of config.lights) {
      const mount = new THREE.Vector3(...definition.mount as [number, number, number]);
      const normal = definition.mountKind === 'ceiling' ? new THREE.Vector3(0, 1, 0)
        : definition.mountKind === 'side-wall' ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 0, definition.mountKind === 'screen' ? 1 : -1);
      if (definition.mountKind !== 'ceiling') mount.y -= .08;
      const ray = new THREE.Raycaster(mount.clone().addScaledVector(normal, .1), normal.clone().negate(), 0, .2);
      const hit = ray.intersectObjects(batches)[0];
      expect(hit, `missing mount ${definition.id}`).toBeDefined();
      expect(hit.point.distanceTo(mount), definition.id).toBeLessThan(1e-4);
    }
    const state = decoration.inspect();
    expect(state.fixtures.map(item => item.id).sort()).toEqual(['right-room', 'stair-high-space', 'under-upper-floor', 'upper-rear']);
    const high = state.fixtures.find(item => item.id === 'stair-high-space')!;
    const treadY = 7.915375 + (1.8 - 7.915375) * (high.position[0] - 46.27) / 9.42;
    expect(high.position[1] - treadY).toBeCloseTo(2.5, 2);
    expect(high.bounds.min[1] - treadY).toBeGreaterThan(2.1);
    expect(high.bounds.max[2]).toBeLessThan(-31.65);
    // Check the batched triangles, not only config IDs: no old cloth/frame/cap
    // may survive at the removed entry and lower rear-wall fixture centers.
    for (const center of [new THREE.Vector3(43.7, 4.55, -21.99), new THREE.Vector3(54.9, 4.81, -31.9)]) {
      for (const axis of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
        const ray = new THREE.Raycaster(center.clone().addScaledVector(axis, -.5), axis, 0, 1);
        expect(ray.intersectObjects(batches)).toHaveLength(0);
      }
    }
    decoration.dispose();
  });

  it('moves actual tagged point lights and visible fixtures with the same source-to-terrain transform', async () => {
    const f = fixture(), decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: async () => loadedTexture() });
    await decoration.ready;
    f.root.position.set(17, 2.5, -8); f.root.rotation.y = THREE.MathUtils.degToRad(28);
    f.root.updateMatrixWorld(true);
    const points: THREE.PointLight[] = [], spots: THREE.SpotLight[] = [];
    f.root.traverse(object => {
      if (object instanceof THREE.PointLight) points.push(object);
      if (object instanceof THREE.SpotLight) spots.push(object);
    });
    expect(points).toHaveLength(4); expect(spots).toHaveLength(0);
    const owned = f.root.getObjectByName('music-interior-local-fill-v004')!;
    expect(owned.children.every(object => object instanceof THREE.Mesh || object instanceof THREE.PointLight)).toBe(true);
    for (const definition of config.lights) {
      const point = points.find(light => light.name === `music-interior-fill-${definition.id}`)!;
      const expectedPosition = f.root.localToWorld(new THREE.Vector3(...definition.position as [number, number, number]));
      const fixturePosition = decoration.inspect().fixtures.find(item => item.id === definition.id)!.position;
      expect(point.getWorldPosition(new THREE.Vector3()).distanceTo(expectedPosition)).toBeLessThan(1e-8);
      expect(point.position.toArray()).toEqual(fixturePosition);
      expect(point.parent).toBe(owned); expect(point.userData.musicInteriorLantern).toBe(true);
      expect(point.castShadow).toBe(false); expect('target' in point).toBe(false);
    }
    decoration.dispose();
  });

  it('restores GLB map ownership and disposes only module textures and lights, idempotently', async () => {
    const f = fixture(), old = new THREE.Texture(); f.materials[0].map = old;
    const externalLight = new THREE.PointLight('#ffffff', 2); f.root.add(externalLight);
    const externalLightDispose = vi.spyOn(externalLight, 'dispose');
    const oldDispose = vi.spyOn(old, 'dispose'), materialDispose = vi.spyOn(f.materials[0], 'dispose');
    const loaded = loadedTexture(), disposeFloral = vi.spyOn(loaded.texture, 'dispose');
    const decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: async () => loaded });
    await decoration.ready;
    const technical = f.materials[0].map!, disposeTechnical = vi.spyOn(technical, 'dispose');
    const owned = f.root.getObjectByName('music-interior-local-fill-v004')!;
    const points = owned.children.filter((object): object is THREE.PointLight => object instanceof THREE.PointLight);
    const lightDisposals = points.map(light => vi.spyOn(light, 'dispose'));
    const geometryDisposals: ReturnType<typeof vi.spyOn>[] = [], materialDisposals: ReturnType<typeof vi.spyOn>[] = [];
    owned.traverse(o => { if (o instanceof THREE.Mesh) {
      geometryDisposals.push(vi.spyOn(o.geometry, 'dispose'));
      materialDisposals.push(vi.spyOn(o.material as THREE.Material, 'dispose'));
    } });
    decoration.dispose(); decoration.dispose();
    expect(f.materials[0].map).toBe(old); expect(f.materials[3].map).toBeNull();
    expect(disposeTechnical).toHaveBeenCalledOnce(); expect(disposeFloral).toHaveBeenCalledOnce(); expect(loaded.close).toHaveBeenCalledOnce();
    expect(oldDispose).not.toHaveBeenCalled(); expect(materialDispose).not.toHaveBeenCalled();
    expect(externalLight.parent).toBe(f.root); expect(externalLightDispose).not.toHaveBeenCalled();
    expect(lightDisposals).toHaveLength(4);
    for (const disposal of lightDisposals) expect(disposal).toHaveBeenCalledOnce();
    expect(points.every(light => light.parent === null)).toBe(true);
    expect(geometryDisposals).toHaveLength(3); expect(materialDisposals).toHaveLength(3);
    for (const disposal of [...geometryDisposals, ...materialDisposals]) expect(disposal).toHaveBeenCalledOnce();
    expect(decoration.inspect().status).toBe('disposed'); expect(decoration.inspect().objects).toBe(0);
    expect(decoration.inspect().fixtureDrawCalls).toBe(0);
    expect(f.root.getObjectByName('music-interior-local-fill-v004')).toBeUndefined();
  });

  it('cancels a pending load and releases a late texture without reinstalling it or leaving lights behind', async () => {
    const f = fixture(); let resolve: ((value: MusicInteriorDecorationTexture) => void) | undefined;
    const pending = new Promise<MusicInteriorDecorationTexture>(r => { resolve = r; });
    const decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: async () => pending });
    await Promise.resolve();
    const failure = expect(decoration.ready).rejects.toThrow('music-decoration-load-cancelled');
    decoration.dispose(); await failure;
    const late = loadedTexture(), disposeLate = vi.spyOn(late.texture, 'dispose'); resolve!(late);
    await pending; await Promise.resolve(); await Promise.resolve();
    expect(disposeLate).toHaveBeenCalledOnce(); expect(late.close).toHaveBeenCalledOnce();
    expect(f.materials.every(m => m.map === null)).toBe(true);
    expect(decoration.inspect().objects).toBe(0);
  });

  it('cleans up failed image requests and leaves original material maps intact', async () => {
    const f = fixture(), old = new THREE.Texture(); f.materials[0].map = old;
    const decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: async () => { throw new Error('test-image-failure'); } });
    await expect(decoration.ready).rejects.toThrow('test-image-failure');
    expect(decoration.inspect().status).toBe('disposed'); expect(f.materials[0].map).toBe(old);
    expect(decoration.inspect().objects).toBe(0);
  });

  it('aborts a stalled image request at its deadline and releases the fixture GPU resources', async () => {
    vi.useFakeTimers();
    try {
      const f = fixture(); let signal: AbortSignal | undefined;
      const decoration = createMusicInteriorDecoration(f.root, { loadFloralTexture: async (_url, received) => {
        signal = received; return new Promise<MusicInteriorDecorationTexture>(() => {});
      } });
      const owned = f.root.getObjectByName('music-interior-local-fill-v004')!;
      const copper = owned.getObjectByName('music-lantern-copper-batch-v002') as THREE.Mesh;
      const releaseGeometry = vi.spyOn(copper.geometry, 'dispose');
      const releaseMaterial = vi.spyOn(copper.material as THREE.Material, 'dispose');
      const failure = expect(decoration.ready).rejects.toThrow('music-decoration-loading-timeout');
      await vi.advanceTimersByTimeAsync(config.floral.loadTimeoutMs + 1); await failure;
      expect(signal?.aborted).toBe(true);
      expect(decoration.inspect().objects).toBe(0);
      expect(releaseGeometry).toHaveBeenCalledOnce(); expect(releaseMaterial).toHaveBeenCalledOnce();
      expect(f.materials.every(material => material.map === null)).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('uses reproducible quiet metre-scale grain and preserves the authored slab and plank dimensions', () => {
    for (const kind of ['plaster', 'stone', 'wood'] as const) {
      const a = createMusicInteriorTechnicalTexture(kind), b = createMusicInteriorTechnicalTexture(kind);
      expect(a.image.width).toBe(256); expect(a.image.height).toBe(256);
      expect(a.image.data).toEqual(b.image.data);
      expect(a.wrapS).toBe(THREE.RepeatWrapping); expect(a.wrapT).toBe(THREE.RepeatWrapping);
      expect(a.repeat.toArray()).toEqual(config.technicalTextures[kind].repeat);
      const data = a.image.data as Uint8Array;
      let low = 255, high = 0;
      for (let i = 0; i < data.length; i += 4) { low = Math.min(low, data[i]); high = Math.max(high, data[i]); }
      expect(low).toBeGreaterThanOrEqual(kind === 'plaster' ? 250 : 225);
      expect(high).toBeLessThanOrEqual(255);
      a.dispose(); b.dispose();
    }
    expect(1 / config.technicalTextures.stone.repeat[0]).toBeCloseTo(1.8);
    expect(1 / config.technicalTextures.stone.repeat[1]).toBeCloseTo(1.3);
    expect(.5 / config.technicalTextures.wood.repeat[0]).toBeCloseTo(.55);
  });
});
