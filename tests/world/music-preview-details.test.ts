import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { createMusicPavilionV5, musicHallFinishApproach, musicPreviewDetailApproaches } from '../../src/world/music-pavilion-v005';
import originalBalcony from '../../src/content/world/music-balcony-ensemble-v001.json';
import compactBalcony from '../../src/content/world/music-balcony-ensemble-v002.json';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('second-gallery preview startup', () => {
  it('prepares visible hall finishes before entering the courtyard without loading remote areas', () => {
    expect(musicHallFinishApproach({ x: 40.2, z: 6.2 })).toBe(true); // guide preview spawn outside the gate
    expect(musicHallFinishApproach({ x: 40.2, z: 1.3 })).toBe(true); // courtyard gate
    expect(musicHallFinishApproach({ x: 39.5, z: -19.4 }, 'music-floor-1')).toBe(true);
    expect(musicHallFinishApproach({ x: 100, z: 40 })).toBe(false);
    expect(musicHallFinishApproach({ x: 100, z: 40 }, 'music-floor-2')).toBe(true); // restored upstairs
    expect(musicPreviewDetailApproaches({ x: 40.2, z: 6.2 }).interiorMural).toBe(false);
  });

  it('uses distinct approaches for the visible front mural and the interior art', () => {
    expect(musicPreviewDetailApproaches({ x: 39.5, z: -19.4 }, 'music-floor-1')).toEqual({
      balcony: false, flying: false, interiorMural: false,
    });
    expect(musicPreviewDetailApproaches({ x: 39.5, z: -22.4 }, 'music-floor-1')).toEqual({
      balcony: true, flying: false, interiorMural: true,
    });
    expect(musicPreviewDetailApproaches({ x: 52, z: -10 })).toEqual({
      balcony: true, flying: true, interiorMural: false,
    });
    expect(musicPreviewDetailApproaches({ x: 64, z: -30 }, 'music-stair').balcony).toBe(true);
  });

  it('makes the building ready before starting the optional ensemble and lets it recover locally', async () => {
    const requests: string[] = [];
    let ensembleAvailable = false;
    vi.stubGlobal('document', { baseURI: 'http://localhost/music-companion-v002.html' });
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      requests.push(url.pathname);
      if (url.pathname.endsWith('/ensemble.glb') && !ensembleAvailable) return new Response(null, { status: 503 });
      const kind = url.pathname.endsWith('/ensemble.glb') ? 2 : url.pathname.endsWith('/route-dune.glb') ? 1 : 0;
      return new Response(Uint8Array.of(kind));
    }));
    const legacy: THREE.Mesh[] = [];
    vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async data => {
      const scene = new THREE.Group();
      const kind = new Uint8Array(data as ArrayBuffer)[0];
      if (kind === 0) for (let i = 0; i < 9; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry());
        mesh.userData.semanticGroup = 'gallery-musicians';
        legacy.push(mesh); scene.add(mesh);
      }
      if (kind === 2) for (const id of ['pipa', 'flute', 'zheng', 'waist-drum']) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry());
        mesh.name = `ensemble-${id}`;
        scene.add(mesh);
      }
      return { scene } as unknown as GLTF;
    });
    const scene = new THREE.Scene();
    const pavilion = createMusicPavilionV5(scene, false, 'music-interior/v008/music-pavilion.glb', 'interior', true);
    try {
      await pavilion.ready;
      expect(requests).toEqual([
        '/assets/world/music-interior/v008/music-pavilion.glb',
        '/assets/world/music-pavilion/v002/route-dune.glb',
      ]);
      expect(legacy).toHaveLength(9);
      expect(legacy.every(mesh => !mesh.visible && !mesh.castShadow)).toBe(true);
      expect(pavilion.inspect().details).toEqual({ balcony: 'idle', flying: 'idle' });
      expect(await pavilion.loadDetail('balcony')).toBe(false);
      expect(pavilion.detailStatus('balcony')).toBe('failed');
      expect(scene.getObjectByName('music-pavilion-v005')).toBeTruthy();
      ensembleAvailable = true;
      expect(await pavilion.loadDetail('balcony', true)).toBe(true);
      expect(pavilion.inspect().balconyEnsemble).toEqual({
        players: ['pipa', 'flute', 'zheng', 'waist-drum'],
        replacedLegacyMeshes: 9,
      });
      expect(scene.getObjectByName('music-balcony-ensemble')?.position.y).toBe(7.915375);
    } finally {
      pavilion.dispose();
    }
  });

  it.each(['interior', 'exterior'] as const)('loads the 1K ensemble and fits its mat to v002 for the %s balcony', async variant => {
    const requests: string[] = [];
    vi.stubGlobal('document', { baseURI: 'http://localhost/music-companion-v002.html' });
    vi.stubGlobal('fetch', vi.fn(async (url: URL) => {
      requests.push(url.pathname);
      return new Response(Uint8Array.of(url.pathname.endsWith('/ensemble.glb') ? 2 : 0));
    }));
    const players = new Map<string, THREE.Mesh>();
    const mat = new THREE.Mesh(new THREE.BoxGeometry(
      originalBalcony.mat.max[0] - originalBalcony.mat.min[0], .014,
      originalBalcony.mat.max[2] - originalBalcony.mat.min[2],
    ));
    mat.name = 'ensemble-woven-mat';
    mat.position.set((originalBalcony.mat.min[0] + originalBalcony.mat.max[0]) / 2, .007,
      (originalBalcony.mat.min[2] + originalBalcony.mat.max[2]) / 2);
    vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(async data => {
      const scene = new THREE.Group();
      if (new Uint8Array(data as ArrayBuffer)[0] === 2) {
        for (const { id } of originalBalcony.players) {
          const player = new THREE.Mesh(new THREE.BoxGeometry());
          player.name = `ensemble-${id}`;
          player.position.set(1, .014, 3);
          player.scale.setScalar(2);
          players.set(id, player);
          scene.add(player);
        }
        scene.add(mat);
      } else for (let i = 0; i < 9; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry());
        mesh.userData.semanticGroup = 'gallery-musicians';
        scene.add(mesh);
      }
      return { scene } as unknown as GLTF;
    });
    const scene = new THREE.Scene();
    const pavilion = createMusicPavilionV5(scene, false, undefined, variant, true, true);
    try {
      await pavilion.ready;
      expect(requests.filter(path => path.endsWith('/ensemble.glb'))).toEqual([]);
      expect(await pavilion.loadDetail('balcony')).toBe(true);
      expect(requests.filter(path => path.endsWith('/ensemble.glb'))).toEqual([`/assets/world/${compactBalcony.asset}`]);
      expect(pavilion.inspect().balconyEnsemble?.placement).toBe('v002');
      for (const next of compactBalcony.players) {
        const old = originalBalcony.players.find(player => player.id === next.id)!;
        const player = players.get(next.id)!;
        expect(player.position.x).toBeCloseTo(1 + next.anchor[0] - old.anchor[0], 6);
        expect(player.position.z).toBeCloseTo(3 + next.anchor[2] - old.anchor[2], 6);
        expect(player.position.y).toBe(.014);
        expect(player.scale.toArray()).toEqual([2, 2, 2]);
      }
      scene.updateMatrixWorld(true);
      const actual = new THREE.Box3().setFromObject(mat);
      actual.min.toArray().forEach((coordinate, index) => expect(coordinate).toBeCloseTo(compactBalcony.mat.min[index], 5));
      actual.max.toArray().forEach((coordinate, index) => expect(coordinate).toBeCloseTo(compactBalcony.mat.max[index], 5));
    } finally {
      pavilion.dispose();
    }
  });
});
