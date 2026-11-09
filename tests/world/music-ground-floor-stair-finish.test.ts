import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createMusicGroundFloorStairFinish, MUSIC_GROUND_STAIR_FINISH } from '../../src/world/music-ground-floor-stair-finish-v001';

describe('ground-floor stair architectural finish', () => {
  it('follows the real stair soffit without entering the walkable treads', () => {
    const root = new THREE.Group(), finish = createMusicGroundFloorStairFinish(root);
    const c = MUSIC_GROUND_STAIR_FINISH;
    expect(finish.inspect().parts).toHaveLength(4);
    const panel = finish.group.getObjectByName('music-stair-soffit-plaster') as THREE.Mesh;
    const p = panel.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const walkHeight = c.upperY - (c.upperY - c.lowerY) * (x - c.upperX) / (c.lowerX - c.upperX);
      expect(p.getY(i)).toBeLessThan(walkHeight - .30);
      expect(z).toBeGreaterThanOrEqual(c.rearZ - .0001);
      expect(z).toBeLessThanOrEqual(c.frontZ + .0001);
    }
    finish.group.traverse(child => {
      if (child instanceof THREE.Mesh) expect(new THREE.Raycaster().intersectObject(child)).toHaveLength(0);
    });
    finish.dispose(); expect(root.children).toHaveLength(0);
  });
});
