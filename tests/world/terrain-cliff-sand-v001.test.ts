import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { hideConnectedCliffSandFoot } from '../../src/world/terrain-cliff-sand-v001';

describe('connected cliff landscape', () => {
  for (const asset of ['mogao-massing/v003', 'mogao-strata/v001']) {
    it(`removes the actual ${asset} sand feet and their shadows, preserving the rest`, () => {
      const bytes = readFileSync(new URL(`../../public/assets/world/${asset}/mountain.glb`, import.meta.url));
      const length = bytes.readUInt32LE(12);
      const json = JSON.parse(bytes.toString('utf8', 20, 20 + length));
      const scene = new THREE.Group();
      for (const node of json.nodes) if (node.mesh !== undefined) {
        const object = new THREE.Mesh(); object.name = node.name; object.castShadow = true; scene.add(object);
      }
      const feet = scene.children.filter(object => /^sand-foot-/.test(object.name));
      const rest = scene.children.filter(object => !/^sand-foot-/.test(object.name));
      expect(feet.map(object => object.name).sort()).toEqual(['sand-foot--1', 'sand-foot-1']);
      expect(rest.length).toBeGreaterThan(0);
      hideConnectedCliffSandFoot(scene);
      expect(feet.every(object => !object.visible && !(object as THREE.Mesh).castShadow)).toBe(true);
      expect(rest.every(object => object.visible && (object as THREE.Mesh).castShadow)).toBe(true);
    });
  }
});
