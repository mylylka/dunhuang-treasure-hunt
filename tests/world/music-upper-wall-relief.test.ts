import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMusicUpperWallRelief } from '../../src/world/music-upper-wall-relief';
import { MUSIC_RELIEF_CEILING } from '../../src/world/music-interior-relief-ceiling-v001';

describe('music upper wall relief', () => {
  it('fits four evenly spaced frames on the west wall and three on the rear wall without intercepting instrument picking', () => {
    const root = new THREE.Group();
    const relief = createMusicUpperWallRelief(root);
    const layout = relief.inspect();
    expect(layout.panels).toHaveLength(2);
    for (const panel of layout.panels) {
      expect(panel.centers).toHaveLength(panel.id === 'west' ? 4 : 3);
      const gap = panel.centers[0] - layout.frameWidth / 2 - panel.start;
      expect(gap).toBeGreaterThan(0);
      expect(panel.start + panel.length - panel.centers.at(-1)! - layout.frameWidth / 2).toBeCloseTo(gap);
      for (const [index, center] of panel.centers.slice(1).entries()) {
        expect(center - panel.centers[index] - layout.frameWidth).toBeCloseTo(gap);
      }
    }
    root.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    relief.group.traverse(object => { if (object instanceof THREE.Mesh) meshes.push(object); });
    expect(meshes.length).toBeLessThanOrEqual(20);
    expect(meshes.every(mesh => mesh.receiveShadow && !mesh.castShadow)).toBe(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(36, 10.8, -27), new THREE.Vector3(-1, 0, 0));
    expect(ray.intersectObject(root, true)).toHaveLength(0);
    const rear = relief.group.getObjectByName('music-upper-wall-relief-rear')!;
    const frame = rear.children.find(object => object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial && object.material.color.getHexString() === 'f2e3c7') as THREE.Mesh;
    const probe = new THREE.Mesh(frame.geometry, frame.material);
    probe.matrixWorld.copy(frame.matrixWorld);
    const x = 34.8 + layout.panels[1].centers[0], top = layout.frameCenterY + layout.frameHeight / 2;
    const hit = (px: number, py: number) => new THREE.Raycaster(new THREE.Vector3(px, py, -30), new THREE.Vector3(0, 0, -1)).intersectObject(probe).length;
    expect(hit(x, layout.frameCenterY)).toBe(0); // The frame's centre stays open.
    expect(hit(x + .5, top)).toBeGreaterThan(0);
    expect(hit(x - .5, top)).toBeGreaterThan(0);
    expect(hit(x, top + .155)).toBeGreaterThan(0); // Upper diamond remains joined.
    const box = new THREE.Box3().setFromObject(relief.group);
    expect(box.min.y).toBeGreaterThan(7.9);
    expect(box.max.y).toBeCloseTo(MUSIC_RELIEF_CEILING.undersideY, 5);
    expect(box.max.x).toBeLessThan(46.27);
    expect(box.max.z).toBeLessThanOrEqual(-18.23);
    relief.dispose();
    expect(root.children).toHaveLength(0);
  });

  it('touches the ceiling with the raised cornice and increases the green dado by the same distance', () => {
    const root = new THREE.Group(), relief = createMusicUpperWallRelief(root);
    root.updateMatrixWorld(true);
    const shift = MUSIC_RELIEF_CEILING.undersideY - 13.20;
    expect(shift).toBeCloseTo(.275, 6);
    for (const wall of ['west', 'rear']) {
      const face = relief.group.getObjectByName(`music-upper-wall-relief-${wall}`)!;
      const planes = face.children.filter(object => object instanceof THREE.Mesh && object.geometry instanceof THREE.PlaneGeometry) as THREE.Mesh[];
      const colored = (hex: string) => planes.filter(mesh => mesh.material instanceof THREE.MeshStandardMaterial && mesh.material.color.getHexString() === hex);
      const bounds = (mesh: THREE.Mesh) => new THREE.Box3().setFromObject(mesh);
      const cornice = bounds(colored('744334')[0]);
      const green = bounds(colored('819d8e')[0]);
      const waist = colored('99513a').map(bounds).sort((a, b) => b.min.y - a.min.y)[0];
      expect(cornice.max.y).toBeCloseTo(MUSIC_RELIEF_CEILING.undersideY, 5);
      expect(cornice.min.y).toBeCloseTo(12.79 + shift, 5);
      expect(green.max.y - (7.915375 + .75)).toBeCloseTo(shift, 5);
      expect(waist.min.y).toBeCloseTo(green.max.y, 5);
      expect(waist.max.y - waist.min.y).toBeCloseTo(.05, 5);
      // Measure the actual beveled molding including the diamonds.
      const moldings = face.children.filter(object => object instanceof THREE.Mesh &&
        object.material instanceof THREE.MeshStandardMaterial &&
        object.material.color.getHexString() === 'f2e3c7') as THREE.Mesh[];
      expect(moldings).toHaveLength(1);
      const silhouette = bounds(moldings[0]);
      const lowerGap = silhouette.min.y - waist.max.y;
      const upperGap = cornice.min.y - silhouette.max.y;
      expect(lowerGap).toBeGreaterThan(0);
      expect(upperGap).toBeCloseTo(lowerGap, 5);
      const { panels, frameCenterY, frameHeight } = relief.inspect();
      const panel = panels.find(panel => panel.id === wall)!;
      const probe = new THREE.Mesh(moldings[0].geometry, moldings[0].material);
      const railDepths = panel.centers.flatMap(center => [-.7, .7].flatMap(offset => [
        frameCenterY + frameHeight / 2 - .05, frameCenterY + (frameHeight - .44) / 2 - .025,
      ].map(y => new THREE.Raycaster(new THREE.Vector3(center + offset, y, 1), new THREE.Vector3(0, 0, -1)).intersectObject(probe)[0]?.point.z)));
      for (const depth of railDepths) expect(depth).toBeCloseTo(.053, 5);
    }
    relief.dispose();
  });
});
