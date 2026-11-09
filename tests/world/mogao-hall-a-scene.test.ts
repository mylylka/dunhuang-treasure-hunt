import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MOGAO_HALL_A_LAYOUT as layout } from '../../src/content/world/mogao-hall-a-layout-v002';
import { createMogaoHallAScene } from '../../src/world/mogao-hall-a-scene';

const point = { x: 0, z: 0 };
const intersects = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x + a.w > b.x && a.x < b.x + b.w && a.y + a.h > b.y && a.y < b.y + b.h;

describe('Mogao Hall A mural display', () => {
  it('wraps the uninterrupted source through D/A/B and leaves both passages clear', () => {
    const root = new THREE.Scene();
    const display = createMogaoHallAScene(root);
    try {
      const panels = layout.artwork.filter(panel => panel.id === 'bandits');
      const [d, a, b] = panels;
      expect(panels.map(panel => panel.wall)).toEqual(['D', 'A', 'B']);
      expect(d.rect.x + d.rect.w).toBeCloseTo(layout.walls.D.width);
      expect(a.rect.w).toBeCloseTo(layout.walls.A.width);
      expect(b.rect.x).toBe(0);
      expect(d.crop[0]).toBe(0);
      expect(d.crop[1]).toBe(a.crop[0]);
      expect(a.crop[1]).toBe(b.crop[0]);
      expect(b.crop[1]).toBe(1);
      expect(panels.reduce((width, p) => width + p.rect.w, 0) / d.rect.h).toBeCloseTo(4203 / 602, 5);
      for (const panel of [...layout.artwork, ...layout.titles]) {
        if (panel.wall !== 'D' && panel.wall !== 'C') continue;
        const door = layout.openings[panel.wall];
        expect(intersects(panel.rect, door)).toBe(false);
      }
      for (const title of layout.titles) {
        const picture = layout.artwork.find(panel => panel.wall === title.wall)!;
        expect(title.rect.x).toBe(picture.rect.x);
        expect(title.rect.y - (picture.rect.y + picture.rect.h)).toBeGreaterThan(.05);
        expect(title.rect.y - (picture.rect.y + picture.rect.h)).toBeLessThan(.08);
      }
      expect(layout.plaque.w).toBe(2.45);
      expect(layout.plaque.h).toBe(1.95 * 2 / 3);
      expect(display.inspect().lights).toEqual({ fixtures: 15, drawBatches: 3 });
    } finally {
      display.dispose();
    }
  });

  it('warms only A wall textures on the first climb, selects mobile maps, and shares one long-roll texture', async () => {
    const fetch = vi.fn(async (_url: string) => new Response(new Blob(['art'])));
    const close = vi.fn();
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('createImageBitmap', async () => ({ close }));
    const root = new THREE.Scene();
    const change = vi.fn();
    const display = createMogaoHallAScene(root, { textureTier: 'mobile', onChange: change });
    try {
      for (const surface of ['ground', 'landing-0', 'flight-3', 'hall-b', 'landing-4', 'view-link-b']) display.update(point, surface);
      expect(fetch).not.toHaveBeenCalled();
      display.update(point, 'flight-1');
      await vi.waitFor(() => expect(Object.values(display.inspect().images).every(asset => asset.status === 'ready')).toBe(true));
      display.update(point, 'landing-2');
      display.update(point, 'hall-a');
      const urls = fetch.mock.calls.map(([url]) => url);
      expect(urls).toHaveLength(5);
      expect(urls.filter(url => url.endsWith('/bandits-full-mobile.webp'))).toHaveLength(1);
      expect(urls.filter(url => url.endsWith('/burning-house-full-mobile.webp'))).toHaveLength(1);
      expect(urls.filter(url => url.endsWith('/mogao-hall-a/v002/title-burning-house.webp'))).toHaveLength(1);
      expect(urls.some(url => /-detail-|-paper\.webp|\/v001\/title-burning-house\.webp/.test(url))).toBe(false);
      const faces = ['d', 'a', 'b'].map(wall => root.getObjectByName(`mogao-hall-a-bandits-${wall}`) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>);
      expect(new Set(faces.map(face => face.material.map)).size).toBe(1);
      const aUV = faces[1].geometry.getAttribute('uv');
      expect(aUV.getX(0)).toBeCloseTo(1002 / 4203);
      expect(aUV.getX(faces[1].geometry.parameters.widthSegments)).toBeCloseTo(2372 / 4203);
      expect(change).toHaveBeenCalledTimes(5);
    } finally {
      display.dispose();
      vi.unstubAllGlobals();
    }
    expect(close).toHaveBeenCalledTimes(5);
  });

  it('picks both titles and all four pictures from A, respecting visible blockers and hall boundaries', async () => {
    vi.stubGlobal('fetch', async () => new Response(new Blob(['art'])));
    vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));
    const root = new THREE.Scene();
    const marker = new THREE.Group();
    marker.name = 'hall-a-exit-label';
    root.add(marker);
    const display = createMogaoHallAScene(root);
    const camera = new THREE.PerspectiveCamera(59, 1.8, .1, 50);
    try {
      display.update(point, 'hall-a');
      await vi.waitFor(() => expect(display.inspect().targets.every(target => target.visible)).toBe(true));
      expect(marker.visible).toBe(false);
      const targets = display.inspect().targets;
      expect(targets).toHaveLength(6);
      for (const target of targets) {
        const center = new THREE.Vector3().fromArray(target.center);
        camera.position.copy(center).addScaledVector(new THREE.Vector3().fromArray(target.normal), 3);
        camera.lookAt(center);
        const ndc = { x: 0, y: 0 };
        expect(display.pick(root, camera, ndc, 'hall-a'), target.key).toBe(target.id);
        const accepted = display.inspect().lastPick;
        expect(accepted).toMatchObject({ x: 0, y: 0, target: target.key, blocker: null });
        expect(display.pick(root, camera, ndc, 'hall-b')).toBeNull();
        expect(display.inspect().lastPick).toBe(accepted);
        const blocker = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), new THREE.MeshBasicMaterial());
        blocker.name = 'foreground blocker';
        blocker.position.copy(center).lerp(camera.position, .5);
        root.add(blocker);
        expect(display.pick(root, camera, ndc, 'hall-a')).toBeNull();
        expect(display.inspect().lastPick).toMatchObject({ target: target.key, blocker: blocker.name });
        expect(display.pick(root, camera, ndc, 'hall-a', blocker)).toBe(target.id);
        root.remove(blocker);
        blocker.geometry.dispose();
        blocker.material.dispose();
      }
    } finally {
      display.dispose();
      vi.unstubAllGlobals();
    }
    expect(marker.visible).toBe(true);
  });

  it('falls back to an upload-flipped native image from the fetched bytes and retries only failed requests on reentry', async () => {
    let failBandits = true;
    const fetch = vi.fn(async (url: string) => failBandits && url.endsWith('/bandits-full-mobile.webp')
      ? new Response(null, { status: 503 }) : new Response(new Blob(['art'])));
    const imageDecode = vi.fn();
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    class NativeImage {
      onload: (() => void) | null = null;
      set src(url: string) {
        imageDecode(url);
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('createImageBitmap', async () => { throw new TypeError('Bitmap decode unsupported'); });
    vi.stubGlobal('Image', NativeImage);
    const root = new THREE.Scene();
    const display = createMogaoHallAScene(root, { textureTier: 'mobile' });
    try {
      display.update(point, 'hall-a');
      await vi.waitFor(() => expect(display.inspect().images['burning-house-title'].status).toBe('ready'));
      expect(display.inspect().images.bandits.status).toBe('failed');
      expect(fetch).toHaveBeenCalledTimes(5);
      expect(imageDecode).toHaveBeenCalledTimes(4);
      expect(revoke).toHaveBeenCalledTimes(4);
      const title = root.getObjectByName('mogao-hall-a-burning-house-title') as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      expect(title.material.map?.flipY).toBe(true);
      failBandits = false;
      display.update(point, 'hall-b');
      display.update(point, 'landing-2');
      await vi.waitFor(() => expect(display.inspect().images.bandits.status).toBe('ready'));
      expect(fetch).toHaveBeenCalledTimes(6);
      expect(imageDecode).toHaveBeenCalledTimes(5);
      expect(revoke).toHaveBeenCalledTimes(5);
    } finally {
      display.dispose();
      revoke.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
