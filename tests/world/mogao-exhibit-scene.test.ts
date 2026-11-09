import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import layout from '../../src/content/world/mogao-exhibit-layout-v004.json';
import upperLayout from '../../src/content/world/mogao-upper-v002.json';
import { createMogaoExhibitScene, MOGAO_EXHIBIT_WALLS } from '../../src/world/mogao-exhibit-scene';
import { settleUpperCamera } from '../../src/world/mogao-upper-camera';
import { MOGAO_BUDDHA_GATE, moveUpperPlayer, upperFromWorld, upperToWorld } from '../../src/world/mogao-upper-navigation';
import { fitMogaoExhibitEntranceMeshes } from '../../src/world/mogao-upper-presentation';

function vector(x: number, y: number, z: number) {
  const world = upperToWorld({ x, y, z });
  return new THREE.Vector3(world.x, world.y, world.z);
}

describe('Mogao B chamber exhibit placement', () => {
  it('mounts the accepted layout in visitor-facing coordinates, with all 13 image faces independently clickable', () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    const camera = new THREE.PerspectiveCamera(63, 1.8, .1, 50);
    const ignored = new THREE.Group();
    try {
      for (const plan of layout.walls) {
        const id = plan.id as keyof typeof MOGAO_EXHIBIT_WALLS;
        const wall = MOGAO_EXHIBIT_WALLS[id];
        const along = new THREE.Vector3(Math.cos(wall.yaw), 0, -Math.sin(wall.yaw));
        const towardRoom = new THREE.Vector3(Math.sin(wall.yaw), 0, Math.cos(wall.yaw));
        const center = new THREE.Vector3(wall.x, layout.floorWorldY + 3, wall.z).addScaledVector(along, plan.width / 2);
        camera.position.copy(center).addScaledVector(towardRoom, 7.2);
        camera.lookAt(center);
        camera.updateMatrixWorld();
        const panels = exhibition.inspect().panels.filter(panel => panel.wall === id);
        const points = panels.map(panel => new THREE.Vector3().fromArray(panel.center).project(camera));
        expect(panels.map(panel => panel.id)).toEqual(plan.panels.map(panel => panel.id));
        panels.forEach((panel, index) => {
          const { rect, crop } = plan.panels[index];
          expect(panel.width).toBe(rect.w);
          expect(panel.height).toBe(rect.h);
          expect(panel.crop).toEqual(crop);
          const expected = new THREE.Vector3(wall.x, layout.floorWorldY + rect.y + rect.h / 2, wall.z)
            .addScaledVector(along, rect.x + rect.w / 2).addScaledVector(towardRoom, .035);
          expect(new THREE.Vector3().fromArray(panel.center).distanceTo(expected)).toBeLessThan(1e-5);
        });
        if (id === 'A') {
          // A01/A03 form a stack left of A02 in the approved A wall.
          expect(points[0].x).toBeLessThan(points[1].x);
          expect(points[2].x).toBeLessThan(points[1].x);
          expect(points[0].y).toBeGreaterThan(points[2].y);
        } else {
          expect(points[0].x).toBeLessThan(points[1].x);
          expect(points[1].x).toBeLessThan(points[2].x);
        }
        expect(points.map(point => exhibition.pick(root, camera, point, 'hall-b', ignored))).toEqual(panels.map(panel => panel.id));
      }
      const visible = exhibition.inspect();
      expect(visible.panels).toHaveLength(13);
      expect(new Set(visible.panels.map(panel => panel.exhibitId)).size).toBe(12);
      expect(visible.panels.find(panel => panel.id === 'C03-detail')?.exhibitId).toBe('C03');
      expect(visible.decorativeLights).toEqual({ fixtures: 14, drawBatches: 3, dynamicLights: 0 });
    } finally {
      exhibition.dispose();
    }
  });

  it('keeps the actual door rectangles clear, including the wall wash geometry', () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    try {
      for (const wall of layout.walls) {
        const opening = wall.opening;
        if (!opening) continue;
        const intersects = (x: number, y: number, w: number, h: number) => (
          x < opening.x + opening.w - 1e-5 && x + w > opening.x + 1e-5
          && y < opening.y + opening.h - 1e-5 && y + h > opening.y + 1e-5
        );
        for (const panel of wall.panels) {
          const { x, y, w, h } = panel.rect;
          expect(intersects(x, y, w, h)).toBe(false);
        }
        const wash = root.getObjectByName(`mogao-exhibit-light-pools-${wall.id}`) as THREE.Mesh;
        const positions = wash.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i += 4) {
          const x = positions.getX(i), y = positions.getY(i);
          expect(intersects(x, y, positions.getX(i + 2) - x, positions.getY(i + 2) - y)).toBe(false);
        }
      }
    } finally {
      exhibition.dispose();
    }
  });

  it('anchors each suspended lighting rail to the measured crown or its sloping soffit', () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    try {
      const vault = upperLayout.solids.find(solid => solid.id === 'b-vault-ceiling')!;
      const track = root.getObjectByName('mogao-exhibit-light-track') as THREE.InstancedMesh;
      const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
      let rods = 0;
      for (let i = 0; i < track.count; i++) {
        track.getMatrixAt(i, matrix);
        matrix.decompose(position, rotation, scale);
        if (Math.abs(scale.x - .028) > 1e-5 || Math.abs(scale.z - .028) > 1e-5) continue;
        const edge = Math.min(position.x - vault.min[0], vault.max[0] - position.x, position.z - vault.min[2], vault.max[2] - position.z);
        const ceiling = vault.min[1] + vault.vaultRise! * Math.min(1, edge / vault.vaultInset!);
        expect(position.y + scale.y / 2).toBeCloseTo(ceiling + .012, 4);
        rods++;
      }
      expect(rods).toBe(8);
    } finally {
      exhibition.dispose();
    }
  });

  it('clears the B and C titles from level and elevated in-hall viewpoints', () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    try {
      root.updateMatrixWorld(true);
      const fixtures = ['track', 'barrel', 'lens'].map(part => root.getObjectByName(`mogao-exhibit-light-${part}`)!);
      for (const id of ['B', 'C']) {
        const plan = layout.walls.find(wall => wall.id === id)!;
        const { x, y, w, h } = plan.titleBox;
        const wall = root.getObjectByName(`mogao-exhibit-wall-${id}`)!;
        for (const [along, height, inset] of [[.28, 1.65, 2.6], [.5, 1.85, 6.8], [.72, 2.65, 5.5], [.36, 3.65, 7.4]]) {
          const eye = wall.localToWorld(new THREE.Vector3(along * plan.width, height, inset));
          for (const u of [.14, .50, .86]) for (const v of [.16, .50, .84]) {
            const ink = wall.localToWorld(new THREE.Vector3(x + u * w, y + v * h, .024));
            const direction = ink.clone().sub(eye);
            const ray = new THREE.Raycaster(eye, direction.clone().normalize(), 0, direction.length() - .005);
            expect(ray.intersectObjects(fixtures), `${id} title ${u},${v} from ${along},${height},${inset}`).toHaveLength(0);
          }
        }
      }
    } finally {
      exhibition.dispose();
    }
  });

  it('gives the D plaque a real thin-edged metal body behind the front artwork', () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    try {
      const plaque = layout.walls.find(wall => wall.id === 'D')!.plaque!;
      const body = root.getObjectByName('mogao-exhibit-plaque-metal-body') as THREE.Mesh;
      const face = root.getObjectByName('mogao-exhibit-plaque-brushed-metal')!;
      const ink = root.getObjectByName('mogao-exhibit-plaque-ink')!;
      body.geometry.computeBoundingBox();
      const bounds = body.geometry.boundingBox!;
      expect(body.geometry).toBeInstanceOf(THREE.ExtrudeGeometry);
      expect(bounds.max.x - bounds.min.x).toBeCloseTo(plaque.rect.w, 5);
      expect(bounds.max.y - bounds.min.y).toBeCloseTo(plaque.rect.h, 5);
      expect(bounds.max.z - bounds.min.z).toBeCloseTo(.082, 5);
      expect(body.position.z + bounds.min.z).toBeCloseTo(.010, 5);
      expect(face.position.z).toBeGreaterThan(body.position.z + bounds.max.z);
      expect(ink.position.z).toBeGreaterThan(face.position.z);
    } finally {
      exhibition.dispose();
    }
  });

  it('warms current B maps on the second climb and applies cropping only on the wall map', async () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    const fetch = vi.fn(async (_url: string) => new Response(new Blob(['art'])));
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));
    try {
      exhibition.update({ x: 0, z: 0 }, 'landing-1', 0, true, false);
      expect(fetch).not.toHaveBeenCalled();
      expect(exhibition.inspect().wallMarkers.every(marker => !marker.visible)).toBe(true);
      exhibition.update({ x: 0, z: 0 }, 'hall-a', 0, true, false);
      expect(exhibition.inspect().imagesStarted).toBe(false);
      expect(fetch.mock.calls.every(([url]) => url.includes('/entrance-'))).toBe(true);
      exhibition.update({ x: 0, z: 0 }, 'flight-3', 0, true, false);
      await vi.waitFor(() => expect(exhibition.inspect().panels.every(panel => panel.status === 'ready')).toBe(true));
      exhibition.update({ x: 0, z: 0 }, 'landing-4', 0, true, false);
      exhibition.update({ x: 0, z: 0 }, 'hall-b', 0, true, false);
      const artRequests = fetch.mock.calls.map(([url]) => url).filter(url => !url.includes('/entrance-'));
      expect(artRequests).toHaveLength(19);
      expect(artRequests.some(url => url.endsWith('/mogao-exhibit/v002/c03.webp'))).toBe(true);
      expect(artRequests.some(url => url.endsWith('/mogao-exhibit/v002/c03-detail.webp'))).toBe(true);
      expect(artRequests.some(url => /-thumb\.webp|\/v001\/c03\.webp/.test(url))).toBe(false);
      expect(fetch.mock.calls.filter(([url]) => url.endsWith('/mogao-exhibit/v005/wall-lotus.webp'))).toHaveLength(1);
      expect(exhibition.inspect().wallMarkers.every(marker => marker.visible)).toBe(true);
      const title = root.getObjectByName('mogao-exhibit-title-B');
      expect(title?.visible).toBe(true);
      expect(root.getObjectByName('mogao-exhibit-plaque-ink')?.visible).toBe(true);
      const face = root.getObjectByName('mogao-exhibit-image-D01') as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
      const panel = exhibition.inspect().panels.find(panel => panel.id === 'D01')!;
      const [left, top, right, bottom] = panel.crop;
      expect(face.material.map?.offset.toArray()).toEqual([left, 1 - bottom]);
      expect(face.material.map?.repeat.toArray()).toEqual([right - left, bottom - top]);
    } finally {
      exhibition.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('mounts flat doorway ink on surfaces visible from each landing and shares one repeatable scrollwork map', async () => {
    const file = readFileSync(new URL('../../public/assets/world/mogao-upper/v003/upper.glb', import.meta.url));
    const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(file).buffer, '');
    fitMogaoExhibitEntranceMeshes(scene);
    const exhibition = createMogaoExhibitScene(scene);
    const fetch = vi.fn(async (_url: string) => new Response(new Blob(['ink'])));
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));
    try {
      exhibition.update({ x: 0, z: 0 }, 'flight-1', 0, true, false);
      expect(fetch).not.toHaveBeenCalled();
      exhibition.update({ x: 0, z: 0 }, 'flight-2', 0, true, false);
      await vi.waitFor(() => expect(exhibition.inspect().entranceSigns[0]).toMatchObject({ status: 'ready', patternReady: true }));
      expect(exhibition.inspect().entranceSigns[1].visible).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(3);
      exhibition.update({ x: 0, z: 0 }, 'flight-4', 0, true, false);
      await vi.waitFor(() => expect(exhibition.inspect().entranceSigns[1].status).toBe('ready'));
      expect(fetch.mock.calls.filter(([url]) => url.includes('/entrance-')).map(([url]) => url.split('/').at(-1))).toEqual([
        'entrance-hall-a.webp', 'entrance-jamb.webp', 'entrance-scrollwork.webp', 'entrance-hall-b.webp',
      ]);
      expect(exhibition.inspect().imagesStarted).toBe(true);
      const fields = ['hall-a', 'hall-b'].map(id =>
        scene.getObjectByName(`mogao-entrance-${id}-scrollwork`) as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>);
      expect(fields.map(field => field.material.map?.wrapS)).toEqual([THREE.RepeatWrapping, THREE.RepeatWrapping]);
      expect(fields[0].material.map).toBe(fields[1].material.map);
      for (const field of fields) {
        expect(field.renderOrder).toBeLessThan(0);
        expect(field.geometry.getAttribute('uv').getX(1)).toBeGreaterThan(3);
      }

      scene.updateMatrixWorld(true);
      const entrances = exhibition.inspect().entranceSigns;
      expect(entrances.map(sign => [sign.title, sign.underRoof])).toEqual([['绘世厅', false], ['佛法厅', true]]);
      for (const [index, sign] of entrances.entries()) {
        const eye = new THREE.Vector3(20.1, [8.11, 19.58][index] + 1.62, -24.18);
        const center = new THREE.Vector3().fromArray(sign.center);
        const direction = center.clone().sub(eye);
        const ray = new THREE.Raycaster(eye, direction.clone().normalize(), .01, direction.length() - .002);
        expect(ray.intersectObject(scene)).toHaveLength(0);
        const face = scene.getObjectByName(`mogao-entrance-${sign.id}`)!;
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(face.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(face.quaternion);
        expect(normal.dot(direction)).toBeLessThan(0);
        expect(right.x).toBeCloseTo(-1);
      }
    } finally {
      exhibition.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('clears the actual entrance meshes of coincident wall faces without moving the walking openings', async () => {
    const file = readFileSync(new URL('../../public/assets/world/mogao-upper/v003/upper.glb', import.meta.url));
    const { scene } = await new GLTFLoader().parseAsync(Uint8Array.from(file).buffer, '');
    const canopy = scene.getObjectByName('stair-top-ceiling') as THREE.Mesh;
    const jamb = scene.getObjectByName('b-south-west-pier') as THREE.Mesh;
    const lintel = scene.getObjectByName('a-south-lintel') as THREE.Mesh;
    const bLintel = scene.getObjectByName('b-south-lintel') as THREE.Mesh;
    const wedges: THREE.Mesh[] = [];
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && /^[ab]-vault-ceiling-south-\d+$/.test(object.name)) wedges.push(object);
    });
    const bounds = (mesh: THREE.Mesh) => new THREE.Box3().setFromObject(mesh, true);
    const before = bounds(canopy);
    const jambBefore = bounds(jamb);
    const lintelBefore = bounds(lintel);
    const bLintelBefore = bounds(bLintel);
    expect(before.max.z).toBeCloseTo(jambBefore.max.z, 4);
    expect(jambBefore.max.x - before.min.x).toBeCloseTo(.30, 4);
    expect(bLintelBefore.min.y - before.max.y).toBeCloseTo(.08, 4);
    expect(wedges).toHaveLength(30);
    for (const wedge of wedges) {
      expect(bounds(wedge).min.z).toBeCloseTo(lintelBefore.min.z, 4);
      expect(wedge.geometry.index?.count).toBe(36);
    }

    fitMogaoExhibitEntranceMeshes(scene);

    const after = bounds(canopy);
    expect(after.min.toArray()).toEqual(before.min.toArray());
    expect(after.max.y).toBe(before.max.y);
    expect(after.max.z).toBeCloseTo(jambBefore.max.z - .018, 4);
    expect(bounds(jamb)).toEqual(jambBefore);
    expect(bounds(lintel)).toEqual(lintelBefore);
    const bLintelAfter = bounds(bLintel);
    expect(bLintelAfter.min.y).toBeCloseTo(after.max.y - .006, 4);
    expect(bLintelAfter.max.toArray()).toEqual(bLintelBefore.max.toArray());
    for (const wedge of wedges) {
      const { index } = wedge.geometry;
      const positions = wedge.geometry.getAttribute('position');
      expect(index?.count).toBe(30);
      for (let i = 0; i < index!.count; i += 3) {
        expect([i, i + 1, i + 2].some(vertex => positions.getZ(index!.getX(vertex)) > -22.099)).toBe(true);
      }
    }
  });

  it('places four individually clickable lotuses clear of titles, frames and doors', async () => {
    const root = new THREE.Scene();
    const exhibition = createMogaoExhibitScene(root);
    const camera = new THREE.PerspectiveCamera(57, 1.8, .1, 50);
    const ignored = new THREE.Group();
    vi.stubGlobal('fetch', async () => new Response(new Blob(['art'])));
    vi.stubGlobal('createImageBitmap', async () => ({ close() {} }));
    try {
      exhibition.update({ x: 0, z: 0 }, 'hall-b', 0, true, false);
      await vi.waitFor(() => expect(exhibition.inspect().wallMarkers.filter(marker => marker.visible)).toHaveLength(4));
      const markers = exhibition.inspect().wallMarkers;
      expect(markers.map(marker => marker.id).sort()).toEqual(['wall-A', 'wall-B', 'wall-C', 'wall-D']);
      for (const marker of markers) {
        const plan = layout.walls.find(wall => wall.id === marker.wall)!;
        const wall = root.getObjectByName(`mogao-exhibit-wall-${marker.wall}`)!;
        const center = new THREE.Vector3().fromArray(marker.center);
        const local = wall.worldToLocal(center.clone());
        const left = local.x - marker.hitWidth / 2, right = local.x + marker.hitWidth / 2;
        const bottom = local.y - marker.hitHeight / 2, top = local.y + marker.hitHeight / 2;
        expect(left).toBeGreaterThan(0);
        expect(right).toBeLessThan(plan.width);
        expect(bottom).toBeGreaterThan(0);
        expect(top).toBeLessThan(layout.height);
        const border = .018;
        expect(marker.height).toBeCloseTo(.373);
        expect(marker.width / marker.height).toBeCloseTo(252 / 170);
        const title = root.getObjectByName(`mogao-exhibit-title-${marker.wall}`) as THREE.Mesh;
        const titleShift = title.position.x - (plan.titleBox.x + plan.titleBox.w / 2);
        const titleInk = { ...plan.titleInk, x: plan.titleInk.x + titleShift };
        const subtitleInk = { ...plan.subtitleInk, x: plan.subtitleInk.x + titleShift };
        if (marker.wall === 'C') {
          expect(local.x - marker.width / 2 - (titleInk.x + titleInk.w)).toBeCloseTo(.025, 4);
          expect(local.y).toBeCloseTo(titleInk.y + titleInk.h / 2, 4);
          const subtitleShift = title.geometry.getAttribute('position').getX(3) - plan.titleBox.w / 2;
          subtitleInk.x += subtitleShift;
          expect(subtitleInk.x - (local.x + marker.width / 2)).toBeCloseTo(.055, 4);
        } else {
          const gap = { A: .082, B: .088, D: .077 }[marker.wall];
          expect(titleInk.y - (local.y + marker.height / 2)).toBeCloseTo(gap, 4);
          expect(local.x).toBeCloseTo(titleInk.x + titleInk.w / 2, 4);
        }
        const occupied = [titleInk, subtitleInk, ...plan.panels.map(({ rect }) => ({
          x: rect.x - border, y: rect.y - border, w: rect.w + 2 * border, h: rect.h + 2 * border,
        }))];
        if (plan.opening) occupied.push(plan.opening);
        if (plan.plaque) occupied.push(plan.plaque.rect);
        for (const { x, y, w, h } of occupied) {
          expect(left < x + w && right > x && bottom < y + h && top > y, `${marker.id} clear of ${x},${y}`).toBe(false);
        }
        const along = local.x < plan.width / 2 ? 2.1 : -2.1;
        for (const [x, inset] of [[plan.width / 2, 5.5], [local.x + along, .85]]) {
          camera.position.copy(wall.localToWorld(new THREE.Vector3(x, 1.72, inset)));
          camera.lookAt(center);
          expect(exhibition.pick(root, camera, { x: 0, y: 0 }, 'hall-b', ignored)).toBe(marker.id);
          expect(exhibition.pick(root, camera, { x: 0, y: 0 }, 'hall-a', ignored)).toBeNull();
        }
      }
    } finally {
      exhibition.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('picks a visible panel before its image is loaded, while a foreground surface blocks the click', () => {
    const root = new THREE.Scene();
    const oldPanel = new THREE.Group();
    oldPanel.name = 'hall-b-mural-panel';
    root.add(oldPanel);
    const exhibition = createMogaoExhibitScene(root);
    const target = exhibition.inspect().panels.find(panel => panel.id === 'C02')!;
    const center = new THREE.Vector3().fromArray(target.center);
    const camera = new THREE.PerspectiveCamera(50, 1.8, .1, 50);
    camera.position.copy(center).add(new THREE.Vector3(5, 0, 0));
    camera.lookAt(center);
    const ignored = new THREE.Group();
    const occluder = new THREE.Mesh(new THREE.BoxGeometry(.15, .8, .8), new THREE.MeshBasicMaterial());
    occluder.position.copy(center).add(new THREE.Vector3(2, 0, 0));
    root.add(occluder);
    try {
      expect(oldPanel.visible).toBe(false);
      expect(target.status).toBe('waiting');
      expect(exhibition.inspect().imagesStarted).toBe(false);
      expect(exhibition.pick(root, camera, { x: 0, y: 0 }, 'hall-b', ignored)).toBeNull();
      occluder.visible = false;
      expect(exhibition.pick(root, camera, { x: 0, y: 0 }, 'hall-a', ignored)).toBeNull();
      expect(exhibition.pick(root, camera, { x: 0, y: 0 }, 'hall-b', ignored)).toBe('C02');
      camera.position.copy(center).add(new THREE.Vector3(.85, -.9, -2.1));
      camera.lookAt(center);
      expect(exhibition.pick(root, camera, { x: 0, y: 0 }, 'hall-b', ignored)).toBe('C02');
    } finally {
      exhibition.dispose();
      occluder.geometry.dispose();
      occluder.material.dispose();
    }
    expect(oldPanel.visible).toBe(true);
  });
});

describe('Mogao B viewing barrier', () => {
  it('holds a walking or running character on the hall side and clears the original route on release', () => {
    const position = vector(17, 19.58, -12.8);
    const destination = vector(11.2, 19.58, -12.2);
    const delta = { x: destination.x - position.x, z: destination.z - position.z };
    const locked = moveUpperPlayer({ position, surfaceId: 'hall-b' }, delta, true)!;
    const open = moveUpperPlayer({ position, surfaceId: 'hall-b' }, delta)!;
    expect(locked.surfaceId).toBe('hall-b');
    expect(upperFromWorld(locked.position).x).toBeGreaterThan(MOGAO_BUDDHA_GATE.max[0]);
    expect(open.surfaceId).toBe('view-b');
    const sameXZBelow = moveUpperPlayer({ position, surfaceId: 'hall-a' }, delta, true)!;
    expect(sameXZBelow.surfaceId).toBe('view-a');
  });

  it('retracts the camera at the locked doorway only on the B floor', () => {
    const target = vector(17, 21.25, -13.0);
    const beyond = vector(12.7, 21.25, -13.0);
    expect(upperFromWorld(settleUpperCamera(target, beyond, true)).x).toBeGreaterThan(MOGAO_BUDDHA_GATE.max[0]);
    expect(upperFromWorld(settleUpperCamera(target, beyond)).x).toBeLessThan(MOGAO_BUDDHA_GATE.min[0]);
    const aTarget = vector(17, 9.78, -13.0), aBeyond = vector(12.7, 9.78, -13.0);
    expect(settleUpperCamera(aTarget, aBeyond, true).distanceTo(settleUpperCamera(aTarget, aBeyond))).toBeLessThan(1e-6);
  });

  it('holds blocking through the visible fade, and never starts closed for a completed visit', () => {
    const root = new THREE.Scene(), position = { x: 0, z: 0 };
    const exhibition = createMogaoExhibitScene(root);
    try {
      exhibition.update(position, 'hall-a', 0, true, false);
      for (let frame = 0; frame < 4; frame++) exhibition.update(position, 'hall-a', .15, false, false);
      expect(exhibition.inspect().gate.visible).toBe(true);
      expect(exhibition.isGateBlocking()).toBe(true);
      exhibition.update(position, 'hall-a', .13, false, false);
      expect(exhibition.inspect().gate.visible).toBe(false);
      expect(exhibition.isGateBlocking()).toBe(false);
    } finally {
      exhibition.dispose();
    }
    const restored = createMogaoExhibitScene(root, { gateLocked: false });
    expect(restored.isGateBlocking()).toBe(false);
    restored.dispose();
  });
});
